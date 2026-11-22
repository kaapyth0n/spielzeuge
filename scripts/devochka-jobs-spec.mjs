// Watch the orders and solve each board from the visible tile ends, as a player would.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const shots = 'tmp/devochka/jobs'
mkdirSync(shots, { recursive: true })
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }
)
function solve(tiles, start, end) {
  const found = new Set()
  function follow(id, incoming) {
    if (!tiles[id] || found.has(id)) return null
    found.add(id)
    for (let turns = 0; turns < 4; turns++) {
      const ends = tiles[id].map((port) => (port + turns) % 4)
      if (!ends.includes(incoming)) continue
      const outward = ends.find((port) => port !== incoming)
      const here = [id, turns]
      if (id === end && outward === 1) return [here]
      if ((outward === 1 && id % 3 === 2) || (outward === 3 && id % 3 === 0)) continue
      const rest = follow(id + [-3, 1, 3, -1][outward], (outward + 2) % 4)
      if (rest) return [here, ...rest]
    }
    found.delete(id)
    return null
  }
  return follow(start, 3)
}
async function check([lang, width, height]) {
  const p = await browser.newPage({ viewport: { width, height }, hasTouch: width < 800 })
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  p.setDefaultTimeout(9000)
  const hit = async (selector) => {
    const el = p.locator(selector).first()
    if (width < 800) await el.tap()
    else await el.click()
  }
  const section = () => hit('nav [data-nav=games]')
  const play = (id) => hit(`[data-job=${id}]`)
  const phase = (id) => p.locator(`.play-scene[data-stage="${id}"]`).waitFor()
  const purse = () => p.evaluate(() => JSON.parse(localStorage.getItem('spielzeuge.devochka.v1'))?.coins ?? 12)
  const shot = async (tag) => {
    await p.evaluate(async () => {
      await document.fonts.ready
      window.scrollTo(0, 0)
    })
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await p.screenshot({ path: `${shots}/${tag}-${lang}.png`, fullPage: true })
  }
  try {
    await p.goto(`${base}/devochka/?lang=${lang}`)
    await section()
    assert.equal(await p.locator('.job-card').count(), 4)
    assert(
      await p.locator('.job-card').evaluateAll((cards) => cards.every((c) => c.scrollWidth <= c.clientWidth))
    )
    await play('orchard')
    let missed = false,
      wind = false
    for (let i = 0; i < 7; i++) {
      const wave = await p.locator('.play-scene').getAttribute('data-wave')
      const target = await p
        .locator('.falling[data-wanted=true]')
        .evaluate((el) => Number(el.style.getPropertyValue('--lane')))
      const lane = i === 0 ? (target + 1) % 3 : target
      wind ||= (await p.locator('.wind-flag').count()) > 0
      if (i === 3) await shot('orchard')
      await hit(`[data-lane="${lane}"]`)
      await p.waitForFunction(
        (n) => document.querySelector('.job-win') || document.querySelector('.play-scene')?.dataset.wave !== n,
        wave
      )
      if (i === 0) missed = (await p.locator('.fruit-progress .harvested').count()) === 0
    }
    assert(missed && wind)
    assert.equal(await purse(), 17)
    await section()
    await play('bakery')
    await hit('.baking-pan')
    await hit('.baking-pan')
    await phase('pale')
    // A burnt pancake gets a fresh try and a longer golden window.
    await phase('dark')
    for (let guest = 0; guest < 3; guest++) {
      await hit('.baking-pan')
      await phase('golden')
      if (guest === 0) await shot('bakery')
      if (width >= 800) {
        await p.locator('.baking-pan').focus()
        await p.keyboard.press('Enter')
      } else await hit('.baking-pan')
      await phase('topping')
      const order = await p.locator('.garnish-ticket').getAttribute('data-order')
      const index = ['honey', 'raspberry', 'blueberry'].indexOf(order)
      if (guest === 0) {
        await hit(`[data-game-action=top][data-index="${(index + 1) % 3}"]`)
        await phase('topping')
      }
      await hit(`[data-game-action=top][data-index="${index}"]`)
      if (guest !== 2) await phase('empty')
    }
    await p.locator('.job-win').waitFor()
    assert.equal(await purse(), 23)
    await section()
    await play('regatta')
    await hit('.launch-boat')
    await p.locator('.river-tile.snag').waitFor()
    for (let course = 1; course <= 3; course++) {
      await p.waitForFunction((n) => document.querySelector('.tally b')?.textContent === n + ' / 3', course)
      const board = await p.evaluate(() => {
        const tiles = {},
          cells = [...document.querySelectorAll('.river-tile')]
        for (const cell of cells)
          tiles[cell.dataset.index] = cell.querySelector('[data-ports]').dataset.ports.split(',').map(Number)
        return {
          tiles,
          start: Number(document.querySelector('.startDock').parentElement.dataset.index),
          end: Number(document.querySelector('.endDock').parentElement.dataset.index),
        }
      })
      const route = solve(board.tiles, board.start, board.end)
      assert(route, 'This illustrated river must have a path to the dock')
      for (const [id, turns] of route) {
        for (let turn = 0; turn < turns; turn++) {
          const selector = `[data-game-action=turn][data-index="${id}"]`
          if (width >= 800) {
            await p.locator(selector).focus()
            await p.keyboard.press('Space')
            assert.equal(await p.locator(selector).evaluate((el) => el === document.activeElement), true)
          } else await hit(selector)
        }
      }
      if (course === 2) await shot('river')
      await hit('.launch-boat')
    }
    await p.locator('.job-win').waitFor()
    assert.equal(await purse(), 31)
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert(!overflow)
    assert.deepEqual(errors, [])
    console.log(
      'PASS',
      lang,
      width + '×' + height,
      'two fruit varieties, wind, recovery, six catches, three orders, three river courses and one wage each'
    )
  } finally {
    await p.close()
  }
}
try {
  const cases = await Promise.allSettled(
    [
      ['ru', 1180, 820],
      ['de', 320, 680],
      ['en', 390, 844],
    ].map(check)
  )
  for (const c of cases) if (c.status === 'rejected') throw c.reason
} finally {
  await browser.close()
}
