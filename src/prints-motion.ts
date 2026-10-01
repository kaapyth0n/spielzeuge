// Coordinates are body centres; standing feet sit 39 units below them.
export const SLIDE_PHASES = [
  { name: 'climb', seconds: 2.4, from: [-43, 4], to: [-43, -93] },
  { name: 'platform', seconds: .7, from: [-43, -93], to: [-22, -85] },
  { name: 'slide', seconds: 1.8, from: [-22, -85], to: [84, -5] },
  { name: 'land', seconds: .5, from: [84, -5], to: [96, 4] },
  { name: 'walk-around', seconds: 1, from: [96, 4], to: [100, 28] },
  { name: 'walk-back', seconds: 3, from: [100, 28], to: [-78, 28] },
  { name: 'walk-to-ladder', seconds: 1, from: [-78, 28], to: [-43, 4] },
] as const
export const SLIDE_DURATION = SLIDE_PHASES.reduce((sum, phase) => sum + phase.seconds, 0)
export function slidePose(time: number) {
  let t = ((time % SLIDE_DURATION) + SLIDE_DURATION) % SLIDE_DURATION
  for (const phase of SLIDE_PHASES) {
    if (t < phase.seconds) {
      const q = t / phase.seconds
      let x = phase.from[0] + (phase.to[0] - phase.from[0]) * q
      let y = phase.from[1] + (phase.to[1] - phase.from[1]) * q
      // Match the quadratic chute, offset upward by the character's leg length.
      if (phase.name === 'slide') {
        const u = Math.min(1, q / .8)
        x = q < .8 ? (1-u)**2 * -22 + 2*(1-u)*u * -7 + u*u*58 : 58 + (q-.8)*130
        y = q < .8 ? (1-u)**2 * -85 + 2*(1-u)*u * -29 + u*u*-5 : -5
      }
      return { x, y, phase: phase.name }
    }
    t -= phase.seconds
  }
  return { x: -43, y: 4, phase: 'climb' as const }
}
export function approach(x: number, y: number, tx: number, ty: number, dt: number) {
  const distance = Math.hypot(tx-x, ty-y)
  const fraction = distance ? Math.min(1, Math.max(0, dt)*150/distance) : 1
  return { x: x+(tx-x)*fraction, y: y+(ty-y)*fraction, arrived: fraction === 1 }
}
// One shared rally: players meet the same ball at alternating ends of the pitch.
export function footballPose(time: number, slot = 0) {
  const t = ((time % 4) + 4) % 4
  const ballX = t < 2 ? -62 + 62*t : 62 - 62*(t-2)
  const side = slot % 2 ? 1 : -1
  const contact = side < 0 ? Math.min(t, 4-t) : Math.abs(t-2)
  const kick = Math.max(0, 1-contact/.3)
  return { ballX, ballY: 15, x: side*79 + Math.sin(time*3+slot)*2, y: -24 + (slot % 3)*3, kick }
}
