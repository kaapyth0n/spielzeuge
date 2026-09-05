import { describe, expect, it } from 'vitest'
import { fresh, care, buy, restore, stretchLimit, newMeeting, askOwner, playTogether, wishes, askSlimes, givePiece } from './slime-state'
describe('Slime care and economy', () => {
 it('rewards actual care, never repeated care at full stats', () => { const s=fresh(); s.clean=95; expect(care(s,'clean')).toBe(1); expect(s.clean).toBe(100); expect(care(s,'clean')).toBe(0); expect(s.coins).toBe(16) })
 it('rejects unaffordable purchases and equips owned items for free', () => { const s=fresh(); expect(buy(s,'crown')).toBe(false); expect(s.coins).toBe(15); s.coins=40; expect(buy(s,'crown')).toBe(true); expect(s.coins).toBe(0); buy(s,'none'); expect(buy(s,'crown')).toBe(true); expect(s.coins).toBe(0); expect(s.costume).toBe('crown') })
 it('makes well cared-for slime stretch further', () => { const s=fresh(); const before=stretchLimit(s); care(s,'energy'); expect(stretchLimit(s)).toBeGreaterThan(before); expect(stretchLimit({...s,clean:100,joy:100,energy:100})).toBe(400) })
 it('preserves purchases and records across reloads', () => { const s=fresh(); s.coins=40; buy(s,'bow'); s.record=270; expect(restore(JSON.stringify(s))).toEqual(s) })
 it('recovers safely from corrupt or invalid saves', () => { expect(restore('{')).toEqual(fresh()); const s=restore('{"coins":-3,"clean":500,"color":"bad","owned":["bad"]}'); expect(s.coins).toBe(0); expect(s.clean).toBe(100); expect(s.color).toBe('mint'); expect(s.owned).not.toContain('bad') })
})

describe('Slime friendship and baby', () => {
 it('requires owner permission and respects a refusal', () => {
  const s=fresh(), m=newMeeting(); expect(playTogether(s,m)).toBe(false)
  s.clean=10; askOwner(s,m); expect(m.permission).toBe(false)
  s.clean=100; askOwner(s,m); expect(m.permission).toBe(true)
  expect(playTogether(s,m)).toBe(true); expect(s.friendship).toBe(1)
 })
 it('requires both wishes and two donated pieces, with no duplicate baby', () => {
  const s=fresh(), m=newMeeting(); askOwner(s,m)
  expect(askSlimes(s,m)).toBe(false); expect(givePiece(s,m)).toBe(false)
  for(let i=0;i<3;i++) playTogether(s,m)
  s.energy=20; expect(wishes(s,m)).toEqual([false,true]); expect(askSlimes(s,m)).toBe(false)
  s.energy=80; expect(askSlimes(s,m)).toBe(true)
  expect(givePiece(s,m)).toBe(true); expect(s.baby).toBeNull()
  expect(givePiece(s,m)).toBe(true); expect(s.baby?.color).toBe('mint')
  const saved=JSON.stringify(s); expect(givePiece(s,m)).toBe(false); expect(JSON.stringify(s)).toBe(saved)
  expect(restore(saved)).toEqual(s)
 })
 it('rechecks willingness before accepting pieces', () => {
  const s=fresh(), m=newMeeting(); s.friendship=3; s.joy=100; askOwner(s,m); askSlimes(s,m)
  givePiece(s,m); s.energy=5; expect(givePiece(s,m)).toBe(false); expect(s.baby).toBeNull(); expect(m.pieces).toBe(0)
 })
 it('can decline even when the player slime wants a baby', () => {
  const s=fresh(), m=newMeeting(); s.friendship=3; s.joy=100; askOwner(s,m); m.friendEnergy=25
  expect(wishes(s,m)).toEqual([true,false]); expect(askSlimes(s,m)).toBe(false)
 })
 it('upgrades older saves and rejects malformed baby data', () => {
  expect(restore('{"coins":32}').friendship).toBe(0)
  expect(restore('{"coins":32}').baby).toBeNull()
  expect(restore('{"baby":{"color":"bogus"},"friendship":99}').baby).toBeNull()
  expect(restore('{"friendship":99}').friendship).toBe(3)
 })
})
