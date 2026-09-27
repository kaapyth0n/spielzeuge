/**
 * Hospital props and UI icons for «Больница кошечки» in the "sticker clinic" style:
 * flat fills, a blueberry ink outline, one soft shade per mass, white eye highlights.
 * Every function returns SVG markup; every <defs> id carries a caller prefix (options.id).
 */

const INK = '#22305A'
const WHITE = '#FFFFFF'
const MINT = '#D8F1EA'
const TEAL = '#1F8A7A'
const CHERRY = '#F0445A'
const SUNNY = '#FFD447'
const PEACH = '#F6C9A0'
const LILAC = '#B9A7F2'
const BLUSH = '#FF8FA3'
const STEEL = '#DCE5EE'
const GLASS = '#A9DDF7'
const WARM = '#FFE39A'

/** The shared sticker-clinic palette, for other modules and CSS-in-JS helpers. */
export const PROP_COLORS = {
  ink: INK,
  white: WHITE,
  mint: MINT,
  teal: TEAL,
  cherry: CHERRY,
  sunny: SUNNY,
  peach: PEACH,
  lilac: LILAC,
  blush: BLUSH,
} as const

/** Soft tints for wards 1-4 (ticket number disc, door signs); ink text stays readable on all of them. */
export const WARD_COLORS: Record<number, string> = {
  1: '#FFB3BF',
  2: '#FFE27A',
  3: '#9FE3CF',
  4: '#CDBFFA',
}

let seq = 0
function uid(id?: string): string {
  if (id) return id
  seq += 1
  return `bo-prop-${seq}`
}

const r1 = (v: number): number => Math.round(v * 10) / 10

function root(w: number, h: number, cls: string, body: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false" class="${cls}">${body}</svg>`
}

/** Opens a group that strokes everything in ink with round caps and joins. */
function inked(width: number, extra = ''): string {
  return `<g stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}>`
}

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5, turn = -90): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner
    const a = ((turn + (i * 180) / points) * Math.PI) / 180
    pts.push(`${r1(cx + rad * Math.cos(a))} ${r1(cy + rad * Math.sin(a))}`)
  }
  return `M${pts.join('L')}Z`
}

/** A plump heart centred on (cx, cy); s is its half width. */
function heartPath(cx: number, cy: number, s: number): string {
  const k = s / 10
  const p = (x: number, y: number) => `${r1(cx + x * k)} ${r1(cy + y * k)}`
  return `M${p(0, 9)}C${p(-4, 6)} ${p(-10, 2)} ${p(-10, -3)}C${p(-10, -7.5)} ${p(-6.8, -9.6)} ${p(-4.6, -9.6)}C${p(-2.4, -9.6)} ${p(-0.8, -8.2)} ${p(0, -6.2)}C${p(0.8, -8.2)} ${p(2.4, -9.6)} ${p(4.6, -9.6)}C${p(6.8, -9.6)} ${p(10, -7.5)} ${p(10, -3)}C${p(10, 2)} ${p(4, 6)} ${p(0, 9)}Z`
}

/** A plus-shaped medical cross centred on (cx, cy). */
function crossPath(cx: number, cy: number, len: number, thick: number): string {
  const a = len / 2
  const b = thick / 2
  const x = (v: number) => r1(cx + v)
  const y = (v: number) => r1(cy + v)
  return `M${x(-b)} ${y(-a)}H${x(b)}V${y(-b)}H${x(a)}V${y(b)}H${x(b)}V${y(a)}H${x(-b)}V${y(b)}H${x(-a)}V${y(-b)}H${x(-b)}Z`
}

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
}

/** Outlined round tubes (bed frames, legs, poles): all ink first, then colour, so joints merge. */
function tubes(ds: string[], width: number, color: string, outline: number): string {
  const ink = ds.map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + outline * 2}" stroke-linecap="round" stroke-linejoin="round"/>`)
  const fill = ds.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`)
  return ink.join('') + fill.join('')
}

/** A white badge with a cherry cross. */
function crossBadge(cx: number, cy: number, r: number, sw: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" stroke="${INK}" stroke-width="${sw}"/><path d="${crossPath(cx, cy, r * 1.25, r * 0.46)}" fill="${CHERRY}" stroke="${INK}" stroke-width="${r1(sw * 0.7)}" stroke-linejoin="round"/>`
}

/** The clinic's brand badge: a white cat head with a cherry cross. */
function catBadge(cx: number, cy: number, r: number, sw: number): string {
  const ear = (m: number) => {
    const x = (v: number) => r1(cx + m * v * r)
    const y = (v: number) => r1(cy + v * r)
    return `<path d="M${x(0.98)} ${y(-0.2)}L${x(0.84)} ${y(-1.3)}L${x(0.2)} ${y(-0.94)}Z" fill="${WHITE}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M${x(0.8)} ${y(-0.5)}L${x(0.75)} ${y(-1.06)}L${x(0.44)} ${y(-0.86)}Z" fill="${BLUSH}"/>`
  }
  return `${ear(-1)}${ear(1)}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" stroke="${INK}" stroke-width="${sw}"/><path d="${crossPath(cx, cy + r * 0.06, r * 1.2, r * 0.44)}" fill="${CHERRY}" stroke="${INK}" stroke-width="${r1(sw * 0.7)}" stroke-linejoin="round"/>`
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: string, b: string, t: number): string {
  const x = hex(a)
  const y = hex(b)
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/* ------------------------------------------------------------------ icons */

export type IconName =
  | 'back'
  | 'home'
  | 'sound'
  | 'mute'
  | 'mic'
  | 'plus'
  | 'shirt'
  | 'bulb'
  | 'trophy'
  | 'camera'
  | 'ticket'
  | 'check'
  | 'x'
  | 'star'
  | 'heart'
  | 'paw'
  | 'bed'
  | 'play'
  | 'replay'
  | 'pencil'
  | 'trash'
  | 'users'
  | 'lock'
  | 'arrowDown'
  | 'bell'
  | 'helper'
  | 'ear'
  | 'palette'
  | 'swipe'

const SOLID = 'fill="currentColor"'

const ICONS: Record<IconName, string> = {
  back: '<path d="M10 5L3.5 12L10 19M4.5 12H20.5"/>',
  home: '<path d="M3 11.5L12 3.8L21 11.5M5.8 9.4V20.2H18.2V9.4"/><path d="M10 20.2V15.2Q10 13.8 12 13.8Q14 13.8 14 15.2V20.2"/>',
  sound: `<path d="M3.5 9.3H7L11.8 5.2V18.8L7 14.7H3.5Z" ${SOLID}/><path d="M15.2 9.2Q17 12 15.2 14.8M18.2 6.4Q22.2 12 18.2 17.6"/>`,
  mute: `<path d="M3.5 9.3H7L11.8 5.2V18.8L7 14.7H3.5Z" ${SOLID}/><path d="M15.5 9.5L20.5 14.5M20.5 9.5L15.5 14.5"/>`,
  mic: '<rect x="8.8" y="2.8" width="6.4" height="11.4" rx="3.2"/><path d="M5.4 11.2Q5.4 17.6 12 17.6Q18.6 17.6 18.6 11.2M12 17.6V21.2M8.4 21.2H15.6"/>',
  plus: `<path d="${crossPath(12, 12, 17, 6.2)}"/>`,
  shirt: '<path d="M8.6 3.8L3.2 6.8L5.2 11.2L7.4 10.2V20.4H16.6V10.2L18.8 11.2L20.8 6.8L15.4 3.8Q12 7.4 8.6 3.8Z"/>',
  bulb: '<path d="M9.2 17.4C9.2 14.6 5.8 13.4 5.8 9.3A6.2 6.2 0 0 1 18.2 9.3C18.2 13.4 14.8 14.6 14.8 17.4ZM9.6 20.8H14.4"/><path d="M10.6 10.4L12 12L13.4 10.4" stroke-width="1.6"/>',
  trophy: '<path d="M7 3.8H17V9A5 5 0 0 1 7 9Z"/><path d="M7 5.6H4.2Q3.8 10.4 7.6 11.2M17 5.6H19.8Q20.2 10.4 16.4 11.2M12 14V17.4M8 20.6H16L15.2 17.4H8.8Z"/>',
  camera: '<rect x="2.8" y="7" width="18.4" height="13" rx="3.2"/><path d="M8 7L9.6 4.2H14.4L16 7"/><circle cx="12" cy="13.5" r="3.6"/>',
  ticket: '<path d="M3 6.4H21V10A2 2 0 0 0 21 14V17.6H3V14A2 2 0 0 0 3 10Z"/><path d="M9.4 9V9.2M9.4 11.9V12.1M9.4 14.8V15" stroke-width="2.4"/>',
  check: '<path d="M4.5 12.8L9.6 17.8L19.6 6.6"/>',
  x: '<path d="M6 6L18 18M18 6L6 18"/>',
  star: `<path d="${starPath(12, 12.9, 9.8, 4.6)}"/>`,
  heart: `<path d="${heartPath(12, 12.6, 9)}"/>`,
  paw: `<g stroke="none" ${SOLID}><path d="M12 12.4C8.8 12.4 6.2 15.6 6.2 17.9C6.2 19.8 7.8 20.6 9.4 20.1C10.5 19.8 11.2 19.4 12 19.4C12.8 19.4 13.5 19.8 14.6 20.1C16.2 20.6 17.8 19.8 17.8 17.9C17.8 15.6 15.2 12.4 12 12.4Z"/><ellipse cx="4.8" cy="11.2" rx="2" ry="2.5" transform="rotate(-24 4.8 11.2)"/><ellipse cx="9" cy="6.6" rx="2.1" ry="2.7" transform="rotate(-8 9 6.6)"/><ellipse cx="15" cy="6.6" rx="2.1" ry="2.7" transform="rotate(8 15 6.6)"/><ellipse cx="19.2" cy="11.2" rx="2" ry="2.5" transform="rotate(24 19.2 11.2)"/></g>`,
  bed: '<path d="M3 5.2V19.4M3 15.6H21V19.4M3 12.6H21V15.6"/><path d="M5.8 12.6V11.2Q5.8 9.2 7.8 9.2H9.4Q11.4 9.2 11.4 11.2V12.6"/><path d="M13.6 12.6Q16.4 9.8 21 10.8V12.6"/>',
  play: `<path d="M8 5.2V18.8L18.8 12Z" ${SOLID}/>`,
  replay: '<path d="M5.2 13A7 7 0 1 0 7.2 7.2"/><path d="M7.6 2.8L7.2 7.2L11.6 7.8"/>',
  pencil: '<path d="M4 20L4.8 15.8L15.4 5.2A2.3 2.3 0 0 1 18.8 8.6L8.2 19.2Z"/><path d="M13.4 7.2L16.8 10.6M4.8 15.8L8.2 19.2"/>',
  trash: '<path d="M4 6.8H20M9.4 6.8V4.2H14.6V6.8M6.2 6.8L7.2 20.2H16.8L17.8 6.8M10 10.6V16.4M14 10.6V16.4"/>',
  users: '<circle cx="9" cy="8.2" r="3.4"/><path d="M2.8 20C2.8 15.8 5.6 13.6 9 13.6S15.2 15.8 15.2 20"/><path d="M15.4 4.9A3.3 3.3 0 0 1 15.4 11.5M17.6 13.9C19.6 14.6 21.2 16.6 21.2 20"/>',
  lock: '<rect x="4.6" y="10.4" width="14.8" height="10.4" rx="2.6"/><path d="M7.8 10.4V7.8A4.2 4.2 0 0 1 16.2 7.8V10.4M12 14.4V16.8"/>',
  arrowDown: '<path d="M12 3.8V19.6M5.4 13L12 19.6L18.6 13"/>',
  bell: '<path d="M4.4 17A7.6 7.6 0 0 1 19.6 17Z"/><path d="M2.8 20.2H21.2M12 9.4V6.8M9.8 5.8H14.2"/>',
  helper: '<circle cx="8.6" cy="6.8" r="3.3"/><path d="M2.6 20.4C2.6 15.6 5.2 12.8 8.6 12.8C10.6 12.8 12.3 13.7 13.4 15.4"/><path d="M13.6 17.8L16.4 20.6L21.6 13.8"/>',
  ear: '<path d="M7.2 9.6A5.6 5.6 0 0 1 18.4 9.6C18.4 13.4 15.4 14 14.9 17.2C14.5 19.8 12.6 21.2 10.4 20.6"/><path d="M10.4 10A2.6 2.6 0 0 1 15.6 10C15.6 11.8 13.6 12 13.2 13.8"/><path d="M3.8 7.6Q2.4 11 3.8 14.4"/>',
  palette: `<path d="M12 3.4C7.1 3.4 3.4 7.2 3.4 11.9C3.4 16.6 7.2 20.6 11.8 20.6C13.4 20.6 13.9 19.6 13.5 18.6C13 17.3 13.6 15.9 15.2 15.9H17.1C19.1 15.9 20.6 14.4 20.6 12C20.6 7.2 16.8 3.4 12 3.4Z"/><g stroke="none" ${SOLID}><circle cx="7.8" cy="11.2" r="1.5"/><circle cx="10.2" cy="7.4" r="1.5"/><circle cx="14.8" cy="7.4" r="1.5"/><circle cx="17.2" cy="11" r="1.5"/></g>`,
  swipe: '<path d="M9.6 16.2V5.4A1.5 1.5 0 0 1 12.6 5.4V12.2M12.6 11.8A1.45 1.45 0 0 1 15.5 11.8V12.8M15.5 12.6A1.4 1.4 0 0 1 18.3 12.6V16.4Q18.3 21 14 21H12.4Q10.2 21 8.8 19.4L6 16.4Q5.2 15.2 6.2 14.5Q7.2 13.9 8.2 14.8L9.6 16.2"/><path d="M19.4 2.8V9M17.2 6.8L19.4 9L21.6 6.8"/>',
}

/** A 24x24 line icon in currentColor. */
export function icon(name: IconName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="bo-icon" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
}

/* ----------------------------------------------------------------- camera */

/** A vintage box camera with a flash dish on a wooden tripod (viewBox 200x300). */
export function cameraSvg(options: { flash?: boolean; id?: string } = {}): string {
  const id = uid(options.id)
  const wood = '#EBA863'
  const woodDark = '#C98545'
  const legs = `
    ${tubes(['M100 206L100 280'], 7, woodDark, 3)}
    ${tubes(['M88 204L42 284', 'M112 204L158 284'], 10, wood, 3)}
    <g fill="${INK}"><circle cx="100" cy="283" r="5.5"/><circle cx="41" cy="287" r="7"/><circle cx="159" cy="287" r="7"/></g>
    ${inked(3.2)}
      <rect x="74" y="192" width="52" height="20" rx="7" fill="${woodDark}"/>
    </g>`
  const flash = `
    <g class="bo-flash-bulb">
      ${tubes(['M156 98L156 74'], 6, STEEL, 3)}
      ${inked(3.2)}
        <circle cx="156" cy="54" r="23" fill="${STEEL}"/>
        <circle cx="156" cy="54" r="15" fill="${WHITE}" stroke-width="2.4"/>
        <circle cx="156" cy="54" r="8" fill="#FFF3B8" stroke-width="2.4"/>
      </g>
      <path d="M140 42Q146 34 155 33" stroke="${WHITE}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="153" cy="51" r="2.2" fill="${WHITE}"/>
    </g>`
  const burst = options.flash
    ? `<g class="bo-flash">
        <path d="${starPath(156, 54, 42, 21, 12)}" fill="#FFF19A" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="${starPath(156, 54, 29, 15, 12, -75)}" fill="${WHITE}"/>
        <circle cx="156" cy="54" r="11" fill="${WHITE}"/>
        <path d="${starPath(104, 26, 9, 3, 4)}" fill="${SUNNY}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="${starPath(188, 108, 7, 2.4, 4)}" fill="${SUNNY}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      </g>`
    : ''
  const body = `
    <g class="bo-camera-body">
      ${flash}
      ${inked(3.4)}
        <rect x="168" y="126" width="14" height="30" rx="5" fill="${WHITE}"/>
        <rect x="40" y="76" width="42" height="24" rx="7" fill="${WHITE}"/>
        <rect x="48" y="82" width="26" height="12" rx="4.5" fill="${GLASS}" stroke-width="2.4"/>
        <rect x="112" y="82" width="20" height="16" rx="5" fill="${SUNNY}"/>
        <rect x="26" y="94" width="148" height="106" rx="22" fill="${CHERRY}"/>
        <path d="M26 118V116Q26 94 48 94H152Q174 94 174 116V118Z" fill="${WHITE}"/>
      </g>
      <defs><pattern id="${id}-leather" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${INK}" opacity=".16"/><circle cx="5.5" cy="5.5" r="1.1" fill="${INK}" opacity=".16"/></pattern></defs>
      <path d="M26 118H174V178Q174 200 152 200H48Q26 200 26 178Z" fill="url(#${id}-leather)"/>
      <path d="M28 176H172V178Q172 198 152 198H48Q28 198 28 178Z" fill="${INK}" opacity=".13"/>
      <rect x="26" y="94" width="148" height="106" rx="22" fill="none" stroke="${INK}" stroke-width="3.4"/>
      <path d="M52 81Q58 79 63 83" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" fill="none"/>
      ${crossBadge(44, 140, 10, 2.8)}
      ${inked(3.4)}
        <circle cx="106" cy="150" r="44" fill="${WHITE}"/>
        <circle cx="106" cy="150" r="39" fill="${SUNNY}" stroke-width="2.4"/>
        <circle cx="106" cy="150" r="33" fill="#34477A"/>
        <circle cx="106" cy="150" r="24" fill="#7DB5EA" stroke-width="2.6"/>
      </g>
      <circle cx="106" cy="150" r="11" fill="#39599A"/>
      <g fill="${INK}"><circle cx="106" cy="108.6" r="1.8"/><circle cx="147.4" cy="150" r="1.8"/><circle cx="106" cy="191.4" r="1.8"/><circle cx="64.6" cy="150" r="1.8"/></g>
      <ellipse cx="95" cy="139" rx="8.5" ry="5" fill="${WHITE}" transform="rotate(-38 95 139)"/>
      <circle cx="117" cy="161" r="3.6" fill="${WHITE}"/>
      <circle cx="110" cy="144" r="2" fill="${WHITE}" opacity=".8"/>
    </g>`
  return root(200, 300, 'bo-camera', `${legs}${body}${burst}`)
}

/* ---------------------------------------------------------- reception window */

/** The transparent opening inside windowFrameSvg, in its viewBox units. */
export const WINDOW_OPENING: { x: number; y: number; w: number; h: number } = { x: 46, y: 72, w: 268, h: 174 }

/** The reception window frame, front layer (viewBox 360x300); the opening is see-through. */
export function windowFrameSvg(options: { id?: string } = {}): string {
  const id = uid(options.id)
  const o = WINDOW_OPENING
  const hole = `M${o.x} ${o.y + o.h}V${o.y + 22}Q${o.x} ${o.y} ${o.x + 22} ${o.y}H${o.x + o.w - 22}Q${o.x + o.w} ${o.y} ${o.x + o.w} ${o.y + 22}V${o.y + o.h}Z`
  const outer = rrect(14, 42, 332, 222, 36)
  const trim = rrect(30, 57, 300, 205, 28)
  // Striped awning: 12 scallops along the bottom, stripes fanning out from the rod.
  const n = 12
  let scallops = ''
  let stripes = ''
  for (let i = 0; i < n; i++) {
    const x0 = r1(352 - (344 * i) / n)
    const x1 = r1(352 - (344 * (i + 1)) / n)
    scallops += `Q${r1((x0 + x1) / 2)} 80 ${x1} 64`
    const t0 = r1(26 + (308 * i) / n)
    const t1 = r1(26 + (308 * (i + 1)) / n)
    const b0 = r1(8 + (344 * i) / n)
    const b1 = r1(8 + (344 * (i + 1)) / n)
    if (i % 2 === 0) stripes += `M${t0} 30H${t1}L${b1} 80H${b0}Z`
  }
  const awning = `M26 30H334L352 64${scallops}Z`
  const screws = [
    [22, 118],
    [22, 214],
    [338, 118],
    [338, 214],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${MINT}" stroke="${INK}" stroke-width="2"/>`)
    .join('')
  const counterHearts = [64, 120, 240, 296]
    .map((x) => `<path d="${heartPath(x, 281, 5.2)}" fill="${WHITE}" opacity=".85"/>`)
    .join('')
  return root(
    360,
    300,
    'bo-window-frame',
    `<defs><clipPath id="${id}-awning"><path d="${awning}"/></clipPath></defs>
    ${inked(3.5)}
      <path d="${outer}${hole}" fill="${TEAL}" fill-rule="evenodd"/>
      <path d="${trim}${hole}" fill="${WHITE}" fill-rule="evenodd"/>
    </g>
    ${screws}
    <path d="${awning}" fill="${WHITE}"/>
    <g clip-path="url(#${id}-awning)">
      <path d="${stripes}" fill="${CHERRY}"/>
      <path d="M0 30H360V38H0Z" fill="${INK}" opacity=".12"/>
    </g>
    <path d="${awning}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    ${tubes(['M20 29H340'], 7, TEAL, 3.2)}
    ${inked(3.5)}
      <path d="M22 264H338V284Q338 296 326 296H34Q22 296 22 284Z" fill="${PEACH}"/>
    </g>
    <path d="M24 286H336Q334 294 326 294H34Q26 294 24 286Z" fill="${INK}" opacity=".12"/>
    ${counterHearts}
    ${inked(3.5)}
      <rect x="4" y="244" width="352" height="22" rx="10" fill="${WHITE}"/>
    </g>
    <path d="M16 251H120" stroke="${MINT}" stroke-width="3.4" stroke-linecap="round"/>
    ${catBadge(180, 46, 24, 3.4)}`,
  )
}

/** The roller shutter that slides down over the opening (viewBox = the opening's size). */
export function shutterSvg(options: { id?: string } = {}): string {
  uid(options.id)
  const w = WINDOW_OPENING.w
  const h = WINDOW_OPENING.h
  const bar = 26
  const n = 7
  const sh = (h - bar) / n
  let slats = ''
  for (let i = 0; i < n; i++) {
    const y = r1(i * sh)
    slats += `<rect x="0" y="${y}" width="${w}" height="${r1(sh)}" fill="${i % 2 ? '#C6EDE3' : '#B4E4D8'}"/>`
    slats += `<rect x="0" y="${r1(y + sh - 5)}" width="${w}" height="5" fill="${INK}" opacity=".1"/>`
    slats += `<path d="M6 ${r1(y + 4)}H${w - 6}" stroke="${WHITE}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`
    if (i > 0) slats += `<path d="M0 ${y}H${w}" stroke="${INK}" stroke-width="2.2"/>`
  }
  const cx = w / 2
  const by = h - bar
  return root(
    w,
    h,
    'bo-shutter',
    `${slats}
    ${inked(2.8)}
      <rect x="0" y="${by}" width="${w}" height="${bar}" fill="${TEAL}"/>
      <path d="M${cx - 26} ${h - 7}V${h - 13}Q${cx - 26} ${h - 18} ${cx - 21} ${h - 18}H${cx + 21}Q${cx + 26} ${h - 18} ${cx + 26} ${h - 13}V${h - 7}" fill="none" stroke="${INK}" stroke-width="8.6"/>
      <path d="M${cx - 26} ${h - 7}V${h - 13}Q${cx - 26} ${h - 18} ${cx - 21} ${h - 18}H${cx + 21}Q${cx + 26} ${h - 18} ${cx + 26} ${h - 13}V${h - 7}" fill="none" stroke="${WHITE}" stroke-width="3.8"/>
    </g>
    <path d="M8 ${by + 5}H${cx - 36}M${cx + 36} ${by + 5}H${w - 8}" stroke="#5CC2AE" stroke-width="2.6" stroke-linecap="round"/>
    ${catBadge(cx, r1((h - bar) / 2 + 6), 21, 3)}
    <rect x="1.4" y="1.4" width="${w - 2.8}" height="${h - 2.8}" fill="none" stroke="${INK}" stroke-width="2.8"/>`,
  )
}

/* ----------------------------------------------------------------- ticket */

/** A paper queue ticket (талончик) showing the big ward number n (viewBox 140x90). */
export function ticketSvg(n: number, options: { id?: string } = {}): string {
  const id = uid(options.id)
  const teeth = 12
  const top = 8
  const bottom = 82
  let zig = ''
  for (let i = 1; i <= teeth * 2; i++) {
    const y = r1(bottom - ((bottom - top) * i) / (teeth * 2))
    zig += `L${i % 2 ? 6 : 12} ${y}`
  }
  const shape = `M12 ${top}H37A7 7 0 0 0 51 ${top}H126Q134 ${top} 134 16V74Q134 ${bottom} 126 ${bottom}H51A7 7 0 0 0 37 ${bottom}H12${zig}Z`
  const tint = WARD_COLORS[n] ?? SUNNY
  return root(
    140,
    90,
    'bo-ticket',
    `<defs><clipPath id="${id}-paper"><path d="${shape}"/></clipPath></defs>
    <path d="${shape}" fill="#FFFBEE"/>
    <g clip-path="url(#${id}-paper)">
      <rect x="0" y="0" width="44" height="90" fill="#FFF1CC"/>
      <rect x="0" y="72" width="140" height="18" fill="${INK}" opacity=".08"/>
    </g>
    <path d="${shape}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M44 20V70" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 6.2" opacity=".55"/>
    <path d="${crossPath(26, 45, 20, 7.6)}" fill="${CHERRY}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="90" cy="45" r="29" fill="${tint}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M70 32Q76 22 88 19" stroke="${WHITE}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
    <text x="90" y="46" text-anchor="middle" dominant-baseline="central" font-family="Balsamiq Sans, Andika, sans-serif" font-weight="700" font-size="46" fill="${INK}">${n}</text>
    <path d="${starPath(125, 20, 5.4, 2.4)}" fill="${SUNNY}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="${heartPath(125, 70, 5)}" fill="${BLUSH}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
  )
}

/* -------------------------------------------------------------------- bed */

export const BED_VIEW: { w: number; h: number } = { w: 400, h: 260 }

/** Where a 240x240 patient portrait goes (scaled to size x size) so its head rests on the pillow. */
export const BED_HEAD: { x: number; y: number; size: number } = { x: 115, y: 22, size: 170 }

const PILLOW = 'M82 84Q140 72 200 76Q260 72 318 84Q332 128 318 172Q260 182 200 179Q140 182 82 172Q68 128 82 84Z'

/**
 * A hospital bed seen from its foot, as two layers with the patient portrait between them.
 * back = headboard, pillow; front = blanket (tucked up to ~73% of the portrait), footboard, wheels.
 */
export function bedSvg(options: { id?: string; blanket?: string } = {}): { back: string; front: string } {
  const id = uid(options.id)
  const blanket = options.blanket ?? LILAC
  const sw = 3
  const back = root(
    BED_VIEW.w,
    BED_VIEW.h,
    'bo-bed-back',
    `${tubes(['M52 200V30', 'M348 200V30'], 8, WHITE, 3)}
    ${inked(sw)}
      <circle cx="52" cy="26" r="9" fill="${WHITE}"/>
      <circle cx="348" cy="26" r="9" fill="${WHITE}"/>
      <rect x="62" y="34" width="276" height="170" rx="34" fill="${WHITE}"/>
      <rect x="73" y="45" width="254" height="159" rx="25" fill="${MINT}"/>
    </g>
    <path d="M76 176H324V181Q324 201 304 201H96Q76 201 76 181Z" fill="${INK}" opacity=".07"/>
    <circle cx="48" cy="22" r="2.6" fill="${MINT}"/><circle cx="344" cy="22" r="2.6" fill="${MINT}"/>
    ${crossBadge(101, 66, 11, 2.6)}
    ${crossBadge(299, 66, 11, 2.6)}
    ${inked(sw)}
      <path d="${PILLOW}" fill="${WHITE}"/>
    </g>
    <path d="M77 140Q200 154 323 140Q322 160 318 172Q200 186 82 172Q78 160 77 140Z" fill="#E3F3EE"/>
    <path d="${PILLOW}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
    <path d="M92 102Q96 92 108 90" stroke="${MINT}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`,
  )
  const blanketShape =
    'M30 154Q200 128 370 154L374 244Q358 252 342 246Q326 254 310 246Q294 254 278 246Q262 254 246 246Q230 254 214 246Q198 254 182 246Q166 254 150 246Q134 254 118 246Q102 254 86 246Q70 254 54 246Q40 252 26 244Z'
  const pattern = `<pattern id="${id}-dots" width="46" height="40" patternUnits="userSpaceOnUse" x="8" y="6">
      <path d="${crossPath(11, 12, 10, 3.8)}" fill="${WHITE}" opacity=".6"/>
      <path d="${heartPath(34, 31, 5.4)}" fill="${WHITE}" opacity=".6"/>
    </pattern>`
  const front = root(
    BED_VIEW.w,
    BED_VIEW.h,
    'bo-bed-front',
    `<defs>${pattern}<clipPath id="${id}-blanket"><path d="${blanketShape}"/></clipPath></defs>
    <g class="bo-blanket">
      <path d="${blanketShape}" fill="${blanket}"/>
      <path d="${blanketShape}" fill="url(#${id}-dots)"/>
      <g clip-path="url(#${id}-blanket)"><path d="M0 222Q200 232 400 222V260H0Z" fill="${INK}" opacity=".13"/></g>
      <path d="${blanketShape}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
      ${inked(sw)}
        <path d="M34 150Q200 120 366 150L368 172Q200 146 32 172Z" fill="${WHITE}"/>
      </g>
      <path d="M44 161Q200 135 356 161" stroke="${MINT}" stroke-width="2.6" stroke-dasharray="7 7" stroke-linecap="round" fill="none"/>
    </g>
    ${tubes(['M40 252V202', 'M360 252V202', 'M40 212H360', 'M40 240H360'], 8, WHITE, 3)}
    ${inked(sw)}
      <circle cx="40" cy="198" r="9" fill="${WHITE}"/>
      <circle cx="360" cy="198" r="9" fill="${WHITE}"/>
      <rect x="276" y="206" width="48" height="50" rx="6" fill="#E9A866"/>
      <rect x="282" y="215" width="36" height="36" rx="3" fill="${WHITE}" stroke-width="2.4"/>
      <rect x="290" y="201" width="20" height="10" rx="3" fill="${STEEL}" stroke-width="2.4"/>
    </g>
    <path d="M288 224H300M288 232H312M288 240H306" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>
    <path d="${heartPath(308, 224, 5)}" fill="${CHERRY}"/>
    <circle cx="36" cy="194" r="2.6" fill="${MINT}"/><circle cx="356" cy="194" r="2.6" fill="${MINT}"/>
    <g fill="${INK}"><circle cx="40" cy="251" r="8"/><circle cx="360" cy="251" r="8"/></g>
    <g fill="${WHITE}"><circle cx="40" cy="251" r="3"/><circle cx="360" cy="251" r="3"/></g>`,
  )
  return { back, front }
}

/* ------------------------------------------------------------ thermometer */

const THERMO_STOPS: [number, string][] = [
  [0, '#3DC07E'],
  [0.5, '#FFB53B'],
  [1, CHERRY],
]

/** The column colour for a fever level (0 healthy green, 1 hot red). */
export function feverColor(level: number): string {
  const t = Math.min(1, Math.max(0, level))
  for (let i = 1; i < THERMO_STOPS.length; i++) {
    const [b, cb] = THERMO_STOPS[i]
    const [a, ca] = THERMO_STOPS[i - 1]
    if (t <= b) return mix(ca, cb, (t - a) / (b - a))
  }
  return CHERRY
}

/** A vertical thermometer with a face on its bulb (viewBox 60x220); level 1 = hot, 0 = healthy. */
export function thermometerSvg(level: number, options: { id?: string } = {}): string {
  uid(options.id)
  const t = Math.min(1, Math.max(0, level))
  const c = feverColor(t)
  const top = r1(142 - 118 * t)
  const outline = 'M16 170V22A14 14 0 0 1 44 22V170A25 25 0 1 1 16 170Z'
  let ticks = ''
  for (let i = 0; i <= 10; i++) {
    const y = 30 + i * 12
    ticks += `M${i % 2 ? 38 : 35} ${y}H41`
  }
  const face =
    t > 0.66
      ? `<path d="M19.4 182.6L25.4 180.6M34.6 180.6L40.6 182.6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
        <g class="bo-eyes"><ellipse cx="23.5" cy="187.6" rx="2.8" ry="3.2" fill="${INK}"/><ellipse cx="36.5" cy="187.6" rx="2.8" ry="3.2" fill="${INK}"/>
          <circle cx="24.4" cy="186.4" r="1.1" fill="${WHITE}"/><circle cx="37.4" cy="186.4" r="1.1" fill="${WHITE}"/></g>
        <path d="M24 199Q27 196 30 199Q33 202 36 199" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <path d="M51 150Q56 158 51 161Q46 158 51 150Z" fill="${GLASS}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      : `<g class="bo-eyes"><ellipse cx="23.5" cy="187" rx="3" ry="3.6" fill="${INK}"/><ellipse cx="36.5" cy="187" rx="3" ry="3.6" fill="${INK}"/>
          <circle cx="24.6" cy="185.6" r="1.2" fill="${WHITE}"/><circle cx="37.6" cy="185.6" r="1.2" fill="${WHITE}"/></g>
        ${t > 0.33 ? `<path d="M26 198H34" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M25 196Q30 202 35 196" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`}`
  return root(
    60,
    220,
    'bo-thermometer',
    `<path d="${outline}" fill="#F2FAFD"/>
    <rect x="21" y="${top}" width="12" height="${r1(180 - top)}" rx="6" fill="${c}" stroke="${INK}" stroke-width="2.2" class="bo-thermo-column"/>
    <circle cx="30" cy="192" r="23.4" fill="${c}"/>
    <path d="M9 198A21 21 0 0 0 51 198A23.4 23.4 0 0 1 9 198Z" fill="${INK}" opacity=".12"/>
    <path d="${ticks}" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
    <path d="M20.5 28V160" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="${outline}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="19" cy="${t > 0.66 ? 193 : 194}" rx="4" ry="2.4" fill="${BLUSH}" opacity="${t > 0.66 ? 0.9 : 0.5}"/>
    <ellipse cx="41" cy="${t > 0.66 ? 193 : 194}" rx="4" ry="2.4" fill="${BLUSH}" opacity="${t > 0.66 ? 0.9 : 0.5}"/>
    ${face}
    <path d="M14 180Q16 173 22 171" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".8"/>`,
  )
}

/* ---------------------------------------------------------------- monitor */

/** A heart monitor on a rolling stand with an animatable ECG line (viewBox 140x200). */
export function monitorSvg(options: { id?: string } = {}): string {
  const id = uid(options.id)
  let grid = ''
  for (let x = 34; x < 118; x += 12) grid += `M${x} 22V84`
  for (let y = 30; y < 84; y += 12) grid += `M24 ${y}H116`
  return root(
    140,
    200,
    'bo-monitor',
    `<defs><clipPath id="${id}-screen"><rect x="24" y="22" width="92" height="62" rx="9"/></clipPath></defs>
    ${tubes(['M70 104V180'], 8, STEEL, 3)}
    ${tubes(['M28 184H112'], 7, TEAL, 3)}
    <g fill="${INK}"><circle cx="30" cy="192" r="6.5"/><circle cx="70" cy="192" r="6.5"/><circle cx="110" cy="192" r="6.5"/></g>
    <g fill="${WHITE}"><circle cx="30" cy="192" r="2.3"/><circle cx="70" cy="192" r="2.3"/><circle cx="110" cy="192" r="2.3"/></g>
    ${inked(3)}
      <rect x="60" y="126" width="20" height="12" rx="4" fill="${TEAL}"/>
      <rect x="10" y="8" width="120" height="98" rx="18" fill="${WHITE}"/>
    </g>
    <path d="M12 90H128V92Q128 104 116 104H24Q12 104 12 92Z" fill="${MINT}"/>
    <rect x="10" y="8" width="120" height="98" rx="18" fill="none" stroke="${INK}" stroke-width="3"/>
    <rect x="24" y="22" width="92" height="62" rx="9" fill="#1C3A4C" stroke="${INK}" stroke-width="3"/>
    <g clip-path="url(#${id}-screen)">
      <path d="${grid}" stroke="#2D5A68" stroke-width="1.2"/>
      <path class="bo-ecg" pathLength="100" d="M24 62H42L46 57L50 62H56L61 38L67 74L71 62H80Q85 54 90 62H116" fill="none" stroke="#5CF0A6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <path d="${heartPath(35, 34, 6.5)}" fill="${CHERRY}" class="bo-monitor-heart"/>
    <circle cx="106" cy="32" r="3" fill="${SUNNY}"/>
    ${inked(2.4)}
      <circle cx="32" cy="95" r="5" fill="${CHERRY}"/>
      <circle cx="47" cy="95" r="5" fill="${SUNNY}"/>
    </g>
    <path d="M96 92H116M96 98H116" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
    <path d="M18 30Q18 16 32 14" stroke="${MINT}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`,
  )
}

/* ----------------------------------------------------------------- gurney */

/** Where a 240x240 patient portrait goes on the gurney pillow (scaled to size x size). */
export const GURNEY_HEAD: { x: number; y: number; size: number } = { x: 8, y: 2, size: 128 }

const GURNEY_BLANKET =
  'M6 92H134C158 92 166 80 190 80C212 80 222 70 244 70C262 70 268 82 280 80C296 78 310 84 310 98V128Q300 134 290 129Q280 135 270 129Q260 135 250 129Q240 135 230 129Q220 135 210 129Q200 135 190 129Q180 135 170 129Q160 135 150 129Q140 135 130 129Q120 135 110 129Q100 135 90 129Q80 135 70 129Q60 135 50 129Q40 135 30 129Q20 135 10 129Q6 132 6 128Z'

const GURNEY_SHEET = 'M11 97H134C158 97 166 85 190 85C212 85 222 75 244 75C262 75 268 87 280 85C292 83 300 86 303 92'

function gurneyBlanket(id: string, color: string): string {
  return `<defs><pattern id="${id}-g-dots" width="40" height="34" patternUnits="userSpaceOnUse" x="4" y="2">
      <path d="${crossPath(10, 10, 9, 3.4)}" fill="${WHITE}" opacity=".6"/>
      <path d="${heartPath(30, 26, 5)}" fill="${WHITE}" opacity=".6"/>
    </pattern><clipPath id="${id}-g-clip"><path d="${GURNEY_BLANKET}"/></clipPath></defs>
    <g class="bo-blanket">
      <path d="${GURNEY_BLANKET}" fill="${color}"/>
      <path d="${GURNEY_BLANKET}" fill="url(#${id}-g-dots)"/>
      <g clip-path="url(#${id}-g-clip)"><rect x="0" y="116" width="320" height="30" fill="${INK}" opacity=".13"/></g>
      <path d="${GURNEY_BLANKET}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      ${tubes([GURNEY_SHEET], 10, WHITE, 2.6)}
      <path d="${GURNEY_SHEET}" stroke="${MINT}" stroke-width="2.4" stroke-dasharray="6 6" stroke-linecap="round" fill="none"/>
    </g>`
}

/** A stretcher on wheels with pillow, blanket and a blinking blue light (viewBox 320x170). */
export function gurneySvg(options: { id?: string; blanket?: string } = {}): string {
  const id = uid(options.id)
  return root(
    320,
    170,
    'bo-gurney',
    `${tubes(['M302 104V40'], 5, STEEL, 2.6)}
    <g class="bo-light">
      <path d="M302 14V8M288 22L284 18M316 22L320 18" stroke="#4FB3FF" stroke-width="3" stroke-linecap="round"/>
      ${inked(2.6)}
        <path d="M292 36V30A10 10 0 0 1 312 30V36Z" fill="#4FB3FF"/>
        <rect x="289" y="35" width="26" height="7" rx="3" fill="${STEEL}"/>
      </g>
      <path d="M297 29Q297 24 302 23" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    </g>
    ${tubes(['M60 132L96 152M96 132L60 152', 'M222 132L258 152M258 132L222 152'], 5, STEEL, 2.6)}
    ${tubes(['M16 132H304'], 8, TEAL, 2.6)}
    <g fill="${INK}"><circle cx="60" cy="156" r="11"/><circle cx="96" cy="156" r="11"/><circle cx="222" cy="156" r="11"/><circle cx="258" cy="156" r="11"/></g>
    <g fill="${WHITE}"><circle cx="60" cy="156" r="4"/><circle cx="96" cy="156" r="4"/><circle cx="222" cy="156" r="4"/><circle cx="258" cy="156" r="4"/></g>
    ${inked(2.6)}
      <rect x="10" y="100" width="300" height="24" rx="11" fill="${WHITE}"/>
      <path d="M14 64Q60 56 108 64Q116 80 108 96Q60 104 14 96Q6 80 14 64Z" fill="${WHITE}"/>
    </g>
    <path d="M10 84Q60 92 112 84Q111 91 108 96Q60 104 14 96Q11 91 10 84Z" fill="#E3F3EE"/>
    <path d="M14 64Q60 56 108 64Q116 80 108 96Q60 104 14 96Q6 80 14 64Z" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    ${gurneyBlanket(id, options.blanket ?? LILAC)}`,
  )
}

/** Only the gurney blanket, to lay over the portrait so it tucks the patient in (viewBox 320x170). */
export function gurneyFrontSvg(options: { id?: string; blanket?: string } = {}): string {
  const id = uid(options.id)
  return root(320, 170, 'bo-gurney-front', gurneyBlanket(`${id}-f`, options.blanket ?? LILAC))
}

/* ------------------------------------------------------------------- bell */

/** A shiny service desk bell (viewBox 80x60). Hooks: bo-bell-dome, bo-bell-button. */
export function bellSvg(): string {
  return root(
    80,
    60,
    'bo-bell',
    `${inked(2.6)}
      <rect x="6" y="46" width="68" height="11" rx="5" fill="${TEAL}"/>
    </g>
    <path d="M9 52H71" stroke="#5CC2AE" stroke-width="2" stroke-linecap="round"/>
    <g class="bo-bell-dome">
      <g class="bo-bell-button">${inked(2.6)}
        <rect x="36.5" y="10" width="7" height="10" rx="2" fill="${STEEL}"/>
        <ellipse cx="40" cy="9" rx="8" ry="3.8" fill="${SUNNY}"/>
      </g></g>
      ${inked(2.6)}
        <path d="M12 44A28 26 0 0 1 68 44Z" fill="${SUNNY}"/>
      </g>
      <path d="M50 22A26 24 0 0 1 66 42H54Q54 30 50 22Z" fill="#E8A21C" opacity=".55"/>
      <path d="M12 44A28 26 0 0 1 68 44Z" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      ${inked(2.6)}<rect x="8" y="42" width="64" height="6" rx="3" fill="#F2B632"/></g>
      <path d="M20 36Q22 26 32 21" stroke="${WHITE}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <circle cx="37" cy="19.6" r="1.8" fill="${WHITE}"/>
    </g>
    <path d="${starPath(70, 14, 6.5, 2.2, 4)}" fill="${WHITE}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
  )
}

/* --------------------------------------------------------------- hospital */

/** A small hospital building for the title screen and catalog card (viewBox 320x240). Lower-left stays clear. */
export function hospitalSvg(options: { id?: string } = {}): string {
  uid(options.id)
  const win = (cx: number, cy: number, r: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 4.2}" fill="${WARM}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M${cx - r + 4.6} ${cy + 1.6}Q${cx} ${cy + 5.6} ${cx + r - 4.6} ${cy + 1.6}A${r - 4.2} ${r - 4.2} 0 0 1 ${cx - r + 4.6} ${cy + 1.6}Z" fill="#FFC95E"/>
    <path d="M${cx - r + 7.2} ${cy - 1}Q${cx - r + 7.6} ${cy - r + 7.6} ${cx - 1} ${cy - r + 7.2}" stroke="${WHITE}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`
  const bush = (cx: number, cy: number, s: number) =>
    `<path d="M${cx - 2.2 * s} ${cy}Q${cx - 2.6 * s} ${cy - 1.8 * s} ${cx - 1.1 * s} ${cy - 1.9 * s}Q${cx - 0.6 * s} ${cy - 3.2 * s} ${cx + 0.6 * s} ${cy - 2.6 * s}Q${cx + 2.4 * s} ${cy - 2.8 * s} ${cx + 2.2 * s} ${cy}Z" fill="#7ED39A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="${cx - 0.9 * s}" cy="${cy - 1.2 * s}" r="${0.34 * s}" fill="${BLUSH}"/><circle cx="${cx + 1 * s}" cy="${cy - 1.6 * s}" r="${0.34 * s}" fill="${WHITE}"/>`
  let rays = ''
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8
    rays += `M${r1(44 + 23 * Math.cos(a))} ${r1(38 + 23 * Math.sin(a))}L${r1(44 + 29 * Math.cos(a))} ${r1(38 + 29 * Math.sin(a))}`
  }
  return root(
    320,
    240,
    'bo-hospital',
    `<path d="M0 206Q70 196 150 204T320 200V240H0Z" fill="#BCE7B4"/>
    <path d="M0 206Q70 196 150 204T320 200" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M198 218Q182 227 136 229Q92 231 64 240H116Q152 236 190 232Q224 228 228 218Z" fill="#FFF1D6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${rays}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    ${inked(3)}
      <circle cx="44" cy="38" r="16" fill="${SUNNY}"/>
      <path d="M74 72Q72 60 84 60Q88 50 100 54Q110 48 116 60Q128 60 126 72Z" fill="${WHITE}"/>
    </g>
    ${inked(3)}
      <rect x="114" y="104" width="72" height="110" fill="#C4ECDF"/>
      <rect x="238" y="104" width="72" height="110" fill="#C4ECDF"/>
      <rect x="108" y="96" width="84" height="14" rx="6" fill="${TEAL}"/>
      <rect x="232" y="96" width="84" height="14" rx="6" fill="${TEAL}"/>
      <rect x="208" y="56" width="8" height="16" fill="${STEEL}"/>
      <rect x="180" y="76" width="64" height="138" fill="#DDF5EE"/>
      <rect x="174" y="68" width="76" height="14" rx="6" fill="${TEAL}"/>
    </g>
    <path d="M116 198H184V212H116ZM240 198H308V212H240ZM182 198H242V212H182Z" fill="${INK}" opacity=".08"/>
    <path d="M114 110V214M310 110V214M180 82V214M244 82V214" stroke="${INK}" stroke-width="3"/>
    <path d="M112 100H150M250 100H288M178 72H214" stroke="#5CC2AE" stroke-width="2.6" stroke-linecap="round"/>
    ${catBadge(212, 42, 22, 3.2)}
    ${win(136, 136, 13)}${win(164, 136, 13)}${win(136, 176, 13)}${win(164, 176, 13)}
    ${win(260, 136, 13)}${win(288, 136, 13)}${win(260, 176, 13)}${win(288, 176, 13)}
    <path d="${heartPath(212, 111, 14)}" fill="${WHITE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${heartPath(212, 111.4, 9.4)}" fill="${WARM}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M203 108Q203 103 207 102" stroke="${WHITE}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    ${inked(3)}
      <path d="M196 214V178A16 16 0 0 1 228 178V214Z" fill="${TEAL}"/>
      <path d="M212 162V214" stroke-width="2.4"/>
      <circle cx="206" cy="190" r="2.4" fill="${SUNNY}" stroke-width="1.8"/>
      <circle cx="218" cy="190" r="2.4" fill="${SUNNY}" stroke-width="1.8"/>
      <path d="M190 148H234L238 158Q233 164 228 158Q223 164 218 158Q213 164 208 158Q203 164 198 158Q193 164 188 158L190 148Z" fill="${CHERRY}"/>
      <rect x="188" y="212" width="48" height="7" rx="3" fill="${WHITE}"/>
    </g>
    <path d="M199 149V157M212 149V157M225 149V157" stroke="${WHITE}" stroke-width="4"/>
    ${bush(252, 214, 9)}${bush(298, 212, 8)}`,
  )
}

/* ---------------------------------------------------------------- band-aid */

/** A big band-aid for the "Начать играть" button (viewBox 320x120); the pad is x 85-235, y 25-95. */
export function bandaidSvg(options: { id?: string } = {}): string {
  const id = uid(options.id)
  const body = rrect(6, 14, 308, 92, 46)
  let holes = ''
  for (const cx of [30, 50, 270, 290]) {
    for (const cy of [44, 60, 76]) holes += `<circle cx="${cx}" cy="${cy}" r="3.4" fill="#D99A6E"/>`
  }
  holes += `<circle cx="70" cy="52" r="3.4" fill="#D99A6E"/><circle cx="70" cy="68" r="3.4" fill="#D99A6E"/><circle cx="250" cy="52" r="3.4" fill="#D99A6E"/><circle cx="250" cy="68" r="3.4" fill="#D99A6E"/>`
  return root(
    320,
    120,
    'bo-bandaid',
    `<defs><clipPath id="${id}-strip"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${PEACH}"/>
    <g clip-path="url(#${id}-strip)"><path d="M0 90Q160 98 320 90V120H0Z" fill="${INK}" opacity=".1"/></g>
    <path d="${body}" fill="none" stroke="${INK}" stroke-width="3.4"/>
    ${holes}
    <rect x="85" y="25" width="150" height="70" rx="16" fill="#FDE8D3" stroke="${INK}" stroke-width="3"/>
    <path d="M98 34H222" stroke="${WHITE}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <path d="M28 26Q40 18 56 18" stroke="${WHITE}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".75"/>`,
  )
}

/* ------------------------------------------------------------------ medal */

const MEDAL_METAL: Record<1 | 2 | 3, [string, string]> = {
  1: [SUNNY, '#E9A91E'],
  2: ['#DDE4EF', '#A9B6CB'],
  3: ['#EDA878', '#C0703C'],
}

const DIGITS: Record<1 | 2 | 3, string> = {
  1: 'M21.6 40.4L24.6 38V51',
  2: 'M20.4 41.6Q21 38 24.4 38Q28 38 28 41.2Q28 43.6 20.4 51H28.4',
  3: 'M20.6 39.6Q22 38 24.2 38Q27.6 38 27.6 41Q27.6 44 24 44Q28.2 44 28.2 47.4Q28.2 51 24 51Q21.6 51 20.2 49.4',
}

/** A gold, silver or bronze medal on a ribbon (viewBox 48x64). */
export function medalSvg(rank: 1 | 2 | 3, options: { id?: string } = {}): string {
  uid(options.id)
  const [metal, shade] = MEDAL_METAL[rank]
  return root(
    48,
    64,
    'bo-medal',
    `${inked(2.2)}
      <path d="M8 2H20L30 30H18Z" fill="${CHERRY}"/>
      <path d="M40 2H28L18 30H30Z" fill="#5CC2AE"/>
    </g>
    <path d="M12.5 4L21 28" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    ${inked(2.2)}
      <circle cx="24" cy="45" r="16" fill="${metal}"/>
    </g>
    <path d="M10.6 50A16 16 0 0 0 37.4 50A14 13 0 0 1 10.6 50Z" fill="${shade}" opacity=".6"/>
    <circle cx="24" cy="45" r="11.5" fill="none" stroke="${shade}" stroke-width="2"/>
    <path d="M13 40Q15 33 21 31" stroke="${WHITE}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="${DIGITS[rank]}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  )
}

/* ---------------------------------------------------------------- monster */

/** A tiny friendly one-eyed monster face for "monsters caught" counters (viewBox 48x48). */
export function monsterFaceSvg(options: { id?: string } = {}): string {
  uid(options.id)
  return root(
    48,
    48,
    'bo-monster-face',
    `${inked(2.6)}
      <path d="M13.5 14.5Q7 11 8.6 3.4Q12.6 9.2 19 10.4Z" fill="${SUNNY}"/>
      <path d="M34.5 14.5Q41 11 39.4 3.4Q35.4 9.2 29 10.4Z" fill="${SUNNY}"/>
      <path d="M24 8.5C36 8.5 43.5 16.5 43.5 28C43.5 38.5 35.5 44.5 24 44.5C12.5 44.5 4.5 38.5 4.5 28C4.5 16.5 12 8.5 24 8.5Z" fill="#A383F2"/>
    </g>
    <path d="M6 34Q24 45 42 34Q38 43.2 24 43.4Q10 43.2 6 34Z" fill="${INK}" opacity=".13"/>
    <path d="M9.6 19.6Q12.4 13.4 18.6 11.6" stroke="${WHITE}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".75"/>
    <g class="bo-eyes">
      <circle cx="24" cy="23" r="8.6" fill="${WHITE}" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="25" cy="24" r="4.8" fill="${INK}"/>
      <circle cx="26.9" cy="22" r="1.8" fill="${WHITE}"/>
    </g>
    <path d="M15.4 33.2Q24 35.2 32.6 33.2Q30.8 40.6 24 40.6Q17.2 40.6 15.4 33.2Z" fill="${INK}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <ellipse cx="24" cy="38.4" rx="3.8" ry="1.9" fill="${BLUSH}"/>
    <path d="M18.4 33.9L21.4 34.3L19.9 37ZM26.6 34.3L29.6 33.9L28.1 37Z" fill="${WHITE}" stroke="${WHITE}" stroke-width="1" stroke-linejoin="round"/>
    <ellipse cx="10.8" cy="30" rx="3.2" ry="2.1" fill="${BLUSH}" opacity=".8"/>
    <ellipse cx="37.2" cy="30" rx="3.2" ry="2.1" fill="${BLUSH}" opacity=".8"/>`,
  )
}

/* ------------------------------------------------------------------- note */

/** A music note for the healing-song progress (viewBox 32x32): filled = earned, hollow = still to earn. */
export function noteSvg(filled: boolean): string {
  const d = 'M19.6 5V21.4M19.6 5Q21.6 9.6 26.6 11.2Q28 14.8 25 17.4'
  const head = '<ellipse cx="13.6" cy="22.6" rx="6.6" ry="5" transform="rotate(-22 13.6 22.6)"'
  return root(
    32,
    32,
    `bo-note${filled ? ' bo-note-filled' : ''}`,
    filled
      ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${head} fill="${SUNNY}" stroke="${INK}" stroke-width="2.4"/>
        <ellipse cx="11.6" cy="20.8" rx="2.2" ry="1.3" transform="rotate(-22 11.6 20.8)" fill="${WHITE}"/>`
      : `<g opacity=".38"><path d="${d}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        ${head} fill="none" stroke="${INK}" stroke-width="2.4"/></g>`,
  )
}
