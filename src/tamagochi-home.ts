/**
 * Тамагочи Связь — home. The tamagotchis of Matryona's drawing stand side by
 * side: an egg-shaped shell, an antenna, a screen and five lights. Wishes are
 * answered with her gestures; a pet that wants nothing walks to the right, and
 * a dashed line drawn from antenna to antenna sends the pets to visit.
 */
import type { Host } from './tamagochi-host.ts'
import { drawBall, drawFood, drawItem, drawPoop, drawRoomProps } from './tamagochi-items.ts'
import {
  INK,
  Particles,
  SHELLS,
  SPECIES,
  TAU,
  button,
  clamp,
  dist,
  ease,
  heart,
  hit,
  label,
  lerp,
  line,
  oval,
  paint,
  rr,
  type Ctx,
  type Dir,
  type Pointer,
  type Pt,
  type Rect,
  type Scene,
  type SpeciesId,
} from './tamagochi-kit.ts'
import { MeetScene } from './tamagochi-meet.ts'
import { drawPet, type Pose } from './tamagochi-pets.ts'
import {
  DOTS,
  DOTS_AFTER_VISIT,
  MAX_DEVICES,
  UNLOCK_AT,
  WANT_COUNT,
  choosable,
  isUnlocked,
  lookOf,
  nextUnlock,
  pickWant,
  type Device,
  type Want,
} from './tamagochi-state.ts'

const DW = 260
const DH = 392
const SCR = { x: 38, y: 142, w: 184, h: 170, r: 62 }
const FY = 118
const PET_SIZE = 76
const SLEEP_SECONDS = 5.2

export const EGG_COLORS: Record<SpeciesId, [string, string]> = {
  chick: ['#fff3ae', '#ffd84a'],
  kitten: ['#ffe3c2', '#ffab5e'],
  monkey: ['#f3d6b3', '#b9774d'],
  banana: ['#fff8c4', '#ffe14d'],
  mini: ['#ffd6ea', '#ff8fc7'],
  bunny: ['#ffffff', '#ffb3cf'],
  penguin: ['#e3e9ff', '#55679e'],
  puppy: ['#fff5e0', '#c08a5a'],
}

export function drawEgg(ctx: Ctx, species: SpeciesId | null, x: number, y: number, s: number, cracks = 0, tilt = 0): void {
  const [base, spot] = species ? EGG_COLORS[species] : ['#efe9f7', '#d5cbe6']
  const lw = Math.max(1.6, s * 0.04)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(s * 0.34, -s, s * 0.44, -s * 0.5, s * 0.44, -s * 0.36)
  ctx.bezierCurveTo(s * 0.44, -s * 0.1, s * 0.24, 0, 0, 0)
  ctx.bezierCurveTo(-s * 0.24, 0, -s * 0.44, -s * 0.1, -s * 0.44, -s * 0.36)
  ctx.bezierCurveTo(-s * 0.44, -s * 0.5, -s * 0.34, -s, 0, -s)
  ctx.closePath()
  paint(ctx, base, lw)
  ctx.save()
  ctx.clip()
  for (const [dx, dy, r] of [
    [-0.24, -0.3, 0.1],
    [0.2, -0.55, 0.12],
    [0.1, -0.14, 0.09],
    [-0.12, -0.74, 0.08],
    [0.36, -0.24, 0.07],
  ]) {
    oval(ctx, dx * s, dy * s, r * s, r * s)
    paint(ctx, spot)
  }
  oval(ctx, -s * 0.2, -s * 0.74, s * 0.07, s * 0.13, 0.5)
  paint(ctx, 'rgba(255,255,255,0.7)')
  ctx.restore()
  const zig = [
    [-0.3, -0.52, -0.16, -0.42, -0.08, -0.56, 0.04, -0.44],
    [0.04, -0.44, 0.16, -0.58, 0.24, -0.44, 0.38, -0.5],
    [-0.1, -0.5, -0.02, -0.3, -0.12, -0.2],
  ]
  for (let i = 0; i < Math.min(cracks, zig.length); i++)
    line(
      ctx,
      zig[i].map((v) => v * s),
      lw * 1.1,
    )
  ctx.restore()
}

type Phase = 'egg' | 'idle' | 'want' | 'act' | 'sleep' | 'ready' | 'away'
type AnimKind = 'eat' | 'sweep' | 'toss' | 'trick' | 'no' | 'hop' | 'arrive'
const ANIM_DUR: Record<AnimKind, number> = { eat: 0.95, sweep: 0.75, toss: 1.15, trick: 0.85, no: 0.5, hop: 0.45, arrive: 0.5 }

class Dev {
  phase: Phase
  t = 0
  want: Want | null = null
  left = 0
  prev: Want | null = null
  slept = false
  x = SCR.w / 2
  tx = SCR.w / 2
  face = 0
  anim: { kind: AnimKind; t: number } | null = null
  cracks = 0
  wait = 1
  wander = 0.6
  shake = 0
  hint = 0
  /** Show the gesture arrow now, without waiting. */
  arrow = false
  linked = false
  fx = new Particles()
  box = { x: 0, y: 0, s: 1 }
  pop = [0, 0, 0, 0, 0]
  twinkles: { x: number; y: number; t: number }[] = []
  slot: number
  data: Device

  constructor(slot: number, data: Device) {
    this.slot = slot
    this.data = data
    this.phase = data.hatched ? 'idle' : 'egg'
  }

  get shell(): (typeof SHELLS)[number] {
    return SHELLS[this.slot % SHELLS.length]
  }
  /** Antenna base and tip in tamagotchi units. */
  antenna(): { bx: number; by: number; tx: number; ty: number } {
    return this.slot % 2 === 0 ? { bx: 98, by: 104, tx: 80, ty: 18 } : { bx: 162, by: 104, tx: 178, ty: 18 }
  }
  stage(x: number, y: number): Pt {
    return { x: this.box.x + x * this.box.s, y: this.box.y + y * this.box.s }
  }
  tip(): Pt {
    const a = this.antenna()
    return this.stage(a.tx, a.ty)
  }
  screenCentre(): Pt {
    return this.stage(SCR.x + SCR.w / 2, SCR.y + SCR.h / 2)
  }
  rect(): Rect {
    return { x: this.box.x, y: this.box.y, w: DW * this.box.s, h: DH * this.box.s }
  }
  screenRect(): Rect {
    return { x: this.box.x + SCR.x * this.box.s, y: this.box.y + SCR.y * this.box.s, w: SCR.w * this.box.s, h: SCR.h * this.box.s }
  }
  swapRect(): Rect {
    const s = this.box.s
    return { x: this.box.x + 104 * s, y: this.box.y + 352 * s, w: 52 * s, h: 38 * s }
  }
  dot(i: number): Pt {
    return this.stage(130 + (i - 2) * 27, 342 - (i - 2) ** 2 * 2.6)
  }
  play(kind: AnimKind): void {
    this.anim = { kind, t: 0 }
  }
}

interface Picker {
  /** Slot being changed, or -1 for a new tamagotchi. */
  slot: number
  t: number
}

export class HomeScene implements Scene {
  readonly kind = 'home'
  private host: Host
  devs: Dev[] = []
  private fx = new Particles()
  private drag: { from: number; id: number; x: number; y: number; lx: number; ly: number; n: number } | null = null
  links: { a: number; b: number; t: number }[] = []
  private meetIn: number | null = null
  private hostSlot = 0
  travel: { t: number; slots: number[] } | null = null
  private wipe = 0
  picker: Picker | null = null
  private linkHint = 0
  private windowArt = new Map<string, HTMLImageElement>()
  private pressed: string | null = null

  constructor(host: Host) {
    this.host = host
    this.devs = host.save.devices.map((d, i) => new Dev(i, d))
  }

  enter(): void {
    this.host.sfx.loop(null)
    this.layout()
    if (this.devs.some((d) => d.phase === 'egg')) this.host.say(this.host.t('eggHint'), true)
  }

  resize(): void {
    this.layout()
  }

  private layout(): void {
    const area = this.host.nursery
    const n = this.devs.length
    let best = { cols: n, s: 0 }
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols)
      const s = Math.min(area.w / cols / DW, area.h / rows / DH, 1.7)
      if (s > best.s) best = { cols, s }
    }
    const { cols, s } = best
    const rows = Math.ceil(n / cols)
    const cellW = Math.min(area.w / cols, DW * s * 1.22)
    const spare = area.h - rows * DH * s
    this.devs.forEach((d, i) => {
      const r = Math.floor(i / cols)
      const inRow = Math.min(cols, n - r * cols)
      const c = i - r * cols
      const stagger = rows === 1 && n > 1 ? (i % 2 ? 1 : -1) * Math.min(16, spare / 2) : 0
      d.box = {
        x: area.x + (area.w - inRow * cellW) / 2 + cellW * (c + 0.5) - (DW * s) / 2,
        y: area.y + spare / 2 + r * DH * s + stagger,
        s,
      }
    })
  }

  private addRect(): Rect {
    const { w, h } = this.host
    return { x: w - 76, y: h - 80, w: 62, h: 62 }
  }
  get canDepart(): boolean {
    return !this.picker && !this.drag && !this.links.length && !this.travel && !this.wipe && this.meetIn === null
  }

  describeHearts(): void {
    const host = this.host
    const next = nextUnlock(host.save)
    host.sfx.play('heart')
    host.say(host.t('hearts', { n: host.save.hearts }) + (next ? ' ' + host.t('heartsNext', { n: next.need - host.save.hearts }) : ''))
  }

  // ---------------------------------------------------------------- update

  update(dt: number): void {
    const host = this.host
    this.fx.update(dt)
    if (this.picker) this.picker.t += dt
    for (const d of this.devs) this.updateDev(d, dt)
    for (const l of this.links) l.t += dt

    const ready = this.devs.filter((d) => d.phase === 'ready' && !d.linked)
    if (ready.length >= 2 && !this.drag && !this.links.length && !this.picker) {
      this.linkHint += dt
      if (this.linkHint > 1.2 && this.linkHint - dt <= 1.2) host.say(host.t('linkHint'), (host.save.hints.link ?? 0) > 2)
    } else if (ready.length < 2) this.linkHint = 0

    if (this.meetIn !== null && !this.travel) {
      this.meetIn -= dt
      if (this.meetIn <= 0) this.startTravel()
    }
    if (this.travel) {
      this.travel.t += dt
      if (this.travel.t > 1.5) {
        this.wipe += dt / 0.55
        if (this.wipe >= 1) {
          const slots = this.travel.slots
          host.go(new MeetScene(host, slots, this.hostSlot, null))
        }
      }
    }
  }

  private updateDev(d: Dev, dt: number): void {
    const host = this.host
    d.t += dt
    d.fx.update(dt)
    d.shake = Math.max(0, d.shake - dt * 2.5)
    d.pop = d.pop.map((p) => Math.max(0, p - dt * 2.2))
    for (const tw of d.twinkles) tw.t += dt
    d.twinkles = d.twinkles.filter((tw) => tw.t < 1.2)
    if (d.anim) {
      d.anim.t += dt
      if (d.anim.t >= ANIM_DUR[d.anim.kind]) {
        const kind = d.anim.kind
        d.anim = null
        if (d.phase === 'act') this.finishAct(d, kind)
      }
    }
    // Walking towards the current spot.
    const dx = d.tx - d.x
    if (Math.abs(dx) > 0.6 && !d.anim && d.phase !== 'sleep' && d.phase !== 'egg') {
      d.x += Math.sign(dx) * Math.min(Math.abs(dx), 34 * dt)
      d.face = lerp(d.face, Math.sign(dx), Math.min(1, dt * 10))
    }
    if (d.phase === 'idle') {
      d.wander -= dt
      if (d.wander <= 0) {
        d.wander = 1.2 + host.rnd() * 1.6
        d.tx = 56 + host.rnd() * 72
      }
      d.wait -= dt
      if (d.wait <= 0 && !d.anim) {
        if (d.data.dots >= DOTS) this.makeReady(d)
        else this.newWant(d)
      }
    } else if (d.phase === 'want') {
      d.hint += dt
      d.face = lerp(d.face, 0, Math.min(1, dt * 6))
      if (d.want === 'sleep' && d.t > 1.5) {
        d.phase = 'sleep'
        d.t = 0
        host.sfx.play('sleep')
      } else if (d.want !== 'sleep' && d.hint > 9) {
        d.hint = 0
        d.arrow = true
        this.announceWant(d, true)
      }
    } else if (d.phase === 'sleep') {
      if (Math.floor(d.t / 1.1) !== Math.floor((d.t - dt) / 1.1)) d.fx.add('zzz', d.x + 22, FY - 54, { vx: 12, vy: -22, max: 1.6, size: 20 })
      if (d.t >= SLEEP_SECONDS) {
        d.slept = true
        host.sfx.play('wake')
        host.say(host.t('woke'), true)
        this.earnDot(d)
      }
    } else if (d.phase === 'ready') {
      d.face = lerp(d.face, 1, Math.min(1, dt * 6))
      if (Math.floor(d.t / 1.4) !== Math.floor((d.t - dt) / 1.4) && !d.anim && Math.abs(d.tx - d.x) < 1) d.play('hop')
    }
  }

  private newWant(d: Dev): void {
    const host = this.host
    const done = host.save.hints.wishes ?? 0
    d.want = pickWant(d.prev, d.slept, d.prev === null ? done + d.slot : 9, host.rnd)
    d.prev = d.want
    d.left = WANT_COUNT[d.want]
    d.phase = 'want'
    d.t = 0
    d.hint = 0
    d.arrow = false
    d.tx = SCR.w / 2
    host.sfx.play('pop')
    this.announceWant(d, false)
  }

  private announceWant(d: Dev, again: boolean): void {
    const host = this.host
    if (!d.want) return
    const key = ({ food: 'wantFood', poop: 'wantPoop', play: 'wantPlay', sleep: 'wantSleep' } as const)[d.want]
    const seen = host.save.hints[d.want] ?? 0
    if (!again) host.save.hints[d.want] = seen + 1
    if (again || seen < 4) host.say(host.t(key, { name: host.petName(d.data.species) }), true)
  }

  private finishAct(d: Dev, kind: AnimKind): void {
    const host = this.host
    d.left--
    if (d.left > 0) {
      d.phase = 'want'
      d.t = 0
      d.hint = 0
      return
    }
    host.say(host.t(kind === 'eat' ? 'ate' : kind === 'sweep' ? 'cleaned' : 'played'), true)
    this.earnDot(d)
  }

  private earnDot(d: Dev): void {
    const host = this.host
    const i = Math.min(DOTS - 1, d.data.dots)
    d.data.dots = Math.min(DOTS, d.data.dots + 1)
    d.pop[i] = 1
    const p = d.dot(i)
    this.fx.burst('star', p.x, p.y, 6, { size: 14 * d.box.s, speed: 110 })
    host.sfx.play('star', i)
    host.save.hints.wishes = (host.save.hints.wishes ?? 0) + 1
    d.want = null
    d.phase = 'idle'
    d.t = 0
    d.wait = d.data.dots >= DOTS ? 0.7 : 1.3 + host.rnd() * 1.2
    host.persist()
  }

  private makeReady(d: Dev): void {
    const host = this.host
    d.phase = 'ready'
    d.t = 0
    d.tx = SCR.w - 54
    host.sfx.play('ready')
    const seen = host.save.hints.ready ?? 0
    host.save.hints.ready = seen + 1
    const others = this.devs.filter((o) => o !== d && o.data.hatched)
    const name = host.petName(d.data.species)
    const friendReady = others.some((o) => o.phase === 'ready')
    if (seen < 4) host.say(host.t(d.data.species === 'monkey' ? 'readyShe' : 'ready', { name }))
    // Then say what to do next: wake the friend, or look after it.
    if (this.devs.some((o) => !o.data.hatched)) host.say(host.t('wakeFriend'), seen >= 4)
    else if (!friendReady) host.say(host.t('waitFriend'), seen >= 4)
  }

  private startTravel(): void {
    const slots = [...new Set(this.links.flatMap((l) => [l.a, l.b]))]
    // The host comes first, so it stands on the left in its own room.
    slots.sort((a, b) => (a === this.hostSlot ? -1 : b === this.hostSlot ? 1 : a - b))
    this.travel = { t: 0, slots }
    this.host.sfx.play('zap')
    for (const s of slots) if (s !== this.hostSlot) this.devs[s].phase = 'away'
  }

  // ---------------------------------------------------------------- fingers

  private devAt(p: Pt, pad = 0): Dev | null {
    return this.devs.find((d) => hit(d.rect(), p, pad)) ?? null
  }

  down(p: Pointer): void {
    if (this.picker || this.travel) return
    if (hit(this.addRect(), p) && this.devs.length < MAX_DEVICES) this.pressed = 'add'
    const d = this.devs.find((dev) => {
      if (dev.phase !== 'ready' || dev.linked) return false
      const r = dev.rect()
      // The antenna and the top of the shell above the screen start a link.
      return dist(dev.tip(), p) < 56 * Math.max(1, dev.box.s) || (hit(r, p, 6) && p.y < r.y + (SCR.y - 6) * dev.box.s)
    })
    if (d && !this.drag) {
      const tip = d.tip()
      this.drag = { from: d.slot, id: p.id, x: p.x, y: p.y, lx: tip.x, ly: tip.y, n: 0 }
      this.host.sfx.play('tap')
    }
  }

  move(p: Pointer): void {
    const g = this.drag
    if (!g || g.id !== p.id) return
    g.x = p.x
    g.y = p.y
    if (Math.hypot(p.x - g.lx, p.y - g.ly) > 34) {
      g.lx = p.x
      g.ly = p.y
      this.host.sfx.play('dash', g.n++)
    }
  }

  up(p: Pointer): void {
    this.pressed = null
    const g = this.drag
    if (!g || g.id !== p.id) return
    this.drag = null
    const host = this.host
    const from = this.devs[g.from]
    const target = this.devs.find((d) => d !== from && (hit(d.rect(), p, 10) || dist(d.tip(), p) < 70 * Math.max(1, d.box.s)))
    if (!target) {
      if (dist(from.tip(), p) > 40) host.say(host.t('linkHint'), true)
      return
    }
    if (target.phase !== 'ready' || !target.data.hatched) {
      target.shake = 1
      host.sfx.play('no')
      host.say(host.t(target.data.hatched ? 'notReady' : 'eggHint', { name: host.petName(target.data.species) }))
      return
    }
    if (this.links.some((l) => (l.a === from.slot && l.b === target.slot) || (l.a === target.slot && l.b === from.slot))) return
    if (!this.links.length) this.hostSlot = target.slot
    this.links.push({ a: from.slot, b: target.slot, t: 0 })
    from.linked = target.linked = true
    host.save.hints.link = (host.save.hints.link ?? 0) + 1
    host.sfx.play('link')
    host.say(host.t('linked'))
    const a = from.tip()
    const b = target.tip()
    this.fx.burst('spark', a.x, a.y, 8, { color: '#ffe27a', size: 18 })
    this.fx.burst('spark', b.x, b.y, 8, { color: '#ffe27a', size: 18 })
    const more = this.devs.some((d) => d.phase === 'ready' && !d.linked)
    this.meetIn = more ? 2.4 : 0.8
  }

  swipe(p: Pointer, dir: Dir): void {
    if (this.picker || this.travel || (this.drag && this.drag.id === p.id)) return
    const host = this.host
    const d = this.devAt({ x: p.x0, y: p.y0 }, 8)
    if (!d || d.anim) return
    if (d.phase === 'egg') return this.knock(d)
    if (d.phase === 'want' && d.want && d.want !== 'sleep') {
      const need: Dir = d.want === 'poop' ? 'left' : 'up'
      if (dir === need) {
        d.phase = 'act'
        d.t = 0
        if (d.want === 'food') {
          d.play('eat')
          host.sfx.play('munch')
        } else if (d.want === 'poop') {
          d.play('sweep')
          host.sfx.play('sweep')
          for (const px of [52, 132]) d.fx.burst('spark', px, FY + 24, 5, { color: '#fff', size: 12, speed: 70 })
        } else {
          d.play('toss')
          host.sfx.play('boing')
        }
      } else {
        d.play('no')
        d.arrow = true
        host.sfx.play('no')
        host.say(host.t('wrongWay'), true)
      }
      return
    }
    if (d.phase === 'idle' || d.phase === 'ready') {
      // No wish right now: the pet simply plays along.
      if (dir === 'up') {
        d.play('hop')
        host.sfx.play('boing')
      } else if (dir !== 'down' && d.phase === 'idle') {
        d.tx = clamp(d.x + (dir === 'left' ? -40 : 40), 40, SCR.w - 40)
        host.sfx.play('step')
      }
    }
  }

  private knock(d: Dev): void {
    const host = this.host
    d.cracks++
    d.shake = 0.6
    host.sfx.play('crack', d.cracks)
    const c = d.screenCentre()
    this.fx.burst('dot', c.x, c.y, 4, { size: 10, speed: 90, color: EGG_COLORS[d.data.species][1] })
    if (d.cracks >= 3) {
      d.data.hatched = true
      d.phase = 'idle'
      d.t = 0
      d.wait = 2.2
      d.play('arrive')
      host.sfx.play('hatch')
      this.fx.burst('confetti', c.x, c.y, 22, { size: 14 })
      this.fx.burst('star', c.x, c.y, 6)
      host.say(host.t('hatched', { name: host.petName(d.data.species) }))
      host.persist()
    }
  }

  tap(p: Pointer): void {
    const host = this.host
    if (this.travel) return
    if (this.picker) return this.pickerTap(p)
    if (this.devs.length < MAX_DEVICES && hit(this.addRect(), p, 6)) {
      host.sfx.play('tap')
      this.picker = { slot: -1, t: 0 }
      host.say(host.t('pickTitle'))
      return
    }
    const d = this.devAt(p, 4)
    if (!d) return
    if (d.phase === 'egg') return this.knock(d)
    if (hit(d.swapRect(), p, 6) && !d.linked && d.phase !== 'act' && d.phase !== 'sleep') {
      host.sfx.play('tap')
      this.picker = { slot: d.slot, t: 0 }
      host.say(host.t('pickTitle'))
      return
    }
    if (d.phase === 'sleep') {
      const r = d.screenRect()
      if (hit(r, p)) {
        d.twinkles.push({ x: (p.x - r.x) / d.box.s, y: (p.y - r.y) / d.box.s, t: 0 })
        host.sfx.play('chime', Math.floor(host.rnd() * 8))
      }
      return
    }
    if (d.phase === 'away' || d.anim) return
    if (d.phase === 'want' && d.want !== 'sleep') {
      // A tap is not the gesture: show it once more.
      d.arrow = true
      this.announceWant(d, true)
      return
    }
    d.play('trick')
    host.sfx.play(d.data.species === 'banana' ? 'spin' : 'boing')
    host.sfx.note(72 + d.slot * 2, 0.3, d.data.species)
    host.say(host.t('trick', { name: host.petName(d.data.species) }), true)
  }

  // ---------------------------------------------------------------- picker

  private pickerLayout(): { panel: Rect; cards: { species: SpeciesId; r: Rect }[]; close: Rect; remove: Rect | null } {
    const { w, h } = this.host
    const wide = w > h * 1.05
    const cols = wide ? 4 : 2
    const rows = SPECIES.length / cols
    const canRemove = this.picker !== null && this.picker.slot >= 0 && this.devs.length > 2
    // Below the corner buttons (the cross must not hide under «home») and, where
    // there is room, above the caption.
    const topY = this.host.safe.y + 6
    const room = h - topY - (h > 620 ? 70 : 10)
    const pw = Math.min(w - 20, wide ? 720 : 430)
    const ph = Math.min(room, wide ? 470 : 720)
    const panel = { x: (w - pw) / 2, y: topY + (room - ph) / 2, w: pw, h: ph }
    const top = 58
    const bottom = canRemove ? 66 : 14
    const cw = (pw - 24) / cols
    const ch = (ph - top - bottom) / rows
    const cards = SPECIES.map((species, i) => ({
      species,
      r: { x: panel.x + 12 + (i % cols) * cw + 5, y: panel.y + top + Math.floor(i / cols) * ch + 5, w: cw - 10, h: ch - 10 },
    }))
    return {
      panel,
      cards,
      close: { x: panel.x + pw - 54, y: panel.y + 8, w: 44, h: 44 },
      remove: canRemove ? { x: panel.x + pw / 2 - 110, y: panel.y + ph - 60, w: 220, h: 46 } : null,
    }
  }

  private pickerTap(p: Pointer): void {
    const host = this.host
    const picker = this.picker!
    const lay = this.pickerLayout()
    if (hit(lay.close, p, 8) || !hit(lay.panel, p)) {
      this.picker = null
      host.sfx.play('tap')
      return
    }
    if (lay.remove && hit(lay.remove, p)) {
      host.save.devices.splice(picker.slot, 1)
      host.sfx.play('sweep')
      host.say(host.t('bye'))
      this.rebuild()
      return
    }
    const card = lay.cards.find((c) => hit(c.r, p))
    if (!card) return
    const name = host.petName(card.species)
    if (!isUnlocked(host.save, card.species)) {
      host.sfx.play('no')
      host.say(host.t('locked', { n: UNLOCK_AT[card.species] }))
      return
    }
    if (!choosable(host.save, picker.slot).includes(card.species)) {
      host.sfx.play('no')
      host.say(host.t('busy', { name }))
      return
    }
    if (picker.slot < 0) host.save.devices.push({ species: card.species, hatched: false, dots: DOTS_AFTER_VISIT })
    else if (host.save.devices[picker.slot].species !== card.species)
      host.save.devices[picker.slot] = { species: card.species, hatched: false, dots: DOTS_AFTER_VISIT }
    host.sfx.play('pop')
    host.say(host.t('eggHint'))
    this.rebuild()
  }

  /** The set of tamagotchis changed: keep the running ones, start the new ones. */
  private rebuild(): void {
    const old = this.devs
    this.devs = this.host.save.devices.map((data, i) => {
      const keep = old.find((d) => d.data === data)
      if (!keep) return new Dev(i, data)
      keep.slot = i
      return keep
    })
    this.links = []
    this.meetIn = null
    for (const d of this.devs) d.linked = false
    this.picker = null
    this.host.persist()
    this.layout()
  }

  // ---------------------------------------------------------------- drawing

  draw(ctx: Ctx): void {
    const host = this.host
    const { w, h, time } = host
    for (const d of this.devs) this.drawDevice(ctx, d)

    // Finished links, the hint and the line under the finger.
    for (const l of this.links) this.dashes(ctx, this.devs[l.a].tip(), this.devs[l.b].tip(), { march: time * 60, alpha: 1 })
    const ready = this.devs.filter((d) => d.phase === 'ready' && !d.linked)
    if (ready.length >= 2 && !this.drag && !this.links.length && this.linkHint > 0.8) {
      const k = ((this.linkHint - 0.8) % 2.6) / 1.9
      const a = ready[0].tip()
      const b = ready[1].tip()
      this.dashes(ctx, a, b, { alpha: 0.35, upto: clamp(k) })
      const f = this.curve(a, b, clamp(k))
      this.finger(ctx, f.x, f.y + 14, clamp((1.3 - k) * 4))
    }
    if (this.drag) {
      const a = this.devs[this.drag.from].tip()
      this.dashes(ctx, a, this.drag, { alpha: 1, flat: true })
    }
    if (this.travel) this.drawTravel(ctx)

    this.fx.draw(ctx)
    if (this.devs.length < MAX_DEVICES && !this.travel) {
      const r = this.addRect()
      button(ctx, r, {
        color: '#fff',
        pressed: this.pressed === 'add',
        radius: 31,
        icon: (c, s) => {
          drawEgg(c, null, -s * 0.1, s * 0.42, s * 0.8)
          label(c, '+', s * 0.36, -s * 0.22, s * 0.7, '#ff5a8a')
        },
      })
    }
    if (this.picker) this.drawPicker(ctx)
    if (this.wipe > 0) {
      const c = this.devs[this.hostSlot].screenCentre()
      oval(ctx, c.x, c.y, ease.in(this.wipe) * Math.hypot(w, h), ease.in(this.wipe) * Math.hypot(w, h))
      paint(ctx, this.devs[this.hostSlot].shell.wall)
    }
  }

  private curve(a: Pt, b: Pt, t: number): Pt {
    const lift = Math.max(36, dist(a, b) * 0.26)
    const cx = (a.x + b.x) / 2
    const cy = Math.max(14, Math.min(a.y, b.y) - lift)
    const u = 1 - t
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
  }

  /** Pencil dashes from antenna to antenna, like the line on the drawing. */
  private dashes(ctx: Ctx, a: Pt, b: Pt, o: { alpha: number; march?: number; upto?: number; flat?: boolean }): void {
    const at = (t: number): Pt => (o.flat ? { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } : this.curve(a, b, t))
    const length = dist(a, b) * (o.flat ? 1 : 1.15)
    const period = 30
    const n = Math.max(2, Math.floor(length / period))
    const shift = (((o.march ?? 0) % period) + period) % period / period
    ctx.save()
    ctx.globalAlpha = o.alpha
    for (let i = -1; i < n; i++) {
      const t0 = (i + shift) / n
      const t1 = t0 + 0.52 / n
      if (t1 <= 0 || t0 >= (o.upto ?? 1)) continue
      const p = at(clamp(t0))
      const q = at(clamp(Math.min(t1, o.upto ?? 1)))
      line(ctx, [p.x, p.y, q.x, q.y], 7, INK)
      if (o.march !== undefined) line(ctx, [p.x, p.y, q.x, q.y], 3, '#ffe27a')
    }
    ctx.restore()
  }

  private finger(ctx: Ctx, x: number, y: number, alpha: number): void {
    ctx.save()
    ctx.globalAlpha = clamp(alpha)
    rr(ctx, x - 9, y - 12, 18, 34, 9)
    paint(ctx, '#fff', 3)
    oval(ctx, x, y - 12, 6, 6)
    paint(ctx, '#ffd9e6')
    ctx.restore()
  }

  private drawTravel(ctx: Ctx): void {
    const tr = this.travel!
    const hostDev = this.devs[this.hostSlot]
    for (const slot of tr.slots) {
      if (slot === this.hostSlot) continue
      const d = this.devs[slot]
      const k = clamp(tr.t / 1.4)
      let p: Pt
      if (k < 0.25) {
        const c = d.screenCentre()
        const tip = d.tip()
        p = { x: lerp(c.x, tip.x, ease.inOut(k / 0.25)), y: lerp(c.y, tip.y, ease.inOut(k / 0.25)) }
      } else if (k < 0.8) p = this.curve(d.tip(), hostDev.tip(), ease.inOut((k - 0.25) / 0.55))
      else {
        const c = hostDev.screenCentre()
        const tip = hostDev.tip()
        p = { x: lerp(tip.x, c.x, ease.inOut((k - 0.8) / 0.2)), y: lerp(tip.y, c.y, ease.inOut((k - 0.8) / 0.2)) }
      }
      if (k < 1) {
        const col = EGG_COLORS[d.data.species][1]
        this.fx.add('spark', p.x + (Math.random() - 0.5) * 10, p.y + (Math.random() - 0.5) * 10, { color: col, size: 16, vy: 10, max: 0.5 })
        ctx.save()
        ctx.shadowColor = '#fff'
        ctx.shadowBlur = 20
        oval(ctx, p.x, p.y, 15, 15)
        paint(ctx, col, 3)
        ctx.restore()
        oval(ctx, p.x - 4, p.y - 5, 4, 4)
        paint(ctx, '#fff')
      }
    }
  }

  private drawPicker(ctx: Ctx): void {
    const host = this.host
    const lay = this.pickerLayout()
    const k = ease.back(clamp(this.picker!.t * 4))
    ctx.fillStyle = 'rgba(59,42,74,0.45)'
    ctx.fillRect(0, 0, host.w, host.h)
    ctx.save()
    const cx = lay.panel.x + lay.panel.w / 2
    const cy = lay.panel.y + lay.panel.h / 2
    ctx.translate(cx, cy)
    ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k)
    ctx.translate(-cx, -cy)
    rr(ctx, lay.panel.x, lay.panel.y + 6, lay.panel.w, lay.panel.h, 30)
    paint(ctx, INK)
    rr(ctx, lay.panel.x, lay.panel.y, lay.panel.w, lay.panel.h, 30)
    paint(ctx, '#fff8fb', 3)
    label(ctx, host.t('pickTitle'), cx, lay.panel.y + 32, 26, INK, { outline: null, maxWidth: lay.panel.w - 130 })
    const free = choosable(host.save, this.picker!.slot)
    const current = this.picker!.slot >= 0 ? host.save.devices[this.picker!.slot].species : null
    for (const c of lay.cards) {
      const open = isUnlocked(host.save, c.species)
      const ok = open && free.includes(c.species)
      rr(ctx, c.r.x, c.r.y, c.r.w, c.r.h, 20)
      paint(ctx, c.species === current ? '#ffe9a8' : open ? EGG_COLORS[c.species][0] : '#eee8f4', 3)
      const size = Math.min(c.r.h * 0.62, c.r.w * 0.6)
      const px = c.r.x + c.r.w / 2
      const py = c.r.y + c.r.h * 0.74
      ctx.save()
      if (!ok) ctx.globalAlpha = 0.45
      if (open) drawPet(ctx, c.species, lookOf(host.save, c.species), { x: px, y: py, size, eyes: ok ? 'open' : 'closed' }, host.time)
      else {
        ctx.globalAlpha = 1
        drawEgg(ctx, null, px, py, size * 0.95, 0, Math.sin(host.time * 2 + px) * 0.05)
        label(ctx, '?', px, py - size * 0.45, size * 0.4, '#b9a9cf', { outline: null })
      }
      ctx.restore()
      if (open) label(ctx, host.petName(c.species), px, c.r.y + c.r.h - 14, 15, INK, { outline: null, maxWidth: c.r.w - 10 })
      else {
        heart(ctx, px - 16, c.r.y + c.r.h - 15, 18)
        label(ctx, String(UNLOCK_AT[c.species]), px + 10, c.r.y + c.r.h - 14, 17, INK, { outline: null })
      }
    }
    button(ctx, lay.close, { color: '#ff8fb0', radius: 22, icon: (c, s) => line(c, [-s * 0.28, -s * 0.28, s * 0.28, s * 0.28, 0, 0, -s * 0.28, s * 0.28, s * 0.28, -s * 0.28], 5, '#fff') })
    if (lay.remove) button(ctx, lay.remove, { color: '#b9a9cf', radius: 20, text: host.t('remove') })
    ctx.restore()
  }

  private drawDevice(ctx: Ctx, d: Dev): void {
    const host = this.host
    const sh = d.shell
    const t = host.time
    const ready = d.phase === 'ready'
    ctx.save()
    ctx.translate(d.box.x + Math.sin(t * 46) * d.shake * 5 * d.box.s, d.box.y)
    ctx.scale(d.box.s, d.box.s)
    oval(ctx, 130, 384, 104, 10)
    paint(ctx, 'rgba(59,42,74,0.14)')

    // Antenna.
    const a = d.antenna()
    line(ctx, [a.bx, a.by, a.tx, a.ty], 25)
    line(ctx, [a.bx, a.by, a.tx, a.ty], 18, sh.accent)
    line(ctx, [a.bx - 4, a.by - 8, a.tx - 4, a.ty + 6], 4, 'rgba(255,255,255,0.45)')
    ctx.save()
    if (ready) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6)
      ctx.shadowColor = '#fff7a8'
      ctx.shadowBlur = 14 + pulse * 16
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.9 + i * 0.5) % 1
        ctx.globalAlpha = (1 - k) * 0.8
        ctx.beginPath()
        ctx.arc(a.tx, a.ty, 16 + k * 26, -2.4, -0.7)
        ctx.lineWidth = 4
        ctx.strokeStyle = '#fff'
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    oval(ctx, a.tx, a.ty, 14, 14)
    paint(ctx, ready ? '#fff3a0' : sh.light, 3.5)
    ctx.restore()

    // Shell.
    const shellPath = (): void => {
      ctx.beginPath()
      ctx.moveTo(130, 84)
      ctx.bezierCurveTo(202, 84, 252, 188, 252, 262)
      ctx.bezierCurveTo(252, 340, 198, 386, 130, 386)
      ctx.bezierCurveTo(62, 386, 8, 340, 8, 262)
      ctx.bezierCurveTo(8, 188, 58, 84, 130, 84)
      ctx.closePath()
    }
    shellPath()
    const enamel = ctx.createLinearGradient(30, 105, 240, 345)
    enamel.addColorStop(0, sh.light)
    enamel.addColorStop(0.38, sh.shell)
    enamel.addColorStop(0.77, sh.shell)
    enamel.addColorStop(1, sh.dark)
    paint(ctx, enamel, 3.5)
    ctx.save()
    shellPath()
    ctx.clip()
    oval(ctx, 130, 420, 190, 110)
    paint(ctx, sh.dark)
    oval(ctx, 70, 150, 22, 46, 0.5)
    paint(ctx, 'rgba(255,255,255,0.42)')
    oval(ctx, 100, 108, 12, 7, -0.2)
    paint(ctx, 'rgba(255,255,255,0.42)')
    ctx.restore()

    // The model name is stamped directly into the enamel.
    label(ctx, host.petName(d.data.species), 130, 119, 13, INK, { outline: null, maxWidth: 105 })

    // Screen.
    rr(ctx, SCR.x - 9, SCR.y - 9, SCR.w + 18, SCR.h + 18, SCR.r + 8)
    paint(ctx, sh.dark, 3.5)
    ctx.save()
    rr(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r)
    ctx.clip()
    ctx.translate(SCR.x, SCR.y)
    this.drawScreen(ctx, d)
    ctx.restore()
    rr(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r)
    paint(ctx, null, 3.5)

    // The five lights.
    for (let i = 0; i < DOTS; i++) {
      const x = 130 + (i - 2) * 27
      const y = 342 - (i - 2) ** 2 * 2.6
      const lit = i < d.data.dots
      const r = 9.5 * (1 + ease.hop(d.pop[i]) * 0.7)
      ctx.save()
      if (lit) {
        ctx.shadowColor = sh.accent
        ctx.shadowBlur = 8
      }
      oval(ctx, x, y, r, r)
      paint(ctx, lit ? sh.accent : sh.dark, 3)
      ctx.restore()
      if (lit) {
        oval(ctx, x - 3, y - 3, 2.8, 2.8)
        paint(ctx, 'rgba(255,255,255,0.8)')
      }
    }
    // The little egg button: choose who lives here.
    if (d.data.hatched && d.phase !== 'away') {
      oval(ctx, 130, 369, 13, 11)
      paint(ctx, sh.light, 3)
      drawEgg(ctx, null, 130, 376, 14)
    }
    ctx.restore()
  }

  /** Inside one screen; the origin is the screen's top-left corner. */
  private drawScreen(ctx: Ctx, d: Dev): void {
    const host = this.host
    const sh = d.shell
    const t = host.time
    const species = d.data.species
    ctx.fillStyle = sh.wall
    ctx.fillRect(0, 0, SCR.w, SCR.h)
    ctx.fillStyle = sh.floor
    ctx.globalAlpha = 0.5
    for (let y = 16, r = 0; y < FY; y += 24, r++)
      for (let x = r % 2 ? 24 : 12; x < SCR.w; x += 24) {
        oval(ctx, x, y, 2, 2)
        ctx.fill()
      }
    ctx.globalAlpha = 1
    ctx.fillRect(0, FY, SCR.w, SCR.h - FY)
    const island = host.save.windowView
    if (island) {
      let picture = this.windowArt.get(island)
      if (!picture) {
        picture = new Image()
        picture.src = '/tamagochi/' + island + '.webp'
        this.windowArt.set(island, picture)
      }
      if (picture.complete && picture.naturalWidth) {
        ctx.save()
        rr(ctx, 78, 7, 79, 67, 14)
        paint(ctx, '#fff5dc', 2)
        rr(ctx, 82, 11, 71, 59, 10)
        ctx.clip()
        ctx.drawImage(picture, 0, 50, 480, 400, 82, 11, 71, 59)
        ctx.restore()
      }
    }
    drawRoomProps(ctx, host.save.owned, SCR.w, SCR.h, FY, d.slot)

    const ground = FY + 12
    const anim = d.anim
    const k = anim ? clamp(anim.t / ANIM_DUR[anim.kind]) : 0

    if (d.phase === 'egg') {
      const wobble = Math.sin(t * 9) * Math.max(d.shake, Math.max(0, Math.sin(t * 1.6)) ** 6 * 0.5) * 0.16
      oval(ctx, SCR.w / 2, ground + 2, 30, 6)
      paint(ctx, 'rgba(59,42,74,0.16)')
      drawEgg(ctx, species, SCR.w / 2, ground + 2, 70, d.cracks, wobble)
    } else if (d.phase !== 'away') {
      const pose: Pose = { x: d.x, y: ground, size: PET_SIZE, face: d.face }
      const walking = Math.abs(d.tx - d.x) > 0.8 && !anim && d.phase !== 'sleep'
      if (walking) pose.walk = t * 11
      if (d.phase === 'want') {
        pose.squash = Math.sin(t * 5) * 0.06
        if (d.want === 'food') pose.mouth = 'o'
        if (d.want === 'sleep') pose.eyes = 'closed'
      }
      if (d.phase === 'sleep') {
        pose.eyes = 'closed'
        pose.squash = 0.14 + Math.sin(t * 2) * 0.05
      }
      if (d.phase === 'ready' && !anim) {
        pose.eyes = 'happy'
        pose.armR = 2.2 + Math.sin(t * 7) * 0.5
      }
      if (anim) {
        if (anim.kind === 'eat') {
          pose.mouth = k < 0.3 ? 'open' : 'chew'
          pose.eyes = 'happy'
          pose.squash = k > 0.3 ? Math.sin(k * 26) * 0.07 : 0
        } else if (anim.kind === 'toss') {
          pose.lift = ease.hop(clamp((k - 0.2) / 0.6)) * 30
          pose.armL = pose.armR = 2.6
          pose.eyes = 'happy'
          pose.mouth = 'open'
        } else if (anim.kind === 'sweep' || anim.kind === 'hop') {
          pose.lift = ease.hop(k) * (anim.kind === 'hop' ? 20 : 12)
          pose.eyes = 'happy'
          pose.squash = k < 0.15 ? 0.3 : -0.1
        } else if (anim.kind === 'trick') {
          pose.eyes = 'happy'
          pose.mouth = 'open'
          pose.armL = pose.armR = 2.5
          if (species === 'banana') pose.flip = Math.cos(k * TAU * 2)
          else if (species === 'monkey') {
            pose.rot = ease.inOut(k) * TAU
            pose.lift = ease.hop(k) * 30
          } else {
            pose.lift = ease.hop(k) * 24
            pose.lean = Math.sin(k * TAU * 2) * 0.14
          }
        } else if (anim.kind === 'no') {
          pose.lean = Math.sin(k * TAU * 3) * 0.12
          pose.mouth = 'sad'
        } else if (anim.kind === 'arrive') {
          pose.squash = -0.6 * (1 - ease.back(k))
          pose.eyes = 'happy'
          pose.armL = pose.armR = 2.4
        }
      }

      // Things "под ними": food and the ball lie in front of the pet, poops on both sides.
      const showWant = (d.phase === 'want' || d.phase === 'act') && d.want
      if (showWant && d.want === 'poop') {
        const slide = anim?.kind === 'sweep' ? ease.in(k) * 190 : 0
        ctx.save()
        ctx.globalAlpha = anim?.kind === 'sweep' ? 1 - k * 0.6 : 1
        drawPoop(ctx, 52 - slide, FY + 40 - Math.sin(k * Math.PI) * 14, 34, t)
        drawPoop(ctx, 132 - slide * 1.15, FY + 44 - Math.sin(k * Math.PI) * 10, 34, t + 1)
        ctx.restore()
      }
      drawPet(ctx, species, lookOf(host.save, species), pose, t)
      if (showWant && d.want === 'food') {
        const flying = anim?.kind === 'eat' && k < 0.3
        const eaten = anim?.kind === 'eat' && k >= 0.3
        for (let i = 0; i < d.left - (eaten || flying ? 1 : 0); i++) drawFood(ctx, species, SCR.w / 2 - 20 + i * 40, FY + 42, 32)
        if (flying) {
          const kk = ease.inOut(k / 0.3)
          drawFood(ctx, species, lerp(SCR.w / 2 + (d.left - 1) * 40 - 20, d.x, kk), lerp(FY + 42, ground - PET_SIZE * 0.45, kk), 32 * (1 - kk * 0.4))
        }
      }
      if (showWant && d.want === 'play') {
        const up = anim?.kind === 'toss' ? ease.hop(k) : 0
        drawBall(ctx, d.x + (anim?.kind === 'toss' ? Math.sin(k * 6) * 4 : 0), FY + 40 - up * 118, 26, t * 2 + k * 9)
      }
    }

    // Night: the screen goes black, as Matryona said.
    if (d.phase === 'sleep') {
      const night = clamp(Math.min(d.t / 0.8, (SLEEP_SECONDS - d.t) / 0.8))
      ctx.fillStyle = `rgba(22,17,44,${night * 0.93})`
      ctx.fillRect(0, 0, SCR.w, SCR.h)
      ctx.save()
      ctx.globalAlpha = night
      drawItem(ctx, 'moon', 138, 42, 40)
      for (const [x, y, ph] of [
        [34, 30, 0],
        [70, 54, 1.3],
        [100, 24, 2.1],
        [48, 84, 3.4],
        [150, 86, 4.2],
        [116, 66, 5],
      ]) {
        const s = 6 + Math.sin(t * 3 + ph) * 2.5
        oval(ctx, x, y, s * 0.35, s * 0.35)
        paint(ctx, '#fff7c9')
      }
      for (const tw of d.twinkles) {
        ctx.globalAlpha = night * (1 - tw.t / 1.2)
        ctx.save()
        ctx.translate(tw.x, tw.y)
        ctx.rotate(tw.t * 2)
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const rad = (i % 2 ? 4 : 13) * (0.6 + tw.t)
          ctx.lineTo(Math.cos((i / 8) * TAU) * rad, Math.sin((i / 8) * TAU) * rad)
        }
        ctx.closePath()
        paint(ctx, '#fff7c9')
        ctx.restore()
      }
      ctx.restore()
    }
    d.fx.draw(ctx)

    // The wish bubble.
    if (d.phase === 'want' && d.want) {
      const bob = Math.sin(t * 4) * 2
      const bx = 36
      const by = 36 + bob
      ctx.beginPath()
      ctx.moveTo(bx + 14, by + 16)
      ctx.lineTo(bx + 30, by + 34)
      ctx.lineTo(bx + 22, by + 8)
      ctx.closePath()
      paint(ctx, '#fff', 3)
      oval(ctx, bx, by, 24, 22)
      paint(ctx, '#fff', 3)
      if (d.want === 'food') drawFood(ctx, species, bx, by, 30)
      else if (d.want === 'poop') drawPoop(ctx, bx, by + 13, 30)
      else if (d.want === 'play') drawBall(ctx, bx, by, 26)
      else drawItem(ctx, 'moon', bx, by, 34)
      // The gesture: an arrow that keeps showing the way.
      const first = (host.save.hints[d.want] ?? 0) <= 3
      if (d.want !== 'sleep' && (d.arrow || d.hint > (first ? 0.5 : 3.5))) {
        const kk = (t * 0.9) % 1
        ctx.save()
        ctx.globalAlpha = Math.sin(kk * Math.PI) * 0.95
        if (d.want === 'poop') this.arrow(ctx, lerp(150, 44, ease.inOut(kk)), FY + 14, Math.PI)
        else this.arrow(ctx, 156, lerp(FY + 36, FY - 56, ease.inOut(kk)), -Math.PI / 2)
        ctx.restore()
      }
    }
    // Glass shine.
    ctx.save()
    ctx.globalAlpha = 0.22
    oval(ctx, 44, 20, 46, 12, -0.5)
    paint(ctx, '#fff')
    ctx.restore()
  }

  private arrow(ctx: Ctx, x: number, y: number, angle: number): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.lineTo(-2, -14)
    ctx.lineTo(-2, -6)
    ctx.lineTo(-18, -6)
    ctx.lineTo(-18, 6)
    ctx.lineTo(-2, 6)
    ctx.lineTo(-2, 14)
    ctx.closePath()
    paint(ctx, '#ff5a8a', 3)
    ctx.restore()
  }
}
