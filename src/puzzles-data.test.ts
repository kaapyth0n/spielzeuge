import { describe,it,expect } from 'vitest'
import {animals,layouts,copy} from './puzzles-data'
// @ts-expect-error Node runtime APIs are provided by Vitest, not the browser type target.
import {existsSync,readFileSync} from 'node:fs'
describe('animal puzzle content',()=>{
it('ships distinct photographs with attribution',()=>{const manifest=JSON.parse(readFileSync('public/puzzles/manifest.json','utf8'));expect(animals.filter(a=>a.level===0)).toHaveLength(5);expect(animals.filter(a=>a.level===1).length).toBeGreaterThanOrEqual(12);expect(animals.filter(a=>a.level===2).length).toBeGreaterThanOrEqual(6);expect(new Set(manifest.map((a:any)=>a.sha256)).size).toBe(animals.length);for(const a of animals){expect(existsSync('public/puzzles/images/'+a.id+'.webp')).toBe(true);const m=manifest.find((m:any)=>m.id===a.id);expect(m?.license).toBeTruthy();expect(m?.author).toBeTruthy();for(const l of ['ru','de','en'] as const)expect(a.name[l]).toBeTruthy();if(a.sound)expect(existsSync('public/sounds/'+a.sound+'.mp3')).toBe(true)}});
it('orders mother father baby without pretend baby calls',()=>{for(const family of new Set(animals.filter(a=>a.role).map(a=>a.family))){const group=animals.filter(a=>a.family===family);expect(group.map(a=>a.role)).toEqual(['mother','father','baby']);expect(group[2].sound).toBeUndefined()}});
it('covers image with generous pieces',()=>{layouts.forEach((layout,i)=>{expect(layout.length).toBe(i+2);expect(layout.reduce((n,[,,w,h])=>n+w*h,0)).toBe(1);for(const [,,w,h] of layout){expect(w).toBeGreaterThanOrEqual(.5);expect(h).toBeGreaterThanOrEqual(.5)}});for(const l of ['ru','de','en'] as const)expect(copy[l].levels).toHaveLength(3)})
})
