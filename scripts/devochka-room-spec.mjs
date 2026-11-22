// Verify that changing one painted object leaves the other pixels of the scene intact.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch(process.env.CHROMIUM_PATH ?
  {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'})
const regions = {
  curtains: [0,.38,.27,.626], table: [0,.758,1,.949], teapot: [.729,.089,.889,.25], cloth: [0,.926,1,1],
}
async function picture(p) {
  const stage=p.locator('.meal-stage')
  await stage.evaluate(async stage => {
    await document.fonts.ready
    const urls=[stage,...stage.querySelectorAll('.room-paint')].map(el=>getComputedStyle(el).backgroundImage.match(/url\("(.+?)"\)/)?.[1]).filter(Boolean)
    await Promise.all(urls.map(src=>{const image=new Image();image.src=src;return image.decode()}))
    await Promise.all([...stage.querySelectorAll('img')].map(im=>im.decode()))
  })
  return (await stage.screenshot({animations:'disabled'})).toString('base64')
}
async function verifyPaint(p) {
  const original=await picture(p)
  let previous=original
  for (const [id,rect] of Object.entries(regions)) {
    await p.locator(`[data-paint=${id}][data-value="3"]`).click()
    const after=await picture(p)
    const diff=await p.evaluate(async ({prev,curr,box})=>{
      const read=async src=>{
        const im=new Image();im.src='data:image/png;base64,'+src;await im.decode()
        const c=document.createElement('canvas');c.width=im.width;c.height=im.height
        const ctx=c.getContext('2d');ctx.drawImage(im,0,0)
        return {data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height}
      }
      const a=await read(prev), b=await read(curr)
      let inside=0,outside=0
      for(let i=0;i<a.data.length;i+=4){
        if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[i+c]-b.data[i+c])))<22)continue
        const x=(i/4%a.w)/a.w, y=Math.floor(i/4/a.w)/a.h
        if(x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3])inside++
        else outside++
      }
      return {inside,outside}
    },{prev:previous,curr:after,box:rect})
    assert(diff.inside>200,`${id} has no visible paint: ${JSON.stringify(diff)}`)
    assert(diff.outside<40,`${id} changed the rest of the kitchen: ${JSON.stringify(diff)}`)
    previous=after
  }
  for(const id of Object.keys(regions)) await p.locator(`[data-paint=${id}][data-value="0"]`).click()
  assert.equal(await picture(p),original,'Restoring the original paint restores the original art')
}
async function verifyPaidPicnic(p) {
  const key = 'spielzeuge.devochka.v1'
  await p.evaluate(k => localStorage.setItem(k,JSON.stringify({day:1,coins:12})),key)
  await p.reload()
  for (const id of ['roll','chips','water']) await p.locator(`[data-add=${id}]`).click()
  await p.locator('[data-action=checkout]').click()
  for (const n of [5,2]) await p.locator(`[data-coin="${n}"]`).click()
  await p.locator('.note-bottom [data-action=lever]').click()
  await p.locator('[data-table=roll]').click()
  await p.locator('[data-seat=girl]').click()
  // Older notebooks allowed a second basket to be filled during a meal.
  await p.evaluate(k=>{
    const book=JSON.parse(localStorage.getItem(k))
    book.cart=['dumpling']
    localStorage.setItem(k,JSON.stringify(book))
  },key)
  await p.reload()
  await p.locator('[data-nav=shop]').first().click()
  assert.equal(await p.locator('[data-add], [data-remove], [data-action=checkout], [data-action=wish]').count(),0)
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The paid order fits on screen')
  assert.equal(await p.locator('.paid-order .paid-portions li').count(),3)
  assert.equal(await p.locator('.paid-order .bowl-art').count(),1)
  await p.locator('.paid-order [data-action=goHome]').click()
  assert.equal(await p.locator('.meal-stage').getAttribute('data-scene'),'picnic')
  for (const [food,seat] of [['chips','girl'],['cat','cat']]) {
    await p.locator(`[data-table=${food}]`).click()
    if (food==='chips') await p.locator('[data-action=cut]').click()
    await p.locator(`[data-seat=${seat}]`).click()
  }
  await p.locator('[data-table=water]').click()
  await p.locator('[data-action=pour]').click()
  await p.locator('[data-action=next]').waitFor()
  await p.locator('[data-nav=album]').first().click()
  assert.equal(await p.locator('[data-stamp][aria-pressed=true]').getAttribute('data-stamp'),'1')
  await p.locator('[data-nav=shop]').first().click()
  assert.equal(await p.locator('[data-remove=dumpling]').count(),1)
  assert.equal(await p.locator('[data-add]').count(),4)
}
async function verifyFriendAndPuppy(p) {
  await p.locator('[data-pet=dog]').click()
  await p.locator('[data-action=studioDone]').click()
  await p.locator('[data-nav=shop]').first().click()
  for (const food of ['chips','chips','water']) await p.locator(`[data-add=${food}]`).click()
  await p.locator('[data-action=checkout]').click()
  await p.locator('[data-coin="5"]').click()
  await p.locator('.note-bottom [data-action=lever]').click()
  const cast = () => p.locator('.meal-stage [data-seat]').evaluateAll(els=>els.map(el=>el.dataset.seat))
  assert.deepEqual(await cast(),['friend','dog'])
  await p.locator('.studio-gear').click()
  await p.locator('[data-studio-tab=guests]').click()
  await p.locator('[data-guest=girl]').click()
  await p.locator('[data-pet=cat]').click()
  await p.locator('[data-action=studioDone]').click()
  assert.deepEqual(await cast(),['friend','dog'])
  for (let i=0; i<2; i++) {
    await p.locator('[data-table=chips]').click()
    await p.locator('[data-action=cut]').click()
    await p.locator('[data-seat=friend]').click()
  }
  await p.locator('[data-table=water]').click()
  await p.locator('[data-action=pour]').click()
  await p.locator('[data-table=water]').waitFor({state:'detached'})
  await p.reload()
  assert.deepEqual(await cast(),['friend','dog'])
  assert.equal(await p.locator('[data-table]').count(),1)
  await p.locator('[data-table=dog]').click()
  await p.locator('[data-seat=friend]').click()
  assert.equal(await p.locator('[data-table=dog]').count(),1)
  await p.locator('[data-seat=dog]').click()
  await p.locator('[data-action=next]').click()
  await p.locator('[data-add=water]').click()
  await p.locator('[data-action=checkout]').click()
  await p.locator('[data-coin="1"]').click()
  await p.locator('.note-bottom [data-action=lever]').click()
  assert.deepEqual(await cast(),['girl','cat'])
}
try {
  for(const [lang,width,height] of [['ru',1200,820],['de',320,700],['en',390,844]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<500})
    const p=await context.newPage()
    const errors=[]
    p.on('pageerror',error=>errors.push(error.message))
    await p.goto(base+'/devochka/?lang='+lang)
    await p.locator('[data-nav=home]').first().click()
    await p.locator('.studio-gear').click()
    assert.equal(await p.locator('.studio-note [data-paint]').count(),16)
    if(width===1200) await verifyPaint(p)
    else await p.locator('[data-paint=teapot][data-value="2"]').click()
    await p.locator('[data-studio-tab=guests]').click()
    assert.equal(await p.locator('.guest-pass.sealed').count(),3)
    await p.locator('[data-guest=cat]').click()
    assert.equal(await p.locator('[data-guest=girl]').getAttribute('aria-pressed'),'true')
    await p.evaluate(()=>{
      const key='spielzeuge.devochka.v1'
      localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key)),day:3}))
    })
    await p.reload()
    await p.locator('[data-nav=home]').first().click()
    await p.locator('.studio-gear').click()
    await p.locator('[data-studio-tab=guests]').click()
    for(const id of ['cat','dog','friend']) {
      await p.locator(`[data-guest=${id}]`).click()
      assert.equal(await p.locator(`.table-character[data-seat=${id}]`).count(),1)
    }
    await p.locator('[data-style=eyes][data-value="2"]').click()
    await p.locator('[data-pet=cat]').click()
    assert.equal(await p.locator('[data-pet=cat]').getAttribute('aria-pressed'),'true')
    await verifyFriendAndPuppy(p)
    await verifyPaidPicnic(p)
    assert.deepEqual(await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]),[width,width])
    assert.deepEqual(errors,[])
    await context.close()
    console.log('OK room paint, guests, paid shop, sticker selection and saved basket:',lang,width+'×'+height)
  }
} finally { await browser.close() }
