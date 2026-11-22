import type { Lang } from './languages.ts'

export const DINERS = ['girl', 'cat', 'friend', 'dog'] as const
export type Diner = (typeof DINERS)[number]
export const INVITATIONS: Record<Diner, number> = { girl: 0, cat: 1, friend: 2, dog: 3 }

export const FURNISHINGS = ['curtains', 'table', 'teapot', 'cloth'] as const
export type Furnishing = (typeof FURNISHINGS)[number]
export type RoomPaint = Record<Furnishing, number>
export const unpaintedRoom = (): RoomPaint => ({ curtains: 0, table: 0, teapot: 0, cloth: 0 })

export function isDiner(value: unknown): value is Diner {
  return DINERS.includes(value as Diner)
}

export function canDine(book: { day: number; knownGuests: Diner[] }, diner: Diner): boolean {
  return book.day >= INVITATIONS[diner] || book.knownGuests.includes(diner)
}

const names: Record<Diner, Record<Lang, string>> = {
  girl: { ru: 'Девочка Матрёны', de: 'Matrjonas Mädchen', en: 'Matryona’s girl' },
  cat: { ru: 'Рыжий кот', de: 'Roter Kater', en: 'Ginger cat' },
  friend: { ru: 'Подружка', de: 'Freundin', en: 'Little friend' },
  dog: { ru: 'Щенок', de: 'Welpe', en: 'Puppy' },
}
export const dinerName = (diner: Diner, lang: Lang) => names[diner][lang]
