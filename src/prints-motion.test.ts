import { describe, expect, it } from 'vitest'
import { approach, footballPose, SLIDE_DURATION, SLIDE_PHASES, slidePose } from './prints-motion'

describe('continuous playground routes', () => {
  it('joins every slide phase and the loop seam without a teleport', () => {
    let boundary = 0
    for (const phase of SLIDE_PHASES) {
      boundary += phase.seconds
      const before = slidePose(boundary - .00001)
      const after = slidePose(boundary + .00001)
      expect(Math.hypot(before.x-after.x, before.y-after.y)).toBeLessThan(.01)
    }
    expect(slidePose(0)).toEqual(slidePose(SLIDE_DURATION))
  })
  it('climbs on the left, slides downhill, then walks back with feet on the ground', () => {
    expect(slidePose(1).x).toBe(-43)
    expect(slidePose(2).y).toBeLessThan(slidePose(1).y)
    expect(slidePose(4).y).toBeGreaterThan(slidePose(3.2).y)
    expect(slidePose(8).y+39).toBe(67)
    expect(slidePose(9).x).toBeLessThan(slidePose(8).x)
  })
  it('approaches from any reassignment point with bounded speed including the final step', () => {
    for (const distance of [0, 1, 7, 20, 900]) {
      const p = approach(distance, 0, 0, 0, .016)
      expect(Math.abs(p.x-distance)).toBeLessThanOrEqual(2.401)
      expect(p.x).toBeGreaterThanOrEqual(0)
    }
    expect(approach(5, 8, 0, 0, 0)).toMatchObject({ x: 5, y: 8 })
  })
  it('rallies the ball continuously with kicks at both ends', () => {
    expect(footballPose(0).kick).toBe(1)
    expect(footballPose(2, 1).kick).toBe(1)
    expect(footballPose(0).ballX).toBe(-62)
    expect(footballPose(2).ballX).toBe(62)
    expect(footballPose(4).ballX).toBe(-62)
  })
})
