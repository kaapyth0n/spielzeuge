/**
 * Лошадка — everything around the pony: the stage backgrounds, the grassy mound with its
 * apple, the stable meadow, gift boxes, stars and the small UI icons.
 *
 * Everything is a plain SVG string. Every id carries the caller's prefix (several scenes
 * share one page) and every root has the class `lh-sc`, which scopes the animations in
 * `loshadka-scenes.css` (hearts float, stars twinkle, clouds drift, butterflies flutter).
 * Animated shapes are drawn where they appear on frame 0, so a still render, a paused
 * animation and `prefers-reduced-motion` all show the same calm picture.
 *
 * Stage backgrounds share one square canvas (BG × BG) shown with `xMidYMid slice`, so a
 * 2.5 : 1 stage sees the middle band y 300–700 and a 1 : 2.5 stage the band x 300–700.
 * Whatever must be seen lives in or near the middle square; the centre and the bottom stay
 * calm because the pony stands there.
 */

/* ─────────────────────────── helpers ─────────────────────────── */

const XMLNS = 'xmlns="http://www.w3.org/2000/svg"'
const BG = 1000

/** Round to 0.1 so the markup stays short. */
function n(v: number): string {
  const r = Math.round(v * 10) / 10
  return Object.is(r, -0) ? '0' : String(r)
}

function safe(prefix: string): string {
  return prefix.replace(/[^A-Za-z0-9_-]/g, '-') || 'lh'
}

/** Small deterministic PRNG (mulberry32): the same scene every time. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type RGB = [number, number, number]

function rgb(hex: string): RGB | null {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const v = parseInt(h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function mix(a: string, b: string, t: number): string {
  const x = rgb(a) ?? [0, 0, 0]
  const y = rgb(b) ?? [0, 0, 0]
  const c = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')
  return `#${c(0)}${c(1)}${c(2)}`
}

const lighten = (c: string, t: number) => mix(c, '#ffffff', t)
const darken = (c: string, t: number) => mix(c, '#3a1630', t)

function stops(list: [number, string, number?][]): string {
  return list
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
    .join('')
}

function vgrad(id: string, list: [number, string, number?][], x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`
}

/** A vertical gradient in canvas units (for wide shapes whose bounding box would distort it). */
function ugrad(id: string, y1: number, y2: number, list: [number, string, number?][]): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}">${stops(list)}</linearGradient>`
}

function rgrad(id: string, list: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`
}

/** A soft round glow in canvas units. */
function glow(id: string, color: string, alpha: number): string {
  return rgrad(id, [
    [0, color, alpha],
    [0.45, color, alpha * 0.45],
    [1, color, 0],
  ])
}

/**
 * CSS variables for a looping drift that starts exactly where the shape is drawn:
 * `from` and `to` are offsets on opposite sides of 0, the negative delay puts frame 0 at 0.
 */
function travel(from: number, to: number, speed: number): string {
  const dist = Math.abs(to - from)
  const t = dist / speed
  const d = -(Math.abs(from) / dist) * t
  return `--from:${n(from)}px;--to:${n(to)}px;--t:${n(t)}s;--d:${n(d)}s`
}

function origin(x: number, y: number): string {
  return `style="transform-origin:${n(x)}px ${n(y)}px"`
}

/* ─────────────────────────── shared shapes ─────────────────────────── */

/** Heart, 100 wide, centred on (0, 0): lobes on top, tip at y = 44. */
const HEART = 'M0 44C-7 37-50 12-50-15C-50-34-37-46-23-46C-12-46-4-40 0-31C4-40 12-46 23-46C37-46 50-34 50-15C50 12 7 37 0 44Z'

/** Four-point sparkle with gently pinched sides. */
function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.14
  return `M${n(cx)} ${n(cy - r)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + r)}Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - r)}Z`
}

/** Polygon with softly rounded corners: [x, y, cut] per vertex. */
function roundedPolygon(pts: [number, number, number][]): string {
  const len = pts.length
  let d = ''
  for (let i = 0; i < len; i++) {
    const [x, y, r] = pts[i]
    const [px, py] = pts[(i - 1 + len) % len]
    const [nx, ny] = pts[(i + 1) % len]
    const lp = Math.hypot(px - x, py - y)
    const ln = Math.hypot(nx - x, ny - y)
    const cut = Math.min(r, lp / 2, ln / 2)
    const ax = x + ((px - x) / lp) * cut
    const ay = y + ((py - y) / lp) * cut
    const bx = x + ((nx - x) / ln) * cut
    const by = y + ((ny - y) / ln) * cut
    d += `${i === 0 ? 'M' : 'L'}${n(ax)} ${n(ay)}Q${n(x)} ${n(y)} ${n(bx)} ${n(by)}`
  }
  return `${d}Z`
}

function starPath(cx: number, cy: number, outer: number, inner: number, round: number, innerRound: number): string {
  const pts: [number, number, number][] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = ((-90 + i * 36) * Math.PI) / 180
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), i % 2 === 0 ? round : innerRound])
  }
  return roundedPolygon(pts)
}

function twinkle(inner: string, delay: number, dur: number): string {
  return `<g class="lh-twinkle" style="--d:${n(-delay)}s;--t:${n(dur)}s">${inner}</g>`
}

const PUFFS: [number, number, number][] = [
  [-68, -17, 18],
  [-38, -12, 20],
  [-4, -11, 21],
  [30, -12, 20],
  [62, -16, 18],
  [-54, -34, 25],
  [-20, -52, 33],
  [22, -60, 38],
  [60, -38, 27],
]

/** Fluffy two-tone cloud, `w` wide, its bottom centred on (x, y); `flip` mirrors it. */
function cloud(x: number, y: number, w: number, top = '#ffffff', shade = '#d6e3f8', opacity = 1, flip = false): string {
  const s = w / 200
  const shape = (dy: number, fill: string) =>
    `<g fill="${fill}"><ellipse cx="0" cy="${-26 + dy}" rx="66" ry="24"/>${PUFFS.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy + dy}" r="${r}"/>`).join('')}</g>`
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${flip ? '-' : ''}${s.toFixed(3)} ${s.toFixed(3)})"${opacity < 1 ? ` opacity="${opacity}"` : ''}>${shape(0, shade)}${shape(-7, top)}</g>`
}

/** A cloud drifting right across the whole canvas width, starting where it is drawn. */
function driftCloud(x: number, y: number, w: number, speed: number, top?: string, shade?: string, opacity?: number, width = BG): string {
  const half = w / 2 + 12
  const flip = Math.round(x / 10 + y / 10) % 2 === 1
  return `<g class="lh-sc-drift" style="${travel(-(x + half), width + half - x, speed)}">${cloud(x, y, w, top, shade, opacity, flip)}</g>`
}

/** Smooth closed/open path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][], close = false): string {
  const len = pts.length
  const at = (i: number) => pts[close ? (i + len) % len : Math.max(0, Math.min(len - 1, i))]
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`
  const last = close ? len : len - 1
  for (let i = 0; i < last; i++) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)
    d += `C${n(x1 + (x2 - x0) / 6)} ${n(y1 + (y2 - y0) / 6)} ${n(x2 - (x3 - x1) / 6)} ${n(y2 - (y3 - y1) / 6)} ${n(x2)} ${n(y2)}`
  }
  return close ? `${d}Z` : d
}

/** Five round petals around a sunny middle. */
function blossom(x: number, y: number, r: number, petal: string, middle = '#ffd84d'): string {
  let petals = ''
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180
    petals += `<circle cx="${n(x + Math.cos(a) * r * 0.58)}" cy="${n(y + Math.sin(a) * r * 0.58)}" r="${n(r * 0.48)}"/>`
  }
  return `<g fill="${petal}">${petals}</g><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.34)}" fill="${middle}"/><circle cx="${n(x - r * 0.1)}" cy="${n(y - r * 0.12)}" r="${n(r * 0.12)}" fill="#fff" opacity=".7"/>`
}

/** White daisy with long petals. */
function daisy(x: number, y: number, r: number): string {
  let petals = ''
  for (let i = 0; i < 8; i++) {
    const a = i * 45
    petals += `<ellipse cx="${n(x)}" cy="${n(y - r * 0.55)}" rx="${n(r * 0.24)}" ry="${n(r * 0.5)}" transform="rotate(${a} ${n(x)} ${n(y)})"/>`
  }
  return `<g fill="#ffffff">${petals}</g><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.3)}" fill="#ffc93c"/>`
}

/** A flower on a short stem with a leaf (foreground). */
function stemFlower(x: number, y: number, h: number, head: string, kind: 'blossom' | 'daisy' = 'blossom'): string {
  const top = y - h
  const stem = `<path d="M${n(x)} ${n(y)}Q${n(x - h * 0.12)} ${n(y - h * 0.5)} ${n(x)} ${n(top)}" stroke="#3f9a49" stroke-width="${n(Math.max(2, h * 0.07))}" stroke-linecap="round" fill="none"/>`
  const leaf = `<path d="M${n(x - h * 0.04)} ${n(y - h * 0.35)}q${n(-h * 0.3)} ${n(-h * 0.05)} ${n(-h * 0.36)} ${n(-h * 0.3)}q${n(h * 0.3)} ${n(-h * 0.02)} ${n(h * 0.36)} ${n(h * 0.3)}Z" fill="#4fae55"/>`
  const r = h * 0.32
  return `${stem}${leaf}${kind === 'daisy' ? daisy(x, top, r) : blossom(x, top, r, head)}`
}

/** Three soft grass blades. */
function tuft(x: number, y: number, h: number, fill: string): string {
  const w = h * 0.5
  return `<path d="M${n(x - w)} ${n(y)}Q${n(x - w * 0.6)} ${n(y - h * 0.45)} ${n(x - w * 1.2)} ${n(y - h * 0.95)}Q${n(x - w * 0.3)} ${n(y - h * 0.62)} ${n(x - w * 0.15)} ${n(y - h * 0.3)}Q${n(x - w * 0.2)} ${n(y - h * 0.8)} ${n(x + w * 0.05)} ${n(y - h * 1.18)}Q${n(x + w * 0.3)} ${n(y - h * 0.72)} ${n(x + w * 0.25)} ${n(y - h * 0.3)}Q${n(x + w * 0.5)} ${n(y - h * 0.62)} ${n(x + w * 1.2)} ${n(y - h * 0.85)}Q${n(x + w * 0.6)} ${n(y - h * 0.4)} ${n(x + w)} ${n(y)}Z" fill="${fill}"/>`
}

/** Round lollipop tree for distant hills. */
function roundTree(x: number, y: number, s: number, crown: string, shade: string, trunk = '#a8774f', shine = 0.35): string {
  return `<rect x="${n(x - s * 0.09)}" y="${n(y - s * 0.55)}" width="${n(s * 0.18)}" height="${n(s * 0.55)}" rx="${n(s * 0.06)}" fill="${trunk}"/><circle cx="${n(x)}" cy="${n(y - s * 0.85)}" r="${n(s * 0.5)}" fill="${shade}"/><circle cx="${n(x - s * 0.06)}" cy="${n(y - s * 0.9)}" r="${n(s * 0.42)}" fill="${crown}"/><circle cx="${n(x - s * 0.2)}" cy="${n(y - s * 1.04)}" r="${n(s * 0.12)}" fill="#fff" opacity="${shine}"/>`
}

/** Butterfly centred on (x, y); wings flap, the whole thing loops along a little path. */
function butterfly(x: number, y: number, s: number, wing: string, spot: string, delay: number): string {
  const w = (side: 1 | -1) =>
    `<g class="lh-sc-wing"><path d="M0 -1C${-6 * side} -16 ${-24 * side} -22 ${-26 * side} -9C${-28 * side} 1 ${-14 * side} 3 0 1Z" fill="${wing}"/><path d="M0 2C${-10 * side} 3 ${-19 * side} 11 ${-13 * side} 18C${-7 * side} 22 ${-2 * side} 11 0 4Z" fill="${darken(wing, 0.12)}"/><circle cx="${-15 * side}" cy="-9" r="4.2" fill="${spot}"/><circle cx="${-8 * side}" cy="11" r="2.6" fill="${spot}"/></g>`
  return `<g class="lh-flutter" style="--d:${n(-delay)}s"><g transform="translate(${n(x)} ${n(y)}) scale(${s})"><g class="lh-sc-flap-l">${w(1)}</g><g class="lh-sc-flap-r">${w(-1)}</g><rect x="-2" y="-10" width="4" height="22" rx="2" fill="#5b3f5f"/><path d="M-1 -10Q-5 -18 -8 -20M1 -10Q5 -18 8 -20" stroke="#5b3f5f" stroke-width="1.6" stroke-linecap="round" fill="none"/></g></g>`
}

/** A little bird far away: a soft "m". */
function bird(x: number, y: number, s: number, color: string, delay: number): string {
  return `<g class="lh-sc-bob" style="--d:${n(-delay)}s"><path d="M${n(x - 12 * s)} ${n(y)}Q${n(x - 6 * s)} ${n(y - 8 * s)} ${n(x)} ${n(y)}Q${n(x + 6 * s)} ${n(y - 8 * s)} ${n(x + 12 * s)} ${n(y)}" stroke="${color}" stroke-width="${n(2.6 * s)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`
}

/** Seeded scatter with a minimum gap between points and a forbidden zone. */
function scatter(
  seed: number,
  count: number,
  area: [number, number, number, number],
  gap: number,
  avoid: (x: number, y: number) => boolean = () => false,
): [number, number, number][] {
  const rand = rng(seed)
  const out: [number, number, number][] = []
  const [x0, y0, x1, y1] = area
  for (let tries = 0; out.length < count && tries < count * 200; tries++) {
    const x = x0 + rand() * (x1 - x0)
    const y = y0 + rand() * (y1 - y0)
    if (avoid(x, y)) continue
    if (out.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < gap)) continue
    out.push([x, y, rand()])
  }
  return out
}

/* ─────────────────────────── backgrounds ─────────────────────────── */

interface Floater {
  x: number
  y: number
  /** Half width of the heart. */
  s: number
  layer: 0 | 1 | 2
}

const HEART_LAYERS = [
  { count: 18, min: 12, max: 20, speed: 11, sway: 6 },
  { count: 13, min: 24, max: 36, speed: 17, sway: 11 },
  { count: 8, min: 44, max: 62, speed: 25, sway: 16 },
] as const

let heartCache: Floater[] | null = null

/** Matryona's hearts: near ones big and few, far ones small and many; the pony's spot stays clear. */
function heartField(): Floater[] {
  if (heartCache) return heartCache
  const rand = rng(1105)
  const out: Floater[] = []
  for (const layer of [2, 1, 0] as const) {
    const spec = HEART_LAYERS[layer]
    let placed = 0
    for (let tries = 0; placed < spec.count && tries < 4000; tries++) {
      const x = 40 + rand() * 920
      const y = 30 + rand() * 940
      const s = spec.min + rand() * (spec.max - spec.min)
      // the pony stands in the middle: keep the big hearts out of its body
      if (layer === 2 && Math.abs(x - 500) < 210 && y > 380 && y < 860) continue
      if (layer === 1 && Math.abs(x - 500) < 150 && y > 450 && y < 820) continue
      const gap = layer === 0 ? 1.4 : 1.15
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < (o.s + s) * gap + 14)) continue
      out.push({ x, y, s, layer })
      placed++
    }
  }
  heartCache = out.sort((a, b) => a.layer - b.layer)
  return heartCache
}

function floatingHeart(h: Floater, p: string, i: number): string {
  const spec = HEART_LAYERS[h.layer]
  const from = BG + h.s * 1.3 - h.y
  const to = -h.s * 1.3 - h.y
  const st = 5 + ((i * 37) % 40) / 10
  const sd = ((i * 53) % 70) / 10
  const tilt = ((i * 29) % 34) - 17
  const shine =
    h.layer === 0
      ? ''
      : `<ellipse cx="-27" cy="-20" rx="9" ry="15" transform="rotate(38 -27 -20)" fill="#fff" opacity=".55"/><circle cx="-11" cy="-35" r="4.5" fill="#fff" opacity=".6"/>`
  const halo = h.layer === 2 ? `<circle r="88" fill="url(#${p}-halo)"/>` : ''
  return `<g class="lh-float" style="${travel(from, to, spec.speed)};--x:${spec.sway}px"><g class="lh-sc-sway" style="--st:${n(st)}s;--sd:${n(-sd)}s"><g transform="translate(${n(h.x)} ${n(h.y)}) rotate(${tilt}) scale(${(h.s / 50).toFixed(3)})">${halo}<path d="${HEART}" fill="url(#${p}-h${h.layer})"/>${shine}</g></g></g>`
}

function heartsBackground(p: string): string {
  const defs = [
    `<radialGradient id="${p}-sky" gradientUnits="userSpaceOnUse" cx="500" cy="470" r="720">${stops([
      [0, '#ff6680'],
      [0.3, '#f53d62'],
      [0.64, '#d9214f'],
      [1, '#a80f3f'],
    ])}</radialGradient>`,
    `<radialGradient id="${p}-glow" gradientUnits="userSpaceOnUse" cx="500" cy="610" r="400">${stops([
      [0, '#ffc2cf', 0.42],
      [0.5, '#ffa9bd', 0.16],
      [1, '#ffa9bd', 0],
    ])}</radialGradient>`,
    `<radialGradient id="${p}-vig" gradientUnits="userSpaceOnUse" cx="500" cy="520" r="700">${stops([
      [0.55, '#5a0322', 0],
      [1, '#5a0322', 0.42],
    ])}</radialGradient>`,
    vgrad(`${p}-h0`, [[0, '#ffc2d5', 0.55], [1, '#ff9dbd', 0.5]], 0.6, 1),
    vgrad(`${p}-h1`, [[0, '#ffd3e1', 0.85], [1, '#ff9cbd', 0.8]], 0.6, 1),
    vgrad(`${p}-h2`, [[0, '#ffe6ee'], [0.55, '#ffbcd2'], [1, '#ff93b6']], 0.6, 1),
    glow(`${p}-halo`, '#ffd0df', 0.45),
    glow(`${p}-bokeh`, '#ffc0d4', 0.35),
  ].join('')
  const bokeh = scatter(77, 9, [60, 60, 940, 940], 190)
    .map(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(50 + r * 70)}" fill="url(#${p}-bokeh)"/>`)
    .join('')
  const hearts = heartField()
    .map((h, i) => floatingHeart(h, p, i))
    .join('')
  const sparkles = scatter(31, 12, [50, 50, 950, 950], 150, (x, y) => Math.abs(x - 500) < 200 && y > 400 && y < 880)
    .map(([x, y, r], i) => twinkle(`<path d="${sparkle(x, y, 7 + r * 9)}" fill="#fff4f8"/>`, i * 0.7, 2.6 + r * 2))
    .join('')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${bokeh}<rect width="${BG}" height="${BG}" fill="url(#${p}-glow)"/>${hearts}${sparkles}<rect width="${BG}" height="${BG}" fill="url(#${p}-vig)"/>`
}

/* meadow: a sunny hillside */

function sun(p: string, x: number, y: number, r: number, rays = true): string {
  const ray = rays
    ? `<g class="lh-sc-spin" ${origin(x, y)}>${Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const r0 = r * 1.3
        const r1 = r * (i % 2 ? 1.62 : 1.8)
        return `<path d="M${n(x + Math.cos(a - 0.09) * r0)} ${n(y + Math.sin(a - 0.09) * r0)}L${n(x + Math.cos(a) * r1)} ${n(y + Math.sin(a) * r1)}L${n(x + Math.cos(a + 0.09) * r0)} ${n(y + Math.sin(a + 0.09) * r0)}Z" fill="#fff3b0" opacity=".75" stroke="#fff3b0" stroke-width="6" stroke-linejoin="round"/>`
      }).join('')}</g>`
    : ''
  return `<circle cx="${x}" cy="${y}" r="${r * 3.4}" fill="url(#${p}-sunglow)"/>${ray}<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}-sun)"/><ellipse cx="${n(x - r * 0.32)}" cy="${n(y - r * 0.36)}" rx="${n(r * 0.3)}" ry="${n(r * 0.18)}" transform="rotate(-30 ${n(x - r * 0.32)} ${n(y - r * 0.36)})" fill="#fff" opacity=".6"/>`
}

function sunDefs(p: string): string {
  return glow(`${p}-sunglow`, '#fff4c2', 0.75) + rgrad(`${p}-sun`, [[0, '#fff8c4'], [0.6, '#ffe066'], [1, '#ffc93c']], 0.4, 0.38, 0.62)
}

function flowerBed(seed: number, area: [number, number, number, number], count: number, gap: number, size: [number, number], colors: string[]): string {
  return scatter(seed, count, area, gap)
    .sort((a, b) => a[1] - b[1])
    .map(([x, y, r], i) => {
      const s = size[0] + r * (size[1] - size[0])
      return i % 4 === 3 ? daisy(x, y, s) : blossom(x, y, s, colors[i % colors.length])
    })
    .join('')
}

function meadowBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 640, [[0, '#7cc3f4'], [0.55, '#b9e3ff'], [1, '#fff1d6']]),
    sunDefs(p),
    ugrad(`${p}-far`, 560, 700, [[0, '#b7e4bf'], [1, '#9fd6a9']]),
    ugrad(`${p}-mid`, 620, 760, [[0, '#a3dc8e'], [1, '#86cb78']]),
    ugrad(`${p}-near`, 690, 1000, [[0, '#8fd577'], [0.5, '#74c364'], [1, '#5daf54']]),
  ].join('')
  const clouds =
    driftCloud(250, 268, 210, 7) + driftCloud(590, 196, 150, 5, '#ffffff', '#dce9fb', 0.9) + driftCloud(840, 420, 190, 8) + driftCloud(420, 455, 110, 4, '#ffffff', '#e1ecfb', 0.8)
  const farTrees = [
    [330, 578, 36],
    [362, 585, 28],
    [628, 556, 40],
    [668, 552, 30],
    [150, 578, 30],
    [880, 566, 34],
  ]
    .map(([x, y, s]) => roundTree(x, y, s, '#8fd39a', '#79c487'))
    .join('')
  const hills =
    `<path d="M0 598C110 548 240 546 360 584C450 612 540 566 650 548C770 528 900 566 1000 586V1000H0Z" fill="url(#${p}-far)"/>${farTrees}` +
    `<path d="M0 668C140 616 320 640 470 664C620 688 780 622 1000 640V1000H0Z" fill="url(#${p}-mid)"/>` +
    `<path d="M0 726C190 692 380 708 500 712C650 716 830 690 1000 700V1000H0Z" fill="url(#${p}-near)"/>`
  const sprinkle = flowerBed(5, [40, 735, 960, 800], 14, 60, [6, 8], ['#ff8fbf', '#ffd84d', '#c39bff', '#ffffff'])
  const beds =
    flowerBed(9, [30, 820, 300, 980], 9, 52, [10, 15], ['#ff7eb3', '#ffb347', '#b58cff', '#ff6f91']) +
    flowerBed(13, [700, 820, 975, 980], 9, 52, [10, 15], ['#ffb347', '#ff7eb3', '#7ec8ff', '#ff6f91'])
  const tufts = [
    [70, 990, 40],
    [190, 960, 30],
    [320, 1000, 34],
    [690, 1000, 34],
    [820, 965, 30],
    [940, 990, 42],
    [110, 760, 18],
    [880, 752, 18],
  ]
    .map(([x, y, h]) => tuft(x, y, h, '#4f9f4c'))
    .join('')
  const flies = butterfly(240, 560, 1.2, '#ffb3d9', '#fff', 0) + butterfly(770, 520, 1.05, '#ffd166', '#fff6d6', 3.5)
  const bushes = bush(90, 668, 40, '#ff8fbf') + bush(170, 676, 26) + bush(905, 660, 44, '#ffffff') + bush(820, 672, 24, '#ffd84d')
  const stems = stemFlower(60, 1000, 90, '#ff7eb3') + stemFlower(120, 1000, 66, '#ffd84d', 'daisy') + stemFlower(250, 1000, 52, '#b58cff') + stemFlower(940, 1000, 92, '#ffb347') + stemFlower(880, 1000, 62, '#ffd84d', 'daisy') + stemFlower(760, 1000, 50, '#ff7eb3')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${sun(p, 680, 340, 46)}${clouds}${hills}${bushes}${sprinkle}${beds}${tufts}${stems}${flies}`
}

/* sky: above the clouds */

function balloon(x: number, y: number, s: number, paper: string, stripe: string, middle: string, delay: number): string {
  return `<g class="lh-sc-bob" style="--d:${n(-delay)}s;--t:6s"><g transform="translate(${n(x)} ${n(y)}) scale(${s})">
<path d="M-11 52L-8 70M11 52L8 70" stroke="#a0714f" stroke-width="2"/>
<path d="M0 56C-30 40-44 14-44-8C-44-34-24-52 0-52C24-52 44-34 44-8C44 14 30 40 0 56Z" fill="${paper}"/>
<path d="M0 56C-12 40-18 14-18-8C-18-34-10-52 0-52C10-52 18-34 18-8C18 14 12 40 0 56Z" fill="${stripe}"/>
<path d="M0 56C-4 40-6 14-6-8C-6-34-3-52 0-52C3-52 6-34 6-8C6 14 4 40 0 56Z" fill="${middle}"/>
<path d="M0 56C18 40 30 14 30-8C30-30 22-46 10-51C30-46 44-30 44-8C44 14 30 40 0 56Z" fill="#3a1630" opacity=".1"/>
<ellipse cx="-26" cy="-22" rx="7" ry="13" transform="rotate(20 -26 -22)" fill="#fff" opacity=".45"/>
<rect x="-10" y="68" width="20" height="14" rx="4" fill="#c98b5a"/><rect x="-10" y="68" width="20" height="4" rx="2" fill="#a86f45"/>
</g></g>`
}

function skyBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 1000, [[0, '#4d9ff0'], [0.45, '#8cc9ff'], [0.78, '#cfe9ff'], [1, '#ffe4f1']]),
    sunDefs(p),
    vgrad(`${p}-ball`, [[0, '#ff7a9c'], [1, '#e8436f']], 1, 0.4),
    ugrad(`${p}-floor`, 800, 1000, [[0, '#ffffff'], [1, '#f1ecff']]),
  ].join('')
  const far =
    driftCloud(140, 470, 120, 3, '#f5f9ff', '#d9e6fb', 0.75) + driftCloud(560, 300, 100, 3, '#f5f9ff', '#d9e6fb', 0.7) + driftCloud(860, 560, 130, 3.5, '#f5f9ff', '#d9e6fb', 0.75)
  const mid = driftCloud(300, 210, 190, 6) + driftCloud(760, 400, 200, 6) + driftCloud(470, 640, 160, 5, '#ffffff', '#dfe8fb', 0.9)
  const near = driftCloud(90, 330, 260, 10) + driftCloud(930, 250, 240, 9)
  // a soft floor of clouds the island floats over
  const floorPuffs: [number, number, number][] = [
    [-20, 900, 90],
    [90, 860, 80],
    [200, 890, 85],
    [320, 870, 70],
    [430, 905, 80],
    [560, 885, 78],
    [680, 900, 82],
    [800, 865, 80],
    [910, 890, 88],
    [1020, 870, 80],
  ]
  const floor = `<g fill="#dcd6f7">${floorPuffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 12}" r="${r}"/>`).join('')}<rect x="-40" y="900" width="1080" height="120"/></g><g fill="url(#${p}-floor)">${floorPuffs
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join('')}<rect x="-40" y="905" width="1080" height="120"/></g>`
  const sparkles = scatter(19, 7, [120, 120, 880, 760], 170, (x, y) => Math.abs(x - 500) < 200 && y > 420)
    .map(([x, y, r], i) => twinkle(`<path d="${sparkle(x, y, 6 + r * 7)}" fill="#ffffff"/>`, i * 0.9, 3 + r * 2))
    .join('')
  const birds = bird(420, 300, 1.1, '#5577a8', 0) + bird(455, 322, 0.85, '#5577a8', 1.3) + bird(612, 250, 0.9, '#5577a8', 0.6)
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${sun(p, 670, 345, 44)}${far}${birds}${balloon(810, 590, 0.55, '#5ec8c0', '#fff6f8', '#ffd84d', 3)}${balloon(330, 420, 1, `url(#${p}-ball)`, '#fff6f8', '#ffd84d', 1.4)}${mid}${sparkles}${near}${floor}`
}

/* night: a sleepy moon and twinkling stars */

function nightBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 820, [[0, '#15174a'], [0.45, '#272c74'], [0.8, '#4b3d92'], [1, '#6f529f']]),
    glow(`${p}-moonglow`, '#fff1b8', 0.5),
    rgrad(`${p}-moon`, [[0, '#fffbe6'], [0.7, '#fff0b3'], [1, '#ffe08a']], 0.4, 0.38, 0.65),
    rgrad(`${p}-milky`, [[0, '#d6cbff', 0.16], [1, '#d6cbff', 0]]),
    ugrad(`${p}-far`, 600, 760, [[0, '#3f3a8a'], [1, '#332f76']]),
    ugrad(`${p}-near`, 690, 1000, [[0, '#2c2968'], [1, '#1d1b4d']]),
    glow(`${p}-fly`, '#fff2a0', 0.9),
    vgrad(`${p}-tail`, [[0, '#ffffff', 0], [1, '#ffffff', 0.9]], 1, 0),
  ].join('')
  const dots = scatter(41, 70, [10, 10, 990, 640], 46, (x, y) => Math.hypot(x - 640, y - 350) < 110)
    .map(([x, y, r], i) => {
      const dot = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(1 + r * 1.8)}" fill="#ffffff" opacity="${n(0.45 + r * 0.5)}"/>`
      return i % 4 === 0 ? twinkle(dot, i * 0.37, 2.2 + r * 2.5) : dot
    })
    .join('')
  const sparkles = scatter(43, 14, [60, 60, 940, 600], 130, (x, y) => Math.hypot(x - 640, y - 350) < 140)
    .map(([x, y, r], i) => {
      const shape = i % 3 === 0 ? `<path d="${starPath(x, y, 9 + r * 6, 4.6 + r * 3, 3, 1.5)}" fill="#ffe680"/>` : `<path d="${sparkle(x, y, 7 + r * 8)}" fill="#fff8d6"/>`
      return twinkle(shape, i * 0.53, 2.4 + r * 2.4)
    })
    .join('')
  const moon = `<g transform="translate(-20 30)"><g class="lh-sc-glow"><circle cx="660" cy="320" r="190" fill="url(#${p}-moonglow)"/></g>
<circle cx="660" cy="320" r="64" fill="url(#${p}-moon)"/>
<circle cx="632" cy="296" r="9" fill="#f6dc8a" opacity=".55"/><circle cx="688" cy="352" r="12" fill="#f6dc8a" opacity=".45"/><circle cx="694" cy="290" r="5" fill="#f6dc8a" opacity=".5"/>
<path d="M636 324q8 7 16 0M670 324q8 7 16 0" stroke="#b98a3e" stroke-width="3.4" stroke-linecap="round" fill="none"/>
<path d="M654 342q7 5 14 0" stroke="#b98a3e" stroke-width="3" stroke-linecap="round" fill="none"/>
<ellipse cx="628" cy="340" rx="8" ry="5" fill="#ffb3b3" opacity=".55"/><ellipse cx="694" cy="340" rx="8" ry="5" fill="#ffb3b3" opacity=".55"/></g>`
  const milky = `<ellipse cx="420" cy="300" rx="620" ry="110" transform="rotate(-22 420 300)" fill="url(#${p}-milky)"/>`
  const shoot = `<g class="lh-sc-shoot" style="--sx:-260px;--sy:110px"><path d="M600 200L716 151" stroke="url(#${p}-tail)" stroke-width="3.4" stroke-linecap="round" transform="rotate(180 658 175.5)"/><path d="${sparkle(600, 200, 9)}" fill="#fff"/></g>`
  const clouds = driftCloud(200, 520, 170, 4, '#5a57a8', '#4a4592', 0.55) + driftCloud(820, 470, 150, 3.5, '#5a57a8', '#4a4592', 0.5)
  const cottage = `<g transform="translate(220 618)"><path d="M-22 0V-24L0-42L22-24V0Z" fill="#26235d"/><path d="M-27-22L0-46L27-22" stroke="#26235d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="-8" y="-22" width="12" height="11" rx="2" fill="#ffd36b"/><circle cx="-2" cy="-16" r="16" fill="url(#${p}-fly)" opacity=".5"/><rect x="10" y="-46" width="7" height="14" fill="#26235d"/></g>`
  const hills = `<path d="M0 640C140 600 260 610 380 640C500 670 610 622 730 612C850 602 930 630 1000 640V1000H0Z" fill="url(#${p}-far)"/>${cottage}${[
    [470, 652, 34],
    [505, 660, 26],
    [880, 630, 32],
  ]
    .map(([x, y, s]) => roundTree(x, y, s, '#34307a', '#2b286c', '#252157', 0.12))
    .join('')}<path d="M0 722C180 684 380 702 520 716C700 734 860 690 1000 702V1000H0Z" fill="url(#${p}-near)"/>`
  const darkBush = (x: number, y: number, r: number) =>
    `<g fill="#211e52"><circle cx="${x - r * 0.7}" cy="${y}" r="${r * 0.62}"/><circle cx="${x}" cy="${y - r * 0.3}" r="${r * 0.8}"/><circle cx="${x + r * 0.75}" cy="${y + r * 0.05}" r="${r * 0.58}"/><rect x="${x - r * 1.3}" y="${y}" width="${r * 2.6}" height="${r * 0.7}" rx="${r * 0.3}"/></g>`
  const bushes = darkBush(70, 800, 70) + darkBush(930, 790, 74) + darkBush(190, 850, 40) + darkBush(820, 860, 38)
  const flies = scatter(51, 9, [80, 620, 920, 900], 110, (x, y) => Math.abs(x - 500) < 190 && y > 700)
    .map(([x, y, r], i) => `<g class="lh-sc-firefly" style="--d:${n(-i * 1.3)}s;--t:${n(6 + r * 4)}s"><circle cx="${n(x)}" cy="${n(y)}" r="14" fill="url(#${p}-fly)"/><circle cx="${n(x)}" cy="${n(y)}" r="2.6" fill="#fff8c0"/></g>`)
    .join('')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${milky}${dots}${sparkles}${shoot}${moon}${clouds}${hills}${bushes}${flies}`
}

/* rainbow: a big soft arc over the pony */

const PASTEL_RAINBOW = ['#ff8fa3', '#ffbb7a', '#ffe48a', '#a6e6a0', '#8fcbff', '#b9a3ff']

function rainbowArc(cx: number, cy: number, outer: number, band: number, colors: string[]): string {
  return colors
    .map((c, i) => {
      const r = outer - band * (i + 0.5)
      return `<path d="M${n(cx - r)} ${cy}A${n(r)} ${n(r)} 0 0 1 ${n(cx + r)} ${cy}" stroke="${c}" stroke-width="${band + 0.8}" fill="none"/>`
    })
    .join('')
}

function rainbowBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 1000, [[0, '#a9d6ff'], [0.5, '#e2d8ff'], [0.72, '#ffdcec'], [1, '#fff1dc']]),
    ugrad(`${p}-hill`, 720, 1000, [[0, '#b9ecb7'], [1, '#8fd79a']]),
    ugrad(`${p}-hill2`, 700, 900, [[0, '#cdeec4'], [1, '#b3e3b2']]),
    `<radialGradient id="${p}-halo" gradientUnits="userSpaceOnUse" cx="500" cy="790" r="560">${stops([
      [0.5, '#ffffff', 0],
      [0.72, '#ffffff', 0.32],
      [0.9, '#ffffff', 0],
    ])}</radialGradient>`,
  ].join('')
  const arc = `<path d="M90 790A410 410 0 0 1 910 790" stroke="url(#${p}-halo)" stroke-width="300" fill="none"/>${rainbowArc(500, 790, 440, 34, PASTEL_RAINBOW)}${PASTEL_RAINBOW.map((_, i) => {
    const r = 440 - 34 * i - 6
    return `<path d="M${500 - r} 790A${r} ${r} 0 0 1 ${500 + r} 790" stroke="#ffffff" stroke-width="3" fill="none" opacity=".35"/>`
  }).join('')}`
  const feet = cloud(96, 812, 260) + cloud(904, 812, 260)
  const small = driftCloud(270, 230, 120, 4, '#ffffff', '#e5ddfb', 0.85) + driftCloud(780, 180, 140, 5, '#ffffff', '#e5ddfb', 0.85) + driftCloud(560, 120, 90, 3, '#ffffff', '#e5ddfb', 0.7)
  const sparkles = scatter(23, 12, [80, 80, 920, 780], 120, (x, y) => (Math.abs(x - 500) < 210 && y > 430) || Math.abs(Math.hypot(x - 500, y - 790) - 338) < 120)
    .map(([x, y, r], i) => twinkle(`<path d="${sparkle(x, y, 6 + r * 9)}" fill="${i % 3 === 0 ? '#fff5b8' : '#ffffff'}"/>`, i * 0.6, 2.6 + r * 2))
    .join('')
  const hills = `<path d="M0 760C150 724 300 740 420 756C560 774 720 728 1000 744V1000H0Z" fill="url(#${p}-hill2)"/><path d="M0 812C200 780 360 792 500 800C660 808 820 780 1000 790V1000H0Z" fill="url(#${p}-hill)"/>`
  const flowers =
    flowerBed(61, [30, 800, 290, 990], 10, 50, [9, 13], ['#ff9cc7', '#c3a6ff', '#ffd166', '#8fd0ff']) +
    flowerBed(67, [710, 800, 970, 990], 10, 50, [9, 13], ['#c3a6ff', '#ff9cc7', '#8fd0ff', '#ffd166']) +
    flowerBed(63, [310, 780, 690, 830], 6, 70, [6, 8], ['#ff9cc7', '#ffd166', '#c3a6ff'])
  const bushes = bush(250, 790, 34, '#ff9cc7') + bush(760, 786, 38, '#ffffff') + bush(330, 760, 22) + bush(690, 752, 24, '#ffd166')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${small}${arc}${sparkles}${hills}${bushes}${feet}${flowers}`
}

/* castle: a pastel castle on a far hill */

function flag(x: number, y: number, color: string, i: number): string {
  return `<path d="M${n(x)} ${n(y + 42)}V${n(y)}" stroke="#9c7bb8" stroke-width="3.4" stroke-linecap="round"/><g transform="translate(${n(x + 1)} ${n(y + 2)})"><g class="lh-sc-flag" style="--d:${n(-i * 0.4)}s"><path d="M0 0C10 -3 22 3 34 1C28 6 28 11 34 16C22 18 10 12 0 15Z" fill="${color}"/></g></g>`
}

function tower(x: number, w: number, top: number, bottom: number, roof: string, roofShade: string, p: string, flagColor: string, i: number): string {
  const cx = x + w / 2
  const roofTop = top - w * 1.25
  const windowY = top + (bottom - top) * 0.28
  return `<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(bottom - top)}" fill="url(#${p}-wall)" stroke="#efc0d6" stroke-width="2.4"/>
<rect x="${n(x + w * 0.62)}" y="${n(top + 1)}" width="${n(w * 0.38 - 1)}" height="${n(bottom - top - 2)}" fill="#f2c9de" opacity=".55"/>
<path d="M${n(x - 7)} ${n(top + 4)}L${n(cx)} ${n(roofTop)}L${n(x + w + 7)} ${n(top + 4)}Q${n(cx)} ${n(top + 14)} ${n(x - 7)} ${n(top + 4)}Z" fill="${roof}"/>
<path d="M${n(cx)} ${n(roofTop)}L${n(x + w + 7)} ${n(top + 4)}Q${n(cx + w * 0.3)} ${n(top + 11)} ${n(cx + 4)} ${n(top + 10)}Z" fill="${roofShade}"/>
<path d="M${n(cx - w * 0.2)} ${n(windowY + 18)}V${n(windowY + 6)}A${n(w * 0.2)} ${n(w * 0.2)} 0 0 1 ${n(cx + w * 0.2)} ${n(windowY + 6)}V${n(windowY + 18)}Z" fill="#fff2b3" stroke="#e7a9c7" stroke-width="2.4"/>
${flag(cx, roofTop - 40, flagColor, i)}`
}

function castleBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 1000, [[0, '#b8b0ff'], [0.42, '#e9c6f4'], [0.66, '#ffd6e4'], [1, '#ffe9d8']]),
    glow(`${p}-sunglow`, '#fff3d6', 0.8),
    ugrad(`${p}-far`, 560, 720, [[0, '#cdbff2'], [1, '#bfb2ec']]),
    ugrad(`${p}-hill`, 590, 760, [[0, '#b3e6a8'], [1, '#97d698']]),
    ugrad(`${p}-near`, 700, 1000, [[0, '#a9e3a1'], [1, '#86cf8a']]),
    vgrad(`${p}-wall`, [[0, '#fff6fa'], [1, '#fde3ee']], 1, 0),
    vgrad(`${p}-path`, [[0, '#fbe9cf'], [1, '#f3d6ae']]),
  ].join('')
  const cx = 560
  const keep = `<rect x="${cx - 80}" y="450" width="160" height="160" fill="url(#${p}-wall)" stroke="#efc0d6" stroke-width="2.4"/><rect x="${cx + 30}" y="450" width="50" height="160" fill="#f2c9de" opacity=".5"/>${Array.from(
    { length: 5 },
    (_, i) => `<rect x="${cx - 80 + i * 34}" y="436" width="22" height="20" rx="4" fill="url(#${p}-wall)" stroke="#efc0d6" stroke-width="2.4"/>`,
  ).join('')}`
  const wall = `<rect x="${cx - 140}" y="510" width="280" height="100" fill="#fbe2ee" stroke="#efc0d6" stroke-width="2.4"/>${Array.from(
    { length: 9 },
    (_, i) => `<rect x="${cx - 140 + i * 32}" y="498" width="20" height="18" rx="4" fill="#fbe2ee" stroke="#efc0d6" stroke-width="2.4"/>`,
  ).join('')}`
  const door = `<path d="M${cx - 24} 610V572A24 24 0 0 1 ${cx + 24} 572V610Z" fill="#d68fb5"/><path d="M${cx - 16} 610V575A16 16 0 0 1 ${cx + 16} 575V610Z" fill="#c27aa3"/><circle cx="${cx + 8}" cy="590" r="2.6" fill="#ffd84d"/>`
  const windows = [
    [cx - 50, 480],
    [cx + 34, 480],
  ]
    .map(([x, y]) => `<path d="M${x} ${y + 26}V${y + 10}A8 8 0 0 1 ${x + 16} ${y + 10}V${y + 26}Z" fill="#fff2b3" stroke="#e7a9c7" stroke-width="2.4"/>`)
    .join('')
  const heartWindow = `<path d="${HEART}" transform="translate(${cx} 392) scale(.2)" fill="#ff8fb8"/>`
  const castle = `<g>${tower(cx - 120, 34, 400, 610, '#cbb8ff', '#ad96f2', p, '#ffc531', 3)}${tower(cx + 86, 34, 400, 610, '#cbb8ff', '#ad96f2', p, '#5fd6b0', 4)}${wall}${tower(cx - 176, 58, 430, 612, '#ff9cc4', '#ef7aab', p, '#ff5c8a', 0)}${tower(cx + 118, 58, 430, 612, '#ff9cc4', '#ef7aab', p, '#7fb8ff', 1)}${keep}${tower(cx - 30, 60, 360, 452, '#ffb36b', '#f39a4d', p, '#ff5c8a', 2)}${heartWindow}${windows}${door}</g>`
  const clouds = driftCloud(200, 300, 170, 5, '#ffffff', '#efd9f5', 0.9) + driftCloud(830, 240, 150, 4, '#ffffff', '#efd9f5', 0.85) + driftCloud(420, 180, 100, 3, '#ffffff', '#efd9f5', 0.7)
  const hills = `<path d="M0 622C120 584 250 590 350 612C450 634 520 600 640 590C780 578 900 606 1000 618V1000H0Z" fill="url(#${p}-far)"/>${[
    [140, 606, 30],
    [175, 612, 22],
    [850, 600, 32],
    [890, 606, 24],
  ]
    .map(([x, y, s]) => roundTree(x, y, s, '#b2d9a6', '#9ccb98'))
    .join('')}<path d="M300 690C380 612 480 598 ${cx} 598C660 598 760 616 830 690Z" fill="url(#${p}-hill)"/>`
  const castleBushes = bush(cx - 190, 616, 30, '#ff9cc4') + bush(cx + 196, 618, 32, '#ffffff') + bush(cx - 70, 622, 22) + bush(cx + 80, 624, 20, '#ffd166')
  const near = `<path d="M0 712C180 676 360 694 500 700C660 706 820 680 1000 692V1000H0Z" fill="url(#${p}-near)"/><path d="M${cx - 10} 612C${cx - 40} 680 470 760 420 1000H640C620 800 ${cx + 30} 690 ${cx + 12} 612Z" fill="url(#${p}-path)" opacity=".9"/>`
  const flowers =
    flowerBed(71, [30, 730, 300, 980], 11, 50, [9, 13], ['#ff9cc7', '#c3a6ff', '#ffd166', '#ffffff']) +
    flowerBed(73, [720, 730, 975, 980], 11, 50, [9, 13], ['#c3a6ff', '#ff9cc7', '#ffd166', '#8fd0ff'])
  const sparkles = scatter(29, 8, [100, 120, 900, 560], 150, (x, y) => Math.abs(x - cx) < 210 && y > 280)
    .map(([x, y, r], i) => twinkle(`<path d="${sparkle(x, y, 6 + r * 7)}" fill="#ffffff"/>`, i * 0.8, 2.8 + r * 2))
    .join('')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/><circle cx="${cx}" cy="440" r="330" fill="url(#${p}-sunglow)"/>${clouds}${sparkles}${hills}${castle}${castleBushes}${near}${flowers}`
}

/* sea: a sunny beach */

function palm(x: number, y: number, s: number): string {
  const frond = (a: number, len: number, c: string) =>
    `<g transform="rotate(${a})"><path d="M0 0C${n(len * 0.3)} ${n(-len * 0.3)} ${n(len * 0.78)} ${n(-len * 0.24)} ${n(len)} ${n(len * 0.14)}C${n(len * 0.84)} ${n(len * 0.02)} ${n(len * 0.74)} ${n(len * 0.06)} ${n(len * 0.62)} ${n(-len * 0.02)}C${n(len * 0.5)} ${n(len * 0.06)} ${n(len * 0.36)} ${n(len * 0.06)} 0 ${n(len * 0.1)}Z" fill="${c}"/><path d="M4 2C${n(len * 0.35)} ${n(-len * 0.18)} ${n(len * 0.7)} ${n(-len * 0.12)} ${n(len * 0.94)} ${n(len * 0.1)}" stroke="${darken(c, 0.18)}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".6"/></g>`
  const rings = [24, 58, 92, 126, 158]
    .map((t) => {
      const cx = t * 0.12 + (t / 190) ** 2 * 14
      return `<path d="M${n(cx - 9 + t * 0.02)} ${-t}q${n(9 - t * 0.02)} 6 ${n(18 - t * 0.04)} 0" stroke="#a8713f" stroke-width="3" stroke-linecap="round" fill="none"/>`
    })
    .join('')
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${s})"><ellipse cx="4" cy="2" rx="40" ry="8" fill="#d9b27a" opacity=".6"/><path d="M-12 0C-14 -70 -2 -140 18 -192L30 -188C14 -136 6 -70 12 0Z" fill="#c98f58"/><path d="M4 0C2 -70 12 -136 26 -190L30 -188C14 -136 6 -70 12 0Z" fill="#b07a46"/>${rings}<g transform="translate(24 -192)">${frond(-168, 104, '#3fae5a')}${frond(-14, 108, '#3fae5a')}${frond(-122, 90, '#52c069')}${frond(-58, 94, '#52c069')}${frond(156, 82, '#46b45f')}${frond(26, 86, '#46b45f')}<circle cx="-5" cy="6" r="9" fill="#8a5a33"/><circle cx="9" cy="9" r="8" fill="#9b6a3d"/><circle cx="2" cy="-2" r="7" fill="#7d5030"/></g></g>`
}

/** y of a smooth line at x (Catmull-Rom on points sorted by x). */
function shoreY(pts: [number, number][], x: number): number {
  let i = 0
  while (i < pts.length - 2 && pts[i + 1][0] < x) i++
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  const t = Math.max(0, Math.min(1, (x - p1[0]) / (p2[0] - p1[0])))
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
}

function seaBackground(p: string): string {
  const defs = [
    ugrad(`${p}-sky`, 0, 560, [[0, '#6cbff5'], [0.6, '#aedcfb'], [1, '#ffe8d4']]),
    sunDefs(p),
    ugrad(`${p}-sea`, 556, 740, [[0, '#2ea4d4'], [0.5, '#48c0dc'], [1, '#86e2d6']]),
    ugrad(`${p}-sand`, 700, 1000, [[0, '#ffeac4'], [1, '#f4cd92']]),
    rgrad(`${p}-star`, [[0, '#ffb38a'], [1, '#ff8a6b']]),
  ].join('')
  const clouds = driftCloud(260, 250, 180, 5) + driftCloud(800, 200, 150, 4, '#ffffff', '#dce9fb', 0.9) + driftCloud(500, 420, 110, 3, '#ffffff', '#e2edfb', 0.8)
  const gulls = bird(380, 300, 1.2, '#4f6688', 0) + bird(420, 326, 0.9, '#4f6688', 1.1)
  const boat = `<g class="lh-sc-bob" style="--d:-.8s;--t:4.5s"><g transform="translate(830 553) scale(.9)"><path d="M-32 0H32L23 13H-23Z" fill="#ff7a7a"/><path d="M-27 4H27" stroke="#fff" stroke-width="2.4"/><path d="M-2 -2V-54L-32 -6Z" fill="#ffffff"/><path d="M2 -6V-46L23 -8Z" fill="#ffd166"/><path d="M-2 -54l10 4-10 4" fill="#ff5c8a"/></g></g>`
  const glitter = [
    [688, 580, 30],
    [662, 600, 20],
    [714, 620, 24],
    [678, 648, 16],
    [702, 684, 12],
  ]
    .map(([x, y, w], i) => twinkle(`<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="2.4" fill="#fff8e0"/>${i % 2 ? '' : `<path d="${sparkle(x + w / 2, y - 4, 6)}" fill="#ffffff"/>`}`, i * 0.5, 2.4))
    .join('')
  const waves = Array.from({ length: 9 }, (_, i) => {
    const x = 70 + ((i * 337) % 860)
    const y = 590 + ((i * 53) % 110)
    const w = 26 + (y - 590) * 0.2
    return `<g class="lh-sc-wave" style="--d:${n(-i * 0.7)}s"><path d="M${x} ${y}q${n(w / 2)} ${n(-w * 0.28)} ${n(w)} 0t${n(w)} 0" stroke="#e8fbff" stroke-width="${n(2.4 + (y - 590) / 80)}" stroke-linecap="round" fill="none" opacity=".75"/></g>`
  }).join('')
  const line: [number, number][] = [
    [-40, 724],
    [160, 702],
    [420, 736],
    [640, 740],
    [860, 712],
    [1040, 716],
  ]
  const edge = (dy: number) => smooth(line.map(([x, y]) => [x, y + dy]))
  const below = 'L1040 1000L-40 1000Z'
  let froth = ''
  let wavy = ''
  for (let x = -40; x <= 1040; x += 10) {
    const y = shoreY(line, x) - 22 + Math.sin(x / 19) * 3
    wavy += `${x === -40 ? 'M' : 'L'}${x} ${n(y)}`
    if (x % 70 === 0) froth += `<circle cx="${x + 12}" cy="${n(y - 9)}" r="4.2"/><circle cx="${x + 26}" cy="${n(y - 6)}" r="2.6"/>`
  }
  const sand = `<path d="${edge(-26)}${below}" fill="#e6c995"/><g class="lh-sc-wash"><path d="${edge(-24)}${below}" fill="#a3e9e0" opacity=".85"/><path d="${wavy}" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g fill="#ffffff" opacity=".9">${froth}</g><path d="${edge(-10)}" stroke="#ffffff" stroke-width="2.6" fill="none" opacity=".55"/></g><path d="${edge(0)}${below}" fill="url(#${p}-sand)"/><path d="${edge(12)}" stroke="#fbe7c2" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/>`
  const starfish = `<path d="${starPath(150, 800, 30, 13, 9, 4)}" fill="url(#${p}-star)" transform="rotate(14 150 800)"/>${[0, 1, 2, 3, 4]
    .map((i) => {
      const a = ((-76 + i * 72) * Math.PI) / 180
      return `<circle cx="${n(150 + Math.cos(a) * 14)}" cy="${n(800 + Math.sin(a) * 14)}" r="2.4" fill="#ffd9c4"/>`
    })
    .join('')}`
  const shell = (x: number, y: number, s: number, c: string) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 12L-18 -4C-16 -16 -6 -20 0 -20C6 -20 16 -16 18 -4Z" fill="${c}"/>${[-12, -6, 0, 6, 12]
      .map((dx) => `<path d="M0 12L${dx} -18" stroke="${darken(c, 0.15)}" stroke-width="1.6"/>`)
      .join('')}<rect x="-5" y="10" width="10" height="5" rx="2" fill="${darken(c, 0.1)}"/></g>`
  const shells = shell(870, 790, 1.3, '#ffc6d9') + shell(812, 818, 0.9, '#fff0e0') + shell(340, 930, 1, '#ffd8b8') + shell(640, 960, 0.8, '#ffc6d9')
  const pebbles = [
    [260, 810, 7],
    [275, 818, 5],
    [700, 900, 6],
    [920, 860, 8],
    [420, 980, 6],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="#e9c592"/>`)
    .join('')
  return `<defs>${defs}</defs><rect width="${BG}" height="${BG}" fill="url(#${p}-sky)"/>${sun(p, 680, 380, 44, false)}${clouds}${gulls}<rect y="556" width="${BG}" height="444" fill="url(#${p}-sea)"/><rect y="556" width="${BG}" height="6" fill="#ffffff" opacity=".35"/>${glitter}${boat}${waves}${sand}${palm(80, 790, 1.15)}${starfish}${shells}${pebbles}`
}

const BACKGROUND_ART: Record<string, (p: string) => string> = {
  hearts: heartsBackground,
  meadow: meadowBackground,
  sky: skyBackground,
  night: nightBackground,
  rainbow: rainbowBackground,
  castle: castleBackground,
  sea: seaBackground,
}

/**
 * Full-bleed stage background (unknown ids fall back to Matryona's hearts).
 * The root has class `lh-sc lh-sc-bg lh-sc-bg-<id>` and fills its box (`slice`).
 */
export function backgroundSvg(id: string, prefix: string): string {
  const key = id in BACKGROUND_ART ? id : 'hearts'
  const p = safe(prefix)
  return `<svg class="lh-sc lh-sc-bg lh-sc-bg-${key}" viewBox="0 0 ${BG} ${BG}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" focusable="false" ${XMLNS}>${BACKGROUND_ART[key](p)}</svg>`
}

/* ─────────────────────────── background thumbnails ─────────────────────────── */

const ICON_ART: Record<string, (p: string) => string> = {
  hearts: (p) =>
    `<defs><radialGradient id="${p}-a" cx=".5" cy=".42" r=".6">${stops([[0, '#ff7f9f'], [1, '#d22a5c']])}</radialGradient></defs><rect width="100" height="100" fill="url(#${p}-a)"/>${[
      [34, 40, 0.3, -12],
      [70, 30, 0.2, 14],
      [64, 68, 0.26, 8],
      [24, 74, 0.16, -6],
      [84, 56, 0.12, 0],
    ]
      .map(([x, y, s, r]) => `<path d="${HEART}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="#ffc4d6"/>`)
      .join('')}<path d="${sparkle(50, 18, 5)}" fill="#fff"/>`,
  meadow: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#86c9f5'], [1, '#e4f4ff']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/><circle cx="70" cy="30" r="11" fill="#ffd84d"/><path d="M0 62C20 52 40 54 56 60C72 66 86 56 100 58V100H0Z" fill="#9fd88f"/><path d="M0 74C30 66 60 70 100 70V100H0Z" fill="#74c364"/>${blossom(26, 84, 7, '#ff7eb3')}${blossom(70, 88, 6, '#ffb347')}${daisy(48, 80, 5)}`,
  sky: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#4d9ff0'], [1, '#cfe9ff']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/>${cloud(40, 50, 70)}${cloud(72, 76, 56)}${cloud(20, 92, 60)}`,
  night: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#15174a'], [1, '#4b3d92']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/><circle cx="60" cy="40" r="17" fill="#fff0b3"/><circle cx="68" cy="34" r="15" fill="#22266a"/><path d="${sparkle(28, 30, 6)}" fill="#fff8d6"/><path d="${starPath(32, 64, 6, 3, 2, 1)}" fill="#ffe680"/><circle cx="76" cy="66" r="2" fill="#fff"/><circle cx="18" cy="48" r="1.6" fill="#fff"/><path d="M0 80C30 72 60 76 100 74V100H0Z" fill="#2c2968"/>`,
  rainbow: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#a9d6ff'], [1, '#ffe2ef']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/>${rainbowArc(50, 78, 42, 6, ['#ff7f96', '#ffad5e', '#ffdf66', '#86dc84', '#6fb8ff', '#a98cff'])}${cloud(14, 82, 36)}${cloud(86, 82, 36)}`,
  castle: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#b8b0ff'], [1, '#ffd6e4']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/><path d="M0 78C30 68 70 68 100 76V100H0Z" fill="#9fdc9a"/><rect x="30" y="46" width="40" height="32" fill="#fff3f8"/><rect x="22" y="40" width="14" height="38" fill="#fde3ee"/><rect x="64" y="40" width="14" height="38" fill="#fde3ee"/><path d="M19 41L29 24L39 41Z" fill="#ff9cc4"/><path d="M61 41L71 24L81 41Z" fill="#ff9cc4"/><rect x="42" y="30" width="16" height="18" fill="#fff3f8"/><path d="M39 31L50 14L61 31Z" fill="#cbb8ff"/><path d="M44 78V68A6 6 0 0 1 56 68V78Z" fill="#d68fb5"/><path d="M50 14V6l8 3-8 3" fill="#ff5c8a"/>`,
  sea: (p) =>
    `<defs>${vgrad(`${p}-a`, [[0, '#6cbff5'], [1, '#ffe8d4']])}${vgrad(`${p}-b`, [[0, '#2ea4d4'], [1, '#86e2d6']])}</defs><rect width="100" height="100" fill="url(#${p}-a)"/><circle cx="66" cy="34" r="11" fill="#ffd84d"/><rect y="52" width="100" height="48" fill="url(#${p}-b)"/><path d="M14 64q6 -4 12 0t12 0M60 70q6 -4 12 0t12 0" stroke="#e8fbff" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M0 80C30 74 60 82 100 76V100H0Z" fill="#ffe2b0"/><path d="${starPath(30, 90, 7, 3.2, 2, 1)}" fill="#ff9a7a"/>`,
}

/** Round 0 0 100 100 thumbnail of a background (for the background button). */
export function backgroundIcon(id: string, prefix: string): string {
  const key = id in ICON_ART ? id : 'hearts'
  const p = safe(prefix)
  return `<svg class="lh-sc lh-sc-bgicon" viewBox="0 0 100 100" aria-hidden="true" focusable="false" ${XMLNS}><defs><clipPath id="${p}-clip"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${p}-clip)">${ICON_ART[key](p)}</g><circle cx="50" cy="50" r="47.5" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="3"/></svg>`
}

/* ─────────────────────────── the mound ─────────────────────────── */

/**
 * The grassy island the pony stands on.
 * viewBox 0 0 MOUND_VIEWBOX.width × height (640 × 250). The top face is an oval centred on
 * (320, MOUND_TOP_Y = 104); put the pony's hooves (HORSE_GROUND_Y) on that line, with the
 * middle of the hooves near x 320. The apple lies on the top face, left of the middle, right
 * under the spot where the pony's lowered head munches (the pony faces left).
 */
export const MOUND_VIEWBOX: { width: number; height: number } = { width: 640, height: 250 }
export const MOUND_TOP_Y = 104
/**
 * Where the apple touches the grass (its pivot for eating / regrowing), in mound units.
 * The workshop draws the mound at 0.82 × the pony's viewBox units, centred under the hooves
 * (pony x 266); there this spot lies right under HORSE_MUNCH_MOUTH (123, 365), so the
 * lowered head really bites the apple.
 */
export const MOUND_APPLE: { x: number; y: number } = { x: 140, y: 116 }

function apple(p: string): string {
  const { x, y } = MOUND_APPLE
  return `<g class="lh-apple" data-zone="apple" ${origin(x, y)}>
<circle cx="${x}" cy="${y - 22}" r="40" fill="transparent"/>
<ellipse cx="${x + 2}" cy="${y}" rx="24" ry="6" fill="#2f7a35" opacity=".35"/>
<g transform="translate(${x} ${y - 21}) rotate(-12)">
<path d="M0 -15C-7 -22 -25 -23 -27 -6C-29 9 -16 23 0 21C16 23 29 9 27 -6C25 -23 7 -22 0 -15Z" fill="url(#${p}-apple)" stroke="#b5132e" stroke-width="2"/>
<path d="M-17 -12C-22 -6 -22 3 -18 8" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>
<circle cx="-12" cy="-15" r="2.6" fill="#fff" opacity=".85"/>
<path d="M0 -14C0 -20 1 -25 5 -29" stroke="#7a4a2a" stroke-width="3.6" stroke-linecap="round" fill="none"/>
<path d="M4 -24C10 -32 20 -32 24 -27C18 -21 9 -20 4 -24Z" fill="#5cc25a" stroke="#3f9a49" stroke-width="1.4"/>
</g></g>`
}

export function moundSvg(prefix: string): string {
  const p = safe(prefix)
  const top = MOUND_TOP_Y
  const defs = [
    rgrad(`${p}-top`, [[0, '#b8ef86'], [0.55, '#8fd968'], [1, '#68bf52']], 0.42, 0.32, 0.7),
    vgrad(`${p}-side`, [[0, '#62b853'], [0.55, '#48a044'], [1, '#2f8038']]),
    rgrad(`${p}-shadow`, [[0, '#3a0820', 0.32], [1, '#3a0820', 0]]),
    rgrad(`${p}-apple`, [[0, '#ff7b7b'], [0.55, '#ef2b3f'], [1, '#c4162f']], 0.36, 0.3, 0.75),
  ].join('')
  // scalloped grass rim along the front edge of the top face
  let rim = ''
  for (let i = 0; i <= 24; i++) {
    const t = 0.03 + (i / 24) * 0.94
    const a = Math.PI * (1 - t)
    const x = 320 + Math.cos(a) * 292
    const y = top + Math.sin(a) * 60
    rim += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(13 + (i % 3) * 3)}"/>`
  }
  const blades = [
    [62, 96, 26, -8],
    [104, 66, 22, -4],
    [520, 64, 24, 5],
    [586, 100, 28, 9],
    [300, 50, 18, 0],
    [430, 52, 20, 3],
  ]
    .map(([x, y, h, tilt], i) => `<g class="lh-sc-grass" style="--d:${n(-i * 0.6)}s;transform-origin:${x}px ${y}px"><g transform="rotate(${tilt} ${x} ${y})">${tuft(x, y, h, i % 2 ? '#5db84f' : '#4fa847')}</g></g>`)
    .join('')
  const flowers =
    daisy(92, 132, 9) +
    blossom(130, 150, 8, '#ff8fc0') +
    blossom(70, 116, 6, '#ffd84d', '#ff9f43') +
    daisy(254, 166, 7) +
    blossom(392, 168, 8, '#c39bff') +
    daisy(462, 160, 9) +
    blossom(540, 140, 8, '#ff8fc0') +
    blossom(584, 118, 6, '#ffd84d', '#ff9f43') +
    daisy(510, 74, 6) +
    blossom(150, 70, 6, '#ffb3d1') +
    blossom(330, 156, 5, '#ffd84d', '#ff9f43')
  const specks = scatter(87, 22, [60, 60, 580, 150], 34, (x, y) => ((x - 320) / 280) ** 2 + ((y - top) / 52) ** 2 > 1)
    .map(([x, y, r]) => `<path d="M${n(x)} ${n(y)}l${n(-2 - r * 2)} ${n(-6 - r * 4)}M${n(x + 4)} ${n(y)}l${n(1 + r * 2)} ${n(-5 - r * 4)}" stroke="#5aaf4b" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`)
    .join('')
  return `<svg class="lh-sc lh-sc-mound" viewBox="0 0 ${MOUND_VIEWBOX.width} ${MOUND_VIEWBOX.height}" aria-hidden="true" focusable="false" ${XMLNS}><defs>${defs}</defs>
<ellipse cx="320" cy="236" rx="250" ry="14" fill="url(#${p}-shadow)"/>
<path d="M28 ${top}C30 172 140 230 320 236C500 230 610 172 612 ${top}Z" fill="url(#${p}-side)"/>
<path d="M78 ${top + 62}C150 206 240 222 320 224C400 222 490 206 562 ${top + 62}" stroke="#2f7d36" stroke-width="6" stroke-linecap="round" fill="none" opacity=".3"/>
<path d="M120 ${top + 86}C190 218 260 226 320 227" stroke="#7fd06a" stroke-width="4" stroke-linecap="round" fill="none" opacity=".35"/>
<g fill="#58b04c">${rim}</g>
<ellipse cx="320" cy="${top}" rx="292" ry="60" fill="url(#${p}-top)"/>
<ellipse cx="250" cy="${top - 22}" rx="140" ry="20" fill="#ffffff" opacity=".16"/>
${specks}${blades}${flowers}${apple(p)}</svg>`
}

/* ─────────────────────────── the stable meadow ─────────────────────────── */

/**
 * The stable meadow is a wide scene: viewBox 0 0 1800 × 1000, `xMidYMax slice`, so the
 * bottom always shows and narrow screens keep the middle (barn left of centre, apple tree
 * right of it). Ponies roam in front of the fence: MEADOW_GROUND is that band as fractions
 * of the viewport height (with `xMidYMax`, any viewport fraction inside it lands on grass).
 */
export const MEADOW_VIEWBOX: { width: number; height: number } = { width: 1800, height: 1000 }
export const MEADOW_GROUND: { top: number; bottom: number } = { top: 0.58, bottom: 0.96 }

const MW = 1800

function barn(p: string, x: number, base: number): string {
  // x = centre of the barn; base = where it stands
  const w = 300
  const l = x - w / 2
  const r = x + w / 2
  const eave = base - 170
  const ridge = base - 300
  const roof = `M${l - 24} ${eave + 8}L${l + 30} ${eave - 70}L${x} ${ridge}L${r - 30} ${eave - 70}L${r + 24} ${eave + 8}Z`
  const front = `M${l} ${base}V${eave}L${l + 36} ${eave - 66}L${x} ${ridge + 22}L${r - 36} ${eave - 66}L${r} ${eave}V${base}Z`
  const planks = Array.from({ length: 9 }, (_, i) => `<path d="M${l + 30 + i * 30} ${base}V${eave - 40}" stroke="#c0393f" stroke-width="3" opacity=".45"/>`).join('')
  const door = `<rect x="${x - 62}" y="${base - 118}" width="124" height="118" fill="#8a2a31"/><rect x="${x - 58}" y="${base - 114}" width="56" height="114" fill="#e8484f"/><rect x="${x + 2}" y="${base - 114}" width="56" height="114" fill="#e8484f"/><path d="M${x - 58} ${base - 114}L${x - 2} ${base}M${x - 2} ${base - 114}L${x - 58} ${base}M${x + 2} ${base - 114}L${x + 58} ${base}M${x + 58} ${base - 114}L${x + 2} ${base}" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/><rect x="${x - 62}" y="${base - 122}" width="124" height="10" rx="4" fill="#ffffff"/><path d="M${x - 58} ${base - 114}H${x + 58}V${base}H${x - 58}Z" stroke="#ffffff" stroke-width="7" fill="none"/>`
  const loft = `<path d="M${x - 34} ${eave - 2}V${eave - 30}A34 34 0 0 1 ${x + 34} ${eave - 30}V${eave - 2}Z" fill="#ffffff"/><path d="M${x - 26} ${eave - 6}V${eave - 30}A26 26 0 0 1 ${x + 26} ${eave - 30}V${eave - 6}Z" fill="#6b2b2f"/><path d="M${x - 20} ${eave - 6}q8 -16 20 -10q10 -8 20 6Z" fill="#ffd36b"/>`
  const windows = [l + 46, r - 96]
    .map((wx) => `<rect x="${wx}" y="${base - 112}" width="50" height="46" rx="5" fill="#ffffff"/><rect x="${wx + 6}" y="${base - 106}" width="38" height="34" rx="3" fill="#ffe7a8"/><path d="M${wx + 25} ${base - 106}V${base - 72}M${wx + 6} ${base - 89}H${wx + 44}" stroke="#ffffff" stroke-width="4"/>`)
    .join('')
  const heart = `<path d="${HEART}" transform="translate(${x} ${eave - 76}) scale(.16)" fill="#ffffff"/>`
  return `<g><path d="${roof}" fill="url(#${p}-roof)"/><path d="M${l - 24} ${eave + 8}L${l + 30} ${eave - 70}L${x} ${ridge}L${r - 30} ${eave - 70}L${r + 24} ${eave + 8}" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" fill="none" opacity=".9"/><path d="${front}" fill="url(#${p}-barn)"/>${planks}<path d="M${l} ${eave}H${r}" stroke="#ffffff" stroke-width="7"/>${loft}${heart}${windows}${door}<path d="${front}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/></g>`
}

function appleTree(p: string, x: number, base: number): string {
  const apples = [
    [-60, -250],
    [40, -290],
    [72, -215],
    [-20, -320],
    [-88, -196],
    [10, -200],
    [96, -268],
    [-48, -146],
  ]
    .map(([dx, dy]) => `<circle cx="${x + dx}" cy="${base + dy}" r="11" fill="#ef3a4a"/><circle cx="${x + dx - 3}" cy="${base + dy - 4}" r="3" fill="#fff" opacity=".7"/><path d="M${x + dx} ${base + dy - 10}l2 -6" stroke="#6b4428" stroke-width="2.4" stroke-linecap="round"/>`)
    .join('')
  return `<g><path d="M${x - 22} ${base}C${x - 14} ${base - 60} ${x - 16} ${base - 110} ${x - 8} ${base - 160}L${x + 14} ${base - 160}C${x + 14} ${base - 110} ${x + 16} ${base - 60} ${x + 26} ${base}Z" fill="#a8713f"/><path d="M${x - 4} ${base - 120}C${x - 30} ${base - 150} ${x - 50} ${base - 160} ${x - 60} ${base - 180}M${x + 6} ${base - 130}C${x + 30} ${base - 160} ${x + 50} ${base - 170} ${x + 60} ${base - 190}" stroke="#a8713f" stroke-width="12" stroke-linecap="round" fill="none"/>
<g class="lh-sc-tree" ${origin(x, base - 120)}><circle cx="${x - 70}" cy="${base - 200}" r="70" fill="#4fae55"/><circle cx="${x + 70}" cy="${base - 215}" r="74" fill="#4fae55"/><circle cx="${x}" cy="${base - 270}" r="96" fill="#5cbc5e"/><circle cx="${x - 40}" cy="${base - 300}" r="62" fill="url(#${p}-crown)"/><circle cx="${x + 52}" cy="${base - 260}" r="58" fill="url(#${p}-crown)"/><circle cx="${x - 70}" cy="${base - 330}" r="16" fill="#fff" opacity=".18"/>${apples}</g></g>`
}

function fence(y: number, from: number, to: number, gap?: [number, number]): string {
  let posts = ''
  let rails = ''
  const step = 120
  const segs: [number, number][] = gap ? [[from, gap[0]], [gap[1], to]] : [[from, to]]
  for (const [a, b] of segs) {
    for (const ry of [y - 46, y - 22]) {
      rails += `<rect x="${a}" y="${ry}" width="${b - a}" height="12" rx="6" fill="#e2a96c"/><rect x="${a}" y="${ry}" width="${b - a}" height="4.5" rx="2.2" fill="#f6d3a2"/>`
    }
    for (let x = a; x <= b + 1; x += step) {
      const px = Math.max(a + 8, Math.min(x, b - 8))
      posts += `<ellipse cx="${px}" cy="${y + 1}" rx="15" ry="4.5" fill="#3f8f3f" opacity=".28"/><rect x="${px - 8}" y="${y - 62}" width="16" height="64" rx="7" fill="#cf8f55"/><rect x="${px - 8}" y="${y - 62}" width="6" height="64" rx="3" fill="#e9b47a"/>`
    }
  }
  return `<g>${rails}${posts}</g>`
}

function hay(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-40" y="-46" width="80" height="46" rx="14" fill="#f2c45a"/><rect x="-40" y="-46" width="80" height="14" rx="7" fill="#f8d77e"/><path d="M-22 -46V0M22 -46V0" stroke="#c98f2e" stroke-width="5"/><path d="M-34 -18h10M-8 -28h12M30 -14h-8M6 -10h10" stroke="#d9a43c" stroke-width="2.4" stroke-linecap="round"/></g>`
}

function haystack(x: number, y: number, s: number): string {
  return hay(x - 38 * s, y, s) + hay(x + 38 * s, y, s) + hay(x, y - 44 * s, s)
}

/** A round bush with a few blossoms. */
function bush(x: number, y: number, r: number, flower?: string): string {
  const blossoms = flower
    ? [
        [-0.5, -0.5],
        [0.3, -0.9],
        [0.75, -0.3],
        [-0.05, -0.15],
      ]
        .map(([dx, dy]) => blossom(x + dx * r, y + dy * r, r * 0.22, flower))
        .join('')
    : ''
  return `<g><ellipse cx="${n(x)}" cy="${n(y + 2)}" rx="${n(r * 1.3)}" ry="${n(r * 0.22)}" fill="#3f8f3f" opacity=".25"/><circle cx="${n(x - r * 0.65)}" cy="${n(y - r * 0.4)}" r="${n(r * 0.6)}" fill="#4fae55"/><circle cx="${n(x + r * 0.62)}" cy="${n(y - r * 0.38)}" r="${n(r * 0.62)}" fill="#4fae55"/><circle cx="${n(x)}" cy="${n(y - r * 0.72)}" r="${n(r * 0.78)}" fill="#5dbd5f"/><circle cx="${n(x - r * 0.25)}" cy="${n(y - r)}" r="${n(r * 0.3)}" fill="#7fd47a"/>${blossoms}</g>`
}

function pond(p: string, x: number, y: number): string {
  return `<g><ellipse cx="${x}" cy="${y}" rx="150" ry="30" fill="#7fc474"/><ellipse cx="${x}" cy="${y - 2}" rx="138" ry="24" fill="url(#${p}-pond)"/><path d="M${x - 80} ${y - 8}h40M${x + 40} ${y + 4}h46" stroke="#e8fbff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
<g class="lh-sc-bob" style="--d:-.5s;--t:3.6s"><g transform="translate(${x - 10} ${y - 6}) scale(1.15)"><ellipse cx="0" cy="0" rx="20" ry="11" fill="#ffffff"/><path d="M10 -4C12 -16 6 -24 -2 -22C-8 -20 -8 -12 -2 -8Z" fill="#ffffff"/><circle cx="0" cy="-17" r="2" fill="#2f2a33"/><path d="M-6 -15L-15 -13L-6 -11Z" fill="#ff9f43"/><path d="M8 -2Q18 -10 22 -4" stroke="#e6e6ee" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>
${[-136, -122, 124, 138].map((dx, i) => `<path d="M${x + dx} ${y + 4}q${i % 2 ? 4 : -4} -34 ${i % 2 ? 2 : -2} -52" stroke="#4f9a4a" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="${x + dx + (i % 2 ? 2 : -2)}" cy="${y - 42}" rx="4.5" ry="10" fill="#a0683c"/>`).join('')}</g>`
}

export function meadowSvg(prefix: string): string {
  const p = safe(prefix)
  const defs = [
    ugrad(`${p}-sky`, 0, 520, [[0, '#78c2f5'], [0.6, '#b9e3ff'], [1, '#fff3d9']]),
    sunDefs(p),
    ugrad(`${p}-far`, 380, 540, [[0, '#b6e2bb'], [1, '#a2d8a8']]),
    ugrad(`${p}-mid`, 420, 560, [[0, '#a5dc8e'], [1, '#90d07e']]),
    ugrad(`${p}-grass`, 480, 1000, [[0, '#93d77a'], [0.45, '#7cc86a'], [1, '#62b45a']]),
    vgrad(`${p}-roof`, [[0, '#8b6a5a'], [1, '#6e5045']]),
    vgrad(`${p}-barn`, [[0, '#ff6b6b'], [1, '#e04a51']], 0.6, 1),
    rgrad(`${p}-crown`, [[0, '#8be07f'], [1, '#62c364']], 0.4, 0.35, 0.7),
    vgrad(`${p}-pond`, [[0, '#7fd3f0'], [1, '#4fb6dc']]),
    vgrad(`${p}-path`, [[0, '#f3dcb0'], [1, '#e8c98f']]),
    glow(`${p}-patch`, '#c4f29a', 0.4),
  ].join('')
  const clouds =
    driftCloud(300, 190, 200, 6, undefined, undefined, 1, MW) +
    driftCloud(820, 130, 150, 5, '#ffffff', '#dce9fb', 0.9, MW) +
    driftCloud(1240, 220, 190, 7, undefined, undefined, 1, MW) +
    driftCloud(1650, 120, 140, 5, '#ffffff', '#dce9fb', 0.9, MW)
  const farTrees = [
    [120, 438, 40],
    [160, 446, 30],
    [380, 420, 34],
    [1660, 430, 42],
    [1700, 440, 30],
    [1480, 418, 28],
  ]
    .map(([x, y, s]) => roundTree(x, y, s, '#8fd39a', '#7cc487'))
    .join('')
  const hills =
    `<path d="M0 452C160 400 320 404 470 432C620 460 760 410 940 404C1120 398 1260 436 1400 430C1560 424 1700 400 1800 420V1000H0Z" fill="url(#${p}-far)"/>${farTrees}` +
    `<path d="M0 500C200 460 420 476 600 492C800 510 1000 466 1220 470C1420 474 1620 500 1800 486V1000H0Z" fill="url(#${p}-mid)"/>`
  const grass = `<path d="M0 520C300 506 600 514 900 516C1200 518 1500 506 1800 514V1000H0Z" fill="url(#${p}-grass)"/>${[
    [300, 700, 380, 60],
    [1400, 760, 420, 70],
    [900, 900, 520, 70],
  ]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${p}-patch)"/>`)
    .join('')}`
  const barnX = 760
  const behind = `${haystack(540, 552, 0.8)}${barn(p, barnX, 548)}${appleTree(p, 1150, 540)}${pond(p, 1470, 498)}`
  // the path winds from the barn door down to the bottom edge
  const spine: [number, number, number][] = [
    [barnX, 560, 50],
    [barnX - 14, 640, 66],
    [barnX - 60, 740, 92],
    [barnX - 40, 850, 124],
    [barnX + 20, 1010, 170],
  ]
  const leftEdge = spine.map(([x, y, w]) => [x - w, y] as [number, number])
  const rightEdge = spine.map(([x, y, w]) => [x + w, y] as [number, number]).reverse()
  const path = `<path d="${smooth(leftEdge)}L${n(rightEdge[0][0])} ${n(rightEdge[0][1])}${smooth(rightEdge).replace(/^M[^C]*/, '')}Z" fill="url(#${p}-path)"/>${[
    [barnX - 90, 720, 9],
    [barnX + 10, 800, 7],
    [barnX - 70, 900, 11],
    [barnX + 90, 960, 8],
    [barnX - 10, 655, 6],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.6}" fill="#dcbd86"/>`)
    .join('')}`
  const fences = fence(578, -20, 1820, [barnX - 76, barnX + 76])
  const fenceBushes = bush(80, 590, 46, '#ff8fbf') + bush(1000, 588, 40, '#ffd84d') + bush(1700, 592, 50, '#ffffff') + bush(330, 588, 34)
  const clusters = scatter(91, 16, [40, 640, 1760, 900], 150, (x, y) => Math.abs(x - (barnX - 40)) < 170 && y > 600)
    .map(([x, y, r], i) => {
      const colors = ['#ff8fbf', '#ffd84d', '#c39bff', '#ff9f6b', '#8fd0ff']
      const c = colors[i % colors.length]
      const s = 6 + (y - 640) / 40 + r * 2
      return `${tuft(x - s * 1.6, y + s, s * 2.2, '#5fb257')}${i % 3 === 0 ? daisy(x, y, s) : blossom(x, y, s, c)}${blossom(x + s * 1.7, y + s * 0.8, s * 0.8, c)}${daisy(x - s * 1.2, y + s * 1.2, s * 0.7)}`
    })
    .join('')
  const specks = scatter(97, 40, [20, 620, 1780, 980], 70)
    .map(([x, y, r]) => tuft(x, y, 10 + r * 8 + (y - 620) / 30, '#6cbb5f'))
    .join('')
  const front =
    [
      [60, 990, 50],
      [210, 1000, 36],
      [420, 990, 30],
      [1340, 996, 32],
      [1580, 990, 40],
      [1750, 1000, 48],
      [1080, 1000, 28],
    ]
      .map(([x, y, h]) => tuft(x, y, h, '#4f9f4c'))
      .join('') +
    stemFlower(110, 990, 70, '#ff7eb3') +
    stemFlower(160, 1000, 54, '#ffd84d', 'daisy') +
    stemFlower(1660, 994, 72, '#b58cff') +
    stemFlower(1710, 1000, 52, '#ff9f6b')
  const flies = butterfly(420, 330, 1.3, '#ffb3d9', '#fff', 0) + butterfly(1030, 280, 1.1, '#ffd166', '#fff6d6', 2.6) + butterfly(1560, 360, 1.2, '#a8d8ff', '#fff', 5.2)
  return `<svg class="lh-sc lh-sc-meadow" viewBox="0 0 ${MW} 1000" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true" focusable="false" ${XMLNS}><defs>${defs}</defs><rect width="${MW}" height="1000" fill="url(#${p}-sky)"/>${sun(p, 1480, 170, 52)}${clouds}${bird(600, 210, 1.2, '#5577a8', 0)}${bird(640, 236, 0.9, '#5577a8', 1.2)}${hills}${grass}${behind}${fences}${fenceBushes}${specks}${path}${clusters}${front}${flies}</svg>`
}

/* ─────────────────────────── gift, star ─────────────────────────── */

/**
 * A wrapped present, viewBox 0 0 100 100. `.lh-gift-body` (pivot at the bottom middle) can
 * wiggle; `.lh-gift-lid` (pivot at the middle of the lid's lower edge) lifts off to open it.
 */
export function giftSvg(prefix: string, color = '#ff6f9f'): string {
  const p = safe(prefix)
  const base = rgb(color) ? color : '#ff6f9f'
  const [r, g, b] = rgb(base) ?? [255, 111, 159]
  // gold ribbon unless the paper itself is yellow/orange, then raspberry
  const warm = r > 200 && g > 140 && b < 120
  const ribbon = warm ? '#ff4f86' : '#ffcf3f'
  const defs = [
    vgrad(`${p}-paper`, [[0, lighten(base, 0.12)], [1, darken(base, 0.12)]]),
    vgrad(`${p}-lid`, [[0, lighten(base, 0.3)], [1, lighten(base, 0.02)]]),
    vgrad(`${p}-ribbon`, [[0, lighten(ribbon, 0.35)], [1, darken(ribbon, 0.08)]]),
  ].join('')
  const dots = [
    [26, 58],
    [34, 76],
    [70, 60],
    [76, 80],
    [24, 86],
    [64, 74],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" opacity=".35"/>`)
    .join('')
  return `<svg class="lh-sc lh-sc-gift" viewBox="0 0 100 100" aria-hidden="true" focusable="false" ${XMLNS}><defs>${defs}</defs>
<ellipse cx="50" cy="93" rx="35" ry="5" fill="#3a1630" opacity=".18"/>
<g class="lh-gift-body" ${origin(50, 92)}>
<rect x="16" y="44" width="68" height="48" rx="7" fill="url(#${p}-paper)"/>${dots}
<rect x="16" y="44" width="68" height="8" fill="${darken(base, 0.35)}" opacity=".55"/>
<rect x="43" y="44" width="14" height="48" fill="url(#${p}-ribbon)"/>
<path d="M21 52V84" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".35"/>
<g class="lh-gift-lid" ${origin(50, 46)}>
<rect x="11" y="31" width="78" height="17" rx="6" fill="url(#${p}-lid)"/>
<rect x="11" y="43" width="78" height="5" rx="2.5" fill="${darken(base, 0.1)}" opacity=".35"/>
<rect x="42" y="31" width="16" height="17" fill="url(#${p}-ribbon)"/>
<path d="M17 36H34" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
<g class="lh-gift-bow">
<path d="M47 32L37 48L42 46.5L44 51L50 33Z" fill="${darken(ribbon, 0.06)}" stroke="${darken(ribbon, 0.22)}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M53 32L63 48L58 46.5L56 51L50 33Z" fill="${darken(ribbon, 0.06)}" stroke="${darken(ribbon, 0.22)}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M50 31C41 13 19 7 16 20C13 33 35 35 50 31Z" fill="url(#${p}-ribbon)" stroke="${darken(ribbon, 0.22)}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M50 31C59 13 81 7 84 20C87 33 65 35 50 31Z" fill="url(#${p}-ribbon)" stroke="${darken(ribbon, 0.22)}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M47 29C39 21 29 18 24 21M53 29C61 21 71 18 76 21" stroke="${darken(ribbon, 0.28)}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".55"/>
<rect x="43.5" y="24" width="13" height="11" rx="4.5" fill="${lighten(ribbon, 0.15)}" stroke="${darken(ribbon, 0.22)}" stroke-width="1.6"/>
<path d="M21 17C22.5 14.5 25 13 28 13" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/>
</g></g></g></svg>`
}

/**
 * Chunky rounded star, viewBox 0 0 100 100. Filled: glossy gold. Empty: a soft pale
 * outline for the slots that wait for stars.
 */
export function starSvg(filled: boolean, prefix: string): string {
  const p = safe(prefix)
  const d = starPath(50, 54, 47, 24, 10, 4)
  if (!filled) {
    return `<svg class="lh-sc lh-sc-star is-empty" viewBox="0 0 100 100" aria-hidden="true" focusable="false" ${XMLNS}><path d="${d}" fill="#ffffff" fill-opacity=".2" stroke="#4a0f2e" stroke-opacity=".22" stroke-width="11" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffffff" stroke-opacity=".85" stroke-width="4.5" stroke-linejoin="round"/><path d="M34 35C37 29 41 23 44 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".45"/></svg>`
  }
  const defs = [
    vgrad(`${p}-gold`, [[0, '#fff09a'], [0.45, '#ffd23f'], [1, '#ffa81f']], 0.3, 1),
    vgrad(`${p}-edge`, [[0, '#f5a623'], [1, '#e07b12']]),
  ].join('')
  return `<svg class="lh-sc lh-sc-star is-filled" viewBox="0 0 100 100" aria-hidden="true" focusable="false" ${XMLNS}><defs>${defs}</defs><path d="${starPath(50, 57, 47, 24, 10, 4)}" fill="#b85c0a" opacity=".25"/><path d="${d}" fill="url(#${p}-gold)" stroke="url(#${p}-edge)" stroke-width="4.5" stroke-linejoin="round"/><path d="${starPath(50, 56, 34, 17.5, 7, 3)}" fill="#ffffff" opacity=".14"/><path d="M33 33C36 26 42 18 46 14" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".85"/><circle cx="29" cy="42" r="3.4" fill="#ffffff" opacity=".85"/></svg>`
}

/* ─────────────────────────── UI icons ─────────────────────────── */

export type UiIconName = 'home' | 'sound' | 'mute' | 'barn' | 'brush' | 'bye' | 'dice' | 'help' | 'plus' | 'back' | 'check' | 'picture'

const UI_ICONS: Record<UiIconName, string> = {
  home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 9.6V19a1 1 0 0 0 1 1h3.4v-5.2h3.6V20h3.4a1 1 0 0 0 1-1V9.6"/>',
  sound: '<path d="M4 9.2h3.6L12.4 5v14l-4.8-4.2H4z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.4a8 8 0 0 1 0 11.2"/>',
  mute: '<path d="M4 9.2h3.6L12.4 5v14l-4.8-4.2H4z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>',
  barn: '<path d="M3.5 20V10.2L7 5.5h10l3.5 4.7V20z"/><path d="M9 20v-6.5h6V20"/><path d="m9 13.5 6 6.5"/><path d="m15 13.5-6 6.5"/><path d="M10.5 9.2h3"/>',
  brush: '<path d="M19.6 4.4a1.9 1.9 0 0 1 0 2.7L12.4 14.3l-2.7-2.7 7.2-7.2a1.9 1.9 0 0 1 2.7 0z"/><path d="M9.2 13.2c-2.3-.4-4.2 1.1-4.3 3.5-.1 1.6-.9 2.6-1.9 3.1 3 1 7.6.5 8.4-3.3"/>',
  bye: '<path d="M8.5 13.5V7a1.5 1.5 0 0 1 3 0v5"/><path d="M11.5 11.5V5.5a1.5 1.5 0 0 1 3 0v6"/><path d="M14.5 11.5V7a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-.6a5.5 5.5 0 0 1-4.4-2.2l-2.6-3.5a1.5 1.5 0 0 1 2.4-1.8l1.2 1.5"/><path d="M19.8 4.2a4 4 0 0 1 1.4 2.8"/><path d="M4.6 4.2A4 4 0 0 0 3.2 7"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8.6" cy="8.6" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.25" fill="currentColor" stroke="none"/><circle cx="15.4" cy="8.6" r="1.25" fill="currentColor" stroke="none"/><circle cx="8.6" cy="15.4" r="1.25" fill="currentColor" stroke="none"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  back: '<path d="M19 12H5.5"/><path d="M11 6l-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  picture: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.6 3.6 3.2 2.6-2.4 4.6 4.2"/>',
}

export const UI_ICON_NAMES: readonly UiIconName[] = Object.keys(UI_ICONS) as UiIconName[]

/** 24 × 24 line icon in `currentColor`, 2 px rounded strokes. */
export function uiIcon(name: UiIconName): string {
  return `<svg class="lh-sc-ui" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${XMLNS}>${UI_ICONS[name] ?? UI_ICONS.help}</svg>`
}
