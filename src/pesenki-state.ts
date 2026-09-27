/** Песенки — what stays on the device. */

import { LEVELS } from './pesenki-timeline.ts'

export const PESENKI_KEY = 'spielzeuge.pesenki.v1'

export interface SongProgress {
  /** Highest speed-up finished: 0 = none, 1 = the normal speed, … LEVELS.length = the rocket. */
  done: number
  /** Most pictures found without the song stopping, at any speed. */
  stars: number
  plays: number
}

export interface PesenkiSave {
  sound: boolean
  songs: Record<string, SongProgress>
  last: string | null
}

export function emptySave(): PesenkiSave {
  return { sound: true, songs: {}, last: null }
}

const intIn = (value: unknown, min: number, max: number): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : min
  return Math.max(min, Math.min(max, n))
}

/** Accepts anything (old, broken or hostile JSON) and returns a clean save. */
export function restoreSave(raw: string | null, known: readonly string[]): PesenkiSave {
  const save = emptySave()
  if (!raw) return save
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return save
  }
  if (!data || typeof data !== 'object') return save
  const source = data as Record<string, unknown>
  if (typeof source.sound === 'boolean') save.sound = source.sound
  if (typeof source.last === 'string' && known.includes(source.last)) save.last = source.last
  const songs = source.songs
  if (songs && typeof songs === 'object') {
    for (const id of known) {
      const entry = (songs as Record<string, unknown>)[id]
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      save.songs[id] = {
        done: intIn(e.done, 0, LEVELS.length),
        stars: intIn(e.stars, 0, 99),
        plays: intIn(e.plays, 0, 1_000_000),
      }
    }
  }
  return save
}

export function progressOf(save: PesenkiSave, song: string): SongProgress {
  return save.songs[song] ?? { done: 0, stars: 0, plays: 0 }
}

/** Speed-ups the child may pick for a song: every finished one plus the next. */
export function openLevels(save: PesenkiSave, song: string): number {
  return Math.min(LEVELS.length, progressOf(save, song).done + 1)
}

/** Record a finished song. Returns true when a new speed-up appeared. */
export function finishSong(save: PesenkiSave, song: string, level: number, stars: number): boolean {
  const before = progressOf(save, song)
  const done = Math.max(before.done, Math.min(LEVELS.length, level + 1))
  save.songs[song] = { done, stars: Math.max(before.stars, stars), plays: before.plays + 1 }
  save.last = song
  return done > before.done && done < LEVELS.length
}
