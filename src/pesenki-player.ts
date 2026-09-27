/**
 * Песенки — the song player.
 *
 * One decoded song, played with Web Audio so it can stop exactly between
 * lines, change speed like a tape (the pitch follows, which is the fun part)
 * and run backwards («уй-уй-уй») from a reversed copy of the buffer.
 * Position is tracked from the audio clock, never from timers.
 */

type AudioContextClass = typeof AudioContext

function audioContextClass(): AudioContextClass | null {
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

interface Voice {
  source: AudioBufferSourceNode
  gain: GainNode
  /** Audio-clock time when `pos` was true, the direction and speed since then. */
  t0: number
  pos0: number
  rate: number
  dir: 1 | -1
  /** Scheduled stop (audio-clock time) and where the song will be then. */
  stopT: number | null
  stopPos: number | null
}

export type PlayerState = 'empty' | 'loading' | 'ready' | 'error'

export class SongPlayer {
  ctx: AudioContext | null = null
  private master: GainNode | null = null
  private bus: GainNode | null = null
  private buffer: AudioBuffer | null = null
  private reversed: AudioBuffer | null = null
  private voice: Voice | null = null
  private stoppedAt = 0
  private loadToken = 0
  state: PlayerState = 'empty'
  url = ''
  /** Set by tests and by the page when sound is off: the song keeps time silently. */
  private muted = false
  /** Called when the system suspends or interrupts audio (phone call, other app, locked screen). */
  onInterrupted: (() => void) | null = null

  /** Must run inside a user gesture on iOS. */
  unlock(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctx = audioContextClass()
        if (!Ctx) return null
        // iOS: play songs even when the ringer switch is on silent.
        const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
        if (session) session.type = 'playback'
        this.ctx = new Ctx({ latencyHint: 'interactive' })
        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0 : 1
        this.master.connect(this.ctx.destination)
        this.bus = this.ctx.createGain()
        this.bus.connect(this.master)
        const ctx = this.ctx
        ctx.addEventListener('statechange', () => {
          if (ctx.state !== 'running' && this.voice) this.onInterrupted?.()
        })
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {})
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  /** Where effects should connect so that mute covers them too. */
  get output(): AudioNode | null {
    return this.master
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.03)
  }

  get duration(): number {
    return this.buffer?.duration ?? 0
  }

  async load(url: string, onProgress?: (fraction: number) => void): Promise<boolean> {
    if (this.url === url && this.state === 'ready') return true
    const token = ++this.loadToken
    this.halt()
    this.buffer = null
    this.reversed = null
    this.url = url
    this.state = 'loading'
    try {
      const ctx = this.ctx ?? this.unlock()
      if (!ctx) throw new Error('no audio')
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const total = Number(response.headers.get('content-length')) || 0
      let bytes: ArrayBuffer
      if (response.body && total > 0 && onProgress) {
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (token !== this.loadToken) return false
          chunks.push(value)
          received += value.length
          onProgress(Math.min(0.97, received / total))
        }
        const joined = new Uint8Array(received)
        let offset = 0
        for (const chunk of chunks) {
          joined.set(chunk, offset)
          offset += chunk.length
        }
        bytes = joined.buffer
      } else {
        bytes = await response.arrayBuffer()
      }
      if (token !== this.loadToken) return false
      const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
        // Old Safari only has the callback form.
        const maybe = ctx.decodeAudioData(bytes, resolve, reject) as Promise<AudioBuffer> | undefined
        maybe?.catch?.(reject)
      })
      if (token !== this.loadToken) return false
      this.buffer = buffer
      this.state = 'ready'
      onProgress?.(1)
      return true
    } catch {
      if (token === this.loadToken) this.state = 'error'
      return false
    }
  }

  /** Release the decoded song (they are large on iPad). */
  unload(): void {
    this.loadToken++
    this.halt()
    this.buffer = null
    this.reversed = null
    this.url = ''
    this.state = 'empty'
  }

  get playing(): boolean {
    const v = this.voice
    if (!v || !this.ctx) return false
    return v.stopT === null || this.ctx.currentTime < v.stopT
  }

  get direction(): 1 | -1 {
    return this.voice?.dir ?? 1
  }

  /** Song position being rendered right now. */
  position(at = this.ctx?.currentTime ?? 0): number {
    const v = this.voice
    if (!v) return this.stoppedAt
    const t = v.stopT !== null ? Math.min(at, v.stopT) : at
    const pos = v.pos0 + v.dir * v.rate * Math.max(0, t - v.t0)
    return Math.max(0, Math.min(this.duration, pos))
  }

  /** Song position that is reaching the ears (after output latency): for visuals and beat taps. */
  audible(): number {
    if (!this.ctx) return this.position()
    const latency = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)
    return this.position(this.ctx.currentTime - Math.min(0.3, latency))
  }

  play(from: number, rate: number, fade = 0.03): void {
    const ctx = this.ctx
    if (!ctx || !this.buffer || !this.bus) return
    const now = ctx.currentTime
    const v = this.voice
    // Continuing exactly where a scheduled stop will land: splice seamlessly.
    if (v && v.dir === 1 && v.stopT !== null && v.stopPos !== null && Math.abs(v.stopPos - from) < 0.02 && v.stopT > now + 0.012) {
      // Keep the old voice at full level up to the splice, then crossfade in 8 ms.
      v.gain.gain.cancelScheduledValues(now)
      v.gain.gain.setValueAtTime(v.gain.gain.value, now)
      v.gain.gain.linearRampToValueAtTime(1, now + 0.01)
      v.gain.gain.setValueAtTime(1, v.stopT)
      v.gain.gain.linearRampToValueAtTime(0.0001, v.stopT + 0.008)
      this.startVoice(this.buffer, from, rate, 1, v.stopT, 0.008)
      return
    }
    this.halt(0.02)
    this.startVoice(this.buffer, from, rate, 1, now + 0.005, fade)
  }

  /** Play backwards from `from` (song time) towards the start. */
  reverse(from: number, rate: number): void {
    const ctx = this.ctx
    if (!ctx || !this.buffer || !this.bus) return
    this.reversed ??= reverseBuffer(ctx, this.buffer)
    this.halt(0.02)
    this.startVoice(this.reversed, from, rate, -1, ctx.currentTime + 0.005, 0.03)
  }

  setRate(rate: number): void {
    const v = this.voice
    const ctx = this.ctx
    if (!v || !ctx) return
    const now = ctx.currentTime
    if (v.stopT !== null && now >= v.stopT) return
    const pos = this.position(now)
    v.pos0 = pos
    v.t0 = now
    v.rate = Math.max(0.01, rate)
    v.source.playbackRate.cancelScheduledValues(now)
    v.source.playbackRate.setValueAtTime(v.rate, now)
    if (v.stopPos !== null && v.dir === 1) this.scheduleStop(v, v.stopPos)
  }

  /** Stop exactly at a song position ahead of the playhead (forward only). */
  stopAt(pos: number): void {
    const v = this.voice
    if (!v || v.dir !== 1) return
    this.scheduleStop(v, pos)
  }

  /** Stop now (short fade to avoid a click). */
  stop(fade = 0.04): void {
    this.halt(fade)
  }

  /** Gentle fade of the song bus, e.g. at the end of a song. */
  fadeOut(seconds: number): void {
    if (!this.ctx || !this.bus) return
    const now = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setValueAtTime(this.bus.gain.value, now)
    this.bus.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, seconds))
  }

  /** Short duck under narration or a big effect. */
  duck(level: number, seconds = 0.08): void {
    if (!this.ctx || !this.bus) return
    const now = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(level, now, seconds)
  }

  destroy(): void {
    this.unload()
    try {
      void this.ctx?.close()
    } catch {
      // already closed
    }
    this.ctx = null
    this.master = null
    this.bus = null
  }

  private startVoice(buffer: AudioBuffer, songPos: number, rate: number, dir: 1 | -1, at: number, fade: number): void {
    const ctx = this.ctx!
    const bus = this.bus!
    const duration = buffer.duration
    const clamped = Math.max(0, Math.min(duration - 0.01, songPos))
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = Math.max(0.01, rate)
    const gain = ctx.createGain()
    if (fade > 0) {
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.linearRampToValueAtTime(1, at + fade)
    } else gain.gain.value = 1
    source.connect(gain).connect(bus)
    // Songs end cleanly: the bus might have been faded by the previous ending.
    bus.gain.cancelScheduledValues(ctx.currentTime)
    bus.gain.setValueAtTime(1, ctx.currentTime)
    const offset = dir === 1 ? clamped : Math.max(0, duration - clamped)
    source.start(at, offset)
    const voice: Voice = { source, gain, t0: at, pos0: clamped, rate: Math.max(0.01, rate), dir, stopT: null, stopPos: null }
    source.onended = () => {
      if (this.voice === voice) {
        this.stoppedAt = dir === 1 ? Math.min(duration, this.position()) : this.position()
        this.voice = null
      }
    }
    this.voice = voice
  }

  private scheduleStop(v: Voice, pos: number): void {
    const ctx = this.ctx!
    const now = ctx.currentTime
    const current = this.position(now)
    const ahead = Math.max(0, pos - current) / v.rate
    const stopT = now + ahead
    v.stopT = stopT
    v.stopPos = pos
    v.gain.gain.cancelScheduledValues(now)
    v.gain.gain.setValueAtTime(v.gain.gain.value || 1, now)
    const fadeFrom = Math.max(now, stopT - 0.045)
    v.gain.gain.setValueAtTime(1, fadeFrom)
    v.gain.gain.linearRampToValueAtTime(0.0001, stopT)
    try {
      v.source.stop(stopT + 0.01)
    } catch {
      // stop() may be called once in old Safari; the gain ramp still silences it.
    }
  }

  private halt(fade = 0.03): void {
    const v = this.voice
    const ctx = this.ctx
    if (!v || !ctx) {
      this.voice = null
      return
    }
    const now = ctx.currentTime
    this.stoppedAt = this.position(now)
    this.voice = null
    try {
      v.gain.gain.cancelScheduledValues(now)
      v.gain.gain.setValueAtTime(v.gain.gain.value, now)
      v.gain.gain.linearRampToValueAtTime(0.0001, now + fade)
      v.source.onended = null
      v.source.stop(now + fade + 0.01)
    } catch {
      // Already stopped.
    }
  }
}

export function reverseBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0, j = src.length - 1; j >= 0; i++, j--) dst[i] = src[j]
  }
  return out
}
