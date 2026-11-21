import { describe, expect, it } from 'vitest'
import { MEALS, type Food } from './devochka-copy.ts'
import { CAPACITY, checkout, fresh, matches, price, readBook, serve } from './devochka-state.ts'

describe('Matryona’s shopping notebook', () => {
  it('charges exactly once, safely resumes a half-eaten meal and awards the sticker once', () => {
    const s = fresh()
    s.cart = ['water', 'dumpling']
    for (const amount of [0, 3, 5]) expect(checkout(s, amount)).toBe(false)
    expect(checkout(s, 4)).toBe(true)
    expect(checkout(s, 4)).toBe(false)
    expect(s.coins).toBe(8)
    expect(serve(s, 'dumpling')).toBe(true)
    const again = readBook(JSON.stringify(s))
    expect(again.table).toEqual(['water'])
    expect(serve(again, 'water')).toBe(true)
    expect(serve(again, 'water')).toBe(false)
    expect([again.result, again.day, again.wall, again.coins]).toEqual([0, 1, 0, 8])
  })
  it('preserves a second basket and refuses to overwrite lunch or overspend', () => {
    const s = fresh()
    s.table = ['roll']
    s.cart = ['water']
    expect(checkout(s, 1)).toBe(false)
    s.table = []
    s.coins = 0
    expect(checkout(s, 1)).toBe(false)
    expect(s.cart).toEqual(['water'])
  })
  it('requires scissors for each bag and allows a free-choice lunch', () => {
    const s = fresh()
    s.cart = ['chips', 'chips']
    checkout(s, 4)
    expect(serve(s, 'chips')).toBe(false)
    s.chipsOpen = true
    expect(serve(s, 'chips')).toBe(true)
    expect(serve(s, 'chips')).toBe(false)
    s.chipsOpen = true
    serve(s, 'chips')
    expect(s.result).toBe('free')
    expect(s.day).toBe(0)
  })
  it('honours quantities including extras and every menu can actually earn its sticker', () => {
    expect(matches(['chips', 'water'], ['chips', 'chips', 'water'])).toBe(false)
    const s = fresh()
    for (const [i, menu] of MEALS.entries()) {
      const basket: Food[] = [...menu.list, 'water']
      s.coins = price(basket)
      s.cart = basket
      expect(basket.length).toBeLessThanOrEqual(CAPACITY)
      checkout(s, s.coins)
      for (const item of [...s.table]) {
        if (item === 'chips') s.chipsOpen = true
        serve(s, item)
      }
      expect(s.day).toBe(i + 1)
      expect(readBook(JSON.stringify(s)).result).toBe(i)
    }
  })
  it('recovers from incomplete, damaged and older storage', () => {
    expect(readBook('{')).toEqual(fresh())
    const s = readBook(
      JSON.stringify({
        coins: -2,
        cart: ['x', 'roll'],
        table: null,
        eyes: 900,
        wall: 3,
        result: 5,
        chipsOpen: true,
      })
    )
    expect(s).toEqual({ ...fresh(), cart: ['roll'] })
  })
})
