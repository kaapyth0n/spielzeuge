import type { Lang } from './languages.ts'
type Names = Record<Lang, string>
const names = (ru: string, de: string, en: string): Names => ({ru,de,en})
export const VISITORS = [
 {id:'mira',owner:names('Мира','Mira','Mira'),slime:names('Облачко','Wölkchen','Cloud'),genitive:'Облачка',dative:'Облачку',avatar:'👩🏻‍🌾',color:'#a8d6ef',accessory:'🌼',intro:names('Мы любим играть в мяч и выращивать цветы.','Wir spielen gern Ball und pflanzen Blumen.','We love playing ball and growing flowers.')},
 {id:'leo',owner:names('Лев','Leo','Leo'),slime:names('Искорка','Fünkchen','Spark'),genitive:'Искорки',dative:'Искорке',avatar:'👨🏽‍🚀',color:'#ffd178',accessory:'⭐',intro:names('Мы мечтаем долететь до звёзд!','Wir träumen davon, zu den Sternen zu fliegen!','We dream of flying to the stars!')},
 {id:'aya',owner:names('Ая','Aya','Aya'),slime:names('Мармеладка','Gummibärchen','Jellybean'),genitive:'Мармеладки',dative:'Мармеладке',avatar:'👩🏾‍🎨',color:'#eea8c7',accessory:'🎨',intro:names('Мы рисуем радуги и придумываем новые цвета.','Wir malen Regenbögen und erfinden neue Farben.','We paint rainbows and invent new colors.')},
 {id:'tim',owner:names('Тим','Tim','Tim'),slime:names('Пружинка','Federchen','Bounce'),genitive:'Пружинки',dative:'Пружинке',avatar:'👨🏻‍🦱',color:'#b7dfa0',accessory:'🧢',intro:names('Кто подпрыгнет выше? Давайте играть!','Wer springt am höchsten? Spielen wir!','Who can bounce the highest? Let’s play!')},
 {id:'nora',owner:names('Нора','Nora','Nora'),slime:names('Черничка','Heidelbeere','Blueberry'),genitive:'Чернички',dative:'Черничке',avatar:'👩🏼‍🦰',color:'#b8a1e1',accessory:'🎀',intro:names('Мы немного стесняемся, но очень рады новым друзьям.','Wir sind etwas schüchtern, freuen uns aber über neue Freunde.','We’re a little shy, but we love meeting new friends.')},
 {id:'sam',owner:names('Сэм','Sam','Sam'),slime:names('Персик','Pfirsich','Peach'),genitive:'Персика',dative:'Персику',avatar:'👨🏿‍🍳',color:'#ffbd98',accessory:'🍑',intro:names('После прогулки мы устроим пикник!','Nach dem Spaziergang machen wir ein Picknick!','After our walk, we’re having a picnic!')},
] as const
export type VisitorId = typeof VISITORS[number]['id']
export const isVisitor = (id: unknown): id is VisitorId => VISITORS.some(v=>v.id===id)
export const visitorById = (id: VisitorId) => VISITORS.find(v=>v.id===id)!

/** Fill character names after translating the shared park dialogue, including Russian cases. */
export function visitorText(text: string, lang: Lang, id: VisitorId): string {
 const v=visitorById(id)
 const words: Record<string,string> = lang==='ru' ? {'Мира':v.owner.ru,'Облачко':v.slime.ru,'Облачка':v.genitive,'Облачку':v.dative} : lang==='de'?{'Mira':v.owner.de,'Wölkchen':v.slime.de}:{'Mira':v.owner.en,'Cloud':v.slime.en}
 return text.replace(lang==='ru'?/Мира|Облачко|Облачка|Облачку/g:lang==='de'?/Mira|Wölkchen/g:/Mira|Cloud/g,key=>words[key])
}
