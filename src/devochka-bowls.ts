import { bite } from './devochka-art.ts'
import { isBowl, type Portion, type Bowl } from './devochka-dining.ts'

export function servingArt(id: Portion): string {
  return isBowl(id) ? bowlArt(id) : bite(id)
}
export function bowlArt(id: Bowl): string {
  const contents = {
    cat: '<path fill="#a2cad6" d="M29 42q10-21 34-11l10-9-1 21-10-6q-20 18-33 5Z"/><circle fill="#354659" cx="39" cy="38" r="2"/>',
    dog: '<g fill="#b77948"><path d="m24 43 3-9 10-1 5 9-6 7Zm15-9 6-9 10 2 3 9-9 5zm17 9 3-9 11-2 6 10-6 6z"/></g>',
    bunny:
      '<path fill="#f19a55" d="m29 48 20-24q7-5 13 3l-2 7Z"/><path fill="#81aa74" d="m56 25 3-13 5 2-1 8 8-8 3 6-12 9Z"/>',
  }
  return `<svg class="bowl-art" viewBox="0 0 100 80" fill="none" stroke="#49445b" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><ellipse cx="50" cy="48" rx="40" ry="12" fill="#f7dfac"/>${
    contents[id]
  }<path d="M10 47q38 14 80-1l-9 22q-30 14-60 0Z" fill="${
    id === 'cat' ? '#8ab9ba' : id === 'dog' ? '#de9e78' : '#a2bf88'
  }"/><path d="M18 55q28 12 63 0" stroke="#fff0cb"/><path fill="#fff2ca" d="m46 63 4-5 4 4-3 6z"/></svg>`
}
export const crossedLegs = `<svg class="picnic-legs" viewBox="0 0 140 53" aria-hidden="true" stroke="#42455c" stroke-width="2.1"><path fill="#717d9d" d="M33 5q24-7 71 0 24 6 26 22 1 12-28 15L26 43Q5 41 9 28 14 13 33 5Z"/><path fill="#98a1b4" d="m33 14 74 19-57 10q-18 5-23-6l45-9"/><path fill="#d59774" d="m30 30 18 6q-5 14-27 10-12-4-8-11 6-8 17-5Zm71 0 12-2q15 0 15 8 0 10-28 11l-9-9Z"/></svg>`
