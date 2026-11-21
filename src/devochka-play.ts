import { art, coin, icon, jar } from './devochka-art.ts'
import { JARS, LANES, T, type TextKey } from './devochka-copy.ts'
import { WAGES, type Job } from './devochka-state.ts'
import type { Lang } from './languages.ts'
import type { Sound } from './devochka-audio.ts'

interface Host {
  lang(): Lang
  render(): void
  say(key: TextKey): void
  sound(effect: Sound, index?: number): void
  reward(job: Job): void
}
export class Playroom {
  active: Job | null = null
  won = false
  lane = 1
  private target = 0
  private drops = 0
  private apples = 0
  private leaf = false
  private round = 0
  private pattern: number[] = []
  private cursor = 0
  private showing = false
  private lit = -1
  private timers = new Set<number>()
  private host: Host

  constructor(host: Host) {
    this.host = host
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
  }
  resume(): void {
    if (!this.active || this.won || document.hidden) return
    if (this.active === 'orchard') this.drop()
    else this.replay()
  }
  start(job: Job): void {
    this.leave()
    this.active = job
    this.apples = this.drops = this.round = 0
    this.lane = 1
    this.pattern = []
    this.host.say(job === 'orchard' ? 'orchardIntro' : 'jarsIntro')
    if (job === 'orchard') this.drop()
    else this.nextPattern()
  }
  private finish(): void {
    if (!this.active || this.won) return
    this.pause()
    this.won = true
    this.host.reward(this.active)
    this.host.sound('sticker')
    this.host.say('playDone')
    this.host.render()
  }
  private drop(): void {
    this.pause()
    this.leaf = this.drops % 4 === 2
    this.target = Math.floor(Math.random() * 3)
    this.host.render()
    this.later(() => {
      this.drops++
      if (this.target === this.lane && !this.leaf) {
        this.apples++
        this.host.sound('apple')
        if (this.apples === 3) {
          this.finish()
          return
        }
        this.host.say('caught')
      } else if (!this.leaf) this.host.say('missed')
      this.drop()
    }, 2050)
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
      this.host.say('yourTurn')
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
      this.host.say('tryTune')
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
  view(): string {
    const l = this.host.lang()
    const tx = (k: TextKey) => T[k][l]
    if (!this.active)
      return `<div class="paper-heading"><h2>${tx('gameTitle')}</h2><p>${tx(
        'gameIntro'
      )}</p></div><div class="job-cards">${(['orchard', 'jars'] as const)
        .map(
          (job) =>
            `<button class="job-card" data-job="${job}"><span class="job-illustration ${job}">${
              job === 'orchard' ? art('basket') + art('apple', 'extra-apple') : jar(0) + jar(1) + jar(2)
            }</span><span class="job-caption"><strong>${tx(job)}</strong><span class="wage">+ ${
              WAGES[job]
            } ${coin()}</span></span><span class="job-info">${tx(
              job === 'orchard' ? 'orchardIntro' : 'jarsIntro'
            )}</span><span class="play-cta">${tx('start')} ${icon('arrow')}</span></button>`
        )
        .join('')}</div>`
    const job = this.active
    const score = job === 'orchard' ? this.apples : this.round
    const picture = this.won
      ? `<div class="job-win">${art('bunny')}<div class="big-wage">+ ${WAGES[job]} ${coin(40)}</div></div>`
      : job === 'orchard'
      ? `<div class="orchard-lanes">${LANES.map(
          (name, i) =>
            `<button data-lane="${i}" aria-pressed="${this.lane === i}" aria-label="${tx('lane')} · ${
              name[l]
            }"><span>${['←', '•', '→'][i]}</span></button>`
        ).join('')}</div><div aria-hidden="true" class="falling" data-kind="${
          this.leaf ? 'leaf' : 'apple'
        }" style="--lane:${this.target}">${art(
          this.leaf ? 'leaf' : 'apple'
        )}</div><div class="catch-basket" style="--lane:${this.lane}">${art('basket')}</div>`
      : `<div class="jars-line">${JARS.map(
          (name, i) =>
            `<button class="jam-jar ${i === this.lit ? 'lit' : ''}" data-jar="${i}" aria-disabled="${
              this.showing
            }" aria-label="${name[l]}">${jar(i)}<span>${name[l]}</span></button>`
        ).join('')}</div>`
    return `<div class="spread"><div class="picture-column"><div class="scene play-scene ${job} ${
      this.won ? 'won' : ''
    }"><h2 class="scene-sign">${tx(
      job
    )}</h2>${picture}</div></div><aside class="paper-note"><div class="tape"></div><div class="note-label">${icon(
      'games'
    )} ${tx('games')}</div><h2>${this.won ? tx('playDone') : tx(job)}</h2><p>${
      this.won ? tx('gameIntro') : tx(job === 'orchard' ? 'orchardIntro' : 'jarsIntro')
    }</p>${
      this.won
        ? `<button class="primary" data-job="${job}">${tx('again')} ${icon(
            'repeat'
          )}</button><button class="secondary" data-nav="shop">${tx('toShop')} ${icon('shop')}</button>`
        : `<div class="tally"><span>${tx(
            job === 'orchard' ? 'apples' : 'melody'
          )}</span><b>${score} / 3</b></div>${
            job === 'jars'
              ? `<p class="game-cue">${tx(this.showing ? 'watch' : 'yourTurn')} <span>${
                  this.showing ? '' : '●'.repeat(this.cursor) + '○'.repeat(this.pattern.length - this.cursor)
                }</span></p><button class="secondary" data-action="replay">${icon('repeat')} ${tx(
                  'listenAgain'
                )}</button>`
              : ''
          }`
    }
      <button class="text-button" data-nav="games">${icon('back', 16)} ${tx('games')}</button></aside></div>`
  }
}
