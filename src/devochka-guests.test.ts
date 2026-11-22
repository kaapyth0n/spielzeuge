import { describe, expect, it } from 'vitest'
import { canDine, DINERS } from './devochka-guests.ts'
import { pendingBowls, seats } from './devochka-dining.ts'
import { fresh, readBook, serve } from './devochka-state.ts'

describe('dinner guests and paints', () => {
  it('opens one new guest at each of the first three menu stickers', () => {
    const s = fresh()
    for (let day = 0; day <= 3; day++) {
      s.day = day
      expect(DINERS.filter((id) => canDine(s, id))).toEqual(DINERS.slice(0, day + 1))
    }
    expect(readBook(JSON.stringify({ diner: 'dog', day: 1 })).diner).toBe('girl')
  })
  it('keeps a previously made friend and invited pet on upgrade', () => {
    const s = readBook(JSON.stringify({ friend: true, pet: 'dog', eyes: 2, colour: 2 }))
    expect(s.diner).toBe('friend')
    expect(s.paint).toEqual({ curtains: 2, table: 2, teapot: 2, cloth: 2 })
    expect(canDine(s, 'dog')).toBe(true)
    s.diner = 'girl'
    s.paint.curtains = 3
    s.paint.cloth = 0
    const second = readBook(JSON.stringify(s))
    expect(second.paint).toEqual({ curtains: 3, table: 2, teapot: 2, cloth: 0 })
    expect(canDine(second, 'friend')).toBe(true)
    expect(canDine(second, 'dog')).toBe(true)
    expect(canDine(second, 'cat')).toBe(false)
  })
  it('keeps valid item colours if a different paint field is damaged', () => {
    const s = readBook(JSON.stringify({ paint: { curtains: 3, table: -1, cloth: 1 }, eyes: 800, pet: '???' }))
    expect(s.paint).toEqual({ curtains: 3, teapot: 0, table: 0, cloth: 1 })
    expect(s.knownGuests).toEqual([])
  })
  it('seats the old companion for a paid meal and waits for its own bowl after a reload', () => {
    const s = readBook(JSON.stringify({ friend: true, pet: 'dog', table: ['water'] }))
    expect(seats(s)).toEqual(['friend','dog'])
    s.pet = 'none'
    expect(serve(s, 'water', 'friend')).toBe(true)
    const again = readBook(JSON.stringify(s))
    expect(pendingBowls(again)).toEqual(['dog'])
    expect(again.result).toBeNull()
    expect(serve(again, 'dog', 'friend')).toBe(false)
    expect(serve(again, 'dog', 'dog')).toBe(true)
    expect(again.result).toBe('free')
    expect(again.pet).toBe('none')
  })
})
