import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const out = new URL('../tmp/', import.meta.url)
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function shot(name, viewport, fn) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    hasTouch: true,
  })
  await page.goto('http://localhost:5173/kuckuck/?lang=ru', { waitUntil: 'networkidle' })
  await fn(page)
  await page.screenshot({ path: new URL(`${name}.png`, out).pathname })
  await page.close()
}

await shot('phone-closed', { width: 390, height: 844 }, async (page) => {
  await page.waitForTimeout(500)
})

await shot('phone-open', { width: 390, height: 844 }, async (page) => {
  await page.waitForTimeout(1300)
  await page.click('#door')
  await page.waitForTimeout(1300)
})

for (const visitor of ['cat', 'dog', 'bird', 'duck', 'bunny', 'mouse', 'cow', 'bear', 'frog', 'capybara']) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
  })
  await page.goto(`http://localhost:5173/kuckuck/?lang=ru&visitor=${visitor}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(1300)
  await page.click('#door')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: new URL(`phone-${visitor}.png`, out).pathname })
  await page.close()
}

await shot('phone-parent', { width: 390, height: 844 }, async (page) => {
  const lamp = page.locator('#sconce')
  const box = await lamp.boundingBox()
  if (!box) throw new Error('no lamp')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(850)
  await page.mouse.up()
  await page.waitForTimeout(350)
})

await shot('tablet-open', { width: 1024, height: 768 }, async (page) => {
  await page.waitForTimeout(1300)
  await page.click('#door')
  await page.waitForTimeout(1300)
})

await browser.close()
console.log('wrote screenshots to tmp/')
