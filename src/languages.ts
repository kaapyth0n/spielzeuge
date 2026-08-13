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
    hint: 'Удерживайте лампу, чтобы сменить язык',
    close: 'Закрыть',
  },
  de: {
    hint: 'Lampe gedrückt halten, um die Sprache zu ändern',
    close: 'Schließen',
  },
  en: {
    hint: 'Hold the lamp to change language',
    close: 'Close',
  },
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
