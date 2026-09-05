import assert from 'node:assert/strict'
import { chromium, webkit, devices } from 'playwright-core'

const base = process.env.BASE_URL || 'http://localhost:5174'
const engine = process.env.ENGINE || 'chromium'
const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'webkit' ? {} : { channel: 'chrome' })
try {
  for (const mode of (process.env.MODE ? [process.env.MODE] : ['resume', 'fetch', 'decode', 'wake', 'normal'])) {
    const page = await browser.newPage({ ...devices['iPad (gen 7)'] })
    page.setDefaultTimeout(5000)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(mode => {
      const pending = () => new Promise(() => {})
      window.__resumeCalls = 0
      window.__sounds = 0
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (...args) { window.__sounds++; return start.apply(this, args) }
      if (mode === 'resume') {
        Object.defineProperty(AudioContext.prototype, 'state', { get: () => 'suspended' })
        AudioContext.prototype.resume = function () { window.__resumeCalls++; return pending() }
      }
      if (mode === 'decode') AudioContext.prototype.decodeAudioData = pending
      if (mode === 'fetch') {
        const fetchOriginal = window.fetch
        window.fetch = (...args) => String(args[0]).includes('/sounds/') ? pending() : fetchOriginal(...args)
      }
      if (mode === 'wake') Object.defineProperty(navigator, 'wakeLock', { value: { request: pending } })
    }, mode)
    await page.goto(`${base}/kuckuck/?visitor=cat&lang=ru`)
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'waiting')
    await page.locator('#door').tap()
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    if (mode === 'normal') await page.waitForFunction(() => window.__sounds > 0)
    assert.equal(await page.locator('html').getAttribute('lang'), 'ru')
    if (mode === 'resume') assert.ok(await page.evaluate(() => window.__resumeCalls > 0))
    await page.locator('.toy').tap()
    assert.equal(await page.locator('.world').getAttribute('data-phase'), 'open', 'tap visitor does not also close door')
    await page.locator('.threshold').tap({ position: { x: 30, y: 8 } })
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'closed')
    // Keyboard input must not wait on the same stalled APIs either.
    await page.locator('#door').focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'waiting')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine}: ${mode}, first iPad tap, visitor, close, keyboard; no language workaround`)
    await page.close()
  }
} finally { await browser.close() }
