import { ToyAudio } from './audio.ts'
import { PARENT_COPY, loadLang, saveLang, type Lang } from './languages.ts'
import { ToySpeech } from './speech.ts'
import {
  VISITOR_IDS,
  shuffleBag,
  visitorById,
  type Visitor,
  type VisitorId,
} from './visitors.ts'

type Phase = 'boot' | 'closed' | 'knocking' | 'waiting' | 'opening' | 'open' | 'closing'

const OPEN_MS = 1080
const CLOSE_MS = 920
const SPEAK_AFTER_OPEN_MS = 420
const HOLD_OPEN_MS = 7800
const BETWEEN_VISITS_MS = 1300
const FIRST_KNOCK_MS = 1100
const REKNOCK_MS = 5600
const MAX_UNANSWERED = 3
const GREET_COOLDOWN_MS = 900
const PARENT_HOLD_MS = 720

export class Game {
  private readonly world: HTMLElement
  private readonly doorway: HTMLElement
  private readonly door: HTMLButtonElement
  private readonly slot: HTMLElement
  private readonly sheet: HTMLElement
  private readonly live: HTMLElement
  private readonly langButtons: HTMLButtonElement[]
  private readonly parentHint: HTMLElement

  private readonly audio = new ToyAudio()
  private readonly speech = new ToySpeech()

  private phase: Phase = 'boot'
  private lang: Lang = loadLang()
  private bag: VisitorId[] = []
  private current: Visitor | null = null
  private unanswered = 0
  private lastGreet = 0
  private parentHold: number | null = null
  private readonly timers = new Set<number>()

  constructor(root: HTMLElement) {
    this.world = this.must(root, '.world')
    this.doorway = this.must(root, '#doorway')
    this.door = this.must(root, '#door') as HTMLButtonElement
    this.slot = this.must(root, '#visitor-slot')
    this.sheet = this.must(root, '#parent-sheet')
    this.live = this.must(root, '#live')
    this.parentHint = this.must(root, '#parent-hint')
    this.langButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-lang]')]
  }

  start(): void {
    this.applyLang(this.lang, false)
    this.bind()
    this.setPhase('closed')
    this.later(FIRST_KNOCK_MS, () => {
      if (this.phase === 'closed') this.knock()
    })
  }

  private bind(): void {
    this.world.addEventListener('pointerdown', (event) => {
      void this.onPointerDown(event)
    })
    this.world.addEventListener('pointerup', () => this.cancelParentHold())
    this.world.addEventListener('pointercancel', () => this.cancelParentHold())
    this.world.addEventListener('pointerleave', () => this.cancelParentHold())

    this.door.addEventListener('click', (event) => {
      event.preventDefault()
    })

    this.slot.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      void this.onVisitorTap()
    })

    for (const button of this.langButtons) {
      button.addEventListener('click', () => {
        const next = button.dataset.lang
        if (next === 'ru' || next === 'de' || next === 'en') {
          this.applyLang(next, true)
          this.hideParent()
        }
      })
    }

    this.sheet.addEventListener('click', (event) => {
      if (event.target === this.sheet) this.hideParent()
    })

    window.addEventListener('keydown', (event) => this.onKey(event))

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.speech.silence()
    })

    document.addEventListener('contextmenu', (event) => event.preventDefault())
    document.addEventListener(
      'touchmove',
      (event) => {
        event.preventDefault()
      },
      { passive: false },
    )
    document.addEventListener('gesturestart', (event) => event.preventDefault())
  }

  private async onPointerDown(event: PointerEvent): Promise<void> {
    const target = event.target
    if (!(target instanceof Element)) return
    if (this.sheet.classList.contains('is-open')) return

    if (target.closest('#sconce')) {
      this.beginParentHold()
      return
    }

    await this.unlockVoice()

    if (this.phase === 'open') {
      if (this.current) this.greet(this.current)
      this.scheduleClose()
      return
    }

    if (this.phase === 'waiting' || this.phase === 'knocking') {
      this.openDoor()
      return
    }

    if (this.phase === 'closed') {
      this.knock()
    }
  }

  private async onVisitorTap(): Promise<void> {
    if (this.phase !== 'open' || !this.current) return
    await this.unlockVoice()
    this.greet(this.current)
    this.scheduleClose()
  }

  private beginParentHold(): void {
    this.cancelParentHold()
    this.parentHold = window.setTimeout(() => {
      this.parentHold = null
      this.showParent()
    }, PARENT_HOLD_MS)
  }

  private cancelParentHold(): void {
    if (this.parentHold !== null) {
      window.clearTimeout(this.parentHold)
      this.parentHold = null
    }
  }

  private showParent(): void {
    this.sheet.hidden = false
    this.sheet.classList.add('is-open')
    this.langButtons[0]?.focus()
  }

  private hideParent(): void {
    this.sheet.classList.remove('is-open')
    this.sheet.hidden = true
  }

  private applyLang(lang: Lang, persist: boolean): void {
    this.lang = lang
    if (persist) saveLang(lang)
    document.documentElement.lang = lang === 'ru' ? 'ru' : lang === 'de' ? 'de' : 'en'
    this.world.dataset.lang = lang
    this.parentHint.textContent = PARENT_COPY[lang].hint
    for (const button of this.langButtons) {
      const active = button.dataset.lang === lang
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
    this.door.setAttribute('aria-label', this.doorLabel())
  }

  private doorLabel(): string {
    if (this.lang === 'ru') return 'Дверь'
    if (this.lang === 'de') return 'Tür'
    return 'Door'
  }

  private knock(): void {
    if (this.phase === 'knocking' || this.phase === 'opening' || this.phase === 'open') return
    this.setPhase('knocking')
    this.doorway.classList.add('is-knocking')
    this.audio.knocks()
    this.later(620, () => {
      this.doorway.classList.remove('is-knocking')
      if (this.phase !== 'knocking') return
      this.setPhase('waiting')
      this.unanswered += 1
      if (this.unanswered <= MAX_UNANSWERED) {
        this.later(REKNOCK_MS, () => {
          if (this.phase === 'waiting') this.knock()
        })
      }
    })
  }

  private openDoor(): void {
    if (this.phase !== 'waiting' && this.phase !== 'knocking') return
    this.clearTimers()
    this.doorway.classList.remove('is-knocking')
    this.unanswered = 0
    const visitor = this.nextVisitor()
    this.current = visitor
    this.renderVisitor(visitor)
    this.setPhase('opening')
    this.doorway.classList.add('is-open')
    this.audio.latch()
    this.audio.creak()
    this.later(SPEAK_AFTER_OPEN_MS, () => {
      if (this.current) this.greet(this.current)
    })
    this.later(OPEN_MS, () => {
      if (this.phase !== 'opening') return
      this.setPhase('open')
      this.scheduleClose()
    })
  }

  private scheduleClose(): void {
    this.clearTimers()
    this.later(HOLD_OPEN_MS, () => this.closeDoor())
  }

  private closeDoor(): void {
    if (this.phase !== 'open' && this.phase !== 'opening') return
    this.clearTimers()
    this.setPhase('closing')
    this.doorway.classList.remove('is-open')
    this.slot.classList.add('is-leaving')
    this.audio.creak()
    this.later(CLOSE_MS - 80, () => this.audio.latch())
    this.later(CLOSE_MS, () => {
      this.slot.replaceChildren()
      this.slot.className = 'visitor-slot'
      this.current = null
      this.setPhase('closed')
      this.later(BETWEEN_VISITS_MS, () => {
        if (this.phase === 'closed') this.knock()
      })
    })
  }

  private greet(visitor: Visitor): void {
    const now = performance.now()
    if (now - this.lastGreet < GREET_COOLDOWN_MS) return
    this.lastGreet = now
    this.slot.classList.remove('is-greeting')
    void this.slot.offsetWidth
    this.slot.classList.add('is-greeting')
    this.audio.visitor(visitor.id)
    const word = visitor.word[this.lang]
    this.later(280, () => this.speech.speak(word, this.lang))
    this.live.textContent = word
  }

  private nextVisitor(): Visitor {
    const forced = new URLSearchParams(window.location.search).get('visitor')
    if (this.isVisitorId(forced) && !this.current) {
      return visitorById(forced)
    }
    if (this.bag.length === 0) {
      this.bag = shuffleBag(this.current?.id)
    }
    const id = this.bag.shift()
    if (!id) return visitorById('cat')
    return visitorById(id)
  }

  private isVisitorId(value: string | null): value is VisitorId {
    return VISITOR_IDS.some((id) => id === value)
  }

  private renderVisitor(visitor: Visitor): void {
    this.slot.className = `visitor-slot is-in visitor--${visitor.id}`
    this.slot.innerHTML = visitor.svg
    this.slot.setAttribute('role', 'button')
    this.slot.setAttribute('aria-label', visitor.word[this.lang])
    this.slot.tabIndex = 0
  }

  private setPhase(phase: Phase): void {
    this.phase = phase
    this.world.dataset.phase = phase
  }

  private async unlockVoice(): Promise<void> {
    this.speech.prime()
    await this.audio.unlock()
    try {
      await navigator.wakeLock?.request('screen')
    } catch {
      // unsupported or denied
    }
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key === '1') this.applyLang('ru', true)
    if (event.key === '2') this.applyLang('de', true)
    if (event.key === '3') this.applyLang('en', true)
    if (event.key === 'l' || event.key === 'L') {
      if (this.sheet.classList.contains('is-open')) this.hideParent()
      else this.showParent()
    }
    if (event.key === 'Escape') this.hideParent()
    if (event.key === ' ' || event.key === 'Enter') {
      if (this.sheet.classList.contains('is-open')) return
      event.preventDefault()
      void this.unlockVoice()
      if (this.phase === 'open') {
        if (this.current) this.greet(this.current)
        this.scheduleClose()
      } else if (this.phase === 'waiting' || this.phase === 'knocking') {
        this.openDoor()
      } else if (this.phase === 'closed') {
        this.knock()
      }
    }
  }

  private later(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
  }

  private clearTimers(): void {
    for (const id of this.timers) window.clearTimeout(id)
    this.timers.clear()
  }

  private must(root: ParentNode, selector: string): HTMLElement {
    const node = root.querySelector<HTMLElement>(selector)
    if (!node) throw new Error(`Missing ${selector}`)
    return node
  }
}
