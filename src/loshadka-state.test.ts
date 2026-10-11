import { describe as group, expect, it } from 'vitest'
import { LANGS } from './languages.ts'
import {
  BACKGROUNDS,
  CLIPS,
  COLORS,
  GIFTS,
  ITEMS,
  MAGIC,
  MANES,
  PONY_NAMES,
  SIDES,
  TAILS,
  findItem,
  type ItemKind,
  type Look,
  type Side,
} from './loshadka-items.ts'
import {
  LOSHADKA_KEY,
  MAX_PONIES,
  availableItems,
  defaultSave,
  describe,
  editPony,
  emptyLook,
  finish,
  finishedUnchanged,
  giftKey,
  hasUnfinishedWork,
  isAvailable,
  isComplete,
  isNew,
  lockedGifts,
  lookKey,
  markSeen,
  missingSides,
  nameChoices,
  nextBackground,
  nextGift,
  openedGifts,
  release,
  rename,
  reopenWorkshop,
  restoreSave,
  serialize,
  startNew,
  wear,
  type LoshadkaSave,
  type Pony,
} from './loshadka-state.ts'

const KINDS: ItemKind[] = ['mane', 'clip', 'tail', 'color', 'magic', 'background']
const BASE: Record<Side, string> = { mane: 'sunny', clip: 'strawberry', tail: 'black', color: 'orange' }
const OTHER: Record<Side, string> = { mane: 'green', clip: 'orange', tail: 'red', color: 'green' }

function dress(save: LoshadkaSave, parts: Record<Side, string> = BASE): LoshadkaSave {
  let next = save
  for (const side of SIDES) next = wear(next, side, parts[side])
  return next
}

function finished(save: LoshadkaSave, now = 1000, seed = 1) {
  const result = finish(save, now, seed)
  if (!result.ok) throw new Error(`finish refused: ${result.reason}`)
  return result
}

/** A save that has finished `count` ponies (no stable ponies). */
function after(count: number): LoshadkaSave {
  return restoreSave(JSON.stringify({ finished: count }))
}

function look(parts: Partial<Look>): Look {
  return { ...emptyLook(), ...parts }
}

function pony(id: string, name: number, parts: Partial<Look> = {}): Pony {
  return { id, name, look: look({ ...BASE, ...parts }), created: 10, updated: 20 }
}

/** A stable full of ponies, built the way the game builds it. */
function fullStable(): LoshadkaSave {
  let save = defaultSave()
  for (let i = 0; i < MAX_PONIES; i += 1) save = finished(dress(startNew(save)), 1000 + i, i).save
  return save
}

/** Every invariant restoreSave promises. */
function expectValid(save: LoshadkaSave): void {
  expect(save.v).toBe(1)
  for (const value of [save.stars, save.finished, save.nextId]) {
    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
  }
  expect(save.nextId).toBeGreaterThanOrEqual(1)
  expect(typeof save.sound).toBe('boolean')
  expect(typeof save.welcomed).toBe('boolean')
  expect(save.ponies.length).toBeLessThanOrEqual(MAX_PONIES)
  expect(new Set(save.ponies.map((p) => p.id)).size).toBe(save.ponies.length)
  expect(save.finished).toBeGreaterThanOrEqual(save.ponies.length)
  for (const p of save.ponies) {
    expect(p.id).toMatch(/^[A-Za-z0-9_-]{1,32}$/)
    expect(Number.isInteger(p.name) && p.name >= 0 && p.name < PONY_NAMES.length).toBe(true)
    expect(isComplete(p.look)).toBe(true)
    expect(typeof p.look.horn).toBe('boolean')
    expect(typeof p.look.wings).toBe('boolean')
    for (const side of SIDES) expect(isAvailable(save, side, p.look[side]!)).toBe(true)
    if (p.look.horn) expect(isAvailable(save, 'magic', 'horn')).toBe(true)
    if (p.look.wings) expect(isAvailable(save, 'magic', 'wings')).toBe(true)
    expect(Number.isInteger(p.created) && p.created >= 0).toBe(true)
    expect(p.updated).toBeGreaterThanOrEqual(p.created)
    const numbered = /^p(\d{1,9})$/.exec(p.id)
    if (numbered) expect(save.nextId).toBeGreaterThan(Number(numbered[1]))
  }
  const { draft } = save
  for (const side of SIDES) {
    const id = draft.look[side]
    if (id !== null) expect(isAvailable(save, side, id)).toBe(true)
  }
  expect(typeof draft.look.horn).toBe('boolean')
  expect(typeof draft.look.wings).toBe('boolean')
  if (draft.look.horn) expect(isAvailable(save, 'magic', 'horn')).toBe(true)
  if (draft.look.wings) expect(isAvailable(save, 'magic', 'wings')).toBe(true)
  if (draft.editing === null) expect(draft.doneKey).toBeNull()
  else {
    const edited = save.ponies.find((p) => p.id === draft.editing)
    expect(edited).toBeDefined()
    expect(draft.doneKey).toBe(lookKey(edited!.look))
  }
  expect(isAvailable(save, 'background', save.background)).toBe(true)
  const opened = new Set(openedGifts(save).map((g) => giftKey(g.kind, g.id)))
  expect(new Set(save.seen).size).toBe(save.seen.length)
  for (const key of save.seen) expect(opened.has(key)).toBe(true)
}

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─────────────────────────── the shared item contract ─────────────────────────── */

group('loshadka-items integrity', () => {
  it('has unique ids within every kind, and every item sits under its own kind', () => {
    for (const kind of KINDS) {
      const ids = ITEMS[kind].map((item) => item.id)
      expect(new Set(ids).size, kind).toBe(ids.length)
      for (const item of ITEMS[kind]) expect(item.kind).toBe(kind)
    }
    expect(ITEMS).toEqual({ mane: MANES, clip: CLIPS, tail: TAILS, color: COLORS, magic: MAGIC, background: BACKGROUNDS })
  })

  it('lists every non-base item exactly once in GIFTS', () => {
    for (const kind of KINDS) {
      for (const item of ITEMS[kind].filter((i) => !i.base)) {
        const hits = GIFTS.filter((g) => g.kind === kind && g.id === item.id)
        expect(hits.length, `${kind}:${item.id}`).toBe(1)
      }
    }
  })

  it('has GIFTS that all exist, are not base and never repeat', () => {
    const keys = GIFTS.map((g) => giftKey(g.kind, g.id))
    expect(new Set(keys).size).toBe(GIFTS.length)
    for (const gift of GIFTS) {
      const item = findItem(gift.kind, gift.id)
      expect(item, giftKey(gift.kind, gift.id)).toBeDefined()
      expect(item!.base).toBe(false)
    }
  })

  it('starts every side with at least four base items', () => {
    for (const side of SIDES) expect(ITEMS[side].filter((i) => i.base).length, side).toBeGreaterThanOrEqual(4)
  })

  it('names every item and pony name in all three languages', () => {
    for (const kind of KINDS) {
      for (const item of ITEMS[kind]) {
        for (const lang of LANGS) expect(item.name[lang].trim(), `${kind}:${item.id}:${lang}`).not.toBe('')
      }
    }
    expect(PONY_NAMES.length).toBeGreaterThanOrEqual(6)
    for (const names of PONY_NAMES) for (const lang of LANGS) expect(names[lang].trim()).not.toBe('')
  })

  it('opens with Matryona’s hearts background and only horn and wings as magic', () => {
    expect(BACKGROUNDS[0]).toMatchObject({ id: 'hearts', base: true })
    expect(MAGIC.map((m) => m.id)).toEqual(['horn', 'wings'])
    expect(SIDES).toEqual(['mane', 'clip', 'tail', 'color'])
  })
})

/* ─────────────────────────── defaults ─────────────────────────── */

group('defaults', () => {
  it('uses the agreed storage key and stable size', () => {
    expect(LOSHADKA_KEY).toBe('spielzeuge.loshadka.v1')
    expect(MAX_PONIES).toBe(30)
  })

  it('starts with an uncoloured sketch on the hearts background', () => {
    const save = defaultSave()
    expect(save).toEqual({
      v: 1,
      stars: 0,
      finished: 0,
      seen: [],
      ponies: [],
      draft: { look: emptyLook(), editing: null, doneKey: null },
      background: 'hearts',
      sound: true,
      nextId: 1,
      welcomed: false,
    })
    expect(emptyLook()).toEqual({ color: null, mane: null, tail: null, clip: null, horn: false, wings: false })
    expectValid(save)
  })

  it('returns fresh objects every time', () => {
    const a = defaultSave()
    const b = defaultSave()
    expect(a).not.toBe(b)
    expect(a.draft.look).not.toBe(b.draft.look)
    expect(a.ponies).not.toBe(b.ponies)
    a.draft.look.mane = 'sunny'
    a.seen.push('x')
    expect(defaultSave()).toEqual(b)
  })
})

/* ─────────────────────────── restoring ─────────────────────────── */

group('restoreSave', () => {
  it('falls back to defaults for missing or broken data', () => {
    const garbage = [
      null,
      '',
      ' ',
      '{',
      'null',
      '[]',
      '[1,2]',
      '42',
      '"x"',
      'true',
      '{}',
      'undefined',
      '{"v":1,"stars":"x"}',
      '{"ponies":{"length":3},"draft":[],"seen":"mane:rainbow","nextId":"7"}',
      '{"draft":{"look":"sunny","editing":5,"doneKey":{}}}',
    ]
    for (const raw of garbage) expect(restoreSave(raw), String(raw)).toEqual(defaultSave())
    expect(restoreSave(undefined as unknown as string)).toEqual(defaultSave())
    expect(restoreSave(42 as unknown as string)).toEqual(defaultSave())
  })

  it('round-trips a played save through serialize', () => {
    let save = finished(dress(defaultSave()), 5000, 3).save
    save = wear(save, 'magic', 'horn')
    save = finished(save, 6000, 4).save
    save = markSeen(save, 'magic', 'horn')
    save = finished(dress(startNew(save), OTHER), 7000, 5).save
    save = { ...wear(save, 'mane', 'rainbow'), sound: false, welcomed: true }
    expect(restoreSave(serialize(save))).toEqual(save)
    expectValid(save)
  })

  it('clamps negative, fractional, infinite and huge numbers', () => {
    expect(restoreSave('{"stars":-5,"finished":-1,"nextId":-3}')).toMatchObject({ stars: 0, finished: 0, nextId: 1 })
    expect(restoreSave('{"stars":12.9,"finished":2.5,"nextId":4.2}')).toMatchObject({ stars: 12, finished: 2, nextId: 4 })
    const huge = restoreSave('{"stars":1e999,"finished":1e308,"nextId":1e400}')
    expect(Number.isFinite(huge.stars) && Number.isFinite(huge.finished) && Number.isFinite(huge.nextId)).toBe(true)
    expect(huge.finished).toBeGreaterThanOrEqual(GIFTS.length)
    expect(nextGift(huge)).toBeNull()
    expect(restoreSave('{"stars":"12","finished":true,"nextId":null}')).toMatchObject({ stars: 0, finished: 0, nextId: 1 })
    expectValid(huge)
  })

  it('keeps only real booleans for sound and welcomed', () => {
    expect(restoreSave('{"sound":false,"welcomed":true}')).toMatchObject({ sound: false, welcomed: true })
    expect(restoreSave('{"sound":"no","welcomed":1}')).toMatchObject({ sound: true, welcomed: false })
  })

  it('drops unknown item ids from the draft', () => {
    const save = restoreSave(
      JSON.stringify({ draft: { look: { mane: 'sunny', clip: 'banana', tail: 7, color: 'orange', horn: 'yes' } } }),
    )
    expect(save.draft.look).toEqual(look({ mane: 'sunny', color: 'orange' }))
  })

  it('drops draft parts that are still wrapped gifts, but keeps opened ones', () => {
    const wrapped = { mane: 'rainbow', clip: 'crown', tail: 'rainbow', color: 'golden', horn: true, wings: true }
    const raw = { draft: { look: wrapped } }
    expect(restoreSave(JSON.stringify(raw)).draft.look).toEqual(emptyLook())
    const later = restoreSave(JSON.stringify({ ...raw, finished: 3 }))
    expect(later.draft.look).toEqual(look({ mane: 'rainbow', clip: 'crown', horn: true }))
  })

  it('drops ponies with unknown ids, incomplete looks or broken shapes', () => {
    const save = restoreSave(
      JSON.stringify({
        ponies: [
          { id: 'p1', name: 0, look: { ...BASE, mane: 'banana' } },
          { id: 'p2', name: 0, look: { ...BASE, clip: null } },
          { id: 'p3', name: 0, look: 'pretty' },
          { id: 4, name: 0, look: BASE },
          { id: '', name: 0, look: BASE },
          { id: '<img src=x>', name: 0, look: BASE },
          { id: 'x'.repeat(40), name: 0, look: BASE },
          null,
          'p9',
          [BASE],
          { id: 'p5', name: 2, look: { ...BASE, horn: 'yes', wings: 1 }, created: 5, updated: 9 },
        ],
      }),
    )
    expect(save.ponies).toEqual([{ id: 'p5', name: 2, look: look(BASE), created: 5, updated: 9 }])
  })

  it('repairs pony names and timestamps instead of dropping the pony', () => {
    const save = restoreSave(
      JSON.stringify({
        ponies: [
          { id: 'a', name: 99, look: BASE, created: -5, updated: 'soon' },
          { id: 'b', name: 1.5, look: BASE, created: 1e30, updated: 3 },
          { id: 'c', name: '3', look: BASE, created: 50, updated: 40 },
        ],
      }),
    )
    expect(save.ponies.map((p) => p.name)).toEqual([0, 1, 2])
    expect(save.ponies[0]).toMatchObject({ created: 0, updated: 0 })
    expect(save.ponies[1].created).toBe(8.64e15)
    expect(save.ponies[1].updated).toBe(8.64e15)
    expect(save.ponies[2]).toMatchObject({ created: 50, updated: 50 })
    expectValid(save)
  })

  it('keeps the newest MAX_PONIES ponies when there are too many', () => {
    const ponies = Array.from({ length: 45 }, (_, i) => pony(`p${45 - i}`, i % PONY_NAMES.length))
    const save = restoreSave(JSON.stringify({ ponies, nextId: 46 }))
    expect(save.ponies).toHaveLength(MAX_PONIES)
    expect(save.ponies[0].id).toBe('p45')
    expect(save.ponies.at(-1)!.id).toBe('p16')
    expectValid(save)
  })

  it('keeps the first of duplicate pony ids', () => {
    const save = restoreSave(JSON.stringify({ ponies: [pony('p1', 3), pony('p1', 4), pony('p2', 5)] }))
    expect(save.ponies.map((p) => [p.id, p.name])).toEqual([
      ['p1', 3],
      ['p2', 5],
    ])
  })

  it('moves nextId past every numbered pony id so new ponies never collide', () => {
    const save = restoreSave(JSON.stringify({ nextId: 2, ponies: [pony('p7', 0), pony('old', 1), pony('p3', 2)] }))
    expect(save.nextId).toBe(8)
    const result = finished(dress(startNew(save)))
    expect(result.pony.id).toBe('p8')
  })

  it('opens at least as many gifts as there are ponies and as their items need', () => {
    expect(restoreSave(JSON.stringify({ finished: 0, ponies: [pony('p1', 0), pony('p2', 1)] })).finished).toBe(2)
    const fancy = restoreSave(JSON.stringify({ finished: 1, ponies: [pony('p1', 0, { color: 'golden', wings: true })] }))
    expect(fancy.finished).toBe(GIFTS.findIndex((g) => g.kind === 'color' && g.id === 'golden') + 1)
    expect(isAvailable(fancy, 'magic', 'wings')).toBe(true)
    expectValid(fancy)
  })

  it('clears editing that points at a pony that no longer exists', () => {
    const save = restoreSave(
      JSON.stringify({ ponies: [pony('p1', 0)], draft: { look: BASE, editing: 'p9', doneKey: 'whatever' } }),
    )
    expect(save.draft).toEqual({ look: look(BASE), editing: null, doneKey: null })
  })

  it('recomputes doneKey from the edited pony', () => {
    const save = restoreSave(
      JSON.stringify({
        ponies: [pony('p1', 0)],
        draft: { look: { ...BASE, mane: 'green' }, editing: 'p1', doneKey: 'junk' },
      }),
    )
    expect(save.draft.editing).toBe('p1')
    expect(save.draft.doneKey).toBe(lookKey(look(BASE)))
    expect(hasUnfinishedWork(save)).toBe(true)
  })

  it('keeps only opened, known, unique seen keys', () => {
    const save = restoreSave(
      JSON.stringify({
        finished: 3,
        seen: ['mane:rainbow', 'mane:rainbow', 'magic:horn', 'clip:shell', 'mane:sunny', 'nope', 5, null],
      }),
    )
    expect(save.seen).toEqual(['mane:rainbow', 'magic:horn'])
  })

  it('accepts only available backgrounds', () => {
    expect(restoreSave('{"background":"sky"}').background).toBe('sky')
    expect(restoreSave('{"background":"night"}').background).toBe('hearts')
    expect(restoreSave('{"background":"disco"}').background).toBe('hearts')
    expect(restoreSave('{"background":"night","finished":5}').background).toBe('night')
  })

  it('ignores prototype keys, oversized input and deep nesting', () => {
    const save = restoreSave('{"__proto__":{"stars":5,"sound":false},"constructor":{"x":1},"stars":2}')
    expect(save.stars).toBe(2)
    expect(save.sound).toBe(true)
    expect(({} as Record<string, unknown>).stars).toBeUndefined()
    expect(restoreSave(JSON.stringify({ stars: 3, pad: 'x'.repeat(300_000) }))).toEqual(defaultSave())
    expect(restoreSave('['.repeat(5000) + ']'.repeat(5000))).toEqual(defaultSave())
    expect(restoreSave('{"a":' + '['.repeat(100_000))).toEqual(defaultSave())
  })

  it('never throws on random garbage and always returns a valid save', () => {
    const random = rng(2026)
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
    const strings = ['', 'p1', 'p2', 'x', '__proto__', 'sunny', 'rainbow', 'horn', 'wings', 'night', 'mane:rainbow']
    const value = (depth: number): unknown => {
      const roll = random()
      if (roll < 0.15) return pick([0, -1, 1, 2.5, 1e308, -1e308, 31, 1e9])
      if (roll < 0.3) return pick(strings)
      if (roll < 0.4) return pick([true, false, null])
      if (roll < 0.55 && depth < 4) return Array.from({ length: Math.floor(random() * 5) }, () => value(depth + 1))
      if (depth < 4) {
        const keys = ['v', 'stars', 'finished', 'seen', 'ponies', 'draft', 'look', 'editing', 'doneKey', 'id', 'name']
        return Object.fromEntries(keys.filter(() => random() < 0.4).map((k) => [k, value(depth + 1)]))
      }
      return null
    }
    const real = JSON.parse(serialize(fullStable())) as Record<string, unknown>
    const mutate = (node: unknown): unknown => {
      if (random() < 0.08) return value(2)
      if (Array.isArray(node)) return node.filter(() => random() > 0.05).map(mutate)
      if (node && typeof node === 'object')
        return Object.fromEntries(Object.entries(node).map(([k, v]) => [random() < 0.03 ? pick(strings) : k, mutate(v)]))
      return node
    }
    for (let i = 0; i < 400; i += 1) {
      const cut = Math.floor(random() * 2000)
      const raws = [JSON.stringify(value(0)), JSON.stringify(mutate(real)), JSON.stringify(mutate(real)).slice(0, cut)]
      for (const raw of raws) {
        let save: LoshadkaSave | undefined
        expect(() => (save = restoreSave(raw))).not.toThrow()
        expectValid(save!)
        expect(restoreSave(serialize(save!))).toEqual(save)
      }
    }
  })

  it('keeps a full save small', () => {
    let save = fullStable()
    for (let i = 0; i < GIFTS.length; i += 1) save = markSeen(save, GIFTS[i].kind, GIFTS[i].id)
    save = { ...save, finished: 999, seen: GIFTS.map((g) => giftKey(g.kind, g.id)) }
    expect(serialize(save).length).toBeLessThan(8000)
  })
})

/* ─────────────────────────── looks ─────────────────────────── */

group('looks', () => {
  it('gives every different look a different key and equal looks the same key', () => {
    const base = look(BASE)
    const variants = [
      emptyLook(),
      base,
      { ...base, mane: 'green' },
      { ...base, clip: 'orange' },
      { ...base, tail: 'red' },
      { ...base, color: 'green' },
      { ...base, horn: true },
      { ...base, wings: true },
      { ...base, horn: true, wings: true },
      { ...base, mane: null },
    ]
    expect(new Set(variants.map(lookKey)).size).toBe(variants.length)
    expect(lookKey({ ...base })).toBe(lookKey(base))
  })

  it('lists missing sides in the order mane, clip, tail, colour', () => {
    expect(missingSides(emptyLook())).toEqual(['mane', 'clip', 'tail', 'color'])
    expect(missingSides(look({ clip: 'bow' }))).toEqual(['mane', 'tail', 'color'])
    expect(missingSides(look({ mane: 'sunny', color: 'red' }))).toEqual(['clip', 'tail'])
    expect(missingSides(look({ ...BASE, tail: 'banana' }))).toEqual(['tail'])
    expect(missingSides(look(BASE))).toEqual([])
  })

  it('is complete only with all four sides', () => {
    expect(isComplete(look(BASE))).toBe(true)
    expect(isComplete(look({ ...BASE, horn: true, wings: true }))).toBe(true)
    expect(isComplete(look({ ...BASE, color: null }))).toBe(false)
    expect(isComplete(look({ horn: true, wings: true }))).toBe(false)
  })

  it('describes the worn items in the current language', () => {
    const worn = look({ ...BASE, horn: true })
    expect(describe(worn, 'ru')).toEqual(['Рыжая лошадка', 'Солнечная грива', 'Клубничка', 'Чёрный хвост', 'Рог единорога'])
    expect(describe(worn, 'de')[1]).toBe('Sonnige Mähne')
    expect(describe(look({ tail: 'pinkBraid', wings: true }), 'en')).toEqual(['Pink braid with a bow', 'Wings'])
    expect(describe(emptyLook(), 'ru')).toEqual([])
    expect(describe(look({ mane: 'banana' }), 'en')).toEqual([])
  })
})

/* ─────────────────────────── gifts and items ─────────────────────────── */

group('gifts and items', () => {
  it('keys gifts as kind:id', () => {
    expect(giftKey('mane', 'rainbow')).toBe('mane:rainbow')
    expect(giftKey('magic', 'horn')).toBe('magic:horn')
  })

  it('opens GIFTS in order, one per finished pony, never more than all', () => {
    expect(openedGifts(defaultSave())).toEqual([])
    expect(openedGifts(after(3))).toEqual(GIFTS.slice(0, 3))
    expect(openedGifts(after(500))).toEqual([...GIFTS])
    const opened = openedGifts(after(2))
    opened[0].id = 'hacked'
    expect(GIFTS[0].id).toBe('horn')
  })

  it('starts with the base items of every kind in file order', () => {
    const save = defaultSave()
    for (const kind of KINDS)
      expect(availableItems(save, kind).map((i) => i.id), kind).toEqual(ITEMS[kind].filter((i) => i.base).map((i) => i.id))
    expect(availableItems(save, 'magic')).toEqual([])
  })

  it('appends opened gifts after the base items, in gift order', () => {
    const save = after(13)
    const baseManes = MANES.filter((m) => m.base).map((m) => m.id)
    expect(availableItems(save, 'mane').map((m) => m.id)).toEqual([...baseManes, 'rainbow', 'starry', 'candy'])
    expect(availableItems(save, 'magic').map((m) => m.id)).toEqual(['horn', 'wings'])
    expect(availableItems(save, 'background').map((b) => b.id)).toEqual(['hearts', 'meadow', 'sky', 'night', 'rainbow'])
    const all = after(GIFTS.length)
    for (const kind of KINDS) expect(availableItems(all, kind)).toHaveLength(ITEMS[kind].length)
  })

  it('lists the still wrapped gifts of a side in gift order', () => {
    const clips = ['crown', 'wreath', 'rainbowClip', 'cherry', 'shell']
    expect(lockedGifts(defaultSave(), 'clip').map((g) => g.id)).toEqual(clips)
    expect(lockedGifts(after(3), 'clip').map((g) => g.id)).toEqual(['wreath', 'rainbowClip', 'cherry', 'shell'])
    expect(lockedGifts(after(GIFTS.length), 'clip')).toEqual([])
    for (const count of [0, 5, 14, 27]) {
      const save = after(count)
      for (const kind of KINDS) {
        const available = availableItems(save, kind).map((i) => i.id)
        const locked = lockedGifts(save, kind).map((g) => g.id)
        expect(locked.every((id) => !available.includes(id))).toBe(true)
        expect([...available, ...locked].sort()).toEqual(ITEMS[kind].map((i) => i.id).sort())
      }
    }
  })

  it('names the next gift and null once all are open', () => {
    expect(nextGift(defaultSave())).toEqual({ kind: 'magic', id: 'horn' })
    expect(nextGift(after(1))).toEqual({ kind: 'mane', id: 'rainbow' })
    expect(nextGift(after(GIFTS.length - 1))).toEqual(GIFTS.at(-1))
    expect(nextGift(after(GIFTS.length))).toBeNull()
  })

  it('knows what is available', () => {
    const save = defaultSave()
    expect(isAvailable(save, 'mane', 'sunny')).toBe(true)
    expect(isAvailable(save, 'mane', 'rainbow')).toBe(false)
    expect(isAvailable(save, 'mane', 'strawberry')).toBe(false)
    expect(isAvailable(save, 'magic', 'horn')).toBe(false)
    expect(isAvailable(after(1), 'magic', 'horn')).toBe(true)
    expect(isAvailable(save, 'color', 'banana')).toBe(false)
    expect(isAvailable(save, 'toString' as ItemKind, 'x')).toBe(false)
    expect(availableItems(save, '__proto__' as ItemKind)).toEqual([])
  })

  it('marks an opened gift new until it is seen; base and wrapped items never are', () => {
    const save = after(2)
    expect(isNew(save, 'magic', 'horn')).toBe(true)
    expect(isNew(save, 'mane', 'rainbow')).toBe(true)
    expect(isNew(save, 'mane', 'sunny')).toBe(false)
    expect(isNew(save, 'clip', 'crown')).toBe(false)
    const seen = markSeen(save, 'magic', 'horn')
    expect(seen).not.toBe(save)
    expect(save.seen).toEqual([])
    expect(seen.seen).toEqual(['magic:horn'])
    expect(isNew(seen, 'magic', 'horn')).toBe(false)
    expect(isNew(seen, 'mane', 'rainbow')).toBe(true)
  })

  it('ignores markSeen for base, wrapped, unknown or already seen items', () => {
    const save = markSeen(after(2), 'magic', 'horn')
    expect(markSeen(save, 'magic', 'horn')).toBe(save)
    expect(markSeen(save, 'mane', 'sunny')).toBe(save)
    expect(markSeen(save, 'clip', 'crown')).toBe(save)
    expect(markSeen(save, 'clip', 'banana')).toBe(save)
  })
})

/* ─────────────────────────── wearing ─────────────────────────── */

group('wear', () => {
  it('puts side items on the draft without touching the input', () => {
    const save = defaultSave()
    const next = wear(save, 'mane', 'blue')
    expect(next.draft.look).toEqual(look({ mane: 'blue' }))
    expect(save.draft.look).toEqual(emptyLook())
    expect(next.draft.editing).toBeNull()
    const dressed = dress(next)
    expect(dressed.draft.look).toEqual(look(BASE))
    expect(wear(dressed, 'clip', 'bow').draft.look.clip).toBe('bow')
  })

  it('ignores locked, unknown and wrong-kind ids', () => {
    const save = defaultSave()
    expect(wear(save, 'mane', 'rainbow')).toBe(save)
    expect(wear(save, 'magic', 'horn')).toBe(save)
    expect(wear(save, 'background', 'night')).toBe(save)
    expect(wear(save, 'clip', 'sunny')).toBe(save)
    expect(wear(save, 'color', '')).toBe(save)
  })

  it('changes nothing when the same item is chosen again', () => {
    const save = wear(defaultSave(), 'tail', 'red')
    expect(wear(save, 'tail', 'red')).toBe(save)
    expect(wear(save, 'background', 'hearts')).toBe(save)
  })

  it('toggles horn and wings independently of the clip and of each other', () => {
    let save = dress(after(6))
    save = wear(save, 'magic', 'horn')
    expect(save.draft.look).toMatchObject({ horn: true, wings: false, clip: 'strawberry' })
    save = wear(save, 'magic', 'wings')
    expect(save.draft.look).toMatchObject({ horn: true, wings: true })
    save = wear(save, 'clip', 'crown')
    expect(save.draft.look).toMatchObject({ horn: true, wings: true, clip: 'crown' })
    save = wear(save, 'magic', 'horn')
    expect(save.draft.look).toMatchObject({ horn: false, wings: true, clip: 'crown' })
  })

  it('sets an unlocked background on the save, not on the pony', () => {
    const save = wear(defaultSave(), 'background', 'sky')
    expect(save.background).toBe('sky')
    expect(save.draft.look).toEqual(emptyLook())
    expect(wear(after(5), 'background', 'night').background).toBe('night')
  })
})

/* ─────────────────────────── finishing ─────────────────────────── */

group('finish', () => {
  it('refuses an incomplete pony and names the missing sides in order', () => {
    const all = ['mane', 'clip', 'tail', 'color']
    expect(finish(defaultSave(), 1, 1)).toEqual({ ok: false, reason: 'incomplete', missing: all })
    const partial = wear(wear(defaultSave(), 'color', 'pink'), 'clip', 'bow')
    expect(finish(partial, 1, 1)).toEqual({ ok: false, reason: 'incomplete', missing: ['mane', 'tail'] })
    expect(finish(wear(partial, 'magic', 'horn'), 1, 1)).toMatchObject({ reason: 'incomplete' })
  })

  it('moves a new pony into the stable with 3 stars and the first gift', () => {
    const save = dress(defaultSave())
    const result = finished(save, 12345, 7)
    expect(result).toMatchObject({ ok: true, stars: 3, gift: { kind: 'magic', id: 'horn' }, isNew: true })
    const name = nameChoices(save, 7)[0]
    expect(result.pony).toEqual({ id: 'p1', name, look: look(BASE), created: 12345, updated: 12345 })
    const next = result.save
    expect(next).toMatchObject({ stars: 3, finished: 1, nextId: 2 })
    expect(next.ponies).toEqual([result.pony])
    expect(next.draft).toEqual({ look: look(BASE), editing: 'p1', doneKey: lookKey(look(BASE)) })
    expect(next.draft.look).not.toBe(result.pony.look)
    expect(isNew(next, 'magic', 'horn')).toBe(true)
    expectValid(next)
  })

  it('puts the newest pony first', () => {
    let save = finished(dress(defaultSave()), 1).save
    save = finished(dress(startNew(save), OTHER), 2).save
    expect(save.ponies.map((p) => p.id)).toEqual(['p2', 'p1'])
  })

  it('does not change the save it was given', () => {
    const save = dress(defaultSave())
    const before = structuredClone(save)
    finished(save)
    expect(save).toEqual(before)
  })

  it('gives no stars for an unchanged pony', () => {
    const save = finished(dress(defaultSave())).save
    expect(finish(save, 2000, 2)).toEqual({ ok: false, reason: 'unchanged' })
    expect(finish(editPony(save, 'p1'), 2000, 2)).toEqual({ ok: false, reason: 'unchanged' })
    const back = wear(wear(save, 'mane', 'green'), 'mane', 'sunny')
    expect(finish(back, 2000, 2)).toEqual({ ok: false, reason: 'unchanged' })
  })

  it('updates the same pony when an edited look is finished, keeping name and birthday', () => {
    const first = finished(dress(defaultSave()), 1000, 1)
    const renamed = rename(first.save, 'p1', 9)
    const result = finished(wear(renamed, 'mane', 'green'), 2000, 99)
    // Three stars for the new look, but no gift: only a new pony opens one.
    expect(result).toMatchObject({ ok: true, stars: 3, isNew: false, gift: null })
    expect(result.pony).toEqual({ id: 'p1', name: 9, look: look({ ...BASE, mane: 'green' }), created: 1000, updated: 2000 })
    expect(result.save.ponies).toEqual([result.pony])
    expect(result.save).toMatchObject({ stars: 6, finished: 1, nextId: 2 })
    expect(nextGift(result.save)).toEqual({ kind: 'mane', id: 'rainbow' })
    expect(result.save.draft.doneKey).toBe(lookKey(result.pony.look))
    expect(finish(result.save, 3000, 1)).toEqual({ ok: false, reason: 'unchanged' })
  })

  it('edits a stable pony brought back with editPony', () => {
    let save = finished(dress(defaultSave()), 1).save
    save = finished(dress(startNew(save), OTHER), 2).save
    const result = finished(wear(editPony(save, 'p1'), 'tail', 'white'), 3)
    expect(result.isNew).toBe(false)
    expect(result.save.ponies.map((p) => [p.id, p.look.tail])).toEqual([
      ['p2', 'red'],
      ['p1', 'white'],
    ])
  })

  it('opens every gift in GIFTS order exactly once, then no more', () => {
    let save = finished(dress(defaultSave())).save
    const gifts = [{ kind: 'magic', id: 'horn' }]
    for (let i = 0; i < GIFTS.length + 5; i += 1) {
      // A new pony every time; the previous one goes for a walk so the stable never fills up.
      const previous = save.ponies[0].id
      const result = finished(dress(startNew(save), i % 2 === 0 ? OTHER : BASE), 2000 + i)
      if (result.gift) gifts.push(result.gift)
      save = release(result.save, previous)
    }
    expect(gifts).toEqual([...GIFTS])
    expect(save.finished).toBe(GIFTS.length + 6)
    expect(save.stars).toBe(3 * (GIFTS.length + 6))
    expect(nextGift(save)).toBeNull()
    for (const kind of KINDS) expect(lockedGifts(save, kind)).toEqual([])
  })

  it('gives stars but no gift for re-dressing the same pony', () => {
    let save = finished(dress(defaultSave())).save
    for (let i = 0; i < 6; i += 1) {
      const result = finished(wear(save, 'magic', 'horn'), 3000 + i)
      expect(result.gift).toBeNull()
      save = result.save
    }
    expect(save).toMatchObject({ stars: 21, finished: 1 })
    expect(save.ponies).toHaveLength(1)
  })

  it('refuses a new pony when the stable is full, but edits still work', () => {
    const full = fullStable()
    expect(full.ponies).toHaveLength(MAX_PONIES)
    expect(new Set(full.ponies.map((p) => p.id)).size).toBe(MAX_PONIES)
    expect(finish(dress(startNew(full), OTHER), 9, 9)).toEqual({ ok: false, reason: 'full' })
    const edited = finished(wear(editPony(full, 'p3'), 'color', 'pink'), 9, 9)
    expect(edited.isNew).toBe(false)
    expect(edited.save.ponies).toHaveLength(MAX_PONIES)
    expect(edited.save.ponies.find((p) => p.id === 'p3')!.look.color).toBe('pink')
    const freed = release(full, 'p10')
    expect(finished(dress(startNew(freed), OTHER)).isNew).toBe(true)
  })

  it('makes a new pony from a draft whose pony was released', () => {
    const save = release(wear(finished(dress(defaultSave())).save, 'clip', 'bow'), 'p1')
    const result = finished(save, 5, 5)
    expect(result.isNew).toBe(true)
    expect(result.pony.id).toBe('p2')
    expect(result.pony.look.clip).toBe('bow')
  })

  it('is deterministic and keeps clocks that go backwards sane', () => {
    const save = dress(defaultSave())
    expect(finish(save, 777, 3)).toEqual(finish(save, 777, 3))
    const first = finished(save, 5000).save
    const edited = finished(wear(first, 'mane', 'blue'), 100)
    expect(edited.pony.updated).toBe(5000)
    expect(finished(save, Number.NaN).pony.created).toBe(0)
  })
})

/* ─────────────────────────── names ─────────────────────────── */

group('nameChoices and rename', () => {
  it('offers three distinct names, the same ones for the same seed', () => {
    const save = defaultSave()
    const names = nameChoices(save, 42)
    expect(names).toHaveLength(3)
    expect(new Set(names).size).toBe(3)
    for (const n of names) expect(Number.isInteger(n) && n >= 0 && n < PONY_NAMES.length).toBe(true)
    expect(nameChoices(save, 42)).toEqual(names)
    const firsts = new Set(Array.from({ length: 20 }, (_, seed) => nameChoices(save, seed)[0]))
    expect(firsts.size).toBeGreaterThan(5)
    expect(nameChoices(save, 0.25)).not.toEqual(nameChoices(save, 0.75))
  })

  it('prefers names no pony has yet', () => {
    const taken = Array.from({ length: PONY_NAMES.length - 3 }, (_, i) => i)
    const save = restoreSave(JSON.stringify({ ponies: taken.map((name) => pony(`p${name + 1}`, name)) }))
    const free = PONY_NAMES.map((_, i) => i).filter((i) => !taken.includes(i))
    for (let seed = 0; seed < 10; seed += 1) expect(nameChoices(save, seed).sort((a, b) => a - b)).toEqual(free)
    expect(free).toContain(nameChoices(save, 3, 1)[0])
  })

  it('falls back to taken names and never offers more than exist', () => {
    const ponies = PONY_NAMES.map((_, i) => pony(`p${i + 1}`, i))
    const save = restoreSave(JSON.stringify({ ponies }))
    expect(new Set(nameChoices(save, 1)).size).toBe(3)
    const everything = nameChoices(defaultSave(), 5, 100)
    expect(everything).toHaveLength(PONY_NAMES.length)
    expect(new Set(everything).size).toBe(PONY_NAMES.length)
    expect(nameChoices(defaultSave(), 5, 0)).toEqual([])
    expect(nameChoices(defaultSave(), 5, -2)).toEqual([])
    expect(nameChoices(defaultSave(), 5, Number.NaN)).toHaveLength(3)
  })

  it('extends the list for the dice without repeating the first names', () => {
    const save = defaultSave()
    const six = nameChoices(save, 11, 6)
    expect(six.slice(0, 3)).toEqual(nameChoices(save, 11))
    expect(new Set(six).size).toBe(6)
  })

  it('offers the same names right after a finish as before it', () => {
    const base = finished(dress(defaultSave()), 1, 4).save
    const save = dress(startNew(base), OTHER)
    const before = nameChoices(save, 21)
    const result = finished(save, 2, 21)
    expect(result.pony.name).toBe(before[0])
    expect(nameChoices(result.save, 21)).toEqual(before)
    expect(before).not.toContain(base.ponies[0].name)
  })

  it('renames a pony only with a valid name and a known pony', () => {
    const save = finished(dress(defaultSave())).save
    const original = save.ponies[0].name
    const target = (original + 1) % PONY_NAMES.length
    const renamed = rename(save, 'p1', target)
    expect(renamed.ponies[0]).toMatchObject({ id: 'p1', name: target, look: look(BASE) })
    expect(save.ponies[0].name).toBe(original)
    expect(rename(save, 'p9', target)).toBe(save)
    expect(rename(save, 'p1', -1)).toBe(save)
    expect(rename(save, 'p1', PONY_NAMES.length)).toBe(save)
    expect(rename(save, 'p1', 1.5)).toBe(save)
    expect(rename(renamed, 'p1', target)).toBe(renamed)
  })
})

/* ─────────────────────────── the stable ─────────────────────────── */

group('stable and drafts', () => {
  it('starts a fresh sketch but keeps ponies, stars and background', () => {
    const played = wear(finished(dress(defaultSave())).save, 'background', 'sky')
    const fresh = startNew(played)
    expect(fresh.draft).toEqual({ look: emptyLook(), editing: null, doneKey: null })
    expect(fresh).toMatchObject({ stars: 3, finished: 1, background: 'sky' })
    expect(fresh.ponies).toBe(played.ponies)
    expect(played.draft.editing).toBe('p1')
  })

  it('brings a stable pony back to the workshop for editing', () => {
    let save = finished(dress(defaultSave())).save
    save = startNew(save)
    const editing = editPony(save, 'p1')
    expect(editing.draft).toEqual({ look: look(BASE), editing: 'p1', doneKey: lookKey(look(BASE)) })
    expect(editing.draft.look).not.toBe(save.ponies[0].look)
    expect(editPony(save, 'nope')).toBe(save)
  })

  it('releases a pony; the edited draft stays but is no longer tied to it', () => {
    let save = finished(dress(defaultSave())).save
    save = finished(dress(startNew(save), OTHER)).save
    const edited = wear(editPony(save, 'p1'), 'clip', 'heart')
    const released = release(edited, 'p1')
    expect(released.ponies.map((p) => p.id)).toEqual(['p2'])
    expect(released.draft).toEqual({ look: look({ ...BASE, clip: 'heart' }), editing: null, doneKey: null })
    expect(released).toMatchObject({ stars: 6, finished: 2 })
    expect(edited.ponies).toHaveLength(2)
    expectValid(released)
  })

  it('releasing another pony leaves the draft alone; unknown ids change nothing', () => {
    let save = finished(dress(defaultSave())).save
    save = finished(dress(startNew(save), OTHER)).save
    const released = release(save, 'p1')
    expect(released.draft).toBe(save.draft)
    expect(released.ponies.map((p) => p.id)).toEqual(['p2'])
    expect(release(save, 'p9')).toBe(save)
  })

  it('knows when there is unfinished work on the stage', () => {
    expect(hasUnfinishedWork(defaultSave())).toBe(false)
    expect(hasUnfinishedWork(wear(defaultSave(), 'mane', 'sunny'))).toBe(true)
    expect(hasUnfinishedWork(wear(after(1), 'magic', 'horn'))).toBe(true)
    expect(hasUnfinishedWork(wear(defaultSave(), 'background', 'sky'))).toBe(false)
    const done = finished(dress(defaultSave())).save
    expect(hasUnfinishedWork(done)).toBe(false)
    expect(hasUnfinishedWork(wear(done, 'tail', 'green'))).toBe(true)
    expect(hasUnfinishedWork(wear(wear(done, 'tail', 'green'), 'tail', 'black'))).toBe(false)
    expect(hasUnfinishedWork(editPony(startNew(done), 'p1'))).toBe(false)
    expect(hasUnfinishedWork(release(done, 'p1'))).toBe(true)
    expect(hasUnfinishedWork(startNew(done))).toBe(false)
  })

  it('moves a finished, unchanged pony into the stable when the workshop opens again', () => {
    const done = finished(dress(defaultSave())).save
    expect(finishedUnchanged(done)).toBe(true)
    const reopened = reopenWorkshop(done)
    // a new sketch: changing something now makes a new pony instead of editing p1
    expect(reopened.draft).toEqual({ look: emptyLook(), editing: null, doneKey: null })
    expect(reopened.ponies).toBe(done.ponies)
    expect(reopened).toMatchObject({ stars: 3, finished: 1 })
    const next = finish(dress(reopened, OTHER), 2000, 2)
    expect(next.ok && next.isNew).toBe(true)
    expect(next.ok && next.save.ponies.map((p) => p.look.mane)).toEqual([OTHER.mane, BASE.mane])
    expectValid(reopened)
  })

  it('leaves half-made ponies and unsaved edits on the stage when the workshop opens again', () => {
    const fresh = defaultSave()
    expect(reopenWorkshop(fresh)).toBe(fresh)
    const halfMade = wear(fresh, 'mane', 'sunny')
    expect(finishedUnchanged(halfMade)).toBe(false)
    expect(reopenWorkshop(halfMade)).toBe(halfMade)
    const done = finished(dress(defaultSave())).save
    const edited = wear(done, 'tail', 'green')
    expect(finishedUnchanged(edited)).toBe(false)
    expect(reopenWorkshop(edited)).toBe(edited)
    // undoing the change makes it the finished pony again
    expect(finishedUnchanged(wear(edited, 'tail', BASE.tail))).toBe(true)
    // a released pony's look is no longer a stable pony
    const released = release(done, 'p1')
    expect(finishedUnchanged(released)).toBe(false)
    expect(reopenWorkshop(released)).toBe(released)
  })

  it('offers a freshly opened background first, then the backgrounds in turn', () => {
    const order = (save: LoshadkaSave, taps: number): string[] => {
      const seen: string[] = []
      for (let i = 0; i < taps; i += 1) {
        const next = nextBackground(save)
        seen.push(next.id)
        save = markSeen(wear(save, 'background', next.id), 'background', next.id)
      }
      return seen
    }
    // only the base backgrounds: a plain round
    expect(order(defaultSave(), 4)).toEqual(['meadow', 'sky', 'hearts', 'meadow'])
    // the starry night is the fifth gift: it comes next, once
    const fifth = after(5)
    expect(nextBackground(fifth).id).toBe('night')
    expect(order(fifth, 5)).toEqual(['night', 'hearts', 'meadow', 'sky', 'night'])
    // every gift open and none seen: the new ones first, then the round
    const all = after(GIFTS.length)
    expect(order(all, 8)).toEqual(['night', 'rainbow', 'castle', 'sea', 'hearts', 'meadow', 'sky', 'night'])
    // a seen gift background takes its usual turn
    const seenNight = markSeen(fifth, 'background', 'night')
    expect(nextBackground(seenNight).id).toBe('meadow')
    // the one on the stage is never offered again
    const onNight = wear(fifth, 'background', 'night')
    expect(nextBackground(onNight).id).toBe('hearts')
  })

  it('keeps every save valid through a long random session', () => {
    const random = rng(7)
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
    let save = defaultSave()
    for (let step = 0; step < 1500; step += 1) {
      const roll = random()
      const kind = pick(KINDS)
      if (roll < 0.55) save = wear(save, kind, pick(ITEMS[kind]).id)
      else if (roll < 0.7) {
        const result = finish(save, step * 1000, step)
        if (result.ok) save = result.save
      } else if (roll < 0.75) save = startNew(save)
      else if (roll < 0.8 && save.ponies.length) save = editPony(save, pick(save.ponies).id)
      else if (roll < 0.83 && save.ponies.length) save = release(save, pick(save.ponies).id)
      else if (roll < 0.88 && save.ponies.length) save = rename(save, pick(save.ponies).id, Math.floor(random() * 30))
      else save = markSeen(save, kind, pick(ITEMS[kind]).id)
      expectValid(save)
    }
    expect(restoreSave(serialize(save))).toEqual(save)
    expect(save.ponies.length).toBeGreaterThan(0)
  })
})
