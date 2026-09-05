import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-ext-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './chunyashka.css'
import { renderChip, renderDoll } from './chunyashka-doll.ts'
import {
  DEFAULT_OUTFIT,
  DRESS_IDS,
  HAIR_IDS,
  LIKES_ARE_LOCAL,
  LIKE_TARGET,
  SHOE_IDS,
  withItem,
  type Outfit,
  type Slot,
} from './chunyashka-state.ts'
import { bindQuietLang } from './lang-ui.ts'
import { CHUNYASHKA_COPY, type Lang } from './languages.ts'

function setText(selector: string, value: string): void {
  const node = document.querySelector(selector)
  if (node) node.textContent = value
}

function applyCopy(lang: Lang): void {
  const copy = CHUNYASHKA_COPY[lang]
  document.title = copy.documentTitle
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', copy.description)
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (apple) apple.setAttribute('content', copy.documentTitle)

  setText('[data-i18n="back"]', copy.back)
  setText('[data-i18n="ready"]', copy.ready)
  setText('[data-i18n="again"]', copy.again)
  setText('[data-i18n="sheet-title"]', copy.sheetTitle)
  setText('[data-i18n="sheet-hint"]', copy.sheetHint)
  setText('[data-slot="hair"]', copy.hair)
  setText('[data-slot="dress"]', copy.dress)
  setText('[data-slot="shoes"]', copy.shoes)

  const langBtn = document.querySelector<HTMLElement>('#lang-toggle')
  if (langBtn) langBtn.setAttribute('aria-label', copy.langAria)
  const likes = document.querySelector('#like-label')
  if (likes) likes.setAttribute('aria-label', copy.likes)
}

function must(id: string): HTMLElement {
  const node = document.querySelector(id)
  if (!(node instanceof HTMLElement)) throw new Error(`missing ${id}`)
  return node
}

const stage = must('#doll-stage')
const chips = must('#chips')
const photo = must('#photo')
const photoStage = must('#photo-stage')
const likeCount = must('#like-count')

let outfit: Outfit = { ...DEFAULT_OUTFIT }
let slot: Slot = 'hair'
let likeTimer: number | null = null

function paintDoll(): void {
  stage.innerHTML = renderDoll(outfit)
}

function paintChips(): void {
  const ids = slot === 'hair' ? HAIR_IDS : slot === 'dress' ? DRESS_IDS : SHOE_IDS
  const selected = outfit[slot === 'shoes' ? 'shoes' : slot]
  chips.innerHTML = ids
    .map(
      (id) =>
        `<button type="button" class="chip${id === selected ? ' is-on' : ''}" data-item="${id}">${renderChip(slot, id)}</button>`,
    )
    .join('')
}

function paint(): void {
  paintDoll()
  paintChips()
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-slot]')) {
    button.classList.toggle('is-on', button.dataset.slot === slot)
  }
}

function stopLikes(): void {
  if (likeTimer !== null) {
    window.clearInterval(likeTimer)
    likeTimer = null
  }
}

function closePhoto(): void {
  stopLikes()
  photo.hidden = true
  photo.classList.remove('is-open')
  document.body.classList.remove('is-photo')
}

function spawnHearts(): void {
  const rain = document.querySelector('#heart-rain')
  if (!rain) return
  rain.innerHTML = ''
  for (let i = 0; i < 12; i += 1) {
    const heart = document.createElement('span')
    heart.className = 'heart'
    heart.textContent = '♥'
    heart.style.left = `${8 + Math.random() * 84}%`
    heart.style.animationDelay = `${Math.random() * 0.8}s`
    rain.append(heart)
  }
}

function openPhoto(): void {
  if (!LIKES_ARE_LOCAL) return
  photoStage.innerHTML = renderDoll(outfit)
  likeCount.textContent = '0'
  photo.hidden = false
  photo.classList.add('is-open')
  document.body.classList.add('is-photo')
  spawnHearts()
  stopLikes()
  let n = 0
  likeTimer = window.setInterval(() => {
    n += 4
    if (n >= LIKE_TARGET) {
      n = LIKE_TARGET
      likeCount.textContent = String(n)
      stopLikes()
      return
    }
    likeCount.textContent = String(n)
  }, 40)
}

paint()
bindQuietLang(applyCopy)

document.querySelector('#slots')?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]')
  const next = button?.dataset.slot
  if (next !== 'hair' && next !== 'dress' && next !== 'shoes') return
  slot = next
  paint()
})

chips.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-item]')
  const id = button?.dataset.item
  if (!id) return
  outfit = withItem(outfit, slot, id)
  paint()
})

document.querySelector('#ready')?.addEventListener('click', () => openPhoto())
document.querySelector('#again')?.addEventListener('click', () => closePhoto())
photo.addEventListener('click', (event) => {
  if (event.target === photo) closePhoto()
})

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
