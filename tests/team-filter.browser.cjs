'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   if(localStorage.getItem('test-seeded'))return;
   const players=Array.from({length:47},(_,i)=>({id:'p'+i,lastName:'選手',firstName:String(i),status:'active',school:'大府西中',...(i<14?{teamId:'obu',teamName:'大府市立大府西中学校',category:'U15'}:{})}));
   localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,players,records:[],teams:[{id:'obu',name:'大府市立大府西中学校'}]}));
   localStorage.setItem('zero-one-roster-active-team','obu');localStorage.setItem('test-seeded','1');
 });
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');
 assert.equal(await page.locator('#appVersion').textContent(),'v0.1.28');
 assert.equal(await page.locator('.player').count(),14);assert.equal(await page.locator('#playerCount').textContent(),'47');
 await page.selectOption('#activeTeam','');assert.equal(await page.locator('.player').count(),47);assert.equal(await page.locator('#filterCount').textContent(),'表示 47 / 47人');
 await page.reload();assert.equal(await page.locator('.player').count(),47);assert.equal(await page.locator('#activeTeam').inputValue(),'');
 await page.selectOption('#activeTeam','obu');await page.fill('#search','存在しない選手');assert.equal(await page.locator('.player').count(),0);
 await page.click('#clearFilters');assert.equal(await page.locator('.player').count(),47);assert.equal(await page.locator('#search').inputValue(),'');
 await page.evaluate(()=>{activeTeam='deleted-team';render()});assert.equal(await page.locator('.player').count(),47);
 assert.equal(await page.evaluate(()=>state.players.filter(p=>!p.teamId).length),33);
 assert.deepEqual(errors,[]);console.log('PASS: saved team 14; all teams 47; reload; clear team/search; stale team; 33 affiliations preserved.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
