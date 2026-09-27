/**
 * Sound for Больница кошечки: short, warm, original effects synthesised with
 * the Web Audio API, plus the little healing song that climbs one note per
 * correct answer. No samples, nothing recorded.
 */

export const BOLNICA_EFFECTS = [
  'tap',
  'knock',
  'bell',
  'shutter',
  'flash',
  'develop',
  'ticket',
  'roll',
  'grumble',
  'caught',
  'oops',
  'sneak',
  'correct',
  'wrong',
  'retry',
  'siren',
  'heal',
  'return',
  'wardrobe',
  'pop',
  'name',
  'listen',
  'cheer',
  'step',
] as const
export type BolnicaEffect = (typeof BOLNICA_EFFECTS)[number]

/**
 * How long each effect audibly rings (seconds): measured from the rendered PCM
 * (last sample above -60 dBFS) plus a little air.
 */
export const EFFECT_LENGTH: Record<BolnicaEffect, number> = {
  tap: 0.08,
  knock: 0.28,
  bell: 0.95,
  shutter: 0.15,
  flash: 0.5,
  develop: 1.4,
  ticket: 0.45,
  roll: 0.75,
  grumble: 0.48,
  caught: 0.78,
  oops: 0.56,
  sneak: 1,
  correct: 0.32,
  wrong: 0.24,
  retry: 0.31,
  siren: 1.55,
  heal: 1.55,
  return: 1,
  wardrobe: 0.4,
  pop: 0.13,
  name: 0.48,
  listen: 0.12,
  cheer: 1.1,
  step: 1,
}

type Track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => void

/** Disconnects a finished voice when nobody else is tracking it (offline renders). */
const releaseOnEnd: Track = (source, nodes) => {
  source.onended = () => {
    source.disconnect()
    nodes.forEach((node) => node.disconnect())
  }
}

// ---------------------------------------------------------------- melody

/** Semitones above C5. Major pentatonic, so any notes sound good together. */
const MELODY = [0, 2, 4, 7, 9, 12, 14, 16, 19]
/** After the climb the song dances between its two top notes. */
const MELODY_TOP = [16, 19]
const MAX_SONG_NOTES = 24
/** Envelope lengths; the audible ring (to -60 dBFS) is shorter. */
const NOTE_RING = 0.75
const CHORD_RING = 1.3
const NOTE_AUDIBLE = 0.58
const CHORD_AUDIBLE = 1.15

/** C5 = 0, D5 = 2, E5 = 4, G5 = 7, A5 = 9, C6 = 12 … */
function hz(semitones: number): number {
  return 523.2511 * 2 ** (semitones / 12)
}

function stepIndex(step: number): number {
  return Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0
}

/** Pitch (Hz) of healing-song note `step`: C5 climbing the pentatonic scale to G6. */
export function melodyFrequency(step: number): number {
  const index = stepIndex(step)
  const semitones = index < MELODY.length ? MELODY[index] : MELODY_TOP[(index - MELODY.length) % MELODY_TOP.length]
  return hz(semitones)
}

function songCount(count: number): number {
  return Number.isFinite(count) ? Math.min(MAX_SONG_NOTES, Math.max(0, Math.floor(count))) : 0
}

/** Longer songs play a little faster so a long word never drags. */
function songSpacing(count: number): number {
  return count <= 8 ? 0.17 : Math.max(0.07, 1.36 / count)
}

function chordStart(count: number): number {
  return count === 0 ? 0 : count * songSpacing(count) + 0.05
}

/** Seconds the healing song of `count` notes audibly rings, final chord included. */
export function songLength(count: number): number {
  return chordStart(songCount(count)) + CHORD_AUDIBLE
}

/** The quiet ones are the high ones: the ear is keener up there. */
function melodyVolume(frequency: number): number {
  return 0.16 * Math.min(1, Math.max(0.72, 1.18 - frequency / 2600))
}

// ---------------------------------------------------------------- voices

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

/** Deterministic white noise, shared by all voices of one context. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx)
  if (buffer) return buffer
  buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let state = 5813
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    data[i] = state / 2147483648
  }
  noiseBuffers.set(ctx, buffer)
  return buffer
}

interface ToneOptions {
  /** Offset from the effect start (s). */
  at: number
  /** Envelope length (s). */
  len: number
  /** Starting frequency (Hz). */
  f: number
  /** Frequency reached after `glide` (default `len`), exponential slide. */
  to?: number
  glide?: number
  /** Pitch contour instead of `to`: [seconds after `at`, Hz] points. */
  path?: ReadonlyArray<readonly [number, number]>
  vol: number
  wave?: OscillatorType
  attack?: number
  /** When the decay starts (s after `at`); default: right after the attack. */
  hold?: number
  /** Lowpass cutoff, optionally sweeping to `cutTo`. */
  cut?: number
  cutTo?: number
  q?: number
  /** Vibrato: rate (Hz), depth (cents). */
  wobble?: readonly [number, number]
  /** Tremolo: rate (Hz), depth (0..0.5). */
  flutter?: readonly [number, number]
}

interface HissOptions {
  at: number
  len: number
  /** Filter frequency, optionally sweeping to `to`. */
  f: number
  to?: number
  vol: number
  type?: BiquadFilterType
  q?: number
  attack?: number
  hold?: number
  flutter?: readonly [number, number]
}

function voices(ctx: BaseAudioContext, destination: AudioNode, start: number, track: Track) {
  let noiseOffset = 0

  function envelope(param: AudioParam, at: number, len: number, vol: number, attack?: number, hold?: number): void {
    const rise = Math.min(attack ?? 0.02, len / 3)
    param.setValueAtTime(0.0001, at)
    param.exponentialRampToValueAtTime(vol, at + rise)
    if (hold !== undefined && hold > rise && hold < len) param.setValueAtTime(vol, at + hold)
    param.exponentialRampToValueAtTime(0.0001, at + len)
  }

  function lfo(at: number, end: number, rate: number, depth: number, target: AudioParam): void {
    const osc = ctx.createOscillator()
    const amount = ctx.createGain()
    osc.frequency.value = rate
    amount.gain.value = depth
    osc.connect(amount).connect(target)
    track(osc, [amount])
    osc.start(at)
    osc.stop(end)
  }

  function tremolo(at: number, end: number, flutter: readonly [number, number], nodes: AudioNode[]): GainNode {
    const amp = ctx.createGain()
    amp.gain.value = 1 - flutter[1]
    lfo(at, end, flutter[0], flutter[1], amp.gain)
    nodes.push(amp)
    return amp
  }

  function tone(o: ToneOptions): void {
    const at = start + o.at
    const end = at + o.len + 0.03
    const osc = ctx.createOscillator()
    osc.type = o.wave ?? 'sine'
    osc.frequency.setValueAtTime(o.f, at)
    if (o.path) for (const [time, frequency] of o.path) osc.frequency.exponentialRampToValueAtTime(frequency, at + time)
    else if (o.to !== undefined && o.to !== o.f) osc.frequency.exponentialRampToValueAtTime(o.to, at + (o.glide ?? o.len))
    const gain = ctx.createGain()
    envelope(gain.gain, at, o.len, o.vol, o.attack ?? 0.012, o.hold)
    const nodes: AudioNode[] = [gain]
    let head: AudioNode = osc
    if (o.cut) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.Q.value = o.q ?? 0.7
      filter.frequency.setValueAtTime(o.cut, at)
      if (o.cutTo) filter.frequency.exponentialRampToValueAtTime(o.cutTo, at + o.len)
      head = head.connect(filter)
      nodes.push(filter)
    }
    if (o.flutter) head = head.connect(tremolo(at, end, o.flutter, nodes))
    head.connect(gain).connect(destination)
    if (o.wobble) lfo(at, end, o.wobble[0], o.wobble[1], osc.detune)
    track(osc, nodes)
    osc.start(at)
    osc.stop(end)
  }

  function hiss(o: HissOptions): void {
    const at = start + o.at
    const end = at + o.len + 0.03
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer(ctx)
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = o.type ?? 'bandpass'
    filter.Q.value = o.q ?? 0.8
    filter.frequency.setValueAtTime(o.f, at)
    if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, at + o.len)
    const gain = ctx.createGain()
    envelope(gain.gain, at, o.len, o.vol, o.attack ?? 0.01, o.hold)
    const nodes: AudioNode[] = [filter, gain]
    let head: AudioNode = source.connect(filter)
    if (o.flutter) head = head.connect(tremolo(at, end, o.flutter, nodes))
    head.connect(gain).connect(destination)
    track(source, nodes)
    noiseOffset = (noiseOffset + 0.373) % 1.7
    source.start(at, noiseOffset)
    source.stop(end)
  }

  /** Celesta-like note: warm fundamental, a quick bright octave on top. */
  function chime(at: number, f: number, vol: number, len = NOTE_RING): void {
    tone({ at, len, f, vol, attack: 0.004 })
    tone({ at, len: len * 0.8, f: f * 1.004, vol: vol * 0.22, attack: 0.004 })
    tone({ at, len: len * 0.35, f: f * 2, vol: vol * 0.3, attack: 0.003 })
    tone({ at, len: len * 0.12, f: f * 3, vol: vol * 0.1, attack: 0.002 })
  }

  /** Small metal bell: inharmonic partials, the high ones die first. */
  function bell(at: number, f: number, vol: number, len: number): void {
    tone({ at, len, f, vol, attack: 0.003 })
    tone({ at, len: len * 0.9, f: f * 1.0035, vol: vol * 0.35, attack: 0.003 })
    if (f * 2.76 < 12000) tone({ at, len: len * 0.5, f: f * 2.76, vol: vol * 0.28, attack: 0.002 })
    if (f * 5.4 < 12000) tone({ at, len: len * 0.2, f: f * 5.4, vol: vol * 0.1, attack: 0.002 })
  }

  /** Soft mallet on wood: a quick 4th partial gives the knock. */
  function mallet(at: number, f: number, vol: number, len: number): void {
    tone({ at, len, f, vol, attack: 0.004 })
    tone({ at, len: len * 0.18, f: f * 4, vol: vol * 0.16, attack: 0.002 })
    tone({ at, len: len * 0.5, f: f * 2, vol: vol * 0.12, attack: 0.003 })
  }

  /** Plucked string: the brightness closes fast, like pizzicato. */
  function pluck(at: number, f: number, vol: number): void {
    tone({ at, len: 0.2, f, vol, wave: 'triangle', cut: f * 7, cutTo: f * 1.6, attack: 0.003 })
    tone({ at, len: 0.1, f: f * 2, vol: vol * 0.35, attack: 0.002 })
    hiss({ at, len: 0.02, f: f * 6, q: 2, vol: vol * 0.6, attack: 0.001 })
  }

  return { tone, hiss, chime, bell, mallet, pluck }
}

// ---------------------------------------------------------------- effects

/** Schedules one effect at `start` on `destination`. Also used by the offline render check. */
export function synthesizeEffect(
  ctx: BaseAudioContext,
  destination: AudioNode,
  effect: BolnicaEffect,
  start: number,
  track: Track = releaseOnEnd,
): void {
  const { tone, hiss, chime, bell, mallet, pluck } = voices(ctx, destination, start, track)
  switch (effect) {
    case 'tap':
      tone({ at: 0, len: 0.07, f: 1050, to: 700, vol: 0.12, attack: 0.003 })
      hiss({ at: 0, len: 0.012, f: 3200, q: 1.5, vol: 0.08, attack: 0.001 })
      break

    case 'knock':
      // Knock-knock on a wooden door: a hollow body, a woody ring, a knuckle click.
      for (const [at, v] of [
        [0, 1],
        [0.16, 0.85],
      ] as const) {
        tone({ at, len: 0.12, f: 230, to: 140, vol: 0.28 * v, attack: 0.003 })
        tone({ at, len: 0.08, f: 590, to: 430, vol: 0.12 * v, wave: 'triangle', attack: 0.002 })
        hiss({ at, len: 0.04, f: 1250, q: 1.6, vol: 0.5 * v, attack: 0.002 })
      }
      break

    case 'bell':
      // The reception desk bell: one bright strike, a long friendly ring.
      hiss({ at: 0, len: 0.015, f: 5500, type: 'highpass', vol: 0.12, attack: 0.001 })
      bell(0.002, hz(16), 0.12, 1.25)
      break

    case 'shutter':
      hiss({ at: 0, len: 0.022, f: 3400, q: 1.3, vol: 0.55, attack: 0.001 })
      tone({ at: 0, len: 0.025, f: 1900, to: 1300, vol: 0.05, wave: 'triangle', attack: 0.001 })
      hiss({ at: 0.026, len: 0.045, f: 5200, to: 2600, q: 0.8, vol: 0.14, attack: 0.004 })
      hiss({ at: 0.075, len: 0.05, f: 1500, q: 1.1, vol: 0.55, attack: 0.001 })
      tone({ at: 0.075, len: 0.06, f: 280, to: 140, vol: 0.14, attack: 0.002 })
      break

    case 'flash':
      // A bright whoosh up, then a sparkle.
      hiss({ at: 0, len: 0.3, f: 1100, to: 7000, q: 0.9, vol: 0.3, attack: 0.05 })
      tone({ at: 0.02, len: 0.26, f: 1200, to: 2600, vol: 0.07, attack: 0.05 })
      bell(0.2, hz(28), 0.06, 0.35)
      bell(0.27, hz(31), 0.045, 0.3)
      break

    case 'develop': {
      // The polaroid slowly appears: a soft swell with rising glints.
      hiss({ at: 0, len: 1.4, f: 900, to: 4500, q: 1.1, vol: 0.06, attack: 0.5, hold: 0.95 })
      for (const semitones of [0, 7]) {
        tone({ at: 0, len: 1.45, f: hz(semitones), vol: 0.035, wave: 'triangle', cut: 1500, attack: 0.5, hold: 1, wobble: [4.5, 8] })
      }
      const glints = [7, 9, 12, 14, 16, 19, 21, 24]
      glints.forEach((semitones, i) => bell(0.18 + i * 0.13, hz(semitones), 0.03 + i * 0.004, 0.36))
      break
    }

    case 'ticket':
      // A little printer chatters, then the ticket tears off.
      tone({ at: 0, len: 0.3, f: 170, vol: 0.035, wave: 'sawtooth', cut: 900, attack: 0.02, hold: 0.24 })
      for (let i = 0; i < 9; i++) hiss({ at: i * 0.03, len: 0.014, f: 3800, q: 2.5, vol: 0.34, attack: 0.001 })
      hiss({ at: 0.32, len: 0.17, f: 3200, to: 1500, q: 0.9, vol: 0.5, attack: 0.006, flutter: [70, 0.45] })
      break

    case 'roll': {
      // The roller shutter rattles down, slat by slat, and lands.
      hiss({ at: 0, len: 0.62, f: 420, type: 'lowpass', vol: 0.13, attack: 0.04, hold: 0.5 })
      let at = 0
      let gap = 0.05
      for (let i = 0; at < 0.58; i++) {
        hiss({ at, len: 0.022, f: i % 2 ? 2300 : 1800, q: 2.2, vol: 0.3, attack: 0.001 })
        tone({ at, len: 0.045, f: i % 2 ? 930 : 780, vol: 0.035, wave: 'triangle', attack: 0.001 })
        at += gap
        gap *= 0.97
      }
      tone({ at: 0.62, len: 0.15, f: 170, to: 75, vol: 0.28, attack: 0.003 })
      tone({ at: 0.62, len: 0.1, f: 440, to: 310, vol: 0.08, wave: 'triangle', attack: 0.002 })
      hiss({ at: 0.62, len: 0.08, f: 700, type: 'lowpass', vol: 0.35, attack: 0.002 })
      break
    }

    case 'grumble': {
      // A caught monster's silly "hrrrm-ph!": a growly hum that sags, then a puff.
      const contour = [
        [0.1, 228],
        [0.34, 150],
      ] as const
      tone({ at: 0, len: 0.38, f: 182, path: contour, vol: 0.15, wave: 'sawtooth', cut: 760, q: 2.2, attack: 0.05, hold: 0.28, flutter: [22, 0.3] })
      tone({ at: 0, len: 0.38, f: 182, path: contour, vol: 0.07, wave: 'triangle', attack: 0.05, hold: 0.28 })
      hiss({ at: 0.37, len: 0.12, f: 1100, type: 'lowpass', vol: 0.28, attack: 0.006 })
      tone({ at: 0.37, len: 0.09, f: 280, to: 150, vol: 0.09, wave: 'triangle', attack: 0.003 })
      break
    }

    case 'caught':
      // "Got you!": a quick run up to a bright little chord.
      ;[7, 12, 16].forEach((semitones, i) => tone({ at: i * 0.075, len: 0.14, f: hz(semitones), vol: 0.1, wave: 'triangle', attack: 0.004 }))
      for (const semitones of [12, 16, 19]) chime(0.24, hz(semitones), 0.075, 0.6)
      bell(0.3, hz(31), 0.03, 0.4)
      bell(0.38, hz(36), 0.022, 0.35)
      break

    case 'oops':
      // "Uh-oh": two soft sung notes, a minor third down.
      tone({ at: 0, len: 0.2, f: hz(4) * 0.96, path: [[0.04, hz(4)]], vol: 0.105, wave: 'triangle', cut: 1700, attack: 0.02, hold: 0.12 })
      tone({ at: 0, len: 0.2, f: hz(4) * 0.96, path: [[0.04, hz(4)]], vol: 0.045, attack: 0.02, hold: 0.12 })
      tone({
        at: 0.24,
        len: 0.34,
        f: hz(1) * 1.02,
        path: [
          [0.05, hz(1)],
          [0.34, hz(1) * 0.95],
        ],
        vol: 0.105,
        wave: 'triangle',
        cut: 1500,
        attack: 0.02,
        hold: 0.16,
        wobble: [6, 14],
      })
      tone({ at: 0.24, len: 0.34, f: hz(1), to: hz(1) * 0.95, vol: 0.045, attack: 0.02, hold: 0.16 })
      break

    case 'sneak':
      // Tiptoe, tiptoe… a sneaky pizzicato creeping up by semitones.
      for (const [at, semitones, v] of [
        [0, -10, 1],
        [0.15, -7, 0.85],
        [0.36, -10, 1],
        [0.51, -7, 0.85],
        [0.72, -4, 0.95],
        [0.84, -3, 1.1],
      ] as const)
        pluck(at, hz(semitones), 0.2 * v)
      break

    case 'correct':
      // A sparkle on top of the healing-song note (the app plays note(step) too).
      bell(0, hz(24), 0.06, 0.34)
      bell(0.07, hz(31), 0.05, 0.3)
      hiss({ at: 0, len: 0.2, f: 7000, type: 'highpass', vol: 0.04, attack: 0.01 })
      break

    case 'wrong':
      // A soft rubbery bonk, over quickly.
      tone({ at: 0, len: 0.26, f: 330, to: 150, glide: 0.18, vol: 0.15, wave: 'triangle', cut: 1300, attack: 0.004 })
      tone({ at: 0, len: 0.26, f: 330, to: 150, glide: 0.18, vol: 0.075, attack: 0.004 })
      tone({ at: 0, len: 0.12, f: 660, to: 300, vol: 0.05, wave: 'triangle', attack: 0.003 })
      hiss({ at: 0, len: 0.05, f: 520, type: 'lowpass', vol: 0.22, attack: 0.002 })
      break

    case 'retry': {
      // "Hm?": a hum that lifts like a question.
      const path = [
        [0.12, 425],
        [0.28, 610],
      ] as const
      tone({ at: 0, len: 0.3, f: 440, path, vol: 0.085, wave: 'triangle', cut: 1500, attack: 0.03, hold: 0.22 })
      tone({ at: 0, len: 0.3, f: 440, path, vol: 0.045, attack: 0.03, hold: 0.22 })
      break
    }

    case 'siren': {
      // A toy ambulance, nee-naw nee-naw, a soft fourth apart.
      const high = hz(5)
      const low = hz(0)
      const path = [
        [0.34, high],
        [0.37, low],
        [0.71, low],
        [0.74, high],
        [1.08, high],
        [1.11, low],
        [1.5, low],
      ] as const
      tone({ at: 0, len: 1.55, f: high, path, vol: 0.065, wave: 'triangle', cut: 2200, attack: 0.06, hold: 1.38, wobble: [5.5, 10] })
      tone({ at: 0, len: 1.55, f: high, path, vol: 0.036, attack: 0.06, hold: 1.38 })
      break
    }

    case 'heal': {
      // A warm harp glissando up to a ringing chord, with a glow underneath.
      const gliss = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
      gliss.forEach((semitones, i) => chime(i * 0.045, hz(semitones), 0.07 - i * 0.0025, 0.7))
      for (const semitones of [0, 4, 7]) {
        tone({ at: 0.05, len: 1.6, f: hz(semitones), vol: 0.03, wave: 'triangle', cut: 1400, attack: 0.35, hold: 1, wobble: [4, 7] })
      }
      for (const semitones of [12, 16, 19]) bell(0.55, hz(semitones), 0.06, 1.15)
      hiss({ at: 0.45, len: 0.9, f: 6500, type: 'highpass', vol: 0.03, attack: 0.25 })
      break
    }

    case 'return':
      // "Welcome back!": a gentle marimba arpeggio that lands and glows.
      for (const [at, semitones] of [
        [0, -5],
        [0.13, 0],
        [0.26, 4],
      ] as const)
        mallet(at, hz(semitones), 0.16, 0.4)
      mallet(0.42, hz(7), 0.17, 0.75)
      chime(0.42, hz(19), 0.035, 0.7)
      break

    case 'wardrobe':
      // Fabric swish-swoosh and a wooden hanger clack.
      hiss({ at: 0, len: 0.24, f: 700, to: 2600, q: 0.9, vol: 0.48, attack: 0.1 })
      hiss({ at: 0.17, len: 0.28, f: 2400, to: 900, q: 0.9, vol: 0.4, attack: 0.08 })
      hiss({ at: 0.02, len: 0.018, f: 2600, q: 3, vol: 0.12, attack: 0.001 })
      tone({ at: 0.02, len: 0.06, f: 1150, vol: 0.03, wave: 'triangle', attack: 0.002 })
      break

    case 'pop':
      tone({ at: 0, len: 0.09, f: 320, to: 1150, glide: 0.05, vol: 0.22, attack: 0.004 })
      tone({ at: 0.055, len: 0.07, f: 600, to: 1700, glide: 0.04, vol: 0.08, attack: 0.003 })
      hiss({ at: 0, len: 0.015, f: 2500, q: 1, vol: 0.12, attack: 0.001 })
      break

    case 'name':
      // Typewriter: a key strike, then the little carriage bell.
      hiss({ at: 0, len: 0.025, f: 2600, q: 1.4, vol: 0.45, attack: 0.001 })
      tone({ at: 0, len: 0.04, f: 240, to: 120, vol: 0.12, attack: 0.002 })
      bell(0.06, hz(21), 0.075, 0.6)
      break

    case 'listen':
      // The microphone opens: one short, clean rising blip.
      tone({ at: 0, len: 0.13, f: 620, to: 1240, glide: 0.1, vol: 0.12, attack: 0.012 })
      tone({ at: 0, len: 0.1, f: 1240, to: 2480, vol: 0.015, attack: 0.012 })
      break

    case 'cheer': {
      // A party horn unrolls, confetti tinkles down.
      const horn = [
        [0.05, 400],
        [0.38, 470],
      ] as const
      tone({ at: 0, len: 0.42, f: 330, path: horn, vol: 0.1, wave: 'sawtooth', cut: 2400, q: 1.2, attack: 0.02, hold: 0.32, flutter: [30, 0.3] })
      tone({ at: 0, len: 0.42, f: 330, path: horn, vol: 0.05, wave: 'triangle', attack: 0.02, hold: 0.32 })
      for (const [at, semitones] of [
        [0.3, 31],
        [0.37, 28],
        [0.44, 36],
        [0.52, 33],
        [0.6, 26],
        [0.69, 31],
        [0.78, 38],
        [0.88, 33],
      ] as const)
        bell(at, hz(semitones), 0.035, 0.3)
      hiss({ at: 0.28, len: 0.65, f: 6500, type: 'highpass', vol: 0.035, attack: 0.05 })
      break
    }

    case 'step':
      // Soft paws padding away, a little quieter each time.
      ;[1, 0.78, 0.6, 0.45].forEach((v, i) => {
        const at = i * 0.3
        tone({ at, len: 0.09, f: i % 2 ? 150 : 170, to: 80, vol: 0.24 * v, attack: 0.004 })
        hiss({ at, len: 0.06, f: i % 2 ? 900 : 1100, q: 1.2, vol: 0.3 * v, attack: 0.003 })
      })
      break
  }
}

/** One note of the healing song. */
export function synthesizeNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  step: number,
  start: number,
  track: Track = releaseOnEnd,
): void {
  const f = melodyFrequency(step)
  voices(ctx, destination, start, track).chime(0, f, melodyVolume(f))
}

/** The whole healing song: notes 0..count-1, then a strummed C major chord. Returns seconds. */
export function synthesizeSong(
  ctx: BaseAudioContext,
  destination: AudioNode,
  count: number,
  start: number,
  track: Track = releaseOnEnd,
): number {
  const n = songCount(count)
  const { chime, bell } = voices(ctx, destination, start, track)
  const spacing = songSpacing(n)
  for (let i = 0; i < n; i++) {
    const f = melodyFrequency(i)
    chime(i * spacing, f, melodyVolume(f) * 0.9, NOTE_RING * 0.8)
  }
  const at = chordStart(n)
  // Open voicing from C5 up to E6, so it crowns short and long climbs alike.
  ;[0, 7, 12, 16].forEach((semitones, i) => chime(at + i * 0.035, hz(semitones), 0.075 - i * 0.006, CHORD_RING - 0.05))
  bell(at + 0.16, hz(24), 0.03, 0.8)
  return songLength(n)
}

// ---------------------------------------------------------------- player

type AudioContextClass = new () => AudioContext

function audioContextClass(): AudioContextClass | null {
  const scope = globalThis as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden === true
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

const FADE = 0.03
/** Voices ringing at once before we stop scheduling more (keeps tapping kids from piling up sound). */
const MAX_VOICES = 240

type Schedule = (ctx: AudioContext, bus: AudioNode, at: number, track: Track) => void

/** Owns the AudioContext and every voice, so mute, navigation and hiding the page stop all sound. */
export class BolnicaAudio {
  /** performance.now() (ms) until which our sounds ring: the app waits before opening the microphone. */
  busyUntil = 0
  private ctx: AudioContext | null = null
  private bus: GainNode | null = null
  private readonly voices = new Map<AudioScheduledSourceNode, AudioNode[]>()
  private generation = 0
  private primed = false
  private destroyed = false
  private readonly enabled: () => boolean
  private readonly onVisibility = (): void => {
    if (pageHidden()) this.silence()
  }
  private readonly track: Track = (source, nodes) => {
    this.voices.set(source, nodes)
    source.onended = () => {
      this.voices.delete(source)
      source.disconnect()
      nodes.forEach((node) => node.disconnect())
    }
  }

  constructor(enabled: () => boolean) {
    this.enabled = enabled
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility)
  }

  /** Call inside a user gesture (tap/click): creates and resumes the context. */
  unlock(): void {
    if (this.destroyed || !this.enabled()) return
    try {
      const Context = audioContextClass()
      if (!Context) return
      this.ctx ??= new Context()
      const ctx = this.ctx
      if (ctx.state !== 'running') void ctx.resume().catch(() => {})
      if (!this.primed) {
        // Older iOS only opens the audio route once something plays inside the gesture.
        this.primed = true
        const blank = ctx.createBufferSource()
        blank.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
        blank.connect(ctx.destination)
        blank.onended = () => blank.disconnect()
        blank.start()
      }
    } catch {
      // Sound is optional.
    }
  }

  play(effect: BolnicaEffect): void {
    if (!Object.hasOwn(EFFECT_LENGTH, effect)) return
    this.schedule(EFFECT_LENGTH[effect], (ctx, bus, at, track) => synthesizeEffect(ctx, bus, effect, at, track))
  }

  /** One note of the healing song; step 0, 1, 2 … climbs the melody. */
  note(step: number): void {
    this.schedule(NOTE_AUDIBLE, (ctx, bus, at, track) => synthesizeNote(ctx, bus, step, at, track))
  }

  /**
   * The whole healing song: note(0..count-1) and a final chord.
   * Returns its duration in ms (the same whether or not sound is on, so animations can follow it).
   */
  song(count: number): number {
    const seconds = songLength(count)
    this.schedule(seconds, (ctx, bus, at, track) => {
      synthesizeSong(ctx, bus, count, at, track)
    })
    return Math.round(seconds * 1000)
  }

  /** Stops everything that rings or is scheduled, with a tiny fade instead of a click. */
  silence(): void {
    this.generation++
    this.busyUntil = 0
    const ctx = this.ctx
    const bus = this.bus
    this.bus = null
    const doomed = [...this.voices]
    this.voices.clear()
    if (!ctx) return
    let stopAt = 0
    try {
      stopAt = ctx.currentTime + FADE + 0.005
      if (bus) {
        bus.gain.cancelScheduledValues(ctx.currentTime)
        bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime)
        bus.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE)
      }
    } catch {
      // Closed context: nothing rings anyway.
    }
    for (const [source] of doomed) {
      try {
        source.stop(stopAt)
      } catch {
        // Already stopped.
      }
    }
    const release = () => {
      for (const [source, nodes] of doomed) {
        source.onended = null
        try {
          source.disconnect()
          nodes.forEach((node) => node.disconnect())
        } catch {
          // Already disconnected.
        }
      }
      try {
        bus?.disconnect()
      } catch {
        // Already disconnected.
      }
    }
    if (ctx.state === 'running') setTimeout(release, FADE * 1000 + 60)
    else release()
  }

  destroy(): void {
    this.silence()
    this.destroyed = true
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    const ctx = this.ctx
    this.ctx = null
    if (ctx) void ctx.close().catch(() => {})
  }

  private canPlay(): boolean {
    return !this.destroyed && this.enabled() && !pageHidden()
  }

  private output(ctx: AudioContext): GainNode {
    if (!this.bus) {
      this.bus = ctx.createGain()
      this.bus.connect(ctx.destination)
    }
    return this.bus
  }

  private schedule(seconds: number, synth: Schedule): void {
    if (!this.canPlay()) return
    try {
      this.unlock()
      const ctx = this.ctx
      if (!ctx) return
      const generation = this.generation
      this.busyUntil = Math.max(this.busyUntil, now() + seconds * 1000 + 150)
      const run = () => {
        if (generation !== this.generation || this.ctx !== ctx || !this.canPlay()) return
        if (this.voices.size > MAX_VOICES) return
        synth(ctx, this.output(ctx), ctx.currentTime + 0.012, this.track)
        this.busyUntil = Math.max(this.busyUntil, now() + seconds * 1000 + 150)
      }
      if (ctx.state === 'running') run()
      else
        void ctx
          .resume()
          .then(run)
          .catch(() => {})
    } catch {
      // The game stays playable without Web Audio.
    }
  }
}
