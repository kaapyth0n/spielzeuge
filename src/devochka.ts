import '@fontsource/pangolin/cyrillic-400.css'
import '@fontsource/pangolin/latin-400.css'
import '@fontsource/nunito/cyrillic-600.css'
import '@fontsource/nunito/cyrillic-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'
import './devochka.css'
import { isLang, loadLang, saveLang, STORAGE_KEY } from './languages.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { LunchSounds } from './devochka-audio.ts'
import { bite, pencilFilter } from './devochka-art.ts'
import {
  blurb,
  COLOURS,
  EYES,
  FOOD,
  JARS,
  LANES,
  MEALS,
  MOUTHS,
  T,
  title,
  WINDOW_STORIES,
  type Food,
  type TextKey,
} from './devochka-copy.ts'
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
let place: Place = book.table.length || book.result !== null ? 'home' : 'shop'
let selected: Food | null = null
let tender: number[] | null = null
let studio = false
let stamp = Math.min(Math.max(0, book.day - 1), MEALS.length - 1)
let windowOpen = false
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
  say: (k) => say(tx(k)),
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
  const v: View = { book, lang, muted, place, selected, tender, studio, stamp, message, windowOpen }
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
function go(next: Place): void {
  cancelGesture()
  play.leave()
  sound.stop()
  place = next
  if (next === 'shop' && book.result !== null) {
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
  if (next === 'home')
    say(tx(book.table.length ? 'chooseFood' : book.result !== null ? 'finished' : 'emptyTable'))
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
  if (place !== 'shop' || tender) return
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
  if (!book.cart.length || book.table.length || book.coins < price(book.cart)) return
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
  message = tx('packed')
  sound.play('till')
  say(message)
  render()
  window.scrollTo(0, 0)
}
function choose(food: Food): void {
  if (!book.table.includes(food)) return
  windowOpen = false
  selected = food
  message = food === 'chips' && book.chipsOpen ? tx('opened') : FOOD[food].hint[lang]
  say(FOOD[food].name[lang] + '. ' + message)
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
function showBite(food: Food, from: DOMRect, to: DOMRect): void {
  if (!document.body.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const part = document.createElement('div')
  part.className = 'serving-flight'
  part.setAttribute('aria-hidden', 'true')
  part.innerHTML = bite(food)
  part.style.left = from.left + from.width / 2 + 'px'
  part.style.top = from.top + from.height / 2 + 'px'
  document.body.append(part)
  const dx = to.left + to.width * 0.5 - from.left - from.width / 2
  const dy = to.top + to.height * 0.64 - from.top - from.height / 2
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
function feed(carried = false): void {
  const food = selected
  if (!food || !book.table.includes(food)) {
    feedback(tx(book.table.length ? 'chooseFood' : 'emptyTable'))
    render()
    return
  }
  const from = root.querySelector(`[data-table="${food}"]`)?.getBoundingClientRect()
  const to = root.querySelector('.table-character')?.getBoundingClientRect()
  if (!serve(book, food)) {
    feedback(FOOD.chips.hint[lang])
    render()
    return
  }
  if (from && to && !carried && food !== 'water') showBite(food, from, to)
  const happy = FOOD[food].happy[lang]
  selected = null
  save()
  sound.play(food === 'water' ? 'drink' : 'eat')
  const prize = typeof book.result === 'number' ? MEALS[book.result] : null
  feedback(
    book.table.length
      ? happy + ' ' + tx('chooseFood')
      : happy + ' ' + tx('finished') + (prize ? ' ' + prize.prize[lang] + '!' : '')
  )
  if (prize) sound.play('sticker')
  render()
  const girl = root.querySelector('.table-character')
  girl?.classList.add('delighted')
  clearTimeout(reactionTimer)
  reactionTimer = window.setTimeout(() => girl?.classList.remove('delighted'), 720)
}

interface Carry {
  id: number
  food: Food
  x: number
  y: number
  moved: boolean
  ghost: HTMLElement | null
}
let carry: Carry | null = null
let pourTimer = 0
let pouring = false
let pressMouth = -1
let leverStart: { id: number; y: number } | null = null
let ignorePointerClick = false
const POUR_MS = 720
function stopPour(): void {
  clearTimeout(pourTimer)
  pourTimer = 0
  pouring = false
  root.querySelector('.table-character')?.classList.remove('pouring')
}
function cancelGesture(): void {
  stopPour()
  carry?.ghost?.remove()
  carry = null
  pressMouth = -1
  leverStart = null
  root.querySelector('.table-character')?.classList.remove('targeted')
}
function startPour(): void {
  if (pouring || selected !== 'water') return
  pouring = true
  root.querySelector('.table-character')?.classList.add('pouring')
  pourTimer = window.setTimeout(() => {
    const heldByPointer = pressMouth !== -1 || carry?.moved === true
    cancelGesture()
    if (place !== 'home' || studio || document.hidden || selected !== 'water') return
    ignorePointerClick = heldByPointer
    feed()
  }, POUR_MS)
}
function nearFace(x: number, y: number): boolean {
  const rect = root.querySelector('.table-character')?.getBoundingClientRect()
  return (
    !!rect &&
    x >= rect.left - 8 &&
    x <= rect.right + 8 &&
    y >= rect.top + rect.height * 0.25 &&
    y <= rect.bottom + 6
  )
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
  if (isFood(f)) {
    cancelGesture()
    carry = { id: e.pointerId, food: f, x: e.clientX, y: e.clientY, moved: false, ghost: null }
  } else if (target.matches('.table-character') && selected === 'water') {
    voice.begin('')
    pressMouth = e.pointerId
    startPour()
  }
})
window.addEventListener('pointermove', (e) => {
  if (place === 'games' && play.active === 'orchard' && e.buttons === 1) {
    const lanes = root.querySelector('.orchard-lanes')?.getBoundingClientRect()
    if (lanes && e.clientY >= lanes.top && e.clientY <= lanes.bottom)
      play.move(Math.floor(((e.clientX - lanes.left) / lanes.width) * 3))
  }
  if (pressMouth === e.pointerId && !nearFace(e.clientX, e.clientY)) {
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
    voice.begin(FOOD[c.food].name[lang])
    sound.play('tap')
    c.ghost = document.createElement('div')
    c.ghost.className = 'carry-ghost'
    c.ghost.innerHTML = c.food === 'chips' && !book.chipsOpen ? '<span>✂</span>' : bite(c.food)
    document.body.append(c.ghost)
    root.querySelector(`[data-table="${c.food}"]`)?.classList.add('chosen')
  }
  if (c.ghost) c.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -60%)`
  const near = nearFace(e.clientX, e.clientY)
  root.querySelector('.table-character')?.classList.toggle('targeted', near)
  if (near && c.food === 'water') startPour()
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
  const atMouth = nearFace(e.clientX, e.clientY)
  cancelGesture()
  if (!c.moved) return
  ignorePointerClick = true
  if (c.food === 'chips' && !book.chipsOpen && Math.abs(e.clientX - c.x) >= 24) cut()
  else if (atMouth && c.food !== 'water') feed(true)
  else {
    message =
      c.food === 'water' && atMouth
        ? tx('keepHolding')
        : c.food === 'chips' && book.chipsOpen
        ? tx('opened')
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
    say(tx(d.nav as Place))
    return
  }
  if (isFood(d.add)) {
    add(d.add)
    return
  }
  if (isFood(d.remove)) {
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
  if (isFood(d.table)) {
    choose(d.table)
    return
  }
  if (d.job === 'jars' || d.job === 'orchard') {
    sound.stop()
    play.start(d.job)
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
  if (d.guest || d.style || d.pet) {
    let label = ''
    if (d.guest) {
      book.friend = d.guest === 'friend'
      label = tx(book.friend ? 'friend' : 'original')
    }
    if (d.style === 'eyes' || d.style === 'mouth' || d.style === 'colour') {
      const i = Number(d.value)
      book[d.style] = i
      label = { eyes: EYES, mouth: MOUTHS, colour: COLOURS }[d.style][i][lang]
    }
    if (d.pet === 'cat' || d.pet === 'dog' || d.pet === 'none') {
      book.pet = d.pet
      label = tx(d.pet)
    }
    save()
    sound.play('tap')
    say(label)
    render()
    return
  }
  switch (d.action) {
    case 'counter':
      if (book.table.length) go('home')
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
      if (studio) {
        say(tx('guest'))
        return
      }
      if (selected === 'water') startPour()
      else feed()
      return
    case 'pour':
      startPour()
      return
    case 'pet':
      if (book.pet !== 'none') {
        sound.play(book.pet)
        say(tx(book.pet === 'cat' ? 'catTalk' : 'dogTalk'))
        b.animate?.(
          [{ transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }],
          { duration: 350 }
        )
      }
      return
    case 'window': {
      windowOpen = !windowOpen
      const index = typeof book.result === 'number' ? book.result : book.day % MEALS.length
      const story = WINDOW_STORIES[index]
      say(windowOpen ? story.line[lang] : story.label[lang])
      sound.play(story.art === 'cat' ? 'cat' : 'apple')
      render()
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
        go('home')
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
