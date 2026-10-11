import type { Lang } from './languages.ts'
import type { ItemKind, Side } from './loshadka-items.ts'

export interface LoshadkaCopy {
  name: string
  byline: string
  tagline: string
  documentTitle: string
  description: string
  home: string
  language: string
  soundOn: string
  soundOff: string
  /** Strip labels, as Matryona laid them out: manes left, clips top, tails right, colour bottom. */
  sides: Record<Side, string>
  magic: string
  background: string
  help: string
  /** Matryona's own explanation of her game. */
  welcome: string
  welcomeBack: string
  /** Готово pressed while this side is still empty. */
  missing: Record<Side, string>
  allSet: string
  done: string
  hooray: string
  unchanged: string
  stars: (count: number) => string
  starsAria: (count: number) => string
  askName: string
  /** The offered names read aloud as a question: «Облачко, Ириска или Конфетка?» */
  nameOptions: (names: string[]) => string
  otherNames: string
  hello: (name: string) => string
  giftTitle: string
  openGift: string
  /** Works with any item name: no pronouns, so no gender agreement. */
  giftOpened: (item: string, kind: ItemKind) => string
  locked: string
  newBadge: string
  gift: string
  newPony: string
  newConfirm: string
  keepDressing: string
  toStable: string
  toWorkshop: string
  stable: string
  stableHello: string
  stableEmpty: string
  stableFull: string
  dress: string
  /** «Наряжать» while the workshop holds an unfinished pony: the first tap asks. */
  dressConfirm: string
  release: string
  releaseConfirm: string
  released: (name: string) => string
  /** The button that calls a released pony back for a few seconds, and what it says when it returns. */
  bringBack: string
  isBack: (name: string) => string
  neigh: string
  snort: string
  hooves: string
  munch: string
  iAm: (name: string) => string
  nextGift: string
  allGifts: string
  ponyLabel: (parts: string[]) => string
  sketchLabel: string
  privacy: string
  noStorage: string
  close: string
}

/**
 * Words Apple's Russian voice (Milena, iPad and Mac) stresses wrongly, with
 * the respelling that fixes them. She ignores the stress mark U+0301, so only
 * the speech text is respelled; the screen keeps the real word. Checked with
 * `say -v Milena` pitch and loudness contours against words with known stress.
 *
 * - «Жемчужинка» comes out as «жемчужИнка», like «снежинка». A hyphen before
 *   «-ка»/«-ки» makes her read the particle «-ка» and stress the stem as in
 *   «жемчУжина»; other endings would be merged back, so they get a space.
 * - «Замок» (the castle background) alone is read as «замОк», the lock.
 *   «Зам-ок» comes out as «зАмок» without a pause.
 */
const RESPELL: readonly [RegExp, (match: string, ...groups: string[]) => string][] = [
  [/([Жж]емчужин)(к[а-яё]*)/g, (_, stem, tail) => `${stem}${/^к[аи]$/.test(tail) ? '-' : ' '}${tail}`],
  [/(?<![а-яё])(зам)(ок)(?![а-яё])/giu, (_, stem, tail) => `${stem}-${tail}`],
]

/** How narration should say a text (pass it to `PuppyNarration`). Only Russian changes. */
export function pronounce(text: string, lang: Lang): string {
  if (lang !== 'ru') return text
  return RESPELL.reduce((spoken, [pattern, fix]) => spoken.replace(pattern, fix), text)
}

/** 1 звёздочка, 2–4 звёздочки, 5–20 звёздочек, 21 звёздочка, 111 звёздочек. */
function ruPlural(count: number, one: string, few: string, many: string): string {
  const lastTwo = Math.trunc(Math.abs(count)) % 100
  const last = lastTwo % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

/** «a, b или c» — a list read as a question of choice. */
const orList = (names: string[], or: string): string =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${or} ${names[names.length - 1]}`

const lowerFirst = (text: string, lang: Lang) => text.charAt(0).toLocaleLowerCase(lang) + text.slice(1)

const RU_WHERE: Record<ItemKind, string> = {
  mane: 'Смотри слева.',
  clip: 'Смотри сверху.',
  tail: 'Смотри справа.',
  color: 'Смотри снизу.',
  magic: 'Смотри сверху, в самом конце.',
  background: 'Нажми на кружок с картинкой.',
}

const ru: LoshadkaCopy = {
  name: 'Лошадка',
  byline: 'Игра Матрёны',
  tagline: 'Наряди лошадку — получишь три звёздочки!',
  documentTitle: 'Лошадка · Spielzeuge',
  description:
    'Лошадка — игра Матрёны. Выбирай гриву, заколку, хвост и цвет, получай звёздочки и подарки. Готовые лошадки гуляют в конюшне.',
  home: 'Все игрушки',
  language: 'Язык',
  soundOn: 'Звук включён',
  soundOff: 'Звук выключен',
  sides: { mane: 'Гривы', clip: 'Заколки', tail: 'Хвосты', color: 'Цвет' },
  magic: 'Волшебство',
  background: 'Сменить фон',
  help: 'Как играть?',
  welcome:
    'Давай сделаем лошадку! Слева — гривы, сверху — заколки, справа — хвосты, а снизу — цвет лошадки. Сделаешь лошадку — получишь три звёздочки!',
  welcomeBack: 'Привет-привет! Какую лошадку сделаем сегодня?',
  missing: {
    mane: 'Лошадке ещё нужна грива! Посмотри слева.',
    clip: 'Лошадке ещё нужна заколка! Посмотри сверху.',
    tail: 'Лошадке ещё нужен хвост! Посмотри справа.',
    color: 'Лошадке ещё нужен цвет! Посмотри снизу.',
  },
  allSet: 'Какая красивая лошадка! Теперь нажми на золотую звезду.',
  done: 'Готово',
  hooray: 'Ура! Лошадка готова! Вот тебе три звёздочки!',
  unchanged: 'Эта лошадка уже готова! Поменяй что-нибудь или сделай новую.',
  stars: (count) => `${count} ${ruPlural(count, 'звёздочка', 'звёздочки', 'звёздочек')}`,
  starsAria: (count) => `У тебя ${count} ${ruPlural(count, 'звёздочка', 'звёздочки', 'звёздочек')}`,
  askName: 'Как зовут лошадку?',
  nameOptions: (names) => `${orList(names, 'или')}?`,
  otherNames: 'Другие имена',
  hello: (name) => `Привет, ${name}!`,
  giftTitle: 'Подарок!',
  openGift: 'Нажми на подарок!',
  giftOpened: (item, kind) => `${item}! ${RU_WHERE[kind]}`,
  locked: 'Это подарок! Сделай лошадку — и он откроется.',
  newBadge: 'Новое!',
  gift: 'Подарок',
  newPony: 'Новая лошадка',
  newConfirm: 'Эта лошадка ещё не готова. Нажми ещё раз — и начнём новую.',
  keepDressing: 'Ещё наряжать',
  toStable: 'В конюшню',
  toWorkshop: 'В мастерскую',
  stable: 'Конюшня',
  stableHello: 'Здесь живут твои лошадки! Нажми на лошадку — она скажет, как её зовут.',
  stableEmpty: 'Здесь пока никого нет. Сделай первую лошадку!',
  stableFull: 'Конюшня уже полная! Отпусти одну лошадку погулять — и новая поместится.',
  dress: 'Наряжать',
  dressConfirm: 'В мастерской лошадка ещё не готова. Нажми ещё раз — и будем наряжать эту.',
  release: 'Отпустить погулять',
  releaseConfirm: 'Точно отпустить погулять? Нажми ещё раз.',
  released: (name) => `Пока-пока, ${name}! Беги гулять!`,
  bringBack: 'Вернуть',
  isBack: (name) => `${name} снова здесь!`,
  neigh: 'И-го-го!',
  snort: 'Фыр-фыр!',
  hooves: 'Цок-цок!',
  munch: 'Ням-ням!',
  iAm: (name) => `И-го-го! Я ${name}!`,
  nextGift: 'Следующая лошадка откроет подарок!',
  allGifts: 'Все подарки открыты! Ура!',
  ponyLabel: (parts) => (parts.length ? `Лошадка: ${parts.map((part) => lowerFirst(part, 'ru')).join(', ')}` : 'Лошадка'),
  sketchLabel: 'Лошадка-раскраска. Выбери гриву, заколку, хвост и цвет.',
  privacy: 'Для взрослых: всё хранится только на этом устройстве и никуда не отправляется.',
  noStorage: 'Лошадки не сохранятся на этом устройстве.',
  close: 'Закрыть',
}

const DE_WHERE: Record<ItemKind, string> = {
  mane: 'Schau mal links.',
  clip: 'Schau mal oben.',
  tail: 'Schau mal rechts.',
  color: 'Schau mal unten.',
  magic: 'Schau mal oben, ganz am Ende.',
  background: 'Tipp auf den runden Knopf mit dem Bild.',
}

const de: LoshadkaCopy = {
  name: 'Pferdchen',
  byline: 'Matrjonas Spiel',
  tagline: 'Schmück dein Pferdchen und sammle Sternchen!',
  documentTitle: 'Pferdchen · Spielzeuge',
  description:
    'Pferdchen – Matrjonas Spiel. Wähle Mähne, Spange, Schweif und Farbe, sammle Sternchen und Geschenke. Fertige Pferdchen wohnen im Stall.',
  home: 'Alle Spiele',
  language: 'Sprache',
  soundOn: 'Ton an',
  soundOff: 'Ton aus',
  sides: { mane: 'Mähnen', clip: 'Spangen', tail: 'Schweife', color: 'Farbe' },
  magic: 'Zauber',
  background: 'Hintergrund wechseln',
  help: 'Wie geht das?',
  welcome:
    'Komm, wir machen ein Pferdchen! Links sind die Mähnen, oben die Spangen, rechts die Schweife und unten die Farbe für das Pferdchen. Ist dein Pferdchen fertig, bekommst du drei Sternchen!',
  welcomeBack: 'Hallo, hallo! Was für ein Pferdchen machen wir heute?',
  missing: {
    mane: 'Dein Pferdchen braucht noch eine Mähne! Schau mal links.',
    clip: 'Dein Pferdchen braucht noch eine Spange! Schau mal oben.',
    tail: 'Dein Pferdchen braucht noch einen Schweif! Schau mal rechts.',
    color: 'Dein Pferdchen braucht noch eine Farbe! Schau mal unten.',
  },
  allSet: 'Was für ein schönes Pferdchen! Jetzt tipp auf den goldenen Stern.',
  done: 'Fertig',
  hooray: 'Hurra! Das Pferdchen ist fertig! Hier sind drei Sternchen für dich!',
  unchanged: 'Dieses Pferdchen ist schon fertig! Ändere etwas oder mach ein neues.',
  stars: (count) => `${count} Sternchen`,
  starsAria: (count) => `Du hast ${count} Sternchen`,
  askName: 'Wie heißt das Pferdchen?',
  nameOptions: (names) => `${orList(names, 'oder')}?`,
  otherNames: 'Andere Namen',
  hello: (name) => `Hallo, ${name}!`,
  giftTitle: 'Ein Geschenk!',
  openGift: 'Tipp auf das Geschenk!',
  giftOpened: (item, kind) => `Neu: ${item}! ${DE_WHERE[kind]}`,
  locked: 'Das ist ein Geschenk! Mach ein Pferdchen fertig, dann geht es auf.',
  newBadge: 'Neu!',
  gift: 'Geschenk',
  newPony: 'Neues Pferdchen',
  newConfirm: 'Dieses Pferdchen ist noch nicht fertig. Tipp noch einmal, dann fangen wir ein neues an.',
  keepDressing: 'Weiter schmücken',
  toStable: 'Zum Stall',
  toWorkshop: 'Zur Werkstatt',
  stable: 'Stall',
  stableHello: 'Hier wohnen deine Pferdchen! Tipp ein Pferdchen an, dann sagt es dir seinen Namen.',
  stableEmpty: 'Hier wohnt noch niemand. Mach dein erstes Pferdchen!',
  stableFull: 'Der Stall ist voll! Lass ein Pferdchen spazieren gehen, dann ist Platz für ein neues.',
  dress: 'Schmücken',
  dressConfirm: 'Das Pferdchen in der Werkstatt ist noch nicht fertig. Tipp noch einmal, dann schmücken wir dieses hier.',
  release: 'Spazieren gehen lassen',
  releaseConfirm: 'Wirklich spazieren gehen lassen? Tipp noch einmal.',
  released: (name) => `Tschüss, ${name}! Viel Spaß auf der Wiese!`,
  bringBack: 'Zurückholen',
  isBack: (name) => `${name} ist wieder da!`,
  neigh: 'Wieher!',
  snort: 'Pfrrr!',
  hooves: 'Klipp-klapp!',
  munch: 'Mampf, mampf!',
  iAm: (name) => `Wieher! Ich bin ${name}!`,
  nextGift: 'Das nächste Pferdchen öffnet ein Geschenk!',
  allGifts: 'Alle Geschenke sind offen! Hurra!',
  ponyLabel: (parts) => (parts.length ? `Pferdchen: ${parts.join(', ')}` : 'Pferdchen'),
  sketchLabel: 'Pferdchen zum Ausmalen. Wähle Mähne, Spange, Schweif und Farbe.',
  privacy: 'Für Erwachsene: Alles bleibt nur auf diesem Gerät und wird nirgends hingeschickt.',
  noStorage: 'Die Pferdchen werden auf diesem Gerät nicht gespeichert.',
  close: 'Schließen',
}

const EN_WHERE: Record<ItemKind, string> = {
  mane: 'Look on the left.',
  clip: 'Look at the top.',
  tail: 'Look on the right.',
  color: 'Look at the bottom.',
  magic: 'Look at the end of the top row.',
  background: 'Tap the round button with the picture.',
}

const en: LoshadkaCopy = {
  name: 'Pony',
  byline: 'Matryona’s game',
  tagline: 'Dress up your pony and collect stars!',
  documentTitle: 'Pony · Spielzeuge',
  description:
    'Pony is Matryona’s game. Pick a mane, a clip, a tail and a colour, collect stars and presents. Finished ponies live in the stable.',
  home: 'All toys',
  language: 'Language',
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  sides: { mane: 'Manes', clip: 'Clips', tail: 'Tails', color: 'Colour' },
  magic: 'Magic',
  background: 'Change background',
  help: 'How to play',
  welcome:
    'Let’s make a pony! Manes are on the left, clips at the top, tails on the right, and the pony’s colour at the bottom. Finish your pony and you get three stars!',
  welcomeBack: 'Hello again! What kind of pony shall we make today?',
  missing: {
    mane: 'Your pony still needs a mane! Look on the left.',
    clip: 'Your pony still needs a clip! Look at the top.',
    tail: 'Your pony still needs a tail! Look on the right.',
    color: 'Your pony still needs a colour! Look at the bottom.',
  },
  allSet: 'What a lovely pony! Now tap the golden star.',
  done: 'Done',
  hooray: 'Hooray! Your pony is ready! Here are three stars for you!',
  unchanged: 'This pony is already done! Change something or make a new one.',
  stars: (count) => `${count} ${count === 1 ? 'star' : 'stars'}`,
  starsAria: (count) => `You have ${count} ${count === 1 ? 'star' : 'stars'}`,
  askName: 'What is your pony called?',
  nameOptions: (names) => `${orList(names, 'or')}?`,
  otherNames: 'Other names',
  hello: (name) => `Hello, ${name}!`,
  giftTitle: 'A present!',
  openGift: 'Tap the present!',
  giftOpened: (item, kind) => `New: ${item}! ${EN_WHERE[kind]}`,
  locked: 'This is a present! Finish a pony and it will open.',
  newBadge: 'New!',
  gift: 'Present',
  newPony: 'New pony',
  newConfirm: 'This pony is not finished yet. Tap again to start a new one.',
  keepDressing: 'Keep dressing up',
  toStable: 'To the stable',
  toWorkshop: 'To the workshop',
  stable: 'Stable',
  stableHello: 'Your ponies live here! Tap a pony and it will tell you its name.',
  stableEmpty: 'Nobody lives here yet. Make your first pony!',
  stableFull: 'The stable is full! Let one pony go for a walk to make room for a new one.',
  dress: 'Dress up',
  dressConfirm: 'The pony in the workshop is not finished yet. Tap again to dress up this one instead.',
  release: 'Let it go for a walk',
  releaseConfirm: 'Really let it go for a walk? Tap again.',
  released: (name) => `Bye-bye, ${name}! Have fun on your walk!`,
  bringBack: 'Bring back',
  isBack: (name) => `${name} is back!`,
  neigh: 'Neigh!',
  snort: 'Pfff!',
  hooves: 'Clip-clop!',
  munch: 'Munch, munch!',
  iAm: (name) => `Neigh! I’m ${name}!`,
  nextGift: 'Your next pony opens a present!',
  allGifts: 'All presents are open! Hooray!',
  ponyLabel: (parts) => (parts.length ? `Pony: ${parts.map((part) => lowerFirst(part, 'en')).join(', ')}` : 'Pony'),
  sketchLabel: 'Pony to colour in. Pick a mane, a clip, a tail and a colour.',
  privacy: 'For grown-ups: everything stays on this device and is never sent anywhere.',
  noStorage: 'Ponies will not be saved on this device.',
  close: 'Close',
}

export const LOSHADKA_COPY: Record<Lang, LoshadkaCopy> = { ru, de, en }

/**
 * When each side is named in `welcome`, in seconds from the start of the line, so the rows glow
 * while their words are spoken: [mane, clip, tail, colour, end of the colour phrase].
 * Measured with `say` (Milena, Anna, Daniel) on every prefix of the line and scaled to the
 * narration rate 0.86. Measure again when a welcome line changes.
 */
export const WELCOME_CUES: Record<Lang, readonly [number, number, number, number, number]> = {
  ru: [1.79, 3.41, 5.41, 7.23, 9.58],
  de: [2.27, 3.83, 5.06, 6.51, 8.94],
  en: [1.29, 2.96, 4.39, 5.8, 8.09],
}
