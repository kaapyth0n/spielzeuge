import '@fontsource/andika/cyrillic-400.css'
import '@fontsource/andika/cyrillic-700.css'
import '@fontsource/andika/latin-400.css'
import '@fontsource/andika/latin-700.css'
import '@fontsource/pangolin/cyrillic-400.css'
import '@fontsource/pangolin/latin-400.css'
import './pesenki.css'
import { LANGS, isLang, loadLang, saveLang, type Lang } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { SongPlayer } from './pesenki-player.ts'
import { PesenkiSfx } from './pesenki-sfx.ts'
import { PESENKI_COPY } from './pesenki-copy.ts'
import { PICTURES, SONGS, loadTiming, pictureWord, songById, type Song } from './pesenki-songs.ts'
import { heroSvg, pictureSvg, speedSvg } from './pesenki-art.ts'
import { hatch, markerBlob, pencilCircle, pencilPill } from './pesenki-draw.ts'
import { PESENKI_KEY, finishSong, openLevels, progressOf, restoreSave, type PesenkiSave } from './pesenki-state.ts'
import {
  Conductor,
  LEVELS,
  beatOffset,
  hashText,
  lineAt,
  type Command,
  type SongTiming,
  type TimedLine,
} from './pesenki-timeline.ts'

/* ─────────────────────────── state ─────────────────────────── */

const root = document.querySelector<HTMLElement>('#pesenki-app')!
const ids = SONGS.map((song) => song.id)
let save: PesenkiSave = restoreSave(null, ids)
let persistent = true
try {
  save = restoreSave(localStorage.getItem(PESENKI_KEY), ids)
} catch {
  persistent = false
}
let lang: Lang = loadLang()
let copy = PESENKI_COPY[lang]
const debug = new URLSearchParams(location.search).has('debug')

const narration = new PuppyNarration(() => ({ lang, enabled: save.sound }))
const player = new SongPlayer()
player.setMuted(!save.sound)
// iOS can suspend audio (a call, another app): pause the song so nothing is lost.
player.onInterrupted = () => {
  if (session?.conductor && session.stage === 'playing' && session.conductor.mode !== 'paused') {
    apply(session.conductor.pause())
    refreshTop()
  }
}
const sfx = new PesenkiSfx(
  () => player.ctx,
  () => player.output,
  () => save.sound,
)

function persist(): void {
  try {
    localStorage.setItem(PESENKI_KEY, JSON.stringify(save))
    persistent = true
  } catch {
    persistent = false
  }
}

type Screen = 'shelf' | 'song'
type Stage = 'loading' | 'error' | 'idle' | 'playing' | 'finished'

interface Session {
  song: Song
  lang: Lang
  level: number
  stage: Stage
  timing: SongTiming | null
  conductor: Conductor | null
  loaded: number
  /** Level that just opened on the finish card (sparkles once). */
  fresh: number
  line: number
  sung: number
  lastTick: number
  said: Set<string>
}

let screen: Screen = 'shelf'
let session: Session | null = null
const saidThisVisit = new Set<string>()

/* ─────────────────────────── small helpers ─────────────────────────── */

const esc = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function icon(name: 'home' | 'sound' | 'mute' | 'back' | 'pause' | 'again' | 'grid' | 'star' | 'lock' | 'note'): string {
  const paths: Record<typeof name, string> = {
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
    sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/>',
    mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m17 10 4 4m0-4-4 4"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    again: '<path d="M5 12a7 7 0 1 0 2.2-5.1"/><path d="M5 4v4h4"/>',
    grid: '<circle cx="7.5" cy="7.5" r="3"/><circle cx="16.5" cy="7.5" r="3"/><circle cx="7.5" cy="16.5" r="3"/><circle cx="16.5" cy="16.5" r="3"/>',
    star: '<path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11"/>',
    note: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  }
  return `<svg class="ps-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`
}

/** A pencil ring around a round thing, plus an optional marker blob behind it. */
function ring(seed: number, color: string | null, width = 3): string {
  const blob = color ? `<path class="ps-blob" d="${markerBlob(50, 50, 45, seed + 1)}" fill="${color}"/>` : ''
  return `<svg class="ps-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${blob}<path class="ps-pencil" d="${pencilCircle(50, 50, 47, seed)}" stroke-width="${width}"/></svg>`
}

function levelName(level: number): string {
  return copy.speeds[level] ?? copy.speeds[0]
}

function songTitle(song: Song): string {
  return song.title[lang]
}

/* ─────────────────────────── speech ─────────────────────────── */

function begin(label: string): void {
  player.unlock()
  narration.begin(label)
}
function say(...texts: string[]): void {
  narration.announce(texts)
}
/** Say something once per visit (hints). */
function sayOnce(key: string, text: string): void {
  if (saidThisVisit.has(key)) return
  saidThisVisit.add(key)
  say(text)
}

/* ─────────────────────────── rendering ─────────────────────────── */

function topbar(): string {
  const left =
    screen === 'song'
      ? `<button type="button" class="ps-tool ps-back" data-action="shelf" aria-label="${esc(copy.songs)}">${icon('back')}<span>${esc(copy.songs)}</span></button>`
      : `<a class="ps-tool ps-home" href="/" data-action="home" aria-label="${esc(copy.home)}">${icon('home')}<span>${esc(copy.home)}</span></a>`
  const pause =
    screen === 'song' && session?.stage === 'playing'
      ? `<button type="button" class="ps-tool ps-round" data-action="pause" aria-label="${esc(copy.pause)}">${icon('pause')}</button>`
      : ''
  return `<header class="ps-top">
    ${left}
    <div class="ps-top-mid">${screen === 'song' ? clockMarkup() : ''}</div>
    <div class="ps-settings">
      ${pause}
      <button type="button" class="ps-tool ps-round" data-action="sound" aria-pressed="${save.sound}" aria-label="${esc(save.sound ? copy.soundOn : copy.soundOff)}">${icon(save.sound ? 'sound' : 'mute')}</button>
      <label class="ps-lang"><span class="ps-visually-hidden">${esc(copy.language)}</span><select id="ps-language" aria-label="${esc(copy.language)}">${LANGS.map((l) => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select></label>
    </div>
  </header>`
}

function shelfMarkup(): string {
  const items = SONGS.map((song, index) => {
    const progress = progressOf(save, song.id)
    const speeds = LEVELS.map(
      (_, i) => `<span class="ps-speed-dot ${i < progress.done ? 'is-done' : ''}" aria-hidden="true"></span>`,
    ).join('')
    const doneLabel = progress.done > 0 ? `, ${levelName(progress.done - 1)}` : ''
    return `<li style="--i:${index}">
      <button type="button" class="ps-song ${save.last === song.id ? 'is-last' : ''} ${progress.done >= LEVELS.length ? 'is-gold' : ''}" data-song="${song.id}" style="--song:${song.color};--paper:${song.paper}" aria-label="${esc(songTitle(song) + doneLabel)}">
        <span class="ps-disc">${ring(hashText(song.id), song.paper, 2.6)}<span class="ps-art">${heroSvg(song.id)}</span></span>
        <span class="ps-song-name">${esc(songTitle(song))}</span>
        <span class="ps-speed-dots">${speeds}</span>
      </button>
    </li>`
  }).join('')
  return `<section class="ps-shelf" aria-labelledby="ps-title">
    <div class="ps-heading">
      <h1 id="ps-title" class="ps-title">${esc(copy.name)}</h1>
      <p class="ps-byline">${esc(copy.byline)}</p>
    </div>
    <p class="ps-pick">${esc(copy.pick)}</p>
    <ul class="ps-grid" aria-label="${esc(copy.pick)}">${items}</ul>
    <footer class="ps-foot">
      <p>${esc(copy.credits)}</p>
      ${persistent ? '' : `<p>${esc(copy.noStorage)}</p>`}
    </footer>
  </section>`
}

function clockMarkup(): string {
  const s = session
  const conductor = s?.conductor
  const pill = pencilPill(300, 40, 71)
  const marks = conductor
    ? conductor.plan.cues
        .map((cue) => {
          const at = ((cue.line.s - conductor.plan.begin) / (conductor.plan.end - conductor.plan.begin)) * 100
          return `<span class="ps-mark" data-cue="${cue.index}" style="left:${at.toFixed(2)}%"><span class="ps-mark-dot"></span></span>`
        })
        .join('')
    : ''
  const hatchPath = hatch(300, 40, 6, 5)
  return `<div class="ps-clock" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${esc(s ? songTitle(s.song) : copy.name)}">
    <div class="ps-clock-fill"><svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="${hatchPath}"/></svg></div>
    <svg class="ps-clock-line" viewBox="-4 -4 308 48" preserveAspectRatio="none" aria-hidden="true"><path d="${pill}"/></svg>
    <div class="ps-marks">${marks}</div>
    <span class="ps-alarm" aria-hidden="true">${alarmSvg()}</span>
  </div>`
}

function alarmSvg(): string {
  return `<svg viewBox="0 0 64 64"><g class="ps-alarm-bells"><path d="M13 17a9 9 0 0 1 12-9" /><path d="M51 17a9 9 0 0 0-12-9"/><circle cx="17" cy="11" r="6" class="ps-bell"/><circle cx="47" cy="11" r="6" class="ps-bell"/></g><circle cx="32" cy="36" r="20" class="ps-face"/><path d="M32 24v12l8 5"/><path d="M20 56l4-5M44 56l-4-5"/></svg>`
}

function stageMarkup(): string {
  const s = session!
  const song = s.song
  return `<section class="ps-stage" style="--song:${song.color};--paper:${song.paper}" aria-label="${esc(songTitle(song))}">
    <div class="ps-hero-wrap">
      <button type="button" class="ps-hero" data-action="hero" aria-label="${esc(song.hero[lang])}">
        ${ring(hashText(song.id) + 3, song.paper, 2)}
        <svg class="ps-energy" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.5" pathLength="100"/></svg>
        <span class="ps-hero-art">${heroSvg(song.id)}</span>
        <span class="ps-hand" aria-hidden="true">${handSvg()}</span>
        <span class="ps-hero-fx" aria-hidden="true"></span>
      </button>
      <p class="ps-bubble" id="ps-status" aria-live="polite"></p>
    </div>
    <p class="ps-line" aria-hidden="true"></p>
    <div class="ps-choices" role="group" aria-label="${esc(copy.choicesLabel)}"></div>
    <div class="ps-speedbar"></div>
    <div class="ps-finish" hidden></div>
  </section>`
}

function handSvg(): string {
  return `<svg viewBox="0 0 64 64"><path d="M26 58c-6-4-12-12-14-17-1-3 2-5 5-3l6 5V14a4 4 0 0 1 8 0v18-6a4 4 0 0 1 8 0v7-5a4 4 0 0 1 8 0v7-4a4 4 0 0 1 7 1v12c0 7-3 12-7 15z"/></svg>`
}

function render(): void {
  document.documentElement.lang = lang
  document.title = copy.documentTitle
  document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
  const body = screen === 'shelf' ? shelfMarkup() : stageMarkup()
  root.innerHTML = `<main class="ps ps-screen-${screen}">${topbar()}${body}</main>`
  if (screen === 'song') {
    renderSpeedbar()
    refreshStage()
  }
}

/* ─────────────────────────── the song screen ─────────────────────────── */

function el<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return root.querySelector<T>(selector)
}

function setStatus(text: string): void {
  const status = el('#ps-status')
  if (!status) return
  status.textContent = text
  status.classList.toggle('is-empty', !text)
}

function statusFor(s: Session): string {
  if (s.stage === 'loading') return copy.loading
  if (s.stage === 'error') return copy.loadError
  if (s.stage === 'idle') return copy.tapToStart
  const mode = s.conductor?.mode
  if (mode === 'paused') return copy.paused
  if (mode === 'stuck') return copy.wake
  if (mode === 'rewind') return copy.rewind
  if (mode === 'hold' || mode === 'hint') return copy.listen
  if (s.conductor && s.conductor.chorus >= 0) return copy.tapChorus
  return ''
}

function refreshStage(): void {
  const s = session
  if (!s || screen !== 'song') return
  const main = root.querySelector('.ps')
  main?.setAttribute('data-stage', s.stage)
  main?.setAttribute('data-mode', s.conductor?.mode ?? 'none')
  setStatus(statusFor(s))
  const hero = el('.ps-hero')
  hero?.classList.toggle('is-chorus', !!s.conductor && s.conductor.chorus >= 0)
  const error = s.stage === 'error'
  const choices = el('.ps-choices')
  if (choices && error) {
    choices.innerHTML = `<button type="button" class="ps-button" data-action="retry">${icon('again')}<span>${esc(copy.retry)}</span></button>`
  }
}

function renderSpeedbar(): void {
  const s = session
  const bar = el('.ps-speedbar')
  if (!s || !bar) return
  const open = openLevels(save, s.song.id)
  if (s.stage !== 'idle' || open < 2) {
    bar.innerHTML = ''
    return
  }
  bar.innerHTML = `<div class="ps-speeds" role="group" aria-label="${esc(copy.speedUps)}">${LEVELS.slice(0, open)
    .map(
      (_, i) =>
        `<button type="button" class="ps-speed ${i === s.level ? 'is-picked' : ''}" data-level="${i}" aria-pressed="${i === s.level}" aria-label="${esc(levelName(i))}">${ring(hashText(`speed${i}`), null, 3)}<span class="ps-speed-art">${speedSvg(i)}</span></button>`,
    )
    .join('')}</div>`
}

async function openSong(song: Song, level?: number): Promise<void> {
  stopSession()
  const open = openLevels(save, song.id)
  const s: Session = {
    song,
    lang,
    level: Math.max(0, Math.min(open - 1, level ?? open - 1)),
    stage: 'loading',
    timing: null,
    conductor: null,
    loaded: 0,
    fresh: -1,
    line: -2,
    sung: -1,
    lastTick: 0,
    said: new Set(),
  }
  session = s
  screen = 'song'
  save.last = song.id
  persist()
  render()
  keepAwake()
  const timing = await loadTiming(song.id, s.lang)
  if (session !== s) return
  if (!timing) {
    s.stage = 'error'
    refreshStage()
    return
  }
  s.timing = timing
  const ok = await player.load(timing.audio, (fraction) => {
    if (session !== s) return
    s.loaded = fraction
    const fill = el('.ps-clock-fill')
    fill?.style.setProperty('--progress', String(fraction))
    fill?.classList.add('is-loading')
  })
  if (session !== s) return
  if (!ok) {
    s.stage = 'error'
    refreshStage()
    return
  }
  prepareRun(s)
  if (session === s) sayOnce(`start:${lang}`, copy.tapToStart)
}

function prepareRun(s: Session): void {
  if (!s.timing) return
  s.conductor = new Conductor({ timing: s.timing, level: s.level, extras: extraPictures(s.timing) })
  s.stage = 'idle'
  s.line = -2
  s.sung = -1
  sfx.resetStreak()
  render()
  el('.ps-clock-fill')?.classList.remove('is-loading')
  el('.ps-clock-fill')?.style.setProperty('--progress', '0')
  el('.ps')?.style.setProperty('--beat', `${(60 / (s.timing.bpm || 100)) / LEVELS[s.level].speed}s`)
}

/** Pictures from other songs: extra distractors when a song has few of its own. */
function extraPictures(timing: SongTiming): string[] {
  const own = new Set(timing.lines.map((line) => line.pic).filter(Boolean))
  return Object.keys(PICTURES).filter((pic) => !own.has(pic))
}

function stopSession(): void {
  if (!session) return
  session.conductor?.pause()
  player.stop(0.08)
  sfx.silence()
  releaseWake()
  session = null
}

function startSong(): void {
  const s = session
  if (!s?.conductor || s.stage !== 'idle') return
  player.unlock()
  narration.silence()
  s.stage = 'playing'
  el('.ps-speedbar')!.innerHTML = ''
  refreshTop()
  apply(s.conductor.start())
  refreshStage()
}

/* ─────────────────────────── commands from the conductor ─────────────────────────── */

function apply(commands: Command[]): void {
  const s = session
  if (!s?.conductor) return
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'play':
        narration.silence()
        player.play(cmd.from, cmd.rate, cmd.fade)
        break
      case 'stop-at':
        player.stopAt(cmd.at)
        break
      case 'stop':
        player.stop()
        break
      case 'rate':
        player.setRate(cmd.rate)
        break
      case 'reverse':
        player.reverse(cmd.from, cmd.rate)
        sfx.play('rewind')
        break
      case 'fade-out':
        player.fadeOut(cmd.seconds)
        break
      case 'show':
        showChoices(s, cmd.cue, cmd.choices)
        break
      case 'hide':
        hideChoices(cmd.cue)
        break
      case 'right':
        rightPicture(s, cmd.cue, cmd.pic, cmd.fast)
        break
      case 'wrong':
        wrongPicture(cmd.pic)
        break
      case 'hold':
        if (cmd.count === 1) sayOnce(`listen:${lang}`, copy.listen)
        s.lastTick = performance.now()
        break
      case 'hint':
        narration.silence()
        if (s.conductor.hinted[cmd.cue]) el(`.ps-choice[data-pic="${s.conductor.plan.cues[cmd.cue].pic}"]`)?.classList.add('is-hint')
        break
      case 'chorus':
        el('.ps-hero')?.classList.toggle('is-chorus', cmd.on)
        break
      case 'tap':
        heroTapFx(cmd.perfect)
        sfx.play(cmd.perfect ? 'perfect' : 'drum', cmd.energy)
        break
      case 'rewinding':
        el('.ps-hero')?.classList.toggle('is-rewinding', cmd.on)
        if (!cmd.on && s.conductor.mode === 'stuck') say(copy.wake)
        break
      case 'done':
        finish(s, cmd.stars, cmd.total)
        break
    }
  }
  refreshStage()
}

function showChoices(s: Session, cue: number, choices: string[]): void {
  const box = el('.ps-choices')
  if (!box) return
  box.dataset.cue = String(cue)
  box.dataset.count = String(choices.length)
  box.innerHTML = choices
    .map(
      (pic, i) =>
        `<button type="button" class="ps-choice" data-pic="${esc(pic)}" style="--i:${i}" aria-label="${esc(pictureWord(pic, s.lang))}">${ring(hashText(pic) + cue, '#ffffff', 2.8)}<span class="ps-choice-art">${pictureSvg(pic)}</span></button>`,
    )
    .join('')
  box.classList.remove('is-leaving')
  box.classList.add('is-in')
  sfx.play('pop')
}

/** Hide the circles of one cue (or whatever is shown), never the next cue's circles. */
function hideChoices(only?: number): void {
  const box = el('.ps-choices')
  if (!box || box.dataset.cue === undefined) return
  if (only !== undefined && box.dataset.cue !== String(only)) return
  box.classList.add('is-leaving')
  const cue = box.dataset.cue
  window.setTimeout(() => {
    const now = el('.ps-choices')
    if (now && now.dataset.cue === cue && now.classList.contains('is-leaving')) {
      now.innerHTML = ''
      now.classList.remove('is-in', 'is-leaving')
      delete now.dataset.cue
    }
  }, 380)
}

function rightPicture(s: Session, cue: number, pic: string, fast: boolean): void {
  sfx.play(fast ? 'fast' : 'right')
  const box = el('.ps-choices')
  const button = box?.querySelector<HTMLElement>(`.ps-choice[data-pic="${CSS.escape(pic)}"]`)
  const target = el(`.ps-mark[data-cue="${cue}"]`)
  if (button && target) flyTo(button, target, pic)
  // The picture flies into its dot on the clock; the dot fills in when it lands.
  window.setTimeout(() => {
    target?.classList.add('is-found')
    if (fast) target?.classList.add('is-fast')
  }, 520)
  burst(button ?? el('.ps-hero'), fast ? 14 : 9)
  box?.querySelectorAll('.ps-choice').forEach((b) => b.classList.toggle('is-right', b === button))
  // The found picture also lands in the karaoke line.
  s.line = -2
  window.setTimeout(() => hideChoices(cue), 220)
}

function wrongPicture(pic: string): void {
  sfx.play('wrong')
  const button = el(`.ps-choice[data-pic="${CSS.escape(pic)}"]`)
  if (!button) return
  button.classList.remove('is-wrong')
  void button.offsetWidth
  button.classList.add('is-wrong', 'is-tried')
}

/** A copy of the picture flies from the circle to its place on the clock. */
function flyTo(from: HTMLElement, to: HTMLElement, pic: string): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const ghost = document.createElement('span')
  ghost.className = 'ps-flyer'
  ghost.innerHTML = pictureSvg(pic)
  ghost.style.left = `${a.left + a.width * 0.15}px`
  ghost.style.top = `${a.top + a.height * 0.15}px`
  ghost.style.width = `${a.width * 0.7}px`
  ghost.style.height = `${a.height * 0.7}px`
  document.body.append(ghost)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const scale = Math.max(0.12, 16 / (a.width * 0.7))
  const flight = ghost.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(${(1 + scale) / 1.6}) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)`, opacity: 0.2 },
    ],
    { duration: 650, easing: 'cubic-bezier(.3,.1,.3,1)' },
  )
  flight.onfinish = () => ghost.remove()
  flight.oncancel = () => ghost.remove()
}

function burst(anchor: HTMLElement | null, count: number): void {
  if (!anchor || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = anchor.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const color = session?.song.color ?? '#ff5c8a'
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span')
    bit.className = `ps-confetti ${i % 3 === 0 ? 'is-star' : ''}`
    bit.style.left = `${cx}px`
    bit.style.top = `${cy}px`
    bit.style.background = i % 2 ? color : ['#ffc93c', '#ff5c8a', '#3cc9a7', '#4b5bd6'][i % 4]
    document.body.append(bit)
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const dist = r.width * (0.55 + Math.random() * 0.5)
    const anim = bit.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 30}px)) scale(.4) rotate(${Math.random() * 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)' },
    )
    anim.onfinish = () => bit.remove()
    anim.oncancel = () => bit.remove()
  }
}

function heroTapFx(perfect: boolean): void {
  const fx = el('.ps-hero-fx')
  if (!fx) return
  const ripple = document.createElement('span')
  ripple.className = `ps-ripple ${perfect ? 'is-perfect' : ''}`
  fx.append(ripple)
  window.setTimeout(() => ripple.remove(), 650)
  if (perfect) {
    const note = document.createElement('span')
    note.className = 'ps-note'
    note.innerHTML = icon('note')
    note.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 120)}%`)
    fx.append(note)
    window.setTimeout(() => note.remove(), 900)
  }
  const hero = el('.ps-hero')
  hero?.classList.remove('is-tapped')
  void hero?.offsetWidth
  hero?.classList.add('is-tapped')
}

/* ─────────────────────────── finishing ─────────────────────────── */

function finish(s: Session, stars: number, total: number): void {
  s.stage = 'finished'
  hideChoices()
  const opened = finishSong(save, s.song.id, s.level, stars)
  persist()
  s.fresh = opened ? s.level + 1 : -1
  sfx.play('alarm')
  window.setTimeout(() => sfx.play('cheer'), 700)
  refreshTop()
  el('.ps-clock-fill')?.style.setProperty('--progress', '1')
  burst(el('.ps-hero'), 18)
  renderFinish(s, stars, total)
  const lines = [copy.done]
  if (total > 0) lines.push(stars === total ? copy.perfectSong : copy.starsLine(stars, total))
  lines.push(s.fresh >= 0 ? copy.newSpeed : copy.pickSpeed)
  window.setTimeout(() => {
    if (session === s && s.stage === 'finished') say(...lines)
  }, 900)
  releaseWake()
}

function renderFinish(s: Session, stars: number, total: number): void {
  const card = el('.ps-finish')
  if (!card) return
  const open = openLevels(save, s.song.id)
  // The pictures of the song, collected: gold ones were found without stopping.
  const c = s.conductor
  const found = c
    ? c.plan.cues
        .map(
          (cue, i) =>
            `<span class="ps-found ${c.fast[i] ? 'is-fast' : ''} ${c.answered[i] ? '' : 'is-missed'}" style="--i:${i}" title="${esc(pictureWord(cue.pic, s.lang))}">${pictureSvg(cue.pic)}${c.fast[i] ? `<span class="ps-found-star">${icon('star')}</span>` : ''}</span>`,
        )
        .join('')
    : ''
  const speeds = LEVELS.map((level, i) => {
    const isOpen = i < open
    const isFresh = i === s.fresh
    const label = isOpen ? `${levelName(i)} ×${level.speed.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}` : copy.locked
    return `<button type="button" class="ps-speed ${isOpen ? '' : 'is-locked'} ${isFresh ? 'is-fresh' : ''} ${i === s.level ? 'is-current' : ''}" data-level="${i}" ${isOpen ? '' : 'disabled'} aria-label="${esc(label)}" style="--i:${i}">
      ${ring(hashText(`speed${i}`), isOpen ? s.song.paper : null, 3)}
      <span class="ps-speed-art">${isOpen ? speedSvg(i) : icon('lock')}</span>
      <span class="ps-speed-name">${esc(isOpen ? levelName(i) : '')}</span>
    </button>`
  }).join('')
  card.innerHTML = `<div class="ps-finish-card" role="dialog" aria-label="${esc(copy.done)}">
    <p class="ps-finish-title">${esc(copy.done)}</p>
    ${total > 0 ? `<p class="ps-collection" role="img" aria-label="${esc(copy.starsLine(stars, total))}">${found}</p>` : ''}
    <p class="ps-finish-pick">${esc(s.fresh >= 0 ? copy.newSpeed : copy.pickSpeed)}</p>
    <div class="ps-speeds ps-speeds-big" role="group" aria-label="${esc(copy.speedUps)}">${speeds}</div>
    <div class="ps-finish-row">
      <button type="button" class="ps-button" data-action="again">${icon('again')}<span>${esc(copy.again)}</span></button>
      <button type="button" class="ps-button" data-action="shelf">${icon('grid')}<span>${esc(copy.another)}</span></button>
    </div>
  </div>`
  card.hidden = false
  if (s.fresh >= 0) window.setTimeout(() => sfx.play('unlock'), 1300)
  window.setTimeout(() => card.querySelector<HTMLElement>(s.fresh >= 0 ? '.ps-speed.is-fresh' : '.ps-speed.is-current')?.focus({ preventScroll: true }), 50)
}

function restart(level: number): void {
  const s = session
  if (!s?.timing) return
  s.level = Math.max(0, Math.min(openLevels(save, s.song.id) - 1, level))
  s.fresh = -1
  player.stop(0.05)
  prepareRun(s)
  startSong()
}

/* ─────────────────────────── every frame ─────────────────────────── */

let rafId = 0
let lastFrame = 0
let nextBlink = performance.now() + 2500

function loop(now: number): void {
  rafId = requestAnimationFrame(loop)
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 1 / 60
  lastFrame = now
  const s = session
  if (screen !== 'song' || !s?.conductor || !s.timing) return
  const c = s.conductor
  if (s.stage === 'playing') {
    const cmds = c.frame(player.position(), now / 1000, dt)
    if (cmds.length) apply(cmds)
    if (c.mode === 'hold' && now - s.lastTick > 1000) {
      s.lastTick = now
      sfx.play('tick', Math.floor(now / 1000) % 2)
    }
  }
  paint(s, c, now)
}

function paint(s: Session, c: Conductor, now: number): void {
  const heard = s.stage === 'playing' ? player.audible() : c.pos
  const playing = s.stage === 'playing' && player.playing
  // Clock.
  const span = c.plan.end - c.plan.begin
  const progress = s.stage === 'finished' ? 1 : Math.max(0, Math.min(1, (heard - c.plan.begin) / span))
  const fill = el('.ps-clock-fill')
  if (fill && s.stage !== 'loading') fill.style.setProperty('--progress', progress.toFixed(4))
  el('.ps-clock')?.setAttribute('aria-valuenow', String(Math.round(progress * 100)))

  // Karaoke line.
  let index = s.stage === 'playing' || s.stage === 'idle' ? lineAt(s.timing!.lines, heard) : -1
  // While the pictures of a line are waiting for an answer, that line stays on screen.
  if (s.stage === 'playing' && c.shown >= 0 && !c.answered[c.shown]) index = s.timing!.lines.indexOf(c.plan.cues[c.shown].line)
  if (index !== s.line) {
    s.line = index
    s.sung = -1
    renderLine(s, index)
  }
  if (index >= 0) {
    const line = s.timing!.lines[index]
    let sung = -1
    line.words.forEach((word, i) => {
      if (heard >= word.s - 0.02) sung = i
    })
    if (sung !== s.sung) {
      s.sung = sung
      el('.ps-line')?.querySelectorAll<HTMLElement>('.ps-word').forEach((node, i) => node.classList.toggle('is-sung', i <= sung))
    }
  }

  // Hero: lip-sync, dance on the beat, blink.
  const hero = el('.ps-hero')
  if (!hero) return
  const line = index >= 0 ? s.timing!.lines[index] : null
  const singing = playing && player.direction === 1 && !!line?.words.some((w) => heard >= w.s && heard < w.e - 0.04)
  hero.classList.toggle('is-singing', singing)
  const period = 60 / (s.timing!.bpm || 100)
  const phase = playing ? ((heard - s.timing!.beat0) / period) % 2 : 0
  const beat = phase - Math.floor(phase)
  const bounce = playing ? Math.pow(1 - beat, 3) : 0
  const swing = playing ? Math.sin(phase * Math.PI) : Math.sin(now / 700) * 0.25
  hero.style.setProperty('--bounce', bounce.toFixed(3))
  hero.style.setProperty('--swing', swing.toFixed(3))
  if (now > nextBlink) {
    hero.classList.add('is-blinking')
    window.setTimeout(() => el('.ps-hero')?.classList.remove('is-blinking'), 140)
    nextBlink = now + 2200 + Math.random() * 3200
  }
  // Chorus energy ring.
  const chorus = c.chorus >= 0 && s.stage === 'playing'
  hero.style.setProperty('--energy', chorus ? c.energy.toFixed(3) : '0')
  hero.querySelector<SVGCircleElement>('.ps-energy circle')?.style.setProperty('stroke-dasharray', `${((chorus ? c.energy : 0) * 100).toFixed(1)} 100`)
  hero.classList.toggle('is-low', chorus && c.energy < 0.42)
}

function renderLine(s: Session, index: number): void {
  const box = el('.ps-line')
  if (!box) return
  if (index < 0 || !s.timing) {
    box.innerHTML = ''
    box.classList.remove('is-chorus')
    return
  }
  const line: TimedLine = s.timing.lines[index]
  const cue = s.conductor?.plan.cues.find((c) => c.line === line)
  const found = cue ? s.conductor!.answered[cue.index] : false
  box.classList.toggle('is-chorus', line.kind === 'sing')
  box.innerHTML = line.words
    .map((word, i) => {
      if (line.kind === 'pick' && i === line.key && line.pic) {
        const inner = found
          ? `<span class="ps-slot-art">${pictureSvg(line.pic)}</span><span class="ps-slot-word">${esc(word.w)}</span>`
          : '<span class="ps-slot-empty"></span>'
        return `<span class="ps-word ps-slot ${found ? 'is-found' : ''}">${inner}</span>`
      }
      return `<span class="ps-word">${esc(word.w)}</span>`
    })
    .join(' ')
}

/* ─────────────────────────── wake lock ─────────────────────────── */

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

/* ─────────────────────────── input ─────────────────────────── */

function tapHero(): void {
  const s = session
  if (!s) return
  player.unlock()
  if (s.stage === 'idle') {
    startSong()
    return
  }
  if (s.stage === 'error') {
    void openSong(s.song, s.level)
    return
  }
  if (s.stage !== 'playing' || !s.conductor) return
  const c = s.conductor
  if (c.mode === 'paused') {
    narration.silence()
    apply(c.resume(performance.now() / 1000))
    keepAwake()
    refreshTop()
    return
  }
  const cmds = c.tapHero(performance.now() / 1000, s.timing ? beatOffset(s.timing, player.audible()) : Infinity)
  if (cmds.length) apply(cmds)
  else {
    // Outside the chorus the hero just giggles.
    heroTapFx(false)
    sfx.play('pop')
  }
}

function pauseSong(): void {
  const s = session
  if (!s?.conductor || s.stage !== 'playing') return
  apply(s.conductor.pause())
  narration.silence()
  say(copy.paused)
  releaseWake()
}

// The hero reacts on pointerdown: drumming must feel instant.
root.addEventListener('pointerdown', (event) => {
  const hero = (event.target as HTMLElement).closest('.ps-hero')
  if (!hero || event.button > 0) return
  event.preventDefault()
  tapHero()
})

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action], [data-song], [data-pic], [data-level]')
  if (!target) return
  const action = target.dataset.action
  if (action === 'home') {
    teardown()
    return
  }
  player.unlock()
  if (action === 'hero') {
    // Pointer taps were handled on pointerdown; keyboard and screen readers click.
    if ((event as PointerEvent).detail === 0) tapHero()
    return
  }
  if (target.dataset.song) {
    const song = songById(target.dataset.song)
    if (!song) return
    sfx.play('tap')
    begin(songTitle(song))
    void openSong(song)
    return
  }
  if (target.dataset.pic) {
    const s = session
    if (!s?.conductor || s.stage !== 'playing' || target.classList.contains('is-tried')) return
    apply(s.conductor.pick(target.dataset.pic))
    return
  }
  if (target.dataset.level) {
    const level = Number(target.dataset.level)
    const s = session
    if (!s || target.hasAttribute('disabled')) return
    sfx.play('whoosh')
    begin(levelName(level))
    if (s.stage === 'finished') restart(level)
    else if (s.stage === 'idle') {
      s.level = level
      prepareRun(s)
    }
    return
  }
  switch (action) {
    case 'sound':
      save.sound = !save.sound
      persist()
      player.setMuted(!save.sound)
      if (save.sound) {
        sfx.play('tap')
        begin(copy.soundOn)
      } else {
        narration.silence()
        sfx.silence()
      }
      refreshTop()
      el<HTMLElement>('[data-action="sound"]')?.focus()
      return
    case 'shelf':
      sfx.play('tap')
      stopSession()
      screen = 'shelf'
      render()
      begin(copy.pick)
      el<HTMLElement>(`.ps-song[data-song="${save.last ?? ''}"]`)?.focus({ preventScroll: true })
      return
    case 'pause':
      pauseSong()
      refreshTop()
      return
    case 'again':
      sfx.play('whoosh')
      if (session) {
        begin(copy.again)
        restart(session.level)
      }
      return
    case 'retry':
      if (session) void openSong(session.song, session.level)
      return
  }
})

/** Rebuild the top bar (the pause button comes and goes) and restore the clock. */
function refreshTop(): void {
  const top = root.querySelector('.ps-top')
  if (top) top.outerHTML = topbar()
  paintClockState()
}

/** Re-rendering the top bar rebuilds the clock: put back the found stickers. */
function paintClockState(): void {
  const s = session
  const c = s?.conductor
  if (!s || !c) return
  c.plan.cues.forEach((cue) => {
    if (!c.answered[cue.index]) return
    const mark = el(`.ps-mark[data-cue="${cue.index}"]`)
    mark?.classList.add('is-found')
    if (c.fast[cue.index]) mark?.classList.add('is-fast')
  })
  if (s.stage === 'finished') el('.ps-alarm')?.classList.add('is-ringing')
}

root.addEventListener('change', (event) => {
  const select = event.target
  if (!(select instanceof HTMLSelectElement) || select.id !== 'ps-language' || !isLang(select.value)) return
  lang = select.value
  copy = PESENKI_COPY[lang]
  saveLang(lang)
  narration.languageChanged()
  if (screen === 'song' && session) {
    // Every language has its own recording: start the song again in the new language.
    const { song, level } = session
    void openSong(song, level)
  } else render()
  el<HTMLElement>('#ps-language')?.focus()
})

window.addEventListener('keydown', (event) => {
  if (screen !== 'song' || !session) return
  if (event.target instanceof Element && event.target.closest('select, input, textarea')) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const s = session
  const digit = Number(event.key)
  if (digit >= 1 && digit <= 5 && s.stage === 'playing') {
    const button = root.querySelectorAll<HTMLElement>('.ps-choice')[digit - 1]
    if (button) {
      event.preventDefault()
      button.click()
    }
    return
  }
  if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault()
    tapHero()
  }
  if (event.key === 'Escape' && s.stage === 'playing') pauseSong()
})

/* ─────────────────────────── lifecycle ─────────────────────────── */

function teardown(): void {
  cancelAnimationFrame(rafId)
  narration.silence()
  sfx.silence()
  player.destroy()
  releaseWake()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    narration.silence()
    sfx.silence()
    if (session?.conductor && session.stage === 'playing') {
      apply(session.conductor.pause())
      refreshTop()
    }
    releaseWake()
  } else {
    lastFrame = 0
  }
})
window.addEventListener('pagehide', teardown)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    screen = 'shelf'
    session = null
    render()
    rafId = requestAnimationFrame(loop)
  }
})

render()
narration.begin(`${copy.name}. ${copy.pick}`)
rafId = requestAnimationFrame(loop)

// Test and debugging hook.
Object.defineProperty(window, '__pesenki', {
  value: {
    state: () => {
      const s = session
      const c = s?.conductor
      return {
        screen,
        lang,
        stage: s?.stage ?? null,
        song: s?.song.id ?? null,
        level: s?.level ?? null,
        mode: c?.mode ?? null,
        pos: c ? Math.round(c.pos * 100) / 100 : null,
        shown: c?.shown ?? -1,
        choices: c && c.shown >= 0 ? c.choices[c.shown] : [],
        target: debug && c && c.shown >= 0 ? c.plan.cues[c.shown].pic : undefined,
        chorus: c?.chorus ?? -1,
        energy: c ? Math.round(c.energy * 100) / 100 : null,
        answered: c ? c.answered.filter(Boolean).length : 0,
        fast: c?.stars ?? 0,
        cues: c?.plan.cues.length ?? 0,
        playing: player.playing,
        save: JSON.parse(JSON.stringify(save)) as PesenkiSave,
      }
    },
    seek: (to: number) => {
      const c = session?.conductor
      if (!debug || !c || session?.stage !== 'playing') return false
      c.pos = to
      player.play(to, c.rate, 0.02)
      return true
    },
  },
})
