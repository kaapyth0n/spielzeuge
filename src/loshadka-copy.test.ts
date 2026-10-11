import { describe, expect, it } from 'vitest'
import { LANGS, type Lang } from './languages.ts'
import { GIFTS, ITEMS, PONY_NAMES, SIDES, findItem, type ItemKind } from './loshadka-items.ts'
import { LOSHADKA_COPY, WELCOME_CUES, pronounce, type LoshadkaCopy } from './loshadka-copy.ts'

const KINDS = Object.keys(ITEMS) as ItemKind[]

/** Every text a language can produce: plain strings, records and function results. */
function texts(copy: LoshadkaCopy, lang: Lang): string[] {
  const out: string[] = []
  for (const value of Object.values(copy)) {
    if (typeof value === 'string') out.push(value)
    else if (typeof value === 'object') out.push(...Object.values(value as Record<string, string>))
  }
  for (const count of [0, 1, 2, 3, 5, 11, 21, 22, 25, 111]) out.push(copy.stars(count), copy.starsAria(count))
  for (const name of PONY_NAMES) out.push(copy.hello(name[lang]), copy.iAm(name[lang]), copy.released(name[lang]), copy.isBack(name[lang]))
  for (let i = 0; i + 3 <= PONY_NAMES.length; i += 3) out.push(copy.nameOptions(PONY_NAMES.slice(i, i + 3).map((name) => name[lang])))
  for (const kind of KINDS) for (const item of ITEMS[kind]) out.push(copy.giftOpened(item.name[lang], kind))
  out.push(copy.ponyLabel([]), copy.ponyLabel(SIDES.map((side) => ITEMS[side][0].name[lang])))
  return out
}

describe('Лошадка copy', () => {
  it('has the same keys in every language', () => {
    const keys = (copy: LoshadkaCopy) =>
      Object.entries(copy)
        .flatMap(([key, value]) => (typeof value === 'object' ? Object.keys(value).map((sub) => `${key}.${sub}`) : [key]))
        .sort()
    for (const lang of LANGS) expect(keys(LOSHADKA_COPY[lang])).toEqual(keys(LOSHADKA_COPY.ru))
    for (const lang of LANGS) {
      expect(Object.keys(LOSHADKA_COPY[lang].sides).sort()).toEqual([...SIDES].sort())
      expect(Object.keys(LOSHADKA_COPY[lang].missing).sort()).toEqual([...SIDES].sort())
    }
  })

  it('never produces an empty or untrimmed text', () => {
    for (const lang of LANGS) {
      for (const text of texts(LOSHADKA_COPY[lang], lang)) {
        expect(text.trim().length).toBeGreaterThan(0)
        expect(text).toBe(text.trim())
        expect(text).not.toMatch(/undefined|null|NaN|\[object/)
      }
    }
  })

  it('keeps German and English free of Cyrillic and Russian free of Latin letters', () => {
    for (const lang of ['de', 'en'] as const) {
      for (const text of texts(LOSHADKA_COPY[lang], lang)) expect(text).not.toMatch(/[А-Яа-яЁё]/)
    }
    const latinAllowed = new Set([LOSHADKA_COPY.ru.documentTitle])
    for (const text of texts(LOSHADKA_COPY.ru, 'ru')) if (!latinAllowed.has(text)) expect(text).not.toMatch(/[A-Za-z]/)
  })

  it('keeps Matryona’s own explanation word for word', () => {
    expect(LOSHADKA_COPY.ru.welcome).toBe(
      'Давай сделаем лошадку! Слева — гривы, сверху — заколки, справа — хвосты, а снизу — цвет лошадки. Сделаешь лошадку — получишь три звёздочки!',
    )
    expect(LOSHADKA_COPY.ru.byline).toBe('Игра Матрёны')
    expect(LOSHADKA_COPY.ru.name).toBe('Лошадка')
    expect(LOSHADKA_COPY.de.name).toBe('Pferdchen')
    expect(LOSHADKA_COPY.en.name).toBe('Pony')
  })

  it('counts Russian stars with the right plural', () => {
    const { stars, starsAria } = LOSHADKA_COPY.ru
    const cases: [number, string][] = [
      [0, '0 звёздочек'],
      [1, '1 звёздочка'],
      [2, '2 звёздочки'],
      [3, '3 звёздочки'],
      [4, '4 звёздочки'],
      [5, '5 звёздочек'],
      [11, '11 звёздочек'],
      [12, '12 звёздочек'],
      [14, '14 звёздочек'],
      [20, '20 звёздочек'],
      [21, '21 звёздочка'],
      [22, '22 звёздочки'],
      [25, '25 звёздочек'],
      [101, '101 звёздочка'],
      [104, '104 звёздочки'],
      [111, '111 звёздочек'],
      [112, '112 звёздочек'],
      [121, '121 звёздочка'],
    ]
    for (const [count, text] of cases) {
      expect(stars(count)).toBe(text)
      expect(starsAria(count)).toBe(`У тебя ${text}`)
    }
  })

  it('reads the offered names as a question of choice', () => {
    expect(LOSHADKA_COPY.ru.nameOptions(['Облачко', 'Ириска', 'Конфетка'])).toBe('Облачко, Ириска или Конфетка?')
    expect(LOSHADKA_COPY.de.nameOptions(['Wolke', 'Karamell', 'Bonbon'])).toBe('Wolke, Karamell oder Bonbon?')
    expect(LOSHADKA_COPY.en.nameOptions(['Cloud', 'Toffee', 'Candy'])).toBe('Cloud, Toffee or Candy?')
    expect(LOSHADKA_COPY.en.nameOptions(['Cloud'])).toBe('Cloud?')
    for (const lang of LANGS) {
      expect(LOSHADKA_COPY[lang].isBack(PONY_NAMES[0][lang])).toContain(PONY_NAMES[0][lang])
      expect(LOSHADKA_COPY[lang].dressConfirm.length).toBeGreaterThan(20)
    }
  })

  it('times the welcome glows in the order the sides are named', () => {
    for (const lang of LANGS) {
      const cues = WELCOME_CUES[lang]
      expect(cues).toHaveLength(5)
      for (let i = 1; i < cues.length; i++) {
        // one glow per spoken phrase: neither a blur nor a long wait
        expect(cues[i] - cues[i - 1]).toBeGreaterThan(0.9)
        expect(cues[i] - cues[i - 1]).toBeLessThan(2.6)
      }
      // the line names the sides in that order
      const text = LOSHADKA_COPY[lang].welcome.toLowerCase()
      const words = { ru: ['слева', 'сверху', 'справа', 'снизу'], de: ['links', 'oben', 'rechts', 'unten'], en: ['manes', 'clips', 'tails', 'colour'] }[lang]
      const at = words.map((word) => text.indexOf(word))
      expect(at.every((i) => i > 0)).toBe(true)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
    }
  })

  it('counts German and English stars', () => {
    expect(LOSHADKA_COPY.de.stars(1)).toBe('1 Sternchen')
    expect(LOSHADKA_COPY.de.stars(2)).toBe('2 Sternchen')
    expect(LOSHADKA_COPY.de.starsAria(1)).toBe('Du hast 1 Sternchen')
    expect(LOSHADKA_COPY.en.stars(1)).toBe('1 star')
    expect(LOSHADKA_COPY.en.stars(2)).toBe('2 stars')
    expect(LOSHADKA_COPY.en.stars(0)).toBe('0 stars')
    expect(LOSHADKA_COPY.en.starsAria(1)).toBe('You have 1 star')
    expect(LOSHADKA_COPY.en.starsAria(12)).toBe('You have 12 stars')
  })

  it('builds the name, stable and pony lines', () => {
    expect(LOSHADKA_COPY.ru.hello('Искорка')).toBe('Привет, Искорка!')
    expect(LOSHADKA_COPY.de.hello('Fünkchen')).toBe('Hallo, Fünkchen!')
    expect(LOSHADKA_COPY.en.hello('Sparkle')).toBe('Hello, Sparkle!')
    expect(LOSHADKA_COPY.ru.iAm('Искорка')).toBe('И-го-го! Я Искорка!')
    expect(LOSHADKA_COPY.de.iAm('Fünkchen')).toBe('Wieher! Ich bin Fünkchen!')
    expect(LOSHADKA_COPY.en.iAm('Sparkle')).toBe('Neigh! I’m Sparkle!')
    for (const lang of LANGS) {
      const copy = LOSHADKA_COPY[lang]
      for (const name of PONY_NAMES) {
        expect(copy.hello(name[lang])).toContain(name[lang])
        expect(copy.iAm(name[lang])).toContain(name[lang])
        expect(copy.released(name[lang])).toContain(name[lang])
      }
    }
    expect(LOSHADKA_COPY.ru.ponyLabel(['Рыжая лошадка', 'Розовая грива с цветочками', 'Клубничка'])).toBe(
      'Лошадка: рыжая лошадка, розовая грива с цветочками, клубничка',
    )
    expect(LOSHADKA_COPY.de.ponyLabel(['Oranges Pferdchen', 'Erdbeerspange'])).toBe('Pferdchen: Oranges Pferdchen, Erdbeerspange')
    expect(LOSHADKA_COPY.en.ponyLabel(['Orange pony', 'Strawberry clip'])).toBe('Pony: orange pony, strawberry clip')
    for (const lang of LANGS) expect(LOSHADKA_COPY[lang].ponyLabel([])).toBe(LOSHADKA_COPY[lang].name)
  })

  it('does not gender the child in Russian', () => {
    // Past tense would need «сделал/сделала»; names of ponies are of every gender
    // too (Лучик, Солнышко), so no line built around a name uses the past tense.
    for (const text of texts(LOSHADKA_COPY.ru, 'ru')) {
      expect(text).not.toMatch(/(?<![а-яё])(сделал|нарядил|выбрал|открыл|нажал|получил|убежал|пришёл|пришла)[аи]?(?![а-яё])/iu)
    }
  })

  it('says where every gift went, with no pronoun to agree with the item', () => {
    const where: Record<Lang, Record<ItemKind, RegExp>> = {
      ru: { mane: /слева/, clip: /сверху/, tail: /справа/, color: /снизу/, magic: /сверху/, background: /кружок/ },
      de: { mane: /links/, clip: /oben/, tail: /rechts/, color: /unten/, magic: /oben/, background: /Knopf/ },
      en: { mane: /left/, clip: /top/, tail: /right/, color: /bottom/, magic: /top/, background: /button/ },
    }
    const pronouns: Record<Lang, RegExp> = {
      ru: /(?<![а-яё])(он|она|оно|они|его|её|их|ему|ей|им)(?![а-яё])/iu,
      de: /\b(er|sie|es|ihn|ihm|ihr|ihnen)\b/i,
      en: /\b(it|its|he|she|him|her|they|them)\b/i,
    }
    for (const lang of LANGS) {
      for (const gift of GIFTS) {
        const item = findItem(gift.kind, gift.id)
        expect(item, `${gift.kind}:${gift.id}`).toBeDefined()
        const line = LOSHADKA_COPY[lang].giftOpened(item!.name[lang], gift.kind)
        expect(line.startsWith(item!.name[lang]) || line.includes(`${item!.name[lang]}!`)).toBe(true)
        expect(line).toMatch(where[lang][gift.kind])
        expect(line.replace(item!.name[lang], '')).not.toMatch(pronouns[lang])
      }
    }
    expect(LOSHADKA_COPY.ru.giftOpened('Рог единорога', 'magic')).toBe('Рог единорога! Смотри сверху, в самом конце.')
    expect(LOSHADKA_COPY.de.giftOpened('Krone', 'clip')).toBe('Neu: Krone! Schau mal oben.')
    expect(LOSHADKA_COPY.en.giftOpened('Rainbow mane', 'mane')).toBe('New: Rainbow mane! Look on the left.')
  })

  it('has a name in every language for every item and pony name', () => {
    for (const kind of KINDS) {
      for (const item of ITEMS[kind]) for (const lang of LANGS) expect(item.name[lang].trim(), `${kind}:${item.id}:${lang}`).not.toBe('')
    }
    for (const name of PONY_NAMES) for (const lang of LANGS) expect(name[lang].trim()).not.toBe('')
  })

  it('has no typographic quotes the voice would read aloud', () => {
    for (const lang of LANGS) {
      for (const text of texts(LOSHADKA_COPY[lang], lang)) expect(text).not.toMatch(/[«»„“”‚‘]/)
    }
  })

  it('writes ё wherever Russian needs it (the voice reads е and ё differently)', () => {
    const missingYo = /(?<![а-яё])(еще|все готово|звезд(?:очк|н)[а-я]*|зелен[а-я]*|желт[а-я]*|черн(?:ая|ый|ое|ые|ую|ой|ого|ым)|ее|нее|принесет|найдется)(?![а-яё])/iu
    const all = [...texts(LOSHADKA_COPY.ru, 'ru'), ...KINDS.flatMap((kind) => ITEMS[kind].map((item) => item.name.ru)), ...PONY_NAMES.map((name) => name.ru)]
    for (const text of all) expect(text).not.toMatch(missingYo)
  })

  it('respells only the words the Russian voice stresses wrongly', () => {
    expect(pronounce('Привет, Жемчужинка!', 'ru')).toBe('Привет, Жемчужин-ка!')
    expect(pronounce('И-го-го! Я Жемчужинка!', 'ru')).toBe('И-го-го! Я Жемчужин-ка!')
    expect(pronounce('жемчужинки', 'ru')).toBe('жемчужин-ки')
    expect(pronounce('жемчужинку', 'ru')).toBe('жемчужин ку')
    expect(pronounce('Замок! Нажми на кружок с картинкой.', 'ru')).toBe('Зам-ок! Нажми на кружок с картинкой.')
    expect(pronounce('замок', 'ru')).toBe('зам-ок')
    for (const word of ['Жемчужина', 'замочек', 'Замки', 'зазамок', 'Снежинка', 'Звёздочка', 'Искорка']) expect(pronounce(word, 'ru')).toBe(word)
  })

  it('leaves German and English untouched and keeps the screen text as written', () => {
    for (const lang of ['de', 'en'] as const) {
      for (const text of texts(LOSHADKA_COPY[lang], lang)) expect(pronounce(text, lang)).toBe(text)
      expect(pronounce('Жемчужинка, Замок', lang)).toBe('Жемчужинка, Замок')
    }
    for (const text of texts(LOSHADKA_COPY.ru, 'ru')) expect(text).not.toMatch(/Жемчужин-|Зам-ок/)
  })
})
