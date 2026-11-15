/**
 * Тамагочи Связь — the visit. The linked pets stand together inside the host's
 * screen, now as big as the whole display. They can hug, and they choose what
 * to do together; after two activities they get hungry and go home.
 */
import { ACTIVITY_NAME } from './tamagochi-copy.ts'
import { bowsGame } from './tamagochi-game-bows.ts'
import { danceGame } from './tamagochi-game-dance.ts'
import { giftsGame } from './tamagochi-game-gifts.ts'
import { hairGame } from './tamagochi-game-hair.ts'
import { ringsGame } from './tamagochi-game-rings.ts'
import { songGame } from './tamagochi-game-song.ts'
import { HomeScene, drawEgg } from './tamagochi-home.ts'
import type { Host } from './tamagochi-host.ts'
import { drawGiftBox } from './tamagochi-items.ts'
import {
  INK,
  Particles,
  SHELLS,
  button,
  clamp,
  drawRoom,
  ease,
  heart,
  hit,
  label,
  lerp,
  line,
  musicNote,
  oval,
  paint,
  rr,
  starsRow,
  type Activity,
  type Ctx,
  type Dir,
  type MeetPet,
  type Pointer,
  type Rect,
  type Scene,
  type Shell,
  type SpeciesId,
} from './tamagochi-kit.ts'
import { drawPet, drawWire, type Pose } from './tamagochi-pets.ts'
import { ACTIVITIES, DOTS_AFTER_VISIT, VISIT_ACTIVITIES, addHeart, lookOf, type ActivityId } from './tamagochi-state.ts'

const GAMES: Record<ActivityId, Activity> = {
  dance: danceGame,
  song: songGame,
  rings: ringsGame,
  hair: hairGame,
  gifts: giftsGame,
  bows: bowsGame,
}
const COLORS: Record<ActivityId, string> = {
  dance: '#ff6fb5',
  song: '#a66bff',
  rings: '#3db8ff',
  hair: '#ff9a3d',
  gifts: '#f0506e',
  bows: '#44cf8a',
}

function icon(id: ActivityId, ctx: Ctx, s: number): void {
  if (id === 'dance') {
    // Three arrows: the dance moves.
    for (const [x, y, a] of [
      [0, -0.24, -Math.PI / 2],
      [-0.3, 0.2, Math.PI],
      [0.3, 0.2, 0],
    ]) {
      ctx.save()
      ctx.translate(x * s, y * s)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.moveTo(0.2 * s, 0)
      ctx.lineTo(0, -0.17 * s)
      ctx.lineTo(0, -0.07 * s)
      ctx.lineTo(-0.18 * s, -0.07 * s)
      ctx.lineTo(-0.18 * s, 0.07 * s)
      ctx.lineTo(0, 0.07 * s)
      ctx.lineTo(0, 0.17 * s)
      ctx.closePath()
      paint(ctx, '#fff', 3)
      ctx.restore()
    }
  } else if (id === 'song') {
    musicNote(ctx, -0.16 * s, 0.06 * s, 0.62 * s, '#fff')
    musicNote(ctx, 0.26 * s, -0.08 * s, 0.44 * s, '#ffe27a')
  } else if (id === 'rings') {
    for (const side of [-1, 1]) {
      line(ctx, [side * 0.2 * s, -0.46 * s, side * 0.2 * s, 0], 4)
      oval(ctx, side * 0.2 * s, 0.16 * s, 0.17 * s, 0.17 * s)
      ctx.lineWidth = 0.1 * s
      ctx.strokeStyle = INK
      ctx.stroke()
      ctx.lineWidth = 0.055 * s
      ctx.strokeStyle = '#fff'
      ctx.stroke()
    }
  } else if (id === 'hair') {
    // A comb and a curl.
    rr(ctx, -0.4 * s, -0.3 * s, 0.5 * s, 0.16 * s, 0.05 * s)
    paint(ctx, '#fff', 3)
    for (let i = 0; i < 5; i++) line(ctx, [(-0.35 + i * 0.1) * s, -0.14 * s, (-0.35 + i * 0.1) * s, 0.14 * s], 4, '#fff')
    ctx.beginPath()
    ctx.arc(0.22 * s, 0.14 * s, 0.17 * s, 0.4, 5.6)
    ctx.arc(0.22 * s, 0.14 * s, 0.07 * s, 5.6, 2.2, true)
    ctx.lineWidth = 0.1 * s
    ctx.lineCap = 'round'
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 0.055 * s
    ctx.strokeStyle = '#ffe27a'
    ctx.stroke()
  } else if (id === 'gifts') drawGiftBox(ctx, 0, 0.04 * s, 0.9 * s, '#fff', '#ffd23d')
  else drawWire(ctx, 'bow', 1, 0, 0, 0.9 * s)
}

export class MeetScene implements Scene {
  readonly kind = 'meet'
  private host: Host
  private slots: number[]
  readonly shell: Shell
  pets: MeetPet[]
  private fx = new Particles()
  act: Scene | null = null
  actId: ActivityId | null = null
  count = 0
  private hugged = false
  result: { stars: number; t: number; egg: SpeciesId | null } | null = null
  private leaving: number | null = null
  private t = 0
  private drag: { i: number; id: number; x: number; y: number } | null = null
  hug: { a: number; b: number; t: number } | null = null
  private tricks: number[]
  private pressed: string | null = null
  private auto: ActivityId | null

  constructor(host: Host, slots: number[], hostSlot: number, auto: ActivityId | null) {
    this.host = host
    this.slots = slots
    this.shell = SHELLS[hostSlot % SHELLS.length]
    this.auto = auto
    this.pets = slots.map((slot) => {
      const species = host.save.devices[slot].species
      return {
        species,
        slot,
        look: lookOf(host.save, species),
        get name() {
          return host.petName(species)
        },
      }
    })
    this.tricks = slots.map(() => 9)
  }

  enter(): void {
    const host = this.host
    host.sfx.loop(null)
    if (this.auto) this.startActivity(this.auto)
    else host.say(host.t('meetHello'))
  }

  leave(): void {
    this.act?.leave?.()
    this.host.sfx.loop(null)
  }

  resize(): void {
    this.act?.resize?.()
  }

  // ---------------------------------------------------------------- layout

  private places(): { x: number; y: number; size: number }[] {
    const { w, h, safe } = this.host
    const n = this.pets.length
    const lane = Math.min(w / n, 300)
    const size = Math.min(180, h * 0.25, lane * 0.62)
    const y = h - Math.max(62, h * 0.1)
    return this.pets.map((_, i) => ({ x: safe.x + w / 2 + (i - (n - 1) / 2) * lane, y, size }))
  }

  private buttons(): { id: ActivityId; r: Rect }[] {
    const { w, safe } = this.host
    const place = this.places()[0]
    const top = safe.y + 6
    const bottom = place.y - place.size * 1.22
    const height = Math.max(60, bottom - top)
    let best = { cols: 3, size: 0 }
    for (const cols of [6, 3, 2]) {
      const rows = ACTIVITIES.length / cols
      const size = Math.min((w - 24) / cols - 12, height / rows - 12, 168)
      if (size > best.size) best = { cols, size }
    }
    const { cols, size } = best
    const rows = ACTIVITIES.length / cols
    const gap = 12
    const x0 = (w - cols * size - (cols - 1) * gap) / 2
    const y0 = top + (height - rows * size - (rows - 1) * gap) / 2
    return ACTIVITIES.map((id, i) => ({
      id,
      r: { x: x0 + (i % cols) * (size + gap), y: y0 + Math.floor(i / cols) * (size + gap), w: size, h: size },
    }))
  }

  private hudRect(): Rect {
    return { x: 10, y: 10, w: 86, h: 44 }
  }
  private backRect(): Rect {
    return { x: 106, y: 8, w: 50, h: 46 }
  }

  // ---------------------------------------------------------------- flow

  private startActivity(id: ActivityId): void {
    const host = this.host
    this.actId = id
    this.result = null
    host.say(ACTIVITY_NAME[host.lang][id])
    this.act = GAMES[id]({
      game: host,
      pets: this.pets,
      shell: this.shell,
      owned: () => host.save.owned,
      own: (item) => {
        if (!host.save.owned.includes(item)) host.save.owned.push(item)
        host.persist()
      },
      times: host.save.played[id] ?? 0,
      done: (stars) => this.finish(clamp(Math.round(stars), 1, 3)),
    })
    this.act.enter?.()
  }

  private finish(stars: number): void {
    const host = this.host
    if (!this.act || !this.actId || this.result) return
    this.act.leave?.()
    this.act = null
    host.sfx.loop(null)
    host.save.played[this.actId] = (host.save.played[this.actId] ?? 0) + 1
    const egg = addHeart(host.save)
    host.persist()
    this.count++
    this.result = { stars, t: 0, egg }
    host.sfx.play('yay')
    host.say(egg ? host.t('unlocked', { name: host.petName(egg) }) : host.t('heart'))
  }

  private abort(): void {
    this.act?.leave?.()
    this.act = null
    this.actId = null
    this.host.sfx.loop(null)
    this.host.sfx.play('tap')
    // Hairdos and gifts made before backing out are kept.
    this.host.persist()
  }

  private goHome(): void {
    if (this.leaving !== null) return
    this.leaving = 0
    this.host.say(this.host.t('goHome'))
  }

  // ---------------------------------------------------------------- update

  update(dt: number): void {
    const host = this.host
    this.t += dt
    this.fx.update(dt)
    this.tricks = this.tricks.map((v) => v + dt)
    if (this.act) return this.act.update(dt)
    if (this.result) {
      const before = this.result.t
      this.result.t += dt
      for (let i = 0; i < this.result.stars; i++)
        if (before < 0.35 + i * 0.3 && this.result.t >= 0.35 + i * 0.3) host.sfx.play('star', i)
      if (before < 1.4 && this.result.t >= 1.4) {
        host.sfx.play('heart')
        this.fx.burst('heart', host.w / 2, host.h * 0.52, 12, { size: 22 })
        if (this.result.egg) host.sfx.play('unlock')
      }
      if (this.result.t > (this.result.egg ? 5 : 3)) this.closeResult()
    }
    if (this.hug) {
      this.hug.t += dt
      if (this.hug.t > 1.9) this.hug = null
    }
    if (this.leaving !== null) {
      this.leaving += dt
      if (this.leaving > 2.3) {
        for (const slot of this.slots) host.save.devices[slot].dots = DOTS_AFTER_VISIT
        host.persist()
        host.go(new HomeScene(host))
      }
    }
  }

  private closeResult(): void {
    this.result = null
    this.actId = null
    if (this.count >= VISIT_ACTIVITIES) this.goHome()
  }

  // ---------------------------------------------------------------- fingers

  private petAt(p: { x: number; y: number }): number {
    return this.places().findIndex((pl) => Math.abs(p.x - pl.x) < pl.size * 0.5 && p.y < pl.y + 16 && p.y > pl.y - pl.size * 1.15)
  }

  down(p: Pointer): void {
    if (this.act) {
      if (hit(this.backRect(), p, 6)) this.pressed = 'back'
      else this.act.down?.(p)
      return
    }
    if (this.result || this.leaving !== null || this.hug) return
    const b = this.buttons().find((btn) => hit(btn.r, p))
    this.pressed = b ? b.id : hit(this.backRect(), p, 6) ? 'back' : null
    const i = this.petAt(p)
    if (i >= 0 && !this.drag) this.drag = { i, id: p.id, x: p.x, y: p.y }
  }

  move(p: Pointer): void {
    if (this.act) return this.act.move?.(p)
    if (this.drag && this.drag.id === p.id) {
      this.drag.x = p.x
      this.drag.y = p.y
    }
  }

  up(p: Pointer): void {
    const pressed = this.pressed
    this.pressed = null
    if (this.act) {
      if (pressed !== 'back') this.act.up?.(p)
      return
    }
    const g = this.drag
    if (!g || g.id !== p.id) return
    this.drag = null
    if (!p.swiped) return
    const places = this.places()
    const other = places.findIndex((pl, i) => i !== g.i && Math.abs(p.x - pl.x) < pl.size * 0.85 && Math.abs(p.y - (pl.y - pl.size * 0.45)) < pl.size * 1.1)
    if (other < 0) return this.host.say(this.host.t('hugHint'), true)
    this.startHug(g.i, other)
  }

  private startHug(a: number, b: number): void {
    const host = this.host
    this.hug = { a, b, t: 0 }
    host.sfx.play('hug')
    host.sfx.note(76, 0.4, this.pets[a].species)
    host.sfx.note(72, 0.4, this.pets[b].species, 0.15)
    host.say(host.t('hug'))
    if (!this.hugged) {
      // The first hug of a visit is worth a friendship heart.
      this.hugged = true
      const egg = addHeart(host.save)
      host.persist()
      if (egg) {
        this.result = { stars: 0, t: 1.2, egg }
        host.say(host.t('unlocked', { name: host.petName(egg) }))
      }
    }
  }

  tap(p: Pointer): void {
    const host = this.host
    if (this.act) {
      if (hit(this.backRect(), p, 6)) this.abort()
      else this.act.tap?.(p)
      return
    }
    if (this.result) {
      if (this.result.t > 1.2) this.closeResult()
      return
    }
    if (this.leaving !== null || this.hug) return
    if (hit(this.backRect(), p, 6)) {
      host.sfx.play('tap')
      return this.goHome()
    }
    if (hit(this.hudRect(), p, 6)) {
      host.sfx.play('heart')
      return host.say(host.t('hearts', { n: host.save.hearts }))
    }
    const b = this.buttons().find((btn) => hit(btn.r, p))
    if (b) {
      host.sfx.play('pop')
      return this.startActivity(b.id)
    }
    const i = this.petAt(p)
    if (i >= 0) {
      this.tricks[i] = 0
      host.sfx.play(this.pets[i].species === 'banana' ? 'spin' : 'boing')
      host.sfx.note(72 + i * 3, 0.3, this.pets[i].species)
      host.say(this.pets[i].name, true)
    }
  }

  swipe(p: Pointer, dir: Dir): void {
    if (this.act && this.pressed !== 'back') this.act.swipe?.(p, dir)
  }

  // ---------------------------------------------------------------- drawing

  draw(ctx: Ctx): void {
    const host = this.host
    const { w, h, time } = host
    if (this.act) {
      this.act.draw(ctx)
      this.drawHud(ctx, true)
      return
    }
    const places = this.places()
    drawRoom(ctx, host, this.shell, places[0].y - places[0].size * 0.34)

    for (const b of this.buttons()) {
      const fresh = !(host.save.played[b.id] ?? 0)
      button(ctx, b.r, {
        color: COLORS[b.id],
        pressed: this.pressed === b.id,
        radius: b.r.w * 0.3,
        text: ACTIVITY_NAME[host.lang][b.id],
        icon: (c, s) => icon(b.id, c, s),
        dim: this.leaving !== null,
      })
      if (fresh && this.leaving === null) {
        const pulse = 1 + Math.sin(time * 5 + b.r.x) * 0.15
        ctx.save()
        ctx.translate(b.r.x + b.r.w - 10, b.r.y + 12)
        ctx.scale(pulse, pulse)
        ctx.rotate(time)
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const rad = i % 2 ? 4 : 12
          ctx.lineTo(Math.cos((i / 8) * Math.PI * 2) * rad, Math.sin((i / 8) * Math.PI * 2) * rad)
        }
        ctx.closePath()
        paint(ctx, '#ffe27a', 2.5)
        ctx.restore()
      }
    }

    // Pets.
    const order = this.pets.map((_, i) => i).sort((a, b) => (this.drag?.i === a ? 1 : 0) - (this.drag?.i === b ? 1 : 0))
    for (const i of order) {
      const pl = places[i]
      const pet = this.pets[i]
      const mid = w / 2
      const pose: Pose = { x: pl.x, y: pl.y, size: pl.size, face: clamp((mid - pl.x) / 200, -1, 1), squash: Math.sin(time * 3 + i * 1.7) * 0.04 }
      const arrive = clamp((this.t - i * 0.12) / 0.5)
      if (arrive < 1) pose.squash = -0.7 * (1 - ease.back(arrive))
      const trick = this.tricks[i]
      if (trick < 0.85) {
        const k = trick / 0.85
        pose.eyes = 'happy'
        pose.mouth = 'open'
        pose.armL = pose.armR = 2.5
        if (pet.species === 'banana') pose.flip = Math.cos(k * Math.PI * 4)
        else if (pet.species === 'monkey') {
          pose.rot = ease.inOut(k) * Math.PI * 2
          pose.lift = ease.hop(k) * pl.size * 0.4
        } else pose.lift = ease.hop(k) * pl.size * 0.3
      }
      if (this.drag?.i === i) {
        pose.x = this.drag.x
        pose.lift = Math.max(0, pl.y - this.drag.y - pl.size * 0.4)
        pose.armL = pose.armR = 2.2
        pose.eyes = 'wide'
        pose.mouth = 'o'
      } else if (this.drag) pose.face = clamp((this.drag.x - pl.x) / 160, -1, 1)
      if (this.hug && (this.hug.a === i || this.hug.b === i)) {
        const k = ease.hop(clamp(this.hug.t / 1.9) ** 0.6)
        const a = places[this.hug.a]
        const b = places[this.hug.b]
        const centre = (a.x + b.x) / 2
        const side = pl.x < centre || (pl.x === centre && this.hug.a === i) ? -1 : 1
        pose.x = lerp(pl.x, centre + side * pl.size * 0.3, clamp(k * 1.6))
        pose.face = -side
        pose.lean = -side * 0.14 * clamp(k * 1.6)
        pose.armL = pose.armR = 1.5
        pose.eyes = 'closed'
        pose.mouth = 'smile'
        if (Math.random() < 0.12) this.fx.add('heart', centre + (Math.random() - 0.5) * pl.size, pl.y - pl.size * (0.7 + Math.random() * 0.5), { vy: -70, max: 1.1, size: 20 })
      }
      if (this.result && this.result.t < 2.6) {
        pose.lift = Math.abs(Math.sin(this.result.t * 7 + i)) * pl.size * 0.18
        pose.eyes = 'happy'
        pose.armL = pose.armR = 2.6
        pose.mouth = 'open'
      }
      if (this.leaving !== null) {
        pose.mouth = 'o'
        pose.eyes = this.leaving > 0.8 ? 'closed' : 'open'
        pose.squash = 0.1
      }
      drawPet(ctx, pet.species, pet.look, pose, time)
    }
    this.fx.draw(ctx)

    if (this.result) this.drawResult(ctx)
    this.drawHud(ctx, false)
    if (this.leaving !== null && this.leaving > 1.7) {
      ctx.fillStyle = `rgba(255,255,255,${clamp((this.leaving - 1.7) / 0.5)})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  private drawHud(ctx: Ctx, playing: boolean): void {
    const host = this.host
    const r = this.hudRect()
    rr(ctx, r.x, r.y + 3, r.w, r.h, 22)
    paint(ctx, INK)
    rr(ctx, r.x, r.y, r.w, r.h, 22)
    paint(ctx, '#fff', 3)
    heart(ctx, r.x + 24, r.y + 22, 26)
    label(ctx, String(host.save.hearts), r.x + 58, r.y + 23, 22, INK, { outline: null })
    const b = this.backRect()
    button(ctx, b, {
      color: playing ? '#b9a9cf' : this.shell.shell,
      radius: 20,
      pressed: this.pressed === 'back',
      icon: (c, s) => {
        if (playing) line(c, [s * 0.26, 0, -s * 0.26, 0, -s * 0.02, -s * 0.24, -s * 0.26, 0, -s * 0.02, s * 0.24], 5, '#fff')
        else {
          // A little tamagotchi: back home.
          drawEgg(c, null, 0, s * 0.42, s * 0.84)
          rr(c, -s * 0.16, -s * 0.18, s * 0.32, s * 0.26, s * 0.08)
          paint(c, this.shell.wall, 2)
        }
      },
    })
    if (!playing) {
      // How many activities are left in this visit.
      for (let i = 0; i < VISIT_ACTIVITIES; i++) {
        oval(ctx, b.x + b.w + 16 + i * 20, b.y + 25, 7, 7)
        paint(ctx, i < VISIT_ACTIVITIES - this.count ? this.shell.accent : '#e6dff0', 2.5)
      }
    }
  }

  private drawResult(ctx: Ctx): void {
    const host = this.host
    const { w, h } = host
    const res = this.result!
    const k = ease.back(clamp(res.t * 3))
    ctx.fillStyle = `rgba(59,42,74,${0.3 * clamp(res.t * 3)})`
    ctx.fillRect(0, 0, w, h)
    const pw = Math.min(w - 40, 380)
    const ph = res.egg ? 250 : 170
    const px = (w - pw) / 2
    const py = h * 0.4 - ph / 2
    ctx.save()
    ctx.translate(w / 2, py + ph / 2)
    ctx.scale(k, k)
    ctx.translate(-w / 2, -(py + ph / 2))
    rr(ctx, px, py + 6, pw, ph, 30)
    paint(ctx, INK)
    rr(ctx, px, py, pw, ph, 30)
    paint(ctx, '#fff8fb', 3)
    if (res.stars > 0) starsRow(ctx, w / 2, py + 58, 62, clamp((res.t - 0.35) / 0.3, 0, res.stars))
    const hk = ease.back(clamp((res.t - 1.4) * 3))
    if (hk > 0) {
      heart(ctx, w / 2 - 18, py + (res.stars ? 126 : 60), 44 * hk)
      label(ctx, '+1', w / 2 + 30, py + (res.stars ? 126 : 60), 30 * hk, '#ff5a8a', { outline: null })
    }
    if (res.egg) {
      const ek = ease.back(clamp((res.t - 1.9) * 3))
      drawEgg(ctx, res.egg, w / 2, py + ph - 34, 64 * ek, 0, Math.sin(res.t * 8) * 0.08)
      label(ctx, host.petName(res.egg), w / 2, py + ph - 18, 18 * ek, INK, { outline: null })
    }
    ctx.restore()
  }
}
