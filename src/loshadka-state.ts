/**
 * Лошадка — the rules of the workshop and what stays on the device.
 *
 * Everything here is pure: functions return new objects and never change their input
 * (a call that changes nothing returns the same save). Time and random seeds come in
 * as parameters, so the same call always gives the same answer.
 *
 * Invariants of every save that `restoreSave` returns (and every function keeps):
 * - `ponies` holds at most MAX_PONIES complete ponies with unique ids, newest first;
 *   every item they wear exists and is already opened.
 * - The draft wears only available items. `draft.editing` is the id of an existing pony
 *   or null; `draft.doneKey` is that pony's `lookKey` (null when not editing).
 * - `seen` lists only opened gifts, as `giftKey`s; `background` is an available background.
 * - `finished` (one per new finished pony; edits earn stars only) opens `GIFTS.slice(0, finished)`.
 */
import type { Lang } from './languages.ts'
import {
  BACKGROUNDS,
  GIFTS,
  ITEMS,
  PONY_NAMES,
  SIDES,
  type GiftRef,
  type Item,
  type ItemKind,
  type Look,
  type Side,
} from './loshadka-items.ts'

export const LOSHADKA_KEY = 'spielzeuge.loshadka.v1'
export const MAX_PONIES = 30

export interface Pony {
  id: string
  /** Index into PONY_NAMES, shown in the current language. */
  name: number
  /** Always complete: all four sides chosen. */
  look: Look
  created: number
  updated: number
}

export interface Draft {
  /** The pony on the workshop stage. */
  look: Look
  /** The stable pony this draft belongs to (after a finish or «Наряжать»), null for a new sketch. */
  editing: string | null
  /** lookKey of the last finished state of `editing`; Готово on the same look gives no stars. */
  doneKey: string | null
}

export interface LoshadkaSave {
  v: 1
  stars: number
  /** New ponies finished (edits do not count): the number of opened gifts. */
  finished: number
  /** Opened gifts that were already tapped (no «Новое!» badge), as giftKey. */
  seen: string[]
  /** Newest first. */
  ponies: Pony[]
  draft: Draft
  background: string
  sound: boolean
  nextId: number
  /** The first-visit welcome was played. */
  welcomed: boolean
}

export type FinishResult =
  | { ok: true; stars: 3; gift: GiftRef | null; pony: Pony; isNew: boolean; save: LoshadkaSave }
  | { ok: false; reason: 'incomplete'; missing: Side[] }
  | { ok: false; reason: 'unchanged' }
  | { ok: false; reason: 'full' }

/* ─────────────── limits ─────────────── */

/** Far beyond anything a child reaches; keeps hostile numbers out. */
const MAX_FINISHED = 1_000_000
const MAX_STARS = 3 * MAX_FINISHED
const MAX_ID = 1_000_000_000
/** Latest time a Date can hold. */
const MAX_TIME = 8.64e15
/** A real save is a few kilobytes; anything far bigger is not ours. */
const MAX_RAW = 200_000
/** How many entries of a stored array are looked at. */
const SCAN_LIMIT = 500
const PONY_ID = /^[A-Za-z0-9_-]{1,32}$/
/** Ids the game hands out (`p1`, `p2`, …); longer numbers are kept but never counted. */
const NUMBERED_ID = /^p(\d{1,9})$/
const DEFAULT_BACKGROUND = BACKGROUNDS[0].id

const GIFT_INDEX = new Map(GIFTS.map((gift, index) => [giftKey(gift.kind, gift.id), index]))

/* ─────────────── small helpers ─────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Integer in [min, max]; ±Infinity clamp to the ends, anything that is not a number gives `fallback`. */
function intIn(value: unknown, min: number, max: number, fallback = min): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function itemOf(kind: ItemKind, id: unknown): Item | undefined {
  if (typeof id !== 'string' || !Object.hasOwn(ITEMS, kind)) return undefined
  return ITEMS[kind].find((item) => item.id === id)
}

function copyLook(look: Look): Look {
  return {
    color: look.color,
    mane: look.mane,
    tail: look.tail,
    clip: look.clip,
    horn: look.horn,
    wings: look.wings,
  }
}

function copyGift(gift: GiftRef): GiftRef {
  return { kind: gift.kind, id: gift.id }
}

/** Opened gifts, however odd `finished` is. */
function openedCount(save: LoshadkaSave): number {
  return intIn(save.finished, 0, GIFTS.length)
}

function isOpenedGift(save: LoshadkaSave, kind: ItemKind, id: string): boolean {
  const index = GIFT_INDEX.get(giftKey(kind, id))
  return index !== undefined && index < openedCount(save)
}

/** What a look wears, in reading order: colour, mane, clip, tail, horn, wings. */
function wornItems(look: Look): GiftRef[] {
  const worn: GiftRef[] = []
  for (const kind of ['color', 'mane', 'clip', 'tail'] as const) {
    const id = look[kind]
    if (id !== null) worn.push({ kind, id })
  }
  if (look.horn) worn.push({ kind: 'magic', id: 'horn' })
  if (look.wings) worn.push({ kind: 'magic', id: 'wings' })
  return worn
}

/** How many gifts must be open for every item of this look to be available. */
function giftsNeeded(look: Look): number {
  let needed = 0
  for (const { kind, id } of wornItems(look)) {
    const index = GIFT_INDEX.get(giftKey(kind, id))
    if (index !== undefined) needed = Math.max(needed, index + 1)
  }
  return needed
}

/** FNV-1a over the seed's text, so 0.42, 7 and Date.now() all give different streams. */
function hashSeed(seed: number): number {
  const text = String(seed)
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/* ─────────────── defaults and storage ─────────────── */

export function emptyLook(): Look {
  return { color: null, mane: null, tail: null, clip: null, horn: false, wings: false }
}

export function defaultSave(): LoshadkaSave {
  return {
    v: 1,
    stars: 0,
    finished: 0,
    seen: [],
    ponies: [],
    draft: { look: emptyLook(), editing: null, doneKey: null },
    background: DEFAULT_BACKGROUND,
    sound: true,
    nextId: 1,
    welcomed: false,
  }
}

function restorePonyLook(value: unknown): Look | null {
  if (!isRecord(value)) return null
  const look = emptyLook()
  for (const side of SIDES) {
    const id = value[side]
    if (typeof id !== 'string' || !itemOf(side, id)) return null
    look[side] = id
  }
  look.horn = value.horn === true
  look.wings = value.wings === true
  return look
}

function restorePony(value: unknown, position: number): Pony | null {
  if (!isRecord(value)) return null
  const { id, name } = value
  if (typeof id !== 'string' || !PONY_ID.test(id)) return null
  const look = restorePonyLook(value.look)
  if (!look) return null
  const created = intIn(value.created, 0, MAX_TIME)
  return {
    id,
    name:
      typeof name === 'number' && Number.isInteger(name) && name >= 0 && name < PONY_NAMES.length
        ? name
        : position % PONY_NAMES.length,
    look,
    created,
    updated: Math.max(created, intIn(value.updated, 0, MAX_TIME)),
  }
}

/** Accepts anything (missing, old, broken or hostile JSON), never throws, returns a valid save. */
export function restoreSave(raw: string | null): LoshadkaSave {
  const save = defaultSave()
  if (typeof raw !== 'string' || !raw || raw.length > MAX_RAW) return save
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return save
  }
  if (!isRecord(data)) return save

  if (typeof data.sound === 'boolean') save.sound = data.sound
  if (typeof data.welcomed === 'boolean') save.welcomed = data.welcomed
  save.stars = intIn(data.stars, 0, MAX_STARS)

  // Ponies first: they decide which ids are taken and which gifts must be open.
  const ponies: Pony[] = []
  const ids = new Set<string>()
  if (Array.isArray(data.ponies)) {
    for (const entry of data.ponies.slice(0, SCAN_LIMIT)) {
      if (ponies.length >= MAX_PONIES) break
      const pony = restorePony(entry, ponies.length)
      if (!pony || ids.has(pony.id)) continue
      ids.add(pony.id)
      ponies.push(pony)
    }
  }
  save.ponies = ponies

  let nextId = intIn(data.nextId, 1, MAX_ID, 1)
  for (const pony of ponies) {
    const numbered = NUMBERED_ID.exec(pony.id)
    if (numbered) nextId = Math.max(nextId, Math.min(MAX_ID, Number(numbered[1]) + 1))
  }
  save.nextId = nextId

  // Every stable pony was finished at least once, with items that were open by then.
  save.finished = Math.max(
    intIn(data.finished, 0, MAX_FINISHED),
    ponies.length,
    ...ponies.map((pony) => giftsNeeded(pony.look)),
  )

  if (Array.isArray(data.seen)) {
    const opened = new Set(openedGifts(save).map((gift) => giftKey(gift.kind, gift.id)))
    const seen = new Set<string>()
    for (const key of data.seen.slice(0, SCAN_LIMIT)) {
      if (typeof key === 'string' && opened.has(key)) seen.add(key)
    }
    save.seen = [...seen]
  }

  if (typeof data.background === 'string' && isAvailable(save, 'background', data.background))
    save.background = data.background

  const draft = data.draft
  if (isRecord(draft)) {
    const look = emptyLook()
    const stored = draft.look
    if (isRecord(stored)) {
      for (const side of SIDES) {
        const id = stored[side]
        if (typeof id === 'string' && isAvailable(save, side, id)) look[side] = id
      }
      look.horn = stored.horn === true && isAvailable(save, 'magic', 'horn')
      look.wings = stored.wings === true && isAvailable(save, 'magic', 'wings')
    }
    const editingId = draft.editing
    const edited = typeof editingId === 'string' ? ponies.find((pony) => pony.id === editingId) : undefined
    save.draft = {
      look,
      editing: edited ? edited.id : null,
      doneKey: edited ? lookKey(edited.look) : null,
    }
  }
  return save
}

/** Only the known fields, so nothing stray is ever written back. */
export function serialize(save: LoshadkaSave): string {
  return JSON.stringify({
    v: 1,
    stars: save.stars,
    finished: save.finished,
    seen: save.seen,
    ponies: save.ponies.map((pony) => ({
      id: pony.id,
      name: pony.name,
      look: copyLook(pony.look),
      created: pony.created,
      updated: pony.updated,
    })),
    draft: { look: copyLook(save.draft.look), editing: save.draft.editing, doneKey: save.draft.doneKey },
    background: save.background,
    sound: save.sound,
    nextId: save.nextId,
    welcomed: save.welcomed,
  })
}

/* ─────────────── looks ─────────────── */

/** Same key ⇔ same look. */
export function lookKey(look: Look): string {
  return [
    look.mane ?? '',
    look.clip ?? '',
    look.tail ?? '',
    look.color ?? '',
    look.horn ? 'horn' : '',
    look.wings ? 'wings' : '',
  ].join('|')
}

/** Sides still to choose, in the order the hints name them: mane, clip, tail, colour. */
export function missingSides(look: Look): Side[] {
  return SIDES.filter((side) => !itemOf(side, look[side]))
}

export function isComplete(look: Look): boolean {
  return missingSides(look).length === 0
}

/** Names of what the pony wears (colour, mane, clip, tail, horn, wings) for its aria label. */
export function describe(look: Look, lang: Lang): string[] {
  const names: string[] = []
  for (const { kind, id } of wornItems(look)) {
    const item = itemOf(kind, id)
    if (item) names.push(item.name[lang])
  }
  return names
}

/* ─────────────── gifts and items ─────────────── */

export function giftKey(kind: ItemKind, id: string): string {
  return `${kind}:${id}`
}

export function openedGifts(save: LoshadkaSave): GiftRef[] {
  return GIFTS.slice(0, openedCount(save)).map(copyGift)
}

export function isAvailable(save: LoshadkaSave, kind: ItemKind, id: string): boolean {
  const item = itemOf(kind, id)
  return item !== undefined && (item.base || isOpenedGift(save, kind, id))
}

/** Base items in file order, then opened gifts in the order they were opened. */
export function availableItems(save: LoshadkaSave, kind: ItemKind): Item[] {
  if (!Object.hasOwn(ITEMS, kind)) return []
  const items = ITEMS[kind].filter((item) => item.base)
  for (const gift of openedGifts(save)) {
    const item = gift.kind === kind ? itemOf(kind, gift.id) : undefined
    if (item) items.push(item)
  }
  return items
}

/** Gifts of this kind that are still wrapped, in the order they will open. */
export function lockedGifts(save: LoshadkaSave, kind: ItemKind): GiftRef[] {
  return GIFTS.slice(openedCount(save))
    .filter((gift) => gift.kind === kind)
    .map(copyGift)
}

/** The gift the next finished pony opens, or null when every gift is open. */
export function nextGift(save: LoshadkaSave): GiftRef | null {
  const gift = GIFTS[openedCount(save)]
  return gift ? copyGift(gift) : null
}

/** An opened gift that was not tapped yet: it wears the «Новое!» badge. Base items never do. */
export function isNew(save: LoshadkaSave, kind: ItemKind, id: string): boolean {
  return isOpenedGift(save, kind, id) && !save.seen.includes(giftKey(kind, id))
}

export function markSeen(save: LoshadkaSave, kind: ItemKind, id: string): LoshadkaSave {
  if (!isNew(save, kind, id)) return save
  return { ...save, seen: [...save.seen, giftKey(kind, id)] }
}

/**
 * Put an item on the draft pony: a side item replaces that side, magic toggles,
 * a background becomes the stage background. Locked or unknown ids change nothing.
 */
export function wear(save: LoshadkaSave, kind: ItemKind, id: string): LoshadkaSave {
  if (!isAvailable(save, kind, id)) return save
  if (kind === 'background') return save.background === id ? save : { ...save, background: id }
  const look = copyLook(save.draft.look)
  if (kind === 'magic') {
    const part = id === 'horn' ? 'horn' : 'wings'
    look[part] = !look[part]
  } else {
    if (look[kind] === id) return save
    look[kind] = id
  }
  return { ...save, draft: { ...save.draft, look } }
}

/* ─────────────── finishing ─────────────── */

/**
 * Готово. A complete, changed pony earns 3 stars; a new one also opens the next gift. A new pony moves
 * into the stable (newest first) with the first of `nameChoices(save, nameSeed)`; an edited
 * pony gets the new look and keeps its name. Afterwards the draft edits that pony.
 */
export function finish(save: LoshadkaSave, now: number, nameSeed: number): FinishResult {
  const { draft } = save
  const missing = missingSides(draft.look)
  if (missing.length > 0) return { ok: false, reason: 'incomplete', missing }
  const key = lookKey(draft.look)
  const edited = draft.editing === null ? undefined : save.ponies.find((pony) => pony.id === draft.editing)
  if (edited && draft.doneKey === key) return { ok: false, reason: 'unchanged' }
  if (!edited && save.ponies.length >= MAX_PONIES) return { ok: false, reason: 'full' }

  const time = intIn(now, 0, MAX_TIME)
  const look = copyLook(draft.look)
  let nextId = save.nextId
  let pony: Pony
  let ponies: Pony[]
  if (edited) {
    pony = { ...edited, look, updated: Math.max(edited.created, time) }
    ponies = save.ponies.map((other) => (other.id === edited.id ? pony : other))
  } else {
    while (save.ponies.some((other) => other.id === `p${nextId}`)) nextId += 1
    pony = { id: `p${nextId}`, name: nameChoices(save, nameSeed)[0], look, created: time, updated: time }
    nextId += 1
    ponies = [pony, ...save.ponies]
  }
  // Every finished look earns three stars (Matryona's rule), but only a new pony opens a gift:
  // switching the horn on and off on one pony must not empty the whole gift list.
  return {
    ok: true,
    stars: 3,
    gift: edited ? null : nextGift(save),
    pony,
    isNew: !edited,
    save: {
      ...save,
      stars: Math.min(MAX_STARS, save.stars + 3),
      finished: edited ? save.finished : Math.min(MAX_FINISHED, save.finished + 1),
      ponies,
      nextId,
      draft: { look: copyLook(look), editing: pony.id, doneKey: key },
    },
  }
}

/* ─────────────── names and the stable ─────────────── */

/**
 * Distinct PONY_NAMES indices: names no other pony has come first, then the taken ones.
 * The pony being edited does not count as taken, so the choices offered right after a
 * finish are the same as before it. Deterministic for a seed, and a longer list starts
 * with the shorter one: `nameChoices(save, seed, 6).slice(3)` gives three more names.
 */
export function nameChoices(save: LoshadkaSave, seed: number, count = 3): number[] {
  const editing = save.draft.editing
  const taken = new Set(save.ponies.filter((pony) => pony.id !== editing).map((pony) => pony.name))
  const all = PONY_NAMES.map((_, index) => index)
  const random = mulberry32(hashSeed(seed))
  const free = shuffle(all.filter((index) => !taken.has(index)), random)
  const used = shuffle(all.filter((index) => taken.has(index)), random)
  const wanted = Number.isFinite(count) ? Math.max(0, Math.min(all.length, Math.floor(count))) : 3
  return [...free, ...used].slice(0, wanted)
}

export function rename(save: LoshadkaSave, ponyId: string, name: number): LoshadkaSave {
  if (!Number.isInteger(name) || name < 0 || name >= PONY_NAMES.length) return save
  const pony = save.ponies.find((other) => other.id === ponyId)
  if (!pony || pony.name === name) return save
  return { ...save, ponies: save.ponies.map((other) => (other === pony ? { ...other, name } : other)) }
}

/** A fresh sketch: white, outlined, nothing chosen. */
export function startNew(save: LoshadkaSave): LoshadkaSave {
  return { ...save, draft: { look: emptyLook(), editing: null, doneKey: null } }
}

/** «Наряжать»: the stable pony comes back to the workshop. */
export function editPony(save: LoshadkaSave, ponyId: string): LoshadkaSave {
  const pony = save.ponies.find((other) => other.id === ponyId)
  if (!pony) return save
  return { ...save, draft: { look: copyLook(pony.look), editing: pony.id, doneKey: lookKey(pony.look) } }
}

/** «Отпустить погулять». A draft of that pony stays on the stage as a new, unfinished pony. */
export function release(save: LoshadkaSave, ponyId: string): LoshadkaSave {
  if (!save.ponies.some((pony) => pony.id === ponyId)) return save
  return {
    ...save,
    ponies: save.ponies.filter((pony) => pony.id !== ponyId),
    draft:
      save.draft.editing === ponyId ? { look: copyLook(save.draft.look), editing: null, doneKey: null } : save.draft,
  }
}

/** Something is chosen on the stage that Готово has not saved yet («Новая лошадка» asks first). */
export function hasUnfinishedWork(save: LoshadkaSave): boolean {
  const { look, doneKey } = save.draft
  const started = SIDES.some((side) => look[side] !== null) || look.horn || look.wings
  return started && lookKey(look) !== doneKey
}

/** The draft is a finished pony that has not changed since: its three stars sit in the slots. */
export function finishedUnchanged(save: LoshadkaSave): boolean {
  const { draft } = save
  return draft.editing !== null && draft.doneKey === lookKey(draft.look)
}

/**
 * The workshop opens afresh (page load, back from the stable, a page restored from the
 * back/forward cache): a finished, unchanged pony has moved into the stable, so the stage gets
 * a new sketch and changing something never quietly edits a stable pony. A half-made pony or
 * unsaved changes to a stable pony stay where they are.
 */
export function reopenWorkshop(save: LoshadkaSave): LoshadkaSave {
  return finishedUnchanged(save) ? startNew(save) : save
}

/**
 * The background the round button shows and switches to: a freshly opened (unseen) one first,
 * so a gift background is one tap away, then the next one in turn.
 */
export function nextBackground(save: LoshadkaSave): Item {
  const list = availableItems(save, 'background')
  const fresh = list.find((item) => item.id !== save.background && isNew(save, 'background', item.id))
  if (fresh) return fresh
  const index = list.findIndex((item) => item.id === save.background)
  return list[(index + 1) % list.length]
}
