import { describe, expect, it } from 'vitest'
import {
  GRID,
  HANDMADE,
  HANDMADE_COUNT,
  isSolvable,
  levelFor,
  moversStayClear,
  parseLevel,
  surpriseLevel,
  wallDistance,
  HIT_RADIUS,
} from './morozhenka-levels.ts'

describe('hand-made rounds', () => {
  it('are 20×20 closed maps with a start, a cone and at most three cherries', () => {
    expect(HANDMADE_COUNT).toBe(12)
    HANDMADE.forEach((spec, index) => {
      const level = parseLevel(spec, index + 1)
      expect(spec.map).toHaveLength(GRID)
      expect(level.cherries.length).toBeGreaterThanOrEqual(1)
      expect(level.cherries.length).toBeLessThanOrEqual(3)
      expect(wallDistance(level, level.start.x, level.start.y)).toBeGreaterThan(HIT_RADIUS + 20)
      expect(wallDistance(level, level.cone.x, level.cone.y)).toBeGreaterThan(HIT_RADIUS)
    })
  })

  it('can all be finished with room to spare, including every cherry and snowflake', () => {
    for (let n = 1; n <= HANDMADE_COUNT; n++) expect(isSolvable(levelFor(n)), `round ${n}`).toBe(true)
  })

  it('keep sleepy stones away from the start, the cone and snowflakes', () => {
    for (let n = 1; n <= HANDMADE_COUNT; n++) expect(moversStayClear(levelFor(n)), `round ${n}`).toBe(true)
    expect(HANDMADE.filter((spec) => spec.movers?.length).length).toBeGreaterThanOrEqual(3)
  })

  it('have distinct ids and grow from one letter to longer journeys', () => {
    expect(new Set(HANDMADE.map((spec) => spec.id)).size).toBe(HANDMADE_COUNT)
    expect(levelFor(1).flakes).toHaveLength(0)
    expect(levelFor(12).flakes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('surprise rounds', () => {
  it('are always the same map for the same round number', () => {
    const a = surpriseLevel(21)
    const b = surpriseLevel(21)
    expect(Array.from(a.walls)).toEqual(Array.from(b.walls))
    expect(a.start).toEqual(b.start)
    expect(a.movers).toEqual(b.movers)
  })

  it('differ from round to round and stay solvable for a long time', () => {
    const shapes = new Set<string>()
    for (let n = HANDMADE_COUNT + 1; n <= HANDMADE_COUNT + 120; n++) {
      const level = levelFor(n)
      expect(level.surprise).toBe(true)
      expect(level.number).toBe(n)
      expect(isSolvable(level), `surprise ${n}`).toBe(true)
      expect(moversStayClear(level), `surprise ${n}`).toBe(true)
      shapes.add(Array.from(level.walls).join(''))
    }
    expect(shapes.size).toBeGreaterThan(100)
  })

  it('add sleepy stones only after a few surprise rounds', () => {
    expect(levelFor(HANDMADE_COUNT + 1).movers).toHaveLength(0)
    const later = Array.from({ length: 20 }, (_, i) => levelFor(HANDMADE_COUNT + 10 + i))
    expect(later.some((level) => level.movers.length > 0)).toBe(true)
  })
})
