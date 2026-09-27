/**
 * Песенки — hand-drawn pencil shapes, generated from a seed so every circle
 * wobbles a little differently but never changes between renders.
 * Matryona draws her circles in one stroke with the ends overlapping; so do we.
 */

import { seeded } from './pesenki-timeline.ts'

const f = (n: number) => Math.round(n * 10) / 10

/** A pencil circle drawn in one stroke, a little more than one turn, as an open path. */
export function pencilCircle(cx: number, cy: number, r: number, seed: number, wobble = 0.035, overlap = 0.13): string {
  const random = seeded(seed)
  const start = random() * Math.PI * 2
  const turns = 1 + overlap + random() * 0.06
  const steps = 36
  // Two slow harmonics make the loop slightly egg-shaped, like a real hand circle.
  const a1 = (random() - 0.5) * 2 * wobble
  const a2 = (random() - 0.5) * 2 * wobble * 0.6
  const p1 = random() * Math.PI * 2
  const p2 = random() * Math.PI * 2
  const drift = (random() - 0.3) * wobble * 1.4
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = start + t * turns * Math.PI * 2
    const radius = r * (1 + a1 * Math.sin(angle * 2 + p1) + a2 * Math.sin(angle * 3 + p2) + drift * t)
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  return smooth(points)
}

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(points: Array<[number, number]>): string {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

/** A closed, slightly wobbly blob for marker fills behind circles. */
export function markerBlob(cx: number, cy: number, r: number, seed: number, wobble = 0.05): string {
  const random = seeded(seed)
  const steps = 24
  const phase = random() * Math.PI * 2
  const a = wobble * (0.6 + random() * 0.8)
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const angle = phase + (i / steps) * Math.PI * 2
    const radius = r * (1 + a * Math.sin(angle * 3 + random() * 0.4) * 0.6 + a * Math.cos(angle * 2) * 0.4)
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  points[points.length - 1] = points[0]
  return `${smooth(points)}Z`
}

/** The clock from Matryona's drawing: a long pencil oval, drawn in one stroke. */
export function pencilPill(width: number, height: number, seed: number): string {
  const random = seeded(seed)
  const r = height / 2
  const straight = Math.max(0, width - height)
  const points: Array<[number, number]> = []
  const jitter = () => (random() - 0.5) * height * 0.05
  const perimeter = 2 * straight + Math.PI * height
  const steps = 64
  const startShift = random() * 0.1
  for (let i = 0; i <= steps * 1.06; i++) {
    let s = ((i / steps + startShift) % 1) * perimeter
    let x: number
    let y: number
    if (s < straight) {
      x = r + s
      y = 0
    } else if ((s -= straight) < Math.PI * r) {
      const angle = -Math.PI / 2 + s / r
      x = r + straight + Math.cos(angle) * r
      y = r + Math.sin(angle) * r
    } else if ((s -= Math.PI * r) < straight) {
      x = r + straight - s
      y = height
    } else {
      s -= straight
      const angle = Math.PI / 2 + s / r
      x = r + Math.cos(angle) * r
      y = r + Math.sin(angle) * r
    }
    points.push([x + jitter(), y + jitter()])
  }
  return smooth(points)
}

/** Graphite hatching lines across a box, like Matryona's scribbled fill. */
export function hatch(width: number, height: number, gap: number, seed: number): string {
  const random = seeded(seed)
  let d = ''
  for (let x = -height; x < width + height; x += gap) {
    const wobble = (random() - 0.5) * gap * 0.5
    d += `M${f(x + wobble)} ${f(height + 2)}L${f(x + height * 0.7 + wobble)} -2`
  }
  return d
}
