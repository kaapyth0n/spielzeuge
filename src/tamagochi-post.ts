import type { Host } from './tamagochi-host.ts'
import { POST_ICONS as I, flowerArt, paintCrew } from './tamagochi-post-art.ts'
import { ISLAND_MARK, POST } from './tamagochi-post-copy.ts'
import { CHARTS, CONSTELLATIONS, melody, traceBeam } from './tamagochi-post-routes.ts'
import { ISLANDS, deliverPostcard, type Island, type Passenger } from './tamagochi-state.ts'

type Page = 'map' | 'album' | 'flight' | 'puzzle' | 'reward' | 'card' | 'orchestra'
const NOTES = [60, 64, 67]
const btn = (action: string, content: string, style = 'post-button') =>
  `<button type="button" class="${style}" data-action="${action}">${content}</button>`
const coord = (n: number) => 12.5 + (n + 0.5) * 18.75
const art = (id: Island) => `<img src="/tamagochi/${id}.webp" alt="" draggable="false">`
const stamp = (id: Island) => `<span class="post-stamp ${id}" aria-hidden="true">${ISLAND_MARK[id]}</span>`

/** A sitting at the post office pauses the live nursery, including half-finished wishes. */
export class SkyPost {
  private host: Host
  private panel: HTMLElement
  private silence: () => void
  private closePanel: () => void
  private page: Page = 'map'
  private island: Island = 'meadow'
  private crew: Passenger[] = []
  private round = 0
  private pattern: number[] = []
  private lastOpening: number[] = []
  private step = 0
  private variant = 0
  private lastVariant: Partial<Record<Island, number>> = {}
  private mirrors: boolean[] = []
  private preview = -1
  private elapsed = 0
  private solved = false
  private tip = ''
  private needsHelp = false
  private dragging: number | null = null
  private newCard = false
  private unlocked: Passenger['species'] | null = null
  private playback = -1
  private cardFrom: 'album' | 'reward' = 'album'

  constructor(host: Host, panel: HTMLElement, silence: () => void, close: () => void) {
    this.host = host
    this.panel = panel
    this.silence = silence
    this.closePanel = close
    panel.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button[data-action]')
      if (button) this.action(button.dataset.action!)
    })
    panel.addEventListener('pointerdown', (e) => {
      const target = (e.target as Element).closest<HTMLButtonElement>('[data-star]')
      if (!target || this.dragging !== null) return
      this.dragging = e.pointerId
      panel.setPointerCapture(e.pointerId)
      this.chooseStar(Number(target.dataset.star))
    })
    panel.addEventListener('pointermove', (e) => {
      if (this.dragging !== e.pointerId) return
      const star = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-star]')
      if (star && Number(star.dataset.star) === this.step) this.chooseStar(this.step)
    })
    const stop = (e: PointerEvent) => {
      if (e.pointerId === this.dragging) this.dragging = null
    }
    panel.addEventListener('pointerup', stop)
    panel.addEventListener('pointercancel', stop)
    panel.addEventListener('lostpointercapture', stop)
  }

  get active() {
    return !this.panel.hidden
  }
  private get c() {
    return POST[this.host.lang]
  }
  private get total() {
    return Object.keys(this.host.save.postcards).length
  }

  open(page: 'map' | 'album') {
    this.panel.hidden = false
    this.crew = this.host.save.devices.map(({ species, hatched }) => ({ species, hatched }))
    this.navigate(page)
  }

  private instruction(): string {
    if (this.page === 'map') return this.c.choose
    if (this.page === 'album') return this.total ? this.c.album : this.c.empty
    if (this.page === 'flight')
      return (
        this.c.flight +
        ' ' +
        this.c.island[this.island] +
        '. ' +
        (this.crew.some((p) => !p.hatched) ? this.c.eggs : this.crew.map((p) => this.host.petName(p.species)).join(', '))
      )
    if (this.page === 'orchestra') return this.c.compose
    if (this.page === 'reward')
      return (
        (this.newCard ? this.c.first : this.c.repeat) +
        this.unlockLine() +
        (this.newCard && this.total === 3 ? ' ' + this.c.finale : '')
      )
    if (this.page === 'card') return this.c.letter[this.island]
    if (this.solved) return this.c.ready
    return this.island === 'meadow' ? this.c.melody : this.island === 'beacon' ? this.c.turn : this.c.trace
  }

  private unlockLine() {
    return this.unlocked ? ' ' + this.host.t('unlocked', { name: this.host.petName(this.unlocked) }) : ''
  }

  private navigate(page: Page) {
    this.silence()
    this.playback = -1
    this.page = page
    this.tip = ''
    this.needsHelp = false
    this.dragging = null
    this.panel.scrollTop = 0
    this.render(false)
    this.panel.querySelector<HTMLElement>('[tabindex="-1"]')?.focus({ preventScroll: true })
    this.host.say(this.instruction())
  }

  languageChanged() {
    if (!this.active) return
    this.tip = ''
    this.render()
    this.host.say(this.instruction())
  }

  back() {
    if (this.page === 'flight' || this.page === 'puzzle' || this.page === 'reward') return this.navigate('map')
    if (this.page === 'orchestra') return this.navigate('album')
    if (this.page === 'card') return this.navigate(this.cardFrom)
    this.silence()
    this.panel.hidden = true
    this.dragging = null
    this.closePanel()
  }

  private launch(island: Island) {
    this.island = island
    this.round = 0
    this.step = 0
    this.preview = -1
    this.elapsed = 0
    this.solved = false
    this.unlocked = null
    const options = [0, 1, 2].filter((v) => v !== this.lastVariant[island])
    this.variant = options[Math.min(options.length - 1, Math.floor(this.host.rnd() * options.length))]
    this.lastVariant[island] = this.variant
    const aligned = Math.floor(this.host.rnd() * 4)
    this.mirrors = CHARTS[this.variant].solution.map((slash, i) => (i === aligned ? slash : !slash))
    if (island === 'meadow') {
      this.pattern = melody(3, this.host.rnd, this.lastOpening)
      this.lastOpening = this.pattern
    }
    this.host.sfx.play('whee')
    this.navigate('flight')
  }

  private beginPuzzle() {
    this.navigate('puzzle')
    if (this.island === 'meadow') this.listen()
  }

  private listen() {
    if (this.solved) return
    this.preview = 0
    this.elapsed = 0
    this.tip = ''
    this.host.sfx.note(NOTES[this.pattern[0]], 0.33)
    this.render()
  }

  tick(dt: number) {
    if (this.page === 'orchestra' && this.playback >= 0) {
      this.elapsed += dt
      if (this.elapsed < 0.46) return
      this.elapsed = 0
      if (++this.playback >= this.host.save.orchestra.length) this.playback = -1
      else this.soundBalloon(this.host.save.orchestra[this.playback])
      this.panel
        .querySelectorAll('.band-key')
        .forEach((el, i) => el.classList.toggle('singing', this.host.save.orchestra[this.playback] === i))
      this.panel.querySelectorAll('.band-score > span').forEach((el, i) => el.classList.toggle('singing', this.playback === i))
    } else if (this.page === 'flight') {
      this.elapsed += dt
      if (this.elapsed >= 1.8) this.beginPuzzle()
    } else if (this.page === 'puzzle' && this.preview >= 0) {
      this.elapsed += dt
      if (this.elapsed < 0.57) return
      this.elapsed = 0
      if (++this.preview >= this.pattern.length) this.preview = -1
      else this.host.sfx.note(NOTES[this.pattern[this.preview]], 0.34)
      this.panel.querySelectorAll('.flower-key').forEach((el, i) => el.classList.toggle('glowing', this.pattern[this.preview] === i))
      if (this.preview < 0) this.panel.querySelector('.puzzle-feedback')!.textContent = this.tip
    }
  }

  private finishPuzzle() {
    this.solved = true
    this.tip = ''
    this.host.sfx.play('ready')
    this.silence()
    this.host.say(this.c.ready)
    this.render()
    this.panel.querySelector<HTMLElement>('[data-action="deliver"]')?.focus({ preventScroll: true })
  }

  private playFlower(n: number) {
    if (this.solved) return
    // A child can play straight away, even while hearing the demonstration.
    this.preview = -1
    this.host.sfx.note(NOTES[n], 0.4)
    if (n !== this.pattern[this.step]) {
      this.needsHelp = true
      this.tip = this.c.again
      this.host.say(this.tip)
    } else {
      this.needsHelp = false
      this.tip = this.c.flowers[n]
      this.host.say(this.tip, true)
      if (++this.step === this.pattern.length) {
        if (this.round === 1) return this.finishPuzzle()
        this.round++
        this.step = 0
        this.pattern = melody(4, this.host.rnd)
        this.host.say(this.c.nextTune)
        return this.listen()
      }
    }
    this.render()
  }

  private chooseStar(n: number) {
    if (this.page !== 'puzzle' || this.island !== 'stars' || this.solved || n < this.step) return
    if (n === this.step) {
      this.host.sfx.play('chime', n)
      if (++this.step >= CONSTELLATIONS[this.variant].length) return this.finishPuzzle()
    }
    this.tip = `${this.c.nextStar} ${this.step + 1}.`
    this.host.say(this.tip, n === this.step - 1)
    this.render()
  }

  private action(action: string) {
    const [type, arg] = action.split(':')
    if (type === 'back') {
      this.host.sfx.play('tap')
      return this.back()
    }
    if (type === 'map' || type === 'album') {
      this.host.sfx.play('tap')
      return this.navigate(type)
    }
    if (type === 'launch' && ISLANDS.includes(arg as Island)) return this.launch(arg as Island)
    if (type === 'orchestra' && this.total === 3) return this.navigate('orchestra')
    if (this.page === 'orchestra') {
      const score = this.host.save.orchestra
      if (type === 'record') {
        const n = Number(arg)
        this.playback = -1
        score.push(n)
        if (score.length > 8) score.shift()
        this.soundBalloon(n)
        this.host.say(this.c.tuneNames[n], true)
      } else if (type === 'undo' && score.length) {
        this.playback = -1
        score.pop()
        this.host.sfx.play('pop')
        this.host.say(this.c.undo)
      } else if (type === 'perform' && score.length) {
        this.playback = 0
        this.elapsed = 0
        this.silence()
        this.soundBalloon(score[0])
        return this.render()
      } else return
      this.host.persist()
      this.render()
      if (type === 'record') {
        const burst = document.createElement('span')
        burst.className = 'band-burst'
        burst.setAttribute('aria-hidden', 'true')
        burst.textContent = '✦  ♪  ✧'
        this.panel.querySelector(`[data-action="record:${arg}"]`)?.append(burst)
      }
      return
    }
    if (type === 'land' && this.page === 'flight') return this.beginPuzzle()
    if (type === 'read') {
      const id = arg as Island
      if (!this.host.save.postcards[id]) return
      this.cardFrom = this.page === 'reward' ? 'reward' : 'album'
      this.island = id
      this.host.sfx.play('pop')
      return this.navigate('card')
    }
    if (type === 'pin' && this.page === 'card') {
      const save = this.host.save
      save.windowView = save.windowView === this.island ? null : this.island
      this.host.persist()
      this.host.sfx.play('gift')
      this.host.say(save.windowView ? this.c.pinned : this.c.unpin)
      return this.render()
    }
    if (this.page !== 'puzzle') return
    if (type === 'deliver' && this.solved) {
      const result = deliverPostcard(this.host.save, this.island, this.crew)
      this.newCard = result.first
      this.unlocked = result.egg
      this.host.persist()
      this.host.sfx.play(result.egg ? 'unlock' : 'yay')
      return this.navigate('reward')
    }
    if (this.solved) return
    if (type === 'hint') {
      this.needsHelp = true
      this.preview = -1
      const i = CHARTS[this.variant].solution.findIndex((v, k) => v !== this.mirrors[k])
      this.tip =
        this.island === 'meadow'
          ? this.c.flowers[this.pattern[this.step]]
          : this.island === 'beacon'
            ? this.c.turnThis + ' ' + (i + 1)
            : this.c.nextStar + ' ' + (this.step + 1)
      this.host.sfx.play('chime', this.step)
      this.silence()
      this.host.say(this.tip)
      return this.render()
    }
    if (type === 'listen') {
      this.host.say(this.c.listening, true)
      return this.listen()
    }
    if (type === 'flower') return this.playFlower(Number(arg))
    if (type === 'star') return this.chooseStar(Number(arg))
    if (type === 'mirror') {
      const n = Number(arg)
      this.needsHelp = false
      this.tip = ''
      this.mirrors[n] = !this.mirrors[n]
      this.host.sfx.play('twang', n)
      if (traceBeam(CHARTS[this.variant], this.mirrors).lit) return this.finishPuzzle()
      this.host.say(this.c.reflected, true)
      this.render()
    }
  }

  private soundBalloon(n: number) {
    const pet = this.crew[n % this.crew.length]
    this.host.sfx.note([60, 64, 67, 69][n], 0.42, pet.hatched ? pet.species : 'bell')
  }

  private band() {
    const score = this.host.save.orchestra
    return `<section class="post-band"><h1 tabindex="-1">${this.c.orchestra}</h1><p>${this.c.compose}</p><div class="balloon-stage">
      ${this.c.tuneNames.map((name, i) => btn('record:' + i, I.balloon + '<strong>' + name + '</strong>', 'band-key band-' + i + (this.playback >= 0 && score[this.playback] === i ? ' singing' : ''))).join('')}</div>
      <div class="band-score" aria-label="${this.c.tune}">${Array.from({ length: 8 }, (_, i) => `<span class="band-${score[i] ?? 'rest'} ${this.playback === i ? 'singing' : ''}">${score[i] === undefined ? '·' : this.c.tuneNames[score[i]]}</span>`).join('')}</div>
      <div class="post-actions"><button class="post-button" data-action="perform" ${score.length ? '' : 'disabled'}>${I.play}${this.c.listen}</button><button class="post-soft" data-action="undo" ${score.length ? '' : 'disabled'}>${this.c.undo}</button></div>${this.passengers(this.crew)}</section>`
  }

  private passengers(crew: Passenger[]) {
    const names = crew.map((p) => (p.hatched ? this.host.petName(p.species) : this.c.egg)).join(' · ')
    return `<div class="post-crew"><canvas aria-hidden="true"></canvas><span><small>${this.c.onboard}</small>${names}</span></div>`
  }

  private navigation() {
    const tape = (p: 'map' | 'album', name: string, icon: string) =>
      `<button type="button" data-action="${p}" aria-pressed="${this.page === p}">${icon}${name}</button>`
    return `<div class="post-tabs">${tape('map', this.c.map, I.map)}${tape('album', this.c.album + ' · ' + this.total, I.book)}</div>`
  }

  private collection() {
    const album = this.page === 'album'
    return `<div class="post-index"><div class="post-intro"><h1 tabindex="-1">${album ? this.c.album : this.c.title}</h1>${this.navigation()}</div>
      <p class="post-subtitle">${album ? (this.total ? this.c.collected + ' · ' + this.total + '/3' : this.c.empty) : this.c.choose}</p>
      <div class="post-grid">${ISLANDS.map((id) => {
        const got = !!this.host.save.postcards[id]
        const action = album && got ? 'read' : 'launch'
        return `<button type="button" class="island-card ${id} ${album && !got ? 'not-collected' : ''}" data-action="${action}:${id}">
          <span class="island-landscape">${art(id)}${stamp(id)}${got ? '<span class="arrived-mark">' + I.check + '</span>' : ''}</span>
          <span class="island-caption"><strong>${this.c.island[id]}</strong><span>${album ? (got ? this.c.read : this.c.missing) : this.c.task[id]}${I.arrow}</span></span></button>`
      }).join(
        '',
      )}</div>${album && this.total === 3 ? btn('orchestra', I.balloon + this.c.orchestra + I.arrow, 'post-button album-orchestra') : ''}${this.passengers(this.crew)}${this.crew.some((p) => !p.hatched) ? '<p class="post-eggs">' + this.c.eggs + '</p>' : ''}</div>`
  }

  private meadow() {
    return `<div class="meadow-puzzle"><div class="score-head"><b>${this.c.tune} ${this.round + 1} / 2</b>${btn('listen', I.play + this.c.listen, 'post-soft')}</div>
      <div class="flower-score">${this.pattern.map((n, i) => `<span aria-label="${this.c.flowers[n]}" class="${i < this.step ? 'played' : ''} ${i === this.step ? 'current' : ''}">${flowerArt(n)}${i < this.step ? I.check : ''}</span>`).join('')}</div>
      <div class="flower-keys">${this.c.flowers.map((name, n) => btn('flower:' + n, flowerArt(n) + '<span>' + name + '</span>', 'flower-key flower-' + n + ((this.preview >= 0 && this.pattern[this.preview] === n) || (this.needsHelp && this.pattern[this.step] === n) ? ' glowing' : ''))).join('')}</div></div>`
  }

  private beacon() {
    const chart = CHARTS[this.variant]
    const { path, lit } = traceBeam(chart, this.mirrors)
    const points = path.map((p) => coord(p.x) + ',' + coord(p.y)).join(' ')
    const marker = (p: { x: number; y: number }, inner: string, name: string, cls: string) =>
      `<span class="beam-marker ${cls}" style="left:${coord(p.x)}%;top:${coord(p.y)}%" aria-label="${name}">${inner}</span>`
    return `<div class="beam-chart ${lit ? 'lit' : ''}"><svg class="beam-lines" viewBox="0 0 100 100" aria-hidden="true"><polyline class="beam-glow" points="${points}"/><polyline points="${points}"/></svg>
      ${marker(chart.start, '☀', this.c.source, 'source')}${marker(chart.goal, I.lantern, this.c.lantern, 'lantern')}
      ${chart.mirrors.map((p, i) => `<button type="button" class="mirror ${this.needsHelp && chart.solution.findIndex((v, k) => v !== this.mirrors[k]) === i ? 'hinted' : ''}" data-action="mirror:${i}" style="left:${coord(p.x)}%;top:${coord(p.y)}%" aria-label="${this.c.mirror} ${i + 1}" aria-pressed="${this.mirrors[i]}"><i></i><small>${i + 1}</small></button>`).join('')}</div>`
  }

  private sky() {
    const stars = CONSTELLATIONS[this.variant]
    return `<div class="star-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${stars
      .slice(0, this.step)
      .map((p) => p.join(','))
      .join(' ')}"/></svg>
      ${stars.map(([x, y], i) => `<button type="button" data-action="star:${i}" data-star="${i}" aria-label="${this.c.star} ${i + 1}" class="chart-star ${i < this.step ? 'joined' : i === this.step ? 'next' : ''}" style="left:${x}%;top:${y}%"><i aria-hidden="true">✦</i><b>${i + 1}</b></button>`).join('')}</div>`
  }

  private mission() {
    const c = this.c
    if (this.page === 'flight')
      return `<div class="post-flight"><div class="flying-balloon">${I.balloon}</div>
      <h1 tabindex="-1">${c.flight}</h1><p>${c.island[this.island]}</p>${this.passengers(this.crew)}${btn('land', c.task[this.island] + I.arrow)}</div>`
    const detail = this.page === 'card' || this.page === 'reward'
    const title = this.page === 'reward' ? c.received : this.page === 'card' ? c.island[this.island] : c.task[this.island]
    let content: string
    if (detail) {
      const pinned = this.host.save.windowView === this.island
      content =
        this.page === 'card'
          ? `<p class="post-letter">${c.letter[this.island]}</p>${this.passengers(this.host.save.postcards[this.island]!.crew)}
        ${btn('pin', (pinned ? I.check : I.envelope) + (pinned ? c.unpin : c.pin))}${pinned ? '<p class="post-eggs">' + c.pinned + '</p>' : ''}`
          : `<p class="post-letter">${this.instruction()}</p>${this.passengers(this.crew)}
        <div class="post-actions">${btn('read:' + this.island, I.envelope + c.view)}${this.total === 3 ? btn('orchestra', I.balloon + c.orchestra, 'post-soft') : btn('map', c.travelAgain + I.arrow, 'post-soft')}</div>`
    } else {
      const board = this.island === 'meadow' ? this.meadow() : this.island === 'beacon' ? this.beacon() : this.sky()
      content = `<p class="puzzle-instruction">${this.instruction()}</p>${board}
        <div class="puzzle-feedback">${this.solved ? btn('deliver', I.envelope + c.send) : this.tip || (this.preview >= 0 ? c.listening : '')}</div>
        ${this.solved ? '' : '<div class="basket-hint">' + this.passengers(this.crew) + btn('hint', c.help, 'post-soft') + '</div>'}`
    }
    return `<div class="post-mission ${this.island} ${detail ? 'letter-page' : ''}">
      <div class="mission-picture">${art(this.island)}${stamp(this.island)}${this.page === 'reward' ? '<strong class="postmark">✓ ' + c.delivered + '</strong>' : ''}<span>${detail ? c.card : c.island[this.island]}</span></div>
      <div class="mission-body"><h1 tabindex="-1">${title}</h1>${content}</div></div>`
  }

  private render(restoreFocus = true) {
    const active = document.activeElement as HTMLElement | null
    const focusAction = restoreFocus && active && this.panel.contains(active) ? active.dataset.action : null
    this.panel.dataset.page = this.page
    const backName = this.page === 'map' || this.page === 'album' ? this.c.home : this.c.back
    this.panel.innerHTML = `<div class="post-wrap">${btn('back', I.back + backName, 'post-back')}${this.page === 'map' || this.page === 'album' ? this.collection() : this.page === 'orchestra' ? this.band() : this.mission()}</div>`
    paintCrew(this.panel, this.page === 'card' ? this.host.save.postcards[this.island]!.crew : this.crew, this.host)
    if (focusAction) this.panel.querySelector<HTMLElement>(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true })
  }
}
