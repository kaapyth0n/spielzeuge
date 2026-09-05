import { describe, expect, test } from 'vitest'
import { renderDoll } from './chunyashka-doll.ts'
import {
  BASE_LAYER,
  DEFAULT_OUTFIT,
  LIKES_ARE_LOCAL,
  LIKE_TARGET,
  likeTarget,
  withItem,
} from './chunyashka-state.ts'

describe('chunyashka dress-up', () => {
  test('the doll always has a clothed base layer', () => {
    const svg = renderDoll(DEFAULT_OUTFIT)
    expect(svg).toContain(`data-base="${BASE_LAYER}"`)
    expect(svg).toContain('data-face="true"')
  })

  test('changing a dress never removes the onesie', () => {
    const dressed = withItem(DEFAULT_OUTFIT, 'dress', 'berry')
    const svg = renderDoll(dressed)
    expect(svg).toContain('data-base="onesie"')
    expect(svg).toContain('data-dress="berry"')
  })

  test('likes stay on the toy and always reach 100', () => {
    expect(LIKES_ARE_LOCAL).toBe(true)
    expect(likeTarget()).toBe(100)
    expect(LIKE_TARGET).toBe(100)
  })

  test('unknown items are ignored', () => {
    expect(withItem(DEFAULT_OUTFIT, 'hair', 'nope')).toEqual(DEFAULT_OUTFIT)
  })
})
