import { describe, expect, it } from 'vitest'
import { LANGS } from './languages.ts'
import { PICTURE_SVG, SPEED_SVG } from './pesenki-pictures.ts'
import { HERO_SVG } from './pesenki-heroes.ts'
import { PICTURES, SONGS } from './pesenki-songs.ts'
import { LEVELS, planSong, type SongTiming } from './pesenki-timeline.ts'
import { PESENKI_COPY } from './pesenki-copy.ts'
import LYRICS from './pesenki-lyrics.json'

const TIMINGS = import.meta.glob<SongTiming>('./pesenki-timings/*.json', { eager: true, import: 'default' })
const AUDIO = Object.keys(import.meta.glob('../public/pesenki/*.mp3', { eager: true, query: '?url', import: 'default' })).map((path) =>
  path.replace('../public', ''),
)
const timing = (song: string, lang: string): SongTiming => TIMINGS[`./pesenki-timings/${song}.${lang}.json`]

describe('song shelf', () => {
  it('has songs with titles, heroes and colours in every language', () => {
    expect(SONGS.length).toBeGreaterThan(0)
    for (const song of SONGS) {
      for (const lang of LANGS) {
        expect(song.title[lang].trim()).not.toBe('')
        expect(song.hero[lang].trim()).not.toBe('')
        expect(song.blurb[lang].trim()).not.toBe('')
      }
      expect(song.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(song.paper).toMatch(/^#[0-9a-f]{6}$/i)
      expect(HERO_SVG[song.id], song.id).toContain('hero-mouth-open')
    }
  })

  it('names every picture in every language and has a drawing for it', () => {
    for (const [id, words] of Object.entries(PICTURES)) {
      for (const lang of LANGS) expect(words[lang].trim(), `${id}.${lang}`).not.toBe('')
      expect(PICTURE_SVG[id], id).toMatch(/^<svg[\s\S]*<\/svg>$/)
    }
  })

  it('has a drawing for every speed-up and copy for all of them', () => {
    expect(SPEED_SVG).toHaveLength(LEVELS.length)
    for (const lang of LANGS) expect(PESENKI_COPY[lang].speeds).toHaveLength(LEVELS.length)
  })
})

describe.each(SONGS.map((song) => song.id))('recording of %s', (id) => {
  const source = (LYRICS as unknown as { songs: Array<{ id: string; langs: Record<string, { verse1: Array<{ pic: string }>; verse2: Array<{ pic: string }>; chorus: string[] }> }> }).songs.find((s) => s.id === id)!

  it.each([...LANGS])('%s: audio and timing exist and follow the lyrics', (lang) => {
    const t = timing(id, lang)
    expect(t, `${id}.${lang}.json`).toBeTruthy()
    expect(AUDIO, t.audio).toContain(t.audio)
    expect(t.song).toBe(id)
    expect(t.lang).toBe(lang)
    const picks = t.lines.filter((line) => line.kind === 'pick')
    const text = source.langs[lang]
    expect(picks.map((line) => line.pic)).toEqual([...text.verse1, ...text.verse2].map((line) => line.pic))
    expect(t.choruses).toHaveLength(2)
    expect(t.bpm).toBeGreaterThan(60)
    expect(t.bpm).toBeLessThan(180)
    // Lines and words move forward in time and stay inside the file.
    let last = 0
    for (const line of t.lines) {
      expect(line.s).toBeGreaterThanOrEqual(0)
      expect(line.e).toBeLessThanOrEqual(t.duration)
      expect(line.s).toBeGreaterThanOrEqual(last - 0.05)
      last = line.e
      for (const word of line.words) expect(word.e).toBeGreaterThanOrEqual(word.s)
      if (line.kind === 'pick') {
        expect(line.key).toBeGreaterThanOrEqual(0)
        expect(line.key).toBeLessThan(line.words.length)
      }
    }
    // Choruses never cover a picture line, so tapping and picking never mix.
    for (const chorus of t.choruses) {
      for (const line of picks) expect(line.e <= chorus.s + 0.01 || line.s >= chorus.e - 0.01, `${lang} ${line.words.map((w) => w.w).join(' ')}`).toBe(true)
    }
    const plan = planSong(t)
    expect(plan.cues).toHaveLength(8)
    expect(plan.begin).toBeGreaterThanOrEqual(0)
    expect(plan.end).toBeLessThanOrEqual(t.duration)
    for (const cue of plan.cues) expect(cue.pauseAt).toBeGreaterThanOrEqual(cue.line.e)
  })
})
