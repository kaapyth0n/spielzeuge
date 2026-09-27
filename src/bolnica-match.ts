/**
 * Judges what the browser heard when the child read a card aloud.
 *
 * SpeechRecognition (Google in Chrome, Apple in Safari) returns up to five
 * alternative transcripts of the final result. The card counts as read when
 * ANY of them ends with it, leniently matched: letter names and sounds, a
 * repeated or stretched syllable, a word with a small ending the recognizer
 * tacked on. The answer has to come last (“это буква бэ”, “it's a”, “die
 * Katzen”): a card somewhere inside ordinary talk (“я не знаю” for Я) only
 * asks the child again. It never counts when the child plainly read a
 * different card of the same kind; then `other` names that card so the game
 * can say “that was Д, try again”.
 *
 * Nothing here touches the browser; it is plain string work, tested in node.
 */
import { SPEECH_LOCALE, type Lang } from './languages.ts'
import { knownItems, type ItemKind } from './bolnica-words.ts'

export type Verdict = 'correct' | 'wrong' | 'unclear'

export interface Judgement {
  verdict: Verdict
  /**
   * What we heard, tidied for display. Empty when nothing but silence or
   * fillers came through; an “unclear” verdict with text means “I heard
   * this, say it again”.
   */
  heard: string
  /** Another card of the same kind the best alternative matches, else null. */
  other: string | null
}

const HEARD_MAX = 24

// ------------------------------------------------------------------ text

/** Latin letters that look like Cyrillic ones, for mixed-script tokens. */
const LOOKALIKE: Readonly<Record<string, string>> = {
  a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', h: 'н', b: 'в',
}

/**
 * NFC, lowercase, punctuation and quotes gone, spaces collapsed. Hyphens and
 * apostrophes survive only inside words (“ма-ма”, “it's”). Keeps ё and
 * umlauts: this is also the display form.
 */
export function normalizeTranscript(lang: Lang, text: string): string {
  let s = String(text ?? '')
    .normalize('NFC')
    .toLocaleLowerCase(SPEECH_LOCALE[lang])
    .replace(/\p{M}+/gu, '')
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .replace(/(?<![\p{L}\p{N}])['-]+|['-]+(?![\p{L}\p{N}])/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (lang === 'ru') {
    // A recognizer sometimes mixes scripts inside one word (“кoт” with a Latin o).
    s = s
      .split(' ')
      .map((token) =>
        /\p{Script=Cyrillic}/u.test(token) && /[a-z]/.test(token)
          ? token.replace(/[a-z]/g, (ch) => LOOKALIKE[ch] ?? ch)
          : token,
      )
      .join(' ')
  }
  return s
}

function tokens(normalized: string): string[] {
  return normalized
    .split(/[\s-]+/)
    .map((token) => token.replace(/'/g, ''))
    .filter(Boolean)
}

/** “ааа” → “а”, “zedd” → “zed”: stretched sounds and doubled letters. */
function squeeze(text: string): string {
  return text.replace(/(.)\1+/gu, '$1')
}

const display = (normalized: string): string =>
  normalized.length <= HEARD_MAX ? normalized : `${normalized.slice(0, HEARD_MAX - 1).trimEnd()}…`

// ------------------------------------------------------------------ fillers

const wordSet = (text: string): ReadonlySet<string> => new Set(text.split(' ').map(squeeze))

/** Pure hesitations: never an answer, so on their own they are “unclear”, not wrong. */
const HESITATIONS: Record<Lang, ReadonlySet<string>> = {
  ru: wordSet('ну хм эм ага угу ой'),
  de: wordSet('äh ähm hm hmm also ja'),
  en: wordSet('um uh erm er hmm hm'),
}

/**
 * Carrier and filler words: “буква бэ”, “это а”, “the letter b”, “Buchstabe B”.
 * They are dropped. A card that happens to be one of them (НУ, IT) still
 * matches when the child says just that.
 */
const STOP: Record<Lang, ReadonlySet<string>> = {
  ru: new Set([...wordSet('буква буквы букву буквой это эта звук звуки слог слово'), ...HESITATIONS.ru]),
  de: new Set([
    ...wordSet('buchstabe buchstaben der die das ist ein eine einen silbe wort groß großes großer klein kleines'),
    ...HESITATIONS.de,
  ]),
  en: new Set([...wordSet('the letter letters its it is thats that this sound word syllable capital big small'), ...HESITATIONS.en]),
}

/**
 * Hesitation sounds that are also a letter’s name (“э…”, “ähm”, English “a”
 * as an article). They count as that letter only at the end of what was said.
 */
const WEAK_LETTER_FORMS: Record<Lang, ReadonlySet<string>> = {
  ru: new Set(['э', 'м', 'эм']),
  de: new Set(['äh', 'eh', 'ah', 'oh']),
  en: new Set(['a', 'i', 'eh', 'oh', 'ah']),
}

/** Single-letter hesitations that may still be half of a sounded-out syllable (“м а”). */
const SHORT_FILLERS: Record<Lang, ReadonlySet<string>> = {
  ru: new Set(['э', 'м']),
  de: new Set<string>(),
  en: new Set(['a']),
}

/** Letter names that are also everyday words: they count only said on their own (“как”, not “не знаю как”). */
const SOLO_LETTER_FORMS: Record<Lang, ReadonlySet<string>> = {
  ru: new Set(['как']),
  de: new Set<string>(),
  en: new Set<string>(),
}

/** “b for ball”, “B wie Ball”: the letter comes first, its picture word after this joiner. */
const PICTURE_JOINER: Record<Lang, string | null> = { ru: null, de: 'wie', en: 'for' }

// ------------------------------------------------------------------ letters

/**
 * Everything a recognizer may write for a letter read aloud: the letter, its
 * names, its sound with a vowel after it, Latin look-alikes and homophones.
 * Forms separated by “|”. A form shared by two letters (Latin “e”) counts
 * for both; a form never belongs to a letter it only sounds a bit like.
 */
const LETTER_FORMS: Record<Lang, Readonly<Record<string, string>>> = {
  ru: {
    А: 'а|a|ах',
    Б: 'б|бэ|бе|бы|b|be',
    В: 'в|вэ|ве|вы|v|ve',
    Г: 'г|гэ|ге|гы|g|ge',
    Д: 'д|дэ|де|ды|d|de',
    Е: 'е|йэ|йе|je|ye|e',
    Ё: 'ё|йо|йоу|jo|yo',
    Ж: 'ж|жэ|же|жы|жи|zh',
    З: 'з|зэ|зе|зы|z|ze',
    И: 'и|i',
    Й: 'й|ий|йот|и краткое|и краткая|краткое|краткая',
    К: 'к|ка|кэ|ке|кы|как|k|ka',
    Л: 'л|эль|эл|ель|ль|лэ|ле|лы|l|el',
    М: 'м|эм|мэ|ме|мы|m|em',
    Н: 'н|эн|нэ|не|ны|n|en',
    О: 'о|o|ох|оу|0',
    П: 'п|пэ|пе|пы|p|pe',
    Р: 'р|эр|рэ|ре|ры|r|er',
    С: 'с|эс|сэ|се|сы|s|es|c',
    Т: 'т|тэ|те|ты|t|te',
    У: 'у|u|ух',
    Ф: 'ф|эф|фэ|фе|фы|f|ef',
    Х: 'х|ха|хэ|хе|хы|h|x|kh',
    Ц: 'ц|цэ|це|цы|ts|c',
    Ч: 'ч|че|чэ|чё|чо|ch',
    Ш: 'ш|ша|шэ|ше|шы|ши|sh',
    Щ: 'щ|ща|щя|щэ|ще|щи|sch|shch',
    Ы: 'ы',
    Э: 'э|эх|e',
    Ю: 'ю|you|yu|ju|u',
    Я: 'я|ya|ja',
  },
  de: {
    A: 'a|ah',
    B: 'b|be|beh',
    C: 'c|ce|ze|zeh|tse|tseh|tze',
    D: 'd|de|deh',
    E: 'e|eh',
    F: 'f|ef|eff',
    G: 'g|ge|geh',
    H: 'h|ha|hah',
    I: 'i|ih|ie',
    J: 'j|jot|jott|jod|yot',
    K: 'k|ka|kah',
    L: 'l|el|ell|elle',
    M: 'm|em|emm',
    N: 'n|en|enn',
    O: 'o|oh|0',
    P: 'p|pe|peh',
    Q: 'q|ku|kuh',
    R: 'r|er|err|ehr',
    S: 's|es|ess|eß',
    T: 't|te|teh|tee',
    U: 'u|uh',
    V: 'v|fau|vau|pfau',
    W: 'w|we|weh|ve',
    X: 'x|iks|ix|icks',
    Y: 'y|ypsilon|üpsilon|ipsilon|upsilon',
    Z: 'z|zett|zet|zed',
    Ä: 'ä|ae|äh|a umlaut',
    Ö: 'ö|oe|öh|o umlaut',
    Ü: 'ü|ue|üh|u umlaut',
  },
  en: {
    A: 'a|ay|ey|ah',
    B: 'b|be|bee|buh',
    C: 'c|see|sea|si|cee|kuh',
    D: 'd|dee|di|duh',
    E: 'e|ee|eh',
    F: 'f|ef|eff|if',
    G: 'g|gee|ji|jee|guh',
    H: 'h|aitch|haitch|age',
    I: 'i|eye|aye|ai',
    J: 'j|jay|jey',
    K: 'k|kay|cay|kaye|kuh',
    L: 'l|el|ell|elle',
    M: 'm|em|emm',
    N: 'n|en|enn',
    O: 'o|oh|owe|0',
    P: 'p|pee|pea|puh',
    Q: 'q|queue|cue|kew|kyu',
    R: 'r|are|ar|arr|ah',
    S: 's|es|ess',
    T: 't|tee|tea|ti|tuh',
    U: 'u|you|ew|yu|yoo',
    V: 'v|vee|vi',
    W: 'w|double you|double u|doubleyou|dub|dubya',
    X: 'x|ex|ecks|eks|eggs',
    Y: 'y|why|wy|wye',
    Z: 'z|zed|zee|zet',
  },
}

const formCache = new Map<Lang, Map<string, string[]>>()

/** Squeezed form (words joined by one space) → the letters it may be. */
function letterIndex(lang: Lang): Map<string, string[]> {
  const cached = formCache.get(lang)
  if (cached) return cached
  const index = new Map<string, string[]>()
  for (const [letter, forms] of Object.entries(LETTER_FORMS[lang])) {
    for (const form of forms.split('|')) {
      const key = form.split(' ').map(squeeze).join(' ')
      const letters = index.get(key) ?? []
      if (!letters.includes(letter)) letters.push(letter)
      index.set(key, letters)
    }
  }
  formCache.set(lang, index)
  return index
}

interface LetterUnit {
  letters: readonly string[]
  weak: boolean
  solo: boolean
  /** The squeezed word or two-word phrase. */
  text: string
}

/** Splits an alternative into letter mentions and other words; fillers vanish. */
function letterUnits(lang: Lang, words: readonly string[]): LetterUnit[] {
  const index = letterIndex(lang)
  const units: LetterUnit[] = []
  for (let i = 0; i < words.length; i++) {
    const word = squeeze(words[i])
    const next = i + 1 < words.length ? squeeze(words[i + 1]) : null
    const phrase = next === null ? undefined : index.get(`${word} ${next}`)
    if (phrase) {
      units.push({ letters: phrase, weak: false, solo: false, text: `${word} ${next}` })
      i++
      continue
    }
    const letters = index.get(word)
    if (letters) units.push({ letters, weak: WEAK_LETTER_FORMS[lang].has(word), solo: SOLO_LETTER_FORMS[lang].has(word), text: word })
    else if (!STOP[lang].has(word)) units.push({ letters: [], weak: false, solo: false, text: word })
  }
  return units
}

/** Drops the picture word: “b for ball” → “b”. Only a short tail after the joiner. */
function withoutPictureWord(lang: Lang, words: readonly string[]): readonly string[] {
  const joiner = PICTURE_JOINER[lang]
  const at = joiner === null ? -1 : words.lastIndexOf(joiner)
  return at > 0 && words.length - at <= 3 ? words.slice(0, at) : words
}

/**
 * What one alternative says, best first: the card as the answer; the card
 * only inside other talk, cut short or blurred by a recognizer habit (ask
 * again); another card; talk with no answer in it (ask again, showing what
 * was heard); nothing at all.
 */
type Outcome = 'correct' | 'retry' | 'wrong' | 'chatter' | 'silence'

const OUTCOME_RANK: Readonly<Record<Outcome, number>> = { correct: 0, retry: 1, wrong: 2, chatter: 3, silence: 4 }

interface Analysis {
  outcome: Outcome
  other: () => string | null
}

function analyseLetter(lang: Lang, target: string, normalized: string): Analysis {
  const units = letterUnits(lang, withoutPictureWord(lang, tokens(normalized)))
  const last = units.length - 1
  // A hesitation letter counts only when nothing follows it.
  const said = units.filter((unit, i) => !unit.weak || i === last)
  const counted = said.length > 1 ? said.map((unit) => (unit.solo ? { ...unit, letters: [] } : unit)) : said
  // The child’s answer comes last: “это буква бэ”, “мама смотри б”.
  const answer = counted.at(-1)
  const onTable = target in LETTER_FORMS[lang]
  const spelled = squeeze(target.toLocaleLowerCase(SPEECH_LOCALE[lang]))
  // Cards outside the table (never Ь or Ъ in play) still match themselves.
  const names = (unit: LetterUnit): boolean => (onTable ? unit.letters.includes(target) : unit.text === spelled)
  const other = (): string | null => answer?.letters.find((letter) => letter !== target) ?? null
  if (!answer) return { outcome: 'silence', other }
  if (names(answer)) return { outcome: 'correct', other }
  // The letter inside other talk (“я не знаю” for Я, “а что это” for А) is no answer yet.
  if (counted.some(names)) return { outcome: 'retry', other }
  // Recognizers often write е for ё.
  if (lang === 'ru' && target === 'Ё' && answer.letters.includes('Е')) return { outcome: 'retry', other }
  // Only another letter at the end is a misread; plain words (“бабушка”) are not.
  return { outcome: answer.letters.length ? 'wrong' : 'chatter', other }
}

// ------------------------------------------------------------------ keys

const CYRILLIC_LATIN: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch',
  ш: 'sh', щ: 'q', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'ju', я: 'ja',
}
const RU_CONSONANTS = new Set('бвгджзйклмнпрстфхцчшщ')

/**
 * Russian sound key in Latin letters, so “ма”, “ma” and “Ма” agree. Е and Э
 * share a key; after a consonant Ё shares О’s key (ЛЁ ~ “ло”), as the
 * recognizers hear them. Words fold Ё into Е first (“мед” for МЁД).
 */
function ruKey(text: string, kind: ItemKind): string {
  let s = kind === 'word' ? text.replace(/ё/g, 'е') : text
  s = s
    .replace(/shch|sch/g, 'щ')
    .replace(/kh/g, 'х')
    .replace(/ts|tz/g, 'ц')
    .replace(/y([aueo])/g, 'j$1')
    .replace(/w/g, 'v')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === 'ё') out += i > 0 && RU_CONSONANTS.has(s[i - 1]) ? 'o' : 'jo'
    else out += CYRILLIC_LATIN[ch] ?? ch
  }
  return squeeze(out)
}

const GENERIC_CYRILLIC: Readonly<Record<string, string>> = {
  ...CYRILLIC_LATIN, й: 'y', ы: 'i', щ: 'shch', ц: 'ts', х: 'kh', ё: 'yo', ю: 'yu', я: 'ya',
}

function latinOf(text: string): string {
  return text.replace(/\p{Script=Cyrillic}/gu, (ch) => GENERIC_CYRILLIC[ch] ?? ch)
}

/**
 * German sound key: umlaut spellings agree (ae/ä, ß/ss), Ä sounds like E,
 * AI/EI and ÄU/EU/OI agree, IE is a long I, a silent H after a vowel goes
 * (“muh” = MU, “Kuh” = KU), V is F, doubled letters count once.
 */
function deKey(text: string): string {
  return squeeze(
    latinOf(text)
      .replace(/ß/g, 'ss')
      .replace(/ae/g, 'ä')
      .replace(/oe/g, 'ö')
      .replace(/(?<![aeä])ue/g, 'ü')
      .replace(/äu/g, 'eu')
      .replace(/ä/g, 'e')
      .replace(/ai|ay|ey/g, 'ei')
      .replace(/oi|oy/g, 'eu')
      .replace(/(?<!e)ie/g, 'i')
      .replace(/([aeiouöüy])h(?![aeiouöüy])/g, '$1')
      .replace(/ck/g, 'k')
      .replace(/tz/g, 'z')
      .replace(/ph/g, 'f')
      .replace(/th/g, 't')
      .replace(/dt/g, 't')
      .replace(/qu/g, 'kw')
      .replace(/x/g, 'ks')
      .replace(/v/g, 'f'),
  )
}

/** English: spelling is no guide to sound, so homophones live in ALIASES. */
function enKey(text: string): string {
  return squeeze(latinOf(text))
}

function keyOf(lang: Lang, text: string, kind: ItemKind): string {
  const s = text.toLocaleLowerCase(SPEECH_LOCALE[lang]).replace(/[\s'-]+/g, '')
  return lang === 'ru' ? ruKey(s, kind) : lang === 'de' ? deKey(s) : enKey(s)
}

// ------------------------------------------------------------------ aliases

/** Homophones and recognizer habits for syllables and words, by card. */
const ALIASES: Record<Lang, Readonly<Record<string, string>>> = {
  ru: {
    ОК: 'окей|окай|ok|okay',
    // Recognizers often write е for ё.
    ЛЁ: 'ле|лео',
    // A final consonant is said voiceless, so the recognizer may pick its voiced twin.
    КОТ: 'код',
    ЛУК: 'луг',
    ЛЕС: 'лез',
  },
  de: {
    ZOO: 'zu',
  },
  en: {
    AN: 'and|ann|anne',
    IN: 'inn',
    IT: 'its',
    GO: 'goh',
    NO: 'know|noh',
    SO: 'sew|sow|soh',
    ME: 'mi|mee',
    WE: 'wee|oui|whee',
    HE: 'hee',
    HI: 'high|hiya|hai',
    MY: 'mai|mye',
    BY: 'buy|bye|bi',
    BE: 'bee|b',
    DO: 'doo|dew|due|du',
    TO: 'too|two|2|tu',
    PA: 'pah|par',
    MA: 'mah|mar|maam|mam',
    AS: 'az',
    OF: 'ov|off',
    OR: 'ore|oar|awe|aw',
    OX: 'ocks',
    SEE: 'sea|c|si',
    DAY: 'dey|dae',
    SAY: 'sey',
    PIE: 'pi|pye',
    TIE: 'thai|tai',
    KEY: 'quay|kee',
    TOE: 'tow|toh',
    MOO: 'mu',
    ZOO: 'zu',
    SUN: 'son',
    HORSE: 'hoarse',
    TEA: 'tee|t',
    CAT: 'kat',
    BOX: 'bocks',
  },
}

interface Entry {
  item: string
  key: string
  aliases: readonly string[]
  length: number
}

function entryFor(lang: Lang, item: string, kind: ItemKind): Entry {
  const aliases = (ALIASES[lang][item] ?? '')
    .split('|')
    .filter(Boolean)
    .map((alias) => keyOf(lang, alias, kind))
  return { item, key: keyOf(lang, item, kind), aliases, length: Array.from(item).length }
}

interface Catalogue {
  entries: readonly Entry[]
  /** Keys and aliases of every known card: never matched by a loose rule. */
  taken: ReadonlySet<string>
}

const catalogueCache = new Map<string, Catalogue>()

function catalogue(lang: Lang, kind: ItemKind): Catalogue {
  const cacheKey = `${lang}:${kind}`
  const cached = catalogueCache.get(cacheKey)
  if (cached) return cached
  const entries = knownItems(lang, kind).map((item) => entryFor(lang, item, kind))
  const taken = new Set(entries.flatMap((entry) => [entry.key, ...entry.aliases]))
  const built = { entries, taken }
  catalogueCache.set(cacheKey, built)
  return built
}

// ------------------------------------------------------------------ syllables & words

const KEY_VOWELS = new Set('aeiouyöü')

/** “mama”, “mamama” for МА. */
function isRepeat(candidate: string, key: string): boolean {
  if (candidate.length < key.length * 2 || candidate.length % key.length) return false
  return candidate === key.repeat(candidate.length / key.length)
}

/**
 * The syllable with a small recognizer tail: one more sound (“мак”, “ноу”,
 * “mal”) or a short run of consonants (“mach”, “Obst”).
 */
function hasTail(candidate: string, key: string): boolean {
  if (key.length < 2 || !candidate.startsWith(key)) return false
  const tail = candidate.slice(key.length)
  if (tail.length === 1) return true
  return tail.length > 1 && tail.length <= 3 && [...tail].every((ch) => !KEY_VOWELS.has(ch))
}

function levenshtein(a: string, b: string, limit: number): number {
  const x = Array.from(a)
  const y = Array.from(b)
  if (Math.abs(x.length - y.length) > limit) return limit + 1
  let previous = Array.from({ length: y.length + 1 }, (_, j) => j)
  for (let i = 1; i <= x.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      const value = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost)
      row.push(value)
      best = Math.min(best, value)
    }
    if (best > limit) return limit + 1
    previous = row
  }
  return previous[y.length]
}

/**
 * How well one candidate key matches a card: 0 exact or homophone, higher is
 * looser, null no match. Loose rules never hand a card a candidate that is
 * exactly another card (ЛАПА is not ЛАПКА, MAU is not MA).
 */
function score(lang: Lang, kind: ItemKind, entry: Entry, candidate: string, taken: ReadonlySet<string>): number | null {
  if (candidate === entry.key || entry.aliases.includes(candidate)) return 0
  if (!candidate || taken.has(candidate)) return null
  if (kind === 'syllable') {
    if (isRepeat(candidate, entry.key)) return 1
    if (lang !== 'en' && hasTail(candidate, entry.key)) return 2
    return null
  }
  // Words: a recognizer’s ending (“машину”, “лис”, “Katzen”, “frogs”), never a
  // new sound inside the word: КОЗА is not “коса”, УКОЛ is not “угол”, FROG is not “from”.
  const tolerance = entry.length >= 7 ? 2 : entry.length >= 4 ? 1 : 0
  const start = sharedStart(candidate, entry.key)
  if (!tolerance || start < entry.key.length - tolerance) return null
  const heardEnd = consonants(candidate.slice(start))
  const cardEnd = consonants(entry.key.slice(start))
  if (!heardEnd.startsWith(cardEnd) && !cardEnd.startsWith(heardEnd)) return null
  const distance = levenshtein(candidate, entry.key, tolerance)
  return distance <= tolerance ? 1 + distance : null
}

const consonants = (text: string): string => [...text].filter((ch) => !KEY_VOWELS.has(ch)).join('')

function sharedStart(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

const MAX_WORDS = 12
const MAX_WINDOW = 6

interface Window {
  key: string
  /** The words as written, joined. */
  text: string
  /** Ends with the last word said: only such a run can be the answer. */
  last: boolean
}

/** Every run of up to six neighbouring words among the last twelve: “ма ши на” → “машина”. */
function windows(lang: Lang, kind: ItemKind, words: readonly string[]): Window[] {
  const shortFillers = SHORT_FILLERS[lang]
  const found: Window[] = []
  const limited = words.slice(-MAX_WORDS)
  for (let start = 0; start < limited.length; start++) {
    for (let end = start + 1; end <= Math.min(limited.length, start + MAX_WINDOW); end++) {
      const run = limited.slice(start, end)
      if (run.every((word) => shortFillers.has(squeeze(word)))) continue
      const text = run.join('')
      found.push({ key: keyOf(lang, text, kind), text, last: end === limited.length })
    }
  }
  return found
}

const unique = (keys: readonly string[]): string[] => [...new Set(keys)]

/**
 * “маши” for МАШИНА: single-utterance recognition ends at the first pause,
 * so a word read syllable by syllable arrives cut short. Not when the
 * fragment is a card of its own (PILL for PILLOW).
 */
function isFragment(candidate: string, key: string, taken: ReadonlySet<string>): boolean {
  return candidate.length > 0 && candidate.length < key.length && key.startsWith(candidate) && !taken.has(candidate)
}

function bestScore(lang: Lang, kind: ItemKind, entry: Entry, candidates: readonly string[], taken: ReadonlySet<string>, exactOnly: boolean): number | null {
  let best: number | null = null
  for (const candidate of candidates) {
    const value = score(lang, kind, entry, candidate, taken)
    if (value === null || (exactOnly && value > 0)) continue
    if (best === null || value < best) best = value
  }
  return best
}

function analyseChunk(lang: Lang, target: string, kind: ItemKind, normalized: string): Analysis {
  const { entries, taken } = catalogue(lang, kind)
  const targetEntry = entries.find((entry) => entry.item === target) ?? entryFor(lang, target, kind)
  const words = tokens(normalized)
  const content = words.filter((word) => !STOP[lang].has(squeeze(word)))
  const hasContent = content.some((word) => !SHORT_FILLERS[lang].has(squeeze(word)))
  let answers: Window[]
  let anywhere: string[]
  let namingCandidates: string[]
  if (hasContent) {
    // The child’s answer comes last: “это слово кот”, “the hospital”, “die Katzen”.
    const runs = windows(lang, kind, content)
    answers = runs.filter((run) => run.last)
    anywhere = unique(runs.map((run) => run.key))
    namingCandidates = unique(answers.map((run) => run.key))
  } else {
    // Only fillers (“das”, “ну”, “it”): the last one may still be the card itself.
    const spoken = words.filter((word) => !HESITATIONS[lang].has(squeeze(word)))
    const last = spoken.at(-1) ?? words.at(-1) ?? ''
    answers = [{ key: keyOf(lang, last, kind), text: last, last: true }]
    anywhere = unique(words.map((word) => keyOf(lang, word, kind)))
    // A bare “ну” or “um” is a pause, not a misread НУ: only real words name another card.
    namingCandidates = spoken.length ? [answers[0].key] : []
  }
  const answerKeys = unique(answers.map((run) => run.key))
  const locale = SPEECH_LOCALE[lang]
  const literal = new Set(answers.map((run) => run.text))
  const other = (): string | null => {
    let found: string | null = null
    let foundScore = Infinity
    for (const entry of entries) {
      if (entry.item === target || entry.key === targetEntry.key) continue
      // Twins by sound (ЛЁ, ЛО): the one written exactly as heard wins.
      const spelled = entry.item.toLocaleLowerCase(locale)
      const exact = literal.has(spelled) && !HESITATIONS[lang].has(squeeze(spelled))
      const value = exact ? -1 : bestScore(lang, kind, entry, namingCandidates, taken, !hasContent)
      if (value !== null && value < foundScore) {
        found = entry.item
        foundScore = value
      }
    }
    return found
  }
  if (bestScore(lang, kind, targetEntry, answerKeys, taken, false) !== null) return { outcome: 'correct', other }
  // The card inside other talk (“посмотри на карточку” for НА) is no answer yet.
  if (bestScore(lang, kind, targetEntry, anywhere, taken, false) !== null) return { outcome: 'retry', other }
  if (kind === 'word' && answerKeys.some((key) => isFragment(key, targetEntry.key, taken))) return { outcome: 'retry', other }
  return { outcome: hasContent || other() !== null ? 'wrong' : 'silence', other }
}

// ------------------------------------------------------------------ judge

/**
 * Lenient but fair: correct when any alternative ends with the card; wrong
 * when something else was clearly said; unclear (asked again, no heart
 * lost) when the card was heard only inside other talk or cut short, when
 * a letter card got words but no letter, or when nothing usable came
 * through (silence, punctuation, only “ну” or “um”).
 */
export function judge(lang: Lang, target: string, kind: ItemKind, transcripts: readonly string[]): Judgement {
  const card = String(target ?? '').trim().normalize('NFC').toLocaleUpperCase(SPEECH_LOCALE[lang])
  let best: { normalized: string; analysis: Analysis } | null = null
  for (const transcript of transcripts ?? []) {
    const normalized = normalizeTranscript(lang, transcript)
    if (!normalized) continue
    const analysis = kind === 'letter' ? analyseLetter(lang, card, normalized) : analyseChunk(lang, card, kind, normalized)
    if (analysis.outcome === 'correct') return { verdict: 'correct', heard: display(normalized), other: null }
    if (!best || OUTCOME_RANK[analysis.outcome] < OUTCOME_RANK[best.analysis.outcome]) best = { normalized, analysis }
  }
  if (!best || best.analysis.outcome === 'silence') return { verdict: 'unclear', heard: '', other: null }
  if (best.analysis.outcome === 'wrong') return { verdict: 'wrong', heard: display(best.normalized), other: best.analysis.other() }
  return { verdict: 'unclear', heard: display(best.normalized), other: null }
}
