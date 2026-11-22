import { servingArt } from './devochka-bowls.ts'
import {
  hasMeal,
  isBowl,
  pendingBowls,
  portionName,
  recipients,
  sceneOf,
  seatName,
  tableWords,
  yummy,
  type Seat,
  type Portion,
} from './devochka-dining.ts'
import { MEAL_SCENES, starCounts, starLabels } from './devochka-scenes.ts'
import { applyStudioChoice, newGuestMessage, studioTabName, type StudioTab } from './devochka-studio.ts'
import '@fontsource/pangolin/cyrillic-400.css'
import '@fontsource/pangolin/latin-400.css'
import '@fontsource/nunito/cyrillic-600.css'
import '@fontsource/nunito/cyrillic-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'
import './devochka.css'
import './devochka-table.css'
import { isLang, loadLang, saveLang, STORAGE_KEY } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { LunchSounds } from './devochka-audio.ts'
import { pencilFilter } from './devochka-art.ts'
import { blurb, FOOD, JARS, LANES, MEALS, T, title, type Food, type TextKey } from './devochka-copy.ts'
import { Playroom } from './devochka-play.ts'
import {
  CAPACITY,
  SAVE_KEY,
  SOUND_KEY,
  WAGES,
  checkout,
  fresh,
  isFood,
  menu,
  price,
  readBook,
  serve,
} from './devochka-state.ts'
import { albumView, homeView, musicName, shopView, top, type Place, type View } from './devochka-view.ts'

const root = document.querySelector<HTMLElement>('#notebook')!
const live = document.querySelector<HTMLElement>('#announcement')!
let book = fresh()
let muted = false
try {
  book = readBook(localStorage.getItem(SAVE_KEY))
  muted = localStorage.getItem(SOUND_KEY) === '1'
} catch {
  /* In-memory play. */
}
let lang = loadLang()
saveLang(lang)
let place: Place = hasMeal(book) || book.result !== null ? 'home' : 'shop'
let selected: Portion | null = null
let tender: number[] | null = null
let studioTab: StudioTab = 'paint'
let studio = false
let stamp = typeof book.result === 'number' ? book.result : Math.max(0, book.day - 1) % MEALS.length
let visitKitchen = false
let windowOpen = false
let countedStars: number[] = []
let message = ''
let hidden = false
const enabled = () => !muted && !hidden
const voice = new PuppyNarration(
  () => ({ lang, enabled: enabled() }),
  (t) => t,
  {
    rate: 0.94,
    pitch: 1.16,
    preferVoice: /child|junior|mädchen|детск|shelley|sandy/i,
  }
)
const sound = new LunchSounds(enabled)
const tx = (k: TextKey) => T[k][lang]
function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(book))
  } catch {
    /* Keep the current sitting. */
  }
}
function say(text: string): void {
  live.textContent = text
  voice.announce([text])
}
function feedback(text: string): void {
  message = text
  say(text)
}
const play = new Playroom({
  lang: () => lang,
  render,
  say,
  sound: (effect, i) => sound.play(effect, i),
  reward: (job) => {
    book.coins = Math.min(9999, book.coins + WAGES[job])
    save()
  },
})

function render(): void {
  const focus = document.activeElement
  const attrs =
    focus instanceof HTMLElement && root.contains(focus)
      ? Array.from(focus.attributes).filter((a) => a.name.startsWith('data-') || a.name === 'id')
      : []
  const focusedNav = focus?.closest('nav')
  const focusedHeader = focus?.closest('header')
  const v: View = {
    book,
    lang,
    muted,
    place,
    selected,
    tender,
    studio,
    studioTab,
    stamp,
    message,
    visitKitchen,
    windowOpen,
    countedStars,
  }
  const page =
    place === 'shop'
      ? shopView(v)
      : place === 'home'
      ? homeView(v)
      : place === 'album'
      ? albumView(v)
      : play.view()
  root.innerHTML = `${pencilFilter}<div class="sheet">${top(
    v
  )}<main id="game" data-place="${place}">${page}</main></div>`
  document.documentElement.lang = lang
  document.title = title[lang] + ' · Spielzeuge'
  document.querySelector('meta[name="description"]')?.setAttribute('content', blurb[lang])
  if (attrs.length) {
    const area = focusedNav
      ? root.querySelector('nav')
      : focusedHeader
      ? root.querySelector('header')
      : root.querySelector('main')
    const selector = attrs.map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('')
    area?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true })
  }
}
function go(next: Place, toKitchen = false): void {
  visitKitchen = toKitchen
  cancelGesture()
  play.leave()
  sound.stop()
  place = next
  if (next === 'shop' && book.result !== null) {
    book.seated = null
    book.seatedPet = 'none'
    book.tasted = []
    book.result = null
    save()
  }
  studio = false
  windowOpen = false
  selected = null
  tender = null
  message = ''
  render()
  window.scrollTo(0, 0)
  if (next === 'home' && !toKitchen)
    say(hasMeal(book) ? sceneOf(book).arrival[lang] : tx(book.result !== null ? 'finished' : 'emptyTable'))
}
function changeLang(next: typeof lang): void {
  if (next === lang) return
  cancelGesture()
  sound.stop()
  play.pause()
  lang = next
  saveLang(lang)
  // A link can supply the initial language. Keep a later manual choice on reload.
  const url = new URL(location.href)
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', lang)
    history.replaceState(history.state, '', url)
  }
  message = ''
  voice.languageChanged()
  render()
  if (place === 'games') play.resume()
}
function add(food: Food): void {
  if (place !== 'shop' || tender || hasMeal(book)) return
  if (book.cart.length >= CAPACITY) {
    feedback(tx('full'))
    render()
    return
  }
  book.cart.push(food)
  save()
  sound.play('basket')
  const text = FOOD[food].name[lang]
  message = text + ' ✓'
  say(text + '. ' + tx('added'))
  render()
  root.querySelector(`[data-add="${food}"]`)?.classList.add('just-picked')
}
function requestWish(): void {
  say(menu(book).wish[lang])
  sound.play('tap')
  const bubble = root.querySelector<HTMLElement>('.speech-slip')
  if (bubble) {
    bubble.textContent = menu(book).wish[lang]
    bubble.classList.add('long')
  }
}
function toCheckout(): void {
  if (!book.cart.length || hasMeal(book) || book.coins < price(book.cart)) return
  tender = []
  message = ''
  sound.play('tap')
  say(tx('payPrompt'))
  render()
  window.scrollTo(0, 0)
}
function deposit(n: number): void {
  if (!tender || ![1, 2, 5].includes(n)) return
  const bill = price(book.cart),
    paid = tender.reduce((a, b) => a + b, 0)
  if (paid + n > bill) {
    feedback(tx('over'))
    render()
    return
  }
  tender.push(n)
  sound.play('coin')
  message = paid + n === bill ? tx('exact') : ''
  say(`${n}. ${message || tx('left') + ' ' + (bill - paid - n)}`)
  render()
}
function pay(): void {
  if (!tender) return
  if (
    !checkout(
      book,
      tender.reduce((a, b) => a + b, 0)
    )
  ) {
    feedback(tx('payPrompt'))
    render()
    return
  }
  save()
  cancelGesture()
  place = 'home'
  tender = null
  selected = null
  visitKitchen = false
  windowOpen = false
  countedStars = []
  message = sceneOf(book).arrival[lang] + ' ' + tx('chooseFood')
  sound.play('till')
  say(message)
  render()
  window.scrollTo(0, 0)
}
function choose(food: Portion): void {
  if (isBowl(food) ? !pendingBowls(book).includes(food) : !book.table.includes(food)) return
  windowOpen = false
  selected = food
  message = isBowl(food)
    ? tableWords.bowl[lang]
    : food === 'chips' && book.chipsOpen
    ? tx('opened')
    : FOOD[food].hint[lang]
  say(portionName(food, lang) + '. ' + message)
  sound.play('tap')
  render()
}
function cut(): void {
  if (selected !== 'chips' || book.chipsOpen || !book.table.includes('chips')) return
  book.chipsOpen = true
  save()
  sound.play('snip')
  feedback(tx('opened'))
  render()
}
let reactionTimer = 0
function showBite(food: Portion, from: DOMRect, to: DOMRect): void {
  if (!document.body.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const part = document.createElement('div')
  part.className = 'serving-flight'
  part.setAttribute('aria-hidden', 'true')
  part.innerHTML = servingArt(food)
  part.style.left = from.left + from.width / 2 + 'px'
  part.style.top = from.top + from.height / 2 + 'px'
  document.body.append(part)
  const mouthX = food === 'cat' ? 0.43 : 0.5
  const mouthY = food === 'cat' ? 0.39 : food === 'dog' ? 0.43 : 0.59
  const dx = to.left + to.width * mouthX - from.left - from.width / 2
  const dy = to.top + to.height * mouthY - from.top - from.height / 2
  const motion = part.animate(
    [
      { transform: 'translate(-50%, -50%) scale(.85)' },
      {
        transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55 - 18}px)) rotate(-8deg)`,
        offset: 0.45,
      },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)`, opacity: 0 },
    ],
    { duration: 410, easing: 'ease-in-out' }
  )
  motion.onfinish = motion.oncancel = () => part.remove()
}
function feed(seat?: Seat, carried = false): void {
  const food = selected
  if (!food) {
    const hint = hasMeal(book) ? (book.table.length ? tx('chooseFood') : tableWords.stillHungry[lang]) : ''
    if (seat === 'cat' || seat === 'dog') {
      sound.play(seat)
      feedback([tx(seat === 'cat' ? 'catTalk' : 'dogTalk'), hint].filter(Boolean).join(' '))
    } else if (hint) feedback(hint)
    else if (seat) say(seatName(seat, lang))
    render()
    return
  }
  const target = seat ?? recipients(book, food)[0]
  const wasLastHumanPortion = !isBowl(food) && book.table.length === 1
  const from = root.querySelector(`[data-table="${food}"]`)?.getBoundingClientRect()
  const targetSelector = `.table-character[data-seat="${target}"]`
  const to = root.querySelector(targetSelector)?.getBoundingClientRect()
  if (!serve(book, food, target)) {
    const who = recipients(book, food)
      .map((s) => seatName(s, lang))
      .join(', ')
    feedback(food === 'chips' && !book.chipsOpen ? FOOD.chips.hint[lang] : tableWords.for[lang] + ' — ' + who)
    render()
    return
  }
  if (from && to && !carried && food !== 'water') showBite(food, from, to)
  selected = null
  windowOpen = false
  save()
  sound.play(food === 'water' ? 'drink' : food === 'cat' || food === 'dog' ? food : 'eat')
  let nextHint: string
  if (typeof book.result === 'number') {
    stamp = book.result
    nextHint = [sceneOf(book).farewell[lang], MEALS[stamp].prize[lang], newGuestMessage(book, lang)]
      .filter(Boolean)
      .join(' ')
    sound.play('sticker')
  } else if (book.result === 'free') nextHint = tx('freeMeal')
  else if (!book.table.length) nextHint = tableWords.stillHungry[lang]
  else nextHint = wasLastHumanPortion ? tableWords.share[lang] : tx('chooseFood')
  feedback(yummy(food, lang) + ' ' + nextHint)
  render()
  const diner = root.querySelector(targetSelector)
  diner?.classList.add('delighted')
  clearTimeout(reactionTimer)
  reactionTimer = window.setTimeout(() => diner?.classList.remove('delighted'), 720)
}

interface Carry {
  id: number
  food: Portion
  x: number
  y: number
  moved: boolean
  ghost: HTMLElement | null
}
let carry: Carry | null = null
let pourTimer = 0
let pouring: Seat | null = null
let pressMouth = -1
let leverStart: { id: number; y: number } | null = null
let ignorePointerClick = false
const POUR_MS = 720
function stopPour(): void {
  clearTimeout(pourTimer)
  pourTimer = 0
  pouring = null
  root.querySelector('.table-character.pouring')?.classList.remove('pouring')
}
function cancelGesture(): void {
  stopPour()
  carry?.ghost?.remove()
  carry = null
  pressMouth = -1
  leverStart = null
  root.querySelectorAll('.targeted').forEach((el) => el.classList.remove('targeted'))
}
function startPour(seat = recipients(book, 'water')[0]): void {
  if (selected !== 'water' || pouring === seat) return
  stopPour()
  if (!recipients(book, 'water').includes(seat)) {
    feed(seat)
    return
  }
  pouring = seat
  root.querySelector(`[data-seat="${seat}"]`)?.classList.add('pouring')
  pourTimer = window.setTimeout(() => {
    const heldByPointer = pressMouth !== -1 || carry?.moved === true
    cancelGesture()
    if (place !== 'home' || studio || document.hidden || selected !== 'water') return
    ignorePointerClick = heldByPointer
    feed(seat)
  }, POUR_MS)
}
function seatAt(x: number, y: number): Seat | undefined {
  for (const el of root.querySelectorAll<HTMLElement>('.table-character')) {
    const r = el.getBoundingClientRect()
    if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top + r.height * 0.18 && y <= r.bottom + 4)
      return el.dataset.seat as Seat
  }
}
root.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !e.isPrimary || !(e.target instanceof Element)) return
  ignorePointerClick = false
  const target = e.target.closest<HTMLElement>('button')
  if (!target) return
  if (place === 'games' && play.active === 'orchard' && target.hasAttribute('data-lane')) {
    play.move(Number(target.dataset.lane))
  }
  if (target.matches('.register') && tender) leverStart = { id: e.pointerId, y: e.clientY }
  if (place !== 'home' || studio) return
  const f = target.dataset.table
  if (isFood(f) || isBowl(f)) {
    cancelGesture()
    carry = { id: e.pointerId, food: f, x: e.clientX, y: e.clientY, moved: false, ghost: null }
  } else if (target.matches('.table-character') && selected === 'water') {
    voice.begin('')
    pressMouth = e.pointerId
    startPour(target.dataset.seat as Seat)
  }
})
window.addEventListener('pointermove', (e) => {
  if (place === 'games' && play.active === 'orchard' && e.buttons === 1) {
    const lanes = root.querySelector('.orchard-lanes')?.getBoundingClientRect()
    if (lanes && e.clientY >= lanes.top && e.clientY <= lanes.bottom)
      play.move(Math.floor(((e.clientX - lanes.left) / lanes.width) * 3))
  }
  if (pressMouth === e.pointerId && seatAt(e.clientX, e.clientY) !== pouring) {
    stopPour()
    pressMouth = -1
  }
  const c = carry
  if (!c || c.id !== e.pointerId) return
  if (!c.moved && Math.hypot(e.clientX - c.x, e.clientY - c.y) < 7) return
  if (!c.moved) {
    c.moved = true
    selected = c.food
    message = ''
    voice.begin(portionName(c.food, lang))
    sound.play('tap')
    c.ghost = document.createElement('div')
    c.ghost.className = 'carry-ghost'
    c.ghost.innerHTML = c.food === 'chips' && !book.chipsOpen ? '<span>✂</span>' : servingArt(c.food)
    document.body.append(c.ghost)
    root.querySelector(`[data-table="${c.food}"]`)?.classList.add('chosen')
  }
  if (c.ghost) c.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -60%)`
  const near = seatAt(e.clientX, e.clientY)
  root
    .querySelectorAll<HTMLElement>('.table-character')
    .forEach((el) =>
      el.classList.toggle(
        'targeted',
        el.dataset.seat === near && near !== undefined && recipients(book, c.food).includes(near)
      )
    )
  if (near && c.food === 'water' && recipients(book, 'water').includes(near)) startPour(near)
  else if (pouring) stopPour()
})
window.addEventListener('pointerup', (e) => {
  if (leverStart?.id === e.pointerId) {
    const pulled = Math.abs(e.clientY - leverStart.y) > 16
    leverStart = null
    if (pulled) {
      ignorePointerClick = true
      voice.begin('')
      pay()
      return
    }
  }
  if (pressMouth === e.pointerId) {
    const early = pouring
    stopPour()
    pressMouth = -1
    ignorePointerClick = true
    if (early) {
      feedback(tx('keepHolding'))
      render()
    }
    return
  }
  const c = carry
  if (!c || c.id !== e.pointerId) return
  const atMouth = seatAt(e.clientX, e.clientY)
  cancelGesture()
  if (!c.moved) return
  ignorePointerClick = true
  if (c.food === 'chips' && !book.chipsOpen && Math.abs(e.clientX - c.x) >= 24) cut()
  else if (atMouth && c.food !== 'water') feed(atMouth, true)
  else {
    message =
      c.food === 'water' && atMouth
        ? recipients(book, 'water').includes(atMouth)
          ? tx('keepHolding')
          : tableWords.for[lang] +
            ' — ' +
            recipients(book, 'water')
              .map((id) => seatName(id, lang))
              .join(', ')
        : c.food === 'chips' && book.chipsOpen
        ? tx('opened')
        : isBowl(c.food)
        ? tableWords.bowl[lang]
        : FOOD[c.food].hint[lang]
    say(message)
    render()
  }
})
window.addEventListener('pointercancel', cancelGesture)

root.addEventListener('change', (e) => {
  if (e.target instanceof HTMLSelectElement && isLang(e.target.value)) changeLang(e.target.value)
})
root.addEventListener('click', (e) => {
  const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button') : null
  if (!b || b.disabled || (e.detail > 0 && ignorePointerClick)) return
  const d = b.dataset
  if (d.action === 'mute') {
    muted = !muted
    try {
      localStorage.setItem(SOUND_KEY, muted ? '1' : '0')
    } catch {
      /* In-memory control. */
    }
    voice.silence()
    sound.stop()
    if (!muted) {
      voice.begin(tx('unmute'))
      sound.play('tap')
    }
    render()
    return
  }
  voice.begin('')
  if (d.nav) {
    go(d.nav as Place)
    if (d.nav === 'shop' && hasMeal(book)) {
      say(tx('orderPaid') + '. ' + sceneOf(book).name[lang] + '. ' + tableWords.returnMeal[lang])
    } else if (d.nav !== 'home') say(tx(d.nav as Place))
    return
  }
  if (isFood(d.add)) {
    add(d.add)
    return
  }
  if (isFood(d.remove)) {
    if (hasMeal(book)) return
    const i = book.cart.indexOf(d.remove)
    if (i >= 0) book.cart.splice(i, 1)
    save()
    sound.play('basket')
    feedback(FOOD[d.remove].name[lang] + '. ' + tx('removed'))
    render()
    return
  }
  if (d.coin) {
    deposit(Number(d.coin))
    return
  }
  if (isFood(d.table) || isBowl(d.table)) {
    choose(d.table)
    return
  }
  if (d.job === 'jars' || d.job === 'orchard' || d.job === 'bakery' || d.job === 'regatta') {
    sound.stop()
    play.start(d.job)
    return
  }
  if (d.gameAction) {
    play.act(d.gameAction, Number(d.index))
    return
  }
  if (d.jar !== undefined) {
    if (b.getAttribute('aria-disabled') !== 'true') {
      say(JARS[Number(d.jar)][lang])
      play.strike(Number(d.jar))
    }
    return
  }
  if (d.lane !== undefined) {
    play.move(Number(d.lane))
    say(LANES[play.lane][lang])
    return
  }
  if (d.stamp !== undefined) {
    stamp = Number(d.stamp)
    sound.play('tap')
    const meal = MEALS[stamp]
    say(meal.prize[lang] + '. ' + (stamp < book.day ? meal.wish[lang] : tx('locked')))
    render()
    return
  }
  if (d.studioTab === 'paint' || d.studioTab === 'guests') {
    studioTab = d.studioTab
    sound.play('tap')
    say(studioTabName(studioTab, lang))
    render()
    return
  }
  if (studio && (d.guest || d.style || d.pet || d.paint)) {
    const label = applyStudioChoice(book, d, lang)
    save()
    sound.play('tap')
    say(label)
    render()
    return
  }
  switch (d.action) {
    case 'counter':
      if (hasMeal(book)) go('home')
      else if (book.coins < price(book.cart)) {
        go('games')
        say(tx('short'))
      } else if (!book.cart.length) {
        feedback(tx('emptyCart'))
        render()
      } else toCheckout()
      return
    case 'wish':
      requestWish()
      return
    case 'checkout':
      toCheckout()
      return
    case 'lever':
      pay()
      return
    case 'undo':
      if (tender?.length) {
        tender.pop()
        message = ''
        say(tx('undo'))
        sound.play('coin')
        render()
      }
      return
    case 'shelves':
      go('shop')
      say(tx('toShop'))
      return
    case 'goHome':
      go('home')
      return
    case 'earn':
      go('games')
      say(tx('gameIntro'))
      return
    case 'next':
      go('shop')
      requestWish()
      return
    case 'cut':
      cut()
      return
    case 'mouth':
      if (d.seat && (studio || visitKitchen || !hasMeal(book))) {
        if (d.seat === 'cat' || d.seat === 'dog') {
          sound.play(d.seat)
          say(tx(d.seat === 'cat' ? 'catTalk' : 'dogTalk'))
        } else say(seatName(d.seat as Seat, lang))
        return
      }
      if (selected === 'water') startPour((d.seat ?? d.to) as Seat | undefined)
      else feed((d.seat ?? d.to) as Seat | undefined)
      return
    case 'pour':
      startPour(d.to as Seat | undefined)
      return
    case 'star': {
      const id = Number(d.star)
      if (!windowOpen || studio || visitKitchen || sceneOf(book).id !== 'moonlight' || !starLabels[id]) return
      if (!countedStars.includes(id)) {
        countedStars.push(id)
        sound.play(countedStars.length === starLabels.length ? 'sticker' : 'jar', countedStars.length - 1)
      }
      say(starCounts[countedStars.length - 1][lang])
      render()
      return
    }
    case 'countAgain':
      if (!windowOpen || sceneOf(book).id !== 'moonlight') return
      countedStars = []
      sound.play('tap')
      say(sceneOf(book).discovery.line[lang])
      render()
      root.querySelector<HTMLElement>('[data-star]')?.focus({ preventScroll: true })
      return
    case 'window': {
      windowOpen = !windowOpen
      const story = (visitKitchen || studio ? MEAL_SCENES[0] : sceneOf(book)).discovery
      say(windowOpen ? story.line[lang] : story.label[lang])
      sound.play(story.art === 'basket' ? 'cat' : 'apple')
      render()
      if (story.art === 'star' && windowOpen)
        root.querySelector<HTMLElement>('[data-star]')?.focus({ preventScroll: true })
      return
    }
    case 'music':
      sound.stop()
      say(musicName(lang))
      sound.play('music')
      return
    case 'studio':
      cancelGesture()
      selected = null
      message = ''
      studioTab = 'paint'
      studio = true
      sound.play('tap')
      say(tx('studio'))
      render()
      return
    case 'studioDone':
      studio = false
      say(tx('done'))
      sound.play('tap')
      render()
      return
    case 'hang':
      if (stamp < book.day) {
        book.wall = stamp
        save()
        go('home', true)
        say(tx('hung'))
        sound.play('sticker')
      }
      return
    case 'replay':
      say(tx('watch'))
      play.replay()
      return
  }
})
window.addEventListener('keydown', (e) => {
  if (place !== 'games' || play.active !== 'orchard' || play.won || e.target instanceof HTMLSelectElement)
    return
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    play.move(play.lane + (e.key === 'ArrowLeft' ? -1 : 1))
    voice.begin(LANES[play.lane][lang])
  }
})
function pause(): void {
  hidden = true
  cancelGesture()
  play.pause()
  clearTimeout(reactionTimer)
  sound.stop()
  voice.silence()
}
function resume(): void {
  if (document.hidden || !hidden) return
  hidden = false
  play.resume()
}
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()))
window.addEventListener('pagehide', () => {
  pause()
  sound.close()
})
window.addEventListener('pageshow', resume)
window.addEventListener('storage', (e) => {
  if (e.key === SAVE_KEY) {
    cancelGesture()
    book = readBook(e.newValue)
    tender = null
    selected = null
    message = ''
    render()
  } else if (e.key === SOUND_KEY) {
    muted = e.newValue === '1'
    sound.stop()
    voice.silence()
    render()
  } else if (e.key === STORAGE_KEY && isLang(e.newValue)) changeLang(e.newValue)
})
render()
