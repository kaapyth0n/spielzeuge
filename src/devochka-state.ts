import {
  hasMeal,
  isBowl,
  pendingBowls,
  orderIndex,
  recipients,
  seats,
  type Portion,
  type Seat,
} from './devochka-dining.ts'
import {
  canDine,
  DINERS,
  FURNISHINGS,
  isDiner,
  unpaintedRoom,
  type Diner,
  type RoomPaint,
} from './devochka-guests.ts'
import { FOOD, FOODS, MEALS, type Food } from './devochka-copy.ts'

export const SAVE_KEY = 'spielzeuge.devochka.v1'
export const SOUND_KEY = 'spielzeuge.devochka.muted'
export const CAPACITY = 6
export const WAGES = { orchard: 5, jars: 7, bakery: 6, regatta: 8 } as const
export type Job = keyof typeof WAGES
export type Pet = 'none' | 'cat' | 'dog'
export interface Notebook {
  coins: number
  day: number
  revisit: number | null
  cart: Food[]
  table: Food[]
  seated: Diner | null
  seatedPet: Pet
  tasted: Seat[]
  matched: boolean
  chipsOpen: boolean
  result: number | 'free' | null
  diner: Diner
  knownGuests: Diner[]
  eyes: number
  mouth: number
  paint: RoomPaint
  pet: Pet
  wall: number | null
}
export function fresh(): Notebook {
  return {
    coins: 12,
    day: 0,
    revisit: null,
    cart: [],
    table: [],
    seated: null,
    seatedPet: 'none',
    tasted: [],
    matched: false,
    chipsOpen: false,
    result: null,
    diner: 'girl',
    knownGuests: [],
    eyes: 0,
    mouth: 0,
    paint: unpaintedRoom(),
    pet: 'none',
    wall: null,
  }
}
export function isFood(id: unknown): id is Food {
  return FOODS.includes(id as Food)
}
function inRange(n: unknown, max: number, fallback = 0): number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max ? n : fallback
}
export function readBook(raw: string | null): Notebook {
  const s = fresh()
  if (!raw) return s
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return s
    s.coins = inRange(v.coins, 9999, 12)
    s.day = inRange(v.day, Number.MAX_SAFE_INTEGER - 1)
    const revisit = inRange(v.revisit, Math.min(s.day, MEALS.length) - 1, -1)
    if (revisit >= 0) s.revisit = revisit
    s.cart = Array.isArray(v.cart) ? v.cart.filter(isFood).slice(0, CAPACITY) : []
    s.table = Array.isArray(v.table) ? v.table.filter(isFood).slice(0, CAPACITY) : []
    s.chipsOpen = v.chipsOpen === true && s.table.includes('chips')

    if (!s.table.length) {
      if (v.result === 'free') s.result = 'free'
      else if (inRange(v.result, Math.min(s.day, MEALS.length) - 1, -1) >= 0) s.result = v.result
    }
    const legacy = !isDiner(v.diner)
    // Keep characters that an older notebook had already made or invited.
    s.knownGuests = Array.isArray(v.knownGuests) ? DINERS.filter((id) => v.knownGuests.includes(id)) : []
    if (legacy && (v.friend === true || inRange(v.eyes, 2) > 0 || inRange(v.mouth, 2) > 0))
      s.knownGuests.push('friend')
    if (legacy && (v.pet === 'cat' || v.pet === 'dog')) s.knownGuests.push(v.pet)
    const diner = isDiner(v.diner) ? v.diner : v.friend === true ? 'friend' : 'girl'
    s.diner = canDine(s, diner) ? diner : 'girl'
    if ((v.pet === 'cat' || v.pet === 'dog') && v.pet !== s.diner && canDine(s, v.pet)) s.pet = v.pet
    s.seated = isDiner(v.seated) && canDine(s, v.seated) ? v.seated : s.table.length ? s.diner : null
    if (s.seated !== null) {
      const companion = v.seatedPet ?? s.pet
      if ((companion === 'cat' || companion === 'dog') && canDine(s, companion)) s.seatedPet = companion
    }
    s.tasted = Array.isArray(v.tasted) ? seats(s).filter((id) => v.tasted.includes(id)) : []
    if (!s.table.length && s.result === null && !pendingBowls(s).length) {
      s.seated = null
      s.seatedPet = 'none'
    }
    s.matched = v.matched === true && hasMeal(s)
    s.eyes = inRange(v.eyes, 2)
    s.mouth = inRange(v.mouth, 2)
    const legacyColour = inRange(v.colour, 2)
    for (const part of FURNISHINGS) {
      s.paint[part] = inRange(v.paint?.[part], 3, v.paint ? 0 : legacyColour)
    }
    if (inRange(v.wall, Math.min(s.day, MEALS.length) - 1, -1) >= 0) s.wall = v.wall
  } catch {
    /* A fresh notebook also works with unavailable or damaged storage. */
  }
  return s
}
export const menu = (s: Notebook) => MEALS[orderIndex(s)]
export const count = (items: readonly Food[], food: Food) => items.filter((item) => item === food).length
export const price = (items: readonly Food[]) => items.reduce((n, item) => n + FOOD[item].price, 0)
export const matches = (items: readonly Food[], list: readonly Food[]) =>
  FOODS.every((food) => count(items, food) >= count(list, food))

export function selectOrder(s: Notebook, revisit: number | null): boolean {
  if (hasMeal(s)) return false
  if (revisit !== null && inRange(revisit, Math.min(s.day, MEALS.length) - 1, -1) < 0) return false
  s.revisit = revisit
  s.result = null
  s.seated = null
  s.seatedPet = 'none'
  s.tasted = []
  return true
}

export function checkout(s: Notebook, tender: number): boolean {
  const bill = price(s.cart)
  if (!bill || tender !== bill || s.coins < bill || hasMeal(s)) return false
  s.coins -= bill
  s.matched = matches(s.cart, menu(s).list)
  s.seated = s.diner
  s.seatedPet = s.pet
  s.tasted = []
  s.table = s.cart
  s.cart = []
  s.chipsOpen = false
  s.result = null
  return true
}
export function serve(s: Notebook, portion: Portion, seat = recipients(s, portion)[0]): boolean {
  if (!hasMeal(s) || !recipients(s, portion).includes(seat)) return false
  if (!isBowl(portion)) {
    const i = s.table.indexOf(portion)
    if (i < 0 || (portion === 'chips' && !s.chipsOpen)) return false
    // A small free-choice meal can still be split between two hungry people.
    const share =
      s.table.length === 1 &&
      seats(s).some((other) => !isBowl(other) && other !== seat && !s.tasted.includes(other))
    if (!share) {
      s.table.splice(i, 1)
      if (portion === 'chips') s.chipsOpen = false
    }
  }
  if (!s.tasted.includes(seat)) s.tasted.push(seat)
  if (!s.table.length && !pendingBowls(s).length) {
    s.result = s.matched ? orderIndex(s) : 'free'
    if (typeof s.result === 'number' && s.revisit === null) {
      s.wall ??= s.result
      s.day++
    }
    s.matched = false
  }
  return true
}
