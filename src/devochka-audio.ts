export type Sound =
  | 'tap'
  | 'basket'
  | 'coin'
  | 'till'
  | 'snip'
  | 'eat'
  | 'drink'
  | 'sticker'
  | 'jar'
  | 'apple'
  | 'cat'
  | 'dog'
  | 'music'

/** Quiet, original toy instruments. All scheduled notes belong to this page. */
export class LunchSounds {
  private context: AudioContext | null = null
  private notes = new Set<AudioScheduledSourceNode>()
  private noise: AudioBuffer | null = null
  private enabled: () => boolean

  constructor(enabled: () => boolean) {
    this.enabled = enabled
  }

  play(effect: Sound, index = 0): void {
    if (!this.enabled() || document.hidden) return
    try {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) return
      this.context ??= new Context()
      const ctx = this.context
      if (ctx.state !== 'running') void ctx.resume().catch(() => {})
      if (this.notes.size > 100) this.stop()
      const at = ctx.currentTime + 0.01
      const tone = (
        midi: number,
        offset = 0,
        duration = 0.2,
        volume = 0.075,
        type: OscillatorType = 'sine',
        slide = 0
      ) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const start = at + offset
        osc.type = type
        const hz = 440 * 2 ** ((midi - 69) / 12)
        osc.frequency.setValueAtTime(hz, start)
        if (slide) osc.frequency.exponentialRampToValueAtTime(hz * 2 ** (slide / 12), start + duration)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        osc.connect(gain).connect(ctx.destination)
        this.track(osc, [gain])
        osc.start(start)
        osc.stop(start + duration + 0.025)
      }
      const rustle = (offset: number, duration: number, freq: number) => {
        if (!this.noise) {
          this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
          const data = this.noise.getChannelData(0)
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        }
        const source = ctx.createBufferSource()
        source.buffer = this.noise
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = freq
        const gain = ctx.createGain()
        const start = at + offset
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        source.connect(filter).connect(gain).connect(ctx.destination)
        this.track(source, [gain, filter])
        source.start(start)
        source.stop(start + duration)
      }
      switch (effect) {
        case 'coin':
          tone(84, 0, 0.32)
          tone(96, 0.035, 0.17, 0.025)
          break
        case 'till':
          ;[72, 79, 84].forEach((n, i) => tone(n, i * 0.12, 0.45))
          rustle(0.05, 0.13, 600)
          break
        case 'basket':
          tone(66, 0, 0.15, 0.08, 'triangle', -6)
          rustle(0.04, 0.1, 740)
          break
        case 'snip':
          rustle(0, 0.09, 3500)
          rustle(0.14, 0.08, 2800)
          break
        case 'eat':
          ;[0, 0.13, 0.26].forEach((n) => rustle(n, 0.09, 900 + n * 6000))
          break
        case 'drink':
          ;[0, 0.12, 0.25].forEach((n, i) => tone(54 + i * 3, n, 0.15, 0.09, 'sine', 8))
          break
        case 'apple':
          tone(72, 0, 0.16, 0.08, 'triangle', 5)
          tone(79, 0.12, 0.25)
          break
        case 'sticker':
          ;[74, 78, 81, 86].forEach((n, i) => tone(n, i * 0.14, 0.55, 0.07))
          break
        case 'jar': {
          const pitch = [67, 71, 74][index] ?? 67
          tone(pitch, 0, 0.6, 0.105)
          tone(pitch + 19, 0.006, 0.19, 0.025)
          break
        }
        case 'cat':
          ;[0, 0.3].forEach((n) => tone(48, n, 0.35, 0.045, 'triangle', -3))
          break
        case 'dog':
          ;[0, 0.2].forEach((n) => tone(63, n, 0.12, 0.055, 'triangle', -8))
          break
        case 'music': {
          const melody = [
            74, 78, 81, 78, 76, 74, 71, 69, 71, 74, 78, 76, 74, 71, 69, 67, 69, 73, 76, 79, 78, 76, 74, 74,
          ]
          melody.forEach((n, i) => {
            tone(n, i * 0.29, 0.58, 0.052)
            if (i % 3 === 0) tone([50, 55, 52, 57][Math.floor(i / 6)], i * 0.29, 0.68, 0.045, 'triangle')
          })
          break
        }
        default:
          tone(74, 0, 0.09, 0.045, 'triangle', -4)
      }
    } catch {
      /* A silent game still works, including every pattern cue. */
    }
  }
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    this.notes.add(source)
    source.onended = () => {
      this.notes.delete(source)
      source.disconnect()
      nodes.forEach((node) => node.disconnect())
    }
  }
  stop(): void {
    for (const source of this.notes) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        /* Already finished. */
      }
    }
    this.notes.clear()
  }
  close(): void {
    this.stop()
    const ctx = this.context
    this.context = null
    this.noise = null
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {})
  }
}
