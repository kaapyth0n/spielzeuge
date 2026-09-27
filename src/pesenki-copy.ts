import type { Lang } from './languages.ts'

export interface PesenkiCopy {
  name: string
  byline: string
  tagline: string
  documentTitle: string
  description: string
  pick: string
  home: string
  songs: string
  soundOn: string
  soundOff: string
  language: string
  pause: string
  paused: string
  tapToStart: string
  loading: string
  loadError: string
  retry: string
  listen: string
  tapChorus: string
  rewind: string
  wake: string
  done: string
  starsLine: (stars: number, total: number) => string
  perfectSong: string
  speedUps: string
  newSpeed: string
  pickSpeed: string
  speeds: [string, string, string, string, string]
  again: string
  another: string
  locked: string
  choicesLabel: string
  credits: string
  privacy: string
  noAudio: string
  noStorage: string
  sleeping: string
  asleep: (title: string) => string
  allSpeeds: string
}

export const PESENKI_COPY: Record<Lang, PesenkiCopy> = {
  ru: {
    name: 'Песенки',
    byline: 'Игра Матрёны',
    tagline: 'Слушай песенку и находи картинки!',
    documentTitle: 'Песенки · Spielzeuge',
    description: 'Песенки — игра Матрёны. Песенка поёт, а ты находишь картинку из песни.',
    pick: 'Выбери песенку',
    home: 'Все игрушки',
    songs: 'Все песенки',
    soundOn: 'Звук включён',
    soundOff: 'Звук выключен',
    language: 'Язык',
    pause: 'Пауза',
    paused: 'Пауза. Тыкни на кружок, чтобы петь дальше.',
    tapToStart: 'Тыкни на кружок — и песенка начнётся!',
    loading: 'Песенка загружается…',
    loadError: 'Песенка не загрузилась. Проверь интернет.',
    retry: 'Ещё раз',
    listen: 'Что спели? Найди картинку!',
    tapChorus: 'Тыкай на кружок — и песенка играет!',
    rewind: 'Уй-уй-уй!',
    wake: 'Тыкни — песенка проснётся!',
    done: 'Ура! Песенка спета!',
    starsLine: (stars, total) => `Без остановки: ${stars} из ${total}`,
    perfectSong: 'Ни одной остановки!',
    speedUps: 'Ускорения',
    newSpeed: 'Новое ускорение!',
    pickSpeed: 'Выбери ускорение!',
    speeds: ['Обычно', 'Быстрее', 'Ещё быстрее', 'Очень быстро', 'Ракета!'],
    again: 'Ещё раз',
    another: 'Другая песенка',
    locked: 'Спой быстрее — и откроется',
    choicesLabel: 'Картинки',
    credits: 'Песни сделаны с помощью Suno, слова и картинки — для этой игры.',
    privacy: 'Всё работает на устройстве. Ничего не записывается.',
    noAudio: 'Этот браузер не умеет играть песенки.',
    noStorage: 'Успехи не сохранятся на этом устройстве.',
    sleeping: 'Эта песенка ещё спит. Скоро проснётся!',
    allSpeeds: 'Все ускорения пройдены! Кружок стал золотым!',
    asleep: (title) => `${title} — спит`,
  },
  de: {
    name: 'Liedchen',
    byline: 'Matrjonas Spiel',
    tagline: 'Hör das Lied und finde die Bilder!',
    documentTitle: 'Liedchen · Spielzeuge',
    description: 'Liedchen — Matrjonas Spiel. Das Lied singt, und du findest das Bild aus dem Lied.',
    pick: 'Wähle ein Lied',
    home: 'Alle Spiele',
    songs: 'Alle Lieder',
    soundOn: 'Ton an',
    soundOff: 'Ton aus',
    language: 'Sprache',
    pause: 'Pause',
    paused: 'Pause. Tipp auf den Kreis, dann geht es weiter.',
    tapToStart: 'Tipp auf den Kreis, dann fängt das Lied an!',
    loading: 'Das Lied wird geladen …',
    loadError: 'Das Lied lädt nicht. Prüfe das Internet.',
    retry: 'Nochmal',
    listen: 'Was wurde gesungen? Finde das Bild!',
    tapChorus: 'Tipp auf den Kreis, dann spielt das Lied!',
    rewind: 'Hui-hui-hui!',
    wake: 'Tipp drauf, dann wacht das Lied auf!',
    done: 'Hurra! Das Lied ist fertig!',
    starsLine: (stars, total) => `Ohne Anhalten: ${stars} von ${total}`,
    perfectSong: 'Kein einziges Mal angehalten!',
    speedUps: 'Turbo',
    newSpeed: 'Neuer Turbo!',
    pickSpeed: 'Wähle einen Turbo!',
    speeds: ['Normal', 'Schneller', 'Noch schneller', 'Superschnell', 'Rakete!'],
    again: 'Nochmal',
    another: 'Anderes Lied',
    locked: 'Sing schneller, dann geht es auf',
    choicesLabel: 'Bilder',
    credits: 'Die Lieder sind mit Suno gemacht, Texte und Bilder für dieses Spiel.',
    privacy: 'Alles läuft auf dem Gerät. Nichts wird aufgenommen.',
    noAudio: 'Dieser Browser kann keine Lieder abspielen.',
    noStorage: 'Fortschritte werden auf diesem Gerät nicht gespeichert.',
    sleeping: 'Dieses Lied schläft noch. Bald wacht es auf!',
    allSpeeds: 'Alle Turbos geschafft! Der Kreis ist jetzt golden!',
    asleep: (title) => `${title} — schläft`,
  },
  en: {
    name: 'Little Songs',
    byline: 'Matryona’s game',
    tagline: 'Listen to the song and find the pictures!',
    documentTitle: 'Little Songs · Spielzeuge',
    description: 'Little Songs — Matryona’s game. The song sings, you find the picture from the song.',
    pick: 'Pick a song',
    home: 'All toys',
    songs: 'All songs',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    language: 'Language',
    pause: 'Pause',
    paused: 'Paused. Tap the circle to keep singing.',
    tapToStart: 'Tap the circle and the song begins!',
    loading: 'Loading the song…',
    loadError: 'The song did not load. Check the internet.',
    retry: 'Try again',
    listen: 'What did the song say? Find the picture!',
    tapChorus: 'Keep tapping the circle to keep the song going!',
    rewind: 'Whee-oo-whee!',
    wake: 'Tap it to wake the song up!',
    done: 'Hooray! Song finished!',
    starsLine: (stars, total) => `Without stopping: ${stars} of ${total}`,
    perfectSong: 'Not a single stop!',
    speedUps: 'Speed-ups',
    newSpeed: 'New speed-up!',
    pickSpeed: 'Pick a speed-up!',
    speeds: ['Normal', 'Faster', 'Even faster', 'Super fast', 'Rocket!'],
    again: 'Again',
    another: 'Another song',
    locked: 'Sing faster to open it',
    choicesLabel: 'Pictures',
    credits: 'Songs made with Suno; words and pictures made for this game.',
    privacy: 'Everything runs on this device. Nothing is recorded.',
    noAudio: 'This browser cannot play the songs.',
    noStorage: 'Progress will not be saved on this device.',
    sleeping: 'This song is still asleep. It will wake up soon!',
    allSpeeds: 'Every speed-up done! The circle turned gold!',
    asleep: (title) => `${title} — asleep`,
  },
}
