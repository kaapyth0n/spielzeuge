/**
 * Тамагочи Связь — «Песенка». The pets sing a well-known tune together, each in
 * its own voice. Notes slide down dashed wires to a ring above every pet; a tap
 * on the pet (or anywhere in its lane) sings the note that has arrived. The song
 * waits for every note, so nothing can be missed. At the end the pets give a
 * little concert by themselves.
 */
import {
  INK,
  Particles,
  SHELLS,
  clamp,
  drawRoom,
  ease,
  line,
  oval,
  paint,
  rr,
  type Activity,
  type Ctx,
  type Game,
  type Pointer,
} from './tamagochi-kit.ts'
import { drawPet, type Pose } from './tamagochi-pets.ts'

type Words = Record<Game['lang'], string>

interface Tune {
  title: Words
  /** Tonic (MIDI), for the closing chord. */
  home: number
  minor?: boolean
  /** How many phrases the pets repeat in the concert. */
  encore: number
  /** Phrases split by `|`; a note is `midi` or `midi*beats`. Each phrase goes to the next pet. */
  score: string
}

const CHIZHIK = '64 60 64 60 | 65 64 62*2 | 67 67 | 67 69*.5 71*.5 | 72 72 72*2'
const BIRCH = '64*.5 64*.5 64*.5 64*.5 | 62 60*.5 60*.5 | 59 57'

/** Public-domain melodies only. */
const TUNES: Tune[] = [
  {
    title: { ru: 'Песенка про звёздочку', de: 'Morgen kommt der Weihnachtsmann', en: 'Twinkle, twinkle, little star' },
    home: 60,
    encore: 4,
    score: '60 60 67 67 | 69 69 67*2 | 65 65 64 64 | 62 62 60*2 | 67 67 65 65 | 64 64 62*2 | 65 65 64 64 | 62 62 60*2',
  },
  {
    title: { ru: 'Братец Яков', de: 'Bruder Jakob', en: 'Brother John' },
    home: 60,
    encore: 4,
    score: '60 62 64 60 | 60 62 64 60 | 64 65 67*2 | 64 65 67*2 | 67*.5 69*.5 67*.5 65*.5 | 64 60 | 67*.5 69*.5 67*.5 65*.5 | 64 60 | 60 55 60*2 | 60 55 60*2',
  },
  {
    title: { ru: 'Чижик-пыжик', de: 'Das Lied vom kleinen Zeisig', en: 'The little siskin song' },
    home: 60,
    encore: 5,
    score: `${CHIZHIK} | ${CHIZHIK}`,
  },
  {
    title: { ru: 'Песенка про маленького Ганса', de: 'Hänschen klein', en: 'Little Hans' },
    home: 60,
    encore: 4,
    score: '67 64 64*2 | 65 62 62*2 | 60 62 64 65 | 67 67 67*2 | 67 64 64*2 | 65 62 62*2 | 60 64 | 67 67 60*2',
  },
  {
    title: { ru: 'Во поле берёза стояла', de: 'Das Lied von der Birke', en: 'The little birch tree' },
    home: 57,
    minor: true,
    encore: 6,
    score: `${BIRCH} | ${BIRCH} | 59*1.5 60*.5 | 62 60*.5 59*.5 | 57 57*2`,
  },
  {
    title: { ru: 'Ода к радости', de: 'Freude, schöner Götterfunken', en: 'Ode to Joy' },
    home: 60,
    encore: 4,
    score: '64 64 65 67 | 67 65 64 62 | 60 60 62 64 | 64*1.5 62*.5 62*2 | 64 64 65 67 | 67 65 64 62 | 60 60 62 64 | 62*1.5 60*.5 60*2',
  },
  {
    title: { ru: 'В лесу родилась ёлочка', de: 'Das Lied vom Tannenbäumchen', en: 'The little fir tree song' },
    home: 65,
    encore: 4,
    score: '60 69 69 67 | 69 65 60 60 | 60 69 69 | 70 67 72*3 | 72 62 62 | 70 70 69 | 67 65 | 60 69 69 | 67 69 65*2',
  },
]

const LINES: Record<'how' | 'hint' | 'concert', Words> = {
  how: {
    ru: 'Нотка в колечке — нажми на малыша!',
    de: 'Note im Ring? Tippe dein Kleines an!',
    en: 'Note in the ring? Tap your little one!',
  },
  hint: {
    ru: 'Нажми на малыша под ноткой!',
    de: 'Tippe das Kleine unter der Note an!',
    en: 'Tap the little one under the note!',
  },
  concert: { ru: 'А теперь концерт!', de: 'Und jetzt das Konzert!', en: 'And now the concert!' },
}

interface Note {
  midi: number
  beats: number
  lane: number
  /** Beat on which it reaches the ring. */
  at: number
}

type Phase = 'intro' | 'play' | 'cheer' | 'concert' | 'bow' | 'over'

/** Beats of silence before the first note arrives. */
const LEAD = 5
/** A note that waited no longer than this was sung on time. */
const ON_TIME = 0.3

export const songGame: Activity = (ctx) => {
  const { game, pets } = ctx
  const n = pets.length
  const tune = TUNES[ctx.times % TUNES.length]
  const tempo = Math.min(120, 92 + ctx.times * 3) / 60
  // Another pet starts each time the tune comes round again.
  const firstLane = Math.floor(ctx.times / TUNES.length) % n
  const colors = pets.map((p) => SHELLS[p.slot % SHELLS.length])
  const fx = new Particles()

  const arrange = (phrases: number): Note[] => {
    const out: Note[] = []
    let at = 0
    tune.score
      .split('|')
      .slice(0, phrases)
      .forEach((phrase, k) => {
        for (const word of phrase.trim().split(/\s+/)) {
          const [midi, beats = '1'] = word.split('*')
          out.push({ midi: +midi, beats: +beats, lane: (firstLane + k) % n, at })
          at += +beats
        }
      })
    return out
  }

  let notes = arrange(99)
  const total = notes.length
  let phase: Phase = 'intro'
  /** Seconds in the current phase. */
  let t = 0
  let clock = -LEAD
  let speed = tempo
  let idx = 0
  let waited = 0
  let hintAt = 5
  let sung = 0
  let onTime = 0
  const singT = pets.map(() => 9)
  const singDur = pets.map(() => 0.3)
  const giggleT = pets.map(() => 9)
  const flashT = pets.map(() => 9)

  const layout = () => {
    const { w, h, safe } = game
    const top = safe.y + 8
    const feet = h - Math.max(66, h * 0.11)
    const lane = w / n
    const size = Math.min(170, lane * 0.6, (feet - top) * 0.34)
    const r = clamp(size * 0.15, 10, 24)
    const ring = r * 1.35
    const ringY = feet - size * 1.36 - ring
    const ppb = clamp((ringY - ring - top) / 3.2, r * 2.9, r * 5.5)
    return { top, feet, lane, size, r, ring, ringY, ppb, x: (i: number) => lane * (i + 0.5) }
  }
  type Layout = ReturnType<typeof layout>

  const early = (): number => Math.max(0.4, 0.28 * speed)
  const stars = (): number => (onTime >= total * 0.65 ? 3 : onTime >= total * 0.35 ? 2 : 1)

  const voice = (note: Note): void => {
    const L = layout()
    const i = note.lane
    const dur = clamp(note.beats / speed, 0.28, 1.4)
    game.sfx.note(note.midi, dur, pets[i].species)
    singT[i] = 0
    singDur[i] = Math.min(dur, 0.8)
    flashT[i] = 0
    const side = game.rnd() < 0.5 ? -1 : 1
    fx.add('note', L.x(i) + side * L.ring, L.ringY, {
      vx: side * (40 + game.rnd() * 70),
      vy: -150 - game.rnd() * 60,
      g: 70,
      size: L.r * 2.3,
      color: colors[i].shell,
      max: 1.15,
      spin: side * 1.2,
    })
    fx.burst('spark', L.x(i), L.ringY, 6, { size: L.r * 1.1, color: '#fff', speed: 130, max: 0.45 })
  }

  const giggle = (i: number, loud: boolean): void => {
    giggleT[i] = 0
    if (!loud) return
    game.sfx.note(86, 0.06, pets[i].species)
    game.sfx.note(90, 0.07, pets[i].species, 0.08)
  }

  const startConcert = (): void => {
    notes = arrange(tune.encore)
    const last = notes[notes.length - 1]
    // About six and a half seconds, whatever the tune.
    speed = Math.max(tempo * 1.25, (last.at + last.beats) / 6.5)
    idx = 0
    clock = -2.5
    phase = 'concert'
    t = 0
  }

  const finale = (): void => {
    const L = layout()
    const chord = [0, tune.minor ? 3 : 4, 7, 12]
    pets.forEach((p, i) => {
      game.sfx.note(tune.home + chord[i % 4], 1, p.species)
      singT[i] = 0
      singDur[i] = 0.9
      flashT[i] = 0
      fx.burst('confetti', L.x(i), L.ringY, 14, { size: 16, speed: 260, max: 1.3 })
      fx.burst('star', L.x(i), L.feet - L.size * 0.6, 4, { size: 20, speed: 200 })
    })
    phase = 'bow'
    t = 0
  }

  const update = (dt: number): void => {
    t += dt
    fx.update(dt)
    for (let i = 0; i < n; i++) {
      singT[i] += dt
      giggleT[i] += dt
      flashT[i] += dt
    }
    if (phase === 'intro') {
      if (t < 1.2) return
      phase = 'play'
      t = 0
      game.say(`${tune.title[game.lang]}. ${LINES.how[game.lang]}`)
    } else if (phase === 'play') {
      const to = clock + dt * speed
      if (to < notes[idx].at) clock = to
      else {
        // The song holds its breath until the note is sung.
        clock = notes[idx].at
        waited += dt
        if (waited > hintAt) {
          hintAt += 7
          game.say(LINES.hint[game.lang], true)
        }
      }
    } else if (phase === 'cheer') {
      if (t > 1.5) startConcert()
    } else if (phase === 'concert') {
      clock += dt * speed
      while (idx < notes.length && clock >= notes[idx].at) voice(notes[idx++])
      if (game.rnd() < dt * 9)
        fx.add('spark', game.rnd() * game.w, game.safe.y + game.rnd() * game.h * 0.5, {
          vy: 20,
          size: 14 + game.rnd() * 12,
          color: colors[Math.floor(game.rnd() * n)].light,
          max: 0.7,
          spin: 3,
        })
      const last = notes[notes.length - 1]
      if (clock >= last.at + last.beats) finale()
    } else if (phase === 'bow' && t > 1.5) {
      phase = 'over'
      ctx.done(stars())
    }
  }

  const down = (p: Pointer): void => {
    if (p.y < game.safe.y) return
    const L = layout()
    const i = clamp(Math.floor(p.x / L.lane), 0, n - 1)
    if (phase !== 'play') {
      if (phase !== 'over') giggle(i, false)
      return
    }
    const note = notes[idx]
    if (note.lane !== i || note.at - clock > early()) return giggle(i, true)
    if (waited <= ON_TIME) onTime++
    sung++
    voice(note)
    idx++
    waited = 0
    hintAt = 5
    if (idx >= notes.length) {
      phase = 'cheer'
      t = 0
      game.say(LINES.concert[game.lang])
      for (let k = 0; k < n; k++) fx.burst('heart', L.x(k), L.feet - L.size, 3, { size: 18, speed: 120 })
    }
  }

  // ---------------------------------------------------------------- drawing

  const show = (): boolean => phase === 'concert' || phase === 'bow'

  /** Concert lights: the room dims and a coloured beam sways over every pet. */
  const lights = (c: Ctx, L: Layout): void => {
    const { w, h, time } = game
    const b = Math.max(8, Math.min(w, h) * 0.018)
    const k = phase === 'concert' ? clamp(t / 0.6) : 1
    c.save()
    rr(c, b, b, w - b * 2, h - b * 2, b * 2.4)
    c.clip()
    c.fillStyle = `rgba(59,42,74,${0.3 * k})`
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < n; i++) {
      const x = L.x(i)
      const sway = Math.sin(time * 1.7 + i * 2.1) * L.lane * 0.3
      const half = L.size * 0.62
      c.globalAlpha = k * (0.3 + 0.12 * Math.sin(time * 5 + i))
      c.beginPath()
      c.moveTo(x + sway - 6, 0)
      c.lineTo(x + sway + 6, 0)
      c.lineTo(x + half, L.feet)
      c.lineTo(x - half, L.feet)
      c.closePath()
      paint(c, colors[i].light)
      oval(c, x, L.feet, half, L.size * 0.13)
      paint(c, colors[i].light)
    }
    c.restore()
  }

  const drawLane = (c: Ctx, L: Layout, i: number, active: boolean, ready: boolean): void => {
    const x = L.x(i)
    const col = colors[i]
    const { time } = game
    if (active) {
      // The lane whose turn it is glows softly.
      c.save()
      c.globalAlpha = (ready ? 0.62 : 0.4) + 0.12 * Math.sin(time * 6)
      const wide = Math.min(L.lane * 0.84, L.size * 1.5)
      rr(c, x - wide / 2, L.top - 4, wide, L.feet - L.top + L.size * 0.16, wide * 0.3)
      paint(c, col.light)
      c.restore()
    }
    // The wire: pencil dashes, like the link between two tamagotchis.
    c.save()
    c.setLineDash([L.r * 0.55, L.r * 0.75])
    c.globalAlpha = 0.6
    line(c, [x, L.top + 4, x, L.ringY - L.ring], Math.max(3, L.r * 0.22))
    c.restore()
    oval(c, x, L.top + 2, L.r * 0.32, L.r * 0.32)
    paint(c, col.shell, 2.5)
    // The ring.
    const flash = flashT[i]
    const pop = flash < 0.3 ? 1 + 0.4 * ease.hop(flash / 0.3) : ready ? 1 + 0.07 * Math.sin(time * 10) : 1
    const R = L.ring * pop
    oval(c, x, L.ringY, R, R)
    paint(c, flash < 0.3 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)')
    c.lineWidth = L.ring * 0.44
    c.strokeStyle = INK
    c.stroke()
    c.lineWidth = L.ring * 0.22
    c.strokeStyle = flash < 0.18 ? '#fff' : col.shell
    c.stroke()
  }

  const drawNote = (c: Ctx, L: Layout, note: Note, ready: boolean): void => {
    const x = L.x(note.lane)
    const y = Math.min(L.ringY, L.ringY - (note.at - clock) * L.ppb)
    const col = colors[note.lane]
    const s = L.r * (ready ? 1.08 + 0.1 * Math.sin(game.time * 10) : 1)
    c.save()
    c.globalAlpha = clamp((y - L.top) / (L.r * 2))
    if (note.beats >= 1.5) {
      // A long note trails a ribbon.
      const len = Math.min((note.beats - 1) * L.ppb * 0.8, y - L.top)
      if (len > 0) {
        rr(c, x - s * 0.42, y - len, s * 0.84, len, s * 0.42)
        paint(c, col.light, 2.5)
      }
    }
    line(c, [x + s * 0.8, y - s * 0.2, x + s * 0.8, y - s * 1.7, x + s * 1.5, y - s * 1.15], Math.max(2.5, s * 0.24))
    oval(c, x, y, s, s)
    paint(c, col.shell, Math.max(2.5, s * 0.2))
    oval(c, x - s * 0.32, y - s * 0.36, s * 0.3, s * 0.2, -0.6)
    paint(c, 'rgba(255,255,255,0.75)')
    c.restore()
  }

  const drawSinger = (c: Ctx, L: Layout, i: number, active: number, ready: boolean): void => {
    const { time } = game
    const x = L.x(i)
    const pose: Pose = { x, y: L.feet, size: L.size, squash: Math.sin(time * 3 + i * 1.7) * 0.04 }
    if (active >= 0 && active !== i) pose.face = clamp((L.x(active) - x) / 200, -1, 1)
    if (active === i) {
      pose.armL = pose.armR = 0.8 + Math.sin(time * 6) * 0.15
      if (ready) {
        pose.eyes = 'wide'
        pose.mouth = 'o'
        pose.squash = 0.1 + Math.sin(time * 10) * 0.05
      }
    }
    if (phase === 'intro') {
      const arrive = clamp((t - i * 0.12) / 0.5)
      if (arrive < 1) pose.squash = -0.7 * (1 - ease.back(arrive))
    }
    if (phase === 'cheer' || phase === 'bow') {
      pose.lift = Math.abs(Math.sin(t * 7 + i)) * L.size * 0.16
      pose.eyes = 'happy'
      pose.mouth = 'open'
      pose.armL = pose.armR = 2.6
    }
    if (phase === 'concert') {
      const beat = clock + i * 0.5
      pose.lean = Math.sin(beat * Math.PI) * 0.11
      pose.lift = Math.abs(Math.sin(beat * Math.PI)) * L.size * 0.05
      pose.eyes = 'happy'
      pose.armL = 1.2 + Math.sin(beat * Math.PI) * 0.7
      pose.armR = 1.2 - Math.sin(beat * Math.PI) * 0.7
    }
    const g = giggleT[i]
    if (g < 0.45) {
      pose.squash = Math.sin(g * 32) * 0.22 * (1 - g / 0.45)
      pose.eyes = 'happy'
    }
    const s = singT[i]
    if (s < singDur[i] + 0.12) {
      // Stretch up to the note and let it out.
      pose.squash = -0.6 * ease.hop(clamp(s / (singDur[i] + 0.12)) ** 0.5)
      pose.mouth = s < 0.2 ? 'open' : 'sing'
      pose.eyes = 'happy'
      pose.armL = pose.armR = 2.5
      pose.face = 0
    }
    drawPet(c, pets[i].species, pets[i].look, pose, time)
  }

  const draw = (c: Ctx): void => {
    const L = layout()
    drawRoom(c, game, ctx.shell, L.feet - L.size * 0.3)
    if (show()) lights(c, L)
    const next = phase === 'play' ? notes[idx] : null
    const ready = !!next && clock >= next.at
    const active = next ? next.lane : -1
    for (let i = 0; i < n; i++) drawLane(c, L, i, active === i, ready)
    for (let i = 0; i < n; i++) drawSinger(c, L, i, active, ready)
    if (phase === 'play' || phase === 'concert') {
      let end = idx
      while (end < notes.length && L.ringY - (notes[end].at - clock) * L.ppb > L.top) end++
      // Farthest first, so the note that is due lies on top.
      for (let k = end - 1; k >= idx; k--) drawNote(c, L, notes[k], ready && k === idx)
    }
    fx.draw(c)
  }

  const debug = () => {
    const L = layout()
    const note = phase === 'intro' || phase === 'play' ? notes[idx] : null
    return {
      phase,
      done: phase === 'over',
      next: note
        ? { lane: note.lane, x: L.x(note.lane), y: L.feet - L.size * 0.45, ready: phase === 'play' && clock >= note.at }
        : null,
      sung,
      total,
    }
  }

  return {
    enter() {
      game.sfx.loop(null)
    },
    leave() {
      fx.bits = []
    },
    update,
    draw,
    down,
    debug,
  }
}
