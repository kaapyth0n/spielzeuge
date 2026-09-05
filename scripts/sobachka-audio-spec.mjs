import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const base = process.env.PUPPY_TEST_URL || 'http://localhost:5184'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(12000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.addInitScript(() => {
  Object.defineProperty(speechSynthesis, 'speak', {
    value: (u) => setTimeout(() => u.onend?.(new Event('end')), 5),
  })
})
const act = (action) =>
  page.locator(`[data-action="${action}"]`).first().click()
const requested = async (effect) =>
  assert(
    (await page.evaluate(() => window.effects)).includes(effect),
    `${effect} is connected to its action`,
  )
const listen = (ms) =>
  page.evaluate(async (ms) => {
    const engine = window.testAudio
    const analyser = engine.ctx.createAnalyser()
    analyser.fftSize = 2048
    engine.master.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    let peak = 0
    const until = performance.now() + ms
    while (performance.now() < until) {
      analyser.getFloatTimeDomainData(samples)
      for (const value of samples) peak = Math.max(peak, Math.abs(value))
      await new Promise((resolve) => setTimeout(resolve, 15))
    }
    engine.master.disconnect(analyser)
    analyser.disconnect()
    return peak
  }, ms)
try {
  await page.goto(`${base}/sobachka/?lang=ru`, { waitUntil: 'networkidle' })
  const pcm = await page.evaluate(async () => {
    const { PUPPY_EFFECTS, synthesizePuppyEffect } =
      await import('/src/sobachka-audio.ts')
    const result = []
    for (const effect of PUPPY_EFFECTS) {
      const ctx = new OfflineAudioContext(1, 48000 * 6, 48000)
      synthesizePuppyEffect(ctx, ctx.destination, effect, 0)
      const buffer = await ctx.startRendering()
      const samples = buffer.getChannelData(0)
      let peak = 0,
        energy = 0,
        last = 0
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]))
        energy += samples[i] ** 2
        if (Math.abs(samples[i]) > 0.001) last = i / 48000
      }
      result.push({ effect, peak, energy, last })
    }
    return result
  })
  for (const sound of pcm) {
    assert(
      sound.peak > 0.04 && sound.peak < 0.95,
      `${sound.effect}: audible unclipped PCM (${sound.peak})`,
    )
    assert(sound.energy > 1, `${sound.effect}: non-silent signal`)
    assert(sound.last < 5, `${sound.effect}: bounded duration`)
  }
  assert(
    new Set(pcm.map((s) => Math.round(s.energy * 1000))).size === pcm.length,
    'Effects produce distinct waveforms',
  )
  console.log(
    `PASS: ${pcm.length} distinct effects rendered to real PCM, no clipping or silent effects.`,
  )
  await page.evaluate(async () => {
    const { PuppyAudio } = await import('/src/sobachka-audio.ts')
    window.effects = []
    const play = PuppyAudio.prototype.play
    PuppyAudio.prototype.play = function (effect) {
      window.effects.push(effect)
      window.testAudio = this
      return play.call(this, effect)
    }
  })
  await act('ball')
  await requested('ball')
  assert(
    (await listen(250)) > 0.02,
    'The actual live audio graph produces sound after a tap',
  )
  await act('sound')
  await page.waitForTimeout(100)
  assert(
    (await listen(1000)) < 0.0001,
    'Mute stops active and all scheduled bounces',
  )
  await act('pet')
  assert((await listen(250)) < 0.0001, 'Muted actions remain silent')
  await act('sound')
  await page.waitForTimeout(150)
  await page.waitForSelector('.scene:not(.playing)')
  await act('ball')
  await act('games')
  await page.waitForTimeout(200)
  assert(
    (await listen(1000)) < 0.0001,
    'Leaving the room cancels future bounces',
  )
  await act('room')
  await act('pet')
  await requested('pet')
  await page.waitForFunction(
    () =>
      window.testAudio.samples.has('pet') &&
      window.testAudio.samples.has('squeak'),
  )
  await act('toy')
  await requested('squeak')
  assert(
    (await listen(200)) > 0.01,
    'Decoded squeaky-toy sample has audible output',
  )
  await act('wall')
  await requested('wallpaper')
  await act('walk')
  await requested('walk')
  await act('flower-0')
  await requested('flower')
  await act('room')
  await act('feed')
  await act('food-0')
  await requested('eat')
  assert((await listen(350)) > 0.015, 'Feeding produces audible crunches')
  await page.waitForSelector('.scene:not(.eating)')
  await requested('reward')
  await act('room')
  await act('sleep')
  await requested('sleep')
  await page.waitForTimeout(100)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  assert(
    (await listen(1000)) < 0.0001,
    'Hiding the page stops sleepy breathing too',
  )
  await page.evaluate(() => {
    delete document.hidden
  })
  await act('sleep')
  await act('toilet')
  await act('potty-pee')
  await requested('pee')
  await page.waitForSelector('.potty-result.pee')
  await act('clean-potty')
  await requested('clean')
  await page.waitForSelector('[data-action="potty-poop"]')
  await act('potty-poop')
  await requested('poop')
  await act('room')
  await act('games')
  await act('game-0')
  for (let i = 0; i < 5; i++) {
    await act('catch')
    await page.waitForTimeout(700)
  }
  await requested('fetch')
  await requested('win')
  await page.waitForSelector('.win-scene')
  assert.deepEqual(errors, [])
  console.log(
    'PASS: action sounds, licensed sample decoding, live output, mute, navigation cancellation, background silence, and gameplay rewards.',
  )
} finally {
  await browser.close()
}
