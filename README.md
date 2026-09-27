# Spielzeuge

A small catalog of calm toys for children. Web first, later on iPad.

Start page: choose a toy. The first toy is **Kuckuck**. The second is **Чуняшка**, a dress-up doll. Always clothed. Hearts after Ready stay in the game; nothing is posted. The third toy is **Собачка**, a puppy-care game inspired by a child’s drawing.

Слайм Чек is Veronika’s slime-care game. [Game details and checks](docs/slime-check.md).

**Песенки** is Matryona’s second game: a real sung song plays, and you tap the picture of what was just sung. Right away, and the song flows on; otherwise it waits after the line. In the chorus you tap the hero to keep the music going, or it slows down and runs backwards («уй-уй-уй»). A finished song unlocks speed-ups, up to a chipmunk-voiced rocket. Songs were made with Suno, all three languages in one recording. [Design, song pipeline and checks](docs/pesenki.md).

**Мороженка** is Matryona’s game: a scoop of ice cream spits fire and flies with your voice. Say «А» to go up, «И» right, «О» left and «У» down, avoid the pencil-drawn walls and land in the cone. There are 12 rounds, then endless surprise maps. Buttons work too, and the ice cream can learn a child’s own voice. [Design, voice steering and checks](docs/morozhenka.md).

Language is shared across the catalog and every toy (`localStorage` key `spielzeuge.lang`). Default: Russian. Change it with the quiet corner lamp control (tap to cycle, hold for a sheet) or `?lang=ru|de|en`. Собачка, Слайм Чек, Мороженка and Песенки also have visible RU/DE/EN selectors in their top corners.

## Required for every game

**Every game must support Russian, German and English from its first playable version.** This applies to all buttons, instructions, shops, character dialogue, event feedback and accessible labels. Each game must provide a discoverable language control and use the shared `spielzeuge.lang` preference (Russian by default; `?lang=ru|de|en` is supported).

Actions and character messages should be spoken in the selected language where appropriate, following Собачка’s narration behavior. Add suitable quiet sound effects. A visible sound toggle must mute both speech and effects, save the preference, and stop pending audio. Changing language must cancel speech in the old language; delayed feedback must use the current language. Speech uses browser/device voices, so voice availability depends on the device.

Verify all three languages, narration calls, effects, mute, saved preferences and mobile controls before considering a new game complete.

## Toys

| Path | Toy |
| --- | --- |
| `/` | Catalog |
| `/kuckuck/` | Kuckuck — door, knock, visitor, spoken name |
| `/chunyashka/` | Чуняшка — dress-up; hearts stay on the toy |
| `/sobachka/` | Собачка — care for a puppy, decorate its room and discover three games |
| `/slime-check/` | Слайм Чек — Veronika’s slime-care, dress-up and stretching game |
| `/morozhenka/` | Мороженка — Matryona’s voice-steered ice cream: fly through pencil caves into the cone |
| `/pesenki/` | Песенки — Matryona’s song game: hear a line, tap its picture, drum the chorus, unlock speed-ups |

### Собачка

Feed, walk, play and nap with a little puppy. Friendship hearts unlock three calm mini-games; progress stays on the device and never decays. Details and checks: [docs/sobachka.md](docs/sobachka.md).

### Kuckuck

Twenty-six animals visit, including a sheep, pig, horse, rooster, hen, bee, goat, donkey, goose, cuckoo and monkey. A wooden home tile in the top-right corner returns to the catalog in one tap. The door knocks. Tap the door frame. It opens. A wooden animal is there. It makes its sound, then a voice says the word. Tap the visitor to hear that again; tap the frame to close. Hall and floor do nothing.

- Default language: Russian
- Sound: the visible music button mutes speech and effects and remembers the choice
- Change language: use the visible RU/DE/EN button, or tap the lamp to cycle (or hold it, or press `L` then `1` / `2` / `3`)
- The language name is spoken only when the lamp is tapped and nobody is in the doorway
- No score, no fail, no written words on the child’s screen

Behaviour, tap table, sounds, and tests: [docs/kuckuck.md](docs/kuckuck.md). Sound licences: [public/sounds/CREDITS.md](public/sounds/CREDITS.md).

## Develop

```bash
npm install
npm run dev
```

Then open the printed local URL on a phone or iPad on the same network. The first tap unlocks audio on iOS.

```bash
npm test                 # tap decision table (every phase × zone)
npm run test:taps        # Playwright against the running dev server
npm run build
npm run preview
```

`npm run test:morozhenka` checks Мороженка in the browser, including steering through Chrome’s fake microphone.

`npm run test:pesenki` plays Песенки in the browser: pictures, waiting, rewinds, chorus drumming, speed-ups, languages, mute and five screen sizes.

Kuckuck query helpers: `/kuckuck/?lang=ru|de|en` and `/kuckuck/?visitor=cat|dog|bird|duck|bunny|mouse|cow|bear|frog|capybara|fox|elephant|owl|hedgehog|penguin|sheep|pig|horse|rooster|hen|bee|goat|donkey|goose|cuckoo|monkey`.

## Delivery workflow

Each completed development milestone is checked, committed, pushed and immediately deployed to production. The agent decides when a milestone is ready without asking for additional approval. Verify the affected public routes after deployment.

## Public site

Live at [https://spielzeuge.kapitonov.su](https://spielzeuge.kapitonov.su).

```bash
./deploy/deploy.sh
```

That builds and rsyncs `dist/` to `root@46.62.166.228:/opt/spielzeuge/`. The shared Caddy on that host serves the files and renews the certificate. First-time Caddy/compose changes are in `deploy/Caddyfile.snippet`.

Hashed `/assets/*` are cached forever. Everything else, including `/sounds/*`, is `no-cache`. After changing a sound or icon, bump `CACHE` in `public/sw.js` so home-screen copies drop the old files.

The always-visible 68px home tile stays clear of the door and safe-area insets, including with the language sheet open. Leaving tears down audio, speech, timers, listeners and wake lock; history restoration starts a fresh sitting.

`npm run test:home` checks the home tile on mobile, small portrait, landscape and desktop, keyboard navigation, language labels, re-entry and teardown with a pending audio unlock. Like `test:taps`, it expects a running dev server; override `BASE_URL` and `CHROMIUM_PATH` as needed (defaults: `http://localhost:5173`, `/usr/bin/chromium`). No browser download is required when Chromium is installed.
