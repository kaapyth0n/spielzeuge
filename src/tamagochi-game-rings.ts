/**
 * Тамагочи Связь — «Кольца». The pets jump together, each in its own lane; after
 * three jumps each, gymnastic rings come down from the ceiling. The next jump grabs
 * them, and then every pet swings, flips, stretches and twirls before the dismount.
 */
import {
  INK,
  Particles,
  SHELLS,
  TAU,
  clamp,
  drawRoom,
  ease,
  lerp,
  line,
  oval,
  paint,
  rr,
  star,
  type Activity,
  type Ctx,
  type Dir,
  type MeetPet,
  type Pointer,
  type Scene,
} from './tamagochi-kit.ts'
import { drawPet, handsUp } from './tamagochi-pets.ts'

type Trick = 'swing' | 'flip' | 'stretch' | 'twirl'
type Gesture = Dir | 'tap'
type Phase = 'jump' | 'rings' | 'gym' | 'dismount' | 'done'
type Mode = 'stand' | 'crouch' | 'air' | 'land' | 'hang' | 'cheer'

const TRICKS: Trick[] = ['swing', 'flip', 'stretch', 'twirl']
const DUR: Record<Exclude<Trick, 'swing'>, number> = { flip: 0.95, stretch: 1, twirl: 0.85 }
const AIR_TIME = 0.62
const RING = '#ffb84a'

type LineId = 'jump' | 'rings' | 'gym' | 'together' | 'tada'
const LINES: Record<string, Record<LineId, string>> = {
  ru: {
    jump: 'Прыгай! Проведи пальцем вверх!',
    rings: 'Кольца! Прыгни и хватайся!',
    gym: 'Качайся, кувыркайся, тянись, кружись!',
    together: 'Вместе!',
    tada: 'Та-да! Вот это гимнастика!',
  },
  de: {
    jump: 'Spring! Wisch nach oben!',
    rings: 'Ringe! Spring hoch und halt dich fest!',
    gym: 'Schaukeln, überschlagen, strecken, drehen!',
    together: 'Zusammen!',
    tada: 'Tadaa! Was für ein Turnen!',
  },
  en: {
    jump: 'Jump! Swipe up!',
    rings: 'Rings! Jump and grab them!',
    gym: 'Swing, flip, stretch, twirl!',
    together: 'Together!',
    tada: 'Ta-da! What a show!',
  },
}

interface Lane {
  pet: MeetPet
  mode: Mode
  /** Seconds in the current mode. */
  mt: number
  lift: number
  vy: number
  lean: number
  jumps: number
  pipAt: number[]
  /** Pendulum on the rings. */
  theta: number
  omega: number
  lastDir: number
  trick: Exclude<Trick, 'swing'> | null
  tt: number
  flipDir: number
  queued: Exclude<Trick, 'swing'> | null
  ticks: Record<Trick, number | null>
  trickAt: number
  idle: number
  released: boolean
  /** Seconds since the pet let go; the rings go back up. */
  upT: number
}

/** A chunky arrow pointing along +x, centred on (0,0) after the transform. */
const arrow = (c: Ctx, x: number, y: number, ang: number, len: number, color: string, lw: number): void => {
  const t = len * 0.17
  const hd = len * 0.42
  c.save()
  c.translate(x, y)
  c.rotate(ang)
  c.beginPath()
  c.moveTo(-len / 2, -t)
  c.lineTo(len / 2 - hd, -t)
  c.lineTo(len / 2 - hd, -hd * 0.8)
  c.lineTo(len / 2, 0)
  c.lineTo(len / 2 - hd, hd * 0.8)
  c.lineTo(len / 2 - hd, t)
  c.lineTo(-len / 2, t)
  c.closePath()
  paint(c, color, lw)
  c.restore()
}

/** A fingertip with a ring around it: "tap here". `k` 0..1 animates the ring. */
const tapMark = (c: Ctx, x: number, y: number, s: number, color: string, lw: number, k = 0.5): void => {
  c.save()
  c.globalAlpha *= 1 - k * 0.7
  oval(c, x, y, s * (0.28 + k * 0.24), s * (0.28 + k * 0.24))
  c.lineWidth = lw * 1.4
  c.strokeStyle = color
  c.stroke()
  c.restore()
  oval(c, x, y, s * 0.17, s * 0.17)
  paint(c, color, lw)
}

const gestureIcon = (c: Ctx, trick: Trick, x: number, y: number, s: number, color: string, lw: number): void => {
  if (trick === 'swing') {
    arrow(c, x - s * 0.21, y, Math.PI, s * 0.44, color, lw)
    arrow(c, x + s * 0.21, y, 0, s * 0.44, color, lw)
  } else if (trick === 'flip') arrow(c, x, y, -Math.PI / 2, s * 0.7, color, lw)
  else if (trick === 'stretch') arrow(c, x, y, Math.PI / 2, s * 0.7, color, lw)
  else tapMark(c, x, y, s * 0.85, color, lw)
}

export const ringsGame: Activity = (ctx) => {
  const g = ctx.game
  const n = ctx.pets.length
  const fx = new Particles()
  const lanes: Lane[] = ctx.pets.map((pet) => ({
    pet,
    mode: 'stand',
    mt: 0,
    lift: 0,
    vy: 0,
    lean: 0,
    jumps: 0,
    pipAt: [],
    theta: 0,
    omega: 0,
    lastDir: 1,
    trick: null,
    tt: 0,
    flipDir: 1,
    queued: null,
    ticks: { swing: null, flip: null, stretch: null, twirl: null },
    trickAt: -9,
    idle: 0,
    released: false,
    upT: 0,
  }))
  const links: { a: number; b: number; at: number }[] = []
  let phase: Phase = 'jump'
  let age = 0
  let idleAll = 0
  let autoT = 0
  let ringT = 0
  let gymT = 0
  let allTicksT = 0
  let disT = 0
  let finT = 0
  let saidGym = false
  let saidTogether = false
  let togetherAt = -9

  const layout = () => {
    const { w, h, safe } = g
    const floorY = h - clamp(h * 0.26, 92, 240)
    const pad = Math.max(10, w * 0.02)
    const laneW = (w - pad * 2) / n
    const size = Math.min(220, laneW * 0.7, (floorY - safe.y) / 2)
    return { floorY, pad, laneW, size, jumpH: size * 0.55, ringY: floorY - size * 1.2, lw: Math.max(2, size * 0.03) }
  }
  let L = layout()

  const say = (id: LineId, soft = false): void => g.say((LINES[g.lang] ?? LINES.ru)[id], soft)
  const laneX = (i: number): number => L.pad + L.laneW * (i + 0.5)
  const laneAt = (x: number): number => clamp(Math.floor((x - L.pad) / L.laneW), 0, n - 1)
  const hands = (l: Lane): { mid: number; half: number; y: number } => {
    const hu = handsUp(l.pet.species)
    return { mid: ((hu.lx + hu.rx) / 2) * L.size, half: ((hu.rx - hu.lx) / 2) * L.size, y: hu.y * L.size }
  }
  const ringK = (i: number): number => (phase === 'jump' ? 0 : clamp((ringT - i * 0.15) / 0.9))
  const ringReady = (i: number): boolean => ringK(i) >= 1 && !lanes[i].released && phase !== 'dismount' && phase !== 'done'
  const tickCount = (): number => lanes.reduce((s, l) => s + TRICKS.filter((t) => l.ticks[t] !== null).length, 0)

  /** Squash of the long stretch: pull down, hold, spring back. */
  const stretchSquash = (u: number): number => {
    if (u < 0.45) return -0.95 * ease.out(u / 0.3)
    const v = (u - 0.45) / 0.55
    return -0.95 * Math.cos(v * Math.PI * 3) * (1 - v) ** 1.5
  }
  /** Everything needed to draw a hanging pet: pivot between the hands, rotation, scale. */
  const hang = (l: Lane, i: number) => {
    const hd = hands(l)
    const u = l.trick ? clamp(l.tt / DUR[l.trick]) : 0
    const squash = l.trick === 'stretch' ? stretchSquash(u) : 0
    const turn = l.trick === 'twirl' ? Math.cos(ease.inOut(u) * TAU * 2) : 1
    const flip = Math.abs(turn) < 0.22 ? (turn < 0 ? -0.22 : 0.22) : turn
    const rot = l.theta + (l.trick === 'flip' ? l.flipDir * TAU * ease.inOut(u) : 0)
    return {
      hd,
      squash,
      flip,
      rot,
      px: laneX(i) + hd.mid + Math.sin(l.theta) * L.size * 0.22,
      py: L.ringY + Math.max(0, -squash) * L.size * 0.1,
    }
  }
  /** Middle of the body, for sparkles. */
  const bodyPt = (l: Lane, i: number): { x: number; y: number } => {
    if (l.mode !== 'hang') return { x: laneX(i), y: L.floorY - l.lift - L.size * 0.45 }
    const hg = hang(l, i)
    return { x: hg.px - Math.sin(hg.rot) * L.size * 0.2, y: hg.py + Math.cos(hg.rot) * L.size * 0.2 }
  }

  const together = (a: number, b: number): void => {
    if (g.time - togetherAt < 0.9) return
    togetherAt = g.time
    links.push({ a, b, at: g.time })
    const pa = bodyPt(lanes[a], a)
    const pb = bodyPt(lanes[b], b)
    fx.burst('star', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2, 9, { size: L.size * 0.16, speed: L.size * 1.3 })
    fx.burst('heart', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2, 4, { size: L.size * 0.14, speed: L.size * 0.8 })
    g.sfx.play('chime', 4 + ((a + b) % 4))
    if (!saidTogether) say('together', true)
    saidTogether = true
  }

  const jump = (l: Lane): void => {
    if (l.mode === 'stand' || (l.mode === 'land' && l.mt > 0.08)) {
      l.mode = 'crouch'
      l.mt = 0
    }
  }
  const takeOff = (l: Lane, i: number): void => {
    l.mode = 'air'
    l.mt = 0
    l.lift = 0
    l.vy = (4 * L.jumpH) / AIR_TIME
    g.sfx.play('boing', i)
    if (phase === 'jump' && l.jumps < 3) {
      l.pipAt[l.jumps] = g.time
      g.sfx.note(72 + [0, 4, 7][l.jumps], 0.25, l.pet.species, 0.05)
      l.jumps++
    }
    const other = lanes.findIndex((o) => o !== l && o.mode === 'air' && !o.released)
    if (other >= 0) together(i, other)
  }
  const grab = (l: Lane, i: number): void => {
    l.mode = 'hang'
    l.mt = 0
    l.theta = 0
    l.omega = (g.rnd() - 0.5) * 1.2
    l.idle = 0
    const hd = hands(l)
    for (const s of [-1, 1])
      fx.burst('spark', laneX(i) + hd.mid + s * hd.half, L.ringY, 6, { color: '#ffd23d', size: L.size * 0.14, speed: L.size })
    g.sfx.play('pop')
    g.sfx.note(79, 0.3, l.pet.species, 0.06)
    if (!saidGym) say('gym')
    saidGym = true
  }

  const tick = (l: Lane, i: number, trick: Trick): void => {
    const b = lanes.findIndex((o) => o !== l && o.mode === 'hang' && g.time - o.trickAt < 0.8)
    l.trickAt = g.time
    if (b >= 0) together(i, b)
    if (l.ticks[trick] !== null) return
    const count = TRICKS.filter((t) => l.ticks[t] !== null).length
    l.ticks[trick] = g.time
    const p = bodyPt(l, i)
    fx.burst('star', p.x, p.y, 10, { size: L.size * 0.17, speed: L.size * 1.5 })
    g.sfx.play('star', count)
    g.sfx.note(72 + [0, 4, 7, 12][count], 0.4, l.pet.species, 0.12)
  }
  const startTrick = (l: Lane, i: number, trick: Exclude<Trick, 'swing'>): void => {
    if (l.trick) {
      l.queued = trick
      return
    }
    l.trick = trick
    l.tt = 0
    l.flipDir = l.omega < -0.3 ? -1 : 1
    g.sfx.play(trick === 'flip' ? 'whee' : trick === 'stretch' ? 'twang' : 'spin', i)
    tick(l, i, trick)
  }
  const swing = (l: Lane, i: number, dir: number): void => {
    l.omega = clamp(l.omega + dir * 2.6, -5.2, 5.2)
    l.lastDir = dir
    g.sfx.play('sweep')
    tick(l, i, 'swing')
  }

  const act = (i: number, gest: Gesture): void => {
    const l = lanes[i]
    idleAll = 0
    l.idle = 0
    if (phase === 'dismount' || phase === 'done') return
    if (l.mode !== 'hang') jump(l)
    else if (gest === 'left' || gest === 'right') swing(l, i, gest === 'left' ? -1 : 1)
    else startTrick(l, i, gest === 'up' ? 'flip' : gest === 'down' ? 'stretch' : 'twirl')
  }

  /** Gestures this lane still needs, the most useful first. */
  const todo = (l: Lane): Gesture[] => {
    if (phase === 'dismount' || phase === 'done') return []
    if (l.mode === 'hang')
      return TRICKS.filter((t) => l.ticks[t] === null).map((t): Gesture =>
        t === 'swing' ? (l.lastDir > 0 ? 'left' : 'right') : t === 'flip' ? 'up' : t === 'stretch' ? 'down' : 'tap',
      )
    return phase === 'jump' && l.jumps >= 3 ? [] : ['up']
  }

  const release = (l: Lane): void => {
    l.released = true
    if (l.mode !== 'hang') {
      if (l.mode === 'stand') l.mode = 'cheer'
      return
    }
    l.mode = 'air'
    l.mt = 0
    l.lift = L.jumpH
    l.vy = 0
    l.lean = clamp(l.theta, -0.5, 0.5)
    l.trick = null
    g.sfx.play('whee')
  }

  const updateLane = (l: Lane, i: number, dt: number): void => {
    l.mt += dt
    l.idle += dt
    if (l.released) l.upT += dt
    l.lean *= Math.max(0, 1 - dt * 6)
    if (l.mode === 'crouch' && l.mt > 0.1) takeOff(l, i)
    else if (l.mode === 'air') {
      const grav = (8 * L.jumpH) / AIR_TIME ** 2
      const rising = l.vy > 0
      l.vy -= grav * dt
      l.lift += l.vy * dt
      if (rising && l.vy <= 0 && ringReady(i)) grab(l, i)
      else if (l.lift <= 0) {
        l.lift = 0
        l.mode = 'land'
        l.mt = 0
        g.sfx.play('land')
        fx.burst('dot', laneX(i), L.floorY, 5, { color: '#fff', size: L.size * 0.1, speed: L.size * 0.7, max: 0.4 })
      }
    } else if (l.mode === 'land' && l.mt > 0.24) {
      l.mode = l.released ? 'cheer' : 'stand'
      l.mt = 0
    } else if (l.mode === 'hang') {
      l.omega += (-23 * Math.sin(l.theta) - 0.55 * l.omega) * dt
      l.theta += l.omega * dt
      if (Math.abs(l.theta) > 1.25) {
        l.theta = Math.sign(l.theta) * 1.25
        l.omega *= 0.4
      }
      if (l.trick) {
        l.tt += dt
        if (l.tt >= DUR[l.trick]) {
          l.trick = null
          const next = l.queued
          l.queued = null
          if (next && phase !== 'dismount') startTrick(l, i, next)
        }
      }
    }
  }

  const update = (dt: number): void => {
    L = layout()
    age += dt
    idleAll += dt
    lanes.forEach((l, i) => updateLane(l, i, dt))
    fx.update(dt)
    while (links.length && g.time - links[0].at > 0.9) links.shift()
    const hanging = lanes.filter((l) => l.mode === 'hang').length

    if (phase === 'jump' || phase === 'rings') {
      // Nobody is playing: the pets carry on by themselves, one jump at a time.
      autoT = idleAll > 12 ? autoT + dt : 0
      if (autoT > 1.6) {
        autoT = 0
        const l = lanes.find((o, i) => o.mode === 'stand' && (phase === 'jump' ? o.jumps < 3 : ringReady(i)))
        if (l) jump(l)
      }
    }
    if (phase === 'jump') {
      if (lanes.every((l) => l.jumps >= 3 && l.mode === 'stand')) {
        phase = 'rings'
        ringT = 0
        g.sfx.play('whee')
        say('rings')
      }
    } else if (phase === 'rings' || phase === 'gym') {
      ringT += dt
      if (phase === 'rings' && hanging === n) phase = 'gym'
      if (hanging > 0) gymT += dt
      const busy = lanes.some((l) => l.trick)
      allTicksT = tickCount() === n * 4 && !busy ? allTicksT + dt : 0
      const tired = hanging > 0 && ((gymT > 45 && idleAll > 1.5) || gymT > 70 || idleAll > 25)
      if (allTicksT > 0.7 || tired) {
        phase = 'dismount'
        disT = 0
      }
    } else if (phase === 'dismount') {
      disT += dt
      ringT += dt
      lanes.forEach((l, i) => {
        if (!l.released && disT > 0.25 + i * 0.4) release(l)
      })
      if (lanes.every((l) => l.mode === 'cheer')) {
        if (finT === 0) {
          lanes.forEach((l, i) => {
            fx.burst('confetti', laneX(i), L.floorY - L.size * 1.1, 16, { size: L.size * 0.13, speed: L.size * 2.2, max: 1.5 })
            g.sfx.note(72 + [0, 4, 7, 12][i % 4], 0.5, l.pet.species, 0.1 + i * 0.12)
          })
          g.sfx.play('yay')
          say('tada')
        }
        finT += dt
        if (finT > 1.7) {
          phase = 'done'
          const k = tickCount() / (n * 4)
          ctx.done(k >= 1 ? 3 : k >= 0.5 ? 2 : 1)
        }
      }
    }
  }

  const drawMat = (c: Ctx, l: Lane, i: number): void => {
    const col = SHELLS[l.pet.slot % SHELLS.length]
    const mw = Math.min(L.laneW * 0.94, L.size * 1.25)
    const mh = L.size * 0.17
    rr(c, laneX(i) - mw / 2, L.floorY - mh * 0.3, mw, mh, mh * 0.45)
    paint(c, col.shell, L.lw)
    rr(c, laneX(i) - mw / 2 + mh * 0.3, L.floorY - mh * 0.14, mw - mh * 0.6, mh * 0.22, mh * 0.11)
    paint(c, col.light)
  }

  const drawRing = (c: Ctx, ax: number, x: number, y: number): void => {
    const r = L.size * 0.105
    const d = Math.hypot(ax - x, -10 - y) || 1
    const ex = x + ((ax - x) / d) * r
    const ey = y + ((-10 - y) / d) * r
    line(c, [ax, -10, ex, ey], L.size * 0.035 + L.lw * 1.6, INK)
    line(c, [ax, -10, ex, ey], L.size * 0.035, '#fbeed2')
    oval(c, x, y, r, r)
    c.lineWidth = r * 0.42 + L.lw * 2
    c.strokeStyle = INK
    c.stroke()
    c.lineWidth = r * 0.42
    c.strokeStyle = RING
    c.stroke()
    c.beginPath()
    c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.5)
    c.lineWidth = r * 0.14
    c.strokeStyle = 'rgba(255,255,255,0.7)'
    c.stroke()
  }

  const drawRings = (c: Ctx, l: Lane, i: number): void => {
    const k = ringK(i)
    if (k <= 0 || l.upT > 0.8) return
    const hd = hands(l)
    const ax = laneX(i) + hd.mid
    if (l.mode === 'hang') {
      const hg = hang(l, i)
      const reach = hd.half * Math.abs(hg.flip)
      for (const s of [-1, 1])
        drawRing(c, ax + s * hd.half, hg.px + s * reach * Math.cos(hg.rot), hg.py + s * reach * Math.sin(hg.rot))
      return
    }
    const top = -L.size * 0.4
    const y = l.released ? lerp(L.ringY, top, ease.in(l.upT / 0.8)) : lerp(top, L.ringY, ease.back(k))
    const sway = Math.sin(g.time * 2.2 + i) * L.size * 0.012
    for (const s of [-1, 1]) drawRing(c, ax + s * hd.half, ax + s * hd.half + sway, y)
  }

  const drawLanePet = (c: Ctx, l: Lane, i: number): void => {
    const x = laneX(i)
    const s = L.size
    const { species, look } = l.pet
    if (l.mode === 'hang') {
      const hg = hang(l, i)
      oval(c, x + Math.sin(hg.rot) * s * 0.3, L.floorY, s * 0.25, s * 0.052)
      paint(c, 'rgba(59,42,74,0.16)')
      const sx = (1 + hg.squash * 0.22) * hg.flip
      c.save()
      c.translate(hg.px, hg.py)
      c.rotate(hg.rot)
      drawPet(c, species, look, {
        x: -hg.hd.mid * sx,
        y: -hg.hd.y * (1 - hg.squash * 0.25),
        size: s,
        squash: hg.squash,
        flip: hg.flip,
        armL: Math.PI,
        armR: Math.PI,
        eyes: l.trick ? 'happy' : 'open',
        mouth: l.trick ? 'open' : 'smile',
        face: clamp(l.omega * 0.3, -1, 1),
        shadow: false,
      }, g.time)
      c.restore()
      return
    }
    const reach = ringReady(i)
    let squash = Math.sin(g.time * 3 + i) * 0.03
    let arms = reach ? 2.7 + Math.sin(g.time * 5 + i) * 0.15 : 0.25
    let lift = l.lift
    if (l.mode === 'crouch') squash = 0.6 * ease.out(l.mt / 0.1)
    else if (l.mode === 'air') {
      squash = -0.4 * clamp(Math.abs(l.vy) / ((4 * L.jumpH) / AIR_TIME))
      arms = reach || l.released ? Math.PI : 2.3
    } else if (l.mode === 'land') squash = 0.55 * Math.cos((l.mt / 0.24) * Math.PI * 1.5) * (1 - l.mt / 0.24)
    else if (l.mode === 'cheer') {
      arms = 2.7 + Math.sin(g.time * 12 + i) * 0.3
      lift = Math.abs(Math.sin(l.mt * 7)) * s * 0.14
    }
    const happy = l.mode === 'air' || l.mode === 'cheer'
    drawPet(c, species, look, {
      x,
      y: L.floorY,
      size: s,
      lift,
      squash,
      lean: l.lean,
      armL: arms,
      armR: arms,
      eyes: happy ? 'happy' : reach ? 'wide' : 'open',
      mouth: happy ? 'open' : reach ? 'o' : 'smile',
    }, g.time)
  }

  const drawPips = (c: Ctx, l: Lane, i: number): void => {
    const a = phase === 'jump' ? 1 : 1 - clamp(ringT * 3)
    if (a <= 0) return
    const ps = L.size * 0.24
    c.save()
    c.globalAlpha = a
    for (let j = 0; j < 3; j++) {
      const x = laneX(i) + (j - 1) * ps * 1.15
      const y = L.floorY - L.size * 1.76
      star(c, x, y, ps, '#e6dff0')
      if (j < l.jumps) {
        const k = ease.back((g.time - l.pipAt[j]) * 4)
        c.save()
        c.translate(x, y)
        c.scale(k, k)
        star(c, 0, 0, ps, '#ffd23d')
        c.restore()
      }
    }
    c.restore()
  }

  /** The four tricks of one pet, on the floor in front of its mat. */
  const drawCard = (c: Ctx, l: Lane, i: number, hinted: Gesture | null): void => {
    const a = phase === 'jump' ? 0 : clamp((ringT - 0.3) * 2.5)
    if (a <= 0) return
    const top = L.floorY + L.size * 0.13 + 8
    const room = g.h - top - 10
    let cols = 4
    let cell = Math.min(48, (L.laneW - 10) / 4.2, room)
    if (cell < 32 && room > 70) {
      cols = 2
      cell = Math.min(48, (L.laneW - 10) / 2.15, room / 2.1)
    }
    c.save()
    c.globalAlpha = a
    TRICKS.forEach((t, j) => {
      const cx = laneX(i) + ((j % cols) - (cols - 1) / 2) * cell * 1.05
      const cy = top + cell * 0.5 + Math.floor(j / cols) * cell * 1.05
      const at = l.ticks[t]
      const pop = at === null ? 1 : 0.6 + 0.4 * ease.back((g.time - at) * 3.5)
      const want = at === null && hinted !== null && todo(l)[0] === hinted && TRICKS.filter((q) => l.ticks[q] === null)[0] === t
      const sc = pop * (want ? 1 + Math.sin(g.time * 7) * 0.06 : 1)
      c.save()
      c.translate(cx, cy)
      c.scale(sc, sc)
      rr(c, -cell * 0.46, -cell * 0.46, cell * 0.92, cell * 0.92, cell * 0.24)
      paint(c, at === null ? '#fff' : '#5fe0b0', Math.max(1.5, cell * 0.055))
      if (at === null) gestureIcon(c, t, 0, 0, cell * 0.78, want ? '#ff6fb5' : '#a66bff', Math.max(1.2, cell * 0.04))
      else {
        const pts = [-0.22, 0.02, -0.06, 0.18, 0.24, -0.18].map((v) => v * cell)
        line(c, pts, cell * 0.2, INK)
        line(c, pts, cell * 0.11, '#fff')
      }
      c.restore()
    })
    c.restore()
  }

  /** The gesture to show in this lane now, or null. */
  const hintFor = (l: Lane): Gesture | null => {
    if (l.mode === 'crouch' || l.mode === 'air' || l.trick) return null
    return l.idle > 3 || age < 6 ? (todo(l)[0] ?? null) : null
  }
  const drawHint = (c: Ctx, l: Lane, i: number, gest: Gesture): void => {
    const s = L.size
    const k = (g.time * 0.85 + i * 0.31) % 1
    const side = laneX(i) + Math.min(s * 0.66, L.laneW * 0.4)
    const cy = l.mode === 'hang' ? L.ringY + s * 0.3 : L.floorY - s * 0.62
    const go = (ease.inOut(k) - 0.5) * s * 0.55
    const len = s * 0.42
    c.save()
    c.globalAlpha = clamp(Math.sin(k * Math.PI) * 2.2)
    if (gest === 'up') arrow(c, side, cy - go, -Math.PI / 2, len, '#fff', L.lw)
    else if (gest === 'down') arrow(c, side, cy + go, Math.PI / 2, len, '#fff', L.lw)
    else if (gest === 'tap') tapMark(c, side, cy, s * 0.5, '#fff', L.lw, k)
    else arrow(c, laneX(i) + (gest === 'left' ? -go : go), L.floorY - s * 0.3, gest === 'left' ? Math.PI : 0, len, '#fff', L.lw)
    c.restore()
  }

  const draw = (c: Ctx): void => {
    L = layout()
    drawRoom(c, g, ctx.shell, L.floorY)
    // Wall bars along the back wall, so the room reads as a little gym.
    c.save()
    c.globalAlpha = 0.5
    const barH = L.size * 0.2
    for (let y = L.floorY - barH * 0.6; y > L.floorY - barH * 3.4; y -= barH)
      line(c, [L.pad + 6, y, g.w - L.pad - 6, y], Math.max(3, L.size * 0.035), ctx.shell.floor)
    c.restore()
    lanes.forEach((l, i) => drawMat(c, l, i))
    const hints = lanes.map(hintFor)
    lanes.forEach((l, i) => drawCard(c, l, i, hints[i]))
    lanes.forEach((l, i) => drawRings(c, l, i))
    lanes.forEach((l, i) => drawLanePet(c, l, i))
    lanes.forEach((l, i) => drawPips(c, l, i))
    for (const k of links) {
      const u = (g.time - k.at) / 0.9
      const a = bodyPt(lanes[k.a], k.a)
      const b = bodyPt(lanes[k.b], k.b)
      for (let j = 1; j < 6; j++) {
        const pop = clamp(u * 6 - j * 0.5) * clamp((1 - u) * 3)
        const y = lerp(a.y, b.y, j / 6) - Math.sin((j / 6) * Math.PI) * L.size * 0.3
        if (pop > 0) star(c, lerp(a.x, b.x, j / 6), y, L.size * 0.16 * pop, j % 2 ? '#ff6fb5' : '#ffd23d')
      }
    }
    lanes.forEach((l, i) => {
      const h = hints[i]
      if (h) drawHint(c, l, i, h)
    })
    fx.draw(c)
  }

  const scene: Scene = {
    enter() {
      g.sfx.loop('rings')
      say('jump')
    },
    leave() {
      fx.bits = []
      links.length = 0
    },
    update,
    draw,
    tap(p: Pointer) {
      if (p.y >= g.safe.y) act(laneAt(p.x), 'tap')
    },
    swipe(p: Pointer, dir: Dir) {
      act(laneAt(p.x0), dir)
    },
  }
  const debug = () => ({
    phase,
    done: phase === 'done',
    lanes: lanes.map((l, i) => ({
      x: laneX(i),
      y: L.floorY - L.size * 0.45,
      hanging: l.mode === 'hang',
      jumps: l.jumps,
      todo: todo(l),
    })),
  })
  return Object.assign(scene, { debug })
}
