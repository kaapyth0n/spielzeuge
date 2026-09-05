import { LANG_LABEL, loadLang, nextLang, saveLang, type Lang } from './languages.ts'

const HOLD_MS = 720

export function bindQuietLang(apply: (lang: Lang) => void): void {
  let lang = loadLang()

  const setLang = (next: Lang) => {
    lang = next
    saveLang(lang)
    document.documentElement.lang = lang
    document.body.dataset.lang = lang
    apply(lang)
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
      const active = button.dataset.lang === lang
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', active ? 'true' : 'false')
    }
  }

  setLang(lang)

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

  const openSheet = () => {
    sheet.hidden = false
    sheet.classList.add('is-open')
  }

  const closeSheet = () => {
    sheet.classList.remove('is-open')
    sheet.hidden = true
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
    setLang(nextLang(lang))
  })

  for (const button of sheet.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    const value = button.dataset.lang
    if (value === 'ru' || value === 'de' || value === 'en') {
      button.textContent = LANG_LABEL[value]
    }
    button.addEventListener('click', () => {
      const next = button.dataset.lang
      if (next !== 'ru' && next !== 'de' && next !== 'en') return
      setLang(next)
      closeSheet()
    })
  }

  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) closeSheet()
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet()
    if (event.key === 'l' || event.key === 'L') setLang(nextLang(lang))
    if (event.key === '1') setLang('ru')
    if (event.key === '2') setLang('de')
    if (event.key === '3') setLang('en')
  })
}
