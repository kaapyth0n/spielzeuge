import type { VisitorId } from './visitors.ts'

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

export class ToyAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0.72
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  knock(offset = 0): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const t = ctx.currentTime + offset

    const thump = ctx.createOscillator()
    const thumpGain = ctx.createGain()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(150, t)
    thump.frequency.exponentialRampToValueAtTime(46, t + 0.1)
    thumpGain.gain.setValueAtTime(0.7, t)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    thump.connect(thumpGain).connect(master)
    thump.start(t)
    thump.stop(t + 0.15)

    const slap = ctx.createBufferSource()
    slap.buffer = noiseBuffer(ctx, 0.08)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 380
    band.Q.value = 1.1
    const slapGain = ctx.createGain()
    slapGain.gain.setValueAtTime(0.42, t)
    slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    slap.connect(band).connect(slapGain).connect(master)
    slap.start(t)
  }

  knocks(): void {
    this.knock(0)
    this.knock(0.3)
    this.knock(0.52)
  }

  creak(): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const t = ctx.currentTime + 0.08

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(196, t)
    osc.frequency.exponentialRampToValueAtTime(84, t + 0.7)
    gain.gain.setValueAtTime(0.03, t)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.2)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(700, t)
    filter.frequency.linearRampToValueAtTime(280, t + 0.7)
    filter.Q.value = 6
    osc.connect(filter).connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.78)
  }

  latch(): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const t = ctx.currentTime

    const click = ctx.createOscillator()
    const clickGain = ctx.createGain()
    click.type = 'square'
    click.frequency.value = 920
    clickGain.gain.setValueAtTime(0.05, t)
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    click.connect(clickGain).connect(master)
    click.start(t)
    click.stop(t + 0.05)

    const wood = ctx.createOscillator()
    const woodGain = ctx.createGain()
    wood.type = 'sine'
    wood.frequency.setValueAtTime(110, t)
    wood.frequency.exponentialRampToValueAtTime(50, t + 0.08)
    woodGain.gain.setValueAtTime(0.28, t)
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    wood.connect(woodGain).connect(master)
    wood.start(t)
    wood.stop(t + 0.11)
  }

  visitor(id: VisitorId): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const t = ctx.currentTime + 0.02

    switch (id) {
      case 'cat':
        this.meow(t)
        break
      case 'dog':
        this.woof(t)
        break
      case 'bird':
        this.chirp(t)
        break
      case 'duck':
        this.quack(t)
        break
      case 'bunny':
        this.hop(t)
        break
      case 'mouse':
        this.squeak(t)
        break
      case 'cow':
        this.moo(t)
        break
      case 'bear':
        this.huff(t)
        break
    }
  }

  private tone(
    t: number,
    freq: number,
    endFreq: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), t + duration)
    gain.gain.setValueAtTime(gainValue, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  private meow(t: number): void {
    this.tone(t, 720, 380, 0.28, 0.18, 'triangle')
    this.tone(t + 0.12, 640, 300, 0.32, 0.14, 'triangle')
  }

  private woof(t: number): void {
    this.tone(t, 180, 90, 0.12, 0.32, 'square')
    this.tone(t + 0.14, 160, 70, 0.16, 0.28, 'square')
  }

  private chirp(t: number): void {
    this.tone(t, 1400, 1800, 0.08, 0.1)
    this.tone(t + 0.1, 1600, 2100, 0.07, 0.09)
    this.tone(t + 0.2, 1500, 1900, 0.09, 0.08)
  }

  private quack(t: number): void {
    this.tone(t, 340, 220, 0.14, 0.22, 'sawtooth')
    this.tone(t + 0.16, 320, 200, 0.16, 0.18, 'sawtooth')
  }

  private hop(t: number): void {
    this.tone(t, 90, 50, 0.08, 0.22)
    this.tone(t + 0.09, 70, 40, 0.07, 0.16)
  }

  private squeak(t: number): void {
    this.tone(t, 1800, 2200, 0.07, 0.08, 'triangle')
    this.tone(t + 0.09, 2000, 2400, 0.06, 0.07, 'triangle')
  }

  private moo(t: number): void {
    this.tone(t, 140, 90, 0.55, 0.24, 'sawtooth')
    this.tone(t + 0.05, 148, 96, 0.5, 0.1, 'triangle')
  }

  private huff(t: number): void {
    this.tone(t, 110, 70, 0.22, 0.26)
    this.tone(t + 0.2, 90, 55, 0.28, 0.2)
  }
}
