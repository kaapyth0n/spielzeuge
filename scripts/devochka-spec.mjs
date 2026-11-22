// Browser play-through for the shop, gestures, saved notebook and coin games.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const shots = 'tmp/devochka/spec'
mkdirSync(shots, { recursive: true })
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const errors = []
function instrument() {
  window.spoken = []
  window.cancels = 0
  window.notes = 0
  class Utterance {
    constructor(text) {
      this.text = text
    }
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance })
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [],
      addEventListener: () => {},
      resume: () => {},
      cancel: () => {
        window.cancels++
      },
      speak(u) {
        if (u.text.trim()) window.spoken.push([u.lang, u.text])
        u.onend?.()
      },
    },
  })
  const create = AudioContext.prototype.createOscillator
  AudioContext.prototype.createOscillator = function () {
    window.notes++
    return create.call(this)
  }
}
async function pageFor(width, height, init = instrument) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: width < 800,
  })
  const page = await context.newPage()
  await page.addInitScript(init)
  page.on('pageerror', (error) => errors.push(error.message))
  return page
}
const book = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('spielzeuge.devochka.v1')))
const click = (p, key, value) => p.locator(`[data-${key}="${value}"]`).first().click()
const act = (p, name) => click(p, 'action', name)
const go = (p, name) => click(p, 'nav', name)
const has = async (p, selector) => {
  await p.locator(selector).first().waitFor()
}
const screenshot = async (p, name) => {
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${shots}/${name}.png`, fullPage: true })
}
async function bounds(p) {
  const size = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  assert(size[0] <= size[1], `Horizontal overflow ${size}`)
}
async function point(p, s, fx = 0.5, fy = 0.5) {
  const el = p.locator(s).first()
  await el.scrollIntoViewIfNeeded()
  const r = await el.boundingBox()
  return [r.x + r.width * fx, r.y + r.height * fy]
}
async function buy(p, food, coins) {
  for (const id of food) await click(p, 'add', id)
  await act(p, 'checkout')
  for (const n of coins) await click(p, 'coin', n)
  await p.locator('.note-bottom [data-action="lever"]:enabled').click()
  await has(p, '.home-scene')
}
try {
  for (const [lang, width, height] of [
    ['ru', 1280, 850],
    ['de', 320, 640],
    ['en', 390, 844],
    ['de', 740, 360],
    ['ru', 768, 1024],
    ['en', 667, 375],
  ]) {
    const p = await pageFor(width, height)
    await p.goto(`${base}/?lang=${lang}`)
    const card = p.locator('.catalog-grid a').first()
    assert.match(await card.getAttribute('href'), /devochka/)
    const name = { ru: 'Девочка', de: 'Das Mädchen', en: 'The Little Girl' }[lang]
    assert((await card.innerText()).includes(name))
    await card.click()
    await has(p, '.shop-scene')
    assert.equal(await p.locator('html').getAttribute('lang'), lang)
    await bounds(p)
    await screenshot(p, `shop-${lang}-${width}`)
    for (const f of ['dumpling', 'roll', 'chips', 'water']) {
      await p.locator(`[data-add=${f}] .price-tag`).click()
      assert((await book(p)).cart.includes(f), `Wrong shelf hit ${f} on ${width}`)
    }
    for (const f of ['chips', 'roll']) await click(p, 'remove', f)
    await act(p, 'checkout')
    await bounds(p)
    await click(p, 'coin', 2)
    await click(p, 'coin', 2)
    await act(p, 'lever')
    await click(p, 'table', 'dumpling')
    await p.locator('.table-character').click()
    await click(p, 'table', 'water')
    await act(p, 'pour')
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('spielzeuge.devochka.v1')).day === 1)
    assert.equal((await book(p)).coins, 8)
    await go(p, 'album')
    await bounds(p)
    assert.equal(await p.locator('.stamp.owned').count(), 1)
    await go(p, 'games')
    await bounds(p)
    assert.equal(await p.locator('.job-card').count(), 4)
    await p.waitForTimeout(90)
    const utterances = await p.evaluate(() => window.spoken)
    assert(utterances.length && utterances.every(([tag]) => tag.startsWith(lang)))
    assert((await p.evaluate(() => window.notes)) > 0)
    await p.context().close()
    console.log(`OK catalog, shopping, serving, album, sound, ${lang}, ${width}×${height}`)
  }

  const p = await pageFor(1110, 830)
  await p.goto(`${base}/devochka/`)
  await click(p, 'add', 'dumpling')
  await click(p, 'add', 'water')
  await act(p, 'counter')
  await click(p, 'coin', 5)
  assert.equal(await p.locator('.tiny-money').count(), 0)
  await click(p, 'coin', 2)
  await act(p, 'undo')
  assert.equal(await p.locator('.tiny-money').count(), 0)
  await click(p, 'coin', 2)
  await click(p, 'coin', 2)
  await screenshot(p, 'rabbit-till')
  const lever = await point(p, '.register', 0.9, 0.35)
  await p.mouse.move(...lever)
  await p.mouse.down()
  await p.mouse.move(lever[0], lever[1] + 50, { steps: 6 })
  await p.mouse.up()
  await has(p, '.home-scene')
  assert.equal((await book(p)).coins, 8)
  const tongs = await point(p, '[data-table=dumpling]'),
    face = await point(p, '.table-character', 0.5, 0.63)
  await p.mouse.move(...tongs)
  await p.mouse.down()
  await p.mouse.move(...face, { steps: 12 })
  await p.mouse.up()
  assert.deepEqual((await book(p)).table, ['water'])
  await p.reload()
  const glass = await point(p, '[data-table=water]')
  await p.mouse.move(...glass)
  await p.mouse.down()
  await p.mouse.move(...face, { steps: 10 })
  await p.waitForTimeout(140)
  await p.mouse.up()
  assert.deepEqual((await book(p)).table, ['water'])
  await p.mouse.move(...glass)
  await p.mouse.down()
  await p.mouse.move(...face, { steps: 10 })
  await p.waitForTimeout(850)
  await p.mouse.up()
  assert.equal((await book(p)).day, 1)
  await act(p, 'next')
  await buy(p, ['chips', 'roll', 'water'], [5, 2])
  const bag = await point(p, '[data-table=chips]', 0.2, 0.45)
  await p.mouse.move(...bag)
  await p.mouse.down()
  await p.mouse.move(bag[0] + 48, bag[1], { steps: 7 })
  await p.mouse.up()
  assert.equal((await book(p)).chipsOpen, true)
  await p.reload()
  await click(p, 'table', 'chips')
  await act(p, 'mouth')
  await click(p, 'table', 'roll')
  await act(p, 'mouth')
  await click(p, 'table', 'water')
  await act(p, 'pour')
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('spielzeuge.devochka.v1')).table.length === 0)
  await p.reload()
  await click(p, 'table', 'cat')
  await click(p, 'seat', 'girl')
  assert.equal((await book(p)).day, 1)
  await click(p, 'seat', 'cat')
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('spielzeuge.devochka.v1')).day === 2)
  await go(p, 'album')
  await click(p, 'stamp', 1)
  await act(p, 'hang')
  await act(p, 'studio')
  await p.locator('[data-paint=curtains][data-value="2"]').click()
  await click(p, 'studio-tab', 'guests')
  await click(p, 'guest', 'friend')
  await p.locator('[data-style=eyes][data-value="2"]').click()
  await click(p, 'pet', 'cat')
  await act(p, 'studioDone')
  await screenshot(p, 'house')
  assert.equal((await book(p)).wall, 1)
  assert.equal((await book(p)).pet, 'cat')
  assert.equal((await book(p)).paint.curtains, 2)
  await go(p, 'shop')
  await click(p, 'add', 'roll')
  await act(p, 'earn')
  assert.equal((await book(p)).cart[0], 'roll')
  await click(p, 'job', 'orchard')
  const before = (await book(p)).coins
  for (let i = 0; i < 6; i++) {
    const wave = await p.locator('.play-scene').getAttribute('data-wave')
    const target = await p.locator('.falling[data-wanted=true]').evaluate(el => Number(el.style.getPropertyValue('--lane')))
    await click(p, 'lane', target)
    await p.waitForFunction(old => document.querySelector('.job-win') ||
      document.querySelector('.play-scene')?.dataset.wave !== old, wave)
  }
  await has(p, '.job-win')
  assert.equal((await book(p)).coins, before + 5)
  await go(p, 'games')
  // Record the visible flashes as they happen, including consecutive notes on
  // the same jar. A polling observer can miss the short dark gap between them.
  await p.evaluate(() => {
    let round = 0
    let last = ''
    window.jarCues = []
    new MutationObserver(() => {
      const current = Number.parseInt(document.querySelector('.tally b')?.textContent ?? '0', 10)
      if (current !== round) {
        round = current
        window.jarCues = []
      }
      const jar = document.querySelector('.jam-jar.lit')
      const note = jar?.getAttribute('data-jar') ?? ''
      if (note && note !== last && jar.getAttribute('aria-disabled') === 'true') window.jarCues.push(note)
      last = note
    }).observe(document.querySelector('#notebook'), {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    })
  })
  await click(p, 'job', 'jars')
  for (let round = 1; round <= 3; round++) {
    await p.waitForFunction(
      (n) =>
        document.querySelector('.tally b')?.textContent === n + ' / 3' &&
        document.querySelector('.jam-jar[aria-disabled=false]'),
      round
    )
    const sequence = await p.evaluate(() => window.jarCues)
    assert.equal(sequence.length, round + 1)
    for (const n of sequence) await click(p, 'jar', n)
  }
  await has(p, '.job-win')
  assert.equal((await book(p)).coins, before + 12)
  await go(p, 'shop')
  assert.deepEqual((await book(p)).cart, ['roll'])
  await act(p, 'mute')
  const n = await p.evaluate(() => [window.spoken.length, window.notes])
  await click(p, 'add', 'water')
  await p.waitForTimeout(90)
  assert.deepEqual(await p.evaluate(() => [window.spoken.length, window.notes]), n)
  await p.reload()
  assert.equal(await p.locator('[data-action=mute]').getAttribute('aria-pressed'), 'true')
  await act(p, 'mute')
  await p.locator('#language').selectOption('de')
  await act(p, 'wish')
  await p.locator('#language').selectOption('en')
  const mark = await p.evaluate(() => window.spoken.length)
  await act(p, 'wish')
  await p.waitForTimeout(110)
  assert((await p.evaluate((i) => window.spoken.slice(i), mark)).every(([lang]) => lang.startsWith('en')))
  const cancels = await p.evaluate(() => window.cancels)
  await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  assert((await p.evaluate(() => window.cancels)) > cancels)
  await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await p.locator('.catalog-link').click()
  await p.goBack()
  await has(p, '.shop-scene')
  await p.context().close()
  console.log('OK exact change, real gestures, resume, room, both wages, language and mute lifecycle')

  const touch = await pageFor(390, 844)
  await touch.goto(`${base}/devochka/`)
  await buy(touch, ['water'], [1])
  const start = await point(touch, '[data-table=water]')
  const end = await point(touch, '.table-character', 0.5, 0.62)
  const finger = await touch.context().newCDPSession(touch)
  const moveFinger = (type, coords) =>
    finger.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: coords ? [{ x: coords[0], y: coords[1], radiusX: 4, radiusY: 4, id: 1 }] : [],
    })
  await moveFinger('touchStart', start)
  await moveFinger('touchMove', end)
  await touch.waitForTimeout(850)
  await moveFinger('touchEnd')
  assert.deepEqual((await book(touch)).table, [])
  await touch.locator('[data-action=window]').tap()
  assert((await touch.locator('.window-message').innerText()).includes('зайчик'))
  await go(touch, 'games')
  await click(touch, 'job', 'jars')
  await touch.locator('#language').selectOption('de')
  await touch.locator('#language').selectOption('en')
  const changed = await touch.evaluate(() => window.spoken.length)
  await has(touch, '.jam-jar[aria-disabled=false]')
  await touch.waitForTimeout(100)
  const delayed = await touch.evaluate((i) => window.spoken.slice(i), changed)
  assert(delayed.some(([lang, text]) => lang.startsWith('en') && text === 'Your turn to play!'))
  assert(delayed.every(([lang]) => lang.startsWith('en')))
  await act(touch, 'replay')
  await go(touch, 'shop')
  const quiet = await touch.evaluate(() => window.notes)
  await touch.waitForTimeout(850)
  assert.equal(await touch.evaluate(() => window.notes), quiet)
  await touch.context().close()
  console.log('OK touchscreen drag and hold, window story, timed cues after language and navigation changes')

  const fallback = await pageFor(375, 780, () => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('storage unavailable')
      },
    })
    Object.defineProperty(window, 'speechSynthesis', { value: undefined })
    Object.defineProperty(window, 'AudioContext', { value: undefined })
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined })
  })
  await fallback.goto(`${base}/devochka/?lang=en`)
  await buy(fallback, ['water'], [1])
  await click(fallback, 'table', 'water')
  await act(fallback, 'pour')
  await has(fallback, '[data-action=next]')
  await act(fallback, 'next')
  await fallback.locator('#language').selectOption('de')
  await fallback.reload()
  assert.equal(await fallback.locator('html').getAttribute('lang'), 'de')
  await fallback.context().close()
  assert.deepEqual(errors, [])
  console.log('OK play without speech, Web Audio or storage; no browser exceptions')
} finally {
  await browser.close()
}
