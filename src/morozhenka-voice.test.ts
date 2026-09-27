import { describe, expect, it } from 'vitest'
import { synthVowel } from './morozhenka-dsp.ts'
import { VoiceInput } from './morozhenka-voice.ts'

const RATE = 48000
const quiet = (seed: number) => {
  let state = seed
  return Float32Array.from({ length: 2048 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return (state / 4294967296 - 0.5) * 0.0008
  })
}
const vowel = (v: 'a' | 'i' | 'o' | 'u' | 'e', seed: number, amplitude = 0.3) => synthVowel(v, { f0: 280, sampleRate: RATE, seed, amplitude })

function listener(blocked = () => false) {
  const input = new VoiceInput(blocked)
  for (let i = 0; i < 40; i++) input.process(quiet(i + 1), RATE)
  return input
}

describe('microphone steering', () => {
  it('starts after two voiced frames, hops once and keeps the letter', () => {
    const input = listener()
    const first = input.process(vowel('a', 1), RATE)
    expect(first.active).toBe(false)
    const second = input.process(vowel('a', 2), RATE)
    expect(second.active).toBe(true)
    expect(second.onset).toBe(true)
    expect(second.vowel).toBe('a')
    expect(second.power).toBeGreaterThan(0.3)
    const third = input.process(vowel('a', 3), RATE)
    expect(third.onset).toBe(false)
  })

  it('bridges tiny gaps, then lets go', () => {
    const input = listener()
    for (let i = 0; i < 5; i++) input.process(vowel('i', i + 1), RATE)
    const states = Array.from({ length: 8 }, (_, i) => input.process(quiet(100 + i), RATE).active)
    expect(states.slice(0, 4).every(Boolean)).toBe(true)
    expect(states.at(-1)).toBe(false)
  })

  it('does not listen while the game itself is talking', () => {
    let talking = true
    const input = listener(() => talking)
    for (let i = 0; i < 6; i++) expect(input.process(vowel('o', i + 1), RATE).active).toBe(false)
    talking = false
    input.process(vowel('o', 20), RATE)
    expect(input.process(vowel('o', 21), RATE).active).toBe(true)
  })

  it('needs a louder voice in the noisy-room setting', () => {
    const soft = (input: VoiceInput) => {
      let active = false
      for (let i = 0; i < 6; i++) active = input.process(vowel('u', i + 1, 0.003), RATE).active || active
      return active
    }
    const sensitive = listener()
    sensitive.sensitivity = 1
    const noisy = listener()
    noisy.sensitivity = 3
    expect(soft(sensitive)).toBe(true)
    expect(soft(noisy)).toBe(false)
  })

  it('louder voices push harder', () => {
    const power = (amplitude: number) => {
      const input = listener()
      let last = 0
      for (let i = 0; i < 4; i++) last = input.process(vowel('a', i + 1, amplitude), RATE).power
      return last
    }
    expect(power(0.3)).toBeGreaterThan(power(0.02))
  })

  it('uses learned fingerprints and only the letters in play', () => {
    const input = listener()
    input.setModel({}, ['a', 'o', 'u', 'i'])
    for (let i = 0; i < 4; i++) input.process(vowel('e', i + 1), RATE)
    const reading = input.process(vowel('e', 9), RATE)
    expect(reading.active).toBe(true)
    expect(reading.vowel).not.toBe('e')
  })
})
