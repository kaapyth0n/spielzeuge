export const MOROZHENKA_EFFECTS = [
  'tap',
  'start',
  'crash',
  'respawn',
  'cherry',
  'flake',
  'win',
  'learned',
  'flavor',
] as const
export type MorozhenkaEffect = (typeof MOROZHENKA_EFFECTS)[number]

/** How long each effect rings (seconds): the microphone ignores us meanwhile. */
export const EFFECT_LENGTH: Record<MorozhenkaEffect, number> = {
  tap: 0.12,
  start: 0.7,
  crash: 0.75,
  respawn: 0.45,
  cherry: 0.4,
  flake: 0.75,
  win: 1.6,
  learned: 0.5,
  flavor: 0.35,
}

type Track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => void

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed = 4217): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let state = seed
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    data[i] = state / 2147483648
  }
  return buffer
}

/** Short original effects, synthesised locally. */
export function synthesizeEffect(
  ctx: BaseAudioContext,
  destination: AudioNode,
  effect: MorozhenkaEffect,
  start: number,
  track: Track,
): void {
  const note = (offset: number, duration: number, from: number, to = from, volume = 0.2, type: OscillatorType = 'sine') => {
    const at = start + offset
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, at)
    osc.frequency.exponentialRampToValueAtTime(to, at + duration)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.02, duration / 4))
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    osc.connect(gain).connect(destination)
    track(osc, [gain])
    osc.start(at)
    osc.stop(at + duration + 0.02)
  }
  const hiss = (offset: number, duration: number, frequency: number, volume = 0.3, type: BiquadFilterType = 'bandpass') => {
    const at = start + offset
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer(ctx, duration + 0.05)
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = 0.8
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    source.connect(filter).connect(gain).connect(destination)
    track(source, [filter, gain])
    source.start(at)
    source.stop(at + duration + 0.03)
  }
  switch (effect) {
    case 'tap':
      note(0, 0.1, 620, 420, 0.14)
      break
    case 'start':
      note(0, 0.16, 523, 523, 0.14, 'triangle')
      note(0.16, 0.16, 659, 659, 0.14, 'triangle')
      note(0.32, 0.36, 784, 784, 0.16, 'triangle')
      hiss(0.3, 0.3, 1600, 0.08)
      break
    case 'crash':
      // A wet splat and a sad little slide.
      hiss(0, 0.22, 420, 0.5, 'lowpass')
      note(0.02, 0.14, 180, 70, 0.3)
      note(0.2, 0.5, 520, 180, 0.1, 'triangle')
      for (const at of [0.14, 0.26, 0.4]) note(at, 0.07, 900, 500, 0.06)
      break
    case 'respawn':
      note(0, 0.14, 700, 1050, 0.1)
      note(0.12, 0.3, 1050, 1400, 0.09)
      break
    case 'cherry':
      note(0, 0.12, 988, 988, 0.15)
      note(0.1, 0.28, 1319, 1319, 0.15)
      note(0.1, 0.2, 2638, 2638, 0.03)
      break
    case 'flake':
      for (const [at, pitch] of [
        [0, 1568],
        [0.1, 2093],
        [0.2, 2637],
        [0.32, 3136],
      ] as const)
        note(at, 0.4, pitch, pitch, 0.07)
      break
    case 'win':
      for (const [at, pitch] of [
        [0, 523],
        [0.14, 659],
        [0.28, 784],
        [0.46, 1047],
      ] as const) {
        note(at, 0.34, pitch, pitch, 0.16, 'triangle')
        note(at, 0.2, pitch * 2, pitch * 2, 0.03)
      }
      note(0.7, 0.8, 784, 784, 0.1)
      note(0.7, 0.8, 1047, 1047, 0.1)
      note(0.7, 0.8, 1319, 1319, 0.08)
      hiss(0.46, 0.5, 3200, 0.06, 'highpass')
      break
    case 'learned':
      note(0, 0.15, 784, 784, 0.14)
      note(0.14, 0.3, 1175, 1175, 0.14)
      break
    case 'flavor':
      note(0, 0.24, 300, 620, 0.16)
      break
  }
}

/** Effects plus a soft, continuous fire whoosh that follows the voice. */
export class MorozhenkaAudio {
  private ctx: AudioContext | null = null
  private readonly sources = new Set<AudioScheduledSourceNode>()
  private fireSource: AudioBufferSourceNode | null = null
  private fireFilter: BiquadFilterNode | null = null
  private fireGain: GainNode | null = null
  private firePower = 0
  /** performance.now() until which a tonal effect may reach the microphone. */
  tonalUntil = 0
  private readonly enabled: () => boolean

  constructor(enabled: () => boolean) {
    this.enabled = enabled
  }

  unlock(): void {
    if (!this.enabled()) return
    try {
      this.ctx ??= new AudioContext()
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {})
    } catch {
      // Sound is optional.
    }
  }

  play(effect: MorozhenkaEffect): void {
    if (!this.enabled() || document.hidden) return
    this.unlock()
    const ctx = this.ctx
    if (!ctx) return
    if (effect !== 'tap') this.tonalUntil = Math.max(this.tonalUntil, performance.now() + EFFECT_LENGTH[effect] * 1000 + 120)
    synthesizeEffect(ctx, ctx.destination, effect, ctx.currentTime + 0.01, (source, nodes) => {
      this.sources.add(source)
      source.onended = () => {
        this.sources.delete(source)
        source.disconnect()
        nodes.forEach((node) => node.disconnect())
      }
    })
  }

  /** 0 turns the fire off. Noise only — it never sounds like a vowel. */
  fire(power: number): void {
    const target = this.enabled() && !document.hidden ? Math.max(0, Math.min(1, power)) : 0
    if (target === 0 && !this.fireGain) return
    if (target > 0) this.unlock()
    const ctx = this.ctx
    if (!ctx) return
    if (!this.fireSource) {
      if (target === 0) return
      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer(ctx, 1.3, 991)
      source.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 0.9
      filter.frequency.value = 700
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(filter).connect(gain).connect(ctx.destination)
      source.start()
      this.fireSource = source
      this.fireFilter = filter
      this.fireGain = gain
    }
    if (Math.abs(target - this.firePower) < 0.02) return
    this.firePower = target
    const now = ctx.currentTime
    this.fireGain!.gain.setTargetAtTime(target * 0.075, now, 0.05)
    this.fireFilter!.frequency.setTargetAtTime(520 + target * 1100, now, 0.08)
  }

  private stopFire(): void {
    try {
      this.fireSource?.stop()
    } catch {
      // already stopped
    }
    this.fireSource?.disconnect()
    this.fireFilter?.disconnect()
    this.fireGain?.disconnect()
    this.fireSource = null
    this.fireFilter = null
    this.fireGain = null
    this.firePower = 0
  }

  silence(): void {
    this.stopFire()
    this.sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // already ended
      }
    })
    this.sources.clear()
    this.tonalUntil = 0
  }

  destroy(): void {
    this.silence()
    if (this.ctx) void this.ctx.close().catch(() => {})
    this.ctx = null
  }
}
