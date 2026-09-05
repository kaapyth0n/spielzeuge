# Spielzeuge

A small catalog of calm toys for children. Web first, later on iPad.

Start page: choose a toy. The first toy is **Kuckuck**. The second is **Чуняшка** (coming soon).

Language is shared across the catalog and every toy (`localStorage` key `spielzeuge.lang`). Default: Russian. Change it with the quiet corner lamp control (tap to cycle, hold for a sheet) or `?lang=ru|de|en`.

## Toys

| Path | Toy |
| --- | --- |
| `/` | Catalog |
| `/kuckuck/` | Kuckuck — door, knock, visitor, spoken name |
| `/chunyashka/` | Чуняшка — placeholder until the game is ready |

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

## Public site

Live at [https://spielzeuge.kapitonov.su](https://spielzeuge.kapitonov.su).

```bash
./deploy/deploy.sh
```

That builds and rsyncs `dist/` to `root@46.62.166.228:/opt/spielzeuge/`. The shared Caddy on that host serves the files and renews the certificate. First-time Caddy/compose changes are in `deploy/Caddyfile.snippet`.

Hashed `/assets/*` are cached forever. Everything else, including `/sounds/*`, is `no-cache`. After changing a sound or icon, bump `CACHE` in `public/sw.js` so home-screen copies drop the old files.
