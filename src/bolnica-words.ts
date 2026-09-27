/**
 * Reading curriculum for Больница кошечки (Kitty’s Hospital).
 *
 * One level is one patient. The child heals the patient by reading its cards
 * aloud: letters in levels 1–8, syllables in 9–14, whole words in 15–20.
 * After level 20 the game starts again at level 1 with a new seed.
 *
 * Cards are uppercase block letters, the way Veronika drew them. Ь and Ъ are
 * never shown alone (they are fine inside words). Every card is something a
 * child can say and a speech recognizer can write down: syllables lean on
 * real words (German “du”, English “go”), so the recognizer has a chance.
 */
import { SPEECH_LOCALE, type Lang } from './languages.ts'

export type ItemKind = 'letter' | 'syllable' | 'word'

export const LEVEL_COUNT = 20

export interface LevelPlan {
  level: number
  kind: ItemKind
  count: number
  /** Short internal English tag, e.g. 'vowels' or 'animals'. */
  theme: string
}

interface LevelSpec {
  theme: string
  /** The level’s new cards: most of a patient’s cards come from here. */
  fresh: readonly string[]
  /** Earlier cards, mixed in for practice. */
  review?: readonly string[]
}

/** Cards per patient, by level. The same in every language. */
const COUNTS = [3, 4, 4, 4, 4, 4, 5, 5, 4, 4, 5, 5, 5, 5, 4, 4, 5, 5, 5, 6] as const

/** When a level also has review cards, this share of a patient is new cards. */
const FRESH_SHARE = 0.75

const cards = (text: string): readonly string[] => text.trim().split(/\s+/)
const join = (...lists: readonly (readonly string[])[]): readonly string[] => [...new Set(lists.flat())]

// ---------------------------------------------------------------- Russian

const RU_VOWELS = cards('А О У И Э')
const RU_SOFT_VOWELS = cards('Ы Е Ё Ю Я')
const RU_SONORANTS = cards('М Н Л Р')
const RU_HISSING = cards('С З Ш Ж')
const RU_PAIRED = cards('Б П Д Т В Ф')
const RU_BACK = cards('Г К Х Й')
const RU_HUSHING = cards('Ц Ч Щ')
const RU_ALPHABET = cards('А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ы Э Ю Я')

const RU_OPEN_1 = cards('МА МО МУ МЫ НА НО НУ ЛА ЛО ЛУ РА РО РУ')
const RU_OPEN_2 = cards('ПА ПО ПУ БА БО БУ ДА ДО ДУ ТА ТО ТУ ВА ВО ФА')
const RU_OPEN_3 = cards('СА СО СУ ЗА ЗУ ША ШУ ЖА ЖУ КА КО КУ ГА ГО ХА ХО')
const RU_SOFT = cards('МЯ НЯ ЛЯ ЛЁ НЮ ЛЮ ПЕ МЕ ЛИ БИ ПИ НИ')
const RU_CLOSED = cards('АМ ОН УС ОК ИЛ УМ АП ОС ЭХ ИХ')

const RU_SHORT = cards('КОТ ДОМ СОК МАК ЛЕС НОС СЫР ЛУК СОН ЖУК ДУБ МЁД')
const RU_FOUR = cards('МАМА ПАПА ЛУНА РЫБА КАША ЗИМА РУКА ЛАПА ВАТА')

const RU: readonly LevelSpec[] = [
  { theme: 'vowels', fresh: RU_VOWELS },
  { theme: 'soft vowels', fresh: RU_SOFT_VOWELS, review: RU_VOWELS },
  { theme: 'm-n-l-r', fresh: RU_SONORANTS, review: join(RU_VOWELS, RU_SOFT_VOWELS) },
  { theme: 's-z-sh-zh', fresh: RU_HISSING, review: RU_SONORANTS },
  { theme: 'b-p-d-t-v-f', fresh: RU_PAIRED, review: join(RU_SONORANTS, RU_HISSING) },
  { theme: 'g-k-h-y', fresh: RU_BACK, review: join(RU_SONORANTS, RU_HISSING, RU_PAIRED) },
  { theme: 'ts-ch-shch', fresh: RU_HUSHING, review: join(RU_SONORANTS, RU_HISSING, RU_PAIRED, RU_BACK) },
  { theme: 'all letters', fresh: RU_ALPHABET },
  { theme: 'open syllables m-n-l-r', fresh: RU_OPEN_1 },
  { theme: 'open syllables p-b-d-t-v-f', fresh: RU_OPEN_2, review: RU_OPEN_1 },
  { theme: 'open syllables s-z-sh-zh-k-g-h', fresh: RU_OPEN_3, review: join(RU_OPEN_1, RU_OPEN_2) },
  { theme: 'soft syllables', fresh: RU_SOFT, review: join(RU_OPEN_1, RU_OPEN_2, RU_OPEN_3) },
  { theme: 'closed syllables', fresh: RU_CLOSED },
  { theme: 'syllable mix', fresh: join(RU_OPEN_1, RU_OPEN_2, RU_OPEN_3, RU_SOFT, RU_CLOSED) },
  { theme: 'three-letter words', fresh: RU_SHORT },
  { theme: 'four-letter words', fresh: RU_FOUR, review: RU_SHORT },
  { theme: 'animals', fresh: cards('ЛИСА КОЗА ВОЛК СОВА УТКА ЁЖИК ЗЕБРА ПАНДА ТИГР') },
  { theme: 'hospital words', fresh: cards('ВРАЧ БИНТ УКОЛ ЧАЙ СИРОП ГОРЛО ЗУБ УХО ЛАПКА') },
  { theme: 'longer words', fresh: cards('МАШИНА КОНФЕТА РОМАШКА ПОДУШКА ЛОШАДКА КОШЕЧКА') },
  { theme: 'finale', fresh: cards('БОЛЬНИЦА ДОКТОР ЛЕКАРСТВО ЗДОРОВ ПАЛАТА ЖИРАФ ТАБЛЕТКА МЕДСЕСТРА') },
]

// ---------------------------------------------------------------- German

const DE_VOWELS = cards('A E I O U')
const DE_UMLAUTS = cards('Ä Ö Ü')
const DE_SONORANTS = cards('M N L R')
const DE_HISSING = cards('S Z F W')
const DE_PAIRED = cards('B P D T')
const DE_BACK = cards('G K H J')
const DE_RARE = cards('C V X Y Q')
const DE_ALPHABET = cards('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z Ä Ö Ü')

const DE_OPEN_1 = cards('MA MO MU MI NA NO NU LA LO LI RA RO RU')
const DE_OPEN_2 = cards('PA PO BA BO BI DA DU DO TA TO TI')
const DE_OPEN_3 = cards('SA SO SI FA FO WA WO HA HO KA KU GA GO')
const DE_SOUNDS = cards('AU EI EU MÜ LÖ BÄ NÖ KÜ MAU BEI HEU')
const DE_CLOSED = cards('AM AN AB IM IN UM ES OB AL')

const DE_SHORT = cards('OMA OPA EIS HUT TOR ROT ZOO OHR ARM BAD')
const DE_FOUR = cards('HAUS MAUS BALL NASE HOSE MOND BAUM HAND ROSE BROT')

const DE: readonly LevelSpec[] = [
  { theme: 'vowels', fresh: DE_VOWELS },
  { theme: 'umlauts', fresh: DE_UMLAUTS, review: DE_VOWELS },
  { theme: 'm-n-l-r', fresh: DE_SONORANTS, review: join(DE_VOWELS, DE_UMLAUTS) },
  { theme: 's-z-f-w', fresh: DE_HISSING, review: DE_SONORANTS },
  { theme: 'b-p-d-t', fresh: DE_PAIRED, review: join(DE_SONORANTS, DE_HISSING) },
  { theme: 'g-k-h-j', fresh: DE_BACK, review: join(DE_SONORANTS, DE_HISSING, DE_PAIRED) },
  { theme: 'c-v-x-y-q', fresh: DE_RARE, review: join(DE_SONORANTS, DE_HISSING, DE_PAIRED, DE_BACK) },
  { theme: 'all letters', fresh: DE_ALPHABET },
  { theme: 'open syllables m-n-l-r', fresh: DE_OPEN_1 },
  { theme: 'open syllables p-b-d-t', fresh: DE_OPEN_2, review: DE_OPEN_1 },
  { theme: 'open syllables s-f-w-h-k-g', fresh: DE_OPEN_3, review: join(DE_OPEN_1, DE_OPEN_2) },
  { theme: 'umlauts and diphthongs', fresh: DE_SOUNDS, review: join(DE_OPEN_1, DE_OPEN_2, DE_OPEN_3) },
  { theme: 'closed syllables', fresh: DE_CLOSED },
  { theme: 'syllable mix', fresh: join(DE_OPEN_1, DE_OPEN_2, DE_OPEN_3, DE_SOUNDS, DE_CLOSED) },
  { theme: 'three-letter words', fresh: DE_SHORT },
  { theme: 'four-letter words', fresh: DE_FOUR, review: DE_SHORT },
  { theme: 'animals', fresh: cards('KATZE HUND ESEL ZEBRA IGEL AFFE TIGER ENTE LÖWE') },
  { theme: 'hospital words', fresh: cards('ARZT SAFT BETT TEE BAUCH ZAHN FIEBER SALBE PFLASTER') },
  { theme: 'longer words', fresh: cards('BANANE TOMATE KAROTTE KISSEN LIMONADE PINGUIN KÄTZCHEN SCHWESTER') },
  { theme: 'finale', fresh: cards('DOKTOR GESUND MEDIZIN GIRAFFE KRANKENHAUS VERBAND SPRITZE') },
]

/** German cards that are not nouns: spoken in lowercase. */
const DE_NOT_NOUNS = new Set(['ROT', 'GESUND'])

// ---------------------------------------------------------------- English

const EN_VOWELS = cards('A E I O U')
const EN_FIRST = cards('M S T P N')
const EN_SECOND = cards('B D G C K')
const EN_THIRD = cards('F L R H W')
const EN_FOURTH = cards('J V Y Z')
const EN_RARE = cards('Q X')
const EN_ALPHABET = cards('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z')

// English syllables are two-letter words and rhyme chunks the recognizer knows.
const EN_VC = cards('AT AN IN IT ON UP')
const EN_CV = cards('GO NO SO ME WE HE')
const EN_CV_MIX = cards('HI MY BY BE DO TO PA MA')
const EN_VC_MIX = cards('AM AS US IF OF OR OX')
const EN_LONG = cards('SEE DAY SAY PIE TIE KEY TOE MOO ZOO')

const EN_SHORT = cards('CAT DOG SUN HAT PIG BED BOX CUP BUS HEN')
const EN_FOUR = cards('FISH FROG DUCK MILK BOOK BELL SOCK')

const EN: readonly LevelSpec[] = [
  { theme: 'vowels', fresh: EN_VOWELS },
  { theme: 'm-s-t-p-n', fresh: EN_FIRST, review: EN_VOWELS },
  { theme: 'b-d-g-c-k', fresh: EN_SECOND, review: EN_FIRST },
  { theme: 'f-l-r-h-w', fresh: EN_THIRD, review: join(EN_FIRST, EN_SECOND) },
  { theme: 'j-v-y-z', fresh: EN_FOURTH, review: join(EN_FIRST, EN_SECOND, EN_THIRD) },
  { theme: 'q-x', fresh: EN_RARE, review: join(EN_FIRST, EN_SECOND, EN_THIRD, EN_FOURTH) },
  { theme: 'look-alikes', fresh: cards('B D P Q M N W') },
  { theme: 'all letters', fresh: EN_ALPHABET },
  { theme: 'vowel-consonant words', fresh: EN_VC },
  { theme: 'consonant-vowel words', fresh: EN_CV, review: EN_VC },
  { theme: 'more two-letter words', fresh: EN_CV_MIX, review: join(EN_VC, EN_CV) },
  { theme: 'closed two-letter words', fresh: EN_VC_MIX, review: join(EN_VC, EN_CV, EN_CV_MIX) },
  { theme: 'long vowels', fresh: EN_LONG },
  { theme: 'syllable mix', fresh: join(EN_VC, EN_CV, EN_CV_MIX, EN_VC_MIX, EN_LONG) },
  { theme: 'three-letter words', fresh: EN_SHORT },
  { theme: 'four-letter words', fresh: EN_FOUR, review: EN_SHORT },
  { theme: 'animals', fresh: cards('TIGER ZEBRA HORSE MOUSE PANDA SHEEP MONKEY RABBIT') },
  { theme: 'hospital words', fresh: cards('NURSE PILL TEA SOUP HUG SICK REST PLASTER') },
  { theme: 'longer words', fresh: cards('BANANA PILLOW CARROT TEDDY BLANKET PUPPY APPLE') },
  { theme: 'finale', fresh: cards('HOSPITAL DOCTOR KITTEN MEDICINE HEALTHY AMBULANCE GIRAFFE') },
]

const LEVELS: Record<Lang, readonly LevelSpec[]> = { ru: RU, de: DE, en: EN }

// ---------------------------------------------------------------- letter names

/**
 * What the voice says to reveal a letter. Single English vowels stay as the
 * capital letter: voices read a lone “A” as the letter name, while a
 * respelling like “ay” comes out as “aye”.
 */
const LETTER_NAMES: Record<Lang, Readonly<Record<string, string>>> = {
  ru: {
    А: 'а', Б: 'бэ', В: 'вэ', Г: 'гэ', Д: 'дэ', Е: 'е', Ё: 'ё', Ж: 'жэ', З: 'зэ', И: 'и', Й: 'и краткое',
    К: 'ка', Л: 'эль', М: 'эм', Н: 'эн', О: 'о', П: 'пэ', Р: 'эр', С: 'эс', Т: 'тэ', У: 'у', Ф: 'эф',
    Х: 'ха', Ц: 'цэ', Ч: 'че', Ш: 'ша', Щ: 'ща', Ъ: 'твёрдый знак', Ы: 'ы', Ь: 'мягкий знак', Э: 'э',
    Ю: 'ю', Я: 'я',
  },
  de: {
    A: 'Ah', B: 'Beh', C: 'Zeh', D: 'Deh', E: 'Eh', F: 'Eff', G: 'Geh', H: 'Hah', I: 'Ih', J: 'Jott',
    K: 'Kah', L: 'Ell', M: 'Emm', N: 'Enn', O: 'Oh', P: 'Peh', Q: 'Kuh', R: 'Err', S: 'Ess', T: 'Teh',
    U: 'Uh', V: 'Fau', W: 'Weh', X: 'Ix', Y: 'Ypsilon', Z: 'Zett', Ä: 'Äh', Ö: 'Öh', Ü: 'Üh',
  },
  en: {
    A: 'A', B: 'bee', C: 'see', D: 'dee', E: 'E', F: 'eff', G: 'gee', H: 'aitch', I: 'I', J: 'jay',
    K: 'kay', L: 'el', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'queue', R: 'ar', S: 'ess', T: 'tee',
    U: 'you', V: 'vee', W: 'double-you', X: 'ex', Y: 'why', Z: 'zed',
  },
}

// ---------------------------------------------------------------- API

function clampLevel(level: number): number {
  const whole = Number.isFinite(level) ? Math.trunc(level) : 1
  return Math.min(LEVEL_COUNT, Math.max(1, whole))
}

function kindOf(level: number): ItemKind {
  return level <= 8 ? 'letter' : level <= 14 ? 'syllable' : 'word'
}

function spec(lang: Lang, level: number): LevelSpec {
  return LEVELS[lang][clampLevel(level) - 1]
}

export function levelPlan(lang: Lang, level: number): LevelPlan {
  const n = clampLevel(level)
  return { level: n, kind: kindOf(n), count: COUNTS[n - 1], theme: spec(lang, n).theme }
}

export function levelPool(lang: Lang, level: number): readonly string[] {
  const { fresh, review = [] } = spec(lang, level)
  return join(fresh, review)
}

/** A small, fast, seedable generator (mulberry32). */
function generator(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a over the text, so every (lang, level, seed) gets its own stream. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/**
 * The cards for one patient. Deterministic for (lang, level, seed); no card
 * twice while the pool allows it. Mostly the level’s new cards, topped up
 * with a review card or two.
 */
export function itemsFor(lang: Lang, level: number, seed: number): string[] {
  const n = clampLevel(level)
  const count = COUNTS[n - 1]
  const { fresh, review = [] } = spec(lang, n)
  const whole = Number.isFinite(seed) ? Math.trunc(seed) : 0
  const random = generator(hash(`${lang}:${n}:${whole}`))
  const newCards = shuffled(fresh, random)
  const oldCards = shuffled(review.filter((item) => !fresh.includes(item)), random)
  const wantNew = oldCards.length ? Math.min(newCards.length, Math.ceil(count * FRESH_SHARE)) : count
  const picked = [...newCards.slice(0, wantNew), ...oldCards.slice(0, count - wantNew)]
  for (const item of newCards.slice(wantNew)) {
    if (picked.length >= count) break
    picked.push(item)
  }
  // Only if a pool were ever smaller than a patient: repeat rather than fall short.
  const pool = [...newCards, ...oldCards]
  for (let i = 0; picked.length < count && pool.length; i++) picked.push(pool[i % pool.length])
  return shuffled(picked, random)
}

const knownCache = new Map<string, readonly string[]>()

/** Every card of that kind in that language, in curriculum order. */
export function knownItems(lang: Lang, kind: ItemKind): readonly string[] {
  const cacheKey = `${lang}:${kind}`
  const cached = knownCache.get(cacheKey)
  if (cached) return cached
  const items: string[] = []
  LEVELS[lang].forEach((level, index) => {
    if (kindOf(index + 1) === kind) items.push(...level.fresh, ...(level.review ?? []))
  })
  const unique = [...new Set(items)]
  knownCache.set(cacheKey, unique)
  return unique
}

/**
 * What the speech synthesizer says to reveal the answer after a patient goes
 * to intensive care: a letter’s name, or the syllable / word itself.
 */
export function spokenForm(lang: Lang, item: string, kind: ItemKind): string {
  const locale = SPEECH_LOCALE[lang]
  const upper = item.trim().normalize('NFC').toLocaleUpperCase(locale)
  const lower = upper.toLocaleLowerCase(locale)
  if (kind === 'letter') return LETTER_NAMES[lang][upper] ?? lower
  if (kind === 'word' && lang === 'de' && !DE_NOT_NOUNS.has(upper)) {
    return upper.charAt(0) + lower.slice(1)
  }
  return lower
}
