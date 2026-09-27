import { SPEECH_LOCALE, type Lang } from './languages.ts'

/**
 * One short listening turn with the browser's speech recogniser.
 * Chrome sends the sound to Google unless it can recognise on the device;
 * Safari uses Apple's recogniser. Nothing is recorded or kept by the game.
 */

export type HearError = 'unsupported' | 'denied' | 'service' | 'no-speech' | 'network' | 'audio' | 'aborted' | 'other'

export interface Heard {
  /** Alternatives of the final result, best first (or of the last partial one if no final came). */
  transcripts: string[]
  error: HearError | null
}

interface RecognitionAlternative {
  transcript: string
}
interface RecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: RecognitionAlternative
}
interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; [index: number]: RecognitionResult }
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  processLocally?: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onaudiostart: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
interface RecognitionConstructor {
  new (): Recognition
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>
}

/** Listening time once the microphone is really open. */
const LISTEN_MS = 7000
/** Engines that never report `end` are released after this. */
const SAFETY_MS = 9500
/** Permission prompts can take a while before the microphone opens. */
const OPEN_MS = 30000

function constructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function mapError(error: string): HearError {
  switch (error) {
    case 'not-allowed':
      return 'denied'
    case 'service-not-allowed':
      return 'service'
    case 'no-speech':
      return 'no-speech'
    case 'network':
      return 'network'
    case 'audio-capture':
      return 'audio'
    case 'aborted':
      return 'aborted'
    case 'language-not-supported':
      return 'unsupported'
    default:
      return 'other'
  }
}

/** One hypothesis per event: results that follow each other are one sentence, not alternatives. */
function hypotheses(event: RecognitionEvent): { texts: string[]; final: boolean } {
  const results = event.results
  const count = results.length
  if (!count) return { texts: [], final: false }
  const last = results[count - 1]
  const final = Boolean(last?.isFinal)
  if (count === 1) {
    const texts: string[] = []
    for (let j = 0; j < last.length; j++) {
      const text = last[j]?.transcript?.trim()
      if (text && !texts.includes(text)) texts.push(text)
    }
    return { texts, final }
  }
  const joined = Array.from({ length: count }, (_, i) => results[i]?.[0]?.transcript ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { texts: joined ? [joined] : [], final }
}

export class Listener {
  private current: Recognition | null = null
  private cancel: (() => void) | null = null
  private finishSoon: (() => void) | null = null
  private readonly local = new Map<Lang, boolean>()

  static supported(): boolean {
    return constructor() !== null
  }

  get listening(): boolean {
    return this.current !== null
  }

  /** Ask once whether this language can be recognised on the device (Chrome). */
  async prepare(lang: Lang): Promise<void> {
    const Ctor = constructor()
    if (!Ctor?.available || this.local.has(lang)) return
    try {
      const state = await Ctor.available({ langs: [SPEECH_LOCALE[lang]], processLocally: true })
      this.local.set(lang, state === 'available')
    } catch {
      this.local.set(lang, false)
    }
  }

  /**
   * Starts listening. Call it inside the tap so iOS allows the microphone.
   * `early` sees each final result; returning true ends the turn at once.
   */
  listen(lang: Lang, early: (transcripts: string[]) => boolean, onSpeech?: () => void): Promise<Heard> {
    this.abort()
    const Ctor = constructor()
    if (!Ctor) return Promise.resolve({ transcripts: [], error: 'unsupported' })
    let recognition: Recognition
    try {
      recognition = new Ctor()
    } catch {
      return Promise.resolve({ transcripts: [], error: 'unsupported' })
    }
    recognition.lang = SPEECH_LOCALE[lang]
    recognition.interimResults = true
    recognition.maxAlternatives = 5
    recognition.continuous = false
    const onDevice = Boolean(this.local.get(lang) && 'processLocally' in recognition)
    if (onDevice) {
      try {
        recognition.processLocally = true
      } catch {
        // Older engines keep the default.
      }
    }

    let finals: string[] = []
    let partial: string[] = []
    let error: HearError | null = null
    let done = false
    let ended = false
    let opened = false
    const timers: number[] = []

    return new Promise<Heard>((resolve) => {
      const end = (cancelled = false): void => {
        if (done) return
        done = true
        timers.forEach((t) => window.clearTimeout(t))
        if (this.current === recognition) this.current = null
        this.cancel = null
        this.finishSoon = null
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        recognition.onspeechstart = null
        recognition.onaudiostart = null
        // A turn released by a timer or a cancel must not leave the microphone open.
        if (!ended) {
          try {
            recognition.abort()
          } catch {
            // already stopped
          }
        }
        if (cancelled) {
          resolve({ transcripts: [], error: 'aborted' })
          return
        }
        const transcripts = finals.length ? finals : partial
        resolve({ transcripts, error: transcripts.length ? null : error })
      }
      this.cancel = () => end(true)
      this.finishSoon = () => {
        try {
          recognition.stop()
        } catch {
          end()
        }
      }

      const armListening = (): void => {
        if (opened) return
        opened = true
        timers.push(
          window.setTimeout(() => {
            try {
              recognition.stop()
            } catch {
              // already stopped
            }
          }, LISTEN_MS),
        )
        timers.push(window.setTimeout(() => end(), SAFETY_MS))
      }

      recognition.onresult = (event) => {
        armListening()
        const { texts, final } = hypotheses(event)
        if (!texts.length) return
        if (!final) {
          partial = texts
          return
        }
        finals = texts
        if (early(finals)) end()
      }
      recognition.onerror = (event) => {
        error = mapError(event.error)
        if (error === 'service' && onDevice) this.local.set(lang, false)
        if (error === 'denied' || error === 'service' || error === 'unsupported' || error === 'audio') end()
      }
      recognition.onend = () => {
        ended = true
        end()
      }
      recognition.onaudiostart = () => armListening()
      recognition.onspeechstart = () => {
        armListening()
        onSpeech?.()
      }

      try {
        recognition.start()
        this.current = recognition
      } catch {
        error = 'other'
        ended = true
        end()
        return
      }
      // Engines that never report the microphone opening are still released.
      timers.push(window.setTimeout(() => end(), OPEN_MS))
    })
  }

  /** The child tapped the microphone again: finish with what was said so far. */
  stop(): void {
    this.finishSoon?.()
  }

  /** Cancels the turn: nothing heard in it is judged. */
  abort(): void {
    this.cancel?.()
    this.current = null
  }
}
