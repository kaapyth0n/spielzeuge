/**
 * Тамагочи Связь — Matryona's game. This file is the frame around the canvas:
 * sizing, the game loop, fingers, language, sound and the three corner buttons.
 */
import '@fontsource/nunito/cyrillic-900.css'
import '@fontsource/nunito/latin-900.css'
import '@fontsource/nunito/latin-ext-900.css'
import './tamagochi.css'
import { LANG_LABEL, loadLang, nextLang, saveLang, type Lang } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { PET_NAME, TAMAGOCHI_COPY, fill, type CopyKey } from './tamagochi-copy.ts'
import type { Host } from './tamagochi-host.ts'
import { SPECIES, type Dir, type Pointer, type Scene, type SpeciesId } from './tamagochi-kit.ts'
import { HomeScene } from './tamagochi-home.ts'
import { MeetScene } from './tamagochi-meet.ts'
import { TamaSfx } from './tamagochi-sfx.ts'
import { ACTIVITIES, DOTS, SOUND_KEY, freshSave, loadSave, storeSave, type ActivityId } from './tamagochi-state.ts'

const SWIPE_PX = 30
const TOP_BAR = 64

const root = document.querySelector<HTMLElement>('#tamagochi-app')!
root.innerHTML = `
  <canvas id="tg-canvas" role="img"></canvas>
  <div class="tg-chrome">
    <button type="button" class="tg-btn" id="tg-sound" aria-pressed="true"></button>
    <button type="button" class="tg-btn" id="tg-lang"></button>
    <a class="tg-btn" id="tg-home" href="/">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 12 4l8.5 7.5M6 10v9.5h4.2V14h3.6v5.5H18V10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>
  <p class="tg-caption" id="tg-caption" aria-live="polite"></p>`
const canvas = root.querySelector<HTMLCanvasElement>('#tg-canvas')!
const ctx = canvas.getContext('2d')!
const soundBtn = root.querySelector<HTMLButtonElement>('#tg-sound')!
const langBtn = root.querySelector<HTMLButtonElement>('#tg-lang')!
const homeLink = root.querySelector<HTMLAnchorElement>('#tg-home')!
const caption = root.querySelector<HTMLElement>('#tg-caption')!

const params = new URLSearchParams(location.search)
let muted = false
try {
  muted = localStorage.getItem(SOUND_KEY) === '0'
} catch {
  // Storage is optional.
}

const sfx = new TamaSfx(muted)
let lang: Lang = loadLang()
const narration = new PuppyNarration(() => ({ lang, enabled: !muted }), undefined, { rate: 0.95, pitch: 1.25 })
let primed = false
let captionTimer = 0
let scene: Scene | null = null
let dpr = 1

/** The line on screen and in the air, and the ones waiting behind it. */
const line = { text: '', since: 0, min: 0, max: 0 }
const queue: string[] = []

function lineBusy(): boolean {
  if (!line.text) return false
  const age = performance.now() - line.since
  if (age < line.min) return true
  if (age > line.max) return false
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null
  return !muted && !!synth && (synth.speaking || synth.pending)
}

function pumpSpeech(): void {
  if (lineBusy()) return
  line.text = ''
  const text = queue.shift()
  if (!text) return
  const canSpeak = !muted && 'speechSynthesis' in window && !document.hidden
  line.text = text
  line.since = performance.now()
  // The voice needs a moment to start; without a voice the caption has to be readable.
  line.min = canSpeak ? 350 : Math.min(2400, 900 + text.length * 35)
  line.max = 1500 + text.length * 110
  caption.textContent = text
  caption.classList.add('is-on')
  window.clearTimeout(captionTimer)
  captionTimer = window.setTimeout(() => caption.classList.remove('is-on'), 2600 + text.length * 45)
  narration.announce([text])
}

function hush(): void {
  queue.length = 0
  line.text = ''
  narration.silence()
}

const game: Host = {
  w: 0,
  h: 0,
  safe: { x: 0, y: TOP_BAR, w: 0, h: 0 },
  time: 0,
  get lang() {
    return lang
  },
  set lang(_value: Lang) {
    // Changed only through the language button.
  },
  sfx,
  save: params.has('fresh') ? freshSave() : loadSave(),
  rnd: Math.random,
  say(text, soft = false) {
    if (!text) return
    // A line is never cut off. Hints that may be skipped wait for nobody;
    // everything else queues behind the line being spoken.
    if (text === line.text || queue.includes(text)) return
    if (soft && (lineBusy() || queue.length)) return
    if (queue.length >= 2) queue.pop()
    queue.push(text)
    pumpSpeech()
  },
  persist() {
    if (!params.has('fresh')) storeSave(game.save)
  },
  go(next) {
    scene?.leave?.()
    pointers.clear()
    scene = next
    scene.enter?.()
  },
  t(key: CopyKey, vars) {
    return fill(TAMAGOCHI_COPY[lang][key], vars)
  },
  petName(species: SpeciesId) {
    return PET_NAME[lang][species]
  },
}

function applyChrome(): void {
  const c = TAMAGOCHI_COPY[lang]
  document.documentElement.lang = lang
  document.title = c.documentTitle
  document.querySelector('meta[name="description"]')?.setAttribute('content', c.description)
  canvas.setAttribute('aria-label', c.canvas)
  homeLink.setAttribute('aria-label', c.home)
  homeLink.title = c.home
  langBtn.textContent = lang.toUpperCase()
  langBtn.setAttribute('aria-label', `${c.lang}: ${LANG_LABEL[lang]}`)
  soundBtn.setAttribute('aria-label', muted ? c.soundOff : c.soundOn)
  soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true')
  soundBtn.innerHTML = muted
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6m2.6-8.6a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
}

function prime(): void {
  sfx.unlock()
  if (!primed || narration.refused) {
    primed = true
    narration.begin('')
  }
}

langBtn.addEventListener('click', () => {
  lang = nextLang(lang)
  saveLang(lang)
  applyChrome()
  sfx.unlock()
  primed = true
  caption.classList.remove('is-on')
  queue.length = 0
  line.text = ''
  narration.languageChanged()
})

soundBtn.addEventListener('click', () => {
  muted = !muted
  try {
    localStorage.setItem(SOUND_KEY, muted ? '0' : '1')
  } catch {
    // Storage is optional.
  }
  sfx.unlock()
  sfx.setMuted(muted)
  if (muted) hush()
  else sfx.play('pop')
  applyChrome()
})

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  game.w = window.innerWidth
  game.h = window.innerHeight
  canvas.width = Math.round(game.w * dpr)
  canvas.height = Math.round(game.h * dpr)
  game.safe = { x: 0, y: TOP_BAR, w: game.w, h: game.h - TOP_BAR }
  scene?.resize?.()
}

const pointers = new Map<number, Pointer & { born: number }>()
const pos = (e: PointerEvent): { x: number; y: number } => {
  const r = canvas.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  prime()
  try {
    canvas.setPointerCapture(e.pointerId)
  } catch {
    // Synthetic pointers cannot be captured.
  }
  const { x, y } = pos(e)
  const p = { id: e.pointerId, x, y, x0: x, y0: y, age: 0, swiped: false, born: performance.now() }
  pointers.set(e.pointerId, p)
  scene?.down?.(p)
})
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId)
  if (!p) return
  Object.assign(p, pos(e))
  p.age = (performance.now() - p.born) / 1000
  scene?.move?.(p)
  if (!p.swiped) {
    const dx = p.x - p.x0
    const dy = p.y - p.y0
    if (Math.hypot(dx, dy) >= SWIPE_PX) {
      p.swiped = true
      const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      scene?.swipe?.(p, dir)
    }
  }
})
const release = (e: PointerEvent, cancelled: boolean): void => {
  // iOS starts sound and speech only from the end of a touch.
  if (!cancelled) prime()
  const p = pointers.get(e.pointerId)
  if (!p) return
  pointers.delete(e.pointerId)
  if (!cancelled) Object.assign(p, pos(e))
  p.age = (performance.now() - p.born) / 1000
  scene?.up?.(p)
  if (!cancelled && !p.swiped) scene?.tap?.(p)
}
canvas.addEventListener('pointerup', (e) => release(e, false))
canvas.addEventListener('pointercancel', (e) => release(e, true))
canvas.addEventListener('contextmenu', (e) => e.preventDefault())
// Belt and braces for iOS: any finished touch anywhere on the page allows sound.
for (const type of ['touchend', 'pointerup', 'click'] as const) window.addEventListener(type, () => sfx.unlock(), { capture: true, passive: true })

let raf = 0
let last = 0
function frame(now: number): void {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now
  if (!scene) return
  // Tests may run the clock faster; each step stays a normal frame long.
  const steps = Math.max(1, Math.min(8, Math.round(window.__tamagochi?.speed ?? 1)))
  for (let i = 0; i < steps; i++) {
    game.time += dt
    scene?.update(dt)
  }
  pumpSpeech()
  if (!scene) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, game.w, game.h)
  scene.draw(ctx)
}

function firstScene(): Scene {
  const want = params.get('scene')
  if (want && (want === 'meet' || (ACTIVITIES as readonly string[]).includes(want))) {
    // Test and development shortcut: jump straight into a visit.
    const list = (params.get('pets') ?? 'chick,kitten').split(',').filter((s): s is SpeciesId => (SPECIES as readonly string[]).includes(s))
    const species = [...new Set(list)].slice(0, 4)
    while (species.length < 2) species.push(SPECIES.find((s) => !species.includes(s))!)
    game.save.devices = species.map((s) => ({ species: s, hatched: true, dots: DOTS }))
    return new MeetScene(game, species.map((_, i) => i), 0, want === 'meet' ? null : (want as ActivityId))
  }
  return new HomeScene(game)
}

function start(): void {
  cancelAnimationFrame(raf)
  resize()
  applyChrome()
  game.go(firstScene())
  last = performance.now()
  raf = requestAnimationFrame(frame)
}

window.addEventListener('resize', resize)
window.addEventListener('orientationchange', resize)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hush()
    sfx.suspend()
  } else sfx.resume()
})
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(raf)
  narration.silence()
  sfx.suspend()
  game.persist()
})
window.addEventListener('pageshow', (e) => {
  // Coming back through the browser's history starts a fresh sitting.
  if (e.persisted) {
    game.save = loadSave()
    start()
  }
})

declare global {
  interface Window {
    __tamagochi?: { game: Host; scene: () => Scene | null; narration: PuppyNarration; sfx: TamaSfx; speed?: number }
  }
}
window.__tamagochi = { game, scene: () => scene, narration, sfx }
// `?audio` shows whether sound is running: for checking a device without a console.
if (params.has('audio')) {
  const tag = document.createElement('p')
  tag.style.cssText = 'position:fixed;left:8px;bottom:8px;margin:0;padding:4px 8px;background:#fff;font:700 14px sans-serif;z-index:9;pointer-events:none'
  root.append(tag)
  window.setInterval(() => (tag.textContent = `audio: ${sfx.state}`), 250)
}

void document.fonts?.load('900 20px "Nunito"').catch(() => undefined)
start()
