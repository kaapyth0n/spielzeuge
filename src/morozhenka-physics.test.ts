import { describe, expect, it } from 'vitest'
import { HANDMADE_COUNT, WORLD, levelFor, moverRect, parseLevel, reachableFrom, type Level, type LevelSpec, type Point } from './morozhenka-levels.ts'
import { MAX_SPEED, NO_PUSH, hitsWall, stepScoop, touches, touchesCone, type Push } from './morozhenka-physics.ts'

/** Shortest comfortable route on the 10-unit lattice the solvability check uses. */
function route(level: Level): Point[] {
  const size = WORLD / 10
  const seen = reachableFrom(level, level.start)
  const index = (p: Point) => Math.floor(p.y / 10) * size + Math.floor(p.x / 10)
  const from = index(level.start)
  const previous = new Int32Array(size * size).fill(-1)
  previous[from] = from
  const queue = [from]
  let goal = -1
  for (let head = 0; head < queue.length && goal < 0; head++) {
    const n = queue[head]
    const x = (n % size) * 10 + 5
    const y = Math.floor(n / size) * 10 + 5
    if (Math.hypot(x - level.cone.x, y - (level.cone.y - 10)) < 40) goal = n
    for (const m of [n + 1, n - 1, n + size, n - size])
      if (m >= 0 && m < size * size && seen[m] && previous[m] < 0 && Math.abs((m % size) - (n % size)) <= 1) {
        previous[m] = n
        queue.push(m)
      }
  }
  const path: Point[] = []
  for (let n = goal; n !== from; n = previous[n]) path.push({ x: (n % size) * 10 + 5, y: Math.floor(n / size) * 10 + 5 })
  return path.reverse().filter((_, i, all) => i % 4 === 0 || i === all.length - 1)
}

const open: LevelSpec = {
  id: 'test',
  theme: 'pencil',
  map: [
    '####################',
    ...Array.from({ length: 8 }, () => '#..................#'),
    '#........S.........#',
    ...Array.from({ length: 8 }, () => '#..................#'),
    '#.........C........#',
    '####################',
  ],
}

describe('flying scoop', () => {
  it('flies away from its fire and stops soon after the voice stops', () => {
    const level = parseLevel(open, 1)
    const scoop = { x: level.start.x, y: level.start.y, vx: 0, vy: 0 }
    for (let i = 0; i < 30; i++) expect(stepScoop(scoop, { x: 0, y: -1, power: 1, kick: i === 0 }, 1 / 60, level, i / 60)).toBe(false)
    expect(scoop.y).toBeLessThan(level.start.y - 80)
    expect(scoop.x).toBe(level.start.x)
    for (let i = 0; i < 90; i++) stepScoop(scoop, NO_PUSH, 1 / 60, level, 1)
    expect(Math.hypot(scoop.vx, scoop.vy)).toBe(0)
  })

  it('never exceeds its top speed and never slips through a wall', () => {
    const level = parseLevel(open, 1)
    const scoop = { x: level.start.x, y: level.start.y, vx: 0, vy: 0 }
    let crashed = false
    for (let i = 0; i < 200 && !crashed; i++) {
      crashed = stepScoop(scoop, { x: 1, y: 0, power: 1, kick: true }, 0.05, level, 0)
      expect(Math.hypot(scoop.vx, scoop.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-6)
    }
    expect(crashed).toBe(true)
    expect(scoop.x).toBeLessThan(950)
  })

  it('bumps into sleepy stones', () => {
    const level = levelFor(9)
    const stone = moverRect(level.movers[0], 0)
    expect(hitsWall(level, stone.x + stone.w / 2, stone.y + stone.h / 2, 0)).toBe(true)
    expect(hitsWall(level, level.start.x, level.start.y, 0)).toBe(false)
  })

  it('lands in the cone from above or from the side and picks cherries by touch', () => {
    const cone = { x: 500, y: 500 }
    expect(touchesCone({ x: 500, y: 450, vx: 0, vy: 0 }, cone)).toBe(true)
    expect(touchesCone({ x: 455, y: 520, vx: 0, vy: 0 }, cone)).toBe(true)
    expect(touchesCone({ x: 500, y: 390, vx: 0, vy: 0 }, cone)).toBe(false)
    expect(touches({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 30, y: 30 }, 42)).toBe(false)
    expect(touches({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 25, y: 25 }, 42)).toBe(true)
  })

  it('every hand-made round can be flown with one letter at a time', () => {
    for (let n = 1; n <= HANDMADE_COUNT; n++) {
      const level = { ...levelFor(n), movers: [] }
      const path = route(level)
      expect(path.length, `round ${n} route`).toBeGreaterThan(3)
      const scoop = { x: level.start.x, y: level.start.y, vx: 0, vy: 0 }
      let target = 0
      let won = false
      for (let frame = 0; frame < 60 * 90 && !won; frame++) {
        const goal = path[Math.min(target, path.length - 1)]
        const dx = goal.x - scoop.x
        const dy = goal.y - scoop.y
        if (Math.hypot(dx, dy) < 14) target++
        // Like a child: say one letter, stop, say another.
        const want = Math.min(200, Math.hypot(dx, dy) * 4) / (Math.hypot(dx, dy) || 1)
        const ex = dx * want - scoop.vx
        const ey = dy * want - scoop.vy
        let push: Push = NO_PUSH
        if (Math.max(Math.abs(ex), Math.abs(ey)) > 25)
          push = Math.abs(ex) > Math.abs(ey) ? { x: Math.sign(ex), y: 0, power: 0.8, kick: false } : { x: 0, y: Math.sign(ey), power: 0.8, kick: false }
        expect(stepScoop(scoop, push, 1 / 60, level, frame / 60), `round ${n} crashed at ${Math.round(scoop.x)},${Math.round(scoop.y)}`).toBe(false)
        won = touchesCone(scoop, level.cone)
      }
      expect(won, `round ${n} reaches the cone`).toBe(true)
    }
  })
})
