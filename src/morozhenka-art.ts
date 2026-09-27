/**
 * Drawing for Мороженка in the style of Matryona’s picture: grey pencil
 * scribbles for walls, a green-and-brown scoop, a waffle cone with a
 * cross-hatch and little round puffs of fire.
 */
import { CELL, GRID, isWallCell, mulberry, type Level, type MoverSpec, type ThemeId } from './morozhenka-levels.ts'
import type { Flavor } from './morozhenka-state.ts'
import { BITS, FLAVOR_PAINT, INK, type FlavorPaint } from './morozhenka-svg.ts'

export interface ThemePaint {
  paper: string
  grain: string
  wash: string
  hatch: string
  line: string
  glow: string
}

export const THEME_PAINT: Record<ThemeId, ThemePaint> = {
  pencil: { paper: '#fbf8f1', grain: '#8a7f6a', wash: 'rgba(125,125,130,0.13)', hatch: 'rgba(88,88,94,0.5)', line: '#44444a', glow: '255,214,120' },
  ice: { paper: '#f3f8fc', grain: '#6f8aa3', wash: 'rgba(90,140,190,0.13)', hatch: 'rgba(58,108,160,0.46)', line: '#2c587f', glow: '170,220,255' },
  berry: { paper: '#fdf5f7', grain: '#a07a86', wash: 'rgba(200,90,130,0.12)', hatch: 'rgba(176,64,108,0.42)', line: '#80284f', glow: '255,190,215' },
  choco: { paper: '#fbf4ea', grain: '#8f7458', wash: 'rgba(140,90,50,0.14)', hatch: 'rgba(112,70,38,0.48)', line: '#57321a', glow: '255,206,140' },
  mint: { paper: '#f4fbf6', grain: '#6f9a84', wash: 'rgba(70,150,110,0.12)', hatch: 'rgba(50,128,90,0.44)', line: '#2a634a', glow: '190,255,220' },
  night: { paper: '#eceff8', grain: '#6d7092', wash: 'rgba(80,80,150,0.14)', hatch: 'rgba(66,66,128,0.5)', line: '#30315a', glow: '210,200,255' },
}


/** One pencil line with a slight wobble and overshoot, like a hand-drawn edge. */
function pencilLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, random: () => number, wobble = 1.6): void {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ux = (x2 - x1) / (len || 1)
  const uy = (y2 - y1) / (len || 1)
  const over = 2 + random() * 5
  const sx = x1 - ux * over + (random() - 0.5) * wobble
  const sy = y1 - uy * over + (random() - 0.5) * wobble
  const ex = x2 + ux * over + (random() - 0.5) * wobble
  const ey = y2 + uy * over + (random() - 0.5) * wobble
  const mx = (sx + ex) / 2 + (random() - 0.5) * wobble * 1.6 - uy * (random() - 0.5) * wobble
  const my = (sy + ey) / 2 + (random() - 0.5) * wobble * 1.6 + ux * (random() - 0.5) * wobble
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(mx, my, ex, ey)
  ctx.stroke()
}

/** Loopy zig-zag scribble, the way a child shades a big area with a pencil. */
function scribble(ctx: CanvasRenderingContext2D, x: number, y: number, random: () => number, size = 1): void {
  const angle = -1.15 + (random() - 0.5) * 0.5
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const px = -dy
  const py = dx
  const reach = (26 + random() * 34) * size
  const strokes = 5 + Math.floor(random() * 6)
  let cx = x
  let cy = y
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  for (let i = 0; i < strokes; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    const advance = (5 + random() * 6) * size
    const nx = cx + dx * reach * dir + px * advance
    const ny = cy + dy * reach * dir + py * advance
    const loop = (random() - 0.3) * 10 * size
    ctx.quadraticCurveTo(cx + dx * reach * dir * 0.5 + px * loop, cy + dy * reach * dir * 0.5 + py * loop, nx, ny)
    cx = nx
    cy = ny
  }
  ctx.stroke()
}

export function paintPaper(ctx: CanvasRenderingContext2D, size: number, theme: ThemeId, seed: number): void {
  const paint = THEME_PAINT[theme]
  ctx.fillStyle = paint.paper
  ctx.fillRect(0, 0, size, size)
  const random = mulberry(seed)
  ctx.fillStyle = paint.grain
  for (let i = 0; i < 1400; i++) {
    ctx.globalAlpha = 0.03 + random() * 0.06
    const r = 0.6 + random() * 1.4
    ctx.fillRect(random() * size, random() * size, r, r)
  }
  ctx.globalAlpha = 1
}

/** Walls in world units; the caller has already scaled the context. */
export function paintWalls(ctx: CanvasRenderingContext2D, level: Level): void {
  const paint = THEME_PAINT[level.theme]
  const random = mulberry(level.number * 131 + 7)
  const region = new Path2D()
  const cells: [number, number][] = []
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      if (isWallCell(level, col, row)) {
        region.rect(col * CELL, row * CELL, CELL, CELL)
        cells.push([col, row])
      }

  ctx.save()
  ctx.clip(region)
  ctx.fillStyle = paint.wash
  ctx.fill(region)
  ctx.strokeStyle = paint.hatch
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [col, row] of cells) {
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 1.6 + random() * 1.6
      ctx.globalAlpha = 0.45 + random() * 0.5
      scribble(ctx, (col + random()) * CELL, (row + random()) * CELL, random)
    }
  }
  // A few darker patches, like pressing the pencil harder.
  for (let i = 0; i < cells.length / 6; i++) {
    const [col, row] = cells[Math.floor(random() * cells.length)]
    ctx.lineWidth = 2.4
    ctx.globalAlpha = 0.5
    scribble(ctx, (col + random()) * CELL, (row + random()) * CELL, random, 0.7)
  }
  ctx.restore()

  // Outline: merge edges between wall and open cells into long pencil lines.
  ctx.strokeStyle = paint.line
  ctx.lineCap = 'round'
  const open = (c: number, r: number) => c > 0 && r > 0 && c < GRID - 1 && r < GRID - 1 && !isWallCell(level, c, r)
  const draw = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 3.2
    pencilLine(ctx, x1, y1, x2, y2, random)
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1.6
    pencilLine(ctx, x1, y1, x2, y2, random, 2.6)
  }
  for (let row = 0; row < GRID; row++) {
    for (const side of [-1, 1]) {
      let runStart = -1
      for (let col = 0; col <= GRID; col++) {
        const edge = col < GRID && isWallCell(level, col, row) && open(col, row + side)
        if (edge && runStart < 0) runStart = col
        if (!edge && runStart >= 0) {
          const y = (side < 0 ? row : row + 1) * CELL
          draw(runStart * CELL, y, col * CELL, y)
          runStart = -1
        }
      }
    }
  }
  for (let col = 0; col < GRID; col++) {
    for (const side of [-1, 1]) {
      let runStart = -1
      for (let row = 0; row <= GRID; row++) {
        const edge = row < GRID && isWallCell(level, col, row) && open(col + side, row)
        if (edge && runStart < 0) runStart = row
        if (!edge && runStart >= 0) {
          const x = (side < 0 ? col : col + 1) * CELL
          draw(x, runStart * CELL, x, row * CELL)
          runStart = -1
        }
      }
    }
  }
  // The frame around the page, like the rectangle in the drawing.
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 3.4
  pencilLine(ctx, 6, 6, 994, 6, random)
  pencilLine(ctx, 994, 6, 994, 994, random)
  pencilLine(ctx, 994, 994, 6, 994, random)
  pencilLine(ctx, 6, 994, 6, 6, random)
  ctx.globalAlpha = 1
}

/** A sleepy stone sprite drawn once per level (world units → pixels). */
export function paintStone(mover: MoverSpec, theme: ThemeId, scale: number, seed: number): HTMLCanvasElement {
  const w = mover.w * CELL
  const h = mover.h * CELL
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w * scale))
  canvas.height = Math.max(1, Math.ceil(h * scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const paint = THEME_PAINT[theme]
  const random = mulberry(seed)
  const body = new Path2D()
  body.roundRect(3, 3, w - 6, h - 6, Math.min(w, h) * 0.3)
  ctx.fillStyle = '#d9d6de'
  ctx.fill(body)
  ctx.save()
  ctx.clip(body)
  ctx.strokeStyle = paint.hatch
  ctx.lineCap = 'round'
  for (let i = 0; i < (w * h) / 500; i++) {
    ctx.lineWidth = 1.6 + random() * 1.4
    ctx.globalAlpha = 0.5 + random() * 0.4
    scribble(ctx, random() * w, random() * h, random, 0.8)
  }
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.strokeStyle = paint.line
  ctx.lineWidth = 3
  ctx.stroke(body)
  // Closed, sleepy eyes and a tiny mouth.
  const cx = w / 2
  const cy = h / 2
  const gap = Math.min(w, h) * 0.22
  ctx.strokeStyle = '#2b2a33'
  ctx.lineWidth = 3
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(cx + side * gap, cy - 4, 7, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(240,140,160,0.55)'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + side * (gap + 10), cy + 8, 6, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(cx, cy + 12, 4, 3, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#2b2a33'
  ctx.fill()
  return canvas
}

export interface ScoopPose {
  /** Where the eyes look (unit-ish vector). */
  look: { x: number; y: number }
  /** Fire direction; null when the mouth is closed. */
  fire: { x: number; y: number } | null
  blink: boolean
  /** 0 normal … 1 splatted flat. */
  melt: number
  /** Little drips when it has been spitting fire for a while. */
  drip: number
  time: number
}

function scoopOutline(r: number, time: number, wobble = 1): Path2D {
  const path = new Path2D()
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    // Smooth dome on top, scalloped rim at the bottom — a real scooped ball.
    const lower = Math.max(0, Math.sin(a))
    const bump = 1 + lower * 0.07 * Math.cos(a * 7) * wobble + 0.012 * Math.sin(a * 3 + time * 2)
    const x = Math.cos(a) * r * bump * 1.04
    const y = Math.sin(a) * r * bump * (0.94 + lower * 0.04)
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()
  return path
}

function paintBits(ctx: CanvasRenderingContext2D, r: number, paint: FlavorPaint): void {
  ctx.fillStyle = paint.bits
  for (const [bx, by, turn] of BITS) {
    ctx.save()
    ctx.translate(bx * r, by * r)
    ctx.rotate(turn)
    ctx.beginPath()
    if (paint.bitShape === 'chip') {
      ctx.moveTo(-r * 0.09, -r * 0.05)
      ctx.lineTo(r * 0.08, -r * 0.08)
      ctx.lineTo(r * 0.1, r * 0.06)
      ctx.lineTo(-r * 0.06, r * 0.08)
    } else if (paint.bitShape === 'seed') {
      ctx.ellipse(0, 0, r * 0.035, r * 0.06, 0, 0, Math.PI * 2)
    } else if (paint.bitShape === 'swirl') {
      ctx.ellipse(0, 0, r * 0.14, r * 0.045, 0, 0, Math.PI * 2)
      ctx.globalAlpha = 0.6
    } else {
      ctx.arc(0, 0, r * 0.045, 0, Math.PI * 2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
  }
}

/** The heroine. (x, y) is the centre, r the radius in world units. */
export function paintScoop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flavor: Flavor, pose: ScoopPose): void {
  const paint = FLAVOR_PAINT[flavor]
  ctx.save()
  ctx.translate(x, y)
  if (pose.melt > 0) {
    ctx.translate(0, r * 0.55 * pose.melt)
    ctx.scale(1 + 0.45 * pose.melt, 1 - 0.6 * pose.melt)
  }
  const body = scoopOutline(r, pose.time)
  const gradient = ctx.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.1, 0, 0, r * 1.1)
  gradient.addColorStop(0, paint.light)
  gradient.addColorStop(0.45, paint.base)
  gradient.addColorStop(1, paint.shade)
  ctx.fillStyle = gradient
  ctx.fill(body)
  ctx.save()
  ctx.clip(body)
  if (flavor === 'mint') {
    // Matryona’s scoop: green with big brown patches.
    ctx.fillStyle = 'rgba(122,72,44,0.8)'
    ctx.beginPath()
    ctx.ellipse(r * 0.3, r * 0.1, r * 0.34, r * 0.28, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-r * 0.55, r * 0.5, r * 0.26, r * 0.2, -0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  paintBits(ctx, r, paint)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.38, -r * 0.5, r * 0.26, r * 0.13, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(2, r * 0.085)
  ctx.lineJoin = 'round'
  ctx.stroke(body)

  if (pose.drip > 0.05) {
    ctx.fillStyle = paint.base
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.5
    for (const [dx, phase] of [
      [-0.45, 0],
      [0.35, 1.7],
    ] as const) {
      const len = r * (0.18 + 0.2 * pose.drip) * (0.7 + 0.3 * Math.sin(pose.time * 3 + phase))
      ctx.beginPath()
      ctx.ellipse(dx * r, r * 0.88 + len * 0.5, r * 0.07, len * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  if (pose.melt < 0.6) {
    const fire = pose.fire
    // The face leans away from the mouth, so the mouth can reach the fire side.
    const fx = fire ? -fire.x * r * 0.12 : 0
    const fy = fire ? -fire.y * r * 0.12 : 0
    const eyeY = -r * 0.14 + fy
    const lookX = pose.look.x * r * 0.07
    const lookY = pose.look.y * r * 0.07
    for (const side of [-1, 1]) {
      const ex = side * r * 0.33 + fx
      if (pose.blink) {
        ctx.strokeStyle = INK
        ctx.lineWidth = r * 0.07
        ctx.beginPath()
        ctx.arc(ex, eyeY, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI)
        ctx.stroke()
        continue
      }
      ctx.fillStyle = '#fffdf8'
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, r * 0.17, r * 0.21, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = INK
      ctx.lineWidth = r * 0.05
      ctx.stroke()
      ctx.fillStyle = '#231815'
      ctx.beginPath()
      ctx.arc(ex + lookX, eyeY + lookY + r * 0.02, r * 0.095, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(ex + lookX - r * 0.03, eyeY + lookY - r * 0.03, r * 0.035, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,120,150,0.45)'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * r * 0.52 + fx, r * 0.14 + fy, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    if (fire) {
      const mx = fire.x * r * 0.6
      const my = fire.y * r * 0.6 + (fire.y === 0 ? r * 0.18 : 0)
      ctx.fillStyle = '#6b1f1f'
      ctx.strokeStyle = INK
      ctx.lineWidth = r * 0.05
      ctx.beginPath()
      ctx.ellipse(mx, my, r * 0.17, r * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffb347'
      ctx.beginPath()
      ctx.ellipse(mx + fire.x * r * 0.04, my + fire.y * r * 0.04, r * 0.09, r * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.strokeStyle = INK
      ctx.lineWidth = r * 0.06
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, r * 0.14, r * 0.17, 0.18 * Math.PI, 0.82 * Math.PI)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** Waffle cone. (x, y) is the middle of the opening. */
export function paintCone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: ThemeId, glow = true): void {
  const w = 30
  const h = 62
  if (glow) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.6)
    const halo = ctx.createRadialGradient(x, y + 10, 8, x, y + 10, 70 + pulse * 10)
    halo.addColorStop(0, `rgba(${THEME_PAINT[theme].glow},${0.5 + 0.2 * pulse})`)
    halo.addColorStop(1, `rgba(${THEME_PAINT[theme].glow},0)`)
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y + 10, 80 + pulse * 10, 0, Math.PI * 2)
    ctx.fill()
  }
  const body = new Path2D()
  body.moveTo(x - w, y - 4)
  body.quadraticCurveTo(x - w * 0.5, y + h * 0.55, x - 2, y + h)
  body.quadraticCurveTo(x, y + h + 4, x + 2, y + h)
  body.quadraticCurveTo(x + w * 0.5, y + h * 0.55, x + w, y - 4)
  body.closePath()
  ctx.fillStyle = '#e0a765'
  ctx.fill(body)
  ctx.save()
  ctx.clip(body)
  ctx.strokeStyle = 'rgba(122,70,30,0.8)'
  ctx.lineWidth = 2.2
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath()
    ctx.moveTo(x + k * 11 - 40, y - 10)
    ctx.lineTo(x + k * 11 + 40, y + h + 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + k * 11 + 40, y - 10)
    ctx.lineTo(x + k * 11 - 40, y + h + 10)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(120,60,20,0.18)'
  ctx.fillRect(x, y - 10, w + 5, h + 20)
  ctx.restore()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.8
  ctx.lineJoin = 'round'
  ctx.stroke(body)
  ctx.fillStyle = '#c98a4b'
  ctx.beginPath()
  ctx.ellipse(x, y - 4, w + 2, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#8a5325'
  ctx.beginPath()
  ctx.ellipse(x, y - 5, w - 4, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function paintCherry(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, phase: number): void {
  const bob = Math.sin(time * 2.2 + phase) * 3
  const cy = y + bob + 4
  ctx.strokeStyle = '#4b6b2a'
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, cy - 10)
  ctx.quadraticCurveTo(x + 2, cy - 24, x + 10, cy - 28)
  ctx.stroke()
  ctx.fillStyle = '#7cb342'
  ctx.beginPath()
  ctx.ellipse(x + 13, cy - 27, 8, 4, -0.4, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(x - 4, cy - 5, 2, x, cy, 14)
  g.addColorStop(0, '#ff8a8a')
  g.addColorStop(0.5, '#e02d3c')
  g.addColorStop(1, '#9c1022')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, cy, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.ellipse(x - 4.5, cy - 5, 3.5, 2.2, -0.6, 0, Math.PI * 2)
  ctx.fill()
}

export function paintFlake(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, active: boolean): void {
  const r = active ? 24 : 21
  if (active) {
    const halo = ctx.createRadialGradient(x, y, 4, x, y, 48)
    halo.addColorStop(0, 'rgba(160,215,255,0.65)')
    halo.addColorStop(1, 'rgba(160,215,255,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, 48, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(time * (active ? 0.9 : 0.35))
  ctx.strokeStyle = active ? '#2f7fc4' : '#78aedb'
  ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3)
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -r)
    ctx.stroke()
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.55)
    ctx.lineTo(-r * 0.25, -r * 0.78)
    ctx.moveTo(0, -r * 0.55)
    ctx.lineTo(r * 0.25, -r * 0.78)
    ctx.stroke()
  }
  ctx.fillStyle = active ? '#ffffff' : '#e8f3fc'
  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  kind: 'fire' | 'splat' | 'sprinkle' | 'spark'
  color: string
  spin: number
}

/** Fire puffs turn from hot yellow to grey smoke rings — the little circles in the drawing. */
export function paintParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const t = p.age / p.life
  if (p.kind === 'fire') {
    const size = p.size * (0.7 + t * 0.9)
    if (t < 0.55) {
      ctx.globalAlpha = 1 - t * 0.6
      ctx.fillStyle = t < 0.18 ? '#fff4b8' : t < 0.35 ? '#ffc247' : '#ff7a2f'
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(160,60,20,0.55)'
      ctx.lineWidth = 1.4
      ctx.stroke()
    } else {
      ctx.globalAlpha = Math.max(0, 1 - t) * 1.4
      ctx.strokeStyle = '#6f6a66'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(p.x, p.y, size * 0.8, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (p.kind === 'splat') {
    ctx.globalAlpha = Math.max(0, 1 - t)
    ctx.fillStyle = p.color
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (p.kind === 'sprinkle') {
    ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.spin * p.age * 6)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.roundRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7, p.size * 0.35)
    ctx.fill()
    ctx.restore()
  } else {
    ctx.globalAlpha = Math.max(0, 1 - t)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (1 - t), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
