export const HAIR_IDS = ['short', 'pigtails', 'bun', 'long', 'bob', 'pony', 'curly', 'braid'] as const
export const COLOR_IDS = [
  'brown',
  'black',
  'blonde',
  'copper',
  'red',
  'honey',
  'white',
  'pink',
  'lilac',
  'blue',
] as const
export const EYE_IDS = ['round', 'sleepy', 'wide', 'lashes', 'spark', 'closed'] as const
export const BROW_IDS = ['soft', 'none', 'raised', 'thick', 'tiny', 'worry'] as const
export const SMILE_IDS = ['calm', 'smile', 'grin', 'oh', 'tiny', 'closed'] as const
export const CHEEK_IDS = ['pink', 'none', 'peach', 'round', 'dots', 'high'] as const

export const CLOTHES_KINDS = [
  'dress',
  'overalls',
  'coat',
  'sweater',
  'raincoat',
  'jumpsuit',
  'tunic',
  'sailor',
] as const
export const SHOE_KINDS = ['boots', 'sneakers', 'ballet', 'sandals', 'rain', 'slippers'] as const

export type HairId = (typeof HAIR_IDS)[number]
export type ColorId = (typeof COLOR_IDS)[number]
export type EyeId = (typeof EYE_IDS)[number]
export type BrowId = (typeof BROW_IDS)[number]
export type SmileId = (typeof SMILE_IDS)[number]
export type CheekId = (typeof CHEEK_IDS)[number]
export type ClothesKind = (typeof CLOTHES_KINDS)[number]
export type ShoeKind = (typeof SHOE_KINDS)[number]

export type Slot =
  | 'hair'
  | 'color'
  | 'eyes'
  | 'brows'
  | 'smile'
  | 'cheeks'
  | 'clothes'
  | 'shoes'

export type Group = 'hair' | 'face' | 'clothes' | 'shoes'

export const GROUP_SLOTS: Record<Group, Slot[]> = {
  hair: ['hair', 'color'],
  face: ['eyes', 'brows', 'smile', 'cheeks'],
  clothes: ['clothes'],
  shoes: ['shoes'],
}

const PALETTES: [string, string][] = [
  ['#c45a6a', '#f3e6c4'],
  ['#5a8ab4', '#f3e6c4'],
  ['#e0b04a', '#6a4220'],
  ['#5a9a6a', '#f3e6c4'],
  ['#7a5aa8', '#eadcf4'],
  ['#d4784a', '#f3e6c4'],
  ['#3d6a8a', '#d4eaf4'],
  ['#b05a7a', '#f3e6c4'],
]

export type ClothesItem = { id: string; kind: ClothesKind; fill: string; trim: string }
export type ShoeItem = { id: string; kind: ShoeKind; fill: string; trim: string }

export const CLOTHES: ClothesItem[] = CLOTHES_KINDS.flatMap((kind, ki) =>
  [0, 1, 2].map((pi) => {
    const palette = PALETTES[(ki + pi) % PALETTES.length]
    return { id: `${kind}-${pi}`, kind, fill: palette[0], trim: palette[1] }
  }),
)

export const SHOES: ShoeItem[] = SHOE_KINDS.flatMap((kind, ki) =>
  PALETTES.slice(0, 4).map((_, pi) => {
    const palette = PALETTES[(ki * 2 + pi) % PALETTES.length]
    return { id: `${kind}-${pi}`, kind, fill: palette[0], trim: palette[1] }
  }),
)

export const CLOTHES_IDS = CLOTHES.map((item) => item.id)
export const SHOE_IDS = ['none', ...SHOES.map((item) => item.id)] as const

export type ShoeId = (typeof SHOE_IDS)[number]
export type ClothesId = (typeof CLOTHES_IDS)[number]

export const HAIR_COLORS: Record<ColorId, { fill: string; lit: string }> = {
  brown: { fill: '#4a2c16', lit: '#6a4220' },
  black: { fill: '#1c1010', lit: '#3a2a28' },
  blonde: { fill: '#e0c56a', lit: '#f3e6c4' },
  copper: { fill: '#b05a28', lit: '#d4784a' },
  red: { fill: '#c45a3a', lit: '#e08060' },
  honey: { fill: '#c9a24a', lit: '#e8d090' },
  white: { fill: '#e8e0d4', lit: '#f7f2ea' },
  pink: { fill: '#e8a0b4', lit: '#f4c8d4' },
  lilac: { fill: '#a090c4', lit: '#c8bce0' },
  blue: { fill: '#5a8ab4', lit: '#8ab4d4' },
}

export type Outfit = {
  hair: HairId
  color: ColorId
  eyes: EyeId
  brows: BrowId
  smile: SmileId
  cheeks: CheekId
  clothes: ClothesId
  shoes: ShoeId
}

/** Always on. Never removable. Full-body onesie under every outfit. */
export const BASE_LAYER = 'onesie' as const

export const DEFAULT_OUTFIT: Outfit = {
  hair: 'short',
  color: 'brown',
  eyes: 'round',
  brows: 'soft',
  smile: 'calm',
  cheeks: 'pink',
  clothes: CLOTHES_IDS[0] ?? 'dress-0',
  shoes: 'none',
}

/** Likes stay on the toy. Never uploaded. */
export const LIKES_ARE_LOCAL = true

export const SLOT_IDS: Record<Slot, readonly string[]> = {
  hair: HAIR_IDS,
  color: COLOR_IDS,
  eyes: EYE_IDS,
  brows: BROW_IDS,
  smile: SMILE_IDS,
  cheeks: CHEEK_IDS,
  clothes: CLOTHES_IDS,
  shoes: SHOE_IDS,
}

export function clothesById(id: string): ClothesItem | undefined {
  return CLOTHES.find((item) => item.id === id)
}

export function shoeById(id: string): ShoeItem | undefined {
  return SHOES.find((item) => item.id === id)
}

export function withItem(outfit: Outfit, slot: Slot, id: string): Outfit {
  if (!(SLOT_IDS[slot] as readonly string[]).includes(id)) return outfit
  return { ...outfit, [slot]: id } as Outfit
}

export function hashOutfit(outfit: Outfit): number {
  const key = [
    outfit.hair,
    outfit.color,
    outfit.eyes,
    outfit.brows,
    outfit.smile,
    outfit.cheeks,
    outfit.clothes,
    outfit.shoes,
  ].join('|')
  let h = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic likes for a combo. Not a score you can fail. */
export function likeTarget(outfit: Outfit): number {
  return 18 + (hashOutfit(outfit) % 482)
}
