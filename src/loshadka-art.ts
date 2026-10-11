/**
 * Лошадка — the pony, drawn as layered vector art.
 *
 * The pony faces LEFT (as on Matryona's drawing). Every part lives in its own group with a
 * pivot so `loshadka-horse.css` can make it breathe, blink, hop, rear, munch and swish
 * without anything coming apart. All gradient/clip ids carry the caller's prefix, so many
 * ponies can share one page.
 */
import {
  findItem,
  type ClipItem,
  type ClipShape,
  type ColorItem,
  type HairExtra,
  type ItemKind,
  type Look,
  type ManeItem,
  type ManeStyle,
  type TailItem,
  type TailStyle,
} from './loshadka-items.ts'

export type { Look }

export interface HorseOptions {
  /** Unique prefix for gradient/clip/filter ids in this SVG (several ponies on one page). */
  id: string
  /** Dashed ghost outlines + side arrows for missing mane/tail/clip/colour (workshop sketch). */
  ghosts?: boolean
  /** Bolder ghost lines and bigger arrows, for a pony drawn small (phones). */
  bold?: boolean
  /** Not used by the art (the apple lives in the scene). */
  apple?: boolean
  /** Optional <title> for accessibility. */
  title?: string
}

/* The pony is authored in local units and shifted down by OFFSET_Y, leaving headroom for
   rearing with a horn and flapping wings. */
const W = 480
const H = 430
const OFFSET_Y = 36
const OFFSET_X = -10
/** Local ground line (hooves). */
const G = 352
export const HORSE_VIEWBOX: { width: number; height: number } = { width: W, height: H }
/** Where the hooves touch the ground, in viewBox units. */
export const HORSE_GROUND_Y = G + OFFSET_Y

/* ─────────────────────────── colour ─────────────────────────── */

type RGB = [number, number, number]

function rgb(hex: string): RGB {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function hexOf([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function mix(a: string, b: string, t: number): string {
  const x = rgb(a)
  const y = rgb(b)
  return hexOf([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

/** Plum-tinted shadow: warmer and softer than black. */
const INK = '#3b1d3f'
const lighten = (c: string, t: number) => mix(c, '#ffffff', t)
const darken = (c: string, t: number) => mix(c, INK, t)

function toHsl(c: string): [number, number, number] {
  const [r, g, b] = rgb(c).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const ch = (n: number) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))
  return hexOf([ch(0), ch(8), ch(4)])
}

/** A painterly shadow: darker, a touch more saturated, hue nudged toward rose/violet. */
function shade(c: string, t: number): string {
  const [h, s, l] = toHsl(c)
  if (s < 0.08) return fromHsl(255, 0.22 + s, Math.max(0, l - t * 0.75))
  const base = h > 300 ? h - 360 : h
  // yellows/oranges/reds lean to warm red, cool hues lean to violet
  const target = base < 70 ? base - 14 : base + 12
  const hh = (base + (target - base) * Math.min(1, t * 2.2) + 360) % 360
  return fromHsl(hh, Math.min(1, s + t * 0.1), Math.max(0, l - t * 0.7))
}

function luma(c: string): number {
  const [r, g, b] = rgb(c)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

const RAINBOW = ['#ff5f6d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa']

/* ─────────────────────────── geometry ─────────────────────────── */

type P = [number, number]
type Curve = [P, P, P, P]

const f = (n: number) => Math.round(n * 10) / 10
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`

function at(c: Curve, t: number): P {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const d = 3 * u * t * t
  const e = t * t * t
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]]
}

function dir(c: Curve, t: number): P {
  const u = 1 - t
  let x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0])
  let y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1])
  if (Math.hypot(x, y) < 1e-6) {
    x = c[3][0] - c[0][0]
    y = c[3][1] - c[0][1]
  }
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

/** Catmull-Rom through points → cubic segments (without the leading M). */
function through(points: P[]): string {
  let d = ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}

/** A closed smooth blob through points. */
function blob(points: P[]): string {
  const n = points.length
  let d = `M${pt(points[0])}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return `${d}Z`
}

/** A centerline: one cubic, or a smooth spline through points. */
interface Line {
  at: (t: number) => P
  dir: (t: number) => P
}

type Src = Curve | P[]

/** Splines are tagged so a 4-point spline is not mistaken for a cubic. */
const SPLINE = new WeakSet<object>()
function sp(...points: P[]): P[] {
  SPLINE.add(points)
  return points
}

function lineOf(src: Src): Line {
  if (src.length === 4 && !SPLINE.has(src)) {
    const c = src as Curve
    return { at: (t) => at(c, t), dir: (t) => dir(c, t) }
  }
  const pts = src as P[]
  const segs: Curve[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    segs.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2])
  }
  const pick = (t: number): [Curve, number] => {
    const x = Math.min(segs.length - 1e-9, Math.max(0, t * segs.length))
    const i = Math.floor(x)
    return [segs[i], x - i]
  }
  return {
    at: (t) => {
      const [c, u] = pick(t)
      return at(c, u)
    },
    dir: (t) => {
      const [c, u] = pick(t)
      return dir(c, u)
    },
  }
}

/**
 * A tapered ribbon along a centerline — the brush stroke every hair lock, lash and
 * feather is made of. `width(t)` is the full width at t (0 = root, 1 = tip).
 */
function ribbon(src: Src, width: (t: number) => number, a = 0, b = 1, n = 18, shift = 0): string {
  const line = lineOf(src)
  const left: P[] = []
  const right: P[] = []
  for (let i = 0; i <= n; i++) {
    const t = a + ((b - a) * i) / n
    const p = line.at(t)
    const d = line.dir(t)
    const nx = -d[1]
    const ny = d[0]
    const w = Math.max(0, width(t)) / 2
    const s = shift * Math.sin(Math.PI * ((t - a) / (b - a || 1)))
    left.push([p[0] + nx * (w + s), p[1] + ny * (w + s)])
    right.push([p[0] - nx * (w - s), p[1] - ny * (w - s)])
  }
  const rootW = width(a) / 2
  const d0 = line.dir(a)
  const r0 = line.at(a)
  const back: P = [r0[0] - d0[0] * rootW * 1.1, r0[1] - d0[1] * rootW * 1.1]
  const tipW = width(b) / 2
  let tip = ''
  if (tipW > 0.6) {
    const d1 = line.dir(b)
    const r1 = line.at(b)
    const front: P = [r1[0] + d1[0] * tipW * 1.3, r1[1] + d1[1] * tipW * 1.3]
    tip = `Q${pt(front)} ${pt(right[n])}`
  } else {
    tip = `L${pt(right[n])}`
  }
  return `M${pt(left[0])}${through(left)}${tip}${through(right.slice().reverse())}Q${pt(back)} ${pt(left[0])}Z`
}

/** Typical lock: full near the root, a soft belly, a fine (or rounded) tip. */
const lockW =
  (w: number, tip = 0, belly = 0.3) =>
  (t: number) =>
    w * Math.pow(1 - t, 0.6) * (1 + belly * Math.sin(Math.PI * t)) + tip * Math.sin((Math.PI / 2) * t)
/** Highlight strand width: thin, tapered at both ends. */
const strandW = (w: number) => (t: number) => w * Math.sin(Math.PI * Math.min(1, Math.max(0, t)))

/** Resample a centerline with a sideways wave (no wave at the root). */
function wave(src: Src, amp: number, waves: number, phase = 0, n = 20): P[] {
  const line = lineOf(src)
  const out: P[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = line.at(t)
    const d = line.dir(t)
    const o = amp * Math.sin(phase + t * waves * Math.PI * 2) * Math.min(1, t * 2.5)
    out.push([p[0] - d[1] * o, p[1] + d[0] * o])
  }
  return sp(...out)
}

const add = (p: P, x: number, y: number): P => [p[0] + x, p[1] + y]

function rot(p: P, o: P, deg: number): P {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const x = p[0] - o[0]
  const y = p[1] - o[1]
  return [o[0] + x * c - y * s, o[1] + x * s + y * c]
}

function starPath(cx: number, cy: number, r: number, inner = 0.5, points = 5, turn = -90): string {
  const out: P[] = []
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner
    const a = ((turn + (i * 180) / points) * Math.PI) / 180
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  // rounded corners: run through edge midpoints with the corners as controls
  const mid = (i: number): P => {
    const p = out[i % out.length]
    const q = out[(i + 1) % out.length]
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  }
  let d = `M${pt(mid(0))}`
  for (let i = 1; i <= out.length; i++) d += `Q${pt(out[i % out.length])} ${pt(mid(i))}`
  return `${d}Z`
}

function heartPath(cx: number, cy: number, s: number): string {
  const x = (v: number) => f(cx + v * s)
  const y = (v: number) => f(cy + v * s)
  return `M${x(0)} ${y(0.95)}C${x(-0.4)} ${y(0.62)} ${x(-1)} ${y(0.22)} ${x(-1)} ${y(-0.28)}C${x(-1)} ${y(-0.78)} ${x(-0.38)} ${y(-0.98)} ${x(0)} ${y(-0.5)}C${x(0.38)} ${y(-0.98)} ${x(1)} ${y(-0.78)} ${x(1)} ${y(-0.28)}C${x(1)} ${y(0.22)} ${x(0.4)} ${y(0.62)} ${x(0)} ${y(0.95)}Z`
}

function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.2
  return `M${f(cx)} ${f(cy - r)}Q${f(cx + k)} ${f(cy - k)} ${f(cx + r)} ${f(cy)}Q${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + r)}Q${f(cx - k)} ${f(cy + k)} ${f(cx - r)} ${f(cy)}Q${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - r)}Z`
}

/** A scalloped (fluffy) circle. */
function fluffPath(cx: number, cy: number, r: number, bumps = 9, depth = 0.16, turn = 0): string {
  const pts: P[] = []
  for (let i = 0; i < bumps; i++) {
    const a = turn + (i / bumps) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  let d = `M${pt(pts[0])}`
  for (let i = 0; i < bumps; i++) {
    const q = pts[(i + 1) % bumps]
    const a = turn + ((i + 0.5) / bumps) * Math.PI * 2
    const bulge = r * (1 + depth * 1.6)
    const c: P = [cx + Math.cos(a) * bulge, cy + Math.sin(a) * bulge]
    d += `Q${pt(c)} ${pt(q)}`
  }
  return `${d}Z`
}

const origin = (p: P) => `style="transform-origin:${f(p[0])}px ${f(p[1])}px"`

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/* ─────────────────────────── anatomy (local units) ─────────────────────────── */

const HEAD_D = blob([
  [178, 80],
  [222, 90],
  [245, 126],
  [242, 168],
  [220, 198],
  [178, 214],
  [130, 220],
  [86, 222],
  [60, 206],
  [52, 178],
  [64, 152],
  [94, 140],
  [116, 122],
  [138, 92],
])
const EYE: P = [160, 150]
const EYE_RX = 22
const EYE_RY = 28
/** Where the head turns on the neck (behind the jaw, under the poll). */
const HEAD_PIVOT: P = [224, 176]
const NECK_BASE: P = [256, 252]
const DOCK: P = [358, 230]
const SHOULDER: P = [318, 222]
const CLIP_AT: P = [170, 84]
const MOUTH: P = [83, 202]
/* The munch pose in loshadka-horse.css (lh-munch-neck / lh-munch-head), mirrored here. */
const MUNCH_NECK_DEG = -27
const MUNCH_HEAD_DEG = -28
const HORN_BASE: P = [142, 112]

/** The crest of the neck (where the mane grows), from between the ears down to the withers. */
const CREST: Curve = [
  [206, 84],
  [248, 92],
  [272, 156],
  [284, 222],
]
const crestAt = (t: number): P => at(CREST, t)
/** Outward normal of the crest (pointing up and back). */
function crestOut(t: number): P {
  const d = dir(CREST, t)
  return [d[1], -d[0]]
}

const BODY_D = blob([
  [254, 216],
  [304, 208],
  [344, 212],
  [366, 238],
  [362, 274],
  [334, 296],
  [280, 302],
  [234, 297],
  [210, 276],
  [208, 246],
  [226, 224],
])

const NECK_FILL =
  'M202 196C208 214 212 230 211 248C214 272 244 286 268 278C292 270 296 242 286 226C276 194 264 166 242 146L196 170Z'
const NECK_THROAT = 'M205 204C209 218 211 232 210 248'
const NECK_CREST = 'M244 148C264 170 276 196 285 226'

const LEGS = {
  fl: { x: 258, top: 272, far: true },
  fr: { x: 236, top: 272, far: false },
  bl: { x: 312, top: 270, far: true },
  br: { x: 334, top: 270, far: false },
} as const
type LegId = keyof typeof LEGS

/** Where the mouth comes down during `.is-munch` (viewBox units): put the apple there, on the ground. */
export const HORSE_MUNCH_MOUTH: { x: number; y: number } = (() => {
  const p = rot(rot(MOUTH, HEAD_PIVOT, MUNCH_HEAD_DEG), NECK_BASE, MUNCH_NECK_DEG)
  return { x: Math.round(p[0] + OFFSET_X), y: Math.round(p[1] + OFFSET_Y) }
})()

/* ─────────────────────────── palettes ─────────────────────────── */

interface Coat {
  body: string
  light: string
  shade: string
  deep: string
  muzzle: string
  hoof: string
  line: string
  inner: string
  blush: string
  sketch: boolean
  pattern?: ColorItem['pattern']
  patternColor: string
}

const SKETCH: Coat = {
  body: '#ffffff',
  light: '#ffffff',
  shade: '#f4f2f8',
  deep: '#ebe8f1',
  muzzle: '#ffffff',
  hoof: '#ffffff',
  line: '#a69fb8',
  inner: '#fde9f0',
  blush: '#ffc4d8',
  sketch: true,
  patternColor: '#ffffff',
}

function coatOf(color: ColorItem | undefined): Coat {
  if (!color) return SKETCH
  const dark = luma(color.body) < 0.32
  return {
    body: color.body,
    light: lighten(color.body, dark ? 0.18 : 0.45),
    shade: color.shade,
    deep: darken(color.shade, 0.16),
    muzzle: color.muzzle,
    hoof: color.hoof,
    line: dark ? darken(color.shade, 0.6) : darken(color.shade, 0.4),
    inner: mix(color.muzzle, '#ff8fb5', 0.5),
    blush: '#ff6f98',
    sketch: false,
    pattern: color.pattern,
    patternColor: color.patternColor ?? '#ffffff',
  }
}

interface Hair {
  colors: string[]
  root: string
  tip: string
  line: string
  striped: boolean
}

const isPale = (c: string) => luma(c) > 0.86
const shadowOf = (c: string, t = 0.3) => (isPale(c) ? mix(c, '#9a90c8', t * 1.4) : shade(c, t))
const lightOf = (c: string) => (isPale(c) ? '#ffffff' : lighten(c, 0.6))

function hairOf(colors: string[], style: ManeStyle | TailStyle): Hair {
  const root = colors[0]
  const tip = colors.length > 1 ? colors[colors.length - 1] : colors[0]
  const deepest = colors.reduce((a, c) => (luma(c) < luma(a) ? c : a), colors[0])
  return {
    colors,
    root,
    tip,
    line: isPale(deepest) ? '#a39ac6' : darken(deepest, luma(deepest) < 0.3 ? 0.62 : 0.5),
    striped: colors.length > 2 && style !== 'spiky',
  }
}

/* ─────────────────────────── svg context ─────────────────────────── */

type Stop = [number, string, number?]

class Ctx {
  defs: string[] = []
  private made = new Set<string>()
  readonly prefix: string
  constructor(prefix: string) {
    this.prefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'lh'
  }
  id(name: string): string {
    return `${this.prefix}-${name}`
  }
  url(name: string): string {
    return `url(#${this.id(name)})`
  }
  private stops(stops: Stop[]): string {
    return stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op === undefined ? '' : ` stop-opacity="${op}"`}/>`).join('')
  }
  /** Registers a def once; later calls with the same name reuse it. */
  private add(name: string, def: () => string): string {
    if (!this.made.has(name)) {
      this.made.add(name)
      this.defs.push(def())
    }
    return this.url(name)
  }
  linear(name: string, stops: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1, user = false): string {
    const units = user ? ' gradientUnits="userSpaceOnUse"' : ''
    return this.add(name, () => `<linearGradient id="${this.id(name)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${units}>${this.stops(stops)}</linearGradient>`)
  }
  radial(name: string, stops: Stop[], cx = 0.5, cy = 0.5, r = 0.5, user = false): string {
    const units = user ? ' gradientUnits="userSpaceOnUse"' : ''
    return this.add(name, () => `<radialGradient id="${this.id(name)}" cx="${cx}" cy="${cy}" r="${r}"${units}>${this.stops(stops)}</radialGradient>`)
  }
  clip(name: string, content: string): string {
    return this.add(name, () => `<clipPath id="${this.id(name)}">${content}</clipPath>`)
  }
}

/* ─────────────────────────── hair rendering ─────────────────────────── */

interface LockSpec {
  c: Src
  w: number
  /** stripe colour index for multi-colour hair */
  k?: number
  tip?: number
  belly?: number
  /** darker volume behind the main locks */
  back?: boolean
  shine?: boolean
}

type Flow = 'down' | 'right' | 'up' | 'left' | 'out'

const FLOW: Record<Flow, [number, number, number, number]> = {
  down: [0, 0, 0.3, 1],
  right: [0, 0, 1, 0.6],
  up: [0, 1, 0.3, 0],
  left: [1, 0, 0, 0.6],
  out: [0, 1, 0.9, 0.1],
}

interface HairPaint {
  fill: (k?: number) => string
  back: (k?: number) => string
  /** representative colour of lock k, for highlights */
  color: (k?: number) => string
}

function hairPaint(cx: Ctx, name: string, hair: Hair, flow: Flow): HairPaint {
  const [x1, y1, x2, y2] = FLOW[flow]
  if (hair.striped) {
    const fills = hair.colors.map((c, i) => cx.linear(`${name}-s${i}`, [[0, isPale(c) ? '#ffffff' : lighten(c, 0.1)], [1, isPale(c) ? '#e9eef8' : darken(c, 0.06)]], x1, y1, x2, y2))
    const backs = hair.colors.map((c, i) => cx.linear(`${name}-b${i}`, [[0, shadowOf(c, 0.28)], [1, shadowOf(c, 0.2)]], x1, y1, x2, y2))
    return {
      fill: (k = 0) => fills[k % fills.length],
      back: (k = 0) => backs[k % backs.length],
      color: (k = 0) => hair.colors[k % hair.colors.length],
    }
  }
  const stops: Stop[] =
    hair.colors.length > 2
      ? hair.colors.map((c, i) => [i / (hair.colors.length - 1), c] as Stop)
      : [
          [0, hair.root],
          [0.6, mix(hair.root, hair.tip, 0.65)],
          [1, hair.tip],
        ]
  const main = cx.linear(`${name}-g`, stops, x1, y1, x2, y2)
  const back = cx.linear(
    `${name}-bk`,
    stops.map(([o, c]) => [o, shadowOf(c, 0.26)] as Stop),
    x1,
    y1,
    x2,
    y2,
  )
  return { fill: () => main, back: () => back, color: () => mix(hair.root, hair.tip, 0.6) }
}

function renderLocks(paint: HairPaint, hair: Hair, locks: LockSpec[]): string {
  let out = ''
  for (const l of locks) {
    const k = l.k ?? 0
    const d = ribbon(l.c, lockW(l.w, l.tip ?? 0, l.belly ?? 0.3))
    out += `<path d="${d}" fill="${l.back ? paint.back(k) : paint.fill(k)}" stroke="${hair.line}" stroke-width="2.4" stroke-linejoin="round"/>`
    if (!l.back) {
      const c = paint.color(k)
      out += `<path d="${ribbon(l.c, strandW(l.w * 0.13), 0.22, 0.86, 12, l.w * 0.16)}" fill="${shadowOf(c, 0.3)}" opacity=".6"/>`
      if (l.shine !== false) out += `<path d="${ribbon(l.c, strandW(l.w * 0.2), 0.08, 0.6, 12, -l.w * 0.22)}" fill="${lightOf(c)}" opacity=".9"/>`
    }
  }
  return out
}

/** A round ringlet curl: gradient ball with a spiral groove and a shine. */
function curl(x: number, y: number, r: number, fill: string, line: string, c: string, spin = 1, back = false): string {
  const s = spin
  const groove = `M${f(x + s * r * 0.55)} ${f(y - r * 0.15)}C${f(x + s * r * 0.5)} ${f(y + r * 0.55)} ${f(x - s * r * 0.45)} ${f(y + r * 0.6)} ${f(x - s * r * 0.5)} ${f(y + r * 0.05)}C${f(x - s * r * 0.5)} ${f(y - r * 0.38)} ${f(x + s * r * 0.08)} ${f(y - r * 0.42)} ${f(x + s * r * 0.12)} ${f(y - r * 0.05)}`
  if (back) return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${line}" stroke-width="2.4"/>`
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${line}" stroke-width="2.4"/>
    <path d="${groove}" fill="none" stroke="${shadowOf(c, 0.32)}" stroke-width="${f(Math.max(1.6, r * 0.16))}" stroke-linecap="round" opacity=".75"/>
    <path d="M${f(x - r * 0.62)} ${f(y - r * 0.2)}A${f(r * 0.66)} ${f(r * 0.66)} 0 0 1 ${f(x - r * 0.05)} ${f(y - r * 0.66)}" fill="none" stroke="${lightOf(c)}" stroke-width="${f(Math.max(1.8, r * 0.2))}" stroke-linecap="round" opacity=".95"/>`
}

/** A braid along a centerline: interlocking leaf-shaped plaits, tied at the end. */
function braid(src: Src, w0: number, w1: number, segments: number, paint: HairPaint, hair: Hair, k = 0): string {
  const line = lineOf(src)
  let out = ''
  const fill = paint.fill(k)
  const c = paint.color(k)
  const groove = shadowOf(c, 0.3)
  out += `<path d="${ribbon(src, (t) => (w0 + (w1 - w0) * t) * 0.92, 0, 1, 16)}" fill="${paint.back(k)}" stroke="${hair.line}" stroke-width="2.2"/>`
  for (let i = segments - 1; i >= 0; i--) {
    const t = (i + 0.5) / segments
    const p = line.at(t)
    const d = line.dir(t)
    const w = w0 + (w1 - w0) * t
    const side = i % 2 === 0 ? 1 : -1
    const ang = (Math.atan2(d[1], d[0]) * 180) / Math.PI + side * 34
    const a: P = line.at(Math.max(0, t - 0.5 / segments))
    const b: P = line.at(Math.min(1, t + 0.5 / segments))
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * 2.3
    const off: P = [p[0] - d[1] * side * w * 0.18, p[1] + d[0] * side * w * 0.18]
    const hw = w * 0.5
    out += `<g transform="translate(${f(off[0])} ${f(off[1])}) rotate(${f(ang)})">
      <path d="M${f(-L / 2)} 0C${f(-L / 3)} ${f(-hw)} ${f(L / 4)} ${f(-hw * 1.05)} ${f(L / 2)} 0C${f(L / 4)} ${f(hw * 1.05)} ${f(-L / 3)} ${f(hw)} ${f(-L / 2)} 0Z" fill="${fill}" stroke="${hair.line}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M${f(-L / 3)} ${f(hw * 0.35)}Q${f(0)} ${f(hw * 0.62)} ${f(L / 3)} ${f(hw * 0.3)}" stroke="${groove}" stroke-width="${f(Math.max(1.5, w * 0.08))}" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M${f(-L / 4)} ${f(-hw * 0.38)}Q${f(0)} ${f(-hw * 0.68)} ${f(L / 4)} ${f(-hw * 0.4)}" stroke="${lightOf(c)}" stroke-width="${f(w * 0.13)}" fill="none" stroke-linecap="round"/>
    </g>`
  }
  return out
}

/* ─────────────────────────── extras ─────────────────────────── */

function flower(x: number, y: number, r: number, petal: string, center: string, line: string): string {
  let petals = ''
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180)
    const px = x + Math.cos(a) * r * 0.55
    const py = y + Math.sin(a) * r * 0.55
    petals += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(r * 0.5)}" fill="${petal}" stroke="${line}" stroke-width="1.4"/>`
  }
  return `<g>${petals}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.34)}" fill="${center}" stroke="${line}" stroke-width="1.2"/><circle cx="${f(x - r * 0.1)}" cy="${f(y - r * 0.12)}" r="${f(r * 0.11)}" fill="#ffffff" opacity=".8"/></g>`
}

function tinyBow(x: number, y: number, s: number, color: string, ang = 0): string {
  const line = darken(color, 0.45)
  const light = lighten(color, 0.55)
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${ang}) scale(${f(s / 20)})">
    <path d="M-3 4L-9 20L-3 17L0 22L2 6Z" fill="${darken(color, 0.12)}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M3 4L10 19L4 17L1 22L-1 6Z" fill="${darken(color, 0.12)}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M0 0C-6 -10 -20 -12 -20 -2C-20 8 -6 6 0 0Z" fill="${color}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M0 0C6 -10 20 -12 20 -2C20 8 6 6 0 0Z" fill="${color}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-15 -4C-14 -7 -10 -8 -7 -6" stroke="${light}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M15 -4C14 -7 10 -8 7 -6" stroke="${light}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="0" rx="4.5" ry="5" fill="${color}" stroke="${line}" stroke-width="2"/>
  </g>`
}

function extras(kind: HairExtra | undefined, spots: P[], hair: Hair, scale = 1): string {
  if (!kind || kind === 'ribbons' || kind === 'bow') return ''
  let out = ''
  spots.forEach(([x, y], i) => {
    const s = scale * (i % 3 === 0 ? 1.15 : i % 3 === 1 ? 0.85 : 1)
    if (kind === 'flowers') {
      const petal = i % 2 === 0 ? '#ffffff' : '#fff27a'
      const center = i % 2 === 0 ? '#ffc93c' : '#ff8cc6'
      out += flower(x, y, 11 * s, petal, center, darken(hair.root, 0.35))
    } else if (kind === 'sparkles') {
      out += `<path d="${sparklePath(x, y, 9 * s)}" fill="#ffffff" stroke="${darken(hair.root, 0.15)}" stroke-width="1" opacity=".95"/><circle cx="${f(x + 9 * s)}" cy="${f(y - 7 * s)}" r="${f(1.8 * s)}" fill="#ffffff"/>`
    } else if (kind === 'stars') {
      out += `<path d="${starPath(x, y, 7.5 * s)}" fill="#ffe680" stroke="#c9952a" stroke-width="1" /><circle cx="${f(x - 2 * s)}" cy="${f(y - 2 * s)}" r="${f(1.4 * s)}" fill="#ffffff" opacity=".9"/>`
    }
  })
  return out
}

/* ─────────────────────────── manes ─────────────────────────── */

interface ManeShape {
  /** inside .lh-mane (over the neck, behind the head) */
  mane: string
  /** inside .lh-forelock (over the forehead) */
  forelock: string
}

function locksOf(set: [Src, number, number?][], back = false, tip = 3): LockSpec[] {
  return set.map(([c, w, k]) => ({ c, w, k, back, tip }))
}

const FLOW_BACK: [Src, number, number?][] = [
  [sp([204, 80], [250, 62], [294, 92], [310, 138], [324, 160]), 52, 0],
  [sp([250, 122], [296, 132], [318, 178], [318, 220], [334, 238]), 50, 3],
]
const FLOW_FRONT: [Src, number, number?][] = [
  [sp([270, 182], [294, 204], [302, 238], [296, 272], [310, 292]), 36, 5],
  [sp([256, 140], [284, 160], [298, 198], [296, 238], [314, 258]), 44, 4],
  [sp([236, 104], [270, 118], [290, 158], [290, 198], [308, 216]), 46, 2],
  [sp([206, 82], [244, 78], [274, 106], [286, 146], [302, 168]), 48, 0],
  [sp([222, 96], [244, 128], [242, 164], [252, 196]), 32, 1],
  [sp([246, 132], [264, 164], [260, 198], [270, 228]), 28, 3],
]
const FLOW_FORE: [Src, number, number?][] = [
  [sp([204, 88], [192, 94], [184, 102], [184, 112]), 20, 2],
  [sp([208, 86], [190, 70], [162, 70], [142, 90], [134, 118]), 34, 0],
]

function flowingMane(paint: HairPaint, hair: Hair, wavy: boolean): ManeShape & { spots: P[]; foreSpots: P[] } {
  const bend = (s: [Src, number, number?][], amp: number, waves: number): [Src, number, number?][] =>
    s.map(([c, w, k], i) => [wave(c, amp, waves, i * 0.9), w, k])
  const back = wavy ? bend(FLOW_BACK, 8, 1.6) : FLOW_BACK
  const front = wavy ? bend(FLOW_FRONT, 7, 1.6) : FLOW_FRONT
  const fore = wavy ? bend(FLOW_FORE, 5, 1.2) : FLOW_FORE
  const tip = wavy ? 7 : 3
  return {
    mane: renderLocks(paint, hair, [...locksOf(back, true, tip), ...locksOf(front, false, tip)]),
    forelock: renderLocks(paint, hair, locksOf(fore, false, tip)),
    spots: [
      [282, 140],
      [298, 196],
      [300, 250],
      [246, 158],
      [264, 214],
      [272, 106],
    ],
    foreSpots: [[150, 76]],
  }
}

function shortMane(paint: HairPaint, hair: Hair): ManeShape & { spots: P[]; foreSpots: P[] } {
  // a cropped, fluffy mane: one band along the crest with a row of rounded puffs
  const lobes = 6
  const shape = (dx: number, dy: number, grow: number) => {
    const inner: P[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const p = crestAt(t)
      const o = crestOut(t)
      inner.push([p[0] - o[0] * 13 + dx, p[1] - o[1] * 13 + dy])
    }
    let d = `M${pt(inner[0])}`
    for (let i = 0; i < lobes; i++) {
      const t0 = i / lobes
      const t1 = (i + 1) / lobes
      const a = crestAt(t0)
      const b = crestAt(t1)
      const oa = crestOut(t0)
      const ob = crestOut(t1)
      const da = dir(CREST, t0)
      const L = (34 - t0 * 12) * grow
      const A: P = [a[0] + oa[0] * 6 + dx, a[1] + oa[1] * 6 + dy]
      const B: P = [b[0] + ob[0] * 6 + dx, b[1] + ob[1] * 6 + dy]
      if (i === 0) d += `L${pt(A)}`
      // each puff leans back a little
      const c1: P = [A[0] + oa[0] * L + da[0] * 4, A[1] + oa[1] * L + da[1] * 4]
      const c2: P = [B[0] + ob[0] * L + da[0] * 14, B[1] + ob[1] * L + da[1] * 14]
      d += `C${pt(c1)} ${pt(c2)} ${pt(B)}`
    }
    d += `L${pt(inner[inner.length - 1])}${through(inner.slice().reverse())}Z`
    return d
  }
  const c = paint.color(0)
  let strands = ''
  for (let i = 0; i < lobes; i++) {
    const t = (i + 0.45) / lobes
    const p = crestAt(t)
    const o = crestOut(t)
    const d = dir(CREST, t)
    const L = 34 - t * 12
    const a: P = [p[0] + o[0] * 4 - d[0] * 5, p[1] + o[1] * 4 - d[1] * 5]
    const b: P = [p[0] + o[0] * (L * 0.6) + d[0] * 2, p[1] + o[1] * (L * 0.6) + d[1] * 2]
    strands += `<path d="${ribbon(sp(a, [(a[0] + b[0]) / 2 - d[0] * 3, (a[1] + b[1]) / 2 - d[1] * 3], b), strandW(6))}" fill="${lightOf(c)}" opacity=".85"/>`
    if (i > 0) {
      const q = crestAt(i / lobes)
      const oq = crestOut(i / lobes)
      strands += `<path d="M${pt([q[0] - oq[0] * 4, q[1] - oq[1] * 4])}Q${pt([q[0] + oq[0] * 10 + 3, q[1] + oq[1] * 10])} ${pt([q[0] + oq[0] * 16 + 6, q[1] + oq[1] * 16 + 3])}" stroke="${shadowOf(c, 0.35)}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75"/>`
    }
  }
  const mane = `<path d="${shape(9, 5, 1.06)}" fill="${paint.back(0)}" stroke="${hair.line}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${shape(0, 0, 1)}" fill="${paint.fill(0)}" stroke="${hair.line}" stroke-width="2.4" stroke-linejoin="round"/>${strands}`
  const fore: LockSpec[] = [
    { c: sp([210, 88], [196, 72], [182, 64]), w: 28, tip: 10, k: 1, belly: 0.2 },
    { c: sp([206, 90], [188, 82], [170, 82]), w: 28, tip: 10, k: 2, belly: 0.2 },
    { c: sp([202, 94], [186, 96], [172, 104]), w: 22, tip: 8, k: 3, belly: 0.2 },
  ]
  return { mane, forelock: renderLocks(paint, hair, fore), spots: [], foreSpots: [] }
}

function spikeMane(paint: HairPaint, hair: Hair, fire: boolean): ManeShape & { spots: P[]; foreSpots: P[] } {
  const back: LockSpec[] = []
  const front: LockSpec[] = []
  const inner: string[] = []
  const n = fire ? 7 : 8
  const lens = fire ? [84, 94, 90, 82, 72, 60, 46] : [74, 84, 84, 78, 70, 60, 50, 40]
  const hot = hair.colors[hair.colors.length - 1]
  for (let i = n - 1; i >= 0; i--) {
    const t = 0.02 + (i / (n - 1)) * 0.94
    const p = crestAt(t)
    const o = crestOut(t)
    const up: P = fire ? [0.62, -0.78] : [0.34, -0.94]
    const dv: P = [o[0] * 0.4 + up[0] * 0.6, o[1] * 0.4 + up[1] * 0.6]
    const l = Math.hypot(dv[0], dv[1])
    const dd: P = [dv[0] / l, dv[1] / l]
    const L = lens[i]
    const root: P = [p[0] - o[0] * 14, p[1] - o[1] * 14]
    const tipP: P = [p[0] + dd[0] * L + (fire ? 10 : 6), p[1] + dd[1] * L + (fire ? 6 : 2)]
    const mid: P = [p[0] + dd[0] * L * 0.5, p[1] + dd[1] * L * 0.5]
    if (fire) {
      const c = wave(sp(root, mid, tipP), 7, 1.1, i * 0.7)
      back.push({ c: wave(sp(add(root, 10, 6), add(mid, 14, 8), add(tipP, 16, 12)), 6, 1.1, i), w: 32, back: true, tip: 0, belly: 0.5 })
      front.push({ c, w: 32, k: i, tip: 0, belly: 0.5, shine: false })
      const ir: P = [p[0] - o[0] * 4, p[1] - o[1] * 4]
      const it: P = [p[0] + dd[0] * L * 0.6 + 6, p[1] + dd[1] * L * 0.6 + 3]
      inner.push(`<path d="${ribbon(wave(sp(ir, [(ir[0] + it[0]) / 2, (ir[1] + it[1]) / 2], it), 4, 1.1, i * 0.7 + 0.4), lockW(15, 0, 0.55))}" fill="${lighten(hot, 0.35)}" opacity=".95"/>`)
    } else {
      back.push({ c: sp(add(root, 10, 6), add(mid, 12, 8), add(tipP, 12, 10)), w: 28, back: true, tip: 0, belly: 0 })
      front.push({ c: sp(root, mid, tipP), w: 28, k: i, tip: 0, belly: 0 })
    }
  }
  let mane = renderLocks(paint, hair, back)
  // front spikes interleaved with their inner flame so each tongue keeps its glow
  for (let i = 0; i < front.length; i++) mane += renderLocks(paint, hair, [front[i]]) + (inner[i] ?? '')
  const fore: LockSpec[] = fire
    ? [
        { c: wave(sp([210, 88], [196, 62], [188, 30]), 5, 1.1), w: 28, k: 1, belly: 0.5, shine: false },
        { c: wave(sp([204, 90], [182, 72], [160, 52]), 5, 1.1, 1), w: 26, k: 2, belly: 0.5, shine: false },
      ]
    : [
        { c: sp([210, 88], [200, 62], [196, 28]), w: 28, k: 1, tip: 0, belly: 0 },
        { c: sp([204, 92], [186, 70], [170, 46]), w: 26, k: 2, tip: 0, belly: 0 },
      ]
  let forelock = renderLocks(paint, hair, fore)
  if (fire) {
    forelock += `<path d="${ribbon(wave(sp([208, 86], [198, 68], [192, 46]), 3, 1.1), lockW(13, 0, 0.55))}" fill="${lighten(hot, 0.35)}"/>`
    forelock += `<path d="${ribbon(wave(sp([202, 88], [188, 76], [172, 62]), 3, 1.1, 1), lockW(12, 0, 0.55))}" fill="${lighten(hot, 0.35)}"/>`
  }
  return { mane, forelock, spots: [], foreSpots: [] }
}

function curlyMane(paint: HairPaint, hair: Hair): ManeShape & { spots: P[]; foreSpots: P[] } {
  const c0 = paint.color(0)
  let back = ''
  let front = ''
  const spots: P[] = []
  const n = 8
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const p = crestAt(t)
    const o = crestOut(t)
    const r = 24 - t * 4
    back += curl(p[0] + o[0] * r * 0.9 + 6, p[1] + o[1] * r * 0.9 + 4, r + 2, paint.back(i), hair.line, c0, 1, true)
  }
  // dangling ringlets at the bottom of the mane
  const ringlets: [P, number][] = [
    [[312, 238], 16],
    [[318, 262], 13],
    [[300, 270], 15],
    [[304, 294], 12],
  ]
  for (const [p, r] of ringlets) back += curl(p[0], p[1], r, paint.back(1), hair.line, c0, 1, true)
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const p = crestAt(t)
    const o = crestOut(t)
    const r = 22 - t * 4
    const q: P = [p[0] + o[0] * r * 0.5, p[1] + o[1] * r * 0.5]
    front += curl(q[0], q[1], r, paint.fill(i), hair.line, paint.color(i), i % 2 ? 1 : -1)
    if (i % 2 === 0) spots.push([q[0] + 4, q[1] - 4])
  }
  for (const [p, r] of ringlets) front += curl(p[0] - 4, p[1] - 2, r - 2, paint.fill(2), hair.line, paint.color(2), 1)
  // inner row over the neck
  for (let i = 1; i < n - 1; i += 1) {
    const t = i / (n - 1)
    const p = crestAt(t)
    const o = crestOut(t)
    const r = 17 - t * 3
    front += curl(p[0] - o[0] * 14, p[1] - o[1] * 14 + 4, r, paint.fill(i + 3), hair.line, paint.color(i + 3), i % 2 ? -1 : 1)
  }
  const foreCurls: [number, number, number][] = [
    [208, 80, 15],
    [190, 76, 16],
    [170, 80, 15],
    [152, 92, 13],
    [140, 110, 11],
  ]
  let forelock = ''
  foreCurls.forEach(([x, y, r], i) => {
    forelock += curl(x, y, r, paint.fill(i), hair.line, paint.color(i), i % 2 ? 1 : -1)
  })
  return { mane: back + front, forelock, spots, foreSpots: [[176, 70]] }
}

function braidsMane(paint: HairPaint, hair: Hair, ribbons: boolean): ManeShape & { spots: P[]; foreSpots: P[] } {
  // a French braid running down the crest, and one plait hanging over the neck
  let mane = ''
  const crestBraid: P[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const p = crestAt(t)
    const o = crestOut(t)
    crestBraid.push([p[0] + o[0] * 8, p[1] + o[1] * 8])
  }
  const last = crestBraid[crestBraid.length - 1]
  crestBraid.push([last[0] + 10, last[1] + 22])
  const hang = sp([216, 98], [234, 130], [238, 168], [236, 200])
  mane += braid(sp(...crestBraid), 40, 30, 9, paint, hair, 0)
  mane += braid(hang, 30, 24, 5, paint, hair, 1)
  const ends: [P, number, string][] = [
    [[last[0] + 12, last[1] + 26], 0, '#ff6fae'],
    [[236, 202], 1, '#ffd23f'],
  ]
  for (const [end, k, bow] of ends) {
    mane += renderLocks(paint, hair, [
      { c: sp(add(end, -3, 2), add(end, -8, 15), add(end, -12, 25)), w: 15, k, tip: 3 },
      { c: sp(add(end, 0, 3), add(end, 0, 17), add(end, 1, 28)), w: 15, k, tip: 3 },
      { c: sp(add(end, 3, 2), add(end, 8, 15), add(end, 12, 24)), w: 15, k, tip: 3 },
    ])
    mane += ribbons ? tinyBow(end[0], end[1] + 1, 22, bow, -10) : `<ellipse cx="${f(end[0])}" cy="${f(end[1])}" rx="11" ry="5.5" fill="${shadowOf(hair.root, 0.4)}"/>`
  }
  const fore: LockSpec[] = [
    { c: sp([208, 84], [188, 68], [160, 70], [144, 92], [140, 114]), w: 32, k: 0, tip: 4 },
    { c: sp([202, 88], [186, 94], [176, 106], [176, 120]), w: 20, k: 1, tip: 4 },
  ]
  return { mane, forelock: renderLocks(paint, hair, fore), spots: [], foreSpots: [] }
}

function maneShape(cx: Ctx, mane: ManeItem, name = 'mane'): ManeShape {
  const hair = hairOf(mane.colors, mane.style)
  const flow: Flow = mane.style === 'mohawk' || mane.style === 'spiky' ? 'up' : mane.style === 'short' ? 'out' : 'down'
  const paint = hairPaint(cx, name, hair, flow)
  const shape =
    mane.style === 'flowing' || mane.style === 'wavy'
      ? flowingMane(paint, hair, mane.style === 'wavy')
      : mane.style === 'short'
        ? shortMane(paint, hair)
        : mane.style === 'mohawk' || mane.style === 'spiky'
          ? spikeMane(paint, hair, mane.style === 'spiky')
          : mane.style === 'curly'
            ? curlyMane(paint, hair)
            : braidsMane(paint, hair, mane.extra === 'ribbons')
  return {
    mane: shape.mane + extras(mane.extra, shape.spots, hair),
    forelock: shape.forelock + extras(mane.extra, shape.foreSpots, hair, 0.9),
  }
}

/* ─────────────────────────── tails ─────────────────────────── */

/* Tail coordinates are relative to the dock. */
const TAIL_GROW: Record<TailStyle, number> = { flowing: 1.14, wavy: 1.14, curly: 1.12, braid: 1.12, pompom: 1.18, fountain: 1 }
const TAIL_FLOW_BACK: [Src, number, number?][] = [[sp([-2, -6], [38, -20], [62, 18], [58, 68], [70, 94]), 50, 0]]
const TAIL_FLOW_FRONT: [Src, number, number?][] = [
  [sp([-4, -8], [36, -28], [62, -2], [68, 40], [78, 58]), 34, 0],
  [sp([-2, -6], [34, -8], [50, 30], [42, 74], [54, 98]), 46, 1],
  [sp([0, 0], [26, 16], [32, 54], [20, 88], [30, 104]), 38, 2],
  [sp([-2, -4], [22, 6], [26, 38], [12, 70]), 26, 3],
]

function tailShape(cx: Ctx, tail: TailItem, name = 'tail'): string {
  const hair = hairOf(tail.colors, tail.style)
  const paint = hairPaint(cx, name, hair, tail.style === 'fountain' ? 'up' : 'right')
  let out = ''
  let spots: P[] = [
    [42, 18],
    [48, 62],
    [26, 86],
    [64, 40],
  ]
  if (tail.style === 'flowing' || tail.style === 'wavy') {
    const wavy = tail.style === 'wavy'
    const bend = (s: [Src, number, number?][], amp: number): [Src, number, number?][] => s.map(([c, w, k], i) => [wave(c, amp, 1.6, i * 1.1), w, k])
    out = renderLocks(paint, hair, [
      ...locksOf(wavy ? bend(TAIL_FLOW_BACK, 8) : TAIL_FLOW_BACK, true, wavy ? 8 : 3),
      ...locksOf(wavy ? bend(TAIL_FLOW_FRONT, 7) : TAIL_FLOW_FRONT, false, wavy ? 8 : 3),
    ])
  } else if (tail.style === 'curly') {
    const c0 = paint.color(0)
    const chains: [P, number][][] = [
      [[[14, -4], 19], [[38, 8], 17], [[58, 30], 16], [[68, 58], 14]],
      [[[8, 6], 19], [[26, 34], 17], [[34, 62], 16], [[34, 90], 14]],
      [[[2, 12], 16], [[8, 42], 15], [[6, 70], 13]],
    ]
    for (const chain of chains) for (const [p, r] of chain) out += curl(p[0] + 5, p[1] + 3, r + 2, paint.back(0), hair.line, c0, 1, true)
    chains.forEach((chain, j) => {
      for (let i = chain.length - 1; i >= 0; i--) {
        const [p, r] = chain[i]
        out += curl(p[0], p[1], r, paint.fill(i + j), hair.line, paint.color(i + j), (i + j) % 2 ? 1 : -1)
      }
    })
    spots = [
      [38, 6],
      [34, 60],
      [68, 54],
    ]
  } else if (tail.style === 'braid') {
    const base = sp([-4, -6], [30, -10], [50, 18], [48, 60])
    out += renderLocks(paint, hair, [{ c: sp([-8, -8], [20, -14], [40, 2]), w: 32, back: true, tip: 12 }])
    out += braid(base, 32, 22, 7, paint, hair, 0)
    const end: P = [48, 62]
    out += renderLocks(paint, hair, [
      { c: sp(add(end, -4, 0), add(end, -12, 18), add(end, -22, 34)), w: 18, k: 0, tip: 3 },
      { c: sp(add(end, 0, 2), add(end, 0, 20), add(end, 2, 38)), w: 20, k: 0, tip: 3 },
      { c: sp(add(end, 4, 0), add(end, 14, 16), add(end, 24, 32)), w: 18, k: 0, tip: 3 },
    ])
    if (tail.extra === 'bow') out += tinyBow(end[0], end[1] - 2, 32, '#ff3d8b', 8)
    else out += `<ellipse cx="${end[0]}" cy="${end[1]}" rx="11" ry="5" fill="${shadowOf(hair.root, 0.4)}"/>`
    spots = []
  } else if (tail.style === 'pompom') {
    const c0 = paint.color(0)
    const [px, py] = [34, 10]
    out += `<path d="${ribbon(sp([-6, -6], [10, -4], [24, 2]), lockW(28, 12, 0))}" fill="${paint.back(0)}" stroke="${hair.line}" stroke-width="2.4"/>`
    out += `<path d="${fluffPath(px + 4, py + 4, 40, 12, 0.17, 0.2)}" fill="${paint.back(0)}" stroke="${hair.line}" stroke-width="2.4" stroke-linejoin="round"/>`
    out += `<path d="${fluffPath(px, py, 38, 12, 0.17)}" fill="${cx.radial(`${name}-puff`, [[0, lighten(hair.tip, 0.5)], [0.5, hair.tip], [1, hair.root]], 0.36, 0.3, 0.8)}" stroke="${hair.line}" stroke-width="2.4" stroke-linejoin="round"/>`
    const tufts: [number, number, number][] = [
      [-16, -14, 11],
      [12, -18, 10],
      [20, 8, 10],
      [-8, 18, 10],
      [2, -2, 9],
      [-22, 6, 8],
    ]
    for (const [dx, dy, r] of tufts) {
      out += `<path d="M${f(px + dx - r)} ${f(py + dy + 2)}Q${f(px + dx)} ${f(py + dy - r)} ${f(px + dx + r)} ${f(py + dy + 2)}" stroke="${shadowOf(c0, 0.2)}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/>`
    }
    out += `<ellipse cx="${px - 14}" cy="${py - 18}" rx="12" ry="7" fill="#ffffff" opacity=".7" transform="rotate(-30 ${px - 14} ${py - 18})"/><circle cx="${px + 4}" cy="${py - 26}" r="3" fill="#ffffff" opacity=".8"/>`
    spots = [
      [14, -12],
      [52, 18],
    ]
  } else {
    // fountain: rising from the dock and spilling over in arcs
    const arcs: [Src, number, number?][] = [
      [sp([-4, -8], [0, -48], [28, -76], [62, -66], [78, -32]), 30, 0],
      [sp([-4, -6], [8, -38], [34, -52], [58, -36], [66, 0]), 30, 1],
      [sp([-2, -4], [14, -26], [36, -30], [50, -8], [50, 28]), 28, 2],
      [sp([-4, -8], [-8, -48], [8, -80], [38, -92], [58, -80]), 26, 3],
    ]
    out = renderLocks(paint, hair, [
      ...arcs.map(([c, w], i) => ({ c: sp(...(c as P[]).map((p) => add(p, 6, 6))), w: w + 4, back: true, tip: 4, k: i })),
      ...arcs.map(([c, w, k]) => ({ c, w, k, tip: 4 })),
    ])
    const drops: [number, number, number][] = [
      [74, -8, 4],
      [54, 44, 3.5],
      [80, 16, 3],
      [64, -52, 3],
    ]
    for (const [x, y, r] of drops) out += `<path d="M${x} ${y - r * 1.6}Q${x + r} ${y - r * 0.2} ${x} ${y + r}Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.6}Z" fill="${lighten(hair.tip, 0.4)}" stroke="${hair.line}" stroke-width="1.2"/>`
    spots = [
      [36, -72],
      [58, -30],
      [42, 0],
    ]
  }
  const grow = TAIL_GROW[tail.style]
  return `<g transform="translate(${DOCK[0]} ${DOCK[1]})${grow === 1 ? '' : ` scale(${grow})`}">${out}${extras(tail.extra, spots, hair)}</g>`
}

/* ─────────────────────────── clips ─────────────────────────── */

/** Every clip is drawn centred on 0,0, about 46 units across. */
function clipShape(cx: Ctx, clip: ClipItem, name: string): string {
  const [c0, c1, c2] = clip.colors
  const line = darken(c0, 0.5)
  const gloss = (x: number, y: number, rx: number, ry: number, a = -30) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity=".75" transform="rotate(${a} ${x} ${y})"/>`
  const ball = (id: string, c: string) => cx.radial(`${name}-${id}`, [[0, lighten(c, 0.5)], [0.5, c], [1, darken(c, 0.18)]], 0.35, 0.3, 0.75)
  const leafLine = darken(c1 ?? '#4caf50', 0.45)
  const leaf = (x: number, y: number, ang: number, s: number, c: string) =>
    `<path transform="translate(${x} ${y}) rotate(${ang}) scale(${s})" d="M0 0C4 -7 13 -9 20 -6C14 0 6 4 0 0Z" fill="${c}" stroke="${darken(c, 0.45)}" stroke-width="1.8" stroke-linejoin="round"/>`
  const shape = clip.shape as ClipShape
  switch (shape) {
    case 'strawberry': {
      let seeds = ''
      const sd: P[] = [
        [-9, -2],
        [0, -4],
        [9, -2],
        [-5, 6],
        [5, 6],
        [0, 14],
        [-12, 6],
        [12, 6],
      ]
      for (const [x, y] of sd) seeds += `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#fff3a6"/>`
      return `<path d="M0 22C-14 16 -22 2 -20 -8C-18 -16 -8 -16 0 -14C8 -16 18 -16 20 -8C22 2 14 16 0 22Z" fill="${ball('berry', c0)}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>
        ${seeds}${gloss(-10, -6, 4, 6.5)}
        <path d="M0 -12L-12 -18L-5 -16L-10 -24L-1 -18L0 -27L3 -18L11 -23L6 -16L13 -17Z" fill="${c1}" stroke="${leafLine}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M0 -20C0 -24 1 -27 4 -29" stroke="${leafLine}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`
    }
    case 'orange': {
      let dots = ''
      for (const [x, y] of [
        [6, -4],
        [10, 4],
        [2, 10],
        [-8, 8],
        [12, -9],
        [-2, 2],
      ] as P[])
        dots += `<circle cx="${x}" cy="${y}" r="1.2" fill="${darken(c0, 0.2)}" opacity=".6"/>`
      return `<circle cx="0" cy="3" r="19" fill="${ball('fruit', c0)}" stroke="${line}" stroke-width="2.4"/>${dots}${gloss(-8, -5, 5, 7.5)}
        <path d="M0 -15C0 -19 1 -22 3 -24" stroke="${leafLine}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        ${leaf(1, -18, -18, 1, c1)}${leaf(-1, -18, 200, 0.75, darken(c1, 0.08))}
        <circle cx="0" cy="-15.5" r="2.6" fill="${darken(c1, 0.2)}"/>`
    }
    case 'blueberry': {
      const berry = (x: number, y: number, r: number) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${ball('berry', c0)}" stroke="${line}" stroke-width="2.2"/>${gloss(x - r * 0.4, y - r * 0.38, r * 0.22, r * 0.34)}<path d="M${x - r * 0.28} ${y - r * 0.55}L${x} ${y - r * 0.32}L${x + r * 0.28} ${y - r * 0.55}M${x} ${y - r * 0.32}L${x} ${y - r * 0.68}" stroke="${darken(c0, 0.45)}" stroke-width="1.6" stroke-linecap="round"/>`
      return `${leaf(-2, -12, -150, 1.05, c1)}${leaf(2, -12, -30, 1.05, darken(c1, 0.06))}
        ${berry(-10, 4, 12)}${berry(11, 6, 11)}${berry(0, -6, 12.5)}`
    }
    case 'broccoli': {
      const top = c0
      const stalk = lighten(c0, 0.45)
      return `<path d="M-7 4L-9 22C-4 25 4 25 9 22L7 4Z" fill="${stalk}" stroke="${darken(c0, 0.5)}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M-1 8L-2 20M3 9L4 19" stroke="${darken(stalk, 0.15)}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="${fluffPath(-11, -4, 10, 7, 0.22, 0.3)}" fill="${ball('flor', c1 ?? top)}" stroke="${darken(c0, 0.5)}" stroke-width="2"/>
        <path d="${fluffPath(11, -4, 10, 7, 0.22, 0.7)}" fill="${ball('flor', c1 ?? top)}" stroke="${darken(c0, 0.5)}" stroke-width="2"/>
        <path d="${fluffPath(0, -11, 13, 8, 0.2)}" fill="${ball('flor2', top)}" stroke="${darken(c0, 0.5)}" stroke-width="2"/>
        <circle cx="-4" cy="-15" r="2.4" fill="${lighten(top, 0.55)}"/><circle cx="4" cy="-9" r="2" fill="${lighten(top, 0.45)}"/><circle cx="-12" cy="-6" r="1.8" fill="${lighten(top, 0.5)}"/><circle cx="12" cy="-6" r="1.8" fill="${lighten(top, 0.5)}"/>`
    }
    case 'bow':
      return tinyBow(0, -2, 25, c0, 0)
    case 'daisy': {
      let petals = ''
      for (let i = 0; i < 10; i++) {
        petals += `<ellipse cx="0" cy="-12" rx="5.2" ry="10" fill="${c0}" stroke="#c7b9d6" stroke-width="1.6" transform="rotate(${i * 36})"/>`
      }
      return `${petals}<circle cx="0" cy="0" r="8.5" fill="${ball('center', c1)}" stroke="${darken(c1, 0.4)}" stroke-width="2"/><circle cx="-2.5" cy="-3" r="2.4" fill="#ffffff" opacity=".7"/>`
    }
    case 'heart':
      return `<path d="${heartPath(0, 2, 20)}" fill="${ball('heart', c0)}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>${gloss(-9, -6, 4.5, 7, -40)}<circle cx="9" cy="-6" r="2" fill="${c1}" opacity=".9"/>`
    case 'star':
      return `<path d="${starPath(0, 2, 27, 0.52)}" fill="${ball('star', c0)}" stroke="${darken(c0, 0.42)}" stroke-width="2.4" stroke-linejoin="round"/><path d="${starPath(0, 2, 15, 0.52)}" fill="${c1}" opacity=".55"/>${gloss(-7, -6, 3.4, 5.6, -35)}`
    case 'butterfly': {
      const wing = (sx: number) => `<g transform="scale(${sx} 1)">
          <path d="M0 -2C6 -20 22 -24 24 -12C26 -2 14 2 0 0Z" fill="${ball('bw', c0)}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M0 2C10 2 20 6 18 15C15 22 4 18 0 4Z" fill="${ball('bw2', c1)}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>
          <circle cx="14" cy="-11" r="4" fill="${c1}" opacity=".9"/><circle cx="10" cy="10" r="2.6" fill="${c0}" opacity=".8"/>
        </g>`
      return `${wing(1)}${wing(-1)}
        <ellipse cx="0" cy="2" rx="3.4" ry="12" fill="${darken(c0, 0.5)}"/>
        <path d="M-1 -9C-3 -15 -6 -18 -9 -19M1 -9C3 -15 6 -18 9 -19" stroke="${darken(c0, 0.5)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <circle cx="-9" cy="-19" r="2" fill="${darken(c0, 0.5)}"/><circle cx="9" cy="-19" r="2" fill="${darken(c0, 0.5)}"/>`
    }
    case 'crown': {
      const gold = ball('gold', c0)
      const gl = darken(c0, 0.45)
      return `<path d="M-21 12L-23 -12L-11 -1L0 -18L11 -1L23 -12L21 12Z" fill="${gold}" stroke="${gl}" stroke-width="2.4" stroke-linejoin="round"/>
        <rect x="-22" y="8" width="44" height="9" rx="4" fill="${gold}" stroke="${gl}" stroke-width="2.4"/>
        <circle cx="0" cy="12.5" r="3.6" fill="${c1}" stroke="${darken(c1, 0.4)}" stroke-width="1.4"/><circle cx="-12" cy="12.5" r="2.4" fill="#7fd6ff"/><circle cx="12" cy="12.5" r="2.4" fill="#7fd6ff"/>
        <circle cx="-23" cy="-13" r="3.4" fill="${c1}" stroke="${gl}" stroke-width="1.4"/><circle cx="0" cy="-19" r="3.6" fill="${c1}" stroke="${gl}" stroke-width="1.4"/><circle cx="23" cy="-13" r="3.4" fill="${c1}" stroke="${gl}" stroke-width="1.4"/>
        <path d="M-16 4L-17 -6M-4 2L-1 -8" stroke="#fff6c8" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`
    }
    case 'wreath': {
      let out = ''
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const x = Math.cos(a) * 16
        const y = Math.sin(a) * 16
        out += `<path transform="translate(${f(x)} ${f(y)}) rotate(${f((a * 180) / Math.PI + 100)})" d="M0 0C3 -5 9 -6 13 -4C9 1 4 3 0 0Z" fill="${c2}" stroke="${darken(c2, 0.45)}" stroke-width="1.4"/>`
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        out += flower(Math.cos(a) * 17, Math.sin(a) * 17, 9.5, i % 2 ? c1 : c0, i % 2 ? '#ff8fc4' : '#ffd23f', darken(c0, 0.45))
      }
      return out
    }
    case 'rainbow': {
      let arcs = ''
      clip.colors.forEach((c, i) => {
        const r = 22 - i * 3.2
        arcs += `<path d="M${-r} 6A${r} ${r} 0 0 1 ${r} 6" stroke="${c}" stroke-width="3.6" fill="none"/>`
      })
      const cloud = (x: number) => `<path d="${fluffPath(x, 8, 7.5, 6, 0.26)}" fill="#ffffff" stroke="#b7b2d6" stroke-width="1.8"/>`
      return `<path d="M-23.8 6A23.8 23.8 0 0 1 23.8 6L4.2 6A4.2 4.2 0 0 0 -4.2 6Z" fill="none" stroke="#8f7ab8" stroke-width="5.6" stroke-linejoin="round" opacity=".55"/>${arcs}${cloud(-19)}${cloud(19)}`
    }
    case 'cherry':
      return `<path d="M-9 6C-8 -6 -2 -16 4 -21M9 8C8 -4 6 -14 4 -21" stroke="${darken(c1, 0.35)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        ${leaf(4, -21, -10, 0.95, c1)}
        <circle cx="-9" cy="10" r="10.5" fill="${ball('ch', c0)}" stroke="${line}" stroke-width="2.2"/>${gloss(-13, 6, 2.6, 4)}
        <circle cx="10" cy="12" r="10.5" fill="${ball('ch', c0)}" stroke="${line}" stroke-width="2.2"/>${gloss(6, 8, 2.6, 4)}`
    case 'shell': {
      let ribs = ''
      for (let i = -3; i <= 3; i++) ribs += `<path d="M0 14L${i * 6.2} ${-15 + Math.abs(i) * 2.2}" stroke="${darken(c0, 0.22)}" stroke-width="1.8" stroke-linecap="round"/>`
      return `<path d="M0 15C-6 15 -14 11 -21 4C-24 -4 -18 -16 -10 -19C-4 -22 4 -22 10 -19C18 -16 24 -4 21 4C14 11 6 15 0 15Z" fill="${ball('shell', c0)}" stroke="${darken(c0, 0.45)}" stroke-width="2.4" stroke-linejoin="round"/>
        ${ribs}
        <path d="M-7 13L-9 19L9 19L7 13Z" fill="${c0}" stroke="${darken(c0, 0.45)}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="0" cy="-2" r="4.5" fill="${cx.radial(`${name}-pearl`, [[0, '#ffffff'], [1, c1]], 0.35, 0.35, 0.7)}" stroke="#d8c8d0" stroke-width="1.2"/>${gloss(-10, -10, 3, 5)}`
    }
  }
}

/** The flower crown is worn as a garland over the head rather than as a clip. */
function wreathOnHead(clip: ClipItem): string {
  const [c0, c1, c2] = clip.colors
  const arc = sp([120, 112], [134, 88], [160, 72], [192, 70], [220, 84], [236, 104])
  const line = lineOf(arc)
  let out = `<path d="M${pt(line.at(0))}${through((arc as P[]).slice())}" stroke="${darken(c2, 0.25)}" stroke-width="4" fill="none" stroke-linecap="round"/>`
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const p = line.at(t)
    const d = line.dir(t)
    const ang = (Math.atan2(d[1], d[0]) * 180) / Math.PI + (i % 2 ? 50 : -50)
    out += `<path transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})" d="M0 0C3 -5 10 -6 14 -4C10 1 4 3 0 0Z" fill="${c2}" stroke="${darken(c2, 0.45)}" stroke-width="1.5"/>`
  }
  const fl: [number, string, string, number][] = [
    [0.06, c1, '#ff8fc4', 9],
    [0.26, c0, '#ffd23f', 11],
    [0.46, c1, '#ff8fc4', 10],
    [0.66, c0, '#ffd23f', 11],
    [0.88, c1, '#ff8fc4', 9],
  ]
  for (const [t, c, m, r] of fl) {
    const p = line.at(t)
    out += flower(p[0], p[1], r, c, m, darken(c0, 0.45))
  }
  return out
}

/* ─────────────────────────── horn and wings ─────────────────────────── */

function hornShape(cx: Ctx, name: string): string {
  // drawn pointing straight up from 0,0 (its base), 66 long, twisted like a seashell
  const pearl = cx.linear(`${name}-pearl`, [[0, '#ffe9a8'], [0.3, '#fff8ee'], [0.68, '#ffd8ef'], [1, '#dcc4ff']], 0, 1, 0, 0)
  const cone = 'M-11 0C-10 -23 -4 -49 0 -66C4 -49 10 -23 11 0Z'
  const clip = cx.clip(`${name}-hclip`, `<path d="${cone}"/>`)
  const ys: number[] = []
  for (let i = 0; i <= 6; i++) ys.push(-64 * Math.pow(i / 6, 0.86) + 2)
  let bands = ''
  for (let i = 0; i < ys.length - 1; i++) {
    const a = ys[i]
    const b = ys[i + 1]
    if (i % 2 === 0) bands += `<path d="M-16 ${f(a + 6)}Q0 ${f(a + 1)} 16 ${f(a - 7)}L16 ${f(b - 7)}Q0 ${f(b + 1)} -16 ${f(b + 6)}Z" fill="#f4b6d8" opacity=".4"/>`
    bands += `<path d="M-16 ${f(a + 6)}Q0 ${f(a + 1)} 16 ${f(a - 7)}" stroke="#e9a43c" stroke-width="2.4" fill="none"/>`
  }
  return `<path d="${cone}" fill="${pearl}"/>
    <g clip-path="${clip}">${bands}<path d="M-5 -6C-4 -23 -2 -40 -0.5 -54" stroke="#ffffff" stroke-width="3.4" fill="none" opacity=".9" stroke-linecap="round"/></g>
    <path d="${cone}" fill="none" stroke="#bf8436" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="0" cy="0" rx="12.5" ry="3.8" fill="#ffd36b" stroke="#bf8436" stroke-width="2"/>
    <path d="${sparklePath(0.5, -68, 6)}" fill="#ffffff" stroke="#e9a43c" stroke-width="1"/>`
}

/** A pastel feathered wing, drawn from its root at 0,0 fanning up and back. */
function wingShape(cx: Ctx, name: string, far: boolean): string {
  const tipFill = cx.linear(`${name}-f1`, far ? [[0, '#efe4ff'], [1, '#bfa9ee']] : [[0, '#ffffff'], [0.5, '#fbe8ff'], [1, '#c9b4ff']], 0, 0, 1, -0.4)
  const midFill = cx.linear(`${name}-f2`, far ? [[0, '#f4ebff'], [1, '#e2b9e6']] : [[0, '#ffffff'], [1, '#ffc8e8']], 0, 0, 1, -0.4)
  const topFill = cx.linear(`${name}-f3`, far ? [[0, '#f7f0ff'], [1, '#d9cff5']] : [[0, '#ffffff'], [1, '#e9f2ff']], 0, 0, 1, -0.4)
  const line = far ? '#9787c6' : '#9f86d2'
  const feather = (root: P, ang: number, len: number, w: number, paint: string) => {
    const a = (ang * Math.PI) / 180
    const tip: P = [root[0] + Math.cos(a) * len, root[1] + Math.sin(a) * len]
    const n: P = [-Math.sin(a), Math.cos(a)]
    const mid: P = [root[0] + Math.cos(a) * len * 0.55 + n[0] * len * 0.07, root[1] + Math.sin(a) * len * 0.55 + n[1] * len * 0.07]
    const c = sp(root, mid, tip)
    return `<path d="${ribbon(c, lockW(w, w * 0.62, 0.12))}" fill="${paint}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/><path d="${ribbon(c, strandW(2), 0.2, 0.8, 8)}" fill="${line}" opacity=".3"/>`
  }
  let out = ''
  for (let i = 4; i >= 0; i--) out += feather([8 + i * 4, -14 + i * 3], -70 + i * 14, 104 - i * 12, 27, tipFill)
  for (let i = 3; i >= 0; i--) out += feather([6 + i * 4, -12 + i * 3], -66 + i * 16, 62 - i * 6, 25, midFill)
  for (let i = 2; i >= 0; i--) out += feather([4 + i * 3, -10 + i * 3], -62 + i * 20, 32, 22, topFill)
  out += `<path d="${blob([[-8, 4], [-4, -26], [14, -40], [28, -24], [22, -2], [8, 8]])}" fill="${topFill}" stroke="${line}" stroke-width="2.2"/>`
  out += `<path d="M2 -22C8 -32 16 -36 24 -34" stroke="#ffffff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".95"/>`
  return out
}

/* ─────────────────────────── coat patterns ─────────────────────────── */

type Area = 'body' | 'neck' | 'head'

const SPOTS: Record<Area, [number, number, number][]> = {
  body: [
    [238, 240, 9],
    [264, 226, 6],
    [290, 246, 10],
    [318, 228, 7],
    [344, 250, 9],
    [314, 276, 7],
    [268, 276, 8],
    [234, 276, 6],
    [350, 228, 5],
    [290, 292, 5],
  ],
  neck: [
    [230, 206, 7],
    [250, 234, 6],
    [218, 230, 4],
  ],
  head: [
    [212, 120, 6],
    [228, 150, 5],
    [204, 190, 4],
  ],
}

function patternMarks(coat: Coat, area: Area): string {
  if (!coat.pattern) return ''
  const pc = coat.patternColor
  const out: string[] = []
  const spots = SPOTS[area]
  switch (coat.pattern) {
    case 'dapples':
      for (const [x, y, r] of spots) out.push(`<circle cx="${x}" cy="${y}" r="${r * 1.1}" fill="${pc}" opacity=".7"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="${coat.body}" opacity=".55"/>`)
      break
    case 'pinto':
      if (area === 'body') {
        out.push(`<path d="${blob([[270, 210], [324, 204], [362, 224], [358, 268], [320, 280], [290, 258], [262, 232]])}" fill="${pc}"/>`)
        out.push(`<path d="${blob([[206, 262], [236, 256], [246, 286], [226, 304], [200, 290]])}" fill="${pc}"/>`)
      } else if (area === 'head') {
        out.push(`<path d="${blob([[196, 84], [238, 104], [244, 150], [214, 162], [198, 128]])}" fill="${pc}"/>`)
      } else {
        out.push(`<path d="${blob([[244, 162], [272, 190], [284, 238], [256, 250], [238, 212]])}" fill="${pc}"/>`)
      }
      break
    case 'stars':
      for (const [x, y, r] of spots) out.push(`<path d="${starPath(x, y, r * 1.05)}" fill="${pc}"/><circle cx="${x - r * 0.2}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#ffffff" opacity=".8"/>`)
      break
    case 'sparkles':
      for (const [x, y, r] of spots) out.push(`<path d="${sparklePath(x, y, r * 1.25)}" fill="${pc}"/><circle cx="${x + r}" cy="${y - r}" r="${r * 0.2}" fill="#ffffff"/>`)
      break
    case 'hearts':
      for (const [x, y, r] of spots) out.push(`<path d="${heartPath(x, y, r * 0.95)}" fill="${pc}" opacity=".92"/>`)
      break
    case 'rainbow':
      if (area === 'body') {
        RAINBOW.forEach((c, i) => {
          const r = 70 - i * 9
          out.push(`<path d="M${296 - r} 314A${r} ${r * 0.92} 0 0 1 ${296 + r} 314" stroke="${c}" stroke-width="9.5" fill="none" opacity=".85"/>`)
        })
      } else if (area === 'head') {
        out.push(`<path d="${starPath(214, 128, 8)}" fill="#ffe066"/>`)
      }
      break
  }
  return out.join('')
}

function legPattern(cx: Ctx, id: LegId, coat: Coat): string {
  if (!coat.pattern) return ''
  const leg = LEGS[id]
  const x = leg.x
  let inner = ''
  if (coat.pattern === 'pinto' && (id === 'br' || id === 'fr')) inner = `<path d="${blob([[x - 20, 296], [x + 8, 290], [x + 20, 312], [x, 326], [x - 20, 314]])}" fill="${coat.patternColor}"/>`
  else if (coat.pattern === 'rainbow') inner = `<rect x="${x - 20}" y="${G - 42}" width="40" height="22" fill="${RAINBOW[['fr', 'fl', 'br', 'bl'].indexOf(id) + 1]}" opacity=".85"/>`
  else if (coat.pattern === 'dapples') inner = `<circle cx="${x - 4}" cy="312" r="5" fill="${coat.patternColor}" opacity=".7"/>`
  else if (coat.pattern === 'stars' || coat.pattern === 'sparkles' || coat.pattern === 'hearts') {
    const r = 5
    inner =
      coat.pattern === 'stars'
        ? `<path d="${starPath(x, 314, r)}" fill="${coat.patternColor}"/>`
        : coat.pattern === 'hearts'
          ? `<path d="${heartPath(x, 314, r)}" fill="${coat.patternColor}"/>`
          : `<path d="${sparklePath(x, 314, r * 1.3)}" fill="${coat.patternColor}"/>`
  }
  if (!inner) return ''
  const clip = cx.clip(`legclip-${id}`, `<path d="${legPath(id)}"/>`)
  return `<g class="lh-pattern" clip-path="${clip}">${inner}</g>`
}

/* ─────────────────────────── parts ─────────────────────────── */

function legPath(id: LegId): string {
  const { x, top, far } = LEGS[id]
  const g = far ? G - 4 : G
  const hw = far ? 16 : 17
  const ankle = g - 22
  const aw = far ? 13 : 14
  return `M${x - hw} ${top}C${x - hw} ${top + 24} ${x - aw} ${ankle - 14} ${x - aw} ${ankle + 2}L${x + aw} ${ankle + 2}C${x + aw} ${ankle - 14} ${x + hw} ${top + 24} ${x + hw} ${top}Z`
}

function legShape(cx: Ctx, id: LegId, coat: Coat): string {
  const { x, top, far } = LEGS[id]
  const g = far ? G - 4 : G
  const hoofTop = g - 22
  const hw = far ? 15 : 16
  const hoof = `M${x - hw} ${hoofTop + 2}C${x - hw - 2} ${g - 6} ${x - hw} ${g} ${x - hw + 7} ${g}L${x + hw - 7} ${g}C${x + hw} ${g} ${x + hw + 2} ${g - 6} ${x + hw} ${hoofTop + 2}C${x + 6} ${hoofTop - 3} ${x - 6} ${hoofTop - 3} ${x - hw} ${hoofTop + 2}Z`
  const hoofFill = coat.sketch ? '#ffffff' : far ? darken(coat.hoof, 0.2) : cx.url('hoof')
  const hoofLine = coat.sketch ? coat.line : luma(coat.hoof) < 0.25 ? darken(coat.hoof, 0.6) : darken(coat.hoof, 0.45)
  const shine = coat.sketch
    ? ''
    : `<path d="M${x - hw + 5} ${hoofTop + 6}Q${x - 3} ${hoofTop + 3} ${x + 4} ${hoofTop + 5}" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="${far ? 0.2 : 0.45}"/>`
  return `<g class="lh-leg" data-leg="${id}" data-zone="hooves" ${origin([x, top + 6])}>
    <path d="${legPath(id)}" fill="${far ? cx.url('leg-far') : cx.url('leg')}" stroke="${coat.line}" stroke-width="3" stroke-linejoin="round"/>${legPattern(cx, id, coat)}
    <g class="lh-hoof"><path d="${hoof}" fill="${hoofFill}" stroke="${hoofLine}" stroke-width="3" stroke-linejoin="round"/>${shine}</g>
  </g>`
}

/** A soft light band just inside the top-left edges (the shape must be clipped to itself). */
const rim = (d: string) => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="8" opacity=".3" transform="translate(3 5)"/>`

function bodyShape(cx: Ctx, coat: Coat): string {
  const clip = cx.clip('bodyclip', `<path d="${BODY_D}"/>`)
  const belly = coat.sketch ? '' : `<ellipse cx="288" cy="308" rx="104" ry="30" fill="${coat.shade}" opacity=".7"/>`
  const sheen = coat.sketch ? '' : `<ellipse cx="300" cy="222" rx="50" ry="9" fill="#ffffff" opacity=".28"/>${rim(BODY_D)}`
  const pattern = coat.pattern ? `<g class="lh-pattern">${patternMarks(coat, 'body')}</g>` : ''
  return `<g class="lh-body" data-part="body" data-zone="body" ${origin([288, 304])}>
    <path d="${BODY_D}" fill="${cx.url('coat')}"/>
    <g clip-path="${clip}">${belly}${pattern}${sheen}</g>
    <path d="${BODY_D}" fill="none" stroke="${coat.line}" stroke-width="3" stroke-linejoin="round"/>
  </g>`
}

function neckShape(cx: Ctx, coat: Coat): string {
  const clip = cx.clip('neckclip', `<path d="${NECK_FILL}"/>`)
  const pattern = coat.pattern ? `<g class="lh-pattern" clip-path="${clip}">${patternMarks(coat, 'neck')}</g>` : ''
  const throat = coat.sketch ? '' : `<path d="M206 204C214 230 222 250 246 266" stroke="${coat.shade}" stroke-width="16" fill="none" opacity=".4" stroke-linecap="round" clip-path="${clip}"/>`
  return `<g data-zone="body"><path d="${NECK_FILL}" fill="${cx.url('neck')}"/>${throat}${pattern}
    <path d="${NECK_THROAT}" fill="none" stroke="${coat.line}" stroke-width="3" stroke-linecap="round"/>
    <path d="${NECK_CREST}" fill="none" stroke="${coat.line}" stroke-width="3" stroke-linecap="round"/></g>`
}

function earShape(cx: Ctx, coat: Coat, far: boolean): string {
  const dx = far ? 22 : 0
  const dy = far ? 5 : 0
  const base: P = [202 + dx, 92 + dy]
  const o = (x: number, y: number) => `${x + dx} ${y + dy}`
  const outer = `M${o(186, 96)}C${o(180, 72)} ${o(190, 50)} ${o(208, 36)}C${o(222, 52)} ${o(226, 76)} ${o(218, 100)}Z`
  const inner = `M${o(194, 90)}C${o(191, 74)} ${o(197, 58)} ${o(207, 48)}C${o(215, 60)} ${o(216, 76)} ${o(212, 94)}Z`
  return `<g class="lh-ear" data-ear="${far ? 'far' : 'near'}" ${origin(base)}>
    <path d="${outer}" fill="${far ? cx.url('ear-far') : cx.url('ear')}" stroke="${coat.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${inner}" fill="${far ? darken(coat.inner, 0.12) : coat.inner}"/>
  </g>`
}

function eyeShape(cx: Ctx, coat: Coat): string {
  const [x, y] = EYE
  const lash = coat.sketch ? '#5b4a6e' : '#3a1f45'
  const iris = cx.linear('iris', [[0, '#2a1638'], [0.5, '#5b2f78'], [1, '#c27fd8']])
  const lashes = [
    sp([x + 12, y - 24], [x + 20, y - 34], [x + 30, y - 38], [x + 37, y - 34]),
    sp([x + 18, y - 17], [x + 28, y - 23], [x + 37, y - 22], [x + 42, y - 15]),
    sp([x + 4, y - 27], [x + 8, y - 40], [x + 15, y - 47], [x + 23, y - 47]),
  ]
  const lashD = lashes.map((c) => `<path d="${ribbon(c, (t) => 5 * (1 - t) + 0.8)}" fill="${lash}"/>`).join('')
  const top = y - EYE_RY
  const lid = `M${x - EYE_RX - 3} ${y + 2}C${x - EYE_RX - 3} ${top - 8} ${x + EYE_RX + 3} ${top - 8} ${x + EYE_RX + 3} ${y + 2}C${x + EYE_RX} ${y + 10} ${x - EYE_RX} ${y + 10} ${x - EYE_RX - 3} ${y + 2}Z`
  return `<g class="lh-eye">
    <ellipse cx="${x}" cy="${y}" rx="${EYE_RX}" ry="${EYE_RY}" fill="#ffffff" stroke="${lash}" stroke-width="2.5"/>
    <ellipse cx="${x - 4}" cy="${y + 3}" rx="${EYE_RX - 5}" ry="${EYE_RY - 5}" fill="${iris}"/>
    <ellipse cx="${x - 5}" cy="${y + 5}" rx="${EYE_RX - 13}" ry="${EYE_RY - 14}" fill="#1c0c24"/>
    <path d="M${x - EYE_RX - 2} ${y - 4}C${x - EYE_RX + 1} ${top - 5} ${x + EYE_RX - 2} ${top - 7} ${x + EYE_RX + 5} ${y - 12}" stroke="${lash}" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${lashD}
    <g class="lh-eye-shine"><ellipse cx="${x - 11}" cy="${y - 8}" rx="7.5" ry="9" fill="#ffffff"/><circle cx="${x + 4}" cy="${y + 14}" r="3.8" fill="#ffffff" opacity=".9"/><circle cx="${x}" cy="${y - 14}" r="2.3" fill="#ffffff" opacity=".85"/></g>
    <path class="lh-lid" d="${lid}" fill="${coat.sketch ? '#ffffff' : coat.body}" stroke="${lash}" stroke-width="2.5" style="transform-origin:${x}px ${top - 5}px;transform:scaleY(0)"/>
  </g>`
}

function headShape(cx: Ctx, coat: Coat, inner: string): string {
  const clipHead = cx.clip('headclip', `<path d="${HEAD_D}"/>`)
  const pattern = coat.pattern ? `<g class="lh-pattern">${patternMarks(coat, 'head')}</g>` : ''
  const jaw = coat.sketch ? '' : `<ellipse cx="214" cy="190" rx="34" ry="22" fill="${coat.shade}" opacity=".3"/>`
  const sheen = coat.sketch ? '' : `<ellipse cx="164" cy="100" rx="30" ry="12" fill="#ffffff" opacity=".28" transform="rotate(-14 164 100)"/>${rim(HEAD_D)}`
  const mouthLine = coat.sketch ? coat.line : darken(coat.muzzle, 0.5)
  return `<g class="lh-head" data-zone="head" ${origin(HEAD_PIVOT)}>
    ${earShape(cx, coat, true)}
    <path d="${HEAD_D}" fill="${cx.url('head')}"/>
    <g clip-path="${clipHead}">${jaw}<ellipse cx="92" cy="186" rx="46" ry="40" fill="${cx.url('muzzle')}"/>${pattern}${sheen}</g>
    <path d="${HEAD_D}" fill="none" stroke="${coat.line}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse class="lh-blush" cx="128" cy="186" rx="15" ry="9" fill="${coat.blush}" opacity="${coat.sketch ? 0.5 : 0.45}"/>
    <path class="lh-nostril" d="M64 172C62 166 68 161 75 164C73 168 70 172 64 172Z" fill="${coat.sketch ? coat.line : darken(coat.muzzle, 0.42)}" opacity=".85"/>
    <path class="lh-mouth-closed" d="M70 200C77 206 88 206 96 200" stroke="${mouthLine}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g class="lh-mouth-open" opacity="0"><path d="M66 196C68 214 92 216 100 198C88 201 76 201 66 196Z" fill="#8a2a4a" stroke="${mouthLine}" stroke-width="2.5" stroke-linejoin="round"/><path d="M74 205C79 211 89 211 93 205C87 204 80 204 74 205Z" fill="#ff8aa8"/></g>
    ${eyeShape(cx, coat)}
    ${earShape(cx, coat, false)}
    ${inner}
  </g>`
}

/* ─────────────────────────── ghosts ─────────────────────────── */

const GHOST_MANE = blob([
  [204, 80],
  [252, 74],
  [292, 110],
  [312, 170],
  [312, 236],
  [296, 270],
  [268, 240],
  [252, 196],
  [236, 150],
  [214, 112],
])
const GHOST_TAIL = blob([
  [356, 220],
  [396, 208],
  [424, 244],
  [426, 296],
  [404, 326],
  [380, 322],
  [388, 286],
  [376, 248],
])

function arrow(x: number, y: number, deg: number, bold = false): string {
  const nudge = bold ? 8 : 5
  return `<g class="lh-ghost-arrow" style="--dx:${f(Math.cos((deg * Math.PI) / 180) * nudge)}px;--dy:${f(Math.sin((deg * Math.PI) / 180) * nudge)}px">
    <path transform="translate(${x} ${y}) rotate(${deg})${bold ? ' scale(1.75)' : ''}" d="M-13 -5.5L2 -5.5L2 -13L16 0L2 13L2 5.5L-13 5.5Z" fill="#ffffff" stroke="#8b6fc4" stroke-width="${bold ? 2.6 : 3}" stroke-linejoin="round"/>
  </g>`
}

const ghostLine = (d: string, dots = false, bold = false) => {
  const dash = dots ? (bold ? '0.1 17' : '0.1 10') : bold ? '16 12' : '9 8'
  return `<path d="${d}" fill="${dots ? 'none' : '#ffffff'}" fill-opacity=".28" stroke="#ffffff" stroke-width="${bold ? 11 : 5}" stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
  <path d="${d}" fill="none" stroke="#9a7fd2" stroke-width="${bold ? 5.5 : 2.6}" stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round"/>`
}

/* ─────────────────────────── public ─────────────────────────── */

function resolve(look: Look) {
  return {
    color: look.color ? findItem('color', look.color) : undefined,
    mane: look.mane ? findItem('mane', look.mane) : undefined,
    tail: look.tail ? findItem('tail', look.tail) : undefined,
    clip: look.clip ? findItem('clip', look.clip) : undefined,
  }
}

function coatDefs(cx: Ctx, coat: Coat): void {
  // user-space gradients so neighbouring parts blend seamlessly
  cx.radial('coat', [[0, coat.light], [0.45, coat.body], [1, coat.shade]], 268, 214, 150, true)
  cx.radial('neck', [[0, coat.light], [0.55, coat.body], [1, coat.shade]], 236, 170, 140, true)
  cx.radial('head', [[0, coat.light], [0.5, coat.body], [1, coat.shade]], 150, 104, 150, true)
  cx.radial('muzzle', [[0, lighten(coat.muzzle, 0.45)], [0.7, coat.muzzle], [1, mix(coat.muzzle, coat.body, 0.3)]], 0.4, 0.35, 0.72)
  cx.radial('ear', [[0, coat.light], [1, coat.body]], 0.4, 0.3, 0.8)
  cx.linear('ear-far', [[0, coat.shade], [1, coat.deep]])
  cx.linear('leg', [[0, coat.body], [1, coat.sketch ? coat.body : mix(coat.body, coat.shade, 0.7)]])
  cx.linear('leg-far', [[0, coat.shade], [1, coat.sketch ? coat.shade : coat.deep]])
  cx.radial('hoof', [[0, lighten(coat.hoof, 0.25)], [1, coat.hoof]], 0.35, 0.25, 0.8)
}

export function horseSvg(look: Look, options: HorseOptions): string {
  const cx = new Ctx(options.id)
  const parts = resolve(look)
  const coat = coatOf(parts.color)
  const ghosts = !!options.ghosts
  const bold = !!options.bold
  coatDefs(cx, coat)
  cx.radial('shadow', [[0, '#2a0f24', 0.34], [0.6, '#2a0f24', 0.18], [1, '#2a0f24', 0]], 0.5, 0.5, 0.5)

  /* mane */
  let maneG = ''
  let forelockG = ''
  if (parts.mane) {
    const m = maneShape(cx, parts.mane)
    maneG = `<g class="lh-mane" data-part="mane" data-zone="mane" ${origin(crestAt(0.3))}><g class="lh-mane-hair" ${origin(crestAt(0))}>${m.mane}</g></g>`
    forelockG = `<g class="lh-forelock" data-part="mane" data-zone="mane" ${origin([204, 84])}>${m.forelock}</g>`
  } else if (ghosts) {
    maneG = `<g class="lh-ghost lh-ghost-mane" data-zone="mane">${ghostLine(GHOST_MANE, false, bold)}${arrow(270, 172, 180, bold)}</g>`
  }

  /* tail */
  let tailInner = ''
  if (parts.tail) tailInner = `<g class="lh-tail-hair" ${origin(DOCK)}>${tailShape(cx, parts.tail)}</g>`
  else if (ghosts) tailInner = `<g class="lh-ghost lh-ghost-tail">${ghostLine(GHOST_TAIL, false, bold)}${arrow(400, 270, 0, bold)}</g>`
  const tailG = `<g class="lh-tail"${parts.tail ? ' data-part="tail"' : ''} data-zone="tail" ${origin(DOCK)}>${tailInner}</g>`

  /* clip */
  let clipG = ''
  if (parts.clip) {
    const inner =
      parts.clip.shape === 'wreath'
        ? wreathOnHead(parts.clip)
        : parts.clip.shape === 'crown'
          ? `<g transform="translate(${CLIP_AT[0] + 2} ${CLIP_AT[1] - 6}) rotate(-12) scale(0.95)">${clipShape(cx, parts.clip, 'clip')}</g>`
          : `<g transform="translate(${CLIP_AT[0]} ${CLIP_AT[1]}) rotate(-14) scale(${parts.clip.shape === 'bow' ? 1.3 : 1.1})">${clipShape(cx, parts.clip, 'clip')}</g>`
    clipG = `<g class="lh-clip" data-part="clip" data-zone="clip" ${origin(CLIP_AT)}>${inner}</g>`
  } else if (ghosts) {
    clipG = `<g class="lh-ghost lh-ghost-clip" data-zone="clip">${ghostLine(`M${CLIP_AT[0] + 20} ${CLIP_AT[1]}A20 20 0 1 1 ${CLIP_AT[0] - 20} ${CLIP_AT[1]}A20 20 0 1 1 ${CLIP_AT[0] + 20} ${CLIP_AT[1]}Z`, false, bold)}${arrow(CLIP_AT[0] - 2, CLIP_AT[1] - 40, -90, bold)}</g>`
  }

  /* magic */
  const hornG = look.horn
    ? `<g class="lh-horn" data-part="horn" data-zone="horn" ${origin(HORN_BASE)}><g transform="translate(${HORN_BASE[0]} ${HORN_BASE[1]}) rotate(-18)">${hornShape(cx, 'horn')}</g></g>`
    : ''
  const wingFar = look.wings
    ? `<g class="lh-wing-far" data-part="wings" data-zone="wings" ${origin(add(SHOULDER, 18, -10))}><g transform="translate(${SHOULDER[0] + 18} ${SHOULDER[1] - 10}) rotate(-12) scale(0.96)">${wingShape(cx, 'wfar', true)}</g></g>`
    : ''
  const wingNear = look.wings
    ? `<g class="lh-wing-near" data-part="wings" data-zone="wings" ${origin(SHOULDER)}><g transform="translate(${SHOULDER[0]} ${SHOULDER[1]}) rotate(2)">${wingShape(cx, 'wnear', false)}</g></g>`
    : ''

  /* colour ghost */
  const colorGhost =
    !parts.color && ghosts
      ? `<g class="lh-ghost lh-ghost-color" data-zone="body">${ghostLine(BODY_D, true, bold)}${arrow(286, 326, 90, bold)}</g>`
      : ''

  const legsFar = (['fl', 'bl'] as LegId[]).map((l) => legShape(cx, l, coat)).join('')
  const legsNear = (['fr', 'br'] as LegId[]).map((l) => legShape(cx, l, coat)).join('')
  const bodyG = bodyShape(cx, coat)
  const neckG = neckShape(cx, coat)
  const headG = headShape(cx, coat, `${forelockG}${hornG}${clipG}`)
  const title = options.title ? `<title>${esc(options.title)}</title>` : ''

  // defs last: every part above registers its gradients and clips first
  return `<svg class="lh-horse" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"${options.title ? ' role="img"' : ' aria-hidden="true"'}>${title}
<defs>${cx.defs.join('')}</defs>
<g transform="translate(${OFFSET_X} ${OFFSET_Y})">
<ellipse class="lh-shadow" cx="292" cy="${G}" rx="124" ry="15" fill="${cx.url('shadow')}" ${origin([292, G])}/>
<g class="lh-rig" ${origin([LEGS.br.x - 12, G])}>
${wingFar}
${legsFar}
${tailG}
${legsNear}
${bodyG}
${colorGhost}
<g class="lh-neck" ${origin(NECK_BASE)}>
${neckG}
${maneG}
${headG}
</g>
${wingNear}
</g>
</g>
</svg>`
}

/* ─────────────────────────── icons ─────────────────────────── */

const ICON_COAT: Coat = {
  body: '#fff6ee',
  light: '#ffffff',
  shade: '#f3e1d4',
  deep: '#e8d0c0',
  muzzle: '#ffeee6',
  hoof: '#8a7480',
  line: '#c2a596',
  inner: '#ffd0de',
  blush: '#ff8fae',
  sketch: false,
  patternColor: '#ffffff',
}

function icon(body: string, defs: string[], label = ''): string {
  return `<svg class="lh-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${label}<defs>${defs.join('')}</defs>${body}</svg>`
}

/** Fit a box of local units into the 100×100 icon with a margin. */
function fit(x: number, y: number, w: number, h: number, margin = 6): string {
  const s = (100 - margin * 2) / Math.max(w, h)
  const ox = margin + ((100 - margin * 2) - w * s) / 2 - x * s
  const oy = margin + ((100 - margin * 2) - h * s) / 2 - y * s
  return `translate(${f(ox)} ${f(oy)}) scale(${Math.round(s * 1000) / 1000})`
}

const TAIL_BOX: Record<TailStyle, [number, number, number, number]> = {
  flowing: [346, 206, 106, 152],
  wavy: [346, 206, 108, 152],
  curly: [344, 220, 112, 136],
  braid: [344, 218, 104, 140],
  pompom: [346, 210, 88, 88],
  fountain: [346, 140, 106, 150],
}

/** 0 0 100 100 icon for a strip cell. kind 'background' is NOT handled here (see scenes). */
export function itemIcon(kind: Exclude<ItemKind, 'background'>, id: string, prefix = 'ic'): string {
  const cx = new Ctx(`${prefix}-${kind}-${id}`)
  if (kind === 'mane') {
    const mane = findItem('mane', id)
    if (!mane) return icon('', [])
    coatDefs(cx, ICON_COAT)
    const m = maneShape(cx, mane)
    const body = `<g transform="${fit(54, 30, 274, 274, 2)}">
      ${neckShape(cx, ICON_COAT)}
      <g class="lh-mane">${m.mane}</g>
      ${headShape(cx, ICON_COAT, `<g class="lh-forelock">${m.forelock}</g>`)}
    </g>`
    return icon(body, cx.defs)
  }
  if (kind === 'tail') {
    const tail = findItem('tail', id)
    if (!tail) return icon('', [])
    const [x, y, w, h] = TAIL_BOX[tail.style]
    return icon(`<g transform="${fit(x, y, w, h, 5)}">${tailShape(cx, tail)}</g>`, cx.defs)
  }
  if (kind === 'clip') {
    const clip = findItem('clip', id)
    if (!clip) return icon('', [])
    const s = clip.shape === 'rainbow' ? 1.75 : clip.shape === 'wreath' ? 1.65 : 1.62
    return icon(`<g transform="translate(50 ${clip.shape === 'rainbow' ? 56 : 51}) scale(${s})">${clipShape(cx, clip, 'c')}</g>`, cx.defs)
  }
  if (kind === 'color') {
    const color = findItem('color', id)
    if (!color) return icon('', [])
    return icon(swatch(cx, coatOf(color)), cx.defs)
  }
  if (id === 'horn') {
    return icon(
      `<g transform="translate(40 93) scale(1.24) rotate(18)">${hornShape(cx, 'h')}</g>
       <path d="${sparklePath(22, 30, 8)}" fill="#ffffff" stroke="#e7b8f0" stroke-width="1.4"/><path d="${sparklePath(80, 52, 6)}" fill="#ffffff" stroke="#e7b8f0" stroke-width="1.4"/><circle cx="74" cy="22" r="3" fill="#ffe680"/>`,
      cx.defs,
    )
  }
  if (id === 'wings') {
    const w = wingShape(cx, 'w', false)
    return icon(`<g transform="translate(50 74) scale(0.44)"><g transform="translate(8 0) rotate(16)">${w}</g><g transform="scale(-1 1) translate(8 0) rotate(16)">${w}</g></g>
      <path d="${heartPath(50, 75, 7)}" fill="#ff8fc4" stroke="#c45a92" stroke-width="2"/>`, cx.defs)
  }
  return icon('', [])
}

function swatch(cx: Ctx, coat: Coat): string {
  const fill = cx.radial('sw', [[0, coat.light], [0.5, coat.body], [1, coat.shade]], 0.36, 0.3, 0.78)
  const clip = cx.clip('swc', '<circle cx="50" cy="52" r="38"/>')
  let pattern = ''
  if (coat.pattern) {
    const s = 0.62
    const marks = patternMarks(coat, 'body')
    pattern = `<g clip-path="${clip}"><g transform="translate(${f(50 - 288 * s)} ${f(52 - 266 * s)}) scale(${s})">${marks}</g></g>`
  }
  return `<circle cx="50" cy="55" r="38" fill="#2a0f24" opacity=".14"/>
    <circle cx="50" cy="52" r="38" fill="${fill}"/>${pattern}
    <circle cx="50" cy="52" r="38" fill="none" stroke="${coat.line}" stroke-width="3.2"/>
    <ellipse cx="37" cy="34" rx="13" ry="8" fill="#ffffff" opacity=".55" transform="rotate(-28 37 34)"/>
    <circle cx="61" cy="70" r="3" fill="#ffffff" opacity=".35"/>`
}
