import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const base=process.env.BASE_URL||'http://localhost:5173'
await mkdir('tmp/prints',{recursive:true})
try{
 for(const [name,width,height] of [['phone',390,844],['small',320,568],['landscape',844,390],['tablet',820,1180],['desktop',1280,900]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__spoken=[];window.speechSynthesis.speak=u=>window.__spoken.push({text:u.text,lang:u.lang});window.speechSynthesis.cancel=()=>{}})
 await page.goto(base+'/prints/');await page.locator('#world').waitFor();
 assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=innerWidth),true,name+' no overflow')
 for(const lang of ['de','en','ru']){await page.selectOption('#language',lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.evaluate(()=>localStorage.getItem('spielzeuge.lang')),lang);assert.equal(await page.locator('.equipment[data-activity="7"]').getAttribute('aria-label'),{ru:'Мини-футбол',de:'Mini-Fußball',en:'Mini football'}[lang])}
 await page.click('#replay');assert.equal((await page.evaluate(()=>window.__spoken.at(-1))).text,'Нажми пальчиком на экран и оставь свой отпечаток')
 const field=await page.locator('#world').boundingBox();
 for(let i=0;i<8;i++)await page.mouse.click(field.x+field.width*(.2+(i%3)*.3),field.y+field.height*(.3+Math.floor(i/3)*.2));
 assert.equal(await page.locator('.character').count(),8);assert.equal(await page.locator('.ridge path').count(),96);assert.equal(await page.locator('#next').isEnabled(),true)
 assert.equal((await page.evaluate(()=>window.__spoken.at(-1))).text,'Нажми на стрелочку и оживи картинку')
 await page.click('#next');await page.waitForTimeout(2400);assert.equal(await page.locator('.alive').count(),8)
 const activities=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.dataset.activity));assert.equal(new Set(activities).size,8)
 const before=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));await page.waitForTimeout(700);const after=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));if(!before.every((v,i)=>v!==after[i]))console.log('motion diagnostic',name,before,after);assert.ok(before.every((v,i)=>v!==after[i]),name+' every activity moves')
 // Observe a full slide circuit in the real animation loop, including its seam.
 if(name==='desktop') {
   const samples=await page.evaluate(async()=>{
     const n=document.querySelector('[data-friend="2"]'), out=[]
     const until=performance.now()+60000
     while(performance.now()<until){out.push({x:+n.dataset.x,y:+n.dataset.y,phase:n.dataset.phase,legs:n.querySelector('.legs').getAttribute('d')});if(out.length>1 && n.dataset.phase==='climb' && out.at(-2).phase==='walk-to-ladder')break;await new Promise(r=>requestAnimationFrame(r))}
     return out
   })
   for(const phase of ['climb','platform','slide','land','walk-around','walk-back','walk-to-ladder'])assert.ok(samples.some(s=>s.phase===phase),'slide '+phase)
   for(let i=1;i<samples.length;i++)assert.ok(Math.hypot(samples[i].x-samples[i-1].x,samples[i].y-samples[i-1].y)<8,'no slide teleport')
   assert.ok(new Set(samples.filter(s=>s.phase==='walk-back').map(s=>s.legs)).size>10,'walking legs articulate')
   assert.ok(samples.some((s,i)=>i&&s.phase==='climb'&&samples[i-1].phase==='walk-to-ladder'),'loop seam observed')
 }
 const ballBefore=await page.locator('.football-ball').getAttribute('transform');await page.waitForTimeout(300);assert.notEqual(await page.locator('.football-ball').getAttribute('transform'),ballBefore)
 // Freeze at pointerdown by grabbing a character's body; drop at equipment centre.
 const pos=await page.locator('[data-friend="0"]').evaluate(n=>{const p=document.querySelector('#world').createSVGPoint();p.x=0;p.y=0;const q=p.matrixTransform(n.getScreenCTM());return {x:q.x,y:q.y}})
 await page.locator('[data-friend="0"]').dispatchEvent('pointerdown',{pointerId:1,clientX:pos.x,clientY:pos.y,pointerType:'touch',bubbles:true});
 const dest=await page.locator('.equipment[data-activity="7"]').evaluate(n=>{const p=document.querySelector('#world').createSVGPoint();const q=p.matrixTransform(n.getScreenCTM());return{x:q.x,y:q.y}})
 await page.locator('#world').dispatchEvent('pointermove',{pointerId:1,clientX:dest.x,clientY:dest.y,pointerType:'touch',bubbles:true});await page.locator('#world').dispatchEvent('pointerup',{pointerId:1,clientX:dest.x,clientY:dest.y,pointerType:'touch',bubbles:true});await page.waitForFunction(()=>document.querySelector('[data-friend="0"]').dataset.activity==='football')
 assert.match((await page.evaluate(()=>window.__spoken.at(-1))).text,/Мини-футбол/)
 // Drag back out of football to the slide and bound every approach frame.
 const slideDest=await page.locator('.equipment[data-activity="2"]').evaluate(n=>{const p=document.querySelector('#world').createSVGPoint();const q=p.matrixTransform(n.getScreenCTM());return{x:q.x,y:q.y}})
 await page.locator('[data-friend="0"]').dispatchEvent('pointerdown',{pointerId:3,clientX:dest.x,clientY:dest.y,pointerType:'touch',bubbles:true})
 await page.locator('#world').dispatchEvent('pointermove',{pointerId:3,clientX:slideDest.x,clientY:slideDest.y,pointerType:'touch',bubbles:true})
 await page.locator('#world').dispatchEvent('pointerup',{pointerId:3,clientX:slideDest.x,clientY:slideDest.y,pointerType:'touch',bubbles:true})
 await page.waitForFunction(()=>document.querySelector('[data-friend="0"]').dataset.activity==='slide')
 const arrival=await page.evaluate(async()=>{const n=document.querySelector('[data-friend="0"]'),out=[];for(let i=0;i<100;i++){out.push({x:+n.dataset.x,y:+n.dataset.y});await new Promise(r=>requestAnimationFrame(r))}return out})
 for(let i=1;i<arrival.length;i++)assert.ok(Math.hypot(arrival[i].x-arrival[i-1].x,arrival[i].y-arrival[i-1].y)<8,'continuous reassignment')
 // Keyboard transfer after deterministic touch-pointer coverage.
 await page.locator('[data-friend="0"]').focus();await page.keyboard.press('Enter');await page.locator('[data-activity="0"]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
 // Cancellation releases the drag and preserves the previous activity.
 await page.locator('[data-friend="0"]').dispatchEvent('pointerdown',{pointerId:2,clientX:pos.x,clientY:pos.y,pointerType:'touch',bubbles:true});
 await page.locator('#world').dispatchEvent('pointercancel',{pointerId:2,pointerType:'touch',bubbles:true});assert.equal(await page.locator('.dragging').count(),0);
 await page.screenshot({path:`tmp/prints/${name}.png`})
 await page.click('#sound');const spoken=await page.evaluate(()=>window.__spoken.length);await page.click('#replay');assert.equal(await page.evaluate(()=>window.__spoken.length),spoken)
 await page.click('#restart');assert.equal(await page.locator('.character').count(),0);await page.fill('#count','20');await page.locator('#count').dispatchEvent('change');for(let i=0;i<20;i++)await page.mouse.click(field.x+field.width*.5,field.y+field.height*.5);assert.equal(await page.locator('.character').count(),20)
 await page.click('#next');await page.waitForTimeout(1100)
 // Teardown while keeping the old document alive.
 await page.locator('.home').evaluate(n=>n.addEventListener('click',e=>e.preventDefault()));await page.click('.home');const stopped=await page.locator('.character').first().getAttribute('transform');await page.waitForTimeout(250);assert.equal(await page.locator('.character').first().getAttribute('transform'),stopped)
 await page.goto(base+'/prints/');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');await page.locator('.home').focus();await page.keyboard.press('Enter');await page.waitForURL(base+'/');assert.equal(await page.locator('a[href="./prints/"]').count(),1);await page.click('a[href="./prints/"]');await page.locator('#world').waitFor();assert.equal(await page.locator('.character').count(),0);assert.deepEqual(errors,[]);await context.close();console.log('PASS',name)
 }
}finally{await browser.close()}
