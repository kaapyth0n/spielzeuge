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
 for(const lang of ['de','en','ru']){await page.selectOption('#language',lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.evaluate(()=>localStorage.getItem('spielzeuge.lang')),lang)}
 await page.click('#replay');assert.equal((await page.evaluate(()=>window.__spoken.at(-1))).text,'Нажми пальчиком на экран и оставь свой отпечаток')
 const field=await page.locator('#world').boundingBox();
 for(let i=0;i<7;i++)await page.mouse.click(field.x+field.width*(.2+(i%3)*.3),field.y+field.height*(.3+Math.floor(i/3)*.2));
 assert.equal(await page.locator('.character').count(),7);assert.equal(await page.locator('.ridge path').count(),84);assert.equal(await page.locator('#next').isEnabled(),true)
 assert.equal((await page.evaluate(()=>window.__spoken.at(-1))).text,'Нажми на стрелочку и оживи картинку')
 await page.click('#next');await page.waitForTimeout(2400);assert.equal(await page.locator('.alive').count(),7)
 const activities=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.dataset.activity));assert.equal(new Set(activities).size,7)
 const before=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));await page.waitForTimeout(700);const after=await page.locator('.character').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));if(!before.every((v,i)=>v!==after[i]))console.log('motion diagnostic',name,before,after);assert.ok(before.every((v,i)=>v!==after[i]),name+' every activity moves')
 // Freeze at pointerdown by grabbing a character's body; drop at equipment centre.
 const pos=await page.locator('[data-friend="0"]').evaluate(n=>{const p=document.querySelector('#world').createSVGPoint();p.x=0;p.y=0;const q=p.matrixTransform(n.getScreenCTM());return {x:q.x,y:q.y}})
 await page.locator('[data-friend="0"]').dispatchEvent('pointerdown',{pointerId:1,clientX:pos.x,clientY:pos.y,pointerType:'touch',bubbles:true});
 const dest=await page.locator('[data-activity="6"]').evaluate(n=>{const p=document.querySelector('#world').createSVGPoint();const q=p.matrixTransform(n.getScreenCTM());return{x:q.x,y:q.y}})
 await page.locator('#world').dispatchEvent('pointermove',{pointerId:1,clientX:dest.x,clientY:dest.y,pointerType:'touch',bubbles:true});await page.locator('#world').dispatchEvent('pointerup',{pointerId:1,clientX:dest.x,clientY:dest.y,pointerType:'touch',bubbles:true});await page.waitForFunction(()=>document.querySelector('[data-friend="0"]').dataset.activity==='sand')
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
