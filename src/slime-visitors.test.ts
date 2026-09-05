import { describe, expect, it } from 'vitest'
import { fresh, restore, nextMeeting, playTogether, askOwner, friendshipWith, askSlimes, givePiece } from './slime-state'
import { VISITORS, visitorText } from './slime-visitors'
describe('Different park visitors',()=>{
 it('visits everyone in each shuffled cycle, with no consecutive repeats even across reloads',()=>{
  let s=fresh(),last='';let cycle:string[]=[]
  for(let i=0;i<36;i++){
   const m=nextMeeting(s,()=>.65);expect(m.visitor).not.toBe(last);last=m.visitor;cycle.push(last)
   s=restore(JSON.stringify(s))
   if(cycle.length===VISITORS.length){expect(new Set(cycle).size).toBe(VISITORS.length);cycle=[]}
  }
 })
 it('keeps friendships separate and resets permission and pieces',()=>{
  const s=fresh();s.visitorQueue=['leo','mira','leo']
  const leo=nextMeeting(s);askOwner(s,leo);playTogether(s,leo);expect(friendshipWith(s,leo)).toBe(1)
  const mira=nextMeeting(s);expect(friendshipWith(s,mira)).toBe(0);expect(mira.permission).toBe(false)
  const again=nextMeeting(s);expect(friendshipWith(s,again)).toBe(1);expect(again.pieces).toBe(0)
 })
 it('migrates old Cloud friendship and baby without attributing them to other visitors',()=>{
  const s=restore('{"friendship":3,"baby":{"color":"mint","cuddles":2}}')
  expect(s.friendships.mira).toBe(3);expect(s.baby?.parent).toBe('mira')
  s.visitorQueue=['aya'];expect(friendshipWith(s,nextMeeting(s))).toBe(0)
 })
 it('records the actual donor for a baby across future visits and reloads',()=>{
  const s=fresh();s.visitorQueue=['nora'];s.friendships.nora=3;s.joy=100
  const m=nextMeeting(s);askOwner(s,m);expect(askSlimes(s,m)).toBe(true);givePiece(s,m);givePiece(s,m)
  expect(s.baby?.parent).toBe('nora');nextMeeting(s);expect(restore(JSON.stringify(s)).baby?.parent).toBe('nora')
 })
 it('sanitizes corrupt saved queues, names and friendships',()=>{
  const s=restore('{"visitorQueue":["bad","aya","aya"],"lastVisitor":"bad","friendships":{"aya":99,"bad":3}}')
  expect(s.visitorQueue).toEqual(['aya']);expect(s.lastVisitor).toBeNull();expect(s.friendships).toEqual({aya:3})
 })
 it('substitutes the correct name forms in all three languages',()=>{
  expect(visitorText('Мира: подарок Облачка. Передать мяч Облачку!','ru','leo')).toBe('Лев: подарок Искорки. Передать мяч Искорке!')
  for(const v of VISITORS)for(const lang of ['de','en'] as const){expect(visitorText('Mira',lang,v.id)).toBe(v.owner[lang]);expect(v.intro[lang]).not.toMatch(/[А-Яа-яЁё]/)}
 })
})
