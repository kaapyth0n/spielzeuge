/**
 * Песенки — song timing and the conductor.
 *
 * The conductor is pure: it never touches audio or the DOM. The page feeds it
 * the song position every frame and forwards its commands to the player and
 * the view. Positions are in song seconds (buffer time), never wall time.
 */

export interface Word {
  /** Text as shown in the karaoke line. */
  w: string
  /** Start and end in song seconds. */
  s: number
  e: number
}

export interface TimedLine {
  kind: 'pick' | 'sing'
  s: number
  e: number
  words: Word[]
  /** Pick lines: the picture sung in this line and the index of its word. */
  pic?: string
  key?: number
}

export interface SongTiming {
  song: string
  lang: string
  audio: string
  duration: number
  bpm: number
  /** Time of one downbeat; beats repeat every 60 / bpm seconds. */
  beat0: number
  lines: TimedLine[]
  /** Tap-the-hero sections (the choruses). */
  choruses: Array<{ s: number; e: number }>
  /** Pictures that sound alike (корона / ворона): never offered together. */
  apart?: string[][]
}

export interface Level {
  speed: number
  choices: number
}

/** «Ускорения»: every finished song unlocks the next one. */
export const LEVELS: readonly Level[] = [
  { speed: 1, choices: 3 },
  { speed: 1.15, choices: 3 },
  { speed: 1.3, choices: 4 },
  { speed: 1.45, choices: 4 },
  { speed: 1.6, choices: 5 },
]

export interface Cue {
  index: number
  line: TimedLine
  pic: string
  /** Pictures appear a little before the line is sung. */
  showAt: number
  /** Where the song stops if nobody has answered. */
  pauseAt: number
  /** Where a hint replay restarts the line. */
  replayFrom: number
}

export interface Section {
  s: number
  e: number
}

export interface Plan {
  cues: Cue[]
  choruses: Section[]
  /** First audible moment: a short intro only. */
  begin: number
  /** The song counts as finished here. */
  end: number
}

export const INTRO_LEAD = 3.2
export const OUTRO_TAIL = 2.6
const SHOW_LEAD = 0.55
const PAUSE_GAP = 0.3

export function planSong(timing: SongTiming): Plan {
  const lines = timing.lines
  const cues: Cue[] = []
  lines.forEach((line, i) => {
    if (line.kind !== 'pick' || !line.pic) return
    const previous = lines[i - 1]
    const next = lines[i + 1]
    const showAt = Math.max(previous ? previous.e + 0.05 : 0, line.s - SHOW_LEAD)
    // Stop in the gap after the line; when lines touch, stop halfway between them.
    const room = next ? next.s - line.e : PAUSE_GAP * 2
    const pauseAt = line.e + (room >= 0.45 ? PAUSE_GAP : Math.max(0, room * 0.5))
    cues.push({
      index: cues.length,
      line,
      pic: line.pic,
      showAt,
      pauseAt,
      replayFrom: Math.max(previous ? previous.e : 0, line.s - 0.45),
    })
  })
  const first = lines[0]?.s ?? 0
  const last = lines[lines.length - 1]?.e ?? timing.duration
  return {
    cues,
    choruses: timing.choruses.map((c) => ({ ...c })),
    begin: Math.max(0, first - INTRO_LEAD),
    end: Math.min(timing.duration, last + OUTRO_TAIL),
  }
}

/** Index of the line to show in the karaoke strip at a position. */
export function lineAt(lines: readonly TimedLine[], pos: number): number {
  let index = -1
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1]
    if (pos >= lines[i].s - 0.6) index = i
    if (next && pos < next.s - 0.6) break
  }
  if (index >= 0) {
    const line = lines[index]
    const next = lines[index + 1]
    // Long instrumental gaps show nothing.
    if (pos > line.e + 1.6 && (!next || pos < next.s - 0.6)) return -1
  }
  return index
}

export function sectionAt(sections: readonly Section[], pos: number): number {
  return sections.findIndex((section) => pos >= section.s && pos < section.e)
}

/** Distance to the nearest beat, in song seconds (signed: + means late). */
export function beatOffset(timing: Pick<SongTiming, 'bpm' | 'beat0'>, pos: number): number {
  if (!(timing.bpm > 0)) return Number.POSITIVE_INFINITY
  const period = 60 / timing.bpm
  const phase = (pos - timing.beat0) / period
  return (phase - Math.round(phase)) * period
}

/* ─────────────────────────── picture choices ─────────────────────────── */

export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0
    state ^= state >>> 13
    return (state >>> 0) / 4294967296
  }
}

export function hashText(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

/** The target plus distractors, target at a random place. Song pictures first, then extras. */
export function chooseChoices(target: string, songPics: readonly string[], extras: readonly string[], count: number, seed: number): string[] {
  const random = seeded(seed)
  const shuffle = <T>(items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
  const pool = shuffle([...new Set(songPics)].filter((pic) => pic !== target))
  const more = shuffle([...new Set(extras)].filter((pic) => pic !== target && !pool.includes(pic)))
  const picked = [target, ...pool, ...more].slice(0, Math.max(1, count))
  return shuffle(picked)
}

/* ─────────────────────────── chorus energy ─────────────────────────── */

export const TAP_GAIN = 0.34
export const PERFECT_GAIN = 0.46
export const DRAIN = 0.42
export const FULL_AT = 0.42
export const STILL_BEFORE_REWIND = 0.45
export const REWIND_RATE = 1.7
export const HINT_REWIND_RATE = 2.3
export const PERFECT_WINDOW = 0.11

/** Rate the music wants for a given energy: full speed, then a tape slowdown. */
export function chorusRate(energy: number, speed: number): number {
  if (energy >= FULL_AT) return speed
  const t = Math.max(0, energy) / FULL_AT
  return speed * Math.max(0.06, Math.pow(t, 0.75))
}

/* ─────────────────────────── the conductor ─────────────────────────── */

export type Mode =
  | 'idle' // waiting for the first tap on the hero
  | 'play'
  | 'hold' // stopped after a line, waiting for the right picture
  | 'hint' // rewinding to sing the line again
  | 'rewind' // chorus: nobody taps, the song runs backwards
  | 'stuck' // chorus rewound to its start and waits for a tap
  | 'paused' // page hidden or the grown-up paused
  | 'done'

export type Command =
  | { type: 'play'; from: number; rate: number; fade?: number }
  | { type: 'stop-at'; at: number }
  | { type: 'stop' }
  | { type: 'rate'; rate: number }
  | { type: 'reverse'; from: number; rate: number }
  | { type: 'show'; cue: number; choices: string[] }
  | { type: 'hide'; cue: number }
  | { type: 'right'; cue: number; pic: string; fast: boolean }
  | { type: 'wrong'; cue: number; pic: string }
  | { type: 'hold'; cue: number; count: number }
  | { type: 'hint'; cue: number; count: number }
  | { type: 'chorus'; on: boolean; index: number }
  | { type: 'tap'; perfect: boolean; energy: number }
  | { type: 'rewinding'; on: boolean }
  | { type: 'fade-out'; seconds: number }
  | { type: 'done'; stars: number; total: number }

export interface ConductorOptions {
  timing: SongTiming
  level: number
  /** Pictures from other songs, used when a song has too few of its own. */
  extras?: readonly string[]
  seed?: number
}

const HINT_AFTER = 6.5
const STOP_LOOKAHEAD = 0.1
const FADE_OUT = 1.8

export class Conductor {
  readonly plan: Plan
  readonly timing: SongTiming
  readonly level: Level
  readonly levelIndex: number
  mode: Mode = 'idle'
  pos: number
  /** Cue whose pictures are on screen. */
  shown = -1
  readonly answered: boolean[]
  readonly fast: boolean[]
  readonly holds: number[]
  readonly hinted: boolean[]
  readonly choices: string[][]
  energy = 1
  rate: number
  chorus = -1
  private holdAt = 0
  private holdPos = 0
  private stopSent = false
  private still = 0
  private resumeMode: Mode = 'play'
  private rewindTo = 0
  private fading = false

  constructor(options: ConductorOptions) {
    this.timing = options.timing
    this.plan = planSong(options.timing)
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, options.level))
    this.level = LEVELS[this.levelIndex]
    this.rate = this.level.speed
    this.pos = this.plan.begin
    const n = this.plan.cues.length
    this.answered = Array(n).fill(false)
    this.fast = Array(n).fill(false)
    this.holds = Array(n).fill(0)
    this.hinted = Array(n).fill(false)
    const pics = this.plan.cues.map((cue) => cue.pic)
    const seed = options.seed ?? hashText(`${options.timing.song}:${options.timing.lang}`)
    const apart = options.timing.apart ?? []
    const allowed = (target: string) => (pic: string) => !apart.some((group) => group.includes(target) && group.includes(pic) && pic !== target)
    this.choices = this.plan.cues.map((cue) =>
      chooseChoices(
        cue.pic,
        pics.filter(allowed(cue.pic)),
        (options.extras ?? []).filter(allowed(cue.pic)),
        this.level.choices,
        seed + cue.index * 7919 + this.levelIndex * 104729,
      ),
    )
  }

  get stars(): number {
    return this.fast.filter(Boolean).length
  }

  get progress(): number {
    const { begin, end } = this.plan
    return Math.max(0, Math.min(1, (this.pos - begin) / Math.max(0.001, end - begin)))
  }

  /** The first tap on the hero. */
  start(): Command[] {
    if (this.mode !== 'idle') return []
    this.mode = 'play'
    this.pos = this.plan.begin
    this.rate = this.level.speed
    return [{ type: 'play', from: this.pos, rate: this.rate, fade: 0.25 }]
  }

  /** Called every animation frame with the player's position. */
  frame(pos: number, now: number, dt: number): Command[] {
    this.pos = pos
    const out: Command[] = []
    switch (this.mode) {
      case 'play':
        this.framePlay(now, dt, out)
        break
      case 'hold':
        if (!this.stopSent) break
        if (now - this.holdAt >= HINT_AFTER && this.holds[this.shown] <= 2) this.startHint(out)
        break
      case 'hint':
        if (pos <= this.rewindTo + 0.02) {
          this.mode = 'play'
          this.stopSent = false
          out.push({ type: 'play', from: this.rewindTo, rate: this.level.speed, fade: 0.08 })
          this.pos = this.rewindTo
        }
        break
      case 'rewind': {
        const section = this.plan.choruses[this.chorus]
        if (section && pos <= section.s + 0.02) {
          this.mode = 'stuck'
          this.pos = section.s
          out.push({ type: 'stop' }, { type: 'rewinding', on: false })
        }
        break
      }
      default:
        break
    }
    return out
  }

  private framePlay(now: number, dt: number, out: Command[]): void {
    const pos = this.pos
    const { cues, choruses, end } = this.plan
    if (pos >= end) {
      this.mode = 'done'
      if (this.shown >= 0) out.push({ type: 'hide', cue: this.shown })
      this.shown = -1
      if (this.chorus >= 0) out.push({ type: 'chorus', on: false, index: this.chorus })
      this.chorus = -1
      out.push({ type: 'stop' }, { type: 'done', stars: this.stars, total: cues.length })
      return
    }
    if (!this.fading && pos >= end - FADE_OUT) {
      this.fading = true
      out.push({ type: 'fade-out', seconds: FADE_OUT / this.rate })
    }

    // Pictures for the next unanswered line.
    const cue = cues.find((c) => !this.answered[c.index] && pos >= c.showAt && pos < c.pauseAt + 0.25)
    if (cue && this.shown !== cue.index) {
      if (this.shown >= 0) out.push({ type: 'hide', cue: this.shown })
      this.shown = cue.index
      out.push({ type: 'show', cue: cue.index, choices: this.choices[cue.index] })
    }
    const current = this.shown >= 0 ? cues[this.shown] : null
    if (current && !this.answered[current.index] && pos >= current.pauseAt - STOP_LOOKAHEAD * this.rate) {
      this.mode = 'hold'
      this.holdAt = now
      this.holdPos = current.pauseAt
      this.holds[current.index] += 1
      this.stopSent = true
      out.push({ type: 'stop-at', at: current.pauseAt }, { type: 'hold', cue: current.index, count: this.holds[current.index] })
      return
    }

    // Choruses: tap the hero to keep the music going.
    const inside = sectionAt(choruses, pos)
    if (inside !== this.chorus) {
      if (this.chorus >= 0) out.push({ type: 'chorus', on: false, index: this.chorus })
      this.chorus = inside
      if (inside >= 0) {
        this.energy = 1
        this.still = 0
        out.push({ type: 'chorus', on: true, index: inside })
      } else if (this.rate !== this.level.speed) {
        this.rate = this.level.speed
        out.push({ type: 'rate', rate: this.rate })
      }
    }
    if (this.chorus >= 0) {
      const speed = this.level.speed
      this.energy = Math.max(0, this.energy - DRAIN * speed * dt)
      this.still = this.energy <= 0 ? this.still + dt : 0
      const target = chorusRate(this.energy, speed)
      // Ease like a tape motor: slowing is gentle, catching up is quick.
      const k = target > this.rate ? 9 : 3.2
      const next = this.rate + (target - this.rate) * Math.min(1, k * dt)
      if (Math.abs(next - this.rate) > 0.002 || (next === target && this.rate !== target)) {
        this.rate = next
        out.push({ type: 'rate', rate: next })
      }
      if (this.still >= STILL_BEFORE_REWIND) {
        const section = choruses[this.chorus]
        if (pos > section.s + 0.3) {
          this.mode = 'rewind'
          this.rewindTo = section.s
          out.push({ type: 'reverse', from: pos, rate: REWIND_RATE }, { type: 'rewinding', on: true })
        }
      }
    }
  }

  private startHint(out: Command[]): void {
    const cue = this.plan.cues[this.shown]
    if (!cue) return
    this.hinted[cue.index] = this.holds[cue.index] >= 2 || this.hinted[cue.index]
    this.mode = 'hint'
    this.rewindTo = cue.replayFrom
    out.push({ type: 'reverse', from: this.holdPos, rate: HINT_REWIND_RATE }, { type: 'hint', cue: cue.index, count: this.holds[cue.index] })
  }

  /** Ask for the line again (tap on the hero while waiting). */
  replay(now: number): Command[] {
    if (this.mode !== 'hold' || this.shown < 0) return []
    const out: Command[] = []
    this.holdAt = now - HINT_AFTER
    this.startHint(out)
    return out
  }

  /** A tap on a picture circle. */
  pick(pic: string): Command[] {
    const cueIndex = this.shown
    if (cueIndex < 0 || this.answered[cueIndex]) return []
    if (!['play', 'hold', 'hint'].includes(this.mode)) return []
    const cue = this.plan.cues[cueIndex]
    if (pic !== cue.pic) return [{ type: 'wrong', cue: cueIndex, pic }]
    this.answered[cueIndex] = true
    const out: Command[] = []
    // A stop that has been scheduled but not reached yet still counts as in time.
    const early = this.mode === 'hold' && this.pos < this.holdPos - 0.01 && this.holds[cueIndex] === 1
    if (early) this.holds[cueIndex] = 0
    const fast = (this.mode === 'play' || early) && this.holds[cueIndex] === 0
    this.fast[cueIndex] = fast
    out.push({ type: 'right', cue: cueIndex, pic, fast })
    if (this.mode === 'hold') {
      this.mode = 'play'
      this.stopSent = false
      this.pos = this.holdPos
      out.push({ type: 'play', from: this.holdPos, rate: this.level.speed, fade: 0.04 })
    } else if (this.mode === 'hint') {
      // The line is being rewound; carry on from where it stopped.
      this.mode = 'play'
      this.stopSent = false
      this.pos = this.holdPos
      out.push({ type: 'play', from: this.holdPos, rate: this.level.speed, fade: 0.06 })
    }
    this.shown = -1
    return out
  }

  /** A tap on the hero. Beat error (song seconds) decides a perfect tap. */
  tapHero(now: number, beatError = Number.POSITIVE_INFINITY): Command[] {
    if (this.mode === 'idle') return this.start()
    if (this.mode === 'hold') return this.replay(now)
    const inChorus = this.chorus >= 0 && (this.mode === 'play' || this.mode === 'rewind' || this.mode === 'stuck')
    if (!inChorus) return []
    const perfect = Math.abs(beatError) <= PERFECT_WINDOW * this.level.speed
    this.energy = Math.min(1, this.energy + (perfect ? PERFECT_GAIN : TAP_GAIN))
    this.still = 0
    const out: Command[] = [{ type: 'tap', perfect, energy: this.energy }]
    if (this.mode === 'rewind' || this.mode === 'stuck') {
      const from = this.mode === 'stuck' ? this.plan.choruses[this.chorus].s : this.pos
      this.mode = 'play'
      this.rate = Math.max(0.35, chorusRate(this.energy, this.level.speed) * 0.6)
      this.pos = from
      out.push({ type: 'rewinding', on: false }, { type: 'play', from, rate: this.rate, fade: 0.05 })
    }
    return out
  }

  /** Page hidden or pause button: stop where we are and remember what we were doing. */
  pause(): Command[] {
    if (this.mode === 'idle' || this.mode === 'done' || this.mode === 'paused') return []
    this.resumeMode = this.mode === 'hint' || this.mode === 'rewind' ? 'play' : this.mode
    if (this.mode === 'hint') this.pos = this.rewindTo
    this.mode = 'paused'
    return [{ type: 'stop' }]
  }

  resume(now: number): Command[] {
    if (this.mode !== 'paused') return []
    this.mode = this.resumeMode
    if (this.mode === 'hold') {
      this.holdAt = now
      return []
    }
    if (this.mode === 'stuck') return []
    this.mode = 'play'
    this.stopSent = false
    if (this.chorus >= 0) this.energy = 1
    this.rate = this.level.speed
    return [{ type: 'play', from: this.pos, rate: this.rate, fade: 0.2 }]
  }
}
