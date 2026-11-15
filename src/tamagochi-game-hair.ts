/**
 * Тамагочи Связь — «Причёски»: a free dress-up salon. One pet sits in front of
 * the mirror, a friend combs it, the others watch. The child picks hairdos,
 * hair colours and owned accessories; every choice is applied at once.
 * No goal and no mistakes: the tick button ends the visit with a little show.
 */
import { drawGiftBox, drawItem } from './tamagochi-items.ts'
import {
  HAIRS,
  HAIR_COLORS,
  INK,
  Particles,
  SHELLS,
  TAU,
  button,
  clamp,
  ease,
  drawRoom,
  hit,
  lerp,
  line,
  oval,
  paint,
  rr,
  type Activity,
  type Ctx,
  type HairId,
  type Look,
  type MeetPet,
  type Pointer,
  type Pt,
  type Rect,
  type SpeciesId,
} from './tamagochi-kit.ts'
import { drawAccessory, drawHair, drawPet, drawWire, slotOf, type Pose } from './tamagochi-pets.ts'

type Tab = 'hair' | 'color' | 'wear'
type Part = 'hair' | 'head' | 'face' | 'neck'
interface Lines {
  want: (name: string) => string
  tabs: Record<Tab, string>
  empty: string
  nice: string[]
  end: string
}
const TEXT: Record<string, Lines> = {
  ru: {
    want: (n) => `${n} хочет новую причёску!`,
    tabs: { hair: 'Причёска', color: 'Цвет', wear: 'Украшения' },
    empty: 'Здесь появятся подарки и бантики.',
    nice: ['Как красиво!', 'Ой, как здорово!', 'Вот это причёска!', 'Просто чудо!'],
    end: 'Красота!',
  },
  de: {
    want: (n) => `${n} möchte eine neue Frisur!`,
    tabs: { hair: 'Frisur', color: 'Farbe', wear: 'Schmuck' },
    empty: 'Hier kommen Geschenke und Schleifen hin.',
    nice: ['Wie hübsch!', 'Oh, wie toll!', 'Was für eine Frisur!', 'Einfach zauberhaft!'],
    end: 'Wunderschön!',
  },
  en: {
    want: (n) => `${n} wants a new hairdo!`,
    tabs: { hair: 'Hairdo', color: 'Colour', wear: 'Accessories' },
    empty: 'Gifts and bows will show up here.',
    nice: ['So pretty!', 'Oh, how lovely!', 'What a hairdo!', 'Simply magic!'],
    end: 'Beautiful!',
  },
}

const TABS: Tab[] = ['hair', 'color', 'wear']
const TAB_COLOR: Record<Tab, string> = { hair: '#ff9a3d', color: '#a66bff', wear: '#ff6fb5' }
const RAINBOW = ['#f0506e', '#ff9a3d', '#ffd23d', '#44cf8a', '#3db8ff', '#a66bff']
const FINALE = 1.6

interface Tile extends Pt {
  id: string
  kind: 'item' | 'prev' | 'next'
  selected: boolean
}
interface Lay {
  land: boolean
  panel: Rect
  tabs: { id: Tab; r: Rect }[]
  done: Rect
  grid: Rect
  cols: number
  rows: number
  s: number
  portraits: { x: number; y: number; r: number }[]
  cx: number
  floor: number
  feetY: number
  size: number
  mirror: { x: number; y: number; r: number }
}

// Copies of the pet geometry in tamagochi-pets.ts (not exported there): where
// hair and accessories sit, and where a raised hand ends up.
const anchorsOf = (sp: SpeciesId): { topX: number; topY: number; eyeX: number; eyeY: number; neckY: number; headW: number } =>
  sp === 'banana'
    ? { topX: -0.2, topY: -0.97, eyeX: 0.02, eyeY: -0.57, neckY: -0.3, headW: 0.5 }
    : sp === 'mini'
      ? { topX: -0.06, topY: -0.86, eyeX: 0, eyeY: -0.52, neckY: -0.2, headW: 0.62 }
      : { topX: 0, topY: -0.9, eyeX: 0, eyeY: -0.58, neckY: -0.3, headW: 0.8 }
const leftHand = (sp: SpeciesId, angle: number, size: number): Pt => {
  const ang = angle + 0.5 * Math.max(0, 1 - angle / Math.PI)
  const [px, py, len] = sp === 'banana' ? [-0.17, -0.5, 0.24] : sp === 'mini' ? [-0.33, -0.42, 0.2] : [-0.36, -0.44, 0.22]
  return { x: (px - Math.sin(ang) * len) * size, y: (py + Math.cos(ang) * len) * size }
}

const hairFill = (c: Ctx, color: number, x: number, r: number): string | CanvasGradient => {
  const col = HAIR_COLORS[color] ?? HAIR_COLORS[0]
  if (col !== 'rainbow') return col
  const g = c.createLinearGradient(x - r, 0, x + r, 0)
  RAINBOW.forEach((v, i) => g.addColorStop(i / 5, v))
  return g
}

/** A neutral little head wearing `hair`, inside a box `s` wide. */
const headIcon = (c: Ctx, x: number, y: number, s: number, hair: HairId, color: number): void => {
  const hw = s * 0.5
  const top = y - s * 0.1
  const lw = Math.max(1.6, s * 0.03)
  oval(c, x, top + hw * 0.44, hw * 0.5, hw * 0.46)
  paint(c, '#ffe9d6', lw)
  for (const side of [-1, 1]) {
    oval(c, x + side * hw * 0.17, top + hw * 0.42, hw * 0.045, hw * 0.055)
    paint(c, INK)
  }
  c.beginPath()
  c.arc(x, top + hw * 0.5, hw * 0.12, 0.2 * Math.PI, 0.8 * Math.PI)
  c.lineWidth = lw * 0.8
  c.strokeStyle = INK
  c.lineCap = 'round'
  c.stroke()
  drawHair(c, hair, color, x, top, hw, lw)
}

const blob = (c: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient, seed: number): void => {
  c.beginPath()
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU
    const rad = r * (1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 5 + seed * 2.3))
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
  }
  c.closePath()
  paint(c, fill, Math.max(2, r * 0.11))
  oval(c, x - r * 0.32, y - r * 0.36, r * 0.24, r * 0.13, -0.6)
  paint(c, 'rgba(255,255,255,0.6)')
}

const tick = (c: Ctx, s: number): void => {
  const pts = [-0.3 * s, 0.02 * s, -0.08 * s, 0.24 * s, 0.32 * s, -0.24 * s]
  line(c, pts, s * 0.26)
  line(c, pts, s * 0.14, '#fff')
}

const tabIcon = (id: Tab, c: Ctx, s: number): void => {
  if (id === 'hair') headIcon(c, 0, 0, s * 1.45, 'curls', 2)
  else if (id === 'color') {
    blob(c, -0.16 * s, 0.1 * s, 0.3 * s, '#ffd23d', 1)
    blob(c, 0.2 * s, -0.14 * s, 0.26 * s, hairFill(c, 8, 0.2 * s, 0.26 * s), 4)
  } else drawItem(c, 'g:crown', 0, 0.02 * s, s * 0.95)
}

export const hairGame: Activity = (ctx) => {
  const { game, pets } = ctx
  const fx = new Particles()
  const spots = pets.map(() => ({ x: 0, y: 0, size: 0, hop: 9, set: false }))
  const held = new Map<number, string>()
  let phase: 'play' | 'finale' | 'done' = 'play'
  let client = 0
  let dresser = 1 % pets.length
  let tab: Tab = 'hair'
  let page = 0
  let changed: Part = 'hair'
  /** Seconds since the last change, and since a tile was tapped. */
  let fxT = 9
  let bump = { id: '', t: 9 }
  let changes = 0
  let intro = 0
  let invited = false
  let ft = 0

  const text = (): Lines => TEXT[game.lang] ?? TEXT.ru
  const look = (): Look => pets[client].look

  // ------------------------------------------------------------------ layout

  const lay = (): Lay => {
    const { w, h, safe } = game
    const land = w > h
    const edge = Math.max(8, Math.min(w, h) * 0.018) + 8
    const top = safe.y + 6
    const bottom = h - 62
    const pr = clamp(Math.min(w, h) * 0.07, 24, 34)
    let panel: Rect
    let a: Rect
    if (land) {
      const pw = clamp(w * 0.42, 300, 410)
      panel = { x: w - edge - pw, y: top, w: pw, h: bottom - top }
      const ax = edge + pr * 2 + 14
      a = { x: ax, y: top, w: panel.x - 8 - ax, h: h - Math.max(40, h * 0.07) - top }
    } else {
      const ph = clamp(h * 0.34, 230, 330)
      panel = { x: edge, y: bottom - ph, w: w - edge * 2, h: ph }
      const ay = top + pr * 2 + 12
      a = { x: edge, y: ay, w: w - edge * 2, h: panel.y - 14 - ay }
    }
    const pad = 8
    const bh = clamp(Math.min((panel.w - pad * 5) / 4, panel.h * 0.24), 44, 80)
    const tabs = TABS.map((id, i) => ({ id, r: { x: panel.x + pad + i * (bh + pad), y: panel.y + pad, w: bh, h: bh } }))
    const done = { x: panel.x + panel.w - pad - bh, y: panel.y + pad, w: bh, h: bh }
    const grid = { x: panel.x + pad, y: panel.y + bh + pad * 2 + 4, w: panel.w - pad * 2, h: panel.h - bh - pad * 3 - 4 }
    let cols = 5
    let s = 0
    for (let k = 2; k <= 6; k++) {
      const v = Math.min(grid.w / k, grid.h / Math.ceil(HAIRS.length / k), 128)
      if (v >= s) {
        s = v
        cols = k
      }
    }
    const rows = Math.max(Math.ceil(HAIRS.length / cols), Math.floor(grid.h / s))

    const size = Math.min(a.h / 1.68, a.w * 0.42, 330)
    const floor = lerp(a.y + size * 1.68, a.y + a.h, 0.6)
    const cx = a.x + a.w / 2
    const feetY = floor - size * 0.24
    const n = pets.length
    const portraits = pets.map((_, i) =>
      land
        ? { x: edge + pr + 2, y: top + pr + 4 + i * (pr * 2 + 8), r: pr }
        : { x: w / 2 + (i - (n - 1) / 2) * (pr * 2 + 12), y: top + pr + 2, r: pr },
    )
    return { land, panel, tabs, done, grid, cols, rows, s, portraits, cx, floor, feetY, size, mirror: { x: cx, y: feetY - size * 0.58, r: size * 0.7 } }
  }

  const target = (i: number, L: Lay): { x: number; y: number; size: number } => {
    if (i === client) return { x: L.cx, y: L.feetY, size: L.size }
    if (i === dresser) return { x: L.cx + L.size * 0.86, y: L.floor - L.size * 0.15, size: L.size * 0.7 }
    const j = pets.map((_, k) => k).filter((k) => k !== client && k !== dresser).indexOf(i)
    return { x: L.cx - L.size * (0.62 + j * 0.33), y: L.floor - L.size * 0.03, size: L.size * 0.46 }
  }

  // ------------------------------------------------------------------ choices

  const items = (): string[] =>
    tab === 'hair' ? [...HAIRS] : tab === 'color' ? HAIR_COLORS.map((_, i) => String(i)) : ctx.owned().filter((id) => slotOf(id) !== null)

  const isOn = (id: string): boolean => {
    const l = look()
    if (tab === 'hair') return l.hair === id
    if (tab === 'color') return String(l.hairColor) === id
    const slot = slotOf(id)
    return slot !== null && l[slot] === id
  }

  const tiles = (L: Lay): Tile[] => {
    const all = items()
    const cap = L.cols * L.rows
    const paged = all.length > cap
    const per = paged ? cap - 2 : cap
    const pages = Math.max(1, Math.ceil(all.length / per))
    const pg = ((page % pages) + pages) % pages
    const shown = all.slice(pg * per, pg * per + per)
    const used = paged ? L.rows : Math.max(1, Math.ceil(shown.length / L.cols))
    const gx = L.grid.x + (L.grid.w - L.cols * L.s) / 2
    const gy = L.grid.y + (L.grid.h - used * L.s) / 2
    const at = (k: number): Pt => ({ x: gx + ((k % L.cols) + 0.5) * L.s, y: gy + (Math.floor(k / L.cols) + 0.5) * L.s })
    // When paged, the two bottom corners are the arrows; items flow around them.
    const out: Tile[] = shown.map((id, k) => ({ id, kind: 'item', selected: isOn(id), ...at(paged && k >= cap - L.cols ? k + 1 : k) }))
    if (paged) {
      out.push({ id: '<', kind: 'prev', selected: false, ...at(cap - L.cols) })
      out.push({ id: '>', kind: 'next', selected: false, ...at(cap - 1) })
    }
    return out
  }

  const headPoint = (L: Lay): Pt => ({ x: L.cx, y: L.feetY - L.size * 0.78 })

  const choose = (id: string, L: Lay): void => {
    const l = look()
    let on = true
    if (tab === 'hair') {
      l.hair = id as HairId
      changed = 'hair'
      on = id !== 'none'
    } else if (tab === 'color') {
      l.hairColor = +id
      // A colour must be visible: a bald pet gets a tuft to carry it.
      if (l.hair === 'none') l.hair = 'tuft'
      changed = 'hair'
    } else {
      const slot = slotOf(id)
      if (!slot) return
      on = l[slot] !== id
      l[slot] = on ? id : null
      changed = slot
    }
    fxT = 0
    changes++
    game.sfx.play('snip')
    game.sfx.play('pop')
    game.sfx.note(72 + (changes % 5) * 2, 0.25, pets[client].species)
    const hp = headPoint(L)
    fx.burst('spark', hp.x, hp.y, on ? 12 : 6, { color: '#ffd23d', size: Math.max(16, L.size * 0.12), speed: L.size * 1.1, max: 0.8 })
    fx.burst('star', hp.x, hp.y, 4, { size: Math.max(12, L.size * 0.08), speed: L.size * 0.9, max: 0.9 })
    if (changes % 3 === 2) {
      const nice = text().nice
      game.say(nice[Math.floor(game.rnd() * nice.length) % nice.length], true)
    }
  }

  const setClient = (i: number): void => {
    if (i === client) {
      spots[i].hop = 0
      game.sfx.play('boing')
      game.sfx.note(76, 0.3, pets[i].species)
      return
    }
    dresser = client
    client = i
    spots[client].hop = 0
    spots[dresser].hop = 0
    invited = true
    game.sfx.play('boing')
    game.sfx.note(74, 0.3, pets[i].species)
    game.say(text().want(pets[i].name))
  }

  const setTab = (id: Tab): void => {
    game.sfx.play('tap')
    tab = id
    page = 0
    const t = text()
    game.say(id === 'wear' && !items().length ? `${t.tabs.wear}. ${t.empty}` : t.tabs[id])
  }

  const finish = (L: Lay): void => {
    phase = 'finale'
    ft = 0
    held.clear()
    game.sfx.play('chime')
    game.sfx.play('spin')
    game.say(text().end)
    fx.burst('confetti', L.cx, L.feetY - L.size * 0.6, 26, { speed: L.size * 2, size: 16, max: 1.4 })
  }

  // ------------------------------------------------------------------ scene

  const update = (dt: number): void => {
    const L = lay()
    fx.update(dt)
    fxT += dt
    bump.t += dt
    intro += dt
    if (!invited && phase === 'play' && intro > 1.3) {
      invited = true
      game.say(text().want(pets[client].name))
    }
    const k = 1 - Math.exp(-dt * 9)
    spots.forEach((sp, i) => {
      const to = target(i, L)
      sp.hop += dt
      if (!sp.set) Object.assign(sp, to, { set: true })
      else {
        sp.x = lerp(sp.x, to.x, k)
        sp.y = lerp(sp.y, to.y, k)
        sp.size = lerp(sp.size, to.size, k)
      }
    })
    if (phase !== 'finale') return
    const before = ft
    ft += dt
    const m = L.mirror
    if (game.rnd() < dt * 22) {
      const a = game.rnd() * TAU
      fx.add('spark', m.x + Math.cos(a) * m.r * 1.08, m.y + Math.sin(a) * m.r * 1.08, { vy: -20, max: 0.6, size: 14 + game.rnd() * 14, color: '#fff3a0' })
    }
    if (game.rnd() < dt * 9) {
      const from = spots[Math.floor(game.rnd() * spots.length) % spots.length]
      fx.add('heart', from.x + (game.rnd() - 0.5) * from.size * 0.5, from.y - from.size, { vy: -90 - game.rnd() * 60, vx: (game.rnd() - 0.5) * 60, max: 1.1, size: 18 + game.rnd() * 10 })
    }
    if (before < 0.75 && ft >= 0.75) {
      game.sfx.play('yay')
      fx.burst('star', L.cx, L.feetY - L.size * 0.9, 10, { speed: L.size * 1.5, size: 20 })
    }
    if (ft >= FINALE) {
      phase = 'done'
      ctx.done(3)
    }
  }

  const drawSalon = (c: Ctx, L: Lay): void => {
    const s = L.size
    const m = L.mirror
    const glow = phase === 'finale' ? 0.5 + 0.5 * Math.sin(ft * 14) : 0
    // Mirror: bracket, frame, glass, shine.
    line(c, [m.x, m.y - m.r * 1.1, m.x, m.y - m.r * 1.3], Math.max(4, s * 0.04))
    oval(c, m.x, m.y - m.r * 1.32, s * 0.035, s * 0.035)
    paint(c, INK)
    c.save()
    if (glow) {
      c.shadowColor = '#fff7b0'
      c.shadowBlur = 30 * glow
    }
    oval(c, m.x, m.y, m.r * 1.11, m.r * 1.11)
    paint(c, ctx.shell.accent, 4)
    c.restore()
    oval(c, m.x, m.y, m.r * 0.97, m.r * 0.97)
    paint(c, '#d6f2ff', 3)
    c.save()
    c.clip()
    c.globalAlpha = 0.55
    line(c, [m.x - m.r * 1.0, m.y + m.r * 0.1, m.x - m.r * 0.1, m.y - m.r * 1.0], m.r * 0.2, '#fff')
    line(c, [m.x - m.r * 0.7, m.y + m.r * 0.5, m.x + m.r * 0.4, m.y - m.r * 0.9], m.r * 0.07, '#fff')
    c.restore()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.4
      oval(c, m.x + Math.cos(a) * m.r * 1.04, m.y + Math.sin(a) * m.r * 1.04, s * 0.028, s * 0.028)
      paint(c, glow && i % 2 === Math.floor(ft * 8) % 2 ? '#fff' : '#fff3a0', 2)
    }
    // Shelf with bottles.
    const sx = L.cx + s * 0.92
    const sy = L.floor - s * 1.4
    const lw = Math.max(2, s * 0.018)
    for (const [dx, bw, bh, col] of [
      [-0.14, 0.09, 0.2, '#ff8fc7'],
      [0, 0.11, 0.14, '#5fe0b0'],
      [0.14, 0.08, 0.24, '#a66bff'],
    ] as const) {
      rr(c, sx + (dx - bw * 0.22) * s, sy - (bh + 0.045) * s, bw * 0.44 * s, 0.06 * s, 0.012 * s)
      paint(c, '#fff', lw)
      rr(c, sx + (dx - bw / 2) * s, sy - bh * s, bw * s, bh * s, 0.03 * s)
      paint(c, col, lw)
      oval(c, sx + (dx - bw * 0.2) * s, sy - bh * 0.6 * s, bw * 0.12 * s, bh * 0.22 * s)
      paint(c, 'rgba(255,255,255,0.55)')
    }
    rr(c, sx - s * 0.23, sy, s * 0.46, s * 0.05, s * 0.02)
    paint(c, ctx.shell.shell, lw)
  }

  const drawStool = (c: Ctx, L: Lay): void => {
    const s = L.size
    const lw = Math.max(2, s * 0.03)
    oval(c, L.cx, L.floor + s * 0.01, s * 0.34, s * 0.06)
    paint(c, 'rgba(59,42,74,0.16)')
    for (const side of [-1, 1]) line(c, [L.cx + side * s * 0.16, L.feetY + s * 0.04, L.cx + side * s * 0.24, L.floor], lw * 2.2)
    line(c, [L.cx - s * 0.2, L.feetY + s * 0.15, L.cx + s * 0.2, L.feetY + s * 0.15], lw * 1.4)
    rr(c, L.cx - s * 0.31, L.feetY - s * 0.035, s * 0.62, s * 0.1, s * 0.05)
    paint(c, '#ff8fc7', lw)
    rr(c, L.cx - s * 0.25, L.feetY - s * 0.02, s * 0.5, s * 0.025, s * 0.012)
    paint(c, 'rgba(255,255,255,0.5)')
    // A step for the hairdresser, so the comb reaches the head.
    if (pets.length > 1) {
      const bx = L.cx + s * 0.86
      oval(c, bx, L.floor + s * 0.05, s * 0.32, s * 0.05)
      paint(c, 'rgba(59,42,74,0.16)')
      rr(c, bx - s * 0.27, L.floor - s * 0.15, s * 0.54, s * 0.2, s * 0.05)
      paint(c, ctx.shell.accent, lw)
      rr(c, bx - s * 0.21, L.floor - s * 0.12, s * 0.42, s * 0.03, s * 0.015)
      paint(c, 'rgba(255,255,255,0.45)')
    }
  }

  /** The client, with the part that just changed popping in around its anchor. */
  const drawClient = (c: Ctx, pet: MeetPet, pose: Pose, pop: number): void => {
    if (pop >= 1) return drawPet(c, pet.species, pet.look, pose, game.time)
    const l = pet.look
    drawPet(c, pet.species, { ...l, hair: 'none', head: null, face: null, neck: null }, pose, game.time)
    const s = pose.size
    const a = anchorsOf(pet.species)
    const sq = pose.squash ?? 0
    const f = (pose.face ?? 0) * 0.05 * s
    const k = Math.max(0.05, ease.back(pop))
    c.save()
    c.translate(pose.x, pose.y - (pose.lift ?? 0))
    if (pose.lean) c.rotate(pose.lean)
    c.scale((1 + sq * 0.22) * (pose.flip ?? 1), 1 - sq * 0.25)
    const layer = (part: Part, x: number, y: number, fn: () => void): void => {
      c.save()
      if (part === changed) {
        c.translate(x, y)
        c.scale(k, k)
        c.translate(-x, -y)
      }
      fn()
      c.restore()
    }
    const tx = a.topX * s + f * 0.5
    const ty = a.topY * s
    const hw = a.headW * s
    const neck = l.neck
    const face = l.face
    const head = l.head
    if (neck) layer('neck', f * 0.4, a.neckY * s, () => drawAccessory(c, neck, f * 0.4, a.neckY * s, hw))
    layer('hair', tx, ty, () => drawHair(c, l.hair, l.hairColor, tx, ty, hw, Math.max(1.6, s * 0.034)))
    if (face) layer('face', a.eyeX * s + f, a.eyeY * s, () => drawAccessory(c, face, a.eyeX * s + f, a.eyeY * s, hw))
    if (head) layer('head', tx, ty, () => drawAccessory(c, head, tx, ty, hw))
    c.restore()
  }

  const drawComb = (c: Ctx, x: number, y: number, u: number, rot: number): void => {
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    const lw = Math.max(2, u * 0.07)
    for (let i = 0; i < 6; i++) line(c, [-u * (0.2 + i * 0.14), 0, -u * (0.2 + i * 0.14), u * 0.3], lw * 2.2)
    for (let i = 0; i < 6; i++) line(c, [-u * (0.2 + i * 0.14), 0, -u * (0.2 + i * 0.14), u * 0.3], lw * 0.9, '#ffe27a')
    rr(c, -u, -u * 0.13, u * 1.12, u * 0.2, u * 0.08)
    paint(c, '#3db8ff', lw)
    c.restore()
  }

  const drawPets = (c: Ctx, L: Lay): void => {
    const t = game.time
    const cheer = phase !== 'play' || fxT < 1
    const others = pets.map((_, i) => i).filter((i) => i !== client && i !== dresser)
    const hopOf = (i: number): number => (spots[i].hop < 0.45 ? ease.hop(spots[i].hop / 0.45) * spots[i].size * 0.35 : 0)
    for (const i of [...others].reverse()) {
      const sp = spots[i]
      const pose: Pose = { x: sp.x, y: sp.y, size: sp.size, face: 1, squash: Math.sin(t * 3 + i * 1.7) * 0.04, lift: hopOf(i) }
      if (cheer) {
        pose.armL = pose.armR = 2.1 + Math.sin(t * 20 + i) * 0.5
        pose.eyes = 'happy'
        pose.mouth = 'open'
        pose.lift = (pose.lift ?? 0) + Math.abs(Math.sin(t * 8 + i * 2)) * sp.size * 0.12
      }
      drawPet(c, pets[i].species, pets[i].look, pose, t)
    }

    drawStool(c, L)
    const cs = spots[client]
    const cp: Pose = { x: cs.x, y: cs.y, size: cs.size, squash: Math.sin(t * 3) * 0.03, lift: hopOf(client), shadow: false }
    if (phase !== 'play') {
      const turn = clamp(ft / 0.75)
      cp.flip = turn < 1 ? Math.cos(ease.inOut(turn) * TAU) : 1
      if (Math.abs(cp.flip) < 0.06) cp.flip = 0.06
      cp.armL = cp.armR = lerp(0.4, 2.8, clamp(ft / 0.5))
      cp.eyes = 'happy'
      cp.mouth = 'open'
      cp.lift = turn < 1 ? 0 : Math.abs(Math.sin((ft - 0.75) * 9)) * cs.size * 0.14
    } else if (fxT < 0.9) {
      const k = 1 - fxT / 0.9
      cp.lean = Math.sin(fxT * 24) * 0.07 * k
      cp.squash = -0.14 * Math.sin(fxT * 15) * k
      cp.eyes = 'happy'
      cp.mouth = 'open'
    }
    drawClient(c, pets[client], cp, phase === 'play' ? clamp(fxT / 0.35) : 1)

    if (dresser !== client) {
      const ds = spots[dresser]
      const busy = phase === 'play' && fxT < 0.7
      const arm = phase !== 'play' ? 2.6 + Math.sin(t * 20) * 0.3 : busy ? 2.0 + Math.sin(fxT * 28) * 0.5 : 1.9 + Math.sin(t * 2.2) * 0.1
      const pose: Pose = {
        x: ds.x - (busy ? Math.sin((fxT / 0.7) * Math.PI) * ds.size * 0.12 : 0),
        y: ds.y,
        size: ds.size,
        face: -1,
        squash: Math.sin(t * 3 + 2) * 0.04,
        lift: hopOf(dresser) + (phase !== 'play' ? Math.abs(Math.sin(t * 8)) * ds.size * 0.12 : 0),
        shadow: false,
        armL: arm,
        armR: phase !== 'play' ? arm : 0,
        eyes: busy || phase !== 'play' ? 'happy' : 'open',
        mouth: phase !== 'play' ? 'open' : 'smile',
      }
      drawPet(c, pets[dresser].species, pets[dresser].look, pose, t)
      const hand = leftHand(pets[dresser].species, arm, ds.size)
      drawComb(c, pose.x + hand.x, pose.y - (pose.lift ?? 0) + hand.y, ds.size * 0.3, 0.35 + (busy ? Math.sin(fxT * 28) * 0.3 : 0))
    }
  }

  const drawPortraits = (c: Ctx, L: Lay): void => {
    L.portraits.forEach((p, i) => {
      const on = i === client
      const r = p.r * (on ? 1.08 + Math.sin(game.time * 4) * 0.03 : 0.94)
      oval(c, p.x, p.y + 4, r, r)
      paint(c, INK)
      oval(c, p.x, p.y, r, r)
      paint(c, SHELLS[pets[i].slot % SHELLS.length].light, 3)
      c.save()
      c.clip()
      drawPet(c, pets[i].species, pets[i].look, { x: p.x, y: p.y + r * 1.5, size: r * 2.3, shadow: false, eyes: on ? 'happy' : 'open' }, game.time)
      c.restore()
      oval(c, p.x, p.y, r, r)
      paint(c, null, 3)
      if (on) {
        oval(c, p.x, p.y, r + 5, r + 5)
        c.lineWidth = 4
        c.strokeStyle = '#ffb21f'
        c.stroke()
      }
    })
  }

  const drawTile = (c: Ctx, tl: Tile, L: Lay): void => {
    const pop = bump.id === tl.id && bump.t < 0.3 ? 1 + ease.hop(bump.t / 0.3) * 0.12 : 1
    const s = (L.s - 8) * pop
    const l = look()
    c.save()
    c.translate(tl.x, tl.y)
    rr(c, -s / 2, -s / 2 + 4, s, s, s * 0.26)
    paint(c, INK)
    rr(c, -s / 2, -s / 2, s, s, s * 0.26)
    paint(c, tl.kind !== 'item' ? '#b9a9cf' : tl.selected ? '#fff3b0' : '#ffffff', 3)
    if (tl.kind !== 'item') {
      const d = tl.kind === 'prev' ? -1 : 1
      c.beginPath()
      c.moveTo(d * s * 0.24, 0)
      c.lineTo(-d * s * 0.14, -s * 0.24)
      c.lineTo(-d * s * 0.14, s * 0.24)
      c.closePath()
      paint(c, '#fff', 3)
    } else if (tab === 'hair') headIcon(c, 0, 0, s * 0.96, tl.id as HairId, l.hairColor)
    else if (tab === 'color') blob(c, 0, 0, s * 0.3, hairFill(c, +tl.id, 0, s * 0.3), +tl.id * 1.7)
    else drawItem(c, tl.id, 0, 0, s * 0.62)
    if (tl.selected) {
      rr(c, -s / 2 + 3, -s / 2 + 3, s - 6, s - 6, s * 0.22)
      c.lineWidth = 5
      c.strokeStyle = '#ff9a3d'
      c.stroke()
      oval(c, s * 0.36, -s * 0.36, s * 0.15, s * 0.15)
      paint(c, '#44cf8a', 2.5)
      c.translate(s * 0.36, -s * 0.36)
      line(c, [-s * 0.07, 0, -s * 0.015, s * 0.055, s * 0.075, -s * 0.055], Math.max(2.5, s * 0.04), '#fff')
    }
    c.restore()
  }

  /** Nothing to wear yet: gifts and wire bows will land in this box. */
  const drawEmpty = (c: Ctx, L: Lay): void => {
    const g = L.grid
    const u = Math.min(g.w / 4.4, g.h * 0.62, 120)
    const cx = g.x + g.w / 2
    const cy = g.y + g.h / 2
    const bob = Math.sin(game.time * 3) * u * 0.05
    drawGiftBox(c, cx - u * 1.55, cy + u * 0.05 + bob, u * 0.95)
    drawWire(c, 'bow', 0, cx - u * 0.5, cy - bob, u * 0.8)
    const ax = cx + u * 0.3 + Math.sin(game.time * 4) * u * 0.06
    line(c, [ax, cy, ax + u * 0.42, cy, ax + u * 0.24, cy - u * 0.16, ax + u * 0.42, cy, ax + u * 0.24, cy + u * 0.16], Math.max(5, u * 0.09))
    c.save()
    c.setLineDash([u * 0.12, u * 0.1])
    rr(c, cx + u * 1.0, cy - u * 0.5, u, u, u * 0.26)
    paint(c, 'rgba(255,255,255,0.7)', 3)
    c.restore()
    c.globalAlpha = 0.35
    drawItem(c, 'g:crown', cx + u * 1.5, cy, u * 0.6)
    c.globalAlpha = 1
  }

  const drawPanel = (c: Ctx, L: Lay): void => {
    const p = L.panel
    rr(c, p.x, p.y + 5, p.w, p.h, 26)
    paint(c, 'rgba(59,42,74,0.25)')
    rr(c, p.x, p.y, p.w, p.h, 26)
    paint(c, 'rgba(255,255,255,0.82)', 3)
    const pressed = [...held.values()]
    for (const tb of L.tabs) {
      const on = tb.id === tab
      button(c, on ? { ...tb.r, y: tb.r.y - 2 } : tb.r, {
        color: on ? TAB_COLOR[tb.id] : '#d5cae3',
        pressed: pressed.includes(tb.id),
        icon: (cc, s) => tabIcon(tb.id, cc, s),
        glow: on ? 0.8 : 0,
      })
      if (on) {
        // A little tongue ties the active tab to its tiles.
        const mx = tb.r.x + tb.r.w / 2
        c.beginPath()
        c.moveTo(mx - 9, tb.r.y + tb.r.h + 6)
        c.lineTo(mx + 9, tb.r.y + tb.r.h + 6)
        c.lineTo(mx, tb.r.y + tb.r.h + 15)
        c.closePath()
        paint(c, TAB_COLOR[tb.id], 2.5)
      }
    }
    button(c, L.done, { color: '#44cf8a', pressed: pressed.includes('done'), icon: tick, glow: changes ? 0.5 + 0.5 * Math.sin(game.time * 4) : 0, dim: phase !== 'play' })
    const ts = tiles(L)
    if (!ts.length) drawEmpty(c, L)
    for (const tl of ts) drawTile(c, tl, L)
  }

  const draw = (c: Ctx): void => {
    const L = lay()
    drawRoom(c, game, ctx.shell, L.floor - L.size * 0.14)
    drawSalon(c, L)
    drawPets(c, L)
    drawPortraits(c, L)
    drawPanel(c, L)
    fx.draw(c)
  }

  // ------------------------------------------------------------------ fingers

  const controlAt = (p: Pt, L: Lay): string | null => {
    if (hit(L.done, p, 8)) return 'done'
    return L.tabs.find((tb) => hit(tb.r, p, 4))?.id ?? null
  }

  const tap = (p: Pointer): void => {
    if (phase !== 'play') return
    const L = lay()
    const control = controlAt(p, L)
    if (control === 'done') return finish(L)
    if (control) return setTab(control as Tab)
    if (hit(L.panel, p)) {
      let best: Tile | null = null
      for (const tl of tiles(L)) if (!best || Math.hypot(tl.x - p.x, tl.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = tl
      if (!best || Math.hypot(best.x - p.x, best.y - p.y) > L.s * 0.75) return
      bump = { id: best.id, t: 0 }
      if (best.kind === 'item') return choose(best.id, L)
      page += best.kind === 'next' ? 1 : -1
      game.sfx.play('tap')
      return
    }
    const pi = L.portraits.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r * 1.35)
    if (pi >= 0) return setClient(pi)
    // Tapping a pet in the room works too; the client is checked last, it is the biggest.
    const order = pets.map((_, i) => i).sort((a, b) => spots[a].size - spots[b].size)
    const i = order.find((k) => Math.abs(p.x - spots[k].x) < spots[k].size * 0.45 && p.y < spots[k].y + 12 && p.y > spots[k].y - spots[k].size * 1.15)
    if (i !== undefined) setClient(i)
  }

  const debug = (): object => {
    const L = lay()
    const mid = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
    const ts = tiles(L)
    const arrow = (kind: Tile['kind']): Pt | null => {
      const tl = ts.find((v) => v.kind === kind)
      return tl ? { x: tl.x, y: tl.y } : null
    }
    return {
      phase,
      done: phase === 'done',
      client,
      tab,
      tabs: L.tabs.map((tb) => ({ id: tb.id, ...mid(tb.r) })),
      tiles: ts.filter((tl) => tl.kind === 'item').map((tl) => ({ id: tl.id, x: tl.x, y: tl.y, selected: tl.selected })),
      pager: { prev: arrow('prev'), next: arrow('next') },
      portraits: L.portraits.map((p) => ({ x: p.x, y: p.y })),
      doneBtn: mid(L.done),
      look: { ...look() },
    }
  }

  return {
    enter() {
      game.sfx.loop('salon')
    },
    leave() {
      held.clear()
      fx.bits = []
    },
    resize() {
      for (const sp of spots) sp.set = false
    },
    update,
    draw,
    down(p: Pointer) {
      if (phase !== 'play') return
      const control = controlAt(p, lay())
      if (control) held.set(p.id, control)
    },
    up(p: Pointer) {
      held.delete(p.id)
    },
    tap,
    debug,
  }
}
