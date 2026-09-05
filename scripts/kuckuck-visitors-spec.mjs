import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL || 'http://localhost:5174'
const guests = {
  fox: ['лиса', 'Fuchs', 'fox'], elephant: ['слон', 'Elefant', 'elephant'],
  owl: ['сова', 'Eule', 'owl'], hedgehog: ['ёжик', 'Igel', 'hedgehog'], penguin: ['пингвин', 'Pinguin', 'penguin'],
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
async function openGuest(id, lang, viewport = { width: 390, height: 844 }, unavailable = false) {
  const page = await browser.newPage({ viewport, hasTouch: true })
  page.setDefaultTimeout(8000)
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(({ unavailable }) => {
    window.__spoken = []
    window.__effects = 0
    speechSynthesis.speak = u => { if (u.text.trim()) window.__spoken.push([u.text, u.lang]) }
    if (unavailable) {
      window.AudioContext = undefined
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('unavailable') } })
      Object.defineProperty(window, 'speechSynthesis', { value: undefined })
      // Simulate the API being absent rather than a partially implemented browser.
      delete window.speechSynthesis
    } else {
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (...args) { window.__effects++; return start.apply(this, args) }
    }
  }, { unavailable })
  await page.goto(`${base}/kuckuck/?visitor=${id}&lang=${lang}`)
  await page.waitForFunction(() => ['waiting', 'knocking'].includes(document.querySelector('.world').dataset.phase))
  await page.locator('#door').click({ force: true })
  await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
  return page
}
try {
  for (const [index, lang] of ['ru', 'de', 'en'].entries()) {
    await Promise.all(Object.entries(guests).map(async ([id, names]) => {
      const viewport = lang === 'de' ? { width: 844, height: 390 } : lang === 'en' ? { width: 1280, height: 900 } : { width: 390, height: 844 }
      const page = await openGuest(id, lang, viewport)
      await page.waitForFunction(word => window.__spoken.some(([text]) => text === word), names[index])
      assert.equal(await page.locator('#visitor-slot').getAttribute('aria-label'), names[index])
      assert.ok(await page.evaluate(() => window.__effects > 0), 'visitor sound played')
      const box = await page.locator('.toy').boundingBox()
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, `${id} fits ${JSON.stringify(box)}`)
      await page.waitForTimeout(950)
      await page.locator('.toy').click({ force: true })
      await page.waitForFunction(word => window.__spoken.filter(([text]) => text === word).length >= 2, names[index])
      if (lang === 'ru') await page.screenshot({ path: `/tmp/kuckuck-${id}.png` })
      await page.close()
    }))
    console.log(`PASS: five visitors, ${lang}, speech, sound, repeat greeting, viewport`)
  }
  const page = await openGuest('owl', 'ru')
  await page.locator('#kuckuck-language').click()
  await page.waitForFunction(() => window.__spoken.some(([text, lang]) => text === 'Eule' && lang.startsWith('de')))
  assert.ok(!(await page.evaluate(() => window.__spoken)).some(([text]) => text === 'сова'), 'old delayed word cancelled')
  await page.locator('#kuckuck-sound').click()
  const counts = await page.evaluate(() => [window.__spoken.length, window.__effects])
  await page.locator('.toy').click({ force: true })
  await page.waitForTimeout(1400)
  assert.deepEqual(await page.evaluate(() => [window.__spoken.length, window.__effects]), counts)
  await page.reload()
  assert.equal(await page.locator('#kuckuck-sound').getAttribute('aria-pressed'), 'true')
  await page.goto(`${base}/kuckuck/`)
  assert.equal(await page.locator('html').getAttribute('lang'), 'de')
  await page.close()
  const fallback = await openGuest('elephant', 'en', { width: 320, height: 568 }, true)
  assert.ok(await fallback.locator('.toy').count(), 'works without audio, speech or storage')
  await fallback.close()
  assert.deepEqual(errors, [])
  console.log('PASS: language race, mute, saved preferences, unavailable APIs; no browser errors')
} finally { await browser.close() }
