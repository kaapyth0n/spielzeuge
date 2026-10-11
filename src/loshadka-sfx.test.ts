import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EFFECT_SECONDS,
  LOSHADKA_EFFECTS,
  LoshadkaSfx,
  MASTER_GAIN,
  NEIGH_SAMPLE_FADE_AT,
  NEIGH_SAMPLE_GAIN,
  NEIGH_SAMPLE_URL,
  createMaster,
  neighRate,
  synthesizeLoshadkaEffect,
  type LoshadkaEffect,
} from './loshadka-sfx.ts'

/** A stand-in for the Web Audio graph. Params validate their arguments like browsers do. */
class FakeParam {
  value: number
  events: Array<[string, number, number]> = []
  constructor(value = 1) {
    this.value = value
  }
  private check(kind: string, value: number, time: number): this {
    if (!Number.isFinite(value) || !Number.isFinite(time) || time < 0) throw new TypeError(`${kind}(${value}, ${time})`)
    if (kind === 'exp' && !(Math.abs(value) > 1.40130e-45)) throw new RangeError(`exponential ramp to ${value}`)
    this.events.push([kind, value, time])
    return this
  }
  setValueAtTime(value: number, time: number): this {
    return this.check('set', value, time)
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    return this.check('exp', value, time)
  }
  linearRampToValueAtTime(value: number, time: number): this {
    return this.check('lin', value, time)
  }
  cancelScheduledValues(): this {
    return this
  }
}

class FakeNode {
  gain = new FakeParam(1)
  playbackRate = new FakeParam(1)
  frequency = new FakeParam(440)
  detune = new FakeParam(0)
  Q = new FakeParam(1)
  type = ''
  curve: Float32Array | null = null
  buffer: { length: number } | null = null
  loop = false
  started = false
  stopped = false
  stopAt: number | null = null
  onended: (() => void) | null = null
  outputs: unknown[] = []
  readonly context: FakeContext
  constructor(context: FakeContext) {
    this.context = context
  }
  connect<T>(node: T): T {
    this.outputs.push(node)
    return node
  }
  disconnect(): void {
    this.outputs = []
  }
  start(when = 0): void {
    if (!Number.isFinite(when)) throw new TypeError('start time')
    this.started = true
  }
  stop(when = 0): void {
    if (!Number.isFinite(when)) throw new TypeError('stop time')
    this.stopped = true
    this.stopAt = when
  }
}

/** What decodeAudioData hands back (null = the data cannot be decoded). */
const NEIGH_BUFFER = { duration: 2.3, length: 110400, sampleRate: 48000, numberOfChannels: 1 }

class FakeContext {
  static made: FakeContext[] = []
  static initialState = 'running'
  static decoded: typeof NEIGH_BUFFER | null = NEIGH_BUFFER
  state = FakeContext.initialState
  currentTime = 1.2345
  sampleRate = 48000
  destination: FakeNode
  sources: FakeNode[] = []
  oscillators: FakeNode[] = []
  filters: FakeNode[] = []
  gains: FakeNode[] = []
  closed = false
  resumeCalls = 0
  constructor() {
    this.destination = new FakeNode(this)
    FakeContext.made.push(this)
  }
  resume(): Promise<void> {
    this.resumeCalls++
    return Promise.resolve().then(() => {
      if (this.state !== 'closed') this.state = 'running'
    })
  }
  close(): Promise<void> {
    this.closed = true
    this.state = 'closed'
    return Promise.resolve()
  }
  createGain(): FakeNode {
    const node = new FakeNode(this)
    this.gains.push(node)
    return node
  }
  createBiquadFilter(): FakeNode {
    const node = new FakeNode(this)
    this.filters.push(node)
    return node
  }
  createWaveShaper(): FakeNode {
    return new FakeNode(this)
  }
  createOscillator(): FakeNode {
    const node = new FakeNode(this)
    this.sources.push(node)
    this.oscillators.push(node)
    return node
  }
  createBufferSource(): FakeNode {
    const node = new FakeNode(this)
    this.sources.push(node)
    return node
  }
  createBuffer(_channels: number, length: number): { length: number; getChannelData: () => Float32Array } {
    const data = new Float32Array(length)
    return { length, getChannelData: () => data }
  }
  decodeAudioData(_data: ArrayBuffer): Promise<typeof NEIGH_BUFFER> {
    const decoded = FakeContext.decoded
    return decoded ? Promise.resolve(decoded) : Promise.reject(new Error('cannot decode'))
  }
}

function fakeDocument(hidden = false) {
  const listeners = new Map<string, () => void>()
  const doc = {
    hidden,
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  }
  vi.stubGlobal('document', doc)
  return { doc, listeners }
}

/** By default the neigh never finishes loading, so the synthesized whinny plays. */
function setup(options: { enabled?: () => boolean; hidden?: boolean; fetch?: (url: string) => Promise<unknown> } = {}) {
  vi.stubGlobal('AudioContext', FakeContext)
  const fetcher = vi.fn(options.fetch ?? (() => new Promise(() => {})))
  vi.stubGlobal('fetch', fetcher)
  const page = fakeDocument(options.hidden)
  const sfx = new LoshadkaSfx(options.enabled ?? (() => true))
  return { sfx, fetcher, ...page }
}

const okFetch = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)) })

/** Lets the fetch → arrayBuffer → decode promise chain settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

/** Sources made by `run` (the unlock blank and earlier effects excluded). */
function sourcesOf(ctx: FakeContext, run: () => void): FakeNode[] {
  const before = ctx.sources.length
  run()
  return ctx.sources.slice(before)
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeContext.made = []
  FakeContext.initialState = 'running'
  FakeContext.decoded = NEIGH_BUFFER
})

describe('effect table', () => {
  it('lists every effect once with a short, positive length', () => {
    expect(new Set(LOSHADKA_EFFECTS).size).toBe(LOSHADKA_EFFECTS.length)
    expect(Object.keys(EFFECT_SECONDS).sort()).toEqual([...LOSHADKA_EFFECTS].sort())
    for (const effect of LOSHADKA_EFFECTS) {
      expect(EFFECT_SECONDS[effect]).toBeGreaterThan(0)
      expect(EFFECT_SECONDS[effect]).toBeLessThanOrEqual(2)
    }
  })
})

describe('synthesizeLoshadkaEffect', () => {
  it('schedules every effect and index without an invalid automation call', () => {
    for (const effect of LOSHADKA_EFFECTS) {
      for (const index of [0, 1, 2, 3, 4, 5, 9, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const ctx = new FakeContext()
        expect(() => synthesizeLoshadkaEffect(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, effect, index, 0.5), `${effect}(${index})`).not.toThrow()
        expect(ctx.sources.length).toBeGreaterThan(0)
        expect(ctx.sources.every((source) => source.started && source.stopAt !== null && source.stopAt <= 0.5 + 2.5)).toBe(true)
      }
    }
  })

  it('starts every envelope from silence (a gain is 1 until its first event)', () => {
    for (const effect of LOSHADKA_EFFECTS) {
      const ctx = new FakeContext()
      synthesizeLoshadkaEffect(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, effect, 0, 0.123457)
      for (const gain of ctx.gains.filter((node) => node.gain.events.length)) expect(gain.gain.value, effect).toBe(0)
    }
  })
})

describe('LoshadkaSfx without Web Audio', () => {
  it('constructs, plays, silences and destroys in plain Node without throwing', () => {
    expect(typeof globalThis.AudioContext).toBe('undefined')
    const sfx = new LoshadkaSfx(() => true)
    expect(() => {
      sfx.unlock()
      for (const effect of LOSHADKA_EFFECTS) for (const index of [0, 1, 2, 3]) sfx.play(effect, index)
      sfx.silence()
      sfx.destroy()
      sfx.play('neigh')
    }).not.toThrow()
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
    const sfx = new LoshadkaSfx(() => true)
    expect(() => {
      sfx.unlock()
      sfx.play('neigh')
      sfx.silence()
      sfx.destroy()
    }).not.toThrow()
  })

  it('uses webkitAudioContext when that is all there is', () => {
    vi.stubGlobal('webkitAudioContext', FakeContext)
    const sfx = new LoshadkaSfx(() => true)
    sfx.play('tap')
    expect(FakeContext.made).toHaveLength(1)
    expect(FakeContext.made[0].sources.length).toBeGreaterThan(1)
  })
})

describe('LoshadkaSfx with a fake graph', () => {
  it('unlock creates and resumes the context and plays the one-sample iOS opener once', () => {
    FakeContext.initialState = 'suspended'
    const { sfx } = setup()
    sfx.unlock()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    expect(FakeContext.made).toHaveLength(1)
    expect(ctx.resumeCalls).toBeGreaterThan(0)
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0].buffer?.length).toBe(1)
    expect(ctx.sources[0].started).toBe(true)
  })

  it('every effect (and index) schedules started voices with valid automation', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    for (const effect of LOSHADKA_EFFECTS) {
      for (const index of [0, 1, 2, 3, 7, -2, Number.NaN]) {
        const made = sourcesOf(ctx, () => sfx.play(effect, index))
        expect(made.length, `${effect}(${index})`).toBeGreaterThan(0)
        expect(made.every((source) => source.started && source.stopAt !== null)).toBe(true)
        sfx.silence()
      }
    }
    for (const osc of ctx.oscillators) {
      for (const [, value] of osc.frequency.events) expect(value).toBeLessThan(ctx.sampleRate / 2)
    }
  })

  it('stars ring C6, E6, G6 for slots 0, 1, 2', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const pitches = [0, 1, 2].map((slot) => {
      const before = ctx.oscillators.length
      sfx.play('star', slot)
      return ctx.oscillators[before].frequency.events[0][1]
    })
    expect(pitches[0]).toBeCloseTo(1046.5, 0)
    expect(pitches[1]).toBeCloseTo(1318.5, 0)
    expect(pitches[2]).toBeCloseTo(1568, 0)
  })

  it('hooves alternate between two pitches', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const knock = (index: number) => {
      const before = ctx.filters.length
      sfx.play('hoof', index)
      return ctx.filters[before].frequency.events[0][1]
    }
    const [a, b, c, d] = [0, 1, 2, 3].map(knock)
    expect(a).toBeGreaterThan(b)
    expect(c).toBe(a)
    expect(d).toBe(b)
  })

  it('silence() stops every scheduled and ringing voice and fades their buses', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const made = sourcesOf(ctx, () => {
      sfx.play('fanfare')
      sfx.play('neigh', 2)
      sfx.play('bye')
      sfx.play('munch')
    })
    expect(made.length).toBeGreaterThan(40)
    for (const source of made) source.stopped = false
    sfx.silence()
    expect(made.every((source) => source.stopped)).toBe(true)
    expect(made.every((source) => (source.stopAt ?? 99) <= ctx.currentTime + 0.05)).toBe(true)
    const buses = ctx.gains.filter((gain) => gain.gain.events.some(([kind, value]) => kind === 'lin' && value === 0))
    expect(buses.length).toBeGreaterThanOrEqual(4)
  })

  it('a new neigh gently replaces the one still ringing; picks may overlap', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const first = sourcesOf(ctx, () => sfx.play('neigh'))
    for (const source of first) source.stopped = false
    const second = sourcesOf(ctx, () => sfx.play('neigh'))
    expect(first.every((source) => source.stopped)).toBe(true)
    expect(second.some((source) => !source.stopped || (source.stopAt ?? 0) > ctx.currentTime + 0.5)).toBe(true)
    const mane = sourcesOf(ctx, () => sfx.play('mane'))
    for (const source of mane) source.stopped = false
    sfx.play('mane', 1)
    expect(mane.some((source) => source.stopped)).toBe(false)
  })

  it('caps how many voices can pile up', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const one = sourcesOf(ctx, () => sfx.play('magic')).length
    const many = sourcesOf(ctx, () => {
      for (let i = 0; i < 40; i++) sfx.play('magic', i)
    }).length
    expect(many).toBeLessThan(one * 10)
  })

  it('plays nothing while disabled', () => {
    let on = false
    const { sfx } = setup({ enabled: () => on })
    sfx.unlock()
    for (const effect of LOSHADKA_EFFECTS) sfx.play(effect)
    expect(FakeContext.made).toHaveLength(0)
    on = true
    sfx.play('tap')
    const ctx = FakeContext.made[0]
    const before = ctx.sources.length
    on = false
    sfx.play('neigh')
    expect(ctx.sources.length).toBe(before)
  })

  it('ignores unknown effects', () => {
    const { sfx } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const made = sourcesOf(ctx, () => sfx.play('moo' as LoshadkaEffect))
    expect(made).toHaveLength(0)
  })

  it('waits for a suspended context, and a silence in between cancels the sound', async () => {
    FakeContext.initialState = 'suspended'
    const { sfx } = setup()
    sfx.play('tap')
    const ctx = FakeContext.made[0]
    expect(ctx.sources).toHaveLength(1)
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.sources.length).toBeGreaterThan(1)
    ctx.state = 'suspended'
    const before = ctx.sources.length
    sfx.play('neigh')
    sfx.silence()
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.sources.length).toBe(before)
  })

  it('stays quiet while the page is hidden and silences when it hides', () => {
    const hidden = setup({ hidden: true })
    hidden.sfx.play('neigh')
    expect(FakeContext.made).toHaveLength(0)
    vi.unstubAllGlobals()
    FakeContext.made = []
    const { sfx, doc, listeners } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const made = sourcesOf(ctx, () => sfx.play('bye'))
    for (const source of made) source.stopped = false
    doc.hidden = true
    listeners.get('visibilitychange')?.()
    expect(made.every((source) => source.stopped)).toBe(true)
  })

  it('destroy() silences and closes; a later unlock starts a fresh context', () => {
    const { sfx, listeners } = setup()
    sfx.unlock()
    const ctx = FakeContext.made[0]
    const made = sourcesOf(ctx, () => sfx.play('neigh'))
    for (const source of made) source.stopped = false
    sfx.destroy()
    expect(made.every((source) => source.stopped)).toBe(true)
    expect(ctx.closed).toBe(true)
    expect(listeners.has('visibilitychange')).toBe(false)
    sfx.play('neigh')
    expect(FakeContext.made).toHaveLength(1)
    sfx.unlock()
    expect(FakeContext.made).toHaveLength(2)
    expect(listeners.has('visibilitychange')).toBe(true)
    const fresh = FakeContext.made[1]
    expect(sourcesOf(fresh, () => sfx.play('neigh')).length).toBeGreaterThan(0)
    sfx.destroy()
    expect(fresh.closed).toBe(true)
  })
})

describe('the real neigh', () => {
  it('plays at 1.12–1.32 × speed, different per index', () => {
    const rates = [0, 1, 2, 3, 4].map(neighRate)
    expect(new Set(rates).size).toBe(5)
    for (const rate of [...rates, neighRate(-3), neighRate(Number.NaN), neighRate(99)]) {
      expect(rate).toBeGreaterThanOrEqual(1.12)
      expect(rate).toBeLessThanOrEqual(1.32 + 1e-9)
    }
  })

  it('unlock fetches it once; neigh uses the synth until it is decoded, then the sample', async () => {
    const { sfx, fetcher } = setup({ fetch: okFetch })
    sfx.unlock()
    const ctx = FakeContext.made[0]
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe(NEIGH_SAMPLE_URL)
    const before = ctx.oscillators.length
    sfx.play('neigh')
    expect(ctx.oscillators.length).toBeGreaterThan(before)
    expect(sfx.neighSample).toBe(false)
    await settle()
    expect(sfx.neighSample).toBe(true)
    sfx.unlock()
    expect(fetcher).toHaveBeenCalledTimes(1)

    const seen = new Set<number>()
    for (const index of [0, 1, 2, 3, 4]) {
      const oscillators = ctx.oscillators.length
      const made = sourcesOf(ctx, () => sfx.play('neigh', index))
      expect(ctx.oscillators.length, 'no synth once the sample is there').toBe(oscillators)
      expect(made).toHaveLength(1)
      const [source] = made
      expect(source.buffer).toBe(NEIGH_BUFFER)
      expect(source.started).toBe(true)
      const rate = source.playbackRate.value
      expect(rate).toBeCloseTo(neighRate(index), 9)
      seen.add(rate)
      // quieter than the full sample, starts silent, fades out after ~1.5 s, gone before the sample ends
      const gain = source.outputs[0] as FakeNode
      expect(gain.gain.value).toBe(0)
      const events = gain.gain.events
      const start = events[0][2]
      expect(Math.max(...events.map(([, value]) => value))).toBe(NEIGH_SAMPLE_GAIN)
      expect(NEIGH_SAMPLE_GAIN).toBeLessThan(1)
      expect(events.some(([kind, value, time]) => kind === 'set' && value === NEIGH_SAMPLE_GAIN && Math.abs(time - start - NEIGH_SAMPLE_FADE_AT) < 1e-9)).toBe(true)
      const [kind, value, end] = events[events.length - 1]
      expect([kind, value]).toEqual(['lin', 0])
      expect(end - start).toBeLessThanOrEqual(NEIGH_BUFFER.duration / rate + 1e-9)
      expect(end - start).toBeGreaterThan(NEIGH_SAMPLE_FADE_AT)
      expect(source.stopAt).toBeGreaterThanOrEqual(end)
      sfx.silence()
    }
    expect(seen.size).toBe(5)
  })

  it('silence() stops the sample, and a new neigh replaces the one still ringing', async () => {
    const { sfx } = setup({ fetch: okFetch })
    sfx.unlock()
    await settle()
    const ctx = FakeContext.made[0]
    const [first] = sourcesOf(ctx, () => sfx.play('neigh', 1))
    first.stopped = false
    const [second] = sourcesOf(ctx, () => sfx.play('neigh', 2))
    expect(first.stopped).toBe(true)
    second.stopped = false
    sfx.silence()
    expect(second.stopped).toBe(true)
    expect(second.stopAt ?? 99).toBeLessThanOrEqual(ctx.currentTime + 0.05)
  })

  it('falls back to the synthesized whinny when the file or decoding fails, and does not retry', async () => {
    for (const failure of ['fetch', 'status', 'decode'] as const) {
      FakeContext.made = []
      FakeContext.decoded = failure === 'decode' ? null : NEIGH_BUFFER
      const { sfx, fetcher } = setup({
        fetch: () =>
          failure === 'fetch'
            ? Promise.reject(new TypeError('offline'))
            : failure === 'status'
              ? Promise.resolve({ ok: false, status: 404, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })
              : okFetch(),
      })
      sfx.unlock()
      await settle()
      const ctx = FakeContext.made[0]
      expect(sfx.neighSample, failure).toBe(false)
      const before = ctx.oscillators.length
      sfx.play('neigh')
      expect(ctx.oscillators.length, failure).toBeGreaterThan(before)
      sfx.unlock()
      expect(fetcher, failure).toHaveBeenCalledTimes(1)
      vi.unstubAllGlobals()
    }
  })

  it('a muted unlock loads nothing; null neighUrl always synthesizes', async () => {
    const { sfx, fetcher } = setup({ enabled: () => false, fetch: okFetch })
    sfx.unlock()
    expect(fetcher).not.toHaveBeenCalled()
    const bare = new LoshadkaSfx(() => true, { neighUrl: null })
    bare.unlock()
    await settle()
    expect(fetcher).not.toHaveBeenCalled()
    expect(bare.neighSample).toBe(false)
  })

  it('works without fetch at all', () => {
    vi.stubGlobal('AudioContext', FakeContext)
    vi.stubGlobal('fetch', undefined)
    fakeDocument()
    const sfx = new LoshadkaSfx(() => true)
    expect(() => {
      sfx.unlock()
      sfx.play('neigh')
    }).not.toThrow()
    expect(FakeContext.made[0].oscillators.length).toBeGreaterThan(0)
  })
})

describe('createMaster', () => {
  it('sets the master gain and adds a soft guard', () => {
    vi.stubGlobal('AudioContext', FakeContext)
    const ctx = new FakeContext()
    const master = createMaster(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode) as unknown as FakeNode
    expect(master.gain.value).toBe(MASTER_GAIN)
    const guard = master.outputs[0] as FakeNode
    expect(guard.curve).toBeInstanceOf(Float32Array)
    const curve = guard.curve as Float32Array
    expect(Math.max(...curve)).toBeLessThan(0.9)
    expect(curve[Math.floor(curve.length / 2) + 100]).toBeCloseTo(((100 / (curve.length - 1)) * 2), 5)
    expect(guard.outputs[0]).toBe(ctx.destination)
  })

  it('connects straight through when a wave shaper is unavailable', () => {
    const ctx = new FakeContext()
    const bare = Object.assign(ctx, {
      createWaveShaper: () => {
        throw new Error('nope')
      },
    })
    const master = createMaster(bare as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode) as unknown as FakeNode
    expect(master.outputs[0]).toBe(ctx.destination)
  })
})
