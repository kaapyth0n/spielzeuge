import {expect,it} from 'vitest'
import {restore} from './slime-state'
it('restores valid individual/all choices and repairs missing or invalid choices',()=>{
 const babies=Array.from({length:3},()=>({color:'mint',parent:'mira',cuddles:0}))
 expect(restore(JSON.stringify({babies,companion:2})).companion).toBe(2)
 expect(restore(JSON.stringify({babies,companion:'all'})).companion).toBe('all')
 expect(restore(JSON.stringify({babies,companion:999})).companion).toBe(2)
 expect(restore(JSON.stringify({babies})).companion).toBe(0)
 expect(restore('{"companion":-5}').companion).toBe(0)
})
