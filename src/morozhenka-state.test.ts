import { describe, expect, it } from 'vitest'
import { FEATURE_SIZE } from './morozhenka-dsp.ts'
import {
  DEFAULT_LETTERS,
  continueRound,
  finishRound,
  freshSave,
  isOpen,
  nextVowel,
  restoreSave,
  setLetter,
  surprisesOpen,
  totalCherries,
} from './morozhenka-state.ts'

describe('Мороженка save', () => {
  it('starts with Matryona’s letters, voice control and round one', () => {
    const save = freshSave()
    expect(save.letters).toEqual({ up: 'a', right: 'i', left: 'o', down: 'u' })
    expect(save.control).toBe('voice')
    expect(continueRound(save)).toBe(1)
    expect(isOpen(save, 2)).toBe(false)
  })

  it('recovers from missing, broken and hostile data', () => {
    for (const raw of [null, '', '{', 'null', '[]', '42', '"x"']) expect(restoreSave(raw)).toEqual(freshSave())
    const save = restoreSave(
      JSON.stringify({
        sound: 'loud',
        control: 'telepathy',
        flavor: '<img>',
        unlocked: 1e9,
        surpriseNext: -5,
        rounds: { 1: { cherries: 99, flavor: 'mango' }, abc: {}, '-2': { cherries: 1 } },
        letters: { up: 'a', right: 'a', left: 'o', down: 'u' },
        voice: { a: new Array(FEATURE_SIZE).fill(1), o: [1, 2], u: new Array(FEATURE_SIZE).fill(Number.NaN) },
        sensitivity: 7,
      }),
    )
    expect(save.sound).toBe(true)
    expect(save.control).toBe('voice')
    expect(save.flavor).toBe('mint')
    expect(save.unlocked).toBe(13)
    expect(save.surpriseNext).toBe(13)
    expect(save.rounds).toEqual({ 1: { cherries: 3, flavor: 'mango' } })
    expect(save.letters).toEqual(DEFAULT_LETTERS)
    expect(Object.keys(save.voice)).toEqual(['a'])
    expect(save.sensitivity).toBe(2)
  })

  it('opens the next round, keeps the best cherries and survives a reload', () => {
    let save = finishRound(freshSave(), 1, 2)
    save = finishRound(save, 1, 1)
    expect(save.rounds[1].cherries).toBe(2)
    expect(save.unlocked).toBe(2)
    expect(continueRound(save)).toBe(2)
    save = finishRound(save, 2, 3)
    expect(restoreSave(JSON.stringify(save))).toEqual(save)
    expect(totalCherries(save)).toBe(5)
  })

  it('opens surprise maps after round three without skipping hand-made rounds', () => {
    let save = freshSave()
    for (const round of [1, 2, 3]) save = finishRound(save, round, 0)
    expect(surprisesOpen(save)).toBe(true)
    expect(isOpen(save, 13)).toBe(true)
    expect(isOpen(save, 14)).toBe(false)
    save = finishRound(save, 13, 1)
    expect(save.unlocked).toBe(4)
    expect(save.surpriseNext).toBe(14)
    expect(isOpen(save, 5)).toBe(false)
    expect(continueRound(save)).toBe(4)
    for (let round = 4; round <= 12; round++) save = finishRound(save, round, 0)
    expect(continueRound(save)).toBe(14)
    expect(restoreSave(JSON.stringify(save))).toEqual(save)
  })

  it('keeps four different letters when a child picks a new one', () => {
    let save = setLetter(freshSave(), 'right', 'e')
    expect(save.letters).toEqual({ up: 'a', right: 'e', left: 'o', down: 'u' })
    save = setLetter(save, 'up', 'o')
    expect(save.letters).toEqual({ up: 'o', right: 'e', left: 'a', down: 'u' })
    expect(new Set(Object.values(save.letters)).size).toBe(4)
    expect(nextVowel(save, 'down')).toBe('i')
  })
})
