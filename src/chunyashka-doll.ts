import type { DressId, HairId, Outfit, ShoeId } from './chunyashka-state.ts'

const HAIR = '#4a2c16'
const HAIR_LIT = '#6a4220'
const SKIN = '#e8c4a0'
const SKIN_SHADOW = '#d4a888'
const ONESIE = '#f3e6c4'
const ONESIE_TRIM = '#d4a45a'
const CHEEK = '#e8a090'

function hairBack(id: HairId): string {
  if (id === 'long') {
    return `<path d="M48 86 C36 140 40 210 58 300 L84 298 C66 210 62 140 70 96 Z" fill="${HAIR}"/>
      <path d="M172 86 C184 140 180 210 162 300 L136 298 C154 210 158 140 150 96 Z" fill="${HAIR}"/>`
  }
  if (id === 'pigtails') {
    return `<circle cx="44" cy="108" r="24" fill="${HAIR}"/>
      <circle cx="176" cy="108" r="24" fill="${HAIR}"/>
      <circle cx="44" cy="86" r="9" fill="#c45a6a"/>
      <circle cx="176" cy="86" r="9" fill="#c45a6a"/>`
  }
  return ''
}

function hairFront(id: HairId): string {
  if (id === 'short') {
    return `<path d="M54 78 C56 38 88 22 110 22 C132 22 164 38 166 78 C160 52 138 44 110 44 C82 44 60 52 54 78 Z" fill="${HAIR}"/>`
  }
  if (id === 'pigtails') {
    return `<path d="M58 70 C60 34 86 20 110 20 C134 20 160 34 162 70 C154 48 132 40 110 40 C88 40 66 48 58 70 Z" fill="${HAIR}"/>`
  }
  if (id === 'bun') {
    return `<circle cx="110" cy="18" r="26" fill="${HAIR}"/>
      <circle cx="110" cy="14" r="12" fill="${HAIR_LIT}"/>
      <path d="M56 78 C58 40 86 30 110 30 C134 30 162 40 164 78 C156 54 136 50 110 50 C84 50 64 54 56 78 Z" fill="${HAIR}"/>`
  }
  return `<path d="M52 82 C54 34 84 16 110 16 C136 16 166 34 168 82 C160 50 140 40 110 40 C80 40 60 50 52 82 Z" fill="${HAIR}"/>`
}

function onesie(): string {
  return `<g data-base="onesie">
    <path d="M78 132 C78 126 84 122 92 122 L128 122 C136 122 142 126 142 132 L150 148 C168 156 176 176 172 214 L158 214 L152 168 L148 236 L72 236 L68 168 L62 214 L48 214 C44 176 52 156 70 148 Z" fill="${ONESIE}"/>
    <path d="M76 232 L78 338 C78 352 86 360 96 360 L104 360 L106 232 Z" fill="${ONESIE}"/>
    <path d="M114 232 L116 360 L124 360 C134 360 142 352 142 338 L144 232 Z" fill="${ONESIE}"/>
    <path d="M88 122 C92 112 128 112 132 122 C128 128 92 128 88 122 Z" fill="${ONESIE_TRIM}"/>
    <circle cx="70" cy="156" r="3.2" fill="${ONESIE_TRIM}"/>
    <circle cx="150" cy="156" r="3.2" fill="${ONESIE_TRIM}"/>
    <circle cx="110" cy="176" r="3.2" fill="${ONESIE_TRIM}"/>
    <circle cx="110" cy="198" r="3.2" fill="${ONESIE_TRIM}"/>
  </g>`
}

function dress(id: DressId): string {
  if (id === 'onesie') return ''
  const fill =
    id === 'berry' ? '#c45a6a' : id === 'sky' ? '#5a8ab4' : id === 'sun' ? '#e0b04a' : '#5a9a6a'
  const trim =
    id === 'berry' ? '#f3e6c4' : id === 'sky' ? '#f3e6c4' : id === 'sun' ? '#6a4220' : '#f3e6c4'
  return `<g data-dress="${id}">
    <path d="M76 138 L144 138 L168 262 C150 278 70 278 52 262 Z" fill="${fill}"/>
    <path d="M76 138 L144 138 L140 152 L80 152 Z" fill="${trim}" opacity="0.55"/>
    <circle cx="110" cy="200" r="6" fill="${trim}" opacity="0.7"/>
    <circle cx="92" cy="228" r="4" fill="${trim}" opacity="0.55"/>
    <circle cx="128" cy="228" r="4" fill="${trim}" opacity="0.55"/>
  </g>`
}

function shoes(id: ShoeId): string {
  if (id === 'none') return ''
  if (id === 'boots') {
    return `<g data-shoes="boots">
      <path d="M78 330 L104 330 L106 368 C88 376 70 368 74 352 Z" fill="#6a4220"/>
      <path d="M116 330 L142 330 L146 352 C150 368 132 376 114 368 Z" fill="#6a4220"/>
    </g>`
  }
  if (id === 'sneakers') {
    return `<g data-shoes="sneakers">
      <ellipse cx="90" cy="362" rx="22" ry="12" fill="#f3e6c4"/>
      <ellipse cx="130" cy="362" rx="22" ry="12" fill="#f3e6c4"/>
      <path d="M72 358 Q90 348 108 358" fill="#5a8ab4"/>
      <path d="M112 358 Q130 348 148 358" fill="#5a8ab4"/>
    </g>`
  }
  return `<g data-shoes="ballet">
    <ellipse cx="90" cy="360" rx="20" ry="11" fill="#c45a6a"/>
    <ellipse cx="130" cy="360" rx="20" ry="11" fill="#c45a6a"/>
    <path d="M90 350 C90 320 110 318 110 300" fill="none" stroke="#c45a6a" stroke-width="2"/>
    <path d="M130 350 C130 320 110 318 110 300" fill="none" stroke="#c45a6a" stroke-width="2"/>
  </g>`
}

function face(): string {
  return `<g data-face="true">
    <ellipse cx="110" cy="78" rx="48" ry="52" fill="${SKIN}"/>
    <ellipse cx="110" cy="86" rx="40" ry="42" fill="${SKIN}" />
    <path d="M78 118 C92 128 128 128 142 118 C136 132 84 132 78 118 Z" fill="${SKIN_SHADOW}" opacity="0.35"/>
    <ellipse cx="86" cy="96" rx="10" ry="6" fill="${CHEEK}" opacity="0.55"/>
    <ellipse cx="134" cy="96" rx="10" ry="6" fill="${CHEEK}" opacity="0.55"/>
    <ellipse cx="90" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
    <ellipse cx="130" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
    <circle cx="92" cy="76" r="2" fill="#f3e6c4"/>
    <circle cx="132" cy="76" r="2" fill="#f3e6c4"/>
    <ellipse cx="110" cy="94" rx="5" ry="3.5" fill="${SKIN_SHADOW}"/>
    <path d="M98 108 Q110 116 122 108" fill="none" stroke="#8a4a48" stroke-width="2.4" stroke-linecap="round"/>
  </g>`
}

function hands(): string {
  return `<ellipse cx="52" cy="216" rx="12" ry="10" fill="${SKIN}"/>
    <ellipse cx="168" cy="216" rx="12" ry="10" fill="${SKIN}"/>`
}

export function renderDoll(outfit: Outfit): string {
  return `<svg class="doll" viewBox="0 0 220 400" aria-hidden="true" focusable="false">
    <ellipse cx="110" cy="372" rx="70" ry="12" fill="rgba(0,0,0,0.18)"/>
    ${hairBack(outfit.hair)}
    ${onesie()}
    ${dress(outfit.dress)}
    ${hands()}
    ${face()}
    ${hairFront(outfit.hair)}
    ${shoes(outfit.shoes)}
  </svg>`
}

export function renderChip(slot: 'hair' | 'dress' | 'shoes', id: string): string {
  const mini: Outfit = {
    hair: slot === 'hair' ? (id as HairId) : 'short',
    dress: slot === 'dress' ? (id as DressId) : 'onesie',
    shoes: slot === 'shoes' ? (id as ShoeId) : 'none',
  }
  if (slot === 'hair') {
    return `<svg viewBox="20 0 180 150" aria-hidden="true">${hairBack(mini.hair)}${face()}${hairFront(mini.hair)}</svg>`
  }
  if (slot === 'dress') {
    return `<svg viewBox="40 110 140 180" aria-hidden="true">${onesie()}${dress(mini.dress)}</svg>`
  }
  return `<svg viewBox="60 310 100 70" aria-hidden="true">${onesie()}${shoes(mini.shoes)}</svg>`
}
