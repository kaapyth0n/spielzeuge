/**
 * Тамагочи Связь — shared kit: types, palette, canvas helpers, particles.
 * Everything in the game is drawn on one canvas; nothing here touches the DOM.
 */
import type { Lang } from './languages.ts'

export type Ctx = CanvasRenderingContext2D
export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const INK = '#3b2a4a'
export const TAU = Math.PI * 2
export const FONT = '"Nunito", "Trebuchet MS", system-ui, sans-serif'

/** Shell colours, in slot order. The first two are the tamagotchis Matryona drew. */
export const SHELLS = [
  { shell: '#5fd07f', dark: '#3aa860', light: '#a8f0bb', accent: '#ff9a3d', wall: '#eefff2', floor: '#bdeecb' },
  { shell: '#f0506e', dark: '#c93355', light: '#ff9fb0', accent: '#3db8ff', wall: '#fff1f4', floor: '#ffc7d2' },
  { shell: '#ffd23d', dark: '#e3a81a', light: '#fff0a0', accent: '#a66bff', wall: '#fffbe6', floor: '#ffe7a0' },
  { shell: '#5ab6ff', dark: '#338fdf', light: '#b5e0ff', accent: '#ff7ac8', wall: '#eef8ff', floor: '#c2e3ff' },
] as const
export type Shell = (typeof SHELLS)[number]

export const SPECIES = ['chick', 'kitten', 'monkey', 'banana', 'mini', 'bunny', 'penguin', 'puppy'] as const
export type SpeciesId = (typeof SPECIES)[number]

export const HAIRS = ['tuft', 'curl', 'palm', 'mohawk', 'bun', 'pigtails', 'fringe', 'braids', 'curls', 'none'] as const
export type HairId = (typeof HAIRS)[number]
/** Index 8 is the rainbow. */
export const HAIR_COLORS = ['#6b4226', '#3b2a4a', '#ffd23d', '#ff8a3d', '#ff6fb5', '#a66bff', '#3db8ff', '#44cf8a', 'rainbow'] as const
export const WIRE_COLORS = ['#ff6fb5', '#ffd23d', '#5fe0b0', '#5ab6ff', '#a66bff', '#f0506e'] as const
export const WIRE_SHAPES = ['bow', 'heart', 'star', 'flower', 'butterfly', 'crown', 'glasses'] as const
export type WireShape = (typeof WIRE_SHAPES)[number]

/** What a pet wears. Accessory ids: `g:<gift>` or `w:<shape>:<colour index>`. */
export interface Look {
  hair: HairId
  hairColor: number
  head: string | null
  face: string | null
  neck: string | null
}

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Pointer extends Pt {
  id: number
  x0: number
  y0: number
  /** Seconds since the pointer went down. */
  age: number
  /** True once a swipe was reported for this pointer; such a pointer never taps. */
  swiped: boolean
}

export interface Scene {
  enter?(): void
  leave?(): void
  resize?(): void
  update(dt: number): void
  draw(ctx: Ctx): void
  down?(p: Pointer): void
  move?(p: Pointer): void
  up?(p: Pointer): void
  /** Release without real movement. */
  tap?(p: Pointer): void
  /** Reported once per pointer, as soon as it has travelled far enough. */
  swipe?(p: Pointer, dir: Dir): void
}

export interface Sfx {
  /** One-shot effect by name; unknown names are silent. */
  play(name: string, variant?: number): void
  /** A sung/played note. `voice` is a species id or 'bell'. */
  note(midi: number, dur?: number, voice?: string, when?: number): void
  /** Start a looping tune ('dance' | 'rings' | 'salon' | 'craft'); replaces the current one. */
  loop(name: string | null): void
  /** Position inside the current loop's beat, 0..1, and beats per second. */
  beat(): { phase: number; bps: number; index: number }
  readonly muted: boolean
}

export interface Game {
  /** Stage size in CSS pixels. */
  w: number
  h: number
  /** Area free of the corner controls. */
  safe: Rect
  /** Seconds since start. */
  time: number
  lang: Lang
  sfx: Sfx
  /** Show a caption and speak it. `soft` lines never interrupt speech. */
  say(text: string, soft?: boolean): void
  rnd(): number
}

/** One pet that came to the meeting. `look` is live and saved by the host. */
export interface MeetPet {
  species: SpeciesId
  look: Look
  /** Shell slot of its home tamagotchi (index into SHELLS). */
  slot: number
  name: string
}

export interface ActivityCtx {
  game: Game
  pets: MeetPet[]
  /** Shell colours of the host tamagotchi, for the room. */
  shell: Shell
  /** Owned accessory ids (`g:…`, `w:…`). Use `own()` to add. */
  owned(): string[]
  own(id: string): void
  /** Call once when the activity is over. `stars` 1..3. */
  done(stars: number): void
  /** How many times this activity was finished before. */
  times: number
}
export type Activity = (ctx: ActivityCtx) => Scene

export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)
export const hit = (r: Rect, p: Pt, pad = 0): boolean =>
  p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
export const ease = {
  out: (t: number): number => 1 - (1 - clamp(t)) ** 3,
  in: (t: number): number => clamp(t) ** 3,
  inOut: (t: number): number => {
    const c = clamp(t)
    return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2
  },
  back: (t: number): number => {
    const c = clamp(t) - 1
    return 1 + c * c * (2.7 * c + 1.7)
  },
  /** 0 → 1 → 0 hop. */
  hop: (t: number): number => Math.sin(clamp(t) * Math.PI),
}

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + q, y)
  ctx.arcTo(x + w, y, x + w, y + h, q)
  ctx.arcTo(x + w, y + h, x, y + h, q)
  ctx.arcTo(x, y + h, x, y, q)
  ctx.arcTo(x, y, x + w, y, q)
  ctx.closePath()
}

export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU)
}

/** Fill with `color`, then outline in ink. */
export function paint(ctx: Ctx, color: string | CanvasGradient | null, line = 0): void {
  if (color) {
    ctx.fillStyle = color
    ctx.fill()
  }
  if (line > 0) {
    ctx.lineWidth = line
    ctx.strokeStyle = INK
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

export function line(ctx: Ctx, pts: number[], width: number, color: string = INK): void {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function label(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  size: number,
  color = '#fff',
  opts: { align?: CanvasTextAlign; outline?: string | null; maxWidth?: number } = {},
): void {
  ctx.save()
  ctx.font = `900 ${size}px ${FONT}`
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'middle'
  if (opts.maxWidth) {
    const w = ctx.measureText(str).width
    if (w > opts.maxWidth) ctx.font = `900 ${(size * opts.maxWidth) / w}px ${FONT}`
  }
  const outline = opts.outline === undefined ? INK : opts.outline
  if (outline) {
    ctx.lineWidth = Math.max(3, size * 0.22)
    ctx.strokeStyle = outline
    ctx.lineJoin = 'round'
    ctx.strokeText(str, x, y)
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}

export function heartPath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.42)
  ctx.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.42, y - s * 0.62, x, y - s * 0.22)
  ctx.bezierCurveTo(x + s * 0.42, y - s * 0.62, x + s * 0.75, y - s * 0.05, x, y + s * 0.42)
  ctx.closePath()
}
export function heart(ctx: Ctx, x: number, y: number, s: number, color = '#ff5a8a', outline = true): void {
  heartPath(ctx, x, y, s)
  paint(ctx, color, outline ? Math.max(1.5, s * 0.1) : 0)
}

export function starPath(ctx: Ctx, x: number, y: number, s: number, points = 5, inner = 0.48): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? s * 0.5 * inner : s * 0.5
    const a = (i / (points * 2)) * TAU - Math.PI / 2
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}
export function star(ctx: Ctx, x: number, y: number, s: number, color = '#ffd23d', outline = true): void {
  starPath(ctx, x, y, s)
  paint(ctx, color, outline ? Math.max(1.5, s * 0.09) : 0)
}

export function musicNote(ctx: Ctx, x: number, y: number, s: number, color = '#a66bff'): void {
  ctx.save()
  ctx.translate(x, y)
  oval(ctx, -s * 0.12, s * 0.28, s * 0.2, s * 0.15, -0.4)
  paint(ctx, color, Math.max(1.5, s * 0.08))
  line(ctx, [s * 0.06, s * 0.24, s * 0.06, -s * 0.4, s * 0.34, -s * 0.24], Math.max(2, s * 0.1), INK)
  ctx.restore()
}

/** A round toy button with a soft drop shadow. `icon` draws around (0,0) at size `s`. */
export function button(
  ctx: Ctx,
  r: Rect,
  opts: {
    color: string
    pressed?: boolean
    dim?: boolean
    icon?: (ctx: Ctx, s: number) => void
    text?: string
    radius?: number
    glow?: number
  },
): void {
  const press = opts.pressed ? 3 : 0
  const rad = opts.radius ?? Math.min(r.w, r.h) * 0.36
  ctx.save()
  if (opts.dim) ctx.globalAlpha = 0.45
  if (opts.glow) {
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 18 * opts.glow
  }
  rr(ctx, r.x, r.y + 6, r.w, r.h, rad)
  paint(ctx, INK)
  ctx.shadowBlur = 0
  rr(ctx, r.x, r.y + press, r.w, r.h, rad)
  paint(ctx, opts.color, 3)
  ctx.globalAlpha *= 0.35
  rr(ctx, r.x + 7, r.y + press + 6, r.w - 14, r.h * 0.3, rad * 0.6)
  paint(ctx, '#fff')
  ctx.globalAlpha = opts.dim ? 0.45 : 1
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2 + press
  if (opts.icon) {
    ctx.translate(cx, opts.text ? cy - r.h * 0.1 : cy)
    opts.icon(ctx, Math.min(r.w, r.h) * (opts.text ? 0.52 : 0.62))
    ctx.translate(-cx, -(opts.text ? cy - r.h * 0.1 : cy))
  }
  if (opts.text)
    label(ctx, opts.text, cx, opts.icon ? r.y + r.h * 0.83 + press : cy, Math.min(r.h * 0.17, 22), '#fff', {
      maxWidth: r.w - 12,
    })
  ctx.restore()
}

type Kind = 'heart' | 'star' | 'note' | 'dot' | 'confetti' | 'spark' | 'zzz'
interface Bit {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  g: number
  life: number
  max: number
  size: number
  color: string
  spin: number
  rot: number
}
const PARTY = ['#ff6fb5', '#ffd23d', '#5fe0b0', '#5ab6ff', '#a66bff', '#ff9a3d']

/** Small, cheap sparkles. Call `update` and `draw` every frame. */
export class Particles {
  bits: Bit[] = []

  add(kind: Kind, x: number, y: number, o: Partial<Bit> = {}): void {
    if (this.bits.length > 260) this.bits.shift()
    this.bits.push({
      kind,
      x,
      y,
      vx: 0,
      vy: -40,
      g: 0,
      life: 0,
      max: 1.1,
      size: 18,
      color: kind === 'heart' ? '#ff5a8a' : kind === 'star' ? '#ffd23d' : '#fff',
      spin: 0,
      rot: 0,
      ...o,
    })
  }

  burst(kind: Kind, x: number, y: number, n = 10, o: Partial<Bit> & { speed?: number } = {}): void {
    const speed = o.speed ?? 170
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.7
      const v = speed * (0.45 + Math.random() * 0.75)
      this.add(kind, x, y, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.35,
        g: kind === 'confetti' ? 520 : 240,
        size: (o.size ?? 16) * (0.7 + Math.random() * 0.6),
        color: o.color ?? (kind === 'confetti' || kind === 'dot' ? PARTY[i % PARTY.length] : undefined),
        max: (o.max ?? 1) * (0.75 + Math.random() * 0.5),
        spin: (Math.random() - 0.5) * 9,
        ...(o.color ? {} : {}),
      } as Partial<Bit>)
    }
  }

  update(dt: number): void {
    for (const b of this.bits) {
      b.life += dt
      b.vy += b.g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.rot += b.spin * dt
    }
    this.bits = this.bits.filter((b) => b.life < b.max)
  }

  draw(ctx: Ctx): void {
    for (const b of this.bits) {
      const k = b.life / b.max
      const pop = Math.min(1, b.life * 9)
      ctx.save()
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)
      const s = b.size * pop
      if (b.kind === 'heart') heart(ctx, 0, 0, s, b.color)
      else if (b.kind === 'star') star(ctx, 0, 0, s, b.color)
      else if (b.kind === 'note') musicNote(ctx, 0, 0, s, b.color === '#fff' ? '#a66bff' : b.color)
      else if (b.kind === 'confetti') {
        ctx.fillStyle = b.color
        ctx.fillRect(-s * 0.3, -s * 0.18, s * 0.6, s * 0.36)
      } else if (b.kind === 'zzz') label(ctx, 'z', 0, 0, s, '#cfe0ff', { outline: null })
      else if (b.kind === 'spark') {
        starPath(ctx, 0, 0, s, 4, 0.3)
        paint(ctx, b.color)
      } else {
        oval(ctx, 0, 0, s * 0.3, s * 0.3)
        paint(ctx, b.color)
      }
      ctx.restore()
    }
  }
}

/** Positions for `n` pets standing in a row inside `area`: feet points and a size that fits. */
export function row(n: number, area: Rect, maxSize = 190): { x: number; y: number; size: number }[] {
  const lane = area.w / n
  const size = Math.min(maxSize, lane * 0.62, area.h * 0.5)
  return Array.from({ length: n }, (_, i) => ({ x: area.x + lane * (i + 0.5), y: area.y + area.h, size }))
}

/** The inside of a tamagotchi screen, as big as the stage: wall, floor, glass shine. */
export function drawRoom(ctx: Ctx, game: Game, shell: Shell, floorY?: number): void {
  const { w, h } = game
  const fy = floorY ?? h * 0.72
  ctx.fillStyle = shell.wall
  ctx.fillRect(0, 0, w, h)
  // Soft dotted wallpaper.
  ctx.fillStyle = shell.floor
  ctx.globalAlpha = 0.55
  const step = Math.max(44, Math.min(w, h) / 9)
  for (let y = step / 2, r = 0; y < fy; y += step, r++)
    for (let x = (r % 2 ? step : step / 2); x < w; x += step) {
      oval(ctx, x, y, step * 0.07, step * 0.07)
      ctx.fill()
    }
  ctx.globalAlpha = 1
  ctx.fillStyle = shell.floor
  ctx.fillRect(0, fy, w, h - fy)
  ctx.fillStyle = shell.light
  ctx.globalAlpha = 0.5
  ctx.fillRect(0, fy, w, 6)
  ctx.globalAlpha = 1
  // Bezel in the shell colour, so the whole stage reads as a big screen.
  const b = Math.max(8, Math.min(w, h) * 0.018)
  ctx.lineWidth = b * 2
  ctx.strokeStyle = shell.shell
  rr(ctx, 0, 0, w, h, b * 3.4)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  rr(ctx, b, b, w - b * 2, h - b * 2, b * 2.4)
  ctx.stroke()
}

/** A row of 1..3 stars, used when an activity ends. `shown` may be fractional while they pop in. */
export function starsRow(ctx: Ctx, x: number, y: number, size: number, shown: number, total = 3): void {
  for (let i = 0; i < total; i++) {
    const k = clamp(shown - i)
    const cx = x + (i - (total - 1) / 2) * size * 1.15
    star(ctx, cx, y, size, '#e6dff0')
    if (k > 0) {
      ctx.save()
      ctx.translate(cx, y)
      ctx.scale(ease.back(k), ease.back(k))
      star(ctx, 0, 0, size, '#ffd23d')
      ctx.restore()
    }
  }
}
