# Песенки

Песенки (Liedchen, Little Songs) is Matryona’s second game. She was nearly six when she drew it and explained it to her dad. You pick a song, the song sings, and you tap the picture of what was just sung. Open `/pesenki/` or choose it in the catalog.

## From the interview and the drawing to the game

| Matryona said / drew | In the game |
| --- | --- |
| “Эта игра называется Песенки”, “Надо выбирать песни” | The first screen is a sheet of paper with a circle for every song. Each circle shows the song’s hero. |
| Left panel: a grid of circles with pictures (a panda, Labubu with teeth and tongue, a cat, a boat on waves, a girl, letters…) | One circle per song, starting with Пандёнок (see [Songs](#songs)). The circles are pencil rings drawn in one stroke with overlapping ends, like hers. Heroes for ten songs from her drawing are ready. |
| Right panel: “такой же рисунок”, a big circle with the same panda in the middle | The song screen shows the same hero, big, in the middle. The panda wears the tie and the swirl flower from her drawing. |
| “Это не шкала, это часы” — a long oval at the top that fills in | The clock is her pencil oval. It fills with graphite hatching as the song goes. An alarm clock at its end rings when the song is over. |
| “Когда тыкаешь, в начале здесь начинается” | The song waits until you tap the hero. |
| “Когда перестаёшь, он обратно идёт. Уй, уй, уй” | In every chorus you tap the hero to keep the song going. Stop, and the tape slows down, then the song runs backwards (“уй-уй-уй”) until you tap again. |
| “Ускорения новые появляются … и ещё, и ещё” | When the clock is full, speed-ups appear. Pick one and the song plays again faster: a turtle, a bunny, a pony, a cheetah and a rocket. Each finished speed opens the next. |
| Dad: the song sings a line and you tap the picture from that line; quickly means the song flows, otherwise it stops until you pick right. Matryona: “Вот”, and “это не мышка, это Лабубу” | This is the main task. Pictures appear with each verse line. A right picture found while the song keeps going earns a star. Otherwise the song stops after the line and waits. |
| “Должна быть музыка” | Real sung songs, made with Suno from lyrics written for the game, in Russian, German and English. |

## Playing

- **Shelf:** her ten circles, one per song. Five dots under each circle show which speed-ups are done. After all five, the circle gets a gold ring. The last song played is underlined. A song that is not recorded yet shows its hero asleep (grey, eyes shut, «zzz», a dashed ring); tapping it makes the hero stretch and the narrator says the song is still asleep.
- **Start:** the hero breathes and a pencil hand points at it. One tap starts the song after a short intro.
- **Verse lines:** 3 to 5 picture circles pop up just before each line. The karaoke line under the hero shows the words and lights them as they are sung. The picture word is an empty circle. A wrong picture shakes and greys out; nothing else happens. The right one flies onto the clock, fills the circle in the karaoke line and the song goes on.
- **Waiting:** if the line ends without the right picture, the song stops between lines. A soft clock ticks. The first time, the narrator asks “Что спели? Найди картинку!”. After 6.5 s the song rewinds «уй-уй-уй» and sings the line again. After the second replay the right picture glows. Tapping the hero while waiting also sings the line again.
- **Choruses:** the choices disappear, an energy ring appears around the hero and the hand points at it. Every tap adds energy; a tap right on the beat adds more and throws a golden note. With no taps, the ring empties, the music slows down like a tape and then runs backwards to the start of the chorus. There it waits, asleep, for a tap.
- **The end:** the alarm clock rings, confetti flies, and a card shows one star per picture found without stopping. It offers the speed-ups, “Ещё раз” and “Другая песенка”. A newly opened speed-up spins in with a sparkle. Next time the song opens at the fastest open speed-up, and the smaller speed circles under the hero let a grown-up pick another.
- **Speed-ups:** ×1, ×1.15, ×1.3, ×1.45, ×1.6 with 3, 3, 4, 4 and 5 pictures. The tape speed changes the pitch too, so the rocket sings like a chipmunk. That is on purpose. Pauses, rewinds and chorus drain follow the speed.
- **Pause:** the pause button in the top bar, `Esc`, hiding the page or an audio interruption (a phone call on iPad) stop the song where it is. Tapping the hero continues.
- **Keyboard:** `1`–`5` pick the circles from left to right, `Space` taps the hero, `Esc` pauses.

There is no failing, no timer and no score apart from the stars.

## Songs

Every song has the same form in every language: a short intro, a verse of 4 picture lines, a chorus of 4 tap-along lines, another verse of 4 picture lines and the chorus again. The English part ends with an outro. Each picture line names exactly one picture, and no picture word appears anywhere else in the song.

The lyrics, pictures, colours and Suno styles live in `src/pesenki-lyrics.json`. The shelf and the picture names are read from it. The shelf shows only songs recorded in all three languages. Lyrics for Лабубу, Котёнок, Кораблик, Матрёна and Совушка are written and wait for their recordings.

| Song | Hero | Pictures |
| --- | --- | --- |
| Пандёнок / Kleiner Panda / Panda Cub | a panda cub with a tie and a flower | bamboo, ball, tie, flower, cloud, apple, drum, sofa |

## How a song is made

1. Write the song into `src/pesenki-lyrics.json`: `order` (`ru`, `de`, `en`), a style, the pictures with their words, and per language `verse1`, `chorus`, `verse2`. Each picture line gives its `pic` and the exact `word` as sung.
2. `node scripts/pesenki-songs.mjs lyrics <song>` prints the Suno lyrics. All three languages go into **one** recording, one after another, with `[Instrumental Break]` between them. The free Suno plan allows few downloads, and this way one download gives a song in all three languages with the same melody. Set the style, a female voice and a duration of about 5 minutes (v6-mini).
3. Suno’s `aligned_lyrics` gives a time for every word. Save it as JSON: either Suno’s own `{aligned_words: [...]}` or a compact `[[word, start, end], ...]` list.
4. `node scripts/pesenki-songs.mjs build <song> <raw.mp3> <aligned.json>`:
   - It matches Suno’s words to ours letter by letter (Needleman–Wunsch on folded letters; section tags are skipped, and words that swallow an instrumental break are capped at 2.4 s).
   - It cuts one file per language. Each later language keeps up to 5 s of the break before it as its intro. It fades, normalises loudness to −16 LUFS and encodes 112 kbps mono MP3 into `public/pesenki/<song>.<lang>.mp3`.
   - It finds the tempo and a downbeat from an onset envelope (spectral flux, autocorrelation, comb phase).
   - It writes `src/pesenki-timings/<song>.<lang>.json` with lines, words, the picture of each verse line, the choruses, `bpm` and `beat0`. Choruses are trimmed so they never overlap a picture line.
   - `song.end` in the lyrics file cuts the last language when Suno started the song over to fill its length.
5. Draw the pictures (`src/pesenki-pictures.ts`) and check with `npm test`.

## How it works

- `src/pesenki-timeline.ts` — the **conductor**, pure and unit-tested. It turns a timing into cues (when pictures show, where the song pauses, where a replay starts) and runs the modes: idle, play, hold, hint, rewind, stuck, paused, done. The page feeds it the song position every frame and it answers with commands: play, stop-at, rate, reverse, show, hide, right, wrong, chorus, tap, done.
- `src/pesenki-player.ts` — Web Audio player. One decoded buffer and a reversed copy for running backwards. Position comes from the audio clock: each voice remembers when it started, where and how fast. `stopAt` schedules a sample-exact stop with a 45 ms fade in the gap after a line. An answer that arrives before the stop splices a new voice exactly at the stop time, so a fast answer never makes a gap. Rate changes (the tape slowdown) keep the position exact. `audiblePosition` subtracts the output latency for karaoke and beat taps. On iPad the audio session is set to `playback`, so songs play even with the ringer switch on silent.
- `src/pesenki-sfx.ts` — synthesised effects on the same master gain: pop, right (climbing a pentatonic ladder with each right answer), fast, wrong, drum, perfect, clock tick, rewind warble, alarm, whoosh, unlock, cheer.
- `src/pesenki.ts` — screens, input, narration, lip sync (the hero’s mouth opens while a word is being sung), dancing on the beat, the clock and the finish card. `src/pesenki-draw.ts` draws the pencil circles, the oval clock and hatching from seeds.
- `src/pesenki-heroes.ts`, `src/pesenki-pictures.ts` — the drawings (felt-tip colours, graphite outlines). Heroes are animated by CSS through their groups: `.hero-body` bounces, `.hero-head` tilts, `.hero-eyes` blink, `.hero-mouth-open` / `.hero-mouth-closed` swap while singing, and `.hero-wiggle-a` / `-b` swing to the beat. Each group carries its pivot as an inline `transform-origin` in viewBox pixels.

## Language, narration and sound

- Russian, German and English share `spielzeuge.lang`. The RU/DE/EN selector is in the top bar, and `?lang=` works too. Every language has its own recording. Changing the language during a song loads that language’s recording and waits for a tap.
- Narration uses `PuppyNarration`. It speaks the welcome, the song title when a circle is tapped, the start hint, the first “what was sung?” while a song waits, the chorus wake-up, the finish (stars and the new speed-up), speed-up names, pause and sound on. Nothing is spoken over the singing. Speech is cancelled when the song continues.
- The sound button mutes songs, effects and speech, stops pending speech and is saved. Without sound the game still works: the karaoke line and the pictures carry on in silence.

## Saving

`spielzeuge.pesenki.v1` holds sound, and for each song the finished speed-ups, the best number of stars and plays, and the last song. Broken or hostile values are sanitised. Without storage the game plays and the shelf says progress will not be saved.

## Credits

Songs were generated with Suno (model v6-mini, free plan) from lyrics written for this game. They are used here non-commercially, and the shelf credits Suno. Heroes and pictures were drawn for this game.

## Checks

- `npm test` covers the conductor: cue planning, pausing between touching lines, karaoke line choice, beat offsets, choices, fast and late answers, the hint rewind, chorus slowdown, rewind and wake-up, pause and resume. It also covers every recording in every language: audio exists, picture lines follow the lyrics, times move forward, choruses never cover a picture line. Every picture and hero has a drawing, and every speed-up has a name.
- `npm run test:pesenki` needs a running dev server. `PESENKI_BASE_URL` and `CHROMIUM_PATH` are optional. It checks the catalog card in three languages, the greeting, start by hero tap, wrong and right pictures, stopping and waiting, the hint rewind, fast answers, keyboard picks, and chorus tapping, slowdown and rewind. It then checks finishing (alarm, stars, saved progress, the new speed-up) and the faster replay. It also covers a language change mid-song, mute persistence without speech, English labels, pausing while hidden, and five viewports (phone, small phone, iPad portrait and landscape, phone landscape) with screenshots in `tmp/`.
