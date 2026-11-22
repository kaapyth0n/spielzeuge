// Canal ends are numbered clockwise from north, matching the rotation of the drawing.
const DELTAS = [-3, 1, 3, -1]
export const BANK = ['north', 'east', 'south', 'west'] as const
export interface Channel {
  bend: boolean
  quarter: number
}
export interface River {
  cells: (Channel | null)[]
  start: number
  end: number
}
const COURSES = [
  [
    [3, 4, 1, 2],
    [0, 1, 4, 5],
  ],
  [
    [3, 0, 1, 4, 7, 8],
    [0, 3, 4, 1, 2, 5],
  ],
  [
    [6, 3, 0, 1, 4, 7, 8, 5, 2],
    [0, 1, 2, 5, 4, 3, 6, 7, 8],
  ],
]
export function ports(cell: Channel): number[] {
  return [(3 + cell.quarter) % 4, ((cell.bend ? 0 : 1) + cell.quarter) % 4]
}
export function makeRiver(round: number): River {
  const set = COURSES[round]
  const flip = Math.random() < 0.5
  const path = set[Math.floor(Math.random() * set.length)].map((i) =>
    flip ? (2 - Math.floor(i / 3)) * 3 + (i % 3) : i
  )
  const cells: River['cells'] = Array(9).fill(null)
  for (const [index, id] of path.entries()) {
    const from = index === 0 ? 3 : DELTAS.indexOf(path[index - 1] - id)
    const to = index === path.length - 1 ? 1 : DELTAS.indexOf(path[index + 1] - id)
    const tile = { bend: (from + 2) % 4 !== to, quarter: 0 }
    while (!ports(tile).includes(from) || !ports(tile).includes(to)) tile.quarter++
    // A few joined pieces make the entrance legible. At least two need turning.
    const twist = index === 1 || index === path.length - 1 ? 1 : Math.floor(Math.random() * 4)
    tile.quarter = (tile.quarter + twist) % 4
    cells[id] = tile
  }
  const river = { cells, start: path[0], end: path[path.length - 1] }
  if (sail(river).snag === null) {
    const first = cells[river.start]!
    do {
      first.quarter = (first.quarter + 1) % 4
    } while (ports(first).includes(3))
  }
  return river
}
export function sail(river: River): { trail: number[]; snag: number | null } {
  const trail: number[] = []
  let at = river.start,
    entry = 3
  while (!trail.includes(at)) {
    const cell = river.cells[at]
    if (!cell || !ports(cell).includes(entry)) return { trail, snag: at }
    trail.push(at)
    const exit = ports(cell).find((port) => port !== entry)!
    if (at === river.end && exit === 1) return { trail, snag: null }
    const next = at + DELTAS[exit]
    const overBank = (exit === 1 && at % 3 === 2) || (exit === 3 && at % 3 === 0)
    if (overBank || !river.cells[next]) return { trail, snag: at }
    entry = (exit + 2) % 4
    at = next
  }
  return { trail, snag: at }
}
