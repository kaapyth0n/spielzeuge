/**
 * Песенки — the song shelf. Words, pictures and colours come from
 * ./pesenki-lyrics.json (the same file the Suno lyrics are built from).
 * Timings (when each word is sung) live in ./pesenki-timings/<song>.<lang>.json
 * and are produced by scripts/pesenki-songs.mjs from the recordings.
 */

import { LANGS, type Lang } from './languages.ts'
import type { SongTiming } from './pesenki-timeline.ts'
import LYRICS from './pesenki-lyrics.json'

export type Words = Record<Lang, string>

export interface Song {
  id: string
  /** Marker colour of the song: circles, clock fill, confetti. */
  color: string
  /** Pale paper tint behind the hero. */
  paper: string
  title: Words
  hero: Words
  blurb: Words
}

interface LyricsLang {
  title: string
  hero: string
  blurb: string
}

interface LyricsSong {
  id: string
  color: string
  paper: string
  pictures: Record<string, Words & { draw?: string }>
  langs: Record<Lang, LyricsLang>
}

const pick = (song: LyricsSong, key: keyof LyricsLang): Words => ({
  ru: song.langs.ru[key],
  de: song.langs.de[key],
  en: song.langs.en[key],
})

const SOURCE = (LYRICS as unknown as { songs: LyricsSong[] }).songs
const TIMINGS = import.meta.glob<SongTiming>('./pesenki-timings/*.json', { import: 'default' })

export function hasTiming(song: string, lang: Lang): boolean {
  return `./pesenki-timings/${song}.${lang}.json` in TIMINGS
}

/** Songs on the shelf: only those recorded in every language. */
export const SONGS: Song[] = SOURCE.filter((song) => LANGS.every((lang) => hasTiming(song.id, lang))).map((song) => ({
  id: song.id,
  color: song.color,
  paper: song.paper,
  title: pick(song, 'title'),
  hero: pick(song, 'hero'),
  blurb: pick(song, 'blurb'),
}))

/**
 * Songs from Matryona's drawing that are not recorded yet: their heroes sleep
 * on the shelf, so it always shows her ten circles.
 */
export interface SleepingSong {
  id: string
  color: string
  paper: string
  title: Words
}

const DRAWN_ORDER = ['panda', 'labubu', 'kitten', 'boat', 'icecream', 'girl', 'letters', 'unicorn', 'caterpillar', 'owl']
const SLEEPING_TITLES: Record<string, Words> = {
  letters: { ru: 'Буковки', de: 'ABC-Lied', en: 'ABC Song' },
  unicorn: { ru: 'Единорожка', de: 'Einhorn', en: 'Unicorn' },
  caterpillar: { ru: 'Гусеничка', de: 'Räupchen', en: 'Caterpillar' },
  owl: { ru: 'Совушка', de: 'Eulchen', en: 'Little Owl' },
}
const SLEEPING_COLORS: Record<string, [string, string]> = {
  letters: ['#f0463c', '#fde5e2'],
  unicorn: ['#a66cff', '#f0e6ff'],
}

export const SLEEPING: SleepingSong[] = DRAWN_ORDER.filter((id) => !SONGS.some((song) => song.id === id)).map((id) => {
  const source = SOURCE.find((song) => song.id === id)
  const [color, paper] = source ? [source.color, source.paper] : (SLEEPING_COLORS[id] ?? ['#9aa3ad', '#eceef1'])
  return { id, color, paper, title: source ? pick(source, 'title') : (SLEEPING_TITLES[id] ?? { ru: id, de: id, en: id }) }
})

/** Picture names, used for accessible labels and the word under a found picture. */
export const PICTURES: Record<string, Words> = Object.fromEntries(
  SOURCE.filter((song) => SONGS.some((ready) => ready.id === song.id)).flatMap((song) => Object.entries(song.pictures).map(([id, w]) => [id, { ru: w.ru, de: w.de, en: w.en }])),
)

export function songById(id: string | null | undefined): Song | null {
  return SONGS.find((song) => song.id === id) ?? null
}

export function pictureWord(pic: string, lang: Lang): string {
  return PICTURES[pic]?.[lang] ?? pic
}

export async function loadTiming(song: string, lang: Lang): Promise<SongTiming | null> {
  const load = TIMINGS[`./pesenki-timings/${song}.${lang}.json`]
  if (!load) return null
  try {
    return await load()
  } catch {
    return null
  }
}
