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
3. One of eight wooden visitors steps into the opening, makes its sound, and is named. The whole animal is visible — the closed door is the peekaboo, not a half-hidden guest.
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

Tap the lamp to cycle русский → Deutsch → English. If a visitor is in the doorway, it says its name in the new language right away. If the door is closed, it says the language’s name. Hold the lamp to pick from the sheet. The choice is stored on the device.

`?lang=ru|de|en` sets the sitting. `?visitor=cat|dog|bird|duck|bunny|mouse|cow|bear` forces the first guest (useful for checking a clip).

## Sounds

Animal and door sounds are short mono MP3s (Safari on iOS does not play OGG). Credits and licences are in `public/sounds/CREDITS.md`.

A greet plays the animal clip, then the spoken word once the clip is almost finished, so a long moo is not talked over or cut off. Speech uses the browser’s voices. On an iPhone the first tap unlocks both Web Audio and speech. Recorded family voices can replace the speech later.

Duck is the mallard quacks from XC62258, not the silent head of that file. Cow is the full Single Cow Moo with a fade, not a mid-call trim. Mouse is a rubber-toy squeak. Bear is a short Fish & Wildlife growl.

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
