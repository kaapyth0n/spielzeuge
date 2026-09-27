import { describe, expect, it } from 'vitest'
import { LANGS, type Lang } from './languages.ts'
import { knownItems, spokenForm, type ItemKind } from './bolnica-words.ts'
import { judge, normalizeTranscript, type Verdict } from './bolnica-match.ts'

type Case = [lang: Lang, target: string, kind: ItemKind, heard: string[], verdict: Verdict, other?: string | null]
/** Heard something, but not an answer: asked again without losing a heart, showing what was heard. */
type AskAgain = [lang: Lang, target: string, kind: ItemKind, heard: string, why: string]

/** Cards that share a sound key on purpose (ё after a consonant sounds like о). */
const TWINS = new Set(['ru:ЛЁ:ЛО', 'ru:ЛО:ЛЁ'])
/** Card pairs the recognizer mixes up by habit: asked again rather than wrong (е written for ё). */
const ASK_AGAIN_PAIRS = new Set(['ru:Ё:Е'])

const RU_LETTERS: Case[] = [
  ['ru', 'А', 'letter', ['а'], 'correct'],
  ['ru', 'А', 'letter', ['Ааа!'], 'correct'],
  ['ru', 'А', 'letter', ['а-а-а'], 'correct'],
  ['ru', 'А', 'letter', ['A'], 'correct'],
  ['ru', 'О', 'letter', ['это о'], 'correct'],
  ['ru', 'О', 'letter', ['Оооо'], 'correct'],
  ['ru', 'Б', 'letter', ['бэ'], 'correct'],
  ['ru', 'Б', 'letter', ['Буква бэ.'], 'correct'],
  ['ru', 'Б', 'letter', ['б б'], 'correct'],
  ['ru', 'Б', 'letter', ['B'], 'correct'],
  ['ru', 'Б', 'letter', ['бы'], 'correct'],
  ['ru', 'Б', 'letter', ['пэ'], 'wrong', 'П'],
  ['ru', 'Б', 'letter', ['дэ'], 'wrong', 'Д'],
  ['ru', 'Б', 'letter', ['дэ', 'бэ'], 'correct'],
  ['ru', 'Б', 'letter', ['э бэ'], 'correct'],
  ['ru', 'Б', 'letter', ['это буква бэ'], 'correct'],
  ['ru', 'Б', 'letter', ['мама смотри б'], 'correct'],
  ['ru', 'Б', 'letter', ['пэ бэ'], 'correct'],
  ['ru', 'А', 'letter', ['буква а'], 'correct'],
  ['ru', 'Я', 'letter', ['это я'], 'correct'],
  ['ru', 'Л', 'letter', ['ель'], 'correct'],
  ['ru', 'К', 'letter', ['как'], 'correct'],
  ['ru', 'К', 'letter', ['буква как'], 'correct'],
  ['ru', 'К', 'letter', ['ка'], 'correct'],
  ['ru', 'Л', 'letter', ['как'], 'wrong', 'К'],
  ['ru', 'Л', 'letter', ['эль'], 'correct'],
  ['ru', 'Л', 'letter', ['эл'], 'correct'],
  ['ru', 'М', 'letter', ['эм'], 'correct'],
  ['ru', 'М', 'letter', ['мэ'], 'correct'],
  ['ru', 'М', 'letter', ['ммм'], 'correct'],
  ['ru', 'М', 'letter', ['эн'], 'wrong', 'Н'],
  ['ru', 'И', 'letter', ['ы'], 'wrong', 'Ы'],
  ['ru', 'Ы', 'letter', ['и'], 'wrong', 'И'],
  ['ru', 'Ы', 'letter', ['и', 'ы'], 'correct'],
  ['ru', 'Е', 'letter', ['э'], 'wrong', 'Э'],
  ['ru', 'Э', 'letter', ['е'], 'wrong', 'Е'],
  ['ru', 'Э', 'letter', ['э'], 'correct'],
  ['ru', 'Ё', 'letter', ['йо'], 'correct'],
  ['ru', 'Ё', 'letter', ['Yo!'], 'correct'],
  ['ru', 'Ё', 'letter', ['о'], 'wrong', 'О'],
  ['ru', 'Й', 'letter', ['и краткое'], 'correct'],
  ['ru', 'И', 'letter', ['и краткое'], 'wrong', 'Й'],
  ['ru', 'Щ', 'letter', ['ща'], 'correct'],
  ['ru', 'Щ', 'letter', ['ша'], 'wrong', 'Ш'],
  ['ru', 'Ш', 'letter', ['ща'], 'wrong', 'Щ'],
  ['ru', 'Ш', 'letter', ['ши'], 'correct'],
  ['ru', 'Ж', 'letter', ['жэ'], 'correct'],
  ['ru', 'Х', 'letter', ['ха-ха'], 'correct'],
  ['ru', 'Ю', 'letter', ['you'], 'correct'],
  ['ru', 'С', 'letter', ['эс'], 'correct'],
  ['ru', 'С', 'letter', ['c'], 'correct'],
  ['ru', 'З', 'letter', ['эс'], 'wrong', 'С'],
  ['ru', 'А', 'letter', [''], 'unclear'],
  ['ru', 'А', 'letter', ['   ', '?!', '…'], 'unclear'],
  ['ru', 'А', 'letter', [], 'unclear'],
  ['ru', 'Б', 'letter', ['ну'], 'unclear'],
  ['ru', 'Б', 'letter', ['буква'], 'unclear'],
]

const RU_SYLLABLES: Case[] = [
  ['ru', 'МА', 'syllable', ['ма'], 'correct'],
  ['ru', 'МА', 'syllable', ['мама'], 'correct'],
  ['ru', 'МА', 'syllable', ['Ма-ма!'], 'correct'],
  ['ru', 'МА', 'syllable', ['мак'], 'correct'],
  ['ru', 'МА', 'syllable', ['ma'], 'correct'],
  ['ru', 'МА', 'syllable', ['м а'], 'correct'],
  ['ru', 'МА', 'syllable', ['мааа'], 'correct'],
  ['ru', 'МА', 'syllable', ['мо'], 'wrong', 'МО'],
  ['ru', 'МА', 'syllable', ['ну'], 'unclear'],
  ['ru', 'НО', 'syllable', ['ноу'], 'correct'],
  ['ru', 'НО', 'syllable', ['no'], 'correct'],
  ['ru', 'НУ', 'syllable', ['ну'], 'correct'],
  ['ru', 'ЖУ', 'syllable', ['жук'], 'correct'],
  ['ru', 'ПЕ', 'syllable', ['пэ'], 'correct'],
  ['ru', 'ЛЁ', 'syllable', ['ло'], 'correct'],
  ['ru', 'ЛЁ', 'syllable', ['ле'], 'correct'],
  ['ru', 'ЛУ', 'syllable', ['лё'], 'wrong', 'ЛЁ'],
  ['ru', 'НЯ', 'syllable', ['на'], 'wrong', 'НА'],
  ['ru', 'ОК', 'syllable', ['Окей'], 'correct'],
  ['ru', 'ДО', 'syllable', ['то'], 'wrong', 'ТО'],
  ['ru', 'ША', 'syllable', ['слог ша'], 'correct'],
  ['ru', 'ЛИ', 'syllable', ['лы'], 'wrong', null],
]

const RU_WORDS: Case[] = [
  ['ru', 'КОТ', 'word', ['Кот!'], 'correct'],
  ['ru', 'КОТ', 'word', ['котик'], 'wrong', null],
  ['ru', 'КОТ', 'word', ['к о т'], 'correct'],
  ['ru', 'МЁД', 'word', ['мед'], 'correct'],
  ['ru', 'ЁЖИК', 'word', ['Ежик'], 'correct'],
  ['ru', 'МАШИНА', 'word', ['ма-ши-на'], 'correct'],
  ['ru', 'МАШИНА', 'word', ['машину'], 'correct'],
  ['ru', 'ЛАПКА', 'word', ['лапа'], 'wrong', 'ЛАПА'],
  ['ru', 'ЛАПА', 'word', ['лапка'], 'wrong', 'ЛАПКА'],
  ['ru', 'ЛИСА', 'word', ['это лиса'], 'correct'],
  ['ru', 'ПАНДА', 'word', ['panda'], 'correct'],
  ['ru', 'ЛЕКАРСТВО', 'word', ['лекарства'], 'correct'],
  ['ru', 'КОШЕЧКА', 'word', ['кошечки'], 'correct'],
  ['ru', 'ДОМ', 'word', ['дым'], 'wrong', null],
  ['ru', 'МАМА', 'word', ['папа'], 'wrong', 'ПАПА'],
  ['ru', 'РЫБА', 'word', ['рыбу', 'рыба'], 'correct'],
  ['ru', 'СОН', 'word', ['сок'], 'wrong', 'СОК'],
  ['ru', 'БОЛЬНИЦА', 'word', ['Больница.'], 'correct'],
  ['ru', 'КОЗА', 'word', ['коса'], 'wrong', null],
  ['ru', 'КОЗА', 'word', ['козы'], 'correct'],
  ['ru', 'УКОЛ', 'word', ['угол'], 'wrong', null],
  ['ru', 'ВРАЧ', 'word', ['враг'], 'wrong', null],
  ['ru', 'КОШЕЧКА', 'word', ['кошка'], 'wrong', null],
  ['ru', 'ЛИСА', 'word', ['лис'], 'correct'],
  ['ru', 'КОТ', 'word', ['это слово кот'], 'correct'],
  ['ru', 'КОТ', 'word', ['код'], 'correct'],
  ['ru', 'ЛУК', 'word', ['луг'], 'correct'],
  ['ru', 'ЛЕС', 'word', ['лез'], 'correct'],
  ['ru', 'МАШИНА', 'word', ['маши на'], 'correct'],
]

const DE_CASES: Case[] = [
  ['de', 'B', 'letter', ['Beh'], 'correct'],
  ['de', 'B', 'letter', ['be'], 'correct'],
  ['de', 'B', 'letter', ['Peh'], 'wrong', 'P'],
  ['de', 'P', 'letter', ['be'], 'wrong', 'B'],
  ['de', 'D', 'letter', ['Tee'], 'wrong', 'T'],
  ['de', 'V', 'letter', ['Fau'], 'correct'],
  ['de', 'W', 'letter', ['weh'], 'correct'],
  ['de', 'Y', 'letter', ['Ypsilon'], 'correct'],
  ['de', 'Z', 'letter', ['Zett'], 'correct'],
  ['de', 'C', 'letter', ['Zeh'], 'correct'],
  ['de', 'Ä', 'letter', ['ae'], 'correct'],
  ['de', 'Ä', 'letter', ['A Umlaut'], 'correct'],
  ['de', 'Ö', 'letter', ['o'], 'wrong', 'O'],
  ['de', 'Q', 'letter', ['Kuh'], 'correct'],
  ['de', 'J', 'letter', ['Jott'], 'correct'],
  ['de', 'S', 'letter', ['der Buchstabe S'], 'correct'],
  ['de', 'B', 'letter', ['Buchstabe B'], 'correct'],
  ['de', 'B', 'letter', ['B wie Ball'], 'correct'],
  ['de', 'E', 'letter', ['äh'], 'wrong', 'Ä'],
  ['de', 'E', 'letter', ['ähm Eh'], 'correct'],
  ['de', 'K', 'letter', ['ha'], 'wrong', 'H'],
  ['de', 'X', 'letter', ['ix'], 'correct'],
  ['de', 'MA', 'syllable', ['Mama'], 'correct'],
  ['de', 'MA', 'syllable', ['mal'], 'correct'],
  ['de', 'MA', 'syllable', ['mau'], 'wrong', 'MAU'],
  ['de', 'MU', 'syllable', ['muh'], 'correct'],
  ['de', 'DA', 'syllable', ['das'], 'correct'],
  ['de', 'MO', 'syllable', ['das'], 'unclear'],
  ['de', 'EI', 'syllable', ['Ei'], 'correct'],
  ['de', 'EI', 'syllable', ['ein'], 'correct'],
  ['de', 'MÜ', 'syllable', ['mue'], 'correct'],
  ['de', 'BÄ', 'syllable', ['Bär'], 'correct'],
  ['de', 'KÜ', 'syllable', ['Kuh'], 'wrong', 'KU'],
  ['de', 'SI', 'syllable', ['Sie'], 'correct'],
  ['de', 'FO', 'syllable', ['vor'], 'correct'],
  ['de', 'IN', 'syllable', ['im'], 'wrong', 'IM'],
  ['de', 'HAUS', 'word', ['Haus'], 'correct'],
  ['de', 'HAUS', 'word', ['Maus'], 'wrong', 'MAUS'],
  ['de', 'LÖWE', 'word', ['Loewe'], 'correct'],
  ['de', 'KÄTZCHEN', 'word', ['Kaetzchen'], 'correct'],
  ['de', 'KRANKENHAUS', 'word', ['Kranken Haus'], 'correct'],
  ['de', 'KATZE', 'word', ['die Katzen'], 'correct'],
  ['de', 'GESUND', 'word', ['gesunde'], 'correct'],
  ['de', 'HUT', 'word', ['gut'], 'wrong', null],
  ['de', 'ZOO', 'word', ['Zoo.'], 'correct'],
  ['de', 'MOND', 'word', ['Mund'], 'wrong', null],
  ['de', 'KAROTTE', 'word', ['Karotten'], 'correct'],
  ['de', 'IN', 'syllable', ['ihn'], 'correct'],
]

const EN_CASES: Case[] = [
  ['en', 'B', 'letter', ['bee'], 'correct'],
  ['en', 'B', 'letter', ['Be.'], 'correct'],
  ['en', 'B', 'letter', ['pee'], 'wrong', 'P'],
  ['en', 'P', 'letter', ['pea'], 'correct'],
  ['en', 'C', 'letter', ['see'], 'correct'],
  ['en', 'C', 'letter', ['sea'], 'correct'],
  ['en', 'I', 'letter', ['eye'], 'correct'],
  ['en', 'I', 'letter', ['I'], 'correct'],
  ['en', 'O', 'letter', ['oh'], 'correct'],
  ['en', 'Q', 'letter', ['queue'], 'correct'],
  ['en', 'R', 'letter', ['are'], 'correct'],
  ['en', 'T', 'letter', ['tea'], 'correct'],
  ['en', 'U', 'letter', ['you'], 'correct'],
  ['en', 'Y', 'letter', ['Why?'], 'correct'],
  ['en', 'Z', 'letter', ['zed'], 'correct'],
  ['en', 'Z', 'letter', ['zee'], 'correct'],
  ['en', 'W', 'letter', ['double you'], 'correct'],
  ['en', 'W', 'letter', ['double-u'], 'correct'],
  ['en', 'M', 'letter', ['n'], 'wrong', 'N'],
  ['en', 'A', 'letter', ["it's a b"], 'wrong', 'B'],
  ['en', 'A', 'letter', ['a'], 'correct'],
  ['en', 'A', 'letter', ["it's a"], 'correct'],
  ['en', 'I', 'letter', ["I think it's d"], 'wrong', 'D'],
  ['en', 'B', 'letter', ['the letter b'], 'correct'],
  ['en', 'B', 'letter', ['b for ball'], 'correct'],
  ['en', 'A', 'letter', ['a is for apple'], 'correct'],
  ['en', 'D', 'letter', ['b for ball'], 'wrong', 'B'],
  ['en', 'B', 'letter', ['um'], 'unclear'],
  ['en', 'G', 'letter', ['jay'], 'wrong', 'J'],
  ['en', 'J', 'letter', ['gee'], 'wrong', 'G'],
  ['en', 'NO', 'syllable', ['know'], 'correct'],
  ['en', 'HI', 'syllable', ['high'], 'correct'],
  ['en', 'SO', 'syllable', ['sew'], 'correct'],
  ['en', 'WE', 'syllable', ['wee'], 'correct'],
  ['en', 'TO', 'syllable', ['two'], 'correct'],
  ['en', 'TO', 'syllable', ['2'], 'correct'],
  ['en', 'AN', 'syllable', ['and'], 'correct'],
  ['en', 'GO', 'syllable', ['no'], 'wrong', 'NO'],
  ['en', 'GO', 'syllable', ['go go'], 'correct'],
  ['en', 'IT', 'syllable', ['it'], 'correct'],
  ['en', 'AT', 'syllable', ['it'], 'wrong', 'IT'],
  ['en', 'ME', 'syllable', ['my'], 'wrong', 'MY'],
  ['en', 'OR', 'syllable', ['awe'], 'correct'],
  ['en', 'SEE', 'syllable', ['c'], 'correct'],
  ['en', 'TOE', 'syllable', ['to'], 'wrong', 'TO'],
  ['en', 'CAT', 'word', ['a cat'], 'correct'],
  ['en', 'CAT', 'word', ['hat'], 'wrong', 'HAT'],
  ['en', 'SUN', 'word', ['son'], 'correct'],
  ['en', 'TEA', 'word', ['tee'], 'correct'],
  ['en', 'FROG', 'word', ['frogs'], 'correct'],
  ['en', 'HOSPITAL', 'word', ['the hospital'], 'correct'],
  ['en', 'KITTEN', 'word', ['mitten'], 'wrong', null],
  ['en', 'PILL', 'word', ['pillow'], 'wrong', 'PILLOW'],
  ['en', 'HORSE', 'word', ['hoarse'], 'correct'],
  ['en', 'FROG', 'word', ['from'], 'wrong', null],
  ['en', 'BELL', 'word', ['ball'], 'wrong', null],
  ['en', 'AT', 'syllable', ['that'], 'unclear'],
  ['en', 'PILLOW', 'word', ['pill'], 'wrong', 'PILL'],
]

const ASKED_AGAIN: AskAgain[] = [
  ['ru', 'Я', 'letter', 'я не знаю', 'card inside talk, no letter at the end'],
  ['ru', 'А', 'letter', 'а что это', 'card inside talk, no letter at the end'],
  ['ru', 'ТА', 'syllable', 'что там написано', 'card inside talk, no card at the end'],
  ['ru', 'НА', 'syllable', 'посмотри на карточку', 'card inside talk, no card at the end'],
  ['ru', 'МАМА', 'word', 'мама иди сюда', 'card inside talk, no card at the end'],
  ['ru', 'Б', 'letter', 'бэ пэ', 'card said, then another letter'],
  ['ru', 'Б', 'letter', 'бабушка', 'words but no letter'],
  ['ru', 'А', 'letter', 'я не знаю', 'words but no letter at the end'],
  ['ru', 'К', 'letter', 'я не знаю как', '“как” is К only on its own'],
  ['en', 'M', 'letter', 'hello', 'words but no letter'],
  ['ru', 'Ё', 'letter', 'е', 'recognizers write е for ё'],
  ['ru', 'Ё', 'letter', 'буква е', 'recognizers write е for ё'],
  ['ru', 'МАШИНА', 'word', 'маши', 'cut short at a pause'],
  ['ru', 'МАШИНА', 'word', 'ма ши', 'cut short at a pause'],
  ['de', 'KRANKENHAUS', 'word', 'Kranken', 'cut short at a pause'],
  ['en', 'KITTEN', 'word', 'kit', 'cut short at a pause'],
]

const ALL_CASES = [...RU_LETTERS, ...RU_SYLLABLES, ...RU_WORDS, ...DE_CASES, ...EN_CASES]

describe('judging what the child read', () => {
  it('has plenty of realistic cases', () => {
    expect(ALL_CASES.length).toBeGreaterThanOrEqual(60)
  })

  it.each(ALL_CASES)('%s %s (%s) heard %j → %s', (lang, target, kind, heard, verdict, other) => {
    const result = judge(lang, target, kind, heard)
    expect(result.verdict).toBe(verdict)
    if (verdict === 'correct') expect(result.other).toBeNull()
    if (verdict === 'unclear') expect(result).toEqual({ verdict: 'unclear', heard: '', other: null })
    if (verdict === 'wrong') {
      expect(result.heard.length).toBeGreaterThan(0)
      if (other !== undefined) expect(result.other).toBe(other)
    }
  })

  it.each(ASKED_AGAIN)('%s %s (%s) heard %j → unclear: %s', (lang, target, kind, heard) => {
    expect(judge(lang, target, kind, [heard])).toEqual({ verdict: 'unclear', heard: normalizeTranscript(lang, heard), other: null })
  })

  it('asks again rather than take a heart when an alternative holds the card', () => {
    expect(judge('ru', 'НА', 'syllable', ['мо', 'посмотри на карточку'])).toEqual({ verdict: 'unclear', heard: 'посмотри на карточку', other: null })
    expect(judge('ru', 'Б', 'letter', ['бабушка', 'пэ'])).toEqual({ verdict: 'wrong', heard: 'пэ', other: 'П' })
  })

  it('shows what it heard, tidied', () => {
    expect(judge('ru', 'Б', 'letter', ['Пэ!']).heard).toBe('пэ')
    expect(judge('ru', 'КОТ', 'word', ['«Ёжик»']).heard).toBe('ёжик')
    expect(judge('de', 'B', 'letter', ['', 'Peh.']).heard).toBe('peh')
    const long = judge('ru', 'КОТ', 'word', ['Это очень-очень длинная фраза, которую сказал ребёнок'])
    expect(long.verdict).toBe('wrong')
    expect(long.heard.length).toBeLessThanOrEqual(24)
    expect(long.heard.endsWith('…')).toBe(true)
  })

  it('lets any alternative win, even a late one', () => {
    expect(judge('en', 'B', 'letter', ['pee', 'tea', 'dee', 'be']).verdict).toBe('correct')
    expect(judge('ru', 'Ы', 'letter', ['и', 'и', 'ы']).verdict).toBe('correct')
  })

  it('names the other card from the best usable alternative', () => {
    expect(judge('ru', 'Б', 'letter', ['ну', 'дэ', 'пэ'])).toEqual({ verdict: 'wrong', heard: 'дэ', other: 'Д' })
    expect(judge('en', 'M', 'letter', ['um', 'hello', 'en'])).toEqual({ verdict: 'wrong', heard: 'en', other: 'N' })
    expect(judge('ru', 'КОТ', 'word', ['ну', 'котик'])).toEqual({ verdict: 'wrong', heard: 'котик', other: null })
  })

  it('accepts lowercase or padded card names', () => {
    expect(judge('ru', ' ма ', 'syllable', ['мама']).verdict).toBe('correct')
    expect(judge('de', 'ä', 'letter', ['ä']).verdict).toBe('correct')
  })
})

describe('every card, both ways', () => {
  for (const lang of LANGS) {
    for (const kind of ['letter', 'syllable', 'word'] as const) {
      it(`${lang} ${kind}s: own name and spelling count, other cards never do`, () => {
        const items = knownItems(lang, kind)
        for (const target of items) {
          for (const said of [target, target.toLowerCase(), spokenForm(lang, target, kind)]) {
            expect(judge(lang, target, kind, [said]).verdict, `${target} ← ${said}`).toBe('correct')
          }
          for (const other of items) {
            if (other === target || TWINS.has(`${lang}:${target}:${other}`)) continue
            const said = spokenForm(lang, other, kind)
            if (said === 'ну') continue // a bare “ну” is a pause, judged unclear
            const result = judge(lang, target, kind, [said])
            if (ASK_AGAIN_PAIRS.has(`${lang}:${target}:${other}`)) {
              expect(result.verdict, `${target} ← ${said}`).toBe('unclear')
              continue
            }
            expect(result.verdict, `${target} ← ${said}`).toBe('wrong')
            expect(result.other, `${target} ← ${said}`).toBe(other)
          }
        }
      })
    }
  }
})

describe('normalizeTranscript', () => {
  it('lowercases, strips punctuation and keeps inner hyphens', () => {
    expect(normalizeTranscript('ru', '  «Ма-ма!»  ')).toBe('ма-ма')
    expect(normalizeTranscript('ru', '- а -')).toBe('а')
    expect(normalizeTranscript('de', 'Straße, bitte.')).toBe('straße bitte')
    expect(normalizeTranscript('en', 'It’s a  B.')).toBe("it's a b")
    expect(normalizeTranscript('en', '???')).toBe('')
  })

  it('keeps ё and umlauts for display', () => {
    expect(normalizeTranscript('ru', 'Ёжик')).toBe('ёжик')
    expect(normalizeTranscript('de', 'LÖWE')).toBe('löwe')
  })

  it('repairs Latin look-alikes inside Russian words', () => {
    expect(normalizeTranscript('ru', 'кoт')).toBe('кот')
    expect(normalizeTranscript('ru', 'ok')).toBe('ok')
  })

  it('composes decomposed letters', () => {
    expect(normalizeTranscript('ru', 'й')).toBe('й')
    expect(normalizeTranscript('de', 'Müll')).toBe('müll')
  })
})
