import { describe, expect, it } from 'vitest'
import { LANGS } from './languages.ts'
import { ACTIVITY_NAME, PET_NAME, TAMAGOCHI_COPY, fill } from './tamagochi-copy.ts'
import { GIFTS, giftKind } from './tamagochi-items.ts'
import { HAIRS, SPECIES, WIRE_SHAPES } from './tamagochi-kit.ts'
import { defaultLook, handsUp, slotOf, wirePath } from './tamagochi-pets.ts'
import {
  ACTIVITIES,
  DOTS,
  DOTS_AFTER_VISIT,
  MAX_DEVICES,
  UNLOCK_AT,
  WANTS,
  WANT_COUNT,
  addHeart,
  choosable,
  freshSave,
  isUnlocked,
  lookOf,
  nextUnlock,
  parseSave,
  pickWant,
  type Want,
} from './tamagochi-state.ts'

describe('a fresh game', () => {
  it('is the drawing: a chick and a kitten, both still eggs', () => {
    const save = freshSave()
    expect(save.devices.map((d) => d.species)).toEqual(['chick', 'kitten'])
    expect(save.devices.every((d) => !d.hatched && d.dots === DOTS_AFTER_VISIT)).toBe(true)
    expect(DOTS - DOTS_AFTER_VISIT).toBe(3)
  })

  it('offers the four pets Matryona named from the start', () => {
    const save = freshSave()
    expect(SPECIES.filter((s) => isUnlocked(save, s))).toEqual(['chick', 'kitten', 'monkey', 'banana'])
    expect(choosable(save, -1)).toEqual(['monkey', 'banana'])
    expect(choosable(save, 0)).toEqual(['chick', 'monkey', 'banana'])
  })
})

describe('friendship hearts', () => {
  it('unlock one new egg at a time, in order', () => {
    const save = freshSave()
    const found: string[] = []
    for (let i = 0; i < 20; i++) {
      const before = nextUnlock(save)
      const egg = addHeart(save)
      if (egg) {
        found.push(egg)
        expect(before?.species).toBe(egg)
        expect(save.hearts).toBe(UNLOCK_AT[egg])
      }
    }
    expect(found).toEqual(['mini', 'bunny', 'penguin', 'puppy'])
    expect(nextUnlock(save)).toBeNull()
  })

  it('reports progress towards the next egg', () => {
    const save = freshSave()
    expect(nextUnlock(save)).toEqual({ species: 'mini', need: 3, from: 0 })
    save.hearts = 4
    expect(nextUnlock(save)).toEqual({ species: 'bunny', need: 7, from: 3 })
  })
})

describe('wishes', () => {
  it('start in the order of the interview: food, poop, ball', () => {
    expect([0, 1, 2].map((done) => pickWant(null, false, done, () => 0.99))).toEqual(['food', 'poop', 'play'])
  })

  it('never repeat directly and include sleep only once between visits', () => {
    let seed = 7
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (const slept of [false, true]) {
      let prev: Want | null = 'food'
      const seen = new Set<Want>()
      for (let i = 0; i < 300; i++) {
        const next = pickWant(prev, slept, 9, rnd)
        expect(next).not.toBe(prev)
        if (slept) expect(next).not.toBe('sleep')
        seen.add(next)
        prev = next
      }
      expect(seen.size).toBe(slept ? 3 : 4)
    }
  })

  it('stays inside the list even when the random source returns 1', () => {
    expect(WANTS).toContain(pickWant('food', false, 9, () => 1))
  })

  it('take one or two gestures each', () => {
    expect(WANT_COUNT).toEqual({ food: 2, poop: 1, play: 2, sleep: 1 })
  })
})

describe('stored progress', () => {
  it('survives a round trip', () => {
    const save = freshSave()
    save.devices.push({ species: 'banana', hatched: true, dots: 5 })
    save.hearts = 9
    save.owned = ['g:crown', 'w:bow:2']
    save.played.dance = 3
    save.hints.food = 2
    lookOf(save, 'banana').head = 'w:bow:2'
    expect(parseSave(JSON.parse(JSON.stringify(save)))).toEqual(save)
  })

  it('falls back to a fresh game for rubbish', () => {
    for (const raw of [null, 5, 'x', [], { devices: 'no' }, { devices: [{ species: 'dragon' }] }]) expect(parseSave(raw).devices).toEqual(freshSave().devices)
  })

  it('repairs broken parts and keeps the rest', () => {
    const save = parseSave({
      devices: [
        { species: 'monkey', hatched: true, dots: 99 },
        { species: 'monkey', hatched: true, dots: 1 },
        { species: 'banana', hatched: 'yes', dots: -3 },
        { species: 'chick' },
        { species: 'kitten' },
        { species: 'mini' },
      ],
      hearts: -4,
      owned: ['g:crown', 'g:crown', '<script>', 7, 'w:heart:1'],
      looks: { monkey: { hair: 'wig', hairColor: 77, head: 'javascript:1', neck: 'g:scarf' } },
      played: { dance: 2.4, 'bad key': 3 },
    })
    expect(save.devices).toEqual([
      { species: 'monkey', hatched: true, dots: DOTS },
      { species: 'banana', hatched: false, dots: 0 },
      { species: 'chick', hatched: false, dots: DOTS_AFTER_VISIT },
      { species: 'kitten', hatched: false, dots: DOTS_AFTER_VISIT },
    ])
    expect(save.devices.length).toBeLessThanOrEqual(MAX_DEVICES)
    expect(save.hearts).toBe(0)
    expect(save.owned).toEqual(['g:crown', 'w:heart:1'])
    expect(save.looks.monkey).toEqual({ ...defaultLook('monkey'), hairColor: 8, neck: 'g:scarf' })
    expect(save.played).toEqual({ dance: 2 })
  })
})

describe('words', () => {
  it('exist in all three languages', () => {
    const keys = Object.keys(TAMAGOCHI_COPY.ru)
    for (const lang of LANGS) {
      expect(Object.keys(TAMAGOCHI_COPY[lang])).toEqual(keys)
      for (const [key, value] of Object.entries(TAMAGOCHI_COPY[lang])) expect(value.trim(), `${lang}.${key}`).not.toBe('')
      expect(Object.keys(PET_NAME[lang])).toEqual([...SPECIES])
      expect(Object.keys(ACTIVITY_NAME[lang])).toEqual([...ACTIVITIES])
    }
  })

  it('keep the same placeholders in every language', () => {
    const marks = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort()
    for (const [key, ru] of Object.entries(TAMAGOCHI_COPY.ru))
      for (const lang of LANGS) expect(marks(TAMAGOCHI_COPY[lang][key as keyof typeof TAMAGOCHI_COPY.ru]), `${lang}.${key}`).toEqual(marks(ru))
  })

  it('fill in names and numbers', () => {
    expect(fill('{name} — {n}', { name: 'Котёнок', n: 3 })).toBe('Котёнок — 3')
    expect(fill('Чисто!')).toBe('Чисто!')
  })

  it('have nothing for the voice to trip over', () => {
    for (const lang of LANGS)
      for (const key of ['wantFood', 'wantPoop', 'wantPlay', 'wantSleep', 'ready', 'linkHint', 'goHome'] as const) expect(TAMAGOCHI_COPY[lang][key]).not.toMatch(/[«»„“”]/)
  })
})

describe('things', () => {
  it('24 different gifts, each with a place', () => {
    expect(new Set(GIFTS.map((g) => g.id)).size).toBe(24)
    for (const g of GIFTS) {
      expect(giftKind(`g:${g.id}`)).toBe(g.kind)
      expect(slotOf(`g:${g.id}`) !== null).toBe(g.kind === 'wear')
    }
  })

  it('wire shapes are even lines inside their box', () => {
    for (const shape of WIRE_SHAPES) {
      const pts = wirePath(shape)
      expect(pts.length, shape).toBeGreaterThan(30)
      for (const p of pts) {
        expect(Math.abs(p.x), shape).toBeLessThanOrEqual(1.12)
        expect(Math.abs(p.y), shape).toBeLessThanOrEqual(1.12)
      }
      for (let i = 1; i < pts.length - 1; i++) expect(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y), `${shape} step ${i}`).toBeLessThan(0.09)
      expect(slotOf(`w:${shape}:0`)).toBe(shape === 'glasses' ? 'face' : 'head')
    }
  })

  it('every pet has a default look and hands', () => {
    for (const s of SPECIES) {
      expect(HAIRS).toContain(defaultLook(s).hair)
      const hands = handsUp(s)
      expect(hands.lx).toBeLessThan(hands.rx)
      expect(hands.y).toBeLessThan(0)
    }
  })
})
