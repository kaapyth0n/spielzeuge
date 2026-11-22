import type { Lang } from './languages.ts'

export const words = (ru: string, de: string, en: string): Record<Lang, string> => ({ ru, de, en })

export const title = words('Девочка', 'Das Mädchen', 'The Little Girl')
export const blurb = words(
  'Игра Матрёны. Загляни в лавку зайчика, собери пикник и угости рыжего кота на полосатом пледе.',
  'Matrjonas Spiel. Pack im Hasenladen ein Picknick ein und teile es auf der gestreiften Decke mit dem Kater.',
  'Matryona’s game. Pack a picnic at Bunny’s shop and share it with the ginger cat on his stripy blanket.'
)

export const FOOD = {
  dumpling: {
    price: 3,
    name: words('Пельмени', 'Teigtaschen', 'Dumplings'),
    hint: words(
      'Подхвати пельмень щипцами и поднеси ко рту.',
      'Nimm eine Teigtasche mit der Zange und führe sie zum Mund.',
      'Pick up a dumpling with the tongs and bring it to her mouth.'
    ),
    happy: words('М-м, мягкий пельмешек!', 'Mmm, so schön weich!', 'Mmm, that dumpling is so soft!'),
  },
  roll: {
    price: 4,
    name: words('Роллы', 'Sushirollen', 'Sushi rolls'),
    hint: words(
      'Возьми ролл пальчиками и поднеси ко рту.',
      'Nimm eine Sushirolle mit den Fingern und führe sie zum Mund.',
      'Pick up a roll with your fingers and bring it to her mouth.'
    ),
    happy: words(
      'Хрусть! Внутри огурчик!',
      'Knack! Da steckt eine Gurke drin!',
      'Crunch! There’s cucumber inside!'
    ),
  },
  chips: {
    price: 2,
    name: words('Голубые чипсы', 'Blaue Chips', 'Blue chips'),
    hint: words(
      'Проведи поперёк пакета или нажми на ножницы.',
      'Streiche quer über die Tüte oder tippe auf die Schere.',
      'Swipe across the bag or tap the scissors.'
    ),
    happy: words('Как звонко хрустят!', 'Die knuspern so schön!', 'What a lovely crunch!'),
  },
  water: {
    price: 1,
    name: words('Вода', 'Wasser', 'Water'),
    hint: words(
      'Поднеси стакан ко рту и подержи, пока капелька не наполнится.',
      'Halte das Glas an den Mund, bis der Tropfen voll ist.',
      'Hold the glass at her mouth until the drop fills up.'
    ),
    happy: words('Буль-буль! Вот и попила.', 'Gluck, gluck! Das tut gut.', 'Gulp, gulp! That hit the spot.'),
  },
}
export type Food = keyof typeof FOOD
export const FOODS = Object.keys(FOOD) as Food[]

export const MEALS = [
  {
    sticker: 'window',
    list: ['dumpling', 'water'],
    name: words('Обед у окошка', 'Mittag am Fenster', 'Lunch by the window'),
    wish: words(
      'Посидим у окна? Я хочу пельменей и стакан воды.',
      'Setzen wir uns ans Fenster? Ich hätte gern Teigtaschen und ein Glas Wasser.',
      'Let’s sit by the window! I’d love dumplings and a glass of water.'
    ),
    prize: words('Солнечное окно', 'Sonnenfenster', 'Sunny window'),
  },
  {
    sticker: 'cat',
    list: ['roll', 'chips', 'water'],
    name: words('Пикник с котом', 'Picknick mit Kater', 'Picnic with the cat'),
    wish: words(
      'Кот нашёл полосатый плед. Возьмём роллы, чипсы и воду!',
      'Der Kater hat die gestreifte Picknickdecke gefunden. Packen wir Sushi, Chips und Wasser ein!',
      'The cat found our stripy blanket. Let’s pack rolls, chips and water!'
    ),
    prize: words('Полосатый гость', 'Gestreifter Gast', 'Stripy visitor'),
  },
  {
    sticker: 'flower',
    list: ['dumpling', 'roll', 'water'],
    name: words('В саду ромашек', 'Im Gänseblümchengarten', 'In the daisy garden'),
    wish: words(
      'Ромашки уже раскрылись. Возьмём в сад пельмени, роллы и воду.',
      'Die Gänseblümchen sind wach. Nehmen wir Teigtaschen, Sushi und Wasser mit.',
      'The daisies are open. Let’s take dumplings, rolls and water to the garden.'
    ),
    prize: words('Ромашка', 'Gänseblümchen', 'Daisy'),
  },
  {
    sticker: 'kite',
    list: ['chips', 'chips', 'water'],
    name: words('За ветром', 'Mit dem Wind', 'Chasing the wind'),
    wish: words(
      'Ветер поднял нашего змея! В рюкзак поместятся два пакета чипсов и вода.',
      'Unser Drachen steigt! Zwei Tüten Chips und Wasser passen in den Rucksack.',
      'Our kite is flying! Two bags of chips and some water fit in the backpack.'
    ),
    prize: words('Бумажный змей', 'Papierdrachen', 'Paper kite'),
  },
  {
    sticker: 'moon',
    list: ['roll', 'roll', 'water'],
    name: words('Ужин под луной', 'Abendbrot im Mondschein', 'Moonlight supper'),
    wish: words(
      'Давай считать звёзды за ужином. Нам нужны две порции роллов и вода.',
      'Zählen wir beim Essen Sterne! Wir brauchen zweimal Sushi und ein Glas Wasser.',
      'Let’s count the stars over supper. We need two servings of rolls and some water.'
    ),
    prize: words('Сонный месяц', 'Schläfriger Mond', 'Sleepy moon'),
  },
  {
    sticker: 'teapot',
    list: ['dumpling', 'dumpling', 'chips'],
    name: words('Гости на пороге', 'Besuch vor der Tür', 'Company at the door'),
    wish: words(
      'Зайчик идёт в гости! Купим две порции пельменей и голубые чипсы.',
      'Der Hase kommt zu Besuch! Holen wir zweimal Teigtaschen und eine Tüte Chips.',
      'Bunny is coming over! Let’s get two tubs of dumplings and a blue bag of chips.'
    ),
    prize: words('Чайник в горошек', 'Pünktchenkanne', 'Dotty teapot'),
  },
  {
    sticker: 'boat',
    list: ['roll', 'chips', 'water', 'water'],
    name: words('Бумажная регата', 'Papierboot-Regatta', 'Paper boat regatta'),
    wish: words(
      'Пустим кораблики по ручью. Неси роллы, чипсы и два стакана воды.',
      'Lassen wir Boote im Bach schwimmen! Bring Sushi, Chips und zwei Gläser Wasser.',
      'Let’s float boats on the stream. Bring rolls, chips and two glasses of water.'
    ),
    prize: words('Кораблик', 'Papierboot', 'Paper boat'),
  },
  {
    sticker: 'cake',
    list: ['dumpling', 'roll', 'chips', 'water'],
    name: words('Праздник во дворе', 'Hoffest', 'Courtyard party'),
    wish: words(
      'Сегодня накроем большой стол! Возьмём по одной порции всего из лавки.',
      'Heute decken wir einen großen Tisch! Von allem im Laden bitte einmal.',
      'Let’s set a big party table! One of everything from the shop, please.'
    ),
    prize: words('Праздничный торт', 'Festtagstorte', 'Party cake'),
  },
] as const satisfies readonly {
  sticker: string
  list: readonly Food[]
  name: Record<Lang, string>
  wish: Record<Lang, string>
  prize: Record<Lang, string>
}[]

export const T = {
  shop: words('Лавка', 'Laden', 'Shop'),
  home: words('Домик', 'Zuhause', 'Home'),
  games: words('Игротека', 'Spielplatz', 'Playroom'),
  album: words('Альбом', 'Album', 'Album'),
  storeName: words('Лавка зайчика', 'Hasenladen', 'Bunny’s shop'),
  homeName: words('У девочки дома', 'Beim Mädchen zu Hause', 'The little girl’s home'),
  catalog: words('Все игры', 'Alle Spiele', 'All games'),
  language: words('Язык', 'Sprache', 'Language'),
  mute: words('Выключить звук', 'Ton ausschalten', 'Mute sound'),
  unmute: words('Включить звук', 'Ton einschalten', 'Turn on sound'),
  wallet: words('Кошелёк', 'Geldbeutel', 'Purse'),
  coins: words('Монеты', 'Münzen', 'Coins'),
  sections: words('Места', 'Orte', 'Places'),
  list: words('Список покупок', 'Einkaufsliste', 'Shopping list'),
  meal: words('Обед', 'Menü', 'Meal'),
  reward: words('Наклейка за обед', 'Sticker fürs Menü', 'Meal sticker'),
  listen: words('Послушать', 'Anhören', 'Listen'),
  basket: words('Корзинка', 'Körbchen', 'Basket'),
  emptyCart: words('Выбери товар на полке', 'Such dir etwas im Regal aus', 'Pick something from a shelf'),
  toTill: words('На кассу', 'Zur Kasse', 'To the till'),
  total: words('Итого', 'Summe', 'Total'),
  add: words('В корзинку', 'Ins Körbchen', 'Add to basket'),
  remove: words('Убрать из корзинки', 'Herausnehmen', 'Remove from basket'),
  added: words('В корзинке!', 'Im Körbchen!', 'In the basket!'),
  removed: words('Вернули на полку.', 'Zurück im Regal.', 'Back on the shelf.'),
  full: words(
    'Корзинка полна. Пора на кассу!',
    'Das Körbchen ist voll. Ab zur Kasse!',
    'Your basket is full. Time for the till!'
  ),
  till: words('Касса', 'Kasse', 'Till'),
  checkout: words('Заячья касса', 'Die Hasenkasse', 'The bunny till'),
  due: words('К оплате', 'Zu zahlen', 'Price'),
  paid: words('На блюдце', 'Im Schälchen', 'On the saucer'),
  left: words('Ещё нужно', 'Es fehlen', 'Still needed'),
  undo: words('Забрать монетку', 'Münze zurücknehmen', 'Take a coin back'),
  exact: words(
    'Точно! Потяни за ручку кассы.',
    'Genau! Zieh den Kassenhebel.',
    'Exactly right! Pull the till lever.'
  ),
  lever: words('Потянуть ручку', 'Hebel ziehen', 'Pull the lever'),
  payPrompt: words(
    'Положи на блюдце ровно столько монет, сколько показывает зайчик.',
    'Lege genau so viel ins Schälchen, wie der Hase anzeigt.',
    'Put the exact amount Bunny shows onto the saucer.'
  ),
  over: words(
    'Эта монетка велика. Попробуй поменьше.',
    'Die Münze ist zu groß. Versuche eine kleinere.',
    'That coin is too big. Try a smaller one.'
  ),
  editCart: words('Вернуться к полкам', 'Zurück zum Regal', 'Back to the shelves'),
  orderPaid: words('Оплачено', 'Schon bezahlt', 'Already paid'),
  leftToServe: words('Осталось подать', 'Das wartet noch', 'Still to serve'),
  earn: words('Заработать монеты', 'Münzen verdienen', 'Earn coins'),
  short: words(
    'Не хватает монет. Корзинка подождёт, пока ты играешь.',
    'Dir fehlen Münzen. Dein Körbchen wartet, während du spielst.',
    'You need more coins. Your basket will wait while you play.'
  ),
  tableWaiting: words(
    'Твой обед уже ждёт!',
    'Dein Essen wartet schon!',
    'Your meal is ready to serve!'
  ),
  goHome: words('К столу', 'Zum Tisch', 'To the table'),
  table: words('На столе', 'Auf dem Tisch', 'On the table'),
  chooseFood: words('Выбери, чем угостить', 'Wähle etwas zum Servieren', 'Choose something to serve'),
  packed: words(
    'Покупки готовы. Что подадим первым?',
    'Der Einkauf ist da! Was möchtest du zuerst servieren?',
    'Everything is unpacked! What would you like to serve first?'
  ),
  tapServe: words(
    'Можно нажать на угощение, а потом на того, кому оно предназначено.',
    'Du kannst auch erst das Essen antippen und dann die Figur, die es bekommen soll.',
    'You can also tap the food, then tap the diner you want to serve.'
  ),
  serve: words('Поднести ко рту', 'Zum Mund führen', 'Bring to her mouth'),
  cut: words('Разрезать пакет', 'Tüte aufschneiden', 'Snip the bag'),
  opened: words(
    'Пакет открыт! Теперь поднеси чипс ко рту.',
    'Die Tüte ist offen! Führe einen Chip zum Mund.',
    'The bag is open! Now bring a chip to her mouth.'
  ),
  helpPour: words('Помочь подержать', 'Beim Halten helfen', 'Help hold the glass'),
  keepHolding: words(
    'Ещё чуть-чуть подержи стакан.',
    'Halte das Glas noch ein wenig.',
    'Hold the glass a little longer.'
  ),
  emptyTable: words(
    'Что сегодня на обед? Загляни в лавку зайчика.',
    'Was gibt es heute? Schau im Hasenladen vorbei.',
    'What’s for lunch today? Let’s visit Bunny’s shop.'
  ),
  toShop: words('В лавку', 'Zum Laden', 'Visit the shop'),
  another: words('Следующий обед', 'Nächstes Menü', 'Next meal'),
  finished: words('Спасибо за обед!', 'Danke fürs Essen!', 'Thank you for lunch!'),
  stickerWon: words('Новая наклейка!', 'Ein neuer Sticker!', 'A new sticker!'),
  fullAlbum: words('Весь альбом собран!', 'Dein Album ist voll!', 'Your album is complete!'),
  freeMeal: words(
    'Всё было вкусно! За обед по списку зайчик даст наклейку.',
    'Das war lecker! Für ein Menü nach Liste gibt dir der Hase einen Sticker.',
    'That was lovely! Bunny has a sticker for a meal from the list.'
  ),
  replayMeal: words(
    'Твоя коллекция растёт. Сыграем ещё?',
    'Deine Sammlung wächst. Noch eine Runde?',
    'Your collection is growing. Another round?'
  ),
  studio: words('Обустроить домик', 'Zuhause gestalten', 'Decorate the house'),
  friend: words('Подружка', 'Freundin', 'My friend'),
  original: words('Девочка Матрёны', 'Matrjonas Mädchen', 'Matryona’s girl'),
  guest: words('Кто за столом?', 'Wer sitzt am Tisch?', 'Who’s at the table?'),
  eyes: words('Глазки', 'Augen', 'Eyes'),
  mouth: words('Ротик', 'Mund', 'Mouth'),
  room: words('Цвет комнаты', 'Zimmerfarbe', 'Room colour'),
  pet: words('Питомец', 'Haustier', 'Pet'),
  cat: words('Кот', 'Kater', 'Cat'),
  dog: words('Собака', 'Hund', 'Dog'),
  none: words('Без питомца', 'Ohne Haustier', 'No pet'),
  back: words('Назад', 'Zurück', 'Back'),
  done: words('Готово', 'Fertig', 'Done'),
  catTalk: words(
    'Мур-р! Я погреюсь рядом.',
    'Schnurr! Hier ist es schön warm.',
    'Purr! It’s nice and warm here.'
  ),
  dogTalk: words(
    'Тяф! Я посижу рядышком.',
    'Wuff! Ich sitze gern bei dir.',
    'Woof! I’ll sit right here with you.'
  ),
  albumTitle: words('Альбом наклеек', 'Stickeralbum', 'Sticker album'),
  albumHint: words(
    'Собери обед по списку и угости всех, кто пришёл. Полученную наклейку можно повесить в домике.',
    'Kaufe nach Liste ein und gib allen etwas zu essen. Deinen Sticker kannst du im Haus aufhängen.',
    'Shop from the list and make sure everyone gets a taste. You can hang the sticker in the house.'
  ),
  locked: words('Ещё не открыта', 'Noch nicht gesammelt', 'Still to collect'),
  hang: words('Повесить в домике', 'Im Haus aufhängen', 'Hang it at home'),
  hung: words('На стене в домике', 'Hängt im Haus', 'On the wall at home'),
  gameTitle: words('Игротека зайчика', 'Hasenspielplatz', 'Bunny’s playroom'),
  gameIntro: words(
    'Помоги зайчику и пополни кошелёк. Корзинка подождёт в лавке.',
    'Hilf dem Hasen und verdiene Münzen. Dein Körbchen wartet im Laden.',
    'Help Bunny and earn coins for your purse. Your basket will wait in the shop.'
  ),
  start: words('Играть', 'Spielen', 'Play'),
  again: words('Ещё раз', 'Noch einmal', 'Play again'),
  playDone: words('Монеты в кошельке!', 'Die Münzen sind im Beutel!', 'Coins in your purse!'),
  orchard: words('Яблочный сад', 'Apfelgarten', 'Apple orchard'),
  caught: words('Яблоко в корзинке!', 'Ein Apfel im Korb!', 'An apple in the basket!'),
  lane: words('Передвинуть корзинку', 'Korb verschieben', 'Move the basket'),
  apples: words('Яблоки', 'Äpfel', 'Apples'),
  jars: words('Звонкие баночки', 'Klingende Gläser', 'Musical jars'),
  jarsIntro: words(
    'Посмотри, какие банки загораются, и сыграй ту же мелодию. Всего три мелодии.',
    'Schau, welche Gläser leuchten, und spiele die Melodie nach. Es gibt drei Melodien.',
    'Watch which jars light up, then play the tune back. There are three tunes.'
  ),
  watch: words('Смотри и слушай…', 'Schau und hör zu …', 'Watch and listen…'),
  yourTurn: words('Теперь твоя мелодия!', 'Jetzt bist du dran!', 'Your turn to play!'),
  listenAgain: words('Повторить мелодию', 'Melodie noch einmal hören', 'Hear the tune again'),
  tryTune: words(
    'Послушаем эту мелодию ещё раз.',
    'Hören wir die Melodie noch einmal.',
    'Let’s hear that tune again.'
  ),
  melody: words('Мелодия', 'Melodie', 'Tune'),
  voice: words('Девочка говорит', 'Das Mädchen sagt', 'The girl says'),
  close: words('Закрыть', 'Schließen', 'Close'),
  changeFriend: words('Выбрать персонажа', 'Figur auswählen', 'Choose a character'),
}
export type TextKey = keyof typeof T
export const COLOURS = [
  words('Мёд', 'Honig', 'Honey'),
  words('Мята', 'Minze', 'Mint'),
  words('Сирень', 'Flieder', 'Lilac'),
]
export const EYES = [
  words('Круглые', 'Rund', 'Round'),
  words('Весёлые', 'Fröhlich', 'Happy'),
  words('Звёздочки', 'Sterne', 'Starry'),
]
export const MOUTHS = [
  words('Улыбка', 'Lächeln', 'Smile'),
  words('Удивление', 'Staunen', 'Surprised'),
  words('Смешинка', 'Kichern', 'Giggle'),
]
export const JARS = [
  words('Клубника', 'Erdbeere', 'Strawberry'),
  words('Лимон', 'Zitrone', 'Lemon'),
  words('Черника', 'Heidelbeere', 'Blueberry'),
]
export const LANES = [
  words('Слева', 'Links', 'Left'),
  words('Посередине', 'Mitte', 'Middle'),
  words('Справа', 'Rechts', 'Right'),
]
