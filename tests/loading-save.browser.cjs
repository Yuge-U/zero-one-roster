'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,players:[{id:'p1',lastName:'確認',firstName:'選手',school:'大府西中',status:'active'}],records:[]})));
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');assert.equal(await page.locator('#appVersion').textContent(),'v0.1.36');
 await page.locator('.player h3').click();await page.fill('#lastName','変更済み');
 await page.locator('#playerDialog').evaluate(el=>el.scrollTop=el.scrollHeight);
 const button=await page.locator('#savePlayerBtn').boundingBox(),dialog=await page.locator('#playerDialog').boundingBox();assert(button.y>=dialog.y&&button.y<dialog.y+100);await page.click('#savePlayerBtn');
 assert.equal(await page.evaluate(()=>state.players[0].lastName),'変更済み');assert.equal(await page.locator('#playerDialog').isVisible(),false);
 let releaseImage;const imageGate=new Promise(r=>releaseImage=r);
 await page.route('**/test-photo.png',async route=>{await imageGate;await route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1cAAAAASUVORK5CYII=','base64')})});
 await page.evaluate(()=>{
   RosterOneDrive.isConnected=()=>true;RosterOneDrive.connectionStatus=()=>({state:'connected',account:true,username:'synthetic@example.invalid'});RosterOneDrive.read=()=>new Promise(resolve=>globalThis.releaseRead=()=>resolve(structuredClone(state)));RosterOneDrive.write=async()=>{};
   RosterOneDrive.photoUrl=async()=>new URL('test-photo.png',location.href).href;
   globalThis.syncPromise=syncCloud(true);
 });
 assert.equal(await page.locator('#zeroOneConnection').getAttribute('data-sync'),'busy');await page.locator('.zoc-primary').click();assert.match(await page.locator('.zoc-dialog-sync').innerText(),/同期中/);assert(await page.locator('.zoc-sync').isDisabled());await page.locator('.zoc-close').click();assert.equal(await page.locator('#loadingStatus').isVisible(),false);
 await page.evaluate(()=>releaseRead());await page.waitForFunction(()=>!syncBusy&&pendingPhotoLoads>0);
 assert.match(await page.locator('#loadingStatus').textContent(),/写真を読み込み中/);assert.equal(await page.locator('.cardPhoto').textContent(),'読み込み中…');
 releaseImage();await page.waitForFunction(()=>pendingPhotoLoads===0);assert.equal(await page.locator('#loadingStatus').isVisible(),false);assert.equal(await page.locator('.cardPhoto').textContent(),'');
 await page.evaluate(async()=>{photoCache.clear();RosterOneDrive.photoUrl=async()=>{throw new Error('test')};render()});await page.waitForFunction(()=>pendingPhotoLoads===0);
 assert.equal(await page.locator('.cardPhoto').textContent(),'写真読込失敗');assert.equal(await page.locator('#loadingStatus').isVisible(),false);
 await page.evaluate(async()=>{RosterOneDrive.read=async()=>{throw new Error('offline')};await refreshCloud()});assert.equal(await page.locator('#loadingStatus').isVisible(),false);await page.locator('.zoc-primary').click();assert.match(await page.locator('.zoc-dialog-sync').innerText(),/読込失敗/);assert.equal(await page.locator('#zeroOneConnection').getAttribute('data-sync'),'error');
 assert.deepEqual(errors,[]);console.log('PASS: sticky top save on mobile; data loading; image loading until displayed; photo/data failure clears loading.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
