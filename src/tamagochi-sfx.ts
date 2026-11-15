/**
 * Тамагочи Связь — sound. Everything is synthesised: toy bleeps, pet voices
 * that can sing a tune, and four quiet looping melodies.
 */
import type { Sfx } from './tamagochi-kit.ts'

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12)

interface Tone {
  f: number
  /** Glide target; defaults to `f`. */
  f2?: number
  dur: number
  type?: OscillatorType
  vol?: number
  at?: number
  attack?: number
  vibrato?: number
  lowpass?: number
}

interface LoopDef {
  bpm: number
  /** Chord roots (MIDI) per bar; each bar has 8 steps. */
  roots: number[]
  /** Scale-degree offsets in semitones for the lead, per step; null rests. */
  lead: (number | null)[]
  bass: (number | null)[]
  type: OscillatorType
  hat: boolean
}
const LOOPS: Record<string, LoopDef> = {
  dance: {
    bpm: 124,
    roots: [60, 57, 65, 67],
    lead: [12, null, 16, 19, null, 16, 12, 7, 12, 12, 16, null, 19, 16, 24, null],
    bass: [0, null, 0, 7, 0, null, 7, 0],
    type: 'square',
    hat: true,
  },
  rings: {
    bpm: 104,
    roots: [62, 67, 60, 67],
    lead: [7, 12, 16, 12, 7, 12, 16, 19, 16, 12, 7, 12, 4, 7, 12, null],
    bass: [0, null, null, 7, null, null, 0, null],
    type: 'triangle',
    hat: true,
  },
  salon: {
    bpm: 92,
    roots: [65, 60, 62, 60],
    lead: [16, null, 12, null, 14, 16, 19, null, 16, null, 12, 7, 9, 12, null, null],
    bass: [0, null, 7, null, 4, null, 7, null],
    type: 'triangle',
    hat: false,
  },
  craft: {
    bpm: 84,
    roots: [60, 65, 67, 60],
    lead: [12, 14, 16, null, 19, null, 16, null, 12, null, 14, 16, 12, null, null, null],
    bass: [0, null, null, null, 7, null, null, null],
    type: 'sine',
    hat: false,
  },
}

export class TamaSfx implements Sfx {
  muted: boolean
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private noise: AudioBuffer | null = null
  private loopName: string | null = null
  private loopTimer = 0
  private loopStart = 0
  private loopStep = 0
  private loopGain: GainNode | null = null
  private resumeName: string | null = null

  constructor(muted: boolean) {
    this.muted = muted
  }

  /** Call from a gesture: browsers only start audio after one. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        this.ctx = new AC()
        this.out = this.ctx.createGain()
        this.out.gain.value = this.muted ? 0 : 1
        this.out.connect(this.ctx.destination)
        const len = this.ctx.sampleRate * 0.5
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02)
  }

  /** Stop everything; used when the page is hidden or left. */
  suspend(): void {
    const playing = this.loopName
    this.loop(null)
    this.resumeName = playing
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend()
  }

  /** Back from a hidden tab: continue the tune that was playing. */
  resume(): void {
    if (!this.ctx) return
    const name = this.resumeName
    this.resumeName = null
    void this.ctx.resume().then(() => {
      if (name && !this.loopName) this.loop(name)
    })
  }

  private tone(t: Tone, dest?: AudioNode): void {
    const ctx = this.ctx
    if (!ctx || !this.out || this.muted || ctx.state !== 'running') return
    const start = ctx.currentTime + (t.at ?? 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.setValueAtTime(t.f, start)
    if (t.f2 && t.f2 !== t.f) osc.frequency.exponentialRampToValueAtTime(t.f2, start + t.dur)
    if (t.vibrato) {
      const lfo = ctx.createOscillator()
      const depth = ctx.createGain()
      lfo.frequency.value = 6.5
      depth.gain.value = t.f * t.vibrato
      lfo.connect(depth).connect(osc.frequency)
      lfo.start(start)
      lfo.stop(start + t.dur + 0.05)
    }
    const vol = (t.vol ?? 0.12) * (osc.type === 'square' || osc.type === 'sawtooth' ? 0.55 : 1)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(vol, start + (t.attack ?? 0.008))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
    let node: AudioNode = osc
    if (t.lowpass) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = t.lowpass
      node = osc.connect(lp)
    }
    node.connect(gain).connect(dest ?? this.out)
    osc.start(start)
    osc.stop(start + t.dur + 0.05)
  }

  private hiss(dur: number, freq: number, vol = 0.1, at = 0, sweepTo?: number, dest?: AudioNode): void {
    const ctx = this.ctx
    if (!ctx || !this.out || !this.noise || this.muted || ctx.state !== 'running') return
    const start = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(freq, start)
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, start + dur)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(bp).connect(gain).connect(dest ?? this.out)
    src.start(start)
    src.stop(start + dur + 0.02)
  }

  private arp(notes: number[], step: number, dur: number, type: OscillatorType = 'square', vol = 0.1): void {
    notes.forEach((n, i) => this.tone({ f: hz(n), dur, type, vol, at: i * step }))
  }

  play(name: string, variant = 0): void {
    const pent = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]
    switch (name) {
      case 'tap':
        return this.tone({ f: 700, f2: 900, dur: 0.06, type: 'square', vol: 0.07 })
      case 'pop':
        return this.tone({ f: 320, f2: 980, dur: 0.1, vol: 0.14 })
      case 'munch':
        this.tone({ f: 190, f2: 120, dur: 0.09, type: 'square', vol: 0.1 })
        this.tone({ f: 170, f2: 110, dur: 0.09, type: 'square', vol: 0.1, at: 0.16 })
        return this.tone({ f: 520, f2: 780, dur: 0.12, at: 0.34, vol: 0.1 })
      case 'sweep':
        this.hiss(0.36, 2600, 0.16, 0, 500)
        return this.tone({ f: 900, f2: 300, dur: 0.3, type: 'triangle', vol: 0.05 })
      case 'boing':
        return this.tone({ f: 210, f2: 560, dur: 0.22, type: 'triangle', vol: 0.15 })
      case 'bounce':
        return this.tone({ f: 420, f2: 180, dur: 0.12, type: 'triangle', vol: 0.12 })
      case 'yay':
        return this.arp([72, 76, 79, 84], 0.085, 0.16, 'square', 0.1)
      case 'ready':
        return this.arp([67, 72, 76, 79, 76, 84], 0.09, 0.2, 'square', 0.09)
      case 'no':
        this.tone({ f: 240, dur: 0.11, type: 'triangle', vol: 0.12 })
        return this.tone({ f: 190, dur: 0.16, type: 'triangle', vol: 0.12, at: 0.13 })
      case 'crack':
        this.hiss(0.07, 3200, 0.2)
        return this.tone({ f: 500 + variant * 120, dur: 0.05, type: 'square', vol: 0.08 })
      case 'hatch':
        this.hiss(0.2, 2400, 0.18)
        return this.arp([72, 76, 79, 84, 88], 0.07, 0.2, 'triangle', 0.14)
      case 'link':
        this.tone({ f: 400, f2: 1700, dur: 0.38, type: 'square', vol: 0.07 })
        return this.arp([84, 88, 91, 96], 0.06, 0.22, 'sine', 0.12)
      case 'dash':
        return this.tone({ f: hz(pent[variant % pent.length] + 12), dur: 0.05, type: 'square', vol: 0.05 })
      case 'zap':
        return this.arp([60, 67, 72, 79, 84, 91], 0.045, 0.08, 'square', 0.07)
      case 'chime':
        this.tone({ f: hz(pent[variant % pent.length] + 12), dur: 0.9, vol: 0.12 })
        return this.tone({ f: hz(pent[variant % pent.length] + 24), dur: 0.5, vol: 0.04 })
      case 'sleep':
        return this.arp([76, 72, 67, 64], 0.28, 0.5, 'sine', 0.1)
      case 'wake':
        return this.arp([64, 67, 72, 76], 0.12, 0.3, 'sine', 0.12)
      case 'heart':
        this.tone({ f: hz(76), dur: 0.16, vol: 0.13 })
        return this.tone({ f: hz(83), dur: 0.3, vol: 0.13, at: 0.12 })
      case 'star':
        this.tone({ f: hz(79 + variant * 2), dur: 0.2, type: 'triangle', vol: 0.14 })
        return this.tone({ f: hz(91 + variant * 2), dur: 0.3, vol: 0.06, at: 0.05 })
      case 'step':
        return this.tone({ f: 300 + variant * 40, dur: 0.03, type: 'square', vol: 0.03 })
      case 'hug':
        for (const n of [60, 64, 67, 72]) this.tone({ f: hz(n), dur: 0.9, vol: 0.07, attack: 0.08 })
        return
      case 'gift':
        this.hiss(0.14, 1800, 0.1)
        return this.arp([67, 72, 76, 79, 84], 0.07, 0.22, 'triangle', 0.13)
      case 'snip':
        this.hiss(0.04, 5200, 0.16)
        return this.hiss(0.05, 4200, 0.16, 0.09)
      case 'twang':
        return this.tone({ f: 330 + variant * 30, f2: 300 + variant * 30, dur: 0.16, type: 'triangle', vol: 0.09, vibrato: 0.04 })
      case 'whee':
        return this.tone({ f: 380, f2: 1100, dur: 0.3, vol: 0.1 })
      case 'land':
        return this.tone({ f: 150, f2: 70, dur: 0.14, vol: 0.2 })
      case 'spin':
        return this.tone({ f: 300, f2: 900, dur: 0.4, type: 'triangle', vol: 0.09, vibrato: 0.06 })
      case 'unlock':
        return this.arp([60, 64, 67, 72, 76, 79, 84], 0.08, 0.26, 'square', 0.09)
    }
  }

  note(midi: number, dur = 0.4, voice = 'bell', when = 0): void {
    const f = hz(midi)
    const at = when
    switch (voice) {
      case 'chick':
        return this.tone({ f: f * 2.4, f2: f * 2, dur: Math.min(dur, 0.3), vol: 0.13, at })
      case 'kitten':
        return this.tone({ f: f * 0.82, f2: f, dur, type: 'sawtooth', vol: 0.13, at, lowpass: 2200, attack: 0.04, vibrato: 0.012 })
      case 'monkey':
        return this.tone({ f: f * 0.7, f2: f, dur: Math.min(dur, 0.32), type: 'square', vol: 0.1, at, lowpass: 1500 })
      case 'banana':
        return this.tone({ f, dur, type: 'triangle', vol: 0.17, at, vibrato: 0.03 })
      case 'mini':
        return this.tone({ f: f * 2, dur: Math.min(dur, 0.22), type: 'square', vol: 0.09, at })
      case 'bunny':
        return this.tone({ f: f * 2, dur, vol: 0.12, at, attack: 0.03 })
      case 'penguin':
        return this.tone({ f: f * 1.06, f2: f, dur, type: 'triangle', vol: 0.16, at, lowpass: 1800 })
      case 'puppy':
        return this.tone({ f: f * 1.25, f2: f * 0.94, dur: Math.min(dur, 0.25), type: 'sawtooth', vol: 0.12, at, lowpass: 1900 })
      default:
        this.tone({ f, dur: Math.max(dur, 0.5), vol: 0.13, at })
        return this.tone({ f: f * 2, dur: 0.3, vol: 0.04, at })
    }
  }

  loop(name: string | null): void {
    if (name === this.loopName) return
    window.clearInterval(this.loopTimer)
    if (this.loopGain && this.ctx) {
      const g = this.loopGain
      g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
      window.setTimeout(() => g.disconnect(), 600)
    }
    this.loopGain = null
    this.loopName = name
    const def = name ? LOOPS[name] : null
    const ctx = this.ctx
    if (!def || !ctx || !this.out) return
    const bus = ctx.createGain()
    bus.gain.value = 0.55
    bus.connect(this.out)
    this.loopGain = bus
    const stepDur = 60 / def.bpm / 2
    this.loopStart = ctx.currentTime + 0.08
    this.loopStep = 0
    const schedule = (): void => {
      if (ctx.state !== 'running') return
      while (this.loopStart + this.loopStep * stepDur < ctx.currentTime + 0.25) {
        const i = this.loopStep
        const at = this.loopStart + i * stepDur - ctx.currentTime
        const root = def.roots[Math.floor(i / 8) % def.roots.length]
        const lead = def.lead[i % def.lead.length]
        const bass = def.bass[i % def.bass.length]
        if (lead !== null) this.tone({ f: hz(root + lead), dur: stepDur * 0.9, type: def.type, vol: 0.07, at: Math.max(0, at) }, bus)
        if (bass !== null) this.tone({ f: hz(root - 24 + bass), dur: stepDur * 1.6, type: 'triangle', vol: 0.13, at: Math.max(0, at) }, bus)
        if (def.hat && i % 2 === 1) this.hiss(0.04, 6000, 0.035, Math.max(0, at), undefined, bus)
        this.loopStep++
      }
    }
    schedule()
    this.loopTimer = window.setInterval(schedule, 90)
  }

  beat(): { phase: number; bps: number; index: number } {
    const def = this.loopName ? LOOPS[this.loopName] : null
    if (!def || !this.ctx) {
      // No music (muted contexts still run; no context at all): keep time from the clock.
      const bps = 124 / 60
      const b = (performance.now() / 1000) * bps
      return { phase: b % 1, bps, index: Math.floor(b) }
    }
    const bps = def.bpm / 60
    const b = Math.max(0, (this.ctx.currentTime - this.loopStart) * bps)
    return { phase: b % 1, bps, index: Math.floor(b) }
  }
}
