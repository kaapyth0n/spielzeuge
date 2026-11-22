import { words } from './devochka-copy.ts'
import type { Lang } from './languages.ts'

type Localized = Record<Lang, string>

export interface MealScene {
  id: string
  /** The two indoor lunches use the player's furnished kitchen. */
  background: string | null
  name: Localized
  arrival: Localized
  farewell: Localized
  serveAction: Localized
  guest: 'cat' | 'bunny' | null
  discovery: { art: string; label: Localized; line: Localized }
}

export const MEAL_SCENES = [
  {
    id: 'window',
    background: null,
    name: words('У окошка', 'Am Küchenfenster', 'By the kitchen window'),
    arrival: words(
      'Обед на столе у окошка. Что попробуем первым?',
      'Das Essen steht am Küchenfenster. Was probieren wir zuerst?',
      'Lunch is on the table by the window. What shall we try first?'
    ),
    farewell: words(
      'Спасибо за обед! Солнечный зайчик всё ещё греет стол.',
      'Danke fürs Essen! Der Sonnenfleck wärmt immer noch den Tisch.',
      'Thank you for lunch! The patch of sunshine is still warming the table.'
    ),
    serveAction: words('К окошку', 'Ans Fenster', 'To the window'),
    guest: null,
    discovery: {
      art: 'sun',
      label: words('Солнечный зайчик', 'Sonnenfleck', 'Sunbeam'),
      line: words(
        'Солнечный зайчик прыгнул с окна прямо на стол!',
        'Der Sonnenfleck hüpft vom Fenster auf den Tisch!',
        'The little sunbeam hopped off the window and onto the table!'
      ),
    },
  },
  {
    id: 'picnic',
    background: '/devochka/picnic.webp',
    name: words('Пикник на поляне', 'Picknick auf der Wiese', 'Meadow picnic'),
    arrival: words(
      'Вот он, полосатый плед! Рыжий кот уже ждёт. Разделим с ним пикник!',
      'Da ist die gestreifte Decke! Der rote Kater wartet schon. Teilen wir unser Picknick mit ihm!',
      'There’s the stripy blanket! The ginger cat is waiting. Let’s share our picnic with him!'
    ),
    farewell: words(
      'Спасибо за пикник! На полосатом пледе рыжий кот довольно щурится.',
      'Danke fürs Picknick! Auf der gestreiften Decke blinzelt der Kater zufrieden.',
      'Thank you for the picnic! The ginger cat is blinking happily on the stripy blanket.'
    ),
    serveAction: words('На пикник', 'Zum Picknick', 'To the picnic'),
    guest: 'cat',
    discovery: {
      art: 'basket',
      label: words('Корзинка для пикника', 'Picknickkorb', 'Picnic hamper'),
      line: words(
        'Слышишь, как мурлычет наш кот? Ему досталась самая мягкая полоска пледа.',
        'Hörst du den Kater schnurren? Er hat den weichsten Streifen der Decke gefunden.',
        'Can you hear the cat purring? He found the softest stripe on the blanket.'
      ),
    },
  },
  {
    id: 'garden',
    background: '/devochka/garden.webp',
    name: words('Ромашковый сад', 'Gänseblümchengarten', 'Daisy garden'),
    arrival: words(
      'Мы в саду. Сядем между ромашками и разложим наш обед.',
      'Wir sind im Garten. Setzen wir uns mitten in die Gänseblümchen und packen das Essen aus.',
      'Here’s the garden. Let’s sit among the daisies and unpack our lunch.'
    ),
    farewell: words(
      'Наелись! А ромашки всё тянут белые лепестки к солнышку.',
      'Wir sind satt! Die Gänseblümchen strecken ihre weißen Blüten der Sonne entgegen.',
      'That was lovely! The daisies are stretching their white petals towards the sun.'
    ),
    serveAction: words('В сад', 'In den Garten', 'To the garden'),
    guest: null,
    discovery: {
      art: 'flower',
      label: words('Ромашка', 'Gänseblümchen', 'Daisy'),
      line: words(
        'Погляди на ромашку. Она похожа на крошечное солнышко с белыми лучами!',
        'Schau dir die Blüte an. Sie sieht aus wie eine winzige Sonne mit weißen Strahlen!',
        'Look at that daisy. It’s like a tiny sun with white rays!'
      ),
    },
  },
  {
    id: 'kite',
    background: '/devochka/kite.webp',
    name: words('Ветреный холм', 'Drachenhügel', 'Kite hill'),
    arrival: words(
      'Мы на холме! Змей уже в небе. Здесь хороший ветер и видно всё вокруг.',
      'Wir sind auf dem Hügel! Unser Drachen fliegt schon. Hier weht ein guter Wind.',
      'We made it up the hill! Our kite is flying. There’s a lovely breeze up here.'
    ),
    farewell: words(
      'Обед съеден, а змей всё летает. Посмотри, как высоко!',
      'Das Essen ist aufgegessen und der Drachen fliegt immer noch. Schau, wie hoch!',
      'Lunch is finished and our kite is still flying. Look how high it is!'
    ),
    serveAction: words('На холм', 'Auf den Hügel', 'To the hill'),
    guest: null,
    discovery: {
      art: 'leaf',
      label: words('Лист на ветру', 'Blatt im Wind', 'Leaf on the breeze'),
      line: words(
        'Вжух! Листочек взлетел вслед за змеем. Куда его унесёт ветер?',
        'Hui! Das Blatt fliegt unserem Drachen hinterher. Wohin trägt es der Wind?',
        'Whoosh! The leaf is chasing our kite. Where will the wind carry it?'
      ),
    },
  },
  {
    id: 'moonlight',
    background: '/devochka/moonlight.webp',
    name: words('Звёздная поляна', 'Sternenwiese', 'Starlit clearing'),
    arrival: words(
      'Вот и месяц! При свете фонарика разложим ужин прямо под звёздами.',
      'Da ist der Mond! Im Licht der Laterne packen wir unser Abendessen unter den Sternen aus.',
      'There’s the moon! Let’s unpack supper by lantern light beneath the stars.'
    ),
    farewell: words(
      'Какой тихий ужин. Пожелаем месяцу доброй ночи!',
      'Was für ein stilles Abendessen. Wünschen wir dem Mond eine gute Nacht!',
      'What a peaceful supper. Let’s wish the moon goodnight!'
    ),
    serveAction: words('Под звёзды', 'Unter die Sterne', 'Under the stars'),
    guest: null,
    discovery: {
      art: 'star',
      label: words('Мерцающая звёздочка', 'Funkelnder Stern', 'Twinkling star'),
      line: words(
        'На небе зажглись три большие звезды. Коснись каждой и сосчитай их!',
        'Drei große Sterne leuchten am Himmel. Tippe jeden an und zähle mit!',
        'Three big stars are shining in the sky. Tap each one and count along!'
      ),
    },
  },
  {
    id: 'visit',
    background: null,
    name: words('В гостях у девочки', 'Hasenbesuch', 'Bunny comes to lunch'),
    arrival: words(
      'А вот и зайчик в гостях! Он уже за столом. Угощай и его!',
      'Da ist unser Besuch! Der Hase sitzt schon am Tisch. Gib ihm auch etwas!',
      'Our guest is here! Bunny is sitting at the table. Give him a taste too!'
    ),
    farewell: words(
      '«Спасибо за угощение!» — говорит зайчик и шевелит ушами.',
      '„Danke für das leckere Essen!“, sagt der Hase und wackelt mit den Ohren.',
      '“Thank you for sharing!” says Bunny with a wiggle of his ears.'
    ),
    serveAction: words('К зайчику', 'Zum Hasen', 'Join Bunny'),
    guest: 'bunny',
    discovery: {
      art: 'teapot',
      label: words('Чайник в горошек', 'Pünktchenkanne', 'Dotty teapot'),
      line: words(
        'Зайчик считает горошины на чайнике. Чуть собьётся — и начинает сначала!',
        'Der Hase zählt die Punkte auf der Kanne. Wenn er durcheinanderkommt, fängt er von vorn an!',
        'Bunny is counting the dots on the teapot. Whenever he loses count he starts again!'
      ),
    },
  },
  {
    id: 'regatta',
    background: '/devochka/regatta.webp',
    name: words('На берегу ручья', 'Am Bachufer', 'By the stream'),
    arrival: words(
      'Мы на берегу! Пока кораблики плывут по ручью, разложим обед на траве.',
      'Wir sind am Ufer! Während die Boote im Bach schwimmen, packen wir unser Essen im Gras aus.',
      'Here’s the riverbank! While the boats sail down the stream, let’s unpack lunch on the grass.'
    ),
    farewell: words(
      'Славный получился обед у ручья. Попутного ветра, кораблики!',
      'Das Essen am Bach war schön. Gute Fahrt, ihr kleinen Boote!',
      'What a lovely lunch by the stream. Bon voyage, little boats!'
    ),
    serveAction: words('К ручью', 'Zum Bach', 'To the stream'),
    guest: null,
    discovery: {
      art: 'boat',
      label: words('Бумажный кораблик', 'Papierboot', 'Paper boat'),
      line: words(
        'Ещё один кораблик! Плыви скорее, догоняй друзей!',
        'Noch ein Boot! Schiff ahoi, hol die anderen ein!',
        'Here comes another boat! Sail on, little boat, and catch the others!'
      ),
    },
  },
  {
    id: 'courtyard',
    background: '/devochka/courtyard.webp',
    name: words('Праздничный дворик', 'Hoffest', 'Courtyard party'),
    arrival: words(
      'Флажки уже висят во дворе! Разложим покупки на праздничном столе.',
      'Im Hof hängen schon die Wimpel! Verteilen wir unseren Einkauf auf dem Festtisch.',
      'The bunting is up in the courtyard! Let’s lay everything out on the party table.'
    ),
    farewell: words(
      'Вот это праздник! Спасибо всем, кто накрывал стол во дворе!',
      'Was für ein Fest! Danke an alle, die den Tisch im Hof gedeckt haben!',
      'What a party! Thank you to everyone who set the table in the courtyard!'
    ),
    serveAction: words('На праздник', 'Zum Hoffest', 'To the party'),
    guest: null,
    discovery: {
      art: 'cake',
      label: words('Праздничный сюрприз', 'Festtagsüberraschung', 'Party surprise'),
      line: words(
        'Над столом хлопают флажки. Закрой глаза и загадай желание!',
        'Die Wimpel flattern über uns. Hier im Hof dürfen wir uns etwas wünschen!',
        'The bunting flutters overhead. Out here in the courtyard, we can make a wish!'
      ),
    },
  },
] as const satisfies readonly MealScene[]

export const starLabels = [
  words('Звезда слева', 'Stern links', 'Left star'),
  words('Звезда посередине', 'Stern in der Mitte', 'Middle star'),
  words('Звезда справа', 'Stern rechts', 'Right star'),
]
export const starCounts = [
  words('Одна звезда! Найдём ещё две?', 'Ein Stern! Findest du noch zwei?', 'One star! Can you find two more?'),
  words('Две звезды! Где ещё одна?', 'Zwei Sterne! Wo ist noch einer?', 'Two stars! Where’s one more?'),
  words('Три звезды! Смотри, они сложились в звёздную дорожку. Доброй ночи, месяц!',
    'Drei Sterne! Schau, sie bilden einen kleinen Sternenweg. Gute Nacht, Mond!',
    'Three stars! Look, they’ve made a little star trail. Goodnight, moon!'),
]
export const countAgain = words('Сосчитать снова', 'Noch einmal zählen', 'Count again')
