/**
 * Лошадка — everything the pony can wear, as Matryona laid it out on her drawing:
 * manes on the left, clips on top, tails on the right, the pony's colour at the bottom.
 * Magic (horn, wings) and backgrounds are gifts that the stars open.
 *
 * This file is the shared contract: ids never change (they are saved on the device),
 * names exist in all three languages. Hex colours are the intended hue; the art may
 * shade them, but the name must stay true (a «Голубая грива» stays blue).
 */
import type { Lang } from './languages.ts'

export type Names = Record<Lang, string>

/** The four sides of the frame. Every finished pony has one of each. */
export type Side = 'mane' | 'clip' | 'tail' | 'color'
export const SIDES: readonly Side[] = ['mane', 'clip', 'tail', 'color']

export type ItemKind = Side | 'magic' | 'background'

export type ManeStyle = 'flowing' | 'wavy' | 'curly' | 'braids' | 'short' | 'mohawk' | 'spiky'
export type TailStyle = 'flowing' | 'wavy' | 'curly' | 'braid' | 'pompom' | 'fountain'
export type HairExtra = 'flowers' | 'sparkles' | 'stars' | 'ribbons' | 'bow'
export type ClipShape =
  | 'strawberry'
  | 'orange'
  | 'blueberry'
  | 'broccoli'
  | 'bow'
  | 'daisy'
  | 'heart'
  | 'star'
  | 'butterfly'
  | 'crown'
  | 'wreath'
  | 'rainbow'
  | 'cherry'
  | 'shell'
export type CoatPattern = 'dapples' | 'pinto' | 'stars' | 'hearts' | 'sparkles' | 'rainbow'

interface ItemBase {
  id: string
  name: Names
  /** Base items are there from the start; the others are gifts (see GIFTS). */
  base: boolean
}

export interface ManeItem extends ItemBase {
  kind: 'mane'
  style: ManeStyle
  /** Root → tip gradient, or stripes when there are three or more. */
  colors: string[]
  extra?: HairExtra
}

export interface TailItem extends ItemBase {
  kind: 'tail'
  style: TailStyle
  colors: string[]
  extra?: HairExtra
}

export interface ClipItem extends ItemBase {
  kind: 'clip'
  shape: ClipShape
  colors: string[]
}

export interface ColorItem extends ItemBase {
  kind: 'color'
  body: string
  /** Far legs, belly shading. */
  shade: string
  /** Lighter snout. */
  muzzle: string
  hoof: string
  pattern?: CoatPattern
  patternColor?: string
}

export interface MagicItem extends ItemBase {
  kind: 'magic'
  id: 'horn' | 'wings'
}

export interface BackgroundItem extends ItemBase {
  kind: 'background'
}

export type Item = ManeItem | TailItem | ClipItem | ColorItem | MagicItem | BackgroundItem

/** What the pony on the workshop wears. `null` = not chosen yet (the sketch shows a ghost there). */
export interface Look {
  /** ColorItem id; null = the uncoloured sketch. */
  color: string | null
  mane: string | null
  tail: string | null
  clip: string | null
  horn: boolean
  wings: boolean
}

const RAINBOW = ['#ff5f6d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa']

const n = (ru: string, de: string, en: string): Names => ({ ru, de, en })

/* ─────────────── left: manes ─────────────── */

export const MANES: ManeItem[] = [
  { id: 'sunny', kind: 'mane', base: true, style: 'flowing', colors: ['#ff9f43', '#ffd166'], name: n('Солнечная грива', 'Sonnige Mähne', 'Sunny mane') },
  { id: 'green', kind: 'mane', base: true, style: 'wavy', colors: ['#43b05c', '#9be08a'], name: n('Зелёная грива', 'Grüne Mähne', 'Green mane') },
  { id: 'blue', kind: 'mane', base: true, style: 'flowing', colors: ['#3d9bff', '#8fd3ff'], name: n('Голубая грива', 'Blaue Mähne', 'Blue mane') },
  { id: 'pinkFlowers', kind: 'mane', base: true, style: 'curly', colors: ['#ff7eb9', '#ffc1de'], extra: 'flowers', name: n('Розовая грива с цветочками', 'Rosa Mähne mit Blümchen', 'Pink mane with flowers') },
  { id: 'black', kind: 'mane', base: true, style: 'short', colors: ['#2f2a33', '#544b5c'], name: n('Чёрная грива', 'Schwarze Mähne', 'Black mane') },
  { id: 'whiteCurly', kind: 'mane', base: true, style: 'curly', colors: ['#ffffff', '#e4e9f5'], name: n('Белая кудрявая грива', 'Weiße Lockenmähne', 'White curly mane') },
  { id: 'purpleBraids', kind: 'mane', base: true, style: 'braids', colors: ['#8f5cff', '#c7a8ff'], extra: 'ribbons', name: n('Фиолетовые косички', 'Lila Zöpfe', 'Purple braids') },
  { id: 'chestnut', kind: 'mane', base: true, style: 'flowing', colors: ['#8a4b2a', '#c27a4a'], name: n('Каштановая грива', 'Kastanienbraune Mähne', 'Chestnut mane') },
  { id: 'rainbow', kind: 'mane', base: false, style: 'flowing', colors: RAINBOW, name: n('Радужная грива', 'Regenbogenmähne', 'Rainbow mane') },
  { id: 'starry', kind: 'mane', base: false, style: 'flowing', colors: ['#29296b', '#5458c4'], extra: 'stars', name: n('Звёздная грива', 'Sternenmähne', 'Starry mane') },
  { id: 'candy', kind: 'mane', base: false, style: 'curly', colors: ['#ffb3de', '#b8e3ff'], name: n('Грива из сахарной ваты', 'Zuckerwatte-Mähne', 'Candy floss mane') },
  { id: 'golden', kind: 'mane', base: false, style: 'wavy', colors: ['#f2b400', '#ffe27a'], extra: 'sparkles', name: n('Золотая грива с блёстками', 'Goldmähne mit Glitzer', 'Golden glitter mane') },
  { id: 'mohawk', kind: 'mane', base: false, style: 'mohawk', colors: ['#ff4f9a', '#5fd0ff'], name: n('Ирокез', 'Irokesenmähne', 'Mohawk mane') },
  { id: 'fire', kind: 'mane', base: false, style: 'spiky', colors: ['#ff4d2e', '#ff9f1c', '#ffd23f'], name: n('Огненная грива', 'Feuermähne', 'Fire mane') },
]

/* ─────────────── top: clips ─────────────── */

export const CLIPS: ClipItem[] = [
  { id: 'strawberry', kind: 'clip', base: true, shape: 'strawberry', colors: ['#ff4b5c', '#4caf50'], name: n('Клубничка', 'Erdbeerspange', 'Strawberry clip') },
  { id: 'orange', kind: 'clip', base: true, shape: 'orange', colors: ['#ff9a2e', '#4caf50'], name: n('Апельсинка', 'Orangenspange', 'Orange clip') },
  { id: 'blueberry', kind: 'clip', base: true, shape: 'blueberry', colors: ['#3f6fd8', '#4caf50'], name: n('Черничка', 'Heidelbeerspange', 'Blueberry clip') },
  { id: 'broccoli', kind: 'clip', base: true, shape: 'broccoli', colors: ['#58b847', '#3b7d32'], name: n('Брокколи', 'Brokkolispange', 'Broccoli clip') },
  { id: 'bow', kind: 'clip', base: true, shape: 'bow', colors: ['#ff6fae', '#ffd1e6'], name: n('Бантик', 'Schleife', 'Bow') },
  { id: 'daisy', kind: 'clip', base: true, shape: 'daisy', colors: ['#ffffff', '#ffd23f'], name: n('Ромашка', 'Gänseblümchen', 'Daisy') },
  { id: 'heart', kind: 'clip', base: true, shape: 'heart', colors: ['#ff3d6e', '#ff9ab8'], name: n('Сердечко', 'Herzchen', 'Little heart') },
  { id: 'star', kind: 'clip', base: true, shape: 'star', colors: ['#ffc531', '#fff1a8'], name: n('Звёздочка', 'Sternchen', 'Little star') },
  { id: 'butterfly', kind: 'clip', base: true, shape: 'butterfly', colors: ['#7c6cff', '#ffb3f0'], name: n('Бабочка', 'Schmetterling', 'Butterfly') },
  { id: 'crown', kind: 'clip', base: false, shape: 'crown', colors: ['#ffc531', '#ff5c8a'], name: n('Корона', 'Krone', 'Crown') },
  { id: 'wreath', kind: 'clip', base: false, shape: 'wreath', colors: ['#ff8fc4', '#ffd23f', '#6ccf6a'], name: n('Венок из цветов', 'Blumenkranz', 'Flower crown') },
  { id: 'rainbowClip', kind: 'clip', base: false, shape: 'rainbow', colors: RAINBOW, name: n('Радуга', 'Regenbogenspange', 'Rainbow clip') },
  { id: 'cherry', kind: 'clip', base: false, shape: 'cherry', colors: ['#e0243b', '#4caf50'], name: n('Вишенки', 'Kirschen', 'Cherries') },
  { id: 'shell', kind: 'clip', base: false, shape: 'shell', colors: ['#ffc2b0', '#fff0ea'], name: n('Ракушка', 'Muschel', 'Seashell') },
]

/* ─────────────── right: tails ─────────────── */

export const TAILS: TailItem[] = [
  { id: 'black', kind: 'tail', base: true, style: 'flowing', colors: ['#2f2a33', '#544b5c'], name: n('Чёрный хвост', 'Schwarzer Schweif', 'Black tail') },
  { id: 'red', kind: 'tail', base: true, style: 'flowing', colors: ['#e8424f', '#ff8a8a'], name: n('Красный хвост', 'Roter Schweif', 'Red tail') },
  { id: 'green', kind: 'tail', base: true, style: 'wavy', colors: ['#3fae5a', '#8be07f'], name: n('Зелёный хвост', 'Grüner Schweif', 'Green tail') },
  { id: 'blue', kind: 'tail', base: true, style: 'curly', colors: ['#3d9bff', '#9ad6ff'], name: n('Голубой кудрявый хвост', 'Blauer Lockenschweif', 'Blue curly tail') },
  { id: 'orange', kind: 'tail', base: true, style: 'pompom', colors: ['#ff8a3d', '#ffc078'], name: n('Рыжий хвост-пушок', 'Oranger Puschelschweif', 'Orange fluffy tail') },
  { id: 'pinkBraid', kind: 'tail', base: true, style: 'braid', colors: ['#ff7eb6', '#ffc2dc'], extra: 'bow', name: n('Розовая косичка с бантиком', 'Rosa Zopf mit Schleife', 'Pink braid with a bow') },
  { id: 'striped', kind: 'tail', base: true, style: 'flowing', colors: ['#5cc8a0', '#ffffff', '#5cc8a0', '#ffffff'], name: n('Полосатый хвост', 'Gestreifter Schweif', 'Striped tail') },
  { id: 'white', kind: 'tail', base: true, style: 'wavy', colors: ['#ffffff', '#e4e9f5'], name: n('Белый хвост', 'Weißer Schweif', 'White tail') },
  { id: 'rainbow', kind: 'tail', base: false, style: 'flowing', colors: RAINBOW, name: n('Радужный хвост', 'Regenbogenschweif', 'Rainbow tail') },
  { id: 'sparkly', kind: 'tail', base: false, style: 'wavy', colors: ['#ff9ad5', '#ffe27a'], extra: 'sparkles', name: n('Хвост с блёстками', 'Glitzerschweif', 'Glitter tail') },
  { id: 'fountain', kind: 'tail', base: false, style: 'fountain', colors: ['#4dc3ff', '#c4f1ff'], name: n('Хвост-фонтанчик', 'Springbrunnen-Schweif', 'Fountain tail') },
  { id: 'starry', kind: 'tail', base: false, style: 'flowing', colors: ['#29296b', '#5458c4'], extra: 'stars', name: n('Звёздный хвост', 'Sternenschweif', 'Starry tail') },
]

/* ─────────────── bottom: the pony's colour ─────────────── */

export const COLORS: ColorItem[] = [
  { id: 'orange', kind: 'color', base: true, body: '#f7a35c', shade: '#e0863f', muzzle: '#fbc999', hoof: '#3a2f35', name: n('Рыжая лошадка', 'Oranges Pferdchen', 'Orange pony') },
  { id: 'green', kind: 'color', base: true, body: '#7fd47a', shade: '#5fb85c', muzzle: '#b5ebb0', hoof: '#2f4a33', name: n('Зелёная лошадка', 'Grünes Pferdchen', 'Green pony') },
  { id: 'red', kind: 'color', base: true, body: '#f2645f', shade: '#d4484a', muzzle: '#f9a5a0', hoof: '#4a2a30', name: n('Красная лошадка', 'Rotes Pferdchen', 'Red pony') },
  { id: 'pink', kind: 'color', base: true, body: '#ff9fc8', shade: '#f07fb0', muzzle: '#ffd0e4', hoof: '#6b3553', name: n('Розовая лошадка', 'Rosa Pferdchen', 'Pink pony') },
  { id: 'blue', kind: 'color', base: true, body: '#79bff7', shade: '#58a2e0', muzzle: '#b8defb', hoof: '#2c3f5e', name: n('Голубая лошадка', 'Blaues Pferdchen', 'Blue pony') },
  { id: 'black', kind: 'color', base: true, body: '#3b3640', shade: '#29252d', muzzle: '#5d5764', hoof: '#151216', name: n('Чёрная лошадка', 'Schwarzes Pferdchen', 'Black pony') },
  { id: 'white', kind: 'color', base: true, body: '#fbfaf7', shade: '#e3e0da', muzzle: '#ffe9ef', hoof: '#8a8088', name: n('Белая лошадка', 'Weißes Pferdchen', 'White pony') },
  { id: 'brown', kind: 'color', base: true, body: '#b0714a', shade: '#925a38', muzzle: '#d9a684', hoof: '#3a2a22', name: n('Коричневая лошадка', 'Braunes Pferdchen', 'Brown pony') },
  { id: 'lilac', kind: 'color', base: true, body: '#c3a5f2', shade: '#a888dc', muzzle: '#e2d3fa', hoof: '#4b3a66', name: n('Сиреневая лошадка', 'Fliederfarbenes Pferdchen', 'Lilac pony') },
  { id: 'yellow', kind: 'color', base: true, body: '#ffd95e', shade: '#f0bf3a', muzzle: '#ffecaa', hoof: '#5c4a24', name: n('Жёлтая лошадка', 'Gelbes Pferdchen', 'Yellow pony') },
  { id: 'golden', kind: 'color', base: false, body: '#f5c24a', shade: '#dba22c', muzzle: '#fde3a0', hoof: '#6b4f1a', pattern: 'sparkles', patternColor: '#fff6d0', name: n('Золотая лошадка', 'Goldenes Pferdchen', 'Golden pony') },
  { id: 'starry', kind: 'color', base: false, body: '#3a3f8f', shade: '#2b2f70', muzzle: '#6a70c4', hoof: '#1b1d45', pattern: 'stars', patternColor: '#ffe680', name: n('Звёздная лошадка', 'Sternenpferdchen', 'Starry pony') },
  { id: 'pinto', kind: 'color', base: false, body: '#fbfaf7', shade: '#e3e0da', muzzle: '#ffe9ef', hoof: '#5a4038', pattern: 'pinto', patternColor: '#a5643f', name: n('Пятнистая лошадка', 'Geschecktes Pferdchen', 'Spotted pony') },
  { id: 'hearts', kind: 'color', base: false, body: '#ffc2dc', shade: '#f5a3c6', muzzle: '#ffe3ef', hoof: '#7a3a5c', pattern: 'hearts', patternColor: '#ff5c95', name: n('Лошадка в сердечках', 'Herzchenpferdchen', 'Hearts pony') },
  { id: 'dapple', kind: 'color', base: false, body: '#a9adb8', shade: '#8d919d', muzzle: '#d6d9e0', hoof: '#3c3f47', pattern: 'dapples', patternColor: '#d9dce4', name: n('Серая в яблоках', 'Apfelschimmel', 'Dapple grey pony') },
  { id: 'rainbow', kind: 'color', base: false, body: '#ffffff', shade: '#e8e4f2', muzzle: '#ffffff', hoof: '#6a5a8a', pattern: 'rainbow', name: n('Радужная лошадка', 'Regenbogenpferdchen', 'Rainbow pony') },
]

/* ─────────────── gifts ─────────────── */

export const MAGIC: MagicItem[] = [
  { id: 'horn', kind: 'magic', base: false, name: n('Рог единорога', 'Einhorn-Horn', 'Unicorn horn') },
  { id: 'wings', kind: 'magic', base: false, name: n('Крылышки', 'Flügel', 'Wings') },
]

/** The first one is Matryona's own: a raspberry sky full of pink hearts. */
export const BACKGROUNDS: BackgroundItem[] = [
  { id: 'hearts', kind: 'background', base: true, name: n('Сердечки', 'Herzchen', 'Hearts') },
  { id: 'meadow', kind: 'background', base: true, name: n('Лужайка', 'Wiese', 'Meadow') },
  { id: 'sky', kind: 'background', base: true, name: n('Небо', 'Himmel', 'Sky') },
  { id: 'night', kind: 'background', base: false, name: n('Звёздная ночь', 'Sternennacht', 'Starry night') },
  { id: 'rainbow', kind: 'background', base: false, name: n('Радуга', 'Regenbogen', 'Rainbow') },
  { id: 'castle', kind: 'background', base: false, name: n('Замок', 'Schloss', 'Castle') },
  { id: 'sea', kind: 'background', base: false, name: n('Море', 'Meer', 'Seaside') },
]

export interface GiftRef {
  kind: ItemKind
  id: string
}

/**
 * Every finished look brings three stars; every new pony also opens the next gift, in this order.
 * Each non-base item appears here exactly once.
 */
export const GIFTS: readonly GiftRef[] = [
  { kind: 'magic', id: 'horn' },
  { kind: 'mane', id: 'rainbow' },
  { kind: 'clip', id: 'crown' },
  { kind: 'tail', id: 'rainbow' },
  { kind: 'background', id: 'night' },
  { kind: 'magic', id: 'wings' },
  { kind: 'color', id: 'golden' },
  { kind: 'mane', id: 'starry' },
  { kind: 'clip', id: 'wreath' },
  { kind: 'tail', id: 'sparkly' },
  { kind: 'background', id: 'rainbow' },
  { kind: 'color', id: 'starry' },
  { kind: 'mane', id: 'candy' },
  { kind: 'clip', id: 'rainbowClip' },
  { kind: 'tail', id: 'fountain' },
  { kind: 'background', id: 'castle' },
  { kind: 'color', id: 'pinto' },
  { kind: 'mane', id: 'golden' },
  { kind: 'clip', id: 'cherry' },
  { kind: 'tail', id: 'starry' },
  { kind: 'color', id: 'hearts' },
  { kind: 'mane', id: 'mohawk' },
  { kind: 'background', id: 'sea' },
  { kind: 'clip', id: 'shell' },
  { kind: 'mane', id: 'fire' },
  { kind: 'color', id: 'dapple' },
  { kind: 'color', id: 'rainbow' },
]

export const ITEMS: Record<ItemKind, readonly Item[]> = {
  mane: MANES,
  clip: CLIPS,
  tail: TAILS,
  color: COLORS,
  magic: MAGIC,
  background: BACKGROUNDS,
}

export function findItem(kind: 'mane', id: string): ManeItem | undefined
export function findItem(kind: 'clip', id: string): ClipItem | undefined
export function findItem(kind: 'tail', id: string): TailItem | undefined
export function findItem(kind: 'color', id: string): ColorItem | undefined
export function findItem(kind: 'magic', id: string): MagicItem | undefined
export function findItem(kind: 'background', id: string): BackgroundItem | undefined
export function findItem(kind: ItemKind, id: string): Item | undefined
export function findItem(kind: ItemKind, id: string): Item | undefined {
  return ITEMS[kind].find((item) => item.id === id)
}

/* ─────────────── pony names ─────────────── */

/** A finished pony picks one of three names; saved as an index, shown in the current language. */
export const PONY_NAMES: readonly Names[] = [
  n('Звёздочка', 'Sternchen', 'Twinkle'),
  n('Ромашка', 'Gänseblümchen', 'Daisy'),
  n('Искорка', 'Fünkchen', 'Sparkle'),
  n('Карамелька', 'Karamell', 'Caramel'),
  n('Пуговка', 'Knöpfchen', 'Button'),
  n('Ласточка', 'Schwälbchen', 'Swallow'),
  n('Вишенка', 'Kirschlein', 'Cherry'),
  n('Снежинка', 'Schneeflocke', 'Snowflake'),
  n('Радуга', 'Regenbogen', 'Rainbow'),
  n('Солнышко', 'Sonnchen', 'Sunny'),
  n('Облачко', 'Wölkchen', 'Cloudy'),
  n('Ягодка', 'Beerchen', 'Berry'),
  n('Пушинка', 'Flöckchen', 'Fluffy'),
  n('Малинка', 'Himbeere', 'Raspberry'),
  n('Конфетка', 'Bonbon', 'Candy'),
  n('Зефирка', 'Marshmallow', 'Marshmallow'),
  n('Лучик', 'Sonnenstrahl', 'Sunbeam'),
  n('Капелька', 'Tröpfchen', 'Droplet'),
  n('Луна', 'Luna', 'Luna'),
  n('Ветерок', 'Windchen', 'Breeze'),
  n('Черничка', 'Heidelbeere', 'Blueberry'),
  n('Жемчужинка', 'Perle', 'Pearl'),
  n('Фиалка', 'Veilchen', 'Violet'),
  n('Корица', 'Zimt', 'Cinnamon'),
  n('Мечта', 'Traum', 'Dream'),
  n('Ириска', 'Toffee', 'Toffee'),
  n('Бабочка', 'Schmetterling', 'Butterfly'),
  n('Принцесса', 'Prinzessin', 'Princess'),
]
