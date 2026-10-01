export type SwingRole = 'rider' | 'pusher-left' | 'pusher-right' | 'waiting'
export interface SwingMember { id: number; activity: number; drag: boolean }

// Keep existing occupants in their jobs; fill vacancies in stable ID order.
export function assignSwingRoles(members: SwingMember[], previous = new Map<number, SwingRole>()) {
  const eligible = members.filter(f => f.activity === 0 && !f.drag).sort((a, b) => a.id - b.id)
  const roles = new Map<number, SwingRole>()
  for (const role of ['rider', 'pusher-left', 'pusher-right'] as const) {
    const member = eligible.find(f => previous.get(f.id) === role && !roles.has(f.id))
      ?? eligible.find(f => !roles.has(f.id))
    if (member) roles.set(member.id, role)
  }
  for (const member of eligible) if (!roles.has(member.id)) roles.set(member.id, 'waiting')
  return roles
}

export const SWING_PIVOT_Y = -61
export const SWING_LENGTH = 69
export const SWING_SEAT_OFFSET = 35

// A front-view pendulum: seat, rider and hand contacts share this rigid transform.
export function swingPose(angle: number) {
  const sine = Math.sin(angle), cosine = Math.cos(angle)
  const point = (x: number, y: number) => ({
    x: x * cosine - y * sine,
    y: SWING_PIVOT_Y + x * sine + y * cosine,
  })
  return {
    degrees: angle * 180 / Math.PI,
    seat: point(0, SWING_LENGTH),
    rider: point(0, SWING_LENGTH - SWING_SEAT_OFFSET),
    leftHand: point(-24, SWING_LENGTH - SWING_SEAT_OFFSET - 13),
    rightHand: point(24, SWING_LENGTH - SWING_SEAT_OFFSET - 13),
  }
}

// Grounded helpers reach the seat near the bottom of its arc, then draw back.
export function swingHelperPose(angle: number, role: SwingRole, waitingIndex = 0) {
  const side = role === 'pusher-right' ? 1 : -1
  if (role === 'waiting') return { x: -96 + (waitingIndex % 4) * 64, y: 68 + Math.floor(waitingIndex / 4) * 78, reach: 0 }
  return { x: side * 77, y: 6, reach: Math.max(0, 1 - Math.abs(angle) / .18) }
}
