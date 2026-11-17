// Mirrors live at cell centres. The beam starts outside the chart and stops at its first edge.
export interface Point {
  x: number
  y: number
}
interface BeaconChart {
  start: Point
  direction: [number, number]
  mirrors: Point[]
  solution: boolean[]
  goal: Point
}
export const CHARTS: BeaconChart[] = [
  {
    start: { x: -1, y: 2 },
    direction: [1, 0],
    mirrors: [
      { x: 1, y: 2 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ],
    solution: [true, true, false],
    goal: { x: 3, y: 4 },
  },
  {
    start: { x: 4, y: 1 },
    direction: [-1, 0],
    mirrors: [
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
    solution: [false, true, false],
    goal: { x: 3, y: 4 },
  },
  {
    start: { x: 3, y: 4 },
    direction: [0, -1],
    mirrors: [
      { x: 3, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 0 },
    ],
    solution: [false, false, true],
    goal: { x: 4, y: 0 },
  },
]

export function traceBeam(chart: BeaconChart, slashes: boolean[]): { path: Point[]; lit: boolean } {
  let { x, y } = chart.start
  let [dx, dy] = chart.direction
  const path = [chart.start]
  const reflected = new Set<number>()
  for (let i = 0; i < 32; i++) {
    x += dx
    y += dy
    if (x < 0 || x > 3 || y < 0 || y > 3) break
    const mirror = chart.mirrors.findIndex((p) => p.x === x && p.y === y)
    if (mirror < 0) continue
    path.push({ x, y })
    reflected.add(mirror)
    ;[dx, dy] = slashes[mirror] ? [-dy, -dx] : [dy, dx]
  }
  path.push({ x, y })
  return { path, lit: x === chart.goal.x && y === chart.goal.y && reflected.size === chart.mirrors.length }
}

export const CONSTELLATIONS = [
  [
    [14, 56],
    [33, 29],
    [53, 49],
    [71, 22],
    [86, 48],
    [54, 75],
  ], // swallow
  [
    [19, 73],
    [40, 32],
    [55, 16],
    [57, 64],
    [83, 60],
    [70, 80],
  ], // sailboat
  [
    [17, 73],
    [32, 64],
    [45, 68],
    [57, 48],
    [48, 25],
    [71, 14],
    [81, 40],
  ], // kite
]

export function melody(length: number, random: () => number, previous: readonly number[] = []): number[] {
  const notes: number[] = []
  for (let i = 0; i < length; i++) {
    const choices = [0, 1, 2].filter((n) => n !== notes.at(-1))
    notes.push(choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))])
  }
  if (notes.length === previous.length && notes.every((n, i) => n === previous[i])) return notes.map((n) => (n + 1) % 3)
  return notes
}
