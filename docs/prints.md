# Living fingerprints / Живые отпечатки

Route: `/prints/`. Original drawn SVG illustrations only: no camera, touch geometry collection, biometrics, uploads, analytics or external art assets.

Choose 1–20 friends (default 7). Each press on the playground stamps a different-coloured, twelve-ridge illustration. The green arrow unlocks after the chosen count. It grows rope-like limbs and eyes, then friends run to seven activities, distributed round-robin: swings, roundabout, slide, climbing wall, cars, monkey bars and sandbox. Each activity has its own motion; cars have moving wheeled bodies. With fewer than seven friends, drag them to explore the other activities. Drag/drop uses SVG coordinate transforms and nearest-equipment targeting, including the empty space around equipment. Pointer cancellation restores the dragged position. A single active pointer prevents competing drags.

Keyboard: focus the playground and use Space/Enter to stamp; activate the green arrow normally; focus and activate a friend, then focus and activate equipment to move that friend. Restart clears the drawing. Native home link returns to the catalog.

Language: visible RU/DE/EN, shared `spielzeuge.lang`, query override. Exact requested Russian prompts appear on-screen and are narrated following a gesture. Replay repeats the current phase prompt. Speech synthesis is device-dependent, with always-visible text fallback; there is no autoplay promise or pre-recorded voice. A persistent sound toggle (`spielzeuge.prints.muted`) controls both narration and quiet synthesized chimes. Language change, hide, restart and exit stop obsolete speech. Exit disposes listeners, ResizeObserver, animation and owned audio; asynchronous audio unlock checks disposal. Restoring a BFCache document starts a new game. Reduced-motion disables character rotation and decorative sun animation; essential activity movement remains.

Checks:
- `npm test`: bounds, synthetic ridges, nearest equipment and three-language coverage, alongside existing regressions.
- `npm run build`: TypeScript and all nine Vite entries.
- `node scripts/prints-spec.mjs` against a running Vite server (BASE_URL/CHROMIUM_PATH supported): 390×844, 320×568, 844×390, 820×1180, 1280×900; languages/storage, exact voice calls, 7/20 friends, all seven moving activities, touch-pointer drag/drop and cancellation, keyboard transfers, mute, restart, retained-document exit, real keyboard catalog exit and reentry. Screenshots under ignored `tmp/prints/`.

Browser checks use Linux Chromium, not physical iOS/Safari. Voice quality and actual device speaker output require device acceptance testing.

Additional real Chromium mouse check: pointer capture entered dragging state and dropping from swings onto the sandbox changed the activity to `sand` after the next animation frame.
