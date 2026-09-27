import type { Lang } from './languages.ts'
import type { Vowel } from './morozhenka-dsp.ts'
import type { Control, Direction, Flavor } from './morozhenka-state.ts'

export type Letters = Record<Direction, string>

export interface MorozhenkaCopy {
  name: string
  byline: string
  tagline: string
  description: string
  home: string
  language: string
  soundOn: string
  soundOff: string
  play: string
  rounds: string
  roundsTitle: string
  teach: string
  control: string
  controls: Record<Control, string>
  controlHints: Record<Control, string>
  flavor: string
  flavors: Record<Flavor, string>
  privacy: string
  round: (n: number) => string
  roundNames: string[]
  surpriseName: string
  roundHints: ((say: string, l: Letters) => string)[]
  surpriseHint: (say: string) => string
  say: Record<Control, string>
  cherries: string
  cherriesOf: (n: number, total: number) => string
  restart: string
  back: string
  next: string
  again: string
  win: string
  winRound: (n: number) => string
  crash: string[]
  crashStone: string
  cherry: string
  flake: string
  ready: Record<Control, string>
  directions: Record<Direction, string>
  dirButton: (letter: string, direction: string) => string
  heard: (letter: string) => string
  listening: string
  micAsk: string
  micDenied: string
  micUnsupported: string
  micOn: string
  micOff: string
  teachTitle: string
  teachIntro: string
  teachSay: (sound: string) => string
  teachHeard: string
  teachLearnedOne: (letter: string) => string
  teachDone: string
  teachStart: string
  teachStop: string
  teachReset: string
  teachForgot: string
  teachTry: string
  teachLearned: string
  teachDefault: string
  changeLetter: string
  letterChanged: (letter: string, direction: string) => string
  similar: (a: string, b: string) => string
  sensitivity: string
  sensitivityLevels: [string, string, string]
  allDone: string
  total: (n: number) => string
  locked: string
  surpriseTile: string
  newFlavor: (name: string) => string
  pause: string
  noSave: string
  surprisesOpened: string
}

/** Letters shown on the buttons and read out in hints. */
export const VOWEL_LETTER: Record<Lang, Record<Vowel, string>> = {
  ru: { a: 'А', o: 'О', u: 'У', i: 'И', e: 'Э' },
  de: { a: 'A', o: 'O', u: 'U', i: 'I', e: 'E' },
  en: { a: 'AH', o: 'OH', u: 'OO', i: 'EE', e: 'EH' },
}

/** How the long sound is written for the speech voice. */
export const VOWEL_SOUND: Record<Lang, Record<Vowel, string>> = {
  ru: { a: 'А-а-а-а', o: 'О-о-о-о', u: 'У-у-у-у', i: 'И-и-и-и', e: 'Э-э-э-э' },
  de: { a: 'A-a-a-a', o: 'O-o-o-o', u: 'U-u-u-u', i: 'I-i-i-i', e: 'E-e-e-e' },
  en: { a: 'Ahhhh', o: 'Ohhhh', u: 'Ooooo', i: 'Eeeee', e: 'Ehhhh' },
}

const ru: MorozhenkaCopy = {
  name: 'Мороженка',
  byline: 'Игра Матрёны',
  tagline: 'Скажи «А» — и мороженка полетит!',
  description: 'Мороженка — игра Матрёны. Мороженка плюётся огнём и летит от твоего голоса к рожку.',
  home: 'Все игрушки',
  language: 'Язык',
  soundOn: 'Звук включён',
  soundOff: 'Звук выключен',
  play: 'Играть',
  rounds: 'Раунды',
  roundsTitle: 'Выбери раунд',
  teach: 'Научи мороженку',
  control: 'Как управлять',
  controls: { voice: 'Голосом', buttons: 'Кнопками' },
  controlHints: {
    voice: 'Говори буквы — мороженка слушает. Громче — быстрее.',
    buttons: 'Нажимай и держи буквы. Микрофон не нужен.',
  },
  flavor: 'Вкус',
  flavors: {
    mint: 'Мятное с шоколадом',
    strawberry: 'Клубничное',
    chocolate: 'Шоколадное',
    vanilla: 'Ванильное',
    blueberry: 'Черничное',
    pistachio: 'Фисташковое',
    mango: 'Манговое',
  },
  privacy: 'Для взрослых: голос слушается прямо на устройстве, не записывается и никуда не отправляется.',
  round: (n) => `Раунд ${n}`,
  roundNames: [
    'Вверх!',
    'Вправо',
    'Подкова',
    'Зигзаг',
    'Ледяные колонны',
    'Гора',
    'Шоколадные зубцы',
    'Улитка',
    'Сонный камень',
    'Лабиринт',
    'Два камня',
    'Большое путешествие',
  ],
  surpriseName: 'Сюрприз',
  roundHints: [
    (say, l) => `${say} «${l.up}» — и мороженка полетит вверх. Долети до рожка!`,
    (say, l) => `${say} «${l.right}» — мороженка полетит вправо. Не задень стенки!`,
    (_say, l) => `«${l.left}» — влево, «${l.down}» — вниз. Облети подкову.`,
    () => 'Зигзаг: вправо, вниз, влево и снова вниз. Не торопись!',
    () => 'Облетай ледяные колонны. Снежинка запомнит это место.',
    () => 'Облети гору. Тихий голос — медленный полёт, громкий — быстрый.',
    () => 'Шоколадные зубцы! Спускайся осторожно.',
    () => 'Улитка закручена. Лети по кругу до самой серединки.',
    () => 'Сонный камень ездит вверх и вниз. Подожди и пролетай!',
    () => 'Лабиринт. В тупиках прячутся вишенки.',
    () => 'Два камня катаются. Снежинка посередине тебе поможет.',
    () => 'Большое путешествие! Две снежинки помогут.',
  ],
  surpriseHint: () => 'Карта-сюрприз! Найди рожок.',
  say: { voice: 'Скажи', buttons: 'Нажми' },
  cherries: 'Вишенки',
  cherriesOf: (n, total) => `Вишенок: ${n} из ${total}`,
  restart: 'Заново',
  back: 'Назад',
  next: 'Дальше',
  again: 'Ещё раз',
  win: 'Ура! Мороженка в рожке!',
  winRound: (n) => `Раунд ${n} пройден!`,
  crash: ['Шлёп! Ой, стенка. Ещё разок!', 'Бум! Мороженка вернулась. Лети снова!', 'Плюх! Не беда, попробуем ещё.'],
  crashStone: 'Ой, сонный камень! Ещё разок.',
  cherry: 'Вишенка!',
  flake: 'Снежинка! Теперь начнёшь отсюда.',
  ready: { voice: 'Скажи букву — мороженка полетит.', buttons: 'Нажми на букву — мороженка полетит.' },
  directions: { up: 'вверх', right: 'вправо', left: 'влево', down: 'вниз' },
  dirButton: (letter, direction) => `«${letter}» — ${direction}`,
  heard: (letter) => `Слышу «${letter}»`,
  listening: 'Слушаю…',
  micAsk: 'Разреши микрофон, чтобы играть голосом.',
  micDenied: 'Микрофон не разрешён. Играем кнопками.',
  micUnsupported: 'Здесь нет микрофона. Играем кнопками.',
  micOn: 'Микрофон слушает',
  micOff: 'Микрофон выключен',
  teachTitle: 'Научи мороженку своему голосу',
  teachIntro: 'Скажи каждую букву долго, пока круг не заполнится. Нажми на букву, чтобы выбрать другую.',
  teachSay: (sound) => `Скажи долго: «${sound}»!`,
  teachHeard: 'Слышу! Ещё чуть-чуть…',
  teachLearnedOne: (letter) => `Запомнила «${letter}»!`,
  teachDone: 'Готово! Мороженка знает твой голос.',
  teachStart: 'Начать',
  teachStop: 'Стоп',
  teachReset: 'Забыть мой голос',
  teachForgot: 'Мороженка забыла голос и слушает как раньше.',
  teachTry: 'Проверь: скажи букву — стрелка загорится.',
  teachLearned: 'выучено',
  teachDefault: 'как у всех',
  changeLetter: 'Сменить букву',
  letterChanged: (letter, direction) => `Теперь «${letter}» — ${direction}.`,
  similar: (a, b) => `«${a}» и «${b}» звучат похоже. Скажи их по-разному или выбери другую букву.`,
  sensitivity: 'Микрофон',
  sensitivityLevels: ['Чуткий', 'Обычный', 'Для шума'],
  allDone: 'Все двенадцать раундов пройдены! Дальше — карты-сюрпризы.',
  total: (n) => `Всего вишенок: ${n}`,
  locked: 'Пока закрыт',
  surpriseTile: 'Карты-сюрпризы',
  newFlavor: (name) => `${name}!`,
  pause: 'Пауза',
  noSave: 'В этом браузере прогресс не сохранится.',
  surprisesOpened: 'Открылись карты-сюрпризы! Они каждый раз новые.',
}

const de: MorozhenkaCopy = {
  name: 'Eiskugel',
  byline: 'Matrjonas Spiel',
  tagline: 'Sag „A“ – und die Eiskugel fliegt!',
  description: 'Eiskugel – Matrjonas Spiel. Die Eiskugel spuckt Feuer und fliegt mit deiner Stimme zur Waffel.',
  home: 'Alle Spiele',
  language: 'Sprache',
  soundOn: 'Ton an',
  soundOff: 'Ton aus',
  play: 'Spielen',
  rounds: 'Runden',
  roundsTitle: 'Wähle eine Runde',
  teach: 'Bring es der Eiskugel bei',
  control: 'Steuerung',
  controls: { voice: 'Mit Stimme', buttons: 'Mit Tasten' },
  controlHints: {
    voice: 'Sag Buchstaben – die Eiskugel hört zu. Lauter ist schneller.',
    buttons: 'Buchstaben drücken und halten. Kein Mikrofon nötig.',
  },
  flavor: 'Sorte',
  flavors: {
    mint: 'Minze-Schoko',
    strawberry: 'Erdbeere',
    chocolate: 'Schokolade',
    vanilla: 'Vanille',
    blueberry: 'Heidelbeere',
    pistachio: 'Pistazie',
    mango: 'Mango',
  },
  privacy: 'Für Erwachsene: Die Stimme wird nur auf dem Gerät ausgewertet, nicht aufgenommen und nirgends hingeschickt.',
  round: (n) => `Runde ${n}`,
  roundNames: [
    'Nach oben!',
    'Nach rechts',
    'Hufeisen',
    'Zickzack',
    'Eissäulen',
    'Der Berg',
    'Schokozähne',
    'Schnecke',
    'Der müde Stein',
    'Labyrinth',
    'Zwei Steine',
    'Die große Reise',
  ],
  surpriseName: 'Überraschung',
  roundHints: [
    (say, l) => `${say} „${l.up}“ – und die Eiskugel fliegt nach oben. Flieg zur Waffel!`,
    (say, l) => `${say} „${l.right}“ – die Eiskugel fliegt nach rechts. Nicht die Wände berühren!`,
    (_say, l) => `„${l.left}“ – nach links, „${l.down}“ – nach unten. Flieg um das Hufeisen.`,
    () => 'Zickzack: rechts, runter, links und wieder runter. Keine Eile!',
    () => 'Flieg um die Eissäulen. Die Schneeflocke merkt sich den Platz.',
    () => 'Flieg um den Berg. Leise Stimme – langsam, laute Stimme – schnell.',
    () => 'Schokozähne! Vorsichtig nach unten.',
    () => 'Die Schnecke ist aufgerollt. Flieg im Kreis bis in die Mitte.',
    () => 'Der müde Stein fährt rauf und runter. Warte und flieg dann vorbei!',
    () => 'Ein Labyrinth. In den Sackgassen verstecken sich Kirschen.',
    () => 'Zwei Steine rollen hin und her. Die Schneeflocke in der Mitte hilft dir.',
    () => 'Die große Reise! Zwei Schneeflocken helfen dir.',
  ],
  surpriseHint: () => 'Überraschungskarte! Finde die Waffel.',
  say: { voice: 'Sag', buttons: 'Drück' },
  cherries: 'Kirschen',
  cherriesOf: (n, total) => `Kirschen: ${n} von ${total}`,
  restart: 'Neu starten',
  back: 'Zurück',
  next: 'Weiter',
  again: 'Nochmal',
  win: 'Hurra! Die Eiskugel ist in der Waffel!',
  winRound: (n) => `Runde ${n} geschafft!`,
  crash: ['Platsch! Oh, eine Wand. Nochmal!', 'Bumm! Die Eiskugel ist zurück. Flieg nochmal!', 'Plumps! Macht nichts, noch ein Versuch.'],
  crashStone: 'Oh, der müde Stein! Nochmal.',
  cherry: 'Eine Kirsche!',
  flake: 'Schneeflocke! Jetzt startest du hier.',
  ready: { voice: 'Sag einen Buchstaben – die Eiskugel fliegt.', buttons: 'Drück einen Buchstaben – die Eiskugel fliegt.' },
  directions: { up: 'nach oben', right: 'nach rechts', left: 'nach links', down: 'nach unten' },
  dirButton: (letter, direction) => `„${letter}“ – ${direction}`,
  heard: (letter) => `Ich höre „${letter}“`,
  listening: 'Ich höre zu …',
  micAsk: 'Erlaube das Mikrofon, um mit der Stimme zu spielen.',
  micDenied: 'Mikrofon nicht erlaubt. Wir spielen mit Tasten.',
  micUnsupported: 'Hier gibt es kein Mikrofon. Wir spielen mit Tasten.',
  micOn: 'Mikrofon hört zu',
  micOff: 'Mikrofon aus',
  teachTitle: 'Bring der Eiskugel deine Stimme bei',
  teachIntro: 'Sag jeden Buchstaben lang, bis der Kreis voll ist. Tippe auf einen Buchstaben, um einen anderen zu wählen.',
  teachSay: (sound) => `Sag lang: „${sound}“!`,
  teachHeard: 'Ich höre dich! Noch ein bisschen …',
  teachLearnedOne: (letter) => `„${letter}“ gemerkt!`,
  teachDone: 'Fertig! Die Eiskugel kennt deine Stimme.',
  teachStart: 'Los',
  teachStop: 'Stopp',
  teachReset: 'Meine Stimme vergessen',
  teachForgot: 'Die Eiskugel hat die Stimme vergessen und hört wie vorher zu.',
  teachTry: 'Probier es: Sag einen Buchstaben – der Pfeil leuchtet.',
  teachLearned: 'gelernt',
  teachDefault: 'Standard',
  changeLetter: 'Buchstaben wechseln',
  letterChanged: (letter, direction) => `Jetzt heißt „${letter}“ ${direction}.`,
  similar: (a, b) => `„${a}“ und „${b}“ klingen ähnlich. Sag sie verschieden oder wähle einen anderen Buchstaben.`,
  sensitivity: 'Mikrofon',
  sensitivityLevels: ['Empfindlich', 'Normal', 'Für Lärm'],
  allDone: 'Alle zwölf Runden geschafft! Jetzt kommen Überraschungskarten.',
  total: (n) => `Kirschen insgesamt: ${n}`,
  locked: 'Noch zu',
  surpriseTile: 'Überraschungskarten',
  newFlavor: (name) => `${name}!`,
  pause: 'Pause',
  noSave: 'In diesem Browser wird der Fortschritt nicht gespeichert.',
  surprisesOpened: 'Die Überraschungskarten sind offen! Jede ist neu.',
}

const en: MorozhenkaCopy = {
  name: 'Ice Cream',
  byline: 'Matryona’s game',
  tagline: 'Say “Ah” and the ice cream flies!',
  description: 'Ice Cream is Matryona’s game. The scoop breathes fire and flies with your voice into the cone.',
  home: 'All toys',
  language: 'Language',
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  play: 'Play',
  rounds: 'Rounds',
  roundsTitle: 'Pick a round',
  teach: 'Teach the ice cream',
  control: 'How to steer',
  controls: { voice: 'With voice', buttons: 'With buttons' },
  controlHints: {
    voice: 'Say the sounds – the ice cream listens. Louder is faster.',
    buttons: 'Press and hold the letters. No microphone needed.',
  },
  flavor: 'Flavor',
  flavors: {
    mint: 'Mint chocolate chip',
    strawberry: 'Strawberry',
    chocolate: 'Chocolate',
    vanilla: 'Vanilla',
    blueberry: 'Blueberry',
    pistachio: 'Pistachio',
    mango: 'Mango',
  },
  privacy: 'For grown-ups: the voice is analysed on this device only. Nothing is recorded or sent anywhere.',
  round: (n) => `Round ${n}`,
  roundNames: [
    'Up!',
    'To the right',
    'Horseshoe',
    'Zigzag',
    'Ice pillars',
    'The mountain',
    'Chocolate teeth',
    'Snail',
    'Sleepy stone',
    'Maze',
    'Two stones',
    'The big journey',
  ],
  surpriseName: 'Surprise',
  roundHints: [
    (say, l) => `${say} “${l.up}” and the ice cream flies up. Reach the cone!`,
    (say, l) => `${say} “${l.right}” and the ice cream flies right. Don’t touch the walls!`,
    (_say, l) => `“${l.left}” goes left, “${l.down}” goes down. Fly around the horseshoe.`,
    () => 'Zigzag: right, down, left and down again. Take your time!',
    () => 'Fly around the ice pillars. The snowflake remembers this spot.',
    () => 'Fly around the mountain. A quiet voice is slow, a loud voice is fast.',
    () => 'Chocolate teeth! Go down carefully.',
    () => 'The snail is curled up. Fly round and round to the middle.',
    () => 'The sleepy stone rides up and down. Wait, then fly past!',
    () => 'A maze. Cherries hide in the dead ends.',
    () => 'Two stones roll to and fro. The snowflake in the middle will help.',
    () => 'The big journey! Two snowflakes will help you.',
  ],
  surpriseHint: () => 'A surprise map! Find the cone.',
  say: { voice: 'Say', buttons: 'Press' },
  cherries: 'Cherries',
  cherriesOf: (n, total) => `Cherries: ${n} of ${total}`,
  restart: 'Restart',
  back: 'Back',
  next: 'Next',
  again: 'Again',
  win: 'Hooray! The ice cream is in the cone!',
  winRound: (n) => `Round ${n} done!`,
  crash: ['Splat! Oops, a wall. Try again!', 'Bump! The ice cream is back. Fly again!', 'Plop! Never mind, one more go.'],
  crashStone: 'Oops, the sleepy stone! Try again.',
  cherry: 'A cherry!',
  flake: 'Snowflake! You will start here now.',
  ready: { voice: 'Say a sound and the ice cream flies.', buttons: 'Press a letter and the ice cream flies.' },
  directions: { up: 'up', right: 'right', left: 'left', down: 'down' },
  dirButton: (letter, direction) => `“${letter}” – ${direction}`,
  heard: (letter) => `I hear “${letter}”`,
  listening: 'Listening…',
  micAsk: 'Allow the microphone to play with your voice.',
  micDenied: 'The microphone is not allowed. Let’s play with buttons.',
  micUnsupported: 'There is no microphone here. Let’s play with buttons.',
  micOn: 'Microphone is listening',
  micOff: 'Microphone off',
  teachTitle: 'Teach the ice cream your voice',
  teachIntro: 'Say each sound for a long time until the circle is full. Tap a letter to choose another one.',
  teachSay: (sound) => `Say it long: “${sound}”!`,
  teachHeard: 'I hear you! A little more…',
  teachLearnedOne: (letter) => `Got “${letter}”!`,
  teachDone: 'Done! The ice cream knows your voice.',
  teachStart: 'Start',
  teachStop: 'Stop',
  teachReset: 'Forget my voice',
  teachForgot: 'The ice cream forgot the voice and listens like before.',
  teachTry: 'Try it: say a sound and the arrow lights up.',
  teachLearned: 'learned',
  teachDefault: 'standard',
  changeLetter: 'Change letter',
  letterChanged: (letter, direction) => `Now “${letter}” means ${direction}.`,
  similar: (a, b) => `“${a}” and “${b}” sound alike. Say them differently or pick another letter.`,
  sensitivity: 'Microphone',
  sensitivityLevels: ['Sensitive', 'Normal', 'Noisy room'],
  allDone: 'All twelve rounds done! Now come the surprise maps.',
  total: (n) => `Cherries in total: ${n}`,
  locked: 'Locked',
  surpriseTile: 'Surprise maps',
  newFlavor: (name) => `${name}!`,
  pause: 'Pause',
  noSave: 'Progress will not be saved in this browser.',
  surprisesOpened: 'Surprise maps are open! Every one is new.',
}

export const MOROZHENKA_COPY: Record<Lang, MorozhenkaCopy> = { ru, de, en }
