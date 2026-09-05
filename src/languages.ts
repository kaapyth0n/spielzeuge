export const LANGS = ['ru', 'de', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'ru'
/** Shared across catalog + every toy. */
export const STORAGE_KEY = 'spielzeuge.lang'
/** Legacy Kuckuck-only key — migrated once into STORAGE_KEY. */
const LEGACY_STORAGE_KEY = 'spielzeuge.kuckuck.lang'

export const LANG_LABEL: Record<Lang, string> = {
  ru: 'русский',
  de: 'Deutsch',
  en: 'English',
}

export const PARENT_COPY: Record<Lang, { hint: string; close: string; home: string }> = {
  ru: {
    hint: 'Коснитесь лампы, чтобы сменить язык. Удерживайте — чтобы выбрать сразу.',
    close: 'Закрыть',
    home: 'Все игрушки',
  },
  de: {
    hint: 'Lampe antippen, um die Sprache zu wechseln. Gedrückt halten zum Auswählen.',
    close: 'Schließen',
    home: 'Alle Spiele',
  },
  en: {
    hint: 'Tap the lamp to change language. Hold it to pick one.',
    close: 'Close',
    home: 'All toys',
  },
}

export const CATALOG_COPY: Record<
  Lang,
  {
    documentTitle: string
    description: string
    kicker: string
    title: string
    sub: string
    navLabel: string
    kuckuckName: string
    kuckuckBlurb: string
    chunyashkaName: string
    chunyashkaBlurb: string
    langAria: string
    sheetTitle: string
    sheetHint: string
  }
> = {
  ru: {
    documentTitle: 'Spielzeuge',
    description: 'Spielzeuge — спокойные игрушки для маленьких рук. Выбери игру.',
    kicker: 'Spielzeuge',
    title: 'Выбери игру',
    sub: 'Спокойные игрушки. Место для воображения.',
    navLabel: 'Игры',
    kuckuckName: 'Kuckuck',
    kuckuckBlurb: 'Дверь стучит. Открой — там гость.',
    chunyashkaName: 'Чуняшка',
    chunyashkaBlurb: 'Одень. Потом сердечки.',
    langAria: 'Язык',
    sheetTitle: 'Язык',
    sheetHint: 'Удерживайте кнопку языка, чтобы выбрать сразу.',
  },
  de: {
    documentTitle: 'Spielzeuge',
    description: 'Spielzeuge — ruhige Spiele für kleine Hände. Wähle ein Spiel.',
    kicker: 'Spielzeuge',
    title: 'Wähle ein Spiel',
    sub: 'Ruhige Spiele. Raum für Fantasie.',
    navLabel: 'Spiele',
    kuckuckName: 'Kuckuck',
    kuckuckBlurb: 'Die Tür klopft. Öffne sie — ein Gast wartet.',
    chunyashkaName: 'Чуняшка',
    chunyashkaBlurb: 'Anziehen. Dann Herzen.',
    langAria: 'Sprache',
    sheetTitle: 'Sprache',
    sheetHint: 'Sprache gedrückt halten, um direkt zu wählen.',
  },
  en: {
    documentTitle: 'Spielzeuge',
    description: 'Spielzeuge — quiet toys for small hands. Pick a game.',
    kicker: 'Spielzeuge',
    title: 'Pick a toy',
    sub: 'Calm toys. Room for imagination.',
    navLabel: 'Toys',
    kuckuckName: 'Kuckuck',
    kuckuckBlurb: 'The door knocks. Open it — a guest is there.',
    chunyashkaName: 'Chunyashka',
    chunyashkaBlurb: 'Dress up. Then hearts.',
    langAria: 'Language',
    sheetTitle: 'Language',
    sheetHint: 'Hold the language button to pick one.',
  },
}

export const CHUNYASHKA_COPY: Record<
  Lang,
  {
    documentTitle: string
    description: string
    back: string
    hair: string
    face: string
    clothes: string
    shoes: string
    style: string
    color: string
    eyes: string
    brows: string
    smile: string
    cheeks: string
    ready: string
    again: string
    likes: string
    langAria: string
    sheetTitle: string
    sheetHint: string
  }
> = {
  ru: {
    documentTitle: 'Чуняшка',
    description: 'Чуняшка — детская одевалка. Всегда в одежде. Лайки только в игре.',
    back: '← Spielzeuge',
    hair: 'Волосы',
    face: 'Лицо',
    clothes: 'Одежда',
    shoes: 'Обувь',
    style: 'Фасон',
    color: 'Цвет',
    eyes: 'Глаза',
    brows: 'Брови',
    smile: 'Улыбка',
    cheeks: 'Щёки',
    ready: 'Готово',
    again: 'Ещё раз',
    likes: 'Сердечки',
    langAria: 'Язык',
    sheetTitle: 'Язык',
    sheetHint: 'Удерживайте кнопку языка, чтобы выбрать сразу.',
  },
  de: {
    documentTitle: 'Чуняшка',
    description: 'Чуняшка — Anziehspiel. Immer angezogen. Herzen nur im Spiel.',
    back: '← Spielzeuge',
    hair: 'Haare',
    face: 'Gesicht',
    clothes: 'Kleidung',
    shoes: 'Schuhe',
    style: 'Schnitt',
    color: 'Farbe',
    eyes: 'Augen',
    brows: 'Brauen',
    smile: 'Lächeln',
    cheeks: 'Wangen',
    ready: 'Fertig',
    again: 'Nochmal',
    likes: 'Herzen',
    langAria: 'Sprache',
    sheetTitle: 'Sprache',
    sheetHint: 'Sprache gedrückt halten, um direkt zu wählen.',
  },
  en: {
    documentTitle: 'Chunyashka',
    description: 'Chunyashka — a dress-up toy. Always clothed. Hearts stay in the game.',
    back: '← Spielzeuge',
    hair: 'Hair',
    face: 'Face',
    clothes: 'Clothes',
    shoes: 'Shoes',
    style: 'Style',
    color: 'Color',
    eyes: 'Eyes',
    brows: 'Brows',
    smile: 'Smile',
    cheeks: 'Cheeks',
    ready: 'Ready',
    again: 'Again',
    likes: 'Hearts',
    langAria: 'Language',
    sheetTitle: 'Language',
    sheetHint: 'Hold the language button to pick one.',
  },
}

export function nextLang(current: Lang): Lang {
  const index = LANGS.indexOf(current)
  return LANGS[(index + 1) % LANGS.length] ?? 'ru'
}

export const SPEECH_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU',
  de: 'de-DE',
  en: 'en-GB',
}

export function isLang(value: unknown): value is Lang {
  return value === 'ru' || value === 'de' || value === 'en'
}

export function loadLang(): Lang {
  const query = new URLSearchParams(window.location.search).get('lang')
  if (isLang(query)) return query

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLang(stored)) return stored

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (isLang(legacy)) {
      window.localStorage.setItem(STORAGE_KEY, legacy)
      return legacy
    }
  } catch {
    // private mode
  }

  return DEFAULT_LANG
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
    window.localStorage.setItem(LEGACY_STORAGE_KEY, lang)
  } catch {
    // private mode
  }
}
