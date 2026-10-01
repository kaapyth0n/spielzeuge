import { describe, expect, it } from 'vitest'
import { assignSwingRoles, swingPose, swingHelperPose, SWING_SEAT_OFFSET } from './prints-swing'
const members = (count: number) => Array.from({ length: count }, (_, id) => ({ id, activity: 0, drag: false }))
describe('shared swing', () => {
  it('assigns one rider and at most two stable helpers', () => {
    for (let count = 1; count <= 20; count++) {
      const fs = members(count), roles = assignSwingRoles(fs)
      expect([...roles.values()].filter(r => r === 'rider')).toHaveLength(1)
      expect([...roles.values()].filter(r => r.startsWith('pusher'))).toHaveLength(Math.min(2, count - 1))
      expect(assignSwingRoles(fs.reverse(), roles)).toEqual(roles)
    }
  })
  it('transfers the seat during drag, preserves replacement on return and clears vacancies', () => {
    const fs = members(3)
    let roles = assignSwingRoles(fs)
    fs[0].drag = true
    roles = assignSwingRoles(fs, roles)
    expect(roles.has(0)).toBe(false)
    expect(roles.get(1)).toBe('rider')
    fs[0].drag = false
    roles = assignSwingRoles(fs, roles)
    expect(roles.get(1)).toBe('rider')
    fs[2].activity = 7
    roles = assignSwingRoles(fs, roles)
    expect(roles.has(2)).toBe(false)
    expect(assignSwingRoles([], roles).size).toBe(0)
  })
  it('keeps the seated hips on the seat and both hands on ropes throughout the arc', () => {
    for (let angle = -.42; angle <= .42; angle += .01) {
      const pose = swingPose(angle)
      expect(pose.rider.x - Math.sin(angle)*SWING_SEAT_OFFSET).toBeCloseTo(pose.seat.x)
      expect(pose.rider.y + Math.cos(angle)*SWING_SEAT_OFFSET).toBeCloseTo(pose.seat.y)
      for (const [hand, x] of [[pose.leftHand, -24], [pose.rightHand, 24]] as const) {
        expect((hand.x-pose.rider.x)*Math.cos(angle)+(hand.y-pose.rider.y)*Math.sin(angle)).toBeCloseTo(x)
      }
      expect(swingHelperPose(angle, 'pusher-left').y).toBe(6)
      expect(swingHelperPose(angle, 'pusher-right').y).toBe(6)
    }
    expect(swingHelperPose(0, 'pusher-left').reach).toBe(1)
    expect(swingHelperPose(.42, 'pusher-left').reach).toBe(0)
  })
})
