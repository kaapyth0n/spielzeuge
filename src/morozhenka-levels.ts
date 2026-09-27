/**
 * Rounds for Мороженка. Every map is a 20×20 grid of 50-unit cells in a
 * 1000×1000 world. Hand-made rounds come first; after them the game keeps
 * going with seeded “surprise” maps, so every round number is always the same map.
 */

export const GRID = 20
export const CELL = 50
export const WORLD = GRID * CELL

export type ThemeId = 'pencil' | 'ice' | 'berry' | 'choco' | 'mint' | 'night'

export interface Point {
  x: number
  y: number
}

/** A sleepy stone that slides back and forth. Units are cells. */
export interface MoverSpec {
  x: number
  y: number
  w: number
  h: number
  dx: number
  dy: number
  /** Seconds for a full there-and-back trip. */
  period: number
  phase?: number
}

export interface LevelSpec {
  id: string
  theme: ThemeId
  map: readonly string[]
  movers?: readonly MoverSpec[]
}

export interface Level {
  id: string
  number: number
  theme: ThemeId
  walls: Uint8Array
  start: Point
  cone: Point
  cherries: Point[]
  flakes: Point[]
  movers: MoverSpec[]
  surprise: boolean
}

export const HANDMADE: readonly LevelSpec[] = [
  {
    id: 'up',
    theme: 'pencil',
    map: [
      '####################',
      '###.............####',
      '##.......C.......###',
      '#.................##',
      '#..................#',
      '##.................#',
      '###................#',
      '##.................#',
      '#........*.........#',
      '#..................#',
      '#.................##',
      '##................##',
      '###...............##',
      '##.................#',
      '#..................#',
      '#..................#',
      '##.................#',
      '##.......S.........#',
      '###..............###',
      '####################',
    ],
  },
  {
    id: 'right',
    theme: 'mint',
    map: [
      '####################',
      '####################',
      '####################',
      '#######.....########',
      '####.............###',
      '##................##',
      '#..................#',
      '#.........*........#',
      '#..................#',
      '#.S..............C.#',
      '#..................#',
      '#..................#',
      '##................##',
      '###.......#.......##',
      '####.....###....####',
      '######..#####..#####',
      '####################',
      '####################',
      '####################',
      '####################',
    ],
  },
  {
    id: 'horseshoe',
    theme: 'berry',
    map: [
      '####################',
      '##................##',
      '#............S....##',
      '#..................#',
      '#..........*.......#',
      '#.....###.....######',
      '#.....##############',
      '#......#############',
      '#.....##############',
      '#.*...##############',
      '#.....##############',
      '#......#############',
      '#.....##############',
      '#.....##############',
      '#......####....#####',
      '#..................#',
      '#..................#',
      '#...............C..#',
      '##................##',
      '####################',
    ],
  },
  {
    id: 'zigzag',
    theme: 'pencil',
    map: [
      '####################',
      '#..................#',
      '#.S................#',
      '#..................#',
      '#...............*..#',
      '##.................#',
      '##########.........#',
      '#############......#',
      '#############......#',
      '#..................#',
      '#.*................#',
      '#..................#',
      '#.........##########',
      '#......#############',
      '#......#############',
      '#..................#',
      '#........*.........#',
      '#...............C..#',
      '#..................#',
      '####################',
    ],
  },
  {
    id: 'pillars',
    theme: 'ice',
    map: [
      '####################',
      '#..................#',
      '#.S................#',
      '#...##...##...##...#',
      '#...##...##...##...#',
      '#..................#',
      '#.......*..........#',
      '#..................#',
      '###....##...##.....#',
      '###....##...##.....#',
      '#..................#',
      '#.........F........#',
      '#..................#',
      '#...##...##...##...#',
      '#...##...##...##...#',
      '#..............*...#',
      '#..................#',
      '#.*.............C..#',
      '#..................#',
      '####################',
    ],
  },
  {
    id: 'mountain',
    theme: 'pencil',
    map: [
      '####################',
      '#.......###......*.#',
      '#.S.....###........#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.......##.........#',
      '#......####....*...#',
      '#.....######.......#',
      '#....########......#',
      '#...##########.....#',
      '#..###########.....#',
      '##############.....#',
      '##############.....#',
      '#..##########......#',
      '#...########.......#',
      '#*.................#',
      '#...............C..#',
      '#..................#',
      '####################',
    ],
  },
  {
    id: 'teeth',
    theme: 'choco',
    map: [
      '####################',
      '#.............######',
      '#.S...........######',
      '#.............######',
      '#.......############',
      '#..*....############',
      '#.............######',
      '#.................##',
      '#####..........*..##',
      '#####.............##',
      '#.............######',
      '#.............######',
      '#.......############',
      '#.......############',
      '#.............######',
      '#.*...........######',
      '#####.........######',
      '#####.....C...######',
      '#####.........######',
      '####################',
    ],
  },
  {
    id: 'snail',
    theme: 'ice',
    map: [
      '####################',
      '#..................#',
      '#.S..............*.#',
      '#..................#',
      '################...#',
      '#..............#...#',
      '#..............#...#',
      '#..............#...#',
      '#..............#...#',
      '#...#..........#...#',
      '#...#....C.....#...#',
      '#...#..........#...#',
      '#...#..*.......#...#',
      '#...#..........#...#',
      '#...#..........#...#',
      '#...############...#',
      '#..................#',
      '#.F.......*.....F..#',
      '#..................#',
      '####################',
    ],
  },
  {
    id: 'sleepy',
    theme: 'mint',
    map: [
      '####################',
      '####################',
      '####################',
      '####################',
      '######..*..#########',
      '###..............###',
      '#..................#',
      '#..................#',
      '#.S................#',
      '#..................#',
      '#...............C..#',
      '#..................#',
      '#..................#',
      '###..............###',
      '#####......*....####',
      '####################',
      '####################',
      '####################',
      '####################',
      '####################',
    ],
    movers: [{ x: 9, y: 5, w: 2, h: 4, dx: 0, dy: 5, period: 6 }],
  },
  {
    id: 'maze',
    theme: 'berry',
    map: [
      '####################',
      '#.....#.....#......#',
      '#.S.........#......#',
      '#...........#...*..#',
      '#...........#......#',
      '#.....#.....#......#',
      '########...###...###',
      '#.....#.....#......#',
      '#..................#',
      '#..F............*..#',
      '#..................#',
      '#.....#.....#......#',
      '##...###############',
      '#.....#.....#......#',
      '#..................#',
      '#..................#',
      '#...............C..#',
      '#..*..#.....#......#',
      '#.....#.....#......#',
      '####################',
    ],
  },
  {
    id: 'stones',
    theme: 'night',
    map: [
      '####################',
      '#####..........#####',
      '#####....S.....#####',
      '#................###',
      '#*.............*.###',
      '#................###',
      '#####..........#####',
      '#####..........#####',
      '#####..........#####',
      '#####..........#####',
      '#####....F.....#####',
      '###..............###',
      '###.............*###',
      '###..............###',
      '#####..........#####',
      '#####..........#####',
      '#####..........#####',
      '#####....C.....#####',
      '#####..........#####',
      '####################',
    ],
    movers: [
      { x: 5, y: 6, w: 5, h: 2, dx: 5, dy: 0, period: 5.5 },
      { x: 10, y: 14, w: 5, h: 2, dx: -5, dy: 0, period: 6.5 },
    ],
  },
  {
    id: 'journey',
    theme: 'pencil',
    map: [
      '####################',
      '#...........*......#',
      '#.S................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '##############..F..#',
      '##############.....#',
      '#########..........#',
      '#########.*........#',
      '#########..........#',
      '##############.....#',
      '##############.....#',
      '#..................#',
      '#..................#',
      '#.............F....#',
      '#..................#',
      '#.C..........*.....#',
      '#..................#',
      '####################',
    ],
    movers: [
      { x: 9, y: 1, w: 2, h: 2, dx: 0, dy: 3, period: 4.8 },
      { x: 7, y: 13, w: 2, h: 3, dx: 0, dy: 3, period: 5.4 },
    ],
  },
]

export const HANDMADE_COUNT = HANDMADE.length

export function cellCenter(col: number, row: number): Point {
  return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL }
}

export function parseLevel(spec: LevelSpec, number: number, surprise = false): Level {
  if (spec.map.length !== GRID) throw new Error(`${spec.id}: ${spec.map.length} rows`)
  const walls = new Uint8Array(GRID * GRID)
  let start: Point | null = null
  let cone: Point | null = null
  const cherries: Point[] = []
  const flakes: Point[] = []
  spec.map.forEach((line, row) => {
    if (line.length !== GRID) throw new Error(`${spec.id}: row ${row} has ${line.length} cells`)
    for (let col = 0; col < GRID; col++) {
      const ch = line[col]
      const edge = row === 0 || col === 0 || row === GRID - 1 || col === GRID - 1
      if (ch === '#' || edge) walls[row * GRID + col] = 1
      if (edge && ch !== '#') throw new Error(`${spec.id}: open border at ${col},${row}`)
      if (ch === 'S') start = cellCenter(col, row)
      else if (ch === 'C') cone = cellCenter(col, row)
      else if (ch === '*') cherries.push(cellCenter(col, row))
      else if (ch === 'F') flakes.push(cellCenter(col, row))
      else if (ch !== '#' && ch !== '.') throw new Error(`${spec.id}: unknown "${ch}"`)
    }
  })
  if (!start || !cone) throw new Error(`${spec.id}: needs S and C`)
  return {
    id: spec.id,
    number,
    theme: spec.theme,
    walls,
    start,
    cone,
    cherries,
    flakes,
    movers: [...(spec.movers ?? [])],
    surprise,
  }
}

export function isWallCell(level: Level, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= GRID || row >= GRID) return true
  return level.walls[row * GRID + col] === 1
}

/** Mover rectangle in world units at time t (seconds). */
export function moverRect(mover: MoverSpec, t: number): { x: number; y: number; w: number; h: number } {
  const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / mover.period + (mover.phase ?? 0)))
  return {
    x: (mover.x + mover.dx * k) * CELL,
    y: (mover.y + mover.dy * k) * CELL,
    w: mover.w * CELL,
    h: mover.h * CELL,
  }
}

export function levelFor(number: number): Level {
  if (number >= 1 && number <= HANDMADE_COUNT) return parseLevel(HANDMADE[number - 1], number)
  return surpriseLevel(Math.max(HANDMADE_COUNT + 1, Math.floor(number)))
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const THEMES: ThemeId[] = ['pencil', 'mint', 'berry', 'ice', 'choco', 'night']
/** Room spans inside the 20×20 grid: three rooms with one-cell walls between. */
const SPANS: [number, number][] = [
  [1, 5],
  [7, 11],
  [13, 18],
]

/**
 * A seeded cave: 3×3 rooms joined by a random tree of wide doors, plus the
 * odd loop, corner bumps, dead ends with cherries and — later — sleepy stones.
 */
export function surpriseLevel(number: number): Level {
  for (let attempt = 0; attempt < 40; attempt++) {
    const level = buildSurprise(number, attempt)
    if (level && isSolvable(level)) return level
  }
  // Never expected; keeps the game going with an open room just in case.
  return parseLevel(HANDMADE[0], number, true)
}

function buildSurprise(number: number, attempt: number): Level | null {
  const random = mulberry(number * 7919 + attempt * 104729 + 17)
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const grid: string[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => '#'))
  const room = (r: number, c: number) => ({ rows: SPANS[r], cols: SPANS[c] })
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const { rows, cols } = room(r, c)
      for (let y = rows[0]; y <= rows[1]; y++) for (let x = cols[0]; x <= cols[1]; x++) grid[y][x] = '.'
    }

  // Random spanning tree over rooms (depth-first), then maybe one loop.
  const id = (r: number, c: number) => r * 3 + c
  const links = new Set<string>()
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const seen = new Set<number>()
  const stack = [id(Math.floor(random() * 3), Math.floor(random() * 3))]
  seen.add(stack[0])
  const neighbours = (n: number) => {
    const r = Math.floor(n / 3)
    const c = n % 3
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]
      .filter(([rr, cc]) => rr >= 0 && rr < 3 && cc >= 0 && cc < 3)
      .map(([rr, cc]) => id(rr, cc))
  }
  while (stack.length) {
    const current = stack[stack.length - 1]
    const options = neighbours(current).filter((n) => !seen.has(n))
    if (!options.length) {
      stack.pop()
      continue
    }
    const next = pick(options)
    links.add(key(current, next))
    seen.add(next)
    stack.push(next)
  }
  if (random() < 0.45) {
    const candidates: string[] = []
    for (let n = 0; n < 9; n++) for (const m of neighbours(n)) if (n < m && !links.has(key(n, m))) candidates.push(key(n, m))
    if (candidates.length) links.add(pick(candidates))
  }

  for (const link of links) {
    const [a, b] = link.split('-').map(Number)
    const ra = Math.floor(a / 3)
    const ca = a % 3
    const rb = Math.floor(b / 3)
    const cb = b % 3
    if (ra === rb) {
      const wallCol = SPANS[Math.min(ca, cb)][1] + 1
      const [top, bottom] = SPANS[ra]
      const from = top + Math.floor(random() * (bottom - top - 1))
      for (let y = from; y < from + 3; y++) grid[y][wallCol] = '.'
    } else {
      const wallRow = SPANS[Math.min(ra, rb)][1] + 1
      const [left, right] = SPANS[ca]
      const from = left + Math.floor(random() * (right - left - 1))
      for (let x = from; x < from + 3; x++) grid[wallRow][x] = '.'
    }
  }

  const degree = (n: number) => neighbours(n).filter((m) => links.has(key(n, m))).length
  const distances = (from: number) => {
    const dist = new Map<number, number>([[from, 0]])
    const queue = [from]
    while (queue.length) {
      const n = queue.shift()!
      for (const m of neighbours(n)) {
        if (!links.has(key(n, m)) || dist.has(m)) continue
        dist.set(m, dist.get(n)! + 1)
        queue.push(m)
      }
    }
    return dist
  }
  const startRoom = pick([0, 1, 2, 3, 5, 6, 7, 8].filter((n) => degree(n) <= 2))
  const fromStart = distances(startRoom)
  let coneRoom = startRoom
  for (const [n, d] of fromStart) if (d > (fromStart.get(coneRoom) ?? 0)) coneRoom = n

  const centre = (n: number) => {
    const { rows, cols } = room(Math.floor(n / 3), n % 3)
    return { col: Math.floor((cols[0] + cols[1]) / 2), row: Math.floor((rows[0] + rows[1]) / 2) }
  }

  // Path rooms from start to cone.
  const path: number[] = [coneRoom]
  while (path[path.length - 1] !== startRoom) {
    const n = path[path.length - 1]
    const back = neighbours(n).find((m) => links.has(key(n, m)) && fromStart.get(m) === fromStart.get(n)! - 1)
    if (back === undefined) return null
    path.push(back)
  }
  path.reverse()

  const occupied = new Set<number>([startRoom, coneRoom])
  const s = centre(startRoom)
  const cCell = centre(coneRoom)
  grid[s.row][s.col] = 'S'
  grid[cCell.row][cCell.col] = 'C'

  // Cherries: dead ends first, then any free room.
  const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !occupied.has(n))
  free.sort((a, b) => degree(a) - degree(b) + (random() - 0.5) * 0.5)
  const cherryRooms = free.slice(0, 3)
  for (const n of cherryRooms) {
    const { rows, cols } = room(Math.floor(n / 3), n % 3)
    const corner = pick([
      [cols[0] + 1, rows[0] + 1],
      [cols[1] - 1, rows[0] + 1],
      [cols[0] + 1, rows[1] - 1],
      [cols[1] - 1, rows[1] - 1],
    ])
    grid[corner[1]][corner[0]] = '*'
  }

  let flakeRoom = -1
  if (path.length >= 5) {
    flakeRoom = path[Math.floor(path.length / 2)]
    const f = centre(flakeRoom)
    if (grid[f.row][f.col] === '.') grid[f.row][f.col] = 'F'
  }

  // Corner bumps make each room look hand-drawn; only where no door is near.
  for (let n = 0; n < 9; n++) {
    if (random() < 0.45) continue
    const { rows, cols } = room(Math.floor(n / 3), n % 3)
    const x = random() < 0.5 ? cols[0] : cols[1]
    const y = random() < 0.5 ? rows[0] : rows[1]
    const nearDoor = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].some(([xx, yy]) => {
      const edge = xx === 0 || yy === 0 || xx === GRID - 1 || yy === GRID - 1
      return !edge && grid[yy]?.[xx] === '.' && !(xx >= cols[0] && xx <= cols[1] && yy >= rows[0] && yy <= rows[1])
    })
    if (!nearDoor && grid[y][x] === '.') grid[y][x] = '#'
  }

  const movers: MoverSpec[] = []
  if (number >= HANDMADE_COUNT + 3) {
    const middle = path.slice(1, -1).filter((n) => n !== flakeRoom && !cherryRooms.includes(n))
    const count = number >= HANDMADE_COUNT + 8 ? 2 : 1
    for (const n of middle.slice(0, count)) {
      const { rows, cols } = room(Math.floor(n / 3), n % 3)
      const vertical = random() < 0.5
      const period = 5 + random() * 2
      if (vertical) {
        const x = random() < 0.5 ? cols[0] : cols[1] - 1
        movers.push({ x, y: rows[0], w: 2, h: 2, dx: 0, dy: rows[1] - rows[0] - 1, period, phase: random() })
      } else {
        const y = random() < 0.5 ? rows[0] : rows[1] - 1
        movers.push({ x: cols[0], y, w: 2, h: 2, dx: cols[1] - cols[0] - 1, dy: 0, period, phase: random() })
      }
    }
  }

  const spec: LevelSpec = {
    id: `surprise-${number}`,
    theme: THEMES[(number * 5 + attempt) % THEMES.length],
    map: grid.map((row) => row.join('')),
    movers,
  }
  const level = parseLevel(spec, number, true)
  return moversStayClear(level) ? level : null
}

export const HIT_RADIUS = 22
/** Extra room the reachability check asks for, so paths are comfortably wide. */
export const SOLVE_MARGIN = 26

/** Distance from a point to the nearest wall cell edge (world units). */
export function wallDistance(level: Level, x: number, y: number): number {
  const col = Math.floor(x / CELL)
  const row = Math.floor(y / CELL)
  let best = Infinity
  const reach = 3
  for (let r = row - reach; r <= row + reach; r++)
    for (let c = col - reach; c <= col + reach; c++) {
      if (!isWallCell(level, c, r)) continue
      const nx = Math.max(c * CELL, Math.min(x, (c + 1) * CELL))
      const ny = Math.max(r * CELL, Math.min(y, (r + 1) * CELL))
      best = Math.min(best, Math.hypot(x - nx, y - ny))
    }
  return best
}

/**
 * Flood-fills a 10-unit lattice of positions where the scoop fits with a
 * margin. Movers are ignored: they always leave a gap on one side.
 */
export function reachableFrom(level: Level, from: Point, clearance = HIT_RADIUS + SOLVE_MARGIN): Uint8Array {
  const step = 10
  const size = WORLD / step
  const open = new Uint8Array(size * size)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) open[j * size + i] = wallDistance(level, i * step + 5, j * step + 5) >= clearance ? 1 : 0
  const seen = new Uint8Array(size * size)
  const si = Math.floor(from.x / step)
  const sj = Math.floor(from.y / step)
  if (!open[sj * size + si]) return seen
  const queue = [sj * size + si]
  seen[queue[0]] = 1
  while (queue.length) {
    const n = queue.pop()!
    const i = n % size
    const j = Math.floor(n / size)
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ii = i + di
      const jj = j + dj
      if (ii < 0 || jj < 0 || ii >= size || jj >= size) continue
      const m = jj * size + ii
      if (open[m] && !seen[m]) {
        seen[m] = 1
        queue.push(m)
      }
    }
  }
  return seen
}

/** A pickup counts as reachable when the scoop can get within touching distance. */
export function canReach(seen: Uint8Array, target: Point, touch: number): boolean {
  const step = 10
  const size = WORLD / step
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++)
      if (seen[j * size + i] && Math.hypot(i * step + 5 - target.x, j * step + 5 - target.y) <= touch) return true
  return false
}

export function isSolvable(level: Level): boolean {
  const seen = reachableFrom(level, level.start)
  if (!canReach(seen, level.cone, 40)) return false
  return [...level.cherries, ...level.flakes].every((point) => canReach(seen, point, 36))
}

/**
 * Movers never come near the start, the cone or a snowflake, so the scoop is
 * safe while it waits. Cherries may sit close by (that is the dare) but never
 * inside a stone's path.
 */
export function moversStayClear(level: Level): boolean {
  const safe = [level.start, level.cone, ...level.flakes]
  for (const mover of level.movers) {
    const x0 = Math.min(mover.x, mover.x + mover.dx) * CELL
    const y0 = Math.min(mover.y, mover.y + mover.dy) * CELL
    const x1 = (Math.max(mover.x, mover.x + mover.dx) + mover.w) * CELL
    const y1 = (Math.max(mover.y, mover.y + mover.dy) + mover.h) * CELL
    const gap = (p: Point) => Math.hypot(p.x - Math.max(x0, Math.min(p.x, x1)), p.y - Math.max(y0, Math.min(p.y, y1)))
    if (safe.some((p) => gap(p) < HIT_RADIUS + 34)) return false
    if (level.cherries.some((p) => gap(p) < 20)) return false
  }
  return true
}
