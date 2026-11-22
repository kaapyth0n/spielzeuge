import { describe, expect, it } from 'vitest'
import { MEALS, type Food } from './devochka-copy.ts'
import { pendingBowls } from './devochka-dining.ts'
import { CAPACITY, checkout, fresh, matches, price, readBook, selectOrder, serve } from './devochka-state.ts'

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
      while (s.table.length) {
        const item = s.table[0]
        if (item === 'chips') s.chipsOpen = true
        expect(serve(s, item)).toBe(true)
      }
      for (const guest of pendingBowls(s)) expect(serve(s, guest)).toBe(true)
      expect(s.day).toBe(i + 1)
      expect(readBook(JSON.stringify(s)).result).toBe(i)
    }
  })
  it('keeps a last portion to share with the other girl at the courtyard party', () => {
    const s = fresh()
    s.day = 7
    s.cart = ['water']
    expect(checkout(s, 1)).toBe(true)
    expect(serve(s, 'water', 'girl')).toBe(true)
    expect(s.table).toEqual(['water'])
    expect(serve(s, 'water', 'girl')).toBe(false)
    const resumed = readBook(JSON.stringify(s))
    expect(serve(resumed, 'water', 'friend')).toBe(true)
    expect(resumed.result).toBe('free')
    expect(resumed.day).toBe(7)
  })

  it('preserves a paid picnic while only the fish bowl is left', () => {
    const s = fresh()
    s.day = 1
    s.cart = [...MEALS[1].list]
    expect(checkout(s, price(s.cart))).toBe(true)
    for (const food of [...s.table]) {
      s.chipsOpen = food === 'chips'
      expect(serve(s, food, 'girl')).toBe(true)
    }
    const picnic = readBook(JSON.stringify(s))
    expect(pendingBowls(picnic)).toEqual(['cat'])
    picnic.cart = ['water']
    expect(checkout(picnic, 1)).toBe(false)
    expect(serve(picnic, 'cat', 'girl')).toBe(false)
    expect(serve(picnic, 'cat', 'cat')).toBe(true)
    expect(serve(picnic, 'cat', 'cat')).toBe(false)
    expect([picnic.day, picnic.result]).toEqual([2, 1])
  })

  it('can revisit only a collected menu and keeps the next order, sticker count and basket', () => {
    const s = fresh()
    s.day = 3
    s.cart = ['water']
    expect(selectOrder(s, 3)).toBe(false)
    expect(selectOrder(s, 1)).toBe(true)
    expect(s.cart).toEqual(['water'])
    const resumed = readBook(JSON.stringify(s))
    resumed.cart.push('chips', 'roll')
    expect(checkout(resumed, 7)).toBe(true)
    expect(selectOrder(resumed, null)).toBe(false)
    for (const food of [...resumed.table]) {
      resumed.chipsOpen = food === 'chips'
      expect(serve(resumed, food)).toBe(true)
    }
    expect(serve(resumed, 'cat')).toBe(true)
    expect([resumed.day, resumed.result, resumed.revisit]).toEqual([3, 1, 1])
    const finished = readBook(JSON.stringify(resumed))
    expect(selectOrder(finished, null)).toBe(true)
    expect([finished.day, finished.revisit, finished.result]).toEqual([3, null, null])
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
