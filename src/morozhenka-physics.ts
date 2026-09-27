import {
  CELL,
  HIT_RADIUS,
  isWallCell,
  moverRect,
  type Level,
  type Point,
} from './morozhenka-levels.ts'

/** Units per second² at full voice. */
export const THRUST = 1000
/** Velocity decay per second while pushing and while coasting. */
export const DRAG_ACTIVE = 3.2
export const DRAG_IDLE = 5.5
export const MAX_SPEED = 340
/** A new sound gives a little hop, so short “А!” calls feel like jumps. */
export const KICK = 120
export const CHERRY_TOUCH = 42
export const FLAKE_TOUCH = 46
export const CONE_TOUCH = 24

export interface Scoop {
  x: number
  y: number
  vx: number
  vy: number
}

export interface Push {
  /** Direction the scoop should travel (fire goes the other way). */
  x: number
  y: number
  /** 0…1 — louder voice, stronger fire. */
  power: number
  kick: boolean
}

export const NO_PUSH: Push = { x: 0, y: 0, power: 0, kick: false }

function circleHitsRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number): boolean {
  const nx = Math.max(x, Math.min(cx, x + w))
  const ny = Math.max(y, Math.min(cy, y + h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

export function hitsWall(level: Level, x: number, y: number, t: number, r = HIT_RADIUS): boolean {
  const c0 = Math.floor((x - r) / CELL)
  const c1 = Math.floor((x + r) / CELL)
  const r0 = Math.floor((y - r) / CELL)
  const r1 = Math.floor((y + r) / CELL)
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++)
      if (isWallCell(level, col, row) && circleHitsRect(x, y, r, col * CELL, row * CELL, CELL, CELL)) return true
  for (const mover of level.movers) {
    const box = moverRect(mover, t)
    // Stones are drawn a little rounder than their box; forgive the corners.
    if (circleHitsRect(x, y, r - 3, box.x + 3, box.y + 3, box.w - 6, box.h - 6)) return true
  }
  return false
}

/**
 * Advances the scoop. Returns true when it bumped into a wall or a stone.
 * Small sub-steps keep even the fastest scoop from slipping through a corner.
 */
export function stepScoop(scoop: Scoop, push: Push, dt: number, level: Level, t: number): boolean {
  const pushing = push.power > 0 && (push.x !== 0 || push.y !== 0)
  if (pushing && push.kick) {
    scoop.vx += push.x * KICK
    scoop.vy += push.y * KICK
  }
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    if (pushing) {
      scoop.vx += push.x * THRUST * push.power * h
      scoop.vy += push.y * THRUST * push.power * h
    }
    const decay = Math.exp(-(pushing ? DRAG_ACTIVE : DRAG_IDLE) * h)
    scoop.vx *= decay
    scoop.vy *= decay
    const speed = Math.hypot(scoop.vx, scoop.vy)
    if (speed > MAX_SPEED) {
      scoop.vx *= MAX_SPEED / speed
      scoop.vy *= MAX_SPEED / speed
    }
    if (speed < 0.5 && !pushing) {
      scoop.vx = 0
      scoop.vy = 0
    }
    scoop.x += scoop.vx * h
    scoop.y += scoop.vy * h
    if (hitsWall(level, scoop.x, scoop.y, t + (i + 1) * h)) return true
  }
  return false
}

export function touches(scoop: Scoop, point: Point, radius: number): boolean {
  return Math.hypot(scoop.x - point.x, scoop.y - point.y) <= radius
}

/** The cone counts from its rim down to its tip, so any side works. */
export function touchesCone(scoop: Scoop, cone: Point): boolean {
  const top = cone.y - 18
  const bottom = cone.y + 40
  const y = Math.max(top, Math.min(scoop.y, bottom))
  return Math.hypot(scoop.x - cone.x, scoop.y - y) <= HIT_RADIUS + CONE_TOUCH
}
