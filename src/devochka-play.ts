import { art, coin, icon, jar } from './devochka-art.ts'
import { JARS, LANES } from './devochka-copy.ts'
import { WAGES, type Job } from './devochka-state.ts'
import { fruit, pancake, topping, channel, TOPPINGS, type Apple, type Topping } from './devochka-jobs-art.ts'
import { jobText, type JobWord } from './devochka-jobs-copy.ts'
import { makeRiver, ports, sail, BANK, type River } from './devochka-river.ts'
import type { Lang } from './languages.ts'
import type { Sound } from './devochka-audio.ts'
import './devochka-jobs.css'

interface Host {
  lang(): Lang
  render(): void
  say(text: string): void
  sound(effect: Sound, index?: number): void
  reward(job: Job): void
}
type FryStage = 'empty' | 'pale' | 'golden' | 'dark' | 'topping' | 'served'
const intros = {
  orchard: 'orchardIntro',
  jars: 'jarsIntro',
  bakery: 'bakeryIntro',
  regatta: 'regattaIntro',
} as const
const endings = {
  orchard: 'orchardThanks',
  jars: 'jarsThanks',
  bakery: 'bakeryThanks',
  regatta: 'regattaThanks',
} as const
const choose = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]
const lanes = [0, 1, 2]
const potSize = 6

export class Playroom {
  active: Job | null = null
  won = false
  lane = 1
  private cue: JobWord | null = null
  private wave = 0
  private appleOrder: Apple[] = []
  private apples = 0
  private slips = 0
  private land = 0
  private otherLane = 0
  private gust = 0
  private waveStarted = 0
  private fallTime = 0

  private round = 0
  private pattern: number[] = []
  private cursor = 0
  private showing = false
  private lit = -1

  private fryStage: FryStage = 'empty'
  private cooked = 0
  private orders: Topping[] = []
  private rescues = 0

  private course = 0
  private river: River | null = null
  private voyage: ReturnType<typeof sail> | null = null
  private travel = 0
  private snag: number | null = null

  private timers = new Set<number>()
  private host: Host

  constructor(host: Host) {
    this.host = host
  }
  private tx(key: JobWord): string {
    return jobText(key, this.host.lang())
  }
  private tell(key: JobWord): void {
    this.cue = key
    this.host.say(this.tx(key))
  }
  private later(fn: () => void, ms: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer)
      if (!document.hidden) fn()
    }, ms)
    this.timers.add(timer)
  }
  pause(): void {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }
  leave(): void {
    this.pause()
    this.active = null
    this.won = false
    this.cue = null
  }

  resume(): void {
    if (!this.active || this.won || document.hidden) return
    switch (this.active) {
      case 'orchard':
        this.drop()
        break
      case 'jars':
        this.replay()
        break
      case 'bakery':
        this.fryTimer()
        break
      case 'regatta':
        if (this.voyage) this.sailStep()
        break
    }
  }
  start(job: Job): void {
    this.leave()
    this.active = job
    this.host.say(this.tx(intros[job]))
    switch (job) {
      case 'orchard': {
        this.apples = this.slips = this.wave = 0
        this.lane = 1
        this.appleOrder = Array.from({ length: potSize / 2 }, () =>
          Math.random() < 0.5 ? (['red', 'gold'] as const) : (['gold', 'red'] as const)
        ).flat()
        this.drop()
        break
      }
      case 'jars':
        this.round = 0
        this.nextPattern()
        break
      case 'bakery':
        this.cooked = this.rescues = 0
        this.fryStage = 'empty'
        this.orders = [...TOPPINGS]
        for (let i = this.orders.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[this.orders[i], this.orders[j]] = [this.orders[j], this.orders[i]]
        }
        this.host.render()
        break
      case 'regatta':
        this.course = 0
        this.nextRiver()
        break
    }
  }
  private finish(): void {
    if (!this.active || this.won) return
    this.pause()
    this.won = true
    this.host.reward(this.active)
    this.host.sound('sticker')
    this.host.say(this.tx(endings[this.active]) + ' ' + this.tx('playDone'))
    this.host.render()
  }
  private drop(): void {
    this.pause()
    this.wave++
    this.land = choose(lanes.filter((n) => n !== this.lane))
    // Both varieties move one lane downwind together.
    const breezy = this.apples >= 2 && this.wave % 3 !== 0
    const direction = this.land === 0 ? -1 : this.land === 2 ? 1 : choose([-1, 1])
    this.gust = breezy ? direction : 0
    this.otherLane = choose(lanes.filter((n) => n !== this.land && lanes.includes(n - this.gust)))
    this.fallTime = Math.max(1500, 2600 - 190 * this.apples) + Math.min(this.slips, 2) * 500
    this.waveStarted = performance.now()
    this.host.render()
    this.later(() => {
      if (this.land === this.lane) {
        this.apples++
        this.slips = 0
        this.host.sound('apple')
        if (this.apples === potSize) return this.finish()
        this.tell('caught')
      } else {
        this.slips++
        this.tell(this.otherLane === this.lane ? 'wrongFruit' : 'missedFruit')
      }
      this.drop()
    }, this.fallTime)
  }
  move(lane: number): void {
    if (this.active !== 'orchard' || this.won) return
    this.lane = Math.max(0, Math.min(2, lane))
    const basket = document.querySelector<HTMLElement>('.catch-basket')
    if (basket) basket.style.setProperty('--lane', String(this.lane))
    document
      .querySelectorAll<HTMLElement>('[data-lane]')
      .forEach((el, i) => el.setAttribute('aria-pressed', String(i === this.lane)))
  }
  private nextPattern(): void {
    this.round++
    this.pattern = Array.from({ length: this.round + 1 }, () => Math.floor(Math.random() * 3))
    this.replay()
  }
  replay(): void {
    if (this.active !== 'jars' || this.won) return
    this.pause()
    this.cursor = 0
    this.lit = -1
    this.showing = true
    this.host.render()
    this.pattern.forEach((n, i) => {
      this.later(() => {
        this.light(n)
        this.host.sound('jar', n)
      }, 700 + i * 720)
      this.later(() => this.light(-1), 1180 + i * 720)
    })
    this.later(() => {
      this.showing = false
      this.host.render()
      this.tell('yourTurn')
    }, 700 + this.pattern.length * 720)
  }
  private light(index: number): void {
    this.lit = index
    document.querySelectorAll('[data-jar]').forEach((el, i) => el.classList.toggle('lit', i === index))
  }
  strike(index: number): void {
    if (this.active !== 'jars' || this.won || this.showing) return
    this.host.sound('jar', index)
    if (index !== this.pattern[this.cursor]) {
      this.tell('tryTune')
      this.replay()
      return
    }
    this.cursor++
    if (this.cursor === this.pattern.length) {
      this.showing = true
      this.host.render()
      this.light(index)
      this.later(() => (this.round === 3 ? this.finish() : this.nextPattern()), 430)
      return
    }
    this.host.render()
    this.light(index)
    this.later(() => this.light(-1), 230)
  }
  act(action: string, index: number): void {
    if (this.won) return
    if (this.active === 'bakery') {
      if (action === 'pan') this.pan()
      if (action === 'top' && this.fryStage === 'topping' && TOPPINGS[index]) this.topPancake(TOPPINGS[index])
    }
    if (this.active === 'regatta' && this.river && !this.voyage) {
      if (action === 'turn') {
        const cell = this.river.cells[index]
        if (!cell) return
        cell.quarter = (cell.quarter + 1) % 4
        this.snag = null
        this.cue = null
        this.host.sound('tap')
        this.host.say(this.tileName(index))
        this.host.render()
      } else if (action === 'launch') {
        this.voyage = sail(this.river)
        this.travel = 0
        this.snag = null
        this.host.sound('drink')
        this.tell('afloat')
        this.sailStep()
      }
    }
  }
  private fryTimer(): void {
    this.pause()
    if (this.fryStage === 'pale') {
      this.later(() => {
        this.fryStage = 'golden'
        this.host.sound('jar', 1)
        this.tell('goldPan')
        this.host.render()
        this.fryTimer()
      }, 1400 + this.cooked * 160)
    } else if (this.fryStage === 'golden') {
      this.later(() => {
        this.fryStage = 'dark'
        this.rescues++
        this.tell('overPan')
        this.host.render()
      }, 3400 - this.cooked * 450 + Math.min(this.rescues, 2) * 2200)
    } else if (this.fryStage === 'served') {
      this.later(() => {
        this.cooked++
        if (this.cooked === this.orders.length) return this.finish()
        this.fryStage = 'empty'
        this.cue = null
        this.host.render()
      }, 850)
    }
  }
  private pan(): void {
    switch (this.fryStage) {
      case 'empty':
      case 'dark':
        this.fryStage = 'pale'
        this.tell('waitPan')
        this.host.sound('drink')
        this.fryTimer()
        break
      case 'pale':
        this.tell('waitPan')
        break
      case 'golden':
        this.pause()
        this.fryStage = 'topping'
        this.host.sound('basket')
        this.tell('pantry')
        break
      default:
        return
    }
    const keepFocus = document.activeElement?.classList.contains('baking-pan')
    this.host.render()
    if (keepFocus && this.fryStage === 'topping') {
      document.querySelector<HTMLElement>('[data-game-action="top"]')?.focus({ preventScroll: true })
    }
  }
  private topPancake(pick: Topping): void {
    if (pick !== this.orders[this.cooked]) {
      this.tell('wrongTopping')
    } else {
      this.fryStage = 'served'
      this.host.sound('apple')
      this.tell('served')
      this.fryTimer()
    }
    this.host.render()
  }
  private nextRiver(): void {
    this.voyage = null
    this.snag = null
    this.cue = null
    this.river = makeRiver(this.course)
    this.host.render()
  }
  private sailStep(): void {
    const run = this.voyage
    if (!run) return
    if (this.travel < run.trail.length) {
      this.travel++
      this.host.render()
      this.later(() => this.sailStep(), 285)
    } else if (run.snag !== null) {
      this.snag = run.snag
      this.voyage = null
      this.tell('shoal')
      this.host.render()
    } else {
      if (this.course < 2) this.tell('docked')
      this.host.sound('till')
      this.host.render()
      this.later(() => {
        this.course++
        if (this.course === 3) this.finish()
        else this.nextRiver()
      }, 750)
    }
  }
  private tileName(i: number): string {
    const [a, b] = ports(this.river!.cells[i]!)
    return `${this.tx('tile')} ${i + 1} · ${this.tx(BANK[a])}, ${this.tx(BANK[b])}`
  }
  private orchard(): string {
    const wanted = this.appleOrder[this.apples]
    const other = wanted === 'gold' ? 'red' : 'gold'
    const falling = (kind: Apple, lane: number, start: number) =>
      `<div aria-hidden="true" class="falling" data-wanted="${
        kind === wanted
      }" style="--lane:${lane};--start:${start};--fall:${this.fallTime}ms;--elapsed:-${Math.max(
        0,
        performance.now() - this.waveStarted
      )}ms">${fruit(kind)}</div>`
    return `<div class="orchard-lanes">${LANES.map(
      (name, i) =>
        `<button data-lane="${i}" class="${this.slips >= 2 && i === this.land ? 'guided' : ''}" aria-pressed="${
          this.lane === i
        }" aria-label="${this.tx('lane')} · ${name[this.host.lang()]}${
          i === this.land ? ' · ' + this.tx(wanted) : i === this.otherLane ? ' · ' + this.tx(other) : ''
        }"><span>${['←', '•', '→'][i]}</span></button>`
    ).join('')}</div>
    <div class="apple-ticket" aria-label="${this.tx('recipe')}"><span>${this.tx('recipe')}</span>${fruit(
      wanted
    )}<b>${this.tx(wanted)}</b></div>
    ${this.gust ? `<span class="wind-flag">${this.gust > 0 ? '→' : '←'} ${this.tx('wind')}</span>` : ''}
    ${falling(wanted, this.land, this.land - this.gust)}${falling(
      other,
      this.otherLane,
      this.otherLane - this.gust
    )}
    <div class="catch-basket" style="--lane:${this.lane}">${art('basket')}</div>`
  }
  private bakery(): string {
    const order = this.orders[this.cooked]
    const plated = this.fryStage === 'served'
    const garnish = plated || this.fryStage === 'topping'
    const surface = this.fryStage === 'topping' || this.fryStage === 'served' ? 'flipped' : this.fryStage
    const action = this.fryStage === 'empty' ? 'pourBatter' : this.fryStage === 'dark' ? 'freshBatter' : 'flip'
    return `<div class="bakery-guest">${art(
      ['bunny', 'cat', 'dog'][this.cooked]
    )}<div class="garnish-ticket" data-order="${order}">${topping(order)}<span>${this.tx(
      order
    )}</span></div></div>
      <div class="baking-stove"><div class="pan-flame"></div></div>
      <button class="baking-pan" data-game-action="pan" aria-label="${this.tx(action)}" ${
      garnish ? 'disabled' : ''
    }>${pancake(surface, plated ? order : undefined)}${
      !garnish ? `<span>${this.tx(action)}</span>` : ''
    }</button>
      ${
        this.fryStage === 'topping'
          ? `<div class="garnish-tray">${TOPPINGS.map(
              (item, i) =>
                `<button data-game-action="top" data-index="${i}" aria-label="${this.tx(item)}">${topping(
                  item
                )}<span>${this.tx(item)}</span></button>`
            ).join('')}</div>`
          : ''
      }`
  }
  private regatta(): string {
    const river = this.river!
    const boat = this.voyage && this.travel ? this.voyage.trail[this.travel - 1] : river.start
    return `<div class="river-board">${river.cells
      .map((cell, i) => {
        if (!cell) return `<div class="river-bank">${art(i % 2 ? 'leaf' : 'flower')}</div>`
        const dock = i === river.start ? 'startDock' : i === river.end ? 'endDock' : null
        return `<button class="river-tile ${
          i === this.snag ? 'snag' : ''
        }" data-game-action="turn" data-index="${i}" aria-label="${this.tileName(i)}${
          dock ? ' · ' + this.tx(dock) : ''
        }" aria-disabled="${!!this.voyage}">${channel(cell)}${
          dock
            ? `<span class="river-mark ${dock}" aria-hidden="true">${dock === 'startDock' ? '➜' : '⚑'}</span>`
            : ''
        }${boat === i ? art('boat', 'little-boat') : ''}</button>`
      })
      .join('')}</div><button class="launch-boat" data-game-action="launch" ${
      this.voyage ? 'disabled' : ''
    }>${icon('arrow', 17)} ${this.tx(this.voyage ? 'afloat' : 'launch')}</button>`
  }
  private jars(): string {
    return `<div class="jars-line">${JARS.map(
      (name, i) =>
        `<button class="jam-jar ${i === this.lit ? 'lit' : ''}" data-jar="${i}" aria-disabled="${
          this.showing
        }" aria-label="${name[this.host.lang()]}">${jar(i)}<span>${name[this.host.lang()]}</span></button>`
    ).join('')}</div>`
  }
  private illustration(job: Job): string {
    switch (job) {
      case 'orchard':
        return art('basket') + art('apple', 'extra-apple')
      case 'jars':
        return jar(0) + jar(1) + jar(2)
      case 'regatta':
        return art('boat', 'big-boat')
      case 'bakery':
        return pancake('flipped', 'raspberry')
    }
  }
  private side(job: Job): string {
    if (this.won)
      return `<button class="primary" data-job="${job}">${this.tx('again')} ${icon(
        'repeat'
      )}</button><button class="secondary" data-nav="shop">${this.tx('toShop')} ${icon('shop')}</button>`
    const key = { orchard: 'apples', jars: 'melody', bakery: 'guest', regatta: 'course' } as const
    const current = {
      orchard: this.apples,
      jars: this.round,
      bakery: this.cooked + 1,
      regatta: this.course + 1,
    }[job]
    let details = ''
    if (job === 'orchard')
      details = `<div class="fruit-progress">${this.appleOrder
        .map((id, i) => `<span class="${i < this.apples ? 'harvested' : ''}">${fruit(id)}</span>`)
        .join('')}</div>`
    if (job === 'jars')
      details = `<p class="game-cue">${this.tx(this.showing ? 'watch' : 'yourTurn')} <span>${
        this.showing ? '' : '●'.repeat(this.cursor) + '○'.repeat(this.pattern.length - this.cursor)
      }</span></p><button class="secondary" data-action="replay">${icon('repeat')} ${this.tx(
        'listenAgain'
      )}</button>`
    return `<div class="tally"><span>${this.tx(key[job])}</span><b>${current} / ${
      job === 'orchard' ? potSize : 3
    }</b></div>${details}${this.cue && job !== 'jars' ? `<p class="job-reply">${this.tx(this.cue)}</p>` : ''}`
  }
  view(): string {
    const job = this.active
    if (!job)
      return `<div class="paper-heading"><h2>${this.tx('gameTitle')}</h2><p>${this.tx(
        'gameIntro'
      )}</p></div><div class="job-cards">${(Object.keys(WAGES) as Job[])
        .map(
          (id) =>
            `<button class="job-card" data-job="${id}"><span class="job-illustration ${id}">${this.illustration(
              id
            )}</span><span class="job-caption"><strong>${this.tx(id)}</strong><span class="wage">+ ${
              WAGES[id]
            } ${coin()}</span></span><span class="job-info">${this.tx(
              intros[id]
            )}</span><span class="play-cta">${this.tx('start')} ${icon('arrow')}</span></button>`
        )
        .join('')}</div>`
    const picture = this.won
      ? `<div class="job-win">${art(
          job === 'regatta' ? 'boat' : job === 'orchard' ? 'basket' : 'bunny'
        )}<div class="big-wage">+ ${WAGES[job]} ${coin(40)}</div></div>`
      : this[job]()
    return `<div class="spread"><div class="picture-column"><div class="scene play-scene ${job} ${
      this.won ? 'won' : ''
    }" data-wave="${this.wave}" data-stage="${
      job === 'bakery' ? this.fryStage : ''
    }"><h2 class="scene-sign">${this.tx(
      job
    )}</h2>${picture}</div></div><aside class="paper-note"><div class="tape"></div><div class="note-label">${icon(
      'games',
      18
    )} ${this.tx('games')}</div><h2>${this.tx(this.won ? 'playDone' : job)}</h2><p>${this.tx(
      this.won ? endings[job] : intros[job]
    )}</p>${this.side(job)}<button class="text-button" data-nav="games">${icon('back', 16)} ${this.tx(
      'games'
    )}</button></aside></div>`
  }
}
