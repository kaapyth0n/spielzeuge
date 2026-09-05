import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import './sobachka.css'
import { PuppyNarration } from './sobachka-narration.ts'
import { loadLang, saveLang, type Lang } from './languages.ts'
import { PUPPY_COPY } from './sobachka-copy.ts'
import { icon, puppy, wallArt } from './sobachka-art.ts'
import {
  PUPPY_KEY,
  careFor,
  freshPuppy,
  restorePuppy,
  shuffled,
  unlockedGames,
  type Care,
} from './sobachka-state.ts'

const root = document.querySelector<HTMLElement>('#puppy-app')!
let state = freshPuppy()
let persistent = true
try {
  state = restorePuppy(localStorage.getItem(PUPPY_KEY))
} catch {
  persistent = false
}
let lang = loadLang()
let copy = PUPPY_COPY[lang]
const narration = new PuppyNarration(() => ({ lang, enabled: state.sound }))
type Screen =
  | 'room'
  | 'kitchen'
  | 'bathroom'
  | 'garden'
  | 'games'
  | 'fetch'
  | 'memory'
  | 'shapes'
  | 'win'
let screen: Screen = 'room'
let mood = ''
let pottyResult: 'pee' | 'poop' | null = null
let busy = false
let message = copy.welcome
let progress = 0
let lastGame: Screen = 'fetch'
let flowers = new Set<number>()
let cards: string[] = []
let flipped: number[] = []
let matched = new Set<number>()
let memoryPairs = 3
let shape = 'circle'
const shapes = ['circle', 'triangle', 'square', 'star']
let shapeChoices = [...shapes]
const timers = new Set<number>()
let audio: AudioContext | undefined
let suppressedClickUntil = 0
const positions = [
  [18, 56],
  [72, 53],
  [39, 68],
  [80, 75],
  [13, 77],
]

function save(): void {
  try {
    localStorage.setItem(PUPPY_KEY, JSON.stringify(state))
  } catch {
    persistent = false
  }
}
function later(fn: () => void, ms: number): void {
  const id = window.setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}
function tone(kind = 'happy'): void {
  if (!state.sound) return
  try {
    audio ??= new AudioContext()
    void audio.resume().catch(() => {})
    const now = audio.currentTime
    const notes =
      kind === 'squeak'
        ? [620, 890, 610]
        : kind === 'win'
          ? [523, 659, 784, 1047]
          : [523, 659]
    notes.forEach((frequency, i) => {
      const osc = audio!.createOscillator()
      const volume = audio!.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, now + i * 0.105)
      volume.gain.setValueAtTime(0, now + i * 0.105)
      volume.gain.linearRampToValueAtTime(0.045, now + i * 0.105 + 0.02)
      volume.gain.exponentialRampToValueAtTime(0.001, now + i * 0.105 + 0.22)
      osc.connect(volume).connect(audio!.destination)
      osc.start(now + i * 0.105)
      osc.stop(now + i * 0.105 + 0.24)
    })
  } catch {
    /* Silent play is fully supported. */
  }
}
function say(text: string): void {
  message = text
  const node = root.querySelector('#message')
  if (node) node.textContent = text
  narration.announce([text])
  narration.observe(root)
}
function btn(
  action: string,
  art: string,
  label: string,
  cls = '',
  extra = '',
): string {
  return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${icon(art)}<span>${label}</span></button>`
}
function hint(): string {
  if (screen === 'room')
    return mood === 'sleeping'
      ? copy.sleepHint
      : mood === 'playing'
        ? copy.ballHint
        : copy.hint
  return {
    kitchen: copy.foodHint,
    bathroom: pottyResult ? copy.toiletDone : copy.toiletHint,
    garden: copy.walkHint,
    games: unlockedGames(state.hearts) === 3 ? copy.allOpen : copy.gamesHint,
    fetch: copy.fetchHint,
    memory: copy.memoryHint,
    shapes: copy.shapeHint,
    win: copy.winHint,
  }[screen]
}
function scene(): string {
  const garden = screen === 'garden'
  const kitchen = screen === 'kitchen'
  const bathroom = screen === 'bathroom'
  return `<div class="scene ${garden ? 'garden' : kitchen ? 'kitchen' : bathroom ? 'bathroom' : ''} ${mood}" data-wall="${state.wall}">
    <div class="wall-art" aria-hidden="true">${garden ? '' : wallArt(state.wall)}</div>
    ${garden ? '<div class="sun" aria-hidden="true"></div><div class="hill hill-one"></div><div class="hill hill-two"></div><div class="garden-path"></div>' : '<div class="window" aria-hidden="true"><div class="window-sun"></div><div class="window-hill"></div><i></i></div><div class="floor"></div>'}
    ${!garden && !bathroom ? '<div class="rug" aria-hidden="true"><div></div></div>' : ''}
    ${screen === 'room' ? `<div class="wall-picker">${btn('wall', 'wall', copy.wall, 'wall-button', `aria-label="${copy.wall}: ${copy.walls[state.wall]}"`)}<div class="wall-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i === state.wall ? 'active' : ''}"></i>`).join('')}</div></div>` : ''}
    ${bathroom ? `<div class="bathroom-sign" aria-hidden="true">${icon('walk')}</div><div class="potty-tray" role="img" aria-label="${copy.potty}"><div class="potty-pad"></div></div>${pottyResult ? `<div class="potty-result ${pottyResult}" aria-hidden="true">${pottyResult === 'poop' ? icon('poop') : ''}</div>` : ''}<div class="clean-sparkles" aria-hidden="true">✧ ✦ ✧</div>` : ''}
    <div class="dog-wrap">${btn('pet', '', '', 'puppy-button', `aria-label="${copy.pet}"`).replace(icon(''), puppy())}<div class="sleep-z" aria-hidden="true">z z Z</div><div class="love-puff" aria-hidden="true">♥</div></div>
    ${screen === 'room' ? `${btn('toy', 'toy', '', 'squeaky', `aria-label="${copy.toy}"`)}${btn('ball', 'ball', '', 'room-ball', `aria-label="${copy.ball}"`)}` : ''}
    ${kitchen ? `<div id="food-bowl" class="food-bowl" role="img" aria-label="${copy.bowl}">${icon('feed')}</div>` : ''}
    ${garden ? positions.map(([x, y], i) => btn(`flower-${i}`, 'flower', '', `flower-pick ${flowers.has(i) ? 'picked' : ''}`, `style="left:${x}%;top:${y}%" aria-label="${copy.flower} ${i + 1}" ${flowers.has(i) ? 'disabled' : ''}`)).join('') : ''}
    ${mood === 'sleeping' ? '<div class="night-stars" aria-hidden="true">✧ · ✦ · ✧</div><div class="nap-progress"><i></i></div>' : ''}
  </div>`
}
function gamesPage(): string {
  const open = unlockedGames(state.hearts)
  return `<div class="game-shelf">${['ball', 'memory', 'wall']
    .map((art, i) => {
      const locked = i >= open
      return `<button type="button" class="game-card game-card-${i} ${locked ? 'locked' : ''}" data-action="game-${i}" ${locked ? 'disabled' : ''}>
      <span class="game-art">${icon(art)}<span class="card-spark">✧</span></span>
      <strong>${copy.gameNames[i]}</strong><span class="game-description">${copy.gameHints[i]}</span>
      <span class="game-cta">${locked ? `${icon('lock')} ${state.hearts} / ${i * 3} ♥ · ${copy.locked}` : `${copy.open} <span>↗</span>`}</span>
    </button>`
    })
    .join(
      '',
    )}</div><p class="games-note">${icon('heart')}${open === 3 ? copy.allOpen : copy.gamesHint}</p>`
}
function gamePage(): string {
  if (screen === 'win')
    return `<div class="win-scene"><div class="win-stars" aria-hidden="true">${icon('star').repeat(3)}</div><div class="win-puppy">${puppy()}</div><h2>${copy.win}</h2><p>${copy.winHint}</p><div class="win-actions">${btn('again', 'games', copy.again, 'primary-button')}${btn('room', 'home', copy.back, 'soft-button')}</div></div>`
  const count = screen === 'memory' ? matched.size / 2 : progress
  const total = screen === 'memory' ? memoryPairs : 5
  const dots = `<div class="round-dots" aria-label="${count} / ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i < count ? 'complete' : ''}">${i < count ? '✓' : '·'}</i>`).join('')}</div>`
  if (screen === 'fetch') {
    const [x, y] = positions[progress % positions.length]
    return `<div class="fetch-field">${dots}<div class="fetch-cloud" aria-hidden="true"></div><div class="fetch-dog ${busy ? 'fetching' : ''}" style="left:${busy ? x : 46}%">${puppy()}</div>${btn('catch', 'ball', '', 'fetch-ball', `style="left:${x}%;top:${y}%" aria-label="${copy.ball}" ${busy ? 'disabled' : ''}`)}</div>`
  }
  if (screen === 'memory')
    return `<div class="memory-field">${dots}<div class="memory-levels">${[3, 6].map((n, i) => `<button type="button" data-action="pairs-${n}" aria-pressed="${memoryPairs === n}">${copy.pairs[i]}</button>`).join('')}</div><div class="memory-grid ${memoryPairs === 6 ? 'memory-large' : ''}">${cards
      .map((art, i) => {
        const revealed = flipped.includes(i) || matched.has(i)
        const label = revealed
          ? art === 'ball'
            ? copy.ball
            : art === 'flower'
              ? copy.flower
              : copy.shapes[shapes.indexOf(art)]
          : `${copy.card} ${i + 1}`
        return `<button type="button" class="memory-card ${revealed ? 'revealed' : ''} ${matched.has(i) ? 'matched' : ''}" data-action="card-${i}" aria-label="${label}" ${revealed || busy ? 'disabled' : ''}>${revealed ? icon(art) : '<span class="card-paw">✿</span>'}${matched.has(i) ? '<span class="match-check">✓</span>' : ''}</button>`
      })
      .join('')}</div></div>`
  return `<div class="shape-field">${dots}<div class="shape-target">${icon(shape)}</div><div class="shape-options">${shapeChoices.map((s) => btn(`shape-${s}`, s, '', 'shape-choice', `aria-label="${copy.shapes[shapes.indexOf(s)]}" ${busy ? 'disabled' : ''}`)).join('')}</div></div>`
}
function render(focusHeading = false): void {
  const focused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.action
      : undefined
  document.documentElement.lang = lang
  document.title = `${copy.name} · Spielzeuge`
  const gameIndex = ['fetch', 'memory', 'shapes'].indexOf(screen)
  const title =
    gameIndex >= 0
      ? copy.gameNames[gameIndex]
      : {
          room: copy.room,
          kitchen: copy.kitchen,
          bathroom: copy.bathroom,
          garden: copy.garden,
          games: copy.games,
          win: copy.games,
          fetch: '',
          memory: '',
          shapes: '',
        }[screen]
  const mini = ['fetch', 'memory', 'shapes', 'win'].includes(screen)
  root.innerHTML = `<main class="puppy-app">
    <header class="topbar"><a href="/" class="catalog-back" aria-label="${copy.home}">${icon('back')}<span>${copy.home}</span></a><a class="wordmark" href="/">spielzeuge<span> / </span>${copy.name}</a><div class="settings">${btn('sound', state.sound ? 'sound' : 'mute', '', 'icon-button', `aria-label="${state.sound ? copy.soundOn : copy.soundOff}" aria-pressed="${state.sound}"`)}<select id="puppy-language" aria-label="${copy.language}">${(['ru', 'de', 'en'] as Lang[]).map((l) => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select></div></header>
    <div class="page-heading"><div><p class="eyebrow">${copy.tagline}</p><h1>${copy.name}<span class="title-paw" aria-hidden="true">${icon('walk')}</span></h1></div><div class="friendship"><div><span>${copy.friendship}</span><strong>${icon('heart')} ${state.hearts}</strong></div><div class="friendship-track" aria-label="${copy.heartHint}: ${Math.min(6, state.hearts)} / 6">${Array.from({ length: 6 }, (_, i) => `<i class="${i < state.hearts ? 'filled' : ''}"></i>`).join('')}</div><small>${copy.heartHint}</small></div></div>
    <section class="play-panel" aria-labelledby="screen-title"><div class="panel-toolbar"><div class="scene-nav">${screen === 'room' ? btn('games', 'games', copy.games, 'games-button') : btn(mini ? 'games' : 'room', 'back', mini ? copy.games : copy.back, 'back-button')}</div><h2 id="screen-title" tabindex="-1">${title}</h2>${btn('help', 'help', '', 'icon-button', `aria-label="${copy.help}"`)}</div>
    ${['room', 'kitchen', 'garden', 'bathroom'].includes(screen) ? scene() : screen === 'games' ? gamesPage() : gamePage()}
    <div class="speech-row"><span class="speech-heart" aria-hidden="true">${icon('heart')}</span><p id="message" role="status" aria-live="polite">${message}</p></div>
    ${screen === 'room' ? `<nav class="care-actions" aria-label="${copy.heartHint}">${(['walk', 'feed', 'sleep', 'ball', 'toilet'] as Care[]).map((action) => btn(action, action, mood === 'sleeping' && action === 'sleep' ? copy.wake : copy[action], `care-button care-${action} ${state.care[action] > 0 ? 'has-care' : ''} ${mood === 'sleeping' && action === 'sleep' ? 'selected' : ''}`, busy && !(action === 'sleep' && mood === 'sleeping') ? 'disabled' : '')).join('')}</nav>` : ''}
    ${screen === 'kitchen' ? `<div class="food-tray">${['food', 'carrot', 'apple'].map((art, i) => btn(`food-${i}`, art, copy.foodNames[i], 'food-choice', `data-food="${i}" ${busy ? 'disabled' : ''}`)).join('')}</div>` : ''}
    ${screen === 'bathroom' ? `<div class="toilet-actions">${pottyResult ? btn('clean-potty', 'clean', copy.clean, 'potty-choice', busy ? 'disabled' : '') : (['pee', 'poop'] as const).map((kind) => btn(`potty-${kind}`, kind, copy[kind], 'potty-choice', busy ? 'disabled' : '')).join('')}</div>` : ''}
    ${screen === 'garden' ? `<div class="bouquet" aria-label="${flowers.size} / 5">${positions.map((_, i) => `<span class="${i < flowers.size ? 'collected' : ''}">${icon('flower')}</span>`).join('')}</div>` : ''}
    </section><footer class="puppy-footer"><span>${hint()}</span><span>${persistent ? copy.saved : copy.notSaved}</span></footer>
  </main>`
  narration.observe(root)
  if (focusHeading)
    root
      .querySelector<HTMLElement>('#screen-title')
      ?.focus({ preventScroll: true })
  else if (focused)
    root
      .querySelector<HTMLElement>(`[data-action="${focused}"]`)
      ?.focus({ preventScroll: true })
}
function navigate(next: Screen): void {
  cancelDrag()
  timers.forEach((id) => clearTimeout(id))
  timers.clear()
  busy = false
  mood = ''
  screen = next
  pottyResult = null
  progress = 0
  if (next === 'garden') flowers = new Set()
  if (next === 'memory') {
    const symbols = [
      'circle',
      'triangle',
      'star',
      'square',
      'ball',
      'flower',
    ].slice(0, memoryPairs)
    cards = shuffled([...symbols, ...symbols])
    flipped = []
    matched = new Set()
  }
  if (next === 'shapes') newShape()
  if (['fetch', 'memory', 'shapes'].includes(next)) lastGame = next
  message = next === 'room' ? copy.welcome : hint()
  render(true)
}
function newShape(): void {
  shape = shuffled(shapes.filter((s) => s !== shape))[0]
  shapeChoices = shuffled(shapes)
}
function completeCare(action: Care, text: string): void {
  state = careFor(state, action)
  save()
  busy = false
  mood = 'happy'
  message = text
  render()
  tone('win')
  later(() => {
    if (mood === 'happy') {
      mood = ''
      root.querySelector('.scene')?.classList.remove('happy')
    }
  }, 1800)
}
function feed(): void {
  if (screen !== 'kitchen' || busy) return
  busy = true
  mood = 'eating'
  message = copy.eating
  render()
  tone()
  later(() => completeCare('feed', copy.fed), 1800)
}
function usePotty(kind: 'pee' | 'poop'): void {
  if (screen !== 'bathroom' || busy || pottyResult) return
  busy = true
  mood = 'using-potty'
  message = kind === 'pee' ? copy.peeing : copy.pooping
  render()
  later(() => {
    pottyResult = kind
    busy = false
    mood = 'potty-done'
    message = copy.toiletDone
    render()
    tone()
  }, 2600)
}
function cleanPotty(): void {
  if (screen !== 'bathroom' || busy || !pottyResult) return
  busy = true
  mood = 'cleaning-potty'
  message = copy.cleaning
  render()
  later(() => {
    pottyResult = null
    completeCare('toilet', copy.toiletClean)
  }, 1000)
}
function finishGame(): void {
  navigate('win')
  message = copy.win
  render(true)
  tone('win')
}
function act(action: string): void {
  if (action === 'sound') {
    state.sound = !state.sound
    save()
    if (state.sound) narration.begin(copy.soundOn)
    else narration.silence()
    render()
    return
  }
  if (action === 'help') {
    narration.announce([hint()])
    say(hint())
    return
  }
  if (action === 'room' || action === 'games') {
    navigate(action)
    return
  }
  if (action.startsWith('pairs-') && screen === 'memory') {
    memoryPairs = action === 'pairs-6' ? 6 : 3
    navigate('memory')
    return
  }
  if (action === 'again') {
    navigate(lastGame)
    return
  }
  if (action === 'wall' && screen === 'room' && !busy) {
    state.wall = (state.wall + 1) % 3
    save()
    message = copy.walls[state.wall]
    render()
    tone()
    return
  }
  if (action === 'sleep' && mood === 'sleeping') {
    navigate('room')
    return
  }
  if (busy) return
  if (action === 'pet') {
    mood = 'happy'
    say(copy.petHappy)
    root.querySelector('.scene')?.classList.add('happy')
    tone()
    later(() => {
      if (mood === 'happy') {
        mood = ''
        root.querySelector('.scene')?.classList.remove('happy')
      }
    }, 1500)
  } else if (action === 'toy') {
    say(copy.squeak)
    tone('squeak')
    const toy = root.querySelector('.squeaky')
    toy?.classList.remove('squish')
    void (toy as HTMLElement)?.offsetWidth
    toy?.classList.add('squish')
  } else if (action === 'feed') navigate('kitchen')
  else if (action === 'walk') navigate('garden')
  else if (action === 'toilet') navigate('bathroom')
  else if (action === 'potty-pee') usePotty('pee')
  else if (action === 'potty-poop') usePotty('poop')
  else if (action === 'clean-potty') cleanPotty()
  else if (action === 'sleep') {
    busy = true
    mood = 'sleeping'
    message = copy.sleepHint
    render()
    later(() => completeCare('sleep', copy.slept), 5500)
  } else if (action === 'ball') {
    busy = true
    mood = 'playing'
    message = copy.ballHint
    render()
    tone()
    later(() => completeCare('ball', copy.played), 3600)
  } else if (action.startsWith('food-')) feed()
  else if (action.startsWith('flower-') && screen === 'garden') {
    const i = Number(action.slice(7))
    if (flowers.has(i) || i < 0 || i >= positions.length) return
    flowers.add(i)
    tone()
    render()
    if (flowers.size === positions.length) completeCare('walk', copy.walked)
  } else if (action.startsWith('game-')) {
    const i = Number(action.slice(5))
    if (i >= 0 && i < unlockedGames(state.hearts))
      navigate((['fetch', 'memory', 'shapes'] as Screen[])[i])
  } else if (action === 'catch' && screen === 'fetch') {
    busy = true
    render()
    tone()
    later(() => {
      busy = false
      progress++
      if (progress >= 5) finishGame()
      else render()
    }, 650)
  } else if (action.startsWith('card-') && screen === 'memory') {
    const i = Number(action.slice(5))
    if (i < 0 || i >= cards.length || flipped.includes(i) || matched.has(i))
      return
    flipped.push(i)
    tone()
    if (flipped.length === 2) {
      busy = true
      const [a, b] = flipped
      const isPair = cards[a] === cards[b]
      if (isPair) {
        matched.add(a)
        matched.add(b)
        message = copy.match
      }
      render()
      later(
        () => {
          busy = false
          flipped = []
          if (matched.size === cards.length) finishGame()
          else {
            message = copy.memoryHint
            render()
          }
        },
        isPair ? 600 : 1100,
      )
    } else render()
  } else if (action.startsWith('shape-') && screen === 'shapes') {
    if (action.slice(6) !== shape) {
      say(copy.againHint)
      return
    }
    progress++
    tone()
    busy = true
    message = copy.match
    render()
    later(() => {
      busy = false
      if (progress >= 5) finishGame()
      else {
        newShape()
        message = copy.shapeHint
        render()
      }
    }, 600)
  }
}
root.addEventListener('click', (event) => {
  if (performance.now() < suppressedClickUntil) return
  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-action]')
      : null
  if (target && !target.disabled) {
    const action = target.dataset.action!
    // Wallpaper is announced by its new caption, not the button's old state.
    narration.begin(
      action === 'wall'
        ? ''
        : (target.getAttribute('aria-label') ??
            target.querySelector('strong')?.innerText ??
            target.innerText),
    )
    act(action)
  } else if (event.target instanceof Element) {
    const text = event.target.closest<HTMLElement>(
      'p, h1, h2, .friendship, .puppy-footer span, a',
    )
    if (text) narration.begin(text.getAttribute('aria-label') ?? text.innerText)
  }
})
root.addEventListener('change', (event) => {
  if (
    !(event.target instanceof HTMLSelectElement) ||
    event.target.id !== 'puppy-language'
  )
    return
  const value = event.target.value
  if (value !== 'ru' && value !== 'de' && value !== 'en') return
  lang = value
  copy = PUPPY_COPY[lang]
  saveLang(lang)
  narration.languageChanged()
  // Reset the current activity so no delayed callback can show text from the old language.
  navigate(screen === 'win' ? 'games' : screen)
})
let drag: {
  x: number
  y: number
  pointerId: number
  food: string
  art: string
  ghost: HTMLElement | null
} | null = null
root.addEventListener('pointerdown', (event) => {
  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-food]')
      : null
  if (!target || target.disabled || busy || drag) return
  drag = {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    food: target.dataset.food!,
    art: target.querySelector('svg')!.outerHTML,
    ghost: null,
  }
  target.setPointerCapture(event.pointerId)
})
root.addEventListener('pointermove', (event) => {
  if (!drag || drag.pointerId !== event.pointerId) return
  if (
    !drag.ghost &&
    Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 9
  ) {
    drag.ghost = document.createElement('div')
    drag.ghost.className = 'food-ghost'
    drag.ghost.innerHTML = drag.art
    document.body.append(drag.ghost)
  }
  if (drag.ghost) {
    drag.ghost.style.left = `${event.clientX}px`
    drag.ghost.style.top = `${event.clientY}px`
    root.querySelector('#food-bowl')?.classList.add('drop-ready')
  }
})
root.addEventListener('pointerup', (event) => {
  if (!drag || drag.pointerId !== event.pointerId) return
  if (drag.ghost) {
    const box = root.querySelector('#food-bowl')?.getBoundingClientRect()
    const dropped =
      box &&
      event.clientX >= box.left - 25 &&
      event.clientX <= box.right + 25 &&
      event.clientY >= box.top - 25 &&
      event.clientY <= box.bottom + 25
    drag.ghost.remove()
    suppressedClickUntil = performance.now() + 350
    if (dropped) {
      const food = root.querySelector<HTMLElement>(`[data-food="${drag.food}"]`)
      narration.begin(food?.innerText ?? copy.feed)
      feed()
    }
  }
  drag = null
  root.querySelector('#food-bowl')?.classList.remove('drop-ready')
})
function cancelDrag(): void {
  drag?.ghost?.remove()
  drag = null
  root.querySelector('#food-bowl')?.classList.remove('drop-ready')
}
root.addEventListener('pointercancel', cancelDrag)
window.addEventListener('blur', cancelDrag)
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && screen !== 'room') {
    narration.begin(copy.back)
    navigate('room')
  }
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) narration.silence()
})
window.addEventListener('pagehide', () => narration.silence())
save()
render()
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
