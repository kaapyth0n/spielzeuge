import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome',headless:true})
const base=process.env.SLIME_BASE_URL || 'http://localhost:5173'
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000)
 const action=id=>page.locator(`[data-action="${id}"]`).first().click()
 const room=id=>page.locator(`nav [data-room="${id}"]`).click()
 const id=()=>page.locator('.encounter').getAttribute('data-visitor')
 await page.goto(base+'/slime-check/?lang=ru');await action('hold');await room('outside')
 const first=await id(),seen=[]
 await action('ask-owner');await action('play-friend');assert.match(await page.locator('.friendship').innerText(),/1\/3/)
 for(let i=0;i<6;i++){
  const current=await id();seen.push(current)
  if(i>0)assert.match(await page.locator('.friendship').innerText(),/0\/3/)
  assert.notEqual(await page.locator('.owner').innerText(),'')
  for(const lang of ['de','en','ru']){
   await page.selectOption('#slime-language',lang);assert.equal(await id(),current,'language change preserves current encounter')
   if(lang!=='ru')assert.ok(!/[А-Яа-яЁё]/.test(await page.locator('body').innerText()))
  }
  if(i===2)await page.screenshot({path:'tmp/slime-visitors-phone.png',fullPage:true})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await action('next-visitor');assert.notEqual(await id(),current);assert.equal(await page.locator('[data-action="play-friend"]').count(),0)
 }
 assert.equal(new Set(seen).size,6)
 for(let i=0;i<6&&await id()!==first;i++)await action('next-visitor')
 assert.equal(await id(),first);assert.match(await page.locator('.friendship').innerText(),/1\/3/)
 const previous=await id();await page.reload();await action('hold');await room('outside');assert.notEqual(await id(),previous)
 const before=await id();await room('home');await room('outside');assert.notEqual(await id(),before)
 assert.deepEqual(errors,[])
 console.log('PASS: six distinct visitors, no adjacent repeats, stable language changes, three languages, separate persistent friendship, reset permissions, mobile and reload/new-walk rotation')
}finally{await browser.close()}
