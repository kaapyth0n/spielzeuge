/**
 * Тамагочи Связь — the pets. Each is drawn from code around its feet, so any
 * scene can pose it: squash, lean, spin, raise arms, walk, sing.
 */
import {
  HAIR_COLORS,
  INK,
  TAU,
  WIRE_COLORS,
  heartPath,
  line,
  oval,
  paint,
  rr,
  starPath,
  type Ctx,
  type HairId,
  type Look,
  type Pt,
  type SpeciesId,
  type WireShape,
} from './tamagochi-kit.ts'

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'heart'
export type Mouth = 'smile' | 'open' | 'o' | 'sad' | 'chew' | 'sing'

export interface Pose {
  /** Feet, on the ground. */
  x: number
  y: number
  /** Height of the body in pixels. */
  size: number
  /** Where it looks, -1 (left) … 1 (right). */
  face?: number
  /** -1 stretched … 1 squashed. */
  squash?: number
  /** Tilt around the feet, radians. */
  lean?: number
  /** Turn around the middle of the body, radians. */
  rot?: number
  /** Horizontal scale, for a paper-flat spin (cos of an angle). */
  flip?: number
  /** Arm angles: 0 hangs down, PI points straight up. */
  armL?: number
  armR?: number
  /** Walk cycle, radians; leave out when standing. */
  walk?: number
  eyes?: Eyes
  mouth?: Mouth
  /** Pixels above the ground; the shadow stays below. */
  lift?: number
  shadow?: boolean
}

/** Useful points in units of `size`, relative to the feet (y is negative upwards). */
export const PET = { top: -0.9, middle: -0.45, eyeY: -0.58 }

/**
 * Where the hands are when both arms point straight up (armL = armR = PI),
 * in units of `size` relative to the feet. Handy for hanging a pet on rings.
 */
export function handsUp(species: SpeciesId): { lx: number; rx: number; y: number } {
  if (species === 'banana') return { lx: -0.17, rx: 0.21, y: -0.74 }
  if (species === 'mini') return { lx: -0.33, rx: 0.33, y: -0.62 }
  return { lx: -0.36, rx: 0.36, y: -0.65 }
}
/** Arms rest a little away from the body and straighten as they rise. */
const armTurn = (angle: number, rest: number): number => angle + rest * Math.max(0, 1 - angle / Math.PI)

export function defaultLook(species: SpeciesId): Look {
  const hair: Record<SpeciesId, [HairId, number]> = {
    chick: ['tuft', 3],
    kitten: ['none', 3],
    monkey: ['curl', 0],
    banana: ['none', 7],
    mini: ['none', 4],
    bunny: ['none', 4],
    penguin: ['tuft', 1],
    puppy: ['none', 0],
  }
  return { hair: hair[species][0], hairColor: hair[species][1], head: null, face: null, neck: null }
}

interface Critter {
  body: string
  belly: string | null
  limb: string
  foot: string
  ears: 'none' | 'cat' | 'round' | 'long' | 'flop'
  earIn: string
  muzzle: 'beak' | 'cat' | 'monkey' | 'bunny' | 'dog'
  tail: 'none' | 'cat' | 'curl' | 'puff' | 'wag' | 'chick'
  stripes?: string
}
const CRITTERS: Partial<Record<SpeciesId, Critter>> = {
  chick: { body: '#ffd84a', belly: '#fff3ae', limb: '#ffc21f', foot: '#ff9a3d', ears: 'none', earIn: '', muzzle: 'beak', tail: 'chick' },
  kitten: { body: '#ffab5e', belly: '#ffe3c2', limb: '#ffab5e', foot: '#ffe3c2', ears: 'cat', earIn: '#ff9fb5', muzzle: 'cat', tail: 'cat', stripes: '#e8813a' },
  monkey: { body: '#b9774d', belly: '#ffdcb0', limb: '#b9774d', foot: '#ffdcb0', ears: 'round', earIn: '#ffdcb0', muzzle: 'monkey', tail: 'curl' },
  bunny: { body: '#ffffff', belly: '#ffe3ee', limb: '#ffffff', foot: '#ffe3ee', ears: 'long', earIn: '#ffb3cf', muzzle: 'bunny', tail: 'puff' },
  penguin: { body: '#55679e', belly: '#ffffff', limb: '#55679e', foot: '#ff9a3d', ears: 'none', earIn: '', muzzle: 'beak', tail: 'none' },
  puppy: { body: '#f7dcae', belly: '#fff5e0', limb: '#f7dcae', foot: '#fff5e0', ears: 'flop', earIn: '#a66a3f', muzzle: 'dog', tail: 'wag' },
}

interface Anchors {
  topX: number
  topY: number
  eyeX: number
  eyeY: number
  neckY: number
  headW: number
}
function anchors(species: SpeciesId): Anchors {
  if (species === 'banana') return { topX: -0.2, topY: -0.97, eyeX: 0.02, eyeY: -0.57, neckY: -0.3, headW: 0.5 }
  if (species === 'mini') return { topX: -0.06, topY: -0.86, eyeX: 0, eyeY: -0.52, neckY: -0.2, headW: 0.62 }
  return { topX: 0, topY: -0.9, eyeX: 0, eyeY: -0.58, neckY: -0.3, headW: 0.8 }
}

/** Draw one pet. `t` is the game clock, for blinking and little loops. */
export function drawPet(ctx: Ctx, species: SpeciesId, look: Look, pose: Pose, t: number): void {
  const s = pose.size
  const lift = pose.lift ?? 0
  ctx.save()
  if (pose.shadow !== false) {
    const k = Math.max(0.35, 1 - lift / (s * 2.2))
    oval(ctx, pose.x, pose.y, s * 0.36 * k, s * 0.075 * k)
    paint(ctx, 'rgba(59,42,74,0.16)')
  }
  ctx.translate(pose.x, pose.y - lift)
  if (pose.lean) ctx.rotate(pose.lean)
  const sq = pose.squash ?? 0
  ctx.scale((1 + sq * 0.22) * (pose.flip ?? 1), 1 - sq * 0.25)
  if (pose.rot) {
    ctx.translate(0, PET.middle * s)
    ctx.rotate(pose.rot)
    ctx.translate(0, -PET.middle * s)
  }
  const lw = Math.max(1.6, s * 0.034)
  if (species === 'banana') banana(ctx, s, lw, pose, t)
  else if (species === 'mini') mini(ctx, s, lw, pose, t)
  else critter(ctx, CRITTERS[species]!, species, s, lw, pose, t)
  const a = anchors(species)
  const f = (pose.face ?? 0) * 0.05 * s
  if (look.neck) drawAccessory(ctx, look.neck, f * 0.4, a.neckY * s, a.headW * s)
  drawHair(ctx, look.hair, look.hairColor, a.topX * s + f * 0.5, a.topY * s, a.headW * s, lw)
  if (look.face) drawAccessory(ctx, look.face, a.eyeX * s + f, a.eyeY * s, a.headW * s)
  if (look.head) drawAccessory(ctx, look.head, a.topX * s + f * 0.5, a.topY * s, a.headW * s)
  ctx.restore()
}

function eyesAt(ctx: Ctx, x: number, y: number, gap: number, r: number, kind: Eyes, t: number, lw: number): void {
  const blink = kind === 'open' && (t * 1.0 + x * 0.013) % 3.4 < 0.13
  for (const side of [-1, 1]) {
    const ex = x + side * gap
    if (kind === 'closed' || blink) {
      ctx.beginPath()
      ctx.arc(ex, y - r * 0.4, r * 1.1, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.lineWidth = lw
      ctx.strokeStyle = INK
      ctx.lineCap = 'round'
      ctx.stroke()
    } else if (kind === 'happy') {
      ctx.beginPath()
      ctx.arc(ex, y + r * 0.6, r * 1.15, 1.15 * Math.PI, 1.85 * Math.PI)
      ctx.lineWidth = lw * 1.1
      ctx.strokeStyle = INK
      ctx.lineCap = 'round'
      ctx.stroke()
    } else if (kind === 'heart') {
      heartPath(ctx, ex, y, r * 3.2)
      paint(ctx, '#ff5a8a', lw * 0.6)
    } else {
      const big = kind === 'wide' ? 1.35 : 1
      oval(ctx, ex, y, r * big, r * big * 1.12)
      paint(ctx, INK)
      oval(ctx, ex - r * 0.3, y - r * 0.4, r * 0.38 * big, r * 0.38 * big)
      paint(ctx, '#fff')
    }
  }
}

function mouthAt(ctx: Ctx, x: number, y: number, w: number, kind: Mouth, t: number, lw: number): void {
  const openness =
    kind === 'open' ? 1 : kind === 'sing' ? 0.55 + 0.45 * Math.sin(t * 11) : kind === 'chew' ? 0.35 + 0.35 * Math.sin(t * 16) : 0
  if (kind === 'o') {
    oval(ctx, x, y + w * 0.2, w * 0.28, w * 0.34)
    paint(ctx, '#8d3550', lw * 0.8)
  } else if (openness > 0) {
    oval(ctx, x, y + w * 0.25, w * 0.5, w * 0.5 * openness + 0.5)
    paint(ctx, '#8d3550', lw * 0.8)
    if (openness > 0.6) {
      oval(ctx, x, y + w * 0.25 + w * 0.26 * openness, w * 0.26, w * 0.16)
      paint(ctx, '#ff8fa8')
    }
  } else {
    ctx.beginPath()
    if (kind === 'sad') ctx.arc(x, y + w * 0.75, w * 0.5, 1.2 * Math.PI, 1.8 * Math.PI)
    else ctx.arc(x, y - w * 0.15, w * 0.5, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.lineWidth = lw
    ctx.strokeStyle = INK
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

function cheeks(ctx: Ctx, x: number, y: number, gap: number, r: number): void {
  ctx.save()
  ctx.globalAlpha *= 0.55
  for (const side of [-1, 1]) {
    oval(ctx, x + side * gap, y, r, r * 0.68)
    paint(ctx, '#ff8fb0')
  }
  ctx.restore()
}

function arm(ctx: Ctx, side: number, x: number, y: number, angle: number, len: number, wide: number, color: string, lw: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(side < 0 ? armTurn(angle, 0.5) : -armTurn(angle, 0.5))
  oval(ctx, 0, len * 0.5, wide, len * 0.62)
  paint(ctx, color, lw)
  ctx.restore()
}

function feet(ctx: Ctx, s: number, lw: number, color: string, walk: number | undefined, gap = 0.17): void {
  for (const side of [-1, 1]) {
    const ph = walk === undefined ? 0 : Math.sin(walk + (side < 0 ? 0 : Math.PI))
    oval(ctx, side * gap * s + (walk === undefined ? 0 : ph * 0.05 * s), -0.035 * s - Math.max(0, ph) * 0.07 * s, 0.115 * s, 0.062 * s)
    paint(ctx, color, lw)
  }
}

function critter(ctx: Ctx, c: Critter, species: SpeciesId, s: number, lw: number, p: Pose, t: number): void {
  const f = (p.face ?? 0) * 0.07 * s
  const eyes = p.eyes ?? 'open'
  const mouth = p.mouth ?? 'smile'
  const cy = -0.46 * s
  const wag = Math.sin(t * 9) * 0.25

  // Tail, behind everything.
  ctx.save()
  const tailSide = (p.face ?? 0) > 0.2 ? -1 : 1
  ctx.translate(tailSide * 0.34 * s, -0.2 * s)
  ctx.scale(tailSide, 1)
  if (c.tail === 'cat') {
    ctx.rotate(Math.sin(t * 2.4) * 0.18)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(0.3 * s, 0.02 * s, 0.34 * s, -0.3 * s, 0.2 * s, -0.42 * s)
    ctx.lineWidth = 0.11 * s + lw * 2
    ctx.strokeStyle = INK
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.lineWidth = 0.11 * s
    ctx.strokeStyle = c.body
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0.2 * s, -0.42 * s, 0.03 * s, 0, TAU)
    paint(ctx, c.stripes ?? c.body)
  } else if (c.tail === 'curl') {
    ctx.beginPath()
    ctx.moveTo(0, 0.05 * s)
    ctx.bezierCurveTo(0.34 * s, 0.1 * s, 0.4 * s, -0.36 * s, 0.2 * s, -0.36 * s)
    ctx.bezierCurveTo(0.08 * s, -0.36 * s, 0.1 * s, -0.2 * s, 0.2 * s, -0.22 * s)
    ctx.lineWidth = 0.075 * s + lw * 2
    ctx.strokeStyle = INK
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.lineWidth = 0.075 * s
    ctx.strokeStyle = c.body
    ctx.stroke()
  } else if (c.tail === 'puff') {
    oval(ctx, 0.06 * s, 0.04 * s, 0.11 * s, 0.11 * s)
    paint(ctx, '#fff', lw)
  } else if (c.tail === 'wag') {
    ctx.rotate(-0.5 + wag)
    oval(ctx, 0.12 * s, 0, 0.16 * s, 0.06 * s)
    paint(ctx, c.earIn, lw)
  } else if (c.tail === 'chick') {
    ctx.beginPath()
    ctx.moveTo(-0.02 * s, 0.04 * s)
    ctx.lineTo(0.16 * s, -0.08 * s)
    ctx.lineTo(0.1 * s, 0.03 * s)
    ctx.lineTo(0.18 * s, 0.07 * s)
    ctx.closePath()
    paint(ctx, c.limb, lw)
  }
  ctx.restore()

  // Ears behind the body.
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 0.24 * s + f * 0.4, -0.82 * s)
    if (c.ears === 'cat') {
      ctx.rotate(side * 0.28)
      ctx.beginPath()
      ctx.moveTo(-0.13 * s, 0.06 * s)
      ctx.quadraticCurveTo(-0.02 * s, -0.22 * s, 0.03 * s, -0.2 * s)
      ctx.quadraticCurveTo(0.1 * s, -0.12 * s, 0.14 * s, 0.07 * s)
      ctx.closePath()
      paint(ctx, c.body, lw)
      ctx.beginPath()
      ctx.moveTo(-0.06 * s, 0.03 * s)
      ctx.quadraticCurveTo(0, -0.12 * s, 0.03 * s, -0.11 * s)
      ctx.quadraticCurveTo(0.06 * s, -0.06 * s, 0.08 * s, 0.04 * s)
      ctx.closePath()
      paint(ctx, c.earIn)
    } else if (c.ears === 'round') {
      oval(ctx, side * 0.17 * s, 0.26 * s, 0.13 * s, 0.14 * s)
      paint(ctx, c.body, lw)
      oval(ctx, side * 0.18 * s, 0.26 * s, 0.07 * s, 0.08 * s)
      paint(ctx, c.earIn)
    } else if (c.ears === 'long') {
      ctx.rotate(side * (0.16 + Math.sin(t * 1.7 + side) * 0.04))
      oval(ctx, -side * 0.08 * s, -0.2 * s, 0.085 * s, 0.3 * s)
      paint(ctx, c.body, lw)
      oval(ctx, -side * 0.08 * s, -0.19 * s, 0.04 * s, 0.22 * s)
      paint(ctx, c.earIn)
    }
    ctx.restore()
  }

  feet(ctx, s, lw, c.foot, p.walk)

  oval(ctx, 0, cy, 0.4 * s, 0.445 * s)
  paint(ctx, c.body, lw)
  if (c.belly) {
    ctx.save()
    oval(ctx, 0, cy, 0.4 * s, 0.445 * s)
    ctx.clip()
    if (species === 'penguin') oval(ctx, f * 0.5, -0.4 * s, 0.29 * s, 0.4 * s)
    else oval(ctx, f * 0.5, -0.2 * s, 0.25 * s, 0.24 * s)
    paint(ctx, c.belly)
    if (c.stripes) {
      for (const dx of [-0.11, 0, 0.11]) {
        oval(ctx, dx * s + f * 0.6, -0.86 * s, 0.022 * s, dx ? 0.075 * s : 0.1 * s)
        paint(ctx, c.stripes)
      }
      for (const side of [-1, 1])
        for (const dy of [-0.5, -0.38]) {
          oval(ctx, side * 0.38 * s, dy * s, 0.09 * s, 0.022 * s)
          paint(ctx, c.stripes)
        }
    }
    ctx.restore()
  }

  if (c.ears === 'flop')
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 0.3 * s + f * 0.4, -0.78 * s)
      ctx.rotate(side * (-0.25 + Math.sin(t * 2 + side) * 0.03))
      oval(ctx, side * 0.03 * s, 0.14 * s, 0.1 * s, 0.2 * s)
      paint(ctx, c.earIn, lw)
      ctx.restore()
    }

  const armWide = species === 'chick' || species === 'penguin' ? 0.075 : 0.058
  arm(ctx, -1, -0.36 * s, -0.44 * s, p.armL ?? 0, 0.2 * s, armWide * s, c.limb, lw)
  arm(ctx, 1, 0.36 * s, -0.44 * s, p.armR ?? 0, 0.2 * s, armWide * s, c.limb, lw)

  const ey = PET.eyeY * s
  if (c.muzzle === 'monkey') {
    ctx.beginPath()
    ctx.ellipse(f - 0.13 * s, ey - 0.02 * s, 0.17 * s, 0.17 * s, 0, 0, TAU)
    ctx.ellipse(f + 0.13 * s, ey - 0.02 * s, 0.17 * s, 0.17 * s, 0, 0, TAU)
    paint(ctx, c.belly)
    oval(ctx, f, ey + 0.16 * s, 0.24 * s, 0.17 * s)
    paint(ctx, c.belly)
  }
  if (c.muzzle === 'dog') {
    oval(ctx, f - 0.15 * s, ey, 0.11 * s, 0.13 * s)
    paint(ctx, c.earIn)
    oval(ctx, f, ey + 0.15 * s, 0.17 * s, 0.13 * s)
    paint(ctx, '#fff')
  }
  cheeks(ctx, f * 0.7, ey + 0.11 * s, 0.27 * s, 0.065 * s)
  eyesAt(ctx, f, ey, 0.15 * s, 0.048 * s, eyes, t, lw)

  const my = ey + 0.11 * s
  if (c.muzzle === 'beak') {
    const open = mouth === 'open' ? 1 : mouth === 'sing' ? 0.5 + 0.5 * Math.sin(t * 11) : mouth === 'chew' ? 0.4 + 0.4 * Math.sin(t * 16) : mouth === 'o' ? 0.5 : 0
    const bw = 0.085 * s
    if (open > 0.05) {
      oval(ctx, f, my + 0.01 * s, bw * 0.8, bw * 0.75 * open)
      paint(ctx, '#8d3550')
    }
    for (const half of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(f - bw, my)
      ctx.quadraticCurveTo(f, my + half * (bw * 0.75 + open * bw * 0.9), f + bw, my)
      ctx.quadraticCurveTo(f, my + half * open * bw * 0.5, f - bw, my)
      ctx.closePath()
      paint(ctx, '#ff9a3d', lw * 0.8)
    }
  } else {
    const noseY = my - 0.01 * s
    if (c.muzzle === 'cat' || c.muzzle === 'bunny') {
      ctx.beginPath()
      ctx.moveTo(f - 0.03 * s, noseY - 0.02 * s)
      ctx.lineTo(f + 0.03 * s, noseY - 0.02 * s)
      ctx.lineTo(f, noseY + 0.02 * s)
      ctx.closePath()
      paint(ctx, '#ff7fa0', lw * 0.6)
      if (mouth === 'smile') {
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(f + side * 0.035 * s, noseY + 0.03 * s, 0.035 * s, 0.1 * Math.PI, 0.9 * Math.PI)
          ctx.lineWidth = lw * 0.9
          ctx.strokeStyle = INK
          ctx.stroke()
        }
        if (c.muzzle === 'bunny') {
          rr(ctx, f - 0.03 * s, noseY + 0.065 * s, 0.06 * s, 0.05 * s, 0.012 * s)
          paint(ctx, '#fff', lw * 0.7)
        }
      } else mouthAt(ctx, f, noseY + 0.03 * s, 0.1 * s, mouth, t, lw)
      if (c.muzzle === 'cat')
        for (const side of [-1, 1])
          for (const dy of [-0.012, 0.03])
            line(ctx, [f + side * 0.2 * s, noseY + dy * s, f + side * 0.34 * s, noseY + dy * 2.4 * s], lw * 0.7)
    } else if (c.muzzle === 'monkey') {
      for (const side of [-1, 1]) {
        oval(ctx, f + side * 0.025 * s, noseY + 0.02 * s, 0.01 * s, 0.014 * s)
        paint(ctx, INK)
      }
      mouthAt(ctx, f, noseY + 0.07 * s, 0.14 * s, mouth, t, lw)
    } else {
      oval(ctx, f, noseY + 0.005 * s, 0.045 * s, 0.035 * s)
      paint(ctx, INK)
      mouthAt(ctx, f, noseY + 0.05 * s, 0.11 * s, mouth, t, lw)
    }
  }
}

function banana(ctx: Ctx, s: number, lw: number, p: Pose, t: number): void {
  const f = (p.face ?? 0) * 0.05 * s
  ctx.save()
  ctx.translate(-0.15 * s, 0)
  // Legs with little shoes.
  for (const [i, x] of [0.06, 0.26].entries()) {
    const ph = p.walk === undefined ? 0 : Math.sin(p.walk + i * Math.PI)
    const fx = x * s + ph * 0.05 * s
    const fy = -0.03 * s - Math.max(0, ph) * 0.06 * s
    line(ctx, [x * s, -0.14 * s, fx, fy], lw * 1.6)
    oval(ctx, fx + 0.03 * s, fy, 0.085 * s, 0.05 * s)
    paint(ctx, '#ff6fb5', lw)
  }
  // Arms: thin sticks with round hands.
  for (const [side, x] of [
    [-1, -0.02],
    [1, 0.36],
  ]) {
    const a = (side < 0 ? p.armL : p.armR) ?? 0
    const ang = side < 0 ? armTurn(a, 0.5) : -armTurn(a, 0.5)
    const hx = x * s - Math.sin(ang) * 0.24 * s
    const hy = -0.5 * s + Math.cos(ang) * 0.24 * s
    line(ctx, [x * s, -0.5 * s, hx, hy], lw * 1.6)
    oval(ctx, hx, hy, 0.045 * s, 0.045 * s)
    paint(ctx, '#ffe14d', lw)
  }
  ctx.beginPath()
  ctx.moveTo(-0.1 * s, -0.98 * s)
  ctx.bezierCurveTo(0.44 * s, -0.96 * s, 0.52 * s, -0.16 * s, -0.02 * s, -0.08 * s)
  ctx.bezierCurveTo(-0.07 * s, -0.3 * s, -0.04 * s, -0.74 * s, -0.1 * s, -0.98 * s)
  ctx.closePath()
  paint(ctx, '#ffe14d', lw)
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo(0.06 * s, -0.95 * s)
  ctx.bezierCurveTo(0.34 * s, -0.8 * s, 0.4 * s, -0.3 * s, 0.1 * s, -0.1 * s)
  ctx.lineWidth = 0.035 * s
  ctx.strokeStyle = '#f5c62a'
  ctx.stroke()
  oval(ctx, -0.02 * s, -0.08 * s, 0.07 * s, 0.05 * s)
  paint(ctx, '#8a5a2b')
  ctx.restore()
  rr(ctx, -0.15 * s, -1.05 * s, 0.09 * s, 0.1 * s, 0.025 * s)
  paint(ctx, '#8a5a2b', lw)
  const ex = 0.17 * s + f
  const ey = -0.57 * s
  cheeks(ctx, ex, ey + 0.1 * s, 0.15 * s, 0.05 * s)
  eyesAt(ctx, ex, ey, 0.09 * s, 0.042 * s, p.eyes ?? 'open', t, lw)
  mouthAt(ctx, ex, ey + 0.08 * s, 0.11 * s, p.mouth ?? 'smile', t, lw)
  ctx.restore()
}

function mini(ctx: Ctx, s: number, lw: number, p: Pose, t: number): void {
  const f = (p.face ?? 0) * 0.04 * s
  for (const [i, x] of [-0.14, 0.14].entries()) {
    const ph = p.walk === undefined ? 0 : Math.sin(p.walk + i * Math.PI)
    const fx = x * s + ph * 0.05 * s
    const fy = -0.03 * s - Math.max(0, ph) * 0.06 * s
    line(ctx, [x * s, -0.12 * s, fx, fy], lw * 1.6)
    oval(ctx, fx, fy, 0.08 * s, 0.045 * s)
    paint(ctx, '#3db8ff', lw)
  }
  for (const side of [-1, 1]) {
    const a = (side < 0 ? p.armL : p.armR) ?? 0
    const ang = side < 0 ? armTurn(a, 0.5) : -armTurn(a, 0.5)
    const sx = side * 0.33 * s
    const hx = sx - Math.sin(ang) * 0.2 * s
    const hy = -0.42 * s + Math.cos(ang) * 0.2 * s
    line(ctx, [sx, -0.42 * s, hx, hy], lw * 1.6)
    oval(ctx, hx, hy, 0.05 * s, 0.05 * s)
    paint(ctx, '#3db8ff', lw)
  }
  // Antenna with a ball.
  line(ctx, [0.12 * s, -0.8 * s, 0.2 * s, -0.98 * s], lw * 2.6)
  line(ctx, [0.12 * s, -0.8 * s, 0.2 * s, -0.98 * s], lw * 1.2, '#3db8ff')
  oval(ctx, 0.2 * s, -1.0 * s, 0.045 * s, 0.045 * s)
  paint(ctx, t % 1.2 < 0.6 ? '#ffd23d' : '#fff3b0', lw)
  // Egg shell.
  ctx.beginPath()
  ctx.moveTo(0, -0.88 * s)
  ctx.bezierCurveTo(0.3 * s, -0.88 * s, 0.4 * s, -0.5 * s, 0.38 * s, -0.36 * s)
  ctx.bezierCurveTo(0.36 * s, -0.14 * s, 0.2 * s, -0.08 * s, 0, -0.08 * s)
  ctx.bezierCurveTo(-0.2 * s, -0.08 * s, -0.36 * s, -0.14 * s, -0.38 * s, -0.36 * s)
  ctx.bezierCurveTo(-0.4 * s, -0.5 * s, -0.3 * s, -0.88 * s, 0, -0.88 * s)
  ctx.closePath()
  paint(ctx, '#ff8fc7', lw)
  oval(ctx, -0.18 * s, -0.72 * s, 0.07 * s, 0.035 * s, -0.6)
  paint(ctx, 'rgba(255,255,255,0.6)')
  rr(ctx, -0.24 * s, -0.7 * s, 0.48 * s, 0.36 * s, 0.09 * s)
  paint(ctx, '#e3f7d3', lw)
  for (const dx of [-0.11, 0, 0.11]) {
    oval(ctx, dx * s, -0.2 * s, 0.03 * s, 0.03 * s)
    paint(ctx, dx ? '#fff' : '#ffd23d', lw * 0.7)
  }
  // Pixel face on the little screen.
  const u = 0.034 * s
  const px = (cx: number, cy: number, w = 1, h = 1): void => ctx.fillRect(f + cx * u - (w * u) / 2, -0.53 * s + cy * u - (h * u) / 2, w * u, h * u)
  ctx.fillStyle = '#3d5a45'
  const eyes = p.eyes ?? 'open'
  const blink = eyes === 'open' && (t + 1.3) % 3.1 < 0.12
  for (const side of [-1, 1]) {
    const ex = side * 3
    if (eyes === 'closed' || blink) px(ex, -0.5, 2, 0.6)
    else if (eyes === 'happy') {
      px(ex - 0.7, -0.4)
      px(ex, -1.2)
      px(ex + 0.7, -0.4)
    } else if (eyes === 'heart') {
      ctx.fillStyle = '#e8457a'
      px(ex - 0.5, -1.2)
      px(ex + 0.5, -1.2)
      px(ex, -0.5, 2, 1)
      px(ex, 0.4)
      ctx.fillStyle = '#3d5a45'
    } else px(ex, -0.6, eyes === 'wide' ? 1.6 : 1.2, eyes === 'wide' ? 2 : 1.6)
  }
  const mouth = p.mouth ?? 'smile'
  const open = mouth === 'open' || mouth === 'o' || (mouth === 'sing' && Math.sin(t * 11) > 0) || (mouth === 'chew' && Math.sin(t * 16) > 0)
  if (open) px(0, 2.2, 2, 1.8)
  else if (mouth === 'sad') {
    px(0, 1.9, 2, 0.7)
    px(-1.4, 2.5, 0.8, 0.7)
    px(1.4, 2.5, 0.8, 0.7)
  } else {
    px(0, 2.5, 2, 0.7)
    px(-1.4, 1.9, 0.8, 0.7)
    px(1.4, 1.9, 0.8, 0.7)
  }
}

function hairFill(ctx: Ctx, color: number, w: number): string | CanvasGradient {
  const c = HAIR_COLORS[color] ?? HAIR_COLORS[0]
  if (c !== 'rainbow') return c
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
  ;['#f0506e', '#ff9a3d', '#ffd23d', '#44cf8a', '#3db8ff', '#a66bff'].forEach((col, i) => g.addColorStop(i / 5, col))
  return g
}

/** Hair on top of a head `w` wide; (x, y) is the crown of the head. */
export function drawHair(ctx: Ctx, hair: HairId, color: number, x: number, y: number, w: number, lw: number): void {
  if (hair === 'none') return
  const fill = hairFill(ctx, color, w)
  ctx.save()
  ctx.translate(x, y)
  const strand = (pts: number[], width: number): void => {
    ctx.beginPath()
    ctx.moveTo(pts[0] * w, pts[1] * w)
    ctx.quadraticCurveTo(pts[2] * w, pts[3] * w, pts[4] * w, pts[5] * w)
    ctx.lineCap = 'round'
    ctx.lineWidth = width * w + lw * 2
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = width * w
    ctx.strokeStyle = fill
    ctx.stroke()
  }
  if (hair === 'tuft') {
    strand([0, 0.03, -0.08, -0.1, -0.16, -0.18], 0.05)
    strand([0, 0.03, 0.08, -0.1, 0.16, -0.18], 0.05)
    strand([0, 0.03, 0.01, -0.12, 0, -0.24], 0.05)
  } else if (hair === 'curl') {
    ctx.beginPath()
    ctx.moveTo(0, 0.03 * w)
    ctx.bezierCurveTo(-0.04 * w, -0.3 * w, 0.26 * w, -0.32 * w, 0.2 * w, -0.14 * w)
    ctx.bezierCurveTo(0.17 * w, -0.05 * w, 0.06 * w, -0.1 * w, 0.11 * w, -0.17 * w)
    ctx.lineCap = 'round'
    ctx.lineWidth = 0.06 * w + lw * 2
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 0.06 * w
    ctx.strokeStyle = fill
    ctx.stroke()
  } else if (hair === 'palm') {
    for (const [dx, dy] of [
      [-0.26, -0.12],
      [-0.15, -0.3],
      [0, -0.36],
      [0.15, -0.3],
      [0.26, -0.12],
    ])
      strand([0, -0.08, dx * 0.6, dy * 1.1, dx, dy], 0.06)
    rr(ctx, -0.05 * w, -0.12 * w, 0.1 * w, 0.14 * w, 0.03 * w)
    paint(ctx, '#ff6fb5', lw)
  } else if (hair === 'mohawk') {
    ctx.beginPath()
    ctx.moveTo(-0.24 * w, 0.06 * w)
    for (let i = 0; i < 5; i++) {
      const px = (-0.24 + (i + 0.5) * 0.096) * w
      ctx.lineTo(px, (-0.2 - Math.sin(((i + 0.5) / 5) * Math.PI) * 0.16) * w)
      ctx.lineTo((-0.24 + (i + 1) * 0.096) * w, (i === 4 ? 0.06 : -0.03) * w)
    }
    ctx.closePath()
    paint(ctx, fill, lw)
  } else if (hair === 'bun') {
    oval(ctx, 0, -0.13 * w, 0.16 * w, 0.15 * w)
    paint(ctx, fill, lw)
    rr(ctx, -0.1 * w, -0.03 * w, 0.2 * w, 0.06 * w, 0.03 * w)
    paint(ctx, '#ff6fb5', lw * 0.8)
  } else if (hair === 'pigtails') {
    for (const side of [-1, 1]) {
      oval(ctx, side * 0.4 * w, 0.02 * w, 0.14 * w, 0.15 * w)
      paint(ctx, fill, lw)
      oval(ctx, side * 0.29 * w, 0.08 * w, 0.045 * w, 0.045 * w)
      paint(ctx, '#ff6fb5', lw * 0.8)
    }
  } else if (hair === 'fringe') {
    ctx.beginPath()
    ctx.moveTo(-0.34 * w, 0.14 * w)
    ctx.quadraticCurveTo(-0.26 * w, -0.08 * w, 0, -0.07 * w)
    ctx.quadraticCurveTo(0.26 * w, -0.08 * w, 0.34 * w, 0.14 * w)
    ctx.lineTo(0.22 * w, 0.07 * w)
    ctx.lineTo(0.12 * w, 0.16 * w)
    ctx.lineTo(0, 0.07 * w)
    ctx.lineTo(-0.12 * w, 0.16 * w)
    ctx.lineTo(-0.22 * w, 0.07 * w)
    ctx.closePath()
    paint(ctx, fill, lw)
  } else if (hair === 'braids') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        oval(ctx, side * (0.46 + i * 0.03) * w, (0.14 + i * 0.15) * w, 0.075 * w, 0.085 * w)
        paint(ctx, fill, lw)
      }
      oval(ctx, side * 0.53 * w, 0.56 * w, 0.045 * w, 0.045 * w)
      paint(ctx, '#ff6fb5', lw * 0.8)
    }
    ctx.beginPath()
    ctx.moveTo(-0.34 * w, 0.12 * w)
    ctx.quadraticCurveTo(0, -0.18 * w, 0.34 * w, 0.12 * w)
    ctx.quadraticCurveTo(0, -0.02 * w, -0.34 * w, 0.12 * w)
    ctx.closePath()
    paint(ctx, fill, lw)
  } else if (hair === 'curls') {
    for (const [dx, dy, r] of [
      [-0.24, 0.02, 0.1],
      [0.24, 0.02, 0.1],
      [-0.13, -0.09, 0.11],
      [0.13, -0.09, 0.11],
      [0, -0.14, 0.12],
    ]) {
      oval(ctx, dx * w, dy * w, r * w, r * w)
      paint(ctx, fill, lw)
    }
  }
  ctx.restore()
}

const WIRE_CACHE = new Map<string, Pt[]>()
/** The bent-wire shapes, as a dense line inside a -1..1 box. Start to end is how a child traces them. */
export function wirePath(shape: WireShape): Pt[] {
  const cached = WIRE_CACHE.get(shape)
  if (cached) return cached
  const pts: Pt[] = []
  const add = (x: number, y: number): void => void pts.push({ x, y })
  if (shape === 'bow') {
    add(-0.5, 0.85)
    add(-0.25, 0.4)
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU
      add(-0.5 + Math.cos(a) * 0.5, -0.1 - Math.sin(a) * 0.48 * (1 - 0.3 * Math.cos(a)))
    }
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI - (i / 28) * TAU
      add(0.5 + Math.cos(a) * 0.5, -0.1 - Math.sin(a) * 0.48 * (1 + 0.3 * Math.cos(a)))
    }
    add(0.25, 0.4)
    add(0.5, 0.85)
  } else if (shape === 'heart') {
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * TAU + Math.PI
      add((16 * Math.sin(a) ** 3) / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 - 0.1)
    }
  } else if (shape === 'star') {
    for (let i = 0; i <= 10; i++) {
      const r = i % 2 ? 0.45 : 1
      const a = (i / 10) * TAU - Math.PI / 2
      add(Math.cos(a) * r, Math.sin(a) * r + 0.06)
    }
  } else if (shape === 'flower') {
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * TAU - Math.PI / 2
      const r = 0.42 + 0.56 * Math.abs(Math.cos(2.5 * (a + Math.PI / 2)))
      add(Math.cos(a) * r, Math.sin(a) * r)
    }
  } else if (shape === 'butterfly') {
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * TAU + Math.PI / 2
      const r = 0.2 + 0.8 * Math.abs(Math.sin(2 * a))
      add(Math.cos(a) * r * 1.1, -Math.sin(a) * r * (Math.sin(a) > 0 ? 1.05 : 0.8) + 0.1)
    }
  } else if (shape === 'crown') {
    for (const [x, y] of [
      [-0.9, 0.6],
      [-1, -0.5],
      [-0.5, 0.05],
      [0, -0.8],
      [0.5, 0.05],
      [1, -0.5],
      [0.9, 0.6],
      [-0.9, 0.6],
    ])
      add(x, y)
  } else {
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * TAU
      add(-0.56 + Math.cos(a) * 0.4, Math.sin(a) * 0.4)
    }
    add(-0.16, -0.06)
    add(0.16, -0.06)
    for (let i = 0; i <= 30; i++) {
      const a = Math.PI + (i / 30) * TAU
      add(0.56 + Math.cos(a) * 0.4, Math.sin(a) * 0.4)
    }
  }
  // Resample evenly so tracing speed is uniform.
  const out: Pt[] = [pts[0]]
  const step = 0.05
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    let at = step - carry
    while (at <= d) {
      out.push({ x: a.x + ((b.x - a.x) * at) / d, y: a.y + ((b.y - a.y) * at) / d })
      at += step
    }
    carry = d - (at - step)
  }
  out.push(pts[pts.length - 1])
  WIRE_CACHE.set(shape, out)
  return out
}

/** Fuzzy craft wire bent into `shape`, centred at (x, y), about `size` wide. `progress` 0..1 draws part of it. */
export function drawWire(ctx: Ctx, shape: WireShape, color: number, x: number, y: number, size: number, progress = 1): void {
  const pts = wirePath(shape)
  const n = Math.max(2, Math.round(pts.length * progress))
  const k = size / 2
  const col = WIRE_COLORS[color % WIRE_COLORS.length]
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  for (let i = 0; i < n; i++) ctx.lineTo(pts[i].x * k, pts[i].y * k)
  const w = Math.max(3, size * 0.085)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = w + Math.max(2, size * 0.035)
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = w
  ctx.strokeStyle = col
  ctx.stroke()
  // Fluff: short light dashes along the wire.
  ctx.setLineDash([w * 0.18, w * 0.55])
  ctx.lineWidth = w * 0.7
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

const GIFT_SLOT: Record<string, 'head' | 'face' | 'neck'> = {
  crown: 'head',
  cap: 'head',
  tophat: 'head',
  party: 'head',
  wreath: 'head',
  sunglasses: 'face',
  starglasses: 'face',
  scarf: 'neck',
  bowtie: 'neck',
  medal: 'neck',
  beads: 'neck',
}
/** Which slot an accessory goes to, or null when it is not something to wear. */
export function slotOf(id: string): 'head' | 'face' | 'neck' | null {
  const [kind, name] = id.split(':')
  if (kind === 'w') return name === 'glasses' ? 'face' : 'head'
  return GIFT_SLOT[name] ?? null
}

/**
 * Draw a wearable at its anchor: the crown of the head for hats, between the
 * eyes for glasses, the neck for scarves. `w` is the head width.
 */
export function drawAccessory(ctx: Ctx, id: string, x: number, y: number, w: number): void {
  const [kind, name, col] = id.split(':')
  const lw = Math.max(1.5, w * 0.04)
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'w') {
    const shape = name as WireShape
    if (shape === 'glasses') drawWire(ctx, shape, +col, 0, 0, w * 0.82)
    else if (shape === 'crown') drawWire(ctx, shape, +col, 0, -w * 0.12, w * 0.5)
    else {
      ctx.rotate(0.3)
      drawWire(ctx, shape, +col, w * 0.24, -w * 0.02, w * 0.42)
    }
  } else if (name === 'crown') {
    ctx.beginPath()
    ctx.moveTo(-0.22 * w, 0.03 * w)
    ctx.lineTo(-0.26 * w, -0.22 * w)
    ctx.lineTo(-0.12 * w, -0.1 * w)
    ctx.lineTo(0, -0.28 * w)
    ctx.lineTo(0.12 * w, -0.1 * w)
    ctx.lineTo(0.26 * w, -0.22 * w)
    ctx.lineTo(0.22 * w, 0.03 * w)
    ctx.closePath()
    paint(ctx, '#ffd23d', lw)
    for (const [dx, c] of [
      [-0.12, '#f0506e'],
      [0, '#3db8ff'],
      [0.12, '#44cf8a'],
    ] as const) {
      oval(ctx, dx * w, -0.03 * w, 0.03 * w, 0.03 * w)
      paint(ctx, c, lw * 0.6)
    }
  } else if (name === 'cap') {
    ctx.beginPath()
    ctx.arc(0, 0.05 * w, 0.3 * w, Math.PI, 0)
    ctx.closePath()
    paint(ctx, '#3db8ff', lw)
    rr(ctx, 0.08 * w, -0.01 * w, 0.4 * w, 0.07 * w, 0.035 * w)
    paint(ctx, '#f0506e', lw)
    oval(ctx, 0, -0.25 * w, 0.035 * w, 0.03 * w)
    paint(ctx, '#ffd23d', lw * 0.7)
  } else if (name === 'tophat') {
    rr(ctx, -0.17 * w, -0.4 * w, 0.34 * w, 0.4 * w, 0.03 * w)
    paint(ctx, '#4a3a6a', lw)
    ctx.fillStyle = '#ff6fb5'
    ctx.fillRect(-0.17 * w + lw / 2, -0.12 * w, 0.34 * w - lw, 0.07 * w)
    rr(ctx, -0.3 * w, -0.02 * w, 0.6 * w, 0.07 * w, 0.035 * w)
    paint(ctx, '#4a3a6a', lw)
  } else if (name === 'party') {
    ctx.beginPath()
    ctx.moveTo(-0.18 * w, 0.04 * w)
    ctx.lineTo(0, -0.42 * w)
    ctx.lineTo(0.18 * w, 0.04 * w)
    ctx.closePath()
    paint(ctx, '#a66bff', lw)
    ctx.save()
    ctx.clip()
    for (let i = 0; i < 3; i++) line(ctx, [-0.3 * w, (-0.02 - i * 0.14) * w, 0.3 * w, (-0.12 - i * 0.14) * w], 0.045 * w, '#ffd23d')
    ctx.restore()
    oval(ctx, 0, -0.44 * w, 0.06 * w, 0.06 * w)
    paint(ctx, '#ff6fb5', lw)
  } else if (name === 'wreath') {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + ((i + 0.5) / 5) * Math.PI
      const fx = Math.cos(a) * 0.3 * w
      const fy = Math.sin(a) * 0.12 * w + 0.03 * w
      for (let k = 0; k < 5; k++) {
        oval(ctx, fx + Math.cos((k / 5) * TAU) * 0.045 * w, fy + Math.sin((k / 5) * TAU) * 0.045 * w, 0.04 * w, 0.04 * w)
        paint(ctx, ['#ff6fb5', '#fff', '#ffd23d', '#fff', '#a66bff'][i], lw * 0.5)
      }
      oval(ctx, fx, fy, 0.03 * w, 0.03 * w)
      paint(ctx, '#ff9a3d')
    }
  } else if (name === 'sunglasses' || name === 'starglasses') {
    line(ctx, [-0.34 * w, -0.01 * w, 0.34 * w, -0.01 * w], lw * 1.4)
    for (const side of [-1, 1]) {
      if (name === 'sunglasses') {
        rr(ctx, side * 0.19 * w - 0.13 * w, -0.08 * w, 0.26 * w, 0.18 * w, 0.07 * w)
        paint(ctx, '#3b2a4a', lw)
        line(ctx, [side * 0.19 * w - 0.06 * w, -0.03 * w, side * 0.19 * w - 0.01 * w, -0.05 * w], lw, '#fff')
      } else {
        starPath(ctx, side * 0.19 * w, 0, 0.32 * w, 5, 0.55)
        paint(ctx, '#ff8fc7', lw)
      }
    }
  } else if (name === 'scarf') {
    rr(ctx, -0.36 * w, -0.06 * w, 0.72 * w, 0.14 * w, 0.07 * w)
    paint(ctx, '#f0506e', lw)
    rr(ctx, 0.1 * w, 0.02 * w, 0.13 * w, 0.3 * w, 0.04 * w)
    paint(ctx, '#f0506e', lw)
    for (const dx of [-0.2, 0, 0.2]) line(ctx, [dx * w, -0.04 * w, dx * w, 0.06 * w], 0.04 * w, '#fff')
  } else if (name === 'bowtie') {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(side * 0.2 * w, -0.1 * w)
      ctx.lineTo(side * 0.2 * w, 0.1 * w)
      ctx.closePath()
      paint(ctx, '#a66bff', lw)
    }
    oval(ctx, 0, 0, 0.05 * w, 0.05 * w)
    paint(ctx, '#ffd23d', lw)
  } else if (name === 'medal') {
    line(ctx, [-0.2 * w, -0.08 * w, 0, 0.14 * w, 0.2 * w, -0.08 * w], 0.06 * w + lw * 2)
    line(ctx, [-0.2 * w, -0.08 * w, 0, 0.14 * w, 0.2 * w, -0.08 * w], 0.06 * w, '#3db8ff')
    oval(ctx, 0, 0.2 * w, 0.1 * w, 0.1 * w)
    paint(ctx, '#ffd23d', lw)
    starPath(ctx, 0, 0.2 * w, 0.11 * w)
    paint(ctx, '#ff9a3d')
  } else if (name === 'beads') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (i / 6) * 0.76)
      oval(ctx, Math.cos(a) * 0.3 * w, Math.sin(a) * 0.16 * w - 0.06 * w, 0.045 * w, 0.045 * w)
      paint(ctx, i % 2 ? '#fff' : '#ff8fc7', lw * 0.7)
    }
  }
  ctx.restore()
}
