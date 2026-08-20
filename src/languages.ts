export const LANGS = ['ru', 'de', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'ru'
export const STORAGE_KEY = 'spielzeuge.kuckuck.lang'

export const LANG_LABEL: Record<Lang, string> = {
  ru: 'русский',
  de: 'Deutsch',
  en: 'English',
}

export const PARENT_COPY: Record<Lang, { hint: string; close: string }> = {
  ru: {
    hint: 'Коснитесь лампы, чтобы сменить язык. Удерживайте — чтобы выбрать сразу.',
    close: 'Закрыть',
  },
  de: {
    hint: 'Lampe antippen, um die Sprache zu wechseln. Gedrückt halten zum Auswählen.',
    close: 'Schließen',
  },
  en: {
    hint: 'Tap the lamp to change language. Hold it to pick one.',
    close: 'Close',
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
  } catch {
    // private mode
  }

  return DEFAULT_LANG
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // private mode
  }
}
