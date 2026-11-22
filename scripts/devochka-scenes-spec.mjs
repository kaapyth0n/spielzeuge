// Play every shopping story in order, including the last hungry guest after a reload.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright-core'
import { FOOD, MEALS, T } from '../src/devochka-copy.ts'
import { MEAL_SCENES, starCounts } from '../src/devochka-scenes.ts'

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const key = 'spielzeuge.devochka.v1'
const stories = [
  ['window', ['girl']],
  ['picnic', ['girl', 'cat']],
  ['garden', ['girl']],
  ['kite', ['girl']],
  ['moonlight', ['girl']],
  ['visit', ['girl', 'bunny']],
  ['regatta', ['girl']],
  ['courtyard', ['girl', 'friend']],
]
const browser = await chromium.launch(process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' })

const book = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)
const action = (page, id) => page.locator(`[data-action="${id}"]`).first()
const foodButton = (page, id) => page.locator(`[data-table="${id}"]`)
const chair = (page, id) => page.locator(`[data-seat="${id}"]`)

async function shop(page, menu, lang) {
  await page.locator('.stall-character').click()
  assert.equal(await page.locator('.speech-slip').innerText(), menu.wish[lang])
  for (const item of menu.list) await page.locator(`[data-add="${item}"] .price-tag`).click()
  const before = (await book(page)).coins
  await action(page, 'checkout').click()
  const price = menu.list.reduce((sum, item) => sum + FOOD[item].price, 0)
  let due = price
  for (const coin of [5, 2, 1]) {
    while (due >= coin) {
      await page.locator(`[data-coin="${coin}"]`).click()
      due -= coin
    }
  }
  await page.locator('.note-bottom [data-action="lever"]').click()
  await page.locator('.meal-stage').waitFor()
  const paid = await book(page)
  assert.equal(paid.coins, before - price)
  assert.deepEqual(paid.table, menu.list)
  assert.deepEqual(paid.cart, [])
}

async function stage(page, story, who, lang) {
  const scene = page.locator('.meal-stage')
  assert.equal(await scene.getAttribute('data-scene'), story.id)
  assert.equal(await scene.locator('.scene-sign').innerText(), story.name[lang])
  assert((await page.locator('.serving-hint').innerText()).includes(story.arrival[lang]))
  assert.deepEqual(await scene.locator('[data-seat]').evaluateAll(els => els.map(el => el.dataset.seat)), who)
  const background = await scene.evaluate(async element => {
    await Promise.all([...element.querySelectorAll('img')].map(img => img.decode()))
    const src = getComputedStyle(element).backgroundImage.match(/url\("(.+?)"\)/)?.[1]
    if (!src) return null
    const img = new Image()
    img.src = src
    await img.decode()
    return new URL(src).pathname
  })
  if (story.background) assert.equal(background, story.background)
  else assert(await scene.evaluate(el => el.classList.contains('indoors')))
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
}

async function serveHuman(page, food, diner) {
  const remaining = (await book(page)).table.length
  await foodButton(page, food).click()
  if (food === 'chips') await action(page, 'cut').click()
  if (food === 'water') await page.locator(`[data-action="pour"][data-to="${diner}"]`).click()
  else await chair(page, diner).click()
  await page.waitForFunction(([key, previous]) => {
    return JSON.parse(localStorage.getItem(key)).table.length === previous - 1
  }, [key, remaining])
}

async function checkPicnicReload(page) {
  const before = await book(page)
  assert.deepEqual(before.table, [])
  assert.deepEqual(before.tasted, ['girl'])
  assert.equal(before.day, 1)
  assert.equal(before.result, null)
  await page.reload()
  await page.locator('[data-scene="picnic"]').waitFor()
  const after = await book(page)
  assert.deepEqual(after, before, 'Reload must preserve the paid picnic and its hungry cat')
  assert.deepEqual(await page.locator('[data-table]').evaluateAll(els => els.map(el => el.dataset.table)), ['cat'])
  assert(await chair(page, 'girl').isVisible())
  assert(await chair(page, 'cat').isVisible())
  await foodButton(page, 'cat').click()
  await chair(page, 'girl').click()
  assert.deepEqual(await book(page), before, 'The girl cannot take the cat’s fish')
}

async function explore(page, scene, lang, reducedMotion) {
  const discovery = action(page, 'window')
  assert.equal(await discovery.getAttribute('aria-label'), scene.discovery.label[lang])
  if (scene.id === 'moonlight') await action(page, 'mute').click()
  await discovery.click()
  assert.equal(await page.locator('.window-message').innerText(), scene.discovery.line[lang])
  if (scene.id === 'picnic') {
    assert.equal(await discovery.locator('.sketch').count(), 0, 'The basket is part of the drawing')
    assert(await page.locator('.picnic-purr').isVisible())
  }
  if (scene.id === 'moonlight') {
    const star = id => page.locator(`[data-star="${id}"]`)
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0)
    // Count in spatially shuffled order and tap the same star twice.
    for (const [id, total] of [[2,1], [2,1], [0,2], [1,3]]) {
      if (touch) await star(id).tap()
      else await star(id).click()
      assert.equal(await star(id).innerText(), String(total))
      assert.equal(await page.locator('[data-star][aria-pressed="true"]').count(), total)
      assert.equal(await page.locator('.window-message').innerText(), starCounts[total - 1][lang])
      await page.waitForFunction(([text,lang]) => window.testSpeech.some(
        u => u.text === text && u.lang.startsWith(lang)
      ), [starCounts[total - 1][lang], lang])
    }
    assert(await page.locator('.star-trail').isVisible())
    await action(page, 'countAgain').click()
    assert.equal(await page.locator('[data-star][aria-pressed="true"]').count(), 0)
    assert.equal(await page.locator('.star-trail').count(), 0)
    await action(page, 'mute').click()
    return
  }
  const moving = {window:'sun-hop', garden:'daisy-sway', kite:'leaf-in-the-wind', regatta:'boat-downstream'}
  if (moving[scene.id]) {
    const actual = await discovery.locator('.sketch').evaluate(svg => {
      const css = getComputedStyle(svg)
      return {name:css.animationName, transform:css.transform}
    })
    assert.equal(actual.name, reducedMotion ? 'none' : moving[scene.id])
    if (reducedMotion) assert.notEqual(actual.transform, 'none', 'The reduced-motion setting shows the outcome')
  }
  await discovery.click()
}

async function revisitPicnic(page, lang) {
  const picnic = MEALS[1]
  const stickersBefore = await page.locator('.stamp.owned').allTextContents()
  assert.equal(stickersBefore.length, 8)
  await page.locator('[data-stamp="1"]').click()
  await action(page, 'revisit').click()
  assert.equal(await page.locator('.prize-preview strong').innerText(), picnic.prize[lang])
  assert.equal((await page.locator('.prize-preview small').textContent()).trim(), T.collected[lang])
  await shop(page, picnic, lang)
  await stage(page, MEAL_SCENES[1], ['girl', 'cat'], lang)
  assert.equal(await page.locator('.paper-note h2').innerText(), picnic.name[lang])
  for (const food of picnic.list) await serveHuman(page, food, 'girl')
  await foodButton(page, 'cat').click()
  await chair(page, 'cat').click()

  const finished = await book(page)
  assert.equal(finished.day, 8, 'Replaying a picnic must preserve the completed album')
  assert.equal(finished.result, 1)
  assert.equal((await page.locator('.paper-note .note-label').textContent()).trim(), T.fromAlbum[lang])
  assert.equal(await page.locator('.paper-note h2').innerText(), MEAL_SCENES[1].name[lang])
  assert((await page.locator('.paper-note').innerText()).includes(MEAL_SCENES[1].farewell[lang]))
  assert.equal((await action(page, 'next').innerText()).trim(), T.another[lang])
  await action(page, 'next').click()
  assert.equal((await page.locator('.order-title').innerText()).trim(), MEALS[0].name[lang])
  await page.locator('.stall-character').click()
  assert.equal(await page.locator('.speech-slip').innerText(), MEALS[0].wish[lang])
  await page.locator('[data-nav="album"]').first().click()
  assert.deepEqual(await page.locator('.stamp.owned').allTextContents(), stickersBefore)
}

async function picnicPortrait(page, filename) {
  await page.evaluate(async () => {
    await document.fonts.ready
    window.scrollTo(0, 0)
  })
  await page.screenshot({ path: join(process.env.SHOT_DIR || tmpdir(), filename), fullPage: true, animations: 'disabled' })
}

async function playStories(lang, width, height, screenshotName) {
  const reducedMotion = lang === 'de'
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 600, reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  })
  try {
    // A full notebook's worth of lunch money isolates dining from the earning games.
    await context.addInitScript(k => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ coins: 100 }))
      localStorage.setItem('spielzeuge.devochka.muted', '1')
      window.testSpeech = []
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], addEventListener() {}, resume() {}, cancel() {},
        speak(u) {
          if (u.text.trim()) window.testSpeech.push({ text: u.text, lang: u.lang })
          u.onend?.()
        },
      } })
    }, key)
    const page = await context.newPage()
    page.setDefaultTimeout(7000)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('response', r => {
      if (r.url().includes('/devochka/') && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)
    })
    await page.goto(`${base}/devochka/?lang=${lang}`)
    assert.equal(await page.locator('html').getAttribute('lang'), lang)
    for (const [index, [id, diners]] of stories.entries()) {
      const menu = MEALS[index], scene = MEAL_SCENES[index]
      assert.equal(scene.id, id)
      await shop(page, menu, lang)
      await stage(page, scene, diners, lang)
      if (id === 'picnic' && screenshotName) await picnicPortrait(page, screenshotName)
      await explore(page, scene, lang, reducedMotion)

      const people = diners.filter(id => id === 'girl' || id === 'friend')
      for (const [i, food] of menu.list.entries()) await serveHuman(page, food, people[i % people.length])
      if (id === 'picnic') await checkPicnicReload(page)
      if (scene.guest) {
        await foodButton(page, scene.guest).click()
        await chair(page, scene.guest).click()
      }
      const finished = await book(page)
      assert.equal(finished.result, index)
      assert.equal(finished.day, index + 1)
      assert.deepEqual(new Set(finished.tasted), new Set(diners))
      assert.equal(await page.locator('.paper-note h3').innerText(), menu.prize[lang])
      assert((await page.locator('.paper-note').innerText()).includes(scene.farewell[lang]))
      assert.equal(await page.locator('.meal-stage').getAttribute('data-scene'), id)
      await page.locator('[data-nav="album"]').first().click()
      const stickers = await page.locator('.stamp.owned').evaluateAll(els => els.map(el => Number(el.dataset.stamp)))
      assert.deepEqual(stickers, Array.from({ length: index + 1 }, (_, i) => i))
      assert((await page.locator(`[data-stamp="${index}"]`).innerText()).includes(menu.prize[lang]))
      if (index < stories.length - 1) await page.locator('[data-nav="shop"]').first().click()
    }
    await revisitPicnic(page, lang)
    assert.deepEqual(errors, [])
    console.log(`OK ${lang} ${width}×${height}: 8 stories, 8 stickers, all diners, picnic bowl restored, album picnic replay`)
  } finally {
    await context.close()
  }
}

try {
  const runs = await Promise.allSettled([
    playStories('ru', 1200, 850, 'devochka-picnic-desktop.png'),
    playStories('de', 320, 700),
    playStories('en', 390, 844, 'devochka-picnic-mobile.png'),
  ])
  const errors = runs.filter(run => run.status === 'rejected').map(run => run.reason)
  if (errors.length) throw new AggregateError(errors, 'Story play-through failed')
} finally {
  await browser.close()
}
