/**
 * Тамагочи Связь — «Бантики». The pets sit at a craft table with a jar of fuzzy
 * wires. In turn each one makes a thing: the child picks a wire, picks a shape,
 * bends the wire by following the dots with a finger, and gives the finished
 * craft to one of the pets to wear.
 */
import {
  INK,
  Particles,
  WIRE_COLORS,
  WIRE_SHAPES,
  clamp,
  dist,
  drawRoom,
  ease,
  heart,
  hit,
  lerp,
  oval,
  paint,
  rr,
  type Activity,
  type Ctx,
  type Pointer,
  type Pt,
  type Rect,
  type Scene,
  type WireShape,
} from './tamagochi-kit.ts'
import { drawPet, drawWire, slotOf, wirePath, type Pose } from './tamagochi-pets.ts'

type Phase = 'color' | 'pick' | 'shape' | 'trace' | 'made' | 'give' | 'fly' | 'worn' | 'end'

interface Lines {
  wire: string
  shape: string
  trace: string
  give: string
  names: Record<WireShape, string>
  praise: string[]
  end: string
}
const LINES: Record<'ru' | 'de' | 'en', Lines> = {
  ru: {
    wire: 'Выбери проволоку!',
    shape: 'Что сделаем?',
    trace: 'Гни проволоку: веди пальчиком по точкам!',
    give: 'Кому подарим?',
    names: { bow: 'Бантик!', heart: 'Сердечко!', star: 'Звёздочка!', flower: 'Цветочек!', butterfly: 'Бабочка!', crown: 'Корона!', glasses: 'Очки!' },
    praise: ['Как красиво!', 'Красота!', 'Вот здорово!'],
    end: 'Все нарядные! Молодцы!',
  },
  de: {
    wire: 'Such dir einen Draht aus!',
    shape: 'Was basteln wir?',
    trace: 'Bieg den Draht: Fahr mit dem Finger die Punkte entlang!',
    give: 'Wer bekommt es?',
    names: { bow: 'Eine Schleife!', heart: 'Ein Herz!', star: 'Ein Stern!', flower: 'Eine Blume!', butterfly: 'Ein Schmetterling!', crown: 'Eine Krone!', glasses: 'Eine Brille!' },
    praise: ['Wie schön!', 'Wunderschön!', 'Toll!'],
    end: 'Alle sind schick! Super gemacht!',
  },
  en: {
    wire: 'Choose a wire!',
    shape: 'What shall we make?',
    trace: 'Bend the wire: follow the dots with your finger!',
    give: 'Who gets it?',
    names: { bow: 'A bow!', heart: 'A heart!', star: 'A star!', flower: 'A flower!', butterfly: 'A butterfly!', crown: 'A crown!', glasses: 'Glasses!' },
    praise: ['So pretty!', 'Beautiful!', 'Lovely!'],
    end: 'Everyone looks great! Well done!',
  },
}

interface Layout {
  table: Rect
  /** Size of the traced shape. */
  S: number
  cx: number
  cy: number
  feetY: number
  floorY: number
  /** Standing spots, nearest to the table first; the maker takes the first. */
  slots: { x: number; size: number }[]
}

/** How many path points ahead of the wire's end a finger may pull it. Small, so crossings cannot be skipped. */
const LOOK = 8
const N_WIRES = WIRE_COLORS.length

export const bowsGame: Activity = (ctx) => {
  const { game, pets } = ctx
  const n = pets.length
  const rounds = Math.min(n, 3)
  const shapes: WireShape[] = WIRE_SHAPES.slice(0, Math.min(WIRE_SHAPES.length, 2 + ctx.times))
  const fx = new Particles()
  const mids = new Map<WireShape, number>()

  let phase: Phase = 'color'
  let pt = 0
  let round = 0
  let color = 0
  let shape: WireShape = 'bow'
  let idx = 0
  let tracer: number | null = null
  let last: Pt = { x: 0, y: 0 }
  let finger: Pt | null = null
  let idle = 0
  let craft: Pt = { x: 0, y: 0 }
  let from: Pt = { x: 0, y: 0 }
  let drag: number | null = null
  let receiver = 0
  let finished = false
  let gone = false
  // The host announces the activity first; our first line waits for it.
  let intro = 1.5
  const xs: number[] = pets.map(() => NaN)
  const hop: number[] = pets.map(() => 9)

  const T = (): Lines => LINES[game.lang as keyof typeof LINES] ?? LINES.en
  const go = (next: Phase): void => {
    phase = next
    pt = 0
  }
  const maker = (): number => Math.min(round, rounds - 1)
  /** Vertical middle of a shape's path, so it can be centred. */
  const midOf = (s: WireShape): number => {
    let m = mids.get(s)
    if (m === undefined) {
      const ys = wirePath(s).map((p) => p.y)
      m = (Math.min(...ys) + Math.max(...ys)) / 2
      mids.set(s, m)
    }
    return m
  }

  // ---------------------------------------------------------------- layout

  const layout = (): Layout => {
    const { w, h, safe } = game
    const top = safe.y + 8
    const feetY = h - Math.max(66, h * 0.1)
    if (w > h * 1.15) {
      // Table in the middle, pets on both sides.
      const leg = Math.max(18, h * 0.05)
      const availH = feetY - leg - top
      const S = Math.min(availH * 0.84, w * 0.4, 560)
      const tw = Math.min(S * 1.36, w * 0.6)
      const th = Math.min(availH, S * 1.25)
      const table = { x: (w - tw) / 2, y: feetY - leg - th, w: tw, h: th }
      const side = table.x - 6
      const nl = Math.ceil(n / 2)
      const size = Math.min(190, (side / nl) * 0.78, h * 0.3)
      const slots = pets.map((_, k) => {
        const left = k % 2 === 0
        const lane = side / (left ? nl : n - nl)
        const off = lane * (Math.floor(k / 2) + 0.5)
        return { x: left ? table.x - off : table.x + tw + off, size }
      })
      return { table, S, cx: w / 2, cy: table.y + th / 2, feetY, floorY: feetY - size * 0.3, slots }
    }
    // Table on top, pets in a row in front of it.
    const lane = w / n
    const size = Math.min(170, lane * 0.66, h * 0.2)
    const availH = feetY - size * 1.3 - top
    const tw = Math.min(w - 28, 600)
    const S = Math.min(tw * 0.8, availH * 0.8, 470)
    const th = Math.min(availH, S * 1.4)
    const table = { x: (w - tw) / 2, y: top + (availH - th) / 2, w: tw, h: th }
    const order = pets.map((_, i) => i).sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2))
    const slots = order.map((i) => ({ x: lane * (i + 0.5), size }))
    return { table, S, cx: w / 2, cy: table.y + th / 2, feetY, floorY: feetY - size * 0.3, slots }
  }

  const slotOfPet = (i: number, L: Layout): { x: number; size: number } => {
    const m = maker()
    const s = L.slots[i === m ? 0 : i < m ? i + 1 : i]
    return i === m ? { x: s.x, size: s.size * 1.12 } : s
  }

  const jar = (L: Layout): Rect => {
    const h = Math.min(L.S * 0.4, L.table.h * 0.3)
    const w = h * 0.86
    return { x: L.cx - w / 2, y: L.table.y + L.table.h - 14 - h, w, h }
  }

  /** One wire in the jar: from the bottom through the mouth, fanning out to its tip. */
  const wireGeo = (i: number, L: Layout): { bottom: Pt; mouth: Pt; tip: Pt; tap: Pt } => {
    const j = jar(L)
    const len = Math.min(L.table.h - j.h - 42, (L.table.w / 2 - 30 - j.w * 0.3) / 0.87)
    const a = (i - (N_WIRES - 1) / 2) * 0.42 + Math.sin(game.time * 1.7 + i * 1.3) * 0.04
    const u = (i - (N_WIRES - 1) / 2) / N_WIRES
    const mouth = { x: L.cx + u * j.w * 0.7, y: j.y }
    const tip = { x: mouth.x + Math.sin(a) * len, y: mouth.y - Math.cos(a) * len }
    return {
      bottom: { x: L.cx - u * j.w * 0.5, y: j.y + j.h - 8 },
      mouth,
      tip,
      tap: { x: lerp(mouth.x, tip.x, 0.72), y: lerp(mouth.y, tip.y, 0.72) },
    }
  }

  const cards = (L: Layout): { id: WireShape; r: Rect }[] => {
    const gap = 12
    const aw = L.table.w - 28
    const ah = L.table.h - 28
    const count = shapes.length
    let cols = count
    let size = 0
    for (let c = 1; c <= count; c++) {
      const rows = Math.ceil(count / c)
      const s = Math.min((aw - gap * (c - 1)) / c, (ah - gap * (rows - 1)) / rows)
      if (s > size) {
        size = s
        cols = c
      }
    }
    size = Math.min(size, L.S * 0.72)
    const rows = Math.ceil(count / cols)
    const y0 = L.cy - (rows * size + (rows - 1) * gap) / 2
    return shapes.map((id, i) => {
      const row = Math.floor(i / cols)
      const inRow = row === rows - 1 ? count - row * cols : cols
      const x0 = L.cx - (inRow * size + (inRow - 1) * gap) / 2
      return { id, r: { x: x0 + (i % cols) * (size + gap), y: y0 + row * (size + gap), w: size, h: size } }
    })
  }

  /** The path of the current shape in stage coordinates. */
  const tracePts = (L: Layout): Pt[] => {
    const k = L.S / 2
    const oy = L.cy - midOf(shape) * k
    return wirePath(shape).map((p) => ({ x: L.cx + p.x * k, y: oy + p.y * k }))
  }

  const petBody = (i: number, L: Layout): Pt => ({ x: xs[i], y: L.feetY - slotOfPet(i, L).size * 0.48 })
  const petNear = (p: Pt, L: Layout, pad: number): number => {
    let best = -1
    let bd = Infinity
    pets.forEach((_, i) => {
      const s = slotOfPet(i, L).size
      const dx = Math.abs(p.x - xs[i])
      const dy = p.y - L.feetY
      if (dx < s * pad && dy < s * 0.35 && dy > -s * (0.75 + pad * 0.6) && dx < bd) {
        bd = dx
        best = i
      }
    })
    return best
  }
  const craftHome = (L: Layout): Pt => ({ x: L.cx, y: L.cy })

  // ---------------------------------------------------------------- flow

  const pickColor = (i: number): void => {
    color = i
    intro = 0
    game.sfx.play('pop')
    game.sfx.play('twang', i)
    go('pick')
  }

  const pickShape = (id: WireShape, L: Layout): void => {
    shape = id
    idx = 0
    idle = 0
    tracer = null
    finger = null
    game.sfx.play('pop')
    game.say(T().trace, round > 0)
    const c = cards(L).find((k) => k.id === id)
    if (c) fx.burst('spark', c.r.x + c.r.w / 2, c.r.y + c.r.h / 2, 8, { color: WIRE_COLORS[color], size: 18 })
    go('trace')
  }

  const advance = (p: Pt, L: Layout): void => {
    const pts = tracePts(L)
    const tol = Math.max(44, L.S * 0.09)
    let best = -1
    for (let j = idx + 1; j <= Math.min(idx + LOOK, pts.length - 1); j++) if (dist(pts[j], p) < tol) best = j
    if (best < 0) return
    const step = (v: number): number => Math.floor((v / pts.length) * 12)
    if (step(best) !== step(idx)) {
      game.sfx.play('twang', step(best))
      if (n > 1 && step(best) % 3 === 0) hop[(maker() + 1 + Math.floor(game.rnd() * (n - 1))) % n] = 0
    }
    idx = best
    idle = 0
    const tip = pts[idx]
    fx.add('spark', tip.x, tip.y, {
      vx: (game.rnd() - 0.5) * 120,
      vy: -40 - game.rnd() * 90,
      g: 200,
      size: 12 + game.rnd() * 8,
      max: 0.6,
      color: game.rnd() < 0.5 ? '#fff' : WIRE_COLORS[color],
    })
    if (idx >= pts.length - 2) {
      idx = pts.length - 1
      tracer = null
      finger = null
      ctx.own(`w:${shape}:${color}`)
      game.sfx.play('yay')
      game.say(T().names[shape])
      fx.burst('star', L.cx, L.cy, 12, { size: 22, speed: 260 })
      fx.burst('spark', tip.x, tip.y, 8, { color: WIRE_COLORS[color], size: 20 })
      hop.fill(0)
      go('made')
    }
  }

  /** Follow the finger in small steps, so a quick stroke does not lose the wire. */
  const feed = (p: Pt): void => {
    const L = layout()
    const steps = Math.max(1, Math.ceil(dist(last, p) / 8))
    for (let s = 1; s <= steps && phase === 'trace'; s++) advance({ x: lerp(last.x, p.x, s / steps), y: lerp(last.y, p.y, s / steps) }, L)
    last = { x: p.x, y: p.y }
    if (phase === 'trace') finger = last
  }

  const give = (i: number): void => {
    receiver = i
    drag = null
    from = { ...craft }
    game.sfx.play('whee')
    go('fly')
  }

  const wear = (L: Layout): void => {
    const id = `w:${shape}:${color}`
    const pet = pets[receiver]
    const slot = slotOf(id)
    if (slot) pet.look[slot] = id
    const s = slotOfPet(receiver, L).size
    const head = { x: xs[receiver], y: L.feetY - s * 0.9 }
    hop[receiver] = 0
    game.sfx.play('gift')
    game.sfx.note(76, 0.35, pet.species)
    game.sfx.note(79, 0.4, pet.species, 0.18)
    fx.burst('star', head.x, head.y, 9, { size: 18 })
    if (receiver !== maker()) {
      game.sfx.play('heart')
      fx.burst('heart', (xs[receiver] + xs[maker()]) / 2, L.feetY - s * 1.1, 7, { size: 22, speed: 120 })
      fx.burst('heart', head.x, head.y, 5, { size: 18, speed: 110 })
    }
    game.say(T().praise[round % T().praise.length], true)
    go('worn')
  }

  const nextRound = (): void => {
    if (round + 1 >= rounds) {
      game.sfx.play('ready')
      game.say(T().end)
      return go('end')
    }
    round++
    game.say(T().wire, true)
    go('color')
  }

  // ---------------------------------------------------------------- drawing

  const fuzzy = (c: Ctx, color: string, width: number): void => {
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.lineWidth = width + Math.max(3, width * 0.4)
    c.strokeStyle = INK
    c.stroke()
    c.lineWidth = width
    c.strokeStyle = color
    c.stroke()
    c.setLineDash([width * 0.18, width * 0.55])
    c.lineWidth = width * 0.7
    c.strokeStyle = 'rgba(255,255,255,0.55)'
    c.stroke()
    c.setLineDash([])
  }

  const drawTable = (c: Ctx, L: Layout): void => {
    const t = L.table
    const legW = Math.max(12, t.w * 0.045)
    const legBottom = L.floorY + Math.max(10, (L.feetY - L.floorY) * 0.6)
    oval(c, L.cx, legBottom, t.w * 0.5, Math.max(6, t.w * 0.03))
    paint(c, 'rgba(59,42,74,0.12)')
    for (const side of [-1, 1]) {
      rr(c, L.cx + side * t.w * 0.36 - legW / 2, t.y + t.h - 20, legW, legBottom - (t.y + t.h - 20), legW * 0.4)
      paint(c, '#d99a5b', 3)
    }
    rr(c, t.x, t.y + 7, t.w, t.h, 26)
    paint(c, '#c98a4e', 3)
    rr(c, t.x, t.y, t.w, t.h, 26)
    paint(c, '#f6c98c', 3.5)
    // The craft mat.
    rr(c, t.x + 9, t.y + 9, t.w - 18, t.h - 18, 19)
    paint(c, '#fffaf0')
    c.lineWidth = 2
    c.strokeStyle = '#ecd2a6'
    c.setLineDash([7, 7])
    rr(c, t.x + 15, t.y + 15, t.w - 30, t.h - 30, 14)
    c.stroke()
    c.setLineDash([])
  }

  const drawJar = (c: Ctx, L: Layout): void => {
    const j = jar(L)
    const k = phase === 'pick' ? clamp(pt / 0.6) : 0
    const width = clamp(L.S * 0.04, 8, 15)
    const strand = (i: number, lift: number): void => {
      const g = wireGeo(i, L)
      c.beginPath()
      c.moveTo(g.bottom.x, g.bottom.y - lift)
      c.lineTo(g.mouth.x, g.mouth.y - lift)
      c.quadraticCurveTo(lerp(g.mouth.x, g.tip.x, 0.5), lerp(g.mouth.y, g.tip.y, 0.62) - lift, g.tip.x, g.tip.y - lift)
      fuzzy(c, WIRE_COLORS[i], width)
    }
    c.save()
    c.globalAlpha = 1 - ease.in(k)
    for (let i = 0; i < N_WIRES; i++) if (phase !== 'pick' || i !== color) strand(i, 0)
    c.restore()
    // The chosen wire hops out of the jar.
    if (phase === 'pick') strand(color, ease.out(k) * j.h * 1.1 + ease.hop(k) * j.h * 0.5)
    c.save()
    c.globalAlpha = 1 - ease.in(k)
    rr(c, j.x, j.y, j.w, j.h, j.w * 0.24)
    paint(c, 'rgba(176,226,255,0.62)', 3.5)
    rr(c, j.x + j.w * 0.14, j.y + j.h * 0.16, j.w * 0.13, j.h * 0.6, j.w * 0.06)
    paint(c, 'rgba(255,255,255,0.75)')
    heart(c, j.x + j.w * 0.56, j.y + j.h * 0.56, j.w * 0.42, '#ff8fb0')
    rr(c, j.x - 5, j.y - 7, j.w + 10, 14, 7)
    paint(c, '#d9f1ff', 3)
    c.restore()
  }

  const drawCards = (c: Ctx, L: Layout): void => {
    cards(L).forEach((card, i) => {
      const k = ease.back(clamp((pt - i * 0.07) / 0.3))
      if (k <= 0) return
      const r = card.r
      c.save()
      c.translate(r.x + r.w / 2, r.y + r.h / 2 + Math.sin(game.time * 2.4 + i * 1.3) * 3)
      c.scale(k, k)
      rr(c, -r.w / 2, -r.h / 2 + 5, r.w, r.h, r.w * 0.2)
      paint(c, INK)
      rr(c, -r.w / 2, -r.h / 2, r.w, r.h, r.w * 0.2)
      paint(c, '#fff', 3)
      const s = r.w * 0.6
      c.rotate(Math.sin(game.time * 1.8 + i) * 0.05)
      drawWire(c, card.id, color, 0, -midOf(card.id) * s * 0.5, s)
      c.restore()
    })
  }

  const drawTrace = (c: Ctx, L: Layout): void => {
    const pts = tracePts(L)
    const col = WIRE_COLORS[color]
    const appear = clamp(pt / 0.35)
    const dot = Math.max(2.6, L.S * 0.011)
    const sparse = L.S * 0.025 < 8 ? 2 : 1
    c.save()
    c.globalAlpha = appear
    for (let j = pts.length - 1; j > idx; j--) {
      const near = j - idx
      if (near > 14) {
        if (j % sparse) continue
        oval(c, pts[j].x, pts[j].y, dot, dot)
        paint(c, 'rgba(59,42,74,0.3)')
      } else {
        // The next stretch glows in the wire's colour and runs ahead, showing the way.
        const wave = 0.5 + 0.5 * Math.sin(game.time * 8 - near * 0.6)
        const r = dot * (1.5 + wave * 0.9)
        oval(c, pts[j].x, pts[j].y, r, r)
        paint(c, col, 1.6)
      }
    }
    c.restore()
    if (idx > 0) drawWire(c, shape, color, L.cx, L.cy - midOf(shape) * L.S * 0.5, L.S, (idx + 1) / pts.length)
    // Where to put the finger.
    const end = pts[idx]
    const pulse = 1 + Math.sin(game.time * 6) * 0.16
    const ring = Math.max(20, L.S * 0.075) * pulse
    oval(c, end.x, end.y, ring, ring)
    c.lineWidth = 7
    c.strokeStyle = INK
    c.stroke()
    c.lineWidth = 3.5
    c.strokeStyle = '#fff'
    c.stroke()
    oval(c, end.x, end.y, ring * 0.5, ring * 0.5)
    paint(c, col, 3)
  }

  const ghost = (c: Ctx, p: Pt, L: Layout, press = 0): void => {
    const r = clamp(L.S * 0.045, 11, 19)
    c.save()
    c.globalAlpha = 0.92
    c.translate(p.x, p.y + press)
    c.rotate(-0.32)
    rr(c, -r, -r * 0.25, r * 2, r * 3.7, r)
    paint(c, '#fff', 3)
    rr(c, -r * 0.5, r * 0.05, r, r * 0.85, r * 0.4)
    paint(c, '#ffd3e2')
    c.restore()
  }

  /** A ghost finger that shows what to do when nothing has happened for a while. */
  const drawHint = (c: Ctx, L: Layout): void => {
    const bob = Math.abs(Math.sin(game.time * 4)) * 10
    if (phase === 'trace') {
      if (tracer !== null && idle < 4) return
      if (idle < (round === 0 && idx === 0 ? 1.8 : 4)) return
      const pts = tracePts(L)
      const k = clamp(((idle * 0.75) % 1.4) / 1.0)
      const at = pts[Math.min(pts.length - 1, idx + Math.round(ease.inOut(k) * 22))]
      ghost(c, at, L)
    } else if (pt > 5 && drag === null) {
      if (phase === 'color') ghost(c, wireGeo(Math.floor(pt / 2.5) % N_WIRES, L).tap, L, -bob)
      else if (phase === 'shape') ghost(c, { x: L.cx, y: cards(L)[Math.floor(pt / 2.5) % shapes.length].r.y + cards(L)[0].r.h * 0.6 }, L, -bob)
      else if (phase === 'give') ghost(c, petBody(Math.floor(pt / 2.5) % n, L), L, -bob)
    }
  }

  const craftSize = (L: Layout): number => L.S * 0.55
  const drawCraft = (c: Ctx, x: number, y: number, size: number, turn: number): void => {
    c.save()
    c.translate(x, y)
    c.rotate(turn)
    drawWire(c, shape, color, 0, -midOf(shape) * size * 0.5, size)
    c.restore()
  }

  const poseOf = (i: number, L: Layout): Pose => {
    const t = game.time
    const slot = slotOfPet(i, L)
    const s = slot.size
    const x = xs[i]
    const isMaker = i === maker()
    const focus = phase === 'trace' && finger ? finger.x : phase === 'give' || phase === 'fly' ? craft.x : L.cx
    const pose: Pose = { x, y: L.feetY, size: s, face: clamp((focus - x) / (s * 1.3), -1, 1), squash: Math.sin(t * 3 + i * 1.7) * 0.04 }
    if (Math.abs(slot.x - x) > 4) {
      pose.walk = t * 13
      pose.face = Math.sign(slot.x - x)
      return pose
    }
    if (phase === 'color' || phase === 'pick' || phase === 'shape') {
      if (isMaker) {
        pose.armL = pose.armR = 1.5 + Math.sin(t * 5) * 0.25
        pose.mouth = 'open'
      }
    } else if (phase === 'trace') {
      if (isMaker) {
        const busy = tracer !== null
        pose.armL = 1.9 + Math.sin(t * 9) * (busy ? 0.3 : 0.08)
        pose.armR = 1.9 + Math.cos(t * 9) * (busy ? 0.3 : 0.08)
        pose.eyes = busy ? 'wide' : 'open'
        pose.mouth = busy ? 'o' : 'smile'
      }
    } else if (phase === 'made') {
      pose.eyes = 'happy'
      pose.mouth = 'open'
      pose.armL = pose.armR = 2.6
    } else if (phase === 'give') {
      pose.armL = 2.3 + Math.sin(t * 8 + i) * 0.4
      pose.armR = 2.3 + Math.cos(t * 8 + i) * 0.4
      pose.mouth = 'open'
      pose.lift = Math.max(0, Math.sin(t * 6 + i * 2.1)) * s * 0.08
      if (drag !== null && petNear(craft, L, 0.95) === i) pose.eyes = 'wide'
    } else if (phase === 'fly') {
      if (i === receiver) {
        pose.armL = pose.armR = 2.8
        pose.eyes = 'wide'
        pose.mouth = 'o'
      }
    } else if (phase === 'worn') {
      const k = clamp(pt / 1.7)
      if (i === receiver) {
        pose.lift = Math.abs(Math.sin(pt * 7)) * s * 0.2 * (1 - k)
        pose.eyes = 'happy'
        pose.mouth = 'open'
        pose.armL = pose.armR = 2.7
        pose.face = 0
        pose.lean = Math.sin(pt * 6) * 0.1
      } else {
        pose.face = clamp((xs[receiver] - x) / (s * 1.3), -1, 1)
        pose.eyes = i === maker() ? 'heart' : 'happy'
        pose.armL = 1.6 + Math.sin(t * 14) * 0.5
        pose.armR = 1.6 - Math.sin(t * 14) * 0.5
      }
    } else {
      pose.lift = Math.abs(Math.sin(pt * 7 + i * 1.3)) * s * 0.22
      pose.eyes = 'happy'
      pose.mouth = 'open'
      pose.armL = pose.armR = 2.7
      pose.face = 0
      pose.lean = Math.sin(pt * 5 + i) * 0.12
    }
    const h = hop[i]
    if (h < 0.5 && phase !== 'worn' && phase !== 'end') {
      pose.lift = (pose.lift ?? 0) + ease.hop(h / 0.5) * s * 0.2
      pose.eyes = 'happy'
      if (!isMaker || phase !== 'trace') pose.armL = pose.armR = 2.5
    }
    return pose
  }

  // ---------------------------------------------------------------- scene

  const scene: Scene = {
    enter() {
      game.sfx.loop('craft')
    },
    leave() {
      gone = true
      tracer = null
      drag = null
    },
    resize() {
      xs.fill(NaN)
    },

    update(dt) {
      if (gone) return
      const L = layout()
      pt += dt
      fx.update(dt)
      const speed = Math.max(280, game.w * 0.55) * dt
      pets.forEach((_, i) => {
        hop[i] += dt
        const target = slotOfPet(i, L).x
        xs[i] = Number.isNaN(xs[i]) ? target : xs[i] + clamp(target - xs[i], -speed, speed)
      })
      if (intro > 0) {
        intro -= dt
        if (intro <= 0 && phase === 'color') game.say(T().wire)
      }
      if (phase === 'pick') {
        if (pt > 0.6) {
          game.say(T().shape, round > 0)
          go('shape')
        }
      } else if (phase === 'trace') idle += dt
      else if (phase === 'made') {
        if (game.rnd() < dt * 9) {
          const a = game.rnd() * Math.PI * 2
          fx.add('spark', L.cx + Math.cos(a) * L.S * 0.5, L.cy + Math.sin(a) * L.S * 0.5, { vy: -30, size: 20, max: 0.7, color: game.rnd() < 0.5 ? '#ffd23d' : WIRE_COLORS[color] })
        }
        if (pt > 1.7) {
          craft = craftHome(L)
          drag = null
          game.say(T().give)
          go('give')
        }
      } else if (phase === 'give') {
        if (drag === null) {
          const home = craftHome(L)
          const k = 1 - Math.exp(-dt * 10)
          craft = { x: lerp(craft.x, home.x, k), y: lerp(craft.y, home.y, k) }
        }
      } else if (phase === 'fly') {
        if (pt > 0.45) wear(L)
      } else if (phase === 'worn') {
        if (pt > 1.7) nextRound()
      } else if (phase === 'end') {
        if (pt - dt < 0.05 || (pt - dt < 0.75 && pt >= 0.75)) {
          fx.burst('confetti', game.w * 0.3, game.h * 0.4, 22, { speed: 380, size: 20, max: 1.6 })
          fx.burst('confetti', game.w * 0.7, game.h * 0.4, 22, { speed: 380, size: 20, max: 1.6 })
        }
        if (pt > 1.9 && !finished) {
          finished = true
          ctx.done(3)
        }
      }
    },

    draw(c) {
      const L = layout()
      drawRoom(c, game, ctx.shell, L.floorY)
      drawTable(c, L)
      if (phase === 'color' || phase === 'pick') drawJar(c, L)
      else if (phase === 'shape') drawCards(c, L)
      else if (phase === 'trace') drawTrace(c, L)
      else if (phase === 'made') {
        // Twisted closed: the finished shape spins once and grows.
        const grow = 1 + 0.16 * ease.back(clamp(pt / 0.5)) - 0.16 * ease.inOut(clamp((pt - 1.2) / 0.5))
        c.save()
        c.translate(L.cx, L.cy)
        c.scale(grow * Math.cos(ease.inOut(clamp(pt / 0.9)) * Math.PI * 2), grow)
        drawWire(c, shape, color, 0, -midOf(shape) * L.S * 0.5, L.S)
        c.restore()
      }

      const front = phase === 'fly' || phase === 'worn' ? receiver : maker()
      for (let i = 0; i < n; i++) if (i !== front && !Number.isNaN(xs[i])) drawPet(c, pets[i].species, pets[i].look, poseOf(i, L), game.time)
      if (!Number.isNaN(xs[front])) drawPet(c, pets[front].species, pets[front].look, poseOf(front, L), game.time)

      if (phase === 'give') {
        const size = craftSize(L) * (drag === null ? 1 : 0.8)
        const bob = drag === null ? Math.sin(game.time * 3) * L.S * 0.03 : 0
        const shrink = lerp(L.S, size, ease.out(clamp(pt / 0.3)))
        drawCraft(c, craft.x, craft.y + bob, shrink, Math.sin(game.time * 2.2) * 0.1)
      } else if (phase === 'fly') {
        const k = ease.inOut(clamp(pt / 0.45))
        const s = slotOfPet(receiver, L).size
        const x = lerp(from.x, xs[receiver], k)
        const y = lerp(from.y, L.feetY - s * 0.9, k) - ease.hop(k) * s * 0.4
        drawCraft(c, x, y, lerp(craftSize(L) * 0.8, s * 0.36, k), k * Math.PI * 2)
      }
      fx.draw(c)
      drawHint(c, L)
    },

    down(p: Pointer) {
      if (gone) return
      if (phase === 'trace' && tracer === null) {
        tracer = p.id
        last = { x: p.x, y: p.y }
        feed(p)
      } else if (phase === 'give' && drag === null && pt > 0.3) {
        const L = layout()
        if (dist(p, craft) < Math.max(56, craftSize(L) * 0.7)) {
          drag = p.id
          craft = { x: p.x, y: p.y }
          game.sfx.play('tap')
        }
      }
    },

    move(p: Pointer) {
      if (gone) return
      if (phase === 'trace' && tracer === p.id) feed(p)
      else if (phase === 'give' && drag === p.id) craft = { x: p.x, y: p.y }
    },

    // Choices are taken on release, wherever the finger ends: a sloppy tap still counts.
    up(p: Pointer) {
      if (gone) return
      if (tracer === p.id) {
        tracer = null
        finger = null
      }
      const L = layout()
      // A finger that was already down when the phase began does not choose.
      const fresh = p.age <= pt + 0.05
      if (phase === 'color' && fresh) {
        let best = -1
        let bd = Math.max(40, L.S * 0.13)
        for (let i = 0; i < N_WIRES; i++) {
          const g = wireGeo(i, L)
          for (let k = 0; k <= 8; k++) {
            const d = dist(p, { x: lerp(g.mouth.x, g.tip.x, k / 8), y: lerp(g.mouth.y, g.tip.y, k / 8) })
            if (d < bd) {
              bd = d
              best = i
            }
          }
        }
        if (best >= 0) pickColor(best)
      } else if (phase === 'shape' && fresh && pt > 0.25) {
        const card = cards(L).find((k) => hit(k.r, p, 6))
        if (card) pickShape(card.id, L)
      } else if (phase === 'give') {
        if (drag === p.id) {
          craft = { x: p.x, y: p.y }
          const i = petNear(p, L, 0.95)
          if (i >= 0) give(i)
          else drag = null
        } else if (drag === null && fresh) {
          const i = petNear(p, L, 0.7)
          if (i >= 0) give(i)
        }
      }
    },
  }

  const debug = (): {
    phase: Phase
    done: boolean
    round: number
    wires: Pt[]
    shapes: { id: WireShape; x: number; y: number }[]
    trace: { points: Pt[]; progress: number } | null
    pets: Pt[]
  } => {
    const L = layout()
    const pts = phase === 'trace' ? tracePts(L) : null
    return {
      phase,
      done: finished,
      round,
      wires: phase === 'color' ? WIRE_COLORS.map((_, i) => wireGeo(i, L).tap) : [],
      shapes: phase === 'shape' ? cards(L).map((k) => ({ id: k.id, x: k.r.x + k.r.w / 2, y: k.r.y + k.r.h / 2 })) : [],
      trace: pts ? { points: pts, progress: idx / (pts.length - 1) } : null,
      pets: phase === 'give' ? pets.map((_, i) => petBody(i, L)) : [],
    }
  }

  return Object.assign(scene, { debug })
}
