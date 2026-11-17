import { drawEgg } from './tamagochi-home.ts'
import { drawPet } from './tamagochi-pets.ts'
import type { Host } from './tamagochi-host.ts'
import { lookOf, type Passenger } from './tamagochi-state.ts'

const icon = (shapes: string) =>
  `<svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`
export const POST_ICONS = {
  balloon: icon(
    '<path fill="#e78055" d="M16 2C4 2 3 13 10 19l4 3h4l4-3C29 12 28 2 16 2Z"/><path fill="#fff0cc" d="M16 2c-5 4-6 12-2 20h4c4-8 3-16-2-20Z"/><path d="m12 20 2 6m6-6-2 6"/><path fill="#edb764" d="M12 25h8l-1 5h-6z"/>',
  ),
  envelope: icon('<rect x="3" y="7" width="26" height="19" rx="3"/><path d="m4 9 12 9L28 9m-22 15 7-8m13 8-7-8"/>'),
  book: icon(
    '<path d="M6 5h17a3 3 0 0 1 3 3v20H9a3 3 0 0 1-3-3V5Zm0 19c0-2 2-3 4-3h16M11 6v15"/><path d="m18 8 1.2 2.4 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4Z"/>',
  ),
  arrow: icon('<path d="M5 16h21m-8-8 8 8-8 8"/>'),
  back: icon('<path d="m19 7-9 9 9 9"/>'),
  check: icon('<path d="m6 16 7 7L27 9"/>'),
  map: icon('<path d="m3 8 9-4 9 4 8-4v20l-8 4-9-4-9 4V8Zm9-4v20m9-16v20"/>'),
  lantern: icon('<path fill="#eebc5d" d="M10 11h12l-2 14h-8z"/><path d="m8 11 8-7 8 7H8Zm3 14h10m-9 3h8m-4-16v10"/>'),
  play: icon('<path fill="currentColor" stroke="none" d="m10 5 17 11-17 11Z"/>'),
}

export function flowerArt(index: number) {
  const bloom = [
    '<g fill="#f17964" stroke="#ab4945" stroke-width="1.2"><ellipse cx="22" cy="21" rx="12" ry="13"/><ellipse cx="39" cy="21" rx="12" ry="13"/><ellipse cx="20" cy="33" rx="12" ry="11"/><ellipse cx="39" cy="33" rx="13" ry="11"/></g><circle cx="30" cy="28" r="6" fill="#563a4a"/>',
    '<g fill="#fffae9" stroke="#bda95d" stroke-width="1.2">' +
      Array.from({ length: 9 }, (_, i) => `<ellipse cx="30" cy="16" rx="5.6" ry="11" transform="rotate(${40 * i} 30 29)"/>`).join('') +
      '</g><circle cx="30" cy="29" r="8" fill="#e8a532"/>',
    '<path d="M30 8c-14 0-14 19-21 24l8-1 4 6 6-4 6 5 6-6 9 2c-7-9-5-26-18-26Z" fill="#9a99e2" stroke="#615f9c" stroke-width="1.7"/><path d="M29 12c-5 9-4 15-7 19m10-19c4 8 3 12 6 17" fill="none" stroke="#c9c6f0" stroke-width="2"/>',
  ]
  return `<svg viewBox="0 0 60 63" aria-hidden="true"><path d="M30 30v29m0-5q-14 0-15-13 12 0 15 13m0 3q1-13 14-15-1 12-14 15" fill="#6e9e75" stroke="#416f56" stroke-width="2"/>${bloom[index]}</svg>`
}

export function paintCrew(container: HTMLElement, crew: Passenger[], host: Host) {
  const canvas = container.querySelector<HTMLCanvasElement>('.post-crew canvas')
  if (!canvas) return
  const w = crew.length * 45
  canvas.width = w * 2
  canvas.height = 92
  canvas.style.width = w + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(2, 2)
  crew.forEach((p, i) => {
    const x = i * 45 + 22.5
    if (p.hatched) drawPet(ctx, p.species, lookOf(host.save, p.species), { x, y: 42, size: 37, eyes: 'happy', armR: 2.2 }, 1)
    else drawEgg(ctx, p.species, x, 42, 31, 0, (i % 2 ? 1 : -1) * 0.1)
  })
}
