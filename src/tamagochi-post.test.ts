import { describe, it, expect } from 'vitest'
import { CHARTS, CONSTELLATIONS, melody, traceBeam } from './tamagochi-post-routes.ts'
import { deliverPostcard, freshSave, parseSave } from './tamagochi-state.ts'

describe('Sky Post', () => {
  it('keeps the first passengers and awards the heart exactly once across reloads', () => {
    const save = freshSave()
    save.hearts = 2
    expect(deliverPostcard(save, 'stars', save.devices)).toEqual({ first: true, egg: 'mini' })
    save.devices[0].hatched = true
    save.devices[1].species = 'banana'
    save.windowView = 'stars'
    save.orchestra = [3, 1, 1, 0]
    const restored = parseSave(JSON.parse(JSON.stringify(save)))
    expect(deliverPostcard(restored, 'stars', restored.devices).first).toBe(false)
    expect(restored.hearts).toBe(3)
    expect(restored.postcards.stars?.crew).toEqual([
      { species: 'chick', hatched: false },
      { species: 'kitten', hatched: false },
    ])
    expect(restored.windowView).toBe('stars')
    expect(restored.orchestra).toEqual([3, 1, 1, 0])
  })

  it('reads pre-expedition saves and repairs malformed individual cards independently', () => {
    const legacy = { hearts: 11, played: { dance: 3 }, owned: ['w:bow:2'] }
    expect(parseSave(legacy)).toMatchObject({ ...legacy, postcards: {}, windowView: null, orchestra: [] })
    const save = parseSave({
      ...legacy,
      postcards: { meadow: { crew: [null, {}, { species: 'bunny' }, { species: 'bunny' }] }, beacon: { crew: 'bad' }, stars: null },
      windowView: 'stars',
      orchestra: [-1, true, '2', 4, 2],
    })
    expect(save).toMatchObject({
      ...legacy,
      postcards: { meadow: { crew: [{ species: 'bunny', hatched: false }] } },
      windowView: null,
      orchestra: [2],
    })
    expect(Object.keys(save.postcards)).toEqual(['meadow'])
  })

  it('has a unique reachable path through every mirror for every lighthouse chart and hint', () => {
    for (const chart of CHARTS) {
      const solved = Array.from({ length: 8 }, (_, n) => [0, 1, 2].map((i) => Boolean(n & (1 << i)))).filter(
        (m) => traceBeam(chart, m).lit,
      )
      expect(solved).toEqual([chart.solution])
      expect(traceBeam(chart, chart.solution).path).toEqual([chart.start, ...chart.mirrors, chart.goal])
    }
  })

  it('keeps flower scores playable and star targets distinct', () => {
    for (const rnd of [() => 0, () => 0.44, () => 1]) {
      const notes = melody(4, rnd)
      expect(notes).toHaveLength(4)
      expect(melody(4, rnd, notes)).not.toEqual(notes)
      notes.forEach((n, i) => {
        expect([0, 1, 2]).toContain(n)
        expect(n).not.toBe(notes[i - 1])
      })
    }
    for (const sky of CONSTELLATIONS) expect(new Set(sky.map((p) => p.join(','))).size).toBe(sky.length)
  })
})
