/**
 * Песенки — drawings. Heroes are animated by CSS through their groups:
 * .hero-body, .hero-head, .hero-eyes, .hero-mouth-open / -closed,
 * .hero-wiggle-a / -b (see docs/pesenki.md).
 */

import { HERO_SVG } from './pesenki-heroes.ts'
import { PICTURE_SVG, SPEED_SVG } from './pesenki-pictures.ts'

function fallback(label: string, color = '#9aa3ad'): string {
  const letter = label.slice(0, 1).toUpperCase()
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="62" fill="${color}" stroke="#3b3a40" stroke-width="3.4"/><text x="100" y="122" text-anchor="middle" font-size="64" font-family="sans-serif" fill="#fff">${letter}</text></svg>`
}

export function heroSvg(song: string): string {
  return HERO_SVG[song] ?? fallback(song, '#f0a')
}

export function pictureSvg(pic: string): string {
  return PICTURE_SVG[pic] ?? fallback(pic)
}

export function speedSvg(level: number): string {
  return SPEED_SVG[level] ?? fallback(String(level + 1), '#ffb000')
}
