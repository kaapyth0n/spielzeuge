import {
  FRAME_SIZE,
  VOWELS,
  analyzeFrame,
  classifyVowel,
  defaultVowelModel,
  type Vowel,
  type VowelModel,
} from './morozhenka-dsp.ts'

export type VoiceStatus = 'off' | 'starting' | 'on' | 'denied' | 'unsupported' | 'error'

export interface VoiceReading {
  /** 0…1 for the level meter, voice or not. */
  level: number
  /** A vowel is sounding loudly enough to push the scoop. */
  active: boolean
  /** The first active frame of a new sound — gives a little hop. */
  onset: boolean
  /** 0…1: louder voice, stronger fire. */
  power: number
  vowel: Vowel | null
  features: Float64Array | null
}

const SILENT: VoiceReading = { level: 0, active: false, onset: false, power: 0, vowel: null, features: null }

/** Gate above the room’s noise floor (dB) and absolute minimum (dBFS). */
const SENSITIVITY: Record<1 | 2 | 3, { margin: number; minimum: number }> = {
  1: { margin: 7, minimum: -68 },
  2: { margin: 11, minimum: -60 },
  3: { margin: 17, minimum: -50 },
}
const FLOOR_WINDOW = 300
const HISTORY = 6
const HANGOVER = 4

type AudioContextClass = typeof AudioContext

function audioContextClass(): AudioContextClass | null {
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/**
 * Listens to the microphone and turns vowels into steering. Everything is
 * analysed on the device; no audio is stored or sent anywhere.
 */
export class VoiceInput {
  status: VoiceStatus = 'off'
  sensitivity: 1 | 2 | 3 = 2
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private sink: GainNode | null = null
  private readonly buffer = new Float32Array(FRAME_SIZE)
  private readonly floorHistory = new Float32Array(FLOOR_WINDOW).fill(-60)
  private floorIndex = 0
  private floorFilled = 0
  private history: Vowel[] = []
  private voicedRun = 0
  private silentRun = 99
  private active = false
  private model: VowelModel = defaultVowelModel()
  private allowed: Vowel[] = [...VOWELS]
  private startToken = 0
  private readonly blocked: () => boolean

  constructor(blocked: () => boolean) {
    this.blocked = blocked
  }

  static supported(): boolean {
    return Boolean(navigator.mediaDevices?.getUserMedia) && audioContextClass() !== null
  }

  /** Learned fingerprints replace the built-in ones vowel by vowel. */
  setModel(learned: Partial<Record<Vowel, number[]>>, allowed: readonly Vowel[]): void {
    const base = defaultVowelModel()
    const model = {} as VowelModel
    for (const vowel of VOWELS) model[vowel] = learned[vowel] ?? base[vowel]
    this.model = model
    this.allowed = allowed.length ? [...allowed] : [...VOWELS]
    this.history = []
  }

  /** Call from a tap: iOS only unlocks audio inside a user gesture. */
  async start(): Promise<VoiceStatus> {
    if (this.status === 'on' || this.status === 'starting') return this.status
    const Ctx = audioContextClass()
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) {
      this.status = 'unsupported'
      return this.status
    }
    const token = ++this.startToken
    this.status = 'starting'
    try {
      this.ctx ??= new Ctx()
      void this.ctx.resume().catch(() => {})
    } catch {
      this.status = 'unsupported'
      return this.status
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Echo cancellation and noise suppression treat long vowels as noise.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      })
    } catch (error) {
      if (token !== this.startToken) return this.status
      const name = error instanceof DOMException ? error.name : ''
      this.status = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'error'
      return this.status
    }
    if (token !== this.startToken || !this.ctx) {
      stream.getTracks().forEach((track) => track.stop())
      return this.status
    }
    this.stream = stream
    const ctx = this.ctx
    this.source = ctx.createMediaStreamSource(stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = FRAME_SIZE
    this.analyser.smoothingTimeConstant = 0
    // Safari only runs nodes that reach the speakers; route through silence.
    this.sink = ctx.createGain()
    this.sink.gain.value = 0
    this.source.connect(this.analyser)
    this.analyser.connect(this.sink)
    this.sink.connect(ctx.destination)
    void ctx.resume().catch(() => {})
    this.floorFilled = 0
    this.status = 'on'
    return this.status
  }

  stop(): void {
    this.startToken++
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.source?.disconnect()
    this.analyser?.disconnect()
    this.sink?.disconnect()
    this.source = null
    this.analyser = null
    this.sink = null
    if (this.ctx) void this.ctx.close().catch(() => {})
    this.ctx = null
    this.reset()
    if (this.status === 'on' || this.status === 'starting') this.status = 'off'
  }

  pause(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => {})
    this.reset()
  }

  resume(): void {
    if (this.ctx && this.status === 'on') void this.ctx.resume().catch(() => {})
  }

  private reset(): void {
    this.history = []
    this.voicedRun = 0
    this.silentRun = 99
    this.active = false
  }

  private noiseFloor(db: number): number {
    this.floorHistory[this.floorIndex] = db
    this.floorIndex = (this.floorIndex + 1) % FLOOR_WINDOW
    this.floorFilled = Math.min(FLOOR_WINDOW, this.floorFilled + 1)
    let min = Infinity
    for (let i = 0; i < this.floorFilled; i++) min = Math.min(min, this.floorHistory[i])
    return Math.min(-30, Math.max(-90, min + 2))
  }

  /** Analyse the latest 2048 samples. Call once per animation frame. */
  read(): VoiceReading {
    if (this.status !== 'on' || !this.analyser || !this.ctx || this.ctx.state !== 'running') return SILENT
    this.analyser.getFloatTimeDomainData(this.buffer)
    return this.process(this.buffer, this.ctx.sampleRate)
  }

  /** The decision logic, separate from the Web Audio plumbing for tests. */
  process(samples: Float32Array, sampleRate: number): VoiceReading {
    const frame = analyzeFrame(samples, sampleRate)
    const floor = this.noiseFloor(frame.db)
    const { margin, minimum } = SENSITIVITY[this.sensitivity]
    const gate = Math.max(floor + margin, minimum)
    const level = Math.max(0, Math.min(1, (frame.db - floor) / 42))
    if (this.blocked()) {
      this.reset()
      return { ...SILENT, level }
    }
    const loud = frame.db >= gate
    const voiced = loud && frame.voiced && frame.features !== null
    if (voiced) {
      this.voicedRun++
      this.silentRun = 0
      const { vowel } = classifyVowel(frame.features!, this.model, this.allowed)
      this.history.push(vowel)
      if (this.history.length > HISTORY) this.history.shift()
    } else {
      this.voicedRun = 0
      this.silentRun++
      if (this.silentRun > 18) this.history = []
    }
    const wasActive = this.active
    this.active = voiced ? this.voicedRun >= 2 || wasActive : wasActive && this.silentRun <= HANGOVER
    if (!this.active) return { level, active: false, onset: false, power: 0, vowel: null, features: frame.features }
    return {
      level,
      active: true,
      onset: !wasActive,
      power: Math.max(0, Math.min(1, (frame.db - gate) / 24)),
      vowel: this.mostLikely(),
      features: voiced ? frame.features : null,
    }
  }

  /** Recent votes, newest weighted most, so the letter does not flicker. */
  private mostLikely(): Vowel | null {
    if (!this.history.length) return null
    const score = new Map<Vowel, number>()
    this.history.forEach((vowel, index) => score.set(vowel, (score.get(vowel) ?? 0) + 1 + index * 0.35))
    let best: Vowel | null = null
    let top = -1
    for (const [vowel, value] of score)
      if (value > top) {
        top = value
        best = vowel
      }
    return best
  }
}
