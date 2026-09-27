# Мороженка

Мороженка is Matryona’s game. She was nearly six when she drew it and told her dad how it works. The scoop of ice cream spits fire from its mouth and flies the other way. You steer it with your voice. It must not touch the walls, and it has to fly into the cone. Rounds go one after another, each on a different map. Open `/morozhenka/` or choose it in the catalog.

## From the interview and the drawing to the game

| Matryona said / drew | In the game |
| --- | --- |
| “Ты говоришь «А», и она двигается” | Vowels steer: **А** up, **И** right, **О** left, **У** down. Matryona chose А, И and О herself. У was added for down because it is the vowel easiest to tell apart from the others. |
| “Любой голос … разговоры всякие” | Any voiced sound moves the scoop. It goes towards the nearest learned letter. |
| Fire comes out of the mouth, the ice cream moves from the fire | The mouth opens on the side the fire goes. Fire puffs are little circles that cool into grey smoke rings, like the circles in the drawing. |
| Walls touched → it disappears | Touching a wall or a stone makes a splat, then a new scoop appears at the start or the last snowflake. |
| Get into the cone (brown, cross-hatched) | A waffle cone with the same cross-hatch glows at the goal. Touching it from any side snaps the scoop in. |
| Grey pencil scribbles, frame, two panels | Walls are drawn as loopy pencil scribbles with hand-wobbled outlines inside a frame. Every round is a new picture. |
| Green and brown ice cream | The default flavor is mint-chocolate with brown patches. Six more flavors can be chosen. |
| “Это вообще всё прыгает” | Each new sound gives a little hop. A long sound flies steadily. A louder voice makes a bigger flame and a faster flight. |
| Rounds, “каждый раз разные карты” | 12 hand-made rounds, then endless seeded surprise maps. |

## Playing

- **Title:** play the next round, open the round map, teach the ice cream, choose voice or buttons, and change the flavor (tap the ice cream or the arrows).
- **Letter pad:** four big buttons show the current letters with arrows. Press and hold one to fly. Several fingers make diagonals. The same buttons light up when the microphone hears a letter, so the child sees what was understood. The keyboard works too: arrows, `W`/`D`/`S`, and the vowel letters in Russian or Latin layout. `R` restarts the round.
- **Round flow:** a short banner with the round name, then the scoop waits in a dashed circle until the first sound. Cherries (up to three per round) are optional. Snowflakes are checkpoints. Sleepy stones slide slowly back and forth. The win card shows the scoop in its cone with the cherries collected. It offers Next, Again and Rounds.
- **Crashes:** there is no game over and no timer. After a splat the scoop comes back after about a second. It waits until the game has finished speaking.
- **Rounds screen:** each finished round shows the flavor and the cherries that earned it. The best cherry count is kept. Surprise maps open after round 3, so there is always something new to try. “Play” keeps following the hand-made rounds until all 12 are done.

### Rounds

1. Вверх! — only **А**, straight up.
2. Вправо — **И**, through a tunnel.
3. Подкова — **О** and **У** around a horseshoe.
4. Зигзаг — right, down, left, down.
5. Ледяные колонны — slalom and the first snowflake.
6. Гора — around a mountain (Matryona’s left panel).
7. Шоколадные зубцы — jagged teeth (her right panel).
8. Улитка — a spiral with two snowflakes.
9. Сонный камень — the first moving stone.
10. Лабиринт — dead ends hide cherries.
11. Два камня — two sliding stones.
12. Большое путешествие — a long trip with stones, a cave and two snowflakes.

From round 13, `surpriseLevel(n)` builds a 3×3-room cave from the seed `n`. The rooms are joined by a random tree of doors three cells wide, sometimes with one extra loop. Cherries go into dead ends, a snowflake sits halfway along long paths, and corner bumps are added. Sleepy stones appear from surprise map 3 on. The same round number always gives the same map.

Every map is a 20×20 grid of 50-unit cells in a 1000×1000 world. The scoop is drawn with radius 30 and collides at 22. `isSolvable()` flood-fills a 10-unit lattice with a 26-unit extra margin. It checks that the cone, every cherry and every snowflake are comfortably reachable. `moversStayClear()` keeps stones away from starts, cones and snowflakes. Tests run both checks for every hand-made round and for 120 surprise maps.

## Voice steering

All analysis happens on the device, in `src/morozhenka-dsp.ts` and `src/morozhenka-voice.ts`. Nothing is recorded or sent anywhere. The title and teach screens say this for parents.

1. `getUserMedia` with echo cancellation, noise suppression and auto gain **off**. Those filters treat long vowels as noise. An `AnalyserNode` gives the latest 2048 samples every animation frame.
2. **Loudness gate:** a 5-second sliding minimum tracks the room’s noise floor. A sound counts when it is 7, 11 or 17 dB above it. This follows the “Микрофон: Чуткий / Обычный / Для шума” setting on the teach screen.
3. **Is it a voice?** A McLeod pitch detector (NSDF) runs on a ~11 kHz copy and accepts 70–900 Hz with clarity ≥ 0.62. Hiss, fan noise and the game’s own fire whoosh are not periodic, so they never steer.
4. **Which vowel?** The spectrum is sampled at the voice’s harmonics. This keeps children’s high voices, with widely spaced harmonics, readable. The envelope is read on a log-frequency grid from 200 Hz to 4 kHz. Loudness is removed and nine cosine coefficients are kept. The nearest fingerprint among the four letters in play wins, and the six most recent votes smooth it.
5. **Steering:** two voiced frames start the flight (about 35 ms), and the start gives a hop. Short gaps of up to 4 frames are bridged. Thrust grows with loudness above the gate.
6. **No self-listening:** the microphone is ignored while narration speaks, plus 350 ms after it. It is also ignored while a tonal effect (cherry, snowflake, win and so on) rings. The mic icon dims meanwhile.

Built-in fingerprints are averaged from formant-synthesised vowels of children and grown-ups. Tests reach > 92 % per frame on varied synthetic voices without teaching. The macOS Russian voice Milena is an adult voice outside that average. After a short teaching round she reached ~95 % per frame on those checks, and smoothing over frames removes most remaining flicker.

### Teach the ice cream («Научи мороженку»)

- Each direction card shows its letter. Tapping the letter cycles through А, О, У, И, Э. If another direction already uses it, the two letters swap places, so the four letters always stay different. Matryona can pick her own letters, including Э (the sound of Е).
- “Начать” asks for each letter in turn: “Скажи долго: «А-а-а-а»!”. The ring fills after 36 voiced frames, about 0.6 s of sound. The mic button on a card re-learns just that letter.
- If two learned letters sound too alike, the game suggests saying them differently or choosing another letter. Different vowels lie 2.8–7.6 apart and the same vowel stays within ~0.8; the warning shows below 1.6.
- After teaching, the page stays in test mode: the card of the letter it hears lights up. “Забыть мой голос” goes back to the built-in fingerprints.

Without a microphone, when permission is denied, or on browsers without `getUserMedia`, the game says so and switches to buttons. The microphone pauses in menus and stops after 45 s, when the page is hidden, or when the page is left. Coming back quickly then needs no second permission prompt on iPad.

## Language, narration and sound

- Russian, German and English share `spielzeuge.lang` with the catalog. RU/DE/EN are selected in the top bar or with `?lang=`. The game is called Мороженка, Eiskugel and Ice Cream. The letter labels are А/О/У/И/Э, A/O/U/I/E and AH/OH/OO/EE/EH. English uses sound spellings so that “I” is not read as “eye”.
- Narration reuses `PuppyNarration`. It speaks the welcome, clicked menu actions, round hints (with the current letters), crashes, wins and cherry totals, teaching prompts, letter changes and microphone fallbacks. A retry names only the round, so the microphone opens sooner. In voice mode, cherries and snowflakes during flight are shown and chimed but not spoken, because speech would mute the microphone mid-flight. In button mode they are spoken too. The letter pad itself is not narrated.
- Effects are synthesized in `src/morozhenka-audio.ts`: a soft fire whoosh that follows the voice, a start chime, a splat, a respawn sparkle, a cherry, a snowflake, a win fanfare, a “learned” chime and a flavor bloop. The speaker button mutes speech and effects, stops the fire and is saved.

## Saving

`spielzeuge.morozhenka.v1` in localStorage holds sound, control mode, flavor, unlocked hand-made round, next surprise map, the best result per round (cherries plus flavor), letters, learned voice fingerprints and microphone sensitivity. Broken or hostile values are sanitised. Duplicate letters fall back to the defaults. Voice fingerprints must be nine finite numbers. Without storage the game still plays and the title says progress will not be saved.

## Files

- `src/morozhenka.ts` — screens, game loop, input, teaching
- `src/morozhenka-levels.ts` — rounds, surprise generator, solvability checks
- `src/morozhenka-physics.ts` — thrust, drag, collisions, cone and pickups
- `src/morozhenka-dsp.ts`, `src/morozhenka-voice.ts` — voice analysis and microphone
- `src/morozhenka-art.ts`, `src/morozhenka-svg.ts` — canvas drawing and menu/catalog SVG
- `src/morozhenka-audio.ts`, `src/morozhenka-copy.ts`, `src/morozhenka-state.ts`, `src/morozhenka.css`

## Checks

- `npm test` covers pitch at 44.1/48 kHz, rejection of silence and hiss, uncalibrated and taught vowel accuracy, and gate, hop, hangover, sensitivity and self-listening rules. It also covers flight, drag, top speed, collisions, stones, cone and pickups, all hand-made rounds, 120 surprise maps, and save sanitising and progress.
- `npm run test:morozhenka` needs a running dev server. `MOROZHENKA_BASE_URL` and `CHROMIUM_PATH` are optional. It checks the catalog card, flavors, flying with held buttons and the Russian keyboard, the cherry, winning, crashing and respawning, progress, the round grid, round 12 with stones and a surprise map. It also checks the letter picker, RU/DE/EN text, labels and speech locales, mute persistence, and five viewports (phone, small phone, iPad portrait and landscape, phone landscape). Then Chrome’s fake microphone plays synthesised child vowels: «А» lifts the scoop straight up, «И» flies right and «О» is learned on the teach screen. Screenshots go to `tmp/`.
- Real voices, especially on iPad, still need a try with the child. If a letter is misheard, a teaching round or a different letter usually fixes it.
