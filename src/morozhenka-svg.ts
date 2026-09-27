/** Scoop colours and the small scoop-in-a-cone picture for menus and the catalog. */
import type { Flavor } from './morozhenka-state.ts'

export const INK = '#3a2a22'

export interface FlavorPaint {
  base: string
  light: string
  shade: string
  bits: string
  bitShape: 'chip' | 'dot' | 'seed' | 'swirl'
}

export const FLAVOR_PAINT: Record<Flavor, FlavorPaint> = {
  mint: { base: '#7fd1ad', light: '#c9f2dd', shade: '#3f9c77', bits: '#6b3f26', bitShape: 'chip' },
  strawberry: { base: '#ffabc2', light: '#ffe0e9', shade: '#e0698e', bits: '#c9304f', bitShape: 'seed' },
  chocolate: { base: '#9b6440', light: '#c99670', shade: '#633a22', bits: '#3b2112', bitShape: 'chip' },
  vanilla: { base: '#fff0c4', light: '#fffbeb', shade: '#e8cf86', bits: '#3a2718', bitShape: 'dot' },
  blueberry: { base: '#b3aaf0', light: '#e3dfff', shade: '#7a6fd4', bits: '#3b3290', bitShape: 'dot' },
  pistachio: { base: '#c9df95', light: '#ecf6d3', shade: '#90b155', bits: '#5f7e2e', bitShape: 'chip' },
  mango: { base: '#ffcf6e', light: '#fff0c8', shade: '#f19c35', bits: '#e0682a', bitShape: 'swirl' },
}

export const BITS: [number, number, number][] = [
  [-0.45, -0.2, 0.3],
  [0.42, -0.34, 1.1],
  [0.1, 0.46, 2.2],
  [-0.5, 0.36, 0.7],
  [0.56, 0.2, 1.8],
  [-0.12, -0.58, 2.7],
  [0.28, 0.02, 0.4],
]

/** A small SVG of a scoop in its cone for menus, round tiles and the catalog. */
export function scoopConeSvg(flavor: Flavor, cherries = 0, fire = false): string {
  const paint = FLAVOR_PAINT[flavor]
  const id = `g${flavor}${cherries}${fire ? 'f' : ''}`
  const cherry = (x: number, y: number) =>
    `<g><path d="M${x} ${y - 7} q2 -12 9 -15" stroke="#4b6b2a" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="8" fill="#e02d3c" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x - 3}" cy="${y - 3}" rx="2.4" ry="1.5" fill="#fff" opacity=".8"/></g>`
  const cherryMarks = [cherry(50, 16), cherry(38, 22), cherry(62, 22)].slice(0, cherries).join('')
  const bits = BITS.slice(0, 5)
    .map(([bx, by]) => `<circle cx="${50 + bx * 26}" cy="${44 + by * 22}" r="2.6" fill="${paint.bits}"/>`)
    .join('')
  const patches =
    flavor === 'mint'
      ? `<ellipse cx="58" cy="47" rx="9" ry="7" fill="#7a482c" opacity=".8" transform="rotate(28 58 47)"/><ellipse cx="36" cy="54" rx="7" ry="5" fill="#7a482c" opacity=".8"/>`
      : ''
  const puffs = fire
    ? `<g class="svg-fire">${[
        [84, 44, 6, '#ffc247'],
        [96, 40, 7.5, '#ff7a2f'],
        [108, 44, 6.5, 'none'],
        [117, 37, 5, 'none'],
      ]
        .map(([x, y, r, fill]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${fill === 'none' ? '#6f6a66' : '#a03c14'}" stroke-width="1.6"/>`)
        .join('')}</g>`
    : ''
  return `<svg class="mz-scoop-svg" viewBox="0 0 ${fire ? 124 : 100} 128" aria-hidden="true" focusable="false">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${paint.light}"/><stop offset=".5" stop-color="${paint.base}"/><stop offset="1" stop-color="${paint.shade}"/></radialGradient>
    <pattern id="${id}w" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#e0a765"/><path d="M0 0H9M0 0V9" stroke="#8a5325" stroke-width="1.6"/></pattern></defs>
    <path d="M22 66 Q34 98 49 124 Q50 126 51 124 Q66 98 78 66 Z" fill="url(#${id}w)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M18 60 C16 30 34 18 50 18 C66 18 84 30 82 60 C78 66 74 62 70 67 C66 62 60 68 56 64 C52 69 46 64 42 68 C38 63 32 68 28 64 C24 67 20 64 18 60 Z" fill="url(#${id})" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    ${patches}${bits}
    <ellipse cx="38" cy="30" rx="8" ry="4" fill="#fff" opacity=".55" transform="rotate(-25 38 30)"/>
    <ellipse cx="41" cy="44" rx="4.6" ry="5.6" fill="#fffdf8" stroke="${INK}" stroke-width="1.4"/><circle cx="42" cy="45" r="2.6" fill="#231815"/>
    <ellipse cx="59" cy="44" rx="4.6" ry="5.6" fill="#fffdf8" stroke="${INK}" stroke-width="1.4"/><circle cx="60" cy="45" r="2.6" fill="#231815"/>
    <ellipse cx="34" cy="51" rx="3.4" ry="2" fill="#ff7896" opacity=".5"/><ellipse cx="66" cy="51" rx="3.4" ry="2" fill="#ff7896" opacity=".5"/>
    ${fire ? `<ellipse cx="78" cy="46" rx="4.5" ry="4" fill="#6b1f1f" stroke="${INK}" stroke-width="1.4"/>` : `<path d="M45 52 Q50 57 55 52" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`}
    ${cherryMarks}${puffs}
  </svg>`
}
