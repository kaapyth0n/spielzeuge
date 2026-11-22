import type { Diner } from './devochka-guests.ts'
import type { Food } from './devochka-copy.ts'
import type { Notebook } from './devochka-state.ts'

// Shared paper flecks for the larger vector stickers and the editable friend.
export const pencilFilter = `<svg class="grain-def" width="0" height="0" aria-hidden="true"><defs><filter id="pencil-grain" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".46 .29" numOctaves="2" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="1.25" result="pencil"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 .94  0 0 0 0 .80  2.6 0 0 0 -1.20"/><feComposite in2="pencil" operator="in"/><feMerge><feMergeNode in="pencil"/><feMergeNode/></feMerge></filter></defs></svg>`

const lines = {
  gear: '<path d="m9.5 2-.6 2.7-2.1 1.2-2.6-.8-2 3.4 2 1.9v3.1l-2 1.9 2 3.4 2.6-.8 2.1 1.2.6 2.8h4l.6-2.8 2.2-1.2 2.6.8 2-3.4-2-1.9v-3.1l2-1.9-2-3.4-2.6.8-2.2-1.2-.6-2.7z"/><circle cx="11.6" cy="12" r="3.4"/>',
  back: '<path d="m14 5-7 7 7 7M7 12h14"/>',
  shop: '<path d="m3 9 2-6h14l2 6M3 9c0 4 5 4 6 0 1 4 5 4 6 0 1 4 6 4 6 0M5 12v9h14v-9M9 21v-6h5v6"/>',
  home: '<path d="m2 11 10-8 10 8M5 10v11h14V10M10 21v-7h4v7"/>',
  games:
    '<path d="m3 9 4-4 5 3 5-3 4 4 1 9c0 3-3 3-5 0l-1-2H8l-2 2c-2 3-5 3-4 0zM6 11h4m-2-2v4m7-2h.1m3 2h.1"/>',
  album:
    '<path d="M5 3h14a1 1 0 0 1 1 1v17H6q-3 0-3-3V5q0-2 2-2Zm0 14h15M7 3v14"/><path d="m13 6 1 2 2 .5-1.4 1.5.2 2-1.8-1-1.8 1 .3-2-1.6-1.5 2.1-.4z"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3zM16 8q4 4 0 8m3-11q7 7 0 14"/>',
  silent: '<path d="M3 9h4l5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  basket: '<path d="M2 10h20l-3 10H5zM6 10l5-7m7 7-5-7m-5 10 1 4m3-4v4m4-4-1 4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  receipt: '<path d="M5 3l3 2 3-2 3 2 4-2v18l-3-2-3 2-3-2-4 2zM8 8h7m-7 4h7m-7 4h4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 13M8 16 20 3"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  brush: '<path d="m9 14 9-11q3-2 3 1L11 17zm0 1q-5-1-5 4 0 1-2 2 6 2 9-4z"/>',
  hand: '<path d="M8 14V7q1-3 3 0v5-8q1-3 3 0v8-6q1-2 3 0v7-3q2-2 3 1l-1 7q-2 4-6 4-3 0-5-2l-5-6q-1-3 2-2z"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M5 12h14"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M8 15q0 3 3 4"/>',
  repeat: '<path d="M20 11a8 8 0 1 0-2 7M20 4v7h-7"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  heart: '<path d="M12 21 4 13C-2 5 7 0 12 7 18 0 26 6 20 13z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2m0-16-2 2M6 18l-2 2"/>',
  note: '<path d="M8 17V5l12-2v12M8 9l12-2"/><ellipse cx="5" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
}
export function icon(name: keyof typeof lines, size = 22): string {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${lines[name]}</svg>`
}
export function coin(size = 21): string {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 32 32"><path d="M29 17c0 8-6 13-14 13S2 24 2 16 8 2 16 2s13 7 13 15Z" fill="#f5bc4f" stroke="#724b30" stroke-width="1.7"/><ellipse cx="15.3" cy="15" rx="10.5" ry="11" fill="#ffda72" stroke="#c58c36" stroke-width="1.2"/><path d="m15 8 2 4.8 5 .3-3.9 3.5 1.1 5-4.4-2.6-4.5 2.5 1-5-3.8-3.4 5.2-.5Z" fill="#e5a336" stroke="#936329" stroke-width=".9"/><path d="M6 11q2-5 7-6" fill="none" stroke="#fff3a8" stroke-width="2" stroke-linecap="round"/></svg>`
}
export function foodImage(id: Food, cls = ''): string {
  return `<img class="food-img ${cls}" src="/devochka/${id}.webp" alt="" draggable="false">`
}
const drawings: Record<string, string> = {
  star: '<path fill="#fbc858" d="m48 7 14 24 26 5-19 22 3 29-23-13-25 11 4-27L9 37l28-4Z"/><path d="m48 16 6 20 21 4m-54 4 13 14-4 16" stroke="#fff0a3" fill="none"/><path d="m44 45 1 2m14-2 1 2m-15 8q6 6 12-1" stroke="#715442" fill="none"/>',
  sun: '<circle cx="49" cy="49" r="23" fill="#f7c357"/><path d="m49 9 1 11m26 0-8 10m21 17-12 1m-5 25-8-8M50 88V77m-28-2 9-9M9 49h12m1-28 9 10" fill="none" stroke="#c98334" stroke-width="5"/><path d="m39 46 1 1m17-1 1 1m-14 10q7 6 14-2" fill="none"/>',
  window:
    '<path fill="#f5bf65" d="m14 12 70-1 3 77-75 1z"/><path fill="#8ec6d5" d="m21 19 54-1 3 60-58 2z"/><path fill="#f9d262" d="M42 21a12 12 0 1 1-19 12q1-10 9-12z"/><path fill="#91af74" d="m21 65 17-14 11 9 12-16 15 17 1 16-56 2z"/><path fill="#f2bc65" d="m46 19 5-1 2 60h-7zm-26 27 57-1v5l-56 1zm-11 36 80-1 1 9-82 2z"/><path fill="#e8897f" d="m18 17 19 1q-3 17-17 23zm61 0-17 1q3 15 16 22z"/>',
  cat: '<path fill="#efb86e" d="M19 58 14 16l25 17q14-5 24 0l23-17-3 41q8 30-28 32-37 3-36-31Z"/><path fill="#f8d1ac" d="m20 25 4 19 9-8zm57 17 4-17-12 11z"/><path fill="#f9e4bc" d="M32 62q5-11 17-4 13-8 19 2 1 17-17 18-17 2-19-16Z" stroke="none"/><path d="m39 34 4 10m9-12 1 10m11-8-3 9M28 55q4-7 9-1m24 1q4-7 9-1m-23 8 5 3 4-4Zm4 3q1 5-4 6m5-6q0 5 4 5M24 65l-17-2m18 8L8 76m69-13 16-4m-16 11 16 3" fill="none"/>',
  flower:
    '<path d="M46 91q18-23 6-56" fill="none" stroke="#50794c" stroke-width="5"/><path fill="#82aa66" d="M50 75q9-22 28-21-7 19-28 21Zm2-6Q32 69 26 53q23-1 26 16Z"/><g fill="#fff3d0"><ellipse cx="50" cy="19" rx="10" ry="15"/><ellipse cx="68" cy="30" rx="15" ry="10" transform="rotate(-32 68 30)"/><ellipse cx="66" cy="48" rx="14" ry="9" transform="rotate(36 66 48)"/><ellipse cx="45" cy="49" rx="10" ry="15" transform="rotate(20 45 49)"/><ellipse cx="32" cy="33" rx="16" ry="10"/></g><circle fill="#f4ba46" cx="50" cy="35" r="12"/><path d="m44 34 2-3m3 8 5-7m2 4 2-3" stroke="#b68138"/>',
  kite: '<path fill="none" d="M45 68q-5 19 10 18t22 7"/><path fill="#f29c75" d="m48 7 36 24-39 40-29-38z"/><path fill="#f6cd61" d="m48 7 1 25-33 1z"/><path fill="#76b6b1" d="m49 32 35-1-39 40z"/><path fill="none" d="m49 14-4 51m-24-32 56-2"/><path fill="#d77f88" d="m44 77-7-4 1 9 7-4 6 4 1-9zm18 10-4-6-3 8 6-2 6 6 1-8z"/>',
  moon: '<path fill="#f8cd68" d="M71 10Q35 8 23 39q-10 29 13 44 27 16 48-12-26 6-40-15-15-26 27-46Z"/><path fill="none" d="M32 50q5 5 9 0m-9 8q3 5 7 4"/><path fill="#edac50" d="m74 25 3 8 8 2-7 5 1 9-7-6-8 3 3-8-5-7 9 1z"/>',
  teapot:
    '<path fill="#84bbac" d="M26 41q-5 9-2 20L12 45l-9 2 15 26q17 20 44 14 20-4 18-23 25-1 17-22-5-13-19-7l3 7q10-2 11 6 0 9-13 8-2-11-10-15Z"/><path fill="#e9bd61" d="M20 42q25-5 54-2l-5-8q-18-11-38-3z"/><circle fill="#db8b64" cx="49" cy="23" r="5"/><g fill="#fcf1c6" stroke="none"><circle cx="32" cy="55" r="4"/><circle cx="51" cy="51" r="4"/><circle cx="64" cy="63" r="4"/><circle cx="43" cy="70" r="4"/></g>',
  boat: '<path fill="#86bdb9" d="M9 80q10-8 19 0 11-8 21-1 12-8 24-1l15-6 2 10q-30 14-79 6Z" stroke="none"/><path fill="#f0a590" d="m8 52 29-8 16-29 14 30 25 5-18 24-42 1Z"/><path fill="#ffdc85" d="m21 53 32-38 11 38-19 10z"/><path fill="#f5dbac" d="m8 52 37 11 47-13-25 25-34 1Z"/><path fill="none" d="m45 63 9-38m-20 44 9-5"/>',
  cake: '<path fill="#c5d7c8" d="M8 85q33-12 85-3-24 13-85 7z"/><path fill="#e9ac78" d="m20 49 60-1 1 32q-27 8-61 1z"/><path fill="#eea1aa" d="M18 48q4-14 32-15 23 0 32 12 3 12-6 10-3 14-11 0-3 11-9 1-4 13-10 2-8 12-12-2-7 7-8-1-9 5-8-7Z"/><path fill="#9cc5bb" d="M46 37V17l6-1 1 21z"/><path fill="#eeb343" d="M49 19q-8-4 1-16 8 13-1 16Z"/><path d="m25 70 50-1m-49 6 48-1" stroke="#e5c597"/>',
  dog: '<path fill="#b27752" d="M31 31Q11 12 8 44q-6 28 12 21l12-18m39-15q23-16 22 13 1 26-14 19l-14-18"/><path fill="#e4ba83" d="M22 53q-1-28 29-29 29-1 31 29 5 33-31 36-29 0-29-36Z"/><path fill="#fcdfb6" stroke="none" d="M33 67q3-14 17-9 15-6 20 8-1 18-18 17-19 1-19-16Z"/><path fill="#413b4e" d="m45 60 12-1q-3 11-7 8z"/><path fill="none" d="m36 52 1 1m25-1 1 1m-12 16q0 9 7 6m-7-6q0 8-7 7"/>',
  apple:
    '<path fill="#8caa65" d="M52 27Q54 6 79 9 67 26 52 27Z"/><path fill="none" stroke-width="4" d="m50 33 3-14"/><path fill="#e77862" d="M49 32q-20-15-33 4-15 25 9 50 11 9 24 1 13 8 25-1 24-31 9-51-11-15-34-3Z"/><path d="M24 46q4-9 12-9" fill="none" stroke="#ffd0a0" stroke-width="5"/>',
  leaf: '<path fill="#9eb96a" d="M13 77Q0 31 85 13q2 53-57 67z"/><path fill="none" d="M9 90Q44 52 75 27m-44 38 17-1m-3-15 2-14"/>',
  basket:
    '<path fill="none" stroke="#775337" stroke-width="8" d="M18 49q3-43 32-41 26 1 32 41"/><path fill="none" stroke="#e6ac5f" stroke-width="4" d="M18 49q3-43 32-41 26 1 32 41"/><path fill="#dba25e" d="m7 42 85-1-10 41q-27 9-62 2Z"/><path fill="none" stroke="#956839" d="m15 55 73-2m-70 11 67-3m-63 12 59-3m-57-20 9 32m6-35 4 35m13-35-2 35m18-35-6 32"/><path fill="#efbf78" d="m5 40 89-2-2 9-85 2z"/>',
  bunny:
    '<path fill="#f8e7ce" d="M24 50Q7 3 22 5q12 1 21 32 7-2 12 0Q62 3 76 6q11 4-2 40 29 35-18 45-40 4-43-19-1-12 11-22Z"/><path d="m25 16 9 24m35-23-7 23" stroke="#da9b9e" stroke-width="5"/><path d="M33 61v3m29-4v3" stroke="#343d56" stroke-width="5"/><path fill="#c77c79" d="m44 68 9-1-4 5Z"/><path fill="none" d="M49 72q-1 5-5 4m5-4q2 5 6 3"/>',
}
export function art(name: string, cls = ''): string {
  return `<svg class="sketch ${cls}" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="#40465b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${
    drawings[name] ?? ''
  }</svg>`
}
export function jar(index: number): string {
  const contents = [
    '<path d="M31 60q18-17 36 0-1 17-17 22-18-8-19-22Z" fill="#e8837b"/><path d="m42 57 7-8 5 6 7-1-7 7-5-3-7 3z" fill="#759b62"/><path d="m40 65 2 2m11 1 1 3m6-8 1 2m-14 9 1 2"/>',
    '<path d="M29 71q0-23 24-24 11-5 16-3l-2 8q8 20-20 27l-12 1z" fill="#edce5e"/><path d="M37 65q5-11 14-12" fill="none" stroke="#fff0a2"/>',
    '<g fill="#8995bf"><circle cx="40" cy="65" r="11"/><circle cx="59" cy="65" r="11"/><circle cx="51" cy="52" r="10"/></g><path d="m38 60 3 3 3-3m12 1 3 3 3-3m-13-13 2 3 3-2" fill="none"/>',
  ][index]
  const tint = ['#eab1a9', '#f0d79b', '#b3bad3'][index]
  return `<svg viewBox="0 0 100 110" class="sketch jar-art" aria-hidden="true" stroke="#424961" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path fill="#f3ecda" d="M25 22h51v11q9 6 9 15l-1 41q0 9-11 10l-46-1q-11-1-11-11l1-40q1-10 10-14Z"/><path fill="${tint}" d="M21 54q13-5 28 0 17 4 31-1v34q0 7-8 7l-43-1q-8 0-8-8Z"/>${contents}<path fill="#edc17a" d="m23 14 54-1 2 12-57 2z"/><path fill="none" d="m26 19 47-2m-44 16 42-2"/><path fill="none" stroke="#fffdf4" stroke-width="4" d="M26 42q-4 2-3 9m0 4v4"/></svg>`
}
export function character(s: Notebook, diner: Diner = s.diner): string {
  if (diner === 'cat' || diner === 'dog') {
    const file = diner === 'cat' ? 'ginger-cat' : 'puppy'
    return `<img class="character animal-diner" src="/devochka/${file}.webp" alt="" draggable="false">`
  }
  if (diner === 'girl') return '<img class="character drawing" src="/devochka/girl.webp" alt="" draggable="false">'
  const eyes = [
    '<g fill="#313c60"><ellipse cx="42" cy="64" rx="4" ry="5"/><ellipse cx="68" cy="64" rx="4" ry="5"/></g>',
    '<path d="M36 65q6-9 12-1m15 0q5-8 12-1" fill="none"/>',
    '<path d="m41 56 2 5 6 1-4 4 1 5-5-3-4 3 1-6-4-3 5-1zm26 0 2 5 6 1-4 4 1 5-5-3-4 3 1-6-4-3 5-1z" fill="#e7af54"/>',
  ][s.eyes]
  const mouth = [
    '<path d="M48 76q7 8 15-1" fill="none"/>',
    '<ellipse cx="55" cy="77" rx="5" ry="6" fill="#923f50"/>',
    '<path d="M45 75q11 2 21-1-8 21-21 1Z" fill="#b35b65"/><path d="m48 77 13-1" stroke="#fff0d9"/>',
  ][s.mouth]
  return `<svg class="character" viewBox="0 0 110 125" aria-hidden="true" stroke="#4b4050" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path fill="#aa7055" d="M26 53C6 36 1 60 13 76L5 99q23 0 24-28m53-20q24-17 21 14l-3 13 7 17q-21 6-26-22"/><path fill="#d5827e" d="M21 122q4-27 23-34h24q19 3 25 34-29 5-72 0Z"/><path fill="#f5d1a9" d="M21 55q-2-30 29-33 36-5 39 28l-2 24q-6 23-36 20-31-2-30-39Z"/><path fill="#ab7152" d="M20 59Q7 25 37 17q14-9 32 0 27 4 24 39-17-3-25-18-11 16-25 17l4-11q-13 14-27 15Z"/><path d="M21 44q4-12 13-18m-9 16 10-12m5-6-7 11m24-13-12 12m13-10-5 7m8-9 4 4m3 1 6 7m1-4 7 7m-70 32 4 13m-4-9 1 4m86-9-4 11m2-18-2 6" fill="none" stroke="#855342"/>${eyes}${mouth}<path d="m54 69 3 1" fill="none"/><g fill="#fae0a5" stroke="none"><circle cx="37" cy="110" r="3"/><circle cx="53" cy="101" r="3"/><circle cx="71" cy="114" r="3"/></g></svg>`
}
export function bite(food: Food): string {
  if (food === 'water') return foodImage(food)
  const shape = {
    dumpling:
      '<path fill="#fae3af" d="M13 73q-4-15 16-29 11-9 17-22l5 8 8-9 4 14q21 8 26 29 5 19-32 20-36 4-44-11Z"/><path fill="none" stroke="#b38359" d="M49 32q-1 15-16 24m20-20q8 12 5 24m4-20 11 17"/><path d="m3 80 35-12m-35 5 34-20" stroke="#536478" stroke-width="5"/>',
    roll: '<path fill="#536562" d="m16 46 3 26q6 21 42 15 26-3 25-25l-1-24Z"/><ellipse fill="#f6dfb0" cx="50" cy="44" rx="35" ry="22"/><path fill="#e2886c" d="m35 42 12-10 13 7-11 13z"/><path fill="#8eb466" d="m52 48 9-10 8 6-9 8z"/>',
    chips:
      '<path fill="#89b9df" d="M20 60q10-34 43-37 19 1 14 22-6 20-30 32-28 12-27-17Z"/><path d="m28 61 30-30m-29 40 39-37m-29 39 32-29" stroke="#497eaf" fill="none"/>',
  }[food]
  return `<svg class="bite-art" viewBox="0 0 100 100" aria-hidden="true" stroke="#4b4554" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`
}
