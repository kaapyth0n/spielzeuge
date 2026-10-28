import type { Lang } from './languages'
export type Animal = { id: string; level: number; family: string; role?: 'mother'|'father'|'baby'; name: Record<Lang,string>; sound?: string }
const row = (id:string, level:number, family:string, ru:string,de:string,en:string,sound?:string,role?:Animal['role']):Animal => ({id,level,family,name:{ru,de,en},sound,role})
export const animals:Animal[] = [
row('cat',0,'pet','Кошка','Katze','Cat','cat'),
row('dog',0,'pet','Собака','Hund','Dog','dog'),
row('bird',0,'pet','Волнистый попугайчик','Wellensittich','Budgerigar','bird'),
row('hamster',0,'pet','Хомяк','Hamster','Hamster'),
row('rabbit',0,'pet','Кролик','Kaninchen','Rabbit'),
row('cow',1,'cattle','Корова','Kuh','Cow','cow','mother'),
row('bull',1,'cattle','Бык','Stier','Bull','cow','father'),
row('calf',1,'cattle','Телёнок','Kalb','Calf',undefined,'baby'),
row('goat',1,'goats','Коза','Ziege','Nanny goat','goat','mother'),
row('billy',1,'goats','Козёл','Ziegenbock','Billy goat','goat','father'),
row('kid',1,'goats','Козлёнок','Zicklein','Kid',undefined,'baby'),
row('hen',1,'chickens','Курица','Henne','Hen','hen','mother'),
row('rooster',1,'chickens','Петух','Hahn','Rooster','rooster','father'),
row('chick',1,'chickens','Цыплёнок','Küken','Chick',undefined,'baby'),
row('sow',1,'pigs','Свинья','Sau','Sow','pig','mother'),
row('boar',1,'pigs','Хряк','Eber','Domestic boar','pig','father'),
row('piglet',1,'pigs','Поросёнок','Ferkel','Piglet',undefined,'baby'),
row('ewe',1,'sheep','Овца','Mutterschaf','Ewe','sheep','mother'),
row('ram',1,'sheep','Баран','Widder','Ram','sheep','father'),
row('lamb',1,'sheep','Ягнёнок','Lamm','Lamb',undefined,'baby'),
row('lioness',2,'lions','Львица','Löwin','Lioness',undefined,'mother'),
row('lion',2,'lions','Лев','Löwe','Lion',undefined,'father'),
row('cub',2,'lions','Львёнок','Löwenjunges','Lion cub',undefined,'baby'),
row('doe',2,'deer','Олениха','Hirschkuh','Hind',undefined,'mother'),
row('stag',2,'deer','Олень','Hirsch','Stag',undefined,'father'),
row('fawn',2,'deer','Оленёнок','Hirschkalb','Fawn',undefined,'baby'),
]
export const copy = {
ru:{title:'Пазлы со зверятами',blurb:'Настоящие фотографии. Большие детали. Маленькие открытия.',levels:['Дома','На ферме','В дикой природе'],pieces:'детали',home:'Все игрушки',choose:'Выбери мир',hint:'Выбери деталь, потом её место. Можно перетащить!',done:'Получилось!',next:'Дальше →',again:'Ещё раз',listen:'Послушать',mute:'Звук',on:'Вкл',off:'Выкл',back:'Миры',part:'Деталь',place:'Место',selected:'Теперь выбери место',try:'Попробуй другое место',role:{mother:'Мама',father:'Папа',baby:'Малыш'},reset:'Сначала',resetAsk:'Начать этот мир сначала?',credits:'Фотографии и звуки',voice:'Имя звучит голосом устройства, если он доступен.',noCall:'Здесь слушаем только имя.',loading:'Загружаем фотографию…',error:'Фото не загрузилось. Попробуйте ещё раз.',retry:'Повторить'},
de:{title:'Tierpuzzles',blurb:'Echte Fotos. Große Teile. Kleine Entdeckungen.',levels:['Zu Hause','Auf dem Bauernhof','In der Wildnis'],pieces:'Teile',home:'Alle Spiele',choose:'Wähle eine Welt',hint:'Wähle ein Teil und seinen Platz. Ziehen geht auch!',done:'Geschafft!',next:'Weiter →',again:'Nochmal',listen:'Anhören',mute:'Ton',on:'An',off:'Aus',back:'Welten',part:'Teil',place:'Platz',selected:'Wähle jetzt einen Platz',try:'Versuche einen anderen Platz',role:{mother:'Mama',father:'Papa',baby:'Jungtier'},reset:'Von vorne',resetAsk:'Diese Welt von vorne beginnen?',credits:'Fotos und Klänge',voice:'Die Stimme kommt vom Gerät, falls verfügbar.',noCall:'Hier hören wir nur den Namen.',loading:'Foto wird geladen…',error:'Foto konnte nicht geladen werden. Bitte erneut versuchen.',retry:'Erneut versuchen'},
en:{title:'Animal puzzles',blurb:'Real photographs. Big pieces. Little discoveries.',levels:['At home','On the farm','In the wild'],pieces:'pieces',home:'All toys',choose:'Choose a world',hint:'Choose a piece, then its place. You can drag, too!',done:'You did it!',next:'Next →',again:'Again',listen:'Listen',mute:'Sound',on:'On',off:'Off',back:'Worlds',part:'Piece',place:'Place',selected:'Now choose a place',try:'Try another place',role:{mother:'Mother',father:'Father',baby:'Baby'},reset:'Start over',resetAsk:'Start this world over?',credits:'Photos and sounds',voice:'Names use your device’s voice, when available.',noCall:'Here we listen to the name only.',loading:'Loading photograph…',error:'The photo did not load. Please try again.',retry:'Retry'},
}
// Three pieces: one generous half and two quarter rectangles, never narrow strips.
export const layouts = [
[[0,0,.5,1],[.5,0,.5,1]],
[[0,0,.5,1],[.5,0,.5,.5],[.5,.5,.5,.5]],
[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]],
]
