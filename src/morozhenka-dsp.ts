/**
 * Voice analysis for Мороженка: pitch (is somebody singing a vowel?), loudness
 * and a small spectral-envelope fingerprint that tells А, О, У, И and Э apart.
 * Pure functions only, so the same code runs in the browser and in unit tests.
 */

export const VOWELS = ['a', 'o', 'u', 'i', 'e'] as const
export type Vowel = (typeof VOWELS)[number]

export const FRAME_SIZE = 2048
export const FEATURE_SIZE = 9

const ENV_POINTS = 28
const ENV_LOW = 200
const ENV_HIGH = 4000
const MIN_F0 = 70
/** The overall tilt (c1) shifts with loud or soft voices; trust it a little less. */
const C1_WEIGHT = 0.7
const MAX_F0 = 900

export function isVowel(value: unknown): value is Vowel {
  return typeof value === 'string' && (VOWELS as readonly string[]).includes(value)
}

const hannCache = new Map<number, Float64Array>()
function hann(n: number): Float64Array {
  let window = hannCache.get(n)
  if (!window) {
    window = new Float64Array(n)
    for (let i = 0; i < n; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    hannCache.set(n, window)
  }
  return window
}

/** In-place radix-2 FFT. `re.length` must be a power of two. */
export function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const angle = (-2 * Math.PI) / len
    const wr = Math.cos(angle)
    const wi = Math.sin(angle)
    for (let start = 0; start < n; start += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < half; k++) {
        const a = start + k
        const b = a + half
        const br = re[b] * cr - im[b] * ci
        const bi = re[b] * ci + im[b] * cr
        re[b] = re[a] - br
        im[b] = im[a] - bi
        re[a] += br
        im[a] += bi
        const next = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = next
      }
    }
  }
}

export function levelDb(samples: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  const rms = Math.sqrt(sum / Math.max(1, samples.length))
  return 20 * Math.log10(rms + 1e-9)
}

/**
 * McLeod normalised square difference on a decimated copy (~11 kHz).
 * Returns f0 = 0 when nothing periodic is found; clarity is 0…1.
 */
export function detectPitch(
  samples: ArrayLike<number>,
  sampleRate: number,
): { f0: number; clarity: number } {
  const factor = Math.max(1, Math.round(sampleRate / 11025))
  const rate = sampleRate / factor
  const n = Math.floor(samples.length / factor)
  const x = new Float64Array(n)
  let mean = 0
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let k = 0; k < factor; k++) sum += samples[i * factor + k]
    x[i] = sum / factor
    mean += x[i]
  }
  mean /= Math.max(1, n)
  for (let i = 0; i < n; i++) x[i] -= mean

  const maxLag = Math.min(Math.floor(n * 0.6), Math.ceil(rate / MIN_F0))
  const minLag = Math.max(2, Math.floor(rate / MAX_F0))
  const nsdf = new Float64Array(maxLag + 2)
  for (let tau = 0; tau < nsdf.length; tau++) {
    let acf = 0
    let energy = 0
    for (let i = 0; i + tau < n; i++) {
      acf += x[i] * x[i + tau]
      energy += x[i] * x[i] + x[i + tau] * x[i + tau]
    }
    nsdf[tau] = energy > 0 ? (2 * acf) / energy : 0
  }

  // Key maxima: the highest point of every positive lobe after the first dip.
  const peaks: number[] = []
  let tau = 1
  while (tau < nsdf.length - 1 && nsdf[tau] > 0) tau++
  let best = -1
  for (; tau < nsdf.length - 1; tau++) {
    if (nsdf[tau] > 0) {
      if (best < 0 || nsdf[tau] > nsdf[best]) best = tau
    } else if (best >= 0) {
      peaks.push(best)
      best = -1
    }
  }
  if (best >= 0) peaks.push(best)
  let highest = 0
  for (const peak of peaks) if (peak >= minLag) highest = Math.max(highest, nsdf[peak])
  if (highest <= 0) return { f0: 0, clarity: 0 }
  const chosen = peaks.find((peak) => peak >= minLag && nsdf[peak] >= highest * 0.88)
  if (chosen === undefined) return { f0: 0, clarity: 0 }

  const a = nsdf[chosen - 1]
  const b = nsdf[chosen]
  const c = nsdf[chosen + 1]
  const denom = a - 2 * b + c
  const shift = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0
  const lag = chosen + shift
  const clarity = Math.min(1, b - 0.25 * (a - c) * shift)
  const f0 = rate / lag
  if (f0 < MIN_F0 || f0 > MAX_F0) return { f0: 0, clarity: 0 }
  return { f0, clarity }
}

/**
 * Spectral envelope sampled at the voice's harmonics on a log-frequency grid
 * (dB, mean removed). Loudness drops out; the mouth shape (formants) remains.
 */
export function spectralEnvelope(
  samples: ArrayLike<number>,
  sampleRate: number,
  f0: number,
): Float64Array {
  const n = FRAME_SIZE
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  const window = hann(n)
  const offset = Math.max(0, samples.length - n)
  for (let i = 0; i < n && i + offset < samples.length; i++) re[i] = samples[i + offset] * window[i]
  fftInPlace(re, im)
  const binHz = sampleRate / n
  const nyquistBin = n / 2 - 1

  const freqs: number[] = []
  const dbs: number[] = []
  const highest = Math.min(ENV_HIGH * 1.15, sampleRate / 2 - binHz * 2)
  for (let h = 1; h * f0 <= highest; h++) {
    const center = (h * f0) / binHz
    const half = Math.max(1.5, (0.2 * f0) / binHz)
    const from = Math.max(1, Math.floor(center - half))
    const to = Math.min(nyquistBin, Math.ceil(center + half))
    let peak = 0
    for (let k = from; k <= to; k++) peak = Math.max(peak, re[k] * re[k] + im[k] * im[k])
    freqs.push(h * f0)
    dbs.push(10 * Math.log10(peak + 1e-14))
  }

  const envelope = new Float64Array(ENV_POINTS)
  let mean = 0
  for (let j = 0; j < ENV_POINTS; j++) {
    envelope[j] = interpolate(freqs, dbs, envelopeFrequency(j))
    mean += envelope[j]
  }
  mean /= ENV_POINTS
  for (let j = 0; j < ENV_POINTS; j++) envelope[j] -= mean
  return envelope
}

export function envelopeFrequency(index: number): number {
  return ENV_LOW * Math.pow(ENV_HIGH / ENV_LOW, index / (ENV_POINTS - 1))
}

/** A few cosine coefficients of the envelope: a compact vowel fingerprint. */
export function vowelFeatures(
  samples: ArrayLike<number>,
  sampleRate: number,
  f0: number,
): Float64Array {
  const envelope = spectralEnvelope(samples, sampleRate, f0)
  const features = new Float64Array(FEATURE_SIZE)
  const scale = Math.sqrt(2 / ENV_POINTS) / 10
  for (let k = 1; k <= FEATURE_SIZE; k++) {
    let sum = 0
    for (let j = 0; j < ENV_POINTS; j++) sum += envelope[j] * Math.cos((Math.PI * k * (j + 0.5)) / ENV_POINTS)
    features[k - 1] = sum * scale * (k === 1 ? C1_WEIGHT : 1)
  }
  return features
}

function interpolate(xs: number[], ys: number[], x: number): number {
  if (xs.length === 0) return -140
  if (x <= xs[0]) return ys[0]
  const last = xs.length - 1
  if (x >= xs[last]) return ys[last]
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo])
  return ys[lo] + (ys[hi] - ys[lo]) * t
}

export interface FrameAnalysis {
  db: number
  f0: number
  clarity: number
  voiced: boolean
  features: Float64Array | null
}

export const VOICING_CLARITY = 0.62

export function analyzeFrame(samples: ArrayLike<number>, sampleRate: number): FrameAnalysis {
  const db = levelDb(samples)
  if (db < -72) return { db, f0: 0, clarity: 0, voiced: false, features: null }
  const { f0, clarity } = detectPitch(samples, sampleRate)
  const voiced = f0 > 0 && clarity >= VOICING_CLARITY
  return {
    db,
    f0,
    clarity,
    voiced,
    features: voiced ? vowelFeatures(samples, sampleRate, f0) : null,
  }
}

export type VowelModel = Record<Vowel, number[]>

export interface Classification {
  vowel: Vowel
  distance: number
  /** Distance gap to the runner-up; small means "sounds like two letters". */
  margin: number
}

export function featureDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0
  const size = Math.min(a.length, b.length)
  for (let k = 0; k < size; k++) {
    const d = a[k] - b[k]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function classifyVowel(
  features: ArrayLike<number>,
  model: VowelModel,
  allowed: readonly Vowel[] = VOWELS,
): Classification {
  let best: Vowel = allowed[0] ?? 'a'
  let bestDistance = Infinity
  let second = Infinity
  for (const vowel of allowed) {
    const distance = featureDistance(features, model[vowel])
    if (distance < bestDistance) {
      second = bestDistance
      bestDistance = distance
      best = vowel
    } else if (distance < second) {
      second = distance
    }
  }
  return { vowel: best, distance: bestDistance, margin: second - bestDistance }
}

export function averageFeatures(frames: ArrayLike<number>[]): number[] {
  const out = new Array<number>(FEATURE_SIZE).fill(0)
  if (frames.length === 0) return out
  // Trimmed mean per coefficient: calibration frames sometimes catch a breath.
  for (let k = 0; k < FEATURE_SIZE; k++) {
    const values = frames.map((frame) => frame[k]).sort((a, b) => a - b)
    const trim = Math.floor(values.length * 0.15)
    const kept = values.slice(trim, values.length - trim)
    out[k] = kept.reduce((sum, value) => sum + value, 0) / Math.max(1, kept.length)
  }
  return out
}

/** Typical formants of a young child (F1–F4, Hz). Adults are ~15% lower. */
export const CHILD_FORMANTS: Record<Vowel, readonly number[]> = {
  a: [1030, 1640, 3400, 4300],
  o: [680, 1120, 3300, 4300],
  u: [450, 960, 3250, 4250],
  i: [400, 3050, 3800, 4700],
  e: [700, 2400, 3450, 4400],
}
const BANDWIDTHS = [110, 140, 220, 280]

export interface SynthOptions {
  f0: number
  sampleRate: number
  length?: number
  /** Multiplies every formant: 0.85 ≈ adult woman, 1 ≈ child. */
  formantScale?: number
  /** Source roll-off exponent: 1 ≈ normal voice, 0.7 ≈ shouting, 1.4 ≈ soft. */
  tilt?: number
  amplitude?: number
  noise?: number
  vibrato?: number
  seed?: number
}

/** Additive formant synthesis: harmonics shaped by four resonances. */
export function synthVowel(vowel: Vowel, options: SynthOptions): Float32Array {
  const {
    f0,
    sampleRate,
    length = FRAME_SIZE,
    formantScale = 1,
    tilt = 1,
    amplitude = 0.3,
    noise = 0,
    vibrato = 0,
    seed = 1,
  } = options
  let state = seed >>> 0 || 1
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const formants = CHILD_FORMANTS[vowel].map((f) => f * formantScale)
  const out = new Float32Array(length)
  const harmonics: { h: number; amp: number; phase: number }[] = []
  for (let h = 1; h * f0 < sampleRate / 2 - 200 && h * f0 < 7000; h++) {
    const f = h * f0
    let gain = 1 / Math.pow(h, tilt)
    formants.forEach((fc, index) => {
      const bw = BANDWIDTHS[index] * formantScale
      gain *= (fc * fc) / Math.sqrt((fc * fc - f * f) ** 2 + (bw * f) ** 2)
    })
    harmonics.push({ h, amp: gain, phase: random() * Math.PI * 2 })
  }
  let peak = 0
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const wobble = vibrato ? 1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t) : 1
    let sum = 0
    for (const { h, amp, phase } of harmonics) sum += amp * Math.sin(2 * Math.PI * h * f0 * wobble * t + phase)
    out[i] = sum
    peak = Math.max(peak, Math.abs(sum))
  }
  const scale = peak > 0 ? amplitude / peak : 0
  for (let i = 0; i < length; i++) out[i] = out[i] * scale + (noise ? (random() * 2 - 1) * noise : 0)
  return out
}

let defaultModel: VowelModel | null = null

/**
 * Built-in fingerprints, averaged over children and grown-ups with different
 * pitches. A short “teach me your voice” round replaces them per vowel.
 */
export function defaultVowelModel(): VowelModel {
  if (defaultModel) return defaultModel
  const model = {} as VowelModel
  const sampleRate = 48000
  for (const vowel of VOWELS) {
    const frames: Float64Array[] = []
    let seed = 11
    for (const formantScale of [0.84, 0.95, 1.05]) {
      for (const f0 of [190, 260, 330]) {
        for (const tilt of [0.8, 1.2]) {
          const samples = synthVowel(vowel, { f0, sampleRate, formantScale, tilt, seed: seed++ })
          frames.push(vowelFeatures(samples, sampleRate, f0))
        }
      }
    }
    model[vowel] = averageFeatures(frames)
  }
  defaultModel = model
  return model
}
