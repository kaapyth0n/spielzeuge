import { FOOD, FOODS, MEALS, type Food } from './devochka-copy.ts'

export const SAVE_KEY = 'spielzeuge.devochka.v1'
export const SOUND_KEY = 'spielzeuge.devochka.muted'
export const CAPACITY = 6
export const WAGES = { orchard: 5, jars: 7 } as const
export type Job = keyof typeof WAGES
export type Pet = 'none' | 'cat' | 'dog'
export interface Notebook {
  coins: number
  day: number
  cart: Food[]
  table: Food[]
  matched: boolean
  chipsOpen: boolean
  result: number | 'free' | null
  friend: boolean
  eyes: number
  mouth: number
  colour: number
  pet: Pet
  wall: number | null
}
export function fresh(): Notebook {
  return {
    coins: 12,
    day: 0,
    cart: [],
    table: [],
    matched: false,
    chipsOpen: false,
    result: null,
    friend: false,
    eyes: 0,
    mouth: 0,
    colour: 0,
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
    s.cart = Array.isArray(v.cart) ? v.cart.filter(isFood).slice(0, CAPACITY) : []
    s.table = Array.isArray(v.table) ? v.table.filter(isFood).slice(0, CAPACITY) : []
    s.chipsOpen = v.chipsOpen === true && s.table.includes('chips')
    s.matched = v.matched === true && s.table.length > 0
    if (!s.table.length) {
      if (v.result === 'free') s.result = 'free'
      else if (inRange(v.result, Math.min(s.day, MEALS.length) - 1, -1) >= 0) s.result = v.result
    }
    s.friend = v.friend === true
    s.eyes = inRange(v.eyes, 2)
    s.mouth = inRange(v.mouth, 2)
    s.colour = inRange(v.colour, 2)
    if (v.pet === 'cat' || v.pet === 'dog') s.pet = v.pet
    if (inRange(v.wall, Math.min(s.day, MEALS.length) - 1, -1) >= 0) s.wall = v.wall
  } catch {
    /* A fresh notebook also works with unavailable or damaged storage. */
  }
  return s
}
export const menu = (s: Notebook) => MEALS[s.day % MEALS.length]
export const count = (items: readonly Food[], food: Food) => items.filter((item) => item === food).length
export const price = (items: readonly Food[]) => items.reduce((n, item) => n + FOOD[item].price, 0)
export const matches = (items: readonly Food[], list: readonly Food[]) =>
  FOODS.every((food) => count(items, food) >= count(list, food))

export function checkout(s: Notebook, tender: number): boolean {
  const bill = price(s.cart)
  if (!bill || tender !== bill || s.coins < bill || s.table.length) return false
  s.coins -= bill
  s.matched = matches(s.cart, menu(s).list)
  s.table = s.cart
  s.cart = []
  s.chipsOpen = false
  s.result = null
  return true
}
export function serve(s: Notebook, food: Food): boolean {
  const index = s.table.indexOf(food)
  if (index === -1 || (food === 'chips' && !s.chipsOpen)) return false
  s.table.splice(index, 1)
  if (food === 'chips') s.chipsOpen = false
  if (s.table.length === 0) {
    s.result = s.matched ? s.day % MEALS.length : 'free'
    if (s.matched) {
      s.wall ??= s.result as number
      s.day++
    }
    s.matched = false
  }
  return true
}
