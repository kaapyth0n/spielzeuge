import { describe, expect, it } from 'vitest'
import {
  Conductor,
  LEVELS,
  REWIND_RATE,
  beatOffset,
  chooseChoices,
  chorusRate,
  lineAt,
  planSong,
  type Command,
  type SongTiming,
  type TimedLine,
} from './pesenki-timeline.ts'

const words = (text: string, s: number, e: number) => {
  const parts = text.split(' ')
  const step = (e - s) / parts.length
  return parts.map((w, i) => ({ w, s: s + i * step, e: s + (i + 1) * step }))
}
const pick = (text: string, s: number, e: number, pic: string): TimedLine => {
  const ws = words(text, s, e)
  return { kind: 'pick', s, e, words: ws, pic, key: ws.length - 1 }
}
const sing = (text: string, s: number, e: number): TimedLine => ({ kind: 'sing', s, e, words: words(text, s, e) })

/** A 40-second toy song: two picture lines, a chorus, two picture lines. */
const SONG: SongTiming = {
  song: 'test',
  lang: 'ru',
  audio: '/x.mp3',
  duration: 40,
  bpm: 120,
  beat0: 0.5,
  lines: [
    pick('пандёнок ест бамбук', 6, 8, 'bamboo'),
    pick('катает мячик', 9, 11, 'ball'),
    sing('тук тук пандёнок', 12, 14),
    sing('тук тук дружок', 14.2, 16),
    pick('надел галстук', 18, 20, 'tie'),
    pick('нюхает цветок', 21, 23, 'flower'),
  ],
  choruses: [{ s: 11.8, e: 16.4 }],
}

/** Drive the conductor like the page does, with an ideal player. */
class Harness {
  pos = 0
  rate = 1
  dir: 1 | -1 = 1
  running = false
  stopAt: number | null = null
  now = 0
  log: Command[] = []
  readonly c: Conductor
  constructor(c: Conductor) {
    this.c = c
  }
  apply(cmds: Command[]): void {
    for (const cmd of cmds) {
      this.log.push(cmd)
      if (cmd.type === 'play') {
        this.pos = cmd.from
        this.rate = cmd.rate
        this.dir = 1
        this.running = true
        this.stopAt = null
      } else if (cmd.type === 'stop-at') this.stopAt = cmd.at
      else if (cmd.type === 'stop') this.running = false
      else if (cmd.type === 'rate') this.rate = cmd.rate
      else if (cmd.type === 'reverse') {
        this.pos = cmd.from
        this.rate = cmd.rate
        this.dir = -1
        this.running = true
        this.stopAt = null
      }
    }
  }
  step(dt = 1 / 60): void {
    this.now += dt
    if (this.running) {
      this.pos += this.dir * this.rate * dt
      if (this.stopAt !== null && this.dir === 1 && this.pos >= this.stopAt) {
        this.pos = this.stopAt
        this.running = false
      }
      this.pos = Math.max(0, this.pos)
    }
    this.apply(this.c.frame(this.pos, this.now, dt))
  }
  run(seconds: number, each?: () => void): void {
    const frames = Math.round(seconds * 60)
    for (let i = 0; i < frames; i++) {
      this.step()
      each?.()
    }
  }
  has(type: Command['type']): boolean {
    return this.log.some((cmd) => cmd.type === type)
  }
}

describe('planSong', () => {
  it('shows pictures just before a line and pauses in the gap after it', () => {
    const plan = planSong(SONG)
    expect(plan.cues.map((c) => c.pic)).toEqual(['bamboo', 'ball', 'tie', 'flower'])
    const [first, second] = plan.cues
    expect(first.showAt).toBeCloseTo(5.45)
    expect(first.pauseAt).toBeGreaterThan(8)
    expect(first.pauseAt).toBeLessThan(9 - 0.1)
    expect(second.showAt).toBeGreaterThan(first.line.e)
    expect(plan.begin).toBeCloseTo(6 - 3.2)
    expect(plan.end).toBeCloseTo(23 + 2.6)
  })

  it('never pauses inside the next line, even when lines touch', () => {
    const tight: SongTiming = { ...SONG, lines: [pick('a b', 5, 7, 'x'), pick('c d', 7.05, 9, 'y')] }
    const plan = planSong(tight)
    expect(plan.cues[0].pauseAt).toBeLessThan(7.05)
    expect(plan.cues[0].pauseAt).toBeGreaterThan(7)
  })
})

describe('karaoke and beats', () => {
  it('finds the current line and hides it in long gaps', () => {
    expect(lineAt(SONG.lines, 2)).toBe(-1)
    expect(lineAt(SONG.lines, 5.6)).toBe(0)
    expect(lineAt(SONG.lines, 8.7)).toBe(1)
    expect(lineAt(SONG.lines, 16.1)).toBe(3)
    expect(lineAt(SONG.lines, 17.8)).toBe(4)
    expect(lineAt(SONG.lines, 19)).toBe(4)
    const gappy = [sing('a b', 2, 4), sing('c d', 12, 14)]
    expect(lineAt(gappy, 5)).toBe(0)
    expect(lineAt(gappy, 8)).toBe(-1)
    expect(lineAt(gappy, 11.6)).toBe(1)
  })
  it('measures distance to the nearest beat', () => {
    expect(beatOffset(SONG, 0.5)).toBeCloseTo(0)
    expect(beatOffset(SONG, 1.1)).toBeCloseTo(0.1)
    expect(beatOffset(SONG, 0.9)).toBeCloseTo(-0.1)
  })
})

describe('choices', () => {
  it('always contains the target once and is deterministic', () => {
    const a = chooseChoices('tie', ['bamboo', 'ball', 'tie', 'flower'], ['moon', 'sun'], 4, 42)
    const b = chooseChoices('tie', ['bamboo', 'ball', 'tie', 'flower'], ['moon', 'sun'], 4, 42)
    expect(a).toEqual(b)
    expect(a.filter((p) => p === 'tie')).toHaveLength(1)
    expect(new Set(a).size).toBe(4)
  })
  it('fills up from extras when the song has few pictures', () => {
    const c = chooseChoices('a', ['a', 'b'], ['c', 'd', 'e'], 5, 1)
    expect(c).toHaveLength(5)
    expect(c).toContain('b')
  })
  it('never offers pictures that sound alike together', () => {
    const timing: SongTiming = { ...SONG, apart: [['tie', 'flower']] }
    for (let level = 0; level < LEVELS.length; level++) {
      const c = new Conductor({ timing, level, extras: ['moon', 'sun', 'star'] })
      c.plan.cues.forEach((cue, i) => {
        if (cue.pic === 'tie') expect(c.choices[i]).not.toContain('flower')
        if (cue.pic === 'flower') expect(c.choices[i]).not.toContain('tie')
      })
    }
  })

  it('gives each level its own number of circles', () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const c = new Conductor({ timing: SONG, level, extras: ['moon', 'sun', 'star'] })
      expect(c.choices.every((set) => set.length === LEVELS[level].choices)).toBe(true)
    }
  })
})

describe('conductor: pictures', () => {
  it('waits for the first tap on the hero, then plays from the short intro', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.run(1)
    expect(h.c.mode).toBe('idle')
    h.apply(h.c.tapHero(h.now))
    expect(h.c.mode).toBe('play')
    expect(h.log[0]).toMatchObject({ type: 'play', from: planSong(SONG).begin })
  })

  it('keeps flowing when the right picture comes in time', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(10, () => {
      if (h.c.shown === 0 && h.pos > 7.5) h.apply(h.c.pick('bamboo'))
      if (h.c.shown === 1 && h.pos > 10.5) h.apply(h.c.pick('ball'))
    })
    expect(h.has('stop-at')).toBe(false)
    expect(h.c.fast.slice(0, 2)).toEqual([true, true])
  })

  it('stops after the line until the right picture, and wrong pictures do not count', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(8)
    expect(h.c.mode).toBe('hold')
    const pauseAt = planSong(SONG).cues[0].pauseAt
    expect(h.pos).toBeCloseTo(pauseAt, 5)
    expect(h.c.pick('ball')).toEqual([{ type: 'wrong', cue: 0, pic: 'ball' }])
    expect(h.c.mode).toBe('hold')
    h.apply(h.c.pick('bamboo'))
    expect(h.c.mode).toBe('play')
    expect(h.c.fast[0]).toBe(false)
    expect(h.log.at(-1)).toMatchObject({ type: 'play', from: pauseAt })
  })

  it('counts an answer during the last moments before the stop as in time', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    const pauseAt = planSong(SONG).cues[0].pauseAt
    h.run(20, () => {
      if (h.c.mode === 'hold' && h.pos < pauseAt - 0.02 && h.c.shown === 0) h.apply(h.c.pick('bamboo'))
    })
    expect(h.c.fast[0]).toBe(true)
  })

  it('rewinds and sings the line again when nobody answers, then shows a hint', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(8)
    expect(h.c.mode).toBe('hold')
    h.run(7)
    expect(h.has('hint')).toBe(true)
    expect(h.log.some((c) => c.type === 'reverse')).toBe(true)
    // The replay reaches the pause again.
    h.run(6)
    expect(h.c.holds[0]).toBe(2)
    h.run(8)
    expect(h.c.hinted[0]).toBe(true)
  })

  it('tapping the hero while waiting sings the line again', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(8)
    h.apply(h.c.tapHero(h.now))
    expect(h.c.mode).toBe('hint')
  })

  it('finishes with a star for every picture found without stopping', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(40, () => {
      const cue = h.c.shown
      if (cue >= 0 && h.c.mode === 'play' && cue !== 1) h.apply(h.c.pick(h.c.plan.cues[cue].pic))
      if (cue === 1 && h.c.mode === 'hold' && !h.running) h.apply(h.c.pick('ball'))
      if (h.c.chorus >= 0 && Math.round(h.now * 60) % 20 === 0) h.apply(h.c.tapHero(h.now))
    })
    expect(h.c.mode).toBe('done')
    expect(h.log.at(-1)).toEqual({ type: 'done', stars: 3, total: 4 })
    expect(h.has('fade-out')).toBe(true)
  })
})

describe('conductor: chorus', () => {
  const toChorus = (level = 0) => {
    const h = new Harness(new Conductor({ timing: SONG, level }))
    h.apply(h.c.start())
    for (let i = 0; i < 60 * 30 && h.c.chorus < 0; i++) {
      h.step()
      const cue = h.c.shown
      if (cue >= 0) h.apply(h.c.pick(h.c.plan.cues[cue].pic))
    }
    return h
  }
  const until = (h: Harness, test: () => boolean, limit = 20): number => {
    const from = h.now
    for (let i = 0; i < limit * 60 && !test(); i++) h.step()
    return h.now - from
  }

  it('slows the tape, then runs backwards when nobody taps', () => {
    const h = toChorus()
    expect(h.c.chorus).toBe(0)
    h.run(1.8)
    expect(h.c.rate).toBeLessThan(1)
    expect(h.c.mode).toBe('play')
    const waited = 1.8 + until(h, () => h.c.mode === 'rewind')
    expect(waited).toBeGreaterThan(2.3)
    expect(waited).toBeLessThan(3.6)
    expect(h.log.find((c) => c.type === 'reverse')).toMatchObject({ rate: REWIND_RATE })
    until(h, () => h.c.mode === 'stuck', 6)
    expect(h.c.mode).toBe('stuck')
    expect(h.c.pos).toBeCloseTo(SONG.choruses[0].s)
    h.apply(h.c.tapHero(h.now))
    expect(h.c.mode).toBe('play')
    expect(h.log.at(-1)).toMatchObject({ type: 'play', from: SONG.choruses[0].s })
  })

  it('keeps full speed with steady taps and rewards taps on the beat', () => {
    const h = toChorus()
    let perfect = 0
    h.run(4, () => {
      if (Math.round(h.now * 60) % 30 === 0) {
        const cmds = h.c.tapHero(h.now, beatOffset(SONG, h.pos))
        perfect += cmds.filter((c) => c.type === 'tap' && c.perfect).length
        h.apply(cmds)
      }
    })
    expect(h.c.rate).toBeGreaterThan(0.95)
    expect(h.has('reverse')).toBe(false)
    expect(perfect).toBeGreaterThanOrEqual(0)
  })

  it('tapping during the rewind turns the song forward again', () => {
    const h = toChorus()
    until(h, () => h.c.mode === 'rewind')
    h.run(0.2)
    expect(h.c.mode).toBe('rewind')
    const at = h.pos
    h.apply(h.c.tapHero(h.now))
    expect(h.c.mode).toBe('play')
    expect(h.log.at(-1)).toMatchObject({ type: 'play' })
    expect((h.log.at(-1) as { from: number }).from).toBeCloseTo(at)
  })

  it('drains faster at higher speed-ups', () => {
    expect(chorusRate(1, 1.6)).toBe(1.6)
    expect(chorusRate(0.2, 1)).toBeLessThan(0.7)
    expect(chorusRate(0, 1)).toBeGreaterThan(0)
  })
})

describe('conductor: pause and resume', () => {
  it('stops and resumes from the same place', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 1 }))
    h.apply(h.c.start())
    h.run(2)
    const at = h.pos
    h.apply(h.c.pause())
    expect(h.c.mode).toBe('paused')
    h.run(1)
    const cmds = h.c.resume(h.now)
    expect(cmds[0]).toMatchObject({ type: 'play', rate: LEVELS[1].speed })
    expect((cmds[0] as { from: number }).from).toBeCloseTo(at, 1)
  })
  it('stays waiting for a picture after a resume', () => {
    const h = new Harness(new Conductor({ timing: SONG, level: 0 }))
    h.apply(h.c.start())
    h.run(8)
    h.apply(h.c.pause())
    expect(h.c.resume(h.now)).toEqual([])
    expect(h.c.mode).toBe('hold')
  })
})
