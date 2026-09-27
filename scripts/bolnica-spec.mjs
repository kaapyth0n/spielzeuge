// Browser checks for Больница кошечки. Needs a running dev server (npm run dev).
// BOLNICA_BASE_URL selects the site (default http://localhost:5173), CHROMIUM_PATH a browser binary.
// A fake SpeechRecognition stands in for the browser recogniser, so reading aloud is tested end to end.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

const BASE = (process.env.BOLNICA_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const URL = `${BASE}/bolnica/`
const KEY = 'spielzeuge.bolnica.v1'
mkdirSync('tmp', { recursive: true })

const launch = () =>
  chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
    headless: true,
  })

/** Records speech and effects; replaces the recogniser with one the test can talk into. */
const fakes = () => {
  window.spoken = []
  window.effects = 0
  window.recLangs = []
  Object.defineProperty(speechSynthesis, 'speak', {
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(), 5)
    },
  })
  Object.defineProperty(speechSynthesis, 'cancel', { value: () => {} })
  for (const Node of [OscillatorNode, AudioBufferSourceNode]) {
    const start = Node.prototype.start
    Node.prototype.start = function (...args) {
      window.effects++
      return start.apply(this, args)
    }
  }
  class FakeRecognition {
    constructor() {
      this.lang = ''
      this.onresult = null
      this.onerror = null
      this.onend = null
      this.onspeechstart = null
    }
    start() {
      window.__rec = this
      window.recLangs.push(this.lang)
    }
    stop() {
      setTimeout(() => this.onend?.(), 5)
    }
    abort() {
      setTimeout(() => this.onend?.(), 5)
    }
  }
  window.SpeechRecognition = FakeRecognition
  window.webkitSpeechRecognition = FakeRecognition
  window.__say = (texts) => {
    const rec = window.__rec
    if (!rec) return false
    window.__rec = null
    const result = Object.assign(
      texts.map((t) => ({ transcript: t })),
      { isFinal: true },
    )
    rec.onspeechstart?.()
    rec.onresult?.({ resultIndex: 0, results: [result] })
    setTimeout(() => rec.onend?.(), 10)
    return true
  }
  window.__quiet = () => {
    const rec = window.__rec
    if (!rec) return false
    window.__rec = null
    rec.onerror?.({ error: 'no-speech' })
    setTimeout(() => rec.onend?.(), 5)
    return true
  }
}

const state = (page) => page.evaluate(() => window.__bolnica.state())
const me = (s) => s.save.players.find((p) => p.id === s.save.current)
const spoken = async (page) => {
  await page.waitForTimeout(150)
  return page.evaluate(() => window.spoken)
}
const resetSpoken = (page) => page.evaluate(() => (window.spoken = []))
async function heardSaid(page, pattern, what, timeout = 4000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const list = await page.evaluate(() => window.spoken)
    if (list.some((u) => pattern.test(u.text))) return list
    await page.waitForTimeout(80)
  }
  throw new Error(`Not spoken: ${what}`)
}

async function until(page, check, what, timeout = 9000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    last = await state(page)
    if (check(last)) return last
    await page.waitForTimeout(60)
  }
  throw new Error(`Timed out: ${what}. Last: ${JSON.stringify({ screen: last?.screen, deskPhase: last?.deskPhase, busy: last?.busy, bubble: last?.bubble, desk: last && me(last).hospital.desk })}`)
}

async function arrival(page) {
  return until(page, (s) => s.screen === 'reception' && s.deskPhase === 'wait' && me(s).hospital.desk, 'a knock at the window')
}

async function photo(page) {
  await page.click('.bo-cam-btn')
  return until(page, (s) => s.deskPhase === 'photo' && !s.busy, 'the photo')
}

async function swipeShutter(page) {
  const grip = await page.locator('.bo-shutter-grip').boundingBox()
  const x = grip.x + grip.width / 2
  await page.mouse.move(x, grip.y + 8)
  await page.mouse.down()
  await page.mouse.move(x, grip.y + grip.height * 1.4, { steps: 10 })
  await page.mouse.up()
}

/** Reads every card of the open ward correctly; returns when the healed card shows. */
async function readAll(page) {
  for (let guard = 0; guard < 12; guard++) {
    const s = await state(page)
    if (s.modal === 'healed') return s
    const patient = me(s).hospital.wards[s.ward - 1]
    if (!patient) return until(page, (t) => t.modal === 'healed', 'healed card')
    const card = s.cards[Math.min(patient.step, s.cards.length - 1)]
    await page.click('.bo-mic')
    await page.waitForFunction(() => Boolean(window.__rec))
    await page.evaluate((text) => window.__say([text.toLowerCase()]), card)
    await until(page, (t) => t.modal === 'healed' || (!t.busy && me(t).hospital.wards[t.ward - 1]?.step === patient.step + 1), `card ${card} accepted`)
  }
  throw new Error('too many cards')
}

async function openSettings(page) {
  if (!(await page.locator('.bo-settings').evaluate((d) => d.open))) await page.click('.bo-settings-summary')
}

async function noOverflow(page, label) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }))
  assert.ok(scroll <= width + 1, `${label}: horizontal overflow ${scroll} > ${width}`)
}

async function fitsScreen(page, label) {
  const box = await page.evaluate(() => {
    const frame = document.querySelector('.bo-stage')?.getBoundingClientRect()
    return frame ? { bottom: frame.bottom, right: frame.right, h: window.innerHeight, w: window.innerWidth } : null
  })
  assert.ok(box, `${label}: stage exists`)
  assert.ok(box.bottom <= box.h + 2, `${label}: stage bottom ${Math.round(box.bottom)} below the screen ${box.h}`)
  assert.ok(box.right <= box.w + 2, `${label}: stage wider than the screen`)
}

const browser = await launch()
try {
  /* ── catalog card ── */
  {
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    await page.goto(`${BASE}/?lang=ru`)
    const card = page.locator('a.toy-card--bolnica')
    assert.equal(await card.getAttribute('href'), './bolnica/')
    assert.match(await card.innerText(), /Больница кошечки/)
    assert.ok(await page.locator('#catalog-bolnica svg').count(), 'catalog art')
    await page.goto(`${BASE}/?lang=de`)
    assert.match(await page.locator('a.toy-card--bolnica').innerText(), /Kätzchens Krankenhaus/)
    await page.close()
  }

  /* ── full play-through in Russian ── */
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' })
  await context.addInitScript(fakes)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${URL}?lang=ru&reanimation=2`)
  await page.evaluate((key) => localStorage.removeItem(key), KEY)
  await page.reload()
  assert.equal(await page.locator('.bo-logo').innerText(), 'Больница кошечки')
  assert.match(await page.locator('.bo-byline').innerText(), /Вероники/)
  await page.screenshot({ path: 'tmp/bolnica-title.png' })

  // Start asks for a name once.
  await page.click('[data-action="start"]')
  await page.waitForSelector('#bo-name-input')
  await page.fill('#bo-name-input', 'Вероника')
  await page.keyboard.press('Enter')
  let s = await until(page, (t) => t.screen === 'reception', 'reception')
  assert.equal(me(s).name, 'Вероника')

  // Patient 1: the giraffe.
  s = await arrival(page)
  assert.equal(me(s).hospital.desk.kind, 'patient')
  assert.equal(me(s).hospital.desk.animal, 'giraffe')
  assert.ok((await heardSaid(page, /Тук-тук/, 'the knock')).some((u) => /Тук-тук/.test(u.text) && u.lang === 'ru-RU'), 'knock in Russian')
  // The ticket needs a photo first.
  assert.equal(await page.locator('.bo-ticket-btn').count(), 0)
  s = await photo(page)
  assert.ok(await page.locator('.bo-photo svg').count(), 'photo shows the patient')
  await page.screenshot({ path: 'tmp/bolnica-reception-photo.png' })
  assert.match(await page.locator('.bo-ticket-btn').innerText(), /палату 1/)
  await page.click('.bo-ticket-btn')
  s = await until(page, (t) => t.deskPhase !== 'photo' && me(t).hospital.wards[0]?.animal === 'giraffe', 'giraffe admitted')
  assert.equal(me(s).hospital.arrow, 1)
  assert.ok(await page.locator('.bo-ward-button.has-arrow .bo-arrow').count(), 'arrow over ward 1')

  // Before patient 2 an obvious monster knocks: swipe the shutter down.
  s = await arrival(page)
  assert.equal(me(s).hospital.desk.kind, 'monster')
  assert.equal(me(s).hospital.desk.obvious, true)
  await photo(page)
  await page.screenshot({ path: 'tmp/bolnica-monster-photo.png' })
  // A tap on the face only shows how the shutter works.
  const glass = await page.locator('.bo-window-opening').boundingBox()
  await page.mouse.click(glass.x + glass.width / 2, glass.y + glass.height * 0.3)
  s = await until(page, (t) => /сверху вниз/.test(t.bubble), 'swipe explained')
  assert.equal(me(s).caught, 0, 'a tap on the face never closes the shutter')
  assert.ok(me(s).hospital.desk, 'the monster is still there')
  await swipeShutter(page)
  s = await until(page, (t) => me(t).caught === 1, 'monster caught')
  assert.equal(me(s).score, 1)

  // Patient 2 goes to ward 2.
  s = await arrival(page)
  assert.equal(me(s).hospital.desk.kind, 'patient')
  await photo(page)
  await page.click('.bo-ticket-btn')
  s = await until(page, (t) => Boolean(me(t).hospital.wards[1]), 'second patient admitted')

  // Ward 1: read every card.
  await page.click('[data-action="ward-1"]')
  s = await until(page, (t) => t.screen === 'ward' && t.ward === 1, 'ward 1')
  assert.equal(me(s).hospital.arrow, 2, 'the arrow keeps pointing at the last ticket')
  assert.ok(s.cards.length >= 3, 'cards for level 1')
  assert.ok(s.cards.every((c) => /^[АОУИЭ]$/.test(c)), `level 1 is vowels: ${s.cards}`)
  const intro = await spoken(page)
  assert.ok(intro.some((u) => /Жираф Жора/.test(u.text)), 'ward intro names the patient')
  assert.ok(!intro.some((u) => u.text.trim() === s.cards[0]), 'the card itself is never read before the answer')
  await page.screenshot({ path: 'tmp/bolnica-ward.png' })
  await page.click('.bo-mic')
  await page.waitForFunction(() => Boolean(window.__rec))
  assert.deepEqual(await page.evaluate(() => window.recLangs.at(-1)), 'ru-RU')
  // Silence never costs anything.
  await page.evaluate(() => window.__quiet())
  s = await until(page, (t) => /Ничего не слышно/.test(t.bubble), 'nothing heard')
  assert.equal(me(s).hospital.wards[0].strikes, 0)
  const scoreBefore = me(s).score
  const firstCards = s.cards
  s = await readAll(page)
  assert.equal(me(s).score, scoreBefore + firstCards.length, 'one point per card')
  assert.equal(me(s).healed, 1)
  assert.equal(me(s).hospital.wards[0], null)
  await page.screenshot({ path: 'tmp/bolnica-healed.png' })

  // Ward 2: mistakes, the forgiving cat, intensive care and the return.
  await page.click('.bo-modal [data-action="reception"]')
  await until(page, (t) => t.screen === 'reception', 'reception again')
  await page.click('[data-action="ward-2"]')
  s = await until(page, (t) => t.screen === 'ward' && t.ward === 2, 'ward 2')
  assert.equal(me(s).hospital.arrow, null, 'visiting the ward clears its arrow')
  const target = s.cards[0]
  const other = ['А', 'О', 'У', 'И', 'Э', 'Ы', 'Е', 'Я', 'Ю'].find((l) => l !== target)
  const hearts = async () => (await state(page)).save.players.find((p) => p.id === s.save.current).hospital.wards[1]
  await page.click('.bo-mic')
  await page.waitForFunction(() => Boolean(window.__rec))
  await page.evaluate((text) => window.__say([text.toLowerCase()]), other)
  s = await until(page, (t) => /ещё раз/.test(t.bubble), 'forgiven first miss')
  assert.equal((await hearts()).strikes, 0)
  for (let strike = 1; strike <= 3; strike++) {
    await until(page, (t) => !t.busy, 'ready for the next try')
    await page.click('.bo-mic')
    await page.waitForFunction(() => Boolean(window.__rec))
    await page.evaluate((text) => window.__say([text.toLowerCase()]), other)
    if (strike < 3) await until(page, (t) => me(t).hospital.wards[1].strikes === strike, `strike ${strike}`)
  }
  s = await until(page, (t) => me(t).hospital.wards[1]?.away > 0, 'intensive care')
  await heardSaid(page, /реанимац/, 'intensive care')
  await page.screenshot({ path: 'tmp/bolnica-reanimation.png' })
  s = await until(page, (t) => me(t).hospital.wards[1]?.away === 0 && !t.busy, 'back from intensive care', 12000)
  assert.equal(me(s).hospital.wards[1].step, 0, 'cards start again')
  await heardSaid(page, /вернул/, 'the return')

  // Grown-up mode: the buttons judge.
  await page.click('[data-action="back"]')
  await until(page, (t) => t.screen === 'reception', 'reception')
  await page.click('[data-action="back"]')
  await until(page, (t) => t.screen === 'title', 'title')
  await openSettings(page)
  await page.click('[data-action="checker-grownup"]')
  s = await state(page)
  assert.equal(s.save.checker, 'grownup')
  await page.click('[data-action="start"]')
  await until(page, (t) => t.screen === 'reception', 'reception')
  await page.click('[data-action="ward-2"]')
  await until(page, (t) => t.screen === 'ward', 'ward')
  await page.click('[data-action="judge-right"]')
  s = await until(page, (t) => me(t).hospital.wards[1]?.step === 1 && !t.busy, 'grown-up says right')
  await page.click('[data-action="judge-wrong"]')
  s = await until(page, (t) => me(t).hospital.wards[1]?.strikes === 1, 'grown-up says wrong: no forgiveness')
  await page.screenshot({ path: 'tmp/bolnica-ward-grownup.png' })

  /* ── wardrobe ── */
  await page.click('[data-action="back"]')
  await until(page, (t) => t.screen === 'reception', 'reception')
  await page.click('[data-action="back"]')
  await page.click('[data-action="wardrobe"]')
  await until(page, (t) => t.screen === 'wardrobe', 'wardrobe')
  await resetSpoken(page)
  await page.click('[data-action="wear-stethoscope"]')
  assert.equal(await page.locator('[data-action="wear-stethoscope"]').getAttribute('aria-pressed'), 'true')
  assert.ok((await spoken(page)).some((u) => /Стетоскоп надет/.test(u.text)))
  await page.click('[data-action="wear-stethoscope"]')
  assert.equal(await page.locator('[data-action="wear-stethoscope"]').getAttribute('aria-pressed'), 'false')
  assert.ok(await page.locator('#bo-fur-panel').isHidden(), 'fur choice starts closed')
  await page.click('[data-action="fur-toggle"]')
  await page.click('[data-action="fur-checked"]')
  await page.click('[data-action="tint-pink"]')
  await page.click('[data-action="wear-glasses"]')
  s = await state(page)
  assert.deepEqual({ fur: me(s).look.fur, tint: me(s).look.tint }, { fur: 'checked', tint: 'pink' })
  assert.ok(me(s).look.wear.includes('glasses'))
  await page.screenshot({ path: 'tmp/bolnica-wardrobe.png', fullPage: true })
  await page.click('[data-action="wardrobe-done"]')
  await until(page, (t) => t.screen === 'title', 'tapping the cat returns')

  /* ── several cats ── */
  await page.click('[data-action="board"]')
  await page.click('[data-action="new-cat"]')
  await page.waitForSelector('#bo-name-input')
  await page.fill('#bo-name-input', 'Матрёна')
  await page.click('.bo-modal button[type="submit"]')
  s = await until(page, (t) => t.save.players.length === 2 && me(t).name === 'Матрёна', 'second cat')
  assert.equal(s.screen, 'wardrobe')
  await page.click('[data-action="back"]')
  await page.click('[data-action="board"]')
  assert.equal(await page.locator('.bo-board-card').count(), 2)
  await page.screenshot({ path: 'tmp/bolnica-board.png', fullPage: true })
  const veronika = s.save.players.find((p) => p.name === 'Вероника')
  await page.click(`[data-action="switch-${veronika.id}"]`)
  s = await state(page)
  assert.equal(me(s).name, 'Вероника')
  assert.ok(me(s).score >= 1)

  /* ── languages and sound ── */
  await page.click('[data-action="back"]')
  await until(page, (t) => t.screen === 'title', 'title')
  for (const [code, name, locale] of [
    ['de', 'Kätzchens Krankenhaus', 'de-DE'],
    ['en', 'Kitty’s Hospital', 'en-GB'],
  ]) {
    await resetSpoken(page)
    await page.selectOption('#bo-language', code)
    await until(page, (t) => t.screen === 'title', 'title')
    assert.equal(await page.locator('.bo-logo').innerText(), name)
    assert.ok((await spoken(page)).every((u) => u.lang === locale), `speech in ${locale}`)
    assert.equal(await page.evaluate(() => localStorage.getItem('spielzeuge.lang')), code)
    await openSettings(page)
    await page.click('[data-action="checker-voice"]')
    await page.click('[data-action="start"]')
    await until(page, (t) => t.screen === 'reception', 'reception')
    await page.click('[data-action="ward-2"]')
    s = await until(page, (t) => t.screen === 'ward', 'ward')
    assert.ok(s.cards.every((c) => /^[A-ZÄÖÜ]+$/.test(c)), `${code} cards are Latin: ${s.cards}`)
    await page.click('.bo-mic')
    await page.waitForFunction(() => Boolean(window.__rec))
    assert.equal(await page.evaluate(() => window.recLangs.at(-1)), locale)
    await page.evaluate(() => window.__quiet())
    await page.screenshot({ path: `tmp/bolnica-ward-${code}.png` })
    await page.click('[data-action="back"]')
    await until(page, (t) => t.screen === 'reception', 'reception')
    await page.click('[data-action="back"]')
    await until(page, (t) => t.screen === 'title', 'title')
  }
  await page.selectOption('#bo-language', 'ru')
  await until(page, (t) => t.screen === 'title', 'title')
  await page.click('#bo-sound')
  assert.equal(await page.locator('#bo-sound').getAttribute('aria-pressed'), 'false')
  await resetSpoken(page)
  await page.click('[data-action="howto"]')
  assert.equal((await spoken(page)).length, 0, 'muted: nothing spoken')
  await page.reload()
  assert.equal(await page.locator('#bo-sound').getAttribute('aria-pressed'), 'false', 'mute is saved')
  await page.click('#bo-sound')

  assert.deepEqual(errors, [], 'no page errors')
  await context.close()

  /* ── intensive care lasts 30 s without the test parameter; the shutter closes from the keyboard ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' })
    await ctx.addInitScript(fakes)
    const p = await ctx.newPage()
    await p.goto(`${URL}?lang=ru`)
    await p.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ sound: true, checker: 'grownup', forgiving: true, current: 'c0', players: [{ id: 'c0', name: 'Тест', named: true, hospital: { round: 1, next: 2, healed: [], wards: [{ level: 1, animal: 'giraffe', seed: 1, step: 0, strikes: 0, misses: 0, away: 0, visits: 0 }, null, null, null], desk: null, monstersBefore: 1, arrow: null } }] }))
    }, KEY)
    await p.reload()
    await p.click('[data-action="start"]')
    await until(p, (t) => t.screen === 'reception', 'reception')
    await p.click('[data-action="ward-1"]')
    await until(p, (t) => t.screen === 'ward', 'ward')
    for (let strike = 1; strike <= 3; strike++) {
      await until(p, (t) => !t.busy, 'ready')
      await p.click('[data-action="judge-wrong"]')
      if (strike < 3) await until(p, (t) => me(t).hospital.wards[0].strikes === strike, `strike ${strike}`)
    }
    const t = await until(p, (x) => me(x).hospital.wards[0]?.away > 0, 'intensive care')
    const left = me(t).hospital.wards[0].away - (await p.evaluate(() => Date.now()))
    assert.ok(left > 27000 && left <= 30000, `intensive care lasts about 30 s, got ${left}`)
    await p.waitForTimeout(3800)
    assert.ok(await p.locator('.bo-away .bo-away-time').count(), 'the countdown shows in the ward')
    // Keyboard: the pull tab closes the shutter on the monster.
    await p.click('[data-action="back"]')
    await arrival(p)
    await p.click('.bo-cam-btn')
    await until(p, (x) => x.deskPhase === 'photo' && !x.busy, 'photo')
    await p.focus('.bo-swipe-hint')
    await p.keyboard.press('Enter')
    await until(p, (x) => me(x).caught === 1, 'caught from the keyboard')
    await ctx.close()
  }

  /* ── after patient 20 the game always finds its way to the celebration and round 2 ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' })
    await ctx.addInitScript(fakes)
    const p = await ctx.newPage()
    await p.goto(`${URL}?lang=ru`)
    await p.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ current: 'c0', players: [{ id: 'c0', name: 'Тест', named: true, score: 50, healed: 20, hospital: { round: 1, next: 21, healed: Array.from({ length: 20 }, (_, i) => i + 1), wards: [null, null, null, null], desk: null } }] }))
    }, KEY)
    await p.reload()
    assert.match(await p.locator('.bo-start-meta').innerText(), /Все 20 пациентов здоровы/)
    await p.click('[data-action="start"]')
    await until(p, (t) => t.screen === 'celebrate', 'celebration after a reload')
    assert.equal(await p.locator('.bo-mini-rank li').count(), 1, 'the players list shows at the end')
    await p.click('[data-action="board"]')
    await p.click('[data-action="back"]')
    await p.click('[data-action="start"]')
    await until(p, (t) => t.screen === 'celebrate', 'celebration again')
    await p.click('[data-action="new-round"]')
    const t = await until(p, (x) => x.screen === 'reception' && me(x).hospital.round === 2, 'round 2')
    assert.equal(me(t).hospital.next, 1)
    assert.equal(me(t).rounds, 1)
    await ctx.close()
  }

  /* ── viewports ── */
  for (const [name, width, height, touch] of [
    ['phone', 390, 844, true],
    ['small-phone', 320, 568, true],
    ['ipad-portrait', 820, 1180, true],
    ['ipad-landscape', 1180, 820, true],
    ['phone-landscape', 844, 390, true],
    ['desktop', 1440, 900, false],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 900, reducedMotion: 'reduce' })
    await ctx.addInitScript(fakes)
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (error) => errs.push(error.message))
    await p.goto(`${URL}?lang=ru`)
    await p.evaluate((key) => localStorage.removeItem(key), KEY)
    await p.reload()
    await noOverflow(p, `${name} title`)
    await p.screenshot({ path: `tmp/bolnica-${name}-title.png`, fullPage: true })
    await p.click('[data-action="start"]')
    await p.click('[data-action="name-skip"]')
    await until(p, (t) => t.screen === 'reception', 'reception')
    await arrival(p)
    await p.click('.bo-cam-btn')
    await until(p, (t) => t.deskPhase === 'photo' && !t.busy, 'photo')
    await noOverflow(p, `${name} reception`)
    await fitsScreen(p, `${name} reception`)
    await p.screenshot({ path: `tmp/bolnica-${name}-reception.png` })
    await p.click('.bo-ticket-btn')
    await until(p, (t) => Boolean(me(t).hospital.wards[0]) && t.deskPhase !== 'photo', 'admitted')
    await p.click('[data-action="ward-1"]')
    await until(p, (t) => t.screen === 'ward', 'ward')
    await noOverflow(p, `${name} ward`)
    await fitsScreen(p, `${name} ward`)
    await p.screenshot({ path: `tmp/bolnica-${name}-ward.png` })
    await p.click('[data-action="back"]')
    await p.click('[data-action="back"]')
    await p.click('[data-action="wardrobe"]')
    await p.click('[data-action="fur-toggle"]')
    await noOverflow(p, `${name} wardrobe`)
    await p.screenshot({ path: `tmp/bolnica-${name}-wardrobe.png`, fullPage: true })
    assert.deepEqual(errs, [], `${name}: no page errors`)
    await ctx.close()
  }
  console.log('bolnica: all browser checks passed')
} finally {
  await browser.close()
}
