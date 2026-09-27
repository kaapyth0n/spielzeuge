// Browser checks for Песенки. Needs a running dev server (npm run dev).
// PESENKI_BASE_URL selects the site (default http://localhost:5173), CHROMIUM_PATH a browser binary.
// Songs really play (Chrome's audio clock runs headless); ?debug=1 exposes the right picture and a seek.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

const BASE = (process.env.PESENKI_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const URL = `${BASE}/pesenki/?debug=1`
const KEY = 'spielzeuge.pesenki.v1'
mkdirSync('tmp', { recursive: true })

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})

/** Records speech instead of speaking. */
const recorder = () => {
  window.spoken = []
  Object.defineProperty(speechSynthesis, 'speak', {
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(), 5)
    },
  })
  Object.defineProperty(speechSynthesis, 'cancel', { value: () => {} })
}

const state = (page) => page.evaluate(() => window.__pesenki.state())
const until = async (page, test, what, timeout = 20000) => {
  const start = Date.now()
  for (;;) {
    const s = await state(page)
    if (test(s)) return s
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${what}: ${JSON.stringify({ ...s, save: undefined })}`)
    await page.waitForTimeout(80)
  }
}
const step = (name) => console.log(`• ${name}`)

async function fresh(viewport = { width: 1180, height: 820 }, lang = 'ru') {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900 })
  await context.addInitScript(recorder)
  await context.addInitScript((l) => localStorage.setItem('spielzeuge.lang', l), lang)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(URL)
  await page.waitForSelector('.ps-song')
  return { context, page, errors }
}

async function openAndStart(page, song = 'panda') {
  await page.click(`.ps-song[data-song="${song}"]`)
  await until(page, (s) => s.stage === 'idle', 'song loaded')
  await page.click('.ps-hero', { force: true })
  return until(page, (s) => s.mode === 'play', 'song playing')
}

/* ───────────── catalog ───────────── */
{
  step('catalog card in three languages')
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } })
  const page = await context.newPage()
  for (const [lang, name] of [['ru', 'Песенки'], ['de', 'Liedchen'], ['en', 'Little Songs']]) {
    await page.goto(`${BASE}/?lang=${lang}`)
    const card = page.locator('.toy-card--pesenki')
    assert.equal(await card.getAttribute('href'), './pesenki/')
    assert.equal((await card.locator('.toy-card-name').textContent()).trim(), name)
    assert.ok(await card.locator('svg .hero-body').count(), 'panda on the card')
  }
  await context.close()
}

/* ───────────── shelf, narration, picture flow ───────────── */
{
  const { context, page, errors } = await fresh()
  step('shelf greets in Russian and lists the songs')
  const songs = await page.locator('.ps-song').count()
  assert.ok(songs >= 1)
  await page.waitForTimeout(200)
  const spoken = await page.evaluate(() => window.spoken)
  assert.ok(spoken.some((u) => u.text.includes('Песенки') && u.lang === 'ru-RU'), JSON.stringify(spoken))

  step('a song opens, waits for the hero tap, then plays from the intro')
  await page.click('.ps-song[data-song="panda"]')
  let s = await until(page, (s) => s.stage === 'idle', 'song loaded')
  assert.equal(s.mode, 'idle')
  assert.equal((await page.textContent('#ps-status')).trim(), 'Тыкни на кружок — и песенка начнётся!')
  await page.click('.ps-hero', { force: true })
  s = await until(page, (s) => s.mode === 'play' && s.pos > 3, 'playing')
  assert.ok(s.playing)

  step('pictures appear with the first line; a wrong one is only greyed out')
  s = await until(page, (s) => s.shown === 0, 'first pictures')
  assert.equal(s.choices.length, 3)
  const wrong = s.choices.find((pic) => pic !== s.target)
  await page.click(`.ps-choice[data-pic="${wrong}"]`)
  await page.waitForSelector(`.ps-choice[data-pic="${wrong}"].is-tried`)
  assert.equal((await state(page)).answered, 0)

  step('without an answer the song stops after the line and waits')
  s = await until(page, (s) => s.mode === 'hold', 'hold')
  // The stop is scheduled a moment ahead, exactly between two lines.
  await page.waitForTimeout(300)
  const heldAt = (await state(page)).pos
  await page.waitForTimeout(1200)
  s = await state(page)
  assert.equal(s.mode, 'hold')
  assert.ok(Math.abs(s.pos - heldAt) < 0.05, 'the song is stopped')
  assert.ok(!s.playing)
  assert.equal((await page.textContent('#ps-status')).trim(), 'Что спели? Найди картинку!')

  step('after a while it rewinds «уй-уй-уй» and sings the line again')
  await until(page, (s) => s.mode === 'hint', 'hint rewind', 9000)
  await until(page, (s) => s.mode === 'play' || s.mode === 'hold', 'line again', 8000)

  step('the right picture continues the song and lands on the clock')
  s = await state(page)
  await page.click(`.ps-choice[data-pic="${s.target}"]`)
  s = await until(page, (s) => s.answered === 1 && s.mode === 'play', 'answered')
  await page.waitForSelector('.ps-mark[data-cue="0"].is-found', { state: 'attached' })

  step('pictures found while the song keeps going count as fast')
  s = await until(page, (s) => s.shown === 1, 'second pictures')
  await page.click(`.ps-choice[data-pic="${s.target}"]`)
  s = await until(page, (s) => s.answered === 2, 'second answer')
  assert.ok(s.fast >= 1, 'a fast answer')

  step('keyboard: digits pick pictures')
  s = await until(page, (s) => s.shown === 2, 'third pictures')
  const digit = s.choices.indexOf(s.target) + 1
  await page.keyboard.press(String(digit))
  await until(page, (s) => s.answered === 3, 'keyboard answer')

  step('chorus: tapping keeps the song going, stopping rewinds it')
  s = await until(page, (s) => s.shown === 3, 'fourth pictures')
  await page.click(`.ps-choice[data-pic="${s.target}"]`)
  s = await until(page, (s) => s.chorus === 0, 'chorus', 8000)
  assert.equal(await page.locator('.ps-hero.is-chorus').count(), 1)
  for (let i = 0; i < 8; i++) {
    await page.locator('.ps-hero').dispatchEvent('pointerdown', { button: 0 })
    await page.waitForTimeout(400)
  }
  s = await state(page)
  assert.equal(s.mode, 'play')
  assert.ok(s.energy > 0.5, `energy ${s.energy}`)
  s = await until(page, (s) => s.mode === 'rewind', 'rewind', 8000)
  assert.equal((await page.textContent('#ps-status')).trim(), 'Уй-уй-уй!')
  const rewindFrom = s.pos
  await page.waitForTimeout(500)
  assert.ok((await state(page)).pos < rewindFrom, 'running backwards')
  await page.locator('.ps-hero').dispatchEvent('pointerdown', { button: 0 })
  s = await until(page, (s) => s.mode === 'play', 'forward again')

  step('the finished song rings the clock and offers the next speed-up')
  const end = await page.evaluate(() => {
    const t = window.__pesenki.state()
    return t
  })
  assert.equal(end.level, 0)
  await page.evaluate(() => window.__pesenki.seek(1e6))
  // seek past the end is clamped by the player; the conductor finishes.
  s = await until(page, (s) => s.stage === 'finished', 'finished', 8000)
  await page.waitForSelector('.ps-finish:not([hidden]) .ps-speed.is-fresh')
  assert.equal(s.save.songs.panda.done, 1)
  assert.equal(await page.locator('.ps-finish .ps-speed:not(.is-locked)').count(), 2)
  assert.equal(await page.locator('.ps-finish .ps-speed.is-locked').count(), 3)
  // The collection shows every picture of the song; the fast ones are gold.
  assert.equal(await page.locator('.ps-finish .ps-found').count(), 8)
  assert.ok((await page.locator('.ps-finish .ps-found.is-fast').count()) >= 1)
  const stored = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY))
  assert.equal(stored.songs.panda.done, 1)
  await page.waitForTimeout(1200)
  const said = (await page.evaluate(() => window.spoken)).map((u) => u.text).join(' | ')
  assert.ok(said.includes('Ура! Песенка спета!'), said)
  await page.screenshot({ path: 'tmp/pesenki-finish.png' })

  step('picking the speed-up plays the song faster')
  await page.click('.ps-finish .ps-speed.is-fresh')
  s = await until(page, (s) => s.mode === 'play', 'faster song')
  assert.equal(s.level, 1)

  step('changing language mid-song loads the German recording')
  await page.selectOption('#ps-language', 'de')
  s = await until(page, (s) => s.stage === 'idle' && s.lang === 'de', 'German song')
  assert.equal(await page.getAttribute('html', 'lang'), 'de')
  assert.equal((await page.textContent('#ps-status')).trim(), 'Tipp auf den Kreis, dann fängt das Lied an!')
  assert.equal(await page.evaluate(() => localStorage.getItem('spielzeuge.lang')), 'de')

  step('the sound button silences songs, effects and speech and is remembered')
  await page.click('[data-action="sound"]')
  assert.equal(await page.getAttribute('[data-action="sound"]', 'aria-pressed'), 'false')
  assert.equal(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY)).sound, false)
  await page.evaluate(() => (window.spoken = []))
  await page.click('[data-action="shelf"]')
  await page.waitForTimeout(300)
  assert.equal((await page.evaluate(() => window.spoken)).length, 0, 'no speech while muted')
  await page.reload()
  await page.waitForSelector('.ps-song')
  assert.equal(await page.getAttribute('[data-action="sound"]', 'aria-pressed'), 'false')
  await page.click('[data-action="sound"]')

  step('English labels')
  await page.selectOption('#ps-language', 'en')
  assert.equal((await page.textContent('.ps-title')).trim(), 'Little Songs')
  assert.equal((await page.textContent('.ps-pick')).trim(), 'Pick a song')
  assert.equal(await page.getAttribute('[data-action="home"]', 'aria-label'), 'All toys')

  step('pause while hidden and resume from the same place')
  await openAndStart(page)
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  s = await until(page, (s) => s.mode === 'paused', 'paused')
  const pausedAt = s.pos
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(600)
  assert.equal((await state(page)).mode, 'paused')
  await page.click('.ps-hero', { force: true })
  s = await until(page, (s) => s.mode === 'play' || s.mode === 'hold', 'resumed')
  assert.ok(Math.abs(s.pos - pausedAt) < 1.5)

  assert.deepEqual(errors, [])
  await context.close()
}

/* ───────────── layouts ───────────── */
const VIEWPORTS = [
  ['phone', { width: 390, height: 844 }],
  ['small-phone', { width: 360, height: 640 }],
  ['ipad-portrait', { width: 820, height: 1180 }],
  ['ipad-landscape', { width: 1180, height: 820 }],
  ['phone-landscape', { width: 844, height: 390 }],
]
for (const [name, viewport] of VIEWPORTS) {
  step(`layout: ${name}`)
  const { context, page, errors } = await fresh(viewport)
  await page.screenshot({ path: `tmp/pesenki-${name}-shelf.png` })
  const shelfOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
  assert.ok(!shelfOverflow, 'no sideways scroll on the shelf')
  await openAndStart(page)
  await until(page, (s) => s.shown === 0, 'pictures')
  await page.waitForTimeout(700)
  await page.screenshot({ path: `tmp/pesenki-${name}-song.png` })
  const boxes = await page.evaluate(() => {
    const r = (sel) => {
      const b = document.querySelector(sel)?.getBoundingClientRect()
      return b ? { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } : null
    }
    return {
      vw: innerWidth,
      vh: innerHeight,
      hero: r('.ps-hero'),
      clock: r('.ps-clock'),
      line: r('.ps-line'),
      choices: [...document.querySelectorAll('.ps-choice')].map((b) => {
        const x = b.getBoundingClientRect()
        return { x: x.left, y: x.top, r: x.right, b: x.bottom, w: x.width }
      }),
      buttons: [...document.querySelectorAll('.ps-top button, .ps-top a, .ps-top select')].map((b) => {
        const x = b.getBoundingClientRect()
        return { w: x.width, h: x.height, r: x.right, b: x.bottom }
      }),
    }
  })
  const inside = (b, label) => {
    assert.ok(b, label)
    assert.ok(b.x >= -1 && b.y >= -1 && b.r <= boxes.vw + 1 && b.b <= boxes.vh + 1, `${label} inside ${JSON.stringify(b)}`)
  }
  inside(boxes.hero, 'hero')
  inside(boxes.clock, 'clock')
  boxes.choices.forEach((c, i) => inside(c, `choice ${i}`))
  for (const c of boxes.choices) assert.ok(c.w >= 60, `choices big enough for a finger (${c.w})`)
  for (const b of boxes.buttons) assert.ok(b.w >= 43 && b.h >= 43, `top buttons are finger-sized ${JSON.stringify(b)}`)
  // Choices never cover the hero.
  for (const c of boxes.choices) {
    const overlap = !(c.r <= boxes.hero.x || c.x >= boxes.hero.r || c.b <= boxes.hero.y || c.y >= boxes.hero.b)
    assert.ok(!overlap, 'choices do not cover the hero')
  }
  assert.deepEqual(errors, [])
  await context.close()
}

await browser.close()
console.log('Песенки: all browser checks passed')
