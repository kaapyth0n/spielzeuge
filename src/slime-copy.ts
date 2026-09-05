import type { Lang } from './languages.ts'

// Russian source phrases are the translation keys. Longer phrases take precedence;
// numeric values and item names can be composed without duplicating whole captions.
export const SLIME_COPY: [string, string, string][] = [
 ['Слайм Чек · игра Вероники','Slime Check · Veronikas Spiel','Slime Check · Veronika’s game'],
 ['Игра Вероники. Заботься, наряжай и тяни!','Veronikas Spiel. Pflegen, verkleiden und dehnen!','Veronika’s game. Care, dress up and stretch!'],
 ['Слайм Чек','Slime Check','Slime Check'],
 ['← Все игры','← Alle Spiele','← All games'],
 ['ПРИДУМАЛА ВЕРОНИКА, 8 ЛЕТ','ERDACHT VON VERONIKA, 8 JAHRE','IMAGINED BY VERONIKA, AGE 8'],
 ['МАЛЕНЬКИЙ ДРУГ · БОЛЬШАЯ ЗАБОТА','KLEINER FREUND · VIEL LIEBE','LITTLE FRIEND · LOTS OF LOVE'],
 ['Заботься. Наряжай. Тя-я-яни!','Pflegen. Verkleiden. De-e-ehnen!','Care. Dress up. Stre-e-etch!'],
 ['Твой маленький мир со слаймом.','Deine kleine Slime-Welt.','Your little world with a slime.'],
 ['Монеты','Münzen','Coins'],['монет','Münzen','coins'],['Комнаты','Zimmer','Rooms'],
 ['Мой слайм','Mein Slime','My slime'],['Ванная','Badezimmer','Bathroom'],['Гардероб','Kleiderschrank','Wardrobe'],['Спальня','Schlafzimmer','Bedroom'],['Прогулка','Spaziergang','Walk'],['Растяжка','Dehnen','Stretch'],
 ['Тс-с… сладкие сны','Psst … träum schön','Shh… sweet dreams'],['На ручках ♡','Auf dem Arm ♡','In your arms ♡'],['Здесь тебе рады','Hier bist du willkommen','You’re welcome here'],
 ['Потяни слайма для рекорда','Zieh den Slime für einen Rekord','Stretch the slime for a record'],['Погладить слайма','Slime streicheln','Pet the slime'],
 ['Потяни слайма в любую сторону и отпусти. Сейчас он может растянуться до','Zieh den Slime in eine Richtung und lass los. Er schafft gerade bis zu','Pull the slime in any direction and let go. Right now it can reach'],
 ['Перетаскивай слайма на руках. Отпустишь внизу — он попадёт в грязь!','Trage den Slime mit der Hand. Lässt du ihn unten los, landet er im Matsch!','Drag the slime in your hands. Let go near the ground and it lands in mud!'],
 ['Выбери цвет, костюм или украшение внизу. Покупки остаются у тебя.','Wähle unten Farbe, Kostüm oder Deko. Gekaufte Dinge bleiben bei dir.','Choose a color, costume or decoration below. Your purchases are yours to keep.'],
 ['Нажми на слайма, чтобы погладить. Ему нравится твоя забота.','Tippe auf den Slime, um ihn zu streicheln. Er freut sich über deine Fürsorge.','Tap the slime to pet it. It loves your care.'],
 ['Как ты, слайм?','Wie geht’s, Slime?','How are you, slime?'],['Лучше всех! Можно ставить рекорды.','Prima! Bereit für neue Rekorde.','Wonderful! Ready for new records.'],['Немного заботы — и я засияю!','Ein bisschen Pflege und ich strahle!','A little care and I’ll shine!'],
 ['Чистота','Sauberkeit','Cleanliness'],['Бодрость','Energie','Energy'],['Радость','Freude','Joy'],['ЛИЧНЫЙ РЕКОРД','PERSÖNLICHER REKORD','PERSONAL BEST'],['Чем счастливее слайм,','Je glücklicher der Slime,','The happier the slime,'],['тем дальше он тянется.','desto weiter dehnt er sich.','the further it stretches.'],['Попробуем?','Versuchen wir’s?','Shall we try?'],
 ['Забота приносит монетки.','Fürsorge bringt Münzen.','Care earns coins.'],['Прогресс сохраняется на устройстве.','Dein Fortschritt bleibt auf diesem Gerät.','Progress is saved on this device.'],['Сделано из воображения Вероники','Aus Veronikas Fantasie','Made from Veronika’s imagination'],['и капельки слайма','und einem Tröpfchen Slime','and a little drop of slime'],
 ['Проснуться','Aufwachen','Wake up'],['Искупать','Baden','Give a bath'],['На ручки','Auf den Arm','Pick up'],['Уложить спать','Schlafen legen','Tuck in'],['Погладить','Streicheln','Pet'],['Погулять на ручках','Auf dem Arm spazieren','Walk in your arms'],['Поднять на ручки','Auf den Arm nehmen','Pick up'],['Пора купаться','Zeit zum Baden','Bath time'],['Потянуть кнопкой','Mit der Taste dehnen','Stretch with a button'],['Отдохнуть дома','Zu Hause ausruhen','Rest at home'],['Поставить на коврик','Auf den Teppich setzen','Put on the rug'],['Взять на ручки','Auf den Arm nehmen','Pick up'],['Спать','Schlafen','Sleep'],
 ['МАЛЕНЬКИЕ СОКРОВИЩА','KLEINE SCHÄTZE','LITTLE TREASURES'],['Немного волшебства для слайма','Ein bisschen Slime-Zauber','A little magic for your slime'],['Украшения для дома меняют спальню, ванную и гардероб.','Die Deko verschönert Schlafzimmer, Bad und Kleiderschrank.','Home decorations change the bedroom, bathroom and wardrobe.'],['Цвета','Farben','Colors'],['Костюмы','Kostüme','Costumes'],['Уют в комнатах','Gemütliche Zimmer','Cozy rooms'],['Надето ✓','Ausgewählt ✓','Selected ✓'],['Выбрать','Auswählen','Choose'],
 ['Мятный','Minze','Mint'],['Ягодный','Beere','Berry'],['Персиковый','Pfirsich','Peach'],['Небесный','Himmelblau','Sky blue'],['Без костюма','Ohne Kostüm','No costume'],['Бантик','Schleife','Bow'],['Корона','Krone','Crown'],['Волшебник','Zauberer','Wizard'],['Уютный дом','Gemütliches Zuhause','Cozy home'],['Цветочный дом','Blumenhaus','Flower home'],['Звёздный дом','Sternenhaus','Star home'],
 ['Привет! Я твой слайм. Давай дружить?','Hallo! Ich bin dein Slime. Wollen wir Freunde sein?','Hello! I’m your slime. Shall we be friends?'],
 ['Играем дальше! Сохранение в этом браузере недоступно.','Spielen wir weiter! Dieser Browser kann gerade nicht speichern.','Let’s keep playing! Saving is unavailable in this browser.'],
 ['Новый рекорд:','Neuer Rekord:','New record:'],['см! Ура-а-а!','cm! Hurra!','cm! Hooray!'],['Растянулись на','Gedehnt auf','Stretched to'],['см! Ещё раз?','cm! Noch einmal?','cm! Again?'],
 ['Уже проснулся? Можно поспать ещё.','Schon wach? Du kannst noch schlafen.','Awake already? You can sleep some more.'],
 ['Мур-мур… то есть, слайм-слайм! ♡','Schnurr … äh, slime-slime! ♡','Purr… I mean, slime-slime! ♡'],
 ['Пузырьки! Я становлюсь чище!','Bläschen! Ich werde sauber!','Bubbles! I’m getting cleaner!'],
 ['Как красиво на улице! Держи меня крепче.','Draußen ist es schön! Halt mich gut fest.','It’s lovely outside! Hold me tight.'],
 ['У тебя такие тёплые ладошки!','Deine Hände sind so warm!','Your hands are so warm!'],['Какой мягкий коврик!','Was für ein weicher Teppich!','What a soft rug!'],
 ['Выспался! Спасибо за уютные сны.','Ausgeschlafen! Danke für die schönen Träume.','All rested! Thanks for the cozy dreams.'],
 ['Сначала возьми меня на ручки — и пойдём гулять!','Nimm mich erst auf den Arm, dann gehen wir spazieren!','Pick me up first, then let’s go for a walk!'],
 ['Тяни меня! Посмотрим, какой я длинный.','Zieh mich! Mal sehen, wie lang ich werde.','Pull me! Let’s see how long I can get.'],['Давай смоем грязь и листочки!','Waschen wir Matsch und Blätter ab!','Let’s wash off the mud and leaves!'],['Моя мягкая кроватка…','Mein weiches Bettchen …','My soft little bed…'],['Какой наряд выберем сегодня?','Welches Outfit nehmen wir heute?','Which outfit shall we choose today?'],['Как же хорошо быть вместе!','Zusammen ist es so schön!','It’s so nice to be together!'],['Мне очень нравится! ♡','Das gefällt mir sehr! ♡','I love it! ♡'],
 ['Плюх! Прилипли грязь и листочки. Пойдём в ванную?','Platsch! Matsch und Blätter kleben an mir. Gehen wir ins Bad?','Splat! Mud and leaves stuck to me. Shall we go to the bathroom?'],
 ['Смотри, Мира и Облачко! Спросим, можно ли поиграть?','Schau, Mira und Wölkchen! Fragen wir, ob wir mitspielen dürfen?','Look, Mira and Cloud! Shall we ask to play?'],
 ['Обнять малыша Капельку','Tröpfchen umarmen','Hug little Droplet'],['Встреча на прогулке','Begegnung im Park','Meeting in the park'],['ДРУЗЬЯ НА ПОЛЯНКЕ','FREUNDE AUF DER WIESE','FRIENDS IN THE MEADOW'],['Мира и её слайм Облачко','Mira und ihr Slime Wölkchen','Mira and her slime Cloud'],['Мира — хозяйка Облачка. Давайте познакомимся!','Wölkchen gehört zu Mira. Lernen wir sie kennen!','Mira looks after Cloud. Let’s meet them!'],['дружба','Freundschaft','friendship'],
 ['Можно поиграть вместе?','Dürfen wir zusammen spielen?','May we play together?'],['Мира разрешила поиграть','Mira hat Spielen erlaubt','Mira said we can play'],['Передать мяч Облачку','Wölkchen den Ball zuspielen','Pass the ball to Cloud'],['Поиграть в мяч','Ball spielen','Play ball'],
 ['Облачко: «Привет, наша Капелька!»','Wölkchen: „Hallo, kleines Tröpfchen!“','Cloud: “Hello, our little Droplet!”'],
 ['Оба слайма хотят подарить по крошечке себя. Это совсем не больно!','Beide Slimes möchten ein winziges Stück von sich schenken. Das tut gar nicht weh!','Both slimes want to give a tiny piece of themselves. It doesn’t hurt at all!'],
 ['Мой слайм дарит кусочек','Mein Slime schenkt ein Stückchen','My slime gives a little piece'],['Облачко дарит кусочек','Wölkchen schenkt ein Stückchen','Cloud gives a little piece'],['Подаренные кусочки','Geschenkte Stückchen','Donated pieces'],['Пока не будем','Jetzt lieber nicht','Not right now'],['Хотите сделать малыша?','Möchtet ihr ein Baby machen?','Would you like to make a baby?'],
 ['Да, я хочу подарить кусочек!','Ja, ich möchte ein Stückchen schenken!','Yes, I want to give a little piece!'],['Давай сначала подружимся.','Lass uns erst Freunde werden.','Let’s become friends first.'],['Сначала хочу отдохнуть, умыться и порадоваться.','Ich möchte mich erst ausruhen, waschen und fröhlich sein.','First I want to rest, wash and feel happy.'],['Я тоже хочу подарить кусочек!','Ich möchte auch ein Stückchen schenken!','I want to give a little piece too!'],['Давай ещё поиграем и узнаем друг друга.','Lass uns noch spielen und uns kennenlernen.','Let’s play some more and get to know each other.'],['Я устал. Давай встретимся на следующей прогулке.','Ich bin müde. Treffen wir uns beim nächsten Spaziergang.','I’m tired. Let’s meet on the next walk.'],
 ['Пас! Облачко ловит мяч и отправляет его обратно. Как весело!','Pass! Wölkchen fängt den Ball und spielt ihn zurück. Das macht Spaß!','Pass! Cloud catches the ball and sends it back. What fun!'],['Кто-то устал. Отдохнём и встретимся на следующей прогулке!','Jemand ist müde. Ruhen wir uns aus und treffen uns beim nächsten Spaziergang!','Someone is tired. Let’s rest and meet on the next walk!'],
 ['Мой слайм: «Да!» Облачко: «И я хочу!» Подарим по крошечке?','Mein Slime: „Ja!“ Wölkchen: „Ich möchte auch!“ Schenken wir je ein Stückchen?','My slime: “Yes!” Cloud: “I want to as well!” Shall we give a little piece each?'],['Спросим каждого слайма. Ответы — под полянкой.','Fragen wir beide Slimes. Ihre Antworten stehen unter der Wiese.','Let’s ask each slime. Their answers are below the meadow.'],
 ['Две крошечки соединились! Привет, малышка Капелька! ♡','Zwei Stückchen sind zusammengekommen! Hallo, kleines Tröpfchen! ♡','Two little pieces joined together! Hello, baby Droplet! ♡'],['Первая крошечка готова. Теперь подарок Облачка!','Das erste Stückchen ist da. Jetzt ist Wölkchen dran!','The first little piece is ready. Now for Cloud’s gift!'],['Давай сначала снова спросим обоих слаймов.','Fragen wir erst noch einmal beide Slimes.','Let’s ask both slimes again first.'],['Хорошо! Можно просто дружить и играть.','Gut! Wir können einfach Freunde sein und spielen.','Okay! We can just be friends and play.'],['Капелька: «Пи-пи! Обнимаю!» ♡','Tröpfchen: „Piep-piep! Eine Umarmung!“ ♡','Droplet: “Peep-peep! Hugs!” ♡'],
 ['Мира: «Конечно! Облачко тоже хочет поиграть. Я буду рядом».','Mira: „Natürlich! Wölkchen möchte auch spielen. Ich bleibe hier.“','Mira: “Of course! Cloud wants to play too. I’ll be right here.”'],['Мира: «Сначала смойте грязь, а потом приходите играть. Мы подождём!»','Mira: „Wascht erst den Matsch ab und kommt dann zum Spielen. Wir warten!“','Mira: “Wash off the mud first, then come and play. We’ll wait!”'],['Мира: «Твой слайм устал. Пусть поспит, а потом поиграем!»','Mira: „Dein Slime ist müde. Lass ihn schlafen, dann spielen wir!“','Mira: “Your slime is tired. Let it sleep, then we’ll play!”'],
 ['Капелька','Tröpfchen','Droplet'],['Облачко','Wölkchen','Cloud'],['Мира','Mira','Mira'],
 ['Можно играть вместе','Wir dürfen zusammen spielen','We can play together'],
 ['Пройти дальше','Weitergehen','Walk further'],
 ['Давайте познакомимся!','Lernen wir uns kennen!','Let’s get to know each other!'],
 ['Привет, маленькая Капелька!','Hallo, kleines Tröpfchen!','Hello, little Droplet!'],
 ['Приятно снова встретиться!','Schön, dich wiederzusehen!','Lovely to see you again!'],
 ['Язык','Sprache','Language'],['Звук включён','Ton an','Sound on'],['Звук выключен','Ton aus','Sound off'],['Повторить сообщение','Nachricht wiederholen','Repeat message'],['см','cm','cm'],
]
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const entries = new Map(SLIME_COPY.map(row => [row[0], row]))
const pattern = new RegExp([...entries.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|'), 'g')
export function slimeText(text: string, lang: Lang): string {
 return lang === 'ru' ? text : text.replace(pattern, key => entries.get(key)![lang === 'de' ? 1 : 2])
}
export function localizeSlime(root: HTMLElement, lang: Lang, personalize: (text: string) => string = text => text): void {
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
 while(walker.nextNode()) { const node=walker.currentNode; node.textContent=personalize(slimeText(node.textContent ?? '',lang)) }
 root.querySelectorAll<HTMLElement>('[aria-label], [title]').forEach(node => {
  for(const attr of ['aria-label','title']) if(node.hasAttribute(attr)) node.setAttribute(attr,personalize(slimeText(node.getAttribute(attr)!,lang)))
 })
}
