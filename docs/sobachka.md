# Собачка

A calm puppy-care game for children aged 5–8, based on the child's drawing: a dog on a rug, a squeaky toy to its left, a ball, changeable wall drawings, care buttons and a separate page of games.

Open `/sobachka/`. The catalog links to it. Russian, German and English use the existing shared language preference, including `?lang=ru|de|en`. Only the initial welcome and changing captions beneath the puppy are automatically narrated in the selected language using browser speech synthesis. Clicked actions are spoken; headings, counters, menus and unclicked controls stay quiet. Tapping prose reads it again; the question-mark button repeats the current instruction. A new action or language cancels stale speech, while automatic feedback is queued in order. The sound toggle mutes both voice and effects. Some browsers require the first tap before speech can start; voices depend on the device. All actions also work silently.

- Tap the puppy to pet it; tap the bunny to squeak.
- Feed: tap a food, or drag it to the bowl using mouse or touch. Eating finishes after 1.8 seconds.
- Walk: collect the five flowers to make a bouquet.
- Sleep: a 5.5-second nap; wake early or leave at any time.
- Ball: the puppy runs back and forth for 3.6 seconds.
- Toilet: enter the puppy’s bathroom and choose pee or poop. After a 2.6-second potty animation, clean the tray; a completed cleanup gives one care heart. Leaving cancels the activity without a penalty. Older saves keep their progress.
- Wallpaper cycles between shapes, flowers and stars.

Each completed care activity adds one permanent friendship heart. Interrupted activities give no heart. Repeated pointer events during an activity cannot award extra hearts. Nothing decays while away, and there is no hunger punishment, failing, advertising or purchase flow.

## Games

1. Fetch is open immediately: tap five balls; puppy fetches each one. No time pressure.
2. Memory opens at 3 care hearts: match three shuffled pairs, or choose six pairs for a bigger challenge. Wrong pairs turn back over, without a penalty.
3. Shapes opens at 6 care hearts: match five shapes with randomly ordered options. Wrong choices can be retried.

Mini-games celebrate completion; they do not add care hearts. All earned games stay available. Progress, wallpaper, care history and sound preference are saved locally under `spielzeuge.sobachka.v1`. Malformed data is sanitized. If storage is unavailable, the game runs for the current session and displays a note.

Original SVG artwork lives in `src/sobachka-art.ts`. Sound effects use local Web Audio synthesis and two existing clips served by this site; no third-party audio service is needed. Reduced-motion preferences disable decorative animations. Native buttons support keyboard input; food dragging also has a tap alternative.

## Verification

- `npm test`: state recovery, unlock boundaries and existing toy tests.
- `npm run build`: TypeScript and all four page entrypoints.
- With `npm run dev` running: `npm run test:sobachka`. Uses locally installed Chrome through Playwright; covers the catalog, completed/interrupted care, drag feeding, mini-games, persistence, languages, touch, and viewport overflow. Screenshots are saved in `tmp/`.

- `npm run test:sobachka-speech`: browser checks of narrated text, action labels, delayed feedback, interruption, mute and Russian/German/English utterance locales. Uses a speech API recorder to verify calls without depending on installed voices.

- `PUPPY_TEST_URL=http://localhost:5184 node scripts/sobachka-toilet-spec.mjs`: pee/poop, cleanup rewards, cancelled actions, old saves, touch target sizes, mobile/tablet layouts and localized speech. Set the URL to your running dev server.

## Action sounds

Each action has its own short sound: puppy bark, toy squeak, food crunches, paw steps and flower rustles, bouncing ball, sleepy breathing, potty splashes/plop, cleanup swish, wallpaper rustle, card flip and matching/reward chimes. Effects follow activity timing. There is no continuous background track.

`src/sobachka-audio.ts` synthesizes the effects locally with Web Audio. Petting and the squeaky toy also reuse the existing licensed `/sounds/dog.mp3` and `/sounds/mouse.mp3` clips (see the sound credits), with synthesized fallbacks if unavailable. The shared sound preference controls effects and narration. Muting, leaving a room, or hiding the page cancels active and future effects; unmuting does not replay old sounds.

`node scripts/sobachka-audio-spec.mjs` checks real PCM output for every synthesized effect and verifies action mappings, sample decoding and immediate mute/navigation silence in the browser. `PUPPY_TEST_URL` selects the dev server (default port 5184).
