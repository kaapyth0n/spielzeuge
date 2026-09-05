import {
  HAIR_COLORS,
  clothesById,
  shoeById,
  type ClothesItem,
  type Outfit,
  type ShoeItem,
  type Slot,
} from './chunyashka-state.ts'

const SKIN = '#e8c4a0'
const SKIN_SHADOW = '#d4a888'
const ONESIE = '#f3e6c4'
const ONESIE_TRIM = '#d4a45a'

function hairBack(outfit: Outfit): string {
  const { fill } = HAIR_COLORS[outfit.color]
  const { hair } = outfit
  if (hair === 'long' || hair === 'braid') {
    return `<path d="M48 86 C36 140 40 210 58 300 L84 298 C66 210 62 140 70 96 Z" fill="${fill}"/>
      <path d="M172 86 C184 140 180 210 162 300 L136 298 C154 210 158 140 150 96 Z" fill="${fill}"/>`
  }
  if (hair === 'pigtails') {
    return `<circle cx="44" cy="108" r="24" fill="${fill}"/>
      <circle cx="176" cy="108" r="24" fill="${fill}"/>
      <circle cx="44" cy="86" r="9" fill="#c45a6a"/>
      <circle cx="176" cy="86" r="9" fill="#c45a6a"/>`
  }
  if (hair === 'pony') {
    return `<ellipse cx="168" cy="54" rx="22" ry="36" fill="${fill}"/>`
  }
  if (hair === 'curly') {
    return `<circle cx="52" cy="96" r="16" fill="${fill}"/><circle cx="168" cy="96" r="16" fill="${fill}"/>`
  }
  return ''
}

function hairFront(outfit: Outfit): string {
  const { fill, lit } = HAIR_COLORS[outfit.color]
  const { hair } = outfit
  if (hair === 'short') {
    return `<path d="M54 78 C56 38 88 22 110 22 C132 22 164 38 166 78 C160 52 138 44 110 44 C82 44 60 52 54 78 Z" fill="${fill}"/>`
  }
  if (hair === 'pigtails') {
    return `<path d="M58 70 C60 34 86 20 110 20 C134 20 160 34 162 70 C154 48 132 40 110 40 C88 40 66 48 58 70 Z" fill="${fill}"/>`
  }
  if (hair === 'bun') {
    return `<circle cx="110" cy="18" r="26" fill="${fill}"/>
      <circle cx="110" cy="14" r="12" fill="${lit}"/>
      <path d="M56 78 C58 40 86 30 110 30 C134 30 162 40 164 78 C156 54 136 50 110 50 C84 50 64 54 56 78 Z" fill="${fill}"/>`
  }
  if (hair === 'bob') {
    return `<path d="M50 78 C52 32 84 18 110 18 C136 18 168 32 170 78 L166 118 C158 90 140 82 110 82 C80 82 62 90 54 118 Z" fill="${fill}"/>`
  }
  if (hair === 'pony') {
    return `<path d="M54 78 C56 34 86 18 110 18 C134 18 164 34 166 78 C160 50 140 40 110 40 C80 40 60 50 54 78 Z" fill="${fill}"/>
      <ellipse cx="150" cy="28" rx="16" ry="14" fill="${fill}"/>`
  }
  if (hair === 'curly') {
    return `<circle cx="68" cy="36" r="16" fill="${fill}"/>
      <circle cx="110" cy="22" r="18" fill="${fill}"/>
      <circle cx="152" cy="36" r="16" fill="${fill}"/>
      <path d="M54 78 C56 40 86 28 110 28 C134 28 164 40 166 78 C158 54 136 48 110 48 C84 48 62 54 54 78 Z" fill="${fill}"/>`
  }
  if (hair === 'braid') {
    return `<path d="M54 78 C56 34 86 18 110 18 C134 18 164 34 166 78 C160 50 140 40 110 40 C80 40 60 50 54 78 Z" fill="${fill}"/>
      <ellipse cx="168" cy="140" rx="12" ry="40" fill="${fill}"/>
      <circle cx="168" cy="178" r="8" fill="#c45a6a"/>`
  }
  return `<path d="M52 82 C54 34 84 16 110 16 C136 16 166 34 168 82 C160 50 140 40 110 40 C80 40 60 50 52 82 Z" fill="${fill}"/>`
}

function onesie(): string {
  return `<g data-base="onesie">
    <path d="M78 132 C78 126 84 122 92 122 L128 122 C136 122 142 126 142 132 L150 148 C168 156 176 176 172 214 L158 214 L152 168 L148 236 L72 236 L68 168 L62 214 L48 214 C44 176 52 156 70 148 Z" fill="${ONESIE}"/>
    <path d="M76 232 L78 338 C78 352 86 360 96 360 L104 360 L106 232 Z" fill="${ONESIE}"/>
    <path d="M114 232 L116 360 L124 360 C134 360 142 352 142 338 L144 232 Z" fill="${ONESIE}"/>
    <path d="M88 122 C92 112 128 112 132 122 C128 128 92 128 88 122 Z" fill="${ONESIE_TRIM}"/>
  </g>`
}

function clothesSvg(item: ClothesItem): string {
  const { kind, fill, trim, id } = item
  if (kind === 'dress') {
    return `<g data-clothes="${id}">
      <path d="M76 138 L144 138 L168 262 C150 278 70 278 52 262 Z" fill="${fill}"/>
      <path d="M76 138 L144 138 L140 152 L80 152 Z" fill="${trim}" opacity="0.55"/>
      <circle cx="110" cy="200" r="6" fill="${trim}" opacity="0.7"/>
    </g>`
  }
  if (kind === 'tunic') {
    return `<g data-clothes="${id}">
      <path d="M78 138 L142 138 L158 230 C140 242 80 242 62 230 Z" fill="${fill}"/>
      <rect x="96" y="150" width="28" height="8" rx="3" fill="${trim}" opacity="0.7"/>
    </g>`
  }
  if (kind === 'sweater') {
    return `<g data-clothes="${id}">
      <path d="M70 140 L150 140 L156 210 L64 210 Z" fill="${fill}"/>
      <path d="M48 148 C40 170 42 200 52 214 L66 206 L70 148 Z" fill="${fill}"/>
      <path d="M172 148 C180 170 178 200 168 214 L154 206 L150 148 Z" fill="${fill}"/>
      <rect x="78" y="140" width="64" height="10" fill="${trim}" opacity="0.45"/>
    </g>`
  }
  if (kind === 'coat') {
    return `<g data-clothes="${id}">
      <path d="M68 136 L152 136 L174 280 C150 292 70 292 46 280 Z" fill="${fill}"/>
      <path d="M110 136 L118 270" stroke="${trim}" stroke-width="3"/>
      <circle cx="102" cy="168" r="4" fill="${trim}"/>
      <circle cx="102" cy="196" r="4" fill="${trim}"/>
      <circle cx="102" cy="224" r="4" fill="${trim}"/>
    </g>`
  }
  if (kind === 'overalls') {
    return `<g data-clothes="${id}">
      <path d="M84 150 L136 150 L140 236 L80 236 Z" fill="${fill}"/>
      <path d="M80 232 L84 338 L104 338 L106 232 Z" fill="${fill}"/>
      <path d="M114 232 L116 338 L136 338 L140 232 Z" fill="${fill}"/>
      <path d="M90 138 L102 150 L118 150 L130 138" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round"/>
      <rect x="98" y="168" width="24" height="10" rx="3" fill="${trim}"/>
    </g>`
  }
  if (kind === 'jumpsuit') {
    return `<g data-clothes="${id}">
      <path d="M74 138 L146 138 L154 236 L66 236 Z" fill="${fill}"/>
      <path d="M76 232 L78 338 C78 352 86 360 96 360 L104 360 L106 232 Z" fill="${fill}"/>
      <path d="M114 232 L116 360 L124 360 C134 360 142 352 142 338 L144 232 Z" fill="${fill}"/>
      <circle cx="110" cy="176" r="5" fill="${trim}"/>
      <circle cx="110" cy="200" r="5" fill="${trim}"/>
    </g>`
  }
  if (kind === 'raincoat') {
    return `<g data-clothes="${id}">
      <path d="M66 132 L154 132 L176 268 C152 284 68 284 44 268 Z" fill="${fill}" opacity="0.95"/>
      <path d="M70 118 C88 108 132 108 150 118 L154 132 L66 132 Z" fill="${fill}"/>
      <rect x="100" y="150" width="20" height="70" rx="6" fill="${trim}" opacity="0.35"/>
    </g>`
  }
  return `<g data-clothes="${id}">
    <path d="M76 138 L144 138 L160 250 C142 262 78 262 60 250 Z" fill="${fill}"/>
    <path d="M88 138 L110 168 L132 138" fill="${trim}"/>
    <rect x="70" y="138" width="80" height="12" fill="${trim}"/>
  </g>`
}

function shoesSvg(item: ShoeItem): string {
  const { kind, fill, trim, id } = item
  if (kind === 'boots') {
    return `<g data-shoes="${id}">
      <path d="M78 318 L104 318 L106 368 C88 376 70 368 74 352 Z" fill="${fill}"/>
      <path d="M116 318 L142 318 L146 352 C150 368 132 376 114 368 Z" fill="${fill}"/>
    </g>`
  }
  if (kind === 'sneakers') {
    return `<g data-shoes="${id}">
      <ellipse cx="90" cy="362" rx="22" ry="12" fill="${trim}"/>
      <ellipse cx="130" cy="362" rx="22" ry="12" fill="${trim}"/>
      <path d="M72 358 Q90 348 108 358" fill="${fill}"/>
      <path d="M112 358 Q130 348 148 358" fill="${fill}"/>
    </g>`
  }
  if (kind === 'ballet') {
    return `<g data-shoes="${id}">
      <ellipse cx="90" cy="360" rx="20" ry="11" fill="${fill}"/>
      <ellipse cx="130" cy="360" rx="20" ry="11" fill="${fill}"/>
      <path d="M90 350 C90 320 110 318 110 300" fill="none" stroke="${fill}" stroke-width="2"/>
      <path d="M130 350 C130 320 110 318 110 300" fill="none" stroke="${fill}" stroke-width="2"/>
    </g>`
  }
  if (kind === 'sandals') {
    return `<g data-shoes="${id}">
      <ellipse cx="90" cy="364" rx="20" ry="8" fill="${trim}"/>
      <ellipse cx="130" cy="364" rx="20" ry="8" fill="${trim}"/>
      <path d="M78 350 Q90 346 102 350" fill="none" stroke="${fill}" stroke-width="3"/>
      <path d="M118 350 Q130 346 142 350" fill="none" stroke="${fill}" stroke-width="3"/>
    </g>`
  }
  if (kind === 'rain') {
    return `<g data-shoes="${id}">
      <path d="M78 300 L104 300 L108 370 C86 380 66 370 72 348 Z" fill="${fill}"/>
      <path d="M116 300 L142 300 L148 348 C154 370 134 380 112 370 Z" fill="${fill}"/>
      <rect x="80" y="312" width="22" height="6" fill="${trim}" opacity="0.5"/>
      <rect x="118" y="312" width="22" height="6" fill="${trim}" opacity="0.5"/>
    </g>`
  }
  return `<g data-shoes="${id}">
    <ellipse cx="90" cy="358" rx="20" ry="12" fill="${fill}"/>
    <ellipse cx="130" cy="358" rx="20" ry="12" fill="${fill}"/>
    <circle cx="90" cy="350" r="5" fill="${trim}"/>
    <circle cx="130" cy="350" r="5" fill="${trim}"/>
  </g>`
}

function eyesSvg(outfit: Outfit): string {
  const { eyes } = outfit
  if (eyes === 'closed') {
    return `<path d="M82 78 Q90 82 98 78" fill="none" stroke="#1c1010" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M122 78 Q130 82 138 78" fill="none" stroke="#1c1010" stroke-width="2.4" stroke-linecap="round"/>`
  }
  if (eyes === 'sleepy') {
    return `<path d="M82 76 Q90 84 98 76" fill="#1c1010"/>
      <path d="M122 76 Q130 84 138 76" fill="#1c1010"/>`
  }
  if (eyes === 'wide') {
    return `<ellipse cx="90" cy="78" rx="8" ry="10" fill="#1c1010"/>
      <ellipse cx="130" cy="78" rx="8" ry="10" fill="#1c1010"/>
      <circle cx="93" cy="75" r="2.4" fill="#f3e6c4"/>
      <circle cx="133" cy="75" r="2.4" fill="#f3e6c4"/>`
  }
  if (eyes === 'lashes') {
    return `<ellipse cx="90" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
      <ellipse cx="130" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
      <path d="M82 70 L80 64 M90 66 L90 60 M98 70 L100 64" stroke="#1c1010" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M122 70 L120 64 M130 66 L130 60 M138 70 L140 64" stroke="#1c1010" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="92" cy="76" r="2" fill="#f3e6c4"/>
      <circle cx="132" cy="76" r="2" fill="#f3e6c4"/>`
  }
  if (eyes === 'spark') {
    return `<ellipse cx="90" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
      <ellipse cx="130" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
      <path d="M90 70 L92 76 L98 78 L92 80 L90 86 L88 80 L82 78 L88 76 Z" fill="#f3e6c4"/>
      <path d="M130 70 L132 76 L138 78 L132 80 L130 86 L128 80 L122 78 L128 76 Z" fill="#f3e6c4"/>`
  }
  return `<ellipse cx="90" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
    <ellipse cx="130" cy="78" rx="6.5" ry="8" fill="#1c1010"/>
    <circle cx="92" cy="76" r="2" fill="#f3e6c4"/>
    <circle cx="132" cy="76" r="2" fill="#f3e6c4"/>`
}

function browsSvg(outfit: Outfit): string {
  const { brows } = outfit
  if (brows === 'none') return ''
  if (brows === 'raised') {
    return `<path d="M80 62 Q90 54 100 62" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M120 62 Q130 54 140 62" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>`
  }
  if (brows === 'thick') {
    return `<path d="M78 64 Q90 58 102 64" fill="none" stroke="#3a2a28" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M118 64 Q130 58 142 64" fill="none" stroke="#3a2a28" stroke-width="3.4" stroke-linecap="round"/>`
  }
  if (brows === 'tiny') {
    return `<path d="M84 64 L96 64" stroke="#3a2a28" stroke-width="2" stroke-linecap="round"/>
      <path d="M124 64 L136 64" stroke="#3a2a28" stroke-width="2" stroke-linecap="round"/>`
  }
  if (brows === 'worry') {
    return `<path d="M80 66 Q90 58 100 64" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M120 64 Q130 58 140 66" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>`
  }
  return `<path d="M80 64 Q90 60 100 64" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M120 64 Q130 60 140 64" fill="none" stroke="#3a2a28" stroke-width="2.2" stroke-linecap="round"/>`
}

function smileSvg(outfit: Outfit): string {
  const { smile } = outfit
  if (smile === 'smile') {
    return `<path d="M96 108 Q110 120 124 108" fill="none" stroke="#8a4a48" stroke-width="2.6" stroke-linecap="round"/>`
  }
  if (smile === 'grin') {
    return `<path d="M94 106 Q110 124 126 106 Q110 114 94 106 Z" fill="#f3e6c4" stroke="#8a4a48" stroke-width="1.8"/>`
  }
  if (smile === 'oh') {
    return `<ellipse cx="110" cy="112" rx="7" ry="8" fill="none" stroke="#8a4a48" stroke-width="2.2"/>`
  }
  if (smile === 'tiny') {
    return `<path d="M104 110 Q110 114 116 110" fill="none" stroke="#8a4a48" stroke-width="2" stroke-linecap="round"/>`
  }
  if (smile === 'closed') {
    return `<path d="M98 110 Q110 118 122 110" fill="none" stroke="#8a4a48" stroke-width="2.4" stroke-linecap="round"/>`
  }
  return `<path d="M98 108 Q110 116 122 108" fill="none" stroke="#8a4a48" stroke-width="2.4" stroke-linecap="round"/>`
}

function cheeksSvg(outfit: Outfit): string {
  const { cheeks } = outfit
  if (cheeks === 'none') return ''
  if (cheeks === 'peach') {
    return `<ellipse cx="86" cy="96" rx="10" ry="6" fill="#e8b898" opacity="0.7"/>
      <ellipse cx="134" cy="96" rx="10" ry="6" fill="#e8b898" opacity="0.7"/>`
  }
  if (cheeks === 'round') {
    return `<circle cx="84" cy="96" r="11" fill="#e8a090" opacity="0.55"/>
      <circle cx="136" cy="96" r="11" fill="#e8a090" opacity="0.55"/>`
  }
  if (cheeks === 'dots') {
    return `<circle cx="82" cy="94" r="2.2" fill="#e8a090"/><circle cx="88" cy="98" r="2.2" fill="#e8a090"/><circle cx="84" cy="102" r="2.2" fill="#e8a090"/>
      <circle cx="138" cy="94" r="2.2" fill="#e8a090"/><circle cx="132" cy="98" r="2.2" fill="#e8a090"/><circle cx="136" cy="102" r="2.2" fill="#e8a090"/>`
  }
  if (cheeks === 'high') {
    return `<ellipse cx="84" cy="88" rx="9" ry="5" fill="#e8a090" opacity="0.5"/>
      <ellipse cx="136" cy="88" rx="9" ry="5" fill="#e8a090" opacity="0.5"/>`
  }
  return `<ellipse cx="86" cy="96" rx="10" ry="6" fill="#e8a090" opacity="0.55"/>
    <ellipse cx="134" cy="96" rx="10" ry="6" fill="#e8a090" opacity="0.55"/>`
}

function face(outfit: Outfit): string {
  return `<g data-face="true">
    <ellipse cx="110" cy="78" rx="48" ry="52" fill="${SKIN}"/>
    <path d="M78 118 C92 128 128 128 142 118 C136 132 84 132 78 118 Z" fill="${SKIN_SHADOW}" opacity="0.35"/>
    ${cheeksSvg(outfit)}
    ${browsSvg(outfit)}
    ${eyesSvg(outfit)}
    <ellipse cx="110" cy="94" rx="5" ry="3.5" fill="${SKIN_SHADOW}"/>
    ${smileSvg(outfit)}
  </g>`
}

function hands(): string {
  return `<ellipse cx="52" cy="216" rx="12" ry="10" fill="${SKIN}"/>
    <ellipse cx="168" cy="216" rx="12" ry="10" fill="${SKIN}"/>`
}

function clothesLayer(outfit: Outfit): string {
  const item = clothesById(outfit.clothes)
  return item ? clothesSvg(item) : ''
}

function shoesLayer(outfit: Outfit): string {
  if (outfit.shoes === 'none') return ''
  const item = shoeById(outfit.shoes)
  return item ? shoesSvg(item) : ''
}

export function renderDoll(outfit: Outfit): string {
  return `<svg class="doll" viewBox="0 0 220 400" aria-hidden="true" focusable="false">
    <ellipse cx="110" cy="372" rx="70" ry="12" fill="rgba(0,0,0,0.18)"/>
    ${hairBack(outfit)}
    ${onesie()}
    ${clothesLayer(outfit)}
    ${hands()}
    ${face(outfit)}
    ${hairFront(outfit)}
    ${shoesLayer(outfit)}
  </svg>`
}

export function renderChip(slot: Slot, id: string, base: Outfit): string {
  const mini: Outfit = { ...base, [slot]: id } as Outfit
  if (slot === 'color') {
    const { fill } = HAIR_COLORS[mini.color]
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="${fill}"/></svg>`
  }
  if (slot === 'hair') {
    return `<svg viewBox="20 0 180 150" aria-hidden="true">${hairBack(mini)}${face(mini)}${hairFront(mini)}</svg>`
  }
  if (slot === 'eyes' || slot === 'brows' || slot === 'smile' || slot === 'cheeks') {
    return `<svg viewBox="50 40 120 100" aria-hidden="true">${face(mini)}</svg>`
  }
  if (slot === 'clothes') {
    return `<svg viewBox="40 110 140 180" aria-hidden="true">${onesie()}${clothesLayer(mini)}</svg>`
  }
  return `<svg viewBox="60 300 100 80" aria-hidden="true">${onesie()}${shoesLayer(mini)}</svg>`
}
