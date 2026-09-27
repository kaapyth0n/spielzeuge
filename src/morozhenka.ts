import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/cyrillic-700.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './morozhenka.css'
import { loadLang, saveLang, isLang, type Lang } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { MOROZHENKA_COPY, VOWEL_LETTER, VOWEL_SOUND, type Letters } from './morozhenka-copy.ts'
import { averageFeatures, featureDistance, type Vowel } from './morozhenka-dsp.ts'
import { MorozhenkaAudio } from './morozhenka-audio.ts'
import { VoiceInput, type VoiceReading, type VoiceStatus } from './morozhenka-voice.ts'
import {
  HANDMADE_COUNT,
  HIT_RADIUS,
  WORLD,
  levelFor,
  moverRect,
  type Level,
  type Point,
} from './morozhenka-levels.ts'
import {
  CHERRY_TOUCH,
  FLAKE_TOUCH,
  NO_PUSH,
  stepScoop,
  touches,
  touchesCone,
  type Push,
  type Scoop,
} from './morozhenka-physics.ts'
import {
  DIRECTIONS,
  DIRECTION_VECTOR,
  FLAVORS,
  MOROZHENKA_KEY,
  continueRound,
  finishRound,
  isOpen,
  nextVowel,
  restoreSave,
  setLetter,
  surprisesOpen,
  totalCherries,
  type Direction,
  type MorozhenkaSave,
} from './morozhenka-state.ts'
import { FLAVOR_PAINT, scoopConeSvg } from './morozhenka-svg.ts'
import {
  paintCherry,
  paintCone,
  paintFlake,
  paintPaper,
  paintParticle,
  paintScoop,
  paintStone,
  paintWalls,
  type Particle,
} from './morozhenka-art.ts'

type Screen = 'title' | 'rounds' | 'play' | 'teach'
type Phase = 'intro' | 'ready' | 'flying' | 'crashed' | 'won'

const SCOOP_R = 30
const INTRO_MS = 1300
const CRASH_MS = 1150
const LEARN_FRAMES = 36

const root = document.querySelector<HTMLElement>('#morozhenka-app')!
let save: MorozhenkaSave = restoreSave(null)
let persistent = true
try {
  save = restoreSave(localStorage.getItem(MOROZHENKA_KEY))
} catch {
  persistent = false
}
let lang: Lang = loadLang()
let copy = MOROZHENKA_COPY[lang]
let screen: Screen = 'title'

const narration = new PuppyNarration(() => ({ lang, enabled: save.sound }))
const audio = new MorozhenkaAudio(() => save.sound)
let lastSpeechAt = 0
const speechBusy = (): boolean => {
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null
  if (synth && (synth.speaking || synth.pending)) lastSpeechAt = performance.now()
  return performance.now() - lastSpeechAt < 350
}
const voice = new VoiceInput(() => speechBusy() || performance.now() < audio.tonalUntil)
voice.sensitivity = save.sensitivity

function persist(): void {
  try {
    localStorage.setItem(MOROZHENKA_KEY, JSON.stringify(save))
    persistent = true
  } catch {
    persistent = false
  }
}

function letters(): Letters {
  return Object.fromEntries(DIRECTIONS.map((d) => [d, VOWEL_LETTER[lang][save.letters[d]]])) as Letters
}

function directionOf(vowel: Vowel): Direction | null {
  return DIRECTIONS.find((d) => save.letters[d] === vowel) ?? null
}

function refreshVoiceModel(): void {
  voice.setModel(save.voice, DIRECTIONS.map((d) => save.letters[d]))
  voice.sensitivity = save.sensitivity
}
refreshVoiceModel()

/* ─────────────────────────── speech ─────────────────────────── */

function begin(label: string): void {
  audio.unlock()
  narration.begin(label)
  lastSpeechAt = performance.now()
}
function speak(...texts: string[]): void {
  narration.announce(texts)
  if (save.sound) lastSpeechAt = performance.now()
}

/* ─────────────────────────── game run ─────────────────────────── */

interface Floater {
  text: string
  x: number
  y: number
  age: number
  color: string
}

interface Run {
  level: Level
  scoop: Scoop
  phase: Phase
  phaseAt: number
  t: number
  checkpoint: Point
  cherries: Set<number>
  flakes: Set<number>
  particles: Particle[]
  floaters: Floater[]
  fire: { x: number; y: number } | null
  firePower: number
  fireHeld: number
  look: { x: number; y: number }
  blinkUntil: number
  nextBlink: number
  melt: number
  heard: Vowel | null
  hot: Set<Direction>
  crashAt: Point
  stones: HTMLCanvasElement[]
  winAt: Point
  opened: boolean
}

let run: Run | null = null
const canvas = document.createElement('canvas')
canvas.className = 'mz-canvas'
canvas.setAttribute('role', 'img')
const ctx = canvas.getContext('2d')!
const paper = document.createElement('canvas')
let pixels = 0
let scale = 1
let rafId = 0
let lastFrame = 0
let wakeLock: WakeLockSentinel | null = null
const held = new Map<number, Direction>()
const keys = new Set<Direction>()
let lastPushing = false
let statusText = ''

function newRun(number: number): Run {
  const level = levelFor(number)
  return {
    level,
    scoop: { x: level.start.x, y: level.start.y, vx: 0, vy: 0 },
    phase: 'intro',
    phaseAt: performance.now(),
    t: 0,
    checkpoint: { ...level.start },
    cherries: new Set(),
    flakes: new Set(),
    particles: [],
    floaters: [],
    fire: null,
    firePower: 0,
    fireHeld: 0,
    look: { x: 0, y: 0 },
    blinkUntil: 0,
    nextBlink: performance.now() + 2500,
    melt: 0,
    heard: null,
    hot: new Set(),
    crashAt: { ...level.start },
    stones: [],
    winAt: { ...level.cone },
    opened: false,
  }
}

function roundName(level: Level): string {
  return level.surprise ? `${copy.surpriseName} ${level.number - HANDMADE_COUNT}` : copy.roundNames[level.number - 1]
}

function roundHint(level: Level): string {
  const say = copy.say[save.control]
  return level.surprise ? copy.surpriseHint(say) : copy.roundHints[level.number - 1](say, letters())
}

/** Full hint the first time; a retry only names the round so the microphone opens sooner. */
function startRound(number: number, label: string, retry = false): void {
  begin(label)
  run = newRun(number)
  audio.play('start')
  speak(retry ? copy.round(number) : `${copy.round(number)}. ${roundName(run.level)}. ${roundHint(run.level)}`)
  showScreen('play')
  if (save.control === 'voice') void ensureVoice()
  keepAwake()
}

async function ensureVoice(): Promise<void> {
  cancelVoiceStop()
  if (voice.status === 'on') {
    voice.resume()
    return
  }
  if (!VoiceInput.supported()) {
    fallbackToButtons(copy.micUnsupported)
    return
  }
  setStatus(copy.micAsk)
  const status = await voice.start()
  if (status === 'on') {
    setStatus(copy.ready.voice)
    updateMicButton()
    return
  }
  if (screen !== 'play' && screen !== 'teach') return
  fallbackToButtons(status === 'denied' ? copy.micDenied : copy.micUnsupported)
}

function fallbackToButtons(message: string): void {
  save.control = 'buttons'
  persist()
  setStatus(message)
  speak(message)
  updateMicButton()
  if (screen === 'teach') render()
}

function setPhase(phase: Phase): void {
  if (!run) return
  run.phase = phase
  run.phaseAt = performance.now()
  root.querySelector('.mz-stage')?.setAttribute('data-phase', phase)
}

function gatherPush(reading: VoiceReading): Push {
  let x = 0
  let y = 0
  let power = 0
  const hot = new Set<Direction>([...held.values(), ...keys])
  for (const d of hot) {
    x += DIRECTION_VECTOR[d].x
    y += DIRECTION_VECTOR[d].y
  }
  if (hot.size) power = 0.8
  let heard: Vowel | null = null
  if (save.control === 'voice' && reading.active && reading.vowel) {
    heard = reading.vowel
    const d = directionOf(reading.vowel)
    if (d) {
      hot.add(d)
      x += DIRECTION_VECTOR[d].x
      y += DIRECTION_VECTOR[d].y
      power = Math.max(power, 0.32 + 0.68 * reading.power)
    }
  }
  if (run) {
    run.hot = hot
    run.heard = heard
  }
  const length = Math.hypot(x, y)
  if (!length || !power) {
    lastPushing = false
    return NO_PUSH
  }
  const kick = !lastPushing || reading.onset
  lastPushing = true
  return { x: x / length, y: y / length, power, kick }
}

function emit(p: Omit<Particle, 'age'>): void {
  if (!run) return
  run.particles.push({ ...p, age: 0 })
  if (run.particles.length > 260) run.particles.shift()
}

function float(text: string, x: number, y: number, color: string): void {
  run?.floaters.push({ text, x, y, age: 0, color })
}

function crash(byStone: boolean): void {
  if (!run) return
  setPhase('crashed')
  run.crashAt = { x: run.scoop.x, y: run.scoop.y }
  run.fire = null
  audio.fire(0)
  audio.play('crash')
  const paint = FLAVOR_PAINT[save.flavor]
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3
    const speed = 90 + Math.random() * 160
    emit({ x: run.scoop.x, y: run.scoop.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 40, life: 0.8 + Math.random() * 0.4, size: 4 + Math.random() * 5, kind: 'splat', color: i % 3 ? paint.base : paint.shade, spin: 0 })
  }
  const line = byStone ? copy.crashStone : copy.crash[Math.floor(Math.random() * copy.crash.length)]
  setStatus(line)
  speak(line)
}

function respawn(): void {
  if (!run) return
  run.scoop = { x: run.checkpoint.x, y: run.checkpoint.y, vx: 0, vy: 0 }
  run.melt = 0
  setPhase('ready')
  audio.play('respawn')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    emit({ x: run.scoop.x + Math.cos(a) * 40, y: run.scoop.y + Math.sin(a) * 40, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.5, size: 5, kind: 'spark', color: '#ffe38a', spin: 0 })
  }
  setStatus(copy.ready[save.control])
}

function win(): void {
  if (!run) return
  setPhase('won')
  run.fire = null
  audio.fire(0)
  audio.play('win')
  run.winAt = { x: run.scoop.x, y: run.scoop.y }
  const got = run.cherries.size
  const total = run.level.cherries.length
  const surprisesBefore = surprisesOpen(save)
  save = finishRound(save, run.level.number, got)
  persist()
  const opened = !surprisesBefore && surprisesOpen(save)
  const colors = ['#ff5a7a', '#ffd23f', '#5ac8fa', '#7ed957', '#b388ff', '#ff9f43']
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
    const speed = 180 + Math.random() * 260
    emit({ x: run.level.cone.x, y: run.level.cone.y - 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1.4 + Math.random() * 0.8, size: 4 + Math.random() * 3, kind: 'sprinkle', color: colors[i % colors.length], spin: Math.random() * 2 - 1 })
  }
  const lines = [copy.win, copy.cherriesOf(got, total)]
  if (run.level.number === HANDMADE_COUNT) lines.push(copy.allDone)
  if (opened) lines.push(copy.surprisesOpened)
  run.opened = opened
  setStatus(`${copy.win} ${copy.cherriesOf(got, total)}`)
  speak(...lines)
  window.setTimeout(() => {
    if (run?.phase === 'won' && screen === 'play') showWinCard()
  }, 950)
}

function showWinCard(): void {
  if (!run) return
  const card = root.querySelector<HTMLElement>('.mz-overlay')
  if (!card) return
  const got = run.cherries.size
  const total = run.level.cherries.length
  const last = run.level.number === HANDMADE_COUNT
  card.innerHTML = `<div class="mz-card mz-win" role="dialog" aria-labelledby="mz-win-title">
    <div class="mz-win-art">${scoopConeSvg(save.flavor, got)}</div>
    <h2 id="mz-win-title">${copy.win}</h2>
    <p class="mz-win-round">${copy.winRound(run.level.number)}</p>
    <p class="mz-win-cherries" aria-label="${copy.cherriesOf(got, total)}">${cherryDots(got, total)}<span>${copy.cherriesOf(got, total)}</span></p>
    ${last ? `<p class="mz-win-note">${copy.allDone}</p>` : ''}
    ${run.opened ? `<p class="mz-win-note">✦ ${copy.surprisesOpened}</p>` : ''}
    <div class="mz-card-actions">
      <button type="button" class="mz-button mz-primary" data-action="next">${copy.next} →</button>
      <button type="button" class="mz-button" data-action="again">↻ ${copy.again}</button>
      <button type="button" class="mz-button mz-quiet" data-action="rounds">${copy.rounds}</button>
    </div>
  </div>`
  card.hidden = false
  card.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus()
}

function cherryDots(got: number, total: number): string {
  return `<span class="mz-cherry-dots" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < got ? 'got' : ''}"></i>`).join('')}</span>`
}

function update(dt: number, now: number): void {
  if (!run) return
  const reading = save.control === 'voice' ? voice.read() : { level: 0, active: false, onset: false, power: 0, vowel: null, features: null }
  updateMeter(reading.level)
  run.t += dt
  const level = run.level

  let push = NO_PUSH
  if (run.phase === 'intro') {
    gatherPush(reading)
    if (now - run.phaseAt > INTRO_MS) {
      setPhase('ready')
      hideIntro()
      setStatus(copy.ready[save.control])
    }
  } else if (run.phase === 'ready' || run.phase === 'flying') {
    push = gatherPush(reading)
    if (run.phase === 'ready' && push.power > 0) setPhase('flying')
  } else {
    gatherPush(reading)
  }

  if (run.phase === 'flying') {
    const hit = stepScoop(run.scoop, push, dt, level, run.t)
    run.fire = push.power > 0 ? { x: -push.x, y: -push.y } : null
    run.firePower = push.power
    run.fireHeld = push.power > 0 ? run.fireHeld + dt : Math.max(0, run.fireHeld - dt * 2)
    if (hit) {
      const { x, y } = run.scoop
      const stone = level.movers.some((m) => {
        const box = moverRect(m, run!.t)
        const nx = Math.max(box.x, Math.min(x, box.x + box.w))
        const ny = Math.max(box.y, Math.min(y, box.y + box.h))
        return Math.hypot(x - nx, y - ny) < HIT_RADIUS + 2
      })
      crash(stone)
    } else {
      level.cherries.forEach((cherry, index) => {
        if (run!.cherries.has(index) || !touches(run!.scoop, cherry, CHERRY_TOUCH)) return
        run!.cherries.add(index)
        audio.play('cherry')
        float(copy.cherry, cherry.x, cherry.y - 20, '#c81d3a')
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          emit({ x: cherry.x, y: cherry.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.5, size: 4, kind: 'spark', color: '#ff6b81', spin: 0 })
        }
        setStatus(`${copy.cherry} ${copy.cherriesOf(run!.cherries.size, level.cherries.length)}`)
        if (save.control === 'buttons') speak(copy.cherry)
        updateHudCherries()
      })
      level.flakes.forEach((flake, index) => {
        if (run!.flakes.has(index) || !touches(run!.scoop, flake, FLAKE_TOUCH)) return
        run!.flakes.add(index)
        run!.checkpoint = { ...flake }
        audio.play('flake')
        float(copy.flake.split(/[.!]/)[0] + '!', flake.x, flake.y - 30, '#2f7fc4')
        setStatus(copy.flake)
        if (save.control === 'buttons') speak(copy.flake)
      })
      if (touchesCone(run.scoop, level.cone)) win()
    }
  } else {
    run.fire = null
    run.firePower = 0
    run.fireHeld = Math.max(0, run.fireHeld - dt * 2)
  }
  audio.fire(run.phase === 'flying' ? run.firePower : 0)

  if (run.phase === 'crashed') {
    run.melt = Math.min(1, (now - run.phaseAt) / 300)
    if (now - run.phaseAt > CRASH_MS && !speechBusy()) respawn()
  }
  if (run.phase === 'won') {
    const k = Math.min(1, (now - run.phaseAt) / 380)
    const ease = 1 - (1 - k) * (1 - k)
    run.scoop.x = run.winAt.x + (level.cone.x - run.winAt.x) * ease
    run.scoop.y = run.winAt.y + (level.cone.y - 24 - run.winAt.y) * ease
  }

  // Eyes follow the flight, or peek at the cone while waiting.
  const speed = Math.hypot(run.scoop.vx, run.scoop.vy)
  const target =
    speed > 20
      ? { x: run.scoop.vx / speed, y: run.scoop.vy / speed }
      : (() => {
          const dx = level.cone.x - run.scoop.x
          const dy = level.cone.y - run.scoop.y
          const d = Math.hypot(dx, dy) || 1
          return { x: dx / d, y: dy / d }
        })()
  run.look.x += (target.x - run.look.x) * Math.min(1, dt * 8)
  run.look.y += (target.y - run.look.y) * Math.min(1, dt * 8)
  if (now > run.nextBlink) {
    run.blinkUntil = now + 130
    run.nextBlink = now + 2600 + Math.random() * 2600
  }

  // Fire puffs from the mouth.
  if (run.fire && run.phase === 'flying') {
    const rate = 26 + 70 * run.firePower
    let count = rate * dt
    while (count > 0) {
      if (Math.random() < count) {
        const side = { x: -run.fire.y, y: run.fire.x }
        const jitter = (Math.random() - 0.5) * 70
        const speedOut = 150 + 210 * run.firePower + Math.random() * 60
        emit({
          x: run.scoop.x + run.fire.x * SCOOP_R * 0.75,
          y: run.scoop.y + run.fire.y * SCOOP_R * 0.75,
          vx: run.fire.x * speedOut + side.x * jitter + run.scoop.vx * 0.2,
          vy: run.fire.y * speedOut + side.y * jitter + run.scoop.vy * 0.2,
          life: 0.45 + Math.random() * 0.3,
          size: 5 + run.firePower * 5 + Math.random() * 3,
          kind: 'fire',
          color: '',
          spin: 0,
        })
      }
      count -= 1
    }
  }
  for (const p of run.particles) {
    p.age += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    const drag = p.kind === 'fire' ? 2.6 : 1.4
    p.vx *= Math.exp(-drag * dt)
    p.vy *= Math.exp(-drag * dt)
    if (p.kind === 'splat' || p.kind === 'sprinkle') p.vy += 420 * dt
  }
  run.particles = run.particles.filter((p) => p.age < p.life)
  for (const f of run.floaters) {
    f.age += dt
    f.y -= 36 * dt
  }
  run.floaters = run.floaters.filter((f) => f.age < 1.4)
  updateHotButtons()
}

function draw(now: number): void {
  if (!run || !pixels) return
  const level = run.level
  const time = now / 1000
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(paper, 0, 0)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  level.flakes.forEach((flake, index) => paintFlake(ctx, flake.x, flake.y, time, run!.flakes.has(index)))
  level.cherries.forEach((cherry, index) => {
    if (!run!.cherries.has(index)) paintCherry(ctx, cherry.x, cherry.y, time, index * 1.7)
  })
  level.movers.forEach((mover, index) => {
    const box = moverRect(mover, run!.t)
    const sprite = run!.stones[index]
    if (sprite) ctx.drawImage(sprite, box.x, box.y, box.w, box.h)
  })
  paintCone(ctx, level.cone.x, level.cone.y, time, level.theme, run.phase !== 'won')
  for (const p of run.particles) if (p.kind === 'fire') paintParticle(ctx, p)

  const ready = run.phase === 'ready' || run.phase === 'intro'
  if (ready) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4)
    ctx.strokeStyle = `rgba(255,140,60,${0.35 + pulse * 0.4})`
    ctx.lineWidth = 3
    ctx.setLineDash([8, 9])
    ctx.lineDashOffset = -time * 20
    ctx.beginPath()
    ctx.arc(run.scoop.x, run.scoop.y, SCOOP_R + 12 + pulse * 5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const bob = run.phase === 'flying' || run.phase === 'won' ? 0 : Math.sin(time * 3) * 3
  if (run.phase !== 'crashed' || run.melt < 1 || now - run.phaseAt < CRASH_MS - 250) {
    paintScoop(ctx, run.phase === 'crashed' ? run.crashAt.x : run.scoop.x, (run.phase === 'crashed' ? run.crashAt.y : run.scoop.y) + bob, SCOOP_R, save.flavor, {
      look: run.look,
      fire: run.fire,
      blink: now < run.blinkUntil || run.phase === 'crashed',
      melt: run.melt,
      drip: Math.min(1, Math.max(0, run.fireHeld - 1.5) / 2),
      time,
    })
  }
  for (const p of run.particles) if (p.kind !== 'fire') paintParticle(ctx, p)
  ctx.textAlign = 'center'
  ctx.font = 'bold 34px "PT Serif", Georgia, serif'
  for (const f of run.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / 1.4)
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
}

function loop(now: number): void {
  rafId = window.requestAnimationFrame(loop)
  const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000))
  lastFrame = now
  if (screen === 'play') {
    update(dt, now)
    draw(now)
  } else if (screen === 'teach') {
    teachTick()
  }
}

function rebuildPaper(): void {
  if (!run) return
  const stage = root.querySelector<HTMLElement>('.mz-stage')
  if (!stage) return
  const css = Math.floor(stage.clientWidth)
  if (!css) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const size = Math.round(css * dpr)
  pixels = size
  scale = size / WORLD
  canvas.width = size
  canvas.height = size
  canvas.style.width = `${css}px`
  canvas.style.height = `${css}px`
  paper.width = size
  paper.height = size
  const p = paper.getContext('2d')!
  p.setTransform(1, 0, 0, 1, 0, 0)
  paintPaper(p, size, run.level.theme, run.level.number * 17)
  p.setTransform(scale, 0, 0, scale, 0, 0)
  paintWalls(p, run.level)
  run.stones = run.level.movers.map((mover, index) => paintStone(mover, run!.level.theme, scale, run!.level.number * 31 + index))
  canvas.setAttribute('aria-label', `${copy.round(run.level.number)}. ${roundName(run.level)}. ${roundHint(run.level)}`)
}

const resize = new ResizeObserver(() => {
  if (screen === 'play') rebuildPaper()
})

/* ─────────────────────────── teaching ─────────────────────────── */

interface Teach {
  queue: Direction[]
  current: Direction | null
  frames: Float64Array[]
  pauseUntil: number
  hot: Direction | null
  warning: string
}
let teach: Teach = { queue: [], current: null, frames: [], pauseUntil: 0, hot: null, warning: '' }

async function startTeaching(directions: Direction[], label: string): Promise<void> {
  begin(label)
  teach = { queue: [...directions], current: null, frames: [], pauseUntil: 0, hot: null, warning: '' }
  if (save.control !== 'voice') {
    save.control = 'voice'
    persist()
  }
  await ensureVoice()
  if ((voice.status as VoiceStatus) !== 'on') return
  nextTeachStep()
}

function nextTeachStep(): void {
  teach.current = teach.queue.shift() ?? null
  teach.frames = []
  if (!teach.current) {
    checkSimilar()
    const done = teach.warning || copy.teachDone
    setTeachStatus(`${done} ${copy.teachTry}`)
    speak(done, copy.teachTry)
    render()
    return
  }
  const vowel = save.letters[teach.current]
  const prompt = copy.teachSay(VOWEL_SOUND[lang][vowel])
  setTeachStatus(prompt)
  speak(prompt)
  render()
}

function stopTeaching(): void {
  teach.queue = []
  teach.current = null
  teach.frames = []
  render()
}

function checkSimilar(): void {
  teach.warning = ''
  const learned = DIRECTIONS.map((d) => save.letters[d]).filter((v) => save.voice[v])
  let closest: [Vowel, Vowel, number] | null = null
  for (let i = 0; i < learned.length; i++)
    for (let j = i + 1; j < learned.length; j++) {
      const d = featureDistance(save.voice[learned[i]]!, save.voice[learned[j]]!)
      if (!closest || d < closest[2]) closest = [learned[i], learned[j], d]
    }
  // Different vowels sit 2.8–7.6 apart; the same vowel said twice stays within ~0.8.
  if (closest && closest[2] < 1.6) teach.warning = copy.similar(VOWEL_LETTER[lang][closest[0]], VOWEL_LETTER[lang][closest[1]])
}

function teachTick(): void {
  const reading = voice.read()
  updateMeter(reading.level)
  const now = performance.now()
  if (teach.current) {
    if (now > teach.pauseUntil && reading.active && reading.features) {
      teach.frames.push(reading.features)
      if (teach.frames.length === 6) setTeachStatus(copy.teachHeard)
      if (teach.frames.length >= LEARN_FRAMES) {
        const vowel = save.letters[teach.current]
        save.voice = { ...save.voice, [vowel]: averageFeatures(teach.frames).map((v) => Math.round(v * 1000) / 1000) }
        persist()
        refreshVoiceModel()
        audio.play('learned')
        const line = copy.teachLearnedOne(VOWEL_LETTER[lang][vowel])
        setTeachStatus(line)
        speak(line)
        teach.current = null
        teach.pauseUntil = now + 900
        render()
        window.setTimeout(() => {
          if (screen === 'teach' && !teach.current) nextTeachStep()
        }, 900)
        return
      }
    }
    root.querySelector<HTMLElement>('.mz-ring')?.style.setProperty('--p', String(teach.frames.length / LEARN_FRAMES))
  } else {
    const hot = reading.active && reading.vowel ? directionOf(reading.vowel) : null
    if (hot !== teach.hot) {
      teach.hot = hot
      root.querySelectorAll<HTMLElement>('.mz-teach-card').forEach((card) => card.classList.toggle('is-hot', card.dataset.dir === hot))
    }
  }
}

/* ─────────────────────────── DOM ─────────────────────────── */

function icon(name: 'home' | 'sound' | 'mute' | 'restart' | 'mic' | 'grid' | 'teach' | 'play'): string {
  const paths: Record<typeof name, string> = {
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
    sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/>',
    mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m17 10 4 4m0-4-4 4"/>',
    restart: '<path d="M5 12a7 7 0 1 0 2.2-5.1"/><path d="M5 4v4h4"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    teach: '<path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 11.5V16c3 2 7 2 10 0v-4.5"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
  }
  return `<svg class="mz-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`
}

function topbar(): string {
  return `<header class="mz-top">
    <a class="mz-home" href="/" data-action="home" aria-label="${copy.home}">${icon('home')}<span>${copy.home}</span></a>
    <p class="mz-brand"><span>spielzeuge /</span> ${copy.name}</p>
    <div class="mz-settings">
      <button type="button" id="mz-sound" class="mz-icon-button" data-action="sound" aria-pressed="${save.sound}" aria-label="${save.sound ? copy.soundOn : copy.soundOff}">${icon(save.sound ? 'sound' : 'mute')}</button>
      <select id="mz-language" aria-label="${copy.language}">${(['ru', 'de', 'en'] as Lang[]).map((l) => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select>
    </div>
  </header>`
}

function titleScreen(): string {
  const next = continueRound(save)
  return `<section class="mz-title">
    <div class="mz-hero">
      <button type="button" class="mz-hero-art" data-action="flavor-next" aria-label="${copy.flavor}: ${copy.flavors[save.flavor]}">${scoopConeSvg(save.flavor, 0, true)}</button>
      <div class="mz-hero-text">
        <p class="mz-byline">${copy.byline}</p>
        <h1>${copy.name}</h1>
        <p class="mz-tagline">${copy.tagline.replace(/«А»|„A“|“Ah”/, (m) => `<b>${m}</b>`)}</p>
      </div>
    </div>
    <div class="mz-flavor" role="group" aria-label="${copy.flavor}">
      <button type="button" class="mz-round-button" data-action="flavor-prev" aria-label="${copy.flavor} ←">‹</button>
      <p><span>${copy.flavor}</span><strong>${copy.flavors[save.flavor]}</strong></p>
      <button type="button" class="mz-round-button" data-action="flavor-next" aria-label="${copy.flavor} →">›</button>
    </div>
    <button type="button" class="mz-button mz-primary mz-play-button" data-action="play">${icon('play')}<span>${copy.play}</span><small>${copy.round(next)}</small></button>
    <div class="mz-row">
      <button type="button" class="mz-button" data-action="rounds">${icon('grid')}<span>${copy.rounds}</span></button>
      <button type="button" class="mz-button" data-action="teach">${icon('teach')}<span>${copy.teach}</span></button>
    </div>
    <div class="mz-control" role="group" aria-label="${copy.control}">
      <p>${copy.control}</p>
      <div class="mz-segment">${(['voice', 'buttons'] as const).map((c) => `<button type="button" data-action="control-${c}" aria-pressed="${save.control === c}">${c === 'voice' ? icon('mic') : '<span class="mz-mini-letter" aria-hidden="true">' + VOWEL_LETTER[lang].a + '</span>'}<span>${copy.controls[c]}</span></button>`).join('')}</div>
      <small>${copy.controlHints[save.control]}</small>
    </div>
    <div class="mz-legend" aria-hidden="true">${DIRECTIONS.map((d) => `<span><b>${letters()[d]}</b>${arrow(d)}</span>`).join('')}</div>
    <p class="mz-privacy">${copy.privacy}${persistent ? '' : ` ${copy.noSave}`}</p>
  </section>`
}

function arrow(d: Direction): string {
  return { up: '↑', right: '→', left: '←', down: '↓' }[d]
}

function roundsScreen(): string {
  const tiles = Array.from({ length: HANDMADE_COUNT }, (_, i) => {
    const n = i + 1
    const result = save.rounds[n]
    const open = isOpen(save, n)
    const level = levelFor(n)
    const label = `${copy.round(n)}. ${copy.roundNames[i]}. ${open ? (result ? copy.cherriesOf(result.cherries, level.cherries.length) : '') : copy.locked}`
    return `<button type="button" class="mz-tile ${result ? 'is-done' : open ? 'is-open' : 'is-locked'}" data-action="round-${n}" ${open ? '' : 'disabled'} aria-label="${label.trim()}">
      <span class="mz-tile-num">${n}</span>
      <span class="mz-tile-art">${result ? scoopConeSvg(result.flavor, result.cherries) : open ? '<span class="mz-tile-cone"></span>' : '<span class="mz-tile-lock">🔒</span>'}</span>
      <span class="mz-tile-name">${copy.roundNames[i]}</span>
      ${result ? cherryDots(result.cherries, level.cherries.length) : ''}
    </button>`
  }).join('')
  const surpriseOpen = surprisesOpen(save)
  const done = Object.keys(save.rounds).filter((k) => Number(k) > HANDMADE_COUNT).length
  const surprise = `<button type="button" class="mz-tile mz-tile-surprise ${surpriseOpen ? 'is-open' : 'is-locked'}" data-action="round-${save.surpriseNext}" ${surpriseOpen ? '' : 'disabled'} aria-label="${copy.surpriseTile}. ${surpriseOpen ? `${copy.surpriseName} ${save.surpriseNext - HANDMADE_COUNT}` : copy.locked}">
    <span class="mz-tile-num">✦</span>
    <span class="mz-tile-art"><span class="mz-tile-gift">?</span></span>
    <span class="mz-tile-name">${copy.surpriseTile}</span>
    <span class="mz-tile-sub">${surpriseOpen ? `${copy.surpriseName} ${save.surpriseNext - HANDMADE_COUNT}${done ? ` · ✓ ${done}` : ''}` : copy.locked}</span>
  </button>`
  return `<section class="mz-rounds">
    <div class="mz-rounds-head"><button type="button" class="mz-button mz-quiet" data-action="title">← ${copy.back}</button><h1>${copy.roundsTitle}</h1><p>${cherryDots(1, 1)} ${copy.total(totalCherries(save))}</p></div>
    <div class="mz-round-grid">${tiles}${surprise}</div>
  </section>`
}

function playScreen(): string {
  if (!run) return ''
  const l = letters()
  const pad = DIRECTIONS.map(
    (d) => `<button type="button" class="mz-dir mz-dir-${d}" data-dir="${d}" aria-label="${copy.dirButton(l[d], copy.directions[d])}"><span class="mz-letter">${l[d]}</span><span class="mz-arrow" aria-hidden="true">${arrow(d)}</span></button>`,
  ).join('')
  const needsTeach = save.control === 'voice' && !DIRECTIONS.some((d) => save.voice[save.letters[d]])
  return `<section class="mz-play">
    <div class="mz-hud">
      <button type="button" class="mz-icon-button" data-action="rounds" aria-label="${copy.rounds}">${icon('grid')}</button>
      <div class="mz-hud-title"><strong>${copy.round(run.level.number)}</strong><span>${roundName(run.level)}</span></div>
      <div class="mz-hud-cherries" id="mz-cherries"></div>
      <button type="button" class="mz-icon-button" data-action="restart" aria-label="${copy.restart}">${icon('restart')}</button>
    </div>
    <div class="mz-stage" data-phase="${run.phase}">
      <div class="mz-intro" ${run.phase === 'intro' ? '' : 'hidden'}><strong>${copy.round(run.level.number)}</strong><span>${roundName(run.level)}</span></div>
      <div class="mz-overlay" hidden></div>
    </div>
    <div class="mz-controls">
      <div class="mz-pad">${pad}
        <button type="button" class="mz-mic" data-action="mic" aria-pressed="${save.control === 'voice'}" aria-label="${save.control === 'voice' ? copy.micOn : copy.micOff}">${icon('mic')}<span class="mz-mic-level" aria-hidden="true"></span></button>
      </div>
      <p class="mz-heard" aria-hidden="true"></p>
      <p id="mz-status" class="mz-status" role="status" aria-live="polite">${statusText}</p>
      ${needsTeach ? `<button type="button" class="mz-button mz-quiet mz-teach-link" data-action="teach">${icon('teach')}<span>${copy.teach}</span></button>` : ''}
    </div>
  </section>`
}

function teachScreen(): string {
  const l = letters()
  const listening = teach.current
  const cards = DIRECTIONS.map((d) => {
    const vowel = save.letters[d]
    const learned = Boolean(save.voice[vowel])
    return `<div class="mz-teach-card ${listening === d ? 'is-current' : ''} ${learned ? 'is-learned' : ''}" data-dir="${d}">
      <span class="mz-teach-arrow" aria-hidden="true">${arrow(d)}</span>
      <button type="button" class="mz-letter-chip" data-action="letter-${d}" aria-label="${copy.changeLetter}: ${copy.dirButton(l[d], copy.directions[d])}">${l[d]}</button>
      <span class="mz-teach-dir">${copy.directions[d]}</span>
      <span class="mz-teach-state">${learned ? `✓ ${copy.teachLearned}` : copy.teachDefault}</span>
      <button type="button" class="mz-mini" data-action="learn-${d}" aria-label="${copy.teach}: ${l[d]}">${icon('mic')}</button>
    </div>`
  }).join('')
  const current = listening ? l[listening] : '…'
  return `<section class="mz-teach">
    <div class="mz-rounds-head"><button type="button" class="mz-button mz-quiet" data-action="title">← ${copy.back}</button><h1>${copy.teachTitle}</h1></div>
    <p class="mz-teach-intro">${copy.teachIntro}</p>
    <div class="mz-teach-grid">${cards}</div>
    <div class="mz-teach-stage">
      <div class="mz-ring ${listening ? 'is-listening' : ''}" style="--p:0"><span>${current}</span></div>
      <div>
        <p id="mz-teach-status" class="mz-status" role="status" aria-live="polite">${teachStatus}</p>
        <div class="mz-meter" aria-hidden="true"><i></i></div>
      </div>
    </div>
    <div class="mz-row">
      ${listening || teach.queue.length ? `<button type="button" class="mz-button" data-action="teach-stop">${copy.teachStop}</button>` : `<button type="button" class="mz-button mz-primary" data-action="teach-start">${icon('mic')}<span>${copy.teachStart}</span></button>`}
      <button type="button" class="mz-button mz-quiet" data-action="teach-reset">${copy.teachReset}</button>
    </div>
    <div class="mz-control" role="group" aria-label="${copy.sensitivity}">
      <p>${copy.sensitivity}</p>
      <div class="mz-segment">${([1, 2, 3] as const).map((s) => `<button type="button" data-action="sense-${s}" aria-pressed="${save.sensitivity === s}">${copy.sensitivityLevels[s - 1]}</button>`).join('')}</div>
    </div>
    <p class="mz-privacy">${copy.privacy}</p>
  </section>`
}

let teachStatus = ''
function setTeachStatus(text: string): void {
  teachStatus = text
  const node = root.querySelector('#mz-teach-status')
  if (node) node.textContent = text
}

function setStatus(text: string): void {
  if (text === statusText) return
  statusText = text
  const node = root.querySelector('#mz-status')
  if (node) node.textContent = text
}

function hideIntro(): void {
  root.querySelector<HTMLElement>('.mz-intro')?.setAttribute('hidden', '')
}

function updateHudCherries(): void {
  const node = root.querySelector<HTMLElement>('#mz-cherries')
  if (!node || !run) return
  const got = run.cherries.size
  const total = run.level.cherries.length
  node.innerHTML = `${cherryDots(got, total)}<span class="mz-visually-hidden">${copy.cherriesOf(got, total)}</span>`
}

let lastMeter = -1
function updateMeter(level: number): void {
  const rounded = Math.round(level * 20) / 20
  if (rounded === lastMeter) return
  lastMeter = rounded
  root.style.setProperty('--mic', String(rounded))
}

let lastHot = ''
function updateHotButtons(): void {
  if (!run) return
  const waiting = save.control === 'voice' && voice.status === 'on' && (speechBusy() || performance.now() < audio.tonalUntil)
  const key = [...run.hot].sort().join(',') + '|' + (run.heard ?? '') + '|' + waiting + '|' + voice.status
  if (key === lastHot) return
  lastHot = key
  root.querySelectorAll<HTMLElement>('.mz-dir').forEach((button) => button.classList.toggle('is-hot', run!.hot.has(button.dataset.dir as Direction)))
  root.querySelector('.mz-mic')?.classList.toggle('is-waiting', waiting)
  const heard = root.querySelector<HTMLElement>('.mz-heard')
  if (heard)
    heard.textContent = run.heard
      ? copy.heard(VOWEL_LETTER[lang][run.heard])
      : save.control === 'voice' && voice.status === 'on' && !waiting
        ? copy.listening
        : ''
}

function updateMicButton(): void {
  const mic = root.querySelector<HTMLElement>('.mz-mic')
  if (!mic) return
  const on = save.control === 'voice'
  mic.setAttribute('aria-pressed', String(on))
  mic.setAttribute('aria-label', on ? copy.micOn : copy.micOff)
  root.dataset.control = save.control
}

function render(): void {
  document.documentElement.lang = lang
  document.title = `${copy.name} · Spielzeuge`
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
  root.dataset.control = save.control
  const body = screen === 'title' ? titleScreen() : screen === 'rounds' ? roundsScreen() : screen === 'play' ? playScreen() : teachScreen()
  root.innerHTML = `<main class="mz mz-screen-${screen}">${topbar()}${body}</main>`
  if (screen === 'play') {
    const stage = root.querySelector<HTMLElement>('.mz-stage')!
    stage.prepend(canvas)
    resize.disconnect()
    resize.observe(stage)
    rebuildPaper()
    updateHudCherries()
    lastHot = ''
    updateHotButtons()
    if (run?.phase === 'won' && performance.now() - run.phaseAt > 900) showWinCard()
  } else {
    resize.disconnect()
  }
}

function showScreen(next: Screen): void {
  const leavingGame = screen === 'play' && next !== 'play'
  screen = next
  held.clear()
  keys.clear()
  if (leavingGame) {
    audio.fire(0)
    releaseWake()
  }
  if (next !== 'play' && next !== 'teach') scheduleVoiceStop()
  if (next !== 'teach') {
    teach.current = null
    teach.queue = []
  }
  if (next === 'play' && run) statusText = run.phase === 'intro' ? roundHint(run.level) : copy.ready[save.control]
  render()
  window.scrollTo(0, 0)
  const heading = root.querySelector<HTMLElement>('h1, .mz-hud-title')
  if (heading && next !== 'play') {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

/**
 * Menus only pause the microphone; it switches off after a while. Coming back
 * quickly then needs no second permission prompt on iPad.
 */
let voiceStopTimer = 0
function scheduleVoiceStop(): void {
  if (voice.status !== 'on') return
  voice.pause()
  cancelVoiceStop()
  voiceStopTimer = window.setTimeout(() => voice.stop(), 45000)
}
function cancelVoiceStop(): void {
  window.clearTimeout(voiceStopTimer)
  voiceStopTimer = 0
}

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

/* ─────────────────────────── events ─────────────────────────── */

function labelOf(target: HTMLElement): string {
  return (target.getAttribute('aria-label') ?? target.textContent ?? '').replace(/[←→↻✓✦‹›]/g, '').replace(/\s+/g, ' ').trim()
}

function cycleFlavor(step: number): void {
  const index = FLAVORS.indexOf(save.flavor)
  save.flavor = FLAVORS[(index + step + FLAVORS.length) % FLAVORS.length]
  persist()
  audio.play('flavor')
  const name = copy.flavors[save.flavor]
  narration.begin(copy.newFlavor(name))
  render()
  root.querySelector<HTMLElement>(`[data-action="flavor-${step > 0 ? 'next' : 'prev'}"]`)?.focus()
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
  if (!target) return
  const action = target.dataset.action!
  if (action === 'home') {
    teardown()
    return
  }
  audio.unlock()
  if (action === 'sound') {
    save.sound = !save.sound
    persist()
    if (save.sound) {
      audio.unlock()
      audio.play('tap')
      narration.begin(copy.soundOn)
    } else {
      narration.silence()
      audio.silence()
    }
    render()
    root.querySelector<HTMLElement>('#mz-sound')?.focus()
    return
  }
  if (action === 'flavor-next' || action === 'flavor-prev') {
    cycleFlavor(action === 'flavor-next' ? 1 : -1)
    return
  }
  audio.play('tap')
  if (action === 'play') {
    startRound(continueRound(save), copy.play)
    return
  }
  if (action.startsWith('round-')) {
    const n = Number(action.slice(6))
    if (isOpen(save, n)) startRound(n, labelOf(target))
    return
  }
  if (action === 'rounds') {
    begin(copy.rounds)
    showScreen('rounds')
    return
  }
  if (action === 'title') {
    begin(copy.back)
    showScreen('title')
    return
  }
  if (action === 'teach') {
    if (voice.status === 'on') {
      cancelVoiceStop()
      voice.resume()
    }
    begin(copy.teachTitle)
    teachStatus = copy.teachIntro
    speak(copy.teachIntro)
    showScreen('teach')
    return
  }
  if (action === 'control-voice' || action === 'control-buttons') {
    save.control = action === 'control-voice' ? 'voice' : 'buttons'
    persist()
    begin(`${copy.controls[save.control]}. ${copy.controlHints[save.control]}`)
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus()
    return
  }
  if (action === 'restart' && run) {
    startRound(run.level.number, copy.restart, true)
    return
  }
  if (action === 'again' && run) {
    startRound(run.level.number, copy.again, true)
    return
  }
  if (action === 'next' && run) {
    const n = run.level.number
    startRound(n < HANDMADE_COUNT ? n + 1 : n === HANDMADE_COUNT ? save.surpriseNext : n + 1, copy.next)
    return
  }
  if (action === 'mic') {
    if (save.control === 'voice') {
      save.control = 'buttons'
      cancelVoiceStop()
      voice.stop()
      persist()
      begin(copy.micOff)
      setStatus(copy.ready.buttons)
    } else {
      save.control = 'voice'
      persist()
      begin(copy.micOn)
      void ensureVoice()
    }
    render()
    root.querySelector<HTMLElement>('.mz-mic')?.focus()
    return
  }
  if (action === 'teach-start') {
    void startTeaching([...DIRECTIONS], copy.teachStart)
    return
  }
  if (action.startsWith('learn-')) {
    void startTeaching([action.slice(6) as Direction], labelOf(target))
    return
  }
  if (action === 'teach-stop') {
    begin(copy.teachStop)
    stopTeaching()
    return
  }
  if (action === 'teach-reset') {
    save.voice = {}
    persist()
    refreshVoiceModel()
    stopTeaching()
    begin(copy.teachReset)
    setTeachStatus(copy.teachForgot)
    speak(copy.teachForgot)
    render()
    return
  }
  if (action.startsWith('letter-')) {
    const d = action.slice(7) as Direction
    save = setLetter(save, d, nextVowel(save, d))
    persist()
    refreshVoiceModel()
    const line = copy.letterChanged(VOWEL_LETTER[lang][save.letters[d]], copy.directions[d])
    begin(line)
    setTeachStatus(line)
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus()
    return
  }
  if (action.startsWith('sense-')) {
    save.sensitivity = Number(action.slice(6)) as 1 | 2 | 3
    persist()
    refreshVoiceModel()
    begin(`${copy.sensitivity}: ${copy.sensitivityLevels[save.sensitivity - 1]}`)
    render()
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus()
  }
})

root.addEventListener('change', (event) => {
  const select = event.target
  if (!(select instanceof HTMLSelectElement) || select.id !== 'mz-language' || !isLang(select.value)) return
  lang = select.value
  copy = MOROZHENKA_COPY[lang]
  saveLang(lang)
  narration.languageChanged()
  if (screen === 'play' && run) statusText = run.phase === 'won' ? copy.win : copy.ready[save.control]
  if (screen === 'teach') teachStatus = teach.current ? copy.teachSay(VOWEL_SOUND[lang][save.letters[teach.current]]) : copy.teachIntro
  render()
  root.querySelector<HTMLElement>('#mz-language')?.focus()
})

// Letter buttons: press and hold, several fingers at once make diagonals.
root.addEventListener('pointerdown', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('.mz-dir')
  if (button) {
    event.preventDefault()
    audio.unlock()
    held.set(event.pointerId, button.dataset.dir as Direction)
    try {
      button.setPointerCapture(event.pointerId)
    } catch {
      // Older Safari
    }
    return
  }
  if ((event.target as HTMLElement).closest('.mz-intro') && run?.phase === 'intro') {
    setPhase('ready')
    hideIntro()
    setStatus(copy.ready[save.control])
  }
})
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
  root.addEventListener(type, (event) => {
    held.delete((event as PointerEvent).pointerId)
  })
root.addEventListener('contextmenu', (event) => {
  if ((event.target as HTMLElement).closest('.mz-dir, .mz-stage')) event.preventDefault()
})

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  w: 'up',
  d: 'right',
  s: 'down',
}
const KEY_VOWELS: Record<string, Vowel> = { а: 'a', a: 'a', о: 'o', o: 'o', у: 'u', u: 'u', и: 'i', i: 'i', э: 'e', e: 'e' }

function keyDirection(event: KeyboardEvent): Direction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  if (KEY_DIRECTIONS[key]) return KEY_DIRECTIONS[key]
  const vowel = KEY_VOWELS[key]
  return vowel ? directionOf(vowel) : null
}

window.addEventListener('keydown', (event) => {
  if (screen !== 'play' || !run) return
  if (event.target instanceof Element && event.target.closest('select, input, textarea')) return
  const d = keyDirection(event)
  if (d) {
    event.preventDefault()
    keys.add(d)
    if (run.phase === 'intro') {
      setPhase('ready')
      hideIntro()
    }
    return
  }
  if (event.key === 'r' || event.key === 'к') startRound(run.level.number, copy.restart, true)
})
window.addEventListener('keyup', (event) => {
  const d = keyDirection(event)
  if (d) keys.delete(d)
})
window.addEventListener('blur', () => {
  keys.clear()
  held.clear()
})

function teardown(): void {
  window.cancelAnimationFrame(rafId)
  cancelVoiceStop()
  voice.stop()
  audio.destroy()
  narration.silence()
  releaseWake()
  resize.disconnect()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    narration.silence()
    audio.silence()
    voice.pause()
    held.clear()
    keys.clear()
  } else {
    if (screen === 'play' || screen === 'teach') voice.resume()
    lastFrame = 0
    if (screen === 'play') keepAwake()
  }
})
window.addEventListener('pagehide', teardown)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    rafId = window.requestAnimationFrame(loop)
    showScreen('title')
  }
})

render()
narration.begin(`${copy.name}. ${copy.tagline}`)
rafId = window.requestAnimationFrame(loop)

// Test and debugging hook: read-only view of the game.
Object.defineProperty(window, '__morozhenka', {
  value: {
    state: () => ({
      screen,
      phase: run?.phase ?? null,
      round: run?.level.number ?? null,
      scoop: run ? { x: Math.round(run.scoop.x), y: Math.round(run.scoop.y) } : null,
      cherries: run?.cherries.size ?? 0,
      voice: voice.status,
      heard: run?.heard ?? null,
      save: JSON.parse(JSON.stringify(save)) as MorozhenkaSave,
    }),
  },
})
