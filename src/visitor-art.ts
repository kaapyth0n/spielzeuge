// Layered wooden silhouettes: each greeting moves an actual part of the toy.
const eyes = (x: number, y: number, gap = 30) => `<g class="part-eyes" fill="#302720"><circle cx="${x}" cy="${y}" r="4.5"/><circle cx="${x + gap}" cy="${y}" r="4.5"/><g fill="#fff6dd"><circle cx="${x + 1.3}" cy="${y - 1.5}" r="1.4"/><circle cx="${x + gap + 1.3}" cy="${y - 1.5}" r="1.4"/></g></g>`
const toy = (body: string) => `<svg class="toy" viewBox="0 0 200 240" aria-hidden="true"><ellipse cx="100" cy="222" rx="57" ry="7" fill="#201510" opacity=".25"/>${body}</svg>`

export const NEW_VISITOR_ART = {
  fox: toy(`
    <g class="part-tail"><path d="M123 199C188 206 195 134 165 118c8 32-43 28-48 60z" fill="#b95d30"/><path d="M165 118c7 24-14 29-22 34l27 15c12-18 10-38-5-49" fill="#fff0d4"/></g>
    <ellipse cx="96" cy="167" rx="42" ry="45" fill="#da8244"/><path d="M82 135q-20 46 14 61 28-18 18-61" fill="#fff0d4"/>
    <ellipse cx="75" cy="210" rx="18" ry="9" fill="#694533"/><ellipse cx="119" cy="210" rx="18" ry="9" fill="#694533"/>
    <g class="part-head"><path d="M49 88 45 35Q68 39 80 67L120 67Q137 39 155 35L151 88" fill="#ce703a"/><path d="M55 52 60 82 77 72M145 52 140 82 123 72" fill="#684636"/>
    <path d="M44 85Q100 57 156 85L146 119 100 148 54 119z" fill="#e69550"/>
    <path d="M47 98q30 1 53 34 23-33 53-34l-7 21-46 29-46-29z" fill="#fff0d4"/>
    ${eyes(79, 99, 42)}<path d="M91 126q9-6 18 0-2 11-9 11t-9-11" fill="#302720"/></g>
    <path d="M68 161q-6 15 0 25M123 163q7 10 3 21" stroke="#b56839" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  elephant: toy(`
    <path d="M148 169q27 8 23-17" fill="none" stroke="#788d9a" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="100" cy="169" rx="55" ry="43" fill="#8fa7af"/><rect x="56" y="181" width="31" height="35" rx="12" fill="#a8bdc1"/><rect x="113" y="181" width="31" height="35" rx="12" fill="#829ba6"/>
    <g class="part-ear-l"><ellipse cx="52" cy="105" rx="30" ry="43" fill="#78939e"/><ellipse cx="52" cy="104" rx="21" ry="31" fill="#d2b7b1"/></g>
    <g class="part-ear-r"><ellipse cx="148" cy="105" rx="30" ry="43" fill="#78939e"/><ellipse cx="148" cy="104" rx="21" ry="31" fill="#d2b7b1"/></g>
    <path d="M60 97q0-48 40-48t40 48v28q-40 33-80 0z" fill="#acc2c5"/><path d="M84 65q16-8 32 0" stroke="#dce5db" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${eyes(80, 99, 40)}<ellipse cx="72" cy="115" rx="9" ry="6" fill="#d8b5ad"/><ellipse cx="128" cy="115" rx="9" ry="6" fill="#d8b5ad"/>
    <g class="part-trunk"><path d="M99 117v37q0 25 23 21 13-3 13-15" stroke="#9bb4bb" stroke-width="23" fill="none" stroke-linecap="round"/><path d="M91 137h15m-14 10h15" stroke="#78939e" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M64 207h17m39 0h17" stroke="#dce5db" stroke-width="5" stroke-dasharray="3 4" stroke-linecap="round"/>`),
  owl: toy(`
    <path d="M51 210h98" stroke="#97734d" stroke-width="10" stroke-linecap="round"/><path d="M79 206v10m8-10v10m27-10v10m8-10v10" stroke="#e4b75e" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="100" cy="151" rx="54" ry="57" fill="#9c7352"/><ellipse cx="100" cy="162" rx="35" ry="40" fill="#ead4a9"/>
    <g class="part-wing"><path d="M54 126q-24 27 1 67 23-22 18-58z" fill="#715643"/><path d="M146 126q24 27-1 67-23-22-18-58z" fill="#715643"/></g>
    <g class="part-head"><path d="M48 98V48l30 20q22-8 44 0l30-20v50q0 40-52 40T48 98" fill="#ae865b"/>
    <path d="M100 82c-42-30-65 39-22 44q15 1 22-13 7 14 22 13 43-5 0-44-10-7-22 0" fill="#f5e7c8"/>
    <circle cx="78" cy="101" r="16" fill="#d5ad62"/><circle cx="122" cy="101" r="16" fill="#d5ad62"/>
    ${eyes(78, 101, 44)}<path d="m92 114 8 14 8-14-8-5z" fill="#d79a40"/></g>
    <path d="m83 151 5 5 5-5m14 0 5 5 5-5m-27 18 5 5 5-5m0 16 5 5 5-5" stroke="#be9c6c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  hedgehog: toy(`
    <g class="part-spines"><path d="m30 185-9-24 17-3-7-25 20 1-1-25 21 8 9-25 17 18 18-19 10 25 23-10-2 27 24-2-8 25 19 8-15 19 4 24H43z" fill="#715343"/><path d="m46 151 9 10m4-33 9 12m16-23 4 15m21-12-2 15m24 0-7 12m21 10-12 6" stroke="#ab8863" stroke-width="4" stroke-linecap="round"/></g>
    <ellipse cx="99" cy="176" rx="55" ry="34" fill="#d7b48a"/><ellipse cx="72" cy="209" rx="16" ry="9" fill="#ab8058"/><ellipse cx="130" cy="209" rx="16" ry="9" fill="#ab8058"/>
    <g class="part-head"><circle cx="76" cy="148" r="12" fill="#d7b48a"/><circle cx="76" cy="148" r="6" fill="#e8bab0"/><path d="M80 148q46-18 64 29l18 13q-14 22-51 12-34-7-31-54" fill="#ecd0a7"/>
    ${eyes(105, 169, 25)}<ellipse cx="157" cy="187" rx="8" ry="6" fill="#49382f"/><ellipse cx="113" cy="186" rx="9" ry="5" fill="#e1aaa0"/></g>
    <g class="part-leaf"><path d="M91 114q-19-31-39-15 9 28 39 15" fill="#9cad69"/><path d="m62 102 34 18" stroke="#657747" stroke-width="2" stroke-linecap="round"/></g>`),
  penguin: toy(`
    <ellipse cx="75" cy="212" rx="23" ry="10" fill="#db9b4e"/><ellipse cx="125" cy="212" rx="23" ry="10" fill="#db9b4e"/>
    <g class="part-flipper-l"><path d="M62 123q-32 4-32 57 24-7 39-39" fill="#405969"/></g><g class="part-flipper-r"><path d="M138 123q32 4 32 57-24-7-39-39" fill="#405969"/></g>
    <path d="M56 102q0-50 44-50t44 50l10 65q6 45-54 45t-54-45z" fill="#526c79"/>
    <path d="M100 88q-29-25-31 15l-8 58q-9 39 39 39t39-39l-8-58q-2-40-31-15" fill="#f4ecd7"/>
    ${eyes(82, 108, 36)}<path d="M89 124q11-9 22 0l-11 12z" fill="#e2ab55"/><ellipse cx="70" cy="126" rx="8" ry="5" fill="#e8b8a3"/><ellipse cx="130" cy="126" rx="8" ry="5" fill="#e8b8a3"/>
    <path d="M65 145q35 14 70 0" fill="none" stroke="#bd7963" stroke-width="10" stroke-linecap="round"/><g class="part-scarf"><path d="m119 149 8 30 13-4-10-29" fill="#bd7963"/><path d="m127 165 9-3" stroke="#ead4a9" stroke-width="4"/></g>`),
  sheep: toy(`
    <rect x="58" y="186" width="12" height="28" rx="6" fill="#2c211b"/><rect x="82" y="188" width="12" height="26" rx="6" fill="#2c211b"/><rect x="112" y="188" width="12" height="26" rx="6" fill="#2c211b"/><rect x="136" y="186" width="12" height="28" rx="6" fill="#2c211b"/>
    <g class="part-wool"><ellipse cx="100" cy="156" rx="62" ry="46" fill="#f7f1e6"/><circle cx="52" cy="150" r="22" fill="#f3eadc"/><circle cx="148" cy="150" r="22" fill="#efe3d0"/><circle cx="78" cy="124" r="20" fill="#f8f3ea"/><circle cx="122" cy="122" r="20" fill="#f4ecdf"/></g>
    <g class="part-head"><ellipse cx="78" cy="112" rx="14" ry="8" fill="#6b4a34"/><ellipse cx="122" cy="112" rx="14" ry="8" fill="#6b4a34"/>
    <ellipse cx="100" cy="122" rx="24" ry="20" fill="#6b4a34"/>
    <circle cx="90" cy="120" r="4" fill="#fff6dd"/><circle cx="110" cy="120" r="4" fill="#fff6dd"/><circle cx="91" cy="120" r="2.1" fill="#241812"/><circle cx="111" cy="120" r="2.1" fill="#241812"/><ellipse cx="100" cy="132" rx="7" ry="5" fill="#241812"/></g>`),
  pig: toy(`
    <g class="part-tail"><path d="M150 146c16-10 24 8 12 16-8 5-16-1-14-8" fill="none" stroke="#e7a090" stroke-width="8" stroke-linecap="round"/></g>
    <ellipse cx="72" cy="208" rx="16" ry="9" fill="#d98980"/><ellipse cx="128" cy="208" rx="16" ry="9" fill="#d98980"/>
    <ellipse cx="100" cy="164" rx="54" ry="42" fill="#f0b2a4"/>
    <g class="part-head"><ellipse cx="58" cy="124" rx="18" ry="22" fill="#f0b2a4"/><ellipse cx="142" cy="124" rx="18" ry="22" fill="#f0b2a4"/><ellipse cx="58" cy="128" rx="10" ry="14" fill="#f6c8bc"/><ellipse cx="142" cy="128" rx="10" ry="14" fill="#f6c8bc"/>
    <ellipse cx="100" cy="128" rx="38" ry="32" fill="#f6c3b6"/>${eyes(84, 122, 32)}<ellipse cx="100" cy="144" rx="20" ry="14" fill="#e08b80"/><circle cx="93" cy="144" r="3.2" fill="#6a4038"/><circle cx="107" cy="144" r="3.2" fill="#6a4038"/></g>`),
  horse: toy(`
    <path d="M156 158c22 8 16 34-4 38" fill="none" stroke="#5c3a28" stroke-width="8" stroke-linecap="round"/>
    <rect x="62" y="176" width="16" height="40" rx="6" fill="#8a5a32"/><rect x="88" y="178" width="16" height="38" rx="6" fill="#7a4c2c"/><rect x="112" y="178" width="16" height="38" rx="6" fill="#6e4528"/><rect x="136" y="176" width="16" height="40" rx="6" fill="#5c3a28"/>
    <ellipse cx="104" cy="168" rx="52" ry="34" fill="#c4844a"/>
    <g class="part-head">
      <path d="M70 124c0-40 14-62 34-62s34 22 34 62c0 26-14 44-34 44s-34-18-34-44z" fill="#e2b56a"/>
      <ellipse cx="84" cy="114" rx="8" ry="6" fill="#f3d7a8"/><ellipse cx="124" cy="114" rx="8" ry="6" fill="#f3d7a8"/>
      <circle cx="84" cy="114" r="3.2" fill="#2a1b14"/><circle cx="124" cy="114" r="3.2" fill="#2a1b14"/>
      <ellipse cx="96" cy="138" rx="6" ry="4" fill="#6b4634"/><ellipse cx="112" cy="138" rx="6" ry="4" fill="#6b4634"/>
      <g class="part-mane"><path d="M78 78c-8-32 10-46 18-18" fill="#4a2e1e"/><path d="M122 76c10-34-8-46-18-16" fill="#4a2e1e"/><path d="M90 58c4 36 6 52 14 62 8-10 10-28 14-62-8-10-20-10-28 0z" fill="#4a2e1e"/></g>
    </g>`),
  bee: toy(`
    <g class="part-wing"><ellipse cx="62" cy="118" rx="30" ry="16" fill="#f7f1e4" opacity=".92"/><ellipse cx="138" cy="118" rx="30" ry="16" fill="#f7f1e4" opacity=".92"/></g>
    <ellipse cx="100" cy="156" rx="34" ry="46" fill="#e6c15a"/><path d="M68 140h64M68 156h64M68 172h64" stroke="#3a2a22" stroke-width="9" stroke-linecap="round"/>
    <circle cx="100" cy="96" r="22" fill="#3a2a22"/><path d="M86 80c-8-16-2-22 4-14M114 80c8-16 2-22-4-14" fill="none" stroke="#3a2a22" stroke-width="3" stroke-linecap="round"/>
    <circle cx="92" cy="94" r="5" fill="#fff6dd"/><circle cx="108" cy="94" r="5" fill="#fff6dd"/><circle cx="93" cy="94" r="2.4" fill="#302720"/><circle cx="109" cy="94" r="2.4" fill="#302720"/>
    <path d="M100 198l0 10" stroke="#3a2a22" stroke-width="3" stroke-linecap="round"/>`),
  goat: toy(`
    <g class="part-tail"><path d="M148 146q16-14 12 6" fill="none" stroke="#b9a58a" stroke-width="8" stroke-linecap="round"/></g>
    <rect x="62" y="180" width="13" height="34" rx="6" fill="#c9b79c"/><rect x="84" y="182" width="13" height="32" rx="6" fill="#b9a58a"/><rect x="112" y="182" width="13" height="32" rx="6" fill="#c9b79c"/><rect x="134" y="180" width="13" height="34" rx="6" fill="#b9a58a"/>
    <path d="M62 212h13m9 2h13m15 0h13m9-2h13" stroke="#5a4636" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="104" cy="164" rx="52" ry="34" fill="#efe4d0"/><ellipse cx="116" cy="170" rx="22" ry="16" fill="#e2d4bc"/>
    <path d="M60 112 94 108 104 150 62 160z" fill="#efe4d0"/>
    <g class="part-head">
      <path d="M58 70q-8-26 8-34-2 18 6 30z" fill="#a88a64"/><path d="M84 66q4-30 22-32-10 16-12 32z" fill="#a88a64"/>
      <g class="part-ear-l"><ellipse cx="46" cy="92" rx="20" ry="9" fill="#e2d4bc" transform="rotate(-20 46 92)"/><ellipse cx="46" cy="92" rx="11" ry="4.5" fill="#f0b2a4" transform="rotate(-20 46 92)"/></g>
      <g class="part-ear-r"><ellipse cx="108" cy="92" rx="20" ry="9" fill="#e2d4bc" transform="rotate(20 108 92)"/><ellipse cx="108" cy="92" rx="11" ry="4.5" fill="#f0b2a4" transform="rotate(20 108 92)"/></g>
      <path d="M52 94q0-34 25-34t25 34l-6 34q-19 12-38 0z" fill="#f5ecdc"/>
      ${eyes(66, 96, 22)}<ellipse cx="77" cy="124" rx="15" ry="10" fill="#f0c8bc"/><circle cx="72" cy="123" r="2.4" fill="#5a3a28"/><circle cx="82" cy="123" r="2.4" fill="#5a3a28"/>
      <g class="part-beard"><path d="M70 132q7 22 7 26 1-4 7-26z" fill="#d8c8ae"/></g>
    </g>`),
  donkey: toy(`
    <g class="part-tail"><path d="M152 156q16 16 10 40" fill="none" stroke="#7f7a78" stroke-width="6" stroke-linecap="round"/><path d="M156 192q8 4 6 14-8-2-10-10z" fill="#3e3431"/></g>
    <rect x="62" y="178" width="15" height="36" rx="6" fill="#9a9491"/><rect x="86" y="180" width="15" height="34" rx="6" fill="#8b8582"/><rect x="112" y="180" width="15" height="34" rx="6" fill="#9a9491"/><rect x="136" y="178" width="15" height="36" rx="6" fill="#8b8582"/>
    <path d="M62 212h15m9 2h15m11 0h15m9-2h15" stroke="#3e3431" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="106" cy="162" rx="54" ry="34" fill="#aca6a2"/><ellipse cx="110" cy="176" rx="30" ry="14" fill="#d9d2cb"/>
    <path d="M58 110 102 100 124 150 66 162z" fill="#aca6a2"/><path d="M96 84q24 10 34 64" fill="none" stroke="#4a3f3b" stroke-width="10" stroke-linecap="round"/>
    <g class="part-head">
      <g class="part-ear-l"><ellipse cx="60" cy="46" rx="11" ry="32" fill="#9a9491" transform="rotate(-14 60 46)"/><ellipse cx="60" cy="48" rx="5" ry="22" fill="#e7c9bd" transform="rotate(-14 60 48)"/><path d="M52 16q6-6 12 0" stroke="#3e3431" stroke-width="5" fill="none" stroke-linecap="round" transform="rotate(-14 60 46)"/></g>
      <g class="part-ear-r"><ellipse cx="98" cy="44" rx="11" ry="32" fill="#8b8582" transform="rotate(16 98 44)"/><ellipse cx="98" cy="46" rx="5" ry="22" fill="#e7c9bd" transform="rotate(16 98 46)"/></g>
      <path d="M86 68q10 2 14 14" fill="none" stroke="#4a3f3b" stroke-width="10" stroke-linecap="round"/>
      <path d="M52 100q0-34 28-34t28 34v26q-28 18-56 0z" fill="#b5afab"/>
      ${eyes(68, 98, 24)}<ellipse cx="80" cy="130" rx="24" ry="17" fill="#e8e1d8"/><ellipse cx="72" cy="130" rx="3.2" ry="4" fill="#4a3f3b"/><ellipse cx="88" cy="130" rx="3.2" ry="4" fill="#4a3f3b"/>
      <path d="M72 140q8 5 16 0" fill="none" stroke="#4a3f3b" stroke-width="2" stroke-linecap="round"/>
    </g>`),
  goose: toy(`
    <path d="M78 190 72 212h16l-6-22m34 0-6 22h16l-6-22" fill="#e58a3a"/>
    <path d="M56 172q-26-2-30-18 18 2 30 4" fill="#e9e4da"/>
    <ellipse cx="96" cy="168" rx="50" ry="34" fill="#f7f4ee"/>
    <g class="part-wing"><path d="M74 156q30-18 62 2-4 24-30 26-22 0-32-28" fill="#e2ddd2"/><path d="M84 164q20 6 40 0M88 174q16 4 30-1" stroke="#cfc8ba" stroke-width="3" fill="none" stroke-linecap="round"/></g>
    <g class="part-neck"><path d="M126 160q10-40-2-70-6-20 10-30 18-8 24 10" fill="none" stroke="#f7f4ee" stroke-width="22" stroke-linecap="round"/>
      <circle cx="148" cy="70" r="17" fill="#f7f4ee"/><path d="M162 64q20 2 24 10-4 8-24 8z" fill="#e58a3a"/><path d="M163 74h20" stroke="#c96e2a" stroke-width="1.6" stroke-linecap="round"/>
      <g class="part-eyes" fill="#302720"><circle cx="150" cy="66" r="4.2"/><circle cx="151.3" cy="64.6" r="1.3" fill="#fff6dd"/></g></g>`),
  cuckoo: toy(`
    <path d="M40 206h120" stroke="#97734d" stroke-width="10" stroke-linecap="round"/><path d="M92 196l-4 12m12-12 4 12" stroke="#e0b030" stroke-width="4" stroke-linecap="round"/>
    <g class="part-tail"><path d="M58 150 20 186l12 8 36-26z" fill="#5f6a74"/><path d="m28 184 4 4m6-10 4 4m6-10 4 4" stroke="#f1ead8" stroke-width="3" stroke-linecap="round"/></g>
    <ellipse cx="96" cy="160" rx="44" ry="38" fill="#7f8b95"/>
    <ellipse cx="104" cy="170" rx="28" ry="26" fill="#f1ead8"/><path d="M84 158h36M82 168h42M84 178h38M90 188h26" stroke="#6b7680" stroke-width="3" stroke-linecap="round"/>
    <g class="part-wing"><path d="M64 142q30-10 52 10-8 26-40 26-16-10-12-36" fill="#6b7680"/></g>
    <g class="part-head"><circle cx="124" cy="110" r="28" fill="#8a96a0"/>${eyes(124, 104, 0)}<circle cx="124" cy="104" r="8" fill="none" stroke="#e0b030" stroke-width="3"/>
      <path d="M148 108q18 2 22 8-6 6-22 6z" fill="#3a3a38"/><path d="M146 118h20" stroke="#e0b030" stroke-width="2" stroke-linecap="round"/></g>`),
  monkey: toy(`
    <g class="part-tail"><path d="M142 190q40 4 38-28-2-24-22-18-12 6-4 16" fill="none" stroke="#8a5a36" stroke-width="9" stroke-linecap="round"/></g>
    <ellipse cx="100" cy="168" rx="44" ry="42" fill="#9c6a42"/><ellipse cx="100" cy="176" rx="28" ry="28" fill="#e8c8a0"/>
    <ellipse cx="76" cy="210" rx="17" ry="10" fill="#8a5a36"/><ellipse cx="124" cy="210" rx="17" ry="10" fill="#8a5a36"/>
    <path d="M142 160q14 10 10 30" fill="none" stroke="#8a5a36" stroke-width="13" stroke-linecap="round"/>
    <g class="part-paw"><path d="M60 158q-22-12-24-40" fill="none" stroke="#8a5a36" stroke-width="13" stroke-linecap="round"/><circle cx="36" cy="114" r="10" fill="#e8c8a0"/></g>
    <g class="part-head">
      <g class="part-ear-l"><circle cx="54" cy="96" r="16" fill="#9c6a42"/><circle cx="54" cy="96" r="9" fill="#e8b89a"/></g>
      <g class="part-ear-r"><circle cx="146" cy="96" r="16" fill="#9c6a42"/><circle cx="146" cy="96" r="9" fill="#e8b89a"/></g>
      <circle cx="100" cy="94" r="40" fill="#9c6a42"/>
      <path d="M100 76q-10-14-26-6-14 8-8 28 4 12 12 16q-10 8-4 22 8 16 26 16t26-16q6-14-4-22 8-4 12-16 6-20-8-28-16-8-26 6" fill="#ecd0aa"/>
      ${eyes(86, 96, 28)}<ellipse cx="96" cy="118" rx="2.6" ry="2" fill="#5a3a28"/><ellipse cx="104" cy="118" rx="2.6" ry="2" fill="#5a3a28"/>
      <path d="M88 126q12 10 24 0" fill="none" stroke="#5a3a28" stroke-width="2.4" stroke-linecap="round"/><path d="M94 62q6-10 12 0" fill="none" stroke="#7a4e2e" stroke-width="4" stroke-linecap="round"/>
    </g>`),
} as const
