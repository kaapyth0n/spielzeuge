import { describe, expect, it } from 'vitest'
import { HORSE_GROUND_Y, HORSE_VIEWBOX, horseSvg, itemIcon } from './loshadka-art.ts'
import { CLIPS, COLORS, MAGIC, MANES, TAILS, type Look } from './loshadka-items.ts'

const VOID = new Set(['path', 'circle', 'ellipse', 'rect', 'stop', 'line', 'polyline', 'polygon', 'use'])

/** Tiny tag-stack check: every opened tag is closed in order. */
function wellFormed(svg: string): void {
  const stack: string[] = []
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg))) {
    const [, close, name, attrs, self] = m
    expect(attrs.split('"').length % 2, `odd quotes in <${name}${attrs}>`).toBe(1)
    if (self) continue
    if (close) {
      expect(stack.pop(), `unexpected </${name}>`).toBe(name)
    } else {
      expect(VOID.has(name) ? `<${name}> without />` : '', `<${name}${attrs}>`).toBe('')
      stack.push(name)
    }
  }
  expect(stack).toEqual([])
  expect(svg).not.toMatch(/NaN|undefined|Infinity|null/)
}

const ids = (svg: string) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1])

/** Every url(#…) resolves inside the same svg and ids are unique. */
function selfContained(svg: string): void {
  const own = ids(svg)
  expect(new Set(own).size, 'duplicate ids').toBe(own.length)
  const known = new Set(own)
  for (const r of refs(svg)) expect(known.has(r), `missing #${r}`).toBe(true)
}

const look = (part: Partial<Look> = {}): Look => ({ color: null, mane: null, tail: null, clip: null, horn: false, wings: false, ...part })
const FULL = look({ color: 'orange', mane: 'sunny', tail: 'black', clip: 'strawberry', horn: true, wings: true })

describe('horseSvg', () => {
  it('renders the uncoloured sketch', () => {
    const svg = horseSvg(look(), { id: 'sketch' })
    wellFormed(svg)
    selfContained(svg)
    expect(svg).toContain(`viewBox="0 0 ${HORSE_VIEWBOX.width} ${HORSE_VIEWBOX.height}"`)
    expect(svg).toMatch(/^<svg class="lh-horse"/)
    expect(svg).not.toContain('lh-ghost')
  })

  it('renders every item of every side', () => {
    for (const c of COLORS) {
      const svg = horseSvg(look({ color: c.id }), { id: `c-${c.id}` })
      wellFormed(svg)
      selfContained(svg)
      expect(svg).toContain(c.body)
    }
    for (const m of MANES) {
      const svg = horseSvg(look({ color: 'pink', mane: m.id }), { id: `m-${m.id}` })
      wellFormed(svg)
      selfContained(svg)
      expect(svg).toContain('class="lh-mane"')
      expect(svg).toContain('class="lh-forelock"')
    }
    for (const t of TAILS) {
      const svg = horseSvg(look({ color: 'pink', tail: t.id }), { id: `t-${t.id}` })
      wellFormed(svg)
      selfContained(svg)
      expect(svg).toContain('class="lh-tail-hair"')
    }
    for (const c of CLIPS) {
      const svg = horseSvg(look({ color: 'pink', clip: c.id }), { id: `k-${c.id}` })
      wellFormed(svg)
      selfContained(svg)
      expect(svg).toContain('class="lh-clip"')
    }
  })

  it('renders every combination of mane, tail, clip and magic', () => {
    let n = 0
    for (const [mi, m] of MANES.entries()) {
      for (const [ti, t] of TAILS.entries()) {
        const clip = CLIPS[(mi + ti) % CLIPS.length]
        const color = COLORS[(mi * 3 + ti) % COLORS.length]
        const svg = horseSvg(look({ color: color.id, mane: m.id, tail: t.id, clip: clip.id, horn: (mi + ti) % 2 === 0, wings: ti % 3 === 0 }), { id: `x${n++}` })
        wellFormed(svg)
        selfContained(svg)
      }
      for (const clip of CLIPS) {
        const svg = horseSvg(look({ color: 'white', mane: m.id, clip: clip.id, horn: true, wings: true }), { id: `y${n++}` })
        wellFormed(svg)
        selfContained(svg)
      }
    }
    expect(n).toBe(MANES.length * (TAILS.length + CLIPS.length))
  })

  it('keeps gradient and clip ids of different ponies apart', () => {
    const a = ids(horseSvg(FULL, { id: 'one' }))
    const b = ids(horseSvg(FULL, { id: 'two' }))
    expect(a.length).toBeGreaterThan(10)
    expect(a.filter((id) => b.includes(id))).toEqual([])
    expect(a.every((id) => id.startsWith('one-'))).toBe(true)
  })

  it('sanitises the id prefix', () => {
    const svg = horseSvg(FULL, { id: 'a b"<c' })
    wellFormed(svg)
    selfContained(svg)
  })

  it('has the groups, pivots and tap zones the UI and the CSS rely on', () => {
    const svg = horseSvg(FULL, { id: 'rig' })
    for (const cls of ['lh-rig', 'lh-shadow', 'lh-wing-far', 'lh-wing-near', 'lh-tail', 'lh-tail-hair', 'lh-body', 'lh-neck', 'lh-mane', 'lh-mane-hair', 'lh-head', 'lh-eye', 'lh-lid', 'lh-blush', 'lh-nostril', 'lh-mouth-closed', 'lh-mouth-open', 'lh-forelock', 'lh-clip', 'lh-horn', 'lh-hoof']) {
      expect(svg, cls).toMatch(new RegExp(`class="${cls}[ "]`))
    }
    expect(svg.match(/class="lh-leg"/g)).toHaveLength(4)
    for (const leg of ['fl', 'fr', 'bl', 'br']) expect(svg).toContain(`data-leg="${leg}"`)
    expect(svg.match(/class="lh-ear"/g)).toHaveLength(2)
    expect(svg.match(/class="lh-hoof"/g)).toHaveLength(4)
    for (const zone of ['head', 'body', 'hooves', 'mane', 'tail', 'clip', 'horn', 'wings']) expect(svg, zone).toContain(`data-zone="${zone}"`)
    for (const part of ['mane', 'tail', 'clip', 'body', 'horn', 'wings']) expect(svg, part).toContain(`data-part="${part}"`)
    // animated groups carry their pivot inline
    for (const cls of ['lh-rig', 'lh-tail', 'lh-neck', 'lh-head', 'lh-leg', 'lh-ear', 'lh-wing-near', 'lh-wing-far', 'lh-clip', 'lh-horn', 'lh-mane', 'lh-forelock', 'lh-body']) {
      expect(svg, cls).toMatch(new RegExp(`class="${cls}"[^>]*style="transform-origin:[\\d.]+px [\\d.]+px`))
    }
    // the lid is open (collapsed) unless the CSS blinks it; the open mouth is hidden
    expect(svg).toMatch(/class="lh-lid"[^>]*transform:scaleY\(0\)/)
    expect(svg).toMatch(/class="lh-mouth-open" opacity="0"/)
    // animated groups never carry a transform attribute (CSS transforms would replace it)
    for (const m of svg.matchAll(/<g class="lh-[^"]*"[^>]*>/g)) expect(m[0]).not.toMatch(/\stransform="/)
  })

  it('nests the head parts inside the head, and the head inside the neck', () => {
    const svg = horseSvg(FULL, { id: 'nest' })
    const neck = svg.indexOf('class="lh-neck"')
    const head = svg.indexOf('class="lh-head"')
    expect(neck).toBeGreaterThan(-1)
    expect(head).toBeGreaterThan(neck)
    for (const cls of ['lh-ear', 'lh-eye', 'lh-blush', 'lh-nostril', 'lh-mouth-open', 'lh-forelock', 'lh-clip', 'lh-horn']) {
      expect(svg.indexOf(`class="${cls}`), cls).toBeGreaterThan(head)
    }
    expect(svg.indexOf('class="lh-mane"')).toBeGreaterThan(neck)
    expect(svg.indexOf('class="lh-mane"')).toBeLessThan(head)
    // the shadow stays on the ground, outside the rig
    expect(svg.indexOf('class="lh-shadow"')).toBeLessThan(svg.indexOf('class="lh-rig"'))
  })

  it('draws ghosts only for the missing parts, and only when asked', () => {
    const all = horseSvg(look(), { id: 'g', ghosts: true })
    wellFormed(all)
    selfContained(all)
    for (const side of ['mane', 'tail', 'clip', 'color']) expect(all, side).toContain(`lh-ghost-${side}`)
    expect(all.match(/lh-ghost-arrow/g)?.length).toBe(4)

    const some = horseSvg(look({ color: 'blue', tail: 'red' }), { id: 'g2', ghosts: true })
    expect(some).toContain('lh-ghost-mane')
    expect(some).toContain('lh-ghost-clip')
    expect(some).not.toContain('lh-ghost-tail')
    expect(some).not.toContain('lh-ghost-color')

    const none = horseSvg(FULL, { id: 'g3', ghosts: true })
    expect(none).not.toContain('lh-ghost')
    expect(horseSvg(look(), { id: 'g4' })).not.toContain('lh-ghost')
  })

  it('draws bolder ghosts and bigger arrows for a small stage', () => {
    const plain = horseSvg(look(), { id: 'b1', ghosts: true })
    const bold = horseSvg(look(), { id: 'b2', ghosts: true, bold: true })
    wellFormed(bold)
    selfContained(bold)
    const widths = (svg: string) =>
      [...svg.matchAll(/class="lh-ghost [^"]*"[^>]*>([\s\S]*?)<g class="lh-ghost-arrow"/g)].flatMap((m) =>
        [...m[1].matchAll(/stroke-width="([\d.]+)"/g)].map((w) => Number(w[1])),
      )
    expect(Math.min(...widths(bold))).toBeGreaterThan(Math.max(...widths(plain)))
    expect(bold.match(/lh-ghost-arrow/g)?.length).toBe(4)
    expect(bold.match(/scale\(1\.75\)/g)?.length).toBe(4)
    expect(plain).not.toContain('scale(1.75)')
    // bold changes nothing on a dressed pony
    expect(horseSvg(FULL, { id: 'b3', ghosts: true, bold: true })).toBe(horseSvg(FULL, { id: 'b3', ghosts: true }))
  })

  it('wears magic only when switched on', () => {
    const plain = horseSvg(look({ color: 'white' }), { id: 'p' })
    expect(plain).not.toContain('lh-horn')
    expect(plain).not.toContain('lh-wing')
    const magic = horseSvg(look({ color: 'white', horn: true, wings: true }), { id: 'q' })
    expect(magic).toContain('class="lh-horn"')
    expect(magic).toContain('class="lh-wing-near"')
    expect(magic).toContain('class="lh-wing-far"')
  })

  it('treats unknown ids like missing parts', () => {
    const svg = horseSvg(look({ color: 'nope', mane: 'nope', tail: 'nope', clip: 'nope' }), { id: 'u', ghosts: true })
    wellFormed(svg)
    selfContained(svg)
    expect(svg).toContain('lh-ghost-mane')
    expect(svg).toContain('lh-ghost-color')
  })

  it('adds an accessible title only when given', () => {
    const titled = horseSvg(FULL, { id: 't', title: 'Лошадка <Искорка> & "друзья"' })
    expect(titled).toContain('role="img"')
    expect(titled).toContain('<title>Лошадка &lt;Искорка&gt; &amp; &quot;друзья&quot;</title>')
    wellFormed(titled)
    expect(horseSvg(FULL, { id: 't2' })).toContain('aria-hidden="true"')
  })

  it('puts the shadow on the ground line', () => {
    const svg = horseSvg(FULL, { id: 'gr' })
    const shift = /<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">\s*<ellipse class="lh-shadow" cx="[\d.]+" cy="([\d.]+)"/.exec(svg)
    expect(shift).not.toBeNull()
    expect(Number(shift![2]) + Number(shift![3])).toBeCloseTo(HORSE_GROUND_Y, 0)
    expect(HORSE_GROUND_Y).toBeLessThan(HORSE_VIEWBOX.height)
    expect(HORSE_GROUND_Y).toBeGreaterThan(HORSE_VIEWBOX.height * 0.8)
  })
})

describe('itemIcon', () => {
  const kinds = [
    ['mane', MANES],
    ['clip', CLIPS],
    ['tail', TAILS],
    ['color', COLORS],
    ['magic', MAGIC],
  ] as const

  it('draws a 100×100 icon for every item', () => {
    for (const [kind, list] of kinds) {
      for (const item of list) {
        const svg = itemIcon(kind, item.id, 'cell')
        wellFormed(svg)
        selfContained(svg)
        expect(svg, `${kind}:${item.id}`).toContain('viewBox="0 0 100 100"')
        expect(svg.length, `${kind}:${item.id}`).toBeGreaterThan(400)
      }
    }
  })

  it('keeps icon ids unique across a whole strip', () => {
    const all: string[] = []
    for (const [kind, list] of kinds) for (const item of list) all.push(...ids(itemIcon(kind, item.id, 'strip')))
    expect(new Set(all).size).toBe(all.length)
    const again = ids(itemIcon('mane', 'sunny', 'other'))
    expect(again.some((id) => all.includes(id))).toBe(false)
  })

  it('returns an empty icon for unknown items instead of throwing', () => {
    const svg = itemIcon('mane', 'nope')
    wellFormed(svg)
    expect(svg).toContain('viewBox="0 0 100 100"')
  })
})
