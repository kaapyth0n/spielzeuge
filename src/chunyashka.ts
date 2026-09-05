import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-ext-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './chunyashka.css'
import { renderChip, renderDoll } from './chunyashka-doll.ts'
import {
  DEFAULT_OUTFIT,
  GROUP_SLOTS,
  LIKES_ARE_LOCAL,
  SLOT_IDS,
  likeTarget,
  withItem,
  type Group,
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
  setText('[data-group="hair"]', copy.hair)
  setText('[data-group="face"]', copy.face)
  setText('[data-group="clothes"]', copy.clothes)
  setText('[data-group="shoes"]', copy.shoes)
  setText('[data-slot="hair"]', copy.style)
  setText('[data-slot="color"]', copy.color)
  setText('[data-slot="eyes"]', copy.eyes)
  setText('[data-slot="brows"]', copy.brows)
  setText('[data-slot="smile"]', copy.smile)
  setText('[data-slot="cheeks"]', copy.cheeks)

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

function isGroup(value: string | undefined): value is Group {
  return value === 'hair' || value === 'face' || value === 'clothes' || value === 'shoes'
}

function isSlot(value: string | undefined): value is Slot {
  return Boolean(value && value in SLOT_IDS)
}

const stage = must('#doll-stage')
const chips = must('#chips')
const photo = must('#photo')
const photoStage = must('#photo-stage')
const likeCount = must('#like-count')
const subs = must('#subs')

let outfit: Outfit = { ...DEFAULT_OUTFIT }
let group: Group = 'clothes'
let slot: Slot = 'clothes'
let likeTimer: number | null = null

function paintDoll(): void {
  stage.innerHTML = renderDoll(outfit)
}

function paintSubs(): void {
  const options = GROUP_SLOTS[group]
  subs.hidden = options.length < 2
  for (const button of subs.querySelectorAll<HTMLButtonElement>('[data-slot]')) {
    const id = button.dataset.slot
    button.hidden = !options.includes(id as Slot)
    button.classList.toggle('is-on', id === slot)
  }
}

function paintChips(): void {
  const ids = SLOT_IDS[slot]
  chips.innerHTML = ids
    .map(
      (id) =>
        `<button type="button" class="chip${id === outfit[slot] ? ' is-on' : ''}" data-item="${id}">${renderChip(slot, id, outfit)}</button>`,
    )
    .join('')
}

function paint(): void {
  paintDoll()
  paintSubs()
  paintChips()
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-group]')) {
    button.classList.toggle('is-on', button.dataset.group === group)
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
  const target = likeTarget(outfit)
  photoStage.innerHTML = renderDoll(outfit)
  likeCount.textContent = '0'
  photo.hidden = false
  photo.classList.add('is-open')
  document.body.classList.add('is-photo')
  spawnHearts()
  stopLikes()
  const step = Math.max(1, Math.ceil(target / 28))
  let n = 0
  likeTimer = window.setInterval(() => {
    n += step
    if (n >= target) {
      likeCount.textContent = String(target)
      stopLikes()
      return
    }
    likeCount.textContent = String(n)
  }, 40)
}

paint()
bindQuietLang(applyCopy)

document.querySelector('#groups')?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-group]')
  if (!isGroup(button?.dataset.group)) return
  group = button.dataset.group
  slot = GROUP_SLOTS[group][0] ?? 'clothes'
  paint()
})

subs.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]')
  if (!isSlot(button?.dataset.slot)) return
  if (!GROUP_SLOTS[group].includes(button.dataset.slot)) return
  slot = button.dataset.slot
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
