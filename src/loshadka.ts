/**
 * Лошадка — Matryona's pony workshop.
 *
 * The workshop is her drawing: a frame of cells around a big picture. Manes on the left,
 * clips on top, tails on the right, the pony's colour at the bottom; the corners hold home,
 * sound + language, the stable and the golden Готово star. A finished pony earns three stars
 * (they fly into the slots in the upper right, where she drew them), gets a name, opens a
 * gift and moves into the stable meadow.
 *
 * Each screen renders its skeleton once; picks only update the stage pony, the pressed cells,
 * the star slots and the Готово button, so the strips keep their scroll positions.
 */
import '@fontsource/balsamiq-sans/cyrillic-400.css'
import '@fontsource/balsamiq-sans/latin-400.css'
import '@fontsource/balsamiq-sans/cyrillic-700.css'
import '@fontsource/balsamiq-sans/latin-700.css'
import '@fontsource/andika/cyrillic-400.css'
import '@fontsource/andika/latin-400.css'
import './loshadka-horse.css'
import './loshadka-scenes.css'
import './loshadka.css'
import { LANGS, isLang, loadLang, saveLang, type Lang } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { LOSHADKA_COPY, WELCOME_CUES, pronounce } from './loshadka-copy.ts'
import { GIFTS, PONY_NAMES, SIDES, findItem, type GiftRef, type Item, type ItemKind, type Look, type Side } from './loshadka-items.ts'
import { HORSE_GROUND_Y, HORSE_VIEWBOX, horseSvg, itemIcon } from './loshadka-art.ts'
import {
  MEADOW_GROUND,
  MOUND_TOP_Y,
  MOUND_VIEWBOX,
  backgroundIcon,
  backgroundSvg,
  giftSvg,
  meadowSvg,
  moundSvg,
  starSvg,
  uiIcon,
} from './loshadka-scenes.ts'
import { LoshadkaSfx, type LoshadkaEffect } from './loshadka-sfx.ts'
import {
  LOSHADKA_KEY,
  availableItems,
  defaultSave,
  describe,
  editPony,
  finish,
  finishedUnchanged as isFinishedUnchanged,
  giftKey,
  hasUnfinishedWork,
  isComplete,
  isNew,
  lockedGifts,
  markSeen,
  missingSides,
  nameChoices,
  nextBackground as nextBackgroundOf,
  nextGift,
  openedGifts,
  release,
  rename,
  reopenWorkshop,
  restoreSave,
  serialize,
  startNew,
  wear,
  type FinishResult,
  type LoshadkaSave,
  type Pony,
} from './loshadka-state.ts'

/* ─────────────────────────── state ─────────────────────────── */

const root = document.querySelector<HTMLElement>('#loshadka-app')!
let save: LoshadkaSave = defaultSave()
/** False while the device refuses storage: the game plays on and shows a quiet note. */
let persistent = true
let lang: Lang = loadLang()
let copy = LOSHADKA_COPY[lang]

/**
 * Read the stored game (page load, a back/forward-cache restore, another tab saving).
 * A page kept in memory must never write its old save over newer progress.
 */
function loadStored(): void {
  try {
    save = restoreSave(localStorage.getItem(LOSHADKA_KEY))
    persistent = true
  } catch {
    persistent = false
  }
}
loadStored()
const debug = new URLSearchParams(location.search).has('debug')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const narration = new PuppyNarration(() => ({ lang, enabled: save.sound }), pronounce)
const sfx = new LoshadkaSfx(() => save.sound)

type Screen = 'workshop' | 'stable'
let screen: Screen = 'workshop'

function persist(): void {
  try {
    localStorage.setItem(LOSHADKA_KEY, serialize(save))
    persistent = true
  } catch {
    persistent = false
  }
  for (const note of root.querySelectorAll<HTMLElement>('.lh-note')) note.hidden = persistent
}

/* ─────────────────────────── timers ─────────────────────────── */

const timers = new Set<number>()

/** A timer that dies with the screen, the page and BFCache restores. */
function later(ms: number, fn: () => void): number {
  const id = window.setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
  return id
}

function cancel(id: number | null | undefined): void {
  if (id == null) return
  window.clearTimeout(id)
  timers.delete(id)
}

function clearTimers(): void {
  timers.forEach((id) => window.clearTimeout(id))
  timers.clear()
}

/* ─────────────────────────── helpers ─────────────────────────── */

const esc = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const q = <T extends Element = HTMLElement>(selector: string, scope: ParentNode = root): T | null =>
  scope.querySelector<T>(selector)

const rand = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))

/** Item display name in the current language. */
function itemName(kind: ItemKind, id: string): string {
  return findItem(kind, id)?.name[lang] ?? ''
}

function ponyName(pony: Pony): string {
  return PONY_NAMES[pony.name]?.[lang] ?? copy.name
}

function ponyById(id: string | null): Pony | undefined {
  return id ? save.ponies.find((pony) => pony.id === id) : undefined
}

/** Delayed parts of a tap's answer (the neigh after a spoken name): the next tap cancels them. */
const echoes = new Set<number>()

function echo(ms: number, fn: () => void): void {
  const id = later(ms, () => {
    echoes.delete(id)
    fn()
  })
  echoes.add(id)
}

/**
 * The first visit's welcome was refused (iOS speaks only after a tap): the first tap of the
 * sitting tells it instead of its own line, with the glowing rows.
 */
let welcomePending = false

/** Every tap that speaks: primes speech and audio inside the gesture (iOS) and stops stale answers. */
function gesture(label: string): void {
  echoes.forEach((id) => cancel(id))
  echoes.clear()
  stopWelcomeTour()
  sfx.unlock()
  if (!save.sound) wobbleSound()
  if (welcomePending) {
    welcomePending = false
    save.welcomed = true
    persist()
    narration.begin(copy.welcome)
    welcomeGlow()
    return
  }
  narration.begin(label)
}

let wobbleAt = 0

/** Muted: the sound button wiggles when a tap would have spoken, so a grown-up sees why it is quiet. */
function wobbleSound(): void {
  const now = performance.now()
  if (now - wobbleAt < 2500) return
  wobbleAt = now
  root.querySelectorAll('.lh-sound').forEach((button) => bounce(button, 'is-shake', 600))
}

function say(...texts: string[]): void {
  narration.announce(texts)
}

/** The part of the horse art a kind fills in (for the pop-in). */
const PART: Record<Exclude<ItemKind, 'background'>, string> = {
  mane: 'mane',
  clip: 'clip',
  tail: 'tail',
  color: 'body',
  magic: '',
}

/** Wrapping-paper colour of the gift boxes, by kind. */
const GIFT_PAPER: Record<ItemKind, string> = {
  mane: '#ff9a62',
  clip: '#7cc6ff',
  tail: '#b48cff',
  color: '#8fd36e',
  magic: '#ffd84d',
  background: '#ff6f9f',
}

/** The draft was finished and nothing has changed since: its three stars sit in the slots. */
function finishedUnchanged(): boolean {
  return isFinishedUnchanged(save)
}

/**
 * A finished pony that has not changed since has moved into the stable: whenever the workshop
 * opens afresh (page load, back from the stable, a BFCache restore) the stage gets a new sketch,
 * so changing something never quietly edits a stable pony. Only «Ещё наряжать» and «Наряжать»
 * keep a finished pony on the stage.
 */
function freshSketchIfFinished(): void {
  const next = reopenWorkshop(save)
  if (next === save) return
  save = next
  persist()
  allSetSaid = false
}

function readyToFinish(): boolean {
  return isComplete(save.draft.look) && !finishedUnchanged()
}

function isWorn(kind: ItemKind, id: string): boolean {
  const look = save.draft.look
  if (kind === 'magic') return id === 'horn' ? look.horn : look.wings
  if (kind === 'background') return save.background === id
  return look[kind] === id
}

/** The stage pony's voice: an edited pony keeps its own neigh. */
function stageVoice(): number {
  return ponyById(save.draft.editing)?.name ?? 0
}

function ponyAria(look: Look): string {
  const parts = describe(look, lang)
  return parts.length ? copy.ponyLabel(parts) : copy.sketchLabel
}

/* ─────────────────────────── pony + mound geometry ─────────────────────────── */

/**
 * The mound is drawn at 0.82 × the pony's viewBox units and centred under the hooves
 * (pony x 266). At that scale MOUND_APPLE lies right under HORSE_MUNCH_MOUTH, so the pony
 * really bites the apple. All boxes are percentages of one podium box.
 */
const MOUND_SCALE = 0.82
const HOOF_X = 266
const POD = (() => {
  const W = HORSE_VIEWBOX.width
  const H = HORSE_VIEWBOX.height
  const mw = MOUND_VIEWBOX.width * MOUND_SCALE
  const mh = MOUND_VIEWBOX.height * MOUND_SCALE
  const ml = HOOF_X - (MOUND_VIEWBOX.width / 2) * MOUND_SCALE
  const mt = HORSE_GROUND_Y - MOUND_TOP_Y * MOUND_SCALE
  const left = Math.min(0, ml)
  const width = Math.max(W, ml + mw) - left
  const height = Math.max(H, mt + mh)
  const box = (x: number, y: number, w: number, h: number) =>
    `left:${((x - left) / width) * 100}%;top:${(y / height) * 100}%;width:${(w / width) * 100}%;height:${(h / height) * 100}%`
  return {
    ratio: `${width.toFixed(1)} / ${height.toFixed(1)};--ar:${(width / height).toFixed(4)}`,
    pony: box(0, 0, W, H),
    mound: box(ml, mt, mw, mh),
  }
})()

function podiumMarkup(prefix: string, look: Look, interactive: boolean): string {
  const horse = horseSvg(look, { id: prefix, ghosts: interactive, bold: interactive && ghostsBold })
  if (!interactive) {
    return `<div class="lh-podium" style="aspect-ratio:${POD.ratio}">
      <div class="lh-mound" style="${POD.mound}">${moundSvg(`${prefix}m`)}</div>
      <div class="lh-stage-pony" style="${POD.pony}">${horse}</div>
    </div>`
  }
  return `<div class="lh-podium" style="aspect-ratio:${POD.ratio}">
    <button type="button" class="lh-mound" style="${POD.mound}" data-action="apple" aria-label="${esc(copy.munch)}">${moundSvg(`${prefix}m`)}</button>
    <button type="button" class="lh-stage-pony" style="${POD.pony}" data-action="pony" aria-label="${esc(ponyAria(look))}">${horse}</button>
  </div>`
}

/* ─────────────────────────── small art ─────────────────────────── */

/** The little barn; `prefix` keeps its gradient ids unique (it appears on several cards at once). */
function barnSvg(prefix: string): string {
  return `<svg class="lh-barn-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${prefix}-barn-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#d93a4e"/></linearGradient>
  <linearGradient id="${prefix}-barn-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4fd0"/><stop offset="1" stop-color="#6a3aa8"/></linearGradient></defs>
  <ellipse cx="50" cy="91" rx="40" ry="5" fill="#3a0f2a" opacity=".2"/>
  <path d="M17 47 50 22l33 25v41H17z" fill="url(#${prefix}-barn-wall)"/>
  <path d="M17 60h66M17 74h66" stroke="#b92a40" stroke-width="2" opacity=".45"/>
  <path d="M9 52 50 18l41 34" fill="none" stroke="url(#${prefix}-barn-roof)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 49 50 17.5 88 49" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
  <rect x="35" y="58" width="30" height="30" rx="3" fill="#a82a3d"/>
  <path d="M35 58l30 30M65 58 35 88" stroke="#fff6ee" stroke-width="3.6" stroke-linecap="round"/>
  <rect x="35" y="58" width="30" height="30" rx="3" fill="none" stroke="#fff6ee" stroke-width="3.6"/>
  <circle cx="50" cy="42" r="7" fill="#ffd166" stroke="#fff6ee" stroke-width="3"/>
  <path d="M46 43c2-3 6-3 8 0" stroke="#e8a530" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`
}

/** A tiny four-point sparkle for bursts. */
const SPARKLE = '<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0-10C1 -3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10Z"/></svg>'
const HEART = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M0 44C-7 37-50 12-50-15C-50-34-37-46-23-46C-12-46-4-40 0-31C4-40 12-46 23-46C37-46 50-34 50-15C50 12 7 37 0 44Z"/></svg>'

/* ─────────────────────────── shared chrome ─────────────────────────── */

function soundButton(): string {
  return `<button type="button" class="lh-tool lh-sound" data-action="sound" aria-pressed="${save.sound}" aria-label="${esc(save.sound ? copy.soundOn : copy.soundOff)}">${uiIcon(save.sound ? 'sound' : 'mute')}</button>`
}

function langSelect(): string {
  return `<label class="lh-tool lh-lang"><span class="lh-vh">${esc(copy.language)}</span><select class="lh-lang-select" aria-label="${esc(copy.language)}">${LANGS.map(
    (l) => `<option value="${l}"${l === lang ? ' selected' : ''}>${l.toUpperCase()}</option>`,
  ).join('')}</select></label>`
}

function settingsMarkup(): string {
  return `<div class="lh-settings">${soundButton()}${langSelect()}</div>`
}

function refreshSound(): void {
  for (const button of root.querySelectorAll<HTMLElement>('.lh-sound')) {
    button.setAttribute('aria-pressed', String(save.sound))
    button.setAttribute('aria-label', save.sound ? copy.soundOn : copy.soundOff)
    button.innerHTML = uiIcon(save.sound ? 'sound' : 'mute')
  }
}

function applyDocumentLang(): void {
  document.documentElement.lang = lang
  document.title = copy.documentTitle
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
}

/* ─────────────────────────── workshop: markup ─────────────────────────── */

/** What a strip offers: available items, then up to two wrapped gifts of that side. */
function stripItems(side: Side): { kind: ItemKind; item: Item }[] {
  const list: { kind: ItemKind; item: Item }[] = availableItems(save, side).map((item) => ({ kind: side, item }))
  if (side === 'clip') for (const item of availableItems(save, 'magic')) list.push({ kind: 'magic', item })
  return list
}

function stripGifts(side: Side): GiftRef[] {
  const order = (gift: GiftRef) => GIFTS.findIndex((g) => g.kind === gift.kind && g.id === gift.id)
  const locked = side === 'clip' ? [...lockedGifts(save, 'clip'), ...lockedGifts(save, 'magic')] : lockedGifts(save, side)
  return locked.sort((a, b) => order(a) - order(b)).slice(0, 2)
}

function cellMarkup(kind: ItemKind, item: Item, index: number): string {
  const fresh = isNew(save, kind, item.id)
  const name = item.name[lang]
  const icon = kind === 'background' ? backgroundIcon(item.id, 'ic-bg') : itemIcon(kind, item.id, 'ic')
  return `<button type="button" class="lh-cell${fresh ? ' is-new' : ''}" style="--i:${index}" data-kind="${kind}" data-id="${item.id}" data-index="${index}" aria-pressed="${isWorn(kind, item.id)}" aria-label="${esc(fresh ? `${name}. ${copy.newBadge}` : name)}">
    <span class="lh-cell-art">${icon}</span>${fresh ? `<span class="lh-new" aria-hidden="true">${esc(copy.newBadge)}</span>` : ''}
  </button>`
}

function giftCellMarkup(gift: GiftRef, index: number): string {
  const next = nextGift(save)
  const isNext = !!next && next.kind === gift.kind && next.id === gift.id
  const svg = giftSvg(`gc-${gift.kind}-${gift.id}`, GIFT_PAPER[gift.kind])
  return `<button type="button" class="lh-cell lh-cell-gift${isNext ? ' is-next' : ''}" style="--i:${index}" data-gift="${giftKey(gift.kind, gift.id)}" aria-label="${esc(copy.gift)}">
    <span class="lh-cell-art">${isNext ? svg.replace('class="lh-sc lh-sc-gift"', 'class="lh-sc lh-sc-gift is-wiggle"') : svg}</span>
  </button>`
}

function stripInner(side: Side): string {
  const items = stripItems(side)
  const cells = items.map(({ kind, item }, index) => cellMarkup(kind, item, index)).join('')
  const gifts = stripGifts(side)
    .map((gift, i) => giftCellMarkup(gift, items.length + i))
    .join('')
  return `${cells}${gifts}`
}

/** A strip: its label stays put at the start while the cells scroll past. */
function stripMarkup(side: Side): string {
  return `<section class="lh-strip lh-strip-${side}" data-side="${side}" aria-label="${esc(copy.sides[side])}">
    <span class="lh-tab" aria-hidden="true"><span>${esc(copy.sides[side])}</span></span>
    <div class="lh-scroller" data-scroller="${side}">${stripInner(side)}</div>
  </section>`
}

/** The background the round button shows: a freshly opened one first, then the next in turn. */
function nextBackground(): Item {
  return nextBackgroundOf(save)
}

function stageToolsMarkup(): string {
  const next = nextBackground()
  const fresh = isNew(save, 'background', next.id)
  const label = `${copy.background}: ${next.name[lang]}${fresh ? `. ${copy.newBadge}` : ''}`
  return `<button type="button" class="lh-stool lh-help" data-action="help" aria-label="${esc(copy.help)}">${uiIcon('help')}</button>
    <button type="button" class="lh-stool lh-bgbtn${fresh ? ' is-new' : ''}" data-action="background" aria-label="${esc(label)}">${backgroundIcon(next.id, 'bgi')}${fresh ? `<span class="lh-new" aria-hidden="true">${esc(copy.newBadge)}</span>` : ''}</button>
    <button type="button" class="lh-stool lh-newbtn" data-action="new" aria-label="${esc(copy.newPony)}">${uiIcon('plus')}</button>`
}

function slotsMarkup(filled: number): string {
  return [0, 1, 2]
    .map((i) => `<span class="lh-slot${i < filled ? ' is-filled' : ''}" data-slot="${i}">${starSvg(i < filled, `slot${i}`)}</span>`)
    .join('')
}

function stageMarkup(): string {
  const filled = finishedUnchanged() ? 3 : 0
  return `<div class="lh-stage" data-bg="${save.background}">
    <div class="lh-bg">${backgroundSvg(save.background, 'bg')}</div>
    ${podiumMarkup('st', save.draft.look, true)}
    <div class="lh-stools">${stageToolsMarkup()}</div>
    <div class="lh-slots" role="img" aria-label="${esc(copy.stars(filled))}">${slotsMarkup(filled)}</div>
    <div class="lh-fx" aria-hidden="true"></div>
    <p class="lh-note"${persistent ? ' hidden' : ''}>${esc(copy.noStorage)}</p>
  </div>`
}

function barnMarkup(): string {
  return `<button type="button" class="lh-barn" data-action="stable" aria-label="${esc(`${copy.stable}. ${copy.starsAria(save.stars)}`)}">
    <span class="lh-barn-art">${barnSvg('lh-bc')}</span>
    <span class="lh-badge"><span class="lh-badge-star">${starSvg(true, 'badge')}</span><span class="lh-badge-n">${save.stars}</span></span>
  </button>`
}

function doneMarkup(): string {
  return `<button type="button" class="lh-done" data-action="done" aria-label="${esc(copy.done)}"><span class="lh-done-inner">
    <span class="lh-done-star">${starSvg(true, 'done')}</span>
    <span class="lh-done-label">${esc(copy.done)}</span>
  </span></button>`
}

function workshopMarkup(): string {
  return `<main class="lh-workshop">
    <h1 class="lh-vh">${esc(copy.name)}</h1>
    <div class="lh-frame">
      <div class="lh-corner lh-corner-tl"><a class="lh-tool lh-home" href="/" data-action="home" aria-label="${esc(copy.home)}">${uiIcon('home')}</a></div>
      ${stripMarkup('clip')}
      <div class="lh-corner lh-corner-tr">${settingsMarkup()}</div>
      ${stripMarkup('mane')}
      ${stageMarkup()}
      ${stripMarkup('tail')}
      <div class="lh-corner lh-corner-bl">${barnMarkup()}</div>
      ${stripMarkup('color')}
      <div class="lh-corner lh-corner-br">${doneMarkup()}</div>
    </div>
    <div class="lh-layer" hidden></div>
  </main>`
}

/* ─────────────────────────── workshop: updates ─────────────────────────── */

function renderWorkshop(): void {
  screen = 'workshop'
  root.innerHTML = workshopMarkup()
  root.dataset.screen = 'workshop'
  updateDone()
  requestAnimationFrame(() => {
    if (screen !== 'workshop') return
    boldGhosts()
    revealStrips()
    updateFades()
  })
}

/**
 * Each row shows what matters on arrival: a new gift first, otherwise what the pony wears
 * (the rows of an edited pony, a horn at the far end of the clip row).
 */
function revealStrips(): void {
  for (const scroller of root.querySelectorAll<HTMLElement>('.lh-scroller')) {
    revealCell(scroller.querySelector('.lh-cell.is-new') ?? scroller.querySelector('.lh-cell[aria-pressed="true"]'), 'center')
  }
}

/** Scroll a strip so the cell is in view: centred, or only as far as needed (keyboard focus). */
function revealCell(cell: Element | null, how: 'center' | 'nearest', smooth = false): void {
  const scroller = cell?.closest<HTMLElement>('.lh-scroller')
  if (!cell || !scroller) return
  const vertical = scroller.dataset.scroller === 'mane' || scroller.dataset.scroller === 'tail'
  const s = scroller.getBoundingClientRect()
  const c = cell.getBoundingClientRect()
  const [start, end, cStart, cEnd] = vertical ? [s.top, s.bottom, c.top, c.bottom] : [s.left, s.right, c.left, c.right]
  const pad = 8
  let delta = 0
  if (how === 'center') delta = (cStart + cEnd) / 2 - (start + end) / 2
  else if (cStart < start + pad) delta = cStart - start - pad
  else if (cEnd > end - pad) delta = cEnd - end + pad
  if (Math.abs(delta) < 1) return
  const behavior: ScrollBehavior = smooth && !reducedMotion.matches ? 'smooth' : 'auto'
  scroller.scrollBy(vertical ? { top: delta, behavior } : { left: delta, behavior })
}

/** A pony drawn small (phones) gets bolder ghost lines and bigger arrows. */
let ghostsBold = false

function boldGhosts(): void {
  const holder = q<HTMLElement>('.lh-stage .lh-stage-pony')
  if (!holder?.offsetWidth) return
  const bold = holder.offsetWidth < 300
  if (bold === ghostsBold) return
  ghostsBold = bold
  if (missingSides(save.draft.look).length) renderPony()
}

/** Re-render the strips (new gift, new language) and keep where each one was scrolled to. */
function renderStrips(): void {
  for (const side of SIDES) {
    const scroller = q<HTMLElement>(`.lh-scroller[data-scroller="${side}"]`)
    if (!scroller) continue
    const { scrollLeft, scrollTop } = scroller
    scroller.innerHTML = stripInner(side)
    scroller.scrollLeft = scrollLeft
    scroller.scrollTop = scrollTop
    const strip = scroller.parentElement
    strip?.setAttribute('aria-label', copy.sides[side])
    const tab = strip?.querySelector('.lh-tab span')
    if (tab) tab.textContent = copy.sides[side]
  }
  requestAnimationFrame(updateFades)
}

function updateCells(): void {
  for (const cell of root.querySelectorAll<HTMLElement>('.lh-cell[data-kind]')) {
    cell.setAttribute('aria-pressed', String(isWorn(cell.dataset.kind as ItemKind, cell.dataset.id!)))
  }
}

/** Fade hints at the ends of a strip that can scroll further. */
function updateFades(): void {
  for (const scroller of root.querySelectorAll<HTMLElement>('.lh-scroller')) {
    const vertical = scroller.scrollHeight - scroller.clientHeight > scroller.scrollWidth - scroller.clientWidth
    const pos = vertical ? scroller.scrollTop : scroller.scrollLeft
    const max = vertical ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth
    scroller.classList.toggle('can-back', pos > 2)
    scroller.classList.toggle('can-fwd', pos < max - 2)
  }
}

function stagePonySvg(): SVGSVGElement | null {
  return q<SVGSVGElement>('.lh-stage .lh-stage-pony svg')
}

/** Redraw the stage pony; `fresh` parts pop in with sparkles. */
function renderPony(fresh: string[] = []): void {
  const holder = q<HTMLElement>('.lh-stage .lh-stage-pony')
  if (!holder) return
  holder.innerHTML = horseSvg(save.draft.look, { id: 'st', ghosts: true, bold: ghostsBold })
  holder.setAttribute('aria-label', ponyAria(save.draft.look))
  const svg = holder.querySelector('svg')
  if (!svg || !fresh.length) return
  const parts = fresh.flatMap((part) => [...svg.querySelectorAll<SVGGElement>(`[data-part="${part}"]`)])
  for (const part of parts) part.classList.add('is-fresh')
  later(560, () => parts.forEach((part) => part.classList.remove('is-fresh')))
  const box = unionRect(parts)
  if (box) burstAt(box.left + box.width / 2, box.top + box.height / 2, 9)
}

function unionRect(elements: Element[]): DOMRect | null {
  const rects = elements.map((el) => el.getBoundingClientRect()).filter((r) => r.width || r.height)
  if (!rects.length) return null
  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

function renderSlots(filled = finishedUnchanged() ? 3 : 0): void {
  const slots = q<HTMLElement>('.lh-slots')
  if (!slots) return
  slots.innerHTML = slotsMarkup(filled)
  slots.setAttribute('aria-label', copy.stars(filled))
}

function updateDone(): void {
  const button = q<HTMLElement>('.lh-done')
  if (!button) return
  const ready = readyToFinish() && !celebration
  button.classList.toggle('is-ready', ready)
  button.classList.toggle('is-asleep', !ready)
}

function updateBadge(value = save.stars): void {
  const n = q<HTMLElement>('.lh-badge-n')
  if (n) n.textContent = String(value)
  q<HTMLElement>('.lh-barn')?.setAttribute('aria-label', `${copy.stable}. ${copy.starsAria(save.stars)}`)
}

function updateStageTools(): void {
  const tools = q<HTMLElement>('.lh-stools')
  if (tools) tools.innerHTML = stageToolsMarkup()
}

/** Language change on the workshop: every label, the strips (scroll kept), the open card. */
function refreshWorkshopTexts(): void {
  q('.lh-workshop > h1.lh-vh')!.textContent = copy.name
  q('.lh-home')?.setAttribute('aria-label', copy.home)
  const settings = q<HTMLElement>('.lh-corner-tr')
  if (settings) settings.innerHTML = settingsMarkup()
  renderStrips()
  updateStageTools()
  const done = q<HTMLElement>('.lh-done')
  if (done) {
    done.setAttribute('aria-label', copy.done)
    q('.lh-done-label', done)!.textContent = copy.done
  }
  updateBadge()
  q('.lh-stage .lh-stage-pony')?.setAttribute('aria-label', ponyAria(save.draft.look))
  q('.lh-stage .lh-mound')?.setAttribute('aria-label', copy.munch)
  const note = q('.lh-stage .lh-note')
  if (note) note.textContent = copy.noStorage
  const slots = q('.lh-slots')
  slots?.setAttribute('aria-label', copy.stars(slots.querySelectorAll('.is-filled').length))
  if (celebration) renderLayer()
}

/* ─────────────────────────── effects on the stage ─────────────────────────── */

const MOVE_MS: Record<string, number> = {
  'is-hop': 700,
  'is-prance': 1200,
  'is-neigh': 900,
  'is-snort': 700,
  'is-tapdance': 1000,
  'is-munch': 1600,
  'is-shake-mane': 600,
  'is-shake-tail': 600,
  'is-shake-clip': 600,
  'is-flap': 1260,
}
const moveTimers = new WeakMap<Element, Map<string, number>>()

/** Play a horse move on an svg; the same move again restarts it. */
function move(svg: Element | null, cls: string): void {
  if (!svg) return
  let byClass = moveTimers.get(svg)
  if (!byClass) moveTimers.set(svg, (byClass = new Map()))
  cancel(byClass.get(cls))
  svg.classList.remove(cls)
  void svg.getBoundingClientRect()
  svg.classList.add(cls)
  byClass.set(
    cls,
    later((MOVE_MS[cls] ?? 800) + 60, () => svg.classList.remove(cls)),
  )
}

/** A spot in viewport coordinates → position inside the stage's effect layer. */
function fxPoint(x: number, y: number): { x: number; y: number; fx: HTMLElement } | null {
  const fx = q<HTMLElement>('.lh-stage .lh-fx')
  if (!fx) return null
  const r = fx.getBoundingClientRect()
  return { x: x - r.left, y: y - r.top, fx }
}

/** Sparkles fly out from a point (viewport coordinates). */
function burstAt(x: number, y: number, count = 8, layer?: HTMLElement): void {
  if (reducedMotion.matches) return
  let host: HTMLElement
  let px: number
  let py: number
  if (layer) {
    const r = layer.getBoundingClientRect()
    host = layer
    px = x - r.left
    py = y - r.top
  } else {
    const p = fxPoint(x, y)
    if (!p) return
    host = p.fx
    px = p.x
    py = p.y
  }
  const colors = ['#fff6a8', '#ffffff', '#ffd23f', '#ffb3de', '#b8e3ff']
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    s.className = 'lh-spark'
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3)
    const dist = rand(34, 70)
    s.style.cssText = `left:${px}px;top:${py}px;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--s:${rand(0.6, 1.25)};color:${colors[i % colors.length]};animation-delay:${rand(0, 0.08)}s`
    s.innerHTML = SPARKLE
    host.append(s)
    window.setTimeout(() => s.remove(), 1000)
  }
}

/** A shower of hearts out of the pony (hooray). */
function confetti(): void {
  if (reducedMotion.matches) return
  const pony = stagePonySvg()
  const fx = q<HTMLElement>('.lh-stage .lh-fx')
  if (!pony || !fx) return
  const r = pony.getBoundingClientRect()
  const f = fx.getBoundingClientRect()
  const cx = r.left + r.width * 0.5 - f.left
  const cy = r.top + r.height * 0.45 - f.top
  const colors = ['#ff8fc4', '#ffd23f', '#ffffff', '#ff5c95', '#b8e3ff', '#c8a8ff']
  const spread = Math.max(f.width, f.height)
  for (let i = 0; i < 30; i++) {
    const h = document.createElement('span')
    h.className = 'lh-confetti'
    const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05)
    const dist = rand(0.25, 0.5) * spread
    h.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--fall:${rand(60, 160)}px;--r:${rand(-50, 50)}deg;--s:${rand(0.55, 1.2)};color:${colors[i % colors.length]};animation-delay:${rand(0, 0.25)}s`
    h.innerHTML = HEART
    fx.append(h)
    window.setTimeout(() => h.remove(), 2600)
  }
}

const glowTimers = new Map<Side, number>()

/** The strip of a side glows (where to find it). */
function glowStrip(side: Side, ms = 1700): void {
  const strip = q<HTMLElement>(`.lh-strip-${side}`)
  if (!strip) return
  cancel(glowTimers.get(side))
  strip.classList.remove('is-glow')
  void strip.offsetWidth
  strip.classList.add('is-glow')
  glowTimers.set(
    side,
    later(ms, () => strip.classList.remove('is-glow')),
  )
}

let tourTimers: number[] = []
let touring = false

/**
 * Matryona's explanation: each side glows while the narrator names it («Слева — гривы…»).
 * The cues are measured per language (WELCOME_CUES); the line starts about 0.15 s after the tap.
 */
function welcomeGlow(): void {
  stopWelcomeTour()
  const cues = WELCOME_CUES[lang]
  touring = true
  tourTimers = SIDES.map((side, i) => later((cues[i] + 0.15) * 1000, () => glowStrip(side, (cues[i + 1] - cues[i]) * 1000)))
  tourTimers.push(later((cues[4] + 0.2) * 1000, () => (touring = false)))
}

/** A tap cuts the welcome short: its glows stop with it. */
function stopWelcomeTour(): void {
  if (!touring) return
  touring = false
  tourTimers.forEach((id) => cancel(id))
  tourTimers = []
  for (const side of SIDES) {
    cancel(glowTimers.get(side))
    q(`.lh-strip-${side}`)?.classList.remove('is-glow')
  }
}

function bounce(el: Element | null, cls = 'is-bounce', ms = 520): void {
  if (!el) return
  el.classList.remove(cls)
  void (el as HTMLElement).offsetWidth
  el.classList.add(cls)
  later(ms, () => el.classList.remove(cls))
}

/* ─────────────────────────── workshop: actions ─────────────────────────── */

/** The pony was told it is finished once per draft («Какая красивая лошадка!»). */
let allSetSaid = false
let newArmed = 0
let newArmedAt = 0
let appleBusy = false
/** The pony is eating: taps on it wait until the apple is down. */
let munching = false

/**
 * A two-tap question («Нажми ещё раз») ignores a confirming tap this soon after it was asked:
 * that is the second half of a double tap, not an answer.
 */
const CONFIRM_GUARD_MS = 650
/**
 * A tap this soon after a tap switched screens, at nearly the same spot, is the second half of a
 * double tap (the stable's back button lies over the workshop's home link).
 */
const SWITCH_GUARD_MS = 400
const SWITCH_GUARD_PX = 48
let switchedAt = -Infinity
let switchX = 0
let switchY = 0
/** Where the tap being handled landed. */
let tapX = 0
let tapY = 0

function markSwitch(): void {
  switchedAt = performance.now()
  switchX = tapX
  switchY = tapY
}

const tooSoon = (since: number, ms = CONFIRM_GUARD_MS): boolean => performance.now() - since < ms

function pick(kind: ItemKind, id: string, index: number, cell: HTMLElement): void {
  const name = itemName(kind, id)
  gesture(name)
  bounce(cell)
  if (isNew(save, kind, id)) {
    save = markSeen(save, kind, id)
    cell.classList.remove('is-new')
    cell.querySelector('.lh-new')?.remove()
    cell.setAttribute('aria-label', name)
    persist()
  }
  const effect: LoshadkaEffect = kind === 'background' ? 'background' : kind
  const svg = stagePonySvg()
  const before = save.draft.look
  const next = wear(save, kind, id)
  if (next === save) {
    // The same item again: the pony admires it.
    sfx.play(effect, index)
    if (kind === 'color') move(svg, 'is-hop')
    else if (kind !== 'magic' && kind !== 'background') move(svg, `is-shake-${kind}`)
    return
  }
  save = next
  persist()
  sfx.play(effect, index)
  const turnedOn = kind === 'magic' ? (id === 'horn' ? save.draft.look.horn : save.draft.look.wings) : true
  renderPony(turnedOn ? [kind === 'magic' ? (id === 'horn' ? 'horn' : 'wings') : PART[kind as Side]] : [])
  if (kind === 'magic' && id === 'wings' && turnedOn) move(stagePonySvg(), 'is-flap')
  updateCells()
  renderSlots()
  updateDone()
  if (!isComplete(before) && isComplete(save.draft.look) && !allSetSaid && readyToFinish()) {
    allSetSaid = true
    say(copy.allSet)
    bounce(q('.lh-done-inner'), 'is-cheer', 900)
  }
}

function tapGift(cell: HTMLElement): void {
  gesture(copy.locked)
  sfx.play('gift')
  const svg = cell.querySelector('.lh-sc-gift')
  if (svg && !svg.classList.contains('is-wiggle')) {
    svg.classList.add('is-wiggle')
    later(1400, () => svg.classList.remove('is-wiggle'))
  }
  bounce(cell)
}

function tapDone(): void {
  const missing = missingSides(save.draft.look)
  if (missing.length) {
    gesture(copy.missing[missing[0]])
    sfx.play('nope')
    glowStrip(missing[0], 2200)
    bounce(q('.lh-done-inner'), 'is-nope', 600)
    return
  }
  const seed = Date.now()
  const result: FinishResult = finish(save, seed, seed)
  if (!result.ok) {
    if (result.reason === 'unchanged') {
      gesture(copy.unchanged)
      sfx.play('nope')
      bounce(q('.lh-done-inner'), 'is-nope', 600)
    } else if (result.reason === 'full') {
      gesture(copy.stableFull)
      sfx.play('nope')
      celebration = { step: 'full', ponyId: null, isNew: false, gift: null, seed, page: 0, oldStars: save.stars, named: false }
      renderLayer()
      focusFirst('.lh-card-actions button')
    }
    return
  }
  gesture(copy.done)
  const oldStars = save.stars
  save = result.save
  persist()
  allSetSaid = true
  startCelebration(result, seed, oldStars)
}

let bgTimer = 0
let bgSerial = 0

function tapBackground(): void {
  const next = nextBackground()
  gesture(next.name[lang])
  sfx.play('background', availableItems(save, 'background').indexOf(next))
  save = markSeen(wear(save, 'background', next.id), 'background', next.id)
  persist()
  const stage = q<HTMLElement>('.lh-stage')
  if (stage) {
    stage.dataset.bg = save.background
    // A quick second tap: layers still fading out go at once, so the newest one is always on top.
    cancel(bgTimer)
    const layers = [...stage.querySelectorAll<HTMLElement>(':scope > .lh-bg')]
    const below = layers.pop()
    layers.forEach((layer) => layer.remove())
    const fresh = document.createElement('div')
    fresh.className = 'lh-bg is-entering'
    fresh.innerHTML = backgroundSvg(save.background, `bg${++bgSerial}`)
    if (below) below.after(fresh)
    else stage.prepend(fresh)
    bgTimer = later(reducedMotion.matches ? 0 : 520, () => {
      stage.querySelectorAll(':scope > .lh-bg').forEach((layer) => layer !== fresh && layer.remove())
      fresh.classList.remove('is-entering')
    })
  }
  updateStageTools()
  q<HTMLElement>('.lh-bgbtn')?.focus({ preventScroll: true })
}

function tapNew(): void {
  const button = q<HTMLElement>('.lh-newbtn')
  if (hasUnfinishedWork(save) && !newArmed) {
    gesture(copy.newConfirm)
    sfx.play('nope')
    bounce(button, 'is-shake', 600)
    button?.classList.add('is-armed')
    newArmedAt = performance.now()
    newArmed = later(4000, () => {
      newArmed = 0
      q('.lh-newbtn')?.classList.remove('is-armed')
    })
    return
  }
  if (newArmed && tooSoon(newArmedAt)) return
  gesture(copy.newPony)
  newPony()
}

function newPony(): void {
  cancel(newArmed)
  newArmed = 0
  q('.lh-newbtn')?.classList.remove('is-armed')
  save = startNew(save)
  persist()
  allSetSaid = false
  sfx.play('whoosh')
  renderPony()
  updateCells()
  renderSlots()
  updateDone()
  const pony = stagePonySvg()
  if (pony) {
    const r = pony.getBoundingClientRect()
    burstAt(r.left + r.width * 0.55, r.top + r.height * 0.55, 12)
  }
}

function tapHelp(): void {
  gesture(copy.welcome)
  sfx.play('tap')
  welcomeGlow()
}

/** The stage pony was tapped somewhere. */
function tapPony(zone: string | undefined): void {
  // While it eats, its lowered head lies on the apple: a second tap on the apple must not snort.
  if (munching) return
  const svg = stagePonySvg()
  const look = save.draft.look
  switch (zone) {
    case 'head':
      gesture(copy.snort)
      sfx.play('snort')
      move(svg, 'is-snort')
      return
    case 'hooves':
      gesture(copy.hooves)
      move(svg, 'is-tapdance')
      ;[0, 250, 500, 750].forEach((ms, i) => later(ms, () => sfx.play('hoof', i)))
      return
    case 'mane':
    case 'tail':
    case 'clip': {
      const id = look[zone]
      gesture(id ? itemName(zone, id) : copy.missing[zone])
      sfx.play('tap')
      move(svg, `is-shake-${zone}`)
      glowStrip(zone)
      return
    }
    case 'horn':
    case 'wings': {
      gesture(itemName('magic', zone))
      sfx.play('magic', zone === 'horn' ? 0 : 1)
      if (zone === 'wings') move(svg, 'is-flap')
      else {
        const horn = svg?.querySelector('.lh-horn')
        const r = horn?.getBoundingClientRect()
        if (r) burstAt(r.left + r.width * 0.4, r.top + r.height * 0.2, 8)
        move(svg, 'is-neigh')
      }
      return
    }
    default:
      if (!look.color) {
        // The uncoloured sketch: hop, and show where the colours are.
        gesture(copy.missing.color)
        sfx.play('tap')
        move(svg, 'is-hop')
        glowStrip('color')
        return
      }
      gesture(copy.neigh)
      sfx.play('neigh', stageVoice())
      move(svg, 'is-hop')
      move(svg, 'is-neigh')
  }
}

/** The pony lowers its head and eats the apple; it grows back after a while. */
function munch(): void {
  if (appleBusy) {
    // The apple is still growing back: a few sparkles where it will be.
    const r = q('.lh-stage .lh-apple')?.getBoundingClientRect()
    if (r?.width) burstAt(r.left + r.width / 2, r.top + r.height / 2, 5)
    return
  }
  appleBusy = true
  munching = true
  later(MOVE_MS['is-munch'] + 60, () => (munching = false))
  gesture(copy.munch)
  const svg = stagePonySvg()
  svg?.classList.remove('is-hop', 'is-neigh', 'is-snort')
  move(svg, 'is-munch')
  q('.lh-stage .lh-apple')?.classList.add('is-eaten')
  later(330, () => sfx.play('munch'))
  later(4200, () => {
    const apple = q('.lh-stage .lh-apple')
    if (apple) {
      apple.classList.remove('is-eaten')
      void apple.getBoundingClientRect()
      apple.classList.add('is-growing')
      const r = apple.getBoundingClientRect()
      burstAt(r.left + r.width / 2, r.top + r.height / 2, 6)
    }
    later(720, () => {
      q('.lh-stage .lh-apple')?.classList.remove('is-growing')
      appleBusy = false
    })
  })
}

/* ─────────────────────────── celebration ─────────────────────────── */

type Step = 'stars' | 'hooray' | 'name' | 'gift' | 'opened' | 'card' | 'full'

interface Celebration {
  step: Step
  ponyId: string | null
  isNew: boolean
  gift: GiftRef | null
  /** The seed `finish` used: the first name offered is the pony's name. */
  seed: number
  /** Dice presses: which three names are offered. */
  page: number
  oldStars: number
  /** A name was tapped on the name card: its ✓ button is out. */
  named: boolean
}

let celebration: Celebration | null = null
let stepTimer = 0
/** When the hooray began: taps in its first moments do not skip it. */
let hoorayAt = 0
const HOORAY_GUARD_MS = 1500
const flyers = new Set<HTMLElement>()

function startCelebration(result: Extract<FinishResult, { ok: true }>, seed: number, oldStars: number): void {
  celebration = { step: 'stars', ponyId: result.pony.id, isNew: result.isNew, gift: result.gift, seed, page: 0, oldStars, named: false }
  renderSlots(0)
  updateDone()
  renderLayer()
  flyStars()
}

/** Three stars fly from Готово into the slots on curved paths, one after another. */
function flyStars(): void {
  const from = q<HTMLElement>('.lh-done-star')?.getBoundingClientRect()
  const stageTop = q<HTMLElement>('.lh-stage')?.getBoundingClientRect().top ?? 0
  const slots = [...root.querySelectorAll<HTMLElement>('.lh-slot')]
  const gap = 450
  const flight = reducedMotion.matches ? 0 : 760
  slots.forEach((slot, i) => {
    later(i * gap, () => {
      if (celebration?.step !== 'stars') return
      const to = slot.getBoundingClientRect()
      if (from && flight && to.width) {
        const star = document.createElement('div')
        star.className = 'lh-flystar'
        star.innerHTML = starSvg(true, `fly${i}`)
        const size = to.width
        star.style.width = star.style.height = `${size}px`
        document.body.append(star)
        flyers.add(star)
        const x0 = from.left + from.width / 2 - size / 2
        const y0 = from.top + from.height / 2 - size / 2
        const x1 = to.left
        const y1 = to.top
        const mx = (x0 + x1) / 2 - Math.abs(x1 - x0) * 0.18 - 30
        // the arc stays inside the picture, over the pony rather than over the clips
        const my = Math.max(stageTop + 8, Math.min(y0, y1) - Math.max(60, Math.abs(y1 - y0) * 0.25))
        star.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) scale(1.5) rotate(0deg)`, opacity: 0.4 },
            { transform: `translate(${(x0 + mx) / 2}px, ${(y0 + my) / 2 + 20}px) scale(1.9) rotate(120deg)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${mx}px, ${my}px) scale(1.7) rotate(250deg)`, opacity: 1, offset: 0.62 },
            { transform: `translate(${x1}px, ${y1}px) scale(1) rotate(360deg)`, opacity: 1 },
          ],
          { duration: flight, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' },
        )
      }
      later(flight, () => {
        for (const star of flyers) if (star.innerHTML.includes(`fly${i}`)) {
          star.remove()
          flyers.delete(star)
        }
        if (celebration?.step === 'stars') fillSlot(i)
      })
    })
  })
  stepTimer = later(2 * gap + flight + 380, () => {
    if (celebration?.step === 'stars') toHooray()
  })
}

function fillSlot(i: number): void {
  const slot = q<HTMLElement>(`.lh-slot[data-slot="${i}"]`)
  if (!slot || slot.classList.contains('is-filled')) return
  slot.innerHTML = starSvg(true, `slot${i}`)
  slot.classList.add('is-filled')
  bounce(slot, 'is-pop', 600)
  const r = slot.getBoundingClientRect()
  burstAt(r.left + r.width / 2, r.top + r.height / 2, 10)
  sfx.play('star', i)
  q('.lh-slots')?.setAttribute('aria-label', copy.stars(root.querySelectorAll('.lh-slot.is-filled').length))
}

function removeFlyers(): void {
  flyers.forEach((star) => star.remove())
  flyers.clear()
}

function toHooray(): void {
  if (!celebration) return
  removeFlyers()
  for (const i of [0, 1, 2]) fillSlot(i)
  celebration.step = 'hooray'
  hoorayAt = performance.now()
  renderLayer()
  const svg = stagePonySvg()
  move(svg, 'is-prance')
  sfx.play('fanfare')
  // the neigh answers «Ура!» instead of covering it
  later(750, () => sfx.play('neigh', stageVoice()))
  confetti()
  say(copy.hooray)
  countUp(celebration.oldStars, save.stars)
  cancel(stepTimer)
  // the next card waits until «…Вот тебе три звёздочки!» is said
  stepTimer = later(save.sound ? 4400 : 3000, () => {
    if (celebration?.step === 'hooray') advance()
  })
}

/** «Ура!» goes into the empty sky of the picture: above the pony, or beside it on low screens. */
function placeHooray(): void {
  const word = q<HTMLElement>('.lh-layer .lh-hooray')
  const stage = q<HTMLElement>('.lh-stage')?.getBoundingClientRect()
  const pony = stagePonySvg()
  const head = pony?.querySelector('.lh-head')?.getBoundingClientRect()
  const box = pony?.getBoundingClientRect()
  if (!word || !stage || !head || !box) return
  const h = word.offsetHeight
  const above = head.top - stage.top
  let left = stage.left
  if (stage.height > stage.width * 1.25) {
    // tall picture: the stage buttons stand in a column on the left
    const tools = q<HTMLElement>('.lh-stools')?.getBoundingClientRect()
    if (tools) left = tools.right + 6
  }
  if (above > h + 30) {
    word.style.left = `${(left + stage.right) / 2}px`
    word.style.top = `${stage.top + Math.max(14, (above - h) / 2)}px`
  } else {
    word.style.left = `${(Math.min(box.right, stage.right - 60) + stage.right) / 2}px`
    word.style.top = `${stage.top + stage.height * 0.5 - h / 2}px`
  }
}

function countUp(from: number, to: number): void {
  const badge = q<HTMLElement>('.lh-badge')
  bounce(badge, 'is-pop', 700)
  const steps = Math.max(1, to - from)
  for (let k = 1; k <= steps; k++) later(k * 220, () => updateBadge(from + k))
}

function advance(): void {
  const c = celebration
  if (!c) return
  cancel(stepTimer)
  switch (c.step) {
    case 'stars':
      toHooray()
      return
    case 'hooray':
      if (c.isNew) toName()
      else if (c.gift) toGift()
      else toCard()
      return
    case 'name':
      if (c.gift) toGift()
      else toCard()
      return
    case 'gift':
      openGift()
      return
    case 'opened':
      toCard()
      return
    case 'card':
    case 'full':
      closeCelebration()
  }
}

function toName(): void {
  if (!celebration) return
  celebration.step = 'name'
  renderLayer()
  // the names are read out, so a child who cannot read yet can choose
  say(copy.askName, copy.nameOptions(offeredNames().map((index) => PONY_NAMES[index][lang])))
  focusFirst('.lh-name')
}

function offeredNames(): number[] {
  const c = celebration!
  const per = 3
  const pages = Math.floor(PONY_NAMES.length / per)
  const page = c.page % pages
  return nameChoices(save, c.seed, per * (page + 1)).slice(per * page)
}

/**
 * A tapped name is the pony's name at once and is said aloud («Привет, Облачко!»); the pony
 * neighs back when the name has been said. The card stays, so every name can be heard; the
 * golden ✓ goes on.
 */
function chooseName(index: number, button: HTMLElement): void {
  const c = celebration
  const pony = ponyById(c?.ponyId ?? null)
  if (!c || c.step !== 'name' || !pony) return
  save = rename(save, pony.id, index)
  persist()
  c.named = true
  for (const other of root.querySelectorAll<HTMLElement>('.lh-name')) other.setAttribute('aria-pressed', String(other === button))
  const name = PONY_NAMES[index][lang]
  gesture(copy.hello(name))
  sfx.play('name', index)
  move(stagePonySvg(), 'is-hop')
  echo(1300, () => {
    sfx.play('neigh', index)
    move(stagePonySvg(), 'is-neigh')
  })
  bounce(button)
  cancel(stepTimer)
  const ok = q<HTMLElement>('.lh-layer .lh-card-name .lh-card-next')
  if (ok?.hidden) {
    ok.hidden = false
    bounce(ok)
  }
}

function rollNames(): void {
  if (!celebration) return
  celebration.page += 1
  const names = offeredNames()
  gesture(copy.nameOptions(names.map((index) => PONY_NAMES[index][lang])))
  sfx.play('whoosh')
  cancel(stepTimer)
  const list = q<HTMLElement>('.lh-names')
  if (list) list.innerHTML = namesMarkup()
  bounce(q('.lh-dice'), 'is-roll', 600)
}

function toGift(): void {
  if (!celebration) return
  celebration.step = 'gift'
  renderLayer()
  sfx.play('gift')
  say(copy.giftTitle, copy.openGift)
  focusFirst('.lh-biggift')
}

function giftItem(gift: GiftRef): { name: string; icon: string } {
  const name = itemName(gift.kind, gift.id)
  const icon = gift.kind === 'background' ? backgroundIcon(gift.id, 'rv') : itemIcon(gift.kind, gift.id, 'rv')
  return { name, icon }
}

function openGift(): void {
  const c = celebration
  if (!c?.gift || c.step !== 'gift') return
  c.step = 'opened'
  const card = q<HTMLElement>('.lh-layer .lh-card-gift')
  const { name } = giftItem(c.gift)
  gesture(copy.giftOpened(name, c.gift.kind))
  sfx.play('open')
  if (card) {
    card.classList.add('is-opened')
    const svg = card.querySelector('.lh-sc-gift')
    svg?.classList.remove('is-wiggle')
    svg?.classList.add('is-open')
    q('.lh-biggift', card)?.setAttribute('aria-disabled', 'true')
    later(reducedMotion.matches ? 0 : 380, () => {
      // skipped on (Escape, a new language): this card is gone, so are its sparkles
      if (celebration !== c || c.step !== 'opened' || !card.isConnected) return
      const box = q('.lh-gift-stage', card)
      if (box) box.insertAdjacentHTML('beforeend', revealMarkup(c.gift!))
      const hint = q('.lh-card-hint', card)
      if (hint) hint.textContent = name
      const r = q('.lh-reveal', card)?.getBoundingClientRect()
      if (r) burstAt(r.left + r.width / 2, r.top + r.height / 2, 12, q<HTMLElement>('.lh-layer')!)
      q('.lh-card-next', card)?.removeAttribute('hidden')
      focusFirst('.lh-card-next')
    })
  }
  // The new item waits in its strip with a «Новое!» badge.
  renderStrips()
  updateStageTools()
}

function toCard(): void {
  if (!celebration) return
  celebration.step = 'card'
  renderLayer()
  // click! the polaroid flashes and the pony introduces itself
  sfx.play('whoosh')
  later(140, () => sfx.play('tap'))
  const pony = ponyById(celebration.ponyId)
  if (pony) say(copy.iAm(ponyName(pony)))
  focusFirst('.lh-card-actions button')
}

function closeCelebration(): void {
  cancel(stepTimer)
  removeFlyers()
  const had = celebration
  celebration = null
  renderLayer()
  renderSlots()
  updateDone()
  updateBadge()
  if (had?.gift) {
    renderStrips()
    showGift(had.gift)
  }
  q<HTMLElement>('.lh-done')?.focus({ preventScroll: true })
}

/** After the card: the opened gift scrolls into view in its row, which glows, and the cell bounces. */
function showGift(gift: GiftRef): void {
  if (gift.kind === 'background') {
    const button = q<HTMLElement>('.lh-bgbtn')
    bounce(button, 'is-bounce', 600)
    const r = button?.getBoundingClientRect()
    if (r) burstAt(r.left + r.width / 2, r.top + r.height / 2, 10)
    return
  }
  const side: Side = gift.kind === 'magic' ? 'clip' : gift.kind
  const cell = q<HTMLElement>(`.lh-cell[data-kind="${gift.kind}"][data-id="${gift.id}"]`)
  if (!cell) return
  revealCell(cell, 'center', true)
  glowStrip(side, 2200)
  later(reducedMotion.matches ? 0 : 450, () => {
    if (!cell.isConnected) return
    bounce(cell)
    const r = cell.getBoundingClientRect()
    burstAt(r.left + r.width / 2, r.top + r.height / 2, 10, q<HTMLElement>('.lh-workshop') ?? undefined)
  })
}

function focusFirst(selector: string): void {
  requestAnimationFrame(() => q<HTMLElement>(`.lh-layer ${selector}`)?.focus({ preventScroll: true }))
}

function namesMarkup(): string {
  const c = celebration
  const chosen = c?.named ? ponyById(c.ponyId)?.name : undefined
  return offeredNames()
    .map((index) => `<button type="button" class="lh-name" data-name="${index}" aria-pressed="${index === chosen}">${esc(PONY_NAMES[index][lang])}</button>`)
    .join('')
}

function revealMarkup(gift: GiftRef): string {
  const { name, icon } = giftItem(gift)
  return `<div class="lh-reveal${gift.kind === 'background' ? ' is-round' : ''}" role="img" aria-label="${esc(name)}">${icon}</div>`
}

/** The pony's head and shoulders in a round medallion (the name card). */
function portraitMarkup(pony: Pony): string {
  const svg = horseSvg(pony.look, { id: 'portrait' }).replace(/viewBox="[^"]*"/, 'viewBox="14 44 330 330"')
  return `<span class="lh-portrait" aria-hidden="true"><span class="lh-portrait-bg">${backgroundSvg(save.background, 'pt-bg')}</span>${svg}</span>`
}

function photoMarkup(pony: Pony): string {
  return `<figure class="lh-polaroid">
    <div class="lh-photo">
      <div class="lh-photo-bg">${backgroundSvg(save.background, 'ph-bg')}</div>
      ${podiumMarkup('ph', pony.look, false)}
    </div>
    <figcaption><span class="lh-photo-name">${esc(ponyName(pony))}</span><span class="lh-photo-stars" role="img" aria-label="${esc(copy.stars(3))}">${[0, 1, 2].map((i) => starSvg(true, `ps${i}`)).join('')}</span></figcaption>
  </figure>`
}

function cardMarkup(c: Celebration): string {
  const pony = ponyById(c.ponyId)
  switch (c.step) {
    case 'stars':
      return ''
    case 'hooray':
      return `<button type="button" class="lh-skip" data-action="next" aria-label="${esc(copy.hooray)}"></button>
        <div class="lh-hooray" aria-hidden="true">${esc(`${copy.hooray.split('!')[0]}!`)}</div>`
    case 'name':
      return `<div class="lh-card lh-card-name" role="dialog" aria-modal="true" aria-labelledby="lh-card-title">
        ${pony ? portraitMarkup(pony) : ''}
        <h2 id="lh-card-title" class="lh-card-title">${esc(copy.askName)}</h2>
        <div class="lh-names">${namesMarkup()}</div>
        <div class="lh-card-row">
          <button type="button" class="lh-dice" data-action="dice">${uiIcon('dice')}<span>${esc(copy.otherNames)}</span></button>
          <button type="button" class="lh-card-next lh-pill is-gold" data-action="next" aria-label="${esc(copy.close)}"${c.named ? '' : ' hidden'}>${uiIcon('check')}</button>
        </div>
      </div>`
    case 'gift':
    case 'opened': {
      const gift = c.gift!
      const opened = c.step === 'opened'
      const svg = giftSvg('big-gift', GIFT_PAPER[gift.kind])
      return `<div class="lh-card lh-card-gift${opened ? ' is-opened' : ''}" role="dialog" aria-modal="true" aria-labelledby="lh-card-title">
        <h2 id="lh-card-title" class="lh-card-title">${esc(copy.giftTitle)}</h2>
        <div class="lh-gift-stage">
          <button type="button" class="lh-biggift" data-action="open-gift" aria-label="${esc(copy.openGift)}"${opened ? ' aria-disabled="true"' : ''}><span class="lh-biggift-bob">${svg.replace('class="lh-sc lh-sc-gift"', `class="lh-sc lh-sc-gift ${opened ? 'is-open' : 'is-wiggle'}"`)}</span></button>
          ${opened ? revealMarkup(gift) : ''}
        </div>
        <p class="lh-card-hint">${esc(opened ? giftItem(gift).name : copy.openGift)}</p>
        <button type="button" class="lh-card-next lh-pill is-gold" data-action="next" aria-label="${esc(copy.close)}"${opened ? '' : ' hidden'}>${uiIcon('check')}</button>
      </div>`
    }
    case 'card':
      if (!pony) return ''
      return `<div class="lh-card lh-card-photo" role="dialog" aria-modal="true" aria-label="${esc(ponyName(pony))}">
        ${photoMarkup(pony)}
        <div class="lh-card-actions">
          <button type="button" class="lh-pill is-gold" data-action="to-stable">${barnSvg('lh-bp')}<span>${esc(copy.toStable)}</span></button>
          <button type="button" class="lh-pill" data-action="new-pony">${uiIcon('plus')}<span>${esc(copy.newPony)}</span></button>
          <button type="button" class="lh-pill" data-action="keep">${uiIcon('brush')}<span>${esc(copy.keepDressing)}</span></button>
        </div>
      </div>`
    case 'full':
      return `<div class="lh-card lh-card-full" role="dialog" aria-modal="true" aria-labelledby="lh-card-title">
        <span class="lh-card-barn">${barnSvg('lh-bf')}</span>
        <p id="lh-card-title" class="lh-card-text">${esc(copy.stableFull)}</p>
        <div class="lh-card-actions">
          <button type="button" class="lh-pill is-gold" data-action="to-stable">${barnSvg('lh-bfp')}<span>${esc(copy.toStable)}</span></button>
          <button type="button" class="lh-pill" data-action="next">${uiIcon('check')}<span>${esc(copy.close)}</span></button>
        </div>
      </div>`
  }
}

function renderLayer(): void {
  const layer = q<HTMLElement>('.lh-layer')
  if (!layer) return
  setBackdrop(!!celebration)
  if (!celebration) {
    layer.hidden = true
    layer.innerHTML = ''
    layer.removeAttribute('data-step')
    return
  }
  layer.hidden = false
  layer.dataset.step = celebration.step
  layer.innerHTML = cardMarkup(celebration)
  if (celebration.step === 'hooray') placeHooray()
}

/**
 * The cards are modal: while one is up, the workshop behind it is inert (no Tab, no taps, hidden
 * from screen readers). Sound and language stay usable above it.
 */
function setBackdrop(modal: boolean): void {
  for (const el of root.querySelectorAll<HTMLElement>('.lh-workshop .lh-frame > *')) {
    if (!el.classList.contains('lh-corner-tr')) el.inert = modal
  }
}

/** Tab and Shift+Tab go round the open card. */
function trapTab(event: KeyboardEvent): void {
  const layer = q<HTMLElement>('.lh-layer')
  if (!layer || layer.hidden) return
  const items = [...layer.querySelectorAll<HTMLElement>('button, [href], select')].filter(
    (el) => !el.closest('[hidden]') && el.getClientRects().length > 0,
  )
  if (!items.length) return
  event.preventDefault()
  const i = items.indexOf(document.activeElement as HTMLElement)
  const n = items.length
  const next = i < 0 ? (event.shiftKey ? n - 1 : 0) : (i + (event.shiftKey ? n - 1 : 1)) % n
  items[next].focus()
}

/* ─────────────────────────── stable ─────────────────────────── */

type Mode = 'stand' | 'walk' | 'trot' | 'graze' | 'leave'

interface Walker {
  pony: Pony
  el: HTMLButtonElement
  flip: HTMLElement
  x: number
  y: number
  tx: number
  ty: number
  mode: Mode
  until: number
  facing: 1 | -1
}

let herd: Walker[] = []
let rafId = 0
let lastFrame = 0
let selected: string | null = null
let releaseArmed: string | null = null
let releaseArmedAt = 0
let releaseTimer = 0
let dressArmed: string | null = null
let dressArmedAt = 0
let dressTimer = 0
/** The last released pony can be called back for a few seconds. */
let undo: { before: LoshadkaSave; pony: Pony; side: 1 | -1 } | null = null
let undoTimer = 0
let field = { w: 0, h: 0, top: 0, bottom: 0, base: 120 }

/** Hooves sit this far down the pony's box. */
const HOOF_FRAC = HORSE_GROUND_Y / HORSE_VIEWBOX.height
const PONY_ASPECT = HORSE_VIEWBOX.height / HORSE_VIEWBOX.width

function measureField(): void {
  const el = q<HTMLElement>('.lh-herd')
  const w = el?.clientWidth || window.innerWidth
  const h = el?.clientHeight || window.innerHeight
  const count = Math.max(1, save.ponies.length)
  const crowd = count > 20 ? 0.62 : count > 12 ? 0.72 : count > 6 ? 0.86 : 1
  // Phones: big enough to tap even far away and in a crowd. Portrait: the tall meadow has room.
  const small = w < 520
  const portrait = h > w
  const size = portrait ? Math.min(w * 0.42, h * 0.22) : Math.min(w * 0.26, h * 0.3)
  field = {
    w,
    h,
    top: h * (MEADOW_GROUND.top + 0.04),
    bottom: h * (MEADOW_GROUND.bottom - 0.02),
    base: clamp(size, small ? 120 : 96, 250) * (small ? Math.max(crowd, 0.8) : crowd),
  }
}

function depth(y: number): number {
  return 0.62 + 0.38 * clamp((y - field.top) / Math.max(1, field.bottom - field.top), 0, 1)
}

function stableBarMarkup(): string {
  return `<button type="button" class="lh-tool lh-back" data-action="workshop" aria-label="${esc(copy.toWorkshop)}">${uiIcon('back')}<span>${esc(copy.toWorkshop)}</span></button>
    <h1 class="lh-stable-title">${esc(copy.stable)}</h1>
    <span class="lh-chip" role="img" aria-label="${esc(copy.starsAria(save.stars))}">${starSvg(true, 'chip')}<span>${save.stars}</span></span>
    <span class="lh-bar-gap"></span>
    ${settingsMarkup()}`
}

function giftTrackMarkup(): string {
  const next = nextGift(save)
  if (!next) return `<span class="lh-gifttrack-box">${starSvg(true, 'gt')}</span><span class="lh-gifttrack-text">${esc(copy.allGifts)}</span>`
  const svg = giftSvg('gt', GIFT_PAPER[next.kind]).replace('class="lh-sc lh-sc-gift"', 'class="lh-sc lh-sc-gift is-wiggle"')
  return `<span class="lh-gifttrack-box">${svg}</span><span class="lh-gifttrack-text">${esc(copy.nextGift)}</span>`
}

function stableMarkup(): string {
  return `<main class="lh-stable">
    <div class="lh-meadow">${meadowSvg('md')}</div>
    <div class="lh-herd"></div>
    <header class="lh-stable-bar">${stableBarMarkup()}</header>
    <p class="lh-gifttrack">${giftTrackMarkup()}</p>
    <div class="lh-bubble" hidden></div>
    <div class="lh-actions" hidden>
      <button type="button" class="lh-pill is-gold" data-action="dress" aria-label="${esc(copy.dress)}">${uiIcon('brush')}<span>${esc(copy.dress)}</span></button>
      <button type="button" class="lh-pill" data-action="release" aria-label="${esc(copy.release)}">${uiIcon('bye')}<span>${esc(copy.release)}</span></button>
    </div>
    <button type="button" class="lh-pill lh-undo" data-action="undo" hidden>${uiIcon('back')}<span>${esc(copy.bringBack)}</span></button>
    <div class="lh-empty"${save.ponies.length ? ' hidden' : ''}>
      <p>${esc(copy.stableEmpty)}</p>
      <button type="button" class="lh-pill is-gold is-big" data-action="first-pony">${uiIcon('plus')}<span>${esc(copy.newPony)}</span></button>
    </div>
    <p class="lh-privacy">${esc(copy.privacy)}</p>
    <p class="lh-note"${persistent ? ' hidden' : ''}>${esc(copy.noStorage)}</p>
  </main>`
}

function renderStable(focusId: string | null = null): void {
  screen = 'stable'
  root.dataset.screen = 'stable'
  root.innerHTML = stableMarkup()
  selected = null
  releaseArmed = null
  measureField()
  herd = save.ponies.map((pony, i) => {
    // spread them over the meadow: newest in front
    const n = save.ponies.length
    const x = field.w * (0.1 + 0.8 * ((i * 0.618 + 0.21) % 1))
    const y = field.bottom - (field.bottom - field.top) * ((i + 0.5) / Math.max(n, 1)) * 0.95
    return addWalker(pony, x, y)
  })
  lastFrame = 0
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(tick)
  if (focusId) {
    later(450, () => selectPony(focusId, false))
  }
}

function addWalker(pony: Pony, x: number, y: number): Walker {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'lh-pony'
  el.dataset.pony = pony.id
  el.setAttribute('aria-label', ponyName(pony))
  el.style.width = `${field.base}px`
  el.innerHTML = `<span class="lh-pony-flip">${horseSvg(pony.look, { id: `hp${pony.id}` })}</span>`
  q<HTMLElement>('.lh-herd')!.append(el)
  const flip = el.firstElementChild as HTMLElement
  const w: Walker = { pony, el, flip, x, y, tx: x, ty: y, mode: 'stand', until: performance.now() + rand(300, 2600), facing: Math.random() < 0.5 ? -1 : 1 }
  face(w, w.facing)
  place(w)
  return w
}

function face(w: Walker, dir: 1 | -1): void {
  w.facing = dir
  w.flip.style.transform = dir === 1 ? 'scaleX(-1)' : ''
}

function place(w: Walker): void {
  const s = depth(w.y)
  const B = field.base
  w.el.style.transform = `translate3d(${(w.x - B / 2).toFixed(1)}px, ${(w.y - B * PONY_ASPECT * HOOF_FRAC).toFixed(1)}px, 0) scale(${s.toFixed(3)})`
  // nearer ponies in front; the chosen one in front of everybody
  w.el.style.zIndex = w.pony.id === selected ? '1999' : String(Math.round(w.y))
}

function setMode(w: Walker, mode: Mode): void {
  w.mode = mode
  const svg = w.el.querySelector('svg')
  if (!svg) return
  svg.classList.toggle('is-walk', mode === 'walk')
  svg.classList.toggle('is-trot', mode === 'trot' || mode === 'leave')
  svg.classList.toggle('is-graze', mode === 'graze')
}

function chooseNext(w: Walker, now: number): void {
  if (reducedMotion.matches) {
    setMode(w, 'stand')
    w.until = now + 60_000
    return
  }
  const r = Math.random()
  const margin = field.base * 0.42
  if (r < 0.45) {
    w.tx = clamp(w.x + rand(-0.4, 0.4) * field.w, margin, field.w - margin)
    w.ty = rand(field.top, field.bottom)
    setMode(w, r < 0.1 ? 'trot' : 'walk')
    face(w, w.tx > w.x ? 1 : -1)
    w.until = now + 30_000
  } else if (r < 0.75) {
    setMode(w, 'graze')
    w.until = now + rand(3200, 6400)
  } else {
    setMode(w, 'stand')
    w.until = now + rand(1600, 3800)
  }
}

function tick(now: number): void {
  rafId = requestAnimationFrame(tick)
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
  lastFrame = now
  for (const w of [...herd]) {
    if (w.mode === 'leave') {
      const speed = 3.2 * field.base * depth(w.y)
      w.x += Math.sign(w.tx - w.x) * speed * dt
      place(w)
      if (Math.abs(w.tx - w.x) < 4 || w.x < -field.base * 1.5 || w.x > field.w + field.base * 1.5) {
        w.el.remove()
        herd = herd.filter((other) => other !== w)
      }
      continue
    }
    if (w.pony.id === selected) {
      if (w.mode !== 'stand') setMode(w, 'stand')
      continue
    }
    if (now >= w.until) chooseNext(w, now)
    if (w.mode === 'walk' || w.mode === 'trot') {
      const dx = w.tx - w.x
      const dy = w.ty - w.y
      const dist = Math.hypot(dx, dy)
      const speed = (w.mode === 'trot' ? 1.15 : 0.42) * field.base * depth(w.y)
      if (dist < 3) {
        setMode(w, Math.random() < 0.5 ? 'graze' : 'stand')
        w.until = now + rand(1800, 4800)
      } else {
        const step = Math.min(dist, speed * dt)
        w.x += (dx / dist) * step
        w.y += (dy / dist) * step
        place(w)
      }
    }
  }
  placeSelection()
}

function placeSelection(): void {
  const w = herd.find((other) => other.pony.id === selected)
  const bubble = q<HTMLElement>('.lh-bubble')
  const actions = q<HTMLElement>('.lh-actions')
  if (!bubble || !actions) return
  if (!w) {
    bubble.hidden = true
    actions.hidden = true
    return
  }
  const s = depth(w.y)
  const height = field.base * PONY_ASPECT * HOOF_FRAC * s
  const headY = w.y - height * 0.86
  const bw = bubble.offsetWidth
  const bh = bubble.offsetHeight
  const bx = clamp(w.x - bw / 2, 8, field.w - bw - 8)
  const by = Math.max(8, headY - bh)
  bubble.style.transform = `translate(${bx}px, ${by}px)`
  const aw = actions.offsetWidth
  const ah = actions.offsetHeight
  const ax = clamp(w.x - aw / 2, 8, field.w - aw - 8)
  let ay = w.y + 10
  if (ay + ah > field.h - 8) ay = Math.max(8, by - ah - 8)
  actions.style.transform = `translate(${ax}px, ${ay}px)`
}

function selectPony(id: string, speak = true): void {
  const w = herd.find((other) => other.pony.id === id && other.mode !== 'leave')
  if (!w) return
  const name = ponyName(w.pony)
  if (speak) gesture(copy.iAm(name))
  else say(copy.iAm(name))
  if (selected !== id) disarmActions()
  selected = id
  setMode(w, 'stand')
  const svg = w.el.querySelector('svg')
  move(svg, 'is-hop')
  // it says its name first, then neighs (the neigh would cover the name)
  echo(1700, () => {
    sfx.play('neigh', w.pony.name)
    move(w.el.querySelector('svg'), 'is-neigh')
  })
  for (const other of herd) {
    other.el.classList.toggle('is-selected', other === w)
    place(other)
  }
  q('.lh-herd')?.classList.add('has-selected')
  const bubble = q<HTMLElement>('.lh-bubble')!
  bubble.innerHTML = `<span class="lh-bubble-name">${esc(name)}</span>`
  bubble.hidden = false
  q<HTMLElement>('.lh-actions')!.hidden = false
  bounce(bubble, 'is-pop', 500)
  placeSelection()
}

function deselect(): void {
  selected = null
  disarmActions()
  q('.lh-herd')?.classList.remove('has-selected')
  for (const w of herd) {
    w.el.classList.remove('is-selected')
    place(w)
  }
  placeSelection()
}

function disarmRelease(): void {
  releaseArmed = null
  cancel(releaseTimer)
  q('.lh-actions [data-action="release"]')?.classList.remove('is-armed')
}

function disarmDress(): void {
  dressArmed = null
  cancel(dressTimer)
  q('.lh-actions [data-action="dress"]')?.classList.remove('is-armed')
}

function disarmActions(): void {
  disarmRelease()
  disarmDress()
}

function tapRelease(): void {
  const id = selected
  const w = herd.find((other) => other.pony.id === id)
  if (!id || !w) return
  const button = q<HTMLElement>('.lh-actions [data-action="release"]')
  if (releaseArmed !== id) {
    gesture(copy.releaseConfirm)
    sfx.play('tap')
    disarmDress()
    releaseArmed = id
    releaseArmedAt = performance.now()
    button?.classList.add('is-armed')
    bounce(button, 'is-shake', 600)
    cancel(releaseTimer)
    releaseTimer = later(4000, disarmRelease)
    return
  }
  if (tooSoon(releaseArmedAt)) return
  const name = ponyName(w.pony)
  disarmRelease()
  const before = save
  save = release(save, id)
  persist()
  gesture(copy.released(name))
  sfx.play('bye')
  selected = null
  w.el.classList.remove('is-selected')
  q('.lh-herd')?.classList.remove('has-selected')
  w.el.disabled = true
  const dir: 1 | -1 = w.x < field.w / 2 ? -1 : 1
  if (reducedMotion.matches) {
    w.el.classList.add('is-gone')
    later(400, () => {
      if (!w.el.disabled) return // called back meanwhile
      w.el.remove()
      herd = herd.filter((other) => other !== w)
    })
  } else {
    w.tx = dir === 1 ? field.w + field.base * 2 : -field.base * 2
    face(w, dir)
    setMode(w, 'leave')
  }
  placeSelection()
  refreshStableTexts()
  offerUndo(before, w.pony, dir)
  if (!save.ponies.length) later(900, () => q('.lh-empty')?.toggleAttribute('hidden', save.ponies.length > 0))
}

/** For a few seconds a «Вернуть» button calls the released pony back onto the meadow. */
function offerUndo(before: LoshadkaSave, pony: Pony, side: 1 | -1): void {
  undo = { before, pony, side }
  const button = q<HTMLElement>('.lh-undo')
  if (!button) return
  q('span', button)!.textContent = copy.bringBack
  button.setAttribute('aria-label', `${copy.bringBack}: ${ponyName(pony)}`)
  button.hidden = false
  cancel(undoTimer)
  undoTimer = later(8000, dropUndo)
}

function dropUndo(): void {
  undo = null
  cancel(undoTimer)
  const button = q<HTMLElement>('.lh-undo')
  if (button) button.hidden = true
}

function tapUndo(): void {
  const u = undo
  if (!u) return
  dropUndo()
  // Only a release happened since (and the sound switch, which is kept), so the old save is exact.
  save = { ...u.before, sound: save.sound }
  persist()
  const pony = ponyById(u.pony.id)
  if (!pony) return
  gesture(copy.isBack(ponyName(pony)))
  sfx.play('trot')
  q('.lh-empty')?.setAttribute('hidden', '')
  // still trotting away: it turns round; already gone: it comes back in from that side
  let w = herd.find((other) => other.pony.id === pony.id)
  if (!w) {
    const y = rand(field.top, field.bottom)
    w = addWalker(pony, u.side === 1 ? field.w + field.base : -field.base, y)
    herd.push(w)
  }
  w.el.disabled = false
  w.el.classList.remove('is-gone')
  w.tx = clamp(field.w * (u.side === 1 ? 0.72 : 0.28), field.base * 0.5, field.w - field.base * 0.5)
  w.ty = clamp(w.y, field.top, field.bottom)
  face(w, w.tx > w.x ? 1 : -1)
  if (reducedMotion.matches) {
    // no trotting: it is simply there again
    w.x = w.tx
    w.y = w.ty
    setMode(w, 'stand')
    place(w)
  } else {
    setMode(w, 'trot')
    w.until = performance.now() + 30_000
  }
  refreshStableTexts()
}

function tapDress(): void {
  const pony = ponyById(selected)
  if (!pony) return
  const button = q<HTMLElement>('.lh-actions [data-action="dress"]')
  // The workshop holds an unfinished pony: dressing this one would throw it away, so ask first.
  if (hasUnfinishedWork(save) && dressArmed !== pony.id) {
    gesture(copy.dressConfirm)
    sfx.play('nope')
    disarmRelease()
    dressArmed = pony.id
    dressArmedAt = performance.now()
    button?.classList.add('is-armed')
    bounce(button, 'is-shake', 600)
    cancel(dressTimer)
    dressTimer = later(4000, disarmDress)
    return
  }
  if (dressArmed === pony.id && tooSoon(dressArmedAt)) return
  disarmDress()
  gesture(ponyName(pony))
  sfx.play('whoosh')
  save = editPony(save, pony.id)
  persist()
  allSetSaid = true
  goWorkshop(false, false)
}

function refreshStableTexts(): void {
  const bar = q<HTMLElement>('.lh-stable-bar')
  if (bar) bar.innerHTML = stableBarMarkup()
  const track = q<HTMLElement>('.lh-gifttrack')
  if (track) track.innerHTML = giftTrackMarkup()
  const actions = q<HTMLElement>('.lh-actions')
  if (actions) {
    for (const [action, text] of [
      ['dress', copy.dress],
      ['release', copy.release],
    ] as const) {
      const button = q(`[data-action="${action}"]`, actions)!
      button.setAttribute('aria-label', text)
      q('span', button)!.textContent = text
    }
  }
  const empty = q<HTMLElement>('.lh-empty')
  if (empty) {
    q('p', empty)!.textContent = copy.stableEmpty
    q('[data-action="first-pony"] span', empty)!.textContent = copy.newPony
  }
  q('.lh-privacy')!.textContent = copy.privacy
  const back = q<HTMLElement>('.lh-undo')
  if (back) {
    q('span', back)!.textContent = copy.bringBack
    if (undo) back.setAttribute('aria-label', `${copy.bringBack}: ${ponyName(undo.pony)}`)
  }
  const note = q('.lh-stable .lh-note')
  if (note) note.textContent = copy.noStorage
  for (const w of herd) w.el.setAttribute('aria-label', ponyName(w.pony))
  const w = herd.find((other) => other.pony.id === selected)
  const name = q('.lh-bubble-name')
  if (w && name) name.textContent = ponyName(w.pony)
}

/* ─────────────────────────── screens ─────────────────────────── */

function leaveScreen(): void {
  clearTimers()
  cancelAnimationFrame(rafId)
  rafId = 0
  removeFlyers()
  celebration = null
  newArmed = 0
  appleBusy = false
  munching = false
  releaseArmed = null
  dressArmed = null
  undo = null
  touring = false
  tourTimers = []
  echoes.clear()
  herd = []
}

function goStable(focusId: string | null = null): void {
  leaveScreen()
  markSwitch()
  renderStable(focusId)
  if (!focusId) say(save.ponies.length ? copy.stableHello : copy.stableEmpty)
  q<HTMLElement>('.lh-back')?.focus({ preventScroll: true })
}

/** `fresh`: a finished pony left on the stage has moved into the stable, so a new sketch waits. */
function goWorkshop(speak = true, fresh = true): void {
  leaveScreen()
  markSwitch()
  if (fresh) freshSketchIfFinished()
  renderWorkshop()
  if (speak) say(copy.welcomeBack)
  q<HTMLElement>('.lh-barn')?.focus({ preventScroll: true })
}

/* ─────────────────────────── input ─────────────────────────── */

root.addEventListener('click', (event) => {
  const target = event.target as Element
  const isKeyboard = (event as MouseEvent).detail === 0

  // The second tap of a double tap that switched screens lands on whatever sits there now
  // (the stable's back button lies over the home link): it is ignored.
  const { clientX, clientY } = event as MouseEvent
  if (!isKeyboard && tooSoon(switchedAt, SWITCH_GUARD_MS) && Math.hypot(clientX - switchX, clientY - switchY) < SWITCH_GUARD_PX) {
    event.preventDefault()
    return
  }
  tapX = isKeyboard ? -999 : clientX
  tapY = isKeyboard ? -999 : clientY

  // stable ponies and the meadow
  if (screen === 'stable') {
    const pony = target.closest<HTMLElement>('.lh-pony')
    if (pony?.dataset.pony) {
      selectPony(pony.dataset.pony)
      return
    }
  }

  const cell = target.closest<HTMLElement>('.lh-cell')
  if (cell && !celebration) {
    if (cell.dataset.gift) tapGift(cell)
    else if (cell.dataset.kind && cell.dataset.id) pick(cell.dataset.kind as ItemKind, cell.dataset.id, Number(cell.dataset.index) || 0, cell)
    return
  }

  const nameButton = target.closest<HTMLElement>('.lh-name')
  if (nameButton) {
    chooseName(Number(nameButton.dataset.name), nameButton)
    return
  }

  const actionEl = target.closest<HTMLElement>('[data-action]')
  const action = actionEl?.dataset.action
  if (!action) {
    if (screen === 'stable' && selected && !target.closest('.lh-actions, .lh-bubble, .lh-stable-bar')) deselect()
    return
  }
  if (action === 'home') {
    // A plain click leaves the page; a modified click opens a new tab and this page keeps going.
    const e = event as MouseEvent
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) teardown()
    return
  }
  switch (action) {
    case 'sound':
      save.sound = !save.sound
      persist()
      if (save.sound) {
        sfx.unlock()
        sfx.play('tap')
        narration.begin(copy.soundOn)
      } else {
        narration.silence()
        sfx.silence()
      }
      refreshSound()
      return
    case 'pony':
      if (celebration) return
      tapPony(isKeyboard ? 'body' : target.closest<HTMLElement>('[data-zone]')?.dataset.zone)
      return
    case 'apple':
      if (celebration) return
      if (isKeyboard || target.closest('[data-zone="apple"]')) munch()
      return
    case 'done':
      if (celebration) return
      tapDone()
      return
    case 'background':
      if (!celebration) tapBackground()
      return
    case 'new':
      if (!celebration) tapNew()
      return
    case 'help':
      if (!celebration) tapHelp()
      return
    case 'stable':
      if (celebration) return
      gesture(copy.stable)
      sfx.play('trot')
      goStable()
      return
    case 'next':
      if (celebration?.step === 'hooray' && !isKeyboard && tooSoon(hoorayAt, HOORAY_GUARD_MS)) {
        // a tap on the rearing pony in the big moment: sparkles, no skipping
        const e = event as MouseEvent
        burstAt(e.clientX, e.clientY, 6)
        return
      }
      sfx.unlock()
      sfx.play('tap')
      advance()
      return
    case 'dice':
      rollNames()
      return
    case 'open-gift':
      if (celebration?.step === 'gift') openGift()
      return
    case 'to-stable': {
      const id = celebration?.step === 'card' ? celebration.ponyId : null
      const pony = ponyById(id)
      gesture(copy.toStable)
      sfx.play('trot')
      goStable(pony ? pony.id : null)
      return
    }
    case 'new-pony':
      gesture(copy.newPony)
      closeCelebration()
      newPony()
      return
    case 'keep':
      gesture(copy.keepDressing)
      sfx.play('tap')
      closeCelebration()
      return
    case 'workshop':
      gesture(copy.toWorkshop)
      sfx.play('whoosh')
      goWorkshop(false)
      return
    case 'dress':
      tapDress()
      return
    case 'release':
      tapRelease()
      return
    case 'undo':
      tapUndo()
      return
    case 'first-pony':
      gesture(copy.newPony)
      if (!hasUnfinishedWork(save)) save = startNew(save)
      persist()
      allSetSaid = false
      goWorkshop(false)
      return
  }
})

root.addEventListener('change', (event) => {
  const select = event.target
  if (!(select instanceof HTMLSelectElement) || !select.classList.contains('lh-lang-select') || !isLang(select.value)) return
  lang = select.value
  copy = LOSHADKA_COPY[lang]
  saveLang(lang)
  applyDocumentLang()
  sfx.unlock()
  stopWelcomeTour()
  narration.languageChanged()
  if (screen === 'workshop') refreshWorkshopTexts()
  else refreshStableTexts()
  q<HTMLElement>('.lh-lang-select')?.focus({ preventScroll: true })
})

root.addEventListener('scroll', () => updateFades(), { capture: true, passive: true })

// Keyboard focus on a cell at the hidden end of a row scrolls the row to it (taps never scroll it,
// so a row does not move under a finger).
root.addEventListener('focusin', (event) => {
  const cell = (event.target as Element).closest?.('.lh-scroller .lh-cell')
  if (cell?.matches(':focus-visible')) revealCell(cell, 'nearest')
})
window.addEventListener('resize', () => {
  updateFades()
  if (screen === 'workshop') boldGhosts()
  if (screen === 'stable') {
    const before = field
    measureField()
    for (const w of herd) {
      w.x = (w.x / Math.max(1, before.w)) * field.w
      w.y = field.top + ((w.y - before.top) / Math.max(1, before.bottom - before.top)) * (field.bottom - field.top)
      w.tx = clamp(w.tx, 0, field.w)
      w.ty = clamp(w.ty, field.top, field.bottom)
      w.el.style.width = `${field.base}px`
      place(w)
    }
    placeSelection()
  }
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && celebration) trapTab(event)
  if (event.key !== 'Escape') return
  if (celebration) {
    event.preventDefault()
    if (celebration.step === 'card' || celebration.step === 'full') closeCelebration()
    else advance()
    return
  }
  if (screen === 'stable' && selected) deselect()
})

/* ─────────────────────────── lifecycle ─────────────────────────── */

function teardown(): void {
  clearTimers()
  cancelAnimationFrame(rafId)
  rafId = 0
  removeFlyers()
  narration.silence()
  sfx.destroy()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    narration.silence()
    sfx.silence()
  } else lastFrame = 0
})

window.addEventListener('pagehide', teardown)
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  // Back from the BFCache: a fresh sitting on the workshop. Another page may have saved ponies,
  // stars or a language meanwhile, so everything is read again before anything is written.
  leaveScreen()
  loadStored()
  lang = loadLang()
  copy = LOSHADKA_COPY[lang]
  applyDocumentLang()
  allSetSaid = false
  selected = null
  welcomePending = false
  freshSketchIfFinished()
  renderWorkshop()
})

// Another tab saved the game: take its progress rather than overwrite it later.
window.addEventListener('storage', (event) => {
  if (event.key !== LOSHADKA_KEY || celebration) return
  loadStored()
  if (screen === 'workshop') {
    leaveScreen()
    renderWorkshop()
  } else {
    leaveScreen()
    renderStable()
  }
})

applyDocumentLang()
freshSketchIfFinished()
renderWorkshop()
if (save.welcomed) narration.begin(copy.welcomeBack)
else {
  narration.begin(copy.welcome)
  welcomeGlow()
  save.welcomed = true
  persist()
  // iOS refuses speech until the first tap: then that tap tells Matryona's explanation.
  later(900, () => {
    if (!narration.refused) return
    stopWelcomeTour()
    welcomePending = true
    save.welcomed = false
    persist()
  })
}

/* ─────────────────────────── test hook ─────────────────────────── */

const hook: Record<string, unknown> = {
  state: () => ({
    screen,
    lang,
    look: { ...save.draft.look },
    missing: missingSides(save.draft.look),
    complete: isComplete(save.draft.look),
    done: finishedUnchanged(),
    editing: save.draft.editing,
    stars: save.stars,
    finished: save.finished,
    ponies: save.ponies.map((pony) => ({ id: pony.id, name: ponyName(pony), nameIndex: pony.name, look: { ...pony.look } })),
    celebration: celebration?.step ?? null,
    background: save.background,
    sound: save.sound,
    unlocked: openedGifts(save).map((gift) => giftKey(gift.kind, gift.id)),
    nextGift: nextGift(save),
    persistent,
    selected,
    neighSample: sfx.neighSample,
  }),
  save: () => JSON.parse(serialize(save)) as LoshadkaSave,
}

if (debug) {
  /** Open the next `n` gifts, as if `n` ponies were finished. */
  hook.give = (n = 1) => {
    save = restoreSave(serialize({ ...save, finished: save.finished + Math.max(0, Math.floor(n)) }))
    persist()
    if (screen === 'workshop' && !celebration) {
      renderStrips()
      updateStageTools()
    }
    return openedGifts(save).length
  }
  /** Dress the stage pony completely with the first item of every side. */
  hook.fill = () => {
    for (const side of SIDES) if (!save.draft.look[side]) save = wear(save, side, availableItems(save, side)[0].id)
    persist()
    if (screen === 'workshop') {
      renderPony()
      updateCells()
      renderSlots()
      updateDone()
    }
    return { ...save.draft.look }
  }
}

Object.defineProperty(window, '__loshadka', { value: hook })
