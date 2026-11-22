import { art, bite, character, foodImage, icon } from './devochka-art.ts'
import { bowlArt, crossedLegs, servingArt } from './devochka-bowls.ts'
import { FOOD, FOODS, MEALS, T } from './devochka-copy.ts'
import {
  hasMeal,
  isBowl,
  pendingBowls,
  portionName,
  recipients,
  sceneOf,
  seatName,
  seats,
  tableWords,
  type Seat,
} from './devochka-dining.ts'
import { countAgain, MEAL_SCENES, starCounts, starLabels } from './devochka-scenes.ts'
import { count } from './devochka-state.ts'
import { roomPaint, studioGear } from './devochka-studio.ts'
import type { View } from './devochka-view.ts'

function starSky(v: View): string {
  const finished = v.countedStars.length === starLabels.length
  return `<div class="counting-sky">
    ${
      finished
        ? '<svg class="star-trail" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M34 25 Q51 11 68 27 T89 13" vector-effect="non-scaling-stroke"/></svg>'
        : ''
    }
    ${starLabels
      .map((label, i) => {
        const count = v.countedStars.indexOf(i) + 1
        return `<button class="sky-star" data-action="star" data-star="${i}" aria-label="${
          label[v.lang]
        }" aria-pressed="${count > 0}">${art('star')}${
          count ? `<b aria-hidden="true">${count}</b>` : ''
        }</button>`
      })
      .join('')}
  </div>`
}

export function tableStage(v: View, music: string): string {
  const { book: s, lang: l } = v
  const preview = v.studio || v.visitKitchen
  const active = !preview && hasMeal(s)
  const story = preview ? MEAL_SCENES[0] : sceneOf(s)
  const outdoors = !!story.background
  const previewGroup: Seat[] = isBowl(s.diner) ? ['girl', s.diner] : [s.diner]
  if (s.pet !== 'none' && s.pet !== s.diner) previewGroup.push(s.pet)
  const group = preview || (!active && s.result === null) ? previewGroup : seats(s)
  const allowed = active && v.selected ? recipients(s, v.selected) : []
  const onGrass = outdoors && story.id !== 'courtyard'
  const diner = (who: Seat, i: number) => {
    const human = !isBowl(who)
    const picture =
      who === 'bunny'
        ? '<img class="character" src="/devochka/rabbit.webp" alt="" draggable="false">'
        : character(s, who)
    return `<button class="table-character seat-${i} ${human ? 'human' : 'animal'} ${
      allowed.includes(who) ? 'ready-to-eat' : ''
    }" data-action="mouth" data-seat="${who}" aria-label="${seatName(who, l)}">
      <span class="diner-figure">${human && onGrass ? crossedLegs : ''}${picture}</span>
      ${
        who === 'cat' && story.id === 'picnic' && v.windowOpen
          ? '<span class="picnic-purr" aria-hidden="true">♡ ♡</span>'
          : ''
      }
      <span class="mouth-target">${icon(v.selected === 'water' ? 'drop' : 'heart', 19)}</span>
      ${
        group.length > 1
          ? `<span class="diner-name">${seatName(who, l)}${
              !preview && s.tasted.includes(who) ? icon('check', 13) : ''
            }</span>`
          : ''
      }</button>`
  }
  const finding = story.discovery
  const starHunt = story.id === 'moonlight' && v.windowOpen
  const countLine =
    starHunt && v.countedStars.length ? starCounts[v.countedStars.length - 1][l] : finding.line[l]
  const discovery = starHunt
    ? starSky(v)
    : `<button class="window-visitor discovery-${story.id} ${
        v.windowOpen ? 'peeking' : ''
      }" data-action="window" aria-pressed="${v.windowOpen}" aria-label="${finding.label[l]}" title="${
        finding.label[l]
      }">
    ${story.id === 'picnic' ? '' : art(finding.art)}
    ${v.windowOpen && story.id === 'visit' ? '<span class="teapot-steam" aria-hidden="true">∿ ∿</span>' : ''}
    ${
      v.windowOpen && story.id === 'courtyard'
        ? '<span class="cake-sparkles" aria-hidden="true">✧ ✶ ✧</span>'
        : ''
    }
  </button>`
  const caption =
    v.windowOpen && !v.studio
      ? `<div class="discovery-caption"><span class="window-message">${countLine}</span>
    ${
      starHunt && v.countedStars.length === starLabels.length
        ? `<button class="secondary" data-action="countAgain">${icon('repeat', 16)} ${countAgain[l]}</button>`
        : ''
    }</div>`
      : ''
  const portions = active ? [...FOODS.filter((food) => s.table.includes(food)), ...pendingBowls(s)] : []
  const separateTray = active && group.filter(isBowl).length >= 2
  const tray = `<div class="table-tray ${separateTray ? 'large-serving-tray' : ''}">${portions
    .map(
      (f) =>
        `<button data-table="${f}" class="table-food ${
          v.selected === f ? 'chosen' : ''
        }" aria-label="${portionName(f, l)}" aria-pressed="${v.selected === f}">${
          isBowl(f) ? bowlArt(f) : f === 'chips' && s.chipsOpen ? bite(f) : foodImage(f)
        }${!isBowl(f) ? `<span class="table-count">×${count(s.table, f)}</span>` : ''}</button>`
    )
    .join('')}</div>`
  return `<div class="scene home-scene meal-stage ${outdoors ? 'outdoors' : 'indoors'} ${
    onGrass ? 'on-grass' : ''
  } party-${group.length}" data-scene="${story.id}" ${
    story.background ? `style="background-image:url('${story.background}')"` : ''
  }>
    ${outdoors ? '' : roomPaint(s)}
    <h2 class="scene-sign"><span>${
      preview || (!active && s.result === null) ? T.homeName[l] : story.name[l]
    }</span></h2>
    ${studioGear(l)}
    ${
      !outdoors
        ? `<button class="music-box" data-action="music" aria-label="${music}" title="${music}">${icon(
            'note',
            21
          )}</button>`
        : ''
    }
    ${!outdoors && s.wall !== null ? `<span class="wall-picture">${art(MEALS[s.wall].sticker)}</span>` : ''}
    ${!v.studio ? discovery : ''}
    ${group.map(diner).join('')}
    ${separateTray ? '' : tray}</div>${separateTray ? tray : ''}${caption}`
}
export function servingPanel(v: View): string {
  const { book, lang, selected } = v
  const scene = sceneOf(book)
  const active = hasMeal(book) && !v.visitKitchen
  const group = seats(book)
  const button = (action: string, label: string, symbol: Parameters<typeof icon>[0], seat?: Seat) =>
    `<button class="primary" data-action="${action}" ${seat ? `data-to="${seat}"` : ''}>${label} ${icon(
      symbol,
      18
    )}</button>`
  let hint: string
  let actions: string
  if (!active) {
    hint = v.visitKitchen ? tableWords.onWall[lang] : T.emptyTable[lang]
    actions = hasMeal(book)
      ? button('goHome', scene.serveAction[lang], 'basket')
      : button('shelves', T.toShop[lang], 'shop')
  } else if (!selected) {
    hint = book.table.length ? T.chooseFood[lang] : tableWords.stillHungry[lang]
    if (!book.tasted.length) hint = scene.arrival[lang] + ' ' + hint
    actions = ''
  } else if (selected === 'chips' && !book.chipsOpen) {
    hint = FOOD.chips.hint[lang]
    actions = button('cut', T.cut[lang], 'scissors')
  } else {
    hint = isBowl(selected)
      ? tableWords.bowl[lang]
      : selected === 'chips'
      ? T.opened[lang]
      : FOOD[selected].hint[lang]
    const drink = selected === 'water'
    actions = recipients(book, selected)
      .map((seat) => {
        const label = group.length > 1 ? seatName(seat, lang) : (drink ? T.helpPour : T.serve)[lang]
        return button(drink ? 'pour' : 'mouth', label, drink ? 'drop' : 'hand', seat)
      })
      .join('')
  }

  const preview = selected
    ? `<div class="serving-preview">${
        isBowl(selected) || (selected === 'chips' && book.chipsOpen)
          ? servingArt(selected)
          : foodImage(selected)
      }<h3>${portionName(selected, lang)}</h3></div>`
    : ''
  return `<div class="note-label">${icon(active ? 'basket' : 'home', 18)} ${
    active ? tableWords.together[lang] : T.home[lang]
  }</div>
    <h2>${active ? MEALS[book.day % MEALS.length].name[lang] : T.homeName[lang]}</h2>
    ${
      active && group.length > 1
        ? `<p class="seat-list">${group.map((id) => seatName(id, lang)).join(' · ')}</p>`
        : ''
    }
    ${preview}<p class="serving-hint">${v.message || hint}</p>
    ${selected ? `<p class="small-copy">${T.tapServe[lang]}</p>` : ''}
    <div class="note-bottom">${actions}
    <button class="secondary" data-action="studio">${icon('gear')} ${T.studio[lang]}</button></div>`
}
