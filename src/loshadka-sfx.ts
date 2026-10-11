/**
 * Лошадка — small, gentle sound effects synthesised with the Web Audio API.
 * Each side of the frame has its own voice (manes: harp, clips: click and
 * twinkle, tails: swish and chime, colours: a paint bloop), and the pony has a
 * little whinny, snorts, wooden clip-clop hooves and crunchy apple bites.
 *
 * The one sample: after `unlock()` the real public-domain neigh
 * (`/sounds/horse.mp3`, shared with Kuckuck) is fetched and decoded once. The
 * neigh then plays it pony-pitched (a little faster), a little quieter and
 * faded out; until it has loaded, or if it cannot load, the synthesized
 * whinny stands in.
 *
 * `synthesizeLoshadkaEffect` and `createMaster` are exported so the offline
 * render check can play exactly what the game plays.
 */

export const LOSHADKA_EFFECTS = [
  'tap', // UI tick
  'mane', // a mane is picked: harp glissando up
  'clip', // a clip is picked: tiny click and twinkle
  'tail', // a tail is picked: soft swish and chime
  'color', // a colour is picked: paint bloop and shimmer
  'magic', // horn or wings: sparkly arpeggio
  'background', // the next background: airy whoosh and chime
  'neigh', // the pony's whinny
  'snort', // «фыр-фыр»
  'hoof', // one wooden clip or clop (index 0..3 alternates)
  'star', // a star lands in its slot (index 0/1/2 → C6/E6/G6)
  'fanfare', // the pony is finished
  'gift', // the wrapped gift rattles
  'open', // the gift opens
  'munch', // three crunchy apple bites
  'nope', // something is still missing
  'whoosh', // overlays and flying things
  'name', // a name is chosen
  'trot', // a few hoof beats
  'bye', // a pony trots away
] as const
export type LoshadkaEffect = (typeof LOSHADKA_EFFECTS)[number]

/**
 * How long each effect audibly rings (seconds): measured from the rendered PCM
 * (last sample above -60 dBFS) plus a little air. Handy for timing animations.
 */
export const EFFECT_SECONDS: Record<LoshadkaEffect, number> = {
  tap: 0.06,
  mane: 0.73,
  clip: 0.51,
  tail: 0.68,
  color: 0.53,
  magic: 0.86,
  background: 1.02,
  neigh: 1.05,
  snort: 0.37,
  hoof: 0.06,
  star: 0.73,
  fanfare: 1.05,
  gift: 0.55,
  open: 0.65,
  munch: 1.08,
  nope: 0.24,
  whoosh: 0.45,
  name: 0.61,
  trot: 0.8,
  bye: 1.63,
}

/** Everything passes through this gain, then a soft guard that only bends piled-up peaks. */
export const MASTER_GAIN = 0.5

/** The real neigh, shared with Kuckuck (see public/sounds/CREDITS.md). */
export const NEIGH_SAMPLE_URL = '/sounds/horse.mp3'
/** Level of the sample before the master gain: a bit below the full (normalized) recording. */
export const NEIGH_SAMPLE_GAIN = 0.6
/** The sample starts fading out this long after it starts (seconds of output)… */
export const NEIGH_SAMPLE_FADE_AT = 1.5
/** …and is silent this much later. */
export const NEIGH_SAMPLE_FADE = 0.4

/** Playback rate of the real neigh: 1.12–1.32 by index, so it sounds like a pony and every pony a little different. */
export function neighRate(index: number): number {
  return 1.12 + (itemIndex(index) % 5) * 0.05
}

type Track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => void

/** Disconnects a finished voice when nobody else is tracking it (offline renders). */
const releaseOnEnd: Track = (source, nodes) => {
  source.onended = () => {
    source.disconnect()
    nodes.forEach((node) => node.disconnect())
  }
}

/* ─────────────── notes ─────────────── */

/** Major pentatonic steps in semitones: any of them sound good together. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36]

/** Semitones above C5: 0 = C5, 12 = C6, 16 = E6, 19 = G6. */
function hz(semitones: number): number {
  return 523.2511 * 2 ** (semitones / 12)
}

function itemIndex(index: number): number {
  return Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0
}

/* ─────────────── noise ─────────────── */

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

/** Deterministic white noise, shared by every voice of one context. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx)
  if (buffer) return buffer
  buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let state = 7741
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    data[i] = state / 2147483648
  }
  noiseBuffers.set(ctx, buffer)
  return buffer
}

/** Linear up to 0.6, then a smooth knee towards 0.88: transparent for one effect, kind to a pile-up. */
function guardCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(1025)
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1
    const a = Math.abs(x)
    curve[i] = a <= 0.6 ? x : Math.sign(x) * (0.6 + 0.35 * Math.tanh((a - 0.6) / 0.35))
  }
  return curve
}

/** The shared output: master gain → soft guard → `destination`. Returns the node to connect effects to. */
export function createMaster(ctx: BaseAudioContext, destination: AudioNode): GainNode {
  const master = ctx.createGain()
  master.gain.value = MASTER_GAIN
  let guard: WaveShaperNode | null = null
  try {
    guard = ctx.createWaveShaper()
    guard.curve = guardCurve()
  } catch {
    guard = null
  }
  if (guard) master.connect(guard).connect(destination)
  else master.connect(destination)
  return master
}

/* ─────────────── voices ─────────────── */

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
  const nyquist = ctx.sampleRate * 0.45
  let noiseOffset = 0

  function envelope(param: AudioParam, at: number, len: number, vol: number, attack?: number, hold?: number): void {
    const rise = Math.min(attack ?? 0.02, len / 3)
    // A gain is 1 until its first event: start from silence, or a sub-sample start leaks one loud sample.
    param.value = 0
    param.setValueAtTime(0.0001, at)
    param.exponentialRampToValueAtTime(vol, at + rise)
    if (hold !== undefined && hold > rise && hold < len) param.setValueAtTime(vol, at + hold)
    param.exponentialRampToValueAtTime(0.0001, at + len)
  }

  /** Straight-line envelope through [seconds after `at`, level] points, silent at `end`. */
  function shape(param: AudioParam, at: number, points: ReadonlyArray<readonly [number, number]>, end: number): void {
    param.value = 0
    param.setValueAtTime(0, at)
    for (const [time, value] of points) param.linearRampToValueAtTime(value, at + time)
    param.linearRampToValueAtTime(0, at + end)
  }

  function lfo(at: number, end: number, rate: number, depth: number, targets: AudioParam[]): GainNode {
    const osc = ctx.createOscillator()
    const amount = ctx.createGain()
    osc.frequency.value = rate
    amount.gain.value = depth
    osc.connect(amount)
    for (const target of targets) amount.connect(target)
    track(osc, [amount])
    osc.start(at)
    osc.stop(end)
    return amount
  }

  function tremolo(at: number, end: number, flutter: readonly [number, number], nodes: AudioNode[]): GainNode {
    const amp = ctx.createGain()
    amp.gain.value = 1 - flutter[1]
    lfo(at, end, flutter[0], flutter[1], [amp.gain])
    nodes.push(amp)
    return amp
  }

  function tone(o: ToneOptions): void {
    if (o.f >= nyquist || !(o.vol > 0.0002)) return
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
      filter.frequency.setValueAtTime(Math.min(o.cut, nyquist), at)
      if (o.cutTo) filter.frequency.exponentialRampToValueAtTime(Math.min(o.cutTo, nyquist), at + o.len)
      head = head.connect(filter)
      nodes.push(filter)
    }
    if (o.flutter) head = head.connect(tremolo(at, end, o.flutter, nodes))
    head.connect(gain).connect(destination)
    if (o.wobble) lfo(at, end, o.wobble[0], o.wobble[1], [osc.detune])
    track(osc, nodes)
    osc.start(at)
    osc.stop(end)
  }

  function hiss(o: HissOptions): void {
    if (!(o.vol > 0.0002)) return
    const at = start + o.at
    const end = at + o.len + 0.03
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer(ctx)
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = o.type ?? 'bandpass'
    filter.Q.value = o.q ?? 0.8
    filter.frequency.setValueAtTime(Math.min(o.f, nyquist), at)
    if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.min(o.to, nyquist), at + o.len)
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
  function chime(at: number, f: number, vol: number, len = 0.7): void {
    tone({ at, len, f, vol, attack: 0.004 })
    tone({ at, len: len * 0.8, f: f * 1.004, vol: vol * 0.22, attack: 0.004 })
    tone({ at, len: len * 0.35, f: f * 2, vol: vol * 0.3, attack: 0.003 })
    tone({ at, len: len * 0.12, f: f * 3, vol: vol * 0.1, attack: 0.002 })
  }

  /** Small glass bell: inharmonic partials, the high ones die first. */
  function bell(at: number, f: number, vol: number, len: number): void {
    tone({ at, len, f, vol, attack: 0.003 })
    tone({ at, len: len * 0.9, f: f * 1.0035, vol: vol * 0.35, attack: 0.003 })
    tone({ at, len: len * 0.5, f: f * 2.76, vol: vol * 0.25, attack: 0.002 })
    tone({ at, len: len * 0.2, f: f * 5.4, vol: vol * 0.08, attack: 0.002 })
  }

  /** Harp string: a soft pluck whose brightness closes as it rings. */
  function harp(at: number, f: number, vol: number): void {
    tone({ at, len: 0.55, f, vol, wave: 'triangle', cut: f * 6, cutTo: f * 1.5, attack: 0.003 })
    tone({ at, len: 0.22, f: f * 2, vol: vol * 0.22, attack: 0.002 })
    hiss({ at, len: 0.012, f: Math.min(f * 5, 9000), q: 3, vol: vol * 0.35, attack: 0.001 })
  }

  /** Soft mallet: a quick 4th partial gives the knock. */
  function mallet(at: number, f: number, vol: number, len: number): void {
    tone({ at, len, f, vol, attack: 0.004 })
    tone({ at, len: len * 0.18, f: f * 4, vol: vol * 0.14, attack: 0.002 })
    tone({ at, len: len * 0.5, f: f * 2, vol: vol * 0.12, attack: 0.003 })
  }

  /**
   * One hoof on a wooden floor, like two coconut shells: a hollow knock that
   * rings briefly at its own pitch, a woody overtone, the hoof's soft weight.
   * `far` (0..1) takes away the bright click and the weight, as if trotting away.
   */
  function clop(at: number, high: boolean, vol: number, far = 0): void {
    const f = high ? 1000 : 720
    const near = 1 - far
    // Heel, then toe a moment later: the double contact makes it a hoof, not a drum.
    for (const [dt, v] of [
      [0, 1],
      [0.011, 0.45],
    ] as const) {
      hiss({ at: at + dt, len: 0.04, f, q: 4, vol: 1.3 * vol * v, attack: 0.0008 })
      hiss({ at: at + dt, len: 0.03, f: f * 1.55, q: 3.5, vol: 0.6 * vol * v * (0.5 + 0.5 * near), attack: 0.0008 })
      hiss({ at: at + dt, len: 0.012, f: 2600, q: 1.5, vol: 0.3 * vol * v * near, attack: 0.0005 })
    }
    tone({ at, len: 0.03, f: f * 1.05, to: f * 0.97, vol: 0.06 * vol, attack: 0.001 })
    tone({ at, len: 0.055, f: 220, to: 120, vol: 0.2 * vol * (0.4 + 0.6 * near), attack: 0.002 })
    hiss({ at, len: 0.006, f: 4200, q: 1, vol: 0.14 * vol * near, attack: 0.0005 })
  }

  /**
   * The pony's whinny. A bright, nasal squeal (up where a real neigh sits,
   * ~1.7 kHz) quavers, then tumbles down in seven little «hee» pulses, each a
   * step lower. Underneath runs a second, low voice (horses really sing two
   * pitches at once) and a breath of air that ends in a soft «hhh».
   * The squeal wanders irregularly in pitch and loudness (noise-driven, like a
   * real voice): a clean tone reads as a whistle and a regular wobble as a
   * phone ring. Formants near 1.7 and 2.8 kHz give it the «ee» of a neigh;
   * a gentle lowpass keeps it soft. `lift` shifts the whole voice a little,
   * so different ponies sound different.
   */
  function whinny(lift: number, vol: number): void {
    const at = start
    const pulses: Array<readonly [number, number]> = []
    let t = 0.2
    for (let k = 0; k < 7; k++) {
      const d = 0.074 + k * 0.005
      pulses.push([t, d])
      t += d
    }
    const end = t + 0.06
    const stop = at + end + 0.16
    const shared: AudioNode[] = []
    const node = <T extends AudioNode>(n: T): T => {
      shared.push(n)
      return n
    }
    const gainOf = (value: number) => {
      const g = node(ctx.createGain())
      g.gain.value = value
      return g
    }
    const filterOf = (type: BiquadFilterType, f: number, q: number, to?: number) => {
      const filter = node(ctx.createBiquadFilter())
      filter.type = type
      filter.Q.value = q
      filter.frequency.setValueAtTime(Math.min(f, nyquist), at)
      if (to) filter.frequency.exponentialRampToValueAtTime(Math.min(to, nyquist), at + end)
      return filter
    }
    /** Lowpassed noise as a modulator, scaled so `rms` is its typical swing. */
    const wander = (rate: number, rms: number) => {
      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer(ctx)
      source.loop = true
      const amount = gainOf(rms / (0.577 * Math.sqrt(rate / (ctx.sampleRate / 2))))
      source.connect(filterOf('lowpass', rate, 0.7)).connect(amount)
      return { source, amount }
    }
    const out = gainOf(vol)
    out.connect(filterOf('lowpass', 3800, 0.7)).connect(destination)

    // ── high voice: the squeal and its pulses
    const highPath: Array<[number, number]> = [
      [0.05, 1650],
      [0.19, 1700],
    ]
    const highLevels: Array<[number, number]> = [
      [0.035, 1],
      [0.19, 0.9],
    ]
    pulses.forEach(([s, d], k) => {
      const peak = 1600 * 0.95 ** k
      highPath.push([s + 0.012, peak], [s + d * 0.85, peak * 0.85])
      const level = 0.85 * 0.82 ** k
      highLevels.push([s + 0.012, level], [s + d * 0.8, level * 0.25])
    })
    highPath.push([end, 1600 * 0.95 ** 7 * 0.85])
    const ampHigh = node(ctx.createGain())
    shape(ampHigh.gain, at, highLevels, end)
    const highOscs: OscillatorNode[] = []
    for (const [wave, mix] of [
      ['sawtooth', 0.5],
      ['triangle', 0.5],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = wave
      osc.frequency.setValueAtTime(1150 * lift, at)
      for (const [time, f] of highPath) osc.frequency.exponentialRampToValueAtTime(f * lift, at + time)
      osc.connect(gainOf(mix)).connect(ampHigh)
      highOscs.push(osc)
    }
    // Shimmer: the loudness wavers a little, irregularly.
    const shimmer = gainOf(1)
    const shimmerWander = wander(40, 0.2)
    shimmerWander.amount.connect(shimmer.gain)
    ampHigh.connect(shimmer)
    // An «ee» vowel that opens towards «eh» as the pitch falls.
    shimmer.connect(filterOf('bandpass', 1700 * lift, 1.8, 1100 * lift)).connect(gainOf(0.9)).connect(out)
    shimmer.connect(filterOf('bandpass', 2800 * lift, 2, 2300 * lift)).connect(gainOf(0.55)).connect(out)
    shimmer.connect(filterOf('lowpass', 2200 * lift, 0.6)).connect(gainOf(0.4)).connect(out)

    // ── low voice: a nasal hum that carries the end «huh-huh»
    const lowLevels: Array<[number, number]> = [
      [0.05, 0.3],
      [0.19, 0.32],
    ]
    pulses.forEach(([s, d], k) => {
      const level = Math.min(0.48, 0.36 + 0.02 * k)
      lowLevels.push([s + 0.014, level], [s + d * 0.8, level * (k ? 0.35 : 0.6)])
    })
    const ampLow = node(ctx.createGain())
    shape(ampLow.gain, at, lowLevels, end)
    const lowPath = [
      [0.05, 460],
      [0.45, 440],
      [end, 360],
    ] as const
    const lowOscs: OscillatorNode[] = []
    for (const [wave, mix] of [
      ['triangle', 0.7],
      ['sawtooth', 0.3],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = wave
      osc.frequency.setValueAtTime(330 * lift, at)
      for (const [time, f] of lowPath) osc.frequency.exponentialRampToValueAtTime(f * lift, at + time)
      osc.connect(gainOf(mix)).connect(ampLow)
      lowOscs.push(osc)
    }
    ampLow.connect(filterOf('lowpass', 1100, 0.8)).connect(out)

    // ── pitch: a quick trill in the squeal, plus an irregular wander in both voices
    const trill = ctx.createOscillator()
    trill.frequency.value = 23
    const trillDepth = node(ctx.createGain())
    shape(
      trillDepth.gain,
      at,
      [
        [0.08, 45],
        [0.19, 45],
        [0.3, 25],
        [end, 15],
      ],
      end + 0.05,
    )
    trill.connect(trillDepth)
    for (const osc of highOscs) trillDepth.connect(osc.detune)
    const jitter = wander(150, 40)
    for (const osc of highOscs) jitter.amount.connect(osc.detune)
    const lowJitter = gainOf(0.3)
    jitter.amount.connect(lowJitter)
    for (const osc of lowOscs) lowJitter.connect(osc.detune)

    // ── breath: airy noise that follows the pulses (strongest near 2.7 kHz, like a real neigh), then a soft exhale
    const breathLevels: Array<[number, number]> = [
      [0.03, 0.62],
      [0.19, 0.56],
    ]
    pulses.forEach(([s, d], k) => breathLevels.push([s + 0.012, 0.6 + 0.06 * k], [s + d * 0.8, 0.18]))
    const breath = ctx.createBufferSource()
    breath.buffer = noiseBuffer(ctx)
    breath.loop = true
    const ampBreath = node(ctx.createGain())
    shape(ampBreath.gain, at, breathLevels, end)
    breath.connect(filterOf('bandpass', 2700, 1.1, 2100)).connect(ampBreath)
    breath.connect(filterOf('bandpass', 1600, 1.4, 1300)).connect(gainOf(0.5)).connect(ampBreath)
    ampBreath.connect(out)
    const exhale = ctx.createBufferSource()
    exhale.buffer = noiseBuffer(ctx)
    exhale.loop = true
    const ampExhale = node(ctx.createGain())
    shape(
      ampExhale.gain,
      at,
      [
        [end - 0.1, 0],
        [end - 0.02, 0.28],
      ],
      end + 0.14,
    )
    exhale.connect(filterOf('lowpass', 1400, 0.5)).connect(ampExhale).connect(out)

    // Every source ends together; the shared graph is released with the last one.
    for (const osc of [...highOscs, ...lowOscs, trill]) {
      track(osc, [])
      osc.start(at)
      osc.stop(stop)
    }
    for (const [noise, offset] of [
      [breath, 0.23],
      [jitter.source, 1.1],
      [shimmerWander.source, 0.47],
    ] as const) {
      track(noise, [])
      noise.start(at, offset)
      noise.stop(stop)
    }
    track(exhale, shared)
    exhale.start(at, 0.61)
    exhale.stop(stop + 0.01)
  }

  return { tone, hiss, chime, bell, harp, mallet, clop, whinny }
}

/* ─────────────── effects ─────────────── */

/** Schedules one effect at `start` on `destination`. Also used by the offline render check. */
export function synthesizeLoshadkaEffect(
  ctx: BaseAudioContext,
  destination: AudioNode,
  effect: LoshadkaEffect,
  index: number,
  start: number,
  track: Track = releaseOnEnd,
): void {
  const i = itemIndex(index)
  const { tone, hiss, chime, bell, harp, mallet, clop, whinny } = voices(ctx, destination, start, track)
  switch (effect) {
    case 'tap': {
      const f = 1180 * (1 + (i % 3) * 0.05)
      tone({ at: 0, len: 0.055, f, to: f * 0.7, vol: 0.12, attack: 0.002 })
      tone({ at: 0, len: 0.03, f: f * 2.3, vol: 0.025, wave: 'triangle', attack: 0.001 })
      hiss({ at: 0, len: 0.01, f: 3600, q: 1.4, vol: 0.06, attack: 0.001 })
      break
    }

    case 'mane': {
      // A harp run up the scale; every mane starts on its own step.
      const from = i % 4
      for (let k = 0; k < 8; k++) harp(k * 0.042, hz(PENTATONIC[from + k] - 5), 0.12 - k * 0.006)
      bell(8 * 0.042 + 0.02, hz(PENTATONIC[from + 8] + 7), 0.03, 0.5)
      hiss({ at: 0.1, len: 0.5, f: 6500, type: 'highpass', vol: 0.025, attack: 0.15 })
      break
    }

    case 'clip': {
      // Snap! and a little twinkle on top.
      const k = i % 4
      hiss({ at: 0, len: 0.014, f: 3800, q: 2, vol: 0.3, attack: 0.001 })
      tone({ at: 0, len: 0.03, f: 2400, to: 1500, vol: 0.065, wave: 'triangle', attack: 0.001 })
      bell(0.05, hz(PENTATONIC[k + 7]), 0.085, 0.45)
      bell(0.12, hz(PENTATONIC[k + 9]), 0.065, 0.5)
      bell(0.19, hz(PENTATONIC[k + 10]), 0.035, 0.4)
      break
    }

    case 'tail': {
      // Swish-swoosh of a tail, then one chime.
      const n = PENTATONIC[(i % 5) + 5]
      hiss({ at: 0, len: 0.26, f: 500, to: 2400, q: 0.8, vol: 0.3, attack: 0.11 })
      hiss({ at: 0.16, len: 0.24, f: 2600, to: 800, q: 0.8, vol: 0.2, attack: 0.07 })
      chime(0.2, hz(n), 0.08, 0.75)
      bell(0.27, hz(n + 12), 0.025, 0.4)
      break
    }

    case 'color': {
      // Bloo-bloop of paint, then a shimmer.
      const base = hz(PENTATONIC[i % 5] - 12)
      tone({ at: 0, len: 0.16, f: base * 0.75, to: base * 2.3, glide: 0.07, vol: 0.2, attack: 0.006 })
      tone({ at: 0, len: 0.14, f: base * 0.75, to: base * 2.3, glide: 0.07, vol: 0.07, wave: 'triangle', cut: base * 5, attack: 0.006 })
      tone({ at: 0.085, len: 0.12, f: base * 1.2, to: base * 3, glide: 0.05, vol: 0.09, attack: 0.005 })
      hiss({ at: 0.1, len: 0.45, f: 7000, type: 'highpass', vol: 0.035, attack: 0.08 })
      ;[24, 28, 31, 26].forEach((s, k) => bell(0.14 + k * 0.05, hz(s), 0.028, 0.35))
      break
    }

    case 'magic': {
      // A sparkly arpeggio over a soft glow.
      const t = PENTATONIC[i % 3]
      ;[0, 4, 7, 11, 12, 16, 19, 23, 24].forEach((s, k) => bell(k * 0.05, hz(s + t), 0.075 - k * 0.005, 0.55))
      for (const s of [0, 7]) tone({ at: 0, len: 1, f: hz(s + t - 12), vol: 0.025, wave: 'triangle', cut: 1400, attack: 0.2, hold: 0.5, wobble: [4.5, 8] })
      hiss({ at: 0.05, len: 0.85, f: 6500, type: 'highpass', vol: 0.03, attack: 0.2 })
      break
    }

    case 'background': {
      // Air sweeps across, a chord rings out.
      const t = PENTATONIC[i % 5]
      hiss({ at: 0, len: 0.6, f: 350, to: 3000, q: 0.7, vol: 0.26, attack: 0.25, hold: 0.35 })
      hiss({ at: 0.05, len: 0.6, f: 6000, type: 'highpass', vol: 0.025, attack: 0.3 })
      ;[0, 4, 7, 12].forEach((s, k) => chime(0.34 + k * 0.04, hz(s + t), 0.05, 0.8))
      break
    }

    case 'neigh':
      whinny(1 + ((i % 5) - 2) * 0.03, 0.26)
      break

    case 'snort':
      // «Фыр-фыр»: a short puff, then a longer fluttering one through soft lips.
      hiss({ at: 0, len: 0.1, f: 1100, q: 0.6, vol: 0.45, attack: 0.006, flutter: [42, 0.35] })
      hiss({ at: 0.14, len: 0.3, f: 1300, to: 450, q: 0.6, vol: 0.42, attack: 0.012, hold: 0.08, flutter: [34, 0.45] })
      tone({ at: 0.14, len: 0.28, f: 120, to: 85, vol: 0.07, wave: 'sawtooth', cut: 500, attack: 0.02, flutter: [34, 0.45] })
      break

    case 'hoof':
      clop(0, i % 2 === 0, i % 4 < 2 ? 1 : 0.88)
      break

    case 'star': {
      // The three slots ring C6, E6, G6.
      const f = hz([12, 16, 19][Math.min(i, 2)])
      bell(0, f, 0.1, 1.1)
      chime(0, f, 0.05, 0.9)
      bell(0.06, f * 2, 0.02, 0.35)
      hiss({ at: 0, len: 0.25, f: 7500, type: 'highpass', vol: 0.03, attack: 0.01 })
      break
    }

    case 'fanfare': {
      // A toy horn: G4 C5 E5, then a held chord, confetti glints on top.
      const horn = (at: number, f: number, len: number, vol: number) => {
        tone({ at, len, f, vol, wave: 'sawtooth', cut: 2200, cutTo: 1300, attack: 0.02, hold: len * 0.6, wobble: [5.5, 8] })
        tone({ at, len, f, vol: vol * 0.8, wave: 'triangle', attack: 0.015, hold: len * 0.6 })
      }
      ;[-5, 0, 4].forEach((s, k) => {
        horn(k * 0.11, hz(s), 0.14, 0.06)
        mallet(k * 0.11, hz(s), 0.06, 0.2)
      })
      for (const s of [0, 4, 7, 12]) horn(0.34, hz(s), 0.75, 0.035)
      mallet(0.34, hz(12), 0.07, 0.6)
      ;[28, 31, 36, 33, 31].forEach((s, k) => bell(0.42 + k * 0.08, hz(s), 0.025, 0.3))
      break
    }

    case 'gift':
      // The box shakes three times; little things rattle around inside.
      for (let s = 0; s < 3; s++) {
        const at = s * 0.19
        hiss({ at, len: 0.07, f: 900, type: 'lowpass', vol: 0.5, attack: 0.004 })
        tone({ at, len: 0.05, f: 160, to: 110, vol: 0.1, attack: 0.003 })
        ;[0.008, 0.022, 0.031, 0.047, 0.06, 0.078].forEach((dt, k) =>
          hiss({ at: at + dt, len: 0.01, f: [2200, 3400, 1700, 2900, 2500, 3800][(k + s) % 6], q: 1.2, vol: 0.22 - k * 0.025, attack: 0.0008 }),
        )
      }
      break

    case 'open':
      // Pop! The lid flies off and sparkles rise out of the box.
      tone({ at: 0, len: 0.1, f: 280, to: 1100, glide: 0.05, vol: 0.2, attack: 0.004 })
      hiss({ at: 0, len: 0.02, f: 2000, q: 1, vol: 0.15, attack: 0.001 })
      for (const s of [12, 16, 19]) chime(0.1, hz(s), 0.04, 0.7)
      ;[24, 28, 31, 36].forEach((s, k) => bell(0.08 + k * 0.06, hz(s), 0.045, 0.4))
      hiss({ at: 0.08, len: 0.6, f: 7000, type: 'highpass', vol: 0.03, attack: 0.1 })
      break

    case 'munch':
      // Three crunchy apple bites.
      ;[0, 0.4, 0.8].forEach((at, b) => {
        const v = [1, 0.85, 0.75][b]
        const shift = [1, 1.08, 0.94][b]
        for (const [dt, f, cv] of [
          [0, 2600, 1],
          [0.011, 3500, 0.8],
          [0.024, 1900, 0.9],
          [0.036, 3000, 0.7],
          [0.052, 2300, 0.6],
          [0.07, 3800, 0.45],
          [0.09, 2100, 0.35],
        ] as const)
          hiss({ at: at + dt, len: 0.022, f: f * shift, q: 2.2, vol: 0.45 * v * cv, attack: 0.001 })
        hiss({ at, len: 0.1, f: 1200, type: 'lowpass', vol: 0.26 * v, attack: 0.004 })
        tone({ at: at + 0.005, len: 0.07, f: 190, to: 120, vol: 0.14 * v, attack: 0.003 })
        hiss({ at: at + 0.18, len: 0.12, f: 600, type: 'lowpass', vol: 0.11 * v, attack: 0.03 })
      })
      break

    case 'nope':
      // A soft, low «boop».
      tone({ at: 0, len: 0.3, f: 280, to: 195, glide: 0.22, vol: 0.12, wave: 'triangle', cut: 900, attack: 0.012, wobble: [7, 15] })
      tone({ at: 0, len: 0.3, f: 280, to: 195, glide: 0.22, vol: 0.09, attack: 0.012 })
      break

    case 'whoosh':
      hiss({ at: 0, len: 0.5, f: 300, to: 3200, q: 1, vol: 0.35, attack: 0.2, hold: 0.28 })
      tone({ at: 0.05, len: 0.4, f: 260, to: 700, vol: 0.025, attack: 0.15 })
      break

    case 'name': {
      // Two gentle notes up: «ta-da».
      const [a, b] = [
        [7, 12],
        [4, 9],
        [9, 14],
      ][i % 3]
      chime(0, hz(a), 0.1, 0.5)
      chime(0.15, hz(b), 0.105, 0.7)
      break
    }

    case 'trot':
      for (const [at, high, v] of [
        [0, true, 1],
        [0.12, false, 0.8],
        [0.3, true, 0.95],
        [0.42, false, 0.78],
        [0.6, true, 0.9],
        [0.72, false, 0.72],
      ] as const)
        clop(at, high, v)
      break

    case 'bye':
      // Clip-clop, clip-clop… quieter and duller with every step away.
      for (let p = 0; p < 6; p++) {
        const v = 0.95 * 0.72 ** p
        const far = Math.min(1, p / 5)
        clop(p * 0.29, true, v, far)
        clop(p * 0.29 + 0.11, false, v * 0.82, far)
      }
      break
  }
}

/**
 * The real neigh from a decoded buffer: pony-pitched (`neighRate`), at
 * NEIGH_SAMPLE_GAIN, faded out after NEIGH_SAMPLE_FADE_AT. Envelope starts from silence.
 */
export function playNeighSample(
  ctx: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  index: number,
  start: number,
  track: Track = releaseOnEnd,
): void {
  const rate = neighRate(index)
  const length = buffer.duration / rate
  const fadeAt = Math.max(0.05, Math.min(NEIGH_SAMPLE_FADE_AT, length - 0.05))
  const end = Math.min(length, fadeAt + NEIGH_SAMPLE_FADE)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = rate
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(NEIGH_SAMPLE_GAIN, start + 0.015)
  gain.gain.setValueAtTime(NEIGH_SAMPLE_GAIN, start + fadeAt)
  gain.gain.linearRampToValueAtTime(0, start + end)
  source.connect(gain)
  gain.connect(destination)
  source.start(start)
  source.stop(start + end + 0.02)
  track(source, [gain])
}

/** decodeAudioData in its promise form, with the callback form of older Safari as a fallback. */
function decode(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const result = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined
    if (result && typeof result.then === 'function') result.then(resolve, reject)
  })
}

/* ─────────────── player ─────────────── */

type AudioContextClass = new () => AudioContext

function audioContextClass(): AudioContextClass | null {
  const scope = globalThis as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden === true
}

function clock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

const FADE = 0.03
/** Sources ringing at once before we stop adding more (a child tapping fast should not pile up sound). */
const MAX_SOURCES = 220
/** A sound that waited this long for a suspended context is stale: drop it rather than play it late. */
const STALE_MS = 700
/** Calls that should not stack on themselves: a new one gently replaces the one still ringing. */
const SOLO: ReadonlySet<LoshadkaEffect> = new Set<LoshadkaEffect>(['neigh', 'snort', 'munch', 'gift', 'fanfare', 'trot', 'bye', 'whoosh'])

interface Voice {
  effect: LoshadkaEffect
  bus: GainNode
  sources: Map<AudioScheduledSourceNode, AudioNode[]>
}

/** Owns the AudioContext and every voice, so mute, navigation and hiding the page stop all sound. */
export class LoshadkaSfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private primed: AudioContext | null = null
  private readonly voices = new Set<Voice>()
  private generation = 0
  private destroyed = false
  private listening = false
  private readonly enabled: () => boolean
  private readonly neighUrl: string | null
  private neighBuffer: AudioBuffer | null = null
  private neighState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
  private readonly onVisibility = (): void => {
    if (pageHidden()) this.silence()
  }

  /** `options.neighUrl`: where the real neigh lives (default NEIGH_SAMPLE_URL); null = always synthesize. */
  constructor(enabled: () => boolean, options: { neighUrl?: string | null } = {}) {
    this.enabled = enabled
    this.neighUrl = options.neighUrl === undefined ? NEIGH_SAMPLE_URL : options.neighUrl
  }

  /**
   * Call inside a user gesture (tap/click): creates and resumes the context
   * (iOS only lets audio start from a gesture), then loads the real neigh once.
   * After `destroy()` it starts a fresh context, so a page restored from the
   * back/forward cache can reuse it.
   */
  unlock(): void {
    this.destroyed = false
    if (!this.enabled()) return
    const ctx = this.wake()
    if (ctx) this.loadNeigh(ctx)
  }

  /** True once the real neigh is decoded and `play('neigh')` uses it. */
  get neighSample(): boolean {
    return this.neighBuffer !== null
  }

  /** `index`: star 0/1/2 → rising notes; hoof 0..3 alternates clip/clop; item picks vary a little per item. */
  play(effect: LoshadkaEffect, index = 0): void {
    if (!(LOSHADKA_EFFECTS as readonly string[]).includes(effect) || !this.canPlay()) return
    try {
      const ctx = this.wake()
      if (!ctx) return
      const generation = this.generation
      const asked = clock()
      const run = () => {
        if (generation !== this.generation || this.ctx !== ctx || !this.canPlay()) return
        if (clock() - asked > STALE_MS || this.sourceCount() > MAX_SOURCES) return
        this.start(ctx, effect, index)
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

  /** Stops every scheduled and ringing sound at once (with a tiny fade instead of a click). */
  silence(): void {
    this.generation++
    const ctx = this.ctx
    const doomed = [...this.voices]
    this.voices.clear()
    if (ctx) for (const voice of doomed) this.stopVoice(ctx, voice)
  }

  /** Silences and closes the context. */
  destroy(): void {
    this.silence()
    this.destroyed = true
    if (this.listening && typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    this.listening = false
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.primed = null
    if (!ctx) return
    try {
      void ctx.close().catch(() => {})
    } catch {
      // Already closed.
    }
  }

  private canPlay(): boolean {
    return !this.destroyed && this.enabled() && !pageHidden()
  }

  /** Fetches and decodes the real neigh once; any failure leaves the synthesized whinny in place. */
  private loadNeigh(ctx: AudioContext): void {
    if (this.neighState !== 'idle' || !this.neighUrl || typeof fetch !== 'function') return
    this.neighState = 'loading'
    try {
      fetch(this.neighUrl)
        .then((response) => {
          if (!response.ok) throw new Error(`neigh ${response.status}`)
          return response.arrayBuffer()
        })
        .then((data) => decode(ctx, data))
        .then((buffer) => {
          this.neighBuffer = buffer
          this.neighState = 'ready'
        })
        .catch(() => {
          // A context closed meanwhile (page left) may try again after the next unlock.
          this.neighState = ctx.state === 'closed' ? 'idle' : 'failed'
        })
    } catch {
      this.neighState = 'failed'
    }
  }

  /** Creates (or revives) the context, resumes it and opens the iOS audio route once. */
  private wake(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const Context = audioContextClass()
        if (!Context) return null
        this.ctx = new Context()
        this.master = null
        if (!this.listening && typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', this.onVisibility)
          this.listening = true
        }
      }
      const ctx = this.ctx
      if (ctx.state !== 'running') void ctx.resume().catch(() => {})
      if (this.primed !== ctx) {
        // Older iOS opens the audio route only once something plays inside the gesture.
        this.primed = ctx
        const blank = ctx.createBufferSource()
        blank.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
        blank.connect(ctx.destination)
        blank.onended = () => blank.disconnect()
        blank.start()
      }
      return ctx
    } catch {
      return null
    }
  }

  private start(ctx: AudioContext, effect: LoshadkaEffect, index: number): void {
    this.master ??= createMaster(ctx, ctx.destination)
    if (SOLO.has(effect)) for (const voice of [...this.voices]) if (voice.effect === effect) this.stopVoice(ctx, voice)
    const bus = ctx.createGain()
    bus.connect(this.master)
    const voice: Voice = { effect, bus, sources: new Map() }
    this.voices.add(voice)
    const track: Track = (source, nodes) => {
      voice.sources.set(source, nodes)
      source.onended = () => {
        voice.sources.delete(source)
        source.disconnect()
        nodes.forEach((node) => node.disconnect())
        if (voice.sources.size === 0) {
          bus.disconnect()
          this.voices.delete(voice)
        }
      }
    }
    if (effect === 'neigh' && this.neighBuffer) playNeighSample(ctx, bus, this.neighBuffer, index, ctx.currentTime + 0.01, track)
    else synthesizeLoshadkaEffect(ctx, bus, effect, index, ctx.currentTime + 0.01, track)
  }

  private stopVoice(ctx: AudioContext, voice: Voice): void {
    this.voices.delete(voice)
    let stopAt = 0
    try {
      const now = ctx.currentTime
      stopAt = now + FADE + 0.005
      voice.bus.gain.cancelScheduledValues(now)
      voice.bus.gain.setValueAtTime(voice.bus.gain.value, now)
      voice.bus.gain.linearRampToValueAtTime(0, now + FADE)
    } catch {
      // Closed context: nothing rings anyway.
    }
    for (const source of voice.sources.keys()) {
      try {
        source.stop(stopAt)
      } catch {
        // Already stopped.
      }
    }
    const release = () => {
      for (const [source, nodes] of voice.sources) {
        source.onended = null
        try {
          source.disconnect()
          nodes.forEach((node) => node.disconnect())
        } catch {
          // Already disconnected.
        }
      }
      voice.sources.clear()
      try {
        voice.bus.disconnect()
      } catch {
        // Already disconnected.
      }
    }
    if (ctx.state === 'running') setTimeout(release, FADE * 1000 + 80)
    else release()
  }

  private sourceCount(): number {
    let count = 0
    for (const voice of this.voices) count += voice.sources.size
    return count
  }
}
