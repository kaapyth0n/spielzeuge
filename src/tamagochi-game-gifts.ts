/**
 * Тамагочи Связь — «Подарки». The pets give each other presents: the child
 * picks one of three wrapped boxes for the next pet, it flies over along a
 * dashed «связь» line, three taps open it, and the gift is worn, played with
 * or sent home. Every new gift joins the shared collection.
 */
import type { Lang } from './languages.ts'
import { GIFTS, drawGiftBox, drawItem, giftKind } from './tamagochi-items.ts'
import {
  INK,
  Particles,
  TAU,
  clamp,
  dist,
  drawRoom,
  ease,
  heart,
  lerp,
  line,
  oval,
  paint,
  rr,
  type Activity,
  type Ctx,
  type Pointer,
  type Pt,
  type Scene,
} from './tamagochi-kit.ts'
import { drawPet, slotOf, type Pose } from './tamagochi-pets.ts'

type Phase = 'intro' | 'choose' | 'fly' | 'open' | 'show' | 'use' | 'thanks' | 'end'

const LINES: Record<Lang, { choose: (name: string) => string; open: string; thanks: string; home: string; hearts: string }> = {
  ru: { choose: (n) => `${n} ждёт подарок. Выбирай!`, open: 'Открывай! Тук-тук-тук!', thanks: 'Спасибо!', home: 'Это для домика!', hearts: 'Сколько сердечек!' },
  de: { choose: (n) => `Ein Geschenk für ${n}. Such eins aus!`, open: 'Mach auf! Tipp, tipp, tipp!', thanks: 'Danke schön!', home: 'Das ist fürs Zuhause!', hearts: 'So viele Herzen!' },
  en: { choose: (n) => `Pick a gift for ${n}!`, open: 'Open it! Tap, tap, tap!', thanks: 'Thank you!', home: 'This is for the home!', hearts: 'So many hearts!' },
}

const GIFT_NAME: Record<string, Record<Lang, string>> = {
  ball: { ru: 'Мячик', de: 'Ein Ball', en: 'A ball' },
  crown: { ru: 'Корона', de: 'Eine Krone', en: 'A crown' },
  plant: { ru: 'Цветок в горшке', de: 'Eine Pflanze', en: 'A plant' },
  teddy: { ru: 'Плюшевый мишка', de: 'Ein Teddybär', en: 'A teddy bear' },
  sunglasses: { ru: 'Тёмные очки', de: 'Eine Sonnenbrille', en: 'Sunglasses' },
  picture: { ru: 'Картина', de: 'Ein Bild', en: 'A picture' },
  scarf: { ru: 'Шарфик', de: 'Ein Schal', en: 'A scarf' },
  balloon: { ru: 'Воздушный шарик', de: 'Ein Luftballon', en: 'A balloon' },
  party: { ru: 'Праздничный колпачок', de: 'Ein Partyhut', en: 'A party hat' },
  rug: { ru: 'Коврик', de: 'Ein Teppich', en: 'A rug' },
  duck: { ru: 'Уточка', de: 'Eine Quietscheente', en: 'A rubber duck' },
  bowtie: { ru: 'Галстук-бабочка', de: 'Eine Fliege', en: 'A bow tie' },
  lamp: { ru: 'Лампа', de: 'Eine Lampe', en: 'A lamp' },
  cap: { ru: 'Кепка', de: 'Eine Kappe', en: 'A cap' },
  cubes: { ru: 'Кубики', de: 'Bauklötze', en: 'Building blocks' },
  garland: { ru: 'Гирлянда', de: 'Eine Girlande', en: 'A garland' },
  starglasses: { ru: 'Очки-звёздочки', de: 'Eine Sternenbrille', en: 'Star glasses' },
  spinner: { ru: 'Юла', de: 'Ein Kreisel', en: 'A spinning top' },
  beads: { ru: 'Бусы', de: 'Eine Perlenkette', en: 'Beads' },
  clock: { ru: 'Часы', de: 'Eine Uhr', en: 'A clock' },
  car: { ru: 'Машинка', de: 'Ein Spielzeugauto', en: 'A toy car' },
  wreath: { ru: 'Венок', de: 'Ein Blumenkranz', en: 'A flower wreath' },
  tophat: { ru: 'Шляпа-цилиндр', de: 'Ein Zylinder', en: 'A top hat' },
  medal: { ru: 'Медаль', de: 'Eine Medaille', en: 'A medal' },
}

/** Box and ribbon colours. */
const WRAPS = [
  ['#ff6fb5', '#ffd23d'],
  ['#5ab6ff', '#ffffff'],
  ['#5fe0b0', '#f0506e'],
  ['#a66bff', '#ffd23d'],
  ['#ffd23d', '#f0506e'],
  ['#ff9a3d', '#5ab6ff'],
] as const
const SPARKS = ['#ffd23d', '#ff6fb5', '#5ab6ff', '#ffffff']

interface Box {
  gift: string | null
  color: string
  ribbon: string
}
/** A ribbon or lid that was knocked off and tumbles away. */
interface Flyer extends Pt {
  vx: number
  vy: number
  rot: number
  spin: number
  t: number
}

const FLY = 1.0
const lwOf = (s: number): number => Math.max(1.5, s * 0.045)
const bez = (a: Pt, b: Pt, c: Pt, k: number): Pt => ({
  x: (1 - k) ** 2 * a.x + 2 * (1 - k) * k * b.x + k * k * c.x,
  y: (1 - k) ** 2 * a.y + 2 * (1 - k) * k * b.y + k * k * c.y,
})

export const giftsGame: Activity = (ctx) => {
  const { game, pets } = ctx
  const n = pets.length
  const rounds = Math.min(n, 3)
  const fx = new Particles()
  const toys: (string | null)[] = pets.map(() => null)

  let phase: Phase = 'intro'
  let pt = 0
  let round = 0
  let giver = 0
  let receiver = 1 % n
  let boxes: Box[] = []
  let chosen = -1
  let drag: { id: number; i: number; x: number; y: number } | null = null
  let flyFrom: Pt = { x: 0, y: 0 }
  let liftDur = 0
  let tapsLeft = 3
  let sinceTap = 9
  let gift: string | null = null
  let ribbon: Flyer | null = null
  let lid: Flyer | null = null
  let idle = 0
  let nudge = 0
  let emit = 0
  let finished = false

  const lines = (): (typeof LINES)[Lang] => LINES[game.lang] ?? LINES.ru
  const rnd = (a: number, b: number): number => a + game.rnd() * (b - a)

  // ---------------------------------------------------------------- layout

  const lay = () => {
    const { w, h, safe } = game
    const lane = Math.min(w / n, 320)
    const size = Math.min(180, lane * 0.62, h * 0.23)
    const feet = h - Math.max(104, h * 0.17)
    const top = safe.y + 8
    const room = feet - size * 1.12 - top
    const bs = clamp(Math.min(room * 0.9, w / 4.2, 150), 56, 150)
    return {
      w,
      h,
      size,
      feet,
      top,
      bs,
      shelfY: Math.max(top + bs * 0.97, feet - size * 1.3 - bs * 0.45),
      /** Box size while it is opened, and the size of the gift when it is shown. */
      obs: clamp(size * 0.8, 66, 130),
      big: clamp(Math.min(w * 0.42, room * 0.9), 90, 230),
      xs: pets.map((_, i) => w / 2 + (i - (n - 1) / 2) * lane),
    }
  }
  type Lay = ReturnType<typeof lay>

  const home = (j: number, L: Lay): Pt => ({ x: L.w / 2 + (j - 1) * L.bs * 1.12, y: L.shelfY - L.bs * 0.42 })
  /** Where the box lands: on the floor in front of the receiver, on the giver's side. */
  const target = (L: Lay): Pt => {
    const dir = Math.sign(L.xs[giver] - L.xs[receiver]) || 1
    return { x: clamp(L.xs[receiver] + dir * L.size * 0.45, L.obs * 0.6, L.w - L.obs * 0.6), y: L.feet + L.size * 0.12 - L.obs * 0.42 }
  }
  const holdPoint = (L: Lay): Pt => ({ x: L.xs[giver], y: L.feet - L.size * 1.02 - L.bs * 0.42 })
  const showPoint = (L: Lay): Pt => ({
    x: clamp(L.xs[receiver], L.big * 0.55 + 14, L.w - L.big * 0.55 - 14),
    y: Math.max(L.top + L.big * 0.55, Math.min(L.feet - L.size * 1.25 - L.big * 0.5, L.h * 0.42)),
  })
  const houseSize = (L: Lay): number => clamp(L.big * 0.4, 58, 92)
  const housePoint = (L: Lay): Pt => ({ x: L.w / 2, y: L.top + houseSize(L) * 0.62 })
  const toySpot = (i: number, L: Lay): Pt => ({ x: L.xs[i] + (L.xs[i] > L.w / 2 ? 1 : -1) * L.size * 0.5, y: L.feet - L.size * 0.14 })

  const arc = (L: Lay): [Pt, Pt, Pt] => {
    const a = liftDur > 0 ? holdPoint(L) : flyFrom
    const c = target(L)
    const up = Math.max(L.size * 0.9, Math.abs(c.x - a.x) * 0.35)
    return [a, { x: (a.x + c.x) / 2, y: Math.max(L.top - 60, Math.min(a.y, c.y) - up) }, c]
  }
  const flying = (L: Lay): { x: number; y: number; s: number; rot: number; k: number } => {
    if (pt < liftDur) {
      const k = ease.out(pt / liftDur)
      const h = holdPoint(L)
      return { x: lerp(flyFrom.x, h.x, k), y: lerp(flyFrom.y, h.y, k), s: L.bs, rot: 0, k: 0 }
    }
    const k = ease.inOut((pt - liftDur) / FLY)
    const [a, b, c] = arc(L)
    return { ...bez(a, b, c, k), s: lerp(L.bs, L.obs, k), rot: Math.sin(k * Math.PI) * 0.45 * Math.sign(c.x - a.x), k }
  }

  // ---------------------------------------------------------------- flow

  const setPhase = (p: Phase): void => {
    phase = p
    pt = 0
    idle = 0
    nudge = 0
  }

  const startRound = (): void => {
    giver = round % n
    receiver = (round + 1) % n
    const owned = ctx.owned()
    const fresh = GIFTS.filter((g) => !owned.includes(`g:${g.id}`)).map((g) => g.id)
    const inside: (string | null)[] = [fresh[0] ?? null, fresh[1] ?? null, fresh[2] ?? null]
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(game.rnd() * (i + 1))
      ;[inside[i], inside[j]] = [inside[j], inside[i]]
    }
    boxes = inside.map((g, j) => {
      const wrap = WRAPS[(round * 3 + ctx.times + j) % WRAPS.length]
      return { gift: g, color: wrap[0], ribbon: wrap[1] }
    })
    chosen = -1
    drag = null
    gift = null
    tapsLeft = 3
    ribbon = lid = null
    setPhase('intro')
  }

  const pick = (i: number, from: Pt, dragged: boolean): void => {
    chosen = i
    gift = boxes[i].gift
    flyFrom = from
    liftDur = dragged ? 0 : 0.45
    drag = null
    setPhase('fly')
    game.sfx.play(dragged ? 'whee' : 'pop')
    game.sfx.note(76, 0.25, pets[giver].species)
  }

  const knock = (L: Lay): void => {
    const T = target(L)
    const s = L.obs
    const away = Math.sign(T.x - L.xs[receiver]) || 1
    tapsLeft--
    sinceTap = 0
    idle = 0
    nudge = 0
    if (tapsLeft === 2) {
      game.sfx.play('crack', 1)
      game.sfx.play('boing')
      fx.burst('spark', T.x, T.y, 6, { size: 16, color: '#ffd23d', speed: 150 })
    } else if (tapsLeft === 1) {
      game.sfx.play('snip')
      game.sfx.play('whee')
      ribbon = { x: T.x, y: T.y - s * 0.4, vx: away * rnd(160, 240), vy: -620, rot: 0, spin: away * 7, t: 0 }
    } else {
      game.sfx.play('gift')
      game.sfx.play('pop')
      lid = { x: T.x, y: T.y - s * 0.2, vx: -away * rnd(120, 200), vy: -700, rot: 0, spin: -away * 6, t: 0 }
      fx.burst('confetti', T.x, T.y - s * 0.3, 28, { size: 18, speed: 330, max: 1.4 })
      setPhase('show')
      if (gift) {
        ctx.own(`g:${gift}`)
        const name = GIFT_NAME[gift]?.[game.lang] ?? ''
        game.say(giftKind(`g:${gift}`) === 'decor' ? `${name}! ${lines().home}` : `${name}!`)
      } else {
        game.sfx.play('yay')
        game.say(lines().hearts)
      }
    }
  }

  // ---------------------------------------------------------------- update

  const update = (dt: number): void => {
    fx.update(dt)
    const prev = pt
    pt += dt
    sinceTap += dt
    nudge = Math.max(0, nudge - dt)
    emit -= dt
    const at = (a: number): boolean => prev < a && pt >= a
    const L = lay()
    for (const f of [ribbon, lid])
      if (f) {
        f.t += dt
        f.vy += 1500 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.spin * dt
      }

    if (phase === 'choose' || phase === 'open') {
      idle += dt
      if (idle > 8) {
        idle = 0
        nudge = 3
        game.sfx.play('boing')
        game.say(phase === 'choose' ? lines().choose(pets[receiver].name) : lines().open, true)
      }
    }

    if (phase === 'intro') {
      for (let j = 0; j < 3; j++) if (at(0.25 + j * 0.18 + 0.4)) game.sfx.play('bounce')
      if (at(0.9)) game.say(lines().choose(pets[receiver].name))
      if (pt >= 1.35) setPhase('choose')
    } else if (phase === 'fly') {
      if (liftDur > 0 && at(liftDur)) game.sfx.play('whee')
      if (emit <= 0 && pt >= liftDur) {
        emit = 0.035
        const b = flying(L)
        fx.add('spark', b.x + rnd(-14, 14), b.y + rnd(-14, 14), { vy: 30, max: 0.7, size: rnd(12, 20), color: SPARKS[Math.floor(game.rnd() * SPARKS.length)], spin: 4 })
      }
      if (pt >= liftDur + FLY) {
        const T = target(L)
        game.sfx.play('land')
        game.sfx.note(79, 0.25, pets[receiver].species)
        fx.burst('spark', T.x, T.y + L.obs * 0.3, 8, { size: 14, speed: 140 })
        setPhase('open')
        game.say(lines().open)
      }
    } else if (phase === 'show') {
      const T = target(L)
      if (!gift) {
        // Everything is collected already: the box showers hearts and stars.
        if (pt < 1.3 && emit <= 0) {
          emit = 0.04
          const kind = game.rnd() < 0.6 ? 'heart' : 'star'
          fx.add(kind, T.x + rnd(-10, 10), T.y - L.obs * 0.2, { vx: rnd(-190, 190), vy: rnd(-620, -360), g: 620, size: rnd(18, 34), max: 1.5, spin: rnd(-3, 3) })
        }
        for (const [i, a] of [0.25, 0.55, 0.85].entries()) if (at(a)) game.sfx.play('star', i)
      } else if (emit <= 0) {
        emit = 0.09
        const S = showPoint(L)
        fx.add('spark', S.x + rnd(-0.5, 0.5) * L.big, lerp(T.y, S.y, ease.out(pt / 0.7)) + rnd(-0.5, 0.5) * L.big, { vy: -20, max: 0.7, size: rnd(12, 22), color: '#ffd23d' })
      }
      if (pt >= 1.7) setPhase(gift ? 'use' : 'thanks'), gift ? useStart() : thanksStart()
    } else if (phase === 'use' && gift) {
      const kind = giftKind(`g:${gift}`)
      const who = pets[receiver]
      if (kind === 'wear') {
        if (at(0.5)) {
          const slot = slotOf(`g:${gift}`)
          if (slot) who.look[slot] = `g:${gift}`
          game.sfx.play('pop')
          game.sfx.play('spin')
          fx.burst('spark', L.xs[receiver], L.feet - L.size * 0.7, 10, { size: 18, color: '#ffd23d' })
        }
        if (at(1.3)) {
          game.sfx.play('star', 1)
          fx.burst('star', L.xs[receiver], L.feet - L.size * 0.6, 8, { size: 18 })
        }
      } else if (kind === 'toy') {
        for (const [i, a] of [0.3, 0.8, 1.3].entries()) if (at(a)) game.sfx.play(i ? 'bounce' : 'boing')
        if (at(1.8)) game.sfx.note(84, 0.2, who.species)
      } else {
        if (at(0.4)) game.sfx.play('whee')
        if (at(1.3)) {
          const H = housePoint(L)
          game.sfx.play('chime', 3)
          fx.burst('spark', H.x, H.y, 12, { size: 18, color: '#ffd23d' })
        }
      }
      if (pt >= 2.1) {
        if (kind === 'toy') toys[receiver] = gift
        setPhase('thanks')
        thanksStart()
      }
    } else if (phase === 'thanks') {
      if (at(0.7)) game.sfx.play('heart')
      if (emit <= 0 && pt > 0.35 && pt < 1.6) {
        emit = 0.1
        const mid = (L.xs[giver] + L.xs[receiver]) / 2
        fx.add('heart', mid + rnd(-0.5, 0.5) * L.size, L.feet - L.size * rnd(0.8, 1.3), { vy: -80, vx: rnd(-20, 20), max: 1.1, size: rnd(16, 26) })
      }
      if (pt >= 2) {
        round++
        if (round < rounds) startRound()
        else {
          setPhase('end')
          game.sfx.play('yay')
        }
      }
    } else if (phase === 'end') {
      for (const [i, a] of [0.05, 0.45, 0.85].entries())
        if (at(a)) fx.burst('confetti', L.w * (0.25 + i * 0.25), L.feet - L.size * 1.3, 22, { size: 18, speed: 320, max: 1.5 })
      for (const [i, pet] of pets.entries()) if (at(0.1 + i * 0.12)) game.sfx.note(72 + i * 4, 0.3, pet.species)
      if (at(1.5) && !finished) {
        finished = true
        ctx.done(3)
      }
    }
  }

  const useStart = (): void => {
    emit = 0
  }
  const thanksStart = (): void => {
    game.say(lines().thanks)
    game.sfx.note(72, 0.25, pets[receiver].species)
    game.sfx.note(76, 0.4, pets[receiver].species, 0.22)
    game.sfx.note(79, 0.4, pets[giver].species, 0.6)
  }

  // ---------------------------------------------------------------- fingers

  const down = (p: Pointer): void => {
    const L = lay()
    if (phase === 'choose' && !drag) {
      let best = -1
      for (let j = 0; j < boxes.length; j++) if (best < 0 || dist(p, home(j, L)) < dist(p, home(best, L))) best = j
      if (best >= 0 && dist(p, home(best, L)) < Math.max(L.bs * 0.85, 64)) {
        drag = { id: p.id, i: best, x: p.x, y: p.y }
        game.sfx.play('tap')
      } else nudge = 1.2
    } else if (phase === 'open' && sinceTap > 0.1 && dist(p, target(L)) < Math.max(L.obs * 1.25, 96)) knock(L)
  }
  const move = (p: Pointer): void => {
    if (drag && drag.id === p.id) {
      drag.x = p.x
      drag.y = p.y
    }
  }
  const up = (p: Pointer): void => {
    if (!drag || drag.id !== p.id || phase !== 'choose') return
    // A tap and a drag both choose the box; a dragged one flies from where it was let go.
    const L = lay()
    pick(drag.i, p.swiped ? { x: p.x, y: p.y } : home(drag.i, L), p.swiped)
  }

  // ---------------------------------------------------------------- drawing

  const lidShape = (c: Ctx, s: number, color: string): void => {
    rr(c, -0.42 * s, -0.1 * s, 0.84 * s, 0.2 * s, 0.06 * s)
    paint(c, color, lwOf(s))
  }

  /** A box around (x, y). `stage` 0 wrapped, 1 ribbon gone, 2 lid gone too. */
  const drawBox = (c: Ctx, b: Box, x: number, y: number, s: number, stage = 0, rot = 0, squash = 0, alpha = 1): void => {
    c.save()
    // Wobble around the bottom edge so the box stays on the ground.
    c.translate(x, y + s * 0.42)
    c.rotate(rot)
    c.scale(1 + squash * 0.2, 1 - squash * 0.2)
    c.translate(0, -s * 0.42)
    c.globalAlpha *= alpha
    if (stage === 0) drawGiftBox(c, 0, 0, s, b.color, b.ribbon)
    else {
      // The kit box always has its bow: draw it with the lid far away and clip to the body.
      c.save()
      c.beginPath()
      c.rect(-s, -0.19 * s, s * 2, s)
      c.clip()
      drawGiftBox(c, 0, 0, s, b.color, b.color, 6)
      c.restore()
      if (stage === 1) {
        c.translate(0, -0.2 * s)
        lidShape(c, s, b.color)
      } else {
        rr(c, -0.3 * s, -0.1 * s, 0.6 * s, 0.09 * s, 0.04 * s)
        paint(c, 'rgba(59,42,74,0.38)')
      }
    }
    c.restore()
  }

  const drawBow = (c: Ctx, s: number, color: string): void => {
    const lw = lwOf(s)
    for (const side of [-1, 1]) {
      line(c, [0, 0, side * 0.12 * s, 0.24 * s], 0.08 * s + lw * 2)
      line(c, [0, 0, side * 0.12 * s, 0.24 * s], 0.08 * s, color)
    }
    for (const side of [-1, 1]) {
      oval(c, side * 0.14 * s, -0.04 * s, 0.14 * s, 0.1 * s, side * -0.5)
      paint(c, color, lw)
    }
    oval(c, 0, 0.02 * s, 0.06 * s, 0.06 * s)
    paint(c, color, lw)
  }

  const drawShelf = (c: Ctx, L: Lay): void => {
    const sw = L.bs * 3.5
    const th = Math.max(12, L.bs * 0.13)
    for (const side of [-1, 1]) {
      const bx = L.w / 2 + side * sw * 0.32
      c.beginPath()
      c.moveTo(bx - th, L.shelfY + th - 2)
      c.lineTo(bx + th, L.shelfY + th - 2)
      c.lineTo(bx, L.shelfY + th * 2.3)
      c.closePath()
      paint(c, '#c98a4b', 3)
    }
    rr(c, L.w / 2 - sw / 2, L.shelfY, sw, th, th * 0.45)
    paint(c, '#f0bd7c', 3)
    c.fillStyle = 'rgba(255,255,255,0.45)'
    c.fillRect(L.w / 2 - sw / 2 + th * 0.6, L.shelfY + 3, sw - th * 1.2, th * 0.22)
  }

  /** A tamagotchi egg under a little roof: "this goes home". */
  const drawHouse = (c: Ctx, x: number, y: number, s: number): void => {
    const lw = lwOf(s) * 1.2
    oval(c, x, y + s * 0.1, s * 0.38, s * 0.42)
    paint(c, ctx.shell.shell, lw)
    rr(c, x - s * 0.21, y - s * 0.08, s * 0.42, s * 0.32, s * 0.09)
    paint(c, ctx.shell.wall, lw * 0.8)
    heart(c, x, y + s * 0.09, s * 0.2)
    c.beginPath()
    c.moveTo(x - s * 0.52, y - s * 0.2)
    c.lineTo(x, y - s * 0.62)
    c.lineTo(x + s * 0.52, y - s * 0.2)
    c.closePath()
    paint(c, ctx.shell.accent, lw)
  }

  const drawGlow = (c: Ctx, x: number, y: number, r: number, alpha: number): void => {
    c.save()
    c.translate(x, y)
    c.globalAlpha = 0.5 * alpha
    c.rotate(game.time * 0.7)
    c.fillStyle = '#ffe27a'
    for (let i = 0; i < 10; i++) {
      c.beginPath()
      c.moveTo(0, 0)
      c.arc(0, 0, r, (i / 10) * TAU, (i / 10) * TAU + 0.3)
      c.closePath()
      c.fill()
    }
    c.globalAlpha = 0.85 * alpha
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.75)
    g.addColorStop(0, '#fff')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    oval(c, 0, 0, r * 0.75, r * 0.75)
    c.fillStyle = g
    c.fill()
    c.restore()
  }

  const drawThing = (c: Ctx, id: string, x: number, y: number, s: number, rot = 0): void => {
    if (s < 2) return
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    drawItem(c, `g:${id}`, 0, 0, s)
    c.restore()
  }

  /** The toy tossed by the receiver: three bounces above its head, then down to its side. */
  const toyAt = (L: Lay): { x: number; y: number; s: number; rot: number } => {
    const S = showPoint(L)
    const v = clamp((pt - 0.3) / 1.5)
    const bx = L.xs[receiver] + Math.sin(v * TAU) * L.size * 0.12
    const by = L.feet - L.size * 1.22 - Math.abs(Math.sin(v * Math.PI * 3)) * L.size * 0.75
    const a = ease.out(pt / 0.3)
    const rest = toySpot(receiver, L)
    const z = ease.inOut((pt - 1.8) / 0.3)
    return {
      x: lerp(lerp(S.x, bx, a), rest.x, z),
      y: lerp(lerp(S.y, by, a), rest.y, z),
      s: lerp(lerp(L.big, L.size * 0.6, a), L.size * 0.42, z),
      rot: v * TAU * 2 * (1 - z),
    }
  }

  const poseOf = (i: number, L: Lay): Pose => {
    const t = game.time
    const x = L.xs[i]
    const s = L.size
    const isG = i === giver
    const isR = i === receiver
    const p: Pose = { x, y: L.feet, size: s, squash: Math.sin(t * 3 + i * 1.7) * 0.04 }
    const look = (tx: number): void => void (p.face = clamp((tx - x) / 150, -1, 1))
    const step = s * 0.07
    if (phase === 'intro' || phase === 'choose') {
      look(isG ? (drag ? drag.x : L.w / 2) : L.xs[giver])
      if (isG) {
        p.y += step * (phase === 'intro' ? ease.out(pt / 0.4) : 1)
        p.armL = p.armR = drag ? 2.6 : 0.7 + Math.sin(t * 4) * 0.25
        p.eyes = 'wide'
        if (phase === 'intro' && pt < 0.4) p.lift = ease.hop(pt / 0.4) * s * 0.12
      } else if (isR) {
        p.lift = Math.abs(Math.sin(t * 5)) * s * 0.05
        p.eyes = 'happy'
      }
    } else if (phase === 'fly') {
      look(flying(L).x)
      if (isG) {
        p.y += step
        p.armL = p.armR = pt < liftDur + 0.3 ? 3 : 2.2
        p.mouth = 'open'
      } else if (isR) {
        p.armL = p.armR = 2.3
        p.eyes = 'wide'
        p.mouth = 'o'
        p.lift = Math.abs(Math.sin(t * 8)) * s * 0.06
      }
    } else if (phase === 'open') {
      look(target(L).x)
      if (isG) p.y += step
      if (isR) {
        p.eyes = 'wide'
        p.mouth = 'o'
        p.armL = p.armR = 1.3 + Math.sin(t * 9) * 0.25
        p.lift = ease.hop(sinceTap / 0.3) * s * 0.14
      } else p.eyes = 'happy'
    } else if (phase === 'show') {
      look(showPoint(L).x)
      p.eyes = isR ? 'heart' : 'wide'
      p.mouth = 'open'
      if (isG) p.y += step
      if (isR) {
        p.armL = p.armR = 2.6
        p.lift = Math.abs(Math.sin(pt * 7)) * s * 0.08
      }
    } else if (phase === 'use') {
      const kind = gift ? giftKind(`g:${gift}`) : null
      look(kind === 'decor' ? housePoint(L).x : L.xs[receiver])
      p.eyes = 'happy'
      if (isG) {
        p.y += step
        p.armL = p.armR = 1.3 + Math.sin(t * 12) * 0.3
      }
      if (isR) {
        p.mouth = 'open'
        if (kind === 'wear') {
          p.armL = p.armR = 2.6
          if (pt > 0.5 && pt < 1.3) {
            // A turn to show it off.
            const k = (pt - 0.5) / 0.8
            p.flip = Math.cos(k * TAU)
            p.lift = ease.hop(k) * s * 0.18
          } else if (pt >= 1.3) {
            p.armL = 2.9
            p.armR = 1.6
            p.lean = Math.sin((pt - 1.3) * 8) * 0.06
            p.squash = -0.12 * ease.hop((pt - 1.3) / 0.4)
          }
        } else if (kind === 'toy') {
          p.armL = p.armR = 2.9
          p.lift = Math.abs(Math.sin(clamp((pt - 0.3) / 1.5) * Math.PI * 3 + Math.PI / 2)) * s * 0.1
        } else {
          p.armR = 2.5 + Math.sin(t * 11) * 0.4
          p.armL = 0.6
        }
      }
    } else if (phase === 'thanks') {
      p.eyes = 'happy'
      if (isG || isR) {
        const k = clamp(ease.hop(clamp(pt / 2) ** 0.6) * 1.6)
        const mid = (L.xs[giver] + L.xs[receiver]) / 2
        const side = x < mid || (x === mid && isG) ? -1 : 1
        p.x = lerp(x, mid + side * s * 0.4, k)
        p.y += step * (isG ? 1 : clamp(pt / 0.3))
        p.face = -side
        p.lean = -side * 0.14 * k
        p.armL = p.armR = 1.5
        p.eyes = 'closed'
      }
    } else {
      p.lift = Math.abs(Math.sin(pt * 7 + i * 1.3)) * s * 0.2
      p.eyes = 'happy'
      p.mouth = 'open'
      p.armL = p.armR = 2.7
    }
    return p
  }

  const draw = (c: Ctx): void => {
    const L = lay()
    const t = game.time
    const s = L.size
    drawRoom(c, game, ctx.shell, L.feet - s * 0.34)

    // The shelf with the wrapped boxes; it slides away once a box is on its way.
    const shelf = phase === 'intro' || phase === 'choose' ? 1 : phase === 'fly' ? 1 - ease.in(pt / 0.5) : 0
    if (shelf > 0) {
      c.save()
      c.translate(0, -(1 - shelf) * (L.shelfY + 60))
      drawShelf(c, L)
      boxes.forEach((b, j) => {
        if (j === chosen || drag?.i === j) return
        const hm = home(j, L)
        let y = hm.y
        let squash = 0
        let rot = 0
        if (phase === 'intro') {
          const k = (pt - 0.25 - j * 0.18) / 0.4
          if (k <= 0) return
          if (k < 1) y -= (1 - k * k) * (hm.y + L.bs)
          else {
            const b2 = clamp((k - 1) / 0.9)
            y -= Math.abs(Math.sin(b2 * Math.PI * 2)) * (1 - b2) * L.bs * 0.3
            squash = Math.cos(b2 * Math.PI * 2) * (1 - b2) * 0.5
          }
        } else if (phase === 'choose') {
          const wave = Math.sin(t * 3.4 - j * 1.1)
          const amp = 0.05 + Math.min(1, nudge) * 0.2
          y -= Math.max(0, wave) * L.bs * amp
          rot = Math.sin(t * 6.8 - j * 2.2) * 0.03 * (1 + Math.min(1, nudge) * 3)
          squash = Math.max(0, -wave) * 0.12
        }
        drawBox(c, b, hm.x, y, L.bs, 0, rot, squash)
      })
      c.restore()
    }

    // Pets: bystanders first, then the giver, then the receiver.
    const order = pets.map((_, i) => i).sort((a, b) => (a === receiver ? 2 : a === giver ? 1 : 0) - (b === receiver ? 2 : b === giver ? 1 : 0))
    const useKind = phase === 'use' && gift ? giftKind(`g:${gift}`) : null
    for (const i of order) {
      const pose = poseOf(i, L)
      drawPet(c, pets[i].species, pets[i].look, pose, t)
      const toy = toys[i]
      if (toy) {
        if (phase === 'end') drawThing(c, toy, pose.x, pose.y - (pose.lift ?? 0) - s * 1.3, s * 0.5, Math.sin(pt * 7 + i) * 0.25)
        else if (!(useKind === 'toy' && i === receiver)) {
          const sp = toySpot(i, L)
          drawThing(c, toy, sp.x, sp.y, s * 0.42)
        }
      }
    }

    // The dashed «связь» line the box travelled along.
    const trail = phase === 'fly' ? flying(L).k : phase === 'open' ? 1 : 0
    const fade = phase === 'open' ? 1 - clamp(pt / 0.9) : 1
    if (trail > 0 && fade > 0) {
      const [a, b, d] = arc(L)
      c.save()
      c.globalAlpha = fade
      c.beginPath()
      for (let k = 0; k <= trail + 0.0001; k += 1 / 40) {
        const q = bez(a, b, d, Math.min(k, trail))
        c.lineTo(q.x, q.y)
      }
      c.setLineDash([9, 12])
      c.lineWidth = 4.5
      c.lineCap = 'round'
      c.strokeStyle = INK
      c.stroke()
      c.restore()
    }

    const box = chosen >= 0 ? boxes[chosen] : null
    const T = target(L)
    if (drag) drawBox(c, boxes[drag.i], drag.x, drag.y, L.bs * 1.1, 0, Math.sin(t * 9) * 0.08)
    else if (box && phase === 'fly') {
      const f = flying(L)
      drawBox(c, box, f.x, f.y, f.s, 0, f.rot)
    } else if (box && phase === 'open') {
      const land = clamp(pt / 0.35)
      const shake = Math.max(0, 1 - sinceTap / 0.4)
      const pull = 1 + Math.min(1, nudge) * 2
      const rot = Math.sin(t * 7) * 0.05 * pull + Math.sin(sinceTap * 42) * 0.22 * shake
      const squash = (1 - land) * 0.6 * Math.cos(land * Math.PI * 2) + Math.sin(t * 7) * 0.05 * pull - shake * 0.25 * Math.sin(sinceTap * 20)
      const hop = Math.abs(Math.sin(t * 3.5)) * L.obs * 0.05 * pull + ease.hop(sinceTap / 0.3) * L.obs * 0.12
      drawBox(c, box, T.x, T.y - hop, L.obs, tapsLeft >= 2 ? 0 : 1, rot, squash)
    } else if (box && phase === 'show') drawBox(c, box, T.x, T.y, L.obs, 2, 0, -0.3 * ease.hop(pt / 0.3), 1 - clamp((pt - 1.1) / 0.5))

    if (box && ribbon && ribbon.t < 1.8) {
      c.save()
      c.translate(ribbon.x, ribbon.y)
      c.rotate(ribbon.rot)
      drawBow(c, L.obs, box.ribbon)
      c.restore()
    }
    if (box && lid && lid.t < 1.8) {
      c.save()
      c.translate(lid.x, lid.y)
      c.rotate(lid.rot)
      lidShape(c, L.obs, box.color)
      c.restore()
    }

    // The gift itself.
    if (gift && (phase === 'show' || phase === 'use')) {
      const S = showPoint(L)
      if (phase === 'show') {
        const k = ease.out(pt / 0.7)
        const y = lerp(T.y - L.obs * 0.1, S.y, k) + Math.sin(pt * 3) * 4
        const x = lerp(T.x, S.x, k)
        const sc = ease.back(pt / 0.6)
        drawGlow(c, x, y, L.big * 0.85 * sc, clamp(pt / 0.3))
        drawThing(c, gift, x, y, L.big * sc, Math.sin(pt * 2.4) * 0.08)
      } else if (useKind === 'wear') {
        const slot = slotOf(`g:${gift}`)
        const ay = L.feet - s * (slot === 'head' ? 1.0 : slot === 'face' ? 0.58 : 0.3)
        const k = ease.in(pt / 0.5)
        drawGlow(c, lerp(S.x, L.xs[receiver], k), lerp(S.y, ay, k), L.big * 0.85, 1 - k)
        if (pt < 0.5) drawThing(c, gift, lerp(S.x, L.xs[receiver], k), lerp(S.y, ay, k), lerp(L.big, s * 0.6, k))
      } else if (useKind === 'toy') {
        const q = toyAt(L)
        drawGlow(c, q.x, q.y, L.big * 0.85, 1 - clamp(pt / 0.3))
        drawThing(c, gift, q.x, q.y, q.s, q.rot)
      } else {
        const H = housePoint(L)
        const hs = houseSize(L) * ease.back(pt / 0.3) * (1 - ease.in((pt - 1.8) / 0.3)) * (1 + 0.25 * ease.hop((pt - 1.3) / 0.25))
        if (hs > 2) drawHouse(c, H.x, H.y, hs)
        const k = ease.inOut((pt - 0.4) / 0.9)
        const q = bez(S, { x: (S.x + H.x) / 2 + L.big * 0.6, y: Math.max(S.y, H.y) + L.big * 0.2 }, H, k)
        drawGlow(c, q.x, q.y, L.big * 0.85 * (1 - k), 1 - k)
        drawThing(c, gift, q.x, q.y, L.big * (1 - k * 0.88) * (pt < 1.3 ? 1 : 0), k * TAU)
      }
    }

    fx.draw(c)
  }

  const debug = () => {
    const L = lay()
    return {
      phase,
      done: finished,
      round,
      boxes: phase === 'choose' ? boxes.map((_, j) => home(j, L)) : [],
      box: phase === 'open' ? target(L) : null,
      tapsLeft,
      gift,
    }
  }

  const scene: Scene = {
    enter: startRound,
    leave() {
      drag = null
      fx.bits = []
    },
    update,
    draw,
    down,
    move,
    up,
  }
  return Object.assign(scene, { debug })
}
