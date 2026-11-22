import { newGuestMessage, studioPanel, type StudioTab } from './devochka-studio.ts'
import { tableStage, servingPanel } from './devochka-table-view.ts'
import {
  hasMeal,
  isBowl,
  pendingBowls,
  portionName,
  sceneOf,
  seatName,
  seats,
  tableWords,
  type Portion,
} from './devochka-dining.ts'
import { bowlArt } from './devochka-bowls.ts'
import { art, character, coin, foodImage, icon } from './devochka-art.ts'
import { FOOD, FOODS, MEALS, T, title, type TextKey } from './devochka-copy.ts'
import { CAPACITY, count, menu, price, type Notebook } from './devochka-state.ts'
import { LANGS, LANG_LABEL, type Lang } from './languages.ts'

export type Place = 'shop' | 'home' | 'games' | 'album'
export interface View {
  book: Notebook
  lang: Lang
  place: Place
  muted: boolean
  selected: Portion | null
  tender: number[] | null
  studio: boolean
  studioTab: StudioTab
  stamp: number
  message: string
  visitKitchen: boolean
  windowOpen: boolean
  countedStars: readonly number[]
}
const copy = (v: View, k: TextKey) => T[k][v.lang]
const small = (n: number) => String(n).padStart(2, '0')
const sum = (coins: number[]) => coins.reduce((a, b) => a + b, 0)
const credits = { ru: 'Игра Матрёны', de: 'Matrjonas Spiel', en: 'Matryona’s game' }
const greeting = { ru: 'Что у нас на обед?', de: 'Was gibt’s heute?', en: 'What’s for lunch?' }
const listReady = { ru: 'Всё по списку!', de: 'Alles eingepackt!', en: 'List complete!' }
const music = { ru: 'Музыкальная шкатулка', de: 'Spieluhr', en: 'Music box' }
export const musicName = (l: Lang) => music[l]

export function top(v: View): string {
  return `<header class="mast"><div class="brand-group"><a class="round-btn catalog-link" href="/" aria-label="${copy(
    v,
    'catalog'
  )}" title="${copy(v, 'catalog')}">${icon('back')}</a><div class="mast-title"><h1>${
    title[v.lang]
  }<span class="brand-star">${icon('star', 21)}</span></h1><span class="credit">${
    credits[v.lang]
  }</span></div></div>
    <div class="utilities"><span class="wallet" aria-label="${copy(v, 'wallet')} · ${
    v.book.coins
  }" title="${copy(v, 'wallet')}">${coin(28)}<b>${
    v.book.coins
  }</b></span><button class="round-btn" data-action="mute" aria-pressed="${v.muted}" aria-label="${copy(
    v,
    v.muted ? 'unmute' : 'mute'
  )}" title="${copy(v, v.muted ? 'unmute' : 'mute')}">${icon(v.muted ? 'silent' : 'sound')}</button>
    <label class="lang-select">${icon('globe', 19)}<span>${v.lang.toUpperCase()}</span>${icon(
    'chevron',
    13
  )}<select id="language" aria-label="${copy(v, 'language')}">${LANGS.map(
    (l) => `<option lang="${l}" value="${l}" ${l === v.lang ? 'selected' : ''}>${LANG_LABEL[l]}</option>`
  ).join('')}</select></label></div></header>
    <nav class="tabs" aria-label="${copy(v, 'sections')}">${(['shop', 'home', 'games', 'album'] as const)
    .map(
      (k) =>
        `<button data-nav="${k}" ${v.place === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${
          k === 'home' && hasMeal(v.book) && sceneOf(v.book).background && !v.visitKitchen && !v.studio
            ? T.meal[v.lang]
            : copy(v, k)
        }</span>${k === 'home' && hasMeal(v.book) ? '<i class="nav-dot"></i>' : ''}</button>`
    )
    .join('')}</nav>`
}
function sign(text: string, bunny = false): string {
  return `<h2 class="scene-sign">${bunny ? art('bunny') : ''}<span>${text}</span></h2>`
}
function primary(
  action: string,
  label: string,
  symbol: Parameters<typeof icon>[0] = 'arrow',
  disabled = false
): string {
  return `<button class="primary" data-action="${action}" ${disabled ? 'disabled' : ''}>${label} ${icon(
    symbol
  )}</button>`
}
function note(content: string, cls = ''): string {
  return `<aside class="paper-note ${cls}"><div class="tape"></div>${content}</aside>`
}
function cancelRevisitButton(v: View): string {
  return v.book.revisit === null ? '' : `<button class="text-button" data-action="cancelRevisit">${icon('back', 16)} ${copy(v, 'cancelRevisit')}</button>`
}
function mealList(v: View): string {
  const order = menu(v.book)
  const bill = price(v.book.cart)
  const taken = v.book.cart
  const affordable = bill <= v.book.coins
  const replay = v.book.revisit !== null
  const heading = replay ? copy(v, 'fromAlbum') : copy(v, 'meal') + ' ' + small(v.book.day + 1)
  return note(`<div class="note-label">${icon('receipt', 18)} ${heading}</div>
    <h2>${copy(v, 'list')}</h2><div class="order-title">${
    order.name[v.lang]
  }<button class="listen-btn" data-action="wish" aria-label="${copy(v, 'listen')} · ${
    order.name[v.lang]
  }">${icon('sound', 17)}</button></div>
    <ul class="checklist">${FOODS.filter((f) => count(order.list, f))
      .map((f) => {
        const need = count(order.list, f),
          have = count(taken, f),
          done = have >= need
        return `<li class="${done ? 'checked' : ''}"><span class="check-box">${
          done ? icon('check', 16) : ''
        }</span>${foodImage(f)}<span>${FOOD[f].name[v.lang]}${need > 1 ? ` <b>×${need}</b>` : ''}</span></li>`
      })
      .join('')}</ul>
    <div class="prize-preview">${art(order.sticker)}<div><small>${copy(v, replay ? 'collected' : 'reward')}</small><strong>${
    order.prize[v.lang]
  }</strong></div></div>
    <div class="note-bottom"><div class="tally"><span>${copy(v, 'total')}</span><b>${bill} ${coin()}</b></div>
    ${!affordable ? `<p class="inline-tip">${copy(v, 'short')}</p>` : ''}
    ${primary(
      affordable ? 'checkout' : 'earn',
      copy(v, affordable ? 'toTill' : 'earn'),
      affordable ? 'arrow' : 'games',
      !taken.length
    )}${cancelRevisitButton(v)}</div>`)
}
function paidOrder(v: View): string {
  const { book, lang } = v
  const scene = sceneOf(book)
  const remaining: Portion[] = [...new Set(book.table), ...pendingBowls(book)]
  const dishes = remaining
    .map((id) => {
      const quantity = isBowl(id) ? 1 : count(book.table, id)
      const picture = isBowl(id) ? bowlArt(id) : foodImage(id)
      return `<li>${picture}<span>${portionName(id, lang)}${quantity > 1 ? ' ×' + quantity : ''}</span></li>`
    })
    .join('')
  const guests = seats(book)
    .map((id) => seatName(id, lang))
    .join(' · ')
  return note(
    `<div class="note-label">${icon('check', 18)} ${copy(v, 'orderPaid')}</div>
    <h2>${scene.name[lang]}</h2><p class="seat-list">${guests}</p>
    <h3>${copy(v, 'leftToServe')}</h3><ul class="checklist paid-portions">${dishes}</ul>
    <div class="note-bottom">${primary('goHome', scene.serveAction[lang], 'basket')}</div>`,
    'paid-order'
  )
}
function basketStrip(v: View): string {
  return `<div class="basket-strip"><div class="basket-label">${icon('basket', 26)}<strong>${copy(
    v,
    'basket'
  )}</strong><small>${v.book.cart.length}/${CAPACITY}</small></div><div class="basket-items">${
    v.book.cart.length
      ? FOODS.filter((f) => v.book.cart.includes(f))
          .map(
            (f) =>
              `<button class="cart-item" data-remove="${f}" aria-label="${copy(v, 'remove')} · ${
                FOOD[f].name[v.lang]
              }">${foodImage(f)}<span>×${count(v.book.cart, f)}</span><i>−</i></button>`
          )
          .join('')
      : `<span class="pencil-hint">${copy(v, 'emptyCart')}</span>`
  }</div></div>`
}
export function shopView(v: View): string {
  if (v.tender) return cashView(v)
  const order = menu(v.book)
  const paid = hasMeal(v.book)
  const characterAction = paid ? 'goHome' : 'wish'
  const characterLabel = paid ? tableWords.returnMeal[v.lang] : copy(v, 'listen') + ' · ' + order.name[v.lang]
  const shopper = v.book.seated ?? v.book.diner
  const ready = FOODS.every((f) => count(v.book.cart, f) >= count(order.list, f))
  return `<div class="spread"><div class="picture-column"><div class="scene shop-scene">${sign(
    copy(v, 'storeName'),
    true
  )}
    <button data-action="${characterAction}" class="stall-character" aria-label="${characterLabel}">${character(
    v.book,
    order === MEALS[1] || shopper !== 'friend' ? 'girl' : 'friend'
  )}</button>
    <button class="speech-slip" data-action="${characterAction}">${
    paid ? tableWords.returnMeal[v.lang] : v.message || (ready ? listReady[v.lang] : greeting[v.lang])
  }</button>
    ${FOODS.map((f, i) => {
      const product = foodImage(f)
      if (paid) return `<span class="shelf-item shelf-${i}" aria-hidden="true">${product}</span>`
      return `<button class="shelf-item shelf-${i}" data-add="${f}" aria-label="${copy(v, 'add')} · ${
        FOOD[f].name[v.lang]
      } · ${copy(v, 'coins')} ${FOOD[f].price}">${product}<span class="price-tag"><span>${
        FOOD[f].name[v.lang]
      }</span><b>${FOOD[f].price} ${coin(15)}</b></span></button>`
    }).join('')}
    <button class="counter-till" data-action="counter"><span>${copy(
      v,
      paid ? 'orderPaid' : 'till'
    )}</span><img src="/devochka/till.webp" alt="" draggable="false"></button></div>${
    paid ? '' : basketStrip(v)
  }</div>${paid ? paidOrder(v) : mealList(v)}</div>`
}
function cashView(v: View): string {
  const total = price(v.book.cart),
    paid = sum(v.tender ?? []),
    exact = paid === total
  const label = copy(v, 'lever')
  return `<div class="spread"><div class="picture-column"><div class="scene till-scene">${sign(
    copy(v, 'checkout')
  )}
    <button class="register ${
      exact ? 'ready' : ''
    }" data-action="lever" aria-label="${label}" aria-disabled="${!exact}"><img src="/devochka/till.webp" alt="" draggable="false"><span class="display-price">${total} ${coin(
    25
  )}</span></button>
    <div class="coin-tray">${[1, 2, 5]
      .map(
        (n) =>
          `<button data-coin="${n}" class="money money-${n}" aria-label="${copy(
            v,
            'coins'
          )} · ${n}"><span>${n}</span></button>`
      )
      .join('')}</div></div></div>
    ${note(`<div class="note-label">${icon('receipt', 18)} ${copy(v, 'checkout')}</div><h2>${copy(
      v,
      'due'
    )}</h2><div class="bill-big">${total} ${coin(36)}</div>
    <p id="cash-hint">${v.message || copy(v, exact ? 'exact' : 'payPrompt')}</p><div class="tendered">${
      (v.tender ?? []).map((n) => `<span class="tiny-money">${n}</span>`).join('') || '<i>· · ·</i>'
    }</div>
    <div class="tally"><span>${copy(
      v,
      'paid'
    )}</span><b>${paid} ${coin()}</b></div><div class="tally"><span>${copy(v, 'left')}</span><b>${
      total - paid
    } ${coin()}</b></div>
    <button class="text-button" data-action="undo" ${!paid ? 'disabled' : ''}>${icon('repeat', 15)} ${copy(
      v,
      'undo'
    )}</button><div class="note-bottom">${primary(
      'lever',
      label,
      'check',
      !exact
    )}<button class="text-button" data-action="shelves">${icon('back', 16)} ${copy(
      v,
      'editCart'
    )}</button>${cancelRevisitButton(v)}</div>`)}</div>`
}
function studioNote(v: View): string {
  return note(
    studioPanel(v.book, v.lang, v.studioTab) + primary('studioDone', copy(v, 'done'), 'check'),
    'studio-note'
  )
}
export function homeView(v: View): string {
  const s = v.book
  const mealResult = typeof s.result === 'number' ? MEALS[s.result] : null
  const invitation = newGuestMessage(s, v.lang)
  let side: string
  if (v.studio) side = studioNote(v)
  else if (s.revisit !== null && s.result !== null && !v.visitKitchen) {
    const scene = sceneOf(s)
    side = note(`<div class="note-label">${icon('album', 18)} ${copy(v, 'fromAlbum')}</div>
      <h2>${scene.name[v.lang]}</h2><p>${s.result === 'free' ? copy(v, 'ownMenu') : scene.farewell[v.lang]}</p>
      <div class="note-bottom">${primary('next', copy(v, 'another'))}
        <button class="secondary" data-nav="album">${icon('album')} ${copy(v, 'album')}</button></div>`)
  }
  else if (s.result !== null && !v.visitKitchen)
    side = note(`<div class="note-label">${icon('heart', 18)} ${copy(v, 'finished')}</div><h2>${copy(
      v,
      mealResult
        ? s.day === MEALS.length
          ? 'fullAlbum'
          : s.day > MEALS.length
          ? 'finished'
          : 'stickerWon'
        : 'finished'
    )}</h2>
    <div class="prize-big">${art(mealResult?.sticker ?? 'bunny')}</div><h3>${
      mealResult ? mealResult.prize[v.lang] : ''
    }</h3><p>${mealResult ? sceneOf(s).farewell[v.lang] : copy(v, 'freeMeal')}</p>${
      invitation ? `<p class="unlocked-guest">${invitation}</p>` : ''
    }<div class="note-bottom">${primary(
      'next',
      copy(v, 'another')
    )}<button class="secondary" data-nav="album">${icon('album')} ${copy(v, 'album')}</button></div>`)
  else side = note(servingPanel(v))
  return `<div class="spread"><div class="picture-column">${tableStage(v, music[v.lang])}</div>${side}</div>`
}
export function albumView(v: View): string {
  const index = v.stamp,
    entry = MEALS[index],
    owned = index < v.book.day,
    hung = v.book.wall === index
  return `<div class="spread"><section class="album-page"><h2>${copy(
    v,
    'albumTitle'
  )}</h2><span class="album-count">${Math.min(v.book.day, MEALS.length)} / ${MEALS.length}</span>
    <div class="stamp-grid">${MEALS.map(
      (item, i) =>
        `<button data-stamp="${i}" class="stamp ${i < v.book.day ? 'owned' : 'unearned'}" aria-pressed="${
          index === i
        }" aria-label="${item.prize[v.lang]} · ${
          i < v.book.day ? item.name[v.lang] : copy(v, 'locked')
        }">${art(item.sticker)}<span>${
          i < v.book.day ? item.prize[v.lang] : icon('lock', 15) + ' ' + small(i + 1)
        }</span></button>`
    ).join('')}</div></section>
    ${note(`<div class="note-label">${icon('album', 18)} ${copy(v, 'album')}</div><h2>${
      entry.prize[v.lang]
    }</h2><div class="prize-big ${owned ? '' : 'ghost'}">${art(entry.sticker)}</div><h3>${
      entry.name[v.lang]
    }</h3><p>${owned ? entry.wish[v.lang] : copy(v, 'albumHint')}</p>
    <div class="note-bottom">${
      owned
        ? primary('hang', copy(v, hung ? 'hung' : 'hang'), 'home', hung)
        : primary('shelves', copy(v, 'toShop'), 'shop')
    }${owned && !hasMeal(v.book) ? `<button class="secondary" data-action="revisit">${icon('repeat', 18)} ${copy(v, 'revisit')}</button>` : ''}</div>`)}</div>`
}
