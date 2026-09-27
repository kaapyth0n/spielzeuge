import { ANIMALS, MONSTER_TRAITS, type Animal, type MonsterTrait } from './bolnica-animals.ts'
import { DEFAULT_LOOK, FURS, TINTS, WEARS, type CatLook, type Fur, type Tint, type Wear } from './bolnica-cat.ts'
import { LEVEL_COUNT } from './bolnica-words.ts'

export const BOLNICA_KEY = 'spielzeuge.bolnica.v1'
export const WARD_COUNT = 4
export const MAX_PLAYERS = 12
export const MAX_STRIKES = 3
export const NAME_MAX = 16
/** How long a patient stays in intensive care before coming back to the ward. */
export const REANIMATION_MS = 30_000

export type Checker = 'voice' | 'grownup'

export interface WardPatient {
  /** 1..20: the patient number in the round is also the level. */
  level: number
  animal: Animal
  /** Picks the letters, syllables or words for this patient. */
  seed: number
  /** Index of the card the child reads next. */
  step: number
  /** Lost hearts: three send the patient to intensive care. */
  strikes: number
  /** Misses on the current card; the forgiving cat ignores the first one. */
  misses: number
  /** 0 = in bed; otherwise Date.now() ms when the patient comes back from intensive care. */
  away: number
  visits: number
}

export interface Arrival {
  kind: 'patient' | 'monster'
  /** The real animal, or the one the monster pretends to be. */
  animal: Animal
  traits: MonsterTrait[]
  /** Easy levels: the photo shows the whole monster holding a mask. */
  obvious: boolean
  variant: number
  photo: boolean
}

export interface Hospital {
  round: number
  /** Level of the next real patient to arrive; LEVEL_COUNT + 1 when everybody came. */
  next: number
  healed: number[]
  wards: (WardPatient | null)[]
  desk: Arrival | null
  /** Monsters still to knock before the next real patient. */
  monstersBefore: number
  /** Ward number (1..4) whose arrow keeps pointing until the child goes there. */
  arrow: number | null
  order: Animal[]
  caught: number
}

export interface Player {
  id: string
  name: string
  named: boolean
  look: CatLook
  score: number
  healed: number
  rounds: number
  caught: number
  hospital: Hospital
  updated: number
}

export interface BolnicaSave {
  sound: boolean
  checker: Checker
  forgiving: boolean
  current: string
  players: Player[]
}

/* ─────────────────────────── seeded helpers ─────────────────────────── */

export function hash(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const part of parts) {
    const text = String(part)
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 0x9e37
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function random(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Round 1 follows Veronika’s giraffe first; later rounds shuffle the animals. */
export function animalOrder(round: number, salt: string): Animal[] {
  const order = [...ANIMALS]
  if (round <= 1) return order
  const next = random(hash('order', salt, round))
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** How many disguised monsters knock before patient `level`. */
export function monstersBefore(round: number, level: number, salt: string): number {
  if (level <= 1) return 0
  if (level === 2) return round === 1 ? 1 : 0
  const roll = random(hash('monsters', salt, round, level))()
  const busy = level >= 12 ? 0.18 : 0.08
  if (roll < 0.42 - busy) return 0
  if (roll < 0.9 - busy) return 1
  return 2
}

/** Easy levels show the whole monster; later only one or two sneaky details. */
export function monsterDisguise(
  round: number,
  level: number,
  count: number,
  salt: string,
  pool: readonly Animal[] = ANIMALS,
): Pick<Arrival, 'animal' | 'traits' | 'obvious' | 'variant'> {
  const next = random(hash('disguise', salt, round, level, count))
  const choices = pool.length ? pool : ANIMALS
  const animal = choices[Math.floor(next() * choices.length)]
  const variant = Math.floor(next() * 3)
  const obvious = level <= 6
  // Frog and crocodile are green already: a green monster would hardly differ.
  const traitPool = MONSTER_TRAITS.filter((t) => t !== 'green' || (animal !== 'frog' && animal !== 'crocodile'))
  const traits: MonsterTrait[] = []
  const wanted = obvious ? 0 : level <= 13 ? 2 : 1
  while (traits.length < wanted) {
    const index = Math.floor(next() * traitPool.length)
    traits.push(traitPool.splice(index, 1)[0])
  }
  return { animal, traits, obvious, variant }
}

export function itemSeed(round: number, level: number, salt: string): number {
  return hash('items', salt, round, level) % 1_000_000
}

/* ─────────────────────────── fresh values ─────────────────────────── */

export function freshHospital(round: number, salt: string): Hospital {
  return {
    round,
    next: 1,
    healed: [],
    wards: Array.from({ length: WARD_COUNT }, () => null),
    desk: null,
    monstersBefore: monstersBefore(round, 1, salt),
    arrow: null,
    order: animalOrder(round, salt),
    caught: 0,
  }
}

export function newPlayerId(now: number, taken: readonly string[] = []): string {
  let id = `c${now.toString(36)}`
  let n = 1
  while (taken.includes(id)) id = `c${now.toString(36)}${n++}`
  return id
}

export function newPlayer(id: string, now: number, look: CatLook = DEFAULT_LOOK): Player {
  return {
    id,
    name: '',
    named: false,
    look: { fur: look.fur, tint: look.tint, wear: [...look.wear] },
    score: 0,
    healed: 0,
    rounds: 0,
    caught: 0,
    hospital: freshHospital(1, id),
    updated: now,
  }
}

export function freshSave(now = 0): BolnicaSave {
  const player = newPlayer('c0', now)
  return { sound: true, checker: 'voice', forgiving: true, current: player.id, players: [player] }
}

/* ─────────────────────────── sanitising ─────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function int(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
}

function oneOf<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : fallback
}

export function cleanName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u001f\u007f<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
}

function cleanLook(value: unknown): CatLook {
  if (!isRecord(value)) return { ...DEFAULT_LOOK, wear: [...DEFAULT_LOOK.wear] }
  const wear = Array.isArray(value.wear) ? WEARS.filter((w) => (value.wear as unknown[]).includes(w)) : [...DEFAULT_LOOK.wear]
  return { fur: oneOf<Fur>(FURS, value.fur, DEFAULT_LOOK.fur), tint: oneOf<Tint>(TINTS, value.tint, DEFAULT_LOOK.tint), wear }
}

function cleanWard(value: unknown): WardPatient | null {
  if (!isRecord(value)) return null
  const level = int(value.level, 1, LEVEL_COUNT, 0)
  if (!level || !(ANIMALS as readonly string[]).includes(value.animal as string)) return null
  return {
    level,
    animal: value.animal as Animal,
    seed: int(value.seed, 0, 1_000_000, 0),
    step: int(value.step, 0, 50, 0),
    strikes: int(value.strikes, 0, MAX_STRIKES - 1, 0),
    misses: int(value.misses, 0, 9, 0),
    away: int(value.away, 0, Number.MAX_SAFE_INTEGER, 0),
    visits: int(value.visits, 0, 999, 0),
  }
}

function cleanArrival(value: unknown): Arrival | null {
  if (!isRecord(value)) return null
  if (value.kind !== 'patient' && value.kind !== 'monster') return null
  if (!(ANIMALS as readonly string[]).includes(value.animal as string)) return null
  const traits = Array.isArray(value.traits) ? MONSTER_TRAITS.filter((t) => (value.traits as unknown[]).includes(t)) : []
  return {
    kind: value.kind,
    animal: value.animal as Animal,
    traits: value.kind === 'monster' ? traits : [],
    obvious: value.kind === 'monster' && (value.obvious === true || traits.length === 0),
    variant: int(value.variant, 0, 2, 0),
    photo: value.photo === true,
  }
}

function cleanHospital(value: unknown, salt: string): Hospital {
  if (!isRecord(value)) return freshHospital(1, salt)
  const round = int(value.round, 1, 9999, 1)
  const fresh = freshHospital(round, salt)
  const wards = Array.from({ length: WARD_COUNT }, (_, i) => (Array.isArray(value.wards) ? cleanWard(value.wards[i]) : null))
  const healed = Array.isArray(value.healed)
    ? [...new Set(value.healed.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= LEVEL_COUNT))]
    : []
  const order =
    Array.isArray(value.order) && value.order.length === ANIMALS.length && new Set(value.order).size === ANIMALS.length && value.order.every((a) => (ANIMALS as readonly string[]).includes(a as string))
      ? (value.order as Animal[])
      : fresh.order
  const arrow = int(value.arrow, 1, WARD_COUNT, 0)
  return {
    round,
    next: int(value.next, 1, LEVEL_COUNT + 1, 1),
    healed,
    wards,
    desk: cleanArrival(value.desk),
    monstersBefore: int(value.monstersBefore, 0, 3, 0),
    arrow: arrow && wards[arrow - 1] ? arrow : null,
    order,
    caught: int(value.caught, 0, 99999, 0),
  }
}

function cleanPlayer(value: unknown, index: number): Player | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' && /^[a-z0-9]{1,24}$/.test(value.id) ? value.id : `c${index}x`
  const name = cleanName(value.name)
  return {
    id,
    name,
    named: value.named === true || name.length > 0,
    look: cleanLook(value.look),
    score: int(value.score, 0, 999999, 0),
    healed: int(value.healed, 0, 999999, 0),
    rounds: int(value.rounds, 0, 9999, 0),
    caught: int(value.caught, 0, 999999, 0),
    hospital: cleanHospital(value.hospital, id),
    updated: int(value.updated, 0, Number.MAX_SAFE_INTEGER, 0),
  }
}

export function restoreSave(raw: string | null): BolnicaSave {
  const save = freshSave()
  if (!raw) return save
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return save
  }
  if (!isRecord(data)) return save
  const players: Player[] = []
  if (Array.isArray(data.players))
    data.players.slice(0, MAX_PLAYERS).forEach((p, i) => {
      const player = cleanPlayer(p, i)
      if (player && !players.some((q) => q.id === player.id)) players.push(player)
    })
  if (!players.length) players.push(save.players[0])
  const current = typeof data.current === 'string' && players.some((p) => p.id === data.current) ? data.current : players[0].id
  return {
    sound: data.sound !== false,
    checker: data.checker === 'grownup' ? 'grownup' : 'voice',
    forgiving: data.forgiving !== false,
    current,
    players,
  }
}

/* ─────────────────────────── queries ─────────────────────────── */

export function currentPlayer(save: BolnicaSave): Player {
  return save.players.find((p) => p.id === save.current) ?? save.players[0]
}

export function ranking(players: readonly Player[]): Player[] {
  return [...players].sort((a, b) => b.score - a.score || b.healed - a.healed || b.rounds - a.rounds || a.updated - b.updated)
}

export function freeWard(h: Hospital): number | null {
  const index = h.wards.findIndex((w) => w === null)
  return index < 0 ? null : index + 1
}

export function roundDone(h: Hospital): boolean {
  return h.healed.length >= LEVEL_COUNT
}

export function everybodyCame(h: Hospital): boolean {
  return h.next > LEVEL_COUNT
}

/** What the reception window shows when nobody stands at it. */
export function deskState(h: Hospital): 'open' | 'full' | 'done' {
  if (everybodyCame(h)) return 'done'
  return freeWard(h) === null ? 'full' : 'open'
}

/* ─────────────────────────── reception ─────────────────────────── */

export function addScore(player: Player, delta: number): number {
  const before = player.score
  player.score = Math.max(0, player.score + delta)
  return player.score - before
}

/** A knock at the window: the next monster or the next real patient. */
export function summon(player: Player): Arrival | null {
  const h = player.hospital
  if (h.desk || deskState(h) !== 'open') return h.desk
  if (h.monstersBefore > 0) {
    // Monsters pretend to be animals still to come, never ones already treated.
    h.desk = { kind: 'monster', photo: false, ...monsterDisguise(h.round, h.next, h.monstersBefore, player.id, h.order.slice(h.next - 1)) }
  } else {
    h.desk = { kind: 'patient', animal: h.order[(h.next - 1) % h.order.length], traits: [], obvious: false, variant: 0, photo: false }
  }
  return h.desk
}

export function takePhoto(player: Player): boolean {
  const desk = player.hospital.desk
  if (!desk || desk.photo) return false
  desk.photo = true
  return true
}

function nextArrivalAfterMonster(h: Hospital): void {
  h.desk = null
  h.monstersBefore = Math.max(0, h.monstersBefore - 1)
}

export type TicketResult = { kind: 'admitted'; ward: number } | { kind: 'monster-sneaked' } | { kind: 'none' }

/** The child hands over a ticket. A monster takes it and runs; a patient goes to the ward. */
export function giveTicket(player: Player): TicketResult {
  const h = player.hospital
  const desk = h.desk
  if (!desk || !desk.photo) return { kind: 'none' }
  if (desk.kind === 'monster') {
    nextArrivalAfterMonster(h)
    addScore(player, -1)
    return { kind: 'monster-sneaked' }
  }
  const ward = freeWard(h)
  if (ward === null) return { kind: 'none' }
  h.wards[ward - 1] = {
    level: h.next,
    animal: desk.animal,
    seed: itemSeed(h.round, h.next, player.id),
    step: 0,
    strikes: 0,
    misses: 0,
    away: 0,
    visits: 0,
  }
  h.desk = null
  h.arrow = ward
  h.next += 1
  h.monstersBefore = everybodyCame(h) ? 0 : monstersBefore(h.round, h.next, player.id)
  return { kind: 'admitted', ward }
}

export type ShutterResult = 'caught' | 'wrong-patient' | 'none'

export function closeShutter(player: Player): ShutterResult {
  const h = player.hospital
  const desk = h.desk
  if (!desk || !desk.photo) return 'none'
  if (desk.kind === 'monster') {
    nextArrivalAfterMonster(h)
    h.caught += 1
    player.caught += 1
    addScore(player, 1)
    return 'caught'
  }
  // A real patient stays: the photo has to be taken again after reopening.
  desk.photo = false
  addScore(player, -1)
  return 'wrong-patient'
}

/* ─────────────────────────── wards ─────────────────────────── */

export type AnswerResult =
  | { kind: 'next'; step: number }
  | { kind: 'healed'; level: number; roundDone: boolean }
  | { kind: 'retry' }
  | { kind: 'wrong'; strikes: number }
  | { kind: 'reanimation' }
  | { kind: 'none' }

/**
 * One reading attempt. `forgiving` lets the first miss on each card go without a
 * penalty: children are learning and speech recognisers mishear.
 */
export function answer(
  player: Player,
  ward: number,
  correct: boolean,
  cards: number,
  options: { forgiving: boolean; now: number; reanimationMs?: number },
): AnswerResult {
  const h = player.hospital
  const patient = h.wards[ward - 1]
  if (!patient || patient.away) return { kind: 'none' }
  if (correct) {
    addScore(player, 1)
    patient.step += 1
    patient.misses = 0
    if (patient.step < cards) return { kind: 'next', step: patient.step }
    h.wards[ward - 1] = null
    if (!h.healed.includes(patient.level)) h.healed.push(patient.level)
    if (h.arrow === ward) h.arrow = null
    player.healed += 1
    return { kind: 'healed', level: patient.level, roundDone: roundDone(h) }
  }
  patient.misses += 1
  if (options.forgiving && patient.misses === 1) return { kind: 'retry' }
  addScore(player, -1)
  patient.strikes += 1
  if (patient.strikes < MAX_STRIKES) return { kind: 'wrong', strikes: patient.strikes }
  patient.strikes = 0
  patient.misses = 0
  patient.step = 0
  patient.visits += 1
  patient.away = options.now + (options.reanimationMs ?? REANIMATION_MS)
  return { kind: 'reanimation' }
}

/** Patients whose intensive care is over come back to their beds. */
export function returnPatients(player: Player, now: number): number[] {
  const back: number[] = []
  player.hospital.wards.forEach((patient, index) => {
    if (patient && patient.away && patient.away <= now) {
      patient.away = 0
      back.push(index + 1)
    }
  })
  return back
}

/** After twenty healed patients the hospital starts again from level 1. */
export function startNextRound(player: Player): void {
  player.rounds += 1
  player.hospital = freshHospital(player.hospital.round + 1, player.id)
}

/* ─────────────────────────── wardrobe ─────────────────────────── */

export function toggleWear(look: CatLook, wear: Wear): CatLook {
  const on = look.wear.includes(wear)
  return { ...look, wear: on ? look.wear.filter((w) => w !== wear) : WEARS.filter((w) => w === wear || look.wear.includes(w)) }
}
