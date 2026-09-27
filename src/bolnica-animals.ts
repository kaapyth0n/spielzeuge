/** Animal patients for Больница кошечки: sticker-style head-and-shoulders portraits in a 240 box. */

export const ANIMALS = ['giraffe', 'bunny', 'bear', 'fox', 'elephant', 'pig', 'frog', 'owl', 'zebra', 'panda', 'hedgehog', 'cow', 'monkey', 'penguin', 'lion', 'sheep', 'mouse', 'hippo', 'crocodile', 'dog'] as const
export type Animal = (typeof ANIMALS)[number]
export const AILMENTS = ['throat', 'ear', 'tooth', 'paw', 'nose', 'tummy', 'cough', 'fever'] as const
export type Ailment = (typeof AILMENTS)[number]
export const ANIMAL_AILMENT: Record<Animal, Ailment> = {
  giraffe: 'throat',
  lion: 'throat',
  bunny: 'ear',
  sheep: 'ear',
  dog: 'ear',
  bear: 'tooth',
  mouse: 'tooth',
  crocodile: 'tooth',
  fox: 'paw',
  zebra: 'paw',
  monkey: 'paw',
  elephant: 'nose',
  hedgehog: 'nose',
  pig: 'tummy',
  panda: 'tummy',
  frog: 'cough',
  penguin: 'cough',
  owl: 'fever',
  cow: 'fever',
  hippo: 'fever',
}
export const MONSTER_TRAITS = ['eyes3', 'horns', 'fangs', 'green', 'tentacles', 'antennae', 'spots'] as const
export type MonsterTrait = (typeof MONSTER_TRAITS)[number]
export type Mood = 'sick' | 'better' | 'happy'
export interface PortraitOptions {
  mood?: Mood
  ailment?: boolean
  traits?: readonly MonsterTrait[]
  id?: string
}

const INK = '#22305A'
const WHITE = '#FFFFFF'
const CHERRY = '#F0445A'
const SUNNY = '#FFD447'
const PEACH = '#F6C9A0'
const LILAC = '#B9A7F2'
const TEAL = '#1F8A7A'
const BLUSH = '#FF8FA3'
const WATER = '#A9DEF6'
const MOUTH = '#8E2F4E'
const TONGUE = '#FF8FA3'
const MONSTER = '#A56CF0'
const MONSTER_LIGHT = '#D9C4FF'
const SW = 3.2

type Pt = [number, number]

interface Pal {
  fur: string
  cream: string
  pattern: string
  dark: string
  inner: string
  nose: string
}

interface Face {
  axis?: number
  eye: Pt
  eyeR: number
  ring?: number
  darkEyes?: boolean
  lid: (p: Pal, side: number) => string
  happyOpen?: boolean
  lashes?: boolean
  third: Pt
  mouth: Pt
  mouthW?: number
  mouthStyle?: 'plain' | 'beak' | 'croc'
  teeth?: boolean
  cheek: Pt
  horn: Pt
  antenna: [number, number, number, number]
  spots: [number, number, number][]
  sweat: Pt
  sparkles?: [number, number, number][]
}

interface Aid {
  scarf?: { y: number; w: number }
  ear?: { x: number; y: number; a: number; w: number; h: number }
  tooth?: { cx: number; cy: number; rx: number; ry: number; swell: Pt; r: number; snout?: boolean }
  paw?: { x: number; y: number; kind: 'paw' | 'hoof' | 'hand' }
  nose?: Pt
  bottle?: Pt
  ice?: { x: number; y: number; a: number }
}

interface Ctx {
  id: string
  n: number
  defs: string[]
  p: Pal
  mood: Mood
  ail: Ailment | null
  traits: ReadonlySet<MonsterTrait>
}

interface Spec {
  /** Optional inner transform for the whole head (scale, dx, dy), for three-quarter heads that need more room. */
  fit?: [number, number, number]
  pal: Pal
  green?: Partial<Pal>
  face: Face
  aid: Aid
  body: (c: Ctx) => string
  back: (c: Ctx) => string
  head: (c: Ctx) => string
}

let counter = 0

const n1 = (v: number): number => Math.round(v * 10) / 10

function uid(c: Ctx): string {
  c.n += 1
  return `${c.id}-${c.n}`
}

function ell(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${n1(cx - rx)} ${n1(cy)}a${n1(rx)} ${n1(ry)} 0 1 0 ${n1(rx * 2)} 0a${n1(rx)} ${n1(ry)} 0 1 0 ${n1(-rx * 2)} 0Z`
}

function line(d: string, w = SW, color = INK, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
}

function fillP(d: string, fill: string, extra = ''): string {
  return `<path d="${d}" fill="${fill}"${extra}/>`
}

function outlined(d: string, fill: string, w = SW): string {
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`
}

function mirror(svg: string, axis = 120): string {
  return `<g transform="matrix(-1 0 0 1 ${axis * 2} 0)">${svg}</g>`
}

function pair(svg: string, axis = 120): string {
  return svg + mirror(svg, axis)
}

/**
 * Underside shade: the part of a mass outside a lit ellipse nudged up-left.
 * The outer box hugs the mass so group bounding boxes (CSS transform-box: fill-box) stay true.
 */
function shadeOf(cx: number, cy: number, rx: number, ry: number, dx = -5, dy = -9): string {
  const x0 = n1(cx - rx - 3 + Math.min(dx, 0))
  const x1 = n1(cx + rx + 3 + Math.max(dx, 0))
  const y0 = n1(cy - ry - 3 + Math.min(dy, 0))
  const y1 = n1(cy + ry + 3 + Math.max(dy, 0))
  return `M${x0} ${y0}H${x1}V${y1}H${x0}Z${ell(cx + dx, cy + dy, rx, ry)}`
}

/** A filled mass (one or more shapes, unioned) with a clean outer ink line, clipped details and an underside shade. */
function mass(c: Ctx, ds: string | string[], fill: string, inner = '', shade = ''): string {
  const list = Array.isArray(ds) ? ds : [ds]
  const paths = list.map((d) => `<path d="${d}"/>`).join('')
  let clipped = ''
  if (inner || shade) {
    const id = uid(c)
    c.defs.push(`<clipPath id="${id}">${paths}</clipPath>`)
    const sh = shade ? `<path d="${shade}" fill="${INK}" opacity=".13" fill-rule="evenodd"/>` : ''
    clipped = `<g clip-path="url(#${id})">${inner}${sh}</g>`
  }
  return `<g fill="none" stroke="${INK}" stroke-width="${SW * 2}" stroke-linejoin="round">${paths}</g><g fill="${fill}">${paths}</g>${clipped}`
}

function rnd(k: number): number {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Rounded irregular polygon, for giraffe and cow patches. */
function blob(cx: number, cy: number, r: number, seed: number, sides = 6, round = 0.32): string {
  const pts: Pt[] = []
  const turn = rnd(seed) * Math.PI
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2 + (rnd(seed + i * 3.1) - 0.5) * 0.5
    const rr = r * (0.8 + rnd(seed + i * 7.3) * 0.4)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  let d = ''
  pts.forEach((p, i) => {
    const prev = pts[(i + sides - 1) % sides]
    const next = pts[(i + 1) % sides]
    const a = lerp(p, prev, round)
    const b = lerp(p, next, round)
    d += `${i === 0 ? 'M' : 'L'}${n1(a[0])} ${n1(a[1])}Q${n1(p[0])} ${n1(p[1])} ${n1(b[0])} ${n1(b[1])}`
  })
  return d + 'Z'
}

/** Catmull-Rom curve through points, as cubic segments (without the initial move). */
function curveThrough(pts: Pt[], closed = false): string {
  const n = pts.length
  const at = (i: number): Pt => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = ''
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    d += `C${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)} ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`
  }
  return d
}

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 14): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

/** A tapered tube along a centre line with a round tip, for tentacles, trunks and arms. */
function tube(center: Pt[], w0: number, w1: number): string {
  return tubeParts(center, w0, w1).outline
}

function tubeParts(center: Pt[], w0: number, w1: number): { outline: string; sides: string } {
  const n = center.length
  const left: Pt[] = []
  const right: Pt[] = []
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)]
    const b = center[Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2
    left.push([p[0] - (ty / len) * w, p[1] + (tx / len) * w])
    right.push([p[0] + (ty / len) * w, p[1] - (tx / len) * w])
  })
  const r = n1(w1 / 2)
  const back = right.slice().reverse()
  const sides = `M${n1(left[0][0])} ${n1(left[0][1])}${curveThrough(left)}A${r} ${r} 0 0 0 ${n1(back[0][0])} ${n1(back[0][1])}${curveThrough(back)}`
  return { outline: sides + 'Z', sides }
}

/** Scalloped cloud outline around an ellipse, for manes, wool and fluffy monsters. */
function scallop(cx: number, cy: number, rx: number, ry: number, bumps: number, bulge = 1.15, turn = 0): string {
  const pts: Pt[] = []
  for (let i = 0; i < bumps; i++) {
    const a = turn + (i / bumps) * Math.PI * 2
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`
  pts.forEach((_, i) => {
    const a = pts[i]
    const b = pts[(i + 1) % bumps]
    const r = n1((Math.hypot(b[0] - a[0], b[1] - a[1]) / 2) * bulge)
    d += `A${r} ${r} 0 0 1 ${n1(b[0])} ${n1(b[1])}`
  })
  return d + 'Z'
}

/** Four-point sparkle star. */
function sparkle(x: number, y: number, s: number, fill = SUNNY): string {
  const k = s * 0.28
  return outlined(`M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z`, fill, 2.4)
}

function drop(x: number, y: number, s = 1): string {
  return `${outlined(`M${x} ${y}C${n1(x + 5 * s)} ${n1(y + 7 * s)} ${n1(x + 7 * s)} ${n1(y + 12 * s)} ${x} ${n1(y + 16 * s)}C${n1(x - 7 * s)} ${n1(y + 12 * s)} ${n1(x - 5 * s)} ${n1(y + 7 * s)} ${x} ${y}Z`, WATER, 2.4)}<ellipse cx="${n1(x - 2 * s)}" cy="${n1(y + 10 * s)}" rx="${n1(1.4 * s)}" ry="${n1(2.4 * s)}" fill="${WHITE}"/>`
}

// ---------------------------------------------------------------- face parts

interface EyeLook {
  r: number
  ring: number
  lid: string
  happyOpen: boolean
  lashes: boolean
  dark: boolean
}

function eyeSvg(c: Ctx, x: number, y: number, side: number, e: EyeLook): string {
  const { r } = e
  const R = e.ring || r
  const out: string[] = []
  const lash = (px: number, py: number, dx: number, dy: number): string =>
    line(`M${n1(px)} ${n1(py)}l${n1(dx)} ${n1(dy)}`, 2.6)
  if (c.mood === 'happy' && !e.happyOpen) {
    const d = `M${n1(x - R * 1.05)} ${n1(y + R * 0.32)}Q${x} ${n1(y - R * 1.15)} ${n1(x + R * 1.05)} ${n1(y + R * 0.32)}`
    if (e.dark) out.push(line(d, 8, WHITE))
    out.push(line(d, 3.8))
    if (e.lashes) {
      const ox = x + side * R * 1.05
      out.push(lash(ox, y + R * 0.3, side * 5, -3), lash(ox - side * 3, y - R * 0.25, side * 4.5, -5))
    }
    return `<g class="bo-eye">${out.join('')}</g>`
  }
  if (e.ring) out.push(outlined(ell(x, y, e.ring), WHITE, 2.8))
  out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/>`)
  if (c.mood === 'sick') {
    out.push(`<circle cx="${n1(x - r * 0.3)}" cy="${n1(y + r * 0.34)}" r="${n1(r * 0.26)}" fill="${WHITE}"/>`)
    const Rl = R + (e.ring ? 1.9 : 1)
    const inner = -0.1 * Rl
    const outer = 0.26 * Rl
    const yl = side < 0 ? outer : side > 0 ? inner : 0.08 * Rl
    const yr = side < 0 ? inner : side > 0 ? outer : 0.08 * Rl
    const xl = x - Math.sqrt(Rl * Rl - yl * yl)
    const xr = x + Math.sqrt(Rl * Rl - yr * yr)
    const large = (yl + yr) / 2 > 0 ? 1 : 0
    out.push(fillP(`M${n1(xl)} ${n1(y + yl)}A${n1(Rl)} ${n1(Rl)} 0 ${large} 1 ${n1(xr)} ${n1(y + yr)}Z`, e.lid))
    const slope = (yr - yl) / (xr - xl)
    out.push(line(`M${n1(xl - 2)} ${n1(y + yl - slope * 2)}L${n1(xr + 2)} ${n1(y + yr + slope * 2)}`, 3.4, e.dark ? WHITE : INK))
    if (e.dark) out.push(line(`M${n1(xl - 1)} ${n1(y + yl - slope)}L${n1(xr + 1)} ${n1(y + yr + slope)}`, 1.6, INK))
    if (e.lashes) {
      const ox = side < 0 ? xl - 2 : xr + 2
      const oy = side < 0 ? y + yl : y + yr
      out.push(lash(ox, oy, side * 4, 4), lash(ox - side * 5, oy + 1, side * 3, 5))
    }
  } else {
    out.push(`<circle cx="${n1(x - r * 0.3)}" cy="${n1(y - r * 0.34)}" r="${n1(r * 0.38)}" fill="${WHITE}"/>`)
    out.push(`<circle cx="${n1(x + r * 0.36)}" cy="${n1(y + r * 0.34)}" r="${n1(r * 0.17)}" fill="${WHITE}"/>`)
    if (e.lashes) {
      const a1 = -0.35
      const a2 = -0.75
      const px = (a: number): number => x + side * Math.cos(a) * (R + 0.5)
      const py = (a: number): number => y + Math.sin(a) * (R + 0.5)
      out.push(lash(px(a1), py(a1), side * 5, -2.5), lash(px(a2), py(a2), side * 3.5, -4.5))
    }
  }
  return `<g class="bo-eye">${out.join('')}</g>`
}

function eyesSvg(c: Ctx, f: Face): string {
  const look: EyeLook = {
    r: f.eyeR,
    ring: f.ring ?? 0,
    lid: '',
    happyOpen: !!f.happyOpen,
    lashes: !!f.lashes,
    dark: !!f.darkEyes,
  }
  const [ex, ey] = f.eye
  let out = eyeSvg(c, (f.axis ?? 120) * 2 - ex, ey, -1, { ...look, lid: f.lid(c.p, -1) }) + eyeSvg(c, ex, ey, 1, { ...look, lid: f.lid(c.p, 1) })
  if (c.traits.has('eyes3')) {
    const [tx, ty] = f.third
    const socket = outlined(ell(tx, ty, 13.5, 12.5), MONSTER_LIGHT, 2.6)
    out += `<g class="bo-eye bo-eye--third">${socket}${eyeSvg(c, tx, ty, 0, { r: 5.6, ring: 9.4, lid: MONSTER_LIGHT, happyOpen: false, lashes: false, dark: false }).replace(/^<g class="bo-eye">|<\/g>$/g, '')}</g>`
  }
  return `<g class="bo-eyes">${out}</g>`
}

function cheeksSvg(c: Ctx, f: Face, swellX: number | null): string {
  const [cx, cy] = f.cheek
  let color = BLUSH
  let op = c.mood === 'sick' ? 0.3 : c.mood === 'better' ? 0.5 : 0.72
  if (c.ail === 'tummy') {
    color = '#8FD16A'
    op = c.mood === 'sick' ? 0.75 : 0.5
  } else if (c.ail === 'fever') {
    color = '#FF5C7A'
    op = c.mood === 'sick' ? 0.6 : 0.5
  }
  const rx = c.mood === 'happy' ? 12.5 : 11
  const ry = c.mood === 'happy' ? 8 : 7
  const axis = f.axis ?? 120
  const swell = c.ail === 'tooth' ? swellX : null
  const one = (x: number): string => (swell !== null && Math.abs(x - swell) < 30 ? '' : `<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}"/>`)
  return `<g class="bo-cheeks" fill="${color}" opacity="${op}">${one(axis * 2 - cx)}${one(cx)}</g>`
}

function fangsAt(x: number, y: number, gap: number): string {
  const fang = (fx: number): string => outlined(`M${n1(fx - 4.8)} ${n1(y - 1)}Q${n1(fx - 2)} ${n1(y + 6)} ${n1(fx)} ${n1(y + 11.5)}Q${n1(fx + 2)} ${n1(y + 6)} ${n1(fx + 4.8)} ${n1(y - 1)}Z`, WHITE, 2.4)
  return `<g class="bo-fangs">${fang(x - gap)}${fang(x + gap)}</g>`
}

function mouthSvg(c: Ctx, f: Face): string {
  const [x, y] = f.mouth
  const w = f.mouthW ?? 1
  const style = f.mouthStyle ?? 'plain'
  const fangs = c.traits.has('fangs')
  const out: string[] = []
  if (style === 'beak') {
    const tipY = c.mood === 'happy' ? y + 5 : y + 11
    const upper = `M${x - 11} ${y - 5}Q${x} ${y - 10} ${x + 11} ${y - 5}Q${x + 4} ${tipY - 5} ${x} ${tipY}Q${x - 4} ${tipY - 5} ${x - 11} ${y - 5}Z`
    if (c.mood === 'happy') {
      out.push(outlined(`M${x - 10} ${y}Q${x} ${y + 22} ${x + 10} ${y}Z`, MOUTH, 2.6))
      out.push(fillP(ell(x, y + 11, 4.5, 3.2), TONGUE))
    } else if (c.mood === 'sick' && c.ail !== 'fever') {
      out.push(line(`M${x - 6} ${y + 15}q3 -2.5 6 0t6 0`, 2.4))
    }
    out.push(outlined(upper, c.p.nose))
    out.push(`<ellipse cx="${x - 4}" cy="${y - 4}" rx="3" ry="1.5" fill="${WHITE}" opacity=".6"/>`)
    if (fangs) out.push(fangsAt(x, y + 2, 5.5))
    return `<g class="bo-mouth">${out.join('')}</g>`
  }
  if (style === 'croc') {
    // Three-quarter jaw: the line runs from the snout tip (left) to the mouth corner at (x, y).
    const q = (t: number, p0: Pt, p1: Pt, p2: Pt): Pt => {
      const u = 1 - t
      return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
    }
    const a: Pt = [30, y - 3]
    const b: Pt = [90, y + 6]
    const e: Pt = [x, y + 2]
    const tooth = ([tx, ty]: Pt, dir: number, h = 6.5): string =>
      outlined(`M${n1(tx - 3.4)} ${n1(ty)}L${n1(tx)} ${n1(ty + dir * h)}L${n1(tx + 3.4)} ${n1(ty)}Z`, WHITE, 1.8)
    const upper = [0.12, 0.3, 0.48, 0.66, 0.84].map((t) => tooth(q(t, a, b, e), 1)).join('')
    if (c.mood === 'happy') {
      const lowA: Pt = [34, y + 9]
      const lowB: Pt = [92, y + 30]
      const lowE: Pt = [x + 2, y + 6]
      const d = `M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${e[0]} ${e[1]}L${lowE[0]} ${lowE[1]}Q${lowB[0]} ${lowB[1]} ${lowA[0]} ${lowA[1]}Z`
      const id = uid(c)
      c.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`)
      out.push(fillP(d, MOUTH), `<g clip-path="url(#${id})">${fillP(ell(104, y + 22, 34, 8), TONGUE)}</g>`, outlined(d, 'none', 3))
      out.push([0.25, 0.5, 0.75].map((t) => tooth(q(t, lowA, lowB, lowE), -1)).join(''))
      out.push(upper, line(`M${x} ${y + 2}q8 -1 11 -10`, SW))
    } else {
      out.push(line(`M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${e[0]} ${e[1]}`, SW), upper)
      out.push(line(c.mood === 'sick' ? `M${x} ${y + 2}q7 1 10 7` : `M${x} ${y + 2}q8 -1 11 -10`, SW))
    }
    if (fangs) {
      const f1 = q(0.22, a, b, e)
      const f2 = q(0.58, a, b, e)
      out.push(`<g class="bo-fangs">${tooth(f1, 1, 12)}${tooth(f2, 1, 12)}</g>`)
    }
    return `<g class="bo-mouth">${out.join('')}</g>`
  }
  if (c.mood === 'happy') {
    const id = uid(c)
    const dep = Math.min(17, 170 - y)
    const d = `M${n1(x - 12 * w)} ${y - 3}Q${x} ${y - 0.5} ${n1(x + 12 * w)} ${y - 3}Q${n1(x + 10 * w)} ${y + dep} ${x} ${y + dep}Q${n1(x - 10 * w)} ${y + dep} ${n1(x - 12 * w)} ${y - 3}Z`
    c.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`)
    out.push(fillP(d, MOUTH))
    out.push(`<g clip-path="url(#${id})">${fillP(ell(x, y + dep - 2, 8 * w, 5), TONGUE)}${f.teeth ? `<rect x="${x - 7}" y="${y - 4}" width="14" height="6" rx="1.5" fill="${WHITE}"/>` : ''}</g>`)
    out.push(outlined(d, 'none', 3))
    if (fangs) out.push(fangsAt(x, y - 2, 6.5 * w))
    return `<g class="bo-mouth">${out.join('')}</g>`
  }
  if (c.mood === 'sick') {
    if (c.ail === 'cough') {
      out.push(outlined(ell(x + 1, y + 1, 4.6, 5.4), MOUTH, 2.6))
    } else {
      out.push(line(`M${n1(x - 9 * w)} ${y}Q${n1(x - 6 * w)} ${y - 3.5} ${n1(x - 3 * w)} ${y}T${n1(x + 3 * w)} ${y}T${n1(x + 9 * w)} ${y}`, SW))
    }
    if (f.teeth) out.push(outlined(`M${x - 5.5} ${y + 2.5}h11v5.5q0 1.5-1.5 1.5h-8q-1.5 0-1.5-1.5Z`, WHITE, 2))
  } else {
    if (f.teeth) out.push(outlined(`M${x - 5.5} ${y + 2.5}h11v6q0 1.5-1.5 1.5h-8q-1.5 0-1.5-1.5Z`, WHITE, 2))
    out.push(line(`M${n1(x - 9 * w)} ${y - 1}Q${x} ${y + 8} ${n1(x + 9 * w)} ${y - 1}`, SW))
  }
  if (fangs) out.push(fangsAt(x, y + (c.mood === 'sick' ? 1.5 : 3), 5.5 * w))
  return `<g class="bo-mouth">${out.join('')}</g>`
}

// ---------------------------------------------------------------- ailments

function scarf(y: number, w: number, base: string, stripe: string): string {
  const band = (d: string, width: number): string =>
    line(d, width + SW * 2) + line(d, width, base) + `<path d="${d}" fill="none" stroke="${stripe}" stroke-width="${width}" stroke-dasharray="5 7"/>`
  const wrap = `M${120 - w} ${y - 10}Q120 ${y + 16} ${120 + w} ${y - 10}`
  const kx = 120 - w * 0.45
  const ky = y + 6
  const tail = `M${n1(kx)} ${ky}Q${n1(kx - 8)} ${ky + 30} ${n1(kx - 4)} ${ky + 62}`
  const fringe = [-6, -1, 4].map((dx) => line(`M${n1(kx - 4 + dx)} ${ky + 72}v8`, 2.6, base)).join('')
  return `<g class="bo-scarf">${band(tail, 20)}${fringe}${band(wrap, 24)}${outlined(ell(kx, ky, 11, 9.5), base)}${line(`M${n1(kx - 5)} ${ky - 2}q5 4 10 0`, 2, stripe)}</g>`
}

function earWrap(a: { x: number; y: number; a: number; w: number; h: number }): string {
  const { x, y, w, h } = a
  const x0 = x - w / 2
  const y0 = y - h / 2
  const wraps = [0.3, 0.62].map((t) => line(`M${n1(x0 + 3)} ${n1(y0 + h * t + 3)}L${n1(x0 + w - 3)} ${n1(y0 + h * t - 3)}`, 2, '#C4CDE3')).join('')
  const aid = `<g transform="rotate(-38 ${x} ${y})">${outlined(`M${x - 17} ${y - 5.5}h34a5.5 5.5 0 0 1 0 11h-34a5.5 5.5 0 0 1 0-11Z`, PEACH, 2.4)}<rect x="${x - 5}" y="${y - 4}" width="10" height="8" rx="2" fill="#E8A97C"/><g fill="#D99467"><circle cx="${x - 11}" cy="${y - 1.5}" r=".9"/><circle cx="${x - 11}" cy="${y + 1.5}" r=".9"/><circle cx="${x + 11}" cy="${y - 1.5}" r=".9"/><circle cx="${x + 11}" cy="${y + 1.5}" r=".9"/></g></g>`
  return `<g class="bo-bandage" transform="rotate(${a.a} ${x} ${y})">${outlined(`M${n1(x0)} ${n1(y0 + 4)}Q${n1(x0)} ${n1(y0)} ${n1(x0 + 5)} ${n1(y0)}H${n1(x0 + w - 5)}Q${n1(x0 + w)} ${n1(y0)} ${n1(x0 + w)} ${n1(y0 + 4)}V${n1(y0 + h - 4)}Q${n1(x0 + w)} ${n1(y0 + h)} ${n1(x0 + w - 5)} ${n1(y0 + h)}H${n1(x0 + 5)}Q${n1(x0)} ${n1(y0 + h)} ${n1(x0)} ${n1(y0 + h - 4)}Z`, WHITE, 2.8)}${wraps}${aid}</g>`
}

/** A puffed-up cheek bulging towards the viewer: round, rosy, shiny. */
function toothSwell(c: Ctx, t: NonNullable<Aid['tooth']>): string {
  const [x, y] = t.swell
  const r = t.r
  const at = (deg: number): string => `${n1(x + Math.cos((deg * Math.PI) / 180) * r)} ${n1(y + Math.sin((deg * Math.PI) / 180) * r)}`
  return `<g class="bo-swell">${fillP(ell(x, y, r), c.p.fur)}${fillP(ell(x, y + 2, r * 0.7, r * 0.6), CHERRY, ' opacity=".42"')}${line(`M${at(200)}A${r} ${r} 0 0 0 ${at(-20)}`, 2.6, INK, ' opacity=".55"')}${line(`M${at(15)}A${r} ${r} 0 0 1 ${at(165)}`, 2.8)}<ellipse cx="${n1(x - r * 0.38)}" cy="${n1(y - r * 0.42)}" rx="${n1(r * 0.24)}" ry="${n1(r * 0.15)}" fill="${WHITE}" opacity=".75"/></g>`
}

function bow(cx: number, top: number, s = 1): string {
  const loop = (k: number): string =>
    outlined(`M${cx} ${top}C${n1(cx + k * 8 * s)} ${n1(top - 20 * s)} ${n1(cx + k * 28 * s)} ${n1(top - 19 * s)} ${n1(cx + k * 25 * s)} ${n1(top - 5 * s)}C${n1(cx + k * 22 * s)} ${n1(top + 5 * s)} ${n1(cx + k * 8 * s)} ${n1(top + 3 * s)} ${cx} ${top}Z`, WHITE, 2.8)
  const tail = (k: number): string =>
    outlined(`M${n1(cx - 2 * k)} ${n1(top + 2)}L${n1(cx + k * 7 * s)} ${n1(top + 19 * s)}L${n1(cx + k * 14 * s)} ${n1(top + 13 * s)}L${n1(cx + k * 5 * s)} ${top}Z`, WHITE, 2.6)
  const fold = line(`M${n1(cx - 17 * s)} ${n1(top - 9 * s)}q5 -3 9 1M${n1(cx + 17 * s)} ${n1(top - 9 * s)}q-5 -3 -9 1`, 1.8, '#C4CDE3')
  return `${tail(-1)}${tail(1)}${loop(-1)}${loop(1)}${fold}${outlined(ell(cx, top, 6 * s, 5.5 * s), WHITE, 2.8)}`
}

function toothBand(t: NonNullable<Aid['tooth']>): string {
  const { cx, cy, rx, ry } = t
  if (t.snout) {
    // Jaws tied shut: a strip around the snout with the bow on top.
    const band = `M${cx - 8} ${cy - ry}Q${cx} ${cy - ry - 3} ${cx + 8} ${cy - ry}L${cx + 10} ${cy + ry}Q${cx + 1} ${cy + ry + 4} ${cx - 8} ${cy + ry}Z`
    return `<g class="bo-bandage">${outlined(band, WHITE, 2.8)}${line(`M${cx - 4} ${cy - ry + 12}l8 -3M${cx - 3} ${cy + 4}l8 -3`, 1.8, '#C4CDE3')}${bow(cx, cy - ry, 0.85)}</g>`
  }
  const top = cy - ry
  const ring = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="${9 + SW * 2}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${WHITE}" stroke-width="9"/>`
  const sling = outlined(`M${cx - rx * 0.62} ${n1(cy + ry * 0.72)}Q${cx} ${cy + ry + 16} ${n1(cx + rx * 0.62)} ${n1(cy + ry * 0.72)}Q${cx} ${cy + ry + 2} ${cx - rx * 0.62} ${n1(cy + ry * 0.72)}Z`, WHITE, 2.8)
  return `<g class="bo-bandage">${ring}${sling}${bow(cx, top)}</g>`
}

function bandAid(x: number, y: number, a: number, len = 30): string {
  const h = len / 2
  return `<g transform="rotate(${a} ${x} ${y})">${outlined(`M${x - h} ${y - 5.5}h${len}a5.5 5.5 0 0 1 0 11h-${len}a5.5 5.5 0 0 1 0-11Z`, PEACH, 2.4)}<rect x="${x - 5}" y="${y - 4}" width="10" height="8" rx="2" fill="#E8A97C"/><g fill="#D99467"><circle cx="${x - h + 4}" cy="${y - 1.6}" r=".9"/><circle cx="${x - h + 4}" cy="${y + 1.6}" r=".9"/><circle cx="${x + h - 4}" cy="${y - 1.6}" r=".9"/><circle cx="${x + h - 4}" cy="${y + 1.6}" r=".9"/></g></g>`
}

function raisedArm(c: Ctx, x: number, y: number, fill: string, inner = ''): string {
  const d = tube(bez([204, 258], [214, 214], [196, 184], [x, y + 8]), 32, 27)
  return mass(c, d, fill, inner)
}

function pawAilment(c: Ctx, a: NonNullable<Aid['paw']>, withBandage = true): string {
  const { x, y, kind } = a
  const out: string[] = []
  if (kind === 'hoof') {
    const stripes = [0, 1, 2, 3].map((i) => line(`M${150 + i * 6} ${178 + i * 22}q30 -8 70 4`, 7, c.p.pattern)).join('')
    out.push(raisedArm(c, x, y, c.p.fur, stripes))
    out.push(outlined(`M${x - 15} ${y + 4}Q${x - 16} ${y - 16} ${x} ${y - 17}Q${x + 16} ${y - 16} ${x + 15} ${y + 4}Z`, c.p.dark))
    out.push(line(`M${x - 9} ${y - 9}q4 -3 8 -3`, 2.4, WHITE, ' opacity=".6"'))
  } else {
    out.push(raisedArm(c, x, y, c.p.fur))
    const palm = kind === 'hand' ? c.p.cream : c.p.dark
    out.push(outlined(ell(x, y - 3, 17.5, 16.5), palm))
    if (kind === 'hand') {
      out.push(outlined(`M${x - 13} ${y - 10}q-4 -12 3 -13q5 0 5 9`, palm, 2.8))
    } else {
      out.push(`<g fill="${c.p.inner}">${fillP(ell(x, y, 7.5, 6), c.p.inner)}<circle cx="${x - 9.5}" cy="${y - 9}" r="3.4"/><circle cx="${x}" cy="${y - 13}" r="3.4"/><circle cx="${x + 9.5}" cy="${y - 9}" r="3.4"/></g>`)
    }
  }
  if (withBandage) {
    const by = kind === 'hoof' ? y + 12 : y + 17
    out.push(`<g transform="rotate(-18 ${x} ${by})">${outlined(`M${x - 17} ${by - 8}h34v16h-34Z`, WHITE, 2.8)}${line(`M${x - 13} ${by - 2}l6 -4M${x - 1} ${by + 4}l8 -6`, 1.8, '#C4CDE3')}</g>`)
    if (kind === 'paw') out.push(bandAid(x + 2, by - 1, -48, 26))
    else out.push(bandAid(x + 1, kind === 'hoof' ? y - 6 : y - 2, -36, 30))
  }
  return `<g class="bo-paw">${out.join('')}</g>`
}

function tissue(x: number, y: number): string {
  return `<g class="bo-tissue">${outlined(`M${x - 13} ${y - 8}Q${x - 4} ${y - 16} ${x + 4} ${y - 12}Q${x + 14} ${y - 14} ${x + 14} ${y - 3}Q${x + 17} ${y + 7} ${x + 8} ${y + 12}Q${x - 2} ${y + 17} ${x - 9} ${y + 10}Q${x - 18} ${y + 3} ${x - 13} ${y - 8}Z`, WHITE, 2.6)}${line(`M${x - 6} ${y - 6}q4 5 2 11M${x + 5} ${y - 7}q-1 7 4 10`, 1.8, '#C4CDE3')}</g>`
}

function hotBottle(c: Ctx, x: number, y: number): string {
  const body = `M${x - 26} ${y - 22}Q${x - 26} ${y - 34} ${x - 14} ${y - 34}H${x + 14}Q${x + 26} ${y - 34} ${x + 26} ${y - 22}V${y + 30}Q${x + 26} ${y + 42} ${x + 14} ${y + 42}H${x - 14}Q${x - 26} ${y + 42} ${x - 26} ${y + 30}Z`
  const ribs = [-18, -10, 26, 34].map((dy) => line(`M${x - 17} ${y + dy}H${x + 17}`, 2.2, '#E25F4B', ' opacity=".7"')).join('')
  const heart = fillP(`M${x} ${y + 16}C${x - 14} ${y + 6} ${x - 12} ${y - 6} ${x - 5} ${y - 4}C${x - 2} ${y - 3} ${x} ${y} ${x} ${y + 1}C${x} ${y} ${x + 2} ${y - 3} ${x + 5} ${y - 4}C${x + 12} ${y - 6} ${x + 14} ${y + 6} ${x} ${y + 16}Z`, WHITE, ' opacity=".9"')
  const paw = (px: number, py: number): string => outlined(ell(px, py, 10, 8.5), c.p.fur === c.p.cream ? c.p.dark : c.p.fur, 2.8)
  return `<g class="bo-bottle" transform="rotate(-14 ${x} ${y})">${outlined(`M${x - 8} ${y - 34}V${y - 44}H${x + 8}V${y - 34}Z`, '#FF8C74', 2.8)}${outlined(`M${x - 11} ${y - 43}h22v-8a3 3 0 0 0 -3 -3h-16a3 3 0 0 0 -3 3Z`, TEAL, 2.8)}${outlined(body, '#FF8C74')}${ribs}${heart}${paw(x - 25, y + 6)}${paw(x + 25, y + 2)}</g>`
}

function cloud(x: number, y: number, k: number): string {
  const parts = [ell(x - 5 * k, y + 1.5 * k, 5 * k), ell(x + 1 * k, y - 2.5 * k, 6.2 * k), ell(x + 6.5 * k, y + 1.5 * k, 4.6 * k), ell(x, y + 3 * k, 6 * k, 4 * k)]
  const paths = parts.map((d) => `<path d="${d}"/>`).join('')
  return `<g fill="none" stroke="${INK}" stroke-width="4.4">${paths}</g><g fill="${WHITE}">${paths}</g>`
}

function coughPuffs(x: number, y: number, rise = 12): string {
  return `<g class="bo-puffs">${cloud(x + 8, y, 1)}${cloud(x + 26, y - rise, 0.75)}${cloud(x + 39, y - rise * 2, 0.52)}${line(`M${x + 10} ${y + 12}l3 5M${x + 22} ${y + 7}l5 3`, 2.2)}</g>`
}

function icePack(x: number, y: number, a: number): string {
  const bag = `M${x - 30} ${y + 2}Q${x - 34} ${y - 16} ${x - 12} ${y - 18}Q${x + 6} ${y - 22} ${x + 20} ${y - 12}Q${x + 26} ${y - 6} ${x + 24} ${y + 4}Q${x + 20} ${y + 12} ${x} ${y + 12}Q${x - 26} ${y + 14} ${x - 30} ${y + 2}Z`
  const check = [-16, -4, 8].map((dx) => fillP(ell(x + dx, y - 3, 3.2, 3.2), WHITE, ' opacity=".55"')).join('')
  return `<g class="bo-ice" transform="rotate(${a} ${x} ${y})">${outlined(bag, WATER)}${check}${line(`M${x - 22} ${y - 8}q6 -6 16 -6`, 2.6, WHITE)}${outlined(`M${x + 21} ${y - 11}l9 -4q4 6 0 14l-9 1Z`, TEAL, 2.6)}</g>`
}

function thermometer(x: number, y: number, a: number): string {
  return `<g class="bo-thermometer" transform="rotate(${a} ${x} ${y})">${outlined(`M${x + 2} ${y - 3.6}H${x + 40}a3.6 3.6 0 0 1 0 7.2H${x + 2}Z`, WHITE, 2.4)}${line(`M${x + 4} ${y}H${x + 24}`, 2.8, CHERRY)}${line(`M${x + 28} ${y - 3.6}v3M${x + 33} ${y - 3.6}v3`, 1.4)}${outlined(ell(x + 2, y, 4.6), CHERRY, 2.4)}</g>`
}

function ailmentBack(c: Ctx, s: Spec): string {
  if (c.ail === 'tooth' && s.aid.tooth && s.aid.tooth.r > 0) return toothSwell(c, s.aid.tooth)
  return ''
}

function ailmentHead(c: Ctx, s: Spec): string {
  const a = s.aid
  const [mx, my] = s.face.mouth
  switch (c.ail) {
    case 'ear':
      return a.ear ? earWrap(a.ear) : ''
    case 'tooth':
      return a.tooth ? toothBand(a.tooth) : ''
    case 'fever': {
      const ice = a.ice ? icePack(a.ice.x, a.ice.y, a.ice.a) : ''
      const beak = s.face.mouthStyle === 'beak'
      return `<g class="bo-ailment-head">${ice}${thermometer(mx + (beak ? 6 : 5), my + (beak ? 6 : 1), beak ? 20 : 16)}</g>`
    }
    case 'nose':
      return a.nose ? `<g class="bo-drip">${drop(a.nose[0], a.nose[1], 0.8)}</g>` : ''
    default:
      return ''
  }
}

function ailmentFront(c: Ctx, s: Spec): string {
  const a = s.aid
  const [mx, my] = s.face.mouth
  switch (c.ail) {
    case 'throat':
      return a.scarf ? scarf(a.scarf.y, a.scarf.w, CHERRY, WHITE) : ''
    case 'cough': {
      const scarfSvg = a.scarf ? scarf(a.scarf.y, a.scarf.w, LILAC, WHITE) : ''
      const beak = s.face.mouthStyle === 'beak'
      const off = beak ? 26 : 10 + 9 * (s.face.mouthW ?? 1)
      return scarfSvg + coughPuffs(mx + off, my + (beak ? 10 : -2), beak ? 4 : 12)
    }
    case 'paw':
      return a.paw ? pawAilment(c, a.paw) : ''
    case 'tummy':
      return a.bottle ? hotBottle(c, a.bottle[0], a.bottle[1]) : ''
    case 'nose':
      return a.paw ? `${pawAilment(c, a.paw, false)}${tissue(a.paw.x - 2, a.paw.y - 16)}` : ''
    default:
      return ''
  }
}

// ---------------------------------------------------------------- monster traits

function hornsSvg(f: Face): string {
  const [x, y] = f.horn
  const horn = `<g class="bo-horn">${outlined(`M${x - 8} ${y + 4}C${x - 9} ${y - 14} ${x + 2} ${y - 28} ${x + 16} ${y - 28}C${x + 25} ${y - 28} ${x + 26} ${y - 16} ${x + 18} ${y - 15}C${x + 12} ${y - 14} ${x + 12} ${y - 20} ${x + 16} ${y - 20}C${x + 8} ${y - 18} ${x + 7} ${y - 6} ${x + 8} ${y + 4}Z`, MONSTER_LIGHT, 2.8)}${line(`M${x - 6} ${y - 6}l12 2M${x - 3} ${y - 15}l10 4`, 2, MONSTER, ' opacity=".8"')}</g>`
  return `<g class="bo-horns">${pair(horn, f.axis)}</g>`
}

function antennaeSvg(f: Face): string {
  const [bx, by, tx, ty] = f.antenna
  const one = `${line(`M${bx} ${by}Q${n1(bx + (tx - bx) * 0.2 + 6)} ${n1((by + ty) / 2)} ${tx} ${ty}`, SW)}${outlined(ell(tx, ty, 7.5), MONSTER, 2.8)}<circle cx="${tx - 2.5}" cy="${ty - 2.5}" r="2.2" fill="${WHITE}"/>`
  return `<g class="bo-antennae">${pair(one, f.axis)}</g>`
}

function spotsSvg(f: Face): string {
  return `<g class="bo-spots" fill="${MONSTER}">${f.spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${n1(r * 1.2)}"/><circle cx="${n1(x - r * 0.4)}" cy="${n1(y - r * 0.4)}" r="${n1(r * 0.3)}" fill="${MONSTER_LIGHT}"/>`).join('')}</g>`
}

function tentaclesSvg(c: Ctx): string {
  const suck = (pts: Pt[], from: number, side: number): string =>
    pts
      .filter((_, i) => i >= from && i % 3 === 0 && i < pts.length - 2)
      .map(([x, y]) => `<circle cx="${n1(x + side * 4)}" cy="${n1(y)}" r="3" fill="${MONSTER_LIGHT}"/>`)
      .join('')
  const right = bez([206, 262], [232, 214], [168, 196], [204, 150], 20)
  const low = bez([158, 262], [150, 226], [182, 222], [176, 196], 14)
  const one = (pts: Pt[], w0: number, w1: number, side: number): string => mass(c, tube(pts, w0, w1), MONSTER) + suck(pts, 3, side)
  return `<g class="bo-tentacles">${pair(one(right, 30, 9, -1))}${one(low, 22, 8, 1)}</g>`
}

// ---------------------------------------------------------------- bodies

const SHOULDERS = 'M14 250C16 202 50 173 92 166Q120 161 148 166C190 173 224 202 226 250Z'

function shoulders(c: Ctx, fill: string, inner = ''): string {
  return mass(c, SHOULDERS, fill, inner + fillP(ell(120, 164, 56, 15), INK, ' opacity=".13"'))
}

function chest(c: Ctx, rx = 44, fill = c.p.cream): string {
  return fillP(ell(120, 250, rx, 66), fill)
}

// ---------------------------------------------------------------- the twenty patients

const lidFur = (p: Pal): string => p.fur
const lidCream = (p: Pal): string => p.cream

const SPECS: Record<Animal, Spec> = {
  giraffe: {
    pal: { fur: '#FFC94F', cream: '#FFE8B6', pattern: '#DE8233', dark: '#94552F', inner: '#FFA98A', nose: '#94552F' },
    face: {
      eye: [142, 82],
      eyeR: 8.5,
      lid: lidFur,
      lashes: true,
      third: [120, 57],
      mouth: [120, 129],
      mouthW: 0.9,
      cheek: [155, 101],
      horn: [150, 50],
      antenna: [140, 52, 162, 22],
      spots: [[96, 58, 5.5], [146, 60, 6], [84, 94, 5], [158, 92, 5.5], [106, 104, 4], [138, 120, 4.5]],
      sweat: [170, 60],
    },
    aid: { scarf: { y: 154, w: 33 } },
    body: (c) => {
      const neck = 'M92 116C96 160 88 204 62 250H178C152 204 144 160 148 116Z'
      const spots: [number, number, number][] = [[106, 148, 11], [137, 156, 10], [120, 182, 13], [92, 202, 12], [150, 204, 13], [120, 228, 13], [76, 238, 10], [164, 240, 10]]
      return mass(c, neck, c.p.fur, spots.map(([x, y, r], i) => fillP(blob(x, y, r, i + 2), c.p.pattern)).join('') + fillP(ell(120, 138, 40, 10), INK, ' opacity=".13"'))
    },
    back: (c) => {
      const oss = mass(c, 'M99 56L96 30Q103 25 110 30L113 56Z', c.p.fur) + outlined(ell(103, 25, 9.5), c.p.dark) + fillP(ell(100, 22, 3, 2.2), WHITE, ' opacity=".5"')
      const ear = mass(c, 'M84 64C70 50 50 50 40 58C48 73 68 80 86 76Z', c.p.fur, fillP('M78 66C68 59 56 59 48 61C56 69 68 72 80 71Z', c.p.inner))
      return pair(oss + ear)
    },
    head: (c) => {
      const patches = [[84, 64, 9, 11], [157, 62, 8, 12], [121, 44, 6, 13], [100, 40, 5, 14]]
        .map(([x, y, r, s]) => fillP(blob(x, y, r, s), c.p.pattern))
        .join('')
      const inner = patches + fillP(ell(120, 120, 33, 24), c.p.cream)
      return (
        mass(c, [ell(120, 76, 44, 38), ell(120, 113, 34, 27)], c.p.fur, inner, shadeOf(120, 88, 46, 52)) +
        `<g fill="${c.p.dark}"><ellipse cx="110" cy="111" rx="3" ry="4.2"/><ellipse cx="130" cy="111" rx="3" ry="4.2"/></g>`
      )
    },
  },

  bunny: {
    pal: { fur: '#FFF8F2', cream: '#FFE4EC', pattern: '#F2E3DC', dark: '#D8C3BD', inner: '#FFB0C4', nose: '#FF8FAB' },
    face: {
      eye: [146, 112],
      eyeR: 9,
      lid: lidFur,
      third: [120, 86],
      mouth: [120, 141],
      teeth: true,
      cheek: [165, 128],
      horn: [168, 88],
      antenna: [158, 74, 186, 36],
      spots: [[94, 86, 5], [148, 84, 5.5], [76, 118, 5], [166, 146, 5], [96, 150, 4.5], [120, 70, 4]],
      sweat: [184, 104],
    },
    aid: { ear: { x: 147, y: 50, a: 10, w: 42, h: 24 } },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => {
      const ear = `<g transform="rotate(-10 94 58)">${mass(c, ell(94, 52, 17, 40), c.p.fur, fillP(ell(95, 58, 8.5, 29), c.p.inner), shadeOf(94, 52, 17, 40, 4, -4))}</g>`
      return pair(ear)
    },
    head: (c) =>
      mass(c, ell(120, 115, 62, 52), c.p.fur, '', shadeOf(120, 115, 62, 52)) +
      outlined(`M113 127Q120 123 127 127Q125 133 120 134Q115 133 113 127Z`, c.p.nose, 2.4) +
      line('M120 134V139', 2.6) +
      line('M92 136l-20 -3M92 141l-19 3M148 136l20 -3M148 141l19 3', 2, INK, ' opacity=".45"'),
  },

  bear: {
    pal: { fur: '#C68652', cream: '#F6DDB9', pattern: '#A96C3F', dark: '#4E302B', inner: '#F0AE88', nose: '#4E302B' },
    face: {
      eye: [148, 104],
      eyeR: 9,
      lid: lidFur,
      third: [120, 76],
      mouth: [120, 146],
      cheek: [171, 132],
      horn: [150, 54],
      antenna: [134, 52, 150, 18],
      spots: [[88, 72, 5.5], [150, 70, 6], [70, 112, 5], [172, 108, 5.5], [78, 146, 4.5], [162, 150, 5]],
      sweat: [178, 76],
    },
    aid: { tooth: { cx: 120, cy: 110, rx: 62, ry: 58, swell: [77, 133], r: 17 } },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => pair(mass(c, ell(68, 58, 24), c.p.fur, fillP(ell(70, 60, 13), c.p.inner))),
    head: (c) =>
      mass(c, ell(120, 108, 70, 60), c.p.fur, '', shadeOf(120, 108, 70, 60)) +
      fillP(ell(120, 136, 30, 22), c.p.cream) +
      outlined('M109 124Q120 118 131 124Q129 134 120 136Q111 134 109 124Z', c.p.nose, 2.4) +
      fillP(ell(115, 124, 3.4, 1.8), WHITE, ' opacity=".7"') +
      line('M120 136V141', 2.6),
  },

  fox: {
    pal: { fur: '#FF8A3D', cream: '#FFFFFF', pattern: '#E0692A', dark: '#553447', inner: '#FFE0C7', nose: '#34213A' },
    face: {
      eye: [147, 106],
      eyeR: 9,
      lid: lidFur,
      third: [120, 76],
      mouth: [120, 153],
      cheek: [172, 134],
      horn: [150, 54],
      antenna: [132, 52, 146, 16],
      spots: [[92, 74, 5.5], [148, 72, 6], [66, 112, 5], [174, 112, 5], [120, 94, 4], [84, 142, 4.5]],
      sweat: [176, 78],
    },
    aid: { paw: { x: 180, y: 150, kind: 'paw' } },
    body: (c) => shoulders(c, c.p.fur, fillP('M88 250C86 214 100 186 120 180C140 186 154 214 152 250Z', c.p.cream)),
    back: (c) => {
      const earD = 'M56 96L58 32Q60 18 72 24L110 58Z'
      const tip = fillP('M50 16H88V40Q70 31 50 45Z', c.p.dark)
      return pair(mass(c, earD, c.p.fur, fillP('M66 84L68 42L98 64Z', c.p.inner) + tip))
    },
    head: (c) => {
      const headD = 'M120 48C160 48 186 72 190 102L208 126Q188 142 166 154Q146 170 120 170Q94 170 74 154Q52 142 32 126L50 102C54 72 80 48 120 48Z'
      const mask = fillP('M30 126Q58 114 84 124Q106 132 120 134Q134 132 156 124Q182 114 210 126V172H30Z', c.p.cream)
      return (
        mass(c, headD, c.p.fur, mask, shadeOf(120, 108, 80, 62, -5, -8)) +
        outlined(ell(120, 139, 9, 6.5), c.p.nose, 2.4) +
        fillP(ell(117, 137, 2.8, 1.5), WHITE, ' opacity=".7"') +
        line('M120 145V149', 2.6)
      )
    },
  },

  elephant: {
    pal: { fur: '#A6B9E2', cream: '#C8D5F2', pattern: '#8EA2D2', dark: '#6E80B3', inner: '#F8B6C8', nose: '#FF6B7E' },
    face: {
      eye: [146, 94],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 66],
      mouth: [99, 148],
      mouthW: 0.75,
      cheek: [166, 122],
      horn: [150, 50],
      antenna: [134, 48, 150, 16],
      spots: [[94, 66, 5], [150, 64, 5.5], [74, 116, 4.5], [164, 140, 4.5], [30, 104, 5], [210, 104, 5], [120, 50, 4]],
      sweat: [170, 68],
    },
    aid: { nose: [160, 156] },
    body: (c) => shoulders(c, c.p.fur),
    back: (c) =>
      pair(mass(c, 'M78 72C54 44 14 52 12 96C10 140 38 162 72 148Q86 132 84 110Z', c.p.fur, fillP('M72 84C54 64 28 70 25 99C24 130 44 144 67 136Q76 124 76 108Z', c.p.inner))),
    head: (c) => {
      const t = tubeParts(bez([120, 96], [117, 136], [127, 164], [153, 150], 18), 28, 16)
      const tip = c.ail === 'nose' ? fillP(ell(152, 151, 11), c.p.nose) : ''
      const wrinkles = line('M108 120q12 4 24 0M109 131q11 4 22 0M112 142q8 3 16 -1', 2.2, INK, ' opacity=".3"')
      const id = uid(c)
      c.defs.push(`<clipPath id="${id}"><path d="${t.outline}"/></clipPath>`)
      return (
        mass(c, ell(120, 102, 60, 60), c.p.fur, '', shadeOf(120, 102, 60, 60)) +
        fillP(t.outline, c.p.fur) +
        `<g clip-path="url(#${id})">${wrinkles}${tip}</g>` +
        line(t.sides, SW) +
        `<ellipse cx="156" cy="148.5" rx="3.2" ry="6" transform="rotate(-27 156 148.5)" fill="${INK}" opacity=".6"/>`
      )
    },
  },

  pig: {
    pal: { fur: '#FFB2C1', cream: '#FFD6DE', pattern: '#F58DA5', dark: '#C84D6E', inner: '#FF8FA8', nose: '#FF93AB' },
    face: {
      eye: [150, 100],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 72],
      mouth: [120, 157],
      cheek: [174, 132],
      horn: [148, 52],
      antenna: [132, 52, 148, 16],
      spots: [[90, 70, 5.5], [152, 68, 6], [68, 108, 5], [172, 104, 5], [80, 150, 4.5], [160, 154, 5]],
      sweat: [180, 72],
    },
    aid: { bottle: [42, 182] },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => pair(mass(c, 'M70 80L54 30Q56 20 66 24L108 56Z', c.p.fur, fillP('M72 70L63 38L98 60Z', c.p.inner))),
    head: (c) =>
      mass(c, ell(120, 108, 70, 60), c.p.fur, '', shadeOf(120, 108, 70, 60)) +
      mass(c, ell(120, 131, 25, 18), c.p.nose) +
      `<g fill="${c.p.dark}"><ellipse cx="111" cy="131" rx="4" ry="7"/><ellipse cx="129" cy="131" rx="4" ry="7"/></g>` +
      fillP(ell(112, 120, 5, 2), WHITE, ' opacity=".55"'),
  },

  frog: {
    pal: { fur: '#4FC27A', cream: '#D6F5B0', pattern: '#35A263', dark: '#2A8A52', inner: '#FF9FB2', nose: '#2A8A52' },
    green: { fur: '#B8EE4A', cream: '#EEFFC0', pattern: '#86C23A', dark: '#6FA82E' },
    face: {
      eye: [156, 76],
      eyeR: 9,
      ring: 15,
      lid: lidFur,
      third: [120, 96],
      mouth: [120, 134],
      mouthW: 1.9,
      cheek: [178, 126],
      horn: [168, 58],
      antenna: [146, 72, 132, 26],
      spots: [[62, 110, 5.5], [178, 104, 5.5], [104, 104, 4], [140, 106, 4.5], [72, 142, 5], [168, 146, 5]],
      sweat: [192, 90],
    },
    aid: { scarf: { y: 166, w: 54 } },
    body: (c) => shoulders(c, c.p.fur, chest(c, 50)),
    back: () => '',
    head: (c) =>
      mass(c, [ell(120, 120, 78, 48), ell(84, 76, 28), ell(156, 76, 28)], c.p.fur, fillP('M40 150Q120 128 200 150V170H40Z', c.p.cream), shadeOf(120, 112, 80, 60, -5, -8)) +
      `<g fill="${c.p.dark}"><ellipse cx="113" cy="112" rx="2.4" ry="3"/><ellipse cx="127" cy="112" rx="2.4" ry="3"/></g>`,
  },

  owl: {
    pal: { fur: '#BC8657', cream: '#FBE6C4', pattern: '#9A6640', dark: '#7A4E30', inner: '#FFB23F', nose: '#FFB23F' },
    face: {
      eye: [149, 100],
      eyeR: 11.5,
      lid: lidCream,
      happyOpen: true,
      third: [120, 64],
      mouth: [120, 124],
      mouthStyle: 'beak',
      cheek: [170, 134],
      horn: [150, 54],
      antenna: [132, 52, 146, 16],
      spots: [[84, 66, 5.5], [156, 64, 5.5], [60, 116, 5], [180, 116, 5], [120, 148, 4.5], [98, 140, 4]],
      sweat: [184, 76],
    },
    aid: { ice: { x: 132, y: 45, a: 14 } },
    body: (c) => {
      const bodyD = 'M20 250C18 198 54 160 120 158C186 160 222 198 220 250Z'
      const belly = fillP(ell(120, 244, 60, 72), c.p.cream)
      const marks = [[104, 192], [136, 192], [120, 206], [96, 222], [144, 222], [120, 236]]
        .map(([x, y]) => line(`M${x - 6} ${y}q6 6 12 0`, 2.6, c.p.pattern))
        .join('')
      const wings = fillP('M22 250C20 214 32 186 58 174C70 198 68 228 60 250Z', c.p.pattern) + fillP('M218 250C220 214 208 186 182 174C170 198 172 228 180 250Z', c.p.pattern)
      return mass(c, bodyD, c.p.fur, belly + marks + wings + fillP(ell(120, 158, 60, 14), INK, ' opacity=".13"'))
    },
    back: (c) => pair(mass(c, 'M66 78C58 60 52 44 50 30C60 36 68 44 74 52C74 44 76 38 80 34C86 44 92 52 98 60Z', c.p.fur, line('M58 42q6 10 12 20M78 44q2 8 6 14', 2.2, c.p.pattern))),
    head: (c) => {
      const discs = `<g fill="${c.p.cream}" stroke="${c.p.pattern}" stroke-width="3">${`<path d="${ell(91, 101, 31)}"/><path d="${ell(149, 101, 31)}"/>`}</g>`
      return mass(c, ell(120, 104, 76, 62), c.p.fur, discs, shadeOf(120, 104, 76, 62)) + line('M92 64Q106 64 120 76Q134 64 148 64', 3, c.p.pattern)
    },
  },

  zebra: {
    pal: { fur: '#FFFFFF', cream: '#D3CAEB', pattern: '#2E3454', dark: '#2E3454', inner: '#FFB6C8', nose: '#6E6390' },
    face: {
      eye: [149, 100],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 74],
      mouth: [120, 160],
      cheek: [166, 124],
      horn: [150, 56],
      antenna: [136, 54, 154, 18],
      spots: [[88, 76, 5.5], [152, 74, 5.5], [70, 108, 5], [170, 106, 5], [98, 136, 4.5], [142, 134, 4.5]],
      sweat: [174, 74],
    },
    aid: { paw: { x: 182, y: 150, kind: 'hoof' } },
    body: (c) => {
      const stripes = [0, 1, 2, 3].map((i) => line(`M10 ${184 + i * 20}Q60 ${176 + i * 20} 92 ${192 + i * 22}M230 ${184 + i * 20}Q180 ${176 + i * 20} 148 ${192 + i * 22}`, 8, c.p.pattern)).join('')
      return shoulders(c, c.p.fur, stripes)
    },
    back: (c) => {
      const ear = mass(c, 'M86 68C68 54 66 26 78 14C94 22 102 44 102 62Z', c.p.fur, fillP('M88 58C78 48 78 32 82 24C90 32 95 44 95 56Z', c.p.inner))
      const mane = mass(c, 'M98 60L96 34L106 44L112 22L120 38L128 22L134 44L144 34L142 60Z', c.p.dark, line('M112 30L114 56M128 30L126 56', 3, WHITE))
      return pair(ear) + mane
    },
    head: (c) => {
      const s = c.p.pattern
      const stripes =
        line('M62 70Q80 76 90 66M60 90Q78 90 90 82M60 116Q78 112 94 120M180 70Q162 76 150 66M180 90Q162 90 150 82M180 116Q162 112 146 120', 7, s) +
        line('M104 50Q120 60 136 50M100 64Q120 76 140 64M108 80Q120 88 132 80', 6.5, s) +
        fillP(ell(120, 146, 40, 25), c.p.cream)
      return (
        mass(c, [ell(120, 96, 56, 50), ell(120, 142, 40, 28)], c.p.fur, stripes, shadeOf(120, 110, 58, 64)) +
        `<g fill="${c.p.nose}"><ellipse cx="106" cy="144" rx="4" ry="5.6"/><ellipse cx="134" cy="144" rx="4" ry="5.6"/></g>`
      )
    },
  },

  panda: {
    pal: { fur: '#FFFFFF', cream: '#FFFFFF', pattern: '#3B3F5F', dark: '#3B3F5F', inner: '#5C6185', nose: '#3B3F5F' },
    face: {
      eye: [148, 108],
      eyeR: 6.4,
      ring: 9,
      darkEyes: true,
      lid: (p) => p.dark,
      third: [120, 78],
      mouth: [120, 145],
      cheek: [174, 134],
      horn: [150, 54],
      antenna: [134, 52, 150, 18],
      spots: [[92, 72, 5.5], [150, 70, 5.5], [64, 108, 5], [176, 104, 5], [84, 150, 4.5], [158, 152, 4.5]],
      sweat: [180, 78],
    },
    aid: { bottle: [42, 184] },
    body: (c) => shoulders(c, c.p.dark, chest(c, 40, c.p.fur)),
    back: (c) => pair(mass(c, ell(68, 58, 24), c.p.dark)),
    head: (c) =>
      mass(c, ell(120, 108, 70, 60), c.p.fur, '', shadeOf(120, 108, 70, 60)) +
      pair(`<ellipse cx="92" cy="109" rx="17" ry="23" transform="rotate(40 92 109)" fill="${c.p.dark}"/>`) +
      outlined(ell(120, 130, 9, 6.5), c.p.nose, 2.2) +
      fillP(ell(117, 128, 2.8, 1.5), WHITE, ' opacity=".6"') +
      line('M120 136V141', 2.6),
  },

  hedgehog: {
    pal: { fur: '#F8DDBE', cream: '#FFF3E4', pattern: '#8C6653', dark: '#6A4A3C', inner: '#F2A98E', nose: '#3E2A2E' },
    green: { fur: '#9BE15D', cream: '#DDF7B5', pattern: '#4E9A3C', dark: '#3E7F30' },
    face: {
      eye: [144, 108],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 84],
      mouth: [120, 159],
      mouthW: 0.85,
      cheek: [160, 130],
      horn: [148, 62],
      antenna: [132, 48, 148, 16],
      spots: [[94, 84, 5], [146, 82, 5], [76, 118, 4.5], [164, 116, 4.5], [88, 150, 4], [152, 152, 4]],
      sweat: [168, 84],
    },
    aid: { nose: [114, 151], paw: { x: 184, y: 154, kind: 'paw' } },
    body: (c) => shoulders(c, c.p.pattern, chest(c, 44, c.p.fur)),
    back: (c) => {
      const spikes = (cx: number, cy: number, rx: number, ry: number, n: number, depth: number): string => {
        let d = ''
        const a0 = (150 * Math.PI) / 180
        const a1 = (390 * Math.PI) / 180
        for (let i = 0; i <= n * 2; i++) {
          const a = a0 + ((a1 - a0) * i) / (n * 2)
          const k = i % 2 === 0 ? 1 - depth : 1
          d += `${i === 0 ? 'M' : 'L'}${n1(cx + Math.cos(a) * rx * k)} ${n1(cy + Math.sin(a) * ry * k)}`
        }
        return d + `L${cx} ${cy + 30}Z`
      }
      const outer = mass(c, spikes(120, 112, 98, 90, 13, 0.2), c.p.pattern)
      const inner = fillP(spikes(120, 118, 80, 72, 11, 0.22), c.p.dark, ' opacity=".35"')
      const ear = pair(mass(c, ell(80, 72, 13), c.p.fur, fillP(ell(81, 73, 7), c.p.inner)))
      return outer + inner + ear
    },
    head: (c) => {
      const face = 'M120 62C155 62 180 84 178 112C176 134 158 148 142 156Q130 166 120 166Q110 166 98 156C82 148 64 134 62 112C60 84 85 62 120 62Z'
      return (
        mass(c, face, c.p.fur, fillP(ell(120, 152, 26, 18), c.p.cream), shadeOf(120, 112, 60, 56)) +
        outlined(ell(120, 144, 9.5, 8), c.ail === 'nose' ? CHERRY : c.p.nose, 2.4) +
        fillP(ell(116.5, 141, 3.2, 2), WHITE, ' opacity=".6"')
      )
    },
  },

  cow: {
    pal: { fur: '#FFFFFF', cream: '#FFB8C6', pattern: '#3E4468', dark: '#3E4468', inner: '#FFB8C6', nose: '#D96F8C' },
    face: {
      eye: [148, 100],
      eyeR: 8.5,
      lid: lidFur,
      lashes: true,
      third: [120, 72],
      mouth: [120, 159],
      cheek: [168, 124],
      horn: [156, 54],
      antenna: [134, 50, 150, 16],
      spots: [[104, 68, 5], [150, 70, 5.5], [70, 110, 5], [172, 104, 5], [84, 150, 4.5], [156, 152, 4.5]],
      sweat: [176, 72],
    },
    aid: { ice: { x: 124, y: 44, a: 10 } },
    body: (c) => shoulders(c, c.p.fur, fillP(blob(54, 214, 26, 5, 7), c.p.pattern) + fillP(blob(186, 236, 24, 9, 7), c.p.pattern)),
    back: (c) => {
      const ear = `<g transform="rotate(22 58 88)">${mass(c, ell(58, 88, 22, 10.5), c.p.fur, fillP(ell(61, 89, 14, 5.5), c.p.inner))}</g>`
      const horn = mass(c, 'M88 62Q78 40 90 30Q104 34 106 58Z', '#FFE3A3', fillP(ell(84, 34, 8, 5), '#F2C66E'))
      return pair(ear + horn)
    },
    head: (c) =>
      mass(c, ell(120, 102, 60, 56), c.p.fur, fillP(blob(74, 66, 22, 21, 7), c.p.pattern) + fillP(blob(166, 74, 13, 4, 6), c.p.pattern), shadeOf(120, 102, 60, 56)) +
      line('M112 50Q114 40 122 44Q126 36 132 46', 3) +
      mass(c, ell(120, 146, 48, 25), c.p.cream) +
      `<g fill="${c.p.nose}"><ellipse cx="104" cy="143" rx="5" ry="7"/><ellipse cx="136" cy="143" rx="5" ry="7"/></g>` +
      fillP(ell(106, 132, 8, 2.5), WHITE, ' opacity=".5"'),
  },

  monkey: {
    pal: { fur: '#A96A45', cream: '#F8CCA6', pattern: '#8B5334', dark: '#6B3F28', inner: '#F8CCA6', nose: '#6B3F28' },
    face: {
      eye: [141, 104],
      eyeR: 8.5,
      lid: lidCream,
      third: [120, 70],
      mouth: [120, 146],
      cheek: [160, 134],
      horn: [150, 50],
      antenna: [134, 48, 150, 16],
      spots: [[86, 66, 5.5], [152, 64, 5.5], [66, 104, 5], [174, 104, 5], [96, 150, 4], [148, 152, 4]],
      sweat: [176, 72],
    },
    aid: { paw: { x: 182, y: 152, kind: 'hand' } },
    body: (c) => shoulders(c, c.p.fur, chest(c, 40)),
    back: (c) => pair(mass(c, ell(52, 108, 22), c.p.fur, fillP(ell(55, 109, 13), c.p.inner))),
    head: (c) => {
      const face = `<g fill="${c.p.cream}"><path d="${ell(99, 101, 25)}"/><path d="${ell(141, 101, 25)}"/><path d="${ell(120, 134, 44, 30)}"/></g>`
      return (
        mass(c, ell(120, 104, 64, 60), c.p.fur, face, shadeOf(120, 104, 64, 60)) +
        line('M110 46Q112 30 128 32Q118 38 124 46', SW) +
        `<g fill="${c.p.dark}"><ellipse cx="115" cy="127" rx="2.4" ry="3.2"/><ellipse cx="125" cy="127" rx="2.4" ry="3.2"/></g>`
      )
    },
  },

  penguin: {
    pal: { fur: '#3D4C78', cream: '#FFFFFF', pattern: '#2F3C63', dark: '#2F3C63', inner: '#FFA43A', nose: '#FFA43A' },
    face: {
      eye: [144, 108],
      eyeR: 8.5,
      lid: lidCream,
      third: [120, 76],
      mouth: [120, 128],
      mouthStyle: 'beak',
      cheek: [165, 130],
      horn: [150, 52],
      antenna: [134, 50, 150, 16],
      spots: [[92, 70, 5.5], [150, 68, 5.5], [66, 110, 5], [174, 108, 5], [96, 146, 4.5], [146, 148, 4.5]],
      sweat: [180, 78],
    },
    aid: { scarf: { y: 166, w: 54 } },
    body: (c) => {
      const flipper = fillP('M28 250C24 216 34 190 56 178C62 200 58 228 50 250Z', c.p.dark)
      return shoulders(c, c.p.fur, chest(c, 50) + flipper + mirror(flipper))
    },
    back: () => '',
    head: (c) => {
      const face = `<g fill="${c.p.cream}"><path d="${ell(97, 110, 28)}"/><path d="${ell(143, 110, 28)}"/><path d="${ell(120, 134, 46, 30)}"/></g>`
      return mass(c, ell(120, 104, 66, 60), c.p.fur, face, shadeOf(120, 104, 66, 60)) + line('M114 46Q116 32 128 34M120 46Q126 36 136 40', SW)
    },
  },

  lion: {
    pal: { fur: '#FFC553', cream: '#FFF0CE', pattern: '#EB8A3C', dark: '#B9582C', inner: '#F59F5F', nose: '#C75C4C' },
    face: {
      eye: [146, 102],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 76],
      mouth: [120, 147],
      cheek: [166, 128],
      horn: [152, 44],
      antenna: [132, 36, 146, 14],
      spots: [[92, 74, 5], [148, 72, 5.5], [72, 110, 4.5], [168, 108, 4.5], [86, 150, 4], [154, 150, 4]],
      sweat: [172, 72],
    },
    aid: { scarf: { y: 171, w: 50 } },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => {
      const mane = mass(c, scallop(120, 106, 88, 82, 16, 1.12, -Math.PI / 2), c.p.pattern, fillP(ell(120, 108, 72, 66), c.p.dark, ' opacity=".35"'))
      const ear = pair(mass(c, ell(76, 60, 17), c.p.fur, fillP(ell(78, 62, 9), c.p.inner)))
      return mane + ear
    },
    head: (c) =>
      mass(c, ell(120, 108, 60, 56), c.p.fur, '', shadeOf(120, 108, 60, 56)) +
      `<g fill="${c.p.cream}"><circle cx="108" cy="137" r="15"/><circle cx="132" cy="137" r="15"/></g>` +
      outlined('M110 124Q120 119 130 124Q128 132 120 134Q112 132 110 124Z', c.p.nose, 2.4) +
      fillP(ell(116, 124, 3, 1.6), WHITE, ' opacity=".6"') +
      line('M120 134V139', 2.6),
  },

  sheep: {
    pal: { fur: '#FFFFFF', cream: '#F5CFB2', pattern: '#E6E0F4', dark: '#9A8CA8', inner: '#FFB3C6', nose: '#A0667A' },
    face: {
      eye: [139, 120],
      eyeR: 8,
      lid: lidCream,
      third: [120, 100],
      mouth: [120, 153],
      cheek: [155, 142],
      horn: [158, 48],
      antenna: [132, 32, 146, 14],
      spots: [[98, 104, 4.5], [142, 102, 4.5], [88, 140, 4], [152, 158, 4], [60, 60, 5], [182, 60, 5], [120, 162, 3.5]],
      sweat: [160, 96],
    },
    aid: { ear: { x: 194, y: 116, a: -12, w: 24, h: 30 } },
    body: (c) => mass(c, scallop(120, 226, 108, 62, 18, 1.1, Math.PI), c.p.fur, fillP(ell(120, 170, 56, 15), INK, ' opacity=".1"')),
    back: (c) => {
      const wool = mass(c, scallop(120, 104, 80, 76, 14, 1.15, -Math.PI / 2), c.p.fur, '', shadeOf(120, 104, 80, 76, -6, -10))
      const ear = pair(`<g transform="rotate(-14 48 118)">${mass(c, ell(48, 118, 22, 10), c.p.cream, fillP(ell(46, 118, 14, 5), c.p.inner))}</g>`)
      return wool + ear
    },
    head: (c) =>
      mass(c, ell(120, 126, 44, 44), c.p.cream, '', shadeOf(120, 126, 44, 44)) +
      mass(c, scallop(120, 86, 40, 14, 9, 1.2, Math.PI), c.p.fur) +
      outlined('M113 139Q120 136 127 139Q125 145 120 146Q115 145 113 139Z', c.p.nose, 2.2) +
      line('M120 146V150', 2.4),
  },

  mouse: {
    pal: { fur: '#BAC0DE', cream: '#E8EBF8', pattern: '#9CA3C9', dark: '#737BA6', inner: '#FFB3C7', nose: '#FF8FAB' },
    face: {
      eye: [146, 108],
      eyeR: 8.5,
      lid: lidFur,
      third: [120, 82],
      mouth: [120, 149],
      teeth: true,
      cheek: [166, 134],
      horn: [146, 62],
      antenna: [130, 60, 138, 22],
      spots: [[94, 82, 5], [146, 80, 5.5], [72, 116, 4.5], [168, 114, 4.5], [40, 50, 5], [200, 52, 5]],
      sweat: [172, 84],
    },
    aid: { tooth: { cx: 120, cy: 114, rx: 55, ry: 55, swell: [80, 136], r: 15 } },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => pair(mass(c, ell(58, 66, 36), c.p.fur, fillP(ell(61, 69, 24), c.p.inner))),
    head: (c) =>
      mass(c, ell(120, 112, 58, 54), c.p.fur, '', shadeOf(120, 112, 58, 54)) +
      fillP(ell(120, 140, 26, 17), c.p.cream) +
      outlined(ell(120, 131, 7.5, 6.5), c.p.nose, 2.4) +
      fillP(ell(117.5, 129, 2.4, 1.4), WHITE, ' opacity=".7"') +
      line('M120 137V142', 2.4) +
      line('M96 138l-26 -6M96 144l-26 2M144 138l26 -6M144 144l26 2', 2, INK, ' opacity=".45"'),
  },

  hippo: {
    pal: { fur: '#B8A5E3', cream: '#D5C8F4', pattern: '#9C87D0', dark: '#7B66B8', inner: '#FFB3C6', nose: '#7B66B8' },
    face: {
      eye: [146, 84],
      eyeR: 8,
      lid: lidFur,
      third: [120, 62],
      mouth: [120, 150],
      mouthW: 2,
      cheek: [172, 138],
      horn: [150, 48],
      antenna: [134, 46, 150, 14],
      spots: [[90, 62, 5], [152, 60, 5.5], [62, 136, 5], [178, 116, 5], [96, 160, 4.5], [146, 162, 4.5]],
      sweat: [170, 58],
    },
    aid: { ice: { x: 118, y: 44, a: -8 } },
    body: (c) => shoulders(c, c.p.fur, chest(c)),
    back: (c) => pair(mass(c, ell(80, 50, 12, 14), c.p.fur, fillP(ell(81, 52, 6, 8), c.p.inner))),
    head: (c) =>
      mass(c, [ell(120, 90, 56, 46), ell(120, 134, 72, 36)], c.p.fur, fillP(ell(120, 140, 70, 30), c.p.cream), shadeOf(120, 116, 74, 56)) +
      `<g fill="${c.p.dark}"><ellipse cx="102" cy="120" rx="5" ry="7"/><ellipse cx="138" cy="120" rx="5" ry="7"/></g>`,
  },

  crocodile: {
    fit: [1.1, -5, -3],
    pal: { fur: '#4CB47C', cream: '#E6F5B8', pattern: '#3B9A66', dark: '#2B7F52', inner: '#FF9FB2', nose: '#2B7F52' },
    green: { fur: '#B8EE4A', cream: '#F3FFC8', pattern: '#86C23A', dark: '#6FA82E' },
    face: {
      axis: 141,
      eye: [165, 64],
      eyeR: 7.5,
      ring: 12.5,
      lid: lidFur,
      third: [141, 94],
      mouth: [150, 134],
      mouthStyle: 'croc',
      cheek: [174, 124],
      horn: [176, 54],
      antenna: [158, 56, 178, 20],
      spots: [[70, 108, 4.5], [98, 102, 5], [150, 108, 5], [188, 104, 5], [124, 118, 4], [180, 136, 4.5]],
      sweat: [200, 90],
      sparkles: [[26, 44, 12], [216, 32, 9], [218, 160, 8]],
    },
    aid: { tooth: { cx: 74, cy: 124, rx: 10, ry: 29, swell: [0, 0], r: 0, snout: true } },
    body: (c) => {
      const scales = [[92, 198], [120, 190], [148, 198]].map(([x, y]) => fillP(ell(x, y, 8, 6), c.p.pattern)).join('')
      return shoulders(c, c.p.fur, chest(c, 40) + scales)
    },
    back: () => '',
    head: (c) => {
      const snout = 'M128 80C98 84 66 92 46 99C24 106 18 122 22 134C26 146 40 150 62 152C98 156 132 156 158 150Z'
      const jaw = fillP('M16 131Q90 140 150 136L198 134V160H16Z', c.p.cream)
      const bumps = `<g fill="${c.p.pattern}"><circle cx="70" cy="104" r="3.4"/><circle cx="88" cy="98" r="3.8"/><circle cx="106" cy="94" r="3.4"/><circle cx="84" cy="114" r="2.6"/><circle cx="102" cy="108" r="2.6"/><circle cx="178" cy="92" r="3.4"/><circle cx="186" cy="108" r="2.8"/></g>`
      return (
        mass(c, [ell(146, 102, 50, 44), ell(118, 64, 19), ell(165, 62, 21), snout, ell(40, 106, 11)], c.p.fur, jaw + bumps, shadeOf(110, 104, 90, 52, -4, -8)) +
        `<ellipse cx="38" cy="103" rx="3.2" ry="2.4" fill="${c.p.dark}"/>`
      )
    },
  },

  dog: {
    pal: { fur: '#FFF6EA', cream: '#FFFFFF', pattern: '#B67B4C', dark: '#3A2E38', inner: '#FFB3C6', nose: '#3A2E38' },
    face: {
      eye: [146, 104],
      eyeR: 9,
      lid: (p, side) => (side > 0 ? p.pattern : p.fur),
      third: [120, 74],
      mouth: [120, 147],
      cheek: [166, 132],
      horn: [148, 54],
      antenna: [132, 52, 148, 16],
      spots: [[98, 72, 5], [144, 68, 5], [84, 118, 4.5], [158, 124, 4.5], [104, 156, 4], [138, 156, 4]],
      sweat: [174, 76],
    },
    aid: { ear: { x: 184, y: 104, a: -10, w: 40, h: 22 } },
    body: (c) =>
      shoulders(c, c.p.fur, fillP(ell(60, 220, 7), c.p.dark) + fillP(ell(182, 212, 6), c.p.dark) + fillP(ell(164, 236, 5), c.p.dark)) +
      line('M74 170Q120 184 166 170', 12 + SW * 2) +
      line('M74 170Q120 184 166 170', 12, CHERRY) +
      outlined(ell(120, 188, 9), SUNNY, 2.6) +
      fillP(ell(118, 186, 3, 2), WHITE, ' opacity=".7"'),
    back: () => '',
    head: (c) => {
      const spots = fillP(blob(148, 100, 21, 31, 7, 0.45), c.p.pattern) + `<g fill="${c.p.dark}"><circle cx="100" cy="64" r="4"/><circle cx="88" cy="76" r="3"/><circle cx="110" cy="74" r="2.6"/></g>`
      const ear = mass(c, 'M80 58C54 52 36 74 38 112C40 136 54 148 66 140C78 132 76 108 86 82Z', c.p.pattern, '', shadeOf(62, 100, 30, 50, -4, -8))
      return (
        mass(c, ell(120, 106, 64, 56), c.p.fur, spots, shadeOf(120, 106, 64, 56)) +
        pair(ear) +
        outlined('M108 124Q120 117 132 124Q131 135 120 137Q109 135 108 124Z', c.p.nose, 2.4) +
        fillP(ell(114, 124, 3.4, 1.8), WHITE, ' opacity=".7"') +
        line('M120 137V142', 2.6)
      )
    },
  },
}

const GREEN: Partial<Pal> = { fur: '#9BE15D', cream: '#DDF7B5', pattern: '#4E9A3C', dark: '#3E7F30' }

export const ANIMAL_COLOR: Record<Animal, string> = {
  giraffe: '#FFC94F',
  bunny: '#FFB0C4',
  bear: '#C68652',
  fox: '#FF8A3D',
  elephant: '#A6B9E2',
  pig: '#FFB2C1',
  frog: '#4FC27A',
  owl: '#BC8657',
  zebra: '#2E3454',
  panda: '#3B3F5F',
  hedgehog: '#8C6653',
  cow: '#3E4468',
  monkey: '#A96A45',
  penguin: '#3D4C78',
  lion: '#FFC553',
  sheep: '#E6E0F4',
  mouse: '#BAC0DE',
  hippo: '#B8A5E3',
  crocodile: '#4CB47C',
  dog: '#B67B4C',
}

function makeCtx(animal: Animal, id: string | undefined, mood: Mood, ail: Ailment | null, traits: readonly MonsterTrait[]): Ctx {
  const spec = SPECS[animal]
  const set = new Set(traits)
  const p = set.has('green') ? { ...spec.pal, ...GREEN, ...spec.green } : spec.pal
  counter += 1
  return { id: id ?? `bo-an${counter}`, n: 0, defs: [], p, mood, ail, traits: set }
}

/** Head group (ears, face, head-level ailment and trait marks) without the body. */
function headGroup(c: Ctx, s: Spec): string {
  const f = s.face
  const back = s.back(c) + (c.traits.has('horns') ? hornsSvg(f) : '') + (c.traits.has('antennae') ? antennaeSvg(f) : '')
  const sweat = c.mood === 'sick' ? `<g class="bo-sweat">${drop(f.sweat[0], f.sweat[1], 0.85)}</g>` : ''
  const inner = `${back}${s.head(c)}${ailmentBack(c, s)}${c.traits.has('spots') ? spotsSvg(f) : ''}${cheeksSvg(c, f, s.aid.tooth && s.aid.tooth.r > 0 ? s.aid.tooth.swell[0] : null)}${eyesSvg(c, f)}${mouthSvg(c, f)}${ailmentHead(c, s)}${sweat}`
  const fitted = s.fit ? `<g transform="matrix(${s.fit[0]} 0 0 ${s.fit[0]} ${s.fit[1]} ${s.fit[2]})">${inner}</g>` : inner
  return `<g class="bo-head">${fitted}</g>`
}

function defsOf(c: Ctx): string {
  return c.defs.length ? `<defs>${c.defs.join('')}</defs>` : ''
}

/** Head-and-shoulders portrait of a patient; the face fits above y 172 so a blanket can cover the rest. */
export function animalPortrait(animal: Animal, options: PortraitOptions = {}): string {
  const s = SPECS[animal]
  const mood = options.mood ?? 'sick'
  const ail = options.ailment && mood !== 'happy' ? ANIMAL_AILMENT[animal] : null
  const c = makeCtx(animal, options.id, mood, ail, options.traits ?? [])
  const body = `<g class="bo-body">${s.body(c)}</g>`
  const tentacles = c.traits.has('tentacles') ? tentaclesSvg(c) : ''
  const head = headGroup(c, s)
  const front = ail ? `<g class="bo-ailment bo-ailment--${ail}">${ailmentFront(c, s)}</g>` : ''
  const stars = (s.face.sparkles ?? [[28, 40, 12], [214, 32, 9], [218, 150, 8]]).map(([x, y, r]) => sparkle(x, y, r)).join('')
  const sparkles = mood === 'happy' ? `<g class="bo-sparkles">${stars}</g>` : ''
  const monster = c.traits.size ? ' bo-portrait--monster' : ''
  return `<svg viewBox="0 0 240 240" aria-hidden="true" focusable="false" class="bo-portrait bo-portrait--${animal} bo-mood--${mood}${monster}">${defsOf(c)}${body}${tentacles}${head}${front}${sparkles}</svg>`
}

const MONSTER_COATS = [
  { fur: '#A77BEA', belly: '#D9C6FF', shade: '#8A5BD6' },
  { fur: '#9BE15D', belly: '#DDF7B5', shade: '#6FBF3A' },
  { fur: '#FF9F45', belly: '#FFD9A8', shade: '#E9772A' },
]

/** The photo reveal: a fluffy monster caught holding this animal's face up as a mask on a stick. */
export function monsterUnmasked(animal: Animal, options: { id?: string; variant?: number } = {}): string {
  const coat = MONSTER_COATS[((options.variant ?? 0) % 3 + 3) % 3]
  const c = makeCtx(animal, options.id, 'better', null, [])
  const s = SPECS[animal]
  const mask = `<g class="bo-mask" transform="rotate(8 176 70)"><g transform="translate(108 14) scale(.52)">${headGroup(c, s)}</g></g>`
  const stick = line('M179 64L188 226', 6 + SW * 2) + line('M179 64L188 226', 6, '#C98E5A')
  const body = mass(c, scallop(94, 146, 72, 70, 20, 1.18, 0.1), coat.fur, fillP(ell(98, 176, 46, 40), coat.belly), shadeOf(94, 146, 72, 70, -6, -10))
  const feet = outlined(ell(68, 220, 17, 10), coat.fur) + outlined(ell(124, 222, 17, 10), coat.fur)
  const eyes = `<g class="bo-eyes">${outlined(ell(72, 118, 19), WHITE, 2.8)}${outlined(ell(116, 110, 23), WHITE, 2.8)}<circle cx="78" cy="122" r="8" fill="${INK}"/><circle cx="123" cy="115" r="9.5" fill="${INK}"/><circle cx="75.5" cy="119" r="2.6" fill="${WHITE}"/><circle cx="120" cy="111.5" r="3" fill="${WHITE}"/></g>`
  const brows = line('M56 92Q68 84 80 90M102 82Q116 74 130 82', 3.4)
  const mouth = `<g class="bo-mouth">${outlined(ell(96, 156, 10, 12), MOUTH, 3)}${fillP(ell(96, 163, 6, 4), TONGUE)}${fangsAt(96, 145, 5.5)}</g>`
  const cheeks = `<g fill="${BLUSH}" opacity=".6"><ellipse cx="58" cy="148" rx="10" ry="6.5"/><ellipse cx="136" cy="144" rx="10" ry="6.5"/></g>`
  const arm = mass(c, tube(bez([150, 172], [164, 176], [174, 172], [184, 168], 8), 16, 16), coat.fur) + outlined(ell(186, 168, 11, 10), coat.fur) + line('M181 163q4 -2 9 0', 2, INK, ' opacity=".5"')
  const oops = `<g class="bo-oops">${line('M26 70l8 10M18 92l12 3M44 54l2 12', 3)}${drop(40, 112, 0.9)}</g>`
  return `<svg viewBox="0 0 240 240" aria-hidden="true" focusable="false" class="bo-unmasked bo-unmasked--${animal}">${defsOf(c)}${feet}<g class="bo-monster">${body}${cheeks}${brows}${eyes}${mouth}</g>${stick}${mask}${arm}${oops}</svg>`
}
