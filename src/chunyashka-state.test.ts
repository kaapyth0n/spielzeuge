import { describe, expect, test } from 'vitest'
import { renderDoll } from './chunyashka-doll.ts'
import {
  BASE_LAYER,
  CLOTHES,
  CLOTHES_KINDS,
  DEFAULT_OUTFIT,
  LIKES_ARE_LOCAL,
  SHOES,
  likeTarget,
  withItem,
} from './chunyashka-state.ts'

describe('chunyashka dress-up', () => {
  test('the doll always has a clothed base layer', () => {
    const svg = renderDoll(DEFAULT_OUTFIT)
    expect(svg).toContain(`data-base="${BASE_LAYER}"`)
    expect(svg).toContain('data-face="true"')
  })

  test('there are at least 20 clothes and 20 shoes, not only dresses', () => {
    expect(CLOTHES.length).toBeGreaterThanOrEqual(20)
    expect(SHOES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(CLOTHES.map((item) => item.kind)).size).toBe(CLOTHES_KINDS.length)
    expect(CLOTHES_KINDS.length).toBeGreaterThan(1)
  })

  test('changing clothes never removes the onesie', () => {
    const last = CLOTHES.at(-1)
    expect(last).toBeTruthy()
    const dressed = withItem(DEFAULT_OUTFIT, 'clothes', last?.id ?? '')
    const svg = renderDoll(dressed)
    expect(svg).toContain('data-base="onesie"')
    expect(svg).toContain(`data-clothes="${last?.id}"`)
  })

  test('likes stay local and differ by combination', () => {
    expect(LIKES_ARE_LOCAL).toBe(true)
    const other = withItem(DEFAULT_OUTFIT, 'color', 'pink')
    expect(likeTarget(DEFAULT_OUTFIT)).not.toBe(likeTarget(other))
    expect(likeTarget(DEFAULT_OUTFIT)).toBe(likeTarget({ ...DEFAULT_OUTFIT }))
  })

  test('unknown items are ignored', () => {
    expect(withItem(DEFAULT_OUTFIT, 'hair', 'nope')).toEqual(DEFAULT_OUTFIT)
  })
})
