import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const base = process.env.PUPPY_TEST_URL || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
process.on('SIGTERM', async () => {
  await browser.close()
  process.exit(1)
})
const page = await browser.newPage({
  viewport: { width: 1280, height: 960 },
  hasTouch: true,
})
page.setDefaultTimeout(12000)
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
const action = (name) => page.locator(`[data-action="${name}"]`).first()
const click = (name) => action(name).click()
const hearts = () =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('spielzeuge.sobachka.v1')).hearts,
  )
const waitHearts = (n) =>
  page.waitForFunction(
    (n) =>
      JSON.parse(localStorage.getItem('spielzeuge.sobachka.v1')).hearts === n,
    n,
  )
const home = async () => {
  if (!(await action('room').count())) await click('games')
  await click('room')
}
async function waitReady() {
  await page.waitForFunction(
    () =>
      !document.querySelector('.scene.eating, .scene.playing, .scene.sleeping'),
  )
}
async function overflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    'No horizontal overflow',
  )
}
try {
  await mkdir('tmp', { recursive: true })
  await page.goto(`${base}/?lang=ru`)
  await page.locator('a[href="./sobachka/"]').click()
  assert.equal(await page.title(), 'Собачка · Spielzeuge')
  assert.equal(await hearts(), 0)
  await click('sound')
  await click('games')
  assert.equal(await page.locator('.game-card:disabled').count(), 2)
  await home()

  await click('wall')
  assert.equal(await page.locator('.scene').getAttribute('data-wall'), '1')
  await page.reload()
  assert.equal(await page.locator('.scene').getAttribute('data-wall'), '1')
  assert.equal(await action('sound').getAttribute('aria-pressed'), 'false')
  await click('toy')
  assert.match(await page.locator('#message').innerText(), /Пи-пи/)
  await action('pet').focus()
  await page.keyboard.press('Space')
  assert.match(await page.locator('#message').innerText(), /люблю/)

  console.log(
    'PASS: catalog, locks, wallpaper persistence, keyboard petting and squeaky toy',
  )

  // Leaving mid-meal cancels the completion callback.
  await click('feed')
  await click('food-0')
  await home()
  await page.waitForTimeout(2000)
  assert.equal(await hearts(), 0)
  await click('feed')
  const food = await action('food-1').boundingBox()
  const bowl = await page.locator('#food-bowl').boundingBox()
  await page.mouse.move(food.x + food.width / 2, food.y + food.height / 2)
  await page.mouse.down()
  await page.mouse.move(bowl.x + bowl.width / 2, bowl.y + bowl.height / 2, {
    steps: 15,
  })
  await page.mouse.up()
  await waitHearts(1)
  await waitReady()
  assert.equal(await page.locator('.food-ghost').count(), 0)
  await home()

  await click('walk')
  for (let i = 0; i < 5; i++) await click(`flower-${i}`)
  await waitHearts(2)
  assert.equal(await page.locator('.flower-pick:disabled').count(), 5)
  await home()
  await click('ball')
  await waitHearts(3)
  await click('games')
  assert.equal(await page.locator('.game-card:disabled').count(), 1)
  await home()

  // Waking early is gentle and gives no premature heart.
  await click('sleep')
  await click('sleep')
  await page.waitForTimeout(5700)
  assert.equal(await hearts(), 3)
  await click('sleep')
  await waitHearts(4)
  await click('feed')
  await click('food-2')
  await waitHearts(5)
  await home()
  await click('ball')
  await waitHearts(6)
  await click('games')
  assert.equal(await page.locator('.game-card:disabled').count(), 0)
  await page.screenshot({ path: 'tmp/sobachka-games.png', fullPage: true })

  console.log(
    'PASS: all care activities, interruptions, drag feeding and 6-heart unlock',
  )
  await click('game-0')
  for (let i = 0; i < 5; i++) {
    await click('catch')
    if (i < 4)
      await page.waitForFunction(
        () => !document.querySelector('[data-action="catch"]').disabled,
      )
  }
  await page.waitForSelector('.win-scene')
  assert.equal(await hearts(), 6, 'Mini-games do not replace care')
  await click('games')
  await click('game-1')
  await click('pairs-6')
  assert.equal(await page.locator('.memory-card').count(), 12)
  await click('pairs-3')
  // Learn the face of each card through clicks, then match remembered pairs.
  const known = new Map()
  for (let i = 0; i < 6; i += 2) {
    await click(`card-${i}`)
    known.set(i, await action(`card-${i}`).getAttribute('aria-label'))
    await click(`card-${i + 1}`)
    known.set(i + 1, await action(`card-${i + 1}`).getAttribute('aria-label'))
    await page.waitForTimeout(1200)
  }
  for (const face of new Set(known.values())) {
    if (await page.locator('.win-scene').count()) break
    const pair = [...known]
      .filter(([, value]) => value === face)
      .map(([index]) => index)
    if (await action(`card-${pair[0]}`).isDisabled()) continue
    await click(`card-${pair[0]}`)
    await click(`card-${pair[1]}`)
    await page.waitForTimeout(700)
  }
  await page.waitForSelector('.win-scene')
  await click('games')
  await click('game-2')
  for (let i = 0; i < 5; i++) {
    const target = await page
      .locator('.shape-target svg')
      .evaluate((el) => el.innerHTML)
    const choices = await page.locator('.shape-choice').evaluateAll((nodes) =>
      nodes.map((node) => ({
        action: node.dataset.action,
        svg: node.querySelector('svg').innerHTML,
      })),
    )
    if (i === 0) {
      await click(choices.find((c) => c.svg !== target).action)
      assert.equal(await page.locator('.round-dots .complete').count(), 0)
    }
    await click(choices.find((c) => c.svg === target).action)
    await page.waitForTimeout(700)
  }
  await page.waitForSelector('.win-scene')
  await click('again')
  assert.equal(await page.locator('.round-dots .complete').count(), 0)
  await home()
  await page.reload()
  assert.equal(await hearts(), 6)
  await click('games')
  assert.equal(await page.locator('.game-card:disabled').count(), 0)
  await home()
  await page.screenshot({ path: 'tmp/sobachka-desktop.png', fullPage: true })

  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height })
    await overflow()
    await page.screenshot({ path: `tmp/sobachka-${width}.png`, fullPage: true })
    await click('games')
    await overflow()
    await home()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await action('feed').tap()
  await action('food-0').tap()
  await waitHearts(7)
  await home()
  for (const [value, title] of [
    ['de', 'Hündchen'],
    ['en', 'Little Puppy'],
    ['ru', 'Собачка'],
  ]) {
    await page.selectOption('#puppy-language', value)
    assert.equal(await page.locator('h1').innerText(), title)
    await overflow()
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: catalog, care, drag/touch feeding, interruption, all three mini-games, unlocks, reload persistence, languages, four viewports; no browser errors.',
  )
} finally {
  await browser.close()
}
