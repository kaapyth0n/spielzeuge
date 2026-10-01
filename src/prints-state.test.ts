import { describe,it,expect } from 'vitest'
import { countWithinBounds,nearestActivity,fingerprintPaths,ACTIVITIES } from './prints-state'
import { PRINTS_COPY } from './prints-copy'
describe('Living fingerprints',()=>{
 it('bounds child count and recovers invalid input',()=>{expect(countWithinBounds(0)).toBe(1);expect(countWithinBounds(30)).toBe(20);expect(countWithinBounds(NaN)).toBe(8);expect(countWithinBounds(2.6)).toBe(3)})
 it('chooses the nearest equipment even outside its illustration',()=>{const spots=[{x:0,y:0},{x:100,y:100}];expect(nearestActivity(120,90,spots)).toBe(1);expect(nearestActivity(-30,0,spots)).toBe(0)})
 it('draws twelve distinct ridges, not captured fingerprint data',()=>{const p=fingerprintPaths();expect(new Set(p).size).toBe(12);expect(p.every(d=>d.includes('C')&&!d.includes('NaN'))).toBe(true)})
 it('has eight activities and complete localized prompts',()=>{expect(ACTIVITIES).toHaveLength(8);for(const c of Object.values(PRINTS_COPY)){expect(c.activities).toHaveLength(8);for(const v of Object.values(c))expect(v.length).toBeGreaterThan(0)}expect(PRINTS_COPY.ru.stamp).toBe('Нажми пальчиком на экран и оставь свой отпечаток');expect(PRINTS_COPY.ru.awaken).toBe('Нажми на стрелочку и оживи картинку')})
})
