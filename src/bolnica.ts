import '@fontsource/andika/cyrillic-400.css'
import '@fontsource/andika/cyrillic-700.css'
import '@fontsource/andika/latin-400.css'
import '@fontsource/andika/latin-700.css'
import '@fontsource/balsamiq-sans/cyrillic-700.css'
import '@fontsource/balsamiq-sans/latin-700.css'
import './bolnica.css'
import { LANGS, isLang, loadLang, saveLang, type Lang } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { BOLNICA_COPY, clock, type BolnicaCopy, type PatientInfo } from './bolnica-copy.ts'
import { ANIMAL_AILMENT, animalPortrait, monsterUnmasked, type Animal, type Mood } from './bolnica-animals.ts'
import { FURS, TINTS, TINT_COLOR, WEARS, catBadge, catSvg, furIcon, wearIcon, type CatPose, type Fur, type Tint, type Wear } from './bolnica-cat.ts'
import {
  BED_HEAD,
  BED_VIEW,
  GURNEY_HEAD,
  WINDOW_OPENING,
  bandaidSvg,
  bedSvg,
  bellSvg,
  cameraSvg,
  gurneyFrontSvg,
  gurneySvg,
  hospitalSvg,
  icon,
  medalSvg,
  monitorSvg,
  monsterFaceSvg,
  noteSvg,
  shutterSvg,
  thermometerSvg,
  ticketSvg,
  windowFrameSvg,
  type IconName,
} from './bolnica-props.ts'
import { BolnicaAudio, type BolnicaEffect } from './bolnica-audio.ts'
import { LEVEL_COUNT, itemsFor, levelPlan, spokenForm, type ItemKind } from './bolnica-words.ts'
import { judge } from './bolnica-match.ts'
import { Listener, type Heard } from './bolnica-listen.ts'
import {
  BOLNICA_KEY,
  MAX_PLAYERS,
  MAX_STRIKES,
  NAME_MAX,
  REANIMATION_MS,
  WARD_COUNT,
  answer,
  cleanName,
  closeShutter,
  currentPlayer,
  deskState,
  freeWard,
  giveTicket,
  newPlayer,
  newPlayerId,
  ranking,
  restoreSave,
  returnPatients,
  roundDone,
  startNextRound,
  summon,
  takePhoto,
  toggleWear,
  type BolnicaSave,
  type Player,
  type WardPatient,
} from './bolnica-state.ts'

type Screen = 'title' | 'howto' | 'wardrobe' | 'reception' | 'ward' | 'board' | 'celebrate'
type DeskPhase = 'empty' | 'arrive' | 'wait' | 'photo' | 'leave' | 'sneak' | 'closed' | 'reopen'
type Modal = { kind: 'name'; then: Screen | null } | { kind: 'remove'; id: string } | { kind: 'healed'; animal: Animal; level: number; roundDone: boolean } | null

const params = new URLSearchParams(window.location.search)
const reanimationParam = Number(params.get('reanimation'))
const REANIMATION = Number.isFinite(reanimationParam) && reanimationParam > 0 ? reanimationParam * 1000 : REANIMATION_MS

const root = document.querySelector<HTMLElement>('#bolnica-app')!
let persistent = true
let save: BolnicaSave = restoreSave(null)
try {
  save = restoreSave(localStorage.getItem(BOLNICA_KEY))
} catch {
  persistent = false
}
let lang: Lang = loadLang()
let copy: BolnicaCopy = BOLNICA_COPY[lang]
let screen: Screen = 'title'
let deskPhase: DeskPhase = 'empty'
let justShot = false
let wardView = 1
let busy = false
let modal: Modal = null
let furOpen = false
let askedName = false
let bubbleText = ''
let heardText = ''
let catPose: CatPose = 'stand'
let listeningNow = false
let listenTurn = 0
let failedTurns = 0
let settingsOpen = false
/** Who is walking away from the window after taking a ticket. */
let leaving: { animal: Animal; variant: number; ward: number } | null = null

const narration = new PuppyNarration(() => ({ lang, enabled: save.sound }))
let audio = new BolnicaAudio(() => save.sound)
const listener = new Listener()

const me = (): Player => currentPlayer(save)

function persist(): void {
  me().updated = Date.now()
  try {
    localStorage.setItem(BOLNICA_KEY, JSON.stringify(save))
    persistent = true
  } catch {
    persistent = false
  }
}

/* ─────────────────────────── timers, speech, sound ─────────────────────────── */

const sceneTimers = new Set<number>()
function later(fn: () => void, ms: number): void {
  const id = window.setTimeout(() => {
    sceneTimers.delete(id)
    fn()
  }, ms)
  sceneTimers.add(id)
}
function clearScene(): void {
  sceneTimers.forEach((id) => window.clearTimeout(id))
  sceneTimers.clear()
  busy = false
}

function begin(label: string): void {
  audio.unlock()
  if (listener.listening) return
  narration.begin(label)
}
function say(...texts: string[]): void {
  if (listener.listening) return
  narration.announce(texts)
}
function sfx(effect: BolnicaEffect): void {
  if (listener.listening) return
  audio.play(effect)
}

function patientInfo(animal: Animal): PatientInfo {
  return copy.patients[animal]
}
function catName(player: Player = me()): string {
  return player.name || copy.defaultName
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/* ─────────────────────────── shared pieces ─────────────────────────── */

function i(name: IconName): string {
  return icon(name)
}

function scoreChip(): string {
  return `<p class="bo-score" id="bo-score" aria-label="${copy.pointsShort}: ${me().score}">${i('star')}<b>${me().score}</b></p>`
}

function topbar(): string {
  const back =
    screen === 'title'
      ? `<a class="bo-chip bo-home" href="/" data-action="home" aria-label="${copy.home}">${i('home')}<span>${copy.home}</span></a>`
      : `<button type="button" class="bo-chip bo-back" data-action="back" aria-label="${screen === 'ward' ? copy.toReception : copy.back}">${i(screen === 'ward' ? 'bell' : 'back')}<span>${screen === 'ward' ? copy.toReception : copy.back}</span>${screen === 'ward' && me().hospital.desk ? '<i class="bo-dot" aria-hidden="true"></i>' : ''}</button>`
  return `<header class="bo-top">
    ${back}
    <p class="bo-brand">${screen === 'title' ? '' : esc(copy.name)}</p>
    <div class="bo-top-tools">
      ${scoreChip()}
      <button type="button" id="bo-sound" class="bo-chip bo-icon-chip" data-action="sound" aria-pressed="${save.sound}" aria-label="${save.sound ? copy.soundOn : copy.soundOff}">${i(save.sound ? 'sound' : 'mute')}</button>
      <label class="bo-chip bo-lang"><span class="bo-visually-hidden">${copy.language}</span><select id="bo-language" aria-label="${copy.language}">${LANGS.map((l) => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select></label>
    </div>
  </header>`
}

function wardState(n: number): { label: string; kind: 'empty' | 'bed' | 'away' } {
  const patient = me().hospital.wards[n - 1]
  if (!patient) return { label: copy.wardEmpty, kind: 'empty' }
  if (patient.away) return { label: `${copy.wardAway} · ${patientInfo(patient.animal).nick}`, kind: 'away' }
  return { label: copy.wardWaiting(patientInfo(patient.animal).nick), kind: 'bed' }
}

function wardNavButtons(): string {
  const h = me().hospital
  return Array.from({ length: WARD_COUNT }, (_, index) => {
    const n = index + 1
    const state = wardState(n)
    const patient = h.wards[index]
    const current = screen === 'ward' && wardView === n
    const inner =
      state.kind === 'bed' && patient
        ? `<span class="bo-ward-face">${animalPortrait(patient.animal, { mood: 'sick', id: `nav${n}` })}</span>`
        : state.kind === 'away' && patient
          ? `<span class="bo-ward-away">${i('heart')}<small class="bo-away-time" data-ward="${n}">${clock(patient.away - Date.now())}</small></span>`
          : ''
    return `<button type="button" class="bo-ward-button is-${state.kind} ${current ? 'is-current' : ''} ${h.arrow === n ? 'has-arrow' : ''}" data-action="ward-${n}" aria-label="${esc(copy.wardNavLabel(n, state.label))}" ${current ? 'aria-current="page"' : ''}>
      ${h.arrow === n ? `<span class="bo-arrow" aria-hidden="true">${i('arrowDown')}</span>` : ''}
      <b>${n}</b>${inner}
    </button>`
  }).join('')
}

function sceneNav(): string {
  return `<nav class="bo-scene-nav" aria-label="${copy.wards}">
    <p class="bo-progress" id="bo-progress">${copy.progress(me().hospital.healed.length, LEVEL_COUNT)}</p>
    <div class="bo-wards"><span class="bo-wards-label">${copy.wards}</span><div class="bo-ward-buttons" id="bo-ward-buttons">${wardNavButtons()}</div></div>
  </nav>`
}

function refreshNav(): void {
  const node = root.querySelector('#bo-ward-buttons')
  if (node) node.innerHTML = wardNavButtons()
  const score = root.querySelector('#bo-score')
  if (score) score.outerHTML = scoreChip()
  const progress = root.querySelector('#bo-progress')
  if (progress) progress.textContent = copy.progress(me().hospital.healed.length, LEVEL_COUNT)
}

function catFigure(pose: CatPose, id: string): string {
  return catSvg(me().look, { pose, id })
}

function setCatPose(pose: CatPose): void {
  catPose = pose
  const node = root.querySelector<HTMLElement>('.bo-stage .bo-kitty')
  if (node) node.innerHTML = catFigure(pose, `scat${screen}`)
}

function setBubble(text: string): void {
  bubbleText = text
  const node = root.querySelector<HTMLElement>('#bo-bubble')
  if (node) {
    node.textContent = text
    node.classList.remove('is-new')
    void node.offsetWidth
    node.classList.add('is-new')
  }
}

function floatScore(delta: number, anchor: string): void {
  if (!delta) return
  const target = root.querySelector<HTMLElement>(anchor)
  const stage = root.querySelector<HTMLElement>('.bo-frame')
  refreshNav()
  if (!target || !stage) return
  const box = target.getBoundingClientRect()
  const frame = stage.getBoundingClientRect()
  const node = document.createElement('span')
  node.className = `bo-float ${delta > 0 ? 'is-plus' : 'is-minus'}`
  node.textContent = delta > 0 ? `+${delta}` : `−${-delta}`
  node.style.left = `${box.left - frame.left + box.width / 2}px`
  node.style.top = `${box.top - frame.top + box.height * 0.2}px`
  stage.append(node)
  window.setTimeout(() => node.remove(), 1400)
}

let toastTimer = 0
function toast(text: string): void {
  let node = document.querySelector<HTMLElement>('#bo-toast')
  if (!node) {
    node = document.createElement('div')
    node.id = 'bo-toast'
    node.className = 'bo-toast'
    node.setAttribute('role', 'status')
    document.body.append(node)
  }
  node.textContent = text
  node.classList.add('is-on')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => node!.classList.remove('is-on'), 3600)
}

/* ─────────────────────────── title ─────────────────────────── */

function titleScreen(): string {
  const player = me()
  const h = player.hospital
  const next = Math.min(LEVEL_COUNT, h.next)
  const voiceOk = Listener.supported()
  return `<section class="bo-title">
    <div class="bo-hero">
      <div class="bo-hero-art">
        <div class="bo-hero-house">${hospitalSvg({ id: 'house' })}</div>
        <button type="button" class="bo-hero-cat" data-action="cat-hello" aria-label="${esc(copy.doctor(catName()))}">${catSvg(player.look, { pose: 'wave', id: 'hero' })}</button>
        <p class="bo-nametag" aria-hidden="true">${esc(copy.doctor(catName()))}</p>
      </div>
      <div class="bo-hero-text">
        <p class="bo-byline">${copy.byline}</p>
        <h1 class="bo-logo">${esc(copy.name)}</h1>
        <p class="bo-tagline">${copy.tagline}</p>
        <button type="button" class="bo-start" data-action="start">
          <span class="bo-start-plaster" aria-hidden="true">${bandaidSvg({ id: 'start' })}</span>
          <span class="bo-start-label">${i('plus')}<span>${copy.start}</span></span>
        </button>
        <p class="bo-start-meta">${roundDone(h) ? `<span class="is-party">${copy.roundTitle}</span>` : `<span>${copy.level(next)}</span><span>${copy.progress(h.healed.length, LEVEL_COUNT)}</span>`}<span>${copy.points(player.score)}</span></p>
        <div class="bo-menu">
          <button type="button" class="bo-tile" data-action="howto">${i('bulb')}<span>${copy.howto}</span></button>
          <button type="button" class="bo-tile" data-action="board">${i('trophy')}<span>${copy.board}</span></button>
          <button type="button" class="bo-tile" data-action="wardrobe">${i('shirt')}<span>${copy.wardrobe}</span></button>
        </div>
      </div>
    </div>
    ${save.players.length > 1 ? whoPlays() : ''}
    <details class="bo-settings" ${settingsOpen ? 'open' : ''}>
      <summary class="bo-settings-summary">${i('helper')}<span><b>${copy.grownups}</b><small>${copy.checkerTitle}: ${copy.checkers[save.checker]}</small></span></summary>
      <div class="bo-setting" role="group" aria-label="${copy.checkerTitle}">
        <p class="bo-setting-title">${copy.checkerTitle}</p>
        <div class="bo-segment">
          <button type="button" data-action="checker-voice" aria-pressed="${save.checker === 'voice'}" ${voiceOk ? '' : 'disabled'}>${i('mic')}<span>${copy.checkers.voice}</span></button>
          <button type="button" data-action="checker-grownup" aria-pressed="${save.checker === 'grownup'}">${i('helper')}<span>${copy.checkers.grownup}</span></button>
        </div>
        <p class="bo-setting-hint">${voiceOk ? copy.checkerHints[save.checker] : copy.micUnsupported}</p>
      </div>
      ${
        save.checker === 'voice'
          ? `<label class="bo-switch"><input type="checkbox" data-action="forgiving" ${save.forgiving ? 'checked' : ''}/><span class="bo-switch-track" aria-hidden="true"></span><span><b>${copy.forgiving}</b><small>${copy.forgivingHint}</small></span></label>`
          : ''
      }
      <p class="bo-privacy">${copy.privacy}</p>
    </details>
    ${persistent ? '' : `<p class="bo-privacy">${copy.noSave}</p>`}
  </section>`
}

/** Several children on one device: pick your cat before starting. */
function whoPlays(): string {
  const cats = ranking(save.players)
    .map(
      (player, index) => `<button type="button" class="bo-who-cat" data-action="switch-${player.id}" aria-pressed="${player.id === save.current}" aria-label="${esc(catName(player))}: ${copy.points(player.score)}">
        <span class="bo-who-badge" aria-hidden="true">${catBadge(player.look, { id: `who${index}` })}</span>
        <span class="bo-who-name">${esc(catName(player))}</span>
        <span class="bo-who-score" aria-hidden="true">${i('star')}${player.score}</span>
      </button>`,
    )
    .join('')
  return `<div class="bo-who" role="group" aria-label="${copy.whoPlays}"><p class="bo-who-title">${copy.whoPlays}</p><div class="bo-who-row">${cats}</div></div>`
}

/** The ranking with costumes, as on the hall of fame, without the buttons. */
function miniRanking(): string {
  return `<ol class="bo-mini-rank">${ranking(save.players)
    .map(
      (player, index) => `<li class="${player.id === save.current ? 'is-current' : ''}">
        <span class="bo-mini-place">${index < 3 ? medalSvg((index + 1) as 1 | 2 | 3, { id: `mr${index}` }) : `<b>${index + 1}</b>`}</span>
        <span class="bo-mini-badge">${catBadge(player.look, { id: `mrb${index}` })}</span>
        <span class="bo-mini-name">${esc(catName(player))}</span>
        <span class="bo-mini-score">${i('star')}${player.score}</span>
      </li>`,
    )
    .join('')}</ol>`
}

/* ─────────────────────────── how to play ─────────────────────────── */

function howtoArt(index: number): string {
  switch (index) {
    case 0:
      return cameraSvg({ id: 'h0' })
    case 1:
      return ticketSvg(2, { id: 'h1' })
    case 2:
      return `<span class="bo-howto-pair">${monsterFaceSvg({ id: 'h2' })}${i('swipe')}</span>`
    case 3:
      return `<span class="bo-howto-wards"><i>1</i><i class="is-on">2</i><i>3</i><i>4</i></span>`
    case 4:
      return `<span class="bo-howto-card">${lang === 'ru' ? 'А' : 'A'}</span>`
    case 5:
      return `<span class="bo-howto-hearts">${i('heart')}${i('heart')}${i('heart')}</span>`
    case 6:
      return `<span class="bo-howto-points"><b>+1</b><b class="is-minus">−1</b></span>`
    default:
      return catBadge(me().look, { id: 'h7' })
  }
}

function howtoScreen(): string {
  return `<section class="bo-page bo-howto">
    <h1 class="bo-page-title">${copy.howtoTitle}</h1>
    <ol class="bo-steps">${copy.howtoSteps
      .map(
        (text, index) => `<li><button type="button" class="bo-step" data-action="step-${index}"><span class="bo-step-num" aria-hidden="true">${index + 1}</span><span class="bo-step-art" aria-hidden="true">${howtoArt(index)}</span><span class="bo-step-text">${text}</span></button></li>`,
      )
      .join('')}</ol>
    <div class="bo-page-actions">
      <button type="button" class="bo-button" data-action="howto-listen">${i('sound')}<span>${copy.howtoListen}</span></button>
      <button type="button" class="bo-button is-primary" data-action="start">${i('plus')}<span>${copy.start}</span></button>
    </div>
  </section>`
}

/* ─────────────────────────── wardrobe ─────────────────────────── */

/** On phones the mirror scrolls away; bring the cat back into view after a change. */
function showPreview(): void {
  const mirror = root.querySelector<HTMLElement>('.bo-glass')
  if (!mirror) return
  const box = mirror.getBoundingClientRect()
  if (box.bottom < 80 || box.top > window.innerHeight - 80) mirror.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function wardrobeScreen(): string {
  const look = me().look
  const wears = WEARS.map(
    (w) => `<button type="button" class="bo-wear" data-action="wear-${w}" aria-pressed="${look.wear.includes(w)}" aria-label="${copy.wears[w]}"><span class="bo-wear-art">${wearIcon(w, { id: `wi${w}` })}</span><span class="bo-wear-name">${copy.wears[w]}</span><span class="bo-wear-check" aria-hidden="true">${i('check')}</span></button>`,
  ).join('')
  const furs = FURS.map(
    (f) => `<button type="button" class="bo-swatch" data-action="fur-${f}" aria-pressed="${look.fur === f}" aria-label="${copy.furs[f]}"><span class="bo-swatch-art">${furIcon(f, look.tint, { id: `fi${f}` })}</span><span>${copy.furs[f]}</span></button>`,
  ).join('')
  const tints = TINTS.map(
    (t) => `<button type="button" class="bo-tint" data-action="tint-${t}" aria-pressed="${look.tint === t}" aria-label="${copy.tints[t]}" style="--tint:${TINT_COLOR[t]}"><i aria-hidden="true"></i><span>${copy.tints[t]}</span></button>`,
  ).join('')
  return `<section class="bo-page bo-wardrobe">
    <div class="bo-glass">
      <button type="button" class="bo-glass-cat" data-action="wardrobe-done" aria-label="${copy.tapCat}">${catSvg(look, { pose: 'stand', id: 'mirror' })}</button>
      <p class="bo-nametag">${esc(copy.doctor(catName()))}</p>
      <p class="bo-tapcat">${copy.tapCat}</p>
    </div>
    <div class="bo-closet">
      <h1 class="bo-page-title">${copy.wardrobeTitle}</h1>
      <h2 class="bo-closet-title">${copy.wearTitle}</h2>
      <div class="bo-wear-grid">
        ${wears}
        <button type="button" class="bo-wear bo-wear-fur" data-action="fur-toggle" aria-expanded="${furOpen}" aria-controls="bo-fur-panel"><span class="bo-wear-art">${furIcon('striped', look.tint, { id: 'fitoggle' })}</span><span class="bo-wear-name">${copy.furButton}</span></button>
        <button type="button" class="bo-wear bo-wear-name-button" data-action="name"><span class="bo-wear-art">${i('pencil')}</span><span class="bo-wear-name">${copy.nameTitle}</span></button>
      </div>
      <div class="bo-fur-panel" id="bo-fur-panel" ${furOpen ? '' : 'hidden'}>
        <h2 class="bo-closet-title">${copy.furTitle}</h2>
        <div class="bo-swatches">${furs}</div>
        <div class="bo-tints" ${look.fur === 'black' || look.fur === 'white' ? 'data-muted="true"' : ''}>
          <h3 class="bo-closet-sub">${i('palette')}<span>${copy.tintTitle}</span></h3>
          <div class="bo-tint-row">${tints}</div>
        </div>
      </div>
    </div>
  </section>`
}

/* ─────────────────────────── reception ─────────────────────────── */

function deskPortrait(): string {
  const desk = me().hospital.desk
  if (!desk) return ''
  return animalPortrait(desk.animal, { mood: 'sick', ailment: true, id: 'pwin' })
}

function photoPortrait(): string {
  const desk = me().hospital.desk
  if (!desk) return ''
  if (desk.kind === 'monster')
    return desk.obvious ? monsterUnmasked(desk.animal, { variant: desk.variant, id: 'pmon' }) : animalPortrait(desk.animal, { mood: 'sick', ailment: true, traits: desk.traits, id: 'pphoto' })
  return animalPortrait(desk.animal, { mood: 'sick', ailment: true, id: 'pphoto' })
}

function receptionStage(): string {
  const h = me().hospital
  const desk = h.desk
  const state = deskState(h)
  const shown = deskPhase !== 'empty' && deskPhase !== 'reopen'
  const face =
    deskPhase === 'sneak' && leaving
      ? monsterUnmasked(leaving.animal, { variant: leaving.variant, id: 'psneak' })
      : deskPhase === 'leave' && leaving
        ? animalPortrait(leaving.animal, { mood: 'better', ailment: true, id: 'pleave' })
        : deskPortrait()
  const sign = !desk && deskPhase === 'empty' && state !== 'open' ? `<p class="bo-window-sign">${state === 'full' ? copy.signFull : copy.signDone}</p>` : ''
  const window_ = `<div class="bo-window" data-phase="${deskPhase}">
      <div class="bo-window-opening" style="left:${(WINDOW_OPENING.x / 360) * 100}%;top:${(WINDOW_OPENING.y / 300) * 100}%;width:${(WINDOW_OPENING.w / 360) * 100}%;height:${(WINDOW_OPENING.h / 300) * 100}%">
        <div class="bo-window-room" aria-hidden="true"></div>
        ${shown && face ? `<div class="bo-patient">${face}${deskPhase === 'leave' ? `<span class="bo-patient-ticket">${ticketSvg(leaving?.ward ?? 1, { id: 'tleave' })}</span>` : ''}</div>` : ''}
        ${sign}
        <div class="bo-blind" aria-hidden="true">${shutterSvg({ id: 'shut' })}</div>
      </div>
      ${
        desk?.photo && deskPhase === 'photo' && !busy
          ? `<div class="bo-shutter-grip" aria-hidden="true" style="left:${(WINDOW_OPENING.x / 360) * 100}%;top:${(WINDOW_OPENING.y / 300) * 100}%;width:${(WINDOW_OPENING.w / 360) * 100}%;height:${((WINDOW_OPENING.h * 0.5) / 300) * 100}%"></div>
            <button type="button" class="bo-swipe-hint" data-action="shutter" aria-label="${copy.shutter}">${i('swipe')}<span>${copy.swipeHint}</span></button>`
          : ''
      }
      <div class="bo-window-front" aria-hidden="true">${windowFrameSvg({ id: 'win' })}</div>
      <p class="bo-window-plaque" tabindex="-1">${copy.reception}</p>
    </div>`
  const photo = desk?.photo && (deskPhase === 'photo' || deskPhase === 'closed')
  const ward = freeWard(h)
  return `<div class="bo-stage bo-stage--reception">
    <div class="bo-wall" aria-hidden="true"></div>
    <div class="bo-floor" aria-hidden="true"></div>
    ${window_}
    <div class="bo-counter" aria-hidden="true"><span class="bo-bell-spot">${bellSvg()}</span></div>
    <button type="button" class="bo-cam-btn ${desk && !desk.photo && deskPhase === 'wait' ? 'is-ready' : ''}" data-action="photo" aria-label="${copy.camera}">${cameraSvg({ id: 'cam' })}</button>
    ${
      photo
        ? `<figure class="bo-photo ${justShot ? 'is-developing' : ''}"><div class="bo-photo-img">${photoPortrait()}</div><figcaption>${copy.photoLabel}</figcaption></figure>`
        : ''
    }
    ${
      desk?.photo && deskPhase === 'photo' && ward && !busy
        ? `<button type="button" class="bo-ticket-btn" data-action="ticket" aria-label="${copy.ticketFor(ward)}"><span class="bo-ticket-art">${ticketSvg(ward, { id: 'tick' })}</span><span class="bo-ticket-label">${copy.ticketFor(ward)}</span></button>`
        : ''
    }
    <div class="bo-kitty bo-kitty--reception" aria-hidden="true">${catFigure(catPose, 'scatreception')}</div>
    <div class="bo-flashlight" aria-hidden="true"></div>
  </div>`
}

function receptionScreen(): string {
  return `<section class="bo-scene bo-reception">
    ${sceneNav()}
    <div class="bo-frame">
      ${receptionStage()}
      <div class="bo-dock"><p class="bo-bubble" id="bo-bubble" role="status" aria-live="polite">${esc(bubbleText)}</p></div>
    </div>
  </section>`
}

function renderStage(): void {
  const stage = root.querySelector<HTMLElement>('.bo-stage')
  if (!stage) return
  const active = document.activeElement
  const focused = active instanceof HTMLElement && stage.contains(active)
  const action = active instanceof HTMLElement && stage.contains(active) ? active.dataset.action : undefined
  const html = screen === 'reception' ? receptionStage() : screen === 'ward' ? wardStage() : ''
  stage.outerHTML = html
  justShot = false
  if (focused && !modal) keepFocus(action)
}

/** Re-rendered scenes keep keyboard focus on the same control, or the next useful one. */
function keepFocus(action?: string): void {
  const target =
    (action && root.querySelector<HTMLElement>(`.bo-stage [data-action="${action}"]`)) ||
    root.querySelector<HTMLElement>('.bo-stage .bo-ticket-btn, .bo-stage .bo-swipe-hint, .bo-stage .bo-cam-btn.is-ready, .bo-frame .bo-mic, .bo-frame .bo-judge') ||
    root.querySelector<HTMLElement>('.bo-window-plaque, .bo-ward-sign')
  target?.focus({ preventScroll: true })
}

function enterReception(label: string): void {
  if (roundDone(me().hospital)) {
    openCelebration(label)
    return
  }
  begin(label)
  showScreen('reception')
  const h = me().hospital
  if (h.desk) {
    deskPhase = h.desk.photo ? 'photo' : 'wait'
    catPose = 'point'
    renderStage()
    setBubble(h.desk.photo ? copy.photoReady : knockLine())
    say(bubbleText)
    return
  }
  deskPhase = 'empty'
  renderStage()
  deskIdle(true)
}

/** Nobody at the window: wait for the next knock, or explain why nobody comes. */
function deskIdle(announce: boolean): void {
  const state = deskState(me().hospital)
  if (state !== 'open') {
    const line = state === 'full' ? copy.deskFull : copy.deskDone
    setBubble(line)
    if (announce) say(line)
    return
  }
  setBubble(copy.nobodyYet)
  later(arrive, 1100)
}

/** The knock names who stands at the window; a monster names its disguise. */
function knockLine(): string {
  const desk = me().hospital.desk
  if (!desk) return copy.knock
  return copy.knockBy(patientInfo(desk.animal).nick, copy.ailments[ANIMAL_AILMENT[desk.animal]])
}

function arrive(): void {
  if (screen !== 'reception') return
  const desk = summon(me())
  if (!desk) {
    deskIdle(true)
    return
  }
  persist()
  deskPhase = 'arrive'
  setCatPose('point')
  renderStage()
  sfx('knock')
  const line = knockLine()
  setBubble(line)
  say(line)
  later(() => {
    if (deskPhase === 'arrive') {
      deskPhase = 'wait'
      root.querySelector('.bo-window')?.setAttribute('data-phase', 'wait')
      root.querySelector('.bo-cam-btn')?.classList.add('is-ready')
    }
  }, 900)
}

function shootPhoto(): void {
  const desk = me().hospital.desk
  if (!desk) {
    setBubble(copy.nobodyYet)
    say(copy.nobodyYet)
    return
  }
  if (busy) return
  if (desk.photo) {
    begin(copy.photoAgain)
    setBubble(copy.photoAgain)
    return
  }
  busy = true
  narration.silence()
  takePhoto(me())
  persist()
  sfx('shutter')
  later(() => sfx('flash'), 120)
  const camera = root.querySelector('.bo-cam-btn')
  camera?.classList.add('is-flashing')
  const flash = root.querySelector('.bo-flashlight')
  flash?.classList.add('is-on')
  later(() => {
    deskPhase = 'photo'
    justShot = true
    renderStage()
    sfx('develop')
  }, 380)
  later(() => {
    busy = false
    catPose = 'point'
    renderStage()
    setBubble(copy.photoReady)
    say(copy.photoReady)
  }, 1700)
}

function handTicket(): void {
  const player = me()
  const desk = player.hospital.desk
  if (!desk || busy) return
  if (!desk.photo) {
    begin(copy.photoFirst)
    setBubble(copy.photoFirst)
    return
  }
  busy = true
  narration.silence()
  const animal = desk.animal
  const before = player.score
  const result = giveTicket(player)
  persist()
  sfx('ticket')
  root.querySelector('.bo-ticket-btn')?.classList.add('is-flying')
  leaving = { animal, variant: desk.variant, ward: result.kind === 'admitted' ? result.ward : 0 }
  if (result.kind === 'admitted') {
    const line = copy.admitted(patientInfo(animal), result.ward)
    later(() => {
      deskPhase = 'leave'
      renderStage()
      refreshNav()
      sfx('step')
      setBubble(line)
      say(line)
    }, 650)
    later(() => {
      deskPhase = 'empty'
      busy = false
      renderStage()
      setCatPose('point')
      deskIdle(false)
    }, 2600)
    return
  }
  if (result.kind === 'monster-sneaked') {
    later(() => {
      deskPhase = 'sneak'
      renderStage()
      sfx('sneak')
      floatScore(player.score - before, '.bo-window')
      setCatPose('point')
      setBubble(copy.sneaked)
      say(copy.sneaked)
    }, 600)
    later(() => {
      deskPhase = 'empty'
      busy = false
      renderStage()
      setCatPose('stand')
      deskIdle(false)
    }, 3600)
    return
  }
  busy = false
}

function shutWindow(): void {
  const player = me()
  const desk = player.hospital.desk
  if (!desk || busy) return
  if (!desk.photo) {
    begin(copy.photoFirst)
    setBubble(copy.photoFirst)
    resetShutterDrag()
    return
  }
  busy = true
  narration.silence()
  const before = player.score
  const result = closeShutter(player)
  persist()
  deskPhase = 'closed'
  const win = root.querySelector<HTMLElement>('.bo-window')
  win?.setAttribute('data-phase', 'closed')
  win?.style.removeProperty('--drop')
  root.querySelector('.bo-shutter-grip')?.remove()
  root.querySelector('.bo-swipe-hint')?.remove()
  root.querySelector('.bo-ticket-btn')?.remove()
  sfx('roll')
  if (result === 'caught') {
    later(() => {
      sfx('grumble')
      floatScore(player.score - before, '.bo-window')
      setCatPose('cheer')
      setBubble(copy.caught)
      say(copy.caught)
    }, 650)
    later(() => sfx('caught'), 1300)
    later(() => {
      deskPhase = 'reopen'
      renderStage()
    }, 2600)
    later(() => {
      deskPhase = 'empty'
      busy = false
      renderStage()
      setCatPose('stand')
      deskIdle(false)
    }, 3400)
    return
  }
  // A real patient was shut out: open again, they are still waiting.
  later(() => {
    sfx('oops')
    floatScore(player.score - before, '.bo-window')
    setBubble(copy.wrongPatient)
    say(copy.wrongPatient)
  }, 650)
  later(() => {
    deskPhase = 'wait'
    busy = false
    renderStage()
    root.querySelector('.bo-window')?.classList.add('is-reopening')
  }, 2200)
}

/* Shutter swipe: drag down from the top of the window, or tap the grip. */
let drag: { id: number; startY: number; height: number; moved: boolean; onHint: boolean } | null = null

function resetShutterDrag(): void {
  drag = null
  const win = root.querySelector<HTMLElement>('.bo-window')
  win?.classList.remove('is-dragging')
  win?.style.removeProperty('--drop')
}

root.addEventListener('pointerdown', (event) => {
  const grip = (event.target as HTMLElement).closest<HTMLElement>('.bo-shutter-grip, .bo-swipe-hint')
  if (!grip || busy) return
  const opening = root.querySelector<HTMLElement>('.bo-window-opening')
  if (!opening) return
  event.preventDefault()
  drag = { id: event.pointerId, startY: event.clientY, height: opening.getBoundingClientRect().height, moved: false, onHint: grip.classList.contains('bo-swipe-hint') }
  try {
    grip.setPointerCapture(event.pointerId)
  } catch {
    // Older Safari
  }
  root.querySelector('.bo-window')?.classList.add('is-dragging')
})

root.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return
  const progress = Math.max(0, Math.min(1, (event.clientY - drag.startY) / (drag.height * 0.8)))
  if (progress > 0.04) drag.moved = true
  root.querySelector<HTMLElement>('.bo-window')?.style.setProperty('--drop', progress.toFixed(3))
})

function endDrag(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.id) return
  const progress = Math.max(0, Math.min(1, (event.clientY - drag.startY) / (drag.height * 0.8)))
  const { moved, onHint } = drag
  drag = null
  root.querySelector('.bo-window')?.classList.remove('is-dragging')
  if (event.type === 'pointercancel') {
    resetShutterDrag()
    return
  }
  audio.unlock()
  // A swipe down past a third of the window closes it; so does a tap on the pull tab.
  if (progress > 0.33 || (!moved && onHint)) {
    shutWindow()
    return
  }
  resetShutterDrag()
  if (!moved) nudgeShutter()
}

/** A tap on the patient only shows how the shutter works: it never slams on them. */
function nudgeShutter(): void {
  const win = root.querySelector<HTMLElement>('.bo-window')
  if (!win) return
  win.classList.remove('is-nudged')
  void win.offsetWidth
  win.classList.add('is-nudged')
  sfx('tap')
  setBubble(copy.swipeHow)
  say(copy.swipeHow)
}
root.addEventListener('pointerup', endDrag)
root.addEventListener('pointercancel', endDrag)

/* ─────────────────────────── ward ─────────────────────────── */

function cardsOf(patient: WardPatient): string[] {
  return itemsFor(lang, patient.level, patient.seed)
}
function kindOf(patient: WardPatient): ItemKind {
  return levelPlan(lang, patient.level).kind
}
function currentPatient(): WardPatient | null {
  return me().hospital.wards[wardView - 1] ?? null
}

function moodOf(patient: WardPatient, cards: number): Mood {
  return patient.step >= Math.ceil(cards / 2) ? 'better' : 'sick'
}

function bedPortrait(patient: WardPatient, mood: Mood): string {
  const left = (BED_HEAD.x / BED_VIEW.w) * 100
  const top = (BED_HEAD.y / BED_VIEW.h) * 100
  const size = (BED_HEAD.size / BED_VIEW.w) * 100
  return `<div class="bo-bed-patient" style="left:${left}%;top:${top}%;width:${size}%">${animalPortrait(patient.animal, { mood, ailment: mood !== 'happy', id: `bed${wardView}` })}</div>`
}

function hearts(patient: WardPatient | null): string {
  const lost = patient?.strikes ?? 0
  return `<div class="bo-hearts" aria-label="${copy.hearts(MAX_STRIKES - lost)}">${Array.from({ length: MAX_STRIKES }, (_, index) => `<span class="bo-heart ${index >= MAX_STRIKES - lost ? 'is-lost' : ''}">${i('heart')}</span>`).join('')}</div>`
}

function chart(patient: WardPatient): string {
  const cards = cardsOf(patient)
  const kind = kindOf(patient)
  const step = Math.min(patient.step, cards.length - 1)
  const queue = cards
    .map((card, index) =>
      index < patient.step
        ? `<li class="is-done">${noteSvg(true)}</li>`
        : index === step
          ? `<li class="is-now"><span>${esc(card)}</span></li>`
          : '<li class="is-later"></li>',
    )
    .join('')
  return `<div class="bo-chart" data-kind="${kind}">
      <span class="bo-chart-clip" aria-hidden="true"></span>
      <p class="bo-chart-kind">${copy.kinds[kind]}</p>
      <p class="bo-card is-enter" data-len="${cards[step].length}" aria-label="${copy.kinds[kind]}: ${esc(cards[step])}">${esc(cards[step])}</p>
      <ol class="bo-queue" aria-label="${copy.cardsLeft(patient.step, cards.length)}">${queue}</ol>
    </div>`
}

function wardStage(): string {
  const patient = currentPatient()
  const state = !patient ? 'empty' : patient.away ? 'away' : 'bed'
  const bed = bedSvg({ id: `bedsvg${wardView}` })
  const cards = patient ? cardsOf(patient) : []
  const level = patient ? patient.step / Math.max(1, cards.length) : 1
  return `<div class="bo-stage bo-stage--ward" data-state="${state}">
    <div class="bo-wall" aria-hidden="true"></div>
    <div class="bo-floor" aria-hidden="true"></div>
    <p class="bo-ward-sign" tabindex="-1"><b>${wardView}</b><span>${copy.ward(wardView).replace(String(wardView), '').trim()}</span></p>
    <div class="bo-monitor-spot" aria-hidden="true">${monitorSvg({ id: 'mon' })}</div>
    <div class="bo-bed" aria-hidden="true">
      <div class="bo-bed-layer">${bed.back}</div>
      ${patient && !patient.away ? bedPortrait(patient, moodOf(patient, cards.length)) : ''}
      <div class="bo-bed-layer">${bed.front}</div>
    </div>
    ${patient && !patient.away ? `<div class="bo-patient-tag"><b>${esc(patientInfo(patient.animal).nick)}</b><span>${copy.ailments[ANIMAL_AILMENT[patient.animal]]}</span><span class="bo-tag-level">${copy.level(patient.level)}</span>${hearts(patient)}</div>` : ''}
    <figure class="bo-doctor-frame" aria-hidden="true">${catBadge(me().look, { id: 'wallframe' })}<figcaption>${esc(copy.doctor(catName()))}</figcaption></figure>
    <div class="bo-thermo" aria-hidden="true">${thermometerSvg(patient && !patient.away ? 1 - level : 0, { id: 'thermo' })}</div>
    <div class="bo-kitty bo-kitty--ward" aria-hidden="true">${catFigure(catPose, 'scatward')}</div>
    ${patient && !patient.away ? chart(patient) : ''}
    ${patient && patient.away ? `<div class="bo-away"><span class="bo-away-light" aria-hidden="true"></span><p><b>${copy.wardAway}</b><span class="bo-away-time" data-ward="${wardView}">${clock(patient.away - Date.now())}</span></p></div>` : ''}
    <div class="bo-ride" aria-hidden="true"></div>
    <div class="bo-confetti" aria-hidden="true"></div>
  </div>`
}

function answerDock(): string {
  const patient = currentPatient()
  if (!patient || patient.away) return `<div class="bo-answer"><button type="button" class="bo-button is-primary" data-action="reception">${i('bell')}<span>${copy.goReception}</span></button></div>`
  if (save.checker === 'grownup')
    return `<div class="bo-answer bo-answer--grownup"><p class="bo-grownup-hint">${i('helper')}<span>${copy.grownupHint}</span></p><div class="bo-grownup-buttons"><button type="button" class="bo-judge is-right" data-action="judge-right">${i('check')}<span>${copy.grownupCorrect}</span></button><button type="button" class="bo-judge is-wrong" data-action="judge-wrong">${i('x')}<span>${copy.grownupWrong}</span></button></div></div>`
  return `<div class="bo-answer"><button type="button" class="bo-mic ${listeningNow ? 'is-listening' : ''}" data-action="mic" aria-pressed="${listeningNow}" aria-label="${listeningNow ? copy.micStop : copy.mic}"><span class="bo-mic-ring" aria-hidden="true"></span>${i('mic')}</button><p class="bo-mic-label">${listeningNow ? copy.listening : copy.mic}</p></div>`
}

function wardScreen(): string {
  return `<section class="bo-scene bo-ward">
    ${sceneNav()}
    <div class="bo-frame">
      ${wardStage()}
      <div class="bo-dock">
        <p class="bo-bubble" id="bo-bubble" role="status" aria-live="polite">${esc(bubbleText)}</p>
        <p class="bo-heard" id="bo-heard">${esc(heardText)}</p>
        <div id="bo-answer-slot">${answerDock()}</div>
      </div>
    </div>
  </section>`
}

function refreshAnswer(): void {
  const slot = root.querySelector('#bo-answer-slot')
  if (!slot) return
  const active = document.activeElement
  const action = active instanceof HTMLElement && slot.contains(active) ? active.dataset.action : undefined
  slot.innerHTML = answerDock()
  if (action) (slot.querySelector<HTMLElement>(`[data-action="${action}"]`) ?? slot.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
}
function setHeard(text: string): void {
  heardText = text
  const node = root.querySelector('#bo-heard')
  if (node) node.textContent = text
}

/** What to do with the card: tap the microphone, or read aloud to a grown-up. */
function prompt(kind: ItemKind): string {
  return (save.checker === 'grownup' ? copy.readAloud : copy.readPrompt)[kind]
}

function wardLine(patient: WardPatient | null): string {
  if (!patient) return copy.emptyWardLine
  const info = patientInfo(patient.animal)
  if (patient.away) return copy.awayFor(info, copy.duration(patient.away - Date.now()))
  return copy.wardIntro(wardView, info, copy.ailments[ANIMAL_AILMENT[patient.animal]], prompt(kindOf(patient)))
}

function enterWard(n: number, label?: string): void {
  stopListening()
  wardView = n
  const h = me().hospital
  if (h.arrow === n) {
    h.arrow = null
    persist()
  }
  heardText = ''
  failedTurns = 0
  const patient = currentPatient()
  catPose = patient && !patient.away ? 'point' : 'stand'
  bubbleText = wardLine(patient)
  begin(label ? `${label}. ${bubbleText}` : bubbleText)
  showScreen('ward')
  void listener.prepare(lang)
}

/** Cancels the listening turn: nothing heard in it counts. */
function stopListening(): void {
  listenTurn += 1
  if (!listener.listening && !listeningNow) return
  listeningNow = false
  listener.abort()
  if (screen === 'ward') refreshAnswer()
}

function startListening(): void {
  const patient = currentPatient()
  if (!patient || patient.away || busy) return
  if (listener.listening) {
    // A second tap ends the turn with what was said so far.
    listener.stop()
    return
  }
  if (!Listener.supported()) {
    switchToGrownup(copy.micUnsupported)
    return
  }
  narration.silence()
  audio.silence()
  const cards = cardsOf(patient)
  const target = cards[Math.min(patient.step, cards.length - 1)]
  const kind = kindOf(patient)
  const ward = wardView
  const turn = ++listenTurn
  const turnLang = lang
  listeningNow = true
  setHeard('')
  setCatPose('listen')
  refreshAnswer()
  const heard = listener.listen(lang, (transcripts) => judge(lang, target, kind, transcripts).verdict === 'correct', () => root.querySelector('.bo-mic')?.classList.add('is-hearing'))
  void heard.then((result) => {
    if (turn !== listenTurn || turnLang !== lang) return
    onHeard(result, ward, target, kind)
  })
}

/** Silence or a failing recogniser twice on one card: offer the grown-up mode. */
function failedTurn(message: string): void {
  failedTurns += 1
  setBubble(message)
  say(message)
  if (failedTurns >= 2) showGrownupOffer()
}

function onHeard(result: Heard, ward: number, target: string, kind: ItemKind): void {
  listeningNow = false
  if (screen !== 'ward' || wardView !== ward) return
  refreshAnswer()
  setCatPose('point')
  if (result.error === 'aborted' && !result.transcripts.length) return
  if (result.error === 'denied') {
    setBubble(copy.micDenied)
    say(copy.micDenied)
    showGrownupOffer()
    return
  }
  if (result.error === 'service') {
    setBubble(copy.micService)
    say(copy.micService)
    showGrownupOffer()
    return
  }
  if (result.error === 'unsupported') {
    switchToGrownup(copy.micUnsupported)
    return
  }
  if (result.error === 'network') {
    setBubble(copy.micNetwork)
    say(copy.micNetwork)
    showGrownupOffer()
    return
  }
  if (result.error === 'audio' || result.error === 'other') {
    failedTurn(copy.micTrouble)
    return
  }
  const verdict = judge(lang, target, kind, result.transcripts)
  if (verdict.verdict === 'unclear') {
    sfx('retry')
    failedTurn(verdict.heard ? copy.retryHeard(copy.quote(verdict.heard)) : copy.nothingHeard)
    return
  }
  failedTurns = 0
  resolveAnswer(verdict.verdict === 'correct', verdict.heard)
}

function showGrownupOffer(): void {
  const slot = root.querySelector('#bo-answer-slot')
  if (!slot || slot.querySelector('[data-action="use-grownup"]')) return
  slot.insertAdjacentHTML('beforeend', `<button type="button" class="bo-button bo-small" data-action="use-grownup">${i('helper')}<span>${copy.checkers.grownup}</span></button>`)
}

function switchToGrownup(message: string): void {
  save.checker = 'grownup'
  persist()
  setBubble(message)
  say(message)
  refreshAnswer()
}

function resolveAnswer(correct: boolean, heard: string): void {
  const player = me()
  const patient = currentPatient()
  if (!patient || patient.away || busy) return
  const cards = cardsOf(patient)
  const kind = kindOf(patient)
  const index = Math.min(patient.step, cards.length - 1)
  const target = cards[index]
  const spoken = spokenForm(lang, target, kind)
  const before = player.score
  const animal = patient.animal
  const result = answer(player, wardView, correct, cards.length, {
    forgiving: save.checker === 'voice' && save.forgiving,
    now: Date.now(),
    reanimationMs: REANIMATION,
  })
  persist()
  const delta = player.score - before
  const card = root.querySelector<HTMLElement>('.bo-card')

  switch (result.kind) {
    case 'next': {
      busy = true
      sfx('correct')
      audio.note(index)
      card?.classList.remove('is-enter')
      card?.classList.add('is-correct')
      floatScore(delta, '.bo-card')
      setCatPose('cheer')
      const word = pick(copy.correct)
      setBubble(copy.correctSay(word, copy.quote(target)))
      say(copy.correctSay(word, spoken))
      later(() => {
        busy = false
        renderStage()
        setCatPose('point')
      }, 900)
      return
    }
    case 'healed':
      heal(animal, result.level, result.roundDone, index, delta, spoken)
      return
    case 'retry':
      sfx('retry')
      card?.classList.add('is-wobble')
      later(() => card?.classList.remove('is-wobble'), 600)
      setBubble(heard ? copy.retryHeard(copy.quote(heard)) : copy.retry)
      say(bubbleText)
      return
    case 'wrong': {
      busy = true
      sfx('wrong')
      card?.classList.add('is-wrong')
      later(() => {
        busy = false
        card?.classList.remove('is-wrong')
      }, 650)
      floatScore(delta, '.bo-hearts')
      const lostHeart = root.querySelectorAll<HTMLElement>('.bo-heart')[MAX_STRIKES - result.strikes]
      lostHeart?.classList.add('is-lost', 'is-breaking')
      const left = MAX_STRIKES - result.strikes
      setBubble(heard ? copy.wrongHeard(copy.quote(heard), left) : copy.wrong(left))
      say(bubbleText)
      return
    }
    case 'reanimation':
      reanimate(animal, target, spoken, delta)
      return
    default:
  }
}

function heal(animal: Animal, level: number, roundDone: boolean, index: number, delta: number, spoken: string): void {
  busy = true
  const info = patientInfo(animal)
  setBubble(copy.correctSay(pick(copy.correct), spoken))
  say(bubbleText)
  const card = root.querySelector<HTMLElement>('.bo-card')
  card?.classList.add('is-correct')
  floatScore(delta, '.bo-card')
  sfx('correct')
  audio.note(index)
  refreshNav()
  later(() => {
    const stage = root.querySelector<HTMLElement>('.bo-stage')
    stage?.setAttribute('data-state', 'healed')
    const patientNode = root.querySelector<HTMLElement>('.bo-bed-patient')
    if (patientNode) patientNode.innerHTML = animalPortrait(animal, { mood: 'happy', id: `happy${wardView}` })
    root.querySelector('.bo-chart')?.remove()
    root.querySelector('.bo-hearts')?.remove()
    const thermo = root.querySelector('.bo-thermo')
    if (thermo) thermo.innerHTML = thermometerSvg(0, { id: 'thermo2' })
    confetti()
    setCatPose('cheer')
    const song = audio.song(index + 1)
    later(() => sfx('heal'), Math.max(200, song - 300))
    const line = copy.healed(info, catName())
    setBubble(line)
    say(line)
    // The song plays first; the dock stays empty until the healed card.
    const slot = root.querySelector('#bo-answer-slot')
    if (slot) slot.innerHTML = ''
    later(() => {
      busy = false
      modal = { kind: 'healed', animal, level, roundDone }
      renderModal()
    }, Math.max(2600, song + 900))
  }, 700)
}

function reanimate(animal: Animal, card: string, spoken: string, delta: number): void {
  busy = true
  const info = patientInfo(animal)
  sfx('wrong')
  floatScore(delta, '.bo-hearts')
  root.querySelectorAll('.bo-heart').forEach((heart) => heart.classList.add('is-lost'))
  root.querySelector('.bo-card')?.classList.add('is-wrong')
  later(() => {
    sfx('siren')
    const gurney = root.querySelector<HTMLElement>('.bo-ride')
    if (gurney) {
      const left = (GURNEY_HEAD.x / 320) * 100
      const top = (GURNEY_HEAD.y / 170) * 100
      const size = (GURNEY_HEAD.size / 320) * 100
      gurney.innerHTML = `<div class="bo-ride-layer">${gurneySvg({ id: 'gur' })}</div><div class="bo-gurney-patient" style="left:${left}%;top:${top}%;width:${size}%">${animalPortrait(animal, { mood: 'sick', ailment: true, id: 'gurp' })}</div><div class="bo-ride-layer is-front">${gurneyFrontSvg({ id: 'gurf' })}</div>`
      gurney.classList.add('is-leaving')
    }
    root.querySelector('.bo-bed-patient')?.classList.add('is-lifted')
    root.querySelector('.bo-chart')?.classList.add('is-gone')
    setHeard('')
    setBubble(`${copy.reanimation(info)} ${copy.reveal(copy.quote(card))}`)
    say(copy.reanimation(info), copy.reveal(spoken))
    setCatPose('stand')
  }, 700)
  later(() => {
    busy = false
    refreshNav()
    renderStage()
    refreshAnswer()
    // A very short intensive care (tests) may already be over.
    const back = currentPatient()
    if (back && !back.away) announceReturn(wardView, back)
  }, 3600)
}

function announceReturn(n: number, patient: WardPatient): void {
  const line = copy.backFrom(patientInfo(patient.animal), n)
  if (screen === 'ward' && wardView === n) {
    catPose = 'point'
    renderStage()
    refreshAnswer()
    root.querySelector('.bo-bed-patient')?.classList.add('is-back')
    setHeard('')
    setBubble(`${line} ${prompt(kindOf(patient))}`)
    say(bubbleText)
    return
  }
  toast(line)
  if (screen === 'reception' || screen === 'ward') say(line)
}

function confetti(): void {
  const node = root.querySelector<HTMLElement>('.bo-confetti')
  if (!node) return
  const colors = ['#F0445A', '#FFD447', '#1F8A7A', '#B9A7F2', '#8EC5FF', '#F7A1C4']
  node.innerHTML = Array.from({ length: 36 }, (_, index) => {
    const x = (index * 37) % 100
    const delay = (index % 9) * 0.07
    const turn = ((index * 53) % 360) - 180
    return `<i style="--x:${x}%;--d:${delay}s;--r:${turn}deg;--c:${colors[index % colors.length]}"></i>`
  }).join('')
}

/* ─────────────────────────── board & celebration ─────────────────────────── */

function boardScreen(): string {
  const list = ranking(save.players)
  const cards = list
    .map((player, index) => {
      const current = player.id === save.current
      const rank = index + 1
      return `<li class="bo-board-card ${current ? 'is-current' : ''}">
        <span class="bo-board-rank">${rank <= 3 ? medalSvg(rank as 1 | 2 | 3, { id: `med${index}` }) : `<b>${rank}</b>`}</span>
        <span class="bo-board-cat">${catBadge(player.look, { id: `badge${index}` })}</span>
        <span class="bo-board-name"><b>${esc(catName(player))}</b>${current ? `<small>${copy.you}</small>` : ''}</span>
        <span class="bo-board-score" aria-label="${copy.points(player.score)}">${i('star')}<b>${player.score}</b></span>
        <span class="bo-board-stats">
          <span>${i('bed')}<span class="bo-stat-label">${copy.statHealed}</span><b>${player.healed}</b></span>
          <span>${monsterFaceSvg({ id: `mf${index}` })}<span class="bo-stat-label">${copy.statCaught}</span><b>${player.caught}</b></span>
          <span>${i('trophy')}<span class="bo-stat-label">${copy.statRounds}</span><b>${player.rounds}</b></span>
        </span>
        <span class="bo-board-actions">
          ${current ? '' : `<button type="button" class="bo-button bo-small" data-action="switch-${player.id}">${copy.thisIsMe}</button>`}
          ${save.players.length > 1 ? `<button type="button" class="bo-icon-button" data-action="remove-${player.id}" aria-label="${copy.remove}: ${esc(catName(player))}">${i('trash')}</button>` : ''}
        </span>
      </li>`
    })
    .join('')
  return `<section class="bo-page bo-board">
    <h1 class="bo-page-title">${copy.boardTitle}</h1>
    <p class="bo-page-intro">${copy.boardIntro}</p>
    <ol class="bo-board-list">${cards}</ol>
    <div class="bo-page-actions">
      <button type="button" class="bo-button" data-action="new-cat" ${save.players.length >= MAX_PLAYERS ? 'disabled' : ''}>${i('plus')}<span>${copy.newCat}</span></button>
      <button type="button" class="bo-button is-primary" data-action="start">${i('plus')}<span>${copy.start}</span></button>
    </div>
  </section>`
}

function celebrateScreen(): string {
  const player = me()
  const parade = player.hospital.order.map((animal, index) => `<span class="bo-parade-face" style="--i:${index}">${animalPortrait(animal, { mood: 'happy', id: `par${index}` })}</span>`).join('')
  return `<section class="bo-page bo-celebrate">
    <div class="bo-parade" aria-hidden="true">${parade}</div>
    <div class="bo-celebrate-cat" aria-hidden="true">${catSvg(player.look, { pose: 'cheer', id: 'party' })}</div>
    <h1 class="bo-page-title">${copy.roundTitle}</h1>
    <p class="bo-page-intro">${esc(copy.roundText(catName(), player.hospital.round))}</p>
    <p class="bo-start-meta"><span>${copy.points(player.score)}</span><span>${copy.roundBadge(player.rounds + 1)}</span></p>
    ${miniRanking()}
    <div class="bo-page-actions">
      <button type="button" class="bo-button" data-action="board">${i('trophy')}<span>${copy.board}</span></button>
      <button type="button" class="bo-button is-primary" data-action="new-round">${i('replay')}<span>${copy.again}</span></button>
    </div>
    <div class="bo-confetti is-party" aria-hidden="true"></div>
  </section>`
}

/* ─────────────────────────── modals ─────────────────────────── */

let modalOpener: string | null = null

function renderModal(): void {
  root.querySelector('.bo-modal')?.remove()
  const main = root.querySelector<HTMLElement>('main')
  if (main) main.inert = Boolean(modal)
  if (!modal) return
  let body = ''
  if (modal.kind === 'name') {
    body = `<div class="bo-modal-card" role="dialog" aria-modal="true" aria-labelledby="bo-modal-title">
      <div class="bo-modal-badge" aria-hidden="true">${catBadge(me().look, { id: 'namebadge' })}</div>
      <h2 id="bo-modal-title">${copy.nameTitle}</h2>
      <p>${copy.nameHint}</p>
      <form class="bo-name-form" data-form="name">
        <input id="bo-name-input" name="name" type="text" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="${copy.namePlaceholder}" value="${esc(me().name)}" aria-label="${copy.nameTitle}"/>
        <div class="bo-modal-actions">
          <button type="button" class="bo-button" data-action="name-skip">${copy.nameSkip}</button>
          <button type="submit" class="bo-button is-primary">${i('check')}<span>${copy.nameSave}</span></button>
        </div>
      </form>
    </div>`
  } else if (modal.kind === 'remove') {
    const target = save.players.find((p) => p.id === (modal as { id: string }).id)
    if (!target) {
      modal = null
      return
    }
    body = `<div class="bo-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="bo-modal-title">
      <div class="bo-modal-badge" aria-hidden="true">${catBadge(target.look, { id: 'rmbadge' })}</div>
      <h2 id="bo-modal-title">${esc(copy.removeAsk(catName(target)))}</h2>
      <div class="bo-modal-actions">
        <button type="button" class="bo-button is-primary" data-action="remove-no">${copy.removeNo}</button>
        <button type="button" class="bo-button is-danger" data-action="remove-yes">${i('trash')}<span>${copy.removeYes}</span></button>
      </div>
    </div>`
  } else {
    const info = patientInfo(modal.animal)
    const h = me().hospital
    body = `<div class="bo-modal-card bo-healed" role="dialog" aria-modal="true" aria-labelledby="bo-modal-title">
      <div class="bo-healed-face" aria-hidden="true">${animalPortrait(modal.animal, { mood: 'happy', id: 'healedface' })}</div>
      <h2 id="bo-modal-title">${esc(copy.healedTitle(info))}</h2>
      <p class="bo-start-meta"><span>${copy.progress(h.healed.length, LEVEL_COUNT)}</span><span>${copy.points(me().score)}</span></p>
      <div class="bo-modal-actions">
        ${
          modal.roundDone
            ? `<button type="button" class="bo-button is-primary" data-action="celebrate">${i('trophy')}<span>${copy.celebrate}</span></button>`
            : `<button type="button" class="bo-button" data-action="board">${i('trophy')}<span>${copy.board}</span></button><button type="button" class="bo-button is-primary" data-action="reception">${i('bell')}<span>${copy.goReception}</span></button>`
        }
      </div>
    </div>`
  }
  root.insertAdjacentHTML('beforeend', `<div class="bo-modal">${body}</div>`)
  const focus = root.querySelector<HTMLElement>('.bo-modal input, .bo-modal .is-primary')
  focus?.focus({ preventScroll: true })
}

function closeModal(): void {
  const wasOpen = Boolean(modal)
  modal = null
  renderModal()
  if (wasOpen && modalOpener) root.querySelector<HTMLElement>(`[data-action="${modalOpener}"]`)?.focus({ preventScroll: true })
  modalOpener = null
}

function rememberOpener(): void {
  modalOpener = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.action ?? null : null
}

function openName(then: Screen | null): void {
  rememberOpener()
  askedName = true
  modal = { kind: 'name', then }
  begin(copy.nameTitle)
  renderModal()
}

function saveName(value: string): void {
  const name = cleanName(value)
  const player = me()
  const then = modal?.kind === 'name' ? modal.then : null
  closeModal()
  if (name) {
    player.name = name
    player.named = true
    persist()
    sfx('name')
  }
  if (then === 'reception') {
    enterReception(name ? copy.nameSet(name) : copy.start)
    return
  }
  if (name) begin(copy.nameSet(name))
  render()
}

/* ─────────────────────────── screens ─────────────────────────── */

function render(): void {
  document.documentElement.lang = lang
  document.title = `${copy.name} · Spielzeuge`
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
  const body =
    screen === 'title'
      ? titleScreen()
      : screen === 'howto'
        ? howtoScreen()
        : screen === 'wardrobe'
          ? wardrobeScreen()
          : screen === 'reception'
            ? receptionScreen()
            : screen === 'ward'
              ? wardScreen()
              : screen === 'board'
                ? boardScreen()
                : celebrateScreen()
  root.innerHTML = `<main class="bo bo-screen-${screen}">${topbar()}${body}</main>`
  if (screen === 'celebrate') {
    const node = root.querySelector<HTMLElement>('.bo-confetti')
    if (node) {
      const colors = ['#F0445A', '#FFD447', '#1F8A7A', '#B9A7F2', '#8EC5FF', '#F7A1C4']
      node.innerHTML = Array.from({ length: 48 }, (_, index) => `<i style="--x:${(index * 29) % 100}%;--d:${(index % 12) * 0.12}s;--r:${((index * 71) % 360) - 180}deg;--c:${colors[index % colors.length]}"></i>`).join('')
    }
  }
  renderModal()
}

function showScreen(next: Screen): void {
  clearScene()
  stopListening()
  if (next !== 'reception' && next !== 'ward') releaseWake()
  else keepAwake()
  screen = next
  justShot = false
  render()
  window.scrollTo(0, 0)
  const heading = root.querySelector<HTMLElement>('h1, .bo-ward-sign, .bo-window-plaque')
  if (heading && !modal) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

let wakeLock: WakeLockSentinel | null = null
function keepAwake(): void {
  const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }
  if (!nav.wakeLock || wakeLock) return
  nav.wakeLock
    .request('screen')
    .then((lock) => {
      wakeLock = lock
      lock.addEventListener('release', () => {
        if (wakeLock === lock) wakeLock = null
      })
    })
    .catch(() => {})
}
function releaseWake(): void {
  void wakeLock?.release().catch(() => {})
  wakeLock = null
}

function openCelebration(label: string): void {
  modal = null
  sfx('cheer')
  begin(label)
  showScreen('celebrate')
  say(copy.roundText(catName(), me().hospital.round))
}

function startGame(label: string): void {
  if (!me().named && !askedName) {
    begin(label)
    openName('reception')
    return
  }
  enterReception(label)
}

function goBack(): void {
  if (screen === 'ward') {
    enterReception(copy.toReception)
    return
  }
  begin(copy.back)
  showScreen('title')
}

/* ─────────────────────────── events ─────────────────────────── */

function labelOf(target: HTMLElement): string {
  return (target.getAttribute('aria-label') ?? target.textContent ?? '').replace(/\s+/g, ' ').trim()
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
  if (!target || target instanceof HTMLInputElement) return
  const action = target.dataset.action!
  if (action === 'home') {
    teardown()
    return
  }
  if (action === 'shutter') {
    // Pointer taps and swipes are handled by the pointer events; this is the keyboard.
    if (event.detail === 0) {
      audio.unlock()
      shutWindow()
    }
    return
  }
  audio.unlock()

  if (action === 'sound') {
    save.sound = !save.sound
    persist()
    if (save.sound) {
      sfx('tap')
      narration.begin(copy.soundOn)
    } else {
      narration.silence()
      audio.silence()
    }
    const button = root.querySelector<HTMLElement>('#bo-sound')
    if (button) {
      button.outerHTML = `<button type="button" id="bo-sound" class="bo-chip bo-icon-chip" data-action="sound" aria-pressed="${save.sound}" aria-label="${save.sound ? copy.soundOn : copy.soundOff}">${i(save.sound ? 'sound' : 'mute')}</button>`
      root.querySelector<HTMLElement>('#bo-sound')?.focus()
    }
    return
  }

  if (action === 'mic') {
    startListening()
    return
  }
  if (action === 'judge-right' || action === 'judge-wrong') {
    begin(labelOf(target))
    resolveAnswer(action === 'judge-right', '')
    return
  }

  if (action !== 'photo' && action !== 'ticket') sfx('tap')

  switch (action) {
    case 'start':
      startGame(copy.start)
      return
    case 'back':
      goBack()
      return
    case 'reception':
      closeModal()
      enterReception(copy.toReception)
      return
    case 'howto':
      begin(copy.howtoTitle)
      showScreen('howto')
      say(...copy.howtoSteps)
      return
    case 'howto-listen':
      begin(copy.howtoTitle)
      say(...copy.howtoSteps)
      return
    case 'wardrobe':
      sfx('wardrobe')
      begin(copy.wardrobeIntro)
      showScreen('wardrobe')
      return
    case 'wardrobe-done':
      begin(copy.catHello(catName()))
      showScreen('title')
      return
    case 'board':
      closeModal()
      begin(copy.board)
      showScreen('board')
      return
    case 'celebrate':
      closeModal()
      sfx('cheer')
      begin(copy.roundTitle)
      showScreen('celebrate')
      say(copy.roundText(catName(), me().hospital.round))
      return
    case 'new-round':
      startNextRound(me())
      persist()
      enterReception(copy.again)
      return
    case 'cat-hello':
      sfx('pop')
      begin(copy.catHello(catName()))
      target.classList.remove('is-hello')
      void target.offsetWidth
      target.classList.add('is-hello')
      return
    case 'photo':
      shootPhoto()
      return
    case 'ticket':
      handTicket()
      return
    case 'name':
      openName(null)
      return
    case 'name-skip': {
      const then = modal?.kind === 'name' ? modal.then : null
      closeModal()
      if (then === 'reception') enterReception(copy.start)
      return
    }
    case 'fur-toggle':
      furOpen = !furOpen
      begin(copy.furTitle)
      render()
      root.querySelector<HTMLElement>('[data-action="fur-toggle"]')?.focus()
      return
    case 'checker-voice':
    case 'checker-grownup':
    case 'use-grownup': {
      save.checker = action === 'checker-voice' ? 'voice' : 'grownup'
      persist()
      begin(`${copy.checkers[save.checker]}. ${copy.checkerHints[save.checker]}`)
      if (screen === 'ward') {
        failedTurns = 0
        refreshAnswer()
        setBubble(wardLine(currentPatient()))
        return
      }
      render()
      root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus()
      return
    }
    case 'new-cat': {
      if (save.players.length >= MAX_PLAYERS) {
        toast(copy.tooMany)
        return
      }
      const now = Date.now()
      const player = newPlayer(newPlayerId(now, save.players.map((p) => p.id)), now)
      save.players.push(player)
      save.current = player.id
      persist()
      sfx('wardrobe')
      furOpen = false
      showScreen('wardrobe')
      openName(null)
      return
    }
    case 'remove-yes': {
      const id = modal?.kind === 'remove' ? modal.id : null
      closeModal()
      if (!id || save.players.length <= 1) return
      save.players = save.players.filter((p) => p.id !== id)
      if (save.current === id) save.current = save.players[0].id
      persist()
      render()
      return
    }
    case 'remove-no':
      closeModal()
      return
    default:
  }

  if (action.startsWith('ward-')) {
    closeModal()
    enterWard(Number(action.slice(5)))
    return
  }
  if (action.startsWith('step-')) {
    const index = Number(action.slice(5))
    begin(copy.howtoSteps[index] ?? '')
    return
  }
  if (action.startsWith('wear-')) {
    const wear = action.slice(5) as Wear
    const player = me()
    player.look = toggleWear(player.look, wear)
    persist()
    sfx('pop')
    begin(player.look.wear.includes(wear) ? copy.wearOn[wear] : copy.wearOff[wear])
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus()
    return
  }
  if (action.startsWith('fur-')) {
    const fur = action.slice(4) as Fur
    me().look = { ...me().look, fur }
    persist()
    sfx('pop')
    begin(copy.furs[fur])
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus({ preventScroll: true })
    showPreview()
    return
  }
  if (action.startsWith('tint-')) {
    const tint = action.slice(5) as Tint
    const plain = me().look.fur === 'white' || me().look.fur === 'black'
    me().look = { ...me().look, tint }
    persist()
    sfx('pop')
    begin(plain ? `${copy.tints[tint]}. ${copy.tintNeedsPattern}` : copy.tints[tint])
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus({ preventScroll: true })
    if (!plain) showPreview()
    return
  }
  if (action.startsWith('switch-')) {
    const id = action.slice(7)
    if (!save.players.some((p) => p.id === id)) return
    save.current = id
    persist()
    sfx('cheer')
    begin(copy.switched(catName()))
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus({ preventScroll: true })
    return
  }
  if (action.startsWith('remove-')) {
    rememberOpener()
    modal = { kind: 'remove', id: action.slice(7) }
    begin(labelOf(target))
    renderModal()
  }
})

root.addEventListener(
  'toggle',
  (event) => {
    const details = event.target
    if (details instanceof HTMLDetailsElement && details.classList.contains('bo-settings')) settingsOpen = details.open
  },
  true,
)

root.addEventListener('change', (event) => {
  const target = event.target
  if (target instanceof HTMLSelectElement && target.id === 'bo-language' && isLang(target.value)) {
    lang = target.value
    copy = BOLNICA_COPY[lang]
    saveLang(lang)
    stopListening()
    narration.languageChanged()
    heardText = ''
    if (screen === 'ward') bubbleText = wardLine(currentPatient())
    else if (screen === 'reception') {
      const desk = me().hospital.desk
      const state = deskState(me().hospital)
      bubbleText = desk ? (desk.photo ? copy.photoReady : copy.knock) : state === 'full' ? copy.deskFull : state === 'done' ? copy.deskDone : copy.nobodyYet
    }
    render()
    root.querySelector<HTMLElement>('#bo-language')?.focus()
    return
  }
  if (target instanceof HTMLInputElement && target.dataset.action === 'forgiving') {
    save.forgiving = target.checked
    persist()
    begin(copy.forgiving)
  }
})

root.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement
  if (form.dataset.form !== 'name') return
  event.preventDefault()
  const input = form.querySelector<HTMLInputElement>('input')
  saveName(input?.value ?? '')
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && modal.kind !== 'healed') {
    const then = modal.kind === 'name' ? modal.then : null
    closeModal()
    if (then === 'reception') enterReception(copy.start)
    return
  }
  if (event.target instanceof Element && event.target.closest('input, select, textarea, button')) return
  if (screen === 'ward' && !modal && event.key === ' ') {
    event.preventDefault()
    if (event.repeat) return
    audio.unlock()
    if (save.checker === 'voice') startListening()
  }
})

root.addEventListener('contextmenu', (event) => {
  if ((event.target as HTMLElement).closest('.bo-stage')) event.preventDefault()
})

/* Intensive care countdown and returns. */
window.setInterval(() => {
  const player = me()
  const back = returnPatients(player, Date.now())
  if (back.length) {
    persist()
    for (const n of back) {
      const patient = player.hospital.wards[n - 1]
      if (!patient) continue
      sfx('return')
      // While the gurney is still rolling out, the end of that scene announces the return.
      if (busy && screen === 'ward' && wardView === n) continue
      announceReturn(n, patient)
    }
    refreshNav()
  }
  root.querySelectorAll<HTMLElement>('.bo-away-time').forEach((node) => {
    const patient = player.hospital.wards[Number(node.dataset.ward) - 1]
    if (patient?.away) node.textContent = clock(patient.away - Date.now())
  })
}, 500)

function teardown(): void {
  clearScene()
  listener.abort()
  audio.destroy()
  narration.silence()
  releaseWake()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    narration.silence()
    audio.silence()
    stopListening()
  } else if (screen === 'reception' || screen === 'ward') keepAwake()
})
window.addEventListener('pagehide', teardown)
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  audio = new BolnicaAudio(() => save.sound)
  modal = null
  showScreen('title')
})

if (save.checker === 'voice' && !Listener.supported()) save.checker = 'grownup'
render()
narration.begin(copy.welcome(catName()))

// Test and debugging hook: a read-only view of the game.
Object.defineProperty(window, '__bolnica', {
  value: {
    state: () => ({
      screen,
      ward: wardView,
      deskPhase,
      busy,
      listening: listener.listening,
      modal: modal?.kind ?? null,
      bubble: bubbleText,
      heard: heardText,
      cards: screen === 'ward' && currentPatient() ? cardsOf(currentPatient()!) : [],
      save: JSON.parse(JSON.stringify(save)) as BolnicaSave,
    }),
  },
})
