import type { VisitorId } from './visitors.ts'

const FILES = {
  knock: '/sounds/knock.mp3',
  creak: '/sounds/creak.mp3',
  latch: '/sounds/latch.mp3',
  cat: '/sounds/cat.mp3',
  dog: '/sounds/dog.mp3',
  bird: '/sounds/bird.mp3',
  duck: '/sounds/duck.mp3',
  bunny: '/sounds/bunny.mp3',
  mouse: '/sounds/mouse.mp3',
  cow: '/sounds/cow.mp3',
  bear: '/sounds/bear.mp3',
  frog: '/sounds/frog.mp3',
  capybara: '/sounds/capybara.mp3',
  fox: '/sounds/fox.mp3',
  elephant: '/sounds/elephant.mp3',
  owl: '/sounds/owl.mp3',
  hedgehog: '/sounds/hedgehog.mp3',
  penguin: '/sounds/penguin.mp3',
  sheep: '/sounds/sheep.mp3',
  pig: '/sounds/pig.mp3',
  horse: '/sounds/horse.mp3',
  chicken: '/sounds/chicken.mp3',
  bee: '/sounds/bee.mp3',
} as const

type Clip = keyof typeof FILES

export class ToyAudio {
  private muted = false
  private disposed = false
  private readonly requests = new AbortController()
  private readonly sources = new Set<AudioBufferSourceNode>()

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  stop(): void {
    for (const source of this.sources) { try { source.stop() } catch { /* already ended */ } }
    this.sources.clear()
  }
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private readonly buffers = new Map<Clip, AudioBuffer>()
  private readonly raw = new Map<Clip, ArrayBuffer>()
  private prefetching: Promise<void>

  constructor() {
    this.prefetching = this.prefetch()
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.requests.abort()
    this.master?.disconnect()
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close().catch(() => {})
    this.buffers.clear()
    this.raw.clear()
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  async unlock(): Promise<void> {
    if (this.disposed || typeof AudioContext === 'undefined') return
    if (!this.ctx) {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0.85
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    await this.prefetching
    if (!this.disposed) await this.decodeAll()
  }

  duration(clip: Clip): number {
    return this.buffers.get(clip)?.duration ?? 0.4
  }

  knock(offset = 0): void {
    this.play('knock', offset)
  }

  knocks(): void {
    this.play('knock', 0)
    this.play('knock', 0.34)
  }

  creak(): void {
    this.play('creak', 0.05)
  }

  latch(): void {
    this.play('latch', 0)
  }

  visitor(id: VisitorId): void {
    this.play(id, 0)
  }

  private play(clip: Clip, offset: number): void {
    const ctx = this.ctx
    const master = this.master
    const buffer = this.buffers.get(clip)
    if (this.disposed || this.muted || document.hidden || !ctx || ctx.state !== 'running' || !master || !buffer) return
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    src.buffer = buffer
    gain.gain.value = clip === 'creak' ? 0.55 : clip === 'knock' ? 0.9 : 0.8
    src.connect(gain).connect(master)
    this.sources.add(src)
    src.onended = () => { this.sources.delete(src); src.disconnect(); gain.disconnect() }
    src.start(ctx.currentTime + offset)
  }

  private async prefetch(): Promise<void> {
    await Promise.all(
      (Object.keys(FILES) as Clip[]).map(async (clip) => {
        try {
          const response = await fetch(FILES[clip], { signal: this.requests.signal })
          if (!response.ok) return
          const data = await response.arrayBuffer()
          if (!this.disposed) this.raw.set(clip, data)
        } catch {
          // keep going; missing clips stay silent
        }
      }),
    )
  }

  private async decodeAll(): Promise<void> {
    const ctx = this.ctx
    if (!ctx) return
    await Promise.all(
      [...this.raw.entries()].map(async ([clip, data]) => {
        if (this.buffers.has(clip)) return
        try {
          const buffer = await ctx.decodeAudioData(data.slice(0))
          if (!this.disposed) this.buffers.set(clip, buffer)
        } catch {
          // skip a bad clip
        }
      }),
    )
  }
}
