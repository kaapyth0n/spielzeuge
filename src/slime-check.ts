import './slime-check.css'
import { babyName, cleanBabyName } from './slime-names.ts'
import { visitorById, visitorText } from './slime-visitors.ts'
import { loadLang, saveLang, type Lang } from './languages.ts'
import { slimeText, localizeSlime } from './slime-copy.ts'
import { PuppyNarration } from './sobachka-narration.ts'
import { SlimeAudio, type SlimeSound } from './slime-audio.ts'
import { ITEMS, restore, care, buy, stretchLimit, newMeeting, nextMeeting, friendshipWith, askOwner, playTogether, wishes, askSlimes, givePiece } from './slime-state.ts'
const KEY = 'spielzeuge.slime-check.v1'
let state = restore(null)
try { state = restore(localStorage.getItem(KEY)) } catch { /* playable without storage */ }
let lang = loadLang()
saveLang(lang)
const narration = new PuppyNarration(() => ({ lang, enabled: state.sound }))
const audio = new SlimeAudio(() => state.sound)
const spoken = (text: string) => text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D♡✧✦↔☾☀✓↗◌]/gu, '').replace(/\s+/g,' ').trim()
function beginSpeech(label: string) { narration.begin(spoken(label)) }
let room = 'home', held = false, sleeping = false, sleepTimer = 0
let meeting = newMeeting()
let votesVisible = false
let editingBaby: number | null = null
let nameDraft = ''
let messageBaby = 0
let message = 'Привет! Я твой слайм. Давай дружить?'
const root = document.querySelector<HTMLDivElement>('#app')!
const rooms = [['home','♡','Мой слайм'],['bath','🛁','Ванная'],['closet','🎀','Гардероб'],['bed','☾','Спальня'],['outside','☀','Прогулка'],['stretch','↔','Растяжка']]
const item = (id: string) => ITEMS.find(i => i.id === id)!
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { message = 'Играем дальше! Сохранение в этом браузере недоступно.' } }
function slime() { return `<svg viewBox="0 0 300 270" aria-hidden="true"><defs><radialGradient id="jelly" cx="35%" cy="23%" r="80%"><stop stop-color="#edfff4"/><stop offset=".45" stop-color="${item(state.color).value}"/><stop offset="1" stop-color="${item(state.color).value}" stop-opacity=".86"/></radialGradient></defs><path class="jelly" d="M150 63 C183 16 218 12 225 43 C231 62 216 87 228 99 C246 112 285 122 278 151 C272 174 225 165 218 187 C215 214 228 247 196 253 C172 259 160 222 143 221 C120 221 91 259 68 241 C45 224 73 192 65 177 C57 164 13 172 16 143 C18 119 67 116 78 100 C93 81 71 48 96 36 C120 23 132 56 150 63Z" fill="url(#jelly)" stroke="${item(state.color).value}" stroke-width="3"/><path d="M101 58 Q114 51 124 69 M41 141 Q55 131 67 133" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" opacity=".65"/><g fill="#344c46">${sleeping ? '<path d="M110 129q10 12 20 0M168 129q10 12 20 0" fill="none" stroke="#344c46" stroke-width="5" stroke-linecap="round"/>' : '<ellipse cx="120" cy="131" rx="6" ry="10"/><ellipse cx="178" cy="131" rx="6" ry="10"/>'}</g><ellipse cx="99" cy="151" rx="15" ry="8" fill="#f6a9b8" opacity=".65"/><ellipse cx="198" cy="151" rx="15" ry="8" fill="#f6a9b8" opacity=".65"/><path d="M135 151 Q150 169 165 151" fill="none" stroke="#344c46" stroke-width="4" stroke-linecap="round"/>${state.clean < 85 ? `<g class="dirt" fill="#947650" opacity="${(100-state.clean)/100}"><ellipse cx="84" cy="174" rx="23" ry="12"/><ellipse cx="208" cy="106" rx="18" ry="10"/><circle cx="178" cy="204" r="12"/></g><text x="205" y="100" font-size="32">🍃</text>` : ''}<text x="122" y="75" font-size="54">${item(state.costume).value}</text></svg>` }
function sceneArt() { return `<svg class="room-art" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="wall" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.5" fill="#b9afb7" opacity=".22"/></pattern></defs><path fill="${room === 'outside' ? '#e2f1e4' : room === 'bath' ? '#e5f0ee' : '#f3eae6'}" d="M0 0h900v480H0z"/><path fill="url(#wall)" d="M0 0h900v340H0z"/><path fill="${room === 'outside' ? '#c6dba5' : '#e5d7c7'}" d="M0 340h900v140H0z"/><path d="M0 340h900" stroke="#d5c7b7" stroke-width="8"/>
${room === 'outside' ? '<circle cx="700" cy="80" r="42" fill="#ffe4a0"/><path d="M0 330Q150 150 350 330Q650 130 900 330" fill="#bad2a7"/><ellipse cx="610" cy="419" rx="95" ry="23" fill="#a88a6c"/><text x="90" y="350" font-size="60">🌷</text>' : '<rect x="348" y="45" width="200" height="182" rx="90" fill="#d8caba"/><rect x="359" y="56" width="178" height="158" rx="79" fill="#d1e5e5"/><circle cx="476" cy="97" r="23" fill="#fff3c3"/><path d="M360 181q45-43 89 0q50-62 87-6v38H360" fill="#b3c7aa"/><path d="M448 57v159M360 151h176" stroke="#fffaf0" stroke-width="9"/><rect x="336" y="216" width="224" height="12" rx="6" fill="#c2ab91"/><path d="M90 340v-57h53v57" fill="#c8997d"/><path d="M115 288v-75m0 39q-50-55-39-68q47-2 39 68m0 13q51-66 56-39q-4 36-56 39" fill="#8cab8c" stroke="#789a7c" stroke-width="3"/><rect x="661" y="133" width="150" height="10" rx="5" fill="#c3aa8f"/><path d="M683 132v-44h20v44m8 0V79h16v53" fill="#baa6c9"/><rect x="750" y="99" width="29" height="33" rx="8" fill="#b2c3a0"/>'}
${room === 'bath' ? '<path d="M283 330h333l-25 96H310Z" fill="#fcfffc" stroke="#bdcece" stroke-width="5"/><ellipse cx="450" cy="330" rx="167" ry="23" fill="#bfe4e7"/><path d="M587 321v-88q0-30-35-23" fill="none" stroke="#9aabb7" stroke-width="12"/>' : room === 'bed' ? '<rect x="244" y="306" width="405" height="119" rx="22" fill="#b49c83"/><rect x="256" y="306" width="380" height="90" rx="20" fill="#c3b1da"/><rect x="267" y="313" width="97" height="65" rx="20" fill="#fff8e9"/><path d="M273 423v23m344-23v23" stroke="#a58c72" stroke-width="13"/>' : '<ellipse cx="450" cy="403" rx="210" ry="49" fill="#c4b3d1" opacity=".5"/><ellipse cx="450" cy="403" rx="189" ry="37" fill="none" stroke="#f9f3ed" stroke-width="2" opacity=".7"/>'}
<text x="680" y="290" font-size="55">${item(state.decor).value}</text><text x="180" y="110" font-size="34">${item(state.decor).value}</text></svg>` }
function littleSlime(color: string, baby = false, secondColor = '#a8d6ef') {
 return `<svg viewBox="0 0 160 145" aria-hidden="true"><path d="M80 28C104 0 128 18 117 47C157 43 171 78 133 91C151 126 120 150 92 120C69 156 36 145 40 109C1 121-5 82 29 67C4 36 42 13 62 37Z" fill="${color}" stroke="#fff9" stroke-width="3"/>${baby?`<path d="M80 28C104 0 128 18 117 47C157 43 171 78 133 91C151 126 120 150 92 120Z" fill="${secondColor}" opacity=".65"/>`:''}<ellipse cx="61" cy="75" rx="4" ry="6" fill="#46545c"/><ellipse cx="98" cy="75" rx="4" ry="6" fill="#46545c"/><path d="M72 89q8 10 16 0" fill="none" stroke="#46545c" stroke-width="3" stroke-linecap="round"/><ellipse cx="48" cy="89" rx="9" ry="5" fill="#f5aebb"/><ellipse cx="111" cy="89" rx="9" ry="5" fill="#f5aebb"/></svg>`
}
function companions() {
 const visitor=visitorById(meeting.visitor)
 return `${room==='outside'?`<div class="park-friends"><span class="owner" aria-hidden="true">${visitor.avatar}</span><span class="owner-label">Мира</span><div class="cloud-slime">${littleSlime(visitor.color)}<span class="visitor-accessory">${visitor.accessory}</span></div><span>Облачко</span></div><span class="play-ball" aria-hidden="true">⚽</span>`:''}${babyCompanions()}`
}
function babyCompanions() {
 if(room==='stretch'||!state.babies.length) return ''
 const indices=state.companion==='all'?state.babies.map((_,index)=>index):[state.companion]
 const buttons=indices.map(index=>{const baby=state.babies[index];return `<button class="baby-slime" data-action="cuddle" data-baby="${index}" aria-label="Обнять малыша">${littleSlime(item(baby.color).value,true,visitorById(baby.parent).color)}<span data-baby-name="${index}"></span></button>`}).join('')
 return state.companion==='all'?`<div class="baby-parade" aria-label="Все малыши рядом" tabindex="0">${buttons}</div>`:buttons
}
function encounter() {
 if(room!=='outside') return ''
 const [mine, friend] = wishes(state,meeting)
 const visitor=visitorById(meeting.visitor), bond=friendshipWith(state,meeting)
 return `<section class="encounter" data-visitor="${meeting.visitor}" aria-label="Встреча на прогулке"><div><p class="eyebrow">ДРУЗЬЯ НА ПОЛЯНКЕ</p><h2>Мира · Облачко</h2><p>${visitor.intro[lang]}</p><p>${bond?'Приятно снова встретиться!':'Давайте познакомимся!'}</p><p class="friendship">${'♥'.repeat(bond)}${'♡'.repeat(3-bond)} <span>${bond}/3 · дружба</span></p></div><div class="meeting-actions"><div class="baby-guide"><h3>${state.babies.length?'Как сделать ещё одного малыша':'Как сделать малыша'}</h3><p>1. Спроси разрешение играть.</p><p>2. Подружитесь: три сердечка.</p><p>3. Спросите обоих слаймов, хотят ли они малыша.</p><p>4. Каждый дарит по кусочку — малыш готов!</p><p>${state.clean<60?'Нужно умыться. ':''}${state.energy<50||meeting.friendEnergy<50?'Нужно отдохнуть вместе. ':''}${state.joy<75?'Нужно ещё поиграть или погладить слайма.':''}</p></div>${!meeting.permission?'<button class="primary" data-action="ask-owner">Можно поиграть вместе?</button>':`<p class="permission">✓ Можно играть вместе</p><button data-action="rest-friends">☾ Отдохнуть вместе</button><button class="primary" data-action="play-friend">⚽ ${bond?'Передать мяч Облачку':'Поиграть в мяч'}</button>${meeting.agreed?`<p>Оба слайма хотят подарить по крошечке себя. Это совсем не больно!</p><button data-action="give-piece">${meeting.pieces===0?'✧ Мой слайм дарит кусочек':'✧ Облачко дарит кусочек'}</button><div class="pieces" aria-label="Подаренные кусочки">${meeting.pieces?`<i style="background:${item(state.color).value}"></i> + ◌`:'◌ + ◌'}</div><button data-action="later">Пока не будем</button>`:`<button class="primary" data-action="ask-slimes">♡ ${state.babies.length?'Ещё один малыш':'Хотите сделать малыша?'}</button>${votesVisible?`<div class="wishes" role="status"><p>Мой слайм: «${mine?'Да, я хочу подарить кусочек!':bond<3?'Давай сначала подружимся.':'Сначала хочу отдохнуть, умыться и порадоваться.'}»</p><p>Облачко: «${friend?'Я тоже хочу подарить кусочек!':bond<3?'Давай ещё поиграем и узнаем друг друга.':'Я устал. Давай встретимся на следующей прогулке.'}»</p></div>`:''}`}`}</div></section>`
}
function family() {
 if(!state.babies.length) return ''
 return `<section class="slime-family" aria-label="Семья слаймов"><h2>Наши малыши · ${state.babies.length}</h2><p>Нажми на малыша, чтобы обнять. На прогулке можно сделать ещё одного!</p><div class="family-choice"><button data-companion="all" aria-pressed="${state.companion==='all'}">♡ Все вместе</button><p>Выбери, кто стоит рядом. Большой ряд малышей можно листать.</p></div><div class="family-grid">${state.babies.map((baby,index)=>`<div class="family-card"><button class="family-baby" data-action="cuddle" data-baby="${index}" aria-label="Обнять малыша">${littleSlime(item(baby.color).value,true,visitorById(baby.parent).color)}<b data-baby-name="${index}"></b><small>♡ ${baby.cuddles}</small></button><button class="choose-baby" data-companion="${index}" aria-pressed="${state.companion===index}">${state.companion===index?'✓ Сейчас рядом':'Рядом со мной'}</button>${editingBaby===index?`<form class="baby-name-form" data-name-form="${index}"><label for="baby-name-input">Имя малыша</label><input id="baby-name-input" name="baby-name" maxlength="32" required autocomplete="off"><div><button type="submit">Сохранить имя</button><button type="button" data-cancel-name>Отмена</button></div><p class="name-error" role="status"></p></form>`:`<button class="rename-baby" data-rename="${index}">✎ Изменить имя</button>`}</div>`).join('')}</div></section>`
}
function render() {
 const limit = stretchLimit(state)
 root.innerHTML = `<main class="shell"><header><a href="/" class="back">← Все игры</a><span class="edition">ПРИДУМАЛА ВЕРОНИКА, 8 ЛЕТ</span><div class="settings"><button id="slime-sound" aria-label="${state.sound?'Звук включён':'Звук выключен'}" aria-pressed="${state.sound}">${state.sound?'🔊':'🔇'}</button><select id="slime-language" aria-label="Язык">${(['ru','de','en'] as Lang[]).map(l=>`<option value="${l}" ${l===lang?'selected':''}>${l.toUpperCase()}</option>`).join('')}</select></div><span class="coin" aria-label="Монеты">✦ <b>${state.coins}</b> <small>монет</small></span></header><div class="title-row"><div><p class="eyebrow">МАЛЕНЬКИЙ ДРУГ · БОЛЬШАЯ ЗАБОТА</p><h1>Слайм Чек<span>✳</span></h1></div><p class="intro">Заботься. Наряжай. Тя-я-яни!<br>Твой маленький мир со слаймом.</p></div><nav aria-label="Комнаты">${rooms.map(([id,icon,name])=>`<button data-room="${id}" aria-pressed="${room===id}"><span>${icon}</span>${name}</button>`).join('')}</nav><div class="game-grid"><section class="play"><div class="scene-heading"><span>${rooms.find(r=>r[0]===room)![2]}</span><span class="room-note">${sleeping ? 'Тс-с… сладкие сны' : held ? 'На ручках ♡' : 'Здесь тебе рады'}</span></div><div class="scene ${room} ${state.companion==='all'&&state.babies.length&&room!=='stretch'?'baby-group':''} ${sleeping?'sleeping':''}" id="scene">${sceneArt()}${companions()}<div class="speech" role="status" aria-live="polite" tabindex="0" aria-label="Повторить сообщение">${sleeping ? 'Z z z …' : message}</div><button id="slime" class="slime ${held?'held':''}" aria-label="${room==='stretch'?'Потяни слайма для рекорда':'Погладить слайма'}">${slime()}</button>${held?'<div class="hands" aria-hidden="true">🤲</div>':''}<div id="stretch-value" class="stretch-value" ${room==='stretch'?'':'hidden'}>↔ <b>0</b> см</div></div><div class="actions">${actions()}</div><p class="hint">${room==='stretch' ? `Потяни слайма в любую сторону и отпусти. Сейчас он может растянуться до ${limit} см.` : room==='outside' ? 'Перетаскивай слайма на руках. Отпустишь внизу — он попадёт в грязь!' : room==='closet' ? 'Выбери цвет, костюм или украшение внизу. Покупки остаются у тебя.' : 'Нажми на слайма, чтобы погладить. Ему нравится твоя забота.'}</p></section><aside><div class="friend-card"><span class="mini-flower">✳</span><h2>Как ты, слайм?</h2><p>${Math.min(state.clean,state.energy,state.joy)>=85?'Лучше всех! Можно ставить рекорды.':'Немного заботы — и я засияю!'}</p>${[['clean','💧','Чистота'],['energy','☾','Бодрость'],['joy','♡','Радость']].map(([key,icon,name])=>`<div class="stat"><div><span>${icon} ${name}</span><b>${state[key as 'clean'|'energy'|'joy']}%</b></div><meter min="0" max="100" value="${state[key as 'clean'|'energy'|'joy']}" aria-label="${name}"></meter></div>`).join('')}</div><div class="record-card"><span>✧ ЛИЧНЫЙ РЕКОРД</span><strong>${state.record}<small> см</small></strong><p>Чем счастливее слайм,<br>тем дальше он тянется.</p><button data-room="stretch">Попробуем? ↗</button></div><p class="save-note">♡ Забота приносит монетки.<br> Прогресс сохраняется на устройстве.</p></aside></div>${encounter()}${family()}${room==='closet'?shop():''}<footer>Сделано из воображения Вероники <span>✳</span> и капельки слайма</footer></main>`
 document.documentElement.lang=lang
 document.body.dataset.lang=lang
 document.title=slimeText('Слайм Чек · игра Вероники',lang)
 document.querySelector('meta[name="description"]')?.setAttribute('content',slimeText('Игра Вероники. Заботься, наряжай и тяни!',lang))
 localizeSlime(root,lang,text=>visitorText(text,lang,meeting.visitor))
 root.querySelectorAll<HTMLElement>('[data-baby-name]').forEach(node=>{const index=Number(node.dataset.babyName);node.textContent=babyName(state.babies[index],index,lang)})
 root.querySelectorAll<HTMLElement>('[data-action="cuddle"]').forEach(node=>{const index=Number(node.dataset.baby??0);node.setAttribute('aria-label',slimeText('Обнять малыша',lang)+' '+babyName(state.babies[index],index,lang))})
 const speechNode=root.querySelector<HTMLElement>('.speech')!
 if(state.babies[messageBaby]) speechNode.textContent=(speechNode.textContent??'').replace('{{baby}}',babyName(state.babies[messageBaby],messageBaby,lang))
 const input=root.querySelector<HTMLInputElement>('#baby-name-input')
 if(input&&editingBaby!==null) input.value=nameDraft

 bind()
 narration.announce([spoken(root.querySelector('.speech')?.textContent ?? '')])
}
function actions() {
 if(sleeping) return '<button class="primary" data-action="wake">☀ Проснуться</button>'
 if(room==='bath') return '<button class="primary" data-action="wash">🫧 Искупать</button><button data-action="hold">🤲 На ручки</button>'
 if(room==='bed') return '<button class="primary" data-action="sleep">☾ Уложить спать</button><button data-action="pet">♡ Погладить</button>'
 if(room==='outside') return `<button class="primary" data-action="hold">🤲 ${held?'Погулять на ручках':'Поднять на ручки'}</button><button data-room="bath">🛁 Пора купаться</button><button data-action="next-visitor">🌳 Пройти дальше</button>`
 if(room==='stretch') return '<button class="primary" data-action="stretch">↔ Потянуть кнопкой</button><button data-room="home">♡ Отдохнуть дома</button>'
 return `<button class="primary" data-action="pet">♡ Погладить</button><button data-action="hold">🤲 ${held?'Поставить на коврик':'Взять на ручки'}</button><button data-room="bed">☾ Спать</button>`
}
function shop() { return `<section class="shop"><div><p class="eyebrow">МАЛЕНЬКИЕ СОКРОВИЩА</p><h2>Немного волшебства для слайма</h2><p>Украшения для дома меняют спальню, ванную и гардероб.</p></div>${[['color','Цвета'],['costume','Костюмы'],['decor','Уют в комнатах']].map(([kind,name])=>`<h3>${name}</h3><div class="shop-row">${ITEMS.filter(i=>i.kind===kind).map(i=>`<button data-buy="${i.id}" aria-pressed="${state[i.kind]===i.id}" ${!state.owned.includes(i.id)&&state.coins<i.price?'disabled':''}><span>${i.icon}</span><b>${i.name}</b><small>${state[i.kind]===i.id?'Надето ✓':state.owned.includes(i.id)?'Выбрать':`${i.price} ✦`}</small></button>`).join('')}</div>`).join('')}</section>` }
function rewarded(stat:'clean'|'energy'|'joy', text:string) { const coins=care(state,stat); message=text+(coins?` +${coins} ✦`:''); save(); render() }
function finishStretch(value:number) { audio.play('stretch'); const best=value>state.record; state.record=Math.max(state.record,value); state.energy=Math.max(0,state.energy-6); state.joy=Math.max(0,state.joy-4); message=best?`Новый рекорд: ${value} см! Ура-а-а!`:`Растянулись на ${value} см! Ещё раз?`; save(); render() }
function act(action:string, babyIndex = 0) {
 if(action==='rest-friends'&&room==='outside'&&meeting.permission) {
  state.energy=Math.min(100,state.energy+25); meeting.friendEnergy=Math.min(100,meeting.friendEnergy+25);state.joy=Math.min(100,state.joy+10)
  message='Посидели на травке и отдохнули. Теперь можно снова спросить про малыша!';audio.play('wake');save();render();return
 }
 if(action==='next-visitor'&&room==='outside') {
  if(!held) message='Сначала возьми меня на ручки — и пойдём гулять!'
  else {meeting=nextMeeting(state); votesVisible=false; message='Смотри, Мира и Облачко! Спросим, можно ли поиграть?'; save()}
  audio.play('tap'); render(); return
 }
 if(action==='wake') { audio.play('wake'); clearTimeout(sleepTimer); sleeping=false; message='Уже проснулся? Можно поспать ещё.'; render(); return }
 if(sleeping) return
 const effect: Partial<Record<string,SlimeSound>> = {pet:'pet',wash:'wash',hold:'pet',sleep:'sleep',cuddle:'pet','ask-owner':'tap','ask-slimes':'tap',later:'tap'}
 if(effect[action]) audio.play(effect[action]!)
 if (room === 'outside' && ['ask-owner','play-friend','ask-slimes','give-piece','later'].includes(action)) {
  if(action==='ask-owner') message=askOwner(state,meeting)
  if(action==='play-friend') {
   votesVisible=false
   message=playTogether(state,meeting)?'Пас! Облачко ловит мяч и отправляет его обратно. Как весело!':'Кто-то устал. Отдохнём и встретимся на следующей прогулке!'
  }
  if(action==='ask-slimes') { votesVisible=true; message=askSlimes(state,meeting)?'Мой слайм: «Да!» Облачко: «И я хочу!» Подарим по крошечке?':'Спросим каждого слайма. Ответы — под полянкой.' }
  let born = false
  if(action==='give-piece') {
   const before=state.babies.length
   if(givePiece(state,meeting)) { born=state.babies.length>before; messageBaby=state.babies.length-1; message=born?'Две крошечки соединились! Привет, {{baby}}! ♡':'Первая крошечка готова. Теперь подарок Облачка!' }
   else message='Давай сначала снова спросим обоих слаймов.'
  }
  if(action==='later') { meeting.agreed=false; meeting.pieces=0; votesVisible=false; message='Хорошо! Можно просто дружить и играть.' }
  save(); render()
  if(action==='play-friend'&&message.startsWith('Пас!')) { root.querySelector('.scene')?.classList.add('playing-together'); audio.play('ball') }
  if(action==='ask-slimes'&&votesVisible&&!meeting.agreed) narration.announce(Array.from(root.querySelectorAll('.wishes p'),p=>spoken(p.textContent ?? '')))
  if(action==='give-piece') audio.play(born?'baby':'pet')
  if(born) root.querySelector('.family-card:last-child .family-baby')?.classList.add('baby-arrival')
  return
 }
 if(action==='cuddle'&&state.babies[babyIndex]) { state.babies[babyIndex].cuddles++; messageBaby=babyIndex; message='{{baby}}: «Пи-пи! Обнимаю!» ♡'; save(); render(); return }
 if(action==='pet') rewarded('joy','Мур-мур… то есть, слайм-слайм! ♡')
 if(action==='wash') { held=false; rewarded('clean','Пузырьки! Я становлюсь чище!'); document.querySelector('.scene')?.classList.add('bubbles') }
 if(action==='hold') { if(room==='outside') { held=true; state.energy=Math.max(0,state.energy-5); rewarded('joy','Как красиво на улице! Держи меня крепче.') } else { held=!held; message=held?'У тебя такие тёплые ладошки!':'Какой мягкий коврик!'; render() } }
 if(action==='sleep') { held=false; sleeping=true; message=''; render(); sleepTimer=window.setTimeout(()=>{sleeping=false; audio.play('wake'); rewarded('energy','Выспался! Спасибо за уютные сны.');},4000) }
 if(action==='stretch') finishStretch(Math.round(stretchLimit(state)*.8))
}
function bind() {
 root.querySelectorAll<HTMLButtonElement>('[data-companion]').forEach(button=>button.onclick=()=>{
  const value=button.dataset.companion!;state.companion=value==='all'?'all':Number(value)
  if(state.companion==='all') message='Теперь все малыши рядом!'
  else {messageBaby=state.companion;message='{{baby}} теперь рядом со мной!'}
  audio.play('pet');save();render();root.querySelector<HTMLButtonElement>(`[data-companion="${value}"]`)?.focus({preventScroll:true})
 })

 root.querySelectorAll<HTMLButtonElement>('[data-rename]').forEach(button=>button.onclick=()=>{
  editingBaby=Number(button.dataset.rename);nameDraft=babyName(state.babies[editingBaby],editingBaby,lang);render();const input=root.querySelector<HTMLInputElement>('#baby-name-input');input?.focus();input?.select()
 })
 const cancelName=()=>{const index=editingBaby;editingBaby=null;render();root.querySelector<HTMLButtonElement>(`[data-rename="${index}"]`)?.focus()}
 root.querySelector<HTMLButtonElement>('[data-cancel-name]')?.addEventListener('click',cancelName)
 root.querySelector<HTMLFormElement>('[data-name-form]')?.addEventListener('submit',event=>{
  event.preventDefault();const input=root.querySelector<HTMLInputElement>('#baby-name-input')!;const name=cleanBabyName(input.value)
  if(!name){root.querySelector('.name-error')!.textContent=slimeText('Впиши имя малыша.',lang);input.focus();return}
  const index=editingBaby!;state.babies[index].name=name;messageBaby=index;message='Теперь меня зовут {{baby}}!';editingBaby=null
  beginSpeech(slimeText('Сохранить имя',lang));audio.play('pet');save();render();root.querySelector<HTMLButtonElement>(`[data-rename="${index}"]`)?.focus()
 })
 root.querySelector<HTMLInputElement>('#baby-name-input')?.addEventListener('input',event=>{nameDraft=(event.target as HTMLInputElement).value})
 root.querySelector<HTMLInputElement>('#baby-name-input')?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancelName()}})

 root.querySelector<HTMLSelectElement>('#slime-language')!.onchange=e=>{
  const next=(e.target as HTMLSelectElement).value
  if(next!=='ru'&&next!=='de'&&next!=='en') return
  lang=next; saveLang(lang)
  const url=new URL(location.href); url.searchParams.delete('lang'); history.replaceState(null,'',url)
  narration.languageChanged(); audio.play('tap'); render()
  root.querySelector<HTMLSelectElement>('#slime-language')!.focus()
 }
 root.querySelector<HTMLButtonElement>('#slime-sound')!.onclick=()=>{
  state.sound=!state.sound; save()
  narration.silence(); audio.silence()
  if(state.sound) { audio.unlock(); beginSpeech(slimeText('Звук включён',lang)); audio.play('tap') }
  render(); root.querySelector<HTMLButtonElement>('#slime-sound')!.focus()
 }
 const caption=root.querySelector<HTMLElement>('.speech')!
 caption.onclick=()=>beginSpeech(caption.textContent ?? '')
 caption.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();caption.click()}}

 root.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(b=>b.onclick=()=>{ if(sleeping) {clearTimeout(sleepTimer); sleeping=false} const next=b.dataset.room!; if(next==='outside'&&!held) {message='Сначала возьми меня на ручки — и пойдём гулять!'; render(); return} if(next!==room) { if(next==='outside'){ meeting=nextMeeting(state); save() } votesVisible=false } room=next; message=room==='stretch'?'Тяни меня! Посмотрим, какой я длинный.':room==='bath'?'Давай смоем грязь и листочки!':room==='bed'?'Моя мягкая кроватка…':room==='closet'?'Какой наряд выберем сегодня?':room==='outside'?'Смотри, Мира и Облачко! Спросим, можно ли поиграть?':'Как же хорошо быть вместе!'; render() })
 root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action!,Number(b.dataset.baby ?? 0)))
 root.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{if(buy(state,b.dataset.buy!)){audio.play('coin');message='Мне очень нравится! ♡';save();render()}})
 const node=root.querySelector<HTMLButtonElement>('#slime')!
 let start:{x:number;y:number;id:number}|null=null, distance=0
 node.onpointerdown=e=>{ if(sleeping)return; beginSpeech(node.getAttribute('aria-label') ?? ''); start={x:e.clientX,y:e.clientY,id:e.pointerId}; distance=0; node.setPointerCapture(e.pointerId) }
 node.onpointermove=e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;distance=Math.hypot(dx,dy);if(room==='stretch'){const value=Math.min(stretchLimit(state),Math.round(distance*1.7));node.style.transform=`scale(${1+value/200},${1-value/950})`;root.querySelector('#stretch-value b')!.textContent=String(value)}else if(held){node.style.transform=`translate(${dx}px,${dy}px)`}}
 node.onpointerup=e=>{if(!start||e.pointerId!==start.id)return;start=null;node.style.transform='';if(room==='stretch'&&distance>8)finishStretch(Math.min(stretchLimit(state),Math.round(distance*1.7)));else if(room==='outside'&&held&&distance>10){const box=root.querySelector('#scene')!.getBoundingClientRect();if(e.clientY>box.top+box.height*.7){audio.play('drop');held=false;state.clean=Math.max(0,state.clean-35);message='Плюх! Прилипли грязь и листочки. Пойдём в ванную?';save();render()}}else if(distance<8)act('pet')}
 node.onpointercancel=()=>{start=null;node.style.transform=''}
 node.onclick=e=>{if(e.detail===0){beginSpeech(node.getAttribute('aria-label') ?? '');act(room==='stretch'?'stretch':'pet')}}
}
// Capture the label before a game action replaces the DOM. Speech and effects
// unlock in the actual gesture; delayed sleep feedback uses the same session.
root.addEventListener('pointerdown',()=>audio.unlock(),{capture:true})
root.addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLElement>('button, a')
 if(!button||button.id==='slime-sound'||button.id==='slime') return
 beginSpeech(button.getAttribute('aria-label') ?? button.innerText)
 if(button.hasAttribute('data-room')) audio.play('tap')
},true)
window.addEventListener('pagehide',()=>{narration.silence();audio.silence();clearTimeout(sleepTimer)})
document.addEventListener('visibilitychange',()=>{if(document.hidden){narration.silence();audio.silence()}})
render()
if(import.meta.env.PROD&&'serviceWorker'in navigator) window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js')})
