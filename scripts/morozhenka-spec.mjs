// Browser checks for Мороженка. Needs a running dev server (npm run dev).
// MOROZHENKA_BASE_URL selects the site (default http://localhost:5173), CHROMIUM_PATH a browser binary.
// A fake microphone plays synthesised child vowels, so voice steering is tested end to end.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = (process.env.MOROZHENKA_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const URL = `${BASE}/morozhenka/`
const KEY = 'spielzeuge.morozhenka.v1'
mkdirSync('tmp', { recursive: true })

/** Child-like vowel (formant synthesis) with silent gaps, as 16-bit mono WAV. */
function vowelWav(vowel, path) {
  const formants = { a: [1030, 1640, 3400, 4300], i: [400, 3050, 3800, 4700], o: [680, 1120, 3300, 4300] }[vowel]
  const bands = [110, 140, 220, 280]
  const rate = 48000
  const f0 = 270
  const sound = Math.round(rate * 2.6)
  const gap = Math.round(rate * 0.9)
  const total = gap + sound + gap
  const samples = new Float32Array(total)
  const harmonics = []
  for (let h = 1; h * f0 < 7000; h++) {
    const f = h * f0
    let gain = 1 / h
    formants.forEach((fc, k) => (gain *= (fc * fc) / Math.sqrt((fc * fc - f * f) ** 2 + (bands[k] * f) ** 2)))
    harmonics.push([h, gain, (h * 1.7) % (2 * Math.PI)])
  }
  let peak = 0
  for (let i = 0; i < sound; i++) {
    const t = i / rate
    const wobble = 1 + 0.012 * Math.sin(2 * Math.PI * 5 * t)
    let v = 0
    for (const [h, gain, phase] of harmonics) v += gain * Math.sin(2 * Math.PI * h * f0 * wobble * t + phase)
    samples[gap + i] = v
    peak = Math.max(peak, Math.abs(v))
  }
  let seed = 7
  const data = Buffer.alloc(44 + total * 2)
  for (let i = 0; i < total; i++) {
    const edge = Math.min(1, (i - gap) / 2400, (gap + sound - i) / 2400)
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const noise = (seed / 0x7fffffff - 0.5) * 0.002
    const v = (i >= gap && i < gap + sound ? (samples[i] / peak) * 0.35 * Math.max(0, edge) : 0) + noise
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2)
  }
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + total * 2, 4)
  data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(rate, 24)
  data.writeUInt32LE(rate * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(total * 2, 40)
  writeFileSync(path, data)
  return resolve(path)
}

const launch = (args = []) =>
  chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }),
    headless: true,
    args,
  })

const recorder = () => {
  window.spoken = []
  window.effects = 0
  Object.defineProperty(speechSynthesis, 'speak', {
    value: (u) => {
      if (u.text.trim()) window.spoken.push({ text: u.text, lang: u.lang })
      setTimeout(() => u.onend?.(), 5)
    },
  })
  Object.defineProperty(speechSynthesis, 'cancel', { value: () => {} })
  for (const Node of [OscillatorNode, AudioBufferSourceNode]) {
    const start = Node.prototype.start
    Node.prototype.start = function (...args) {
      window.effects++
      return start.apply(this, args)
    }
  }
}

const state = (page) => page.evaluate(() => window.__morozhenka.state())
const reset = (page) => page.evaluate(() => ((window.spoken = []), (window.effects = 0)))
// Narration waits ~60 ms after a cancel before speaking (Safari), so give it a moment.
const spoken = async (page) => {
  await page.waitForTimeout(150)
  return page.evaluate(() => window.spoken)
}
async function until(page, check, what, timeout = 8000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    last = await state(page)
    if (check(last)) return last
    await page.waitForTimeout(60)
  }
  throw new Error(`Timed out: ${what}. Last state: ${JSON.stringify({ ...last, save: undefined })}`)
}
async function hold(page, dir, ms) {
  const box = await page.locator(`.mz-dir-${dir}`).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}
async function holdUntil(page, dir, check, what) {
  const box = await page.locator(`.mz-dir-${dir}`).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  try {
    return await until(page, check, what, 12000)
  } finally {
    await page.mouse.up()
  }
}
async function seed(page, save) {
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [KEY, save])
}
const baseSave = (extra = {}) => ({ sound: true, control: 'buttons', flavor: 'mint', unlocked: 1, rounds: {}, ...extra })

async function localized(page, lang) {
  assert.equal(await page.locator('html').getAttribute('lang'), lang)
  if (lang === 'ru') return
  const text = await page.locator('body').innerText()
  assert.ok(!/[А-Яа-яЁё]/.test(text), `Untranslated UI (${lang}): ${text.match(/[^\n]*[А-Яа-яЁё][^\n]*/g)}`)
  const labels = await page.locator('[aria-label]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')).join(' | '))
  assert.ok(!/[А-Яа-яЁё]/.test(labels), `Untranslated labels (${lang}): ${labels}`)
}

async function fits(page, name) {
  await page.waitForTimeout(250)
  const report = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect()
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      vw: innerWidth,
      vh: innerHeight,
      stage: box('.mz-stage')?.toJSON(),
      pad: box('.mz-pad')?.toJSON(),
      dirs: [...document.querySelectorAll('.mz-dir')].map((b) => b.getBoundingClientRect().toJSON()),
    }
  })
  assert.equal(report.overflow, false, `${name}: horizontal overflow`)
  for (const [part, rect] of [['stage', report.stage], ['pad', report.pad]]) {
    assert.ok(rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= report.vh + 1 && rect.right <= report.vw + 1, `${name}: ${part} off screen ${JSON.stringify(rect)} in ${report.vw}×${report.vh}`)
  }
  assert.ok(report.stage.width >= 220, `${name}: stage too small (${report.stage.width})`)
  for (const d of report.dirs) assert.ok(d.width >= 44 && d.height >= 44, `${name}: letter button below 44px`)
  await page.screenshot({ path: `tmp/morozhenka-${name}.png` })
}

const errors = []
const browser = await launch()
try {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 } })
  await context.addInitScript(recorder)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  page.on('pageerror', (error) => errors.push(error.message))

  // Catalog card leads to the game.
  await page.goto(`${BASE}/?lang=ru`)
  assert.equal(await page.locator('[data-i18n="morozhenka-name"]').innerText(), 'Мороженка')
  assert.ok(await page.locator('#catalog-morozhenka svg').count())
  await page.evaluate((key) => localStorage.removeItem(key), KEY)
  await page.locator('a[href="./morozhenka/"]').click()
  await page.waitForURL(/morozhenka/)
  await page.locator('.mz-title').waitFor()
  await page.waitForTimeout(250)
  assert.ok((await spoken(page)).some((s) => s.text.includes('Мороженка')), 'welcome is narrated')
  await page.screenshot({ path: 'tmp/morozhenka-title.png' })

  // Flavor, control mode and play with buttons.
  await reset(page)
  await page.locator('.mz-flavor [data-action="flavor-next"]').click()
  assert.equal((await state(page)).save.flavor, 'strawberry')
  assert.ok((await spoken(page)).some((s) => s.text.includes('Клубничное')))
  assert.ok((await page.evaluate(() => window.effects)) > 0, 'flavor change has a sound')
  await page.locator('.mz-flavor [data-action="flavor-prev"]').click()
  await page.locator('[data-action="control-buttons"]').click()
  assert.equal((await state(page)).save.control, 'buttons')
  await reset(page)
  await page.locator('[data-action="play"]').click()
  await until(page, (s) => s.screen === 'play' && s.round === 1, 'round 1 opens')
  await page.waitForTimeout(100)
  const hint = await spoken(page)
  assert.ok(hint.some((s) => s.text.includes('Раунд 1') && /(Скажи|Нажми) А /.test(s.text)), 'round hint names the letter')
  assert.ok(hint.every((s) => !/[«»„“”]/.test(s.text)), 'no quote marks reach the voice (Milena reads them aloud)')
  await until(page, (s) => s.phase === 'ready', 'intro ends')
  await page.waitForTimeout(200)
  const start = await state(page)
  // Fly a little to see the fire, then continue to the cone.
  const box = await page.locator('.mz-dir-up').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  assert.ok(await page.locator('.mz-dir-up.is-hot').count(), 'held letter lights up')
  await page.screenshot({ path: 'tmp/morozhenka-flying.png' })
  const flying = await state(page)
  assert.ok(flying.scoop.y < start.scoop.y - 60, `«А» moves up: ${start.scoop.y} → ${flying.scoop.y}`)
  assert.ok(Math.abs(flying.scoop.x - start.scoop.x) < 3, 'straight up')
  await reset(page)
  const won = await until(page, (s) => s.phase === 'won', 'reaches the cone')
  await page.mouse.up()
  assert.equal(won.cherries, 1, 'cherry on the way')
  await page.locator('.mz-win').waitFor()
  await page.screenshot({ path: 'tmp/morozhenka-win.png' })
  const winSpeech = await spoken(page)
  assert.ok(winSpeech.some((s) => s.text.includes('Ура')), 'win is narrated')
  assert.ok(winSpeech.some((s) => s.text.includes('Вишенок: 1 из 1')), 'cherries are narrated')
  assert.equal((await state(page)).save.unlocked, 2)
  assert.deepEqual((await state(page)).save.rounds[1], { cherries: 1, flavor: 'mint' })

  // Round 2: crash into the ceiling, then come back to the start.
  await reset(page)
  await page.locator('.mz-win [data-action="next"]').click()
  await until(page, (s) => s.round === 2 && s.phase === 'ready', 'round 2 ready')
  const start2 = await state(page)
  await holdUntil(page, 'up', (s) => s.phase === 'crashed', 'bumps into the wall')
  await page.waitForTimeout(250)
  await page.screenshot({ path: 'tmp/morozhenka-crash.png' })
  assert.ok((await spoken(page)).some((s) => /Шлёп|Бум|Плюх/.test(s.text)), 'crash is narrated')
  const back = await until(page, (s) => s.phase === 'ready', 'respawns')
  assert.deepEqual(back.scoop, start2.scoop, 'back at the start')

  // Keyboard: Russian letter «и» steers right like the button.
  const key = (type) => page.evaluate((t) => document.body.dispatchEvent(new KeyboardEvent(t, { key: 'и', bubbles: true })), type)
  await key('keydown')
  await page.waitForTimeout(600)
  await key('keyup')
  const right = await state(page)
  assert.ok(right.scoop.x > start2.scoop.x + 40, `«И» moves right: ${start2.scoop.x} → ${right.scoop.x}`)
  await page.keyboard.press('r')
  await until(page, (s) => s.phase !== 'flying' && s.scoop.x === start2.scoop.x, 'restart with R')

  // Rounds overview: done, open and locked tiles; surprise maps later.
  await page.locator('.mz-hud [data-action="rounds"]').click()
  assert.equal(await page.locator('.mz-tile.is-done').count(), 1)
  assert.equal(await page.locator('.mz-tile.is-open').count(), 1)
  assert.ok(await page.locator('[data-action="round-3"]').isDisabled())
  assert.ok(await page.locator('.mz-tile-surprise').isDisabled())
  await page.screenshot({ path: 'tmp/morozhenka-rounds.png' })

  // A later save: every round open, surprise maps and a round with sleepy stones.
  await seed(page, baseSave({ unlocked: 13, surpriseNext: 13, rounds: { 1: { cherries: 1 }, 2: { cherries: 1 }, 3: { cherries: 2 } } }))
  await page.reload()
  await page.locator('[data-action="rounds"]').first().click()
  assert.equal(await page.locator('.mz-tile:not(:disabled)').count(), 13)
  await page.locator('[data-action="round-12"]').click()
  await until(page, (s) => s.round === 12 && s.phase === 'ready', 'round 12')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'tmp/morozhenka-round12.png' })
  await page.locator('.mz-hud [data-action="rounds"]').click()
  await page.locator('.mz-tile-surprise').click()
  await until(page, (s) => s.round === 13, 'first surprise map')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'tmp/morozhenka-surprise.png' })

  // Teach screen without a microphone falls back gracefully.
  await page.locator('.mz-hud [data-action="rounds"]').click()
  await page.locator('[data-action="title"]').click()
  await page.locator('.mz-title [data-action="teach"]').click()
  await page.locator('.mz-teach').waitFor()
  await page.locator('[data-action="letter-right"]').click()
  assert.equal((await state(page)).save.letters.right, 'e', 'tap cycles the letter')
  assert.equal(await page.locator('[data-action="letter-right"]').innerText(), 'Э')
  await page.locator('[data-action="letter-right"]').click()
  await page.locator('[data-action="letter-right"]').click()
  await page.locator('[data-action="letter-right"]').click()
  await page.locator('[data-action="letter-right"]').click()
  const cycled = (await state(page)).save.letters
  assert.equal(cycled.right, 'i', 'five taps come back to «И»')
  assert.equal(new Set(Object.values(cycled)).size, 4, 'letters swap places and stay unique')
  await seed(page, { ...(await state(page)).save, letters: { up: 'a', right: 'i', left: 'o', down: 'u' } })
  await page.reload()
  await page.locator('.mz-title [data-action="teach"]').click()
  await page.screenshot({ path: 'tmp/morozhenka-teach.png' })

  // All three languages: UI, labels and speech.
  for (const lang of ['de', 'en', 'ru']) {
    await reset(page)
    await page.selectOption('#mz-language', lang)
    await page.waitForTimeout(80)
    await localized(page, lang)
    const locale = { ru: 'ru-RU', de: 'de-DE', en: 'en-GB' }[lang]
    const said = await spoken(page)
    assert.ok(said.length && said.every((s) => s.lang === locale), `speech in ${lang}: ${JSON.stringify(said)}`)
    await page.locator('[data-action="title"]').click()
    await localized(page, lang)
    await page.locator('[data-action="rounds"]').first().click()
    await localized(page, lang)
    await page.locator('[data-action="round-5"]').click()
    await until(page, (s) => s.round === 5, `round 5 in ${lang}`)
    await localized(page, lang)
    await page.waitForTimeout(80)
    const roundSpeech = await spoken(page)
    assert.ok(roundSpeech.every((s) => s.lang === locale && (lang === 'ru' || !/[А-Яа-яЁё]/.test(s.text))), `round speech ${lang}`)
    assert.ok(roundSpeech.every((s) => !/[«»„“”]/.test(s.text)), `no quote marks in ${lang} speech`)
    await page.screenshot({ path: `tmp/morozhenka-round5-${lang}.png` })
    await page.locator('.mz-hud [data-action="rounds"]').click()
    await page.locator('[data-action="title"]').click()
    await page.locator('.mz-title [data-action="teach"]').click()
    await localized(page, lang)
  }
  await page.goto(`${BASE}/`)
  assert.equal(await page.locator('[data-i18n="morozhenka-name"]').innerText(), 'Мороженка')
  await page.goto(`${BASE}/?lang=en`)
  assert.equal(await page.locator('[data-i18n="morozhenka-name"]').innerText(), 'Ice Cream')
  await page.goto(`${BASE}/?lang=de`)
  assert.equal(await page.locator('[data-i18n="morozhenka-name"]').innerText(), 'Eiskugel')
  await page.goto(`${URL}?lang=ru`)

  // Mute silences speech and effects, and is remembered.
  await page.locator('#mz-sound').click()
  await reset(page)
  await page.locator('[data-action="play"]').click()
  await until(page, (s) => s.phase === 'ready', 'muted round ready')
  await hold(page, 'up', 400)
  await page.waitForTimeout(150)
  assert.deepEqual(await spoken(page), [], 'muted: no speech')
  assert.equal(await page.evaluate(() => window.effects), 0, 'muted: no effects')
  await page.reload()
  assert.equal(await page.locator('#mz-sound').getAttribute('aria-pressed'), 'false')
  await reset(page)
  await page.locator('#mz-sound').click()
  assert.ok((await spoken(page)).some((s) => s.text.includes('Звук включён')))

  // Layouts: phone, small phone, tablet portrait and landscape, phone landscape.
  await seed(page, baseSave({ unlocked: 13, surpriseNext: 13 }))
  for (const [name, width, height] of [
    ['phone', 390, 844],
    ['small-phone', 360, 640],
    ['ipad-portrait', 768, 1024],
    ['ipad-landscape', 1024, 768],
    ['phone-landscape', 844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto(URL)
    await page.locator('[data-action="rounds"]').first().click()
    await page.locator('[data-action="round-7"]').click()
    await until(page, (s) => s.phase === 'ready', `${name} ready`)
    await fits(page, name)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(URL)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'title fits a phone')
  await page.screenshot({ path: 'tmp/morozhenka-title-phone.png', fullPage: true })
  await page.locator('.mz-title [data-action="teach"]').click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'teach fits a phone')
  await page.screenshot({ path: 'tmp/morozhenka-teach-phone.png', fullPage: true })
  await context.close()
} finally {
  await browser.close()
}

// Voice: a fake microphone sings vowels at the game.
async function voiceRun(vowel, prepare) {
  const wav = vowelWav(vowel, `tmp/morozhenka-voice-${vowel}.wav`)
  const b = await launch([
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
    '--autoplay-policy=no-user-gesture-required',
  ])
  try {
    const context = await b.newContext({ viewport: { width: 1024, height: 768 } })
    await context.grantPermissions(['microphone'], { origin: BASE })
    await context.addInitScript(recorder)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(URL)
    await prepare(page)
    return await page.evaluate(() => window.__morozhenka.state())
  } finally {
    await b.close()
  }
}

await voiceRun('a', async (page) => {
  await seed(page, baseSave({ control: 'voice' }))
  await page.reload()
  await page.locator('[data-action="play"]').click()
  const start = await until(page, (s) => s.phase === 'ready' || s.phase === 'flying', 'voice round ready')
  await until(page, (s) => s.voice === 'on', 'microphone starts')
  const heard = await until(page, (s) => s.heard === 'a', 'hears «А»', 9000)
  assert.equal(heard.heard, 'a')
  const up = await until(page, (s) => s.scoop.y < start.scoop.y - 150 || s.phase === 'won', '«А» lifts the scoop', 9000)
  assert.ok(Math.abs(up.scoop.x - start.scoop.x) < 5, 'voice «А» goes straight up')
  await page.screenshot({ path: 'tmp/morozhenka-voice-a.png' })
})

await voiceRun('i', async (page) => {
  await seed(page, baseSave({ control: 'voice', unlocked: 2, rounds: { 1: { cherries: 1 } } }))
  await page.reload()
  await page.locator('[data-action="rounds"]').first().click()
  await page.locator('[data-action="round-2"]').click()
  const start = await until(page, (s) => s.round === 2 && s.phase !== 'intro', 'round 2 by voice')
  await until(page, (s) => s.heard === 'i', 'hears «И»', 9000)
  const moved = await until(page, (s) => s.scoop.x > start.scoop.x + 150 || s.phase === 'won', '«И» moves right', 9000)
  assert.ok(Math.abs(moved.scoop.y - start.scoop.y) < 5, 'voice «И» goes straight right')
})

const taught = await voiceRun('o', async (page) => {
  await seed(page, baseSave({ control: 'voice' }))
  await page.reload()
  await page.locator('.mz-title [data-action="teach"]').click()
  await page.locator('[data-action="learn-left"]').click()
  await until(page, (s) => Boolean(s.save.voice.o), 'learns «О» from the voice', 12000)
  await page.waitForTimeout(1100)
  await until(page, (s) => s.save.voice.o && true, 'still learned')
  await page.screenshot({ path: 'tmp/morozhenka-teach-voice.png' })
})
assert.equal(taught.save.voice.o.length, 9, 'voice fingerprint saved')

assert.deepEqual(errors, [])
console.log(
  'PASS: catalog card, title, flavors, buttons + keyboard flight, cherries, cone win, crash + respawn, progress, rounds, surprise map, sleepy stones, letter picker, RU/DE/EN UI + labels + speech, mute persistence, 5 layouts, fake-microphone «А» up, «И» right and teaching «О». Screenshots in tmp/.',
)
