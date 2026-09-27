import { describe, expect, it } from 'vitest'
import { LANGS, type Lang } from './languages.ts'
import { LEVEL_COUNT, itemsFor, knownItems, levelPlan, levelPool, spokenForm, type ItemKind } from './bolnica-words.ts'

const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1)
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 - 13)
const expectedKind = (level: number): ItemKind => (level <= 8 ? 'letter' : level <= 14 ? 'syllable' : 'word')
const upper = (lang: Lang, text: string) => text.toLocaleUpperCase(lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : 'en-GB')

describe('level plans', () => {
  it('has twenty levels', () => {
    expect(LEVEL_COUNT).toBe(20)
  })

  it.each(LANGS)('plans every level in %s: letters, then syllables, then words', (lang) => {
    for (const level of LEVELS) {
      const plan = levelPlan(lang, level)
      expect(plan.level).toBe(level)
      expect(plan.kind).toBe(expectedKind(level))
      expect(plan.count).toBeGreaterThanOrEqual(3)
      expect(plan.count).toBeLessThanOrEqual(6)
      expect(plan.theme.length).toBeGreaterThan(2)
    }
    expect(levelPlan(lang, 1).count).toBe(3)
    expect(levelPlan(lang, 20).count).toBe(6)
  })

  it('clamps odd level numbers', () => {
    expect(levelPlan('ru', 0).level).toBe(1)
    expect(levelPlan('ru', -5).level).toBe(1)
    expect(levelPlan('de', 99).level).toBe(20)
    expect(levelPlan('en', 3.7).level).toBe(3)
    expect(levelPlan('en', Number.NaN).level).toBe(1)
    expect(levelPool('ru', 42)).toEqual(levelPool('ru', 20))
  })

  it('uses the same card counts in every language', () => {
    for (const level of LEVELS) {
      expect(levelPlan('de', level).count).toBe(levelPlan('ru', level).count)
      expect(levelPlan('en', level).count).toBe(levelPlan('ru', level).count)
    }
  })
})

describe('level pools', () => {
  it.each(LANGS)('gives every %s level a roomy pool of clean uppercase cards', (lang) => {
    for (const level of LEVELS) {
      const pool = levelPool(lang, level)
      const { kind, count } = levelPlan(lang, level)
      expect(pool.length).toBeGreaterThan(count)
      expect(new Set(pool).size).toBe(pool.length)
      for (const item of pool) {
        expect(item).toBe(upper(lang, item))
        expect(item).toMatch(/^\p{Lu}+$/u)
        const length = Array.from(item).length
        if (kind === 'letter') expect(length).toBe(1)
        if (kind === 'syllable') expect(length).toBeGreaterThanOrEqual(2)
        if (kind === 'syllable') expect(length).toBeLessThanOrEqual(3)
        if (kind === 'word') expect(length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('never shows Ь or Ъ alone', () => {
    for (const level of LEVELS) {
      for (const item of levelPool('ru', level)) {
        expect(['Ь', 'Ъ']).not.toContain(item)
        expect(item).not.toMatch(/^[ЬЪ]/)
      }
    }
    expect(knownItems('ru', 'letter')).not.toContain('Ь')
    expect(knownItems('ru', 'letter')).not.toContain('Ъ')
  })

  it('knows every letter of each alphabet', () => {
    expect(knownItems('ru', 'letter')).toHaveLength(31)
    expect(knownItems('de', 'letter')).toHaveLength(29)
    expect(knownItems('en', 'letter')).toHaveLength(26)
    expect(knownItems('de', 'letter')).toEqual(expect.arrayContaining(['Ä', 'Ö', 'Ü', 'Y', 'Q']))
  })

  it.each(LANGS)('lists every %s card of a kind in knownItems', (lang) => {
    for (const level of LEVELS) {
      const known = knownItems(lang, expectedKind(level))
      for (const item of levelPool(lang, level)) expect(known).toContain(item)
    }
    const all = [...knownItems(lang, 'letter'), ...knownItems(lang, 'syllable'), ...knownItems(lang, 'word')]
    expect(all.length).toBeGreaterThan(80)
  })

  it('starts with the vowels and ends with the big hospital words', () => {
    expect([...levelPool('ru', 1)].sort()).toEqual(['А', 'И', 'О', 'У', 'Э'].sort())
    expect(levelPool('ru', 20)).toContain('БОЛЬНИЦА')
    expect(levelPool('de', 20)).toContain('KRANKENHAUS')
    expect(levelPool('en', 20)).toContain('HOSPITAL')
    expect(levelPool('de', 2)).toEqual(expect.arrayContaining(['Ä', 'Ö', 'Ü']))
  })
})

describe('cards for one patient', () => {
  it.each(LANGS)('deals the planned number of distinct %s cards from the pool', (lang) => {
    for (const level of LEVELS) {
      const { count } = levelPlan(lang, level)
      const pool = levelPool(lang, level)
      for (const seed of SEEDS) {
        const items = itemsFor(lang, level, seed)
        expect(items).toHaveLength(count)
        expect(new Set(items).size).toBe(count)
        for (const item of items) expect(pool).toContain(item)
      }
    }
  })

  it('is deterministic for the same language, level and seed', () => {
    for (const lang of LANGS) {
      for (const level of LEVELS) {
        expect(itemsFor(lang, level, 12345)).toEqual(itemsFor(lang, level, 12345))
        expect(itemsFor(lang, level, -7)).toEqual(itemsFor(lang, level, -7))
      }
    }
  })

  it.each(LANGS)('varies the %s cards across seeds', (lang) => {
    for (const level of LEVELS) {
      const sets = new Set(SEEDS.map((seed) => [...itemsFor(lang, level, seed)].sort().join(' ')))
      const orders = new Set(SEEDS.map((seed) => itemsFor(lang, level, seed).join(' ')))
      expect(sets.size).toBeGreaterThan(3)
      expect(orders.size).toBeGreaterThan(sets.size - 1)
      const seen = new Set(SEEDS.flatMap((seed) => itemsFor(lang, level, seed)))
      expect(seen.size).toBeGreaterThanOrEqual(Math.min(levelPool(lang, level).length, levelPlan(lang, level).count + 2))
    }
  })

  it('mostly deals the level’s new cards', () => {
    const newVowels = ['Ы', 'Е', 'Ё', 'Ю', 'Я']
    for (const seed of SEEDS) {
      const fresh = itemsFor('ru', 2, seed).filter((item) => newVowels.includes(item))
      expect(fresh.length).toBeGreaterThanOrEqual(3)
      const hushing = itemsFor('ru', 7, seed).filter((item) => ['Ц', 'Ч', 'Щ'].includes(item))
      expect(hushing).toHaveLength(3)
    }
  })

  it('accepts any seed', () => {
    for (const seed of [0, -1, 2 ** 31, 2 ** 53, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(itemsFor('de', 9, seed)).toHaveLength(levelPlan('de', 9).count)
    }
    expect(itemsFor('en', 5, 1.9)).toEqual(itemsFor('en', 5, 1))
  })
})

describe('spoken forms', () => {
  it.each(LANGS)('names every %s letter', (lang) => {
    for (const letter of knownItems(lang, 'letter')) {
      const name = spokenForm(lang, letter, 'letter')
      expect(name.trim().length).toBeGreaterThan(0)
    }
  })

  it('uses real letter names', () => {
    expect(spokenForm('ru', 'Б', 'letter')).toBe('бэ')
    expect(spokenForm('ru', 'Й', 'letter')).toBe('и краткое')
    expect(spokenForm('ru', 'Щ', 'letter')).toBe('ща')
    expect(spokenForm('ru', 'Л', 'letter')).toBe('эль')
    expect(spokenForm('de', 'B', 'letter')).toBe('Beh')
    expect(spokenForm('de', 'V', 'letter')).toBe('Fau')
    expect(spokenForm('de', 'Y', 'letter')).toBe('Ypsilon')
    expect(spokenForm('en', 'B', 'letter')).toBe('bee')
    expect(spokenForm('en', 'W', 'letter')).toBe('double-you')
    expect(spokenForm('en', 'Z', 'letter')).toBe('zed')
  })

  it('says syllables and words as they are written', () => {
    expect(spokenForm('ru', 'МА', 'syllable')).toBe('ма')
    expect(spokenForm('ru', 'ЛЁ', 'syllable')).toBe('лё')
    expect(spokenForm('ru', 'МЁД', 'word')).toBe('мёд')
    expect(spokenForm('ru', 'ЁЖИК', 'word')).toBe('ёжик')
    expect(spokenForm('de', 'MÜ', 'syllable')).toBe('mü')
    expect(spokenForm('de', 'HAUS', 'word')).toBe('Haus')
    expect(spokenForm('de', 'KÄTZCHEN', 'word')).toBe('Kätzchen')
    expect(spokenForm('de', 'ROT', 'word')).toBe('rot')
    expect(spokenForm('en', 'GO', 'syllable')).toBe('go')
    expect(spokenForm('en', 'HOSPITAL', 'word')).toBe('hospital')
  })

  it.each(LANGS)('has a spoken form for every %s syllable and word', (lang) => {
    for (const kind of ['syllable', 'word'] as const) {
      for (const item of knownItems(lang, kind)) expect(spokenForm(lang, item, kind).length).toBe(item.length)
    }
  })
})
