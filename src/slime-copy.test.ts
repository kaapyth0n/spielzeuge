import { describe, expect, it } from 'vitest'
import { SLIME_COPY, slimeText } from './slime-copy'
import { fresh, newMeeting, askOwner } from './slime-state'
describe('Slime translations',()=>{
 it('has unique complete source phrases with both translations',()=>{
  expect(new Set(SLIME_COPY.map(row=>row[0])).size).toBe(SLIME_COPY.length)
  for(const [ru,de,en] of SLIME_COPY){expect(de.length).toBeGreaterThan(0);expect(en.length).toBeGreaterThan(0);expect(slimeText(ru,'de')).toBe(de);expect(slimeText(ru,'en')).toBe(en)}
 })
 it('translates composed numeric messages and all owner answers',()=>{
  const s=fresh(),m=newMeeting()
  const captions=['Новый рекорд: 320 см! Ура-а-а!','Растянулись на 210 см! Ещё раз?','Пузырьки! Я становлюсь чище! +5 ✦',askOwner(s,m)]
  s.clean=0;captions.push(askOwner(s,m));s.clean=100;s.energy=0;captions.push(askOwner(s,m))
  for(const caption of captions)for(const lang of ['de','en'] as const)expect(slimeText(caption,lang)).not.toMatch(/[А-Яа-яЁё]/)
 })
})
