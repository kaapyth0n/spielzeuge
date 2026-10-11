import { describe, expect, it } from 'vitest'
import { BACKGROUNDS } from './loshadka-items.ts'
import {
  MEADOW_GROUND,
  MEADOW_VIEWBOX,
  MOUND_APPLE,
  MOUND_TOP_Y,
  MOUND_VIEWBOX,
  UI_ICON_NAMES,
  backgroundIcon,
  backgroundSvg,
  giftSvg,
  meadowSvg,
  moundSvg,
  starSvg,
  uiIcon,
} from './loshadka-scenes.ts'

// vitest serves .css imports empty, so read the stylesheet from disk (no @types/node here)
const fsModule = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as { readFileSync: (path: URL, encoding: 'utf8') => string }
const css = readFileSync(new URL('./loshadka-scenes.css', import.meta.url), 'utf8')

/** Balanced tags, one root <svg>; throws with a useful message otherwise. */
function assertWellFormed(svg: string): void {
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  const stack: string[] = []
  let roots = 0
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
  let m: RegExpExecArray | null
  let consumed = 0
  while ((m = re.exec(svg))) {
    const between = svg.slice(consumed, m.index)
    expect(between.includes('<'), `stray "<" before ${m[0].slice(0, 40)}`).toBe(false)
    consumed = m.index + m[0].length
    const [, closing, tag, , selfClosing] = m
    if (closing) {
      expect(stack.pop(), `unexpected </${tag}>`).toBe(tag)
    } else if (!selfClosing) {
      if (stack.length === 0) roots++
      stack.push(tag)
    } else if (stack.length === 0) {
      roots++
    }
  }
  expect(stack, 'unclosed tags').toEqual([])
  expect(roots).toBe(1)
  expect(svg).not.toMatch(/undefined|NaN|null|Infinity|\[object/)
}

function ids(svg: string): string[] {
  return [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
}

/** Ids are unique, carry the prefix, and every url(#…) points to one of them. */
function assertIds(svg: string, prefix: string): void {
  const list = ids(svg)
  expect(new Set(list).size).toBe(list.length)
  for (const id of list) expect(id.startsWith(`${prefix}-`), id).toBe(true)
  for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(list, `missing #${ref}`).toContain(ref)
}

function assertIsolated(make: (prefix: string) => string): void {
  const a = ids(make('one'))
  const b = new Set(ids(make('two')))
  expect(a.some((id) => b.has(id))).toBe(false)
}

/** Every element with this class carries the drift variables, with frame 0 inside the loop. */
function assertTravel(svg: string, cls: string): number {
  const re = new RegExp(`class="${cls}" style="([^"]+)"`, 'g')
  let count = 0
  for (const [, style] of svg.matchAll(re)) {
    const v = (name: string) => Number(new RegExp(`--${name}:(-?[\\d.]+)`).exec(style)?.[1])
    const from = v('from')
    const to = v('to')
    const t = v('t')
    const d = v('d')
    expect(Number.isFinite(from) && Number.isFinite(to) && t > 0).toBe(true)
    expect(Math.sign(from) * Math.sign(to)).toBeLessThanOrEqual(0)
    expect(d).toBeLessThanOrEqual(0)
    expect(d).toBeGreaterThanOrEqual(-t - 0.1)
    count++
  }
  return count
}

describe('stage backgrounds', () => {
  it('renders every background, full-bleed and well-formed', () => {
    for (const { id } of BACKGROUNDS) {
      const svg = backgroundSvg(id, `bg-${id}`)
      assertWellFormed(svg)
      assertIds(svg, `bg-${id}`)
      expect(svg).toContain('preserveAspectRatio="xMidYMid slice"')
      expect(svg).toContain(`lh-sc-bg-${id}`)
      expect(svg).toMatch(/^<svg class="lh-sc /)
      assertIsolated((p) => backgroundSvg(id, p))
    }
  })

  it('is deterministic', () => {
    for (const { id } of BACKGROUNDS) expect(backgroundSvg(id, 'x')).toBe(backgroundSvg(id, 'x'))
  })

  it("draws Matryona's floating hearts with their own timing", () => {
    const svg = backgroundSvg('hearts', 'h')
    const hearts = [...svg.matchAll(/class="lh-float" style="([^"]+)"/g)].map((m) => m[1])
    expect(hearts.length).toBeGreaterThanOrEqual(24)
    for (const style of hearts) {
      expect(style).toMatch(/--d:-?[\d.]+s/)
      expect(style).toMatch(/--x:[\d.]+px/)
    }
    expect(new Set(hearts.map((s) => /--d:(-?[\d.]+)/.exec(s)?.[1])).size).toBeGreaterThan(hearts.length / 2)
    expect(assertTravel(svg, 'lh-float')).toBe(hearts.length)
  })

  it('twinkles stars at night and drifts clouds by day', () => {
    expect(backgroundSvg('night', 'n').match(/class="lh-twinkle"/g)?.length).toBeGreaterThanOrEqual(10)
    for (const id of ['sky', 'meadow', 'sea', 'castle', 'rainbow', 'night']) {
      expect(assertTravel(backgroundSvg(id, 'c'), 'lh-sc-drift'), id).toBeGreaterThanOrEqual(2)
    }
    expect(backgroundSvg('castle', 'c')).toContain('lh-sc-flag')
    expect(backgroundSvg('sea', 's')).toContain('lh-sc-wave')
  })

  it('falls back to hearts for an unknown id', () => {
    const svg = backgroundSvg('nope', 'u')
    assertWellFormed(svg)
    expect(svg).toContain('lh-sc-bg-hearts')
  })

  it('cleans odd prefixes so ids and urls stay valid', () => {
    const svg = backgroundSvg('night', 'a b"c<d')
    assertWellFormed(svg)
    assertIds(svg, 'a-b-c-d')
  })
})

describe('background thumbnails', () => {
  it('renders a round 100 × 100 icon for every background', () => {
    for (const { id } of BACKGROUNDS) {
      const svg = backgroundIcon(id, `i-${id}`)
      assertWellFormed(svg)
      assertIds(svg, `i-${id}`)
      expect(svg).toContain('viewBox="0 0 100 100"')
      expect(svg).toContain('clip-path=')
      assertIsolated((p) => backgroundIcon(id, p))
    }
    expect(backgroundIcon('nope', 'z')).toBe(backgroundIcon('hearts', 'z'))
  })

  it('gives every background its own picture', () => {
    const pictures = BACKGROUNDS.map(({ id }) => backgroundIcon(id, 'same'))
    expect(new Set(pictures).size).toBe(BACKGROUNDS.length)
  })
})

describe('mound', () => {
  it('has the apple as a tap zone with a pivot', () => {
    const svg = moundSvg('m')
    assertWellFormed(svg)
    assertIds(svg, 'm')
    assertIsolated(moundSvg)
    expect(svg).toMatch(/<g class="lh-apple" data-zone="apple" style="transform-origin:[\d.]+px [\d.]+px">/)
    expect(svg).toContain(`viewBox="0 0 ${MOUND_VIEWBOX.width} ${MOUND_VIEWBOX.height}"`)
  })

  it('documents a top surface the hooves can stand on', () => {
    expect(MOUND_TOP_Y).toBeGreaterThan(0)
    expect(MOUND_TOP_Y).toBeLessThan(MOUND_VIEWBOX.height / 2)
    expect(MOUND_APPLE.y).toBeGreaterThan(MOUND_TOP_Y)
    expect(MOUND_APPLE.y).toBeLessThan(MOUND_VIEWBOX.height)
    expect(MOUND_APPLE.x).toBeGreaterThan(0)
    expect(MOUND_APPLE.x).toBeLessThan(MOUND_VIEWBOX.width)
    expect(moundSvg('m')).toContain(`transform-origin:${MOUND_APPLE.x}px ${MOUND_APPLE.y}px`)
  })
})

describe('stable meadow', () => {
  it('renders the meadow with butterflies and drifting clouds', () => {
    const svg = meadowSvg('s')
    assertWellFormed(svg)
    assertIds(svg, 's')
    assertIsolated(meadowSvg)
    expect(svg).toContain(`viewBox="0 0 ${MEADOW_VIEWBOX.width} ${MEADOW_VIEWBOX.height}"`)
    expect(svg).toContain('preserveAspectRatio="xMidYMax slice"')
    expect(svg.match(/class="lh-flutter"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(assertTravel(svg, 'lh-sc-drift')).toBeGreaterThanOrEqual(2)
  })

  it('leaves a walkable band in the lower part', () => {
    expect(MEADOW_GROUND.top).toBeGreaterThan(0.4)
    expect(MEADOW_GROUND.bottom).toBeLessThanOrEqual(1)
    expect(MEADOW_GROUND.bottom - MEADOW_GROUND.top).toBeGreaterThanOrEqual(0.35)
  })
})

describe('gift and star', () => {
  it('wraps a gift with a lid that can open', () => {
    const svg = giftSvg('g')
    assertWellFormed(svg)
    assertIds(svg, 'g')
    assertIsolated((p) => giftSvg(p))
    expect(svg).toMatch(/<g class="lh-gift-lid" style="transform-origin:[\d.]+px [\d.]+px">/)
    expect(svg).toMatch(/<g class="lh-gift-body" style="transform-origin:[\d.]+px [\d.]+px">/)
  })

  it('takes the paper colour and survives a bad one', () => {
    expect(giftSvg('g', '#3d9bff')).not.toBe(giftSvg('g'))
    expect(giftSvg('g', '#3d9bff')).toContain('#')
    const bad = giftSvg('g', 'not-a-colour')
    assertWellFormed(bad)
    expect(bad).toBe(giftSvg('g'))
  })

  it('draws filled and empty stars', () => {
    const full = starSvg(true, 'a')
    const empty = starSvg(false, 'b')
    for (const svg of [full, empty]) assertWellFormed(svg)
    assertIds(full, 'a')
    assertIsolated((p) => starSvg(true, p))
    expect(full).toContain('is-filled')
    expect(empty).toContain('is-empty')
    expect(full).not.toBe(empty)
  })
})

describe('ui icons', () => {
  it('renders every icon as a 24 × 24 currentColor line icon', () => {
    expect(UI_ICON_NAMES.length).toBe(12)
    for (const name of UI_ICON_NAMES) {
      const svg = uiIcon(name)
      assertWellFormed(svg)
      expect(svg).toContain('viewBox="0 0 24 24"')
      expect(svg).toContain('stroke="currentColor"')
      expect(svg).toContain('stroke-width="2"')
      expect(svg).toContain('stroke-linecap="round"')
      expect(svg).not.toMatch(/#[0-9a-f]{3,6}/i)
      expect(ids(svg)).toEqual([])
    }
    expect(new Set(UI_ICON_NAMES.map((name) => uiIcon(name))).size).toBe(UI_ICON_NAMES.length)
  })
})

describe('scene css', () => {
  const all = [
    ...BACKGROUNDS.map(({ id }) => backgroundSvg(id, 'c')),
    moundSvg('c'),
    meadowSvg('c'),
    giftSvg('c'),
  ].join('')

  it('animates every animation hook the art uses, and stills them for reduced motion', () => {
    const hooks = new Set([...all.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(' ')))
    const animated = ['lh-float', 'lh-sc-sway', 'lh-twinkle', 'lh-sc-drift', 'lh-flutter', 'lh-sc-bob', 'lh-sc-wave', 'lh-sc-flag', 'lh-sc-firefly', 'lh-sc-grass']
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    for (const hook of animated) {
      expect(hooks.has(hook), hook).toBe(true)
      expect(css).toContain(`.lh-sc .${hook} {`)
      expect(reduced).toContain(`.lh-sc .${hook}`)
    }
  })

  it('names its keyframes with its own prefix', () => {
    for (const [, name] of css.matchAll(/@keyframes ([\w-]+)/g)) expect(name.startsWith('lh-sc-')).toBe(true)
  })
})
