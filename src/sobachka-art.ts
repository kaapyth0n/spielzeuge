// Original vector artwork: separate parts keep our little friend expressive at every size.
export function puppy(): string {
  return `<svg viewBox="0 0 360 310" fill="none" aria-hidden="true" class="puppy-svg">
    <ellipse cx="185" cy="280" rx="108" ry="14" fill="#694735" opacity=".10"/>
    <g class="puppy-tail"><path d="M254 213C315 218 326 176 304 163C289 156 281 173 293 181C301 190 278 194 253 192" fill="#b97648" stroke="#744e38" stroke-width="3"/></g>
    <path d="M132 170C169 153 235 171 251 209L263 268C248 287 223 280 220 266L213 239L161 245L155 276C138 288 113 276 119 261Z" fill="#c88d58" stroke="#744e38" stroke-width="3"/>
    <path d="M175 184C149 204 151 239 169 248C189 260 216 238 207 214Z" fill="#f7dfb2"/>
    <path d="M152 219L143 269C124 268 119 280 133 284L161 284C172 280 175 254 177 226M211 224L224 270C208 271 207 283 221 285L247 283" fill="#e4b378" stroke="#744e38" stroke-width="3" stroke-linecap="round"/>
    <path d="M139 170Q179 191 218 170L219 182Q177 205 137 182Z" fill="#749487" stroke="#526f62" stroke-width="2"/>
    <path d="M184 192L191 199L187 208L178 208L174 199Z" fill="#efd27f" stroke="#a9823e" stroke-width="2"/>
    <g class="puppy-head">
      <path d="M120 91C94 54 61 73 65 121C67 159 79 182 99 172L126 131" fill="#a66742" stroke="#744e38" stroke-width="3"/>
      <path d="M211 88C241 59 268 74 262 116C258 151 249 178 231 171L210 130" fill="#a66742" stroke="#744e38" stroke-width="3"/>
      <path d="M105 117C105 71 130 54 167 56C214 51 237 85 233 129C239 164 217 186 169 188C122 188 98 162 105 117Z" fill="#e4b378" stroke="#744e38" stroke-width="3"/>
      <path d="M160 59Q142 82 153 110Q172 120 188 109Q187 76 173 57" fill="#f7dfb2"/>
      <ellipse cx="144" cy="146" rx="31" ry="27" fill="#f7dfb2"/><ellipse cx="190" cy="146" rx="31" ry="27" fill="#f7dfb2"/>
      <g class="puppy-eyes"><ellipse cx="134" cy="119" rx="7" ry="10" fill="#3c302a"/><ellipse cx="204" cy="119" rx="7" ry="10" fill="#3c302a"/><circle cx="136" cy="116" r="2.5" fill="#fff9e9"/><circle cx="206" cy="116" r="2.5" fill="#fff9e9"/></g>
      <g class="puppy-closed-eyes" stroke="#744e38" stroke-width="4" stroke-linecap="round"><path d="M124 123Q134 132 144 123M194 123Q204 132 214 123"/></g>
      <path d="M155 140Q168 131 180 140Q182 146 168 154Q152 147 155 140" fill="#49352d"/>
      <path d="M168 153V160M148 158Q153 169 168 160Q182 169 191 157" stroke="#744e38" stroke-width="3" stroke-linecap="round"/>
      <path class="puppy-tongue" d="M162 165Q168 169 179 164L178 176Q168 186 162 176Z" fill="#df8d86"/>
      <ellipse cx="121" cy="145" rx="10" ry="5" fill="#dd9476" opacity=".65"/><ellipse cx="215" cy="145" rx="10" ry="5" fill="#dd9476" opacity=".65"/>
      <path d="M121 98L138 94M196 94L214 99" stroke="#a96e46" stroke-width="3" stroke-linecap="round"/>
    </g>
  </svg>`
}
export function icon(name: string): string {
  const paths: Record<string, string> = {
    heart:
      '<path d="M24 40S5 29 5 16C5 4 20 3 24 13C28 3 43 4 43 16C43 29 24 40 24 40Z" fill="currentColor" stroke="none"/>',
    ball: '<circle cx="24" cy="24" r="18" fill="#df977d"/><path d="M9 14Q28 15 34 38M13 38Q25 19 39 14" stroke="#fff0cf" stroke-width="4"/>',
    feed: '<path d="M5 26H43L38 39H11Z" fill="#86a79d"/><path d="M12 24V18Q12 10 18 13Q21 4 27 11Q35 8 36 23" fill="#d5aa6e"/><path d="M6 26H42"/>',
    sleep:
      '<path d="M32 6C12 3 2 25 17 38C27 47 41 40 43 29C24 37 15 17 32 6Z" fill="#eac976"/><path d="M38 6V14M34 10H42"/>',
    walk: '<path d="M10 34Q5 22 16 22Q20 13 27 23Q41 20 39 32Q36 41 24 36Q11 42 10 34Z" fill="#a6b99a"/><ellipse cx="10" cy="15" rx="5" ry="7" fill="#a6b99a"/><ellipse cx="23" cy="9" rx="5" ry="7" fill="#a6b99a"/><ellipse cx="37" cy="14" rx="5" ry="7" fill="#a6b99a"/>',
    games:
      '<rect x="6" y="9" width="36" height="30" rx="10" fill="#b6abc9"/><path d="M17 18V30M11 24H23"/><circle cx="32" cy="21" r="2" fill="currentColor"/><circle cx="36" cy="28" r="2" fill="currentColor"/>',
    wall: '<path d="M7 35L16 13L25 35Z" fill="#92afa1"/><circle cx="34" cy="14" r="7" fill="#e0a18e"/><path d="M29 27H41V39H29Z" fill="#e5c87d"/>',
    home: '<path d="M6 22L24 7L42 22M11 19V41H37V19M20 41V29H28V41"/>',
    back: '<path d="M28 10L14 24L28 38M15 24H41"/>',
    sound:
      '<path d="M7 19H15L26 10V38L15 29H7Z" fill="#eadbc0"/><path d="M32 17Q40 24 32 31M37 10Q51 24 37 38"/>',
    mute: '<path d="M7 19H15L26 10V38L15 29H7Z" fill="#eadbc0"/><path d="M33 18L44 30M44 18L33 30"/>',
    toy: '<path d="M14 17Q1 0 8 3Q22 1 22 15M28 15Q31 0 40 3Q46 11 34 21" fill="#d7b3b3"/><ellipse cx="24" cy="28" rx="17" ry="14" fill="#d7b3b3"/><path d="M16 27V29M32 27V29M22 32L24 34L27 32"/>',
    flower:
      '<path d="M24 44V26M24 36Q8 28 11 37Z" fill="#9bae8c"/><path d="M24 11C15-4 2 12 15 19C-1 24 12 39 24 27C34 42 47 26 34 20C48 8 31-1 24 11Z" fill="#e8b39b"/><circle cx="24" cy="20" r="6" fill="#efd080"/>',
    apple:
      '<path d="M24 12Q3 4 7 28Q15 46 24 39Q36 46 42 26Q44 6 24 12Z" fill="#d9997f"/><path d="M24 14V5M25 8Q38 0 37 8Q32 15 25 8" fill="#96ad86"/>',
    carrot:
      '<path d="M15 13Q24 4 35 17L12 43Z" fill="#dda16d"/><path d="M27 11L25 2M31 13L41 5M20 20L25 24M18 30L21 32"/>',
    food: '<path d="M6 24H42L37 40H11Z" fill="#8caaa0"/><circle cx="16" cy="20" r="6" fill="#bc8954"/><circle cx="30" cy="19" r="7" fill="#bc8954"/><circle cx="24" cy="25" r="5" fill="#bc8954"/>',
    lock: '<rect x="10" y="20" width="28" height="23" rx="6" fill="#e5dfd4"/><path d="M16 20V13C16 2 32 2 32 13V20M24 28V33"/>',
    star: '<path d="M24 3L30 17L45 19L34 30L37 45L24 37L10 45L13 30L2 19L18 17Z" fill="#e7c775"/>',
    circle: '<circle cx="24" cy="24" r="18" fill="#d9a08c"/>',
    triangle: '<path d="M24 5L44 41H4Z" fill="#96b4a4"/>',
    square: '<rect x="7" y="7" width="34" height="34" rx="4" fill="#b5a7c5"/>',
    memory:
      '<rect x="4" y="7" width="25" height="33" rx="5" fill="#b8c9b0"/><rect x="19" y="11" width="25" height="33" rx="5" fill="#e5bb98"/><path d="M26 27L30 31L38 22"/>',
    help: '<path d="M17 17C17 5 37 8 33 19C31 24 24 22 24 29M24 36V37"/><circle cx="24" cy="24" r="21"/>',
  }
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.heart}</svg>`
}
export function wallArt(wall: number): string {
  const arrangements = [
    [
      ['triangle', 9, 15, -12],
      ['circle', 30, 30, 8],
      ['square', 64, 12, 14],
      ['star', 85, 38, -10],
      ['circle', 46, 8, 0],
    ],
    [
      ['flower', 9, 22, -8],
      ['flower', 31, 7, 12],
      ['flower', 64, 27, -15],
      ['flower', 85, 9, 8],
      ['flower', 47, 38, 0],
    ],
    [
      ['star', 12, 9, -8],
      ['sleep', 34, 28, 12],
      ['star', 63, 6, -15],
      ['star', 85, 33, 8],
      ['star', 46, 3, 0],
    ],
  ]
  return arrangements[wall]
    .map(
      ([name, x, y, rotate]) =>
        `<span style="left:${x}%;top:${y}%;transform:rotate(${rotate}deg)">${icon(String(name))}</span>`,
    )
    .join('')
}
