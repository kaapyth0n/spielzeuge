import { hasMeal } from './devochka-dining.ts'
import { character, icon } from './devochka-art.ts'
import { EYES, MOUTHS, T } from './devochka-copy.ts'
import {
  canDine,
  dinerName,
  DINERS,
  FURNISHINGS,
  INVITATIONS,
  type Diner,
  type Furnishing,
} from './devochka-guests.ts'
import type { Notebook } from './devochka-state.ts'
import type { Lang } from './languages.ts'
import './devochka-studio.css'

export { dinerName }
export type StudioTab = 'paint' | 'guests'
const words = (ru: string, de: string, en: string): Record<Lang, string> => ({ ru, de, en })
const studio = words('Краски и гости', 'Farben & Gäste', 'Paint & guests')
const gearHint = words(
  'Перекрасить домик и выбрать гостя',
  'Zimmer bemalen und Gäste wählen',
  'Paint the room and choose a diner'
)
const paintLabel = words('Краски', 'Farben', 'Paint')
const guestLabel = words('Гости', 'Gäste', 'Guests')
const companionLabel = words('Кого ещё угостим?', 'Wen laden wir noch zum Essen ein?', 'Who else shall we feed?')
const noExtra = words('Больше никого', 'Niemanden sonst', 'No one else')
const inviteLabel = words('Пригласить за стол', 'Zum Essen einladen', 'Invite to the table')
const nextMeal = words(
  'Этот обед уже начался. Твой выбор — для следующего обеда.',
  'Dieses Essen hat schon begonnen. Deine Auswahl gilt für das nächste Essen.',
  'This meal has already started. Your choice is for the next meal.'
)
const unlockTip = words(
  'Наклейки за обеды открывают новых гостей.',
  'Mit Stickern für die Menüs kommen neue Tischgäste dazu.',
  'Earn meal stickers to invite more guests.'
)
const locked = words('Наклеек нужно', 'Benötigte Sticker', 'Stickers needed')
const palette = [
  words('Как на рисунке', 'Wie im Bild', 'Original colour'),
  words('Мятный', 'Minzgrün', 'Mint'),
  words('Сиреневый', 'Flieder', 'Lilac'),
  words('Васильковый', 'Kornblumenblau', 'Cornflower blue'),
]
const surfaces: Record<Furnishing, Record<Lang, string>> = {
  curtains: words('Шторки', 'Vorhänge', 'Curtains'),
  teapot: words('Чайник', 'Teekanne', 'Teapot'),
  table: words('Стол', 'Tisch', 'Table'),
  cloth: words('Скатерть', 'Tischdecke', 'Tablecloth'),
}
const copyColour = (object: Furnishing, colour: number, lang: Lang) =>
  surfaces[object][lang] + ' · ' + palette[colour][lang]

export function studioGear(lang: Lang): string {
  return `<button class="studio-gear" data-action="studio" aria-label="${gearHint[lang]}" title="${
    gearHint[lang]
  }">${icon('gear', 21)}<span>${studio[lang]}</span></button>`
}

export function newGuestMessage(s: Notebook, lang: Lang): string {
  if (typeof s.result !== 'number' || s.revisit !== null) return ''
  const guest = DINERS.find((id) => id !== 'girl' && INVITATIONS[id] === s.day && !s.knownGuests.includes(id))
  if (!guest) return ''
  return {
    ru: `Новый гость за столом — ${dinerName(guest, lang).toLowerCase()}! Загляни в «Краски и гости».`,
    de: `Neuer Tischgast: ${dinerName(guest, lang)}! Schau unter „Farben & Gäste“ nach.`,
    en: `A new dinner guest: ${dinerName(guest, lang)}! Look in Paint & guests.`,
  }[lang]
}

// Transparent paint plates follow the four original pencil silhouettes. Each
// atlas stores mint, lilac and blue versions at identical coordinates.
export function roomPaint(s: Notebook): string {
  return FURNISHINGS.filter((part) => s.paint[part])
    .map(
      (part) =>
        `<span aria-hidden="true" class="room-paint paint-${part}" style="background-position-y:${
          (s.paint[part] - 1) * 50
        }%"></span>`
    )
    .join('')
}
function invitation(s: Notebook, id: Diner, lang: Lang): string {
  return `${dinerName(id, lang)}. ${locked[lang]}: ${INVITATIONS[id]}. ${T.album[lang]}: ${s.day}.`
}
function paintControls(s: Notebook, lang: Lang): string {
  return `<div class="studio-paints">${FURNISHINGS.map(
    (part) =>
      `<fieldset class="paint-row"><legend>${surfaces[part][lang]}</legend><div class="paint-choices">${palette
        .map(
          (name, n) =>
            `<button data-paint="${part}" data-value="${n}" class="paint-chip paint-tone-${n} base-${part}" aria-label="${copyColour(
              part,
              n,
              lang
            )}" title="${name[lang]}" aria-pressed="${s.paint[part] === n}"><span>${
              s.paint[part] === n ? icon('check', 18) : ''
            }</span></button>`
        )
        .join('')}</div></fieldset>`
  ).join('')}</div>`
}
function guestControls(s: Notebook, lang: Lang): string {
  const faceChoice = (key: 'eyes' | 'mouth', names: typeof EYES, samples: string[]) =>
    `<fieldset class="options face-options"><legend>${T[key][lang]}</legend>${names
      .map(
        (n, i) =>
          `<button data-style="${key}" data-value="${i}" aria-label="${n[lang]}" title="${
            n[lang]
          }" aria-pressed="${s[key] === i}">${samples[i]}</button>`
      )
      .join('')}</fieldset>`
  return `<fieldset class="guest-choices"><legend>${
    inviteLabel[lang]
  }</legend><div class="guest-grid">${DINERS.map((id) => {
    const available = canDine(s, id)
    return `<button class="guest-pass ${available ? '' : 'sealed'}" data-guest="${id}" aria-pressed="${
      s.diner === id
    }" aria-label="${available ? dinerName(id, lang) : invitation(s, id, lang)}">
      ${character(s, id)}<span>${dinerName(id, lang)}</span>${
      available ? '' : `<small>${icon('lock', 12)} ${s.day}/${INVITATIONS[id]} ${icon('star', 12)}</small>`
    }</button>`
  }).join('')}</div></fieldset>${
    DINERS.some((id) => !canDine(s, id)) ? `<p class="studio-tip">${unlockTip[lang]}</p>` : ''
  }${hasMeal(s) ? `<p class="studio-tip">${nextMeal[lang]}</p>` : ''}
  ${
    s.diner === 'friend'
      ? faceChoice('eyes', EYES, ['● ●', '⌒ ⌒', '✦ ✦']) + faceChoice('mouth', MOUTHS, ['◡', '○', '◒'])
      : ''
  }
  ${
    DINERS.some((id) => (id === 'cat' || id === 'dog') && canDine(s, id) && id !== s.diner)
      ? `<fieldset class="options companion-options"><legend>${companionLabel[lang]}</legend>${(
          ['none', 'cat', 'dog'] as const
        )
          .filter((id) => id === 'none' || (id !== s.diner && canDine(s, id)))
          .map(id => {
            const label = id === 'none' ? noExtra[lang] : dinerName(id,lang)
            return `<button data-pet="${id}" aria-pressed="${s.pet === id}" aria-label="${label}" title="${label}">${id === 'none' ? icon('minus') : character(s,id)}</button>`
          })
          .join('')}</fieldset>`
      : ''
  }`
}
export function studioPanel(s: Notebook, lang: Lang, tab: StudioTab): string {
  return `<h2>${studio[lang]}</h2><div class="studio-tabs" role="group" aria-label="${studio[lang]}">
    <button data-studio-tab="paint" aria-pressed="${tab === 'paint'}">${icon('brush', 19)} ${
    paintLabel[lang]
  }</button>
    <button data-studio-tab="guests" aria-pressed="${tab === 'guests'}">${icon('heart', 18)} ${
    guestLabel[lang]
  }</button>
    </div>${tab === 'paint' ? paintControls(s, lang) : guestControls(s, lang)}`
}

export function applyStudioChoice(s: Notebook, d: DOMStringMap, lang: Lang): string {
  const idx = Number(d.value)
  const part = FURNISHINGS.find((id) => id === d.paint)
  if (part && Number.isInteger(idx) && idx >= 0 && idx < palette.length) {
    s.paint[part] = idx
    return copyColour(part, idx, lang)
  }
  const guest = DINERS.find((id) => id === d.guest)
  if (guest) {
    if (!canDine(s, guest)) return invitation(s, guest, lang)
    s.diner = guest
    if (s.pet === guest) s.pet = 'none'
    return dinerName(guest, lang) + (hasMeal(s) ? '. ' + nextMeal[lang] : '')
  }
  if (
    (d.style === 'eyes' || d.style === 'mouth') &&
    s.diner === 'friend' &&
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < 3
  ) {
    s[d.style] = idx
    return (d.style === 'eyes' ? EYES : MOUTHS)[idx][lang]
  }
  if (d.pet === 'none' || ((d.pet === 'cat' || d.pet === 'dog') && canDine(s, d.pet) && s.diner !== d.pet)) {
    s.pet = d.pet
    const label = d.pet === 'none' ? noExtra[lang] : dinerName(d.pet,lang)
    return label + (hasMeal(s) ? '. ' + nextMeal[lang] : '')
  }
  return ''
}
export const studioTabName = (tab: StudioTab, lang: Lang) => (tab === 'paint' ? paintLabel : guestLabel)[lang]
