import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = process.env.PUPPY_TEST_URL || 'http://localhost:5184'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})
page.setDefaultTimeout(12000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await page.addInitScript(() => {
  window.spoken = []
  Object.defineProperty(speechSynthesis, 'speak', {
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(new Event('end')), 5)
    },
  })
})
const button = (action) => page.locator(`[data-action="${action}"]`).first()
const act = (action) => button(action).click()
const saved = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('spielzeuge.sobachka.v1')),
  )
const heard = (text) =>
  page.waitForFunction(
    (text) => window.spoken.some((s) => s.text.includes(text)),
    text,
  )
try {
  await mkdir('tmp', { recursive: true })
  await page.goto(`${base}/sobachka/?lang=ru`)
  await page.evaluate(() =>
    localStorage.setItem(
      'spielzeuge.sobachka.v1',
      JSON.stringify({
        hearts: 6,
        wall: 2,
        care: { feed: 2, walk: 2, sleep: 1, ball: 1 },
        sound: true,
      }),
    ),
  )
  await page.reload()
  assert.equal((await saved()).hearts, 6)
  assert.equal((await saved()).care.toilet, 0)
  assert.equal(await page.locator('.care-actions button').count(), 5)
  await button('toilet').tap()
  await heard('Вот мой лоток')
  assert.equal(
    await page.locator('#screen-title').innerText(),
    'Собачий туалет',
  )
  assert.equal(await page.locator('.potty-tray').count(), 1)
  await page.screenshot({ path: 'tmp/toilet-phone-empty.png', fullPage: true })

  await button('potty-pee').tap()
  await heard('Пи-пи')
  assert(await button('potty-pee').isDisabled())
  assert(await button('potty-poop').isDisabled())
  await page.waitForSelector('.potty-result.pee')
  assert.equal((await saved()).hearts, 6, 'Heart comes after cleanup')
  await page.screenshot({ path: 'tmp/toilet-phone-pee.png', fullPage: true })
  await button('clean-potty').dblclick()
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('spielzeuge.sobachka.v1')).hearts === 7,
  )
  await heard('Всё чисто!')
  assert.equal((await saved()).care.toilet, 1)
  assert.equal(await page.locator('.potty-result').count(), 0)

  await act('potty-poop')
  await page.waitForSelector('.potty-result.poop')
  await page.screenshot({ path: 'tmp/toilet-phone-poop.png', fullPage: true })
  await act('clean-potty')
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('spielzeuge.sobachka.v1')).hearts === 8,
  )
  assert.equal((await saved()).care.toilet, 2)

  // Both potty and cleanup timers are cancelled by leaving the room.
  await act('potty-pee')
  await act('room')
  await page.waitForTimeout(2800)
  assert.equal((await saved()).hearts, 8)
  await act('toilet')
  await act('potty-poop')
  await page.waitForSelector('.potty-result.poop')
  await act('clean-potty')
  await act('room')
  await page.waitForTimeout(1200)
  assert.equal((await saved()).hearts, 8)
  await page.reload()
  assert.equal((await saved()).care.toilet, 2)
  assert(
    await button('toilet').evaluate((node) =>
      node.classList.contains('has-care'),
    ),
  )

  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    )
    const controls = await page
      .locator('.care-actions button')
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          width: n.getBoundingClientRect().width,
          height: n.getBoundingClientRect().height,
          right: n.getBoundingClientRect().right,
        })),
      )
    assert(
      controls.every(
        (b) => b.width >= 44 && b.height >= 44 && b.right <= width,
      ),
      'All five care buttons remain tappable',
    )
    await page.screenshot({
      path: `tmp/toilet-home-${width}.png`,
      fullPage: true,
    })
    await act('toilet')
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    )
    await page.screenshot({
      path: `tmp/toilet-room-${width}.png`,
      fullPage: true,
    })
    await act('room')
  }
  for (const [lang, title, locale] of [
    ['de', 'Das Hundeklo', 'de-DE'],
    ['en', 'Puppy’s bathroom', 'en-GB'],
    ['ru', 'Собачий туалет', 'ru-RU'],
  ]) {
    await page.selectOption('#puppy-language', lang)
    await page.waitForTimeout(100)
    await page.evaluate(() => {
      window.spoken = []
    })
    await act('toilet')
    await page.waitForTimeout(120)
    assert.equal(await page.locator('#screen-title').innerText(), title)
    const spoken = await page.evaluate(() => window.spoken)
    assert.equal(spoken.length, 2, 'Only tapped action and caption are spoken')
    assert(spoken.every((s) => s.lang === locale))
    await act('room')
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: pee, poop, one heart after cleanup, interruption, legacy-save migration, persistence, touch, 44px targets, three viewports, and RU/DE/EN caption-only narration.',
  )
} finally {
  await browser.close()
}
