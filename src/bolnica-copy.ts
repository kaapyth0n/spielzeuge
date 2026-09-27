import type { Lang } from './languages.ts'
import type { Ailment, Animal } from './bolnica-animals.ts'
import type { Fur, Tint, Wear } from './bolnica-cat.ts'
import type { ItemKind } from './bolnica-words.ts'
import type { Checker } from './bolnica-state.ts'

export type Gender = 'm' | 'f'

export interface PatientInfo {
  /** “Жираф Жора” — species and nickname, nominative. */
  nick: string
  gender: Gender
}

export interface BolnicaCopy {
  name: string
  byline: string
  tagline: string
  description: string
  home: string
  language: string
  soundOn: string
  soundOff: string
  back: string
  start: string
  howto: string
  wardrobe: string
  board: string
  checkerTitle: string
  grownups: string
  checkers: Record<Checker, string>
  checkerHints: Record<Checker, string>
  forgiving: string
  forgivingHint: string
  privacy: string
  noSave: string
  progress: (healed: number, total: number) => string
  level: (n: number) => string
  points: (n: number) => string
  pointsShort: string
  doctor: (name: string) => string
  defaultName: string
  welcome: (name: string) => string
  catHello: (name: string) => string

  nameTitle: string
  nameHint: string
  namePlaceholder: string
  nameSave: string
  nameSkip: string
  nameSet: (name: string) => string

  wardrobeTitle: string
  wearTitle: string
  wears: Record<Wear, string>
  wearOn: Record<Wear, string>
  wearOff: Record<Wear, string>
  furButton: string
  furTitle: string
  furs: Record<Fur, string>
  tintTitle: string
  tintNeedsPattern: string
  tints: Record<Tint, string>
  tapCat: string
  wardrobeIntro: string

  reception: string
  wards: string
  ward: (n: number) => string
  wardEmpty: string
  wardAway: string
  wardWaiting: (nick: string) => string
  wardNavLabel: (n: number, state: string) => string
  arrowHint: string
  camera: string
  ticketFor: (n: number) => string
  shutter: string
  swipeHint: string
  knock: string
  photoReady: string
  photoFirst: string
  photoAgain: string
  nobodyYet: string
  admitted: (patient: PatientInfo, ward: number) => string
  caught: string
  wrongPatient: string
  sneaked: string
  deskFull: string
  deskDone: string
  signFull: string
  signDone: string
  monster: string
  photoLabel: string
  knockBy: (nick: string, ailment: string) => string
  swipeHow: string

  toReception: string
  ailments: Record<Ailment, string>
  kinds: Record<ItemKind, string>
  readPrompt: Record<ItemKind, string>
  readAloud: Record<ItemKind, string>
  quote: (text: string) => string
  duration: (ms: number) => string
  wardIntro: (ward: number, patient: PatientInfo, ailment: string, prompt: string) => string
  mic: string
  micStop: string
  listening: string
  correct: string[]
  correctSay: (word: string, spoken: string) => string
  retry: string
  retryHeard: (text: string) => string
  wrong: (left: number) => string
  wrongHeard: (text: string, left: number) => string
  nothingHeard: string
  reanimation: (patient: PatientInfo) => string
  reveal: (spoken: string) => string
  backFrom: (patient: PatientInfo, ward: number) => string
  awayFor: (patient: PatientInfo, time: string) => string
  healed: (patient: PatientInfo, name: string) => string
  healedTitle: (patient: PatientInfo) => string
  hearts: (left: number) => string
  grownupCorrect: string
  grownupWrong: string
  grownupHint: string
  micUnsupported: string
  micDenied: string
  micNetwork: string
  micTrouble: string
  micService: string
  cardsLeft: (done: number, total: number) => string
  emptyWardLine: string
  goReception: string

  roundTitle: string
  celebrate: string
  whoPlays: string
  roundText: (name: string, round: number) => string
  again: string
  roundBadge: (n: number) => string

  boardTitle: string
  boardIntro: string
  you: string
  thisIsMe: string
  newCat: string
  remove: string
  removeAsk: (name: string) => string
  removeYes: string
  removeNo: string
  statHealed: string
  statRounds: string
  statCaught: string
  switched: (name: string) => string
  tooMany: string

  howtoTitle: string
  howtoListen: string
  howtoSteps: string[]

  patients: Record<Animal, PatientInfo>
}

function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const g = (gender: Gender, m: string, f: string): string => (gender === 'f' ? f : m)

const ru: BolnicaCopy = {
  name: 'Больница кошечки',
  byline: 'Игра Вероники',
  tagline: 'Лечи зверят: читай вслух буквы, слоги и слова.',
  description: 'Больница кошечки — игра Вероники. Фотографируй пациентов, прогоняй монстриков и лечи зверят, читая вслух.',
  home: 'Все игрушки',
  language: 'Язык',
  soundOn: 'Звук включён',
  soundOff: 'Звук выключен',
  back: 'Назад',
  start: 'Начать играть',
  howto: 'Как играть',
  wardrobe: 'Гардероб',
  board: 'Доска почёта',
  checkerTitle: 'Кто проверяет чтение',
  grownups: 'Для взрослых',
  checkers: { voice: 'Кошечка слушает', grownup: 'Взрослый проверяет' },
  checkerHints: {
    voice: 'Нажми на микрофон и прочитай карточку вслух.',
    grownup: 'Ребёнок читает вслух, взрослый нажимает «Верно» или «Ошибка».',
  },
  forgiving: 'Первую ошибку на карточке кошечка прощает',
  forgivingHint: 'Микрофон иногда ослышится — тогда можно сказать ещё раз без штрафа.',
  privacy:
    'Слова распознаёт браузер. Chrome отправляет звук в Google, если не умеет распознавать на устройстве; Safari — в Apple. Игра ничего не записывает и не хранит. Без микрофона выберите «Взрослый проверяет».',
  noSave: 'Прогресс не сохранится: хранилище браузера недоступно.',
  progress: (healed, total) => `Вылечено ${healed} из ${total}`,
  level: (n) => `Уровень ${n}`,
  points: (n) => `${n} ${ruPlural(n, 'очко', 'очка', 'очков')}`,
  pointsShort: 'Очки',
  doctor: (name) => `Доктор ${name}`,
  defaultName: 'Кошечка',
  welcome: (name) => `Больница кошечки. Доктор ${name} ждёт пациентов!`,
  catHello: (name) => `Мяу! Я доктор ${name}.`,

  nameTitle: 'Как тебя зовут?',
  nameHint: 'Так будут звать кошечку. Имя появится на доске почёта.',
  namePlaceholder: 'Имя',
  nameSave: 'Готово',
  nameSkip: 'Потом',
  nameSet: (name) => `Теперь кошечку зовут ${name}!`,

  wardrobeTitle: 'Гардероб',
  wearTitle: 'Наряд',
  wears: {
    cap: 'Шапочка с крестиком',
    stethoscope: 'Стетоскоп',
    coat: 'Халатик',
    bag: 'Сумочка доктора',
    glasses: 'Очки',
    bow: 'Бантик',
    mirror: 'Зеркальце на лбу',
  },
  wearOn: {
    cap: 'Шапочка надета',
    stethoscope: 'Стетоскоп надет',
    coat: 'Халатик надет',
    bag: 'Сумочка с собой',
    glasses: 'Очки надеты',
    bow: 'Бантик завязан',
    mirror: 'Зеркальце надето',
  },
  wearOff: {
    cap: 'Шапочка снята',
    stethoscope: 'Стетоскоп снят',
    coat: 'Халатик снят',
    bag: 'Сумочка убрана',
    glasses: 'Очки сняты',
    bow: 'Бантик снят',
    mirror: 'Зеркальце снято',
  },
  furButton: 'Шёрстка',
  furTitle: 'Какая шёрстка?',
  furs: {
    white: 'Обычная белая',
    striped: 'Полосатая',
    fluffy: 'Очень пушистая',
    checked: 'В клеточку',
    spotted: 'В кружочек',
    black: 'Чёрная с белой мордочкой',
  },
  tintTitle: 'Цвет узора',
  tintNeedsPattern: 'Этот цвет — для узора. Выбери полосатую, пушистую, в клеточку или в кружочек!',
  tints: { grey: 'Серый', ginger: 'Рыжий', pink: 'Розовый', blue: 'Голубой', lilac: 'Сиреневый' },
  tapCat: 'Готово? Нажми на кошечку!',
  wardrobeIntro: 'Гардероб. Нажимай на вещи: надеть или снять.',

  reception: 'Регистратура',
  wards: 'Палаты',
  ward: (n) => `Палата ${n}`,
  wardEmpty: 'свободна',
  wardAway: 'реанимация',
  wardWaiting: (nick) => nick,
  wardNavLabel: (n, state) => `Палата ${n}: ${state}`,
  arrowHint: 'сюда',
  camera: 'Сфотографировать',
  ticketFor: (n) => `Талончик в палату ${n}`,
  shutter: 'Закрыть шторку',
  swipeHint: 'Проведи вниз',
  knock: 'Тук-тук! Кто-то пришёл к окошку. Сфотографируй!',
  photoReady: 'Фото готово! Похож на пациента? Дай талончик. Не похож? Это монстрик — закрой шторку!',
  photoFirst: 'Сначала сделай фото!',
  photoAgain: 'Фото уже есть. Сравни его с тем, кто в окошке.',
  nobodyYet: 'Пока никого. Сейчас кто-нибудь постучит.',
  admitted: (p, ward) => `${p.nick} ${g(p.gender, 'пошёл', 'пошла')} в палату ${ward}. Нажми ${ward} наверху!`,
  caught: 'Попался, монстрик! Шторка закрыта.',
  wrongPatient: 'Ой! Это был настоящий пациент. Открываем окошко — сфотографируй ещё раз.',
  sneaked: 'Ой! Это был монстрик в маске! Он схватил талончик и убежал. Кошечка его прогнала.',
  deskFull: 'Все палаты заняты. Вылечи кого-нибудь — и позовём следующего.',
  deskDone: 'Все пациенты уже в палатах. Иди лечить!',
  signFull: 'Мест нет',
  signDone: 'Все пришли',
  monster: 'Монстрик',
  photoLabel: 'Фото',
  knockBy: (nick, ailment) => `Тук-тук! В окошке ${nick}. ${ailment}. Сфотографируй!`,
  swipeHow: 'Проведи пальцем по окошку сверху вниз — шторка закроется. Или нажми «Проведи вниз».',

  toReception: 'Регистратура',
  ailments: {
    throat: 'Болит горло',
    ear: 'Болит ушко',
    tooth: 'Болит зубик',
    paw: 'Болит лапка',
    nose: 'Насморк',
    tummy: 'Болит животик',
    cough: 'Кашель',
    fever: 'Температура',
  },
  kinds: { letter: 'Буква', syllable: 'Слог', word: 'Слово' },
  readPrompt: {
    letter: 'Нажми на микрофон и назови букву.',
    syllable: 'Нажми на микрофон и прочитай слог.',
    word: 'Нажми на микрофон и прочитай слово.',
  },
  readAloud: {
    letter: 'Назови букву вслух — взрослый проверит.',
    syllable: 'Прочитай слог вслух — взрослый проверит.',
    word: 'Прочитай слово вслух — взрослый проверит.',
  },
  quote: (text) => `«${text}»`,
  duration: (ms) => {
    const sec = Math.max(1, Math.ceil(ms / 1000))
    if (sec < 60) return `${sec} ${ruPlural(sec, 'секунду', 'секунды', 'секунд')}`
    const min = Math.ceil(sec / 60)
    return `${min} ${ruPlural(min, 'минуту', 'минуты', 'минут')}`
  },
  wardIntro: (ward, p, ailment, prompt) => `Палата ${ward}. ${p.nick}. ${ailment}. ${prompt}`,
  mic: 'Нажми и скажи',
  micStop: 'Хватит слушать',
  listening: 'Слушаю…',
  correct: ['Правильно!', 'Верно!', 'Молодец!', 'Отлично!', 'Здорово!'],
  correctSay: (word, spoken) => `${word} ${spoken}!`,
  retry: 'Кошечка не расслышала. Посмотри внимательно и скажи ещё раз!',
  retryHeard: (text) => `Кошечка услышала ${text}. Посмотри внимательно и скажи ещё раз!`,
  wrong: (left) => `Не совсем. Осталось ${left} ${ruPlural(left, 'сердечко', 'сердечка', 'сердечек')}. Попробуй ещё!`,
  wrongHeard: (text, left) => `Кошечка услышала ${text}. Не то! Осталось ${left} ${ruPlural(left, 'сердечко', 'сердечка', 'сердечек')}.`,
  nothingHeard: 'Ничего не слышно. Нажми на микрофон и скажи громко!',
  reanimation: (p) => `Ой-ой! ${p.nick} едет в реанимацию. Там подлечат, и ${g(p.gender, 'он вернётся', 'она вернётся')}.`,
  reveal: (spoken) => `Правильно было: ${spoken}.`,
  backFrom: (p, ward) => `${p.nick} ${g(p.gender, 'вернулся', 'вернулась')} из реанимации в палату ${ward}!`,
  awayFor: (p, time) => `${p.nick} в реанимации. ${g(p.gender, 'Вернётся', 'Вернётся')} через ${time}.`,
  healed: (p, name) => `Ура! ${p.nick} ${g(p.gender, 'здоров', 'здорова')}! Спасибо, доктор ${name}!`,
  healedTitle: (p) => `${p.nick} ${g(p.gender, 'здоров', 'здорова')}!`,
  hearts: (left) => `Сердечки пациента: ${left} из 3`,
  grownupCorrect: 'Верно',
  grownupWrong: 'Ошибка',
  grownupHint: 'Взрослый слушает и нажимает',
  micUnsupported: 'Этот браузер не умеет слушать. Теперь чтение проверяет взрослый.',
  micDenied: 'Микрофон выключен. Разрешите его в браузере или выберите «Взрослый проверяет».',
  micNetwork: 'Распознавание речи не отвечает. Проверьте интернет и попробуйте ещё раз.',
  micTrouble: 'Микрофон не сработал. Нажми ещё раз.',
  micService: 'Распознавание речи недоступно. На iPad включите Диктовку (Настройки, Основные, Клавиатура) или выберите «Взрослый проверяет».',
  cardsLeft: (done, total) => `Карточки: ${done} из ${total}`,
  emptyWardLine: 'Палата свободна. Новые пациенты ждут в регистратуре.',
  goReception: 'В регистратуру',

  roundTitle: 'Все 20 пациентов здоровы!',
  celebrate: 'Праздник!',
  whoPlays: 'Кто играет?',
  roundText: (name, round) => `Доктор ${name} вылечила всех! Круг ${round} пройден. Больница празднует — и начинает сначала.`,
  again: 'Играть заново',
  roundBadge: (n) => `${n} ${ruPlural(n, 'круг', 'круга', 'кругов')}`,

  boardTitle: 'Доска почёта',
  boardIntro: 'Все кошечки, которые лечили зверят. Нажми «Это я!», чтобы играть своей.',
  you: 'Сейчас играет',
  thisIsMe: 'Это я!',
  newCat: 'Новая кошечка',
  remove: 'Убрать',
  removeAsk: (name) => `Убрать «${name}» с доски почёта? Очки пропадут.`,
  removeYes: 'Убрать',
  removeNo: 'Оставить',
  statHealed: 'Вылечено',
  statRounds: 'Круги',
  statCaught: 'Монстрики',
  switched: (name) => `Играет доктор ${name}!`,
  tooMany: 'На доске уже 12 кошечек. Уберите одну, чтобы добавить новую.',

  howtoTitle: 'Как играть',
  howtoListen: 'Послушать',
  howtoSteps: [
    'Пациент стучит в окошко регистратуры. Нажми на фотоаппарат — сделай фото.',
    'Сравни фото с тем, кто в окошке. Похож — нажми на талончик, и пациент пойдёт в палату.',
    'На фото монстрик? Проведи пальцем по окошку сверху вниз — шторка закроется, и монстрик уйдёт.',
    'Наверху номера палат. Стрелочка показывает, в какую палату пошёл пациент.',
    'В палате появляются буквы, потом слоги, потом слова. Нажми на микрофон и прочитай вслух.',
    'У пациента три сердечка. Три ошибки — и его везут в реанимацию. Скоро он вернётся, и можно попробовать снова.',
    'Правильно — плюс одно очко. Ошибка — минус одно. Вылечишь 20 пациентов — игра начнётся сначала.',
    'В гардеробе наряжай кошечку и дай ей имя. Все кошечки — на доске почёта.',
  ],

  patients: {
    giraffe: { nick: 'Жираф Жора', gender: 'm' },
    bunny: { nick: 'Зайчик Пушок', gender: 'm' },
    bear: { nick: 'Медвежонок Миша', gender: 'm' },
    fox: { nick: 'Лиса Алиса', gender: 'f' },
    elephant: { nick: 'Слонёнок Тоша', gender: 'm' },
    pig: { nick: 'Свинка Хрюша', gender: 'f' },
    frog: { nick: 'Лягушка Квака', gender: 'f' },
    owl: { nick: 'Сова Соня', gender: 'f' },
    zebra: { nick: 'Зебра Зоя', gender: 'f' },
    panda: { nick: 'Панда Поля', gender: 'f' },
    hedgehog: { nick: 'Ёжик Шустрик', gender: 'm' },
    cow: { nick: 'Корова Зорька', gender: 'f' },
    monkey: { nick: 'Обезьянка Ася', gender: 'f' },
    penguin: { nick: 'Пингвин Лёдик', gender: 'm' },
    lion: { nick: 'Лев Лёва', gender: 'm' },
    sheep: { nick: 'Овечка Долли', gender: 'f' },
    mouse: { nick: 'Мышка Норушка', gender: 'f' },
    hippo: { nick: 'Бегемот Тёма', gender: 'm' },
    crocodile: { nick: 'Крокодил Гоша', gender: 'm' },
    dog: { nick: 'Пёсик Бобик', gender: 'm' },
  },
}

const de: BolnicaCopy = {
  name: 'Kätzchens Krankenhaus',
  byline: 'Veronikas Spiel',
  tagline: 'Mach die Tiere gesund: Lies Buchstaben, Silben und Wörter laut vor.',
  description: 'Kätzchens Krankenhaus — Veronikas Spiel. Fotografiere Patienten, verscheuche Monster und heile Tiere durch lautes Lesen.',
  home: 'Alle Spiele',
  language: 'Sprache',
  soundOn: 'Ton an',
  soundOff: 'Ton aus',
  back: 'Zurück',
  start: 'Spiel starten',
  howto: 'So geht’s',
  wardrobe: 'Kleider\u00adschrank',
  board: 'Ehrentafel',
  checkerTitle: 'Wer prüft das Lesen',
  grownups: 'Für Erwachsene',
  checkers: { voice: 'Das Kätzchen hört zu', grownup: 'Ein Erwachsener prüft' },
  checkerHints: {
    voice: 'Tippe aufs Mikrofon und lies die Karte laut vor.',
    grownup: 'Das Kind liest laut vor, ein Erwachsener tippt „Richtig“ oder „Fehler“.',
  },
  forgiving: 'Den ersten Fehler pro Karte verzeiht das Kätzchen',
  forgivingHint: 'Das Mikrofon verhört sich manchmal — dann darf man ohne Strafe noch einmal sprechen.',
  privacy:
    'Die Wörter erkennt der Browser. Chrome schickt den Ton an Google, wenn es nicht auf dem Gerät erkennen kann; Safari an Apple. Das Spiel nimmt nichts auf und speichert nichts. Ohne Mikrofon „Ein Erwachsener prüft“ wählen.',
  noSave: 'Der Fortschritt wird nicht gespeichert: Der Browserspeicher ist nicht verfügbar.',
  progress: (healed, total) => `Geheilt: ${healed} von ${total}`,
  level: (n) => `Level ${n}`,
  points: (n) => `${n} ${n === 1 ? 'Punkt' : 'Punkte'}`,
  pointsShort: 'Punkte',
  doctor: (name) => `Doktor ${name}`,
  defaultName: 'Kätzchen',
  welcome: (name) => `Kätzchens Krankenhaus. Doktor ${name} wartet auf Patienten!`,
  catHello: (name) => `Miau! Ich bin Doktor ${name}.`,

  nameTitle: 'Wie heißt du?',
  nameHint: 'So heißt dann das Kätzchen. Der Name steht auf der Ehrentafel.',
  namePlaceholder: 'Name',
  nameSave: 'Fertig',
  nameSkip: 'Später',
  nameSet: (name) => `Das Kätzchen heißt jetzt ${name}!`,

  wardrobeTitle: 'Kleiderschrank',
  wearTitle: 'Kleidung',
  wears: {
    cap: 'Häubchen mit Kreuz',
    stethoscope: 'Stethoskop',
    coat: 'Arztkittel',
    bag: 'Arzttasche',
    glasses: 'Brille',
    bow: 'Schleife',
    mirror: 'Stirnspiegel',
  },
  wearOn: {
    cap: 'Häubchen auf',
    stethoscope: 'Stethoskop um',
    coat: 'Kittel an',
    bag: 'Tasche dabei',
    glasses: 'Brille auf',
    bow: 'Schleife gebunden',
    mirror: 'Stirnspiegel auf',
  },
  wearOff: {
    cap: 'Häubchen ab',
    stethoscope: 'Stethoskop ab',
    coat: 'Kittel aus',
    bag: 'Tasche weg',
    glasses: 'Brille ab',
    bow: 'Schleife ab',
    mirror: 'Stirnspiegel ab',
  },
  furButton: 'Fell',
  furTitle: 'Welches Fell?',
  furs: {
    white: 'Ganz normal weiß',
    striped: 'Gestreift',
    fluffy: 'Super\u00adflauschig',
    checked: 'Kariert',
    spotted: 'Mit Kreisen',
    black: 'Schwarz mit weißem Gesicht',
  },
  tintTitle: 'Musterfarbe',
  tintNeedsPattern: 'Diese Farbe ist für ein Muster. Wähle gestreift, flauschig, kariert oder mit Kreisen!',
  tints: { grey: 'Grau', ginger: 'Rot', pink: 'Rosa', blue: 'Hellblau', lilac: 'Lila' },
  tapCat: 'Fertig? Tippe auf das Kätzchen!',
  wardrobeIntro: 'Kleiderschrank. Tippe auf die Sachen: anziehen oder ausziehen.',

  reception: 'Anmeldung',
  wards: 'Zimmer',
  ward: (n) => `Zimmer ${n}`,
  wardEmpty: 'frei',
  wardAway: 'Intensivstation',
  wardWaiting: (nick) => nick,
  wardNavLabel: (n, state) => `Zimmer ${n}: ${state}`,
  arrowHint: 'hier',
  camera: 'Foto machen',
  ticketFor: (n) => `Zettel für Zimmer ${n}`,
  shutter: 'Rollladen zu',
  swipeHint: 'Nach unten wischen',
  knock: 'Klopf, klopf! Jemand ist am Fenster. Mach ein Foto!',
  photoReady: 'Das Foto ist fertig! Sieht es aus wie der Patient? Gib ihm einen Zettel. Anders? Ein Monster — Rollladen zu!',
  photoFirst: 'Erst ein Foto machen!',
  photoAgain: 'Das Foto ist schon da. Vergleiche es mit dem am Fenster.',
  nobodyYet: 'Noch niemand da. Gleich klopft es.',
  admitted: (p, ward) => `${p.nick} geht in Zimmer ${ward}. Tippe oben auf die ${ward}!`,
  caught: 'Erwischt, kleines Monster! Der Rollladen ist zu.',
  wrongPatient: 'Oh! Das war ein echter Patient. Wir machen wieder auf — mach noch ein Foto.',
  sneaked: 'Oh! Das war ein Monster mit Maske! Es hat den Zettel geschnappt und ist weggerannt. Das Kätzchen hat es verjagt.',
  deskFull: 'Alle Zimmer sind belegt. Mach jemanden gesund, dann rufen wir den Nächsten.',
  deskDone: 'Alle Patienten sind schon in ihren Zimmern. Los, heilen!',
  signFull: 'Alles voll',
  signDone: 'Alle da',
  monster: 'Monster',
  photoLabel: 'Foto',
  knockBy: (nick, ailment) => `Klopf, klopf! Am Fenster ist ${nick}. ${ailment}. Mach ein Foto!`,
  swipeHow: 'Wische über das Fenster von oben nach unten — dann geht der Rollladen zu. Oder tippe auf „Nach unten wischen“.',

  toReception: 'Anmeldung',
  ailments: {
    throat: 'Halsweh',
    ear: 'Ohrenweh',
    tooth: 'Zahnweh',
    paw: 'Die Pfote tut weh',
    nose: 'Schnupfen',
    tummy: 'Bauchweh',
    cough: 'Husten',
    fever: 'Fieber',
  },
  kinds: { letter: 'Buchstabe', syllable: 'Silbe', word: 'Wort' },
  readPrompt: {
    letter: 'Tippe aufs Mikrofon und sag den Buchstaben.',
    syllable: 'Tippe aufs Mikrofon und lies die Silbe.',
    word: 'Tippe aufs Mikrofon und lies das Wort.',
  },
  readAloud: {
    letter: 'Sag den Buchstaben laut — ein Erwachsener prüft.',
    syllable: 'Lies die Silbe laut vor — ein Erwachsener prüft.',
    word: 'Lies das Wort laut vor — ein Erwachsener prüft.',
  },
  quote: (text) => `„${text}“`,
  duration: (ms) => {
    const sec = Math.max(1, Math.ceil(ms / 1000))
    if (sec < 60) return `${sec} ${sec === 1 ? 'Sekunde' : 'Sekunden'}`
    const min = Math.ceil(sec / 60)
    return `${min} ${min === 1 ? 'Minute' : 'Minuten'}`
  },
  wardIntro: (ward, p, ailment, prompt) => `Zimmer ${ward}. ${p.nick}. ${ailment}. ${prompt}`,
  mic: 'Tippen und sprechen',
  micStop: 'Nicht mehr zuhören',
  listening: 'Ich höre zu…',
  correct: ['Richtig!', 'Super!', 'Toll gemacht!', 'Prima!', 'Genau!'],
  correctSay: (word, spoken) => `${word} ${spoken}!`,
  retry: 'Das Kätzchen hat es nicht verstanden. Schau genau hin und sag es noch einmal!',
  retryHeard: (text) => `Das Kätzchen hat ${text} gehört. Schau genau hin und sag es noch einmal!`,
  wrong: (left) => `Nicht ganz. Noch ${left} ${left === 1 ? 'Herz' : 'Herzen'}. Versuch es noch mal!`,
  wrongHeard: (text, left) => `Das Kätzchen hat ${text} gehört. Das passt nicht! Noch ${left} ${left === 1 ? 'Herz' : 'Herzen'}.`,
  nothingHeard: 'Nichts zu hören. Tippe aufs Mikrofon und sprich laut!',
  reanimation: (p) => `Oje! ${p.nick} kommt auf die Intensivstation. Dort wird geholfen, und bald geht es zurück ins Zimmer.`,
  reveal: (spoken) => `Richtig wäre: ${spoken}.`,
  backFrom: (p, ward) => `${p.nick} ist von der Intensivstation zurück in Zimmer ${ward}!`,
  awayFor: (p, time) => `${p.nick} ist auf der Intensivstation. Zurück in ${time}.`,
  healed: (p, name) => `Hurra! ${p.nick} ist gesund! Danke, Doktor ${name}!`,
  healedTitle: (p) => `${p.nick} ist gesund!`,
  hearts: (left) => `Herzen des Patienten: ${left} von 3`,
  grownupCorrect: 'Richtig',
  grownupWrong: 'Fehler',
  grownupHint: 'Ein Erwachsener hört zu und tippt',
  micUnsupported: 'Dieser Browser kann nicht zuhören. Jetzt prüft ein Erwachsener.',
  micDenied: 'Das Mikrofon ist aus. Bitte im Browser erlauben oder „Ein Erwachsener prüft“ wählen.',
  micNetwork: 'Die Spracherkennung antwortet nicht. Bitte Internet prüfen und noch einmal versuchen.',
  micTrouble: 'Das Mikrofon hat nicht geklappt. Tippe noch einmal.',
  micService: 'Die Spracherkennung ist nicht verfügbar. Auf dem iPad das Diktieren einschalten (Einstellungen, Allgemein, Tastatur) oder „Ein Erwachsener prüft“ wählen.',
  cardsLeft: (done, total) => `Karten: ${done} von ${total}`,
  emptyWardLine: 'Das Zimmer ist frei. Neue Patienten warten an der Anmeldung.',
  goReception: 'Zur Anmeldung',

  roundTitle: 'Alle 20 Patienten sind gesund!',
  celebrate: 'Jetzt feiern!',
  whoPlays: 'Wer spielt?',
  roundText: (name, round) => `Doktor ${name} hat alle geheilt! Runde ${round} geschafft. Das Krankenhaus feiert — und fängt von vorn an.`,
  again: 'Noch einmal spielen',
  roundBadge: (n) => `${n} ${n === 1 ? 'Runde' : 'Runden'}`,

  boardTitle: 'Ehrentafel',
  boardIntro: 'Alle Kätzchen, die Tiere geheilt haben. Tippe „Das bin ich!“, um mit deinem zu spielen.',
  you: 'Spielt gerade',
  thisIsMe: 'Das bin ich!',
  newCat: 'Neues Kätzchen',
  remove: 'Entfernen',
  removeAsk: (name) => `„${name}“ von der Ehrentafel nehmen? Die Punkte gehen verloren.`,
  removeYes: 'Entfernen',
  removeNo: 'Behalten',
  statHealed: 'Geheilt',
  statRounds: 'Runden',
  statCaught: 'Monster',
  switched: (name) => `Jetzt spielt Doktor ${name}!`,
  tooMany: 'Auf der Tafel sind schon 12 Kätzchen. Entferne eins, um ein neues anzulegen.',

  howtoTitle: 'So geht’s',
  howtoListen: 'Vorlesen',
  howtoSteps: [
    'Ein Patient klopft ans Fenster der Anmeldung. Tippe auf die Kamera und mach ein Foto.',
    'Vergleiche das Foto mit dem am Fenster. Gleich? Tippe auf den Zettel, dann geht der Patient in sein Zimmer.',
    'Ein Monster auf dem Foto? Wische über das Fenster von oben nach unten — der Rollladen geht zu, und das Monster geht weg.',
    'Oben stehen die Zimmernummern. Der Pfeil zeigt, welche Nummer du dem Patienten gegeben hast.',
    'Im Zimmer erscheinen Buchstaben, dann Silben, dann Wörter. Tippe aufs Mikrofon und lies laut vor.',
    'Der Patient hat drei Herzen. Drei Fehler — und er kommt auf die Intensivstation. Bald ist er zurück, dann versuchst du es noch mal.',
    'Richtig gibt einen Punkt, ein Fehler kostet einen. Nach 20 geheilten Patienten beginnt das Spiel von vorn.',
    'Im Kleiderschrank ziehst du das Kätzchen an und gibst ihm einen Namen. Alle Kätzchen stehen auf der Ehrentafel.',
  ],

  patients: {
    giraffe: { nick: 'Giraffe Gisela', gender: 'f' },
    bunny: { nick: 'Hase Hoppel', gender: 'm' },
    bear: { nick: 'Bär Bruno', gender: 'm' },
    fox: { nick: 'Fuchs Fridolin', gender: 'm' },
    elephant: { nick: 'Elefant Emil', gender: 'm' },
    pig: { nick: 'Schweinchen Rosa', gender: 'f' },
    frog: { nick: 'Frosch Fritz', gender: 'm' },
    owl: { nick: 'Eule Ella', gender: 'f' },
    zebra: { nick: 'Zebra Zora', gender: 'f' },
    panda: { nick: 'Panda Paula', gender: 'f' },
    hedgehog: { nick: 'Igel Ingo', gender: 'm' },
    cow: { nick: 'Kuh Klara', gender: 'f' },
    monkey: { nick: 'Äffchen Anni', gender: 'f' },
    penguin: { nick: 'Pinguin Pepe', gender: 'm' },
    lion: { nick: 'Löwe Leo', gender: 'm' },
    sheep: { nick: 'Schaf Wolke', gender: 'f' },
    mouse: { nick: 'Maus Mia', gender: 'f' },
    hippo: { nick: 'Nilpferd Nino', gender: 'm' },
    crocodile: { nick: 'Krokodil Kroko', gender: 'm' },
    dog: { nick: 'Hund Bello', gender: 'm' },
  },
}

const en: BolnicaCopy = {
  name: 'Kitty’s Hospital',
  byline: 'Veronika’s game',
  tagline: 'Heal the animals by reading letters, syllables and words aloud.',
  description: 'Kitty’s Hospital — Veronika’s game. Photograph patients, shoo away monsters and heal animals by reading aloud.',
  home: 'All toys',
  language: 'Language',
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  back: 'Back',
  start: 'Start playing',
  howto: 'How to play',
  wardrobe: 'Wardrobe',
  board: 'Hall of fame',
  checkerTitle: 'Who checks the reading',
  grownups: 'For grown-ups',
  checkers: { voice: 'Kitty listens', grownup: 'A grown-up checks' },
  checkerHints: {
    voice: 'Tap the microphone and read the card aloud.',
    grownup: 'The child reads aloud; a grown-up taps “Right” or “Oops”.',
  },
  forgiving: 'Kitty forgives the first mistake on each card',
  forgivingHint: 'The microphone sometimes mishears — then you may try again without losing a point.',
  privacy:
    'The browser recognises the words. Chrome sends the sound to Google unless it can recognise on the device; Safari sends it to Apple. The game records and keeps nothing. Without a microphone, choose “A grown-up checks”.',
  noSave: 'Progress will not be saved: browser storage is unavailable.',
  progress: (healed, total) => `Healed ${healed} of ${total}`,
  level: (n) => `Level ${n}`,
  points: (n) => `${n} ${n === 1 ? 'point' : 'points'}`,
  pointsShort: 'Points',
  doctor: (name) => `Doctor ${name}`,
  defaultName: 'Kitty',
  welcome: (name) => `Kitty’s Hospital. Doctor ${name} is ready for patients!`,
  catHello: (name) => `Meow! I am Doctor ${name}.`,

  nameTitle: 'What’s your name?',
  nameHint: 'Your kitty will have this name. It shows in the hall of fame.',
  namePlaceholder: 'Name',
  nameSave: 'Done',
  nameSkip: 'Later',
  nameSet: (name) => `Your kitty is called ${name} now!`,

  wardrobeTitle: 'Wardrobe',
  wearTitle: 'Clothes',
  wears: {
    cap: 'Nurse cap',
    stethoscope: 'Stethoscope',
    coat: 'Doctor’s coat',
    bag: 'Doctor’s bag',
    glasses: 'Glasses',
    bow: 'Bow',
    mirror: 'Head mirror',
  },
  wearOn: {
    cap: 'Cap on',
    stethoscope: 'Stethoscope on',
    coat: 'Coat on',
    bag: 'Bag packed',
    glasses: 'Glasses on',
    bow: 'Bow tied',
    mirror: 'Head mirror on',
  },
  wearOff: {
    cap: 'Cap off',
    stethoscope: 'Stethoscope off',
    coat: 'Coat off',
    bag: 'Bag away',
    glasses: 'Glasses off',
    bow: 'Bow off',
    mirror: 'Head mirror off',
  },
  furButton: 'Fur',
  furTitle: 'Which fur?',
  furs: {
    white: 'Plain white',
    striped: 'Striped',
    fluffy: 'Super fluffy',
    checked: 'Checked',
    spotted: 'Polka dots',
    black: 'Black with a white face',
  },
  tintTitle: 'Pattern colour',
  tintNeedsPattern: 'This colour is for a pattern. Pick striped, fluffy, checked or polka dots!',
  tints: { grey: 'Grey', ginger: 'Ginger', pink: 'Pink', blue: 'Blue', lilac: 'Lilac' },
  tapCat: 'Ready? Tap your kitty!',
  wardrobeIntro: 'Wardrobe. Tap things to put them on or take them off.',

  reception: 'Reception',
  wards: 'Wards',
  ward: (n) => `Ward ${n}`,
  wardEmpty: 'free',
  wardAway: 'intensive care',
  wardWaiting: (nick) => nick,
  wardNavLabel: (n, state) => `Ward ${n}: ${state}`,
  arrowHint: 'here',
  camera: 'Take a photo',
  ticketFor: (n) => `Ticket for ward ${n}`,
  shutter: 'Close the shutter',
  swipeHint: 'Swipe down',
  knock: 'Knock, knock! Someone is at the window. Take a photo!',
  photoReady: 'The photo is ready! Does it look like the patient? Give a ticket. Different? A monster — close the shutter!',
  photoFirst: 'Take a photo first!',
  photoAgain: 'You already have a photo. Compare it with the one at the window.',
  nobodyYet: 'Nobody yet. Someone will knock soon.',
  admitted: (p, ward) => `${p.nick} is going to ward ${ward}. Tap ${ward} at the top!`,
  caught: 'Gotcha, little monster! The shutter is closed.',
  wrongPatient: 'Oops! That was a real patient. We’ll open the window again — take another photo.',
  sneaked: 'Oops! That was a monster in a mask! It grabbed the ticket and ran. Kitty chased it away.',
  deskFull: 'All wards are busy. Heal someone and we’ll call the next patient.',
  deskDone: 'All patients are already in their wards. Go and heal them!',
  signFull: 'Full',
  signDone: 'All here',
  monster: 'Monster',
  photoLabel: 'Photo',
  knockBy: (nick, ailment) => `Knock, knock! ${nick} is at the window. ${ailment}. Take a photo!`,
  swipeHow: 'Swipe down over the window from the top to close the shutter. Or tap “Swipe down”.',

  toReception: 'Reception',
  ailments: {
    throat: 'Sore throat',
    ear: 'Earache',
    tooth: 'Toothache',
    paw: 'Sore paw',
    nose: 'Runny nose',
    tummy: 'Tummy ache',
    cough: 'Cough',
    fever: 'Fever',
  },
  kinds: { letter: 'Letter', syllable: 'Syllable', word: 'Word' },
  readPrompt: {
    letter: 'Tap the microphone and say the letter.',
    syllable: 'Tap the microphone and read the syllable.',
    word: 'Tap the microphone and read the word.',
  },
  readAloud: {
    letter: 'Say the letter aloud — a grown-up checks.',
    syllable: 'Read the syllable aloud — a grown-up checks.',
    word: 'Read the word aloud — a grown-up checks.',
  },
  quote: (text) => `“${text}”`,
  duration: (ms) => {
    const sec = Math.max(1, Math.ceil(ms / 1000))
    if (sec < 60) return `${sec} ${sec === 1 ? 'second' : 'seconds'}`
    const min = Math.ceil(sec / 60)
    return `${min} ${min === 1 ? 'minute' : 'minutes'}`
  },
  wardIntro: (ward, p, ailment, prompt) => `Ward ${ward}. ${p.nick}. ${ailment}. ${prompt}`,
  mic: 'Tap and speak',
  micStop: 'Stop listening',
  listening: 'Listening…',
  correct: ['Right!', 'Well done!', 'Great!', 'Super!', 'Yes!'],
  correctSay: (word, spoken) => `${word} ${spoken}!`,
  retry: 'Kitty did not catch that. Look closely and say it again!',
  retryHeard: (text) => `Kitty heard ${text}. Look closely and say it again!`,
  wrong: (left) => `Not quite. ${left} ${left === 1 ? 'heart' : 'hearts'} left. Try again!`,
  wrongHeard: (text, left) => `Kitty heard ${text}. That’s not it! ${left} ${left === 1 ? 'heart' : 'hearts'} left.`,
  nothingHeard: 'Nothing heard. Tap the microphone and speak up!',
  reanimation: (p) => `Oh dear! ${p.nick} is off to intensive care. The doctors there will help, and the patient will be back soon.`,
  reveal: (spoken) => `It was: ${spoken}.`,
  backFrom: (p, ward) => `${p.nick} is back from intensive care in ward ${ward}!`,
  awayFor: (p, time) => `${p.nick} is in intensive care. Back in ${time}.`,
  healed: (p, name) => `Hooray! ${p.nick} is well again! Thank you, Doctor ${name}!`,
  healedTitle: (p) => `${p.nick} is well again!`,
  hearts: (left) => `Patient’s hearts: ${left} of 3`,
  grownupCorrect: 'Right',
  grownupWrong: 'Oops',
  grownupHint: 'A grown-up listens and taps',
  micUnsupported: 'This browser cannot listen. A grown-up checks the reading now.',
  micDenied: 'The microphone is blocked. Allow it in the browser or choose “A grown-up checks”.',
  micNetwork: 'Speech recognition is not answering. Check the internet and try again.',
  micTrouble: 'The microphone did not start. Tap again.',
  micService: 'Speech recognition is not available. On an iPad, turn on Dictation (Settings, General, Keyboard) or choose “A grown-up checks”.',
  cardsLeft: (done, total) => `Cards: ${done} of ${total}`,
  emptyWardLine: 'This ward is free. New patients are waiting at reception.',
  goReception: 'To reception',

  roundTitle: 'All 20 patients are well!',
  celebrate: 'Let’s celebrate!',
  whoPlays: 'Who is playing?',
  roundText: (name, round) => `Doctor ${name} healed everyone! Round ${round} done. The hospital celebrates — and starts again.`,
  again: 'Play again',
  roundBadge: (n) => `${n} ${n === 1 ? 'round' : 'rounds'}`,

  boardTitle: 'Hall of fame',
  boardIntro: 'Every kitty who has healed animals. Tap “That’s me!” to play as yours.',
  you: 'Playing now',
  thisIsMe: 'That’s me!',
  newCat: 'New kitty',
  remove: 'Remove',
  removeAsk: (name) => `Remove “${name}” from the hall of fame? The points will be lost.`,
  removeYes: 'Remove',
  removeNo: 'Keep',
  statHealed: 'Healed',
  statRounds: 'Rounds',
  statCaught: 'Monsters',
  switched: (name) => `Doctor ${name} is playing now!`,
  tooMany: 'There are already 12 kitties. Remove one to add a new one.',

  howtoTitle: 'How to play',
  howtoListen: 'Read it to me',
  howtoSteps: [
    'A patient knocks at the reception window. Tap the camera to take a photo.',
    'Compare the photo with the one at the window. The same? Tap the ticket and the patient goes to a ward.',
    'A monster in the photo? Swipe down over the window — the shutter closes and the monster goes away.',
    'The ward numbers are at the top. The arrow shows which number you gave the patient.',
    'In the ward, letters appear, then syllables, then words. Tap the microphone and read aloud.',
    'The patient has three hearts. Three mistakes and the patient goes to intensive care. They come back soon, and you can try again.',
    'Right answers give a point, mistakes cost one. Heal 20 patients and the game starts again.',
    'In the wardrobe, dress up your kitty and give it a name. Every kitty is in the hall of fame.',
  ],

  patients: {
    giraffe: { nick: 'Gerry the Giraffe', gender: 'm' },
    bunny: { nick: 'Hoppy the Bunny', gender: 'm' },
    bear: { nick: 'Bruno the Bear', gender: 'm' },
    fox: { nick: 'Fiona the Fox', gender: 'f' },
    elephant: { nick: 'Ellie the Elephant', gender: 'f' },
    pig: { nick: 'Rosie the Pig', gender: 'f' },
    frog: { nick: 'Freddy the Frog', gender: 'm' },
    owl: { nick: 'Olive the Owl', gender: 'f' },
    zebra: { nick: 'Zara the Zebra', gender: 'f' },
    panda: { nick: 'Poppy the Panda', gender: 'f' },
    hedgehog: { nick: 'Harry the Hedgehog', gender: 'm' },
    cow: { nick: 'Clara the Cow', gender: 'f' },
    monkey: { nick: 'Milo the Monkey', gender: 'm' },
    penguin: { nick: 'Pip the Penguin', gender: 'm' },
    lion: { nick: 'Leo the Lion', gender: 'm' },
    sheep: { nick: 'Molly the Sheep', gender: 'f' },
    mouse: { nick: 'Millie the Mouse', gender: 'f' },
    hippo: { nick: 'Hugo the Hippo', gender: 'm' },
    crocodile: { nick: 'Coco the Crocodile', gender: 'm' },
    dog: { nick: 'Buddy the Dog', gender: 'm' },
  },
}

export const BOLNICA_COPY: Record<Lang, BolnicaCopy> = { ru, de, en }

/** mm:ss for the intensive-care countdown. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
