import { SPEECH_LOCALE, type Lang } from './languages.ts'

export class ToySpeech {
  private ready = false

  constructor() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    this.ready = true
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.speechSynthesis.getVoices()
    })
    window.speechSynthesis.getVoices()
  }

  prime(): void {
    if (!this.ready) return
    window.speechSynthesis.cancel()
    const priming = new SpeechSynthesisUtterance(' ')
    priming.volume = 0
    priming.rate = 1
    window.speechSynthesis.speak(priming)
  }

  speak(word: string, lang: Lang): void {
    if (!this.ready) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = SPEECH_LOCALE[lang]
    utterance.rate = 0.86
    utterance.pitch = 1
    utterance.volume = 1
    const voice = this.pickVoice(lang)
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  silence(): void {
    if (!this.ready) return
    window.speechSynthesis.cancel()
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

    return (
      matches.find((voice) => preferred.test(voice.name)) ??
      matches[0] ??
      null
    )
  }
}
