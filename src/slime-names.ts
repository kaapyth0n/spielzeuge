import type { Lang } from './languages.ts'
const NAMES = [
 ['Капелька','Tröpfchen','Droplet'],['Пушинка','Flöckchen','Fluffy'],['Ириска','Toffee','Toffee'],['Бусинка','Perlchen','Pearl'],
 ['Лучик','Sonnenstrahl','Sunny'],['Зефирка','Marshmallow','Marshmallow'],['Кнопочка','Knöpfchen','Button'],['Росинка','Tautropfen','Dewdrop'],
 ['Пузырик','Bläschen','Bubbles'],['Карамелька','Karamell','Caramel'],['Снежинка','Schneeflocke','Snowflake'],['Звёздочка','Sternchen','Twinkle'],
] as const
export function cleanBabyName(value: unknown): string {
 return typeof value==='string'?Array.from(value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()).slice(0,32).join(''):''
}
export function babyName(baby: {name?:string}, index: number, lang: Lang): string {
 if(baby.name) return baby.name
 const name=NAMES[index%NAMES.length][lang==='ru'?0:lang==='de'?1:2]
 return index<NAMES.length?name+ '':`${name} ${Math.floor(index/NAMES.length)+1}`
}
