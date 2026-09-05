import { LANG_LABEL, SPEECH_LOCALE, type Lang } from './languages.ts'

/** Narrate changed screen text and taps, without reading the whole room on each render. */
export class PuppyNarration {
  private previous = new Set<string>()
  private pending: string[] = []
  private scheduled = false
  private generation = 0
  private playTimers = new Set<number>()
  private held = new Set<SpeechSynthesisUtterance>()
  private blocked = false

  private preferences: () => { lang: Lang; enabled: boolean }

  constructor(preferences: () => { lang: Lang; enabled: boolean }) {
    this.preferences = preferences
    if (!this.supported()) return
    window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener('voiceschanged', () =>
      window.speechSynthesis.getVoices(),
    )
  }

  private supported(): boolean {
    return (
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    )
  }

  /** Called synchronously from a gesture, including touch and keyboard activation. */
  begin(label: string): void {
    if (this.blocked) this.previous.clear()
    this.silence()
    if (this.supported() && this.preferences().enabled) {
      const synth = window.speechSynthesis
      if (synth.paused) synth.resume()
      // A silent utterance inside the gesture unlocks delayed feedback on iOS.
      const prime = new SpeechSynthesisUtterance(' ')
      prime.volume = 0
      prime.lang = SPEECH_LOCALE[this.preferences().lang]
      synth.speak(prime)
    }
    this.blocked = false
    this.announce([label])
  }

  languageChanged(): void {
    this.previous.clear()
    this.begin(LANG_LABEL[this.preferences().lang])
  }

  observe(root: HTMLElement): void {
    const texts = screenText(root)
    const added = texts.filter((text) => !this.previous.has(text))
    this.previous = new Set(texts)
    if (!this.preferences().enabled) {
      this.silence()
      return
    }
    this.announce(added)
  }

  announce(texts: string[]): void {
    if (!this.supported() || !this.preferences().enabled || document.hidden)
      return
    for (const text of texts) {
      const clean = text
        .replace(/[♥✧↗✓]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (clean && !this.pending.includes(clean)) this.pending.push(clean)
    }
    if (this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      this.flush()
    })
  }

  silence(): void {
    this.generation++
    this.pending = []
    this.playTimers.forEach((id) => clearTimeout(id))
    this.playTimers.clear()
    this.held.clear()
    if (this.supported()) window.speechSynthesis.cancel()
  }

  private flush(): void {
    if (!this.pending.length || !this.preferences().enabled || this.blocked)
      return
    const { lang } = this.preferences()
    const texts = this.pending
    this.pending = []
    for (const text of texts) this.enqueue(text, lang)
  }

  private enqueue(text: string, lang: Lang): void {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LOCALE[lang]
    utterance.rate = 0.86
    const voices = window.speechSynthesis
      .getVoices()
      .filter(
        (voice) =>
          voice.lang.replace('_', '-').toLowerCase().split('-')[0] === lang,
      )
    utterance.voice =
      voices.find((voice) => voice.localService) ?? voices[0] ?? null
    this.held.add(utterance)
    const generation = this.generation
    utterance.onend = () => this.held.delete(utterance)
    utterance.onerror = (event) => {
      this.held.delete(utterance)
      // Browsers may block speech before the first user gesture. The next tap retries.
      if (generation === this.generation && event.error === 'not-allowed')
        this.blocked = true
    }
    // A small gap after cancellation avoids Safari dropping the next utterance.
    // Calls in subsequent turns append to the engine's queue, never overlap.
    const timer = window.setTimeout(() => {
      this.playTimers.delete(timer)
      if (
        generation === this.generation &&
        this.preferences().enabled &&
        !document.hidden
      ) {
        const synth = window.speechSynthesis
        if (synth.paused) synth.resume()
        synth.speak(utterance)
      }
    }, 60)
    this.playTimers.add(timer)
  }
}

/** Labels of controls, visible prose, and meaningful counters, in reading order. */
export function screenText(root: HTMLElement): string[] {
  const selectors = [
    'a',
    '.eyebrow',
    'h1',
    '.friendship',
    '#screen-title',
    'button',
    '#puppy-language',
    '#food-bowl',
    '.round-dots',
    '.bouquet',
    '.games-note',
    '.win-scene h2',
    '.win-scene p',
    '#message',
    '.puppy-footer span',
  ].join(',')
  return [
    ...new Set(
      Array.from(root.querySelectorAll<HTMLElement>(selectors))
        .map((node) => {
          if (node.id === 'puppy-language')
            return node.getAttribute('aria-label') ?? ''
          if (node.classList.contains('friendship')) return node.innerText
          if (node.classList.contains('game-card'))
            return node.innerText.replace(/\n/g, '. ')
          return node.getAttribute('aria-label') ?? node.innerText
        })
        .map((text) => text.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ]
}
