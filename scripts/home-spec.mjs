import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true })
const out = new URL('../tmp/', import.meta.url)
await mkdir(out, { recursive: true })
try {
  for (const [name, viewport] of [
    ['mobile', { width: 390, height: 844 }],
    ['small-mobile', { width: 320, height: 568 }],
    ['landscape', { width: 844, height: 390 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const page = await browser.newPage({ viewport, hasTouch: true, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/kuckuck/?lang=ru&visitor=cat`)
    const home = page.locator('#home')
    assert.equal(await home.getAttribute('aria-label'), 'Все игрушки')
    assert.equal(await home.getAttribute('href'), '/')
    const tile = await home.boundingBox()
    const door = await page.locator('#doorway').boundingBox()
    assert.ok(tile && door && tile.width >= 56 && tile.height >= 56)
    assert.ok(tile.x >= 12 && tile.y >= 12 && tile.x + tile.width <= viewport.width - 12)
    assert.ok(tile.x + tile.width <= door.x || door.x + door.width <= tile.x || tile.y + tile.height <= door.y || door.y + door.height <= tile.y, `${name}: home covers doorway`)
    assert.equal(await home.evaluate(el => getComputedStyle(el).transitionDuration), '0s')
    await page.waitForFunction(() => ['waiting', 'knocking'].includes(document.querySelector('.world').dataset.phase))
    await page.locator('#door').tap()
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    if (name === 'mobile' || name === 'desktop') await page.screenshot({ path: new URL(`home-${name}.png`, out).pathname })
    await home.tap()
    await page.waitForURL(`${base}/`)
    assert.ok(await page.locator('a[href="./kuckuck/"]').count())
    await page.locator('a[href="./kuckuck/"]').click()
    await page.waitForFunction(() => ['waiting', 'knocking'].includes(document.querySelector('.world').dataset.phase))
    await page.locator('#door').tap()
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    // Enter must activate the home link, not the window's door shortcut.
    await page.locator('#home').evaluate((el) => el.focus({ focusVisible: true }))
    assert.equal(await page.locator('#home').evaluate(el => el.matches(':focus-visible')), true)
    await page.keyboard.press('Enter')
    await page.waitForURL(`${base}/`)
    await page.goBack()
    await page.waitForFunction(() => ['waiting', 'knocking'].includes(document.querySelector('.world').dataset.phase))
    await page.locator('#door').tap()
    await page.waitForFunction(() => document.querySelector('.world').dataset.phase === 'open')
    // Home remains reachable even above the parent sheet.
    await page.keyboard.press('l')
    await page.locator('#home').tap()
    await page.waitForURL(`${base}/`)
    assert.deepEqual(errors, [])
    console.log(`${name}: geometry, single tap, keyboard, re-entry/history, sheet PASS`)
    await page.close()
  }
  const page = await browser.newPage()
  await page.goto(`${base}/kuckuck/?lang=de`)
  assert.equal(await page.locator('#home').getAttribute('aria-label'), 'Alle Spiele')
  await page.goto(`${base}/kuckuck/?lang=en`)
  assert.equal(await page.locator('#home').getAttribute('aria-label'), 'All toys')
  // Keep the document alive to prove cleanup, not merely browser-unload behavior.
  const result = await page.evaluate(async () => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    const { Game } = await import('/src/game.ts')
    const { ToyAudio } = await import('/src/audio.ts')
    const { ToySpeech } = await import('/src/speech.ts')
    let audioDestroyed = 0, speechDestroyed = 0, unlocked = 0, bubbled = 0
    const destroyAudio = ToyAudio.prototype.destroy
    const destroySpeech = ToySpeech.prototype.destroy
    ToyAudio.prototype.destroy = function () { audioDestroyed++; destroyAudio.call(this) }
    ToySpeech.prototype.destroy = function () { speechDestroyed++; destroySpeech.call(this) }
    // Simulate an audio unlock that finishes after the child leaves.
    let resolveUnlock
    ToyAudio.prototype.unlock = () => { unlocked++; return new Promise(resolve => { resolveUnlock = resolve }) }
    const pending = new Set()
    const set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window)
    window.setTimeout = (fn, ms) => { const id = set(() => { pending.delete(id); fn() }, ms); pending.add(id); return id }
    window.clearTimeout = id => { pending.delete(id); clear(id) }
    const game = new Game(document.querySelector('#app'))
    game.start()
    const world = document.querySelector('.world')
    world.addEventListener('pointerdown', () => bubbled++)
    const door = document.querySelector('#door')
    door.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
    door.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const home = document.querySelector('#home')
    home.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
    home.addEventListener('click', event => event.preventDefault(), { once: true })
    home.click()
    game.destroy() // idempotent
    resolveUnlock()
    await Promise.resolve()
    await new Promise(resolve => set(resolve, 1500))
    document.querySelector('#door').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    return { audioDestroyed, speechDestroyed, unlocked, bubbled, pending: pending.size, phase: world.dataset.phase }
  })
  assert.deepEqual(result, { audioDestroyed: 1, speechDestroyed: 1, unlocked: 1, bubbled: 2, pending: 0, phase: 'boot' })
  console.log('RU/DE/EN labels; teardown, pending unlock race, no home pointer propagation, removed handlers and timers PASS')
  await page.close()
} finally {
  await browser.close()
}
