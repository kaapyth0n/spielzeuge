// Browser checks for Лошадка. Needs a running server (npm run dev, or vite preview of a build).
// LOSHADKA_BASE_URL selects the site (default http://localhost:5173), CHROMIUM_PATH a browser binary
// (otherwise the installed Chrome). Screenshots go to tmp/loshadka/spec/.
// Expected texts come straight from src/loshadka-copy.ts and src/loshadka-items.ts, so Node must be
// able to import .ts files (Node ≥ 22.18 strips types by default).
// Speech is recorded instead of spoken; Web Audio runs for real and its source starts are counted.
// Every section runs on its own: a failing section is reported with its step and the rest still run.
// LOSHADKA_ONLY=<text> runs only the sections whose title contains that text (e.g. LOSHADKA_ONLY=layout).
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

let COPY, pronounce, GIFTS, PONY_NAMES, SIDES, findItem, ST
try {
  ;({ LOSHADKA_COPY: COPY, pronounce } = await import('../src/loshadka-copy.ts'))
  ;({ GIFTS, PONY_NAMES, SIDES, findItem } = await import('../src/loshadka-items.ts'))
  ST = await import('../src/loshadka-state.ts')
} catch (error) {
  console.error(`Cannot import the Лошадка modules (${error.message}). Node ≥ 22.18 is needed (TypeScript type stripping).`)
  process.exit(2)
}

const BASE = (process.env.LOSHADKA_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const GAME = `${BASE}/loshadka/`
const KEY = 'spielzeuge.loshadka.v1'
const SHOTS = 'tmp/loshadka/spec'
const LOCALE = { ru: 'ru-RU', de: 'de-DE', en: 'en-GB' }
const LANG_NAME = { ru: 'русский', de: 'Deutsch', en: 'English' }
const IPAD = { width: 1180, height: 820 }
mkdirSync(SHOTS, { recursive: true })

const launchOptions = (extra = {}) => ({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
  ...extra,
})
const browser = await chromium.launch(launchOptions())

/* ───────────── page instrumentation (init scripts) ───────────── */

/** Records speech, Web Audio activity, strip glows and star-slot fills. */
function instrument() {
  window.spoken = []
  window.speech = { cancels: 0 }
  Object.defineProperty(speechSynthesis, 'speak', {
    configurable: true,
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(), 5)
    },
  })
  Object.defineProperty(speechSynthesis, 'cancel', { configurable: true, value: () => void window.speech.cancels++ })

  window.audio = { starts: 0, contexts: 0, closes: 0, buffers: [] }
  const Base = window.AudioContext
  if (Base) {
    const close = Base.prototype.close
    Base.prototype.close = function () {
      window.audio.closes++
      return close.call(this)
    }
    window.AudioContext = class extends Base {
      constructor(...args) {
        super(...args)
        window.audio.contexts++
      }
    }
  }
  // AudioBufferSourceNode has its own start(); oscillators use the shared one.
  for (const proto of [window.AudioScheduledSourceNode?.prototype, window.AudioBufferSourceNode?.prototype]) {
    if (!proto || !Object.prototype.hasOwnProperty.call(proto, 'start')) continue
    const start = proto.start
    proto.start = function (...args) {
      window.audio.starts++
      if (this instanceof AudioBufferSourceNode && this.buffer && this.buffer.duration > 0.4)
        window.audio.buffers.push({ rate: this.playbackRate.value, duration: this.buffer.duration })
      return start.apply(this, args)
    }
  }

  /** Union of the painted shapes under `root` (skips hidden, transparent, clipped and defs content). */
  window.__specVisibleBox = (root) => {
    let box = null
    for (const el of root.querySelectorAll('path,ellipse,circle,rect,polygon,polyline,line,image,use,text')) {
      if (el.closest('defs,clipPath,mask,pattern,symbol,marker,linearGradient,radialGradient')) continue
      let shown = true
      for (let e = el; e && e !== root.parentNode; e = e.parentNode) {
        const cs = getComputedStyle(e)
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || (cs.clipPath && cs.clipPath !== 'none')) {
          shown = false
          break
        }
      }
      const cs = getComputedStyle(el)
      if (!shown || (cs.fill === 'none' && cs.stroke === 'none')) continue
      const b = el.getBoundingClientRect()
      if (!b.width && !b.height) continue
      box = box
        ? { left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom) }
        : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
    }
    return box
  }

  window.glows = []
  window.slotFills = []
  window.pageshows = []
  addEventListener('pageshow', (event) => window.pageshows.push(event.persisted))
  // glowStrip() removes and re-adds the class in one task: count each element once per batch.
  new MutationObserver((records) => {
    const counted = new Set()
    for (const r of records) {
      const el = r.target
      if (!el.classList || counted.has(el)) continue
      const was = r.oldValue ?? ''
      if (el.classList.contains('lh-strip') && el.classList.contains('is-glow') && !/\bis-glow\b/.test(was)) {
        counted.add(el)
        window.glows.push({ side: el.dataset.side, t: performance.now() })
      }
      if (el.classList.contains('lh-slot') && el.classList.contains('is-filled') && !/\bis-filled\b/.test(was)) {
        counted.add(el)
        window.slotFills.push({ slot: Number(el.dataset.slot), t: performance.now() })
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true })
}

/** Seeds language and save once per tab (reloads keep what the game stored). */
function seed([lang, save, key]) {
  try {
    if (sessionStorage.getItem('spec.seeded')) return
    sessionStorage.setItem('spec.seeded', '1')
    if (lang) localStorage.setItem('spielzeuge.lang', lang)
    if (save != null) localStorage.setItem(key, save)
  } catch {
    // storage blocked on purpose in some sections
  }
}

/** Safari-style private mode: touching localStorage throws. */
function blockStorageGetter() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })
}

/** A full or refusing device: reads work, every write throws. */
function blockStorageWrites() {
  Storage.prototype.setItem = function () {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  }
}

/* ───────────── helpers ───────────── */

let current = ''
const step = (name) => {
  current = name
  console.log(`  • ${name}`)
}
const failures = []
const ONLY = process.env.LOSHADKA_ONLY
async function section(name, fn) {
  if (ONLY && !name.includes(ONLY)) return
  console.log(`▸ ${name}`)
  const open = []
  try {
    await fn(open)
  } catch (error) {
    failures.push({ section: name, step: current, message: String(error?.message ?? error).split('\n').slice(0, 60).join('\n') })
    console.log(`  ✗ FAILED at «${current}»: ${String(error?.message ?? error).split('\n')[0]}`)
  } finally {
    for (const context of open) await context.close().catch(() => {})
  }
}

function watch(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  return errors
}

async function fresh(open, { viewport = IPAD, lang = 'ru', save = null, block = null, query = '?debug=1', reducedMotion = 'no-preference', on = browser } = {}) {
  const context = await on.newContext({ viewport, hasTouch: viewport.width < 900, reducedMotion })
  open.push(context)
  await context.addInitScript(instrument)
  await context.addInitScript(seed, [lang, save == null ? null : typeof save === 'string' ? save : ST.serialize(save), KEY])
  if (block === 'getter') await context.addInitScript(blockStorageGetter)
  if (block === 'writes') await context.addInitScript(blockStorageWrites)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = watch(page)
  await page.goto(GAME + query)
  await page.waitForSelector('.lh-stage')
  return { context, page, errors }
}

const st = (page) => page.evaluate(() => window.__loshadka.state())
const savedGame = (page) => page.evaluate(() => window.__loshadka.save())
const stored = (page) =>
  page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return 'blocked'
    }
  }, KEY)

async function until(page, test, what, timeout = 8000) {
  const start = Date.now()
  for (;;) {
    const s = await st(page)
    if (test(s)) return s
    if (Date.now() - start > timeout) {
      const { look, missing, celebration, screen, stars, finished, editing, done, lang } = s
      throw new Error(`timeout waiting for ${what}: ${JSON.stringify({ screen, lang, look, missing, celebration, stars, finished, editing, done })}`)
    }
    await page.waitForTimeout(60)
  }
}

async function waitDom(page, fn, arg, what, timeout = 8000) {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 50 })
  } catch {
    throw new Error(`timeout waiting for ${what}`)
  }
}

/** What the voice would really say for a copy text (pronounce respells some Russian words). */
const voice = (lang, text) => pronounce(text, lang).replace(/\s+/g, ' ').trim()
const name = (kind, id, lang) => findItem(kind, id).name[lang]

/** Narration waits 60 ms after a tap; give it a little more. */
async function heard(page, ms = 170) {
  await page.waitForTimeout(ms)
  return page.evaluate(() => window.spoken)
}
async function hush(page) {
  await page.waitForTimeout(170)
  await page.evaluate(() => (window.spoken = []))
}
async function expectSaid(page, lang, expected, what, ms) {
  const got = await heard(page, ms)
  assert.deepEqual(
    got.map((u) => u.text),
    expected.map((text) => voice(lang, text)),
    `${what}: spoken ${JSON.stringify(got.map((u) => u.text))}`,
  )
  for (const u of got) assert.equal(u.lang, LOCALE[lang], `${what}: spoken in ${u.lang}`)
}
async function saidIncludes(page, lang, text) {
  const got = await page.evaluate(() => window.spoken)
  return got.some((u) => u.text === voice(lang, text) && u.lang === LOCALE[lang])
}

/** Russian left on a German or English screen: visible text, labels and the title. */
const cyrillicLeft = (page) =>
  page.evaluate(() => {
    const found = []
    const ru = /[А-Яа-яЁё]/
    if (ru.test(document.title)) found.push(`title: ${document.title}`)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement
      if (!el || el.closest('[hidden], option, script, style') || !ru.test(node.textContent)) continue
      if (el.getClientRects().length === 0) continue
      found.push(`text: ${node.textContent.trim().slice(0, 60)}`)
    }
    for (const el of document.querySelectorAll('[aria-label], [title], [alt]')) {
      if (el.closest('[hidden]')) continue
      for (const attr of ['aria-label', 'title', 'alt']) {
        const value = el.getAttribute(attr)
        if (value && ru.test(value)) found.push(`${attr}: ${value.slice(0, 60)}`)
      }
    }
    return found
  })

const audioStarts = (page) => page.evaluate(() => window.audio.starts)
const cancels = (page) => page.evaluate(() => window.speech.cancels)

/** A point on the stage pony whose innermost tap zone is `zone` (centre-out scan). */
const zonePoint = (page, zone) =>
  page.evaluate((zone) => {
    const holder = document.querySelector('.lh-stage .lh-stage-pony')
    const group = holder?.querySelector(`[data-zone="${zone}"]`)
    if (!group) return null
    const r = group.getBoundingClientRect()
    const points = []
    for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) points.push([r.left + (r.width * i) / 30, r.top + (r.height * j) / 30])
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    points.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
    for (const [x, y] of points) {
      const hit = document.elementFromPoint(x, y)
      if (hit && holder.contains(hit) && hit.closest('[data-zone]')?.getAttribute('data-zone') === zone) {
        // keep clear of the edges: the pony breathes
        const ok = [[-3, 0], [3, 0], [0, -3], [0, 3]].every(([dx, dy]) => {
          const near = document.elementFromPoint(x + dx, y + dy)
          return near && holder.contains(near) && near.closest('[data-zone]')?.getAttribute('data-zone') === zone
        })
        if (ok) return { x, y }
      }
    }
    return null
  }, zone)

/** A point where `selector` itself (or a child) is hit. */
const pointOn = (page, selector) =>
  page.evaluate((selector) => {
    const el = document.querySelector(selector)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const points = []
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) points.push([r.left + (r.width * i) / 40, r.top + (r.height * j) / 40])
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    points.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
    for (const [x, y] of points) {
      const hit = document.elementFromPoint(x, y)
      if (hit && el.contains(hit)) {
        const ok = [[-3, 0], [3, 0], [0, -3], [0, 3]].every(([dx, dy]) => el.contains(document.elementFromPoint(x + dx, y + dy)))
        if (ok) return { x, y }
      }
    }
    return null
  }, selector)

async function tapZone(page, zone) {
  const p = await zonePoint(page, zone)
  assert.ok(p, `the pony has a tappable ${zone}`)
  await page.mouse.click(p.x, p.y)
}

const cell = (kind, id) => `.lh-cell[data-kind="${kind}"][data-id="${id}"]`
const pick = (page, kind, id) => page.click(cell(kind, id))
async function dress(page, look) {
  for (const side of SIDES) await pick(page, side, look[side])
}
const svgHas = (page, cls) => page.evaluate((cls) => !!document.querySelector(`.lh-stage .lh-stage-pony svg.${cls}`), cls)

/**
 * A tap that switches screens makes the next ~0.4 s of taps count as the second half of a double
 * tap (they are ignored), and a two-tap question ignores a confirming tap within ~0.65 s.
 * A real child is slower than Playwright; these waits stand for that.
 */
const settle = (page) => page.waitForTimeout(450)
const beforeConfirm = (page) => page.waitForTimeout(700)

/** Choose a name on the name card and go on with its golden ✓ (the card no longer moves on by itself). */
async function nameAndGo(page, nth = 0) {
  await page.click(`.lh-layer .lh-name >> nth=${nth}`)
  await page.click('.lh-layer .lh-card-name .lh-card-next:not([hidden])')
}

/** Builds a valid save with `count` finished ponies (newest first) through the real state rules. */
function herdSave(count) {
  let save = { ...ST.defaultSave(), welcomed: true }
  for (let i = 0; i < count; i++) {
    save = ST.startNew(save)
    for (const side of SIDES) {
      const list = ST.availableItems(save, side)
      save = ST.wear(save, side, list[(i * 3 + side.length) % list.length].id)
    }
    const result = ST.finish(save, 1_760_000_000_000 + i * 60_000, i + 1)
    assert.ok(result.ok, 'herd save builds')
    save = result.save
  }
  return ST.startNew(save)
}
const WELCOMED = () => ({ ...ST.defaultSave(), welcomed: true })

const MATRYONA = { mane: 'pinkFlowers', clip: 'broccoli', tail: 'striped', color: 'orange' }

/* ═════════════ catalog ═════════════ */

await section('catalog card in three languages', async (open) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } })
  open.push(context)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = watch(page)
  for (const lang of ['ru', 'de', 'en']) {
    step(`catalog ${lang}`)
    await page.goto(`${BASE}/?lang=${lang}`)
    const card = page.locator('.toy-card--loshadka')
    assert.equal(await card.count(), 1, 'one Лошадка card')
    assert.equal(await card.getAttribute('href'), './loshadka/')
    assert.equal((await card.locator('.toy-card-name').textContent()).trim(), COPY[lang].name)
    assert.equal((await card.locator('.toy-card-blurb').textContent()).trim(), `${COPY[lang].byline}. ${COPY[lang].tagline}`)
    assert.ok(await card.locator('svg.lh-horse').count(), 'pony art on the card')
    assert.ok(await card.locator('svg.lh-horse .lh-horn').count(), 'the card pony wears the horn')
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${SHOTS}/catalog-${lang}.png` })
  }
  step('the card opens the game; debug helpers only exist with ?debug=1')
  await page.click('.toy-card--loshadka')
  await page.waitForURL(/\/loshadka\/$/)
  await page.waitForSelector('.lh-stage')
  assert.equal(await page.evaluate(() => typeof window.__loshadka.state), 'function')
  assert.equal(await page.evaluate(() => typeof window.__loshadka.give), 'undefined', 'no give() without debug')
  assert.deepEqual(errors, [])
})

/* ═════════════ first visit, sketch, picks, hints, pony taps ═════════════ */

await section('first visit: welcome, sketch, hints, picks, pony taps, apple, backgrounds', async (open) => {
  const { page, errors } = await fresh(open)
  const ru = COPY.ru

  step('welcome: Matryona’s explanation in Russian')
  await page.waitForTimeout(200)
  const first = (await page.evaluate(() => window.spoken))[0]
  assert.ok(first, 'something is spoken on the first visit')
  assert.equal(first.text, voice('ru', ru.welcome))
  assert.equal(first.lang, 'ru-RU')
  assert.equal((await savedGame(page)).welcomed, true)
  assert.equal((await stored(page)).welcomed, true, 'the welcomed flag is stored')

  step('the four sides glow one after another, in the order she names them')
  await waitDom(page, () => window.glows.length >= 4, null, 'four side glows', 9000)
  const glows = await page.evaluate(() => window.glows)
  assert.deepEqual(glows.slice(0, 4).map((g) => g.side), ['mane', 'clip', 'tail', 'color'])
  for (let i = 1; i < 4; i++) {
    const gap = glows[i].t - glows[i - 1].t
    assert.ok(gap > 900 && gap < 2200, `glows follow one another (${Math.round(gap)} ms)`)
  }
  await page.waitForFunction(() => !document.querySelector('.lh-strip.is-glow'), null, { timeout: 4000 })

  step('a new pony is an uncoloured sketch with ghosts for every side')
  let s = await st(page)
  assert.deepEqual(s.look, { color: null, mane: null, tail: null, clip: null, horn: false, wings: false })
  assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'])
  assert.equal(s.complete, false)
  for (const side of ['mane', 'tail', 'clip', 'color']) assert.equal(await page.locator(`.lh-stage .lh-ghost-${side}`).count(), 1, `${side} ghost`)
  assert.ok((await page.locator('.lh-stage .lh-ghost-arrow').count()) >= 4, 'each ghost points to its side')
  assert.equal(await page.getAttribute('.lh-stage .lh-stage-pony', 'aria-label'), ru.sketchLabel)
  assert.equal(await page.locator('.lh-done.is-asleep').count(), 1, 'Готово sleeps')
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 0)
  assert.equal(await page.locator('.lh-slot').count(), 3, 'three star slots')
  assert.equal((await page.textContent('.lh-badge-n')).trim(), '0')
  assert.equal(await page.locator('.lh-cell[aria-pressed="true"]').count(), 0)

  step('strips: labels, base items with names, wrapped gifts')
  for (const side of SIDES) {
    assert.equal(await page.getAttribute(`.lh-strip-${side}`, 'aria-label'), ru.sides[side])
    assert.equal((await page.textContent(`.lh-strip-${side} .lh-tab`)).trim(), ru.sides[side])
    const ids = await page.$$eval(`[data-scroller="${side}"] .lh-cell[data-kind="${side}"]`, (cells) => cells.map((c) => [c.dataset.id, c.getAttribute('aria-label')]))
    const base = ST.availableItems(ST.defaultSave(), side)
    assert.deepEqual(ids.map(([id]) => id), base.map((item) => item.id), `${side}: the base items in file order`)
    for (const [id, label] of ids) assert.equal(label, name(side, id, 'ru'))
    const gifts = await page.locator(`[data-scroller="${side}"] .lh-cell-gift`).count()
    assert.ok(gifts >= 1 && gifts <= 2, `${side}: one or two wrapped gifts (${gifts})`)
  }
  assert.equal(await page.locator('.lh-cell-gift.is-next').count(), 1, 'exactly one next gift')
  assert.equal(await page.locator('.lh-strip-clip .lh-cell-gift.is-next[data-gift="magic:horn"]').count(), 1, 'the horn is the next gift, in the clip row')
  assert.equal(await page.locator('.lh-cell[data-kind="magic"]').count(), 0, 'no magic before it is unlocked')

  step('tapping a ghost names the missing part and makes its row glow')
  await hush(page)
  const ghost = await pointOn(page, '.lh-stage .lh-ghost-tail')
  assert.ok(ghost, 'the tail ghost can be tapped')
  await page.mouse.click(ghost.x, ghost.y)
  await expectSaid(page, 'ru', [ru.missing.tail], 'tail ghost')
  assert.equal(await page.locator('.lh-strip-tail.is-glow').count(), 1)

  step('tapping the uncoloured body points to the colours')
  await hush(page)
  await tapZone(page, 'body')
  await expectSaid(page, 'ru', [ru.missing.color], 'sketch body')
  assert.equal(await page.locator('.lh-strip-color.is-glow').count(), 1)
  await page.waitForTimeout(1800)

  step('Готово on the sketch: missing hints in order mane → clip → tail → colour, each row glows')
  const before = await audioStarts(page)
  for (const side of SIDES) {
    await hush(page)
    await page.click('.lh-done')
    await expectSaid(page, 'ru', [ru.missing[side]], `missing ${side}`)
    assert.equal(await page.locator(`.lh-strip-${side}.is-glow`).count(), 1, `${side} row glows`)
    s = await st(page)
    assert.equal(s.celebration, null)
    assert.equal(s.stars, 0)
    await hush(page)
    await pick(page, side, MATRYONA[side])
    const said = await heard(page)
    assert.equal(said[0]?.text, voice('ru', name(side, MATRYONA[side], 'ru')), `${side} pick narrates its name`)
    assert.equal(await page.getAttribute(cell(side, MATRYONA[side]), 'aria-pressed'), 'true')
    assert.equal(await page.locator(`[data-scroller="${side}"] .lh-cell[aria-pressed="true"]`).count(), 1, `${side}: single choice`)
    assert.equal(await page.locator(`.lh-stage .lh-ghost-${side}`).count(), 0, `${side} ghost gone`)
    s = await st(page)
    assert.equal(s.look[side], MATRYONA[side])
    if (side !== 'color') assert.ok(await page.locator('.lh-done.is-asleep').count(), 'Готово still asleep')
  }
  assert.ok((await audioStarts(page)) > before + 6, 'picks and nopes make sounds')

  step('the fourth side: allSet once, Готово wakes, the pony is described')
  // The last pick above was the colour; its narration was name + allSet.
  const all = (await page.evaluate(() => window.spoken)).map((u) => u.text)
  assert.deepEqual(all, [voice('ru', name('color', 'orange', 'ru')), voice('ru', ru.allSet)])
  assert.equal(await page.locator('.lh-done.is-ready').count(), 1)
  s = await st(page)
  assert.equal(s.complete, true)
  assert.deepEqual(s.missing, [])
  const label = await page.getAttribute('.lh-stage .lh-stage-pony', 'aria-label')
  assert.equal(label, ru.ponyLabel(ST.describe(s.look, 'ru')))

  step('the same item again: the pony admires it, nothing comes off, no second allSet')
  await hush(page)
  await pick(page, 'mane', 'pinkFlowers')
  await expectSaid(page, 'ru', [name('mane', 'pinkFlowers', 'ru')], 'same mane')
  assert.ok(await svgHas(page, 'is-shake-mane'), 'mane shakes')
  assert.equal((await st(page)).look.mane, 'pinkFlowers')
  await hush(page)
  await pick(page, 'color', 'orange')
  await expectSaid(page, 'ru', [name('color', 'orange', 'ru')], 'same colour')
  assert.ok(await svgHas(page, 'is-hop'), 'happy hop')

  step('another mane moves the pressed ring; allSet is not repeated')
  await hush(page)
  await pick(page, 'mane', 'sunny')
  await expectSaid(page, 'ru', [name('mane', 'sunny', 'ru')], 'switch mane')
  assert.equal(await page.getAttribute(cell('mane', 'pinkFlowers'), 'aria-pressed'), 'false')
  assert.equal(await page.getAttribute(cell('mane', 'sunny'), 'aria-pressed'), 'true')
  await hush(page)
  await pick(page, 'mane', 'pinkFlowers')
  await heard(page)

  step('a wrapped gift says it opens with a finished pony')
  for (const selector of ['.lh-cell-gift.is-next', '.lh-strip-mane .lh-cell-gift']) {
    await hush(page)
    await page.click(selector)
    await expectSaid(page, 'ru', [ru.locked], `locked ${selector}`)
  }
  s = await st(page)
  assert.deepEqual(s.unlocked, [])
  assert.equal(s.look.horn, false)

  step('the pony is alive: head, hooves, body, mane, tail, clip')
  for (const [zone, text, cls] of [
    ['head', ru.snort, 'is-snort'],
    ['hooves', ru.hooves, 'is-tapdance'],
    ['body', ru.neigh, 'is-neigh'],
    ['mane', name('mane', 'pinkFlowers', 'ru'), 'is-shake-mane'],
    ['tail', name('tail', 'striped', 'ru'), 'is-shake-tail'],
    ['clip', name('clip', 'broccoli', 'ru'), 'is-shake-clip'],
  ]) {
    await page.waitForTimeout(1100)
    await hush(page)
    const sounds = await audioStarts(page)
    await tapZone(page, zone)
    await expectSaid(page, 'ru', [text], `${zone} tap`)
    assert.ok(await svgHas(page, cls), `${zone}: ${cls}`)
    if (['mane', 'tail', 'clip'].includes(zone)) assert.equal(await page.locator(`.lh-strip-${zone}.is-glow`).count(), 1, `${zone} row glows`)
    if (zone === 'body') assert.ok(await svgHas(page, 'is-hop'), 'body tap hops')
    if (zone === 'hooves') {
      await page.waitForTimeout(900)
      assert.ok((await audioStarts(page)) >= sounds + 4, 'four clip-clops')
    }
  }

  step('the real neigh sample loads after the first tap and plays faster than a horse')
  await until(page, (s) => s.neighSample, 'neigh sample decoded', 6000)
  await page.waitForTimeout(1000)
  const buffersBefore = await page.evaluate(() => window.audio.buffers.length)
  await tapZone(page, 'body')
  await page.waitForTimeout(150)
  const neighs = (await page.evaluate(() => window.audio.buffers)).slice(buffersBefore)
  assert.ok(neighs.some((b) => b.rate >= 1.1 && b.rate <= 1.35), `a neigh sample at ×1.12–1.32: ${JSON.stringify(neighs)}`)

  step('the apple: the pony munches it, it is eaten, then grows back')
  await page.waitForTimeout(1100)
  await hush(page)
  const apple = await pointOn(page, '.lh-stage .lh-apple')
  assert.ok(apple, 'the apple can be tapped')
  const t0 = Date.now()
  await page.mouse.click(apple.x, apple.y)
  await expectSaid(page, 'ru', [ru.munch], 'apple')
  assert.ok(await svgHas(page, 'is-munch'), 'the pony lowers its head')
  await waitDom(page, () => !!document.querySelector('.lh-stage .lh-apple.is-eaten'), null, 'apple eaten', 1500)
  await page.waitForTimeout(700)
  const bite = await page.evaluate(() => {
    const head = document.querySelector('.lh-stage .lh-head').getBoundingClientRect()
    const a = document.querySelector('.lh-stage .lh-apple').getBoundingClientRect()
    const pad = 12
    return !(head.right < a.left - pad || head.left > a.right + pad || head.bottom < a.top - pad || head.top > a.bottom + pad)
  })
  assert.ok(bite, 'the lowered head reaches the apple')
  await hush(page)
  const hitDuringMunch = await page.evaluate(([x, y]) => {
    const hit = document.elementFromPoint(x, y)
    return `${hit?.closest('[data-zone]')?.getAttribute('data-zone') ?? '-'} / ${hit?.closest('[data-action]')?.getAttribute('data-action') ?? '-'}`
  }, [apple.x, apple.y])
  await page.mouse.click(apple.x, apple.y)
  const again = (await heard(page)).map((u) => u.text)
  // The lowered head lies on the apple: a tap there while it eats does nothing (no second munch, no snort).
  assert.deepEqual(again, [], `nothing while munching (hit ${hitDuringMunch}): ${JSON.stringify(again)}`)
  assert.ok(!(await svgHas(page, 'is-snort')), 'no snort during the meal')
  assert.ok(await page.locator('.lh-stage .lh-apple.is-eaten').count(), 'the apple stays eaten')
  await waitDom(page, () => !!document.querySelector('.lh-stage .lh-apple.is-growing'), null, 'apple grows back', 6000)
  const regrow = Date.now() - t0
  assert.ok(regrow > 3500 && regrow < 5600, `the apple regrows after about 4 s (${regrow} ms)`)
  await waitDom(page, () => !document.querySelector('.lh-stage .lh-apple.is-growing, .lh-stage .lh-apple.is-eaten'), null, 'apple back', 2000)

  step('background button: thumbnail of the next one, cycles and speaks the name')
  const bases = ST.availableItems(ST.defaultSave(), 'background').map((b) => b.id)
  assert.deepEqual(bases, ['hearts', 'meadow', 'sky'])
  assert.equal((await st(page)).background, 'hearts')
  assert.equal(await page.getAttribute('.lh-stage', 'data-bg'), 'hearts')
  for (const [i, id] of ['meadow', 'sky', 'hearts'].entries()) {
    assert.equal(await page.getAttribute('.lh-bgbtn', 'aria-label'), `${ru.background}: ${name('background', id, 'ru')}`)
    await hush(page)
    await page.click('.lh-bgbtn')
    await expectSaid(page, 'ru', [name('background', id, 'ru')], `background ${id}`)
    assert.equal((await st(page)).background, id)
    assert.equal(await page.getAttribute('.lh-stage', 'data-bg'), id)
    assert.equal((await savedGame(page)).background, id)
    await page.waitForTimeout(650)
    assert.equal(await page.locator('.lh-stage .lh-bg').count(), 1, `one background layer after the fade (${i})`)
  }
  assert.equal((await stored(page)).background, 'hearts')

  step('two quick taps on the background button: one layer, and it is the one in the state')
  const bgButton = await pointOn(page, '.lh-bgbtn')
  await page.mouse.click(bgButton.x, bgButton.y)
  await page.waitForTimeout(250)
  await page.mouse.click(bgButton.x, bgButton.y)
  await page.waitForTimeout(650)
  assert.equal((await st(page)).background, 'sky')
  assert.equal(await page.locator('.lh-stage > .lh-bg').count(), 1, 'the older layer is gone')
  await page.click('.lh-bgbtn')
  await page.waitForTimeout(650)
  assert.equal((await st(page)).background, 'hearts')

  step('«?» replays the welcome while the rows glow')
  await hush(page)
  await page.evaluate(() => (window.glows = []))
  await page.click('.lh-help')
  await expectSaid(page, 'ru', [ru.welcome], 'help')
  await waitDom(page, () => window.glows.length >= 2, null, 'help glows', 5000)
  assert.deepEqual((await page.evaluate(() => window.glows)).slice(0, 2).map((g) => g.side), ['mane', 'clip'])
  await page.screenshot({ path: `${SHOTS}/flow-ru-dressed.png` })
  assert.deepEqual(errors, [])
})

/* ═════════════ celebration, gifts, unchanged, edit ═════════════ */

await section('celebration: stars, +3, name, gift, polaroid; unchanged; new badge; edit', async (open) => {
  const { page, errors } = await fresh(open, { save: WELCOMED() })
  const ru = COPY.ru

  step('a later visit says welcomeBack')
  await expectSaid(page, 'ru', [ru.welcomeBack], 'welcome back', 250)
  assert.equal((await page.evaluate(() => window.glows)).length, 0, 'no glow tour on later visits')

  step('Готово on a complete pony: three stars fly one by one into the slots')
  await dress(page, MATRYONA)
  await hush(page)
  await page.evaluate(() => (window.slotFills = []))
  await page.click('.lh-done')
  let s = await st(page)
  assert.equal(s.celebration, 'stars')
  assert.equal(await page.locator('.lh-done.is-ready').count(), 0, 'Готово calms down while celebrating')
  await waitDom(page, () => document.querySelectorAll('.lh-flystar').length > 0, null, 'a flying star', 1500)
  await page.screenshot({ path: `${SHOTS}/flow-ru-stars.png` })
  await until(page, (s) => s.celebration === 'hooray', 'hooray', 4000)
  const fills = await page.evaluate(() => window.slotFills)
  assert.deepEqual(fills.map((f) => f.slot), [0, 1, 2], 'slots fill left to right')
  assert.ok(fills[2].t - fills[0].t > 600, `one after another (${Math.round(fills[2].t - fills[0].t)} ms)`)
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 3)
  assert.equal(await page.locator('.lh-flystar').count(), 0, 'flying stars are cleaned up')

  step('hooray: the pony prances, hearts fly, the star total counts +3')
  assert.ok(await svgHas(page, 'is-prance'), 'prance')
  assert.ok((await page.locator('.lh-stage .lh-confetti').count()) > 0, 'heart confetti')
  await page.waitForTimeout(250)
  assert.ok(await saidIncludes(page, 'ru', ru.hooray), 'hooray is spoken')
  await waitDom(page, () => document.querySelector('.lh-badge-n')?.textContent.trim() === '3', null, 'badge shows 3', 2500)
  s = await st(page)
  assert.equal(s.stars, 3)
  assert.equal(s.finished, 1)
  assert.equal(s.ponies.length, 1)
  assert.equal((await stored(page)).stars, 3, 'stars are stored')
  await page.screenshot({ path: `${SHOTS}/flow-ru-hooray.png` })

  step('name card: three names, the first is the pony’s, focus inside the card')
  s = await until(page, (s) => s.celebration === 'name', 'name step', 6000)
  assert.equal((await page.textContent('.lh-layer .lh-card-title')).trim(), ru.askName)
  await page.waitForTimeout(200)
  assert.ok(await saidIncludes(page, 'ru', ru.askName), 'the name question is spoken')
  const offered = await page.$$eval('.lh-layer .lh-name', (b) => b.map((x) => [Number(x.dataset.name), x.textContent.trim()]))
  assert.ok(await saidIncludes(page, 'ru', ru.nameOptions(offered.map(([, text]) => text))), 'the names are read out')
  assert.equal(await page.locator('.lh-layer .lh-card-next:not([hidden])').count(), 0, 'no ✓ before a name is chosen')
  assert.equal(offered.length, 3)
  assert.equal(new Set(offered.map(([i]) => i)).size, 3, 'three different names')
  for (const [i, text] of offered) assert.equal(text, PONY_NAMES[i].ru)
  assert.equal(s.ponies[0].nameIndex, offered[0][0], 'the pony already has the first offered name')
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('lh-name')), 'focus moves to the names')
  assert.ok(await page.locator('.lh-layer .lh-portrait svg').count(), 'the card shows the pony')

  step('the dice offers three other names and reads them out')
  await hush(page)
  await page.click('.lh-layer .lh-dice')
  const rolled = await page.$$eval('.lh-layer .lh-name', (b) => b.map((x) => Number(x.dataset.name)))
  assert.equal(rolled.length, 3)
  for (const i of rolled) assert.ok(!offered.some(([j]) => j === i), 'new names after the dice')
  await expectSaid(page, 'ru', [ru.nameOptions(rolled.map((i) => PONY_NAMES[i].ru))], 'dice')

  step('choosing a name says hello, the pony neighs after it, the card stays for more names')
  await hush(page)
  const first = rolled[0]
  await page.click(`.lh-layer .lh-name[data-name="${first}"]`)
  await expectSaid(page, 'ru', [ru.hello(PONY_NAMES[first].ru)], 'hello')
  await waitDom(page, () => !!document.querySelector('.lh-stage .lh-stage-pony svg.is-neigh'), null, 'the pony neighs back', 2500)
  await page.waitForTimeout(600)
  assert.equal((await st(page)).celebration, 'name', 'no hurry: the card waits')
  assert.equal(await page.locator('.lh-layer .lh-card-next:not([hidden])').count(), 1, 'the ✓ is out')
  await hush(page)
  const chosen = rolled[1]
  await page.click(`.lh-layer .lh-name[data-name="${chosen}"]`)
  await expectSaid(page, 'ru', [ru.hello(PONY_NAMES[chosen].ru)], 'another name')
  assert.equal(await page.getAttribute(`.lh-layer .lh-name[data-name="${chosen}"]`, 'aria-pressed'), 'true')
  assert.equal(await page.getAttribute(`.lh-layer .lh-name[data-name="${first}"]`, 'aria-pressed'), 'false')
  s = await st(page)
  assert.equal(s.ponies[0].nameIndex, chosen)
  assert.equal(s.ponies[0].name, PONY_NAMES[chosen].ru)
  assert.equal((await stored(page)).ponies[0].name, chosen, 'the name is stored')

  step('gift: a wrapped present bounces, «Подарок! Нажми на подарок!»')
  await hush(page)
  await page.click('.lh-layer .lh-card-name .lh-card-next')
  s = await until(page, (s) => s.celebration === 'gift', 'gift step', 3000)
  await expectSaid(page, 'ru', [ru.giftTitle, ru.openGift], 'gift', 250)
  assert.equal((await page.textContent('.lh-layer .lh-card-title')).trim(), ru.giftTitle)
  assert.ok(await page.locator('.lh-layer .lh-biggift .lh-sc-gift.is-wiggle').count(), 'the present wiggles')
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('lh-biggift')), 'focus on the present')
  await page.screenshot({ path: `${SHOTS}/flow-ru-gift.png` })

  step('tapping the present opens it: the horn, and where to find it')
  await hush(page)
  await page.click('.lh-layer .lh-biggift')
  await expectSaid(page, 'ru', [ru.giftOpened(name('magic', 'horn', 'ru'), 'magic')], 'gift opened')
  s = await st(page)
  assert.equal(s.celebration, 'opened')
  assert.deepEqual(s.unlocked, ['magic:horn'])
  await page.waitForSelector('.lh-layer .lh-reveal', { timeout: 2000 })
  assert.equal(await page.getAttribute('.lh-layer .lh-reveal', 'aria-label'), name('magic', 'horn', 'ru'))
  assert.ok(await page.locator('.lh-layer .lh-sc-gift.is-open').count(), 'the lid lifts')
  await page.waitForSelector('.lh-layer .lh-card-next:not([hidden])')
  await page.screenshot({ path: `${SHOTS}/flow-ru-opened.png` })

  step('polaroid: the pony with its name and three stars, three buttons')
  await page.click('.lh-layer .lh-card-next')
  s = await until(page, (s) => s.celebration === 'card', 'photo card', 2000)
  assert.equal((await page.textContent('.lh-layer .lh-photo-name')).trim(), PONY_NAMES[chosen].ru)
  assert.equal(await page.locator('.lh-layer .lh-photo-stars svg').count(), 3)
  assert.ok(await page.locator('.lh-layer .lh-photo svg.lh-horse').count(), 'the photo shows the pony')
  for (const [action, text] of [['to-stable', ru.toStable], ['new-pony', ru.newPony], ['keep', ru.keepDressing]])
    assert.equal((await page.textContent(`.lh-layer [data-action="${action}"]`)).trim(), text)
  await page.waitForTimeout(150)
  assert.ok(await saidIncludes(page, 'ru', ru.iAm(PONY_NAMES[chosen].ru)), 'the pony on the photo introduces itself')
  await page.screenshot({ path: `${SHOTS}/flow-ru-card.png` })

  step('«Ещё наряжать» closes the card; the slots stay golden')
  await page.click('.lh-layer [data-action="keep"]')
  s = await st(page)
  assert.equal(s.celebration, null)
  assert.ok(await page.locator('.lh-layer[hidden]').count(), 'layer hidden')
  assert.equal(s.done, true)
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 3)
  assert.equal(await page.locator('.lh-done.is-asleep').count(), 1)
  assert.equal(await page.getAttribute('.lh-barn', 'aria-label'), `${ru.stable}. ${ru.starsAria(3)}`)

  step('Готово on the unchanged pony: «уже готова», no stars')
  await hush(page)
  await page.click('.lh-done')
  await expectSaid(page, 'ru', [ru.unchanged], 'unchanged')
  s = await st(page)
  assert.equal(s.celebration, null)
  assert.equal(s.stars, 3)

  step('the opened horn waits at the end of the clip row with «Новое!», scrolled into view')
  const horn = cell('magic', 'horn')
  const hornShown = await page.evaluate((sel) => {
    const c = document.querySelector(sel).getBoundingClientRect()
    const r = document.querySelector('[data-scroller="clip"]').getBoundingClientRect()
    return c.left >= r.left - 1 && c.right <= r.right + 1
  }, horn)
  assert.ok(hornShown, 'the clip row shows the horn after the card')
  assert.equal(await page.locator(`.lh-strip-clip ${horn}.is-new .lh-new`).count(), 1)
  assert.equal((await page.textContent(`${horn} .lh-new`)).trim(), ru.newBadge)
  assert.equal(await page.getAttribute(horn, 'aria-label'), `${name('magic', 'horn', 'ru')}. ${ru.newBadge}`)
  assert.equal(await page.locator('.lh-cell-gift[data-gift="magic:horn"]').count(), 0, 'its wrapped box is gone')
  const lastClip = await page.$$eval('.lh-strip-clip .lh-cell', (cells) => cells.filter((c) => !c.dataset.gift).at(-1)?.dataset.id)
  assert.equal(lastClip, 'horn', 'magic sits after the clips')
  assert.equal(await page.locator('.lh-strip-mane .lh-cell-gift.is-next[data-gift="mane:rainbow"]').count(), 1, 'the rainbow mane is next')

  step('tapping the horn: badge gone, horn on, the slots empty again')
  await hush(page)
  await page.click(horn)
  await expectSaid(page, 'ru', [name('magic', 'horn', 'ru')], 'horn')
  assert.equal(await page.locator(`${horn}.is-new`).count(), 0)
  assert.equal(await page.locator(`${horn} .lh-new`).count(), 0)
  assert.equal(await page.getAttribute(horn, 'aria-pressed'), 'true')
  assert.ok(await page.locator('.lh-stage .lh-horn').count(), 'the stage pony wears the horn')
  s = await st(page)
  assert.equal(s.look.horn, true)
  assert.equal(s.done, false)
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 0)
  assert.equal(await page.locator('.lh-done.is-ready').count(), 1)
  assert.ok((await stored(page)).seen.includes('magic:horn'), 'seen is stored')

  step('re-finishing the edited pony: +3 stars, no name step and no gift (only a new pony opens one)')
  const id = s.ponies[0].id
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  await page.keyboard.press('Escape')
  s = await until(page, (s) => s.celebration === 'hooray', 'hooray')
  await waitDom(page, () => document.querySelector('.lh-badge-n')?.textContent.trim() === '6', null, 'badge shows 6', 2500)
  await page.keyboard.press('Escape')
  s = await st(page)
  assert.equal(s.celebration, 'card', 'an edited pony keeps its name and opens no gift: straight to the photo')
  await page.keyboard.press('Escape')
  s = await until(page, (s) => s.celebration === null, 'closed')
  assert.equal(s.stars, 6)
  assert.equal(s.finished, 1, 'an edit does not count as a new pony')
  assert.equal(s.ponies.length, 1)
  assert.equal(s.ponies[0].id, id, 'the same pony was updated')
  assert.equal(s.ponies[0].look.horn, true)
  assert.equal(s.ponies[0].nameIndex, chosen, 'it keeps its name')
  assert.deepEqual(s.unlocked, ['magic:horn'])
  assert.equal(await page.locator(`.lh-strip-mane ${cell('mane', 'rainbow')}`).count(), 0, 'the rainbow mane is still wrapped')

  step('magic toggles off again')
  await page.click(horn)
  assert.equal((await st(page)).look.horn, false)
  assert.equal(await page.getAttribute(horn, 'aria-pressed'), 'false')
  assert.equal(await page.locator('.lh-stage .lh-horn').count(), 0)

  step('reload keeps the pony, the stars, the seen badges and the draft')
  await page.click('.lh-bgbtn')
  await page.click(cell('tail', 'red'))
  const beforeReload = await st(page)
  await page.reload()
  await page.waitForSelector('.lh-stage')
  s = await st(page)
  assert.deepEqual(s.look, beforeReload.look)
  assert.deepEqual(s.ponies, beforeReload.ponies)
  assert.equal(s.stars, 6)
  assert.equal(s.background, 'meadow')
  assert.equal(await page.getAttribute('.lh-stage', 'data-bg'), 'meadow')
  assert.equal(await page.getAttribute(cell('tail', 'red'), 'aria-pressed'), 'true')
  assert.equal(await page.locator(`${horn}.is-new`).count(), 0, 'the horn stays seen')
  assert.equal((await page.textContent('.lh-badge-n')).trim(), '6')
  await expectSaid(page, 'ru', [ru.welcomeBack], 'welcome back after reload', 250)

  step('«Новая лошадка» asks first when the pony has unsaved changes, then starts a sketch')
  await hush(page)
  await page.click('.lh-newbtn')
  await expectSaid(page, 'ru', [ru.newConfirm], 'new confirm')
  assert.equal(await page.locator('.lh-newbtn.is-armed').count(), 1)
  assert.deepEqual((await st(page)).look, beforeReload.look, 'nothing changed yet')
  await page.waitForTimeout(4300)
  assert.equal(await page.locator('.lh-newbtn.is-armed').count(), 0, 'the question expires after 4 s')
  await hush(page)
  await page.dblclick('.lh-newbtn')
  await expectSaid(page, 'ru', [ru.newConfirm], 'a double tap only asks')
  assert.deepEqual((await st(page)).look, beforeReload.look, 'the second half of a double tap changes nothing')
  await hush(page)
  await beforeConfirm(page)
  await page.click('.lh-newbtn')
  await expectSaid(page, 'ru', [ru.newPony], 'new pony')
  s = await st(page)
  assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'])
  assert.equal(s.editing, null)
  assert.equal(await page.locator('.lh-stage .lh-ghost-mane').count(), 1)
  assert.equal(s.ponies.length, 1, 'the finished pony stays in the stable')

  step('a finished unchanged pony starts a new sketch on the first tap')
  await dress(page, { mane: 'green', clip: 'bow', tail: 'blue', color: 'pink' })
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  for (let i = 0; i < 8 && (await st(page)).celebration; i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(450)
  }
  s = await until(page, (s) => s.celebration === null && s.done, 'closed again')
  assert.equal(s.ponies.length, 2)
  assert.equal(s.stars, 9)
  await hush(page)
  await page.click('.lh-newbtn')
  await expectSaid(page, 'ru', [ru.newPony], 'no question for a finished pony')
  assert.equal((await st(page)).complete, false)

  step('a finished pony moves into the stable: back from the stable, the stage holds a new sketch')
  await dress(page, { mane: 'blue', clip: 'heart', tail: 'red', color: 'yellow' })
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  for (let i = 0; i < 8 && (await st(page)).celebration; i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(450)
  }
  s = await until(page, (s) => s.celebration === null && s.done, 'closed, golden slots')
  assert.equal(s.ponies.length, 3)
  await page.click('.lh-barn')
  await settle(page)
  await page.click('[data-action="workshop"]')
  s = await st(page)
  assert.equal(s.done, false, 'no finished pony on the stage')
  assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'], 'a new sketch')
  await settle(page)
  await dress(page, { mane: 'black', clip: 'star', tail: 'white', color: 'brown' })
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  s = await until(page, (s) => s.celebration === 'name', 'a new pony gets a name')
  assert.equal(s.ponies.length, 4, 'a fourth pony, the third one is untouched')
  assert.equal(s.ponies[1].look.color, 'yellow')
  assert.deepEqual(errors, [])
})

/* ═════════════ stable ═════════════ */

await section('stable: ponies live there, tap → iAm, edit, release with confirm, empty', async (open) => {
  const { page, errors } = await fresh(open, { save: WELCOMED() })
  const ru = COPY.ru
  await dress(page, MATRYONA)
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'name', 'name', 9000)
  const index = Number(await page.getAttribute('.lh-layer .lh-name >> nth=0', 'data-name'))
  await nameAndGo(page)
  await until(page, (s) => s.celebration === 'gift', 'gift')
  await page.click('.lh-layer .lh-biggift')
  await page.click('.lh-layer .lh-card-next:not([hidden])')
  await until(page, (s) => s.celebration === 'card', 'card')
  const ponyName = PONY_NAMES[index].ru

  step('«В конюшню» from the photo: the new pony introduces itself')
  await hush(page)
  await page.click('.lh-layer [data-action="to-stable"]')
  let s = await until(page, (s) => s.screen === 'stable' && s.selected, 'stable with the pony selected', 3000)
  const id = s.ponies[0].id
  assert.equal(s.selected, id)
  await page.waitForTimeout(250)
  assert.ok(await saidIncludes(page, 'ru', ru.iAm(ponyName)), 'iAm after arriving')
  await page.waitForSelector('.lh-bubble:not([hidden])')
  assert.equal((await page.textContent('.lh-bubble')).trim(), ponyName)

  step('stable: meadow, title, stars, gift track, the pony button')
  assert.ok(await page.locator('.lh-meadow svg').count(), 'meadow')
  assert.equal((await page.textContent('.lh-stable-title')).trim(), ru.stable)
  assert.equal((await page.textContent('.lh-chip')).trim(), '3')
  assert.equal((await page.textContent('.lh-gifttrack')).trim(), ru.nextGift)
  assert.equal(await page.locator(`.lh-pony[data-pony="${id}"]`).count(), 1)
  assert.equal(await page.getAttribute(`.lh-pony[data-pony="${id}"]`, 'aria-label'), ponyName)
  assert.equal(await page.locator('.lh-stable .lh-note:not([hidden])').count(), 0, 'no storage note')
  await page.screenshot({ path: `${SHOTS}/flow-ru-stable.png` })

  step('Escape closes the action bar; a tap on the pony: hop, neigh, bubble, iAm')
  await page.keyboard.press('Escape')
  assert.equal((await st(page)).selected, null)
  assert.ok(await page.locator('.lh-actions[hidden]').count())
  await hush(page)
  await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
  await expectSaid(page, 'ru', [ru.iAm(ponyName)], 'pony tap')
  assert.equal((await st(page)).selected, id)
  assert.ok(await page.locator(`.lh-pony[data-pony="${id}"] svg.is-hop`).count(), 'it hops')
  await page.waitForSelector('.lh-actions:not([hidden])')
  assert.equal((await page.textContent('.lh-actions [data-action="dress"]')).trim(), ru.dress)
  assert.equal((await page.textContent('.lh-actions [data-action="release"]')).trim(), ru.release)

  step('a tap on the empty meadow deselects')
  await page.mouse.click(30, (await page.viewportSize()).height - 30)
  assert.equal((await st(page)).selected, null)

  step('«Наряжать» opens it in the workshop with golden slots')
  await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
  await hush(page)
  await page.click('.lh-actions [data-action="dress"]')
  s = await st(page)
  assert.equal(s.screen, 'workshop')
  assert.equal(s.editing, id)
  assert.deepEqual(s.look, s.ponies[0].look)
  assert.equal(s.done, true)
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 3)
  for (const side of SIDES) assert.equal(await page.getAttribute(cell(side, s.look[side]), 'aria-pressed'), 'true')

  step('the barn opens the stable: «Здесь живут твои лошадки!»')
  await settle(page)
  await hush(page)
  await page.click('.lh-barn')
  s = await st(page)
  assert.equal(s.screen, 'stable')
  await expectSaid(page, 'ru', [ru.stable, ru.stableHello], 'stable hello')

  step('release asks first; the question expires after 4 s')
  await settle(page)
  await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
  await hush(page)
  await page.click('.lh-actions [data-action="release"]')
  await expectSaid(page, 'ru', [ru.releaseConfirm], 'release confirm')
  assert.equal(await page.locator('.lh-actions [data-action="release"].is-armed').count(), 1)
  assert.equal((await st(page)).ponies.length, 1)
  await page.waitForTimeout(4300)
  assert.equal(await page.locator('.lh-actions [data-action="release"].is-armed').count(), 0, 'disarmed')
  await hush(page)
  await page.dblclick('.lh-actions [data-action="release"]')
  await expectSaid(page, 'ru', [ru.releaseConfirm], 'a double tap only asks')
  assert.equal((await st(page)).ponies.length, 1, 'the second half of a double tap releases nobody')

  step('the second tap: «Пока-пока», it trots off, the stable is empty')
  await hush(page)
  await beforeConfirm(page)
  await page.click('.lh-actions [data-action="release"]')
  await expectSaid(page, 'ru', [ru.released(ponyName)], 'released')
  s = await st(page)
  assert.equal(s.ponies.length, 0)
  assert.equal(s.editing, null, 'the released pony is no longer being edited')
  assert.equal((await stored(page)).ponies.length, 0)
  assert.equal(s.stars, 3, 'stars stay')
  await waitDom(page, () => !document.querySelector('.lh-pony'), null, 'pony gone', 5000)
  await page.waitForSelector('.lh-empty:not([hidden])', { timeout: 3000 })
  assert.equal((await page.textContent('.lh-empty p')).trim(), ru.stableEmpty)
  await page.screenshot({ path: `${SHOTS}/flow-ru-stable-empty.png` })

  step('«Вернуть» calls the released pony back for a few seconds')
  assert.equal(await page.locator('.lh-undo:not([hidden])').count(), 1, 'the bring-back button is out')
  assert.equal((await page.textContent('.lh-undo')).trim(), ru.bringBack)
  await hush(page)
  await page.click('.lh-undo')
  await expectSaid(page, 'ru', [ru.isBack(ponyName)], 'it comes back')
  s = await st(page)
  assert.equal(s.ponies.length, 1)
  assert.equal(s.ponies[0].id, id)
  assert.equal(s.editing, id, 'it is the edited pony again')
  assert.equal((await stored(page)).ponies.length, 1)
  assert.equal(await page.locator('.lh-empty:not([hidden])').count(), 0, 'the stable is no longer empty')
  await waitDom(page, (id) => !!document.querySelector(`.lh-pony[data-pony="${id}"]`), id, 'back on the meadow', 3000)
  step('released again, the button goes away after a while')
  await page.waitForTimeout(1500)
  await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
  await page.click('.lh-actions [data-action="release"]')
  await beforeConfirm(page)
  await page.click('.lh-actions [data-action="release"]')
  assert.equal((await st(page)).ponies.length, 0)
  await page.waitForSelector('.lh-undo:not([hidden])')
  await page.waitForSelector('.lh-undo[hidden]', { state: 'attached', timeout: 10000 })
  await page.waitForSelector('.lh-empty:not([hidden])', { timeout: 3000 })

  step('an empty stable greets with stableEmpty; its button goes to the workshop')
  await page.click('[data-action="workshop"]')
  await settle(page)
  await hush(page)
  await page.click('.lh-barn')
  await expectSaid(page, 'ru', [ru.stable, ru.stableEmpty], 'empty hello')
  await settle(page)
  await page.click('.lh-empty [data-action="first-pony"]')
  s = await st(page)
  assert.equal(s.screen, 'workshop')

  step('a double tap on «В мастерскую» does not leave the game through the home link under it')
  await settle(page)
  await page.click('.lh-barn')
  await settle(page)
  await page.dblclick('.lh-back')
  await page.waitForTimeout(500)
  assert.ok(page.url().includes('/loshadka/'), `still in the game: ${page.url()}`)
  assert.equal((await st(page)).screen, 'workshop')

  step('«Наряжать» asks first while the workshop holds a half-made pony')
  await settle(page)
  await pick(page, 'mane', 'blue')
  await dress(page, MATRYONA)
  await page.click('.lh-done')
  for (let i = 0; i < 8 && (await st(page)).celebration; i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(450)
  }
  await page.click('.lh-newbtn')
  await pick(page, 'tail', 'green')
  const halfMade = (await st(page)).look
  await page.click('.lh-barn')
  await settle(page)
  const other = (await st(page)).ponies[0].id
  await page.click(`.lh-pony[data-pony="${other}"]`, { force: true })
  await hush(page)
  await page.dblclick('.lh-actions [data-action="dress"]')
  await expectSaid(page, 'ru', [ru.dressConfirm], 'dress confirm')
  s = await st(page)
  assert.equal(s.screen, 'stable', 'not yet')
  assert.deepEqual(s.look, halfMade, 'the half-made pony is still there')
  await beforeConfirm(page)
  await page.click('.lh-actions [data-action="dress"]')
  s = await st(page)
  assert.equal(s.screen, 'workshop')
  assert.equal(s.editing, other)
  assert.deepEqual(errors, [])
})

/* ═════════════ narrated picks in three languages ═════════════ */

const PICKS = {
  ru: { mane: 'pinkFlowers', clip: 'broccoli', tail: 'striped', color: 'orange' },
  de: { mane: 'sunny', clip: 'strawberry', tail: 'black', color: 'pink' },
  en: { mane: 'blue', clip: 'blueberry', tail: 'pinkBraid', color: 'lilac' },
}
for (const lang of ['ru', 'de', 'en']) {
  await section(`picks from all four sides are narrated in ${lang}`, async (open) => {
    const { page, errors } = await fresh(open, { lang, save: WELCOMED() })
    const c = COPY[lang]
    step(`${lang}: page language and labels`)
    assert.equal(await page.getAttribute('html', 'lang'), lang)
    assert.equal(await page.title(), c.documentTitle)
    assert.equal(await page.inputValue('.lh-lang-select'), lang)
    assert.equal((await page.textContent('.lh-done-label')).trim(), c.done)
    assert.equal(await page.getAttribute('.lh-home', 'aria-label'), c.home)
    assert.equal(await page.getAttribute('.lh-sound', 'aria-label'), c.soundOn)
    assert.equal(await page.getAttribute('.lh-help', 'aria-label'), c.help)
    await expectSaid(page, lang, [c.welcomeBack], 'welcome back', 250)
    for (const side of SIDES) {
      step(`${lang}: ${side}`)
      await hush(page)
      await pick(page, side, PICKS[lang][side])
      const expected = [name(side, PICKS[lang][side], lang)]
      if (side === 'color') expected.push(c.allSet)
      await expectSaid(page, lang, expected, `${lang} ${side}`)
      assert.equal(await page.getAttribute(cell(side, PICKS[lang][side]), 'aria-label'), name(side, PICKS[lang][side], lang))
    }
    step(`${lang}: Готово, hooray, name question`)
    await hush(page)
    await page.click('.lh-done')
    await until(page, (s) => s.celebration === 'name', 'name', 9000)
    await page.waitForTimeout(200)
    const said = (await page.evaluate(() => window.spoken)).map((u) => u.text)
    const names = await page.$$eval('.lh-layer .lh-name', (b) => b.map((x) => [Number(x.dataset.name), x.textContent.trim()]))
    assert.deepEqual(said, [voice(lang, c.done), voice(lang, c.hooray), voice(lang, c.askName), voice(lang, c.nameOptions(names.map(([, text]) => text)))])
    for (const [i, text] of names) assert.equal(text, PONY_NAMES[i][lang])
    assert.equal((await page.textContent('.lh-layer .lh-card-title')).trim(), c.askName)
    if (lang !== 'ru') assert.deepEqual(await cyrillicLeft(page), [], `no Russian on the ${lang} name card`)
    step(`${lang}: hello, gift, photo, «${c.newPony}»`)
    await hush(page)
    await page.click('.lh-layer .lh-name >> nth=0')
    await expectSaid(page, lang, [c.hello(names[0][1])], `${lang} hello`)
    await page.click('.lh-layer .lh-card-name .lh-card-next:not([hidden])')
    await until(page, (s) => s.celebration === 'gift', 'gift')
    await page.waitForTimeout(200)
    assert.ok(await saidIncludes(page, lang, c.openGift))
    await hush(page)
    await page.click('.lh-layer .lh-biggift')
    await expectSaid(page, lang, [c.giftOpened(name('magic', 'horn', lang), 'magic')], `${lang} gift opened`)
    await page.click('.lh-layer .lh-card-next:not([hidden])')
    await until(page, (s) => s.celebration === 'card', 'card')
    assert.equal((await page.textContent('.lh-layer .lh-photo-name')).trim(), names[0][1])
    if (lang !== 'ru') assert.deepEqual(await cyrillicLeft(page), [], `no Russian on the ${lang} photo`)
    await hush(page)
    await page.click('.lh-layer [data-action="new-pony"]')
    await expectSaid(page, lang, [c.newPony], `${lang} new pony`)
    const s = await st(page)
    assert.equal(s.celebration, null)
    assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'], 'a fresh sketch')
    assert.equal(s.ponies.length, 1)
    assert.equal(await page.getAttribute('.lh-stage .lh-stage-pony', 'aria-label'), c.sketchLabel)
    if (lang !== 'ru') {
      assert.deepEqual(await cyrillicLeft(page), [], `no Russian on the ${lang} workshop`)
      await page.click('.lh-barn')
      assert.deepEqual(await cyrillicLeft(page), [], `no Russian in the ${lang} stable`)
      // the two-tap questions and the bring-back button speak this language too
      await settle(page)
      await page.click(`.lh-pony[data-pony="${s.ponies[0].id}"]`, { force: true })
      await page.click('.lh-actions [data-action="release"]')
      await beforeConfirm(page)
      await page.click('.lh-actions [data-action="release"]')
      await page.waitForSelector('.lh-undo:not([hidden])')
      assert.equal((await page.textContent('.lh-undo')).trim(), c.bringBack)
      assert.deepEqual(await cyrillicLeft(page), [], `no Russian on the ${lang} bring-back button`)
    }
    assert.deepEqual(errors, [])
  })
}

/* ═════════════ language switch mid-play ═════════════ */

await section('language switch mid-play re-renders everything and cancels old speech', async (open) => {
  const { page, errors } = await fresh(open, { save: WELCOMED() })
  await pick(page, 'mane', 'green')

  step('the mane row is scrolled; a pick is pending when the language changes')
  await page.evaluate(() => (document.querySelector('[data-scroller="mane"]').scrollTop = 160))
  await page.waitForTimeout(400)
  const scrolled = await page.evaluate(() => document.querySelector('[data-scroller="mane"]').scrollTop)
  assert.ok(scrolled > 40, `the mane row scrolls (${scrolled})`)
  await hush(page)
  const cancelled = await cancels(page)
  await page.evaluate(() => {
    document.querySelector('.lh-cell[data-kind="color"][data-id="blue"]').click()
    const select = document.querySelector('.lh-lang-select')
    select.value = 'de'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const said = await heard(page, 300)
  assert.deepEqual(said.map((u) => [u.text, u.lang]), [[LANG_NAME.de, 'de-DE']], 'only the language name, the Russian colour is cancelled')
  assert.ok((await cancels(page)) > cancelled, 'speechSynthesis.cancel() was called')

  step('German everywhere: document, rows, cells, corners, stage, pony')
  const de = COPY.de
  let s = await st(page)
  assert.equal(s.lang, 'de')
  assert.equal(await page.getAttribute('html', 'lang'), 'de')
  assert.equal(await page.title(), de.documentTitle)
  assert.equal(await page.getAttribute('meta[name="description"]', 'content'), de.description)
  assert.equal(await page.evaluate(() => localStorage.getItem('spielzeuge.lang')), 'de')
  for (const side of SIDES) {
    assert.equal(await page.getAttribute(`.lh-strip-${side}`, 'aria-label'), de.sides[side])
    assert.equal((await page.textContent(`.lh-strip-${side} .lh-tab`)).trim(), de.sides[side])
  }
  for (const [kind, id] of [['mane', 'green'], ['clip', 'bow'], ['tail', 'white'], ['color', 'blue']])
    assert.equal(await page.getAttribute(cell(kind, id), 'aria-label'), name(kind, id, 'de'))
  assert.equal(await page.getAttribute('.lh-cell-gift >> nth=0', 'aria-label'), de.gift)
  assert.equal((await page.textContent('.lh-done-label')).trim(), de.done)
  assert.equal(await page.getAttribute('.lh-home', 'aria-label'), de.home)
  assert.equal(await page.getAttribute('.lh-sound', 'aria-label'), de.soundOn)
  assert.equal(await page.getAttribute('.lh-lang-select', 'aria-label'), de.language)
  assert.equal(await page.getAttribute('.lh-help', 'aria-label'), de.help)
  assert.equal(await page.getAttribute('.lh-newbtn', 'aria-label'), de.newPony)
  assert.equal(await page.getAttribute('.lh-bgbtn', 'aria-label'), `${de.background}: ${name('background', 'meadow', 'de')}`)
  assert.equal(await page.getAttribute('.lh-barn', 'aria-label'), `${de.stable}. ${de.starsAria(0)}`)
  assert.equal(await page.getAttribute('.lh-stage .lh-mound', 'aria-label'), de.munch)
  assert.equal(await page.getAttribute('.lh-stage .lh-stage-pony', 'aria-label'), de.ponyLabel(ST.describe(s.look, 'de')))
  assert.equal(await page.getAttribute('.lh-slots', 'aria-label'), de.stars(0))
  const kept = await page.evaluate(() => document.querySelector('[data-scroller="mane"]').scrollTop)
  assert.ok(Math.abs(kept - scrolled) <= 2, `the mane row keeps its scroll (${scrolled} → ${kept})`)
  assert.equal(await page.getAttribute(cell('mane', 'green'), 'aria-pressed'), 'true', 'the pressed ring survives')
  assert.deepEqual(await cyrillicLeft(page), [], 'no Russian left on the German workshop')

  step('picks now speak German')
  await hush(page)
  await pick(page, 'tail', 'red')
  await expectSaid(page, 'de', [name('tail', 'red', 'de')], 'German pick')

  step('a delayed line uses the language chosen meanwhile (hooray in English)')
  await pick(page, 'clip', 'heart')
  await pick(page, 'color', 'yellow')
  await hush(page)
  await page.click('.lh-done')
  await page.waitForTimeout(250)
  await page.selectOption('.lh-lang-select', 'en')
  await until(page, (s) => s.celebration === 'hooray', 'hooray', 4000)
  await page.waitForTimeout(250)
  const texts = (await page.evaluate(() => window.spoken)).map((u) => `${u.lang}:${u.text}`)
  assert.ok(texts.includes(`en-GB:${voice('en', COPY.en.hooray)}`), `hooray in English: ${JSON.stringify(texts)}`)
  assert.ok(!texts.some((t) => t.includes(COPY.de.hooray)), 'no German hooray')
  assert.equal((await page.textContent('.lh-done-label')).trim(), COPY.en.done)

  step('an open card re-renders in the new language')
  await until(page, (s) => s.celebration === 'name', 'name', 7000)
  assert.equal((await page.textContent('.lh-layer .lh-card-title')).trim(), COPY.en.askName)
  assert.deepEqual(await cyrillicLeft(page), [], 'no Russian on the English name card')
  await page.selectOption('.lh-lang-select', 'ru')
  assert.equal((await page.textContent('.lh-layer .lh-card-title')).trim(), COPY.ru.askName)
  const names = await page.$$eval('.lh-layer .lh-name', (b) => b.map((x) => [Number(x.dataset.name), x.textContent.trim()]))
  for (const [i, text] of names) assert.equal(text, PONY_NAMES[i].ru)
  assert.equal(await page.getAttribute('.lh-layer .lh-card-photo, .lh-layer .lh-card-name', 'aria-labelledby'), 'lh-card-title')

  step('the stable re-renders too')
  for (let i = 0; i < 6 && (await st(page)).celebration; i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(450)
  }
  await page.click('.lh-barn')
  await settle(page)
  await page.selectOption('.lh-lang-select', 'en')
  const en = COPY.en
  assert.equal((await page.textContent('.lh-stable-title')).trim(), en.stable)
  assert.equal((await page.textContent('.lh-back span')).trim(), en.toWorkshop)
  assert.equal((await page.textContent('.lh-gifttrack')).trim(), en.nextGift)
  assert.equal((await page.textContent('.lh-privacy')).trim(), en.privacy)
  s = await st(page)
  assert.equal(await page.getAttribute(`.lh-pony[data-pony="${s.ponies[0].id}"]`, 'aria-label'), PONY_NAMES[s.ponies[0].nameIndex].en)
  await hush(page)
  await page.click(`.lh-pony[data-pony="${s.ponies[0].id}"]`, { force: true })
  await expectSaid(page, 'en', [en.iAm(PONY_NAMES[s.ponies[0].nameIndex].en)], 'English iAm')
  assert.equal((await page.textContent('.lh-actions [data-action="dress"]')).trim(), en.dress)
  assert.deepEqual(await cyrillicLeft(page), [], 'no Russian left in the English stable')

  step('the language is remembered; ?lang= overrides it')
  await page.reload()
  await page.waitForSelector('.lh-stage')
  assert.equal((await st(page)).lang, 'en')
  await page.goto(`${GAME}?lang=de`)
  await page.waitForSelector('.lh-stage')
  assert.equal((await st(page)).lang, 'de')
  assert.equal((await page.textContent('.lh-done-label')).trim(), COPY.de.done)
  await expectSaid(page, 'de', [COPY.de.welcomeBack], '?lang=de greeting', 250)
  assert.deepEqual(errors, [])
})

/* ═════════════ mute ═════════════ */

await section('mute silences speech and effects, stops pending audio and persists', async (open) => {
  const { page, errors } = await fresh(open)
  const ru = COPY.ru
  await page.waitForTimeout(300)
  await pick(page, 'mane', 'green')
  await page.waitForTimeout(300)
  assert.ok((await audioStarts(page)) > 0, 'effects play while the sound is on')

  step('muting during the clip-clop dance stops the hoof beats still to come')
  await tapZone(page, 'body')
  await page.waitForTimeout(1200)
  await tapZone(page, 'hooves')
  await page.click('.lh-sound')
  const afterMute = await audioStarts(page)
  await page.waitForTimeout(1000)
  assert.equal((await audioStarts(page)) - afterMute, 0, 'no hoof beats after muting')
  await page.click('.lh-sound')
  await page.waitForTimeout(300)

  step('muting right after a tap drops the pending name and stops speech')
  await hush(page)
  const cancelled = await cancels(page)
  await page.evaluate(() => {
    document.querySelector('.lh-cell[data-kind="tail"][data-id="blue"]').click()
    document.querySelector('.lh-sound').click()
  })
  assert.equal((await heard(page, 300)).length, 0, 'nothing spoken')
  assert.ok((await cancels(page)) > cancelled, 'speechSynthesis.cancel()')
  assert.equal(await page.getAttribute('.lh-sound', 'aria-pressed'), 'false')
  assert.equal(await page.getAttribute('.lh-sound', 'aria-label'), ru.soundOff)
  assert.equal((await stored(page)).sound, false)
  assert.equal((await st(page)).sound, false)

  step('muted: picks, pony taps, the apple and a whole celebration stay silent')
  await page.waitForTimeout(400)
  const quiet = await audioStarts(page)
  await pick(page, 'clip', 'star')
  assert.equal(await page.locator('.lh-sound.is-shake').count(), 1, 'a tap that would speak wiggles the muted sound button')
  await tapZone(page, 'head')
  await page.waitForTimeout(800)
  await pick(page, 'color', 'white')
  await page.waitForTimeout(800)
  await tapZone(page, 'hooves')
  await page.waitForTimeout(1100)
  await page.click('.lh-cell-gift.is-next')
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'name', 'name', 7000)
  await nameAndGo(page)
  await until(page, (s) => s.celebration === 'gift', 'gift')
  await page.click('.lh-layer .lh-biggift')
  await page.waitForTimeout(600)
  assert.equal((await page.evaluate(() => window.spoken)).length, 0, 'no speech while muted')
  assert.equal((await audioStarts(page)) - quiet, 0, 'no effects while muted')
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 3, 'the game goes on without sound')

  step('mute survives a reload: no greeting, no effects')
  await page.reload()
  await page.waitForSelector('.lh-stage')
  await page.waitForTimeout(300)
  assert.equal(await page.getAttribute('.lh-sound', 'aria-pressed'), 'false')
  await pick(page, 'mane', 'black')
  await tapZone(page, 'body')
  await page.waitForTimeout(400)
  assert.equal((await page.evaluate(() => window.spoken)).length, 0)
  assert.equal(await audioStarts(page), 0)

  step('unmuting says so and plays again')
  await page.click('.lh-sound')
  await expectSaid(page, 'ru', [ru.soundOn], 'sound on')
  assert.ok((await audioStarts(page)) > 0, 'a tick plays')
  assert.equal(await page.getAttribute('.lh-sound', 'aria-pressed'), 'true')
  assert.equal((await stored(page)).sound, true)
  assert.deepEqual(errors, [])
})

/* ═════════════ storage ═════════════ */

for (const block of ['getter', 'writes']) {
  await section(`storage blocked (${block === 'getter' ? 'localStorage throws' : 'every write throws'}): still playable`, async (open) => {
    const { page, errors } = await fresh(open, { block })
    const ru = COPY.ru
    step('loads, greets and shows the quiet note')
    await page.waitForTimeout(250)
    assert.ok(await saidIncludes(page, 'ru', ru.welcome), 'welcome')
    let s = await st(page)
    assert.equal(s.persistent, false)
    await page.waitForSelector('.lh-stage .lh-note:not([hidden])')
    assert.equal((await page.textContent('.lh-stage .lh-note')).trim(), ru.noStorage)
    step('a whole pony: picks, Готово, stars, name, gift, stable')
    await dress(page, MATRYONA)
    await page.click('.lh-done')
    await until(page, (s) => s.celebration === 'name', 'name', 9000)
    await nameAndGo(page)
    await until(page, (s) => s.celebration === 'gift', 'gift')
    await page.click('.lh-layer .lh-biggift')
    await page.click('.lh-layer .lh-card-next:not([hidden])')
    await page.click('.lh-layer [data-action="to-stable"]')
    s = await until(page, (s) => s.screen === 'stable', 'stable')
    assert.equal(s.stars, 3)
    assert.equal(s.ponies.length, 1)
    assert.equal(await page.locator('.lh-pony').count(), 1)
    assert.ok(await page.locator('.lh-stable .lh-note:not([hidden])').count(), 'the stable shows the note too')
    step('language and mute still work')
    await page.selectOption('.lh-lang-select', 'en')
    assert.equal((await st(page)).lang, 'en')
    assert.equal((await page.textContent('.lh-stable .lh-note')).trim(), COPY.en.noStorage)
    await page.click('.lh-sound')
    assert.equal((await st(page)).sound, false)
    assert.deepEqual(errors, [])
  })
}

await section('broken saves fall back to defaults', async (open) => {
  for (const [label, raw] of [['garbage', '{not json'], ['wrong shape', JSON.stringify({ v: 1, stars: 'many', ponies: [{ id: 3 }], draft: 7 })], ['unknown ids', JSON.stringify({ ...ST.defaultSave(), draft: { look: { mane: 'nope', clip: 'nada', tail: null, color: 'plaid', horn: 'yes', wings: false }, editing: 'ghost', doneKey: 'x' } })]]) {
    step(label)
    const { page, errors } = await fresh(open, { save: raw })
    const s = await st(page)
    assert.deepEqual(s.ponies, [])
    assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'])
    await dress(page, MATRYONA)
    assert.equal((await st(page)).complete, true)
    assert.deepEqual(errors, [])
  }
})

/* ═════════════ full stable ═════════════ */

await section('a full stable: 30 ponies wander; a new pony gets no stars; editing still works', async (open) => {
  const { page, errors } = await fresh(open, { save: herdSave(30) })
  const ru = COPY.ru
  let s = await st(page)
  assert.equal(s.ponies.length, 30)
  assert.equal(s.stars, 90)
  assert.equal(s.unlocked.length, GIFTS.length, 'every gift is open')
  assert.equal(await page.locator('.lh-cell-gift').count(), 0, 'no wrapped gifts are left')

  step('every opened gift waits with «Новое!» until it is tapped once')
  const giftCells = GIFTS.filter((g) => g.kind !== 'background')
  for (const g of giftCells) {
    const worn = SIDES.includes(g.kind) && s.look[g.kind] === g.id
    if (!worn) assert.equal(await page.locator(`${cell(g.kind, g.id)}.is-new .lh-new`).count(), 1, `${g.kind}:${g.id} is new`)
  }
  assert.equal(await page.locator('.lh-cell.is-new').count(), giftCells.length)
  for (const side of SIDES) {
    const order = await page.$$eval(`[data-scroller="${side}"] .lh-cell[data-kind="${side}"]`, (cells) => cells.map((c) => c.dataset.id))
    const expected = ST.availableItems(ST.restoreSave(ST.serialize(herdSave(30))), side).map((i) => i.id)
    assert.deepEqual(order, expected, `${side}: base items, then gifts in gift order`)
  }
  assert.deepEqual(await page.$$eval('.lh-strip-clip .lh-cell[data-kind="magic"]', (c) => c.map((x) => x.dataset.id)), ['horn', 'wings'], 'horn and wings end the clip row')

  step('wings and horn toggle independently of the clip; their zones react')
  await hush(page)
  await pick(page, 'magic', 'wings')
  await expectSaid(page, 'ru', [name('magic', 'wings', 'ru')], 'wings on')
  assert.ok(await svgHas(page, 'is-flap'), 'the wings flap')
  assert.ok(await page.locator('.lh-stage .lh-wing-near').count())
  await pick(page, 'magic', 'horn')
  s = await st(page)
  assert.equal(s.look.wings && s.look.horn, true)
  assert.equal(await page.locator(`${cell('magic', 'wings')}.is-new`).count(), 0, 'badge gone after one tap')
  await page.waitForTimeout(1400)
  await hush(page)
  await tapZone(page, 'wings')
  await expectSaid(page, 'ru', [name('magic', 'wings', 'ru')], 'wings tap')
  assert.ok(await svgHas(page, 'is-flap'))
  await page.waitForTimeout(1400)
  await hush(page)
  await tapZone(page, 'horn')
  await expectSaid(page, 'ru', [name('magic', 'horn', 'ru')], 'horn tap')
  await pick(page, 'clip', 'crown')
  s = await st(page)
  assert.equal(s.look.clip, 'crown')
  assert.equal(s.look.horn && s.look.wings, true, 'a clip does not remove magic')

  step('the background button cycles through all seven backgrounds, the newly opened ones first')
  const backgrounds = ST.availableItems(ST.restoreSave(ST.serialize(herdSave(30))), 'background').map((b) => b.id)
  assert.equal(backgrounds.length, 7)
  // never seen yet: night, rainbow, castle and sea come first (each with «Новое!»), then the round
  let model = ST.restoreSave(ST.serialize(herdSave(30)))
  const expectedOrder = []
  for (let i = 0; i < backgrounds.length; i++) {
    const next = ST.nextBackground(model)
    expectedOrder.push(next.id)
    model = ST.markSeen(ST.wear(model, 'background', next.id), 'background', next.id)
  }
  assert.deepEqual(expectedOrder, ['night', 'rainbow', 'castle', 'sea', 'hearts', 'meadow', 'sky'])
  for (const id of expectedOrder) {
    const fresh = !findItem('background', id).base && !['hearts', 'meadow', 'sky'].includes(id)
    assert.equal(await page.locator('.lh-bgbtn.is-new .lh-new').count(), fresh ? 1 : 0, `«Новое!» on the button for ${id}`)
    await hush(page)
    await page.click('.lh-bgbtn')
    await expectSaid(page, 'ru', [name('background', id, 'ru')], `background ${id}`)
    assert.equal(await page.getAttribute('.lh-stage', 'data-bg'), id)
    if (id === 'night') await page.screenshot({ path: `${SHOTS}/background-night.png` })
  }
  await page.waitForTimeout(600)

  step('the stable holds all 30 and they move')
  await page.click('.lh-barn')
  assert.equal(await page.locator('.lh-pony').count(), 30)
  assert.equal((await page.textContent('.lh-gifttrack')).trim(), ru.allGifts)
  await page.waitForTimeout(800)
  const at = () => page.$$eval('.lh-pony', (els) => els.map((el) => el.style.transform))
  const a = await at()
  await page.waitForTimeout(3500)
  const b = await at()
  assert.ok(a.some((t, i) => t !== b[i]), 'some ponies walk')
  await page.screenshot({ path: `${SHOTS}/stable-herd-30.png` })

  step('a new pony while the stable is full: no stars, stableFull, a way to the stable')
  await page.click('[data-action="workshop"]')
  await settle(page)
  await dress(page, { mane: 'fire', clip: 'shell', tail: 'starry', color: 'rainbow' })
  await hush(page)
  await page.click('.lh-done')
  await expectSaid(page, 'ru', [ru.stableFull], 'stable full')
  s = await st(page)
  assert.equal(s.celebration, 'full')
  assert.equal(s.stars, 90)
  assert.equal(s.ponies.length, 30)
  await page.waitForSelector('.lh-layer .lh-card-full [data-action="to-stable"]')
  assert.equal((await page.textContent('.lh-layer .lh-card-text')).trim(), ru.stableFull)
  await page.screenshot({ path: `${SHOTS}/full-card.png` })
  await page.keyboard.press('Escape')
  assert.equal((await st(page)).celebration, null)

  step('editing a stable pony still earns stars (after the question about the unfinished pony)')
  await page.click('.lh-barn')
  await settle(page)
  const id = s.ponies[5].id
  await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
  await hush(page)
  await page.click('.lh-actions [data-action="dress"]')
  await expectSaid(page, 'ru', [ru.dressConfirm], 'the full stable leaves an unfinished pony in the workshop')
  await beforeConfirm(page)
  await page.click('.lh-actions [data-action="dress"]')
  s = await st(page)
  assert.equal(s.editing, id)
  await settle(page)
  const other = s.look.color === 'golden' ? 'pinto' : 'golden'
  await pick(page, 'color', other)
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'hooray', 'hooray', 4000)
  await waitDom(page, () => document.querySelector('.lh-badge-n')?.textContent.trim() === '93', null, 'badge 93', 2500)
  await page.keyboard.press('Escape')
  s = await st(page)
  assert.equal(s.celebration, 'card', 'an edited pony with every gift open goes straight to the photo')
  assert.equal(s.stars, 93)
  assert.equal(s.ponies.find((p) => p.id === id).look.color, other)
  assert.deepEqual(errors, [])
})

/* ═════════════ lifecycle ═════════════ */

await section('pagehide tears everything down; pageshow from BFCache starts fresh; hidden silences', async (open) => {
  const { page, errors } = await fresh(open, { save: WELCOMED() })
  const ru = COPY.ru

  step('visibilitychange hidden silences pending speech and blocks new sounds')
  await pick(page, 'mane', 'green')
  await page.waitForTimeout(300)
  await hush(page)
  let cancelled = await cancels(page)
  await page.evaluate(() => {
    document.querySelector('.lh-cell[data-kind="tail"][data-id="green"]').click()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal((await heard(page, 300)).length, 0, 'the pending name is dropped')
  assert.ok((await cancels(page)) > cancelled)
  let starts = await audioStarts(page)
  await page.evaluate(() => document.querySelector('.lh-cell[data-kind="clip"][data-id="bow"]').click())
  await page.waitForTimeout(300)
  assert.equal((await page.evaluate(() => window.spoken)).length, 0, 'no speech while hidden')
  assert.equal((await audioStarts(page)) - starts, 0, 'no effects while hidden')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await hush(page)
  await pick(page, 'clip', 'daisy')
  await expectSaid(page, 'ru', [name('clip', 'daisy', 'ru')], 'speech back when visible')

  step('pagehide during the stars: speech cancelled, audio closed, no more steps')
  await pick(page, 'color', 'brown')
  await page.waitForTimeout(200)
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  await hush(page)
  cancelled = await cancels(page)
  const closes = await page.evaluate(() => window.audio.closes)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  starts = await audioStarts(page)
  assert.ok((await cancels(page)) > cancelled, 'speech cancelled')
  assert.ok((await page.evaluate(() => window.audio.closes)) > closes, 'the AudioContext is closed')
  await page.waitForTimeout(3500)
  let s = await st(page)
  assert.equal(s.celebration, 'stars', 'no timer moved the celebration on')
  assert.equal((await page.evaluate(() => window.spoken)).length, 0, 'no hooray after pagehide')
  assert.equal((await audioStarts(page)) - starts, 0, 'no chimes after pagehide')
  assert.equal(await page.locator('.lh-flystar').count(), 0, 'flying stars removed')

  step('pageshow (persisted): a fresh workshop sitting, sound and speech work again')
  const contexts = await page.evaluate(() => window.audio.contexts)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  s = await st(page)
  assert.equal(s.screen, 'workshop')
  assert.equal(s.celebration, null)
  assert.ok(await page.locator('.lh-layer[hidden]').count())
  assert.equal(s.stars, 3, 'the finished pony counted')
  assert.equal(s.ponies.length, 1, 'and it lives in the stable')
  assert.deepEqual(s.missing, ['mane', 'clip', 'tail', 'color'], 'the stage holds a new sketch')
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 0)

  step('pageshow reads the stored game again: progress saved meanwhile by another page is kept')
  const elsewhere = { ...(await stored(page)), stars: 42 }
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(elsewhere)])
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  assert.equal((await st(page)).stars, 42, 'the newer save is read')
  assert.equal((await page.textContent('.lh-badge-n')).trim(), '42')
  await pick(page, 'clip', 'bow')
  assert.equal((await stored(page)).stars, 42, 'and not overwritten by the old one')
  await hush(page)
  await pick(page, 'mane', 'blue')
  await expectSaid(page, 'ru', [name('mane', 'blue', 'ru')], 'speech after restore')
  await page.waitForTimeout(200)
  assert.ok((await page.evaluate(() => window.audio.contexts)) > contexts, 'a new AudioContext')
  assert.ok((await audioStarts(page)) > starts, 'effects after restore')

  step('pagehide on the stable stops the meadow animation')
  await page.click('.lh-barn')
  await page.waitForTimeout(400)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  const frozen = await page.$$eval('.lh-pony', (els) => els.map((el) => el.style.transform))
  await page.waitForTimeout(1500)
  assert.deepEqual(await page.$$eval('.lh-pony', (els) => els.map((el) => el.style.transform)), frozen, 'nothing moves after pagehide')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  assert.equal((await st(page)).screen, 'workshop', 'BFCache restore lands on the workshop')

  step('the home link leaves through teardown and the catalog is there')
  await pick(page, 'tail', 'orange')
  await page.waitForTimeout(200)
  const before = await page.evaluate(() => ({ closes: window.audio.closes, cancels: window.speech.cancels }))
  assert.equal(await page.getAttribute('.lh-home', 'href'), '/')
  await page.evaluate(() =>
    window.addEventListener('pagehide', () => sessionStorage.setItem('spec.left', JSON.stringify({ closes: window.audio.closes, cancels: window.speech.cancels }))),
  )
  await page.click('.lh-home')
  await page.waitForSelector('.toy-card--loshadka')
  const left = JSON.parse(await page.evaluate(() => sessionStorage.getItem('spec.left')))
  assert.ok(left.closes > before.closes, 'leaving closes the AudioContext')
  assert.ok(left.cancels > before.cancels, 'leaving cancels speech')
  await page.goBack()
  await page.waitForSelector('.lh-stage')
  assert.equal((await st(page)).stars, 42)
  assert.deepEqual(errors, [])
})

await section('real back/forward cache restore (Chrome with BFCache enabled)', async (open) => {
  const bfBrowser = await chromium.launch(launchOptions({ ignoreDefaultArgs: ['--disable-back-forward-cache'] }))
  try {
    const { page, errors } = await fresh(open, { save: WELCOMED(), on: bfBrowser })
    step('leave for the catalog and come back')
    await pick(page, 'mane', 'green')
    await page.waitForTimeout(300)
    await page.evaluate(() => (window.marker = 'kept'))
    await page.goto(`${BASE}/`)
    await page.waitForSelector('.toy-card--loshadka')
    // a BFCache restore fires no load event
    await page.goBack({ waitUntil: 'commit' })
    await page.waitForSelector('.lh-stage')
    await page.waitForTimeout(300)
    const restored = await page.evaluate(() => window.marker === 'kept' && window.pageshows.includes(true))
    if (!restored) {
      console.log('    (this Chrome did not restore the page from BFCache; the simulated events above cover it)')
      return
    }
    step('restored from BFCache: workshop, speech and sound work')
    const s = await st(page)
    assert.equal(s.screen, 'workshop')
    assert.equal(s.look.mane, 'green')
    await hush(page)
    const starts = await audioStarts(page)
    await pick(page, 'tail', 'red')
    await expectSaid(page, 'ru', [name('tail', 'red', 'ru')], 'speech after BFCache')
    await page.waitForTimeout(200)
    assert.ok((await audioStarts(page)) > starts, 'effects after BFCache')
    assert.deepEqual(errors, [])
  } finally {
    await bfBrowser.close()
  }
})

/* ═════════════ keyboard ═════════════ */

await section('keyboard: every control is reachable, rings are visible, Enter/Space/Escape work', async (open) => {
  const { page, errors } = await fresh(open, { save: WELCOMED() })
  const ru = COPY.ru

  step('Tab reaches every cell and every control, each with a visible focus ring')
  const seen = new Map()
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const key = el.matches('.lh-cell') ? `cell:${el.dataset.kind ?? 'gift'}:${el.dataset.id ?? el.dataset.gift}` : el.className.baseVal ?? el.className
      const css = getComputedStyle(el)
      const ring = css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) >= 2
      let inStrip = true
      const sc = el.closest('.lh-scroller')
      if (sc) {
        const a = sc.getBoundingClientRect()
        const b = el.getBoundingClientRect()
          inStrip = b.left >= a.left - 2 && b.right <= a.right + 2 && b.top >= a.top - 2 && b.bottom <= a.bottom + 2
      }
      return { key: String(key), ring, inStrip }
    })
    if (info && !seen.has(info.key)) seen.set(info.key, info)
  }
  const expected = await page.$$eval('.lh-cell', (cells) => cells.map((el) => `cell:${el.dataset.kind ?? 'gift'}:${el.dataset.id ?? el.dataset.gift}`))
  const missingCells = expected.filter((key) => !seen.has(key))
  assert.deepEqual(missingCells, [], 'every cell is focusable')
  const keys = [...seen.keys()].join(' | ')
  for (const control of ['lh-home', 'lh-sound', 'lh-lang-select', 'lh-help', 'lh-bgbtn', 'lh-newbtn', 'lh-stage-pony', 'lh-mound', 'lh-barn', 'lh-done'])
    assert.ok(keys.includes(control), `${control} is focusable (${keys})`)
  // Collected, not thrown at once, so the rest of the keyboard flow still runs.
  const later = []
  const noRing = [...seen.entries()].filter(([, v]) => !v.ring).map(([k]) => k)
  if (noRing.length) later.push(`no visible focus ring on ${noRing.join(', ')}`)
  const hidden = [...seen.entries()].filter(([, v]) => !v.inStrip).map(([k]) => k)
  if (hidden.length) later.push(`focused cells stay partly outside their strip (the strip does not scroll to them): ${hidden.join(', ')}`)

  step('Enter and Space pick cells')
  await page.focus(cell('mane', 'chestnut'))
  await hush(page)
  await page.keyboard.press('Enter')
  await expectSaid(page, 'ru', [name('mane', 'chestnut', 'ru')], 'Enter pick')
  assert.equal(await page.getAttribute(cell('mane', 'chestnut'), 'aria-pressed'), 'true')
  await page.focus(cell('clip', 'butterfly'))
  await page.keyboard.press('Space')
  assert.equal((await st(page)).look.clip, 'butterfly')
  await page.focus(cell('tail', 'white'))
  await page.keyboard.press('Enter')
  await page.focus(cell('color', 'lilac'))
  await page.keyboard.press(' ')
  assert.equal((await st(page)).complete, true)

  step('Enter on the pony is a body tap; Enter on the mound eats the apple')
  await page.waitForTimeout(300)
  await page.focus('.lh-stage .lh-stage-pony')
  await hush(page)
  await page.keyboard.press('Enter')
  await expectSaid(page, 'ru', [ru.neigh], 'Enter on the pony')
  await page.focus('.lh-stage .lh-mound')
  await hush(page)
  await page.keyboard.press('Enter')
  await expectSaid(page, 'ru', [ru.munch], 'Enter on the apple')

  step('Готово, the whole celebration and the stable by keyboard')
  await page.focus('.lh-done')
  await page.keyboard.press('Enter')
  await until(page, (s) => s.celebration === 'stars', 'stars')
  await page.keyboard.press('Escape')
  await until(page, (s) => s.celebration === 'hooray', 'hooray')
  await page.keyboard.press('Escape')
  await until(page, (s) => s.celebration === 'name', 'name')
  await page.waitForTimeout(100)
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('lh-name')), 'focus on a name')
  // The card is an aria-modal dialog over a blurred workshop: Tab should stay inside it.
  const escaped = []
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const where = await page.evaluate(() => {
      const el = document.activeElement
      return el?.closest('.lh-layer') ? null : `${el?.tagName.toLowerCase()}.${String(el?.className?.baseVal ?? el?.className).split(' ').join('.')}`
    })
    if (where) escaped.push(where)
  }
  if (escaped.length) later.push(`Tab leaves the open name card (aria-modal) for the workshop behind it: ${[...new Set(escaped)].join(', ')}`)
  await page.focus('.lh-layer .lh-name')
  await page.keyboard.press('Tab')
  const focusedName = Number(await page.evaluate(() => document.activeElement?.dataset.name))
  await hush(page)
  await page.keyboard.press('Enter')
  await expectSaid(page, 'ru', [ru.hello(PONY_NAMES[focusedName].ru)], 'name by keyboard')
  await page.keyboard.press('Escape')
  await until(page, (s) => s.celebration === 'gift', 'gift')
  await page.waitForTimeout(100)
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('lh-biggift')), 'focus on the present')
  await page.keyboard.press('Enter')
  await until(page, (s) => s.celebration === 'opened', 'opened')
  await page.waitForSelector('.lh-layer .lh-card-next:not([hidden])')
  await page.waitForTimeout(150)
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('lh-card-next')), 'focus on the next button')
  await page.keyboard.press('Enter')
  await until(page, (s) => s.celebration === 'card', 'card')
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'to-stable', 'focus on «В конюшню»')
  await page.keyboard.press('Enter')
  let s = await until(page, (s) => s.screen === 'stable' && s.selected, 'stable, pony selected', 3000)
  assert.equal(s.ponies[0].nameIndex, focusedName)
  await page.keyboard.press('Escape')
  assert.equal((await st(page)).selected, null)
  await page.focus(`.lh-pony[data-pony="${s.ponies[0].id}"]`)
  await hush(page)
  await page.keyboard.press('Enter')
  await expectSaid(page, 'ru', [ru.iAm(PONY_NAMES[focusedName].ru)], 'pony by keyboard')
  await page.focus('.lh-actions [data-action="dress"]')
  await page.keyboard.press('Enter')
  s = await st(page)
  assert.equal(s.screen, 'workshop')
  assert.equal(s.editing, s.ponies[0].id)
  assert.deepEqual(errors, [])
  step('focus rings and focused cells (collected above)')
  if (later.length) throw new Error(later.join('\n'))
})

/* ═════════════ reduced motion ═════════════ */

await section('reduced motion: the celebration still completes, ponies stand still', async (open) => {
  const { page, errors } = await fresh(open, { save: herdSave(3), reducedMotion: 'reduce' })
  await dress(page, MATRYONA)
  await page.click('.lh-done')
  await until(page, (s) => s.celebration === 'hooray', 'hooray', 4000)
  assert.equal(await page.locator('.lh-slot.is-filled').count(), 3)
  assert.equal(await page.locator('.lh-confetti').count(), 0, 'no confetti')
  for (let i = 0; i < 8 && (await st(page)).celebration; i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(450)
  }
  await page.click('.lh-barn')
  await page.waitForTimeout(500)
  const a = await page.$$eval('.lh-pony', (els) => els.map((el) => el.style.transform))
  await page.waitForTimeout(3000)
  assert.deepEqual(await page.$$eval('.lh-pony', (els) => els.map((el) => el.style.transform)), a)
  assert.deepEqual(errors, [])
})

/* ═════════════ layouts ═════════════ */

const VIEWPORTS = [
  ['ipad-landscape', { width: 1180, height: 820 }, 'ru', 'ipad'],
  ['ipad-portrait', { width: 820, height: 1180 }, 'de', 'ipad'],
  ['desktop', { width: 1280, height: 900 }, 'en', 'ipad'],
  ['phone-landscape', { width: 844, height: 390 }, 'ru', 'phone'],
  ['phone', { width: 390, height: 844 }, 'en', 'phone'],
  ['small-phone', { width: 320, height: 568 }, 'de', 'phone'],
]

/** Layout facts of the workshop: overflow, boxes, cell reachability, sizes. */
const workshopLayout = (page) =>
  page.evaluate(async () => {
    const box = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }
    }
    const inside = (a, b, tol = 1) => a.x >= b.x - tol && a.y >= b.y - tol && a.r <= b.r + tol && a.b <= b.b + tol
    const view = { x: 0, y: 0, r: innerWidth, b: innerHeight }
    window.scrollTo(0, 99999)
    const out = {
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight, document.body.scrollWidth, document.body.scrollHeight, innerWidth, innerHeight],
      scrolled: [scrollX, scrollY],
      problems: [],
      cells: {},
    }
    window.scrollTo(0, 0)
    const stage = box(document.querySelector('.lh-stage'))
    for (const sel of ['.lh-home', '.lh-sound', '.lh-lang-select', '.lh-barn', '.lh-done', '.lh-stage']) {
      const el = document.querySelector(sel)
      if (!el) out.problems.push(`${sel} missing`)
      else if (!inside(box(el), view)) out.problems.push(`${sel} outside the viewport ${JSON.stringify(box(el))}`)
    }
    for (const sel of ['.lh-help', '.lh-bgbtn', '.lh-newbtn', '.lh-slots']) {
      const el = document.querySelector(sel)
      if (!inside(box(el), stage)) out.problems.push(`${sel} outside the stage`)
    }
    const slots = box(document.querySelector('.lh-slots'))
    if (slots.x + slots.w / 2 < stage.x + stage.w / 2 || slots.y + slots.h / 2 > stage.y + stage.h / 2) out.problems.push('star slots not in the upper right of the stage')
    const painted = window.__specVisibleBox(document.querySelector('.lh-stage .lh-rig'))
    const rig = { x: painted.left, y: painted.top, r: painted.right, b: painted.bottom }
    out.pony = { inside: inside(rig, stage), rig, stage }
    // A strip scrolls (with snapping) to its ends and to every cell's snap point; each cell must be
    // fully inside its strip and really hit at its centre at one of those positions.
    for (const sc of document.querySelectorAll('.lh-scroller')) {
      const side = sc.dataset.scroller
      const vertical = side === 'mane' || side === 'tail'
      const s = box(sc)
      if (!inside(s, view)) out.problems.push(`${side} strip outside the viewport`)
      const cells = [...sc.querySelectorAll('.lh-cell')]
      out.cells[side] = { count: cells.length, min: Math.min(...cells.map((c) => Math.min(c.offsetWidth, c.offsetHeight))) }
      const set = (pos) => (vertical ? (sc.scrollTop = pos) : (sc.scrollLeft = pos))
      set(0)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const max = vertical ? sc.scrollHeight - sc.clientHeight : sc.scrollWidth - sc.clientWidth
      const pad = parseFloat(getComputedStyle(sc)[vertical ? 'paddingTop' : 'paddingLeft']) || 0
      const positions = new Set([0, max])
      for (const c of cells) {
        const b = box(c)
        positions.add(Math.max(0, Math.min(max, Math.round((vertical ? b.y - s.y : b.x - s.x) - pad))))
      }
      const reached = new Set()
      for (const pos of [...positions].sort((a, b) => a - b)) {
        set(pos)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        for (const c of cells) {
          if (reached.has(c)) continue
          const b = box(c)
          if (!inside(b, s, 0.5)) continue
          const hit = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2)
          if (c.contains(hit)) reached.add(c)
        }
      }
      for (const c of cells) if (!reached.has(c)) out.problems.push(`${side} cell ${c.dataset.id ?? c.dataset.gift} never fits fully into its strip (or is covered)`)
      set(0)
    }
    const tools = {}
    for (const sel of ['.lh-home', '.lh-sound', '.lh-lang-select', '.lh-help', '.lh-bgbtn', '.lh-newbtn', '.lh-barn', '.lh-done']) {
      const b = box(document.querySelector(sel))
      tools[sel] = Math.round(Math.min(b.w, b.h))
    }
    out.tools = tools
    return out
  })

const ponyInStage = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('.lh-stage').getBoundingClientRect()
    const r = window.__specVisibleBox(document.querySelector('.lh-stage .lh-rig'))
    const t = 1
    return { ok: r.left >= s.left - t && r.top >= s.top - t && r.right <= s.right + t && r.bottom <= s.bottom + t, rig: [r.left, r.top, r.right, r.bottom].map(Math.round), stage: [s.left, s.top, s.right, s.bottom].map(Math.round) }
  })

const overlayLayout = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('.lh-layer:not([hidden]) .lh-card')
    if (!card) return { missing: true }
    const r = card.getBoundingClientRect()
    const inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
    // the tilted polaroid may poke out a few pixels; more than that means content is cut off
    const scrolls = card.scrollHeight > card.clientHeight + 8 || card.scrollWidth > card.clientWidth + 8
    const cut = [...card.querySelectorAll('button')]
      .filter((b) => !b.hidden && b.offsetParent)
      .filter((b) => {
        const x = b.getBoundingClientRect()
        return !(x.left >= r.left - 1 && x.right <= r.right + 1 && x.top >= r.top - 1 && x.bottom <= r.bottom + 1 && x.right <= innerWidth + 1 && x.bottom <= innerHeight + 1)
      })
      .map((b) => b.className)
    const small = [...card.querySelectorAll('button')]
      .filter((b) => !b.hidden && b.offsetParent)
      .map((b) => b.getBoundingClientRect())
      .filter((x) => x.width < 44 || x.height < 44).length
    const sound = document.querySelector('.lh-sound').getBoundingClientRect()
    const onTop = document.querySelector('.lh-sound').contains(document.elementFromPoint(sound.left + sound.width / 2, sound.top + sound.height / 2))
    return { inside, scrolls, cut, small, soundReachable: onTop, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), sizes: [card.scrollHeight, card.clientHeight] }
  })

for (const [label, viewport, lang, device] of VIEWPORTS) {
  await section(`layout ${label} ${viewport.width}×${viewport.height} (${lang})`, async (open) => {
    const { page, errors } = await fresh(open, { viewport, lang })
    const c = COPY[lang]
    const problems = []
    const expect = (ok, message) => ok || problems.push(message)
    const prefix = `${SHOTS}/${label}-${viewport.width}x${viewport.height}-${lang}`
    await page.waitForTimeout(400)

    step('sketch: no page scroll, everything inside, every cell reachable')
    await page.screenshot({ path: `${prefix}-1-sketch.png` })
    const checkWorkshop = async (when) => {
      const L = await workshopLayout(page)
      const [dw, dh, bw, bh, vw, vh] = L.scroll
      expect(dw <= vw && dh <= vh && bw <= vw && bh <= vh, `${when}: document overflows (${dw}×${dh}, body ${bw}×${bh}, viewport ${vw}×${vh})`)
      expect(L.scrolled[0] === 0 && L.scrolled[1] === 0, `${when}: the page scrolls (${L.scrolled})`)
      for (const p of L.problems) expect(false, `${when}: ${p}`)
      expect(L.pony.inside, `${when}: the pony leaves the stage ${JSON.stringify(L.pony)}`)
      const big = device === 'ipad' ? 72 : 56
      for (const [side, info] of Object.entries(L.cells)) {
        const narrow = device === 'phone' && viewport.height > viewport.width && (side === 'mane' || side === 'tail')
        const min = narrow ? 44 : big
        expect(info.min >= min, `${when}: ${side} cells ${info.min}px < ${min}px`)
      }
      for (const [sel, size] of Object.entries(L.tools)) expect(size >= 44, `${when}: ${sel} is ${size}px (< 44px)`)
      return L
    }
    const L1 = await checkWorkshop('sketch')

    step('dress with the last item of every row (scrolls each strip)')
    for (const side of SIDES) {
      const last = page.locator(`[data-scroller="${side}"] .lh-cell[data-kind="${side}"]`).last()
      const id = await last.getAttribute('data-id')
      await hush(page)
      await last.click()
      const said = await heard(page)
      expect(said[0]?.text === voice(lang, name(side, id, lang)), `${side} pick spoken: ${JSON.stringify(said)}`)
    }
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${prefix}-2-dressed.png` })
    const p1 = await ponyInStage(page)
    expect(p1.ok, `dressed pony leaves the stage ${JSON.stringify(p1)}`)

    step('celebration overlays fit the viewport')
    await page.click('.lh-done')
    await page.waitForTimeout(550)
    await page.screenshot({ path: `${prefix}-3-stars.png` })
    await until(page, (s) => s.celebration === 'hooray', 'hooray', 4000)
    for (let i = 0; i < 5; i++) {
      const p = await ponyInStage(page)
      expect(p.ok, `prancing pony leaves the stage at ${i * 230} ms ${JSON.stringify(p)}`)
      if (i === 2) await page.screenshot({ path: `${prefix}-4-hooray.png` })
      await page.waitForTimeout(230)
    }
    await page.click('.lh-layer .lh-skip')
    await until(page, (s) => s.celebration === 'name', 'name')
    await page.waitForTimeout(400)
    const checkCard = async (what) => {
      const O = await overlayLayout(page)
      expect(!O.missing, `${what}: no card`)
      if (O.missing) return
      expect(O.inside, `${what}: card outside the viewport ${JSON.stringify(O.rect)}`)
      expect(!O.scrolls, `${what}: card content needs scrolling ${JSON.stringify(O.sizes)}`)
      expect(!O.cut.length, `${what}: buttons cut off ${JSON.stringify(O.cut)}`)
      expect(!O.small, `${what}: ${O.small} card buttons smaller than 44px`)
      expect(O.soundReachable, `${what}: the sound button is covered`)
    }
    await checkCard('name')
    await page.screenshot({ path: `${prefix}-5-name.png` })
    await page.click('.lh-layer .lh-name >> nth=0')
    await page.waitForTimeout(300)
    await checkCard('named')
    await page.click('.lh-layer .lh-card-name .lh-card-next:not([hidden])')
    await until(page, (s) => s.celebration === 'gift', 'gift')
    await page.waitForTimeout(400)
    await checkCard('gift')
    await page.screenshot({ path: `${prefix}-6-gift.png` })
    await page.click('.lh-layer .lh-biggift')
    await page.waitForSelector('.lh-layer .lh-card-next:not([hidden])')
    await page.waitForTimeout(700)
    await checkCard('opened')
    await page.screenshot({ path: `${prefix}-7-opened.png` })
    await page.click('.lh-layer .lh-card-next')
    await until(page, (s) => s.celebration === 'card', 'card')
    await page.waitForTimeout(400)
    await checkCard('photo')
    await page.screenshot({ path: `${prefix}-8-card.png` })
    assert.equal((await page.textContent('.lh-layer [data-action="keep"]')).trim(), c.keepDressing)
    await page.click('.lh-layer [data-action="keep"]')

    step('every gift opened: longest rows still reachable; horn and wings stay on stage')
    // closing the card scrolls the opened gift into view and its row glows (its tiles hop): measure after that
    await waitDom(page, () => !document.querySelector('.lh-strip.is-glow'), null, 'the gift row stops glowing', 4000)
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__loshadka.give(40))
    await page.waitForTimeout(200)
    const L2 = await checkWorkshop('all gifts')
    expect(L2.cells.clip.count > L1.cells.clip.count, 'the clip row grew')
    await page.click(cell('magic', 'horn'))
    await page.click(cell('magic', 'wings'))
    await page.waitForTimeout(300)
    for (let i = 0; i < 4; i++) {
      const p = await ponyInStage(page)
      expect(p.ok, `pony with horn and wings leaves the stage ${JSON.stringify(p)}`)
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: `${prefix}-9-gifts.png` })

    step('stable: no overflow, bar inside, ponies on the meadow, the action bar fits')
    await page.click('.lh-barn')
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${prefix}-10-stable.png` })
    const S = await page.evaluate(() => {
      const view = { w: innerWidth, h: innerHeight }
      const box = (el) => el.getBoundingClientRect()
      const bar = box(document.querySelector('.lh-stable-bar'))
      const controls = [...document.querySelectorAll('.lh-stable-bar button, .lh-stable-bar select')].map((el) => box(el))
      const ponies = [...document.querySelectorAll('.lh-pony')].map((el) => box(el))
      return {
        overflow: document.documentElement.scrollWidth > view.w || document.documentElement.scrollHeight > view.h,
        bar: bar.left >= -1 && bar.top >= -1 && bar.right <= view.w + 1 && bar.bottom <= view.h + 1,
        controls: controls.filter((b) => b.right > view.w + 1 || b.bottom > view.h + 1 || b.left < -1).length,
        small: controls.filter((b) => b.width < 44 || b.height < 44).length,
        ponies: ponies.filter((b) => b.left + b.width / 2 < 0 || b.left + b.width / 2 > view.w || b.bottom > view.h + 2 || b.top < bar.bottom - b.height * 0.5).length,
      }
    })
    expect(!S.overflow, 'stable: the document overflows')
    expect(S.bar, 'stable: the top bar leaves the viewport')
    expect(!S.controls, `stable: ${S.controls} bar controls outside the viewport`)
    expect(!S.small, `stable: ${S.small} bar controls smaller than 44px`)
    expect(!S.ponies, `stable: ${S.ponies} ponies off the meadow`)
    const id = (await st(page)).ponies[0].id
    await page.click(`.lh-pony[data-pony="${id}"]`, { force: true })
    await page.waitForTimeout(400)
    const A = await page.evaluate(() => {
      const fits = (el) => {
        const b = el.getBoundingClientRect()
        return b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1
      }
      return { actions: fits(document.querySelector('.lh-actions')), bubble: fits(document.querySelector('.lh-bubble')) }
    })
    expect(A.actions, 'stable: the action bar leaves the viewport')
    expect(A.bubble, 'stable: the name bubble leaves the viewport')
    await page.screenshot({ path: `${prefix}-11-stable-selected.png` })
    expect(errors.length === 0, `console errors: ${JSON.stringify(errors)}`)
    step('layout problems collected above')
    if (problems.length) throw new Error(`${problems.length} layout problem(s):\n    - ${problems.join('\n    - ')}`)
  })
}

await section('iPad rotation: workshop and stable follow the new size', async (open) => {
  const { page, errors } = await fresh(open, { save: herdSave(8) })
  const problems = []
  for (const [label, size] of [['portrait', { width: 820, height: 1180 }], ['landscape', { width: 1180, height: 820 }]]) {
    step(`workshop → ${label}`)
    await page.setViewportSize(size)
    await page.waitForTimeout(500)
    const L = await workshopLayout(page)
    const [dw, dh, , , vw, vh] = L.scroll
    if (dw > vw || dh > vh) problems.push(`${label}: document overflows ${dw}×${dh}`)
    for (const p of L.problems) problems.push(`${label}: ${p}`)
    if (!L.pony.inside) problems.push(`${label}: pony leaves the stage`)
  }
  step('stable → portrait and back')
  await page.click('.lh-barn')
  await page.waitForTimeout(500)
  for (const [label, size] of [['portrait', { width: 820, height: 1180 }], ['landscape', { width: 1180, height: 820 }]]) {
    await page.setViewportSize(size)
    await page.waitForTimeout(600)
    const off = await page.evaluate(() => {
      const bar = document.querySelector('.lh-stable-bar').getBoundingClientRect()
      return [...document.querySelectorAll('.lh-pony')]
        .map((el) => el.getBoundingClientRect())
        .filter((b) => b.left + b.width / 2 < 0 || b.left + b.width / 2 > innerWidth || b.bottom > innerHeight + 2 || b.top < bar.bottom - b.height * 0.5).length
    })
    if (off) problems.push(`stable ${label}: ${off} ponies off the meadow after rotating`)
    await page.screenshot({ path: `${SHOTS}/rotation-stable-${label}.png` })
  }
  assert.deepEqual(errors, [])
  step('rotation problems collected above')
  if (problems.length) throw new Error(problems.join('\n'))
})

await browser.close()

if (failures.length) {
  console.log(`\nЛошадка: ${failures.length} section(s) failed`)
  for (const f of failures) console.log(`\n✗ ${f.section}\n  step: ${f.step}\n  ${f.message.replace(/\n/g, '\n  ')}`)
  process.exitCode = 1
} else console.log('\nЛошадка: all browser checks passed')
