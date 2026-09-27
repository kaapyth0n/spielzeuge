import { describe, expect, it } from 'vitest'
import {
  FEATURE_SIZE,
  VOWELS,
  analyzeFrame,
  averageFeatures,
  classifyVowel,
  defaultVowelModel,
  detectPitch,
  featureDistance,
  fftInPlace,
  synthVowel,
  vowelFeatures,
  type Vowel,
  type VowelModel,
} from './morozhenka-dsp.ts'

function random(seed: number): () => number {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('voice analysis', () => {
  it('finds a pure tone in the right FFT bin', () => {
    const n = 2048
    const re = new Float64Array(n)
    const im = new Float64Array(n)
    for (let i = 0; i < n; i++) re[i] = Math.sin((2 * Math.PI * 100 * i) / n)
    fftInPlace(re, im)
    let best = 0
    for (let k = 1; k < n / 2; k++) if (re[k] ** 2 + im[k] ** 2 > re[best] ** 2 + im[best] ** 2) best = k
    expect(best).toBe(100)
  })

  it('hears the pitch of grown-up and child voices at common sample rates', () => {
    for (const sampleRate of [44100, 48000])
      for (const f0 of [110, 190, 260, 340, 480, 620]) {
        const { f0: found, clarity } = detectPitch(synthVowel('a', { f0, sampleRate, seed: f0 }), sampleRate)
        expect(Math.abs(found - f0) / f0, `${f0} Hz @ ${sampleRate}`).toBeLessThan(0.03)
        expect(clarity).toBeGreaterThan(0.8)
      }
  })

  it('ignores silence, hiss and the game’s own fire noise', () => {
    const next = random(5)
    const hiss = Float32Array.from({ length: 2048 }, () => (next() * 2 - 1) * 0.2)
    expect(analyzeFrame(new Float32Array(2048), 48000).voiced).toBe(false)
    expect(analyzeFrame(hiss, 48000).voiced).toBe(false)
    expect(analyzeFrame(synthVowel('o', { f0: 250, sampleRate: 48000 }), 48000).voiced).toBe(true)
  })

  it('tells five vowels of many different children apart without teaching', () => {
    const model = defaultVowelModel()
    const next = random(99)
    let right = 0
    let total = 0
    for (let trial = 0; trial < 300; trial++) {
      const vowel = VOWELS[trial % VOWELS.length]
      const f0 = 190 + next() * 230
      const sampleRate = next() < 0.5 ? 44100 : 48000
      const samples = synthVowel(vowel, {
        f0,
        sampleRate,
        formantScale: 0.9 + next() * 0.22,
        tilt: 0.75 + next() * 0.6,
        noise: 0.004,
        vibrato: 0.01,
        seed: trial + 3,
      })
      const frame = analyzeFrame(samples, sampleRate)
      if (!frame.features) continue
      total++
      if (classifyVowel(frame.features, model).vowel === vowel) right++
    }
    expect(total).toBeGreaterThan(290)
    expect(right / total).toBeGreaterThan(0.92)
  })

  it('learns one child’s voice from a short “А-а-а” for each letter', () => {
    // A child whose formants sit outside the built-in average.
    const child = { formantScale: 1.16, sampleRate: 48000 }
    const learned = {} as VowelModel
    for (const vowel of VOWELS)
      learned[vowel] = averageFeatures(
        Array.from({ length: 36 }, (_, k) => vowelFeatures(synthVowel(vowel, { ...child, f0: 300 + (k % 7) * 6, seed: k + 1, noise: 0.003 }), 48000, 300 + (k % 7) * 6)),
      )
    const next = random(7)
    let right = 0
    const trials = 200
    for (let trial = 0; trial < trials; trial++) {
      const vowel: Vowel = VOWELS[trial % VOWELS.length]
      const f0 = 270 + next() * 90
      const samples = synthVowel(vowel, { ...child, f0, tilt: 0.8 + next() * 0.5, noise: 0.004, vibrato: 0.012, seed: 500 + trial })
      const frame = analyzeFrame(samples, 48000)
      if (frame.features && classifyVowel(frame.features, learned).vowel === vowel) right++
    }
    expect(right / trials).toBeGreaterThan(0.97)
  })

  it('only chooses among the four letters that are in play', () => {
    const e = vowelFeatures(synthVowel('e', { f0: 260, sampleRate: 48000 }), 48000, 260)
    expect(classifyVowel(e, defaultVowelModel()).vowel).toBe('e')
    expect(['a', 'o', 'u', 'i']).toContain(classifyVowel(e, defaultVowelModel(), ['a', 'o', 'u', 'i']).vowel)
  })

  it('describes a vowel the same way at 44.1 and 48 kHz', () => {
    for (const vowel of VOWELS) {
      const a = vowelFeatures(synthVowel(vowel, { f0: 260, sampleRate: 44100 }), 44100, 260)
      const b = vowelFeatures(synthVowel(vowel, { f0: 260, sampleRate: 48000 }), 48000, 260)
      expect(a).toHaveLength(FEATURE_SIZE)
      expect(featureDistance(a, b), vowel).toBeLessThan(0.6)
    }
  })
})
