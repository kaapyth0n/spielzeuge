import { describe, expect, it } from 'vitest'
import {
  careFor,
  freshPuppy,
  restorePuppy,
  shuffled,
  unlockedGames,
} from './sobachka-state.ts'

describe('puppy friendship', () => {
  it('unlocks games at the promised milestones and keeps the first game open', () => {
    let state = freshPuppy()
    expect(unlockedGames(state.hearts)).toBe(1)
    for (let i = 1; i <= 6; i++) {
      state = careFor(state, 'walk')
      expect(unlockedGames(state.hearts)).toBe(i < 3 ? 1 : i < 6 ? 2 : 3)
    }
    expect(state.care.walk).toBe(6)
    expect(state.care.feed).toBe(0)
  })
  it('keeps friendship, decorations and preferences across visits with no time penalty', () => {
    const original = { ...careFor(freshPuppy(), 'feed'), wall: 2, sound: false }
    expect(restorePuppy(JSON.stringify(original))).toEqual(original)
    expect(freshPuppy().hearts).toBe(0)
  })
  it('recovers safely from missing, corrupted and malformed saved data', () => {
    for (const raw of [null, '{oops', 'null', '42', '"hello"'])
      expect(restorePuppy(raw)).toEqual(freshPuppy())
    expect(
      restorePuppy(
        '{"hearts":-6,"wall":8,"care":{"feed":"12","walk":1e100},"sound":false}',
      ),
    ).toEqual({
      hearts: 0,
      wall: 2,
      care: { feed: 0, walk: 999, sleep: 0, ball: 0, toilet: 0 },
      sound: false,
    })
  })
  it('adds toilet care to older saves without losing friendship', () => {
    const legacy = {
      hearts: 6,
      wall: 2,
      care: { feed: 2, walk: 1, sleep: 1, ball: 2 },
      sound: false,
    }
    const restored = restorePuppy(JSON.stringify(legacy))
    expect(restored).toEqual({ ...legacy, care: { ...legacy.care, toilet: 0 } })
    const updated = careFor(restored, 'toilet')
    expect(updated.hearts).toBe(7)
    expect(updated.care.toilet).toBe(1)
    expect(updated.care.feed).toBe(2)
  })
  it('caps counters while preserving earned unlocks', () => {
    const state = careFor({ ...freshPuppy(), hearts: 999 }, 'sleep')
    expect(state.hearts).toBe(999)
    expect(unlockedGames(state.hearts)).toBe(3)
  })
  it('shuffles cards without losing pairs or mutating the source', () => {
    const deck = ['circle', 'star', 'triangle', 'circle', 'star', 'triangle']
    expect(shuffled(deck).sort()).toEqual([...deck].sort())
    expect(deck[0]).toBe('circle')
  })
})
