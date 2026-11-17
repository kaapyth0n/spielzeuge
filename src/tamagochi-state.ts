/**
 * Тамагочи Связь — saved progress and the rules that do not need a screen.
 */
import { HAIRS, HAIR_COLORS, SPECIES, type Look, type SpeciesId } from './tamagochi-kit.ts'
import { defaultLook } from './tamagochi-pets.ts'

export const STORE_KEY = 'spielzeuge.tamagochi.v1'
export const SOUND_KEY = 'spielzeuge.tamagochi.sound'

export type Want = 'food' | 'poop' | 'play' | 'sleep'
export const WANTS: Want[] = ['food', 'poop', 'play', 'sleep']
export const ACTIVITIES = ['dance', 'song', 'rings', 'hair', 'gifts', 'bows'] as const
export type ActivityId = (typeof ACTIVITIES)[number]

/** The five lights Matryona drew along the bottom of each tamagotchi. */
export const DOTS = 5
/** Lights left after hatching and after a visit: three wishes until the next one. */
export const DOTS_AFTER_VISIT = 2
export const MAX_DEVICES = 4
/** Activities per visit before the pets get hungry and go home. */
export const VISIT_ACTIVITIES = 2

/** Friendship hearts needed before a pet's egg appears. */
export const UNLOCK_AT: Record<SpeciesId, number> = {
  chick: 0,
  kitten: 0,
  monkey: 0,
  banana: 0,
  mini: 3,
  bunny: 7,
  penguin: 12,
  puppy: 18,
}

export interface Device {
  species: SpeciesId
  hatched: boolean
  dots: number
}

export const ISLANDS = ['meadow', 'beacon', 'stars'] as const
export type Island = (typeof ISLANDS)[number]
export type Passenger = Pick<Device, 'species' | 'hatched'>
export interface Postcard {
  crew: Passenger[]
}

export interface Save {
  v: 1
  devices: Device[]
  looks: Partial<Record<SpeciesId, Look>>
  hearts: number
  owned: string[]
  played: Partial<Record<ActivityId, number>>
  postcards: Partial<Record<Island, Postcard>>
  orchestra: number[]
  windowView: Island | null
  /** How often each hint was already shown. */
  hints: Record<string, number>
}

export function freshSave(): Save {
  return {
    v: 1,
    // The drawing: a chick in the green tamagotchi, a kitten in the red one.
    devices: [
      { species: 'chick', hatched: false, dots: DOTS_AFTER_VISIT },
      { species: 'kitten', hatched: false, dots: DOTS_AFTER_VISIT },
    ],
    looks: {},
    hearts: 0,
    owned: [],
    played: {},
    postcards: {},
    windowView: null,
    orchestra: [],
    hints: {},
  }
}

const isSpecies = (v: unknown): v is SpeciesId => (SPECIES as readonly unknown[]).includes(v)
const int = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback

function parseLook(species: SpeciesId, raw: unknown): Look {
  const base = defaultLook(species)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const str = (v: unknown): string | null => (typeof v === 'string' && /^[gw]:[a-z]+(:\d)?$/.test(v) ? v : null)
  return {
    hair: (HAIRS as readonly unknown[]).includes(r.hair) ? (r.hair as Look['hair']) : base.hair,
    hairColor: int(r.hairColor, 0, HAIR_COLORS.length - 1, base.hairColor),
    head: str(r.head),
    face: str(r.face),
    neck: str(r.neck),
  }
}

/** Accept anything that came out of storage; broken parts fall back to a fresh game. */
export function parseSave(raw: unknown): Save {
  const save = freshSave()
  if (!raw || typeof raw !== 'object') return save
  const r = raw as Record<string, unknown>
  if (Array.isArray(r.devices)) {
    const seen = new Set<SpeciesId>()
    const devices: Device[] = []
    for (const d of r.devices) {
      if (devices.length >= MAX_DEVICES) break
      const species = (d as Device | null)?.species
      if (!isSpecies(species) || seen.has(species)) continue
      seen.add(species)
      devices.push({ species, hatched: (d as Device).hatched === true, dots: int((d as Device).dots, 0, DOTS, DOTS_AFTER_VISIT) })
    }
    if (devices.length >= 2) save.devices = devices
  }
  save.hearts = int(r.hearts, 0, 99999, 0)
  if (Array.isArray(r.owned)) save.owned = [...new Set(r.owned.filter((v): v is string => typeof v === 'string' && /^[gw]:[a-z]+(:\d)?$/.test(v)))].slice(0, 200)
  if (r.looks && typeof r.looks === 'object')
    for (const s of SPECIES) {
      const look = (r.looks as Record<string, unknown>)[s]
      if (look) save.looks[s] = parseLook(s, look)
    }
  if (r.postcards && typeof r.postcards === 'object') {
    for (const island of ISLANDS) {
      const card = (r.postcards as Record<string, Partial<Postcard> | null>)[island]
      if (!Array.isArray(card?.crew)) continue
      const crew: Passenger[] = []
      for (const p of card.crew) {
        if (p && isSpecies(p.species) && !crew.some((c) => c.species === p.species))
          crew.push({ species: p.species, hatched: p.hatched === true })
        if (crew.length === MAX_DEVICES) break
      }
      if (crew.length) save.postcards[island] = { crew }
    }
  }
  if (Array.isArray(r.orchestra)) save.orchestra = r.orchestra.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 4).slice(-8)
  const view = ISLANDS.find((id) => id === r.windowView)
  if (view && save.postcards[view]) save.windowView = view
  for (const key of ['played', 'hints'] as const) {
    const src = r[key]
    if (src && typeof src === 'object')
      for (const [k, v] of Object.entries(src as Record<string, unknown>))
        if (/^[a-z]+$/i.test(k)) (save[key] as Record<string, number>)[k] = int(v, 0, 99999, 0)
  }
  return save
}

export function loadSave(): Save {
  try {
    return parseSave(JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null'))
  } catch {
    return freshSave()
  }
}

export function storeSave(save: Save): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(save))
  } catch {
    // Private mode or a full disk: the game simply forgets on reload.
  }
}

export function lookOf(save: Save, species: SpeciesId): Look {
  return (save.looks[species] ??= defaultLook(species))
}

export const isUnlocked = (save: Save, species: SpeciesId): boolean => save.hearts >= UNLOCK_AT[species]

/** The next egg to earn, or null when all pets are found. */
export function nextUnlock(save: Save): { species: SpeciesId; need: number; from: number } | null {
  const locked = SPECIES.filter((s) => !isUnlocked(save, s)).sort((a, b) => UNLOCK_AT[a] - UNLOCK_AT[b])
  if (!locked.length) return null
  const species = locked[0]
  const from = Math.max(0, ...SPECIES.filter((s) => isUnlocked(save, s)).map((s) => UNLOCK_AT[s]))
  return { species, need: UNLOCK_AT[species], from }
}

/** Add one friendship heart; returns the pet whose egg this heart unlocked, if any. */
export function addHeart(save: Save): SpeciesId | null {
  const before = SPECIES.filter((s) => isUnlocked(save, s))
  save.hearts++
  return SPECIES.find((s) => isUnlocked(save, s) && !before.includes(s)) ?? null
}

/** Pets that may move into slot `slot`: unlocked and not living in another tamagotchi. */
export function choosable(save: Save, slot: number): SpeciesId[] {
  return SPECIES.filter((s) => isUnlocked(save, s) && !save.devices.some((d, i) => i !== slot && d.species === s))
}

/**
 * The next wish. Never the same twice in a row, sleep at most once between
 * visits, and the very first wishes come in the order Matryona told them.
 */
export function pickWant(prev: Want | null, slept: boolean, done: number, rnd: () => number): Want {
  if (done < 3 && prev === null) return (['food', 'poop', 'play'] as Want[])[done]
  const pool = WANTS.filter((w) => w !== prev && !(w === 'sleep' && slept))
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]
}

/** How many gestures a wish takes. */
export const WANT_COUNT: Record<Want, number> = { food: 2, poop: 1, play: 2, sleep: 1 }

/** Keep the passengers from the first delivery. Only a first delivery earns a heart. */
export function deliverPostcard(save: Save, island: Island, crew: Passenger[]) {
  if (save.postcards[island]) return { first: false, egg: null }
  save.postcards[island] = { crew: crew.map(({ species, hatched }) => ({ species, hatched })) }
  return { first: true, egg: addHeart(save) }
}
