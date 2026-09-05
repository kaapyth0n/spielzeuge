# Слайм Чек

A Russian/German/English slime-care game imagined by Veronika, age 8, with a star-shaped character based on her drawing. Open `/slime-check/` or choose it in the catalog.

- Pet the slime, bathe it, and let it sleep for four seconds. Each action restores up to 25 points and awards one coin per five restored points, rounded up. Full stats do not generate extra coins.
- Pick up the slime before entering the garden. Drag and release it in the bottom 30% of the garden to get it muddy; washing removes dirt and leaves as cleanliness improves.
- Walk on your hands to restore joy and use a little energy. Stretching uses energy and joy, making rest and care useful again. No needs decay while the game is closed.
- In the stretch room, drag in any direction and release to record a distance. Maximum length is `100 + cleanliness + energy + joy` centimetres. A keyboard-accessible button stretches to 80% of the current maximum.
- Spend earned coins on colors, costumes and room decoration themes. Owned items can be equipped for free. Decoration themes apply across the rooms.
- Needs, coins, purchases, selected appearance and personal record are saved under `spielzeuge.slime-check.v1` in localStorage. Corrupt saves fall back safely. The game remains playable when storage is unavailable.

Checks: `npm test`, `npm run build`, and `node scripts/slime-spec.mjs` against the local dev server on port 5173. The browser script checks the care/purchase/walk/drop/bath/sleep/stretch/save loop, mobile overflow and catalog navigation, and saves screenshots in `tmp/`.

## Park friends and a baby

Meet six NPC/slime pairs: Mira & Cloud, Leo & Spark, Aya & Jellybean, Tim & Bounce, Nora & Blueberry, and Sam & Peach. They have distinct portraits, slime colors, accessories and introductions in all three languages. New walks draw from a persisted shuffled bag: everyone appears before the next cycle and consecutive encounters never repeat. “Walk further” finds another pair without going home. Language changes and care actions keep the current visitor. Ask the owner before playing: they ask a muddy or exhausted slime to wash or rest first. Permission lasts for the current visit. Passing the ball builds friendship (three hearts), restores joy and uses both slimes’ energy.

Ask both slimes whether they want to make a baby. Each responds separately: friendship and their wellbeing determine the answer. Only two willing slimes can donate pieces. The player can cancel before the second piece; nothing is spent. Two pieces create Kapelka, a small slime combining the player's color at that moment with the actual donor slime’s color. There is no one-baby limit. Each new baby requires a fresh agreement from both slimes and two donated pieces. All babies appear in the family section and can be hugged individually; the first baby also appears in the scene. Each keeps its own color, donor identity and hug count. The “Another baby” action remains available, with four visible steps and contextual care hints. “Rest together” restores both slimes’ energy on the current walk, so the player does not need to leave a friend to try again. Friendship is saved separately for each visitor; permissions and donated pieces reset at a new encounter. Old Cloud friendship and baby saves migrate to Mira/Cloud automatically. Single-baby saves become a one-entry `babies` collection without losing progress; `baby` remains a compatibility alias for the first entry.

`node scripts/slime-friends-spec.mjs` verifies the owner permission/refusal, friendship, wishes, cancellation, both donations, baby persistence and mobile layout.

## Language, voice and sound

The visible RU/DE/EN selector shares `spielzeuge.lang` with all games. All UI, shop labels, all visitor dialogue and accessible labels are translated. The catalog card follows the same language. Numeric captions compose from translated source phrases in `src/slime-copy.ts`; the game model keeps stable language-independent ids.

Narration reuses Собачка’s `PuppyNarration`: a tap speaks its action followed by the resulting message. Both slimes’ answers are narrated when asking their wishes. Tap the message to repeat it. Sleeping/waking, records and the baby’s arrival also speak their messages; changing language cancels old speech and translates delayed feedback when it completes.

`SlimeAudio` synthesizes gentle effects locally for touch, care, water, sleep, waking, stretch, muddy drops, ball play, purchases and a baby’s arrival. No external sound download is needed. The speaker toggle saves its setting with the slime, mutes speech and effects together and cancels pending sound. Browser gestures unlock audio; leaving/hiding the page stops playback. Actual speech depends on installed browser/device voices.

Run `node scripts/slime-speech-spec.mjs` for speech/effect calls, mute, language persistence, translated story branches and mobile checks.

`node scripts/slime-visitors-spec.mjs` checks all six encounters, no consecutive repeats across reloads, separate friendship, reset permissions and three-language mobile presentation. Set `SLIME_BASE_URL` to run this verification against production.

`node scripts/slime-family-spec.mjs` reproduces a saved single baby, creates three additional babies with renewed consent, checks all three languages, individual hugs and persistence. `SLIME_BASE_URL` can target production.

## Baby names

Babies receive distinct default names from a localized set (Droplet, Fluffy, Toffee, Pearl, and more). Existing unnamed babies get these names in family order, keeping all their progress. After the set is exhausted, a numbered cycle keeps defaults distinct. Each family card has “Change name” with Save/Cancel; Enter saves and Escape cancels. Custom names allow up to 32 characters, preserve their spelling across languages, and are saved per baby. Empty names are rejected. Names are inserted as text, never interpreted as HTML or run through the dialogue translator. The selected name appears in the scene, family, accessible labels, birth message and hug narration.

Run `node scripts/slime-names-spec.mjs` for naming, cancellation, persistence, speech, literal text handling and mobile verification. Set `SLIME_BASE_URL` to verify production.
