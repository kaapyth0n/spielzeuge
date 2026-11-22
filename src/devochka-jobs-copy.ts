import { T, type TextKey } from './devochka-copy.ts'
import type { Lang } from './languages.ts'

const line = (ru: string, de: string, en: string) => ({ ru, de, en })

const jobs = {
  orchardIntro: line(
    'Лови яблоко, нарисованное на заказе. Смотри, куда ветер несёт плод. Собери шесть яблок для компота.',
    'Fang den Apfel auf der Bestellkarte. Achte darauf, wohin der Wind ihn trägt. Sammle sechs Äpfel fürs Kompott.',
    'Catch the apple on the order card. Watch where the wind carries it. Collect six apples for the fruit pot.'
  ),
  red: line('Полосатое', 'Gestreift', 'Striped'),
  gold: line('Со звёздочкой', 'Sternapfel', 'Star apple'),
  wind: line('Ветер!', 'Windstoß!', 'Gust!'),
  missedFruit: line(
    'Улетело мимо. Следующее упадёт помедленнее.',
    'Vorbei! Der nächste Apfel fällt langsamer.',
    'It rolled past. The next apple will fall more slowly.'
  ),
  wrongFruit: line(
    'Это другой сорт. Посмотри на рисунок в заказе.',
    'Das war die andere Sorte. Schau auf die Bestellkarte.',
    'That was the other kind. Check the picture on the order.'
  ),
  recipe: line('Заказ', 'Bestellung', 'Order'),
  orchardThanks: line(
    'Шесть яблок в корзинке! Зайчику хватит на целую кастрюлю компота.',
    'Sechs Äpfel im Korb! Damit kann der Hase einen ganzen Topf Kompott kochen.',
    'Six apples in the basket! Bunny has enough for a whole pot of stewed apples.'
  ),
  jarsThanks: line(
    'Все три мелодии прозвенели! Зайчик хлопает в ладоши.',
    'Alle drei Melodien sind erklungen! Der Hase klatscht in die Pfoten.',
    'You played all three tunes! Bunny claps his paws.'
  ),
  bakery: line('Блинная у зайчика', 'Hasen-Café', 'Bunny’s pancake kitchen'),
  bakeryIntro: line(
    'Налей тесто. Когда блин станет золотистым, переверни его и добавь начинку с картинки. Угости троих гостей.',
    'Gieße Teig in die Pfanne. Wende den goldenen Pfannkuchen und gib den gewünschten Belag darauf. Backe für drei Gäste.',
    'Pour the batter. Flip the pancake when it turns golden, then add the topping on the order. Cook for three guests.'
  ),
  pourBatter: line('Налить тесто', 'Teig eingießen', 'Pour batter'),
  flip: line('Перевернуть', 'Wenden', 'Flip'),
  freshBatter: line('Новый блин', 'Neuer Pfannkuchen', 'Fresh pancake'),
  waitPan: line(
    'Тесто ещё светлое. Подожди золотой корочки!',
    'Der Teig ist noch blass. Warte auf die goldene Kruste!',
    'Still pale. Wait for a golden crust!'
  ),
  goldPan: line('Золотистый! Переворачивай!', 'Goldbraun! Jetzt wenden!', 'Golden! Flip it now!'),
  overPan: line(
    'Этот хрустящий! Давай испечём ещё один на тихом огне.',
    'Der ist knusprig! Versuch es noch einmal bei kleiner Hitze.',
    'That one is crispy! Try another on a gentler heat.'
  ),
  pantry: line('Выбери начинку', 'Wähle den Belag', 'Choose a topping'),
  wrongTopping: line(
    'Гость заказал другую начинку. Загляни в заказ.',
    'Der Gast möchte einen anderen Belag. Schau auf die Bestellung.',
    'Our guest wanted something else. Check the order.'
  ),
  honey: line('Мёд', 'Honig', 'Honey'),
  raspberry: line('Малина', 'Himbeeren', 'Raspberries'),
  blueberry: line('Черника', 'Heidelbeeren', 'Blueberries'),
  guest: line('Гость', 'Gast', 'Guest'),
  served: line(
    'Готово! Блин отправляется к гостю.',
    'Fertig! Der Pfannkuchen kommt zum Gast.',
    'Ready! A pancake for our guest.'
  ),
  bakeryThanks: line(
    'Каждому гостю достался блин с любимой начинкой!',
    'Jeder Gast hat einen Pfannkuchen mit seinem Lieblingsbelag bekommen!',
    'Each guest got a pancake with their favourite topping!'
  ),
  regatta: line('Бумажная регата', 'Papierboot-Regatta', 'Paper boat regatta'),
  regattaIntro: line(
    'Поворачивай кусочки речки. Соедини пристань слева с флажком справа и пусти кораблик. Впереди три причала.',
    'Drehe die Flussstücke. Verbinde den Anleger links mit der Zielflagge rechts und lass das Boot los. Drei Anleger warten.',
    'Turn the river tiles. Join the dock on the left to the flag on the right, then launch the boat. Visit three docks.'
  ),
  launch: line('Пустить кораблик', 'Boot loslassen', 'Launch the boat'),
  afloat: line('Плывём!', 'Leinen los!', 'Sailing!'),
  shoal: line(
    'Здесь ручеёк прервался. Поверни отмеченный кусочек.',
    'Hier ist der Bach unterbrochen. Drehe das markierte Stück.',
    'The stream stops here. Turn the marked tile.'
  ),
  docked: line(
    'Причал! Отправляемся к следующему флажку.',
    'Angelegt! Weiter zur nächsten Flagge.',
    'Docked! Let’s find the next flag.'
  ),
  regattaThanks: line(
    'Кораблик добрался до третьего причала. Регата завершена!',
    'Das Boot ist am dritten Anleger angekommen. Die Regatta ist geschafft!',
    'The boat reached the third dock. The regatta is complete!'
  ),
  course: line('Причал', 'Anleger', 'Dock'),
  tile: line('Участок реки', 'Flussstück', 'River tile'),
  north: line('вверх', 'oben', 'up'),
  east: line('вправо', 'rechts', 'right'),
  south: line('вниз', 'unten', 'down'),
  west: line('влево', 'links', 'left'),
  startDock: line('Старт', 'Start', 'Start'),
  endDock: line('Финиш', 'Ziel', 'Finish'),
}

export type JobWord = TextKey | keyof typeof jobs
export function jobText(key: JobWord, lang: Lang): string {
  return key in jobs ? jobs[key as keyof typeof jobs][lang] : T[key as TextKey][lang]
}
