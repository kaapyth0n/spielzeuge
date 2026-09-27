import { FEATURE_SIZE, VOWELS, isVowel, type Vowel } from './morozhenka-dsp.ts'
import { HANDMADE_COUNT } from './morozhenka-levels.ts'

export const MOROZHENKA_KEY = 'spielzeuge.morozhenka.v1'

export const DIRECTIONS = ['up', 'right', 'left', 'down'] as const
export type Direction = (typeof DIRECTIONS)[number]

export const DIRECTION_VECTOR: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
}

/** Matryona’s letters: «А» up, «И» right, «О» left — and «У» for down. */
export const DEFAULT_LETTERS: Record<Direction, Vowel> = {
  up: 'a',
  right: 'i',
  left: 'o',
  down: 'u',
}

export const FLAVORS = ['mint', 'strawberry', 'chocolate', 'vanilla', 'blueberry', 'pistachio', 'mango'] as const
export type Flavor = (typeof FLAVORS)[number]

export type Control = 'voice' | 'buttons'

export interface RoundResult {
  cherries: number
  flavor: Flavor
}

export interface MorozhenkaSave {
  sound: boolean
  control: Control
  flavor: Flavor
  /** Highest hand-made round the child may open; HANDMADE_COUNT + 1 when all are done. */
  unlocked: number
  /** The next surprise map (numbered after the hand-made rounds). */
  surpriseNext: number
  /** Best result per finished round. */
  rounds: Record<number, RoundResult>
  letters: Record<Direction, Vowel>
  /** Fingerprints learned from the child’s own voice. */
  voice: Partial<Record<Vowel, number[]>>
  /** 1 quiet room … 3 noisy room. */
  sensitivity: 1 | 2 | 3
}

export const MAX_ROUND = 9999
/** Surprise maps open once the four letters have been met (rounds 1–3). */
export const SURPRISE_AFTER = 3

export function freshSave(): MorozhenkaSave {
  return {
    sound: true,
    control: 'voice',
    flavor: 'mint',
    unlocked: 1,
    surpriseNext: HANDMADE_COUNT + 1,
    rounds: {},
    letters: { ...DEFAULT_LETTERS },
    voice: {},
    sensitivity: 2,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFlavor(value: unknown): value is Flavor {
  return typeof value === 'string' && (FLAVORS as readonly string[]).includes(value)
}

export function restoreSave(raw: string | null): MorozhenkaSave {
  const save = freshSave()
  if (!raw) return save
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return save
  }
  if (!isRecord(data)) return save
  if (typeof data.sound === 'boolean') save.sound = data.sound
  if (data.control === 'voice' || data.control === 'buttons') save.control = data.control
  if (isFlavor(data.flavor)) save.flavor = data.flavor
  if (data.sensitivity === 1 || data.sensitivity === 2 || data.sensitivity === 3) save.sensitivity = data.sensitivity
  const unlocked = Number(data.unlocked)
  if (Number.isFinite(unlocked)) save.unlocked = Math.max(1, Math.min(HANDMADE_COUNT + 1, Math.floor(unlocked)))
  const surpriseNext = Number(data.surpriseNext)
  if (Number.isFinite(surpriseNext))
    save.surpriseNext = Math.max(HANDMADE_COUNT + 1, Math.min(MAX_ROUND, Math.floor(surpriseNext)))
  if (isRecord(data.rounds)) {
    for (const [key, value] of Object.entries(data.rounds)) {
      const round = Number(key)
      if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND || !isRecord(value)) continue
      const cherries = Math.max(0, Math.min(3, Math.floor(Number(value.cherries) || 0)))
      save.rounds[round] = { cherries, flavor: isFlavor(value.flavor) ? value.flavor : 'mint' }
      Object.assign(save, progressAfter(save, round))
    }
  }
  if (isRecord(data.letters)) {
    const letters = { ...DEFAULT_LETTERS }
    let valid = true
    for (const direction of ['up', 'right', 'left', 'down'] as const) {
      const vowel = data.letters[direction]
      if (isVowel(vowel)) letters[direction] = vowel
      else valid = false
    }
    if (valid && new Set(Object.values(letters)).size === 4) save.letters = letters
  }
  if (isRecord(data.voice)) {
    for (const vowel of VOWELS) {
      const features = data.voice[vowel]
      if (
        Array.isArray(features) &&
        features.length === FEATURE_SIZE &&
        features.every((value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 100)
      )
        save.voice[vowel] = features.map((value) => Math.round(value * 1000) / 1000)
    }
  }
  return save
}

function progressAfter(save: MorozhenkaSave, round: number): Pick<MorozhenkaSave, 'unlocked' | 'surpriseNext'> {
  return round <= HANDMADE_COUNT
    ? { unlocked: Math.max(save.unlocked, round + 1), surpriseNext: save.surpriseNext }
    : { unlocked: save.unlocked, surpriseNext: Math.max(save.surpriseNext, Math.min(MAX_ROUND, round + 1)) }
}

export function isOpen(save: MorozhenkaSave, round: number): boolean {
  if (round <= HANDMADE_COUNT) return round >= 1 && round <= save.unlocked
  return surprisesOpen(save) && round <= save.surpriseNext
}

export function surprisesOpen(save: MorozhenkaSave): boolean {
  return save.unlocked > SURPRISE_AFTER
}

/** What “Play” starts: the next new hand-made round, then the next surprise. */
export function continueRound(save: MorozhenkaSave): number {
  return save.unlocked <= HANDMADE_COUNT ? save.unlocked : save.surpriseNext
}

export function finishRound(save: MorozhenkaSave, round: number, cherries: number): MorozhenkaSave {
  const previous = save.rounds[round]
  const best = Math.max(previous?.cherries ?? 0, Math.max(0, Math.min(3, cherries)))
  return {
    ...save,
    rounds: {
      ...save.rounds,
      // Keep the flavor that first earned the most cherries.
      [round]: { cherries: best, flavor: previous && previous.cherries >= cherries ? previous.flavor : save.flavor },
    },
    ...progressAfter(save, round),
  }
}

/** Assign a vowel to a direction; the direction that had it takes the old letter. */
export function setLetter(save: MorozhenkaSave, direction: Direction, vowel: Vowel): MorozhenkaSave {
  const letters = { ...save.letters }
  const other = DIRECTIONS.find((d) => d !== direction && letters[d] === vowel)
  if (other) letters[other] = letters[direction]
  letters[direction] = vowel
  return { ...save, letters }
}

export function nextVowel(save: MorozhenkaSave, direction: Direction): Vowel {
  const index = VOWELS.indexOf(save.letters[direction])
  return VOWELS[(index + 1) % VOWELS.length]
}

export function totalCherries(save: MorozhenkaSave): number {
  return Object.values(save.rounds).reduce((sum, result) => sum + result.cherries, 0)
}
