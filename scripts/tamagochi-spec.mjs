// Browser checks for Тамагочи Связь. Needs a running server (npm run dev, or vite preview of a build).
// TAMAGOCHI_BASE_URL selects the site (default http://localhost:5173), CHROMIUM_PATH a browser binary
// (otherwise the installed Chrome). Screenshots go to tmp/tamagochi/spec/.
// Expected texts come straight from src/tamagochi-copy.ts, so Node must be able to import .ts files
// (Node ≥ 22.18 strips types by default). Speech is recorded instead of spoken.
// Every section runs on its own: a failing section is reported and the rest still run.
// TAMAGOCHI_ONLY=<text> runs only the sections whose title contains that text.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

let COPY, PET_NAME, ACTIVITY_NAME
try {
  ;({ TAMAGOCHI_COPY: COPY, PET_NAME, ACTIVITY_NAME } = await import('../src/tamagochi-copy.ts'))
} catch (error) {
  console.error(`Cannot import the Тамагочи modules (${error.message}). Node ≥ 22.18 is needed (TypeScript type stripping).`)
  process.exit(2)
}

const BASE = (process.env.TAMAGOCHI_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const GAME = `${BASE}/tamagochi/`
const KEY = 'spielzeuge.tamagochi.v1'
const SHOTS = 'tmp/tamagochi/spec'
const IPAD = { width: 1180, height: 820 }
mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})

/** Records speech instead of speaking. */
function instrument() {
  window.spoken = []
  window.cancels = 0
  Object.defineProperty(speechSynthesis, 'speak', {
    configurable: true,
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(), 5)
    },
  })
  Object.defineProperty(speechSynthesis, 'cancel', { configurable: true, value: () => void window.cancels++ })
}

async function open(path = '', { viewport = IPAD, storage = null, lang = null } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.addInitScript(instrument)
  await page.addInitScript(
    ([key, value, language]) => {
      if (sessionStorage.getItem('spec.seeded')) return
      sessionStorage.setItem('spec.seeded', '1')
      if (value) localStorage.setItem(key, value)
      if (language) localStorage.setItem('spielzeuge.lang', language)
    },
    [KEY, storage ? JSON.stringify(storage) : null, lang],
  )
  await page.goto(GAME + path)
  await page.waitForFunction(() => window.__tamagochi?.scene())
  // The game clock runs several steps per frame, so a sitting takes seconds, not minutes.
  await page.evaluate((speed) => (window.__tamagochi.speed = speed), +(process.env.TAMAGOCHI_SPEED ?? 3))
  return { page, context, errors }
}

const sceneKind = (page) => page.evaluate(() => window.__tamagochi.scene().kind)
const devs = (page) =>
  page.evaluate(() =>
    window.__tamagochi.scene().devs.map((d) => ({
      phase: d.phase,
      want: d.want,
      left: d.left,
      dots: d.data.dots,
      species: d.data.species,
      anim: d.anim?.kind ?? null,
      r: d.screenRect(),
      box: d.rect(),
      tip: d.tip(),
      swap: d.swapRect(),
    })),
  )
const save = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tamagochi.game.save)))
const spoken = (page) => page.evaluate(() => window.spoken.map((s) => s.text))
/** Speech starts a moment after the game asks for it, so wait for the line. */
async function heard(page, text) {
  try {
    await page.waitForFunction((t) => window.spoken.some((s) => s.text === t), text, { timeout: 3000 })
  } catch {
    assert.fail(`not spoken: «${text}»; heard: ${JSON.stringify((await spoken(page)).slice(-4))}`)
  }
}
const caption = (page) => page.locator('#tg-caption').textContent()
const centre = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

async function swipe(page, x, y, dx, dy) {
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 5; i++) await page.mouse.move(x + (dx * i) / 5, y + (dy * i) / 5)
  await page.mouse.up()
}
const gesture = (page, at, kind) =>
  kind === 'tap' || kind === 'spin'
    ? page.mouse.click(at.x, at.y)
    : swipe(page, at.x, at.y, kind === 'left' ? -80 : kind === 'right' ? 80 : 0, kind === 'up' ? -80 : kind === 'down' ? 80 : 0)

async function until(page, check, what, ms = 30000) {
  const t0 = Date.now()
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`)
    await page.waitForTimeout(60)
  }
}

async function hatchAll(page) {
  for (const d of await devs(page))
    if (d.phase === 'egg')
      for (let i = 0; i < 3; i++) {
        await page.mouse.click(centre(d.r).x, centre(d.r).y)
        await page.waitForTimeout(40)
      }
}

/** Answer one wish of tamagotchi `i` with its gesture; returns the wish. */
async function answer(page, i) {
  const d = await until(page, async () => (await devs(page))[i].phase === 'want' && !(await devs(page))[i].anim && (await devs(page))[i], `a wish in tamagotchi ${i}`)
  const c = centre(d.r)
  const dotsBefore = d.dots
  if (d.want === 'sleep') {
    await until(page, async () => (await devs(page))[i].phase === 'sleep', 'the dark screen')
    await page.mouse.click(c.x, c.y - 20)
  } else {
    for (let n = 0; n < d.left; n++) {
      await until(page, async () => (await devs(page))[i].phase === 'want' && !(await devs(page))[i].anim, 'the next bite')
      if (d.want === 'poop') await swipe(page, c.x + 40, c.y, -90, 0)
      else await swipe(page, c.x, c.y + 30, 0, -90)
    }
  }
  await until(page, async () => (await devs(page))[i].dots === dotsBefore + 1, `a new light after ${d.want}`)
  return d.want
}

async function careAll(page) {
  const wants = []
  await until(
    page,
    async () => {
      const ds = await devs(page)
      if (ds.every((d) => d.phase === 'ready')) return true
      for (const [i, d] of ds.entries()) if (d.phase === 'want' && !d.anim) wants.push(await answer(page, i))
      return false
    },
    'all pets ready',
    90000,
  )
  return wants
}

async function drag(page, from, to, steps = 8) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
  await page.mouse.up()
}

const READY = (species) => ({
  v: 1,
  devices: species.map((s) => ({ species: s, hatched: true, dots: 5 })),
  looks: {},
  hearts: 0,
  owned: [],
  played: {},
  hints: { food: 9, poop: 9, play: 9, sleep: 9, ready: 9, link: 9, wishes: 9 },
})

async function visit(page) {
  await until(page, async () => (await devs(page)).every((d) => d.phase === 'ready'), 'ready pets')
  const ds = await devs(page)
  await drag(page, ds[0].tip, ds[1].tip)
  await until(page, async () => (await sceneKind(page)) === 'meet', 'the visit')
}

const act = (page) => page.evaluate(() => window.__tamagochi.scene().act?.debug?.() ?? null)
const result = (page) => page.evaluate(() => window.__tamagochi.scene().result)
const meet = (page) =>
  page.evaluate(() => {
    const s = window.__tamagochi.scene()
    return { kind: s.kind, playing: !!s.act, count: s.count, result: !!s.result, hug: !!s.hug }
  })

/* ───────────── how a robot plays each activity ───────────── */

const PLAY = {
  async dance(page) {
    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
    let wrongDone = false
    await until(
      page,
      async () => {
        if (await result(page)) return true
        const d = await act(page)
        if (d?.expected?.length) {
          if (!wrongDone && d.round === 0) {
            // One wrong answer: the game forgives and shows the moves again.
            wrongDone = true
            const wrong = d.expected[0] === 'up' ? 'down' : 'up'
            await gesture(page, { x: w / 2, y: h / 2 }, wrong)
            await until(page, async () => (await act(page))?.mistakes === 1, 'a counted mistake')
            return false
          }
          const left = d.expected.length
          await gesture(page, { x: w / 2, y: h / 2 }, d.expected[0])
          await until(page, async () => (await result(page)) || ((await act(page))?.expected?.length ?? 0) !== left || (await act(page))?.phase !== d.phase, 'the move to count', 8000)
        }
        return false
      },
      'the dance to end',
      120000,
    )
  },
  async song(page) {
    await until(
      page,
      async () => {
        if (await result(page)) return true
        const d = await act(page)
        if (d?.next?.ready) await page.mouse.click(d.next.x, d.next.y)
        return false
      },
      'the song to end',
      120000,
    )
  },
  async rings(page) {
    await until(
      page,
      async () => {
        if (await result(page)) return true
        const d = await act(page)
        for (const lane of d?.lanes ?? []) if (lane.todo.length) await gesture(page, lane, lane.todo[0])
        await page.waitForTimeout(120)
        return false
      },
      'the gymnastics to end',
      120000,
    )
  },
  async hair(page) {
    let d = await until(page, async () => ((await act(page))?.tiles?.length ? act(page) : null), 'the salon')
    const before = JSON.stringify(d.look)
    const pick = d.tiles.find((t) => !t.selected && t.id !== 'none') ?? d.tiles[0]
    await page.mouse.click(pick.x, pick.y)
    d = await until(page, async () => (JSON.stringify((await act(page)).look) !== before ? act(page) : null), 'a new hairdo')
    const colour = d.tabs.find((t) => t.id === 'color')
    await page.mouse.click(colour.x, colour.y)
    d = await until(page, async () => ((await act(page)).tab === 'color' ? act(page) : null), 'the colour tab')
    const other = d.tiles.find((t) => !t.selected)
    await page.mouse.click(other.x, other.y)
    await page.waitForTimeout(300)
    await page.mouse.click(d.doneBtn.x, d.doneBtn.y)
    await until(page, async () => result(page), 'the salon to end', 30000)
    return { before, after: JSON.stringify(d.look) }
  },
  async gifts(page) {
    await until(
      page,
      async () => {
        if (await result(page)) return true
        const d = await act(page)
        if (d?.phase === 'choose' && d.boxes.length) await page.mouse.click(d.boxes[0].x, d.boxes[0].y)
        else if (d?.phase === 'open' && d.box && d.tapsLeft > 0) await page.mouse.click(d.box.x, d.box.y)
        await page.waitForTimeout(120)
        return false
      },
      'the gifts to end',
      120000,
    )
  },
  async bows(page) {
    await until(
      page,
      async () => {
        if (await result(page)) return true
        const d = await act(page)
        if (d?.phase === 'color' && d.wires.length) await page.mouse.click(d.wires[1].x, d.wires[1].y)
        else if (d?.phase === 'shape' && d.shapes.length) await page.mouse.click(d.shapes[0].x, d.shapes[0].y)
        else if (d?.phase === 'trace' && d.trace && d.trace.progress < 1) {
          const pts = d.trace.points
          const from = Math.max(0, Math.floor(d.trace.progress * (pts.length - 1)) - 1)
          await page.mouse.move(pts[from].x, pts[from].y)
          await page.mouse.down()
          for (let i = from; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y)
          await page.mouse.up()
        } else if (d?.phase === 'give' && d.pets.length) await page.mouse.click(d.pets[d.pets.length - 1].x, d.pets[d.pets.length - 1].y)
        await page.waitForTimeout(120)
        return false
      },
      'the bows to end',
      120000,
    )
  },
}

/* ───────────── sections ───────────── */

const sections = []
const section = (title, fn) => sections.push({ title, fn })

section('eggs, wishes and lights', async () => {
  const { page, errors, context } = await open('', {})
  let ds = await devs(page)
  assert.deepEqual(ds.map((d) => [d.species, d.phase, d.dots]), [['chick', 'egg', 2], ['kitten', 'egg', 2]])
  assert.equal(await caption(page), COPY.ru.eggHint)
  await page.screenshot({ path: `${SHOTS}/eggs.png` })
  await hatchAll(page)
  ds = await devs(page)
  assert.ok(ds.every((d) => d.phase !== 'egg'), 'three knocks hatch the egg')
  await heard(page, COPY.ru.hatched.replace('{name}', PET_NAME.ru.kitten))

  // The chick's first wish is food. A swipe the wrong way changes nothing.
  let d = await until(page, async () => (await devs(page))[0].phase === 'want' && (await devs(page))[0], 'the first wish')
  assert.equal(d.want, 'food')
  await heard(page, COPY.ru.wantFood.replace('{name}', PET_NAME.ru.chick))
  await until(page, async () => (await devs(page))[1].phase === 'want', 'the kitten to wish too')
  await page.waitForTimeout(250)
  await swipe(page, centre(d.r).x, centre(d.r).y, -90, 0)
  await until(page, async () => (await devs(page))[0].anim === null, 'the head shake to end')
  d = (await devs(page))[0]
  assert.deepEqual([d.phase, d.want, d.left, d.dots], ['want', 'food', 2, 2])
  await heard(page, COPY.ru.wrongWay)
  await page.screenshot({ path: `${SHOTS}/wish.png` })

  const wants = await careAll(page)
  assert.ok(wants.includes('food') && wants.includes('poop') && wants.includes('play'), `wishes seen: ${wants}`)
  ds = await devs(page)
  assert.ok(ds.every((x) => x.dots === 5 && x.phase === 'ready'))
  assert.deepEqual((await save(page)).devices.map((x) => [x.hatched, x.dots]), [[true, 5], [true, 5]])
  const stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), KEY))
  assert.deepEqual(stored.devices.map((x) => x.dots), [5, 5])
  await page.screenshot({ path: `${SHOTS}/ready.png` })
  assert.deepEqual(errors, [])
  await context.close()
})

section('the link: refused, drawn, the journey', async () => {
  const storage = READY(['chick', 'kitten'])
  storage.devices[1].dots = 4
  const { page, errors, context } = await open('', { storage })
  await until(page, async () => (await devs(page))[0].phase === 'ready', 'a ready chick')
  let ds = await devs(page)
  assert.notEqual(ds[1].phase, 'ready')
  await drag(page, ds[0].tip, ds[1].tip)
  assert.equal(await sceneKind(page), 'home')
  assert.equal(await page.evaluate(() => window.__tamagochi.scene().links.length), 0)
  await heard(page, COPY.ru.notReady.replace('{name}', PET_NAME.ru.kitten))

  await careAll(page)
  ds = await devs(page)
  // Start on the shell above the screen, end on the other tamagotchi's screen: both count.
  await drag(page, { x: ds[0].box.x + ds[0].box.w / 2, y: ds[0].r.y - 30 }, centre(ds[1].r))
  assert.equal(await page.evaluate(() => window.__tamagochi.scene().links.length), 1)
  await heard(page, COPY.ru.linked)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${SHOTS}/linked.png` })
  await until(page, async () => (await sceneKind(page)) === 'meet', 'the visit')
  await heard(page, COPY.ru.meetHello)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/visit.png` })
  assert.deepEqual(errors, [])
  await context.close()
})

section('the visit: hug, two activities, home', async () => {
  const { page, errors, context } = await open('', { storage: READY(['chick', 'kitten']) })
  await visit(page)
  const places = await page.evaluate(() => window.__tamagochi.scene().places())
  await drag(page, { x: places[1].x, y: places[1].y - places[1].size * 0.5 }, { x: places[0].x + 20, y: places[0].y - places[0].size * 0.5 })
  assert.ok((await meet(page)).hug, 'moving one pet onto the other starts a hug')
  assert.equal((await save(page)).hearts, 1)
  await until(page, async () => !(await meet(page)).hug, 'the hug to end')
  await drag(page, { x: places[1].x, y: places[1].y - places[1].size * 0.5 }, { x: places[0].x + 20, y: places[0].y - places[0].size * 0.5 })
  await until(page, async () => !(await meet(page)).hug, 'the second hug to end')
  assert.equal((await save(page)).hearts, 1, 'only the first hug of a visit gives a heart')

  for (const [n, id] of ['gifts', 'hair'].entries()) {
    const buttons = await page.evaluate(() => window.__tamagochi.scene().buttons())
    const b = buttons.find((x) => x.id === id)
    await page.mouse.click(b.r.x + b.r.w / 2, b.r.y + b.r.h / 2)
    await until(page, async () => (await meet(page)).playing, `${id} to start`)
    await heard(page, ACTIVITY_NAME.ru[id])
    await PLAY[id](page)
    assert.equal((await save(page)).hearts, 2 + n)
    assert.equal((await save(page)).played[id], 1)
    await page.screenshot({ path: `${SHOTS}/stars-${id}.png` })
    await page.waitForTimeout(600)
    await page.mouse.click(20, 400)
    await until(page, async () => (await sceneKind(page)) === 'home' || !(await meet(page)).result, 'the stars to close')
  }
  // Two activities: the pets go home by themselves, with two lights each.
  await until(page, async () => (await sceneKind(page)) === 'home', 'the way home', 20000)
  await heard(page, COPY.ru.goHome)
  assert.deepEqual((await devs(page)).map((d) => d.dots), [2, 2])
  const s = await save(page)
  assert.ok(s.owned.some((id) => id.startsWith('g:')), 'a gift was added to the collection')
  await page.screenshot({ path: `${SHOTS}/home-again.png` })
  assert.deepEqual(errors, [])
  await context.close()
})

for (const id of ['dance', 'song', 'rings', 'hair', 'gifts', 'bows'])
  for (const [pets, viewport] of [
    ['chick,kitten', IPAD],
    ['monkey,banana,mini', { width: 390, height: 844 }],
  ])
    section(`activity ${id} with ${pets.split(',').length} pets at ${viewport.width}×${viewport.height}`, async () => {
      const { page, errors, context } = await open(`?fresh=1&scene=${id}&pets=${pets}`, { viewport })
      await until(page, async () => (await act(page)) !== null, 'the activity')
      const first = await act(page)
      assert.equal(first.done, false)
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${SHOTS}/${id}-${viewport.width}.png` })
      await PLAY[id](page)
      const r = await result(page)
      assert.ok(r.stars >= 1 && r.stars <= 3, `stars: ${r.stars}`)
      assert.equal((await save(page)).played[id], 1)
      assert.deepEqual(errors, [])
      await context.close()
    })

section('the pet picker: a third tamagotchi, locked eggs', async () => {
  const { page, errors, context } = await open('', { storage: READY(['chick', 'kitten']) })
  await until(page, async () => (await devs(page)).every((d) => d.phase === 'ready'), 'ready pets')
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
  await page.mouse.click(w - 45, h - 49)
  await until(page, async () => page.evaluate(() => !!window.__tamagochi.scene().picker), 'the picker')
  await heard(page, COPY.ru.pickTitle)
  const lay = await page.evaluate(() => window.__tamagochi.scene().pickerLayout())
  await page.screenshot({ path: `${SHOTS}/picker.png` })
  const card = (species) => centre(lay.cards.find((c) => c.species === species).r)
  await page.mouse.click(card('bunny').x, card('bunny').y)
  await heard(page, COPY.ru.locked.replace('{n}', '7'))
  await page.mouse.click(card('chick').x, card('chick').y)
  await heard(page, COPY.ru.busy.replace('{name}', PET_NAME.ru.chick))
  assert.equal((await devs(page)).length, 2)
  await page.mouse.click(card('banana').x, card('banana').y)
  let ds = await devs(page)
  assert.deepEqual(ds.map((d) => [d.species, d.phase]), [['chick', 'ready'], ['kitten', 'ready'], ['banana', 'egg']])
  for (const d of ds) assert.ok(d.box.x >= 0 && d.box.x + d.box.w <= w + 1 && d.box.y >= 0 && d.box.y + d.box.h <= h + 1, 'three tamagotchis fit the screen')
  await hatchAll(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${SHOTS}/three.png` })

  // The egg button at the bottom of the third one: put it away again.
  ds = await devs(page)
  await page.mouse.click(centre(ds[2].swap).x, centre(ds[2].swap).y)
  await until(page, async () => page.evaluate(() => !!window.__tamagochi.scene().picker), 'the picker of the third tamagotchi')
  const lay2 = await page.evaluate(() => window.__tamagochi.scene().pickerLayout())
  assert.ok(lay2.remove, 'with three tamagotchis one can be put away')
  await page.mouse.click(centre(lay2.remove).x, centre(lay2.remove).y)
  assert.deepEqual((await devs(page)).map((d) => d.species), ['chick', 'kitten'])
  assert.deepEqual((await save(page)).devices.map((d) => d.species), ['chick', 'kitten'])
  assert.deepEqual(errors, [])
  await context.close()
})

section('languages, speech and mute', async () => {
  for (const lang of ['ru', 'de', 'en']) {
    const { page, errors, context } = await open(`?lang=${lang}`, { lang })
    assert.equal(await page.title(), COPY[lang].documentTitle)
    assert.equal(await page.getAttribute('html', 'lang'), lang)
    assert.equal(await page.getAttribute('#tg-home', 'aria-label'), COPY[lang].home)
    assert.equal(await page.getAttribute('#tg-canvas', 'aria-label'), COPY[lang].canvas)
    assert.equal(await caption(page), COPY[lang].eggHint)
    await hatchAll(page)
    await heard(page, COPY[lang].hatched.replace('{name}', PET_NAME[lang].kitten))
    const hello = (await page.evaluate(() => window.spoken)).find((s) => s.text === COPY[lang].hatched.replace('{name}', PET_NAME[lang].kitten))
    assert.ok(hello.lang.toLowerCase().startsWith(lang))
    assert.deepEqual(errors, [])
    await context.close()
  }
  const { page, errors, context } = await open('', {})
  await page.click('#tg-lang')
  assert.equal(await page.textContent('#tg-lang'), 'DE')
  assert.equal(await page.evaluate(() => localStorage.getItem('spielzeuge.lang')), 'de')
  await heard(page, 'Deutsch')
  await hatchAll(page)
  await heard(page, COPY.de.hatched.replace('{name}', PET_NAME.de.kitten))

  await page.click('#tg-sound')
  assert.equal(await page.getAttribute('#tg-sound', 'aria-pressed'), 'false')
  assert.equal(await page.getAttribute('#tg-sound', 'aria-label'), COPY.de.soundOff)
  assert.equal(await page.evaluate(() => localStorage.getItem('spielzeuge.tamagochi.sound')), '0')
  await page.waitForTimeout(200)
  const count = (await spoken(page)).length
  const d = await until(page, async () => (await devs(page))[0].phase === 'want' && (await devs(page))[0], 'a wish while muted')
  await page.waitForTimeout(200)
  assert.equal((await spoken(page)).length, count, 'nothing is spoken while muted')
  assert.notEqual(await caption(page), '', 'the caption still shows the wish')
  assert.ok(d.want)
  await page.reload()
  await page.waitForFunction(() => window.__tamagochi?.scene())
  assert.equal(await page.getAttribute('#tg-sound', 'aria-pressed'), 'false', 'mute is remembered')
  assert.equal(await page.textContent('#tg-lang'), 'DE', 'the language is remembered')
  assert.deepEqual(errors, [])
  await context.close()
})

section('layout at five screen sizes', async () => {
  for (const viewport of [
    { width: 1366, height: 1024 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ])
    for (const species of [['chick', 'kitten'], ['chick', 'kitten', 'monkey', 'banana']]) {
      const { page, errors, context } = await open('', { viewport, storage: READY(species) })
      await page.waitForTimeout(500)
      const ds = await devs(page)
      for (const [i, d] of ds.entries()) {
        assert.ok(d.box.x >= -1 && d.box.x + d.box.w <= viewport.width + 1, `tamagotchi ${i} fits ${viewport.width} wide`)
        assert.ok(d.box.y >= 0 && d.box.y + d.box.h <= viewport.height + 1, `tamagotchi ${i} fits ${viewport.height} high`)
        assert.ok(d.r.w >= 88, `screen ${i} is big enough to swipe on (${Math.round(d.r.w)}px)`)
        for (const o of ds.slice(i + 1)) assert.ok(d.r.x + d.r.w <= o.r.x || o.r.x + o.r.w <= d.r.x || d.r.y + d.r.h <= o.r.y || o.r.y + o.r.h <= d.r.y, 'screens do not overlap')
      }
      await page.screenshot({ path: `${SHOTS}/layout-${viewport.width}x${viewport.height}-${species.length}.png` })
      assert.deepEqual(errors, [])
      await context.close()
    }
})

section('catalog card in three languages', async () => {
  for (const lang of ['ru', 'de', 'en']) {
    const context = await browser.newContext({ viewport: IPAD })
    const page = await context.newPage()
    await page.goto(`${BASE}/?lang=${lang}`)
    const card = page.locator('a.toy-card--tamagochi')
    assert.equal(await card.getAttribute('href'), './tamagochi/')
    assert.equal(await card.locator('[data-i18n="tamagochi-name"]').textContent(), COPY[lang].name)
    assert.equal(await card.locator('[data-i18n="tamagochi-blurb"]').textContent(), `${COPY[lang].byline}. ${COPY[lang].tagline}`)
    await context.close()
  }
})

let failed = 0
for (const { title, fn } of sections) {
  if (process.env.TAMAGOCHI_ONLY && !title.includes(process.env.TAMAGOCHI_ONLY)) continue
  const t0 = Date.now()
  try {
    await fn()
    console.log(`ok   ${title} (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  } catch (error) {
    failed++
    console.log(`FAIL ${title}\n     ${String(error.stack ?? error).split('\n').slice(0, 4).join('\n     ')}`)
  }
}
await browser.close()
console.log(failed ? `${failed} section(s) failed` : 'Тамагочи Связь: all checks passed')
process.exit(failed ? 1 : 0)
