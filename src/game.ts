import { ToyAudio } from './audio.ts'
import { decide, zoneFromTarget, type Action, type Phase } from './input.ts'
import {
  LANG_LABEL,
  PARENT_COPY,
  loadLang,
  nextLang,
  saveLang,
  type Lang,
} from './languages.ts'
import { ToySpeech } from './speech.ts'
import {
  VISITOR_IDS,
  shuffleBag,
  visitorById,
  type Visitor,
  type VisitorId,
} from './visitors.ts'

const OPEN_MS = 1080
const CLOSE_MS = 920
const SPEAK_AFTER_OPEN_MS = 420
const HOLD_OPEN_MS = 4000
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
  private readonly parentHome: HTMLAnchorElement | null

  private readonly audio = new ToyAudio()
  private readonly speech = new ToySpeech()

  private muted = false
  private greetingGeneration = 0
  private readonly soundButton: HTMLButtonElement
  private readonly languageButton: HTMLButtonElement

  private phase: Phase = 'boot'
  private lang: Lang = loadLang()
  private bag: VisitorId[] = []
  private current: Visitor | null = null
  private unanswered = 0
  private lastGreet = 0
  private parentHold: number | null = null
  private inputLock = false
  private closeTimer: number | null = null
  private readonly timers = new Set<number>()

  constructor(root: HTMLElement) {
    const controls = document.createElement('div')
    controls.className = 'kuckuck-controls'
    controls.innerHTML = '<button type="button" id="kuckuck-language"></button><button type="button" id="kuckuck-sound"></button>'
    root.append(controls)
    this.soundButton = controls.querySelector<HTMLButtonElement>('#kuckuck-sound')!
    this.languageButton = controls.querySelector<HTMLButtonElement>('#kuckuck-language')!
    try { this.muted = localStorage.getItem('spielzeuge.kuckuck.muted') === 'true' } catch { /* optional storage */ }
    this.audio.setMuted(this.muted)
    this.world = this.must(root, '.world')
    this.doorway = this.must(root, '#doorway')
    this.door = this.must(root, '#door') as HTMLButtonElement
    this.slot = this.must(root, '#visitor-slot')
    this.sheet = this.must(root, '#parent-sheet')
    this.live = this.must(root, '#live')
    this.parentHint = this.must(root, '#parent-hint')
    this.parentHome = root.querySelector<HTMLAnchorElement>('.parent-home a')
    this.langButtons = [
      ...this.sheet.querySelectorAll<HTMLButtonElement>('[data-lang]'),
    ]
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
    this.soundButton.addEventListener('click', () => {
      this.muted = !this.muted
      this.cancelGreeting()
      this.audio.setMuted(this.muted)
      try { localStorage.setItem('spielzeuge.kuckuck.muted', String(this.muted)) } catch { /* optional storage */ }
      this.updateControls()
      if (!this.muted) void this.unlockVoice()
    })
    this.languageButton.addEventListener('click', () => this.chooseLang(nextLang(this.lang)))
    const lamp = this.must(this.world, '#lamp')
    lamp.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      this.speech.prime()
      if (this.sheet.classList.contains('is-open')) return
      this.beginParentHold()
    })
    lamp.addEventListener('pointercancel', () => this.cancelParentHold())
    lamp.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.cancelParentHold()
      if (this.sheet.classList.contains('is-open')) return
      this.run(decide(this.phase, 'lamp', this.hasVisitor()))
    })

    this.world.addEventListener('pointerdown', (event) => {
      this.speech.prime()
      void this.onPlayPointer(event)
    })

    this.door.addEventListener('click', (event) => {
      event.preventDefault()
    })

    for (const button of this.langButtons) {
      button.addEventListener('click', () => {
        const next = button.dataset.lang
        if (next === 'ru' || next === 'de' || next === 'en') {
          this.chooseLang(next)
          this.hideParent()
        }
      })
    }

    this.sheet.addEventListener('click', (event) => {
      if (event.target === this.sheet) this.hideParent()
    })

    window.addEventListener('keydown', (event) => this.onKey(event))

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.cancelGreeting(); this.audio.stop() }
    })

    window.addEventListener('pagehide', () => { this.cancelGreeting(); this.audio.stop(); this.clearTimers() })

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

  private async onPlayPointer(event: PointerEvent): Promise<void> {
    if (this.sheet.classList.contains('is-open')) return
    const zone = zoneFromTarget(event.target)
    if (zone === 'lamp') return
    event.preventDefault()
    if (this.inputLock) return

    const action = decide(this.phase, zone, this.hasVisitor())
    if (action === 'ignore') return
    this.inputLock = true
    try {
      await this.unlockVoice()
      this.run(action)
    } finally {
      this.inputLock = false
    }
  }

  private hasVisitor(): boolean {
    return this.current !== null && (this.phase === 'open' || this.phase === 'opening')
  }

  private run(action: Action): void {
    switch (action) {
      case 'ignore':
        return
      case 'knock':
        this.knock()
        return
      case 'open':
        this.openDoor()
        return
      case 'close':
        this.closeDoor()
        return
      case 'greet':
        if (this.current) {
          this.greet(this.current)
          this.scheduleClose()
        }
        return
      case 'cycle-lang-name':
        this.applyLang(nextLang(this.lang), true)
        void this.unlockVoice()
        if (this.hasVisitor()) {
          this.lastGreet = 0
          if (this.current) this.greet(this.current)
          return
        }
        if (
          this.phase !== 'boot' &&
          this.phase !== 'closed' &&
          this.phase !== 'knocking' &&
          this.phase !== 'waiting'
        ) {
          return
        }
        if (!this.muted) this.speech.speak(LANG_LABEL[this.lang], this.lang)
        return
      case 'cycle-lang-word':
        this.applyLang(nextLang(this.lang), true)
        void this.unlockVoice()
        if (!this.hasVisitor() || !this.current) return
        this.lastGreet = 0
        this.greet(this.current)
        return
    }
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

  private chooseLang(lang: Lang): void {
    this.applyLang(lang, true)
    this.speech.prime()
    void this.unlockVoice()
    if (this.hasVisitor() && this.current) {
      this.lastGreet = 0
      this.greet(this.current)
      return
    }
    if (!this.muted) this.speech.speak(LANG_LABEL[this.lang], this.lang)
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
    this.cancelGreeting()
    this.lang = lang
    if (persist) saveLang(lang)
    document.documentElement.lang = lang === 'ru' ? 'ru' : lang === 'de' ? 'de' : 'en'
    this.world.dataset.lang = lang
    this.updateControls()
    if (this.current) this.slot.setAttribute('aria-label', this.current.word[lang])
    this.must(this.world, '#lamp').setAttribute('aria-label', { ru: 'Сменить язык', de: 'Sprache wechseln', en: 'Change language' }[lang])
    this.parentHint.textContent = PARENT_COPY[lang].hint
    if (this.parentHome) this.parentHome.textContent = PARENT_COPY[lang].home
    for (const button of this.langButtons) {
      const active = button.dataset.lang === lang
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
    this.door.setAttribute('aria-label', this.doorLabel())
  }

  private cancelGreeting(): void {
    this.greetingGeneration += 1
    this.speech.silence()
  }

  private updateControls(): void {
    this.languageButton.textContent = this.lang.toUpperCase()
    this.languageButton.setAttribute('aria-label', { ru: 'Сменить язык', de: 'Sprache wechseln', en: 'Change language' }[this.lang])
    this.soundButton.textContent = this.muted ? '♫ ×' : '♫'
    const label = this.muted
      ? { ru: 'Включить звук', de: 'Ton einschalten', en: 'Enable sound' }[this.lang]
      : { ru: 'Выключить звук', de: 'Ton ausschalten', en: 'Mute sound' }[this.lang]
    this.soundButton.setAttribute('aria-label', label)
    this.soundButton.title = label
    this.soundButton.setAttribute('aria-pressed', String(this.muted))
  }

  private doorLabel(): string {
    if (this.lang === 'ru') return 'Дверь'
    if (this.lang === 'de') return 'Tür'
    return 'Door'
  }

  private knock(): void {
    if (this.phase === 'knocking' || this.phase === 'opening' || this.phase === 'open') return
    this.cancelGreeting()
    this.audio.stop()
    this.setPhase('knocking')
    this.doorway.classList.add('is-knocking')
    this.audio.knocks()
    this.later(480, () => {
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
    this.clearCloseTimer()
    this.closeTimer = this.later(HOLD_OPEN_MS, () => this.closeDoor())
  }

  private closeDoor(): void {
    if (this.phase !== 'open' && this.phase !== 'opening') return
    this.clearTimers()
    this.cancelGreeting()
    this.audio.stop()
    this.setPhase('closing')
    this.doorway.classList.remove('is-open')
    this.slot.classList.add('is-leaving')
    this.audio.creak()
    this.later(CLOSE_MS - 80, () => this.audio.latch())
    this.later(CLOSE_MS, () => {
      this.slot.replaceChildren()
      this.slot.removeAttribute('role')
      this.slot.removeAttribute('aria-label')
      this.slot.removeAttribute('tabindex')
      this.slot.className = 'visitor-slot'
      delete this.slot.dataset.zone
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
    this.cancelGreeting()
    this.audio.stop()
    const generation = this.greetingGeneration
    this.audio.visitor(visitor.id)
    const word = visitor.word[this.lang]
    const afterSound = Math.min(
      2000,
      Math.max(280, this.audio.duration(visitor.id) * 950),
    )
    this.later(afterSound, () => {
      if (generation !== this.greetingGeneration || this.muted || document.hidden || this.current !== visitor) return
      this.speech.speak(visitor.word[this.lang], this.lang)
    })
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
    this.slot.dataset.zone = 'visitor'
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
    try { await this.audio.unlock() } catch { /* audio must never block play */ }
    try {
      await navigator.wakeLock?.request('screen')
    } catch {
      // unsupported or denied
    }
  }

  private onKey(event: KeyboardEvent): void {
    if ((event.target as HTMLElement)?.closest('button, a') && event.target !== this.door) return
    if (event.target === this.slot && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault()
      void this.unlockVoice().then(() => this.run('greet'))
      return
    }
    if (event.key === '1') this.chooseLang('ru')
    if (event.key === '2') this.chooseLang('de')
    if (event.key === '3') this.chooseLang('en')
    if (event.key === 'l' || event.key === 'L') {
      if (this.sheet.classList.contains('is-open')) this.hideParent()
      else this.showParent()
    }
    if (event.key === 'Escape') this.hideParent()
    if (event.key === ' ' || event.key === 'Enter') {
      if (this.sheet.classList.contains('is-open')) return
      event.preventDefault()
      const action = decide(this.phase, 'door', this.hasVisitor())
      void this.unlockVoice().then(() => this.run(action))
    }
  }

  private later(ms: number, fn: () => void): number {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      if (this.closeTimer === id) this.closeTimer = null
      fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  private clearCloseTimer(): void {
    if (this.closeTimer === null) return
    window.clearTimeout(this.closeTimer)
    this.timers.delete(this.closeTimer)
    this.closeTimer = null
  }

  private clearTimers(): void {
    for (const id of this.timers) window.clearTimeout(id)
    this.timers.clear()
    this.closeTimer = null
  }

  private must(root: ParentNode, selector: string): HTMLElement {
    const node = root.querySelector<HTMLElement>(selector)
    if (!node) throw new Error(`Missing ${selector}`)
    return node
  }
}
