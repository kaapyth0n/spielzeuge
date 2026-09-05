import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:1000}})
page.setDefaultTimeout(8000)
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{
 window.spoken=[]; window.effects=[];window.cancelCount=0
 Object.defineProperty(speechSynthesis,'speak',{value:u=>{if(u.text.trim())window.spoken.push({text:u.text,lang:u.lang});setTimeout(()=>u.onend?.(),5)}})
 Object.defineProperty(speechSynthesis,'cancel',{value:()=>window.cancelCount++})
 const start=OscillatorNode.prototype.start
 OscillatorNode.prototype.start=function(...args){window.effects.push(this.frequency.value);return start.apply(this,args)}
})
const action=id=>page.locator(`[data-action="${id}"]`).first().click()
const room=id=>page.locator(`nav [data-room="${id}"]`).click()
const reset=()=>page.evaluate(()=>{window.spoken=[];window.effects=[]})
const speech=()=>page.evaluate(()=>window.spoken)
const waitSpeech=()=>page.waitForTimeout(200)
const localized=async(lang)=>{
 assert.equal(await page.locator('html').getAttribute('lang'),lang)
 if(lang!=='ru') {
  const text=await page.locator('body').innerText()
  assert.ok(!/[А-Яа-яЁё]/.test(text),`Untranslated UI (${lang}): ${text.match(/[^\n]*[А-Яа-яЁё][^\n]*/g)}`)
  const labels=await page.locator('[aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')).join(' '))
  assert.ok(!/[А-Яа-яЁё]/.test(labels),`Untranslated labels: ${labels}`)
 }
 await waitSpeech()
 const utterances=await speech(); assert.ok(utterances.length)
 assert.ok(utterances.every(s=>s.lang===({ru:'ru-RU',de:'de-DE',en:'en-GB'})[lang]),JSON.stringify(utterances))
 if(lang!=='ru')assert.ok(utterances.every(s=>!/[А-Яа-яЁё]/.test(s.text)))
}
try {
 await page.goto('http://localhost:5173/slime-check/?lang=ru');await waitSpeech()
 for(const lang of ['ru','de','en']) {
  await page.evaluate(()=>{const key='spielzeuge.slime-check.v1';const s=JSON.parse(localStorage.getItem(key)||'null');if(s){s.energy=100;s.clean=100;s.joy=100;s.friendship=0;s.baby=null;localStorage.setItem(key,JSON.stringify(s))}})
  await page.reload();await waitSpeech()
  await reset();await page.selectOption('#slime-language',lang);await localized(lang)
  await reset();await action('pet');await waitSpeech()
  assert.equal((await speech()).length,2,'action and reply each spoken once')
  assert.ok((await page.evaluate(()=>window.effects)).length>0,'care has sound effects')
  await reset();await action('pet');await waitSpeech();assert.equal((await speech()).length,2,'repeated care repeats reply')
  for(const id of ['bath','bed','closet','stretch','home']) {await reset();await room(id);await localized(lang)}
  await reset();await action('hold');await room('outside');await localized(lang)
  await reset();await action('ask-owner');await localized(lang)
  await reset();await action('ask-slimes');await localized(lang)
  await waitSpeech();assert.equal((await speech()).length,4,'action, caption and both slime answers')
  // Complete the friendship and baby branches with a fresh, well-rested state.
  await page.evaluate(()=>{const key='spielzeuge.slime-check.v1',s=JSON.parse(localStorage.getItem(key));s.energy=100;s.clean=100;s.joy=100;s.friendship=0;s.baby=null;localStorage.setItem(key,JSON.stringify(s))})
  await page.reload();await action('hold');await room('outside');await action('ask-owner')
  for(let i=0;i<3;i++)await action('play-friend')
  await reset();await action('ask-slimes');await localized(lang)
  await reset();await action('give-piece');await localized(lang)
  await reset();await action('give-piece');await localized(lang);assert.ok((await page.evaluate(()=>window.effects)).length>=4)
  await reset();await action('cuddle');await localized(lang)
  await room('home')
 }
 await page.locator('#slime-sound').click();await reset()
 await action('pet');await room('bath');await action('wash');await waitSpeech()
 assert.deepEqual(await speech(),[]);assert.deepEqual(await page.evaluate(()=>window.effects),[])
 await page.reload();await waitSpeech();assert.equal(await page.locator('#slime-sound').getAttribute('aria-pressed'),'false');assert.deepEqual(await speech(),[])
 await page.locator('#slime-sound').click();await waitSpeech();assert.ok((await speech()).some(s=>s.text.includes('Sound on')))
 // Language changes while asleep affect the delayed wake-up caption and voice.
 await room('bed');await action('sleep');await page.selectOption('#slime-language','de');await reset();await page.waitForTimeout(4200)
 assert.ok((await speech()).some(s=>s.text.includes('Ausgeschlafen')));assert.ok((await speech()).every(s=>s.lang==='de-DE'))
 await reset();await page.locator('.speech').click();await waitSpeech();assert.equal((await speech()).length,1)
 await room('stretch');await reset();await page.locator('#slime').focus();await page.keyboard.press('Enter');await localized('de')
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/slime-language-de-phone.png',fullPage:true})
 assert.ok(await page.locator('#slime-language').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.goto('http://localhost:5173/');assert.equal(await page.locator('[data-i18n="slime-name"]').innerText(),'Slime Check')
 await page.locator('a[href="./slime-check/"]').click();assert.equal(await page.locator('#slime-language').inputValue(),'de')
 assert.deepEqual(errors,[])
 console.log('PASS: RU/DE/EN UI, dialogue, accessible labels, action/reply speech, both wishes, baby sounds, keyboard, repeat, mute, saved settings, language change during sleep, shared catalog language and phone layout. Speech engine calls verified; actual voices depend on the device.')
} finally {await browser.close()}
