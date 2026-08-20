import { chromium } from 'playwright-core'

const LANG_NAMES = new Set(['русский', 'Deutsch', 'English'])

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

await page.addInitScript(() => {
  window.__spoken = []
  const original = window.speechSynthesis.speak.bind(window.speechSynthesis)
  window.speechSynthesis.speak = (utterance) => {
    const text = String(utterance?.text ?? '').trim()
    if (text) window.__spoken.push(text)
    try {
      original(utterance)
    } catch {
      // headless may have no voices
    }
  }
})

await page.goto('http://localhost:5173/?lang=ru&visitor=cat', {
  waitUntil: 'networkidle',
})
await page.waitForTimeout(1400)

const spoken = () => page.evaluate(() => window.__spoken.slice())
const phase = () => page.locator('.world').getAttribute('data-phase')
const failIfLangName = (label, log) => {
  const bad = log.filter((text) => LANG_NAMES.has(text))
  if (bad.length) {
    throw new Error(`${label}: unexpected language name ${JSON.stringify(log)}`)
  }
}

await page.locator('#door').click({ force: true })
await page.waitForTimeout(1600)
failIfLangName('after opening the door', await spoken())

const openPhase = await phase()
if (openPhase !== 'open' && openPhase !== 'opening') {
  throw new Error(`expected open doorway, got ${openPhase}`)
}

await page.locator('.wallpaper').click({ force: true, position: { x: 24, y: 360 } })
await page.waitForTimeout(300)
failIfLangName('hallway tap with guest visible', await spoken())
if ((await phase()) !== 'open') {
  throw new Error('tapping the hall must not close the door')
}

await page.locator('.threshold').click({ force: true, position: { x: 40, y: 8 } })
await page.waitForTimeout(400)
failIfLangName('tap on the door frame with guest visible', await spoken())

const afterClose = await phase()
if (afterClose === 'open') {
  throw new Error('tap on the door frame should close the door')
}

await page.waitForTimeout(2500)
await page.locator('#door').click({ force: true })
await page.waitForTimeout(400)
if (!(await page.locator('.toy').count())) {
  await page.locator('#door').click({ force: true })
}
await page.locator('.toy').waitFor({ timeout: 3000 })
failIfLangName('second open', await spoken())

await page.locator('.toy').click({ force: true })
await page.waitForTimeout(400)
failIfLangName('tap on the guest', await spoken())

await page.locator('#lamp').click({ force: true })
await page.waitForTimeout(600)
const afterLamp = await spoken()
if (afterLamp.at(-1) && LANG_NAMES.has(afterLamp.at(-1))) {
  throw new Error(`lamp with guest said language name: ${JSON.stringify(afterLamp)}`)
}

await page.locator('.threshold').click({ force: true, position: { x: 40, y: 8 } })
await page.waitForTimeout(2000)
await page.locator('#lamp').click({ force: true })
await page.waitForTimeout(500)
const afterClosedLamp = await spoken()
if (!LANG_NAMES.has(afterClosedLamp.at(-1) ?? '')) {
  throw new Error(
    `lamp with closed door should say the language name, got ${JSON.stringify(afterClosedLamp)}`,
  )
}

console.log('spoken log', afterClosedLamp)
console.log('tap spec ok')
await browser.close()
