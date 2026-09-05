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
} as const
