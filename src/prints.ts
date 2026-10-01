import './prints.css'
import { loadLang, saveLang, SPEECH_LOCALE, type Lang } from './languages'
import { PRINTS_COPY } from './prints-copy'
import { ACTIVITIES, COLORS, countWithinBounds, fingerprintPaths, nearestActivity } from './prints-state'
import { slidePose, footballPose, approach } from './prints-motion'
const NS='http://www.w3.org/2000/svg'
const root=document.querySelector<HTMLDivElement>('#app')!
let lang=loadLang(), muted=false
try { muted=localStorage.getItem('spielzeuge.prints.muted')==='true' } catch {}
root.innerHTML=`<main class="app"><header class="toolbar"><a class="home" href="/">⌂</a><h1 class="title"></h1><select id="language"><option value="ru">RU</option><option value="de">DE</option><option value="en">EN</option></select><button class="sound" id="sound"></button><button id="replay">↻ ♪</button></header><p class="instructions" aria-live="polite"></p><div class="field"><svg id="world" role="group" tabindex="0"><defs><pattern id="grass" width="63" height="59" patternUnits="userSpaceOnUse"><path d="M8 40l-2-5m2 5l3-4" stroke="#9bc88b" opacity=".35" fill="none"/></pattern></defs><rect id="background" width="100%" height="100%" fill="url(#grass)"/><g id="scenery"></g><g id="friends"></g></svg></div><footer class="footer"><div class="counter"><label for="count"></label><button id="minus">−</button><input id="count" type="number" min="1" max="20" value="8" inputmode="numeric"/><button id="plus">+</button></div><output class="progress"></output><button id="next" class="next">▶</button><button id="restart">↺</button></footer><p class="note"></p></main>`
const $=<T extends Element>(s:string)=>root.querySelector<T>(s)!
const svg=$<SVGSVGElement>('#world'), scenery=$<SVGGElement>('#scenery'), layer=$<SVGGElement>('#friends')
const input=$<HTMLInputElement>('#count'), next=$<HTMLButtonElement>('#next')
let width=1000,height=650, spots:{x:number;y:number}[]=[], desired=8, alive=false, disposed=false, frame=0, last=0, elapsed=0, selected=-1
let audio:AudioContext|undefined
const sources=new Set<OscillatorNode>()
const abort=new AbortController()
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
interface Friend {id:number;x:number;y:number;originX:number;originY:number;activity:number;born:number;node:SVGGElement;pose:SVGGElement;parts:SVGGElement;drag:boolean;moving:boolean;routeTime:number}
const friends:Friend[]=[]
let drag:{id:number;pointer:number;ox:number;oy:number}|undefined
function speak(text:string){if(disposed||muted)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=SPEECH_LOCALE[lang];u.rate=.88;speechSynthesis.speak(u)}catch{}}
function stopAudio(){try{speechSynthesis.cancel()}catch{};for(const s of sources){try{s.stop();s.disconnect()}catch{}}sources.clear()}
function chime(high=false){if(muted||disposed)return;try{audio??=new AudioContext();const ctx=audio;void ctx.resume().then(()=>{if(disposed||muted||ctx.state!=='running')return;const s=ctx.createOscillator(),g=ctx.createGain();s.type='sine';s.frequency.setValueAtTime(high?740:430,ctx.currentTime);s.frequency.exponentialRampToValueAtTime(high?980:650,ctx.currentTime+.14);g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);s.connect(g).connect(ctx.destination);sources.add(s);s.onended=()=>{sources.delete(s);s.disconnect();g.disconnect()};s.start();s.stop(ctx.currentTime+.23)}).catch(()=>{})}catch{}}
function hint(){return alive?PRINTS_COPY[lang].play:friends.length>=desired?PRINTS_COPY[lang].awaken:PRINTS_COPY[lang].stamp}
function update(){const c=PRINTS_COPY[lang];document.documentElement.lang=lang;document.title=c.title;$<HTMLElement>('.title').textContent=c.title;$<HTMLElement>('.instructions').textContent=hint();$<HTMLElement>('.home').setAttribute('aria-label',c.home);$<HTMLSelectElement>('#language').value=lang;$('#language').setAttribute('aria-label',c.language);$('#sound').textContent=muted?'🔇':'♪';$('#sound').setAttribute('aria-label',c.sound);$('#sound').setAttribute('aria-pressed',String(!muted));$('#replay').setAttribute('aria-label',c.replay);$('label').textContent=c.count;$('#minus').setAttribute('aria-label',`${c.count} −`);$('#plus').setAttribute('aria-label',`${c.count} +`);$('#restart').setAttribute('aria-label',c.restart);$('#restart').setAttribute('title',c.restart);next.setAttribute('aria-label',c.next);next.disabled=alive||friends.length!==desired;$('.progress').textContent=`${friends.length} / ${desired}`;$('.note').textContent=c.quiet;svg.setAttribute('aria-label',hint());input.disabled=alive;for(const id of ['minus','plus'])$<HTMLButtonElement>('#'+id).disabled=alive;$<HTMLButtonElement>('#minus').disabled=alive||desired===1;$<HTMLButtonElement>('#plus').disabled=alive||desired===20;friends.forEach(f=>f.node.setAttribute('aria-label',`${c.friend} ${f.id+1}`));scenery.querySelectorAll<SVGTextElement>('.equip-label').forEach((n,i)=>n.textContent=c.activities[i]);scenery.querySelectorAll<SVGGElement>('.equipment').forEach((n,i)=>n.setAttribute('aria-label',c.activities[i]))}
const art=[
 `<path d="M-68 45L-42-63H42L68 45M-42-63L-17 45M42-63L17 45" stroke="#b8946a" stroke-width="8" fill="none"/><path d="M-24-61V6M24-61V6" stroke="#677873" stroke-width="3"/><rect x="-34" y="4" width="68" height="12" rx="6" fill="#edb856"/>`,
 `<ellipse cy="28" rx="73" ry="25" fill="#e2987e"/><ellipse cy="19" rx="73" ry="25" fill="#f7c981"/><path d="M0 20V-45M-53 3V-22Q0-50 53-22V3M-53-22H53" fill="none" stroke="#63a9a4" stroke-width="7"/><circle cy="-45" r="7" fill="#e98771"/>`,
 `<path d="M-58 43V-54H-14L57 29Q73 47 89 34" fill="none" stroke="#ce9a61" stroke-width="8"/><path d="M-22-46Q-7 10 58 34H84" fill="none" stroke="#80b7ce" stroke-width="20"/><path d="M-58-31H-28M-58-9H-28M-58 14H-28" stroke="#ce9a61" stroke-width="6"/><path d="M-67-55L-38-79L-10-55" fill="#e68e77"/>`,
 `<path d="M-62 46L-45-65H45L63 46Z" fill="#bcb1d0" stroke="#998daa" stroke-width="5"/>${Array.from({length:12},(_,i)=>`<ellipse cx="${-30+i%3*30+(i%2?5:0)}" cy="${-42+Math.floor(i/3)*24}" rx="7" ry="4" fill="${COLORS[i%7]}" transform="rotate(${i*19} ${-30+i%3*30} ${-42+Math.floor(i/3)*24})"/>`).join('')}`,
 `<ellipse cy="10" rx="92" ry="46" fill="none" stroke="#c6bda6" stroke-width="22"/><ellipse cy="10" rx="92" ry="46" fill="none" stroke="#fff9dd" stroke-width="2" stroke-dasharray="9 10"/><path d="M-24 12V-10Q0-35 24-10V12" fill="#e6ac66"/><circle cx="-25" cy="13" r="10" fill="#697775"/><circle cx="25" cy="13" r="10" fill="#697775"/>`,
 `<path d="M-75 48V-56H70V48M-75-56L-48-75H92V26M70-56L92-75M-44-56L-17-75M-12-56L15-75M20-56L47-75M50-56L77-75" stroke="#80aaa0" stroke-width="7" fill="none"/>`,
 `<path d="M-90 12L-45-28H66L92 27L44 56H-61Z" fill="#c59868"/><path d="M-80 10L-42-19H60L79 25L40 45H-57Z" fill="#f4db9d"/><path d="M-27 23L-19 0L-10 13L0-6L11 23Z" fill="#dec082"/><path d="M40 15L44-3" stroke="#8d938c" stroke-width="5"/><path d="M29 13H50L46 32H33Z" fill="#e7887b"/>`,
 `<rect x="-96" y="-45" width="192" height="105" rx="8" fill="#91bf7c" stroke="#fff9e6" stroke-width="3"/><path d="M0-45V60M-96-20H-68V35H-96M96-20H68V35H96" fill="none" stroke="#fff9e6" stroke-width="2"/><circle cy="8" r="22" fill="none" stroke="#fff9e6" stroke-width="2"/><path d="M-96-14H-110V31H-96M96-14H110V31H96" fill="#e9eee4" stroke="#668b87" stroke-width="3"/><path d="M-106-12V29M-101-12V29M101-12V29M106-12V29M-110 0H-96M-110 15H-96M96 0H110M96 15H110" stroke="#9aacac"/><g class="football-ball"><circle r="9" fill="#fffdf4" stroke="#4d6256" stroke-width="1.5"/><path d="M0-5L5-1L3 5H-3L-5-1Z" fill="#4d6256"/></g>`
]
function layout(){const r=svg.getBoundingClientRect();const oldW=width,oldH=height;width=r.width<600||r.height>r.width?600:1000;height=Math.max(width===600?650:430,width*r.height/Math.max(1,r.width));svg.setAttribute('viewBox',`0 0 ${width} ${height}`);const cols=width===600?2:4,rows=Math.ceil(ACTIVITIES.length/cols);spots=ACTIVITIES.map((_,i)=>({x:(i%cols+.5)*width/cols,y:(Math.floor(i/cols)+.54)*(height-30)/rows}));scenery.innerHTML=`<g opacity=".65"><circle cx="${width-30}" cy="20" r="28" fill="#f5d774"/></g>`+spots.map((p,i)=>`<g class="equipment" data-activity="${i}" role="button" tabindex="0" transform="translate(${p.x} ${p.y})"><ellipse class="ground" cy="24" rx="110" ry="58" fill="${i%2?'#d9e9c7':'#cee3bf'}"/><g>${art[i]}</g><text class="equip-label" text-anchor="middle" y="91"></text></g>`).join('');friends.forEach(f=>{f.x=f.x/oldW*width;f.y=f.y/oldH*height;f.originX=f.originX/oldW*width;f.originY=f.originY/oldH*height});update();render(0)}
function add(x:number,y:number){if(alive||friends.length>=desired)return;const id=friends.length,node=document.createElementNS(NS,'g');node.classList.add('character');node.dataset.friend=String(id);node.setAttribute('role','button');node.setAttribute('tabindex','0');const color=COLORS[id%COLORS.length];node.innerHTML=`<ellipse class="hit" rx="34" ry="42" fill="transparent" pointer-events="all"/><ellipse class="shadow" cy="39" rx="25" ry="6" fill="#537451" opacity=".14"/><g class="pose"><g class="parts"><path class="limbs arms" d="M-20 0Q-38 0-40 20M20 0Q38 0 40 20"/><path class="limbs legs" d="M-10 22Q-18 37-24 39M10 22Q18 37 24 39"/></g><ellipse class="body" rx="26" ry="35" fill="${color}" opacity=".18"/><g class="ridge" style="color:${color}">${fingerprintPaths().map(d=>`<path d="${d}"/>`).join('')}</g><g class="ride" style="display:none"><path d="M-34 20H34L29 37H-30Z" fill="${color}"/><circle cx="-23" cy="37" r="8" fill="#51605c"/><circle cx="23" cy="37" r="8" fill="#51605c"/><path d="M14 18V8H26" fill="none" stroke="#51605c" stroke-width="3"/></g><g class="features"><ellipse cx="-10" cy="-8" rx="9" ry="11" fill="#fffdf8"/><ellipse cx="10" cy="-8" rx="9" ry="11" fill="#fffdf8"/><circle cx="-8" cy="-6" r="4" fill="#344943"/><circle cx="12" cy="-6" r="4" fill="#344943"/><path d="M-6 9Q0 16 6 9" stroke="#614b58" stroke-width="2.5" fill="none" stroke-linecap="round"/></g></g>`;layer.append(node);const f:Friend={id,x,y,originX:x,originY:y,activity:id%ACTIVITIES.length,born:0,node,pose:node.querySelector('.pose')!,parts:node.querySelector('.parts')!,drag:false,moving:false,routeTime:0};friends.push(f);f.parts.setAttribute('transform','scale(0)');render(0);update();chime();speak(friends.length===desired?PRINTS_COPY[lang].awaken:friends.length===1?PRINTS_COPY[lang].stamp:PRINTS_COPY[lang].add)}
function start(){if(next.disabled||disposed)return;alive=true;elapsed=0;friends.forEach(f=>{f.born=elapsed;f.node.classList.add('alive');f.moving=true});chime(true);speak(PRINTS_COPY[lang].play);update()}
function choose(f:Friend,activity:number){f.activity=activity;f.routeTime=0;f.originX=f.x;f.originY=f.y;f.moving=true;f.born=elapsed-1.1;selected=-1;chime();speak(`${PRINTS_COPY[lang].go} ${PRINTS_COPY[lang].activities[activity]}`)}
function point(e:PointerEvent){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM()!.inverse())}
function render(dt: number) {
  const ball = scenery.querySelector('.football-ball')
  const rally = footballPose(elapsed)
  ball?.setAttribute('transform', `translate(${rally.ballX} ${rally.ballY}) rotate(${elapsed*160})`)
  for (const f of friends) {
    let rotation = 0, scale = 1, phase = 'idle', kick = 0
    const a = elapsed + f.id*.71
    const growth = Math.min(1, Math.max(0, (elapsed-f.born)/.85))
    if (alive) {
      f.parts.setAttribute('transform', `scale(${growth})`)
      f.node.querySelector<SVGGElement>('.features')!.style.opacity = String(growth)
      if (!f.drag && elapsed-f.born > 1) {
        const p = spots[f.activity]
        let tx = p.x, ty = p.y
        switch (f.activity) {
          case 0: tx += Math.sin(a*1.6)*35; ty += -8+Math.abs(Math.sin(a*1.6))*12; rotation = Math.sin(a*1.6)*18; break
          case 1: tx += Math.cos(a)*48; ty += Math.sin(a)*16-8; rotation = Math.sin(a)*10; break
          case 2: {
            // Freeze the route at its entrance while arriving: no jump onto a moving chute.
            const pose = slidePose(f.routeTime)
            tx += pose.x; ty += pose.y; phase = pose.phase
            break
          }
          case 3: tx += Math.sin(a*.8)*23; ty += 15-(a*14%70); break
          case 4: tx += Math.cos(a*.8)*77; ty += Math.sin(a*.8)*30-9; rotation = Math.sin(a*.8)*8; break
          case 5: tx += -52+(a*22%108); ty += -13+Math.sin(a*3)*5; rotation = Math.sin(a*3)*12; break
          case 6: tx += (f.id%3-1)*29; ty += 9+Math.sin(a*3)*3; rotation = Math.sin(a*3)*9; scale = .85; break
          case 7: {
            const pose = footballPose(elapsed, friends.filter(g => g.activity===7).indexOf(f))
            tx += pose.x; ty += pose.y; kick = pose.kick; phase = kick>0 ? 'kick' : 'football-run'
            break
          }
        }
        if (f.moving) {
          const next = approach(f.x, f.y, tx, ty, dt)
          f.x = next.x; f.y = next.y; f.moving = !next.arrived
          phase = 'approach'
        } else {
          f.x = tx; f.y = ty
          if (f.activity===2) f.routeTime += dt
        }
        const walking = f.moving || phase.startsWith('walk') || phase==='platform'
        const swing = Math.sin(a*(walking ? 14 : 4))*10
        const arms = f.node.querySelector('.arms')!
        arms.setAttribute('d', f.activity===5&&!f.moving
          ? 'M-20 0Q-32-25-25-41M20 0Q32-25 25-41'
          : (f.activity===3 || phase==='climb')&&!f.moving
            ? `M-20 0Q-35-20 -28 ${-25+swing}M20 0Q35-15 28 ${-25-swing}`
            : `M-20 0Q-38 ${swing}-40 ${18+swing}M20 0Q38 ${-swing}40 ${18-swing}`)
        // Keep walking feet on the ground; knees and horizontal strides articulate.
        f.node.querySelector('.legs')!.setAttribute('d',
          `M-10 22Q${-18+swing} 31 ${-19+swing} 39M10 22Q${18-swing} 31 ${19-swing-kick*2} ${39-kick*9}`)
        if (reduced || f.activity===2 || walking) rotation = 0
      }
    }
    f.node.dataset.phase = f.drag ? 'drag' : phase
    f.node.setAttribute('transform', `translate(${f.x.toFixed(2)} ${f.y.toFixed(2)})`)
    f.pose.setAttribute('transform', `rotate(${rotation}) scale(${f.drag?1.15:scale})`)
    f.node.querySelector<SVGGElement>('.ride')!.style.display = alive&&f.activity===4&&!f.moving&&!f.drag ? '' : 'none'
    f.node.dataset.activity = ACTIVITIES[f.activity]
    f.node.dataset.x = String(f.x); f.node.dataset.y = String(f.y)
  }
}
function tick(now:number){if(disposed)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;elapsed+=dt;render(dt);frame=requestAnimationFrame(tick)}
function on<K extends keyof HTMLElementEventMap>(el:EventTarget,event:K,fn:(e:HTMLElementEventMap[K])=>void){el.addEventListener(event,fn as EventListener,{signal:abort.signal})}
on(svg,'pointerdown',e=>{if(disposed||drag)return;e.preventDefault();const p=point(e),target=(e.target as Element).closest<SVGGElement>('[data-friend]');if(!alive){add(p.x,p.y);return}if(target){const f=friends[Number(target.dataset.friend)];drag={id:f.id,pointer:e.pointerId,ox:f.x,oy:f.y};f.drag=true;selected=f.id;f.node.classList.add('dragging');layer.append(f.node);try{svg.setPointerCapture(e.pointerId)}catch{};chime()}else if(selected>=0){choose(friends[selected],nearestActivity(p.x,p.y,spots))}})
on(svg,'pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=point(e),f=friends[drag.id];f.x=Math.max(26,Math.min(width-26,p.x));f.y=Math.max(36,Math.min(height-40,p.y));const n=nearestActivity(f.x,f.y,spots);scenery.querySelectorAll('.equipment').forEach((g,i)=>g.classList.toggle('selected',i===n));render(0)})
function endDrag(cancel=false){if(!drag)return;const d=drag,f=friends[d.id];drag=undefined;f.drag=false;f.node.classList.remove('dragging');if(cancel){f.x=d.ox;f.y=d.oy;f.moving=true;f.routeTime=0;selected=-1}else choose(f,nearestActivity(f.x,f.y,spots));if(svg.hasPointerCapture(d.pointer))svg.releasePointerCapture(d.pointer);scenery.querySelectorAll('.selected').forEach(g=>g.classList.remove('selected'))}
on(svg,'pointerup',e=>{if(drag?.pointer===e.pointerId)endDrag()});on(svg,'pointercancel',()=>endDrag(true));on(svg,'lostpointercapture',()=>endDrag(true))
on(svg,'keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();const target=e.target as Element;if(!alive){add(width/2+(friends.length%3-1)*45,height/2);return}const f=target.closest<SVGGElement>('[data-friend]'),a=target.closest<SVGGElement>('[data-activity]');if(f){selected=Number(f.dataset.friend);speak(PRINTS_COPY[lang].play)}else if(a&&selected>=0){choose(friends[selected],Number(a.dataset.activity))}})
function setCount(value:number){desired=countWithinBounds(value);input.value=String(desired);while(friends.length>desired)friends.pop()!.node.remove();update();chime();speak(`${PRINTS_COPY[lang].count} ${desired}`)}
on(input,'change',()=>setCount(Number(input.value)));on($('#minus'),'click',()=>setCount(desired-1));on($('#plus'),'click',()=>setCount(desired+1));on(next,'click',start)
on($('#restart'),'click',()=>{endDrag(true);stopAudio();friends.length=0;layer.replaceChildren();alive=false;elapsed=0;selected=-1;update();chime();speak(hint())})
on($('#language'),'change',()=>{lang=$<HTMLSelectElement>('#language').value as Lang;saveLang(lang);stopAudio();update();speak(hint())})
on($('#sound'),'click',()=>{muted=!muted;try{localStorage.setItem('spielzeuge.prints.muted',String(muted))}catch{};stopAudio();update();if(!muted){chime();speak(hint())}})
on($('#replay'),'click',()=>{chime();speak(hint())})
function dispose(){if(disposed)return;disposed=true;endDrag(true);cancelAnimationFrame(frame);observer.disconnect();abort.abort();stopAudio();if(audio){void audio.close().catch(()=>{});audio=undefined}}
on($('.home'),'click',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0)dispose()})
window.addEventListener('pagehide',dispose,{signal:abort.signal})
document.addEventListener('visibilitychange',()=>{if(document.hidden){endDrag(true);stopAudio();cancelAnimationFrame(frame)}else if(!disposed){last=performance.now();frame=requestAnimationFrame(tick)}},{signal:abort.signal})
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()})
const observer=new ResizeObserver(layout);observer.observe(svg);layout();frame=requestAnimationFrame(tick)
