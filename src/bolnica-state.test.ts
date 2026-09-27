import { describe, expect, it } from 'vitest'
import { ANIMALS } from './bolnica-animals.ts'
import { LEVEL_COUNT } from './bolnica-words.ts'
import {
  MAX_PLAYERS,
  NAME_MAX,
  REANIMATION_MS,
  WARD_COUNT,
  addScore,
  animalOrder,
  answer,
  cleanName,
  closeShutter,
  currentPlayer,
  deskState,
  freshSave,
  giveTicket,
  monsterDisguise,
  monstersBefore,
  newPlayer,
  ranking,
  restoreSave,
  returnPatients,
  startNextRound,
  summon,
  takePhoto,
  toggleWear,
  type Player,
} from './bolnica-state.ts'

function admitNext(player: Player): number {
  // Catch every monster first, then admit the real patient.
  for (let guard = 0; guard < 10; guard++) {
    const desk = summon(player)
    if (!desk) throw new Error('nobody at the desk')
    takePhoto(player)
    if (desk.kind === 'monster') {
      expect(closeShutter(player)).toBe('caught')
      continue
    }
    const result = giveTicket(player)
    if (result.kind !== 'admitted') throw new Error('not admitted')
    return result.ward
  }
  throw new Error('too many monsters')
}

describe('bolnica save', () => {
  it('starts with one unnamed cat and Veronika’s giraffe first', () => {
    const save = freshSave()
    const player = currentPlayer(save)
    expect(save.players).toHaveLength(1)
    expect(player.named).toBe(false)
    expect(player.hospital.order[0]).toBe('giraffe')
    expect(player.hospital.wards).toHaveLength(WARD_COUNT)
    expect(save.checker).toBe('voice')
    expect(save.forgiving).toBe(true)
  })

  it('survives broken and hostile storage', () => {
    for (const raw of [null, '', 'nope', '[]', '{"players":5}', '{"players":[{"id":"<script>","name":"<b>Мурка</b>","score":-9,"look":{"fur":"lava","wear":["cap","crown"]}}]}']) {
      const save = restoreSave(raw)
      expect(save.players.length).toBeGreaterThan(0)
      const player = currentPlayer(save)
      expect(player.score).toBeGreaterThanOrEqual(0)
      expect(player.name).not.toMatch(/[<>]/)
      expect(player.look.wear.every((w) => ['cap', 'stethoscope', 'coat', 'bag', 'glasses', 'bow', 'mirror'].includes(w))).toBe(true)
    }
    const hostile = restoreSave('{"players":[{"id":"<script>","name":"<b>Мурка</b>","look":{"fur":"lava","wear":["cap","crown"]}}]}')
    expect(currentPlayer(hostile).id).toMatch(/^[a-z0-9]+$/)
    expect(currentPlayer(hostile).name).toBe('bМурка/b')
    expect(currentPlayer(hostile).look.fur).toBe('white')
  })

  it('round-trips a played save', () => {
    const save = freshSave()
    const player = currentPlayer(save)
    player.name = 'Мурка'
    player.named = true
    player.look = toggleWear(player.look, 'stethoscope')
    admitNext(player)
    const again = restoreSave(JSON.stringify(save))
    expect(again).toEqual(save)
  })

  it('caps players and cleans names', () => {
    const many = { players: Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, name: `Cat ${i}` })) }
    expect(restoreSave(JSON.stringify(many)).players).toHaveLength(MAX_PLAYERS)
    expect(cleanName('  Мурка   Пушистая  ')).toBe('Мурка Пушистая')
    expect(cleanName('x'.repeat(40))).toHaveLength(NAME_MAX)
    expect(cleanName(42)).toBe('')
  })

  it('drops a ward arrow that points at an empty ward', () => {
    const save = freshSave()
    const player = currentPlayer(save)
    player.hospital.arrow = 3
    expect(currentPlayer(restoreSave(JSON.stringify(save))).hospital.arrow).toBeNull()
  })
})

describe('reception', () => {
  it('needs a photo before a ticket or the shutter', () => {
    const player = newPlayer('p', 0)
    summon(player)
    expect(giveTicket(player).kind).toBe('none')
    expect(closeShutter(player)).toBe('none')
    expect(takePhoto(player)).toBe(true)
    expect(takePhoto(player)).toBe(false)
  })

  it('admits the first patient to ward 1 and points the arrow there', () => {
    const player = newPlayer('p', 0)
    const desk = summon(player)!
    expect(desk.kind).toBe('patient')
    expect(desk.animal).toBe('giraffe')
    takePhoto(player)
    expect(giveTicket(player)).toEqual({ kind: 'admitted', ward: 1 })
    expect(player.hospital.arrow).toBe(1)
    expect(player.hospital.next).toBe(2)
    expect(player.hospital.wards[0]?.animal).toBe('giraffe')
  })

  it('sends an obvious monster before the second patient of the first round', () => {
    const player = newPlayer('p', 0)
    admitNext(player)
    const desk = summon(player)!
    expect(desk.kind).toBe('monster')
    expect(desk.obvious).toBe(true)
  })

  it('scores monsters and mistakes, never below zero', () => {
    const player = newPlayer('p', 0)
    admitNext(player)
    summon(player)
    takePhoto(player)
    expect(closeShutter(player)).toBe('caught')
    expect(player.score).toBe(1)
    expect(player.caught).toBe(1)
    // The real patient is next: closing the shutter on them costs a point and keeps them there.
    const desk = summon(player)!
    expect(desk.kind).toBe('patient')
    takePhoto(player)
    expect(closeShutter(player)).toBe('wrong-patient')
    expect(player.score).toBe(0)
    expect(player.hospital.desk?.photo).toBe(false)
    expect(addScore(player, -5)).toBe(0)
  })

  it('lets a monster sneak in when it gets a ticket', () => {
    const player = newPlayer('p', 0)
    admitNext(player)
    player.score = 3
    summon(player)
    takePhoto(player)
    expect(giveTicket(player)).toEqual({ kind: 'monster-sneaked' })
    expect(player.score).toBe(2)
    expect(summon(player)?.kind).toBe('patient')
  })

  it('closes the window when all four wards are busy', () => {
    const player = newPlayer('p', 0)
    for (let i = 0; i < WARD_COUNT; i++) expect(admitNext(player)).toBe(i + 1)
    expect(deskState(player.hospital)).toBe('full')
    expect(summon(player)).toBeNull()
  })

  it('disguises monsters only as animals still to come', () => {
    const player = newPlayer('p', 0)
    for (let level = 1; level <= 12; level++) {
      for (let guard = 0; guard < 5; guard++) {
        const desk = summon(player)!
        takePhoto(player)
        if (desk.kind === 'patient') {
          expect(giveTicket(player).kind).toBe('admitted')
          answer(player, player.hospital.wards.findIndex((w) => w?.level === level) + 1, true, 1, { forgiving: true, now: 0 })
          break
        }
        const treated = player.hospital.order.slice(0, player.hospital.next - 1)
        expect(treated).not.toContain(desk.animal)
        closeShutter(player)
      }
    }
  })

  it('makes monsters subtler on later levels', () => {
    expect(monsterDisguise(1, 3, 1, 'x').obvious).toBe(true)
    const middle = monsterDisguise(1, 9, 1, 'x')
    expect(middle.obvious).toBe(false)
    expect(middle.traits).toHaveLength(2)
    expect(monsterDisguise(1, 18, 1, 'x').traits).toHaveLength(1)
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      const n = monstersBefore(2, level, 'seed')
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(2)
    }
    expect(monstersBefore(1, 1, 'x')).toBe(0)
  })

  it('shuffles animals from the second round on, using all twenty', () => {
    expect(animalOrder(1, 'a')).toEqual([...ANIMALS])
    const second = animalOrder(2, 'a')
    expect(new Set(second).size).toBe(ANIMALS.length)
    expect(second).not.toEqual([...ANIMALS])
    expect(animalOrder(2, 'a')).toEqual(second)
  })
})

describe('wards', () => {
  it('heals a patient card by card and frees the ward', () => {
    const player = newPlayer('p', 0)
    const ward = admitNext(player)
    expect(answer(player, ward, true, 3, { forgiving: true, now: 0 })).toEqual({ kind: 'next', step: 1 })
    expect(answer(player, ward, true, 3, { forgiving: true, now: 0 })).toEqual({ kind: 'next', step: 2 })
    expect(answer(player, ward, true, 3, { forgiving: true, now: 0 })).toEqual({ kind: 'healed', level: 1, roundDone: false })
    expect(player.hospital.wards[ward - 1]).toBeNull()
    expect(player.hospital.arrow).toBeNull()
    expect(player.healed).toBe(1)
    expect(player.score).toBe(3)
  })

  it('forgives the first miss on each card, then takes hearts', () => {
    const player = newPlayer('p', 0)
    const ward = admitNext(player)
    player.score = 10
    expect(answer(player, ward, false, 3, { forgiving: true, now: 0 }).kind).toBe('retry')
    expect(player.score).toBe(10)
    expect(answer(player, ward, false, 3, { forgiving: true, now: 0 })).toEqual({ kind: 'wrong', strikes: 1 })
    expect(player.score).toBe(9)
    answer(player, ward, true, 3, { forgiving: true, now: 0 })
    expect(answer(player, ward, false, 3, { forgiving: true, now: 0 }).kind).toBe('retry')
  })

  it('sends the patient to intensive care after three lost hearts and brings them back', () => {
    const player = newPlayer('p', 0)
    const ward = admitNext(player)
    const strict = { forgiving: false, now: 1000 }
    answer(player, ward, true, 4, strict)
    expect(answer(player, ward, false, 4, strict)).toEqual({ kind: 'wrong', strikes: 1 })
    expect(answer(player, ward, false, 4, strict)).toEqual({ kind: 'wrong', strikes: 2 })
    expect(answer(player, ward, false, 4, strict)).toEqual({ kind: 'reanimation' })
    const patient = player.hospital.wards[ward - 1]!
    expect(patient.away).toBe(1000 + REANIMATION_MS)
    expect(patient.step).toBe(0)
    expect(patient.strikes).toBe(0)
    expect(answer(player, ward, true, 4, strict).kind).toBe('none')
    expect(returnPatients(player, 1000 + REANIMATION_MS - 1)).toEqual([])
    expect(returnPatients(player, 1000 + REANIMATION_MS)).toEqual([ward])
    expect(patient.away).toBe(0)
  })

  it('finishes the round after twenty patients and starts again at level 1', () => {
    const player = newPlayer('p', 0)
    let last = null as ReturnType<typeof answer> | null
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      const ward = admitNext(player)
      last = answer(player, ward, true, 1, { forgiving: true, now: 0 })
    }
    expect(last).toEqual({ kind: 'healed', level: LEVEL_COUNT, roundDone: true })
    expect(deskState(player.hospital)).toBe('done')
    startNextRound(player)
    expect(player.rounds).toBe(1)
    expect(player.hospital.round).toBe(2)
    expect(player.hospital.next).toBe(1)
    expect(player.hospital.healed).toEqual([])
  })

  it('ranks by score, then healed patients', () => {
    const a = newPlayer('a', 1)
    const b = newPlayer('b', 2)
    const c = newPlayer('c', 3)
    a.score = 5
    b.score = 9
    c.score = 5
    c.healed = 2
    expect(ranking([a, b, c]).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('wardrobe', () => {
  it('toggles wear on and off in a stable order', () => {
    const look = { fur: 'white' as const, tint: 'grey' as const, wear: ['cap'] as const }
    const on = toggleWear(look, 'stethoscope')
    expect(on.wear).toEqual(['cap', 'stethoscope'])
    expect(toggleWear(on, 'cap').wear).toEqual(['stethoscope'])
    expect(toggleWear(toggleWear(on, 'bow'), 'bow').wear).toEqual(['cap', 'stethoscope'])
  })
})
