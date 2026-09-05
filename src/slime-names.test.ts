import {expect,it} from 'vitest'
import {babyName,cleanBabyName} from './slime-names'
import {restore} from './slime-state'
it('assigns distinct localized defaults including older unnamed babies',()=>{
 for(const lang of ['ru','de','en'] as const)expect(new Set(Array.from({length:30},(_,i)=>babyName({},i,lang))).size).toBe(30)
 expect(babyName({},0,'ru')).toBe('Капелька');expect(babyName({},1,'en')).toBe('Fluffy')
})
it('preserves a custom name verbatim across languages and reloads',()=>{
 const s=restore(JSON.stringify({babies:[{color:'mint',parent:'mira',cuddles:2,name:'Луна & Мира'}]}))
 for(const lang of ['ru','de','en'] as const)expect(babyName(s.babies[0],0,lang)).toBe('Луна & Мира')
 expect(restore(JSON.stringify(s))).toEqual(s)
})
it('cleans whitespace and bounds the name without splitting emoji',()=>{
 expect(cleanBabyName('  Луна   Мира ')).toBe('Луна Мира');expect(cleanBabyName('  ')).toBe('')
 expect(Array.from(cleanBabyName('🌈'.repeat(50))).length).toBe(32)
})
