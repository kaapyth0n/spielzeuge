import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-ext-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './catalog.css'
import {
  CATALOG_COPY,
  CHUNYASHKA_COPY,
  LANG_LABEL,
  LANGS,
  loadLang,
  nextLang,
  saveLang,
  type Lang,
} from './languages.ts'

const HOLD_MS = 720

type PageKind = 'catalog' | 'chunyashka'

function pageKind(): PageKind {
  const path = window.location.pathname
  if (path.includes('/chunyashka')) return 'chunyashka'
  return 'catalog'
}

function applyCatalog(lang: Lang): void {
  const copy = CATALOG_COPY[lang]
  document.documentElement.lang = lang
  document.title = copy.documentTitle
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', copy.description)

  setText('[data-i18n="kicker"]', copy.kicker)
  setText('[data-i18n="title"]', copy.title)
  setText('[data-i18n="sub"]', copy.sub)
  setText('[data-i18n="kuckuck-name"]', copy.kuckuckName)
  setText('[data-i18n="kuckuck-blurb"]', copy.kuckuckBlurb)
  setText('[data-i18n="chunyashka-name"]', copy.chunyashkaName)
  setText('[data-i18n="chunyashka-blurb"]', copy.chunyashkaBlurb)
  setText('[data-i18n="sheet-title"]', copy.sheetTitle)
  setText('[data-i18n="sheet-hint"]', copy.sheetHint)

  const nav = document.querySelector('.catalog-grid')
  if (nav) nav.setAttribute('aria-label', copy.navLabel)

  const langBtn = document.querySelector<HTMLElement>('#lang-toggle')
  if (langBtn) langBtn.setAttribute('aria-label', copy.langAria)
}

function applyChunyashka(lang: Lang): void {
  const copy = CHUNYASHKA_COPY[lang]
  document.documentElement.lang = lang
  document.title = copy.documentTitle
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', copy.description)
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (apple) apple.setAttribute('content', copy.documentTitle)

  setText('[data-i18n="back"]', copy.back)
  setText('[data-i18n="kicker"]', copy.kicker)
  setText('[data-i18n="title"]', copy.title)
  setText('[data-i18n="text"]', copy.text)
  setText('[data-i18n="cta"]', copy.cta)
  setText('[data-i18n="sheet-title"]', copy.sheetTitle)
  setText('[data-i18n="sheet-hint"]', copy.sheetHint)

  const langBtn = document.querySelector<HTMLElement>('#lang-toggle')
  if (langBtn) langBtn.setAttribute('aria-label', copy.langAria)
}

function setText(selector: string, value: string): void {
  const node = document.querySelector(selector)
  if (node) node.textContent = value
}

function markLangButtons(lang: Lang): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    const value = button.dataset.lang
    button.classList.toggle('is-active', value === lang)
    button.setAttribute('aria-pressed', value === lang ? 'true' : 'false')
  }
}

function setLang(lang: Lang, kind: PageKind): void {
  saveLang(lang)
  if (kind === 'catalog') applyCatalog(lang)
  else applyChunyashka(lang)
  markLangButtons(lang)
  document.body.dataset.lang = lang
}

function openSheet(): void {
  const sheet = document.querySelector<HTMLElement>('#lang-sheet')
  if (!sheet) return
  sheet.hidden = false
  sheet.classList.add('is-open')
}

function closeSheet(): void {
  const sheet = document.querySelector<HTMLElement>('#lang-sheet')
  if (!sheet) return
  sheet.classList.remove('is-open')
  sheet.hidden = true
}

function bindLanguageUi(kind: PageKind): void {
  let lang = loadLang()
  setLang(lang, kind)

  const toggle = document.querySelector<HTMLElement>('#lang-toggle')
  const sheet = document.querySelector<HTMLElement>('#lang-sheet')
  if (!toggle || !sheet) return

  let holdTimer: number | null = null
  let held = false

  const clearHold = () => {
    if (holdTimer !== null) {
      window.clearTimeout(holdTimer)
      holdTimer = null
    }
  }

  toggle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    held = false
    clearHold()
    holdTimer = window.setTimeout(() => {
      held = true
      openSheet()
    }, HOLD_MS)
  })

  for (const eventName of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    toggle.addEventListener(eventName, () => clearHold())
  }

  toggle.addEventListener('click', (event) => {
    event.preventDefault()
    clearHold()
    if (held) {
      held = false
      return
    }
    if (!sheet.hidden) {
      closeSheet()
      return
    }
    lang = nextLang(lang)
    setLang(lang, kind)
  })

  for (const button of sheet.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    button.addEventListener('click', () => {
      const next = button.dataset.lang
      if (!next || (next !== 'ru' && next !== 'de' && next !== 'en')) return
      lang = next
      setLang(lang, kind)
      closeSheet()
    })
  }

  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) closeSheet()
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet()
    if (event.key === 'l' || event.key === 'L') {
      lang = nextLang(lang)
      setLang(lang, kind)
    }
    if (event.key === '1') {
      lang = 'ru'
      setLang(lang, kind)
    }
    if (event.key === '2') {
      lang = 'de'
      setLang(lang, kind)
    }
    if (event.key === '3') {
      lang = 'en'
      setLang(lang, kind)
    }
  })

  // Keep labels in buttons as native language names.
  for (const button of sheet.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    const value = button.dataset.lang
    if (value === 'ru' || value === 'de' || value === 'en') {
      button.textContent = LANG_LABEL[value]
    }
  }
  void LANGS
}

const kind = pageKind()
bindLanguageUi(kind)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
