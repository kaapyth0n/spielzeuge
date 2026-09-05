export const PUPPY_EFFECTS = [
  'tap',
  'pet',
  'squeak',
  'eat',
  'walk',
  'flower',
  'sleep',
  'ball',
  'fetch',
  'pee',
  'poop',
  'clean',
  'wallpaper',
  'flip',
  'match',
  'reward',
  'win',
] as const
export type PuppyEffect = (typeof PUPPY_EFFECTS)[number]
type Track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => void

/** Original, short sound effects. Also rendered offline by the audio regression check. */
export function synthesizePuppyEffect(
  ctx: BaseAudioContext,
  destination: AudioNode,
  effect: PuppyEffect,
  start: number,
  track: Track = (source, nodes) => {
    source.onended = () => {
      source.disconnect()
      nodes.forEach((node) => node.disconnect())
    }
  },
): void {
  function envelope(
    gain: GainNode,
    at: number,
    duration: number,
    volume: number,
  ): void {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(
      volume,
      at + Math.min(0.02, duration / 4),
    )
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  }
  function note(
    offset: number,
    duration: number,
    from: number,
    to = from,
    volume = 0.24,
    type: OscillatorType = 'sine',
  ): void {
    const at = start + offset
    const source = ctx.createOscillator()
    const gain = ctx.createGain()
    source.type = type
    source.frequency.setValueAtTime(from, at)
    source.frequency.exponentialRampToValueAtTime(to, at + duration)
    envelope(gain, at, duration, volume)
    source.connect(gain).connect(destination)
    track(source, [gain])
    source.start(at)
    source.stop(at + duration + 0.01)
  }
  function rustle(
    offset: number,
    duration: number,
    frequency: number,
    volume = 0.4,
    type: BiquadFilterType = 'bandpass',
  ): void {
    const at = start + offset
    const source = ctx.createBufferSource()
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duration),
      ctx.sampleRate,
    )
    const data = buffer.getChannelData(0)
    // Deterministic noise gives consistent timbre and repeatable PCM checks.
    let seed = 7493
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      data[i] = seed / 2147483648
    }
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    envelope(gain, at, duration, volume)
    source.connect(filter).connect(gain).connect(destination)
    track(source, [filter, gain])
    source.start(at)
    source.stop(at + duration + 0.01)
  }
  function paw(at: number): void {
    note(at, 0.11, 150, 65, 0.27)
    rustle(at, 0.08, 700, 0.35)
  }
  function bounce(at: number): void {
    note(at, 0.28, 360, 90, 0.36)
    rustle(at, 0.065, 460, 0.4)
  }
  function bell(at: number, pitch: number): void {
    note(at, 0.3, pitch, pitch, 0.22)
    note(at, 0.18, pitch * 2, pitch * 2, 0.04)
  }
  switch (effect) {
    case 'tap':
      note(0, 0.1, 490, 310, 0.24)
      break
    case 'pet':
      for (const at of [0, 0.28]) {
        note(at, 0.19, 210, 100, 0.16, 'triangle')
        rustle(at, 0.15, 550, 0.34)
      }
      break
    case 'squeak':
      note(0, 0.19, 740, 1450, 0.22, 'triangle')
      note(0.19, 0.23, 1450, 630, 0.2, 'triangle')
      break
    case 'eat':
      for (const at of [0, 0.28, 0.56, 0.87, 1.17, 1.46]) {
        rustle(at, 0.16, 1450, 0.6)
        note(at + 0.02, 0.08, 220, 160, 0.13)
      }
      break
    case 'walk':
      for (const at of [0, 0.21, 0.44, 0.66]) paw(at)
      break
    case 'flower':
      paw(0)
      rustle(0.08, 0.2, 2200, 0.24)
      bell(0.13, 930)
      break
    case 'sleep':
      for (const [i, pitch] of [392, 494, 587].entries())
        note(i * 0.16, 0.7, pitch, pitch, 0.13)
      for (const at of [1.1, 2.5, 3.9]) {
        rustle(at, 0.8, 280, 0.48, 'lowpass')
        note(at + 0.07, 0.65, 120, 94, 0.07)
      }
      break
    case 'ball':
      for (const at of [0, 0.6, 1.2, 1.8, 2.4, 3]) bounce(at)
      break
    case 'fetch':
      rustle(0, 0.18, 1500, 0.32)
      bounce(0.18)
      break
    case 'pee':
      rustle(0.4, 1.35, 1900, 0.27)
      for (const at of [0.55, 0.8, 1.1, 1.42]) note(at, 0.12, 1100, 400, 0.12)
      break
    case 'poop':
      note(1.1, 0.17, 260, 65, 0.33)
      rustle(1.12, 0.07, 650, 0.3)
      break
    case 'clean':
      rustle(0, 0.3, 1200, 0.45)
      rustle(0.3, 0.3, 2200, 0.35)
      bell(0.63, 1046)
      break
    case 'wallpaper':
      rustle(0, 0.24, 950, 0.5)
      rustle(0.13, 0.2, 1650, 0.32)
      break
    case 'flip':
      rustle(0, 0.12, 1100, 0.48)
      note(0, 0.06, 230, 150, 0.13)
      break
    case 'match':
      bell(0, 784)
      bell(0.12, 1046)
      break
    case 'reward':
      for (const [i, pitch] of [523, 659, 784].entries()) bell(i * 0.12, pitch)
      break
    case 'win':
      for (const [i, pitch] of [523, 659, 784, 1046].entries())
        bell(i * 0.16, pitch)
      break
  }
}

/** Owns effect lifetimes so mute, navigation and tab hiding silence scheduled sounds too. */
export class PuppyAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private active = new Map<AudioScheduledSourceNode, AudioNode[]>()
  private generation = 0
  private samples = new Map<'pet' | 'squeak', AudioBuffer>()
  private raw = new Map<'pet' | 'squeak', ArrayBuffer>()
  private enabled: () => boolean
  private loading: Promise<void>

  constructor(enabled: () => boolean) {
    this.enabled = enabled
    // Reuse the project's licensed clips; synthesized fallbacks work before loading or offline.
    this.loading = Promise.all(
      (
        [
          ['pet', '/sounds/dog.mp3'],
          ['squeak', '/sounds/mouse.mp3'],
        ] as const
      ).map(async ([effect, url]) => {
        try {
          const response = await fetch(url)
          if (response.ok) this.raw.set(effect, await response.arrayBuffer())
        } catch {
          /* Optional samples. */
        }
      }),
    ).then(() => {})
  }

  play(effect: PuppyEffect): void {
    if (!this.enabled() || document.hidden) return
    try {
      const ctx = this.context()
      if (!ctx || !this.master) return
      if (this.active.size > 64) this.stop()
      const generation = this.generation
      const start = () => {
        if (
          generation !== this.generation ||
          !this.enabled() ||
          document.hidden ||
          !this.master
        )
          return
        const sample =
          effect === 'pet' || effect === 'squeak'
            ? this.samples.get(effect)
            : null
        if (sample) {
          const source = ctx.createBufferSource()
          const gain = ctx.createGain()
          const at = ctx.currentTime + 0.01
          const rate = effect === 'pet' ? 1.2 : 1
          const duration = Math.min(
            sample.duration / rate,
            effect === 'pet' ? 1 : 0.65,
          )
          source.buffer = sample
          source.playbackRate.value = rate
          gain.gain.setValueAtTime(0, at)
          gain.gain.linearRampToValueAtTime(
            effect === 'pet' ? 0.34 : 0.46,
            at + 0.015,
          )
          gain.gain.setValueAtTime(
            effect === 'pet' ? 0.34 : 0.46,
            at + Math.max(0.015, duration - 0.06),
          )
          gain.gain.linearRampToValueAtTime(0, at + duration)
          source.connect(gain).connect(this.master)
          this.track(source, [gain])
          source.start(at)
          source.stop(at + duration)
        } else {
          synthesizePuppyEffect(
            ctx,
            this.master,
            effect,
            ctx.currentTime + 0.01,
            (source, nodes) => this.track(source, nodes),
          )
        }
      }
      if (ctx.state === 'running') start()
      else
        void ctx
          .resume()
          .then(start)
          .catch(() => {})
    } catch {
      /* The game remains usable on devices without Web Audio. */
    }
  }

  stop(): void {
    this.generation++
    for (const [source, nodes] of this.active) {
      try {
        source.stop()
      } catch {
        /* Already ended. */
      }
      source.disconnect()
      nodes.forEach((node) => node.disconnect())
    }
    this.active.clear()
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    this.active.set(source, nodes)
    source.onended = () => {
      source.disconnect()
      nodes.forEach((node) => node.disconnect())
      this.active.delete(source)
    }
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof AudioContext === 'undefined') return null
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.72
    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -9
    limiter.knee.value = 12
    limiter.ratio.value = 5
    limiter.attack.value = 0.003
    limiter.release.value = 0.12
    this.master.connect(limiter).connect(this.ctx.destination)
    const ctx = this.ctx
    void this.loading.then(async () => {
      for (const [effect, raw] of this.raw) {
        try {
          this.samples.set(effect, await ctx.decodeAudioData(raw.slice(0)))
        } catch {
          /* Synthesized fallback. */
        }
      }
    })
    return ctx
  }
}
