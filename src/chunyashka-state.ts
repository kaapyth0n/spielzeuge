export const HAIR_IDS = ['short', 'pigtails', 'bun', 'long'] as const
export const DRESS_IDS = ['onesie', 'berry', 'sky', 'sun', 'meadow'] as const
export const SHOE_IDS = ['none', 'boots', 'sneakers', 'ballet'] as const

export type HairId = (typeof HAIR_IDS)[number]
export type DressId = (typeof DRESS_IDS)[number]
export type ShoeId = (typeof SHOE_IDS)[number]
export type Slot = 'hair' | 'dress' | 'shoes'

export type Outfit = {
  hair: HairId
  dress: DressId
  shoes: ShoeId
}

/** Always on. Never removable. Full-body onesie under every dress. */
export const BASE_LAYER = 'onesie' as const

export const DEFAULT_OUTFIT: Outfit = {
  hair: 'short',
  dress: 'onesie',
  shoes: 'none',
}

/** Likes stay on the toy. Never uploaded. */
export const LIKES_ARE_LOCAL = true

/** Celebration target. Not a score you can fail. */
export const LIKE_TARGET = 100

export function isHair(value: string): value is HairId {
  return (HAIR_IDS as readonly string[]).includes(value)
}

export function isDress(value: string): value is DressId {
  return (DRESS_IDS as readonly string[]).includes(value)
}

export function isShoe(value: string): value is ShoeId {
  return (SHOE_IDS as readonly string[]).includes(value)
}

export function withItem(outfit: Outfit, slot: Slot, id: string): Outfit {
  if (slot === 'hair' && isHair(id)) return { ...outfit, hair: id }
  if (slot === 'dress' && isDress(id)) return { ...outfit, dress: id }
  if (slot === 'shoes' && isShoe(id)) return { ...outfit, shoes: id }
  return outfit
}

export function likeTarget(): number {
  return LIKE_TARGET
}
