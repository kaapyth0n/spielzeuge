/** Kitty's Hospital: the cat nurse hero, her wardrobe, the leaderboard badge and the wardrobe icons. */

export const FURS = ['white', 'striped', 'fluffy', 'checked', 'spotted', 'black'] as const
export type Fur = (typeof FURS)[number]

export const TINTS = ['grey', 'ginger', 'pink', 'blue', 'lilac'] as const
export type Tint = (typeof TINTS)[number]

export const TINT_COLOR: Record<Tint, string> = {
  grey: '#9AA3B5',
  ginger: '#F2A65A',
  pink: '#F7A1C4',
  blue: '#8EC5FF',
  lilac: '#B9A7F2',
}

export const WEARS = ['cap', 'stethoscope', 'coat', 'bag', 'glasses', 'bow', 'mirror'] as const
export type Wear = (typeof WEARS)[number]

export interface CatLook {
  fur: Fur
  tint: Tint
  wear: readonly Wear[]
}

export const DEFAULT_LOOK: CatLook = { fur: 'white', tint: 'grey', wear: ['cap'] }

export const POSES = ['stand', 'wave', 'cheer', 'listen', 'point'] as const
export type CatPose = (typeof POSES)[number]

const INK = '#22305A'
const WHITE = '#FFFFFF'
const MINT = '#D8F1EA'
const TEAL = '#1F8A7A'
const CHERRY = '#F0445A'
const SUNNY = '#FFD447'
const BLUSH = '#FF8FA3'
const PAD = '#FF9DB4'
const SILVER = '#D3DCE8'
const SW = 3.25

type Pt = readonly [number, number]

let counter = 0
function makeId(id?: string): string {
  if (id) return id
  counter += 1
  return `bo-cat-${counter}`
}

const r1 = (v: number): string => String(Math.round(v * 10) / 10)
const pt = (p: Pt): string => `${r1(p[0])} ${r1(p[1])}`
const ink = (sw = SW): string => `stroke="${INK}" stroke-width="${r1(sw)}"`

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const channel = (shift: number) => {
    const va = (pa >> shift) & 255
    const vb = (pb >> shift) & 255
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase()
}

/** Catmull-Rom through the points, as cubic Bezier segments. */
function smooth(points: readonly Pt[], closed = true): string {
  const count = points.length
  const at = (i: number): Pt => (closed ? points[(i + count) % count] : points[Math.max(0, Math.min(count - 1, i))])
  let d = `M${pt(points[0])}`
  const segments = closed ? count : count - 1
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return closed ? `${d}Z` : d
}

function polyline(points: readonly Pt[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join('')
}

/** A tufted outline: every segment of the polygon becomes a little flicked lock of fur. */
function tufts(points: readonly Pt[], depth: (m: Pt, normal: Pt) => number): string {
  const count = points.length
  const cx = points.reduce((s, p) => s + p[0], 0) / count
  const cy = points.reduce((s, p) => s + p[1], 0) / count
  let d = `M${pt(points[0])}`
  for (let i = 0; i < count; i++) {
    const a = points[i]
    const b = points[(i + 1) % count]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    const ux = tx / len
    const uy = ty / len
    let nx = uy
    let ny = -ux
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    if ((m[0] - cx) * nx + (m[1] - cy) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    const dep = depth(m, [nx, ny])
    // Locks droop a little: the tip slides towards whichever end sits lower.
    const lean = (b[1] > a[1] ? 1 : -1) * Math.abs(nx) * 0.45 + 0.12
    const tip: Pt = [m[0] + nx * dep + ux * dep * lean, m[1] + ny * dep + uy * dep * lean]
    const c1: Pt = [a[0] + nx * dep * 0.85 + ux * len * 0.1, a[1] + ny * dep * 0.85 + uy * len * 0.1]
    const c2: Pt = [b[0] + nx * dep * 0.1 - ux * len * 0.12, b[1] + ny * dep * 0.1 - uy * len * 0.12]
    d += `Q${pt(c1)} ${pt(tip)}Q${pt(c2)} ${pt(b)}`
  }
  return `${d}Z`
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, rotate: number, steps: number): Pt[] {
  const rad = (rotate * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const out: Pt[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(t) * rx
    const y = Math.sin(t) * ry
    out.push([cx + x * cos - y * sin, cy + x * sin + y * cos])
  }
  return out
}

/* ------------------------------------------------------------------ shapes */

const HEAD_CX = 120
const HEAD_CY = 100
const HEAD_RX = 71
const HEAD_RY = 56

/** A soft mochi head: squarish cheeks, a slightly narrower crown. */
function headPoints(steps: number, dx = 0, dy = 0): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const k = 0.74
    let x = Math.sign(c) * Math.abs(c) ** k * HEAD_RX
    const y = Math.sign(s) * Math.abs(s) ** (s < 0 ? 0.9 : 0.8) * HEAD_RY
    if (y < 0) x *= 1 - 0.13 * (-y / HEAD_RY)
    out.push([HEAD_CX + x + dx, HEAD_CY + y + dy])
  }
  return out
}

const HEAD_D = smooth(headPoints(48))
const HEAD_SHADE_CUT = smooth(headPoints(48, -6, -9))
const FLUFF_HEAD_D = tufts(headPoints(26), (m) => {
  const below = (m[1] - (HEAD_CY - 30)) / (HEAD_RY + 30)
  return 3 + Math.max(0, Math.min(1, below)) * 10
})

const BODY_PTS: Pt[] = [
  [120, 138],
  [143, 141],
  [156, 156],
  [164, 184],
  [171, 222],
  [173, 250],
  [164, 271],
  [142, 279],
  [120, 280],
  [98, 279],
  [76, 271],
  [67, 250],
  [69, 222],
  [76, 184],
  [84, 156],
  [97, 141],
]
const BODY_D = smooth(BODY_PTS)
const BODY_SHADE_CUT = smooth(BODY_PTS.map(([x, y]): Pt => [x - 9, y - 8]))
const FLUFF_BODY_D = tufts(sampleBody(), (m) => (m[1] > 180 ? 7 : 3.5))

function sampleBody(): Pt[] {
  // Evenly spread points along the body so the tufts come out the same size.
  const out: Pt[] = []
  const n = BODY_PTS.length
  for (let i = 0; i < n; i++) {
    const a = BODY_PTS[i]
    const b = BODY_PTS[(i + 1) % n]
    out.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
  }
  return out
}

const LEG_L = 'M85 256L85 280Q85 292 99 292Q113 292 113 280L113 256Z'
const LEG_R = 'M127 256L127 280Q127 292 141 292Q155 292 155 280L155 256Z'

const TAIL: [Pt, Pt, Pt, Pt][] = [
  [
    [148, 258],
    [190, 270],
    [216, 248],
    [212, 212],
  ],
  [
    [212, 212],
    [209, 190],
    [194, 182],
    [186, 194],
  ],
]
const TAIL_D = `M${pt(TAIL[0][0])}${TAIL.map((s) => `C${pt(s[1])} ${pt(s[2])} ${pt(s[3])}`).join('')}`

function bezier(seg: readonly Pt[], t: number): { p: Pt; d: Pt } {
  const [a, b, c, e] = seg
  const u = 1 - t
  const p: Pt = [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1],
  ]
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (e[0] - c[0])
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (e[1] - c[1])
  const len = Math.hypot(dx, dy) || 1
  return { p, d: [dx / len, dy / len] }
}

/* ------------------------------------------------------------------ paint */

interface Paint {
  fur: Fur
  fill: string
  solid: string
  mark: string
  inner: string
  nose: string
  shade: string
  shadeOpacity: number
  chest: string | null
  sock: string | null
  limb: string
  whisker: string
}

function paintFor(fur: Fur, tint: Tint, id: string): Paint {
  const mark = TINT_COLOR[tint]
  const base: Paint = {
    fur,
    fill: WHITE,
    solid: WHITE,
    mark,
    inner: '#FFC4D2',
    nose: '#FF8AA5',
    shade: INK,
    shadeOpacity: 0.08,
    chest: null,
    sock: null,
    limb: WHITE,
    whisker: INK,
  }
  if (fur === 'striped') {
    const cream = '#FFF6E8'
    return { ...base, fill: cream, solid: cream, limb: cream, mark: mix(mark, INK, 0.14), chest: '#FFFCF4' }
  }
  if (fur === 'fluffy') {
    const wash = mix(mark, WHITE, 0.58)
    return { ...base, fill: wash, solid: wash, limb: wash, chest: mix(wash, WHITE, 0.75), shadeOpacity: 0.1 }
  }
  if (fur === 'checked') {
    const chk = `url(#${id}-chk)`
    return { ...base, fill: chk, solid: mix(mark, WHITE, 0.5), limb: chk, chest: WHITE }
  }
  if (fur === 'spotted') {
    const dot = `url(#${id}-dot)`
    return { ...base, fill: dot, solid: WHITE, limb: dot }
  }
  if (fur === 'black') {
    return {
      ...base,
      fill: '#332E42',
      solid: '#332E42',
      inner: '#E58FAE',
      shade: '#000000',
      shadeOpacity: 0.3,
      chest: WHITE,
      sock: WHITE,
      limb: '#474160',
    }
  }
  return base
}

interface Ctx {
  id: string
  look: CatLook
  paint: Paint
  wear: ReadonlySet<Wear>
  headD: string
  bodyD: string
}

function context(look: CatLook, id: string): Ctx {
  const fluffy = look.fur === 'fluffy'
  return {
    id,
    look,
    paint: paintFor(look.fur, look.tint, id),
    wear: new Set(look.wear),
    headD: fluffy ? FLUFF_HEAD_D : HEAD_D,
    bodyD: fluffy ? FLUFF_BODY_D : BODY_D,
  }
}

function patternDefs(id: string, fur: Fur, mark: string, size = 1): string {
  if (fur === 'checked') {
    const s = 16 * size
    return `<pattern id="${id}-chk" width="${r1(s)}" height="${r1(s)}" patternUnits="userSpaceOnUse" patternTransform="translate(4 3)"><rect width="${r1(s)}" height="${r1(s)}" fill="${WHITE}"/><rect width="${r1(s / 2)}" height="${r1(s)}" fill="${mark}" opacity=".5"/><rect width="${r1(s)}" height="${r1(s / 2)}" fill="${mark}" opacity=".5"/></pattern>`
  }
  if (fur === 'spotted') {
    const s = 34 * size
    return `<pattern id="${id}-dot" width="${r1(s)}" height="${r1(s)}" patternUnits="userSpaceOnUse" patternTransform="translate(2 5)"><rect width="${r1(s)}" height="${r1(s)}" fill="${WHITE}"/><circle cx="${r1(9 * size)}" cy="${r1(9 * size)}" r="${r1(6.5 * size)}" fill="${mark}"/><circle cx="${r1(26 * size)}" cy="${r1(25 * size)}" r="${r1(4.8 * size)}" fill="${mark}"/></pattern>`
  }
  return ''
}

function defs(c: Ctx): string {
  return `<defs><clipPath id="${c.id}-hc"><path d="${c.headD}"/></clipPath><clipPath id="${c.id}-bc"><path d="${c.bodyD}"/></clipPath>${patternDefs(c.id, c.look.fur, c.paint.mark)}</defs>`
}

/** A tapered tabby stripe from a (wide, outside the edge) to b (tip). */
function taper(a: Pt, b: Pt, w: number): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const start: Pt = [a[0] - (dx / len) * 6, a[1] - (dy / len) * 6]
  const a1: Pt = [start[0] + (nx * w) / 2, start[1] + (ny * w) / 2]
  const a2: Pt = [start[0] - (nx * w) / 2, start[1] - (ny * w) / 2]
  const m: Pt = [(start[0] + b[0]) / 2, (start[1] + b[1]) / 2]
  const c1: Pt = [m[0] + nx * w * 0.42, m[1] + ny * w * 0.42]
  const c2: Pt = [m[0] - nx * w * 0.42, m[1] - ny * w * 0.42]
  return `M${pt(a1)}Q${pt(c1)} ${pt(b)}Q${pt(c2)} ${pt(a2)}Z`
}

const mirrorX = (p: Pt): Pt => [240 - p[0], p[1]]

function stripes(list: readonly [Pt, Pt, number][], color: string, mirrored = true): string {
  const all = mirrored ? [...list, ...list.map(([a, b, w]): [Pt, Pt, number] => [mirrorX(a), mirrorX(b), w])] : list
  return `<path d="${all.map(([a, b, w]) => taper(a, b, w)).join('')}" fill="${color}"/>`
}

/* ------------------------------------------------------------------ body */

function shadeOverlay(outer: string, cut: string, p: Paint): string {
  return `<path d="${outer}${cut}" fill="${p.shade}" opacity="${p.shadeOpacity}" fill-rule="evenodd"/>`
}

function tailSvg(c: Ctx): string {
  const p = c.paint
  let art: string
  if (p.fur === 'fluffy') {
    const plume = ellipsePoints(200, 226, 22, 46, 14, 16)
    const d = tufts(plume, (m) => 7 + (m[1] > 230 ? 1 : 2))
    art = `<path d="M150 258Q176 268 190 256" fill="none" ${ink(24)}/><path d="M150 258Q176 268 190 256" fill="none" stroke="${p.fill}" stroke-width="17"/><path d="${d}" fill="${p.fill}" ${ink()}/><path d="M198 200q6 10 2 22M206 236q-2 10-8 16M190 222q-4 8-2 16" fill="none" stroke="${mix(p.fill, INK, 0.25)}" stroke-width="2.4"/>`
  } else {
    const w = 17
    let marks = ''
    if (p.fur === 'striped') {
      const bands = [
        [0, 0.55],
        [0, 0.78],
        [1, 0.05],
        [1, 0.32],
        [1, 0.6],
      ]
        .map(([s, t]) => {
          const { p: q, d } = bezier(TAIL[s], t)
          const n: Pt = [-d[1], d[0]]
          const hw = w / 2 - 1
          return `M${pt([q[0] + n[0] * hw, q[1] + n[1] * hw])}Q${pt([q[0] + d[0] * 4, q[1] + d[1] * 4])} ${pt([q[0] - n[0] * hw, q[1] - n[1] * hw])}`
        })
        .join('')
      marks = `<path d="${bands}" fill="none" stroke="${p.mark}" stroke-width="5"/>`
    }
    const tip = p.sock ? `<circle cx="186" cy="194" r="${w / 2}" fill="${p.sock}"/><path d="M184.5 186.5Q193 190 193 197.5" fill="none" stroke="${p.sock}" stroke-width="6"/>` : ''
    art = `<path d="${TAIL_D}" fill="none" ${ink(w + SW * 2)}/><path d="${TAIL_D}" fill="none" stroke="${p.fill}" stroke-width="${w}"/>${marks}${tip}`
  }
  return `<g class="bo-tail" style="transform-origin:150px 258px;transform-box:view-box">${art}</g>`
}

function legsSvg(c: Ctx): string {
  const p = c.paint
  const fill = p.sock ?? p.fill
  const toes = 'M94 292V286.5M104 292V286.5M136 292V286.5M146 292V286.5'
  const band =
    p.fur === 'striped'
      ? `<path d="M86 268Q99 272 112 268M128 268Q141 272 154 268" fill="none" stroke="${p.mark}" stroke-width="4.5"/>`
      : ''
  return `<g class="bo-legs"><path d="${LEG_L}${LEG_R}" fill="${fill}" ${ink()}/>${band}<path d="${toes}" fill="none" ${ink(2.4)}/></g>`
}

function bodySvg(c: Ctx): string {
  const p = c.paint
  let marks = ''
  if (p.chest) {
    marks +=
      p.fur === 'black'
        ? `<path d="M98 146Q120 156 142 146Q150 180 136 204Q120 222 104 204Q90 180 98 146Z" fill="${p.chest}"/>`
        : p.fur === 'striped'
          ? `<ellipse cx="120" cy="232" rx="23" ry="34" fill="${p.chest}"/>`
          : ''
  }
  if (p.fur === 'striped') {
    marks += stripes(
      [
        [[66, 190], [92, 196], 9],
        [[66, 214], [94, 218], 9],
        [[67, 238], [92, 240], 8],
        [[70, 260], [88, 262], 6],
        [[98, 146], [108, 160], 6],
      ],
      p.mark,
    )
  }
  const ruff =
    p.fur === 'fluffy'
      ? `<path d="${tufts(ellipsePoints(120, 170, 40, 26, 0, 13), (m) => (m[1] > 162 ? 9 : 3))}" fill="${p.chest}" ${ink()}/><path d="M104 176q5 4 6 12M120 180q4 5 3 12M136 176q-4 5-5 12" fill="none" stroke="${mix(p.chest ?? WHITE, INK, 0.2)}" stroke-width="2.2"/>`
      : ''
  return `<g class="bo-body"><path d="${c.bodyD}" fill="${p.fill}"/><g clip-path="url(#${c.id}-bc)">${p.fur === 'black' ? shadeOverlay(c.bodyD, BODY_SHADE_CUT, p) + marks : marks + shadeOverlay(c.bodyD, BODY_SHADE_CUT, p)}</g><path d="${c.bodyD}" fill="none" ${ink()}/>${ruff}</g>`
}

/* ------------------------------------------------------------------ outfit */

const COAT_D =
  'M101 146L120 196L139 146C151 148 160 156 164 170C170 196 175 230 177 262Q177 271 168 271L72 271Q63 271 63 262C65 230 70 196 76 170C80 156 89 148 101 146Z'

function coatSvg(c: Ctx): string {
  const cc = `${c.id}-cc`
  return `<g class="bo-coat"><clipPath id="${cc}"><path d="${COAT_D}"/></clipPath>
<path d="${COAT_D}" fill="#E4EBF4"/><g clip-path="url(#${cc})"><path d="${COAT_D}" fill="${WHITE}" transform="translate(-7 -9)"/></g><path d="${COAT_D}" fill="none" ${ink()}/>
<path d="M120 196V269" fill="none" ${ink(2.4)}/>
<path d="M101 146L120 196L108 194L94 166Q93 153 101 146ZM139 146L120 196L132 194L146 166Q147 153 139 146Z" fill="${WHITE}" ${ink(2.6)}/>
<g fill="${TEAL}" ${ink(2)}><circle cx="126" cy="216" r="3.3"/><circle cx="126" cy="240" r="3.3"/></g>
<path d="M149 222V204" fill="none" ${ink(8)}/><path d="M149 222V204" fill="none" stroke="${CHERRY}" stroke-width="3.6"/><path d="M149 203.5v-2" fill="none" ${ink(3)}/>
<path d="M137 214H160V230Q160 235 155 235H142Q137 235 137 230Z" fill="${WHITE}" ${ink(2.6)}/><path d="M137 219H160" fill="none" ${ink(2)}/>
<circle cx="99" cy="240" r="8.5" fill="${SUNNY}" ${ink(2.4)}/><path d="M99 235.5v9M94.5 240h9" fill="none" stroke="${CHERRY}" stroke-width="3.2" stroke-linecap="butt"/>
</g>`
}

function stethoscopeSvg(): string {
  const tubes = 'M101 150C91 170 94 190 104 200M139 150C149 170 146 184 138 192M138 192L131 199M138 192L145 199'
  return `<g class="bo-stethoscope"><path d="${tubes}" fill="none" ${ink(8.5)}/><path d="${tubes}" fill="none" stroke="${TEAL}" stroke-width="3.8"/>
<g ${ink(2.2)}><circle cx="131" cy="200.5" r="3" fill="${SILVER}"/><circle cx="145" cy="200.5" r="3" fill="${SILVER}"/></g>
<path d="M104 200V204" fill="none" ${ink(7)}/><circle cx="104" cy="211" r="9" fill="${SILVER}" ${ink(2.6)}/><circle cx="104" cy="211" r="4.2" fill="#A7B4C8" ${ink(1.8)}/><circle cx="100.5" cy="207.5" r="1.6" fill="${WHITE}"/></g>`
}

const STRAP_D = 'M142 150Q112 190 80 232'

function strapSvg(): string {
  return `<g class="bo-strap"><path d="${STRAP_D}" fill="none" ${ink(9)}/><path d="${STRAP_D}" fill="none" stroke="#E1A93A" stroke-width="4.5"/></g>`
}

function bagArt(sw: number): string {
  return `<path d="M44 230Q44 216 56 216Q68 216 68 230" fill="none" ${ink(sw + 4)}/><path d="M44 230Q44 216 56 216Q68 216 68 230" fill="none" stroke="#E1A93A" stroke-width="3.6"/>
<path d="M29 238Q29 229 38 229H74Q83 229 83 238L85 258Q85 266 77 266H35Q27 266 27 258Z" fill="${SUNNY}" ${ink(sw)}/>
<path d="M28.4 247Q56 252 83.8 247" fill="none" stroke="#E7B52C" stroke-width="3"/>
<rect x="46" y="237" width="20" height="19" rx="5" fill="${WHITE}" ${ink(sw * 0.75)}/><path d="M56 241V252M50.5 246.5H61.5" fill="none" stroke="${CHERRY}" stroke-width="4.2" stroke-linecap="butt"/>
<circle cx="80" cy="232" r="3.4" fill="${SILVER}" ${ink(sw * 0.65)}/>`
}

function bagSvg(): string {
  return `<g class="bo-bag">${bagArt(SW)}</g>`
}

/* ------------------------------------------------------------------ arms */

interface ArmSpec {
  side: 'l' | 'r'
  pts: Pt[]
  paw: 'back' | 'palm' | 'point' | 'cup'
  cls?: string
}

const SHOULDER_L: Pt = [85, 171]
const SHOULDER_R: Pt = [155, 171]
const ARM_W = 23
const PAW_R = 13.5

const DOWN_L: ArmSpec = { side: 'l', pts: [SHOULDER_L, [73, 198], [66, 222]], paw: 'back' }
const DOWN_R: ArmSpec = { side: 'r', pts: [SHOULDER_R, [167, 198], [174, 222]], paw: 'back' }
const UP_L: ArmSpec = { side: 'l', pts: [SHOULDER_L, [54, 184], [32, 128]], paw: 'palm', cls: 'bo-paw-wave bo-paw-wave-l' }
const UP_R: ArmSpec = { side: 'r', pts: [SHOULDER_R, [186, 184], [208, 128]], paw: 'palm', cls: 'bo-paw-wave' }

const ARMS: Record<CatPose, ArmSpec[]> = {
  stand: [DOWN_L, DOWN_R],
  wave: [DOWN_L, UP_R],
  cheer: [UP_L, UP_R],
  listen: [{ side: 'l', pts: [SHOULDER_L, [53, 180], [33, 108]], paw: 'cup', cls: 'bo-paw-listen' }, DOWN_R],
  point: [DOWN_L, { side: 'r', pts: [SHOULDER_R, [188, 186], [212, 164]], paw: 'point', cls: 'bo-paw-point' }],
}

function rot(v: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180
  return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)]
}

function along(pts: readonly Pt[], frac: number): { p: Pt; d: Pt } {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  let left = lens.reduce((s, v) => s + v, 0) * frac
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const a = pts[i]
      const b = pts[i + 1]
      const t = Math.min(1, left / lens[i])
      const d: Pt = [(b[0] - a[0]) / lens[i], (b[1] - a[1]) / lens[i]]
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d }
    }
    left -= lens[i]
  }
  return { p: pts[pts.length - 1], d: [0, 1] }
}

function armSvg(c: Ctx, spec: ArmSpec): string {
  const p = c.paint
  const coat = c.wear.has('coat')
  const pts = spec.pts
  const end = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const len = Math.hypot(end[0] - prev[0], end[1] - prev[1])
  const dir: Pt = [(end[0] - prev[0]) / len, (end[1] - prev[1]) / len]
  const at = (v: Pt, k: number): Pt => [end[0] + v[0] * k, end[1] + v[1] * k]
  const d = polyline(pts)
  const pawFill = p.sock ?? p.fill

  let s = `<path d="${d}" fill="none" ${ink(ARM_W + SW * 2)}/><circle cx="${r1(end[0])}" cy="${r1(end[1])}" r="${r1(PAW_R + SW)}" fill="${INK}"/>`
  let finger = ''
  if (spec.paw === 'point') {
    const f1 = at(dir, PAW_R * 0.4)
    const f2 = at(dir, PAW_R + 10)
    finger = `M${pt(f1)}L${pt(f2)}`
    s += `<path d="${finger}" fill="none" ${ink(10 + SW * 2)}/>`
  }
  s += `<path d="${d}" fill="none" stroke="${coat ? WHITE : p.limb}" stroke-width="${ARM_W}"/>`
  if (!coat && p.fur === 'striped') {
    const hw = ARM_W / 2 - 1
    const bands = [0.5, 0.72]
      .map((f) => {
        const { p: q, d: t } = along(pts, f)
        const n: Pt = [-t[1], t[0]]
        return `M${pt([q[0] + n[0] * hw, q[1] + n[1] * hw])}Q${pt([q[0] + t[0] * 4, q[1] + t[1] * 4])} ${pt([q[0] - n[0] * hw, q[1] - n[1] * hw])}`
      })
      .join('')
    s += `<path d="${bands}" fill="none" stroke="${p.mark}" stroke-width="5"/>`
  }
  s += `<circle cx="${r1(end[0])}" cy="${r1(end[1])}" r="${PAW_R}" fill="${pawFill}"/>`
  if (finger) s += `<path d="${finger}" fill="none" stroke="${pawFill}" stroke-width="10"/>`
  if (coat) {
    const wrist = at(dir, -PAW_R * 0.75)
    const cuff0 = at(dir, -PAW_R * 1.35)
    s += `<path d="M${pt(cuff0)}L${pt(wrist)}" fill="none" ${ink(ARM_W + 3 + SW * 2)} stroke-linecap="butt"/><path d="M${pt(cuff0)}L${pt(wrist)}" fill="none" stroke="${WHITE}" stroke-width="${ARM_W + 3}" stroke-linecap="butt"/>`
  }
  if (spec.paw === 'palm') {
    const pad = at(dir, -2.5)
    const beans = [-42, 0, 42].map((a) => at(rot(dir, a), 8.5))
    s += `<g fill="${PAD}"><ellipse cx="${r1(pad[0])}" cy="${r1(pad[1])}" rx="5.4" ry="4.4" transform="rotate(${r1((Math.atan2(dir[1], dir[0]) * 180) / Math.PI + 90)} ${pt(pad)})"/>${beans.map((b) => `<circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="2.5"/>`).join('')}</g>`
  } else {
    const toeAngles = spec.paw === 'point' ? [-38, 38] : [-22, 22]
    const lines = toeAngles
      .map((a) => {
        const v = rot(dir, a)
        return `M${pt(at(v, PAW_R + 0.5))}L${pt(at(v, PAW_R * 0.52))}`
      })
      .join('')
    s += `<path d="${lines}" fill="none" ${ink(2.4)}/>`
  }
  const origin = pts[0]
  const style = spec.cls ? ` style="transform-origin:${r1(origin[0])}px ${r1(origin[1])}px;transform-box:view-box"` : ''
  return `<g class="bo-arm bo-arm-${spec.side}${spec.cls ? ` ${spec.cls}` : ''}"${style}>${s}</g>`
}

/* ------------------------------------------------------------------ head */

const EAR_L = 'M62 86L47 30Q44 14 60 20L106 52Z'
const EAR_L_INNER = 'M68 76L58 36Q57 30 63 33L96 55Z'

function earsSvg(c: Ctx): string {
  const p = c.paint
  const mirror = (d: string) => `<g transform="matrix(-1 0 0 1 240 0)">${d}</g>`
  const tuftsIn =
    p.fur === 'fluffy'
      ? `<path d="M64 60q2-12 8-18M72 64q4-10 10-14M60 50q0-8 3-12" fill="none" stroke="${WHITE}" stroke-width="3"/><path d="M47 26q-4-10 2-16q0 8 6 10" fill="${p.fill}" ${ink(2.4)}/>`
      : ''
  const spot = p.fur === 'striped' ? `<g clip-path="url(#${c.id}-earclip)"><path d="${taper([36, 33], [70, 22], 8)}" fill="${p.mark}"/></g>` : ''
  const one = `<path d="${EAR_L}" fill="${p.fill}" ${ink()}/>${spot}<path d="${EAR_L_INNER}" fill="${p.inner}"/>${tuftsIn}`
  const clip = p.fur === 'striped' ? `<clipPath id="${c.id}-earclip"><path d="${EAR_L}"/></clipPath>` : ''
  return `${clip}<g class="bo-ear bo-ear-l">${one}</g><g class="bo-ear bo-ear-r">${mirror(one)}</g>`
}

function headMarks(c: Ctx): string {
  const p = c.paint
  if (p.fur === 'striped') {
    return (
      stripes(
        [
          [[103, 42], [107, 70], 8],
          [[46, 108], [70, 112], 7],
          [[48, 124], [68, 126], 6],
          [[62, 62], [80, 74], 6],
        ],
        p.mark,
      ) + stripes([[[120, 40], [120, 76], 10]], p.mark, false)
    )
  }
  if (p.fur === 'spotted') {
    const spots: [number, number, number][] = [
      [98, 60, 6.5],
      [146, 58, 7.5],
      [62, 92, 6.5],
      [184, 96, 5.5],
      [54, 130, 5.5],
      [190, 132, 7],
      [120, 72, 4],
      [146, 152, 4.5],
    ]
    return `<g fill="${p.mark}">${spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`
  }
  if (p.fur === 'checked') return muzzle(WHITE)
  if (p.fur === 'black') {
    const mask = smooth([
      [120, 60],
      [131, 70],
      [150, 80],
      [176, 92],
      [192, 122],
      [178, 152],
      [120, 162],
      [62, 152],
      [48, 122],
      [64, 92],
      [90, 80],
      [109, 70],
    ])
    return `<path d="${mask}" fill="${WHITE}"/>`
  }
  if (p.fur === 'fluffy') return muzzle(p.chest ?? WHITE)
  return ''
}

/** Two puffy whisker pads under the nose. */
function muzzle(color: string): string {
  return `<g fill="${color}"><circle cx="110" cy="129" r="11"/><circle cx="130" cy="129" r="11"/><ellipse cx="120" cy="121" rx="9" ry="7"/></g>`
}

function capArt(sw: number): string {
  return `<path d="M85 51C82 36 88 20 101 16H139C152 20 158 36 155 51Z" fill="${WHITE}" ${ink(sw)}/>
<path d="M101 17Q96 32 98 49" fill="none" stroke="#DCE4EF" stroke-width="3"/>
<path d="M82 50Q120 40 158 50L159 58Q120 48 81 58Z" fill="#E7EEF7" ${ink(sw)}/>
<path d="M115.5 21.5h9v7h7v9h-7v7h-9v-7h-7v-9h7Z" fill="${CHERRY}" ${ink(sw * 0.65)}/>`
}

function mirrorArt(sw: number, band = true): string {
  const strap = band ? `<path d="M50 78Q120 50 190 78" fill="none" ${ink(9 + sw)}/><path d="M50 78Q120 50 190 78" fill="none" stroke="#7F8CAB" stroke-width="7"/>` : ''
  return `${strap}<circle cx="94" cy="64" r="15" fill="${SILVER}" ${ink(sw)}/><circle cx="94" cy="64" r="10.5" fill="#F4F8FD" ${ink(sw * 0.55)}/>
<path d="M87 60Q89 56 93 55" fill="none" stroke="${WHITE}" stroke-width="2.6"/><circle cx="94" cy="64" r="2.4" fill="${INK}"/>`
}

function glassesArt(sw: number): string {
  return `<g fill="#E3F3FF" fill-opacity=".14" ${ink(sw)}><circle cx="91" cy="104" r="19.5"/><circle cx="149" cy="104" r="19.5"/></g>
<path d="M110.5 100Q120 94 129.5 100M71.5 101L55 96M168.5 101L185 96" fill="none" ${ink(sw)}/>
<path d="M79 97Q82 91 88 89M137 97Q140 91 146 89" fill="none" stroke="${WHITE}" stroke-width="2.6"/>`
}

function bowArt(sw: number): string {
  const dots = [
    [157, 32],
    [163, 42],
    [180, 30],
    [186, 40],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`)
    .join('')
  return `<g transform="rotate(18 172 37)"><path d="M172 38L166 52M172 38L180 51" fill="none" ${ink(6 + sw * 2)}/><path d="M172 38L166 52M172 38L180 51" fill="none" stroke="${CHERRY}" stroke-width="6"/>
<path d="M172 37C160 22 148 27 150 38C151 49 161 49 172 37ZM172 37C184 22 196 27 194 38C193 49 183 49 172 37Z" fill="${CHERRY}" ${ink(sw)}/>
<g fill="${WHITE}">${dots}</g><circle cx="172" cy="37" r="6" fill="${CHERRY}" ${ink(sw)}/><circle cx="170.5" cy="35.5" r="1.6" fill="${WHITE}"/></g>`
}

function faceSvg(c: Ctx, pose: CatPose): string {
  const look: Pt = pose === 'point' ? [3.5, 0] : pose === 'listen' ? [-3, -1] : [0, 0]
  const eye = (x: number) => {
    const ex = x + look[0]
    const ey = 104 + look[1]
    return `<ellipse cx="${r1(ex)}" cy="${r1(ey)}" rx="12" ry="14.5" fill="${INK}"/><circle cx="${r1(ex + 4.2)}" cy="${r1(ey - 5.5)}" r="4.8" fill="${WHITE}"/><circle cx="${r1(ex - 4.5)}" cy="${r1(ey + 6)}" r="2.1" fill="${WHITE}"/>`
  }
  const p = c.paint
  const mouth =
    pose === 'cheer'
      ? `<path d="M108.5 128Q120 131 131.5 128Q131 146 120 146Q109 146 108.5 128Z" fill="#D9486B" ${ink(2.6)}/><path d="M113 141Q120 136 127 141Q124 145.5 120 145.5Q116 145.5 113 141Z" fill="#FF9AB0"/>`
      : `<path d="M120 124.5V128.5M109 128Q114.5 135 120 128.5Q125.5 135 131 128" fill="none" ${ink(2.6)}/>`
  const whiskers = `<path d="M60 118L37 113M60 126L36 128M180 118L203 113M180 126L204 128" fill="none" stroke="${p.whisker}" stroke-width="2.2"/>`
  return `${whiskers}<g fill="${BLUSH}" opacity=".5"><ellipse cx="68" cy="128" rx="11.5" ry="7"/><ellipse cx="172" cy="128" rx="11.5" ry="7"/></g>
<g class="bo-eyes">${eye(91)}${eye(149)}</g>
<path d="M112.5 117.5Q120 113.5 127.5 117.5Q127 123.5 120 126Q113 123.5 112.5 117.5Z" fill="${p.nose}" ${ink(2.2)}/><circle cx="116.8" cy="117.8" r="1.3" fill="${WHITE}"/>
${mouth}`
}

function headSvg(c: Ctx, pose: CatPose, clipHead = true): string {
  const p = c.paint
  const w = c.wear
  const shade = shadeOverlay(c.headD, HEAD_SHADE_CUT, p)
  const inside = `${p.fur === 'black' ? shade + headMarks(c) : headMarks(c) + shade}${w.has('mirror') ? `<path d="M50 78Q120 50 190 78" fill="none" ${ink(9 + SW)}/><path d="M50 78Q120 50 190 78" fill="none" stroke="#7F8CAB" stroke-width="7"/>` : ''}`
  const headFill = p.fur === 'spotted' ? p.solid : p.fill
  return `${earsSvg(c)}<path d="${c.headD}" fill="${headFill}"/><g clip-path="url(#${c.id}-hc)">${clipHead ? inside : ''}</g><path d="${c.headD}" fill="none" ${ink()}/>
${faceSvg(c, pose)}
${w.has('cap') ? `<g class="bo-cap">${capArt(SW)}</g>` : ''}
${w.has('mirror') ? `<g class="bo-mirror">${mirrorArt(SW, false)}</g>` : ''}
${w.has('glasses') ? `<g class="bo-glasses">${glassesArt(3)}</g>` : ''}
${w.has('bow') ? `<g class="bo-bow">${bowArt(2.8)}</g>` : ''}`
}

function cupWaves(): string {
  return `<path d="M13 90Q6 104 11 118M6 82Q-2 104 5 124" fill="none" stroke="${TEAL}" stroke-width="3.2" opacity=".85"/>`
}

/* ------------------------------------------------------------------ public */

/** The full-body cat nurse, 240x300, feet on y=292. */
export function catSvg(look: CatLook, options: { pose?: CatPose; id?: string } = {}): string {
  const id = makeId(options.id)
  const pose = options.pose ?? 'stand'
  const c = context(look, id)
  const arms = ARMS[pose].map((spec) => armSvg(c, spec)).join('')
  const tilt = pose === 'listen' ? '<g transform="rotate(-9 120 152)">' : '<g>'
  return `<svg viewBox="0 0 240 300" aria-hidden="true" focusable="false" class="bo-cat bo-cat-${pose}" stroke-linejoin="round" stroke-linecap="round">${defs(c)}
${tailSvg(c)}${legsSvg(c)}${bodySvg(c)}
${c.wear.has('coat') ? coatSvg(c) : ''}${c.wear.has('bag') ? strapSvg() : ''}${c.wear.has('stethoscope') ? stethoscopeSvg() : ''}${c.wear.has('bag') ? bagSvg() : ''}
<g class="bo-cat-head" style="transform-origin:120px 152px;transform-box:view-box">${tilt}${headSvg(c, pose)}</g></g>
${arms}${pose === 'listen' ? cupWaves() : ''}
</svg>`
}

/** Head-and-shoulders avatar for the leaderboard, 120x120. */
export function catBadge(look: CatLook, options: { id?: string } = {}): string {
  const id = makeId(options.id)
  const c = context(look, id)
  const s = 0.56
  const tx = 60 - 120 * s
  const ty = 51 - 100 * s
  const place = `transform="translate(${r1(tx)} ${r1(ty)}) scale(${s})"`
  const shoulders = `${bodySvg(c)}${c.wear.has('coat') ? coatSvg(c) : ''}${c.wear.has('stethoscope') ? stethoscopeSvg() : ''}`
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" class="bo-cat-badge" stroke-linejoin="round" stroke-linecap="round">${defs(c)}
<clipPath id="${id}-ring"><circle cx="60" cy="66" r="50"/></clipPath>
<circle cx="60" cy="66" r="50" fill="${MINT}"/>
<g clip-path="url(#${id}-ring)"><g ${place}>${shoulders}</g></g>
<circle cx="60" cy="66" r="50" fill="none" stroke="${INK}" stroke-width="2.6"/>
<g class="bo-cat-head" ${place}>${headSvg(c, 'stand')}</g>
</svg>`
}

function icon(cls: string, body: string): string {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" class="bo-icon ${cls}" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`
}

/** A 64x64 wardrobe button picture for one item. */
export function wearIcon(wear: Wear, options: { id?: string } = {}): string {
  makeId(options.id)
  const fit = (k: number, cx: number, cy: number, art: string) =>
    `<g transform="translate(${r1(32 - cx * k)} ${r1(32 - cy * k)}) scale(${k})">${art}</g>`
  switch (wear) {
    case 'cap':
      return icon('bo-icon-cap', fit(0.76, 120, 37, capArt(3.4)))
    case 'glasses':
      return icon(
        'bo-icon-glasses',
        `<g fill="#E3F3FF" ${ink(3.4)}><circle cx="18" cy="34" r="12"/><circle cx="46" cy="34" r="12"/></g><path d="M29 31Q32 27 35 31M6.5 31L2.5 25M57.5 31L61.5 25" fill="none" ${ink(3.4)}/><path d="M11 31Q13 26.5 17 25.5M39 31Q41 26.5 45 25.5" fill="none" stroke="${WHITE}" stroke-width="2.6"/>`,
      )
    case 'bow':
      return icon('bo-icon-bow', `<g transform="rotate(-18 32 32)">${fit(1.12, 172, 39, bowArt(2.7))}</g>`)
    case 'mirror':
      return icon(
        'bo-icon-mirror',
        `<ellipse cx="32" cy="45" rx="25" ry="10" fill="none" ${ink(9.5)}/><ellipse cx="32" cy="45" rx="25" ry="10" fill="none" stroke="#7F8CAB" stroke-width="5"/><path d="M32 40V52" fill="none" ${ink(6)}/>${fit(1.3, 94, 64, mirrorArt(2.4, false)).replace('translate(', 'translate(0 -8) translate(')}`,
      )
    case 'bag':
      return icon('bo-icon-bag', fit(0.88, 56, 241, bagArt(3.4)))
    case 'stethoscope':
      return icon(
        'bo-icon-stethoscope',
        `<path d="M18 8V20Q18 34 30 34Q42 34 42 20V8M30 34V44Q30 56 42 56Q50 56 50 48V40" fill="none" ${ink(9)}/><path d="M18 8V20Q18 34 30 34Q42 34 42 20V8M30 34V44Q30 56 42 56Q50 56 50 48V40" fill="none" stroke="${TEAL}" stroke-width="4"/>
<g fill="${SILVER}" ${ink(2.4)}><circle cx="18" cy="8" r="3.6"/><circle cx="42" cy="8" r="3.6"/></g><circle cx="50" cy="33" r="9.5" fill="${SILVER}" ${ink(3)}/><circle cx="50" cy="33" r="4.4" fill="#A7B4C8" ${ink(2)}/><circle cx="46.5" cy="29.5" r="1.7" fill="${WHITE}"/>`,
      )
    case 'coat':
      return icon(
        'bo-icon-coat',
        `<path d="M24 8L32 24L40 8L52 13L60 38L52 41L50 32V58H14V32L12 41L4 38L12 13Z" fill="${WHITE}" ${ink(3)}/>
<path d="M24 8L32 24L28 26L21 14ZM40 8L32 24L36 26L43 14Z" fill="#E7EEF7" ${ink(2.2)}/><path d="M32 24V58" fill="none" ${ink(2.2)}/>
<path d="M39 36H49V43Q49 45 47 45H41Q39 45 39 43Z" fill="${WHITE}" ${ink(2.2)}/><path d="M45 36V30" fill="none" ${ink(5)}/><path d="M45 36V30.5" fill="none" stroke="${CHERRY}" stroke-width="2.2"/>
<circle cx="22" cy="38" r="5" fill="${SUNNY}" ${ink(2)}/><path d="M22 35.3V40.7M19.3 38H24.7" fill="none" stroke="${CHERRY}" stroke-width="2" stroke-linecap="butt"/>
<g fill="${TEAL}"><circle cx="35.5" cy="36" r="1.8"/><circle cx="35.5" cy="46" r="1.8"/></g>`,
      )
  }
}

/** A 64x64 swatch of a fur pattern in the chosen tint. */
export function furIcon(fur: Fur, tint: Tint, options: { id?: string } = {}): string {
  const id = makeId(options.id)
  const p = paintFor(fur, tint, id)
  const box = 'M18 5H46Q59 5 59 18V46Q59 59 46 59H18Q5 59 5 46V18Q5 5 18 5Z'
  const clip = `<clipPath id="${id}-sw"><path d="${box}"/></clipPath>`
  const shade = `<path d="${box}M18 1H46Q55 1 55 14V42Q55 55 42 55H14Q1 55 1 42V14Q1 1 18 1Z" fill="${p.shade}" opacity="${p.shadeOpacity}" fill-rule="evenodd"/>`
  let inner = ''
  let outline = box
  if (fur === 'white') {
    inner = `<path d="M26 26L38 38M38 26L26 38" fill="none" stroke="${INK}" stroke-width="3.4" opacity=".75"/>`
  } else if (fur === 'striped') {
    inner = stripesIcon(p.mark)
  } else if (fur === 'fluffy') {
    outline = tufts(ellipsePoints(32, 32, 22, 22, 0, 14), () => 6)
    inner = `<path d="M22 24q3 6 1 12M32 20q4 7 2 14M42 26q3 7 0 13M27 40q3 5 2 9M38 40q3 5 1 10" fill="none" stroke="${mix(p.fill, INK, 0.28)}" stroke-width="2.2"/>`
  } else if (fur === 'spotted') {
    inner = `<g fill="${p.mark}"><circle cx="18" cy="18" r="6"/><circle cx="40" cy="15" r="4"/><circle cx="31" cy="31" r="6.5"/><circle cx="50" cy="32" r="5"/><circle cx="15" cy="40" r="4.5"/><circle cx="40" cy="48" r="6"/><circle cx="22" cy="54" r="3.5"/><circle cx="54" cy="52" r="3"/></g>`
  } else if (fur === 'black') {
    inner = `<path d="M20 45Q14 30 20 18Q24 22 26 28Q32 26 38 28Q40 22 44 18Q50 30 44 45Q32 52 20 45Z" fill="${WHITE}"/><g fill="${INK}"><ellipse cx="26.5" cy="36" rx="2.6" ry="3.2"/><ellipse cx="37.5" cy="36" rx="2.6" ry="3.2"/></g><path d="M30 41.5Q32 40.5 34 41.5Q33 43.5 32 43.5Q31 43.5 30 41.5Z" fill="${p.nose}"/>`
  }
  const defsBlock = `<defs>${clip}${patternDefs(id, fur, p.mark, 0.62)}</defs>`
  const body =
    fur === 'fluffy'
      ? `<path d="${outline}" fill="${p.fill}" ${ink(3)}/>${inner}`
      : `<path d="${box}" fill="${p.fill}"/><g clip-path="url(#${id}-sw)">${inner}${shade}</g><path d="${box}" fill="none" ${ink(3)}/>`
  return icon(`bo-fur-icon bo-fur-${fur}`, `${defsBlock}${body}`)
}

function stripesIcon(mark: string): string {
  const list: [Pt, Pt, number][] = [
    [[2, 16], [30, 20], 8],
    [[2, 34], [28, 36], 8],
    [[2, 52], [24, 50], 7],
    [[62, 25], [36, 28], 8],
    [[62, 44], [38, 45], 8],
    [[26, 2], [30, 12], 6],
  ]
  return stripes(list, mark, false)
}
