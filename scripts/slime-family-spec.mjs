import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome',headless:true})
const base=process.env.SLIME_BASE_URL||'http://localhost:5173'
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/slime-check/?lang=ru')
 // Reproduce the child's existing single-baby save, before family support.
 await page.evaluate(()=>localStorage.setItem('spielzeuge.slime-check.v1',JSON.stringify({baby:{color:'mint',cuddles:4,parent:'mira'},friendships:{leo:3},visitorQueue:['leo'],energy:100,joy:100,clean:100,sound:false})))
 await page.reload()
 const action=id=>page.locator(`[data-action="${id}"]`).first().click()
 const count=()=>page.locator('.family-baby').count()
 assert.equal(await count(),1)
 await action('hold');await page.locator('nav [data-room="outside"]').click();await action('ask-owner')
 for(const lang of ['ru','de','en']){
  await page.selectOption('#slime-language',lang)
  await action('ask-slimes');await action('give-piece');const before=await count();await action('give-piece');assert.equal(await count(),before+1)
  assert.ok(await page.locator('[data-action="ask-slimes"]').isVisible(),'another baby remains available')
  if(lang!=='ru')assert.ok(!/[А-Яа-яЁё]/.test(await page.locator('body').innerText()))
  await action('rest-friends')
 }
 await page.locator('.family-baby[data-baby="1"]').click()
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spielzeuge.slime-check.v1')))
 assert.equal(saved.babies.length,4);assert.equal(saved.babies[0].cuddles,4);assert.equal(saved.babies[1].cuddles,1);assert.equal(saved.babies[1].parent,'leo')
 await page.reload();assert.equal(await count(),4)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.screenshot({path:'tmp/slime-family-phone.png',fullPage:true})
 assert.deepEqual(errors,[])
 console.log('PASS: migrate existing baby, create three more with fresh consent/two pieces, three languages, rest together, separate hugs, reload and mobile layout')
}finally{await browser.close()}
