import { expect, it } from 'vitest'
import { fresh, restore, newMeeting, askOwner, askSlimes, givePiece } from './slime-state'
it('creates multiple babies only with a fresh agreement and two pieces each',()=>{
 const s=fresh(),m=newMeeting('leo');s.friendships.leo=3;s.energy=100;s.joy=100;askOwner(s,m)
 for(let i=0;i<4;i++){
  expect(askSlimes(s,m)).toBe(true);givePiece(s,m);expect(s.babies).toHaveLength(i)
  givePiece(s,m);expect(s.babies).toHaveLength(i+1);expect(givePiece(s,m)).toBe(false)
 }
 s.babies[1].cuddles=3;expect(s.babies[0].cuddles).toBe(0);expect(s.baby).toBe(s.babies[0])
 const loaded=restore(JSON.stringify(s));expect(loaded).toEqual(s);expect(loaded.baby).toBe(loaded.babies[0])
})
it('migrates the existing baby exactly once and preserves colors, parent and hugs',()=>{
 const old={baby:{color:'berry',parent:'aya',cuddles:7}}
 const s=restore(JSON.stringify(old));expect(s.babies).toEqual([old.baby]);expect(restore(JSON.stringify(s)).babies).toHaveLength(1)
})
it('still respects refusal and cancellation after the first baby',()=>{
 const s=fresh(),m=newMeeting();s.friendship=3;s.joy=100;askOwner(s,m);askSlimes(s,m);givePiece(s,m);givePiece(s,m)
 s.energy=20;expect(askSlimes(s,m)).toBe(false);expect(givePiece(s,m)).toBe(false);expect(s.babies).toHaveLength(1)
 s.energy=100;askSlimes(s,m);givePiece(s,m);m.agreed=false;m.pieces=0;expect(givePiece(s,m)).toBe(false);expect(s.babies).toHaveLength(1)
})
