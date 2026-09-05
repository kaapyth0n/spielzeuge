import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
const base = process.env.BASE_URL || 'http://localhost:5174'
const browser = await chromium.launch({ channel: 'chrome' })
try {
  for (const [id, word] of [['hedgehog', 'ёжик'], ['owl', 'сова'], ['penguin', 'пингвин']]) {
    const page = await browser.newPage({ viewport: { width: 810, height: 1080 }, hasTouch: true })
    page.setDefaultTimeout(6000)
    await page.addInitScript(() => {
      window.__audible = []
      let unlocked = false
      let gesture = false
      let pending = false
      Object.defineProperty(speechSynthesis, 'pending', { get: () => pending })
      // A strict speech engine: a trusted tap unlocks speech; cancel ends the
      // session. Merely calling speak from a later timer does not make it audible.
      document.addEventListener('click', () => {
        gesture = true
        setTimeout(() => { gesture = false }, 0)
      }, true)
      speechSynthesis.cancel = () => { unlocked = false; pending = false }
      speechSynthesis.speak = u => {
        if (gesture) unlocked = true
        pending = !u.text.trim()
        if (unlocked && u.text.trim()) window.__audible.push(u.text)
      }
    })
    await page.goto(`${base}/kuckuck/?visitor=${id}&lang=ru`)
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'waiting')
    await page.locator('#door').tap()
    await page.waitForFunction(word => window.__audible.includes(word), word)
    // Repeated taps must not keep postponing the animal's name forever.
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    await page.waitForTimeout(950)
    await page.evaluate(() => { window.__audible = [] })
    for (let i = 0; i < 3; i++) {
      await page.locator('.toy').tap()
      await page.waitForTimeout(950)
    }
    assert.ok((await page.evaluate(() => window.__audible)).includes(word), 'name heard during repeated taps')
    assert.ok((await page.evaluate(() => window.__audible)).every(text => text === word))
    await page.close()
    console.log(`PASS: ${id}, audible speech session survives reveal and repeated taps`)
  }
} finally { await browser.close() }
