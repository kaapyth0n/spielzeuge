import { SPEECH_LOCALE, type Lang } from './languages.ts'

const CANCEL_GAP_MS = 60
const HOLD_MS = 8000

export class ToySpeech {
  private ready = false
  private generation = 0
  private playTimer: number | null = null
  private readonly held = new Set<SpeechSynthesisUtterance>()

  constructor() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    this.ready = true
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.speechSynthesis.getVoices()
    })
    window.speechSynthesis.getVoices()
  }

  /** Must run in the tap/click turn so iOS keeps the speech session unlocked. */
  prime(): void {
    if (!this.ready) return
    this.resumeEngine()
    const synth = window.speechSynthesis
    if (synth.speaking || synth.pending) return
    const priming = new SpeechSynthesisUtterance(' ')
    priming.volume = 0
    priming.rate = 1
    this.hold(priming)
    synth.speak(priming)
  }

  speak(word: string, lang: Lang): void {
    if (!this.ready) return
    const generation = ++this.generation
    const utterance = this.makeUtterance(word, lang)
    this.hold(utterance)

    const play = (): void => {
      if (generation !== this.generation) return
      this.resumeEngine()
      window.speechSynthesis.speak(utterance)
    }

    this.clearPlayTimer()
    const synth = window.speechSynthesis
    if (synth.speaking || synth.pending) {
      synth.cancel()
      this.playTimer = window.setTimeout(play, CANCEL_GAP_MS)
      return
    }
    play()
  }

  silence(): void {
    if (!this.ready) return
    this.generation += 1
    this.clearPlayTimer()
    window.speechSynthesis.cancel()
  }

  private makeUtterance(word: string, lang: Lang): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = SPEECH_LOCALE[lang]
    utterance.rate = 0.86
    utterance.pitch = 1
    utterance.volume = 1
    const voice = this.pickVoice(lang)
    if (voice) utterance.voice = voice
    const drop = (): void => {
      this.held.delete(utterance)
    }
    utterance.addEventListener('end', drop)
    utterance.addEventListener('error', drop)
    return utterance
  }

  private hold(utterance: SpeechSynthesisUtterance): void {
    this.held.add(utterance)
    window.setTimeout(() => this.held.delete(utterance), HOLD_MS)
  }

  private clearPlayTimer(): void {
    if (this.playTimer === null) return
    window.clearTimeout(this.playTimer)
    this.playTimer = null
  }

  private resumeEngine(): void {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
  }

  private pickVoice(lang: Lang): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) return null

    const locale = SPEECH_LOCALE[lang].toLowerCase()
    const prefix = lang
    const preferred = /milena|katya|yuri|anna|petra|helena|serena|samantha|martha|daniel|google|premium|enhanced|natural/i

    const matches = voices.filter((voice) => {
      const tag = voice.lang.replace('_', '-').toLowerCase()
      return tag === locale || tag.startsWith(`${prefix}-`) || tag.startsWith(prefix)
    })
    if (matches.length === 0) return null

    const local = matches.filter((voice) => voice.localService)
    const pool = local.length > 0 ? local : matches
    return pool.find((voice) => preferred.test(voice.name)) ?? pool[0] ?? null
  }
}
