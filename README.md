# Spielzeuge

A small catalog of calm toys for children. Web first, later on iPad.

Start page: choose a toy. The first toy is **Kuckuck**. The second is **Чуняшка**, a dress-up doll. Always clothed. Hearts after Ready stay in the game; nothing is posted. The third toy is **Собачка**, a puppy-care game inspired by a child’s drawing.

Слайм Чек is Veronika’s slime-care game. [Game details and checks](docs/slime-check.md).

Language is shared across the catalog and every toy (`localStorage` key `spielzeuge.lang`). Default: Russian. Change it with the quiet corner lamp control (tap to cycle, hold for a sheet) or `?lang=ru|de|en`. Собачка and Слайм Чек also have visible RU/DE/EN selectors in their top corners.

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

### Собачка

Feed, walk, play and nap with a little puppy. Friendship hearts unlock three calm mini-games; progress stays on the device and never decays. Details and checks: [docs/sobachka.md](docs/sobachka.md).

### Kuckuck

There is no menu. The door knocks. Tap the door frame. It opens. A wooden animal is there. It makes its sound, then a voice says the word. Tap the visitor to hear that again; tap the frame to close. Hall and floor do nothing.

- Default language: Russian
- Change language: tap the lamp to cycle (or hold it, or press `L` then `1` / `2` / `3`)
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

Kuckuck query helpers: `/kuckuck/?lang=ru|de|en` and `/kuckuck/?visitor=cat|dog|bird|duck|bunny|mouse|cow|bear|frog|capybara`.

## Delivery workflow

Each completed development milestone is checked, committed, pushed and immediately deployed to production. The agent decides when a milestone is ready without asking for additional approval. Verify the affected public routes after deployment.

## Public site

Live at [https://spielzeuge.kapitonov.su](https://spielzeuge.kapitonov.su).

```bash
./deploy/deploy.sh
```

That builds and rsyncs `dist/` to `root@46.62.166.228:/opt/spielzeuge/`. The shared Caddy on that host serves the files and renews the certificate. First-time Caddy/compose changes are in `deploy/Caddyfile.snippet`.

Hashed `/assets/*` are cached forever. Everything else, including `/sounds/*`, is `no-cache`. After changing a sound or icon, bump `CACHE` in `public/sw.js` so home-screen copies drop the old files.
