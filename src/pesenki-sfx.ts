/**
 * Песенки — small synthesised effects. They share the song player's master
 * gain, so the sound button silences songs and effects together.
 */

export const PESENKI_EFFECTS = [
  'tap', // menu buttons
  'pop', // a picture circle appears
  'right', // the right picture
  'fast', // …found while the song kept going
  'wrong', // not this one
  'drum', // chorus tap on the hero
  'perfect', // chorus tap right on the beat
  'tick', // waiting clock
  'rewind', // «уй-уй-уй»
  'alarm', // the clock rings at the end of the song
  'whoosh', // a speed-up is chosen
  'unlock', // a new speed-up appears
  'cheer', // song finished
] as const
export type PesenkiEffect = (typeof PESENKI_EFFECTS)[number]

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16]

function noise(ctx: BaseAudioContext, seconds: number, seed = 9173): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * seconds)), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let state = seed
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    data[i] = state / 2147483648
  }
  return buffer
}

export class PesenkiSfx {
  private noiseBuffer: AudioBuffer | null = null
  private streak = 0
  private readonly live = new Set<AudioScheduledSourceNode>()

  private readonly context: () => AudioContext | null
  private readonly output: () => AudioNode | null
  private readonly enabled: () => boolean

  constructor(context: () => AudioContext | null, output: () => AudioNode | null, enabled: () => boolean) {
    this.context = context
    this.output = output
    this.enabled = enabled
  }

  /** Consecutive right answers climb a pentatonic ladder. */
  resetStreak(): void {
    this.streak = 0
  }

  play(effect: PesenkiEffect, strength = 1): void {
    const ctx = this.context()
    const out = this.output()
    if (!ctx || !out || !this.enabled() || ctx.state === 'closed') return
    const t = ctx.currentTime + 0.005
    const bus = ctx.createGain()
    bus.gain.value = 0.9
    bus.connect(out)
    const note = (at: number, dur: number, freq: number, to = freq, vol = 0.18, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t + at)
      if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + at + dur)
      gain.gain.setValueAtTime(0.0001, t + at)
      gain.gain.exponentialRampToValueAtTime(vol, t + at + Math.min(0.012, dur / 4))
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
      osc.connect(gain).connect(bus)
      this.track(osc)
      osc.start(t + at)
      osc.stop(t + at + dur + 0.03)
    }
    const hiss = (at: number, dur: number, freq: number, vol = 0.2, type: BiquadFilterType = 'bandpass', q = 0.9, sweep?: number) => {
      const src = ctx.createBufferSource()
      this.noiseBuffer ??= noise(ctx, 1.2)
      src.buffer = this.noiseBuffer
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.setValueAtTime(freq, t + at)
      if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, t + at + dur)
      filter.Q.value = q
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t + at)
      gain.gain.exponentialRampToValueAtTime(vol, t + at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
      src.connect(filter).connect(gain).connect(bus)
      this.track(src)
      src.start(t + at, 0, Math.min(1.19, dur + 0.05))
    }
    const bell = (at: number, freq: number, vol = 0.12, dur = 0.5) => {
      note(at, dur, freq, freq, vol, 'sine')
      note(at, dur * 0.6, freq * 2.76, freq * 2.76, vol * 0.25, 'sine')
      note(at, dur * 0.35, freq * 5.4, freq * 5.4, vol * 0.1, 'sine')
    }
    const semi = (base: number, steps: number) => base * Math.pow(2, steps / 12)

    switch (effect) {
      case 'tap':
        note(0, 0.07, 720, 540, 0.08, 'triangle')
        break
      case 'pop':
        note(0, 0.09, 380, 820, 0.07, 'sine')
        break
      case 'right': {
        const step = PENTATONIC[Math.min(this.streak, PENTATONIC.length - 1)]
        this.streak++
        bell(0, semi(784, step), 0.14, 0.45)
        bell(0.08, semi(784, step + 7), 0.1, 0.5)
        break
      }
      case 'fast': {
        const step = PENTATONIC[Math.min(this.streak, PENTATONIC.length - 1)]
        this.streak++
        bell(0, semi(784, step), 0.13, 0.4)
        bell(0.06, semi(784, step + 4), 0.1, 0.4)
        bell(0.12, semi(784, step + 7), 0.1, 0.55)
        hiss(0, 0.35, 7000, 0.04, 'highpass', 0.7)
        break
      }
      case 'wrong':
        this.streak = 0
        note(0, 0.16, 250, 205, 0.1, 'triangle')
        note(0.12, 0.2, 205, 170, 0.08, 'triangle')
        break
      case 'drum': {
        const pitch = 150 + 30 * Math.min(1, strength)
        note(0, 0.16, pitch * 1.6, pitch, 0.22, 'sine')
        hiss(0, 0.05, 2400, 0.05, 'bandpass', 1.2)
        break
      }
      case 'perfect':
        note(0, 0.16, 250, 160, 0.2, 'sine')
        bell(0.01, 1568, 0.07, 0.25)
        hiss(0, 0.06, 5200, 0.05, 'highpass', 0.7)
        break
      case 'tick':
        note(0, 0.035, strength > 0.5 ? 2100 : 1700, undefined, 0.035, 'square')
        break
      case 'rewind':
        // A tape warble under the reversed song.
        note(0, 0.9, 520, 1300, 0.035, 'sawtooth')
        note(0.1, 0.8, 780, 1700, 0.02, 'triangle')
        hiss(0, 0.9, 1800, 0.05, 'bandpass', 2, 5200)
        break
      case 'alarm':
        for (let i = 0; i < 10; i++) {
          bell(i * 0.075, i % 2 ? 2350 : 2640, 0.06, 0.12)
          hiss(i * 0.075, 0.05, 6000, 0.03, 'highpass', 1)
        }
        break
      case 'whoosh':
        hiss(0, 0.55, 400, 0.18, 'bandpass', 1.4, 5200)
        note(0.05, 0.45, 220, 880, 0.05, 'triangle')
        break
      case 'unlock':
        ;[0, 4, 7, 12].forEach((s, i) => bell(i * 0.07, semi(1046, s), 0.09, 0.5))
        break
      case 'cheer':
        ;[0, 4, 7, 12, 16].forEach((s, i) => bell(i * 0.09, semi(784, s), 0.1, 0.7))
        hiss(0.05, 0.6, 6500, 0.05, 'highpass', 0.6)
        break
    }
    window.setTimeout(() => bus.disconnect(), 2500)
  }

  silence(): void {
    for (const node of this.live) {
      try {
        node.stop()
      } catch {
        // already stopped
      }
    }
    this.live.clear()
  }

  private track(node: AudioScheduledSourceNode): void {
    this.live.add(node)
    node.addEventListener('ended', () => this.live.delete(node))
  }
}
