# Kuckuck

A door. A knock. A visitor. A word.

Made for a child of about twenty-two months who is growing up with Russian at home, German in the street, and English around the edges.

## What it practices

- Cause and effect: tap, the world answers
- Anticipation and peekaboo
- One clear spoken noun, stuck to something the child just revealed
- Turn-taking: knock, open, look, again

It is a toy, not a lesson. Sitting together and saying the word with the voice is the useful part.

## Loop

1. The hallway waits. After a breath, the door knocks.
2. A tap on the door frame opens it wide.
3. One of fifteen wooden visitors steps into the opening, makes its sound, and is named. The whole animal is visible — the closed door is the peekaboo, not a half-hidden guest.
4. Tap the visitor to hear the sound and the word again.
5. Tap the door frame (not the guest, not the hall) to close. If nobody taps the frame, it closes after about four seconds.

If nobody answers, the door knocks again a couple of times, then rests.

## Taps

The spoken language name (русский / Deutsch / English) is **only** produced by tapping the lamp when nobody is in the doorway.

The code in `src/input.ts` (`decide(phase, zone, hasVisitor)`) is the source of truth. “Door” is the whole doorway (leaf, jambs, opening). Hall, floor, and wallpaper are `elsewhere`.

| State | Lamp | Visitor | Door frame | Hall / floor / wallpaper |
| --- | --- | --- | --- | --- |
| Closed | Say the language name, switch language | — | Knock | Ignore |
| After a knock | Say the language name, switch language | — | Open | Ignore |
| Opening | Switch language, say the animal | Ignore | Ignore | Ignore |
| Open, guest visible | Switch language, say the animal | Animal sound + word | Close | Ignore |
| Closing | Ignore | Ignore | Ignore | Ignore |

## Languages

One language per sitting. Switching mid-play is how words fail to stick.

| | RU | DE | EN |
| --- | --- | --- | --- |
| cat | кошка | Katze | cat |
| dog | собака | Hund | dog |
| bird | птичка | Vogel | bird |
| duck | уточка | Ente | duck |
| bunny | зайчик | Hase | bunny |
| mouse | мышка | Maus | mouse |
| cow | корова | Kuh | cow |
| bear | мишка | Bär | bear |
| frog | лягушка | Frosch | frog |
| capybara | капибара | Capybara | capybara |
| fox | лиса | Fuchs | fox |
| elephant | слон | Elefant | elephant |
| owl | сова | Eule | owl |
| hedgehog | ёжик | Igel | hedgehog |
| penguin | пингвин | Pinguin | penguin |

Tap the lamp to cycle русский → Deutsch → English. If a visitor is in the doorway, it says its name in the new language right away. If the door is closed, it says the language’s name. Hold the lamp to pick from the sheet. The choice is stored on the device.

`?lang=ru|de|en` sets the sitting. `/kuckuck/?visitor=cat|dog|bird|duck|bunny|mouse|cow|bear|frog|capybara|fox|elephant|owl|hedgehog|penguin` forces the first guest (useful for checking a clip).

## Sounds

Animal and door sounds are short mono MP3s (Safari on iOS does not play OGG). Credits and licences are in `public/sounds/CREDITS.md`.

A greet plays the animal clip, then the spoken word once the clip is almost finished, so a long moo is not talked over or cut off. Refreshing the auto-close timer (tapping the visitor again, or the door finishing its open) must not cancel that pending word — otherwise only the short clips (cat, bunny, mouse) get a name and the rest stay silent. Speech uses the browser’s voices. On an iPhone each tap unlocks speech; canceling the engine between visits makes the next word fail. The sitting’s language has to be installed as a Spoken Content voice — a German iPhone often has no Russian voice, and then the word is silent. Recorded family voices can replace the speech later.

Duck is the mallard quacks from XC62258, not the silent head of that file. Cow is the full Single Cow Moo with a fade, not a mid-call trim. Mouse is a rubber-toy squeak. Bear is a short Fish & Wildlife growl. Frog is a short CC0 croak from OpenGameArt. Capybara is a short loud CC0 rodent squeak (Freesound guinea-pig recording; close cousin, clear and toy-safe).

When replacing a clip, bump `CACHE` in `public/sw.js`. Home-screen copies cache sounds with a cache-first worker.

## Tests

```bash
npm test                 # every phase × zone cell of decide()
npm run test:taps        # Playwright: hallway stays silent, lamp says the language name only when the door is closed
```

`npm run test:taps` expects `npm run dev` on http://localhost:5173.

## Why these mechanics

At this age drag-and-drop, menus, timers, and failure are the wrong material. A whole door is a fist-sized button. Taps on the wallpaper are not a door.

The door is also the seed of the catalog: later toys can live behind it without turning the home screen into a grid of icons.

## Five new visitors

Fox wags its cream-tipped tail and tilts its head; elephant waves its trunk and ears; owl tilts its head and spreads its wings; hedgehog sniffs beneath a little leaf; penguin waddles and waves a flipper. All five are layered SVG wooden toys, with reduced-motion support.

The visible RU/DE/EN control cycles the shared language. The music button mutes both speech and effects, immediately stops pending sounds, and saves `spielzeuge.kuckuck.muted`. Changing language cancels obsolete greetings. Missing audio, speech and storage APIs do not prevent opening the door.

New sounds are original, softly synthesized toy impressions (bark, trumpet, hoot, sniff, chirp), not wildlife recordings. Rebuild using `python3 scripts/kuckuck-sounds.py` (requires ffmpeg).

Run `npm run test:kuckuck` with Vite on port 5174, or set `BASE_URL`. Covers all five visitors in all three languages, portrait and landscape mobile and desktop, repeated greetings, language races, saved mute and language, and unavailable browser APIs.

## iPad first-tap regression

Gameplay handles completed `click`/tap events, not touch `pointerdown`. Audio and wake-lock startup begin in that gesture, but their promises never block door or keyboard actions. Suspended audio contexts do not queue obsolete effects.

`npm run test:kuckuck-start` checks a fresh iPad-sized touch session with indefinitely pending audio resume, sound fetch, audio decode and wake-lock requests, plus normal startup. Each case opens, greets, closes and reopens using the keyboard without touching language controls. Run `ENGINE=webkit npm run test:kuckuck-start` for WebKit (install using `npx playwright-core install webkit`). This is browser automation, not a physical iPad test.

## Speech-session regression

Normal greetings preserve the speech session opened by the tap. They do not call `speechSynthesis.cancel()` before the delayed name, and the name queues after the silent priming utterance instead of cancelling it. Closing, muting, leaving and changing language still explicitly cancel obsolete speech. Taps while a name is pending do not restart its sound/timer, so repeated taps cannot starve the name.

`npm run test:kuckuck-speech` uses a strict speech-session mock where cancelling invalidates the gesture unlock; checks hedgehog, owl and penguin on first reveal and repeated taps. It reproduces the old cancellation failure, unlike a test that only logs `speak()` calls. Actual voice output still depends on the device and its installed voices.
