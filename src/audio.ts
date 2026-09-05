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
} as const

type Clip = keyof typeof FILES

export class ToyAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private readonly buffers = new Map<Clip, AudioBuffer>()
  private readonly raw = new Map<Clip, ArrayBuffer>()
  private prefetching: Promise<void>

  constructor() {
    this.prefetching = this.prefetch()
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  async unlock(): Promise<void> {
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
    await this.decodeAll()
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
    if (!ctx || !master || !buffer) return
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    src.buffer = buffer
    gain.gain.value = clip === 'creak' ? 0.55 : clip === 'knock' ? 0.9 : 0.8
    src.connect(gain).connect(master)
    src.start(ctx.currentTime + offset)
  }

  private async prefetch(): Promise<void> {
    await Promise.all(
      (Object.keys(FILES) as Clip[]).map(async (clip) => {
        try {
          const response = await fetch(FILES[clip])
          if (!response.ok) return
          this.raw.set(clip, await response.arrayBuffer())
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
          this.buffers.set(clip, buffer)
        } catch {
          // skip a bad clip
        }
      }),
    )
  }
}
