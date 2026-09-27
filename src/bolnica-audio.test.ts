import { afterEach, describe, expect, it, vi } from 'vitest'
import { BOLNICA_EFFECTS, BolnicaAudio, EFFECT_LENGTH, melodyFrequency, songLength } from './bolnica-audio.ts'

/** A tiny stand-in for the Web Audio graph: records sources, accepts every call. */
class FakeParam {
  value = 1
  setValueAtTime(): this {
    return this
  }
  exponentialRampToValueAtTime(): this {
    return this
  }
  linearRampToValueAtTime(): this {
    return this
  }
  cancelScheduledValues(): this {
    return this
  }
}

class FakeNode {
  gain = new FakeParam()
  frequency = new FakeParam()
  detune = new FakeParam()
  Q = new FakeParam()
  type = ''
  buffer: unknown = null
  loop = false
  stopped = false
  onended: (() => void) | null = null
  connect<T>(node: T): T {
    return node
  }
  disconnect(): void {}
  start(): void {}
  stop(): void {
    this.stopped = true
  }
}

class FakeContext {
  static made: FakeContext[] = []
  state = 'running'
  currentTime = 0
  sampleRate = 48000
  destination = new FakeNode()
  sources: FakeNode[] = []
  closed = false
  constructor() {
    FakeContext.made.push(this)
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    this.closed = true
    return Promise.resolve()
  }
  createGain(): FakeNode {
    return new FakeNode()
  }
  createBiquadFilter(): FakeNode {
    return new FakeNode()
  }
  createOscillator(): FakeNode {
    const node = new FakeNode()
    this.sources.push(node)
    return node
  }
  createBufferSource(): FakeNode {
    const node = new FakeNode()
    this.sources.push(node)
    return node
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeContext.made = []
})

describe('effect table', () => {
  it('gives every effect a positive, short length', () => {
    expect(Object.keys(EFFECT_LENGTH).sort()).toEqual([...BOLNICA_EFFECTS].sort())
    for (const effect of BOLNICA_EFFECTS) {
      expect(EFFECT_LENGTH[effect]).toBeGreaterThan(0)
      expect(EFFECT_LENGTH[effect]).toBeLessThanOrEqual(2)
    }
  })
})

describe('healing song', () => {
  const pitches = Array.from({ length: 40 }, (_, step) => melodyFrequency(step))

  it('stays finite and in a pleasant range', () => {
    for (const pitch of pitches) {
      expect(Number.isFinite(pitch)).toBe(true)
      expect(pitch).toBeGreaterThanOrEqual(500)
      expect(pitch).toBeLessThanOrEqual(1600)
    }
  })

  it('climbs at first, then stays up high', () => {
    for (let step = 1; step < 9; step++) expect(pitches[step]).toBeGreaterThan(pitches[step - 1])
    for (let step = 9; step < pitches.length; step++) expect(pitches[step]).toBeGreaterThanOrEqual(pitches[7] - 0.01)
  })

  it('uses only major pentatonic notes', () => {
    for (const pitch of pitches) {
      const semitones = Math.round(12 * Math.log2(pitch / 523.2511))
      expect([0, 2, 4, 7, 9]).toContain(((semitones % 12) + 12) % 12)
      expect(Math.abs(12 * Math.log2(pitch / 523.2511) - semitones)).toBeLessThan(0.001)
    }
  })

  it('tolerates odd steps', () => {
    expect(melodyFrequency(-3)).toBe(melodyFrequency(0))
    expect(melodyFrequency(Number.NaN)).toBe(melodyFrequency(0))
    expect(melodyFrequency(2.7)).toBe(melodyFrequency(2))
  })

  it('has a bounded length that grows with the word', () => {
    expect(songLength(0)).toBeGreaterThan(1)
    for (let count = 1; count < 40; count++) {
      expect(songLength(count)).toBeGreaterThanOrEqual(songLength(count - 1) - 0.001)
      expect(songLength(count)).toBeLessThan(3.2)
    }
    expect(songLength(Number.NaN)).toBe(songLength(0))
  })
})

describe('BolnicaAudio without Web Audio', () => {
  it('constructs and plays nothing in plain Node', () => {
    expect(typeof globalThis.AudioContext).toBe('undefined')
    const audio = new BolnicaAudio(() => true)
    expect(() => {
      audio.unlock()
      for (const effect of BOLNICA_EFFECTS) audio.play(effect)
      audio.note(3)
      audio.silence()
      audio.destroy()
    }).not.toThrow()
    expect(audio.busyUntil).toBe(0)
    expect(audio.song(4)).toBe(Math.round(songLength(4) * 1000))
  })

  it('survives an AudioContext that refuses to start', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('not allowed')
        }
      },
    )
    const audio = new BolnicaAudio(() => true)
    expect(() => {
      audio.unlock()
      audio.play('bell')
      audio.song(3)
    }).not.toThrow()
  })
})

describe('BolnicaAudio with a fake graph', () => {
  function setup(options: { enabled?: () => boolean; hidden?: boolean } = {}) {
    vi.stubGlobal('AudioContext', FakeContext)
    const listeners = new Map<string, () => void>()
    const doc = {
      hidden: options.hidden ?? false,
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    }
    vi.stubGlobal('document', doc)
    const audio = new BolnicaAudio(options.enabled ?? (() => true))
    return { audio, doc, listeners }
  }

  it('schedules effects and marks itself busy', () => {
    const { audio } = setup()
    audio.play('siren')
    const ctx = FakeContext.made[0]
    expect(ctx.sources.length).toBeGreaterThan(0)
    expect(audio.busyUntil).toBeGreaterThan(performance.now() + 1500)
  })

  it('silence stops every voice, even scheduled song notes', () => {
    const { audio } = setup()
    audio.song(6)
    audio.play('heal')
    const ctx = FakeContext.made[0]
    expect(ctx.sources.length).toBeGreaterThan(20)
    audio.silence()
    // sources[0] is the one-sample blank that opens the iOS audio route.
    expect(ctx.sources.slice(1).every((source) => source.stopped)).toBe(true)
    expect(audio.busyUntil).toBe(0)
  })

  it('stays quiet while muted or hidden', () => {
    const muted = setup({ enabled: () => false })
    muted.audio.play('bell')
    muted.audio.note(0)
    expect(FakeContext.made.length).toBe(0)
    const hidden = setup({ hidden: true })
    hidden.audio.unlock()
    hidden.audio.play('bell')
    expect(FakeContext.made[0].sources.length).toBe(1)
    expect(hidden.audio.busyUntil).toBe(0)
  })

  it('silences itself when the page hides, and closes on destroy', () => {
    const { audio, doc, listeners } = setup()
    audio.play('siren')
    const ctx = FakeContext.made[0]
    doc.hidden = true
    listeners.get('visibilitychange')?.()
    expect(ctx.sources.slice(1).every((source) => source.stopped)).toBe(true)
    audio.destroy()
    expect(ctx.closed).toBe(true)
    expect(listeners.has('visibilitychange')).toBe(false)
    doc.hidden = false
    audio.play('bell')
    expect(FakeContext.made.length).toBe(1)
  })
})
