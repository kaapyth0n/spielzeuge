/**
 * Тамагочи Связь — things: food, poop, the ball, gifts and room decorations.
 * All icons are drawn around (0, 0) inside a box `s` wide.
 */
import { INK, TAU, WIRE_SHAPES, heart, line, oval, paint, rr, star, starPath, type Ctx, type SpeciesId, type WireShape } from './tamagochi-kit.ts'
import { drawAccessory, drawWire, slotOf } from './tamagochi-pets.ts'

export type GiftKind = 'wear' | 'toy' | 'decor'
/** Every gift, in the order they are usually found. */
export const GIFTS: { id: string; kind: GiftKind }[] = [
  { id: 'ball', kind: 'toy' },
  { id: 'crown', kind: 'wear' },
  { id: 'plant', kind: 'decor' },
  { id: 'teddy', kind: 'toy' },
  { id: 'sunglasses', kind: 'wear' },
  { id: 'picture', kind: 'decor' },
  { id: 'scarf', kind: 'wear' },
  { id: 'balloon', kind: 'toy' },
  { id: 'party', kind: 'wear' },
  { id: 'rug', kind: 'decor' },
  { id: 'duck', kind: 'toy' },
  { id: 'bowtie', kind: 'wear' },
  { id: 'lamp', kind: 'decor' },
  { id: 'cap', kind: 'wear' },
  { id: 'cubes', kind: 'toy' },
  { id: 'garland', kind: 'decor' },
  { id: 'starglasses', kind: 'wear' },
  { id: 'spinner', kind: 'toy' },
  { id: 'beads', kind: 'wear' },
  { id: 'clock', kind: 'decor' },
  { id: 'car', kind: 'toy' },
  { id: 'wreath', kind: 'wear' },
  { id: 'tophat', kind: 'wear' },
  { id: 'medal', kind: 'wear' },
]
export const giftKind = (id: string): GiftKind | null => GIFTS.find((g) => `g:${g.id}` === id)?.kind ?? null

const lwOf = (s: number): number => Math.max(1.5, s * 0.045)

export function drawPoop(ctx: Ctx, x: number, y: number, s: number, t = 0): void {
  const lw = lwOf(s)
  ctx.save()
  ctx.translate(x, y)
  const wob = 1 + Math.sin(t * 4) * 0.03
  ctx.scale(wob, 2 - wob)
  for (const [w, h, dy] of [
    [0.5, 0.2, -0.16],
    [0.36, 0.18, -0.36],
    [0.2, 0.15, -0.54],
  ]) {
    oval(ctx, 0, dy * s, w * s, h * s)
    paint(ctx, '#a8703f', lw)
  }
  ctx.beginPath()
  ctx.moveTo(-0.04 * s, -0.66 * s)
  ctx.quadraticCurveTo(0.1 * s, -0.86 * s, 0.14 * s, -0.7 * s)
  ctx.lineWidth = lw
  ctx.stroke()
  for (const side of [-1, 1]) {
    oval(ctx, side * 0.14 * s, -0.24 * s, 0.05 * s, 0.06 * s)
    paint(ctx, '#fff', lw * 0.6)
    oval(ctx, side * 0.14 * s, -0.23 * s, 0.022 * s, 0.03 * s)
    paint(ctx, INK)
  }
  ctx.beginPath()
  ctx.arc(0, -0.14 * s, 0.07 * s, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.lineWidth = lw * 0.8
  ctx.stroke()
  ctx.restore()
}

export function drawBall(ctx: Ctx, x: number, y: number, s: number, rot = 0): void {
  const lw = lwOf(s)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  oval(ctx, 0, 0, s / 2, s / 2)
  paint(ctx, '#fff', lw)
  ctx.save()
  ctx.clip()
  const cols = ['#f0506e', '#ffd23d', '#3db8ff', '#5fd07f']
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, s, (i / 4) * TAU, ((i + 0.5) / 4) * TAU)
    ctx.closePath()
    paint(ctx, cols[i])
  }
  ctx.restore()
  oval(ctx, 0, 0, s / 2, s / 2)
  paint(ctx, null, lw)
  oval(ctx, 0, 0, s * 0.1, s * 0.1)
  paint(ctx, '#fff', lw * 0.7)
  ctx.restore()
}

/** What each pet eats; the banana "drinks" sunshine and the mini-tamagotchi a battery. */
export function drawFood(ctx: Ctx, species: SpeciesId, x: number, y: number, s: number): void {
  const lw = lwOf(s)
  ctx.save()
  ctx.translate(x, y)
  if (species === 'chick') {
    // A wriggly worm on a leaf.
    oval(ctx, 0, 0.12 * s, 0.42 * s, 0.16 * s)
    paint(ctx, '#7fd67a', lw)
    ctx.beginPath()
    ctx.moveTo(-0.26 * s, 0.02 * s)
    ctx.bezierCurveTo(-0.14 * s, -0.36 * s, 0.02 * s, 0.2 * s, 0.24 * s, -0.16 * s)
    ctx.lineCap = 'round'
    ctx.lineWidth = 0.15 * s + lw * 2
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 0.15 * s
    ctx.strokeStyle = '#ff9fb5'
    ctx.stroke()
    oval(ctx, 0.25 * s, -0.19 * s, 0.02 * s, 0.02 * s)
    paint(ctx, INK)
  } else if (species === 'kitten' || species === 'penguin') {
    ctx.beginPath()
    ctx.moveTo(-0.42 * s, 0)
    ctx.quadraticCurveTo(-0.1 * s, -0.3 * s, 0.22 * s, 0)
    ctx.lineTo(0.44 * s, -0.2 * s)
    ctx.lineTo(0.44 * s, 0.2 * s)
    ctx.lineTo(0.22 * s, 0)
    ctx.quadraticCurveTo(-0.1 * s, 0.3 * s, -0.42 * s, 0)
    ctx.closePath()
    paint(ctx, '#7cc8ff', lw)
    oval(ctx, -0.24 * s, -0.04 * s, 0.035 * s, 0.035 * s)
    paint(ctx, INK)
    line(ctx, [-0.06 * s, -0.1 * s, -0.02 * s, 0, -0.06 * s, 0.1 * s], lw * 0.8)
  } else if (species === 'monkey') {
    // A coconut with a straw.
    oval(ctx, 0, 0.04 * s, 0.36 * s, 0.34 * s)
    paint(ctx, '#9a6a44', lw)
    oval(ctx, 0, -0.14 * s, 0.24 * s, 0.1 * s)
    paint(ctx, '#fff8e8', lw * 0.8)
    line(ctx, [0.04 * s, -0.14 * s, 0.22 * s, -0.5 * s], lw * 2.4)
    line(ctx, [0.04 * s, -0.14 * s, 0.22 * s, -0.5 * s], lw * 1.1, '#f0506e')
  } else if (species === 'banana') {
    // A little sun.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU
      line(ctx, [Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s, Math.cos(a) * 0.45 * s, Math.sin(a) * 0.45 * s], lw * 1.8, '#ff9a3d')
    }
    oval(ctx, 0, 0, 0.26 * s, 0.26 * s)
    paint(ctx, '#ffd23d', lw)
    for (const side of [-1, 1]) {
      oval(ctx, side * 0.09 * s, -0.03 * s, 0.025 * s, 0.03 * s)
      paint(ctx, INK)
    }
    ctx.beginPath()
    ctx.arc(0, 0.02 * s, 0.1 * s, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.lineWidth = lw * 0.8
    ctx.stroke()
  } else if (species === 'mini') {
    rr(ctx, -0.36 * s, -0.2 * s, 0.66 * s, 0.4 * s, 0.08 * s)
    paint(ctx, '#5fe0b0', lw)
    rr(ctx, 0.3 * s, -0.09 * s, 0.1 * s, 0.18 * s, 0.03 * s)
    paint(ctx, '#d8d8e8', lw)
    ctx.beginPath()
    ctx.moveTo(0.02 * s, -0.16 * s)
    ctx.lineTo(-0.14 * s, 0.03 * s)
    ctx.lineTo(-0.03 * s, 0.03 * s)
    ctx.lineTo(-0.08 * s, 0.16 * s)
    ctx.lineTo(0.1 * s, -0.04 * s)
    ctx.lineTo(-0.01 * s, -0.04 * s)
    ctx.closePath()
    paint(ctx, '#ffd23d', lw * 0.8)
  } else if (species === 'bunny') {
    ctx.beginPath()
    ctx.moveTo(-0.14 * s, -0.16 * s)
    ctx.quadraticCurveTo(0.2 * s, -0.24 * s, 0.2 * s, -0.06 * s)
    ctx.quadraticCurveTo(0.14 * s, 0.14 * s, -0.3 * s, 0.4 * s)
    ctx.quadraticCurveTo(-0.3 * s, 0.06 * s, -0.14 * s, -0.16 * s)
    ctx.closePath()
    paint(ctx, '#ff9a3d', lw)
    for (const a of [-0.9, -0.4, 0.1]) line(ctx, [0.1 * s, -0.16 * s, 0.1 * s + Math.cos(a) * 0.3 * s, -0.16 * s + Math.sin(a) * 0.3 * s], lw * 2, '#5fd07f')
  } else {
    // A bone for the puppy.
    rr(ctx, -0.3 * s, -0.07 * s, 0.6 * s, 0.14 * s, 0.05 * s)
    paint(ctx, '#fff8e8', lw)
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        oval(ctx, sx * 0.32 * s, sy * 0.09 * s, 0.1 * s, 0.1 * s)
        paint(ctx, '#fff8e8', lw)
      }
    ctx.fillStyle = '#fff8e8'
    ctx.fillRect(-0.3 * s, -0.07 * s + lw / 2, 0.6 * s, 0.14 * s - lw)
  }
  ctx.restore()
}

export function drawGiftBox(ctx: Ctx, x: number, y: number, s: number, color = '#ff6fb5', ribbon = '#ffd23d', lid = 0): void {
  const lw = lwOf(s)
  ctx.save()
  ctx.translate(x, y)
  rr(ctx, -0.36 * s, -0.14 * s, 0.72 * s, 0.56 * s, 0.06 * s)
  paint(ctx, color, lw)
  ctx.fillStyle = ribbon
  ctx.fillRect(-0.07 * s, -0.14 * s + lw / 2, 0.14 * s, 0.56 * s - lw)
  ctx.save()
  ctx.translate(0, -0.2 * s - lid * 0.5 * s)
  ctx.rotate(lid * 0.5)
  rr(ctx, -0.42 * s, -0.1 * s, 0.84 * s, 0.2 * s, 0.06 * s)
  paint(ctx, color, lw)
  ctx.fillStyle = ribbon
  ctx.fillRect(-0.07 * s, -0.1 * s + lw / 2, 0.14 * s, 0.2 * s - lw)
  for (const side of [-1, 1]) {
    oval(ctx, side * 0.14 * s, -0.2 * s, 0.14 * s, 0.1 * s, side * -0.5)
    paint(ctx, ribbon, lw)
  }
  oval(ctx, 0, -0.14 * s, 0.06 * s, 0.06 * s)
  paint(ctx, ribbon, lw)
  ctx.restore()
  ctx.restore()
}

/** Toys and decorations, by gift name. Returns false when the name is not a prop. */
function prop(ctx: Ctx, name: string, s: number): boolean {
  const lw = lwOf(s)
  switch (name) {
    case 'ball':
      drawBall(ctx, 0, 0, s * 0.8, 0.4)
      return true
    case 'teddy': {
      for (const side of [-1, 1]) {
        oval(ctx, side * 0.24 * s, -0.34 * s, 0.11 * s, 0.11 * s)
        paint(ctx, '#c68a55', lw)
        oval(ctx, side * 0.26 * s, 0.34 * s, 0.13 * s, 0.1 * s)
        paint(ctx, '#c68a55', lw)
      }
      oval(ctx, 0, 0.16 * s, 0.28 * s, 0.26 * s)
      paint(ctx, '#c68a55', lw)
      oval(ctx, 0, -0.16 * s, 0.26 * s, 0.24 * s)
      paint(ctx, '#c68a55', lw)
      oval(ctx, 0, -0.08 * s, 0.11 * s, 0.09 * s)
      paint(ctx, '#f6dcb8')
      oval(ctx, 0, -0.11 * s, 0.035 * s, 0.028 * s)
      paint(ctx, INK)
      for (const side of [-1, 1]) {
        oval(ctx, side * 0.1 * s, -0.22 * s, 0.025 * s, 0.03 * s)
        paint(ctx, INK)
      }
      return true
    }
    case 'balloon':
      line(ctx, [0, 0.12 * s, 0.05 * s, 0.3 * s, -0.03 * s, 0.48 * s], lw * 0.8)
      oval(ctx, 0, -0.14 * s, 0.26 * s, 0.31 * s)
      paint(ctx, '#f0506e', lw)
      oval(ctx, -0.09 * s, -0.26 * s, 0.05 * s, 0.09 * s, 0.5)
      paint(ctx, 'rgba(255,255,255,.6)')
      return true
    case 'duck':
      oval(ctx, 0.02 * s, 0.14 * s, 0.34 * s, 0.22 * s)
      paint(ctx, '#ffd23d', lw)
      oval(ctx, -0.14 * s, -0.16 * s, 0.2 * s, 0.19 * s)
      paint(ctx, '#ffd23d', lw)
      rr(ctx, -0.46 * s, -0.16 * s, 0.18 * s, 0.09 * s, 0.04 * s)
      paint(ctx, '#ff9a3d', lw)
      oval(ctx, -0.17 * s, -0.2 * s, 0.03 * s, 0.035 * s)
      paint(ctx, INK)
      return true
    case 'cubes':
      for (const [x, y, c] of [
        [-0.38, 0.02, '#3db8ff'],
        [0.02, 0.02, '#f0506e'],
        [-0.18, -0.36, '#ffd23d'],
      ] as const) {
        rr(ctx, x * s, y * s, 0.38 * s, 0.38 * s, 0.06 * s)
        paint(ctx, c, lw)
      }
      return true
    case 'spinner':
      line(ctx, [0, -0.44 * s, 0, -0.2 * s], lw * 2.2)
      ctx.beginPath()
      ctx.moveTo(-0.38 * s, -0.1 * s)
      ctx.quadraticCurveTo(0, -0.34 * s, 0.38 * s, -0.1 * s)
      ctx.quadraticCurveTo(0.2 * s, 0.3 * s, 0, 0.44 * s)
      ctx.quadraticCurveTo(-0.2 * s, 0.3 * s, -0.38 * s, -0.1 * s)
      ctx.closePath()
      paint(ctx, '#a66bff', lw)
      line(ctx, [-0.33 * s, 0, 0.33 * s, 0], 0.08 * s, '#ffd23d')
      return true
    case 'car':
      rr(ctx, -0.42 * s, -0.04 * s, 0.84 * s, 0.26 * s, 0.1 * s)
      paint(ctx, '#3db8ff', lw)
      rr(ctx, -0.2 * s, -0.26 * s, 0.4 * s, 0.26 * s, 0.1 * s)
      paint(ctx, '#bfe9ff', lw)
      for (const side of [-1, 1]) {
        oval(ctx, side * 0.24 * s, 0.24 * s, 0.11 * s, 0.11 * s)
        paint(ctx, INK)
        oval(ctx, side * 0.24 * s, 0.24 * s, 0.04 * s, 0.04 * s)
        paint(ctx, '#fff')
      }
      return true
    case 'plant':
      for (const [a, c] of [
        [-0.7, '#44cf8a'],
        [0, '#5fd07f'],
        [0.7, '#44cf8a'],
      ] as const) {
        ctx.save()
        ctx.rotate(a)
        oval(ctx, 0, -0.22 * s, 0.12 * s, 0.3 * s)
        paint(ctx, c, lw)
        ctx.restore()
      }
      ctx.beginPath()
      ctx.moveTo(-0.24 * s, 0.04 * s)
      ctx.lineTo(0.24 * s, 0.04 * s)
      ctx.lineTo(0.17 * s, 0.44 * s)
      ctx.lineTo(-0.17 * s, 0.44 * s)
      ctx.closePath()
      paint(ctx, '#ff9a3d', lw)
      return true
    case 'lamp':
      line(ctx, [0, -0.1 * s, 0, 0.4 * s], lw * 2.4)
      oval(ctx, 0, 0.42 * s, 0.2 * s, 0.05 * s)
      paint(ctx, INK)
      ctx.beginPath()
      ctx.moveTo(-0.14 * s, -0.44 * s)
      ctx.lineTo(0.14 * s, -0.44 * s)
      ctx.lineTo(0.28 * s, -0.06 * s)
      ctx.lineTo(-0.28 * s, -0.06 * s)
      ctx.closePath()
      paint(ctx, '#ffe27a', lw)
      return true
    case 'picture':
      rr(ctx, -0.4 * s, -0.32 * s, 0.8 * s, 0.64 * s, 0.05 * s)
      paint(ctx, '#ffd9a0', lw)
      rr(ctx, -0.31 * s, -0.23 * s, 0.62 * s, 0.46 * s, 0.03 * s)
      paint(ctx, '#bfe9ff', lw * 0.7)
      heart(ctx, 0, 0, 0.34 * s, '#ff5a8a', false)
      return true
    case 'rug':
      oval(ctx, 0, 0, 0.48 * s, 0.17 * s)
      paint(ctx, '#ff8fc7', lw)
      oval(ctx, 0, 0, 0.32 * s, 0.1 * s)
      paint(ctx, '#ffd23d')
      oval(ctx, 0, 0, 0.16 * s, 0.05 * s)
      paint(ctx, '#5ab6ff')
      return true
    case 'garland': {
      ctx.beginPath()
      ctx.moveTo(-0.48 * s, -0.12 * s)
      ctx.quadraticCurveTo(0, 0.18 * s, 0.48 * s, -0.12 * s)
      ctx.lineWidth = lw
      ctx.strokeStyle = INK
      ctx.stroke()
      const cols = ['#f0506e', '#ffd23d', '#5fd07f', '#3db8ff', '#a66bff']
      for (let i = 0; i < 5; i++) {
        const k = (i + 0.5) / 5
        const x = (-0.48 + k * 0.96) * s
        const y = (-0.12 + 0.6 * k * (1 - k)) * s
        ctx.beginPath()
        ctx.moveTo(x - 0.07 * s, y)
        ctx.lineTo(x + 0.07 * s, y)
        ctx.lineTo(x, y + 0.17 * s)
        ctx.closePath()
        paint(ctx, cols[i], lw * 0.7)
      }
      return true
    }
    case 'clock':
      oval(ctx, 0, 0, 0.34 * s, 0.34 * s)
      paint(ctx, '#fff', lw)
      oval(ctx, 0, 0, 0.34 * s, 0.34 * s)
      ctx.lineWidth = 0.07 * s
      ctx.strokeStyle = '#a66bff'
      ctx.stroke()
      oval(ctx, 0, 0, 0.375 * s, 0.375 * s)
      paint(ctx, null, lw)
      line(ctx, [0, 0, 0, -0.2 * s], lw * 1.2)
      line(ctx, [0, 0, 0.14 * s, 0.05 * s], lw * 1.2)
      return true
  }
  return false
}

/**
 * Icon of any owned thing: a gift (`g:ball`), a wire craft (`w:bow:2`), or one
 * of the built-ins: 'heart', 'star', 'poop', 'gift'.
 */
export function drawItem(ctx: Ctx, id: string, x: number, y: number, s: number): void {
  ctx.save()
  ctx.translate(x, y)
  const [kind, name, col] = id.split(':')
  if (kind === 'w' && (WIRE_SHAPES as readonly string[]).includes(name)) drawWire(ctx, name as WireShape, +col || 0, 0, 0, s * 0.82)
  else if (kind === 'g') {
    if (!prop(ctx, name, s)) {
      const slot = slotOf(id)
      // Wearables are drawn at their anchor, so shift them back into the icon box.
      if (slot === 'head') drawAccessory(ctx, id, 0, s * 0.28, s * 1.5)
      else if (slot === 'neck') drawAccessory(ctx, id, 0, name === 'medal' || name === 'scarf' ? -s * 0.12 : 0, s * 1.25)
      else if (slot === 'face') drawAccessory(ctx, id, 0, 0, s * 1.35)
    }
  } else if (id === 'heart') heart(ctx, 0, 0, s)
  else if (id === 'star') star(ctx, 0, 0, s)
  else if (id === 'poop') drawPoop(ctx, 0, s * 0.35, s * 0.9)
  else if (id === 'gift') drawGiftBox(ctx, 0, 0, s)
  else if (id === 'moon') {
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.4, 0.6, TAU - 1.0)
    ctx.quadraticCurveTo(-s * 0.05, 0, Math.cos(0.6) * s * 0.4, Math.sin(0.6) * s * 0.4)
    ctx.closePath()
    paint(ctx, '#ffe27a', lwOf(s))
    starPath(ctx, s * 0.26, -s * 0.2, s * 0.2)
    paint(ctx, '#fff')
  }
  ctx.restore()
}

/**
 * Decorations a tamagotchi shows at home. The room is `w` × `h` with the floor
 * line at `fy`; `slot` shifts which toys this tamagotchi keeps.
 */
export function drawRoomProps(ctx: Ctx, owned: string[], w: number, h: number, fy: number, slot: number): void {
  const has = (n: string): boolean => owned.includes(`g:${n}`)
  const at = (n: string, x: number, y: number, s: number): void => {
    ctx.save()
    ctx.translate(x, y)
    prop(ctx, n, s)
    ctx.restore()
  }
  const u = Math.min(w, h)
  if (has('garland')) at('garland', w / 2, u * 0.11, w * 0.86)
  if (has('picture')) at('picture', w * 0.22, fy * 0.44, u * 0.24)
  if (has('clock')) at('clock', w * 0.8, fy * 0.4, u * 0.2)
  if (has('rug')) at('rug', w / 2, fy + (h - fy) * 0.45, w * 0.62)
  if (has('lamp')) at('lamp', w * 0.9, fy - u * 0.12, u * 0.27)
  if (has('plant')) at('plant', w * 0.1, fy - u * 0.1, u * 0.24)
  const toys = GIFTS.filter((g) => g.kind === 'toy' && has(g.id)).map((g) => g.id)
  if (toys.length) {
    const a = toys[slot % toys.length]
    at(a, w * 0.2, fy + (h - fy) * 0.2, u * 0.2)
    if (toys.length > 1) at(toys[(slot + 1) % toys.length], w * 0.82, fy + (h - fy) * 0.25, u * 0.2)
  }
}
