# Больница кошечки

Больница кошечки (Kätzchens Krankenhaus, Kitty’s Hospital) is Veronika’s second game. She was eight when she drew it on one sheet and explained it to her dad in an interview. A cat nurse runs a hospital. Animal patients knock at the reception window. You photograph them, because the photo shows who is really there: sometimes it is a monster in a mask. Real patients get a ticket to one of four wards. In the ward the child reads letters, then syllables, then whole words aloud to heal the patient. Open `/bolnica/` or choose it in the catalog.

## From the drawing and the interview to the game

| Veronika drew / said | In the game |
| --- | --- |
| A cat with a nurse cap, a stethoscope and a bag; “Больница кошечки” | The title screen shows the player’s cat in front of a little hospital, with the name tag “Доктор …”. Tap the cat and it says hello. |
| “Начать играть” with a plus | The big start button is a band-aid with a medical cross. Under it: the level, healed patients and points. |
| “Как играть” — “кто-то будет говорить, как игра делается” | The how-to screen has eight illustrated steps and reads them aloud. Every step can be tapped to hear it again. |
| T-shirt button → wardrobe; cap with a plus, stethoscope, a third garment; tap once to put on, again to take off | Wardrobe with seven toggles: cap with a cross, stethoscope, doctor’s coat, doctor’s bag, glasses, bow, head mirror. The third garment in the interview was hard to hear; it became a white coat with a badge. |
| Striped button → choice of fur: X plain white, striped, very fluffy, checked, circles, black with a white face | “Шёрстка” opens exactly these six furs, plus a pattern colour (grey, ginger, pink, blue, lilac). |
| “Как тебя зовут” — write a name, the cat is called that | Name field (16 characters). The name appears on the name tag and the hall of fame. The first “Начать играть” asks for it once; it can be skipped. |
| Tap the cat at the bottom to go back; a back button too | In the wardrobe, tapping the cat in the mirror returns to the title. Every screen also has a back button. |
| Reception: “НАЗАД”, a window with the patient, “ПАЛАТЫ 1 2 3 4”, a camera on a tripod, the photo bottom right | Reception scene: a window with a roller shutter, a vintage camera on a tripod, a polaroid that develops at the bottom right, the four ward buttons at the top. The patient says who they are and what hurts when they knock. |
| The photo reveals infected patients or monsters; swipe down at the top to close, and it leaves | Monsters look exactly like patients in the window (they pretend to be animals still to come). Only the photo shows them. Swipe down over the window and the shutter closes; the monster grumbles away. The “Проведи вниз” pull tab on the awning also closes it with a tap or from the keyboard. A tap on the patient only shows how it works. |
| Give a paper with a number; if you forget it, an arrow always shows which number you gave | A ticket appears in the cat’s paw (“Талончик в палату 2”). Tap it and the patient walks to the ward. A red arrow stays over that ward button until you go there. |
| Ward: “1 ПАЛАТА”, the patient in bed, letters appear, say them by voice | The ward shows the patient in bed under a cross-patterned blanket, a heart monitor, a thermometer and a clipboard with the current card. The cat stands next to the bed and listens. |
| Wrong → try again; three times wrong → intensive care (реанимация), later the patient comes back | The patient has three hearts. Three lost hearts: a gurney takes the patient to intensive care and the right answer is said aloud. After 30 seconds the patient is back in the same ward and the cards start again. |
| Letters, later syllables, at the end whole words; 20 levels, then start again | Levels 1–8 letters, 9–14 syllables, 15–20 words. Patient number = level. After 20 healed patients the hospital celebrates and starts again at level 1 with new cards and a shuffled order of animals. |
| “Всегда животные разные” | Twenty different animals, each with a name and an illness: giraffe Жора (sore throat), bunny, bear, fox, elephant, pig, frog, owl, zebra, panda, hedgehog, cow, monkey, penguin, lion, sheep, mouse, hippo, crocodile (toothache, a nod to «Айболит»), dog. |
| Dad: the cat should be visible while treating; points; a list of players with their costumes, at the start and at the end | The cat is in every scene in its costume, and its portrait hangs on the ward wall. +1 point per right card, −1 per mistake. With several cats, the title shows “Кто играет?” with every cat, its costume and points; the celebration after patient 20 shows the ranking; the hall of fame lists every cat with points, healed patients, caught monsters and finished rounds. |
| “А если мы всю песню сделали” | Every right card plays one note. When the last card is read, the notes play back as the patient’s healing song. |

## Playing

### Reception

1. A patient knocks and rises into the window. The camera wiggles.
2. Tap the camera: click, flash, and the polaroid develops next to the window.
3. Compare the photo with the window.
   - **Same animal:** tap the ticket in the cat’s paw. The patient takes it and walks off. The arrow points at the ward.
   - **A monster:** swipe down over the window (or tap the “Проведи вниз” pull tab). The monster is caught: +1 point. A plain tap on the patient never closes the shutter; it only nudges it and explains the swipe.
4. Mistakes are gentle. Closing the shutter on a real patient costs a point, then the window opens again and you take a new photo. A monster that gets a ticket runs away with it (−1), and the cat chases it off.

The window closes when all four wards are busy (“Мест нет”) and after the twentieth patient (“Все пришли”). Once all twenty are healed, “Начать играть” always leads to the celebration, even after a reload, and “Играть заново” there starts round 2.

Monsters get sneakier: until level 6 the photo shows the whole monster holding the animal’s face on a stick. From level 7 it shows the animal with two monster details, from level 14 with one detail (a third eye, horns, fangs, green skin, tentacles, antennae or purple spots). The first round always sends one easy monster before patient 2. Later the number of monsters (0–2 before each patient) comes from a seed, so it varies between players and rounds.

### Wards

- The clipboard shows the current card in Andika, a typeface made for beginning readers. The row under it shows all cards of this patient: done ones become notes.
- **Voice (“Кошечка слушает”):** tap the red microphone (or press Space) and read; a second tap ends the turn early. Only the recogniser’s final result is judged (up to five guesses). `judge()` in `src/bolnica-match.ts` accepts the letter, its name and common recogniser spellings (for example «бэ», «b» and «be» for Б), a syllable said twice (“ма-ма”) and words with one small slip at the end. The answer must come last: «это буква бэ» counts, but «я не знаю» does not count for Я. A different known letter or word counts as a mistake. Silence, filler words, a word cut off after its first syllables («маши» for МАШИНА) and an earlier mention of the card never cost a heart: the cat asks again. After two such turns on one card the cat offers the grown-up mode.
- **The forgiving cat** (on by default) ignores the first miss on each card. Children are learning, and recognisers mishear. The cat says what it heard and asks to look again. Parents can switch this off on the title screen.
- **Grown-up (“Взрослый проверяет”):** the child reads aloud and a grown-up taps “Верно” or “Ошибка”. Every “Ошибка” costs a heart. The ward then says “read aloud, a grown-up checks” instead of mentioning the microphone. This is chosen automatically where the browser cannot recognise speech (Firefox, for example) and offered when the microphone is blocked, when recognition is switched off (on iPad it needs Dictation) or when it keeps failing.
- The patient’s face gets better halfway through, and the thermometer falls with every right card. After the last card the song plays, confetti falls and the cat cheers. A card offers “В регистратуру”, or the celebration after patient 20.
- Narration never reads the card aloud before the child answers. It says the answer after a right reading (also for the last card) and when a patient goes to intensive care. Effects stay quiet while the microphone listens.

### Hall of fame and players

Several children can play on one device. Each cat has its own name, costume, points, hospital and progress. “Новая кошечка” adds one (up to 12) and opens the wardrobe. “Это я!” switches to that cat. “Убрать” removes a cat after a confirmation. The list is sorted by points, then healed patients. The top three get medals.

## Language, narration and sound

- Russian, German and English share `spielzeuge.lang` with the catalog. The RU/DE/EN selector is in the top bar, or use `?lang=`. Every card set exists in all three languages: German and English have their own alphabets, syllables and words, and the recogniser language follows the game language (ru-RU, de-DE, en-GB). Switching language during a patient keeps the progress and shows that level’s cards in the new language.
- Narration reuses `PuppyNarration`. It speaks the tapped buttons, the knock, the photo hint, the ticket, caught monsters, ward intros (patient, illness, what to read), feedback, intensive care, the return and the healing. It is silenced while the microphone listens.
- Effects are synthesised in `src/bolnica-audio.ts`: knock, desk bell, camera shutter, flash, developing shimmer, ticket, roller shutter, monster grumble, “gotcha”, “oops”, a sneaky tiptoe, the healing-song notes and chords, a soft “bonk”, a gentle siren, a welcome-back arpeggio, wardrobe swish and pops. The speaker button mutes speech and effects and is saved.

## Privacy

Speech recognition is done by the browser, not by the game. Chrome sends the sound to Google unless it can recognise the language on the device (the game asks for on-device recognition when Chrome offers it). Safari uses Apple’s recogniser. The game records and stores no audio, and the title screen says so for parents. Without a microphone the grown-up mode works everywhere.

## Saving

`spielzeuge.bolnica.v1` in localStorage holds sound, the checker mode, the forgiving switch, the current cat and every cat: name, look, points, healed patients, caught monsters, finished rounds and its hospital (round, next patient, healed levels, wards with patient, card seed, step, hearts and intensive-care return time, the person at the desk, the arrow and the animal order). `restoreSave()` cleans broken or hostile values: unknown furs or wear, bad ids, names with markup, out-of-range numbers, arrows to empty wards. Without storage the game still plays and the title screen says progress will not be saved.

## Files

- `src/bolnica.ts`: screens, reception flow, wards, listening turns, wardrobe, hall of fame
- `src/bolnica-state.ts`: save, players, reception and ward rules, scoring, monster schedule
- `src/bolnica-words.ts`, `src/bolnica-match.ts`: 20 levels of cards per language and the lenient judge
- `src/bolnica-listen.ts`: one listening turn with the Web Speech API
- `src/bolnica-animals.ts`, `src/bolnica-cat.ts`, `src/bolnica-props.ts`: SVG art for patients and monsters, the cat and its wardrobe, and the props and icons
- `src/bolnica-audio.ts`, `src/bolnica-copy.ts`, `src/bolnica.css`

## Checks

- `npm test` covers the save and its cleaning, the reception rules (photo first, tickets, shutter, monsters, full wards), hearts, the forgiving cat, intensive care and return, round completion and ranking. It also covers every level in every language, and many recogniser outputs for letters, syllables and words. It checks the effect list and the healing melody too.
- `npm run test:bolnica` needs a running dev server (`BOLNICA_BASE_URL` and `CHROMIUM_PATH` are optional). A fake `SpeechRecognition` stands in for the recogniser. The test plays reception, monsters, the shutter swipe, tickets, reading right and wrong, intensive care (with `?reanimation=2`), healing, the wardrobe, names, several cats, the three languages with speech locales, mute, and several viewports. Screenshots go to `tmp/`.
- `?reanimation=N` shortens intensive care to N seconds for testing.
- Real children’s voices on iPad still need a try. If recognition struggles, the forgiving cat and the grown-up mode keep the game fair.
