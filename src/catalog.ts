import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-ext-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './catalog.css'
import { puppy } from './sobachka-art.ts'
import { PUPPY_COPY } from './sobachka-copy.ts'
import { bindQuietLang } from './lang-ui.ts'
import { CATALOG_COPY, type Lang } from './languages.ts'

function setText(selector: string, value: string): void {
  const node = document.querySelector(selector)
  if (node) node.textContent = value
}

function applyCatalog(lang: Lang): void {
  const copy = CATALOG_COPY[lang]
  setText('[data-i18n="sobachka-name"]', PUPPY_COPY[lang].name)
  setText('[data-i18n="sobachka-blurb"]', PUPPY_COPY[lang].tagline)
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

const puppyArt = document.querySelector('#catalog-puppy')
if (puppyArt) puppyArt.innerHTML = puppy()
bindQuietLang(applyCatalog)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
