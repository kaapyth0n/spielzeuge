import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.env.SLIME_BASE_URL||'http://localhost:5173')+'/slime-check/?lang=ru')
 await page.evaluate(()=>localStorage.setItem('spielzeuge.slime-check.v1',JSON.stringify({sound:false,babies:Array.from({length:8},(_,i)=>({color:i%2?'berry':'mint',parent:'leo',cuddles:0}))})))
 await page.reload();assert.equal(await page.locator('.scene .baby-slime').count(),1)
 await page.locator('[data-companion="2"]').click();assert.equal(await page.locator('.scene .baby-slime').getAttribute('data-baby'),'2')
 await page.locator('.scene .baby-slime').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spielzeuge.slime-check.v1')).babies[2].cuddles),1)
 await page.reload();assert.equal(await page.locator('.scene .baby-slime').getAttribute('data-baby'),'2')
 await page.locator('[data-companion="all"]').click();assert.equal(await page.locator('.scene .baby-slime').count(),8)
 for(const lang of ['de','en','ru']){await page.selectOption('#slime-language',lang);assert.ok(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))}
 await page.locator('.baby-parade [data-baby="7"]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spielzeuge.slime-check.v1')).babies[7].cuddles),1)
 await page.locator('.baby-parade').evaluate(el=>el.scrollLeft=0)
 await page.screenshot({path:'tmp/slime-companions-phone.png',fullPage:true})
 await page.reload();assert.equal(await page.locator('.scene .baby-slime').count(),8)
 await page.locator('nav [data-room="stretch"]').click();assert.equal(await page.locator('.scene .baby-slime').count(),0)
 await page.locator('nav [data-room="home"]').click();assert.equal(await page.locator('.scene .baby-slime').count(),8)
 await page.locator('[data-companion="1"]').click();assert.equal(await page.locator('.scene .baby-slime').count(),1);assert.equal(await page.locator('.scene .baby-slime').getAttribute('data-baby'),'1')
 assert.deepEqual(errors,[]);console.log('PASS: select any baby, individual hugs, all eight together, horizontal access, saved selection, three languages, mobile and stretch room')
}finally{await browser.close()}
