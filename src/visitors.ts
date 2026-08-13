export const VISITOR_IDS = [
  'cat',
  'dog',
  'bird',
  'duck',
  'bunny',
  'mouse',
  'cow',
  'bear',
] as const

export type VisitorId = (typeof VISITOR_IDS)[number]

export type Visitor = {
  id: VisitorId
  word: { ru: string; de: string; en: string }
  svg: string
}

export const VISITORS: Visitor[] = [
  {
    id: 'cat',
    word: { ru: 'кошка', de: 'Katze', en: 'cat' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="224" rx="50" ry="8" fill="rgba(28,14,10,.32)"/>
        <g class="part-tail">
          <path d="M142 156c46 4 50-48 28-72" fill="none" stroke="#b56a32" stroke-width="15" stroke-linecap="round"/>
          <path d="M168 86c-6-12 2-22 12-16 6 4 4 16-6 20-6 2-8-2-6-4z" fill="#d9b48a"/>
        </g>
        <ellipse cx="102" cy="164" rx="56" ry="48" fill="#e7d2ae"/>
        <ellipse cx="138" cy="178" rx="26" ry="32" fill="#c98448"/>
        <ellipse cx="90" cy="162" rx="20" ry="26" fill="#f4ead6"/>
        <g class="part-head">
          <circle cx="110" cy="90" r="40" fill="#e7d2ae"/>
          <path d="M78 72 84 40l22 26z" fill="#e7d2ae"/>
          <path d="M80 70l6-24 16 20z" fill="#e8a090"/>
          <path d="M134 64l18-28 10 36z" fill="#b56a32"/>
          <path d="M138 66l14-22 6 28z" fill="#e8a090"/>
          <g class="part-eyes">
            <ellipse cx="96" cy="90" rx="5" ry="5.5" fill="#2a1b14"/>
            <ellipse cx="124" cy="88" rx="5" ry="5.5" fill="#2a1b14"/>
            <circle cx="97.5" cy="88" r="1.5" fill="#f6eee0"/>
            <circle cx="125.5" cy="86" r="1.5" fill="#f6eee0"/>
          </g>
          <path d="M110 98l-5 6h10z" fill="#c46b3a"/>
          <path d="M110 104c-6 8-16 8-22 4" fill="none" stroke="#5a3a28" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M110 104c6 8 16 8 22 4" fill="none" stroke="#5a3a28" stroke-width="1.4" stroke-linecap="round"/>
        </g>
        <g class="part-paw">
          <ellipse cx="74" cy="192" rx="16" ry="11" fill="#f4ead6"/>
        </g>
        <ellipse cx="124" cy="200" rx="18" ry="11" fill="#d9b48a"/>
      </svg>`,
  },
  {
    id: 'dog',
    word: { ru: 'собака', de: 'Hund', en: 'dog' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="224" rx="54" ry="8" fill="rgba(28,14,10,.32)"/>
        <g class="part-tail">
          <path d="M148 150c28-6 36-40 16-58" fill="none" stroke="#8a5a32" stroke-width="14" stroke-linecap="round"/>
        </g>
        <ellipse cx="98" cy="166" rx="58" ry="46" fill="#c9955c"/>
        <ellipse cx="98" cy="176" rx="28" ry="24" fill="#f0dfc2"/>
        <circle cx="104" cy="92" r="38" fill="#c9955c"/>
        <g class="part-ear-l">
          <ellipse cx="72" cy="108" rx="16" ry="28" fill="#8a5a32" transform="rotate(-18 72 108)"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="138" cy="104" rx="15" ry="26" fill="#8a5a32" transform="rotate(16 138 104)"/>
        </g>
        <ellipse cx="118" cy="104" rx="22" ry="16" fill="#e6c89a"/>
        <g class="part-eyes">
          <circle cx="90" cy="88" r="4.6" fill="#2a1b14"/>
          <circle cx="116" cy="86" r="4.6" fill="#2a1b14"/>
          <circle cx="91.4" cy="86.4" r="1.3" fill="#f6eee0"/>
          <circle cx="117.4" cy="84.4" r="1.3" fill="#f6eee0"/>
        </g>
        <ellipse cx="124" cy="108" rx="10" ry="7" fill="#5a3a28"/>
        <path d="M118 116c6 8 18 8 22 2" fill="none" stroke="#5a3a28" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="72" cy="198" rx="16" ry="11" fill="#e6c89a"/>
        <ellipse cx="126" cy="200" rx="17" ry="11" fill="#b07a42"/>
        <circle cx="98" cy="148" r="5" fill="#7a2e24"/>
      </svg>`,
  },
  {
    id: 'bird',
    word: { ru: 'птичка', de: 'Vogel', en: 'bird' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="200" rx="28" ry="6" fill="rgba(28,14,10,.28)"/>
        <g class="part-body">
          <ellipse cx="100" cy="142" rx="40" ry="34" fill="#c46b3a"/>
          <ellipse cx="88" cy="138" rx="16" ry="14" fill="#e8a090"/>
          <g class="part-wing">
            <ellipse cx="118" cy="148" rx="22" ry="14" fill="#8f4a28" transform="rotate(18 118 148)"/>
          </g>
          <circle cx="118" cy="104" r="22" fill="#d98a48"/>
          <g class="part-eyes">
            <circle cx="124" cy="102" r="4.2" fill="#2a1b14"/>
            <circle cx="125.2" cy="100.6" r="1.2" fill="#f6eee0"/>
          </g>
          <path d="M138 106l22 4-22 8z" fill="#e0a040"/>
          <path d="M86 118c-8-22-4-36 10-38" fill="none" stroke="#2a1b14" stroke-width="3" stroke-linecap="round"/>
          <circle cx="96" cy="80" r="3.2" fill="#c46b3a"/>
        </g>
        <path d="M86 174 80 196h12z" fill="#e0a040"/>
        <path d="M110 174 104 196h14z" fill="#e0a040"/>
      </svg>`,
  },
  {
    id: 'duck',
    word: { ru: 'уточка', de: 'Ente', en: 'duck' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="222" rx="52" ry="8" fill="rgba(28,14,10,.3)"/>
        <g class="part-body">
          <ellipse cx="96" cy="158" rx="58" ry="40" fill="#e8d28a"/>
          <ellipse cx="70" cy="164" rx="18" ry="14" fill="#f4ead6"/>
          <circle cx="132" cy="108" r="28" fill="#efe0a8"/>
          <g class="part-eyes">
            <circle cx="140" cy="104" r="4.4" fill="#2a1b14"/>
            <circle cx="141.3" cy="102.6" r="1.2" fill="#f6eee0"/>
          </g>
          <path d="M156 110c18 2 24 10 8 16-14 6-22 2-22-4 0-6 6-12 14-12z" fill="#e07a30"/>
          <ellipse cx="128" cy="96" rx="12" ry="8" fill="#d4a024"/>
        </g>
        <ellipse cx="78" cy="200" rx="16" ry="9" fill="#e07a30"/>
        <ellipse cx="112" cy="202" rx="16" ry="9" fill="#c86428"/>
      </svg>`,
  },
  {
    id: 'bunny',
    word: { ru: 'зайчик', de: 'Hase', en: 'bunny' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="224" rx="46" ry="8" fill="rgba(28,14,10,.3)"/>
        <g class="part-ear-l">
          <ellipse cx="78" cy="48" rx="14" ry="38" fill="#e6d8c4"/>
          <ellipse cx="78" cy="52" rx="7" ry="26" fill="#e8a090"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="118" cy="44" rx="13" ry="40" fill="#d9cbb4" transform="rotate(8 118 44)"/>
          <ellipse cx="118" cy="48" rx="6" ry="26" fill="#e8a090" transform="rotate(8 118 48)"/>
        </g>
        <ellipse cx="100" cy="168" rx="48" ry="44" fill="#e6d8c4"/>
        <ellipse cx="100" cy="176" rx="22" ry="20" fill="#f4ead6"/>
        <circle cx="100" cy="100" r="36" fill="#eee3d2"/>
        <g class="part-eyes">
          <circle cx="86" cy="102" r="4.4" fill="#2a1b14"/>
          <circle cx="114" cy="102" r="4.4" fill="#2a1b14"/>
          <circle cx="87.4" cy="100.4" r="1.2" fill="#fff"/>
          <circle cx="115.4" cy="100.4" r="1.2" fill="#fff"/>
        </g>
        <ellipse cx="100" cy="114" rx="6" ry="4.5" fill="#e8a090"/>
        <g class="part-whisk">
          <path d="M70 114h-22M70 120h-18M130 114h22M130 120h18" stroke="#5a3a28" stroke-width="1.2" stroke-linecap="round"/>
        </g>
        <ellipse cx="78" cy="202" rx="14" ry="10" fill="#eee3d2"/>
        <ellipse cx="122" cy="202" rx="14" ry="10" fill="#d9cbb4"/>
        <ellipse cx="148" cy="176" rx="10" ry="8" fill="#e6d8c4"/>
      </svg>`,
  },
  {
    id: 'mouse',
    word: { ru: 'мышка', de: 'Maus', en: 'mouse' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="208" rx="36" ry="7" fill="rgba(28,14,10,.28)"/>
        <g class="part-tail">
          <path d="M132 164c40 8 44-36 20-52" fill="none" stroke="#c9b49a" stroke-width="7" stroke-linecap="round"/>
        </g>
        <ellipse cx="100" cy="160" rx="40" ry="32" fill="#d8c8b0"/>
        <circle cx="112" cy="118" r="26" fill="#e4d6c0"/>
        <ellipse cx="90" cy="104" rx="14" ry="16" fill="#e8a090"/>
        <ellipse cx="128" cy="100" rx="13" ry="15" fill="#e8a090"/>
        <ellipse cx="90" cy="104" rx="8" ry="9" fill="#f3c4b8"/>
        <ellipse cx="128" cy="100" rx="7" ry="8" fill="#f3c4b8"/>
        <g class="part-eyes">
          <circle cx="108" cy="118" r="3.6" fill="#2a1b14"/>
          <circle cx="122" cy="116" r="3.6" fill="#2a1b14"/>
          <circle cx="109" cy="117" r="1" fill="#fff"/>
          <circle cx="123" cy="115" r="1" fill="#fff"/>
        </g>
        <ellipse cx="128" cy="126" rx="7" ry="5" fill="#e8a090"/>
        <g class="part-whisk">
          <path d="M96 128h-24M98 134h-20M138 124h22M136 130h18" stroke="#5a3a28" stroke-width="1.1" stroke-linecap="round"/>
        </g>
        <ellipse cx="84" cy="188" rx="12" ry="8" fill="#e4d6c0"/>
        <ellipse cx="116" cy="190" rx="12" ry="8" fill="#c9b49a"/>
      </svg>`,
  },
  {
    id: 'cow',
    word: { ru: 'корова', de: 'Kuh', en: 'cow' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="58" ry="8" fill="rgba(28,14,10,.3)"/>
        <ellipse cx="98" cy="168" rx="62" ry="46" fill="#f0e6d0"/>
        <ellipse cx="70" cy="158" rx="18" ry="16" fill="#3a2a22"/>
        <ellipse cx="124" cy="176" rx="20" ry="18" fill="#3a2a22"/>
        <circle cx="108" cy="92" r="36" fill="#f0e6d0"/>
        <g class="part-ear-l">
          <ellipse cx="74" cy="100" rx="12" ry="16" fill="#e8a090"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="144" cy="96" rx="12" ry="16" fill="#3a2a22"/>
        </g>
        <path d="M86 66l-4-18 12 8z" fill="#f4ead6"/>
        <path d="M124 62l8-18 6 16z" fill="#f4ead6"/>
        <g class="part-eyes">
          <circle cx="96" cy="88" r="4.6" fill="#2a1b14"/>
          <circle cx="122" cy="86" r="4.6" fill="#2a1b14"/>
          <circle cx="97.4" cy="86.4" r="1.3" fill="#fff"/>
          <circle cx="123.4" cy="84.4" r="1.3" fill="#fff"/>
        </g>
        <ellipse cx="114" cy="108" rx="22" ry="14" fill="#e8a090"/>
        <ellipse cx="106" cy="108" rx="4" ry="3.4" fill="#3a2a22"/>
        <ellipse cx="122" cy="107" rx="4" ry="3.4" fill="#3a2a22"/>
        <ellipse cx="76" cy="204" rx="16" ry="10" fill="#f0e6d0"/>
        <ellipse cx="124" cy="206" rx="16" ry="10" fill="#3a2a22"/>
        <ellipse cx="98" cy="198" rx="10" ry="12" fill="#f4ead6"/>
      </svg>`,
  },
  {
    id: 'bear',
    word: { ru: 'мишка', de: 'Bär', en: 'bear' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="56" ry="8" fill="rgba(28,14,10,.3)"/>
        <ellipse cx="100" cy="168" rx="60" ry="50" fill="#b07a42"/>
        <ellipse cx="100" cy="178" rx="28" ry="24" fill="#e6c89a"/>
        <circle cx="70" cy="70" r="18" fill="#8a5a32"/>
        <circle cx="132" cy="68" r="18" fill="#8a5a32"/>
        <circle cx="70" cy="70" r="10" fill="#e8a090"/>
        <circle cx="132" cy="68" r="10" fill="#e8a090"/>
        <circle cx="100" cy="96" r="40" fill="#c9955c"/>
        <g class="part-eyes">
          <circle cx="84" cy="94" r="5" fill="#2a1b14"/>
          <circle cx="116" cy="94" r="5" fill="#2a1b14"/>
          <circle cx="85.6" cy="92.2" r="1.4" fill="#f6eee0"/>
          <circle cx="117.6" cy="92.2" r="1.4" fill="#f6eee0"/>
        </g>
        <ellipse cx="100" cy="112" rx="16" ry="12" fill="#e6c89a"/>
        <ellipse cx="100" cy="114" rx="8" ry="6" fill="#3a2a22"/>
        <g class="part-paw">
          <ellipse cx="52" cy="164" rx="18" ry="16" fill="#8a5a32"/>
          <ellipse cx="52" cy="166" rx="10" ry="8" fill="#e8a090"/>
        </g>
        <ellipse cx="148" cy="176" rx="18" ry="16" fill="#8a5a32"/>
        <ellipse cx="78" cy="206" rx="16" ry="11" fill="#8a5a32"/>
        <ellipse cx="124" cy="206" rx="16" ry="11" fill="#8a5a32"/>
      </svg>`,
  },
]

export function visitorById(id: VisitorId): Visitor {
  const found = VISITORS.find((visitor) => visitor.id === id)
  if (!found) throw new Error(`Unknown visitor: ${id}`)
  return found
}

export function shuffleBag(exclude?: VisitorId): VisitorId[] {
  const pool = VISITOR_IDS.filter((id) => id !== exclude)
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = pool[i]
    const swap = pool[j]
    if (current === undefined || swap === undefined) continue
    pool[i] = swap
    pool[j] = current
  }
  return pool
}
