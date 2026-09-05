import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.addInitScript(() => {
  window.spoken = []
  window.cancellations = 0
  const synth = window.speechSynthesis
  Object.defineProperty(synth, 'speak', {
    value: (utterance) => {
      if (utterance.text.trim())
        window.spoken.push({
          text: utterance.text,
          lang: utterance.lang,
          voice: utterance.voice?.lang,
        })
      setTimeout(() => utterance.onend?.(new Event('end')), 5)
    },
  })
  Object.defineProperty(synth, 'cancel', {
    value: () => {
      window.cancellations++
    },
  })
})
const act = (name) => page.locator(`[data-action="${name}"]`).first().click()
const speech = () => page.evaluate(() => window.spoken)
const clear = () =>
  page.evaluate(() => {
    window.spoken = []
  })
const heard = (text) =>
  page.waitForFunction(
    (text) => window.spoken.some((s) => s.text.includes(text)),
    text,
  )
async function checkWallpaperSpeech() {
  for (const expectedWall of [1, 2, 0]) {
    await clear()
    await act('wall')
    const caption = await page.locator('#message').innerText()
    await heard(caption)
    await page.waitForTimeout(200)
    assert.equal(
      await page.locator('.scene').getAttribute('data-wall'),
      String(expectedWall),
    )
    assert.deepEqual(
      (await speech()).map((s) => s.text),
      [caption],
      'Changing wallpaper speaks only the new caption once, never the previous button label',
    )
  }
}
try {
  await page.goto('http://localhost:5173/sobachka/?lang=ru')
  await heard('Привет! Давай дружить?')
  assert((await speech()).every((s) => s.lang === 'ru-RU'))
  await page.waitForTimeout(150)
  assert.deepEqual(
    (await speech()).map((s) => s.text),
    ['Привет! Давай дружить?'],
    'Only the welcome is automatic on load',
  )
  await checkWallpaperSpeech()
  await clear()
  await act('feed')
  await heard('Перетащи еду')
  assert.deepEqual(
    (await speech()).map((s) => s.text),
    ['Покормить', 'Перетащи еду к миске или просто нажми на неё.'],
    'A tap reads its action and caption, not the kitchen title or food options',
  )
  await act('food-1')
  await heard('Морковка')
  await heard('Ам-ням')
  await clear()
  await heard('Спасибо за угощение!')
  assert.deepEqual(
    (await speech()).map((s) => s.text),
    ['Спасибо за угощение!'],
    'Completed care reads only its caption, not counters or buttons',
  )
  await act('room')
  await clear()
  await act('pet')
  await heard('Я тебя тоже люблю!')
  await clear()
  await act('pet')
  await heard('Я тебя тоже люблю!')
  await act('sound')
  await clear()
  await act('toy')
  await page.waitForTimeout(150)
  assert.equal(
    (await speech()).length,
    0,
    'Mute applies to all automatic speech',
  )
  await act('help')
  await page.waitForTimeout(150)
  assert.equal((await speech()).length, 0, 'Help respects mute')
  await act('sound')
  await heard('Звук включён')
  for (const [lang, locale, welcome] of [
    ['de', 'de-DE', 'Hallo!'],
    ['en', 'en-GB', 'Hello!'],
    ['ru', 'ru-RU', 'Привет!'],
  ]) {
    await clear()
    await page.selectOption('#puppy-language', lang)
    await heard(welcome)
    assert(
      (await speech()).every((s) => s.lang === locale),
      `All phrases use ${locale}`,
    )
    await checkWallpaperSpeech()
  }
  await act('sleep')
  await heard('Тс-с')
  await act('games')
  await clear()
  await page.waitForTimeout(5800)
  assert(
    !(await speech()).some((s) => s.text.includes('Выспалась')),
    'Leaving cancels delayed narration',
  )
  await clear()
  await act('game-0')
  await heard('Нажми на мячик')
  assert.deepEqual(
    (await speech()).map((s) => s.text),
    ['Поймай мяч', 'Нажми на мячик — я побегу за ним!'],
    'No automatic reading of game controls or counters',
  )
  for (let i = 0; i < 5; i++) {
    await act('catch')
    await page.waitForTimeout(750)
  }
  await heard('У нас получилось!')
  await page.locator('[data-action="room"]').click()
  await page.locator('#message').click()
  await heard('Привет!')
  assert.deepEqual(errors, [])
  console.log(
    'PASS: greeting/caption-only automatic narration, action labels, timed feedback, repeated taps, mute/unmute, all locales, cancelled activity, mini-game win and tap-to-read. Browser speech calls verified; actual voice quality depends on installed voices.',
  )
} finally {
  await browser.close()
}
