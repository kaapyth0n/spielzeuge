import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{window.spoken=[];Object.defineProperty(speechSynthesis,'speak',{value:u=>{window.spoken.push(u.text);setTimeout(()=>u.onend?.(),5)}})})
 await page.goto((process.env.SLIME_BASE_URL||'http://localhost:5173')+'/slime-check/?lang=ru')
 await page.evaluate(()=>localStorage.setItem('spielzeuge.slime-check.v1',JSON.stringify({babies:Array.from({length:3},()=>({color:'mint',parent:'mira',cuddles:0}))})))
 await page.reload();assert.deepEqual(await page.locator('.family-baby b').allTextContents(),['Капелька','Пушинка','Ириска'])
 const rename=i=>page.locator(`[data-rename="${i}"]`).click()
 await rename(1);await page.locator('#baby-name-input').fill('Луна');await page.locator('#baby-name-input').press('Enter')
 assert.equal(await page.locator('.family-baby b').nth(1).innerText(),'Луна')
 await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>window.spoken.some(t=>t.includes('Теперь меня зовут Луна'))))
 await rename(1);await page.locator('#baby-name-input').fill('Передумала');await page.locator('#baby-name-input').press('Escape');assert.equal(await page.locator('.family-baby b').nth(1).innerText(),'Луна')
 await rename(1);await page.locator('#baby-name-input').fill('   ');await page.locator('#baby-name-input').press('Enter');assert.ok(await page.locator('.name-error').innerText());await page.locator('[data-cancel-name]').click()
 for(const lang of ['de','en','ru']){await page.selectOption('#slime-language',lang);assert.equal(await page.locator('.family-baby b').nth(1).innerText(),'Луна')}
 // User-entered text must not be interpreted as HTML or translated as an NPC name.
 const name='<img src=x> Мира & Облачко'
 await rename(0);await page.locator('#baby-name-input').fill(name);await page.locator('#baby-name-input').press('Enter')
 assert.equal(await page.locator('.family-baby b').first().innerText(),name);assert.equal(await page.locator('img').count(),0)
 await page.locator('.family-baby[data-baby="0"]').click();assert.ok((await page.locator('.speech').innerText()).startsWith(name+':'))
 await page.reload();assert.equal(await page.locator('.family-baby b').first().innerText(),name);assert.equal(await page.locator('.family-baby b').nth(1).innerText(),'Луна')
 await rename(2);await page.screenshot({path:'tmp/slime-names-phone.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 assert.deepEqual(errors,[]);console.log('PASS: distinct defaults, rename, cancel, blank input, persistence, speech, unchanged custom names across languages, literal HTML and mobile form')
}finally{await browser.close()}
