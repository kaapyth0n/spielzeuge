/**
 * Тамагочи Связь — the dance. "Repeat after your friend": one pet shows a few
 * moves (jump, squat, step left/right, spin), the child answers with swipes
 * and taps anywhere and the other pets dance them. Four rounds, then a free
 * disco where every swipe moves everybody. Nothing can be failed.
 */
import {
  INK,
  Particles,
  TAU,
  clamp,
  drawRoom,
  ease,
  line,
  oval,
  paint,
  rr,
  type Activity,
  type Ctx,
  type Dir,
  type Pointer,
} from './tamagochi-kit.ts'
import { drawPet, type Pose } from './tamagochi-pets.ts'

type Move = Dir | 'spin'
type Phase = 'intro' | 'show' | 'turn' | 'oops' | 'cheer' | 'finale' | 'pose' | 'done'
interface Anim {
  move: Move | 'no'
  t: number
  dur: number
}
interface Place {
  x: number
  y: number
  size: number
}

const MOVES: Move[] = ['up', 'down', 'left', 'right', 'spin']
const MOVE_COLOR: Record<Move, string> = { up: '#3db8ff', down: '#ff9a3d', left: '#ff6fb5', right: '#44cf8a', spin: '#a66bff' }
const PARTY = ['#ff6fb5', '#ffd23d', '#5fe0b0', '#5ab6ff', '#a66bff', '#ff9a3d']
const RISING = [72, 74, 76, 79, 81]
const FINALE_TIME = 8

const LINES = {
  ru: {
    watch: (name: string) => `${name} показывает. Смотри!`,
    you: 'Теперь ты!',
    again: 'Смотри ещё раз!',
    all: 'А теперь все вместе!',
    praise: ['Здорово!', 'Вот это танец!', 'Супер!'],
  },
  de: {
    watch: (name: string) => `${name} tanzt vor. Schau zu!`,
    you: 'Jetzt du!',
    again: 'Schau noch mal!',
    all: 'Und jetzt alle zusammen!',
    praise: ['Toll!', 'Super getanzt!', 'Klasse!'],
  },
  en: {
    watch: (name: string) => `Watch ${name}!`,
    you: 'Now you!',
    again: 'Watch again!',
    all: 'All together now!',
    praise: ['Great!', 'What a dance!', 'Super!'],
  },
}

/** A white arrow (or a round arrow for the spin) around (0,0), `s` wide. */
function moveIcon(c: Ctx, m: Move, s: number, color = '#fff'): void {
  c.save()
  if (m === 'spin') {
    const r = s * 0.3
    for (const [width, col] of [[s * 0.25, INK], [s * 0.13, color]] as const) {
      c.beginPath()
      c.arc(0, 0, r, -0.2 * Math.PI, 1.35 * Math.PI)
      c.lineWidth = width
      c.strokeStyle = col
      c.lineCap = 'round'
      c.stroke()
    }
    c.rotate(-0.2 * Math.PI)
    c.translate(r, 0)
    c.beginPath()
    c.moveTo(-s * 0.2, s * 0.04)
    c.lineTo(s * 0.2, s * 0.04)
    c.lineTo(0, -s * 0.24)
    c.closePath()
    paint(c, color, s * 0.06)
  } else {
    c.rotate(m === 'up' ? -Math.PI / 2 : m === 'down' ? Math.PI / 2 : m === 'left' ? Math.PI : 0)
    c.beginPath()
    c.moveTo(0.42 * s, 0)
    c.lineTo(0.04 * s, -0.36 * s)
    c.lineTo(0.04 * s, -0.14 * s)
    c.lineTo(-0.38 * s, -0.14 * s)
    c.lineTo(-0.38 * s, 0.14 * s)
    c.lineTo(0.04 * s, 0.14 * s)
    c.lineTo(0.04 * s, 0.36 * s)
    c.closePath()
    paint(c, color, s * 0.06)
  }
  c.restore()
}

/** A round coloured badge with the move on it. */
function badge(c: Ctx, m: Move, x: number, y: number, r: number): void {
  oval(c, x, y + r * 0.1, r, r)
  paint(c, INK)
  oval(c, x, y, r, r)
  paint(c, MOVE_COLOR[m], Math.max(2.5, r * 0.09))
  c.save()
  c.globalAlpha *= 0.3
  oval(c, x - r * 0.3, y - r * 0.5, r * 0.42, r * 0.2, -0.5)
  paint(c, '#fff')
  c.restore()
  c.save()
  c.translate(x, y)
  moveIcon(c, m, r * 1.25)
  c.restore()
}

export const danceGame: Activity = (ctx) => {
  const g = ctx.game
  const pets = ctx.pets
  const n = pets.length
  const fx = new Particles()
  const lengths = ctx.times >= 3 ? [3, 4, 4, 5] : [2, 3, 3, 4]
  const anim: (Anim | null)[] = pets.map(() => null)

  let phase: Phase = 'intro'
  let t = 0 // seconds in the current phase
  let round = 0
  let leader = 0
  let seq: Move[] = []
  let progress = 0
  let mistakes = 0
  let roundMistakes = 0
  let finished = false
  let lastBeat = -1
  let showIndex = 0
  let showNext = 0
  let icon: { move: Move; t: number } | null = null
  let lastInput = -9
  let idle = 0
  let nudge = 0
  let slotPop = 0
  let finaleMoves = 0

  const words = () => LINES[g.lang] ?? LINES.ru
  const pick = <T,>(list: T[]): T => list[Math.floor(g.rnd() * list.length) % list.length]

  const layout = () => {
    const { w, h, safe } = g
    const slot = Math.min(66, (w - 32) / 5 - 8, h * 0.14)
    const top = safe.y + slot + 22
    const feet = h - Math.max(70, h * 0.1)
    // Tall phone with three or four pets: two rows, so they stay big.
    const two = h > w * 1.2 && n >= 3
    const front = two ? Math.ceil(n / 2) : n
    const back = n - front
    const lane = Math.min((w - 24) / front, 400)
    const size = Math.min(240, lane * (two ? 0.68 : 0.6), (feet - top) * (two ? 0.3 : 0.5))
    const places: Place[] = pets.map((_, i) => {
      const inBack = i < back
      const count = inBack ? back : front
      const j = inBack ? i : i - back
      return { x: w / 2 + (j - (count - 1) / 2) * lane, y: inBack ? feet - size * 2 : feet, size }
    })
    return { slot, top, places, floorY: (back ? feet - size * 2 : feet) - size * 0.3 }
  }

  const makeSequence = (len: number): Move[] => {
    const out: Move[] = []
    while (out.length < len) {
      const m = pick(MOVES)
      if (m !== out[out.length - 1]) out.push(m)
    }
    // The banana always shows off its spin.
    if (pets[leader].species === 'banana' && !out.includes('spin')) out[out.length - 1] = 'spin'
    if (out.length > 1 && out[out.length - 1] === out[out.length - 2]) out[out.length - 2] = out[out.length - 1] === 'up' ? 'down' : 'up'
    return out
  }

  const perform = (i: number, move: Move | 'no'): void => {
    const banana = pets[i].species === 'banana'
    anim[i] = { move, t: 0, dur: move === 'spin' ? (banana ? 1.0 : 0.7) : move === 'no' ? 0.85 : 0.58 }
  }
  const moveSound = (m: Move): void => {
    if (m === 'up') g.sfx.play('whee')
    else if (m === 'down') g.sfx.play('land')
    else if (m === 'spin') g.sfx.play('spin')
    else g.sfx.play('twang', m === 'left' ? 0 : 6)
  }
  const setPhase = (next: Phase): void => {
    phase = next
    t = 0
  }

  const startShow = (replay: boolean): void => {
    setPhase('show')
    showIndex = 0
    showNext = replay ? 0.9 : 1.5
    progress = 0
    icon = null
    g.say(replay ? words().again : words().watch(pets[leader].name), replay)
  }
  const startRound = (): void => {
    leader = round % n
    roundMistakes = 0
    seq = makeSequence(lengths[round])
    startShow(false)
  }
  const startTurn = (): void => {
    setPhase('turn')
    idle = 0
    icon = null
    g.say(words().you)
    g.sfx.play('pop')
  }
  const startFinale = (): void => {
    setPhase('finale')
    icon = null
    idle = 9
    g.say(words().all)
    g.sfx.play('ready')
  }

  const answer = (m: Move): void => {
    if (g.time - lastInput < 0.22) return
    lastInput = g.time
    const l = layout()
    if (phase === 'finale') {
      idle = 0
      finaleMoves++
      pets.forEach((_, i) => perform(i, m))
      moveSound(m)
      g.sfx.note(RISING[finaleMoves % RISING.length] + (finaleMoves % 2 ? 0 : 12), 0.25, pick(pets).species)
      for (const pl of l.places) fx.burst('confetti', pl.x, pl.y - pl.size * 0.9, 7, { size: 15, speed: 230 })
      return
    }
    if (phase !== 'turn') {
      nudge = 0.3
      return
    }
    idle = 0
    const slotX = g.w / 2 + (progress - (seq.length - 1) / 2) * (l.slot + 8)
    const slotY = g.safe.y + 10 + l.slot / 2
    if (m === seq[progress]) {
      pets.forEach((_, i) => i !== leader && perform(i, m))
      moveSound(m)
      g.sfx.note(RISING[progress % RISING.length], 0.3, 'bell')
      fx.burst('spark', slotX, slotY, 9, { color: '#ffe27a', size: 18, speed: 150 })
      progress++
      slotPop = 0
      if (progress >= seq.length) {
        g.sfx.play('yay')
        g.say(pick(words().praise), true)
        setPhase('cheer')
      }
    } else {
      mistakes++
      roundMistakes++
      pets.forEach((_, i) => i !== leader && perform(i, 'no'))
      g.sfx.play('no')
      setPhase('oops')
    }
  }

  const onBeat = (index: number): void => {
    if (phase !== 'finale') return
    const l = layout()
    const pl = pick(l.places)
    fx.add('note', pl.x + (g.rnd() - 0.5) * pl.size, pl.y - pl.size, {
      vx: (g.rnd() - 0.5) * 80,
      vy: -110,
      max: 1.3,
      size: 24,
      color: pick(PARTY),
    })
    // Nobody is swiping: the pets keep dancing on their own.
    if (idle > 1.6 && index % 2 === 0) {
      const m = pick(MOVES)
      pets.forEach((_, i) => perform(i, m))
    }
  }

  const update = (dt: number): void => {
    t += dt
    idle += dt
    slotPop += dt
    nudge = Math.max(0, nudge - dt)
    fx.update(dt)
    if (icon) icon.t += dt
    const beat = g.sfx.beat()
    const onTheBeat = beat.index !== lastBeat
    if (onTheBeat) {
      lastBeat = beat.index
      onBeat(beat.index)
    }
    const l = layout()
    anim.forEach((a, i) => {
      if (!a) return
      a.t += dt
      const pl = l.places[i]
      if (a.move === 'spin' && pets[i].species === 'banana' && g.rnd() < 0.5) {
        const ang = g.rnd() * TAU
        fx.add('spark', pl.x + Math.cos(ang) * pl.size * 0.45, pl.y - pl.size * (0.5 + Math.sin(ang) * 0.45), {
          vy: -30,
          max: 0.6,
          size: 16,
          color: g.rnd() < 0.5 ? '#ffe27a' : '#fff',
          spin: 6,
        })
      }
      if (a.t >= a.dur) {
        if (a.move === 'spin' && pets[i].species === 'banana') fx.burst('star', pl.x, pl.y - pl.size * 0.5, 6, { size: 14, speed: 140 })
        anim[i] = null
      }
    })

    if (phase === 'intro') {
      if (t > 1.1) startRound()
    } else if (phase === 'show') {
      // One move every second beat; the clock takes over if the beat stalls.
      if (showIndex < seq.length) {
        if (t >= showNext && (onTheBeat || t >= showNext + 0.55)) {
          const m = seq[showIndex++]
          perform(leader, m)
          moveSound(m)
          g.sfx.note(RISING[(showIndex - 1) % RISING.length], 0.25, pets[leader].species)
          icon = { move: m, t: 0 }
          showNext = t + 1.6 / beat.bps
        }
      } else if (t >= showNext + 0.25) startTurn()
    } else if (phase === 'turn') {
      if (idle > 9) startShow(true)
    } else if (phase === 'oops') {
      if (t > 1.0) startShow(true)
    } else if (phase === 'cheer') {
      if (t > 1.5) {
        round++
        if (round >= lengths.length) startFinale()
        else startRound()
      }
    } else if (phase === 'finale') {
      if (t > FINALE_TIME) {
        setPhase('pose')
        g.sfx.play('yay')
        pets.forEach((p, i) => perform(i, p.species === 'banana' ? 'spin' : 'up'))
        for (const pl of l.places) fx.burst('confetti', pl.x, pl.y - pl.size, 14, { size: 17, speed: 300 })
      }
    } else if (phase === 'pose') {
      if (t > 1.6 && !finished) {
        finished = true
        phase = 'done'
        ctx.done(mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1)
      }
    }
  }

  const poseOf = (i: number, pl: Place, beatPhase: number): Pose => {
    const s = pl.size
    const pet = pets[i]
    const a = anim[i]
    const bob = Math.sin(beatPhase * TAU)
    const lead = i === leader
    const pose: Pose = { x: pl.x, y: pl.y, size: s, face: clamp((g.w / 2 - pl.x) / 260, -0.6, 0.6), squash: bob * 0.05 }
    if (a) {
      const k = clamp(a.t / a.dur)
      pose.eyes = 'happy'
      pose.mouth = 'open'
      if (a.move === 'up') {
        const air = clamp((k - 0.15) / 0.7)
        pose.lift = ease.hop(air) * s * 0.42
        pose.squash = k < 0.15 ? (k / 0.15) * 0.5 : k > 0.85 ? ((1 - k) / 0.15) * 0.45 : -0.35
        pose.armL = pose.armR = 2.95
      } else if (a.move === 'down') {
        pose.squash = Math.sin(k * Math.PI) ** 0.6 * 0.95
        pose.armL = pose.armR = 1.5
        pose.eyes = 'closed'
        pose.mouth = 'o'
      } else if (a.move === 'left' || a.move === 'right') {
        const d = a.move === 'left' ? -1 : 1
        const hop = ease.hop(k)
        pose.x += d * s * 0.32 * hop
        pose.lean = d * 0.3 * hop
        pose.lift = Math.abs(Math.sin(k * TAU)) * s * 0.07
        pose.face = d
        pose.walk = k * TAU * 2
        pose.armL = d < 0 ? 2.7 : 0.5
        pose.armR = d > 0 ? 2.7 : 0.5
      } else if (a.move === 'spin') {
        const banana = pet.species === 'banana'
        pose.flip = Math.cos(ease.inOut(k) * TAU * (banana ? 4 : 2))
        pose.lift = ease.hop(k) * s * (banana ? 0.34 : 0.1)
        pose.armL = pose.armR = banana ? 2.9 : 2.2
        if (banana) {
          pose.lean = Math.sin(k * TAU * 2) * 0.16
          pose.squash = -0.2 * ease.hop(k)
        }
      } else {
        // A kind "not quite": the head goes left-right.
        pose.face = Math.sin(k * TAU * 2.5)
        pose.lean = Math.sin(k * TAU * 2.5) * 0.07
        pose.eyes = 'closed'
        pose.mouth = 'smile'
        pose.armL = pose.armR = 0.3
      }
      return pose
    }
    const leaderPlace = layout().places[leader]
    if (phase === 'show' || phase === 'oops' || phase === 'intro') {
      if (lead) {
        pose.armL = pose.armR = 1.1 + bob * 0.25
        pose.eyes = 'happy'
      } else {
        pose.face = clamp((leaderPlace.x - pl.x) / 120, -1, 1)
        pose.eyes = phase === 'show' ? 'wide' : 'open'
        pose.squash = bob * 0.04 + (nudge / 0.3) * 0.3
      }
    } else if (phase === 'turn') {
      if (lead) {
        // The leader claps along and watches.
        pose.armL = pose.armR = 1.7 + bob * 0.45
        pose.eyes = 'happy'
      } else {
        pose.squash = bob * 0.09
        pose.armL = pose.armR = 0.7 + bob * 0.2
      }
    } else if (phase === 'cheer') {
      pose.lift = Math.abs(Math.sin(t * 8 + i * 1.3)) * s * 0.16
      pose.armL = pose.armR = 2.7
      pose.eyes = 'happy'
      pose.mouth = 'open'
    } else if (phase === 'finale') {
      pose.squash = bob * 0.13
      pose.lean = Math.sin((beatPhase + i * 0.5) * Math.PI) * 0.06 * (i % 2 ? 1 : -1)
      pose.armL = 1.6 + bob * 0.9
      pose.armR = 1.6 - bob * 0.9
      pose.eyes = 'happy'
      pose.mouth = 'sing'
    } else {
      // Final pose.
      pose.lean = (i % 2 ? 1 : -1) * 0.14
      pose.armL = i % 2 ? 2.9 : 1.9
      pose.armR = i % 2 ? 1.9 : 2.9
      pose.eyes = 'happy'
      pose.mouth = 'open'
      pose.squash = bob * 0.04
    }
    return pose
  }

  const draw = (c: Ctx): void => {
    const { w, h } = g
    const l = layout()
    const beat = g.sfx.beat()
    const party = phase === 'finale' || phase === 'pose' || phase === 'done'
    drawRoom(c, g, ctx.shell, l.floorY)

    // Disco floor, dimmed hall and spotlights, kept inside the bezel.
    const b = Math.max(8, Math.min(w, h) * 0.018)
    c.save()
    rr(c, b + 1.5, b + 1.5, w - b * 2 - 3, h - b * 2 - 3, b * 2.4)
    c.clip()
    const tile = Math.max(46, Math.min(w, h) / 7)
    const pulse = 1 - beat.phase * 0.55
    for (let y = l.floorY + 6, ry = 0; y < h; y += tile * 0.62, ry++)
      for (let x = (w % tile) / 2 - tile, cx = 0; x < w; x += tile, cx++) {
        const lit = (cx * 3 + ry * 5 + beat.index * (cx % 2 ? 1 : 2)) % PARTY.length
        c.globalAlpha = (party ? 0.6 : 0.3) * ((cx + ry + beat.index) % 2 ? pulse : 0.55)
        c.fillStyle = PARTY[lit]
        rr(c, x + 3, y + 3, tile - 6, tile * 0.62 - 6, 8)
        c.fill()
      }
    c.globalAlpha = 1
    c.fillStyle = `rgba(59,42,74,${party ? 0.2 : 0.09})`
    c.fillRect(0, 0, w, h)
    pets.forEach((_, i) => {
      const lit = party || phase === 'cheer' || (phase === 'turn' ? i !== leader : i === leader)
      if (!lit) return
      const pl = l.places[i]
      const sway = party ? Math.sin(g.time * 2.2 + i * 2) * pl.size * 0.5 : 0
      const colour = party ? PARTY[(i + beat.index) % PARTY.length] : '#fff3a8'
      c.globalAlpha = 0.26 + (party ? 0.1 * pulse : 0)
      c.fillStyle = colour
      c.beginPath()
      c.moveTo(pl.x + sway - pl.size * 0.12, 0)
      c.lineTo(pl.x + sway + pl.size * 0.12, 0)
      c.lineTo(pl.x + pl.size * 0.66, pl.y)
      c.lineTo(pl.x - pl.size * 0.66, pl.y)
      c.closePath()
      c.fill()
      c.globalAlpha = 0.5
      oval(c, pl.x, pl.y, pl.size * 0.66, pl.size * 0.15)
      c.fill()
    })
    c.restore()

    // Pets, back row first.
    const order = pets.map((_, i) => i).sort((p, q) => l.places[p].y - l.places[q].y)
    for (const i of order) drawPet(c, pets[i].species, pets[i].look, poseOf(i, l.places[i], beat.phase), g.time)

    // The move the leader is showing.
    if (icon && phase === 'show' && icon.t < 0.95) {
      const pl = l.places[leader]
      const r = Math.min(pl.size * 0.36, 50)
      const k = ease.back(clamp(icon.t / 0.18))
      c.save()
      c.globalAlpha = clamp((0.95 - icon.t) / 0.2)
      c.translate(pl.x, Math.max(l.top + r, pl.y - pl.size * 1.58))
      c.scale(k, k)
      badge(c, icon.move, 0, 0, r)
      c.restore()
    }

    // Answer slots.
    if (phase === 'show' || phase === 'turn' || phase === 'oops' || phase === 'cheer') {
      const s = l.slot
      const y = g.safe.y + 10
      const active = phase === 'turn' || phase === 'cheer'
      seq.forEach((m, i) => {
        const x = w / 2 + (i - (seq.length - 1) / 2) * (s + 8) - s / 2
        const filled = i < progress
        const next = phase === 'turn' && i === progress
        c.save()
        c.globalAlpha = active ? 1 : 0.4
        const grow = filled && i === progress - 1 ? 1 + 0.25 * (1 - ease.out(slotPop / 0.3)) : next ? 1 + Math.sin(g.time * 6) * 0.05 : 1
        c.translate(x + s / 2, y + s / 2)
        c.scale(grow, grow)
        if (filled) badge(c, m, 0, 0, s / 2)
        else {
          oval(c, 0, s * 0.05, s / 2, s / 2)
          paint(c, INK)
          oval(c, 0, 0, s / 2, s / 2)
          paint(c, next ? '#fff' : '#f1eaf7', Math.max(2.5, s * 0.045))
          if (next) {
            c.setLineDash([s * 0.14, s * 0.12])
            c.lineDashOffset = -g.time * 30
            oval(c, 0, 0, s * 0.36, s * 0.36)
            c.lineWidth = Math.max(2.5, s * 0.06)
            c.strokeStyle = ctx.shell.accent
            c.stroke()
            c.setLineDash([])
          }
          // After two slips the answer shines through.
          if (roundMistakes >= 2 && active) {
            c.globalAlpha = next ? 0.5 + Math.sin(g.time * 5) * 0.15 : 0.28
            moveIcon(c, m, s * 0.6, MOVE_COLOR[m])
          }
        }
        c.restore()
      })
    }

    // Finale: a mirror ball and how long the disco still goes.
    if (party) {
      const r = Math.min(34, h * 0.06)
      const drop = ease.back(clamp(phase === 'finale' ? t / 0.5 : 1))
      const bx = w / 2
      const by = g.safe.y + 14 + r - (1 - drop) * (g.safe.y + r * 2 + 20)
      line(c, [bx, by - r, bx, by - r - g.safe.y - 30], 3)
      oval(c, bx, by, r, r)
      paint(c, '#dfe6ff', 3)
      c.save()
      oval(c, bx, by, r - 1.5, r - 1.5)
      c.clip()
      for (let iy = -2; iy <= 2; iy++)
        for (let ix = -3; ix <= 3; ix++) {
          const shift = ((g.time * 0.6 + ix / 6) % 1) - 0.5
          c.fillStyle = PARTY[(ix + iy * 2 + 12 + beat.index) % PARTY.length]
          c.globalAlpha = 0.75
          c.fillRect(bx + shift * r * 2.4 + ix * r * 0.36 - r * 0.14, by + iy * r * 0.4 - r * 0.15, r * 0.28, r * 0.3)
        }
      c.restore()
      if (phase === 'finale') {
        const bw = Math.min(w * 0.5, 260)
        const left = clamp(1 - t / FINALE_TIME)
        rr(c, w / 2 - bw / 2, by + r + 12, bw, 14, 7)
        paint(c, '#fff', 3)
        if (left > 0.03) {
          rr(c, w / 2 - bw / 2 + 3, by + r + 15, (bw - 6) * left, 8, 4)
          paint(c, ctx.shell.accent)
        }
      }
    }
    fx.draw(c)
  }

  const scene = {
    enter(): void {
      g.sfx.loop('dance')
    },
    leave(): void {
      fx.bits = []
    },
    update,
    draw,
    tap(p: Pointer): void {
      if (p.y >= g.safe.y) answer('spin')
    },
    swipe(_p: Pointer, dir: Dir): void {
      answer(dir)
    },
    debug: () => ({
      phase,
      done: finished,
      expected: phase === 'turn' ? seq.slice(progress) : [],
      round,
      mistakes,
      leader,
      sequence: seq,
    }),
  }
  return scene
}
