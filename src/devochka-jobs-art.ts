import { art } from './devochka-art.ts'
import { ports, type Channel } from './devochka-river.ts'

const svg = (content: string) =>
  `<svg class="sketch" viewBox="0 0 100 100" stroke="#534553" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`
export type Apple = 'red' | 'gold'
export function fruit(sort: Apple): string {
  const detail =
    sort === 'gold'
      ? '<path d="m55 45 3 8 9 1-7 6 2 9-7-5-8 4 2-9-6-6 9-1z" fill="#fff3b5" stroke="#966534"/>'
      : '<path d="m38 55 15-9m-14 19 24-15m-19 22 20-13" stroke="#ffc4a1" stroke-width="3.4"/>'
  return art('apple')
    .replace('#e77862', sort === 'gold' ? '#eabd48' : '#d66560')
    .replace('</svg>', detail + '</svg>')
}
export const TOPPINGS = ['honey', 'raspberry', 'blueberry'] as const
export type Topping = (typeof TOPPINGS)[number]
const toppings = {
  honey:
    '<path d="M52 15q-5 15-20 35-12 20 2 32 20 14 36-3 9-12-1-30Z" fill="#f1b837"/><path d="M39 61q-6 11 3 15" stroke="#fff2a5" stroke-width="5"/>',
  raspberry:
    '<g fill="#dd7582"><circle cx="40" cy="44" r="13"/><circle cx="58" cy="42" r="14"/><circle cx="69" cy="55" r="12"/><circle cx="30" cy="58" r="11"/><circle cx="47" cy="56" r="12"/><circle cx="61" cy="68" r="11"/><circle cx="42" cy="71" r="10"/><circle cx="51" cy="79" r="8"/></g><path d="m46 39-13-17 16 6 4-17 5 16 12-8-9 17z" fill="#82975d"/>',
  blueberry:
    '<path fill="#839e68" d="M52 41q7-23 28-18-9 18-28 18Z"/><g fill="#8292c6"><circle cx="39" cy="60" r="18"/><circle cx="62" cy="63" r="17"/><circle cx="50" cy="40" r="15"/></g><path d="m34 53 4 4 5-4m15 4 4 4 5-4m-21-21 4 4 4-4" stroke="#55618b"/>',
}
export const topping = (id: Topping) => svg(toppings[id])
export function pancake(stage: 'empty' | 'pale' | 'golden' | 'dark' | 'flipped', finish?: Topping): string {
  const batter = { empty: '', pale: '#f1dfac', golden: '#e4ad63', dark: '#ae724b', flipped: '#e6b773' }[stage]
  return svg(`<path fill="#a16c4e" d="m64 67 25 18q7 3 9-3 2-4-3-8L69 58z"/><ellipse cx="44" cy="53" rx="39" ry="29" fill="#7a8297"/><ellipse cx="44" cy="50" rx="36" ry="26" fill="#525e77"/><path d="M14 39q9-12 24-12" stroke="#b9c2c9"/>
    ${
      batter
        ? `<path fill="${batter}" d="M14 51q2-18 26-19 26-4 35 12 6 16-16 23-30 10-43-7-3-3-2-9Z"/><g fill="#af7648" opacity=".5" stroke="none"><circle cx="32" cy="43" r="1.8"/><ellipse cx="60" cy="47" rx="3" ry="2"/><circle cx="54" cy="58" r="2.1"/><circle cx="30" cy="56" r="2.6"/><circle cx="44" cy="51" r="1.8"/></g>`
        : ''
    }
    ${finish ? `<g transform="translate(21 26) scale(.47)">${toppings[finish]}</g>` : ''}`)
}
export function channel(tile: Channel): string {
  const water = tile.bend ? 'M-3 50Q50 50 50-3' : 'M-3 50Q51 49 103 50'
  const shine = tile.bend ? 'M6 45q30-1 36-17m7-10 1-9' : 'M8 43q15-3 28-1m17 14q13 2 30-1'
  return svg(
    `<g data-ports="${ports(tile).join(',')}" transform="rotate(${
      tile.quarter * 90
    } 50 50)"><path d="${water}" stroke="#aa9764" stroke-width="51"/><path d="${water}" stroke="#a0cfc9" stroke-width="44"/><path d="${water}" stroke="#78acb7" stroke-width="32"/><path d="${shine}" stroke="#d7eee0" stroke-width="3"/></g>`
  )
}
