import { NEW_VISITOR_ART } from './visitor-art.ts'

export const VISITOR_IDS = [
  'cat',
  'dog',
  'bird',
  'duck',
  'bunny',
  'mouse',
  'cow',
  'bear',
  'frog',
  'capybara',
  'fox',
  'elephant',
  'owl',
  'hedgehog',
  'penguin',
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
        <ellipse cx="102" cy="226" rx="48" ry="7" fill="rgba(28,14,10,.3)"/>
        <g class="part-tail">
          <path d="M148 168c28 4 38-22 24-48  -6-12 6-22 16-14" fill="none" stroke="#c17a3c" stroke-width="13" stroke-linecap="round"/>
        </g>
        <ellipse cx="104" cy="168" rx="54" ry="46" fill="#edd8b4"/>
        <ellipse cx="136" cy="178" rx="24" ry="30" fill="#c98444"/>
        <ellipse cx="92" cy="170" rx="20" ry="24" fill="#f7eedc"/>
        <g class="part-head">
          <circle cx="108" cy="96" r="38" fill="#edd8b4"/>
          <path d="M78 78 86 42 104 70z" fill="#edd8b4"/>
          <path d="M82 76 88 48 100 70z" fill="#f0b2a4"/>
          <path d="M116 70 136 40 144 74z" fill="#c17a3c"/>
          <path d="M120 70 136 46 140 72z" fill="#f0b2a4"/>
          <g class="part-eyes">
            <ellipse cx="94" cy="94" rx="5" ry="5.6" fill="#2a1b14"/>
            <ellipse cx="122" cy="93" rx="5" ry="5.6" fill="#2a1b14"/>
            <circle cx="95.6" cy="92.2" r="1.5" fill="#f6eee0"/>
            <circle cx="123.6" cy="91.2" r="1.5" fill="#f6eee0"/>
          </g>
          <path d="M103.5 104h9L108 109z" fill="#c46b3a"/>
          <path d="M108 109c-7 7-16 7-22 3" fill="none" stroke="#5a3a28" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M108 109c7 7 16 7 22 3" fill="none" stroke="#5a3a28" stroke-width="1.4" stroke-linecap="round"/>
        </g>
        <g class="part-paw">
          <ellipse cx="78" cy="198" rx="15" ry="10" fill="#f7eedc"/>
        </g>
        <ellipse cx="126" cy="202" rx="16" ry="10" fill="#e0c49a"/>
      </svg>`,
  },
  {
    id: 'dog',
    word: { ru: 'собака', de: 'Hund', en: 'dog' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="52" ry="7" fill="rgba(28,14,10,.3)"/>
        <g class="part-tail">
          <path d="M150 168c26 2 34-18 22-40" fill="none" stroke="#8a552c" stroke-width="12" stroke-linecap="round"/>
        </g>
        <ellipse cx="98" cy="168" rx="56" ry="44" fill="#d2a066"/>
        <ellipse cx="96" cy="176" rx="24" ry="20" fill="#f3e4c4"/>
        <rect x="72" y="128" width="52" height="10" rx="5" fill="#8b2e24"/>
        <circle cx="100" cy="98" r="36" fill="#d2a066"/>
        <g class="part-ear-l">
          <ellipse cx="70" cy="118" rx="15" ry="26" fill="#8a552c" transform="rotate(-22 70 118)"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="132" cy="118" rx="14" ry="25" fill="#8a552c" transform="rotate(20 132 118)"/>
        </g>
        <ellipse cx="112" cy="110" rx="20" ry="15" fill="#f0d8b0"/>
        <g class="part-eyes">
          <circle cx="88" cy="92" r="4.8" fill="#2a1b14"/>
          <circle cx="112" cy="91" r="4.8" fill="#2a1b14"/>
          <circle cx="89.4" cy="90.4" r="1.4" fill="#f6eee0"/>
          <circle cx="113.4" cy="89.4" r="1.4" fill="#f6eee0"/>
        </g>
        <ellipse cx="124" cy="114" rx="7" ry="5.5" fill="#2a1b14"/>
        <path d="M108 119q14 12 28 0" fill="none" stroke="#5a3a28" stroke-width="1.8" stroke-linecap="round"/>
        <ellipse cx="76" cy="200" rx="15" ry="10" fill="#f0d8b0"/>
        <ellipse cx="124" cy="202" rx="16" ry="10" fill="#b07a42"/>
      </svg>`,
  },
  {
    id: 'bird',
    word: { ru: 'птичка', de: 'Vogel', en: 'bird' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="214" rx="36" ry="7" fill="rgba(28,14,10,.28)"/>
        <path d="M52 150 34 156l6 20 16-4z" fill="#8a4526"/>
        <g class="part-body">
          <ellipse cx="96" cy="156" rx="46" ry="38" fill="#c46b3a"/>
          <ellipse cx="76" cy="156" rx="15" ry="13" fill="#f0b2a4"/>
          <g class="part-wing">
            <path
              d="M86 144c24-16 54-6 62 16-2 10-10 16-18 14 2 6-6 10-12 4 0 6-8 8-14 2-6 0-16-10-18-36z"
              fill="#8a4526"
            />
            <path
              d="M92 148c18-10 40-4 48 12-16-2-32-6-48-12z"
              fill="#b86436"
            />
          </g>
          <circle cx="122" cy="114" r="26" fill="#e08a48"/>
          <g class="part-eyes">
            <circle cx="128" cy="110" r="5" fill="#2a1b14"/>
            <circle cx="129.4" cy="108.4" r="1.4" fill="#f6eee0"/>
          </g>
          <path d="M146 114l24 6-24 10z" fill="#e8b040"/>
        </g>
        <path d="M80 190 74 212h14z" fill="#e8b040"/>
        <path d="M108 190 102 212h16z" fill="#e0a038"/>
      </svg>`,
  },
  {
    id: 'duck',
    word: { ru: 'уточка', de: 'Ente', en: 'duck' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="224" rx="50" ry="7" fill="rgba(28,14,10,.3)"/>
        <path d="M40 162 24 168l6 16 16-6z" fill="#d4b24a"/>
        <g class="part-body">
          <ellipse cx="92" cy="162" rx="56" ry="38" fill="#f0dc96"/>
          <ellipse cx="66" cy="166" rx="16" ry="12" fill="#f7f0d4"/>
          <g class="part-wing">
            <path
              d="M86 150c24-14 52-4 58 16-2 8-10 14-18 12 2 6-6 8-12 2 0 6-8 6-14 0-6-2-16-10-14-30z"
              fill="#d4b24a"
            />
            <path
              d="M92 154c18-8 38-2 46 12-16-2-30-6-46-12z"
              fill="#e8c86a"
            />
          </g>
          <circle cx="134" cy="112" r="27" fill="#f4e6b0"/>
          <g class="part-eyes">
            <circle cx="142" cy="108" r="4.6" fill="#2a1b14"/>
            <circle cx="143.3" cy="106.6" r="1.3" fill="#f6eee0"/>
          </g>
          <path d="M158 112c20 1 26 10 10 16-14 6-24 2-24-4 0-6 6-12 14-12z" fill="#e07a30"/>
          <path d="M160 120h18" stroke="#c86428" stroke-width="1.2" stroke-linecap="round"/>
          <ellipse cx="128" cy="98" rx="11" ry="7" fill="#e0b030"/>
        </g>
        <ellipse cx="76" cy="202" rx="16" ry="9" fill="#e07a30"/>
        <ellipse cx="112" cy="204" rx="16" ry="9" fill="#c86428"/>
      </svg>`,
  },
  {
    id: 'bunny',
    word: { ru: 'зайчик', de: 'Hase', en: 'bunny' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="44" ry="7" fill="rgba(28,14,10,.3)"/>
        <g class="part-ear-l">
          <ellipse cx="80" cy="50" rx="13" ry="40" fill="#efe4d2"/>
          <ellipse cx="80" cy="54" rx="6.5" ry="28" fill="#f0b2a4"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="124" cy="56" rx="12" ry="36" fill="#e4d6c0" transform="rotate(22 124 56)"/>
          <ellipse cx="124" cy="58" rx="6" ry="24" fill="#f0b2a4" transform="rotate(22 124 58)"/>
        </g>
        <ellipse cx="148" cy="178" rx="11" ry="9" fill="#efe4d2"/>
        <ellipse cx="100" cy="170" rx="46" ry="42" fill="#efe4d2"/>
        <ellipse cx="100" cy="178" rx="20" ry="18" fill="#f7eedc"/>
        <circle cx="100" cy="104" r="34" fill="#f4eadc"/>
        <ellipse cx="80" cy="112" rx="10" ry="8" fill="#f0c8bc"/>
        <ellipse cx="120" cy="112" rx="10" ry="8" fill="#f0c8bc"/>
        <g class="part-eyes">
          <circle cx="88" cy="102" r="4.4" fill="#2a1b14"/>
          <circle cx="114" cy="102" r="4.4" fill="#2a1b14"/>
          <circle cx="89.4" cy="100.6" r="1.2" fill="#fff"/>
          <circle cx="115.4" cy="100.6" r="1.2" fill="#fff"/>
        </g>
        <ellipse cx="101" cy="114" rx="6" ry="4.4" fill="#f0b2a4"/>
        <g class="part-whisk">
          <path d="M72 114h-20M74 120h-16M130 114h20M128 120h16" stroke="#5a3a28" stroke-width="1.2" stroke-linecap="round"/>
        </g>
        <ellipse cx="80" cy="204" rx="14" ry="10" fill="#f4eadc"/>
        <ellipse cx="122" cy="204" rx="14" ry="10" fill="#e4d6c0"/>
      </svg>`,
  },
  {
    id: 'mouse',
    word: { ru: 'мышка', de: 'Maus', en: 'mouse' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="220" rx="40" ry="7" fill="rgba(28,14,10,.28)"/>
        <g class="part-tail">
          <path d="M140 168c42 10 46-40 18-58" fill="none" stroke="#d2c0a6" stroke-width="8" stroke-linecap="round"/>
        </g>
        <ellipse cx="98" cy="168" rx="46" ry="36" fill="#e6d6be"/>
        <ellipse cx="78" cy="108" rx="18" ry="20" fill="#f0b2a4"/>
        <ellipse cx="122" cy="104" rx="17" ry="19" fill="#f0b2a4"/>
        <ellipse cx="78" cy="108" rx="10" ry="12" fill="#f8cfc4"/>
        <ellipse cx="122" cy="104" rx="9" ry="11" fill="#f8cfc4"/>
        <circle cx="108" cy="124" r="30" fill="#efe0cc"/>
        <g class="part-eyes">
          <circle cx="102" cy="122" r="4.2" fill="#2a1b14"/>
          <circle cx="120" cy="120" r="4.2" fill="#2a1b14"/>
          <circle cx="103.2" cy="120.8" r="1.2" fill="#fff"/>
          <circle cx="121.2" cy="118.8" r="1.2" fill="#fff"/>
        </g>
        <ellipse cx="126" cy="132" rx="9" ry="6" fill="#f0b2a4"/>
        <g class="part-whisk">
          <path d="M88 132h-24M90 138h-20M140 130h22M138 136h18" stroke="#5a3a28" stroke-width="1.2" stroke-linecap="round"/>
        </g>
        <ellipse cx="80" cy="198" rx="13" ry="9" fill="#efe0cc"/>
        <ellipse cx="116" cy="200" rx="13" ry="9" fill="#d2c0a6"/>
      </svg>`,
  },
  {
    id: 'cow',
    word: { ru: 'корова', de: 'Kuh', en: 'cow' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="58" ry="7" fill="rgba(28,14,10,.3)"/>
        <ellipse cx="100" cy="172" rx="66" ry="42" fill="#f4ead6"/>
        <ellipse cx="68" cy="164" rx="16" ry="14" fill="#3d2a22"/>
        <ellipse cx="132" cy="180" rx="18" ry="16" fill="#3d2a22"/>
        <ellipse cx="108" cy="156" rx="12" ry="10" fill="#3d2a22"/>
        <g class="part-ear-l">
          <ellipse cx="64" cy="104" rx="14" ry="18" fill="#f0b2a4" transform="rotate(-28 64 104)"/>
        </g>
        <g class="part-ear-r">
          <ellipse cx="140" cy="102" rx="14" ry="18" fill="#f0b2a4" transform="rotate(26 140 102)"/>
        </g>
        <path d="M80 74c-4-16 2-22 12-16 4 3 2 12-4 16z" fill="#f7f0e0"/>
        <path d="M122 72c4-16-2-22-12-16-4 3-2 12 4 16z" fill="#f7f0e0"/>
        <circle cx="102" cy="98" r="34" fill="#f4ead6"/>
        <ellipse cx="78" cy="92" rx="8" ry="7" fill="#3d2a22"/>
        <g class="part-eyes">
          <circle cx="90" cy="92" r="4.6" fill="#2a1b14"/>
          <circle cx="114" cy="91" r="4.6" fill="#2a1b14"/>
          <circle cx="91.4" cy="90.4" r="1.3" fill="#fff"/>
          <circle cx="115.4" cy="89.4" r="1.3" fill="#fff"/>
        </g>
        <ellipse cx="104" cy="114" rx="22" ry="13" fill="#f0b2a4"/>
        <ellipse cx="96" cy="114" rx="3.6" ry="3" fill="#3d2a22"/>
        <ellipse cx="112" cy="113" rx="3.6" ry="3" fill="#3d2a22"/>
        <circle cx="102" cy="148" r="6" fill="#d4a024"/>
        <ellipse cx="102" cy="156" rx="3" ry="4" fill="#d4a024"/>
        <ellipse cx="78" cy="206" rx="15" ry="10" fill="#f4ead6"/>
        <ellipse cx="126" cy="208" rx="15" ry="10" fill="#3d2a22"/>
        <ellipse cx="100" cy="204" rx="9" ry="10" fill="#f7f0e0"/>
      </svg>`,
  },
  {
    id: 'bear',
    word: { ru: 'мишка', de: 'Bär', en: 'bear' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="226" rx="54" ry="7" fill="rgba(28,14,10,.3)"/>
        <ellipse cx="100" cy="172" rx="58" ry="46" fill="#c48a4a"/>
        <ellipse cx="100" cy="180" rx="26" ry="22" fill="#f0d4a8"/>
        <circle cx="68" cy="72" r="18" fill="#8f5a30"/>
        <circle cx="132" cy="72" r="18" fill="#8f5a30"/>
        <circle cx="68" cy="72" r="10" fill="#f0b2a4"/>
        <circle cx="132" cy="72" r="10" fill="#f0b2a4"/>
        <circle cx="100" cy="98" r="42" fill="#d2a066"/>
        <g class="part-eyes">
          <circle cx="84" cy="94" r="5" fill="#2a1b14"/>
          <circle cx="116" cy="94" r="5" fill="#2a1b14"/>
          <circle cx="85.6" cy="92.2" r="1.4" fill="#f6eee0"/>
          <circle cx="117.6" cy="92.2" r="1.4" fill="#f6eee0"/>
        </g>
        <ellipse cx="100" cy="114" rx="18" ry="13" fill="#f0d4a8"/>
        <ellipse cx="100" cy="116" rx="8" ry="6" fill="#3a2a22"/>
        <g class="part-paw">
          <ellipse cx="50" cy="162" rx="18" ry="16" fill="#8f5a30"/>
          <ellipse cx="50" cy="164" rx="10" ry="8" fill="#f0b2a4"/>
        </g>
        <ellipse cx="150" cy="176" rx="17" ry="15" fill="#8f5a30"/>
        <ellipse cx="78" cy="208" rx="16" ry="11" fill="#8f5a30"/>
        <ellipse cx="124" cy="208" rx="16" ry="11" fill="#8f5a30"/>
      </svg>`,
  },
  {
    id: 'frog',
    word: { ru: 'лягушка', de: 'Frosch', en: 'frog' },
    svg: `
      <svg class="toy" viewBox="0 0 200 240" aria-hidden="true">
        <ellipse cx="100" cy="224" rx="50" ry="7" fill="rgba(28,14,10,.3)"/>
        <g class="part-body">
          <ellipse cx="100" cy="168" rx="58" ry="40" fill="#7fbf5a"/>
          <ellipse cx="100" cy="176" rx="34" ry="24" fill="#c8e89a"/>
          <g class="part-leg-l">
            <path d="M52 168c-18 8-28 28-10 40 8 4 18 0 22-8z" fill="#5f9a3e"/>
            <ellipse cx="48" cy="206" rx="16" ry="9" fill="#c8e89a"/>
          </g>
          <g class="part-leg-r">
            <path d="M148 168c18 8 28 28 10 40-8 4-18 0-22-8z" fill="#5f9a3e"/>
            <ellipse cx="152" cy="206" rx="16" ry="9" fill="#b8d88a"/>
          </g>
          <circle cx="100" cy="112" r="36" fill="#8fd06a"/>
          <g class="part-eyes">
            <circle cx="78" cy="92" r="16" fill="#8fd06a"/>
            <circle cx="122" cy="92" r="16" fill="#8fd06a"/>
            <circle cx="78" cy="90" r="8" fill="#f6f0d8"/>
            <circle cx="122" cy="90" r="8" fill="#f6f0d8"/>
            <circle cx="80" cy="90" r="4.4" fill="#2a1b14"/>
            <circle cx="124" cy="90" r="4.4" fill="#2a1b14"/>
            <circle cx="81.4" cy="88.4" r="1.3" fill="#fff"/>
            <circle cx="125.4" cy="88.4" r="1.3" fill="#fff"/>
          </g>
          <ellipse cx="100" cy="122" rx="18" ry="10" fill="#c8e89a"/>
          <path d="M88 128c8 8 16 8 24 0" fill="none" stroke="#3a5a28" stroke-width="2" stroke-linecap="round"/>
        </g>
        <ellipse cx="72" cy="198" rx="14" ry="10" fill="#7fbf5a"/>
        <ellipse cx="128" cy="198" rx="14" ry="10" fill="#5f9a3e"/>
      </svg>`,
  },
  {
    id: 'capybara',
    word: { ru: 'капибара', de: 'Capybara', en: 'capybara' },
    svg: `
      <img class="toy" src="/visitors/capybara.png" alt="" draggable="false" aria-hidden="true" />
    `,
  },
  { id: 'fox', word: { ru: 'лиса', de: 'Fuchs', en: 'fox' }, svg: NEW_VISITOR_ART.fox },
  { id: 'elephant', word: { ru: 'слон', de: 'Elefant', en: 'elephant' }, svg: NEW_VISITOR_ART.elephant },
  { id: 'owl', word: { ru: 'сова', de: 'Eule', en: 'owl' }, svg: NEW_VISITOR_ART.owl },
  { id: 'hedgehog', word: { ru: 'ёжик', de: 'Igel', en: 'hedgehog' }, svg: NEW_VISITOR_ART.hedgehog },
  { id: 'penguin', word: { ru: 'пингвин', de: 'Pinguin', en: 'penguin' }, svg: NEW_VISITOR_ART.penguin },
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
