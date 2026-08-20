import { describe, expect, test } from 'vitest'
import { decide, type Action, type Phase, type Zone } from './input.ts'

const phases: Phase[] = [
  'boot',
  'closed',
  'knocking',
  'waiting',
  'opening',
  'open',
  'closing',
]
const zones: Zone[] = ['lamp', 'visitor', 'door', 'elsewhere']

function table(hasVisitor: boolean): Record<Phase, Record<Zone, Action>> {
  const rows = {} as Record<Phase, Record<Zone, Action>>
  for (const phase of phases) {
    rows[phase] = {} as Record<Zone, Action>
    for (const zone of zones) {
      rows[phase][zone] = decide(phase, zone, hasVisitor)
    }
  }
  return rows
}

describe('decide() with a guest in the doorway', () => {
  const got = table(true)

  test('language name is never spoken except via the lamp when the door is not showing the guest', () => {
    for (const phase of phases) {
      for (const zone of zones) {
        if (got[phase][zone] === 'cycle-lang-name') {
          expect(zone).toBe('lamp')
          expect(['open', 'opening']).not.toContain(phase)
        }
      }
    }
  })

  test('tapping elsewhere never speaks a language name', () => {
    for (const phase of phases) {
      expect(got[phase].elsewhere).not.toBe('cycle-lang-name')
      expect(got[phase].door).not.toBe('cycle-lang-name')
      expect(got[phase].visitor).not.toBe('cycle-lang-name')
    }
  })

  test('open doorway: visitor greets, door frame closes, hallway does nothing', () => {
    expect(got.open.visitor).toBe('greet')
    expect(got.open.door).toBe('close')
    expect(got.open.elsewhere).toBe('ignore')
    expect(got.open.lamp).toBe('cycle-lang-word')
  })

  test('lamp with a visible guest says the animal, not the language', () => {
    expect(got.open.lamp).toBe('cycle-lang-word')
    expect(got.opening.lamp).toBe('cycle-lang-word')
  })

  test('closed door: lamp may name the language; only the door knocks', () => {
    expect(got.closed.lamp).toBe('cycle-lang-name')
    expect(got.closed.door).toBe('knock')
    expect(got.closed.elsewhere).toBe('ignore')
    expect(got.boot.door).toBe('knock')
    expect(got.boot.elsewhere).toBe('ignore')
  })

  test('after a knock, only the door opens; hallway is ignored', () => {
    expect(got.waiting.door).toBe('open')
    expect(got.waiting.elsewhere).toBe('ignore')
    expect(got.knocking.door).toBe('open')
    expect(got.knocking.elsewhere).toBe('ignore')
    expect(got.waiting.lamp).toBe('cycle-lang-name')
    expect(got.waiting.visitor).toBe('ignore')
  })

  test('opening and closing ignore play taps so animations are not doubled', () => {
    expect(got.opening.door).toBe('ignore')
    expect(got.opening.elsewhere).toBe('ignore')
    expect(got.opening.visitor).toBe('ignore')
    for (const zone of zones) {
      expect(got.closing[zone]).toBe('ignore')
    }
  })
})

describe('decide() with no guest', () => {
  const got = table(false)

  test('lamp always names the language when nobody is in the doorway', () => {
    expect(got.closed.lamp).toBe('cycle-lang-name')
    expect(got.waiting.lamp).toBe('cycle-lang-name')
    expect(got.open.lamp).toBe('cycle-lang-name')
    expect(got.opening.lamp).toBe('cycle-lang-name')
  })

  test('a hallway tap never opens or closes the door', () => {
    expect(got.open.elsewhere).toBe('ignore')
    expect(got.closed.elsewhere).toBe('ignore')
    expect(got.waiting.elsewhere).toBe('ignore')
    expect(got.open.door).toBe('close')
  })
})

describe('every phase × zone is explicit', () => {
  test('every phase and zone has an action', () => {
    let count = 0
    for (const phase of phases) {
      for (const zone of zones) {
        const action = decide(phase, zone, true)
        expect(action).toBeTruthy()
        count += 1
      }
    }
    expect(count).toBe(28)
  })
})
