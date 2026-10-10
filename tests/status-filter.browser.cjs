const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(localStorage.getItem('status-test'))return;localStorage.setItem('status-test','yes');localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,teams:[{id:'a',name:'A'},{id:'b',name:'B'}],players:[{id:'p1',lastName:'在籍',firstName:'一',status:'active',teamId:'a',school:'学校A'},{id:'p2',lastName:'休止',firstName:'二',status:'inactive',teamId:'a',school:'学校A'},{id:'p3',lastName:'退団',firstName:'三',status:'inactive',teamId:'b',school:'学校B'},{id:'p4',lastName:'旧データ',firstName:'四',school:'学校B'}],records:[{id:'record',type:'communication',playerId:'p2',note:'記録保持'}]}))});
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>document.querySelector('#filterStatus')?.onchange);assert.equal(await page.locator('#appVersion').textContent(),'v0.1.37');assert.equal(await page.inputValue('#filterStatus'),'active');assert.equal(await page.locator('.player').count(),2);
 await page.selectOption('#filterStatus','inactive');assert.equal(await page.locator('.player').count(),2);await page.selectOption('#activeTeam','a');assert.equal(await page.locator('.player').count(),1);assert(await page.locator('[data-id="p2"]').isVisible());
 await page.selectOption('#filterStatus','');assert.equal(await page.locator('.player').count(),2);await page.click('#clearFilters');assert.equal(await page.inputValue('#filterStatus'),'active');assert.equal(await page.locator('.player').count(),2);
 await page.locator('[data-id="p1"]').locator('h3').click();await page.selectOption('#status','inactive');await page.click('#savePlayerBtn');assert.equal(await page.locator('[data-id="p1"]').count(),0);assert.equal(await page.evaluate(()=>state.players.length),4);
 await page.selectOption('#filterStatus','inactive');assert.equal(await page.locator('.player').count(),3);await page.locator('[data-id="p1"]').locator('h3').click();await page.selectOption('#status','active');await page.click('#savePlayerBtn');assert.equal(await page.locator('[data-id="p1"]').count(),0);
 await page.reload();assert.equal(await page.inputValue('#filterStatus'),'active');assert.equal(await page.locator('.player').count(),2);assert.equal(await page.evaluate(()=>state.records[0].note),'記録保持');
 await page.fill('#search','該当なし');assert.match(await page.locator('#playerGrid').textContent(),/条件に一致する選手はいません/);assert.doesNotMatch(await page.locator('#playerGrid').textContent(),/まだ登録/);
 assert.deepEqual(errors,[]);console.log('PASS: default active, inactive/all, team combination, clear/reload defaults, edit status, legacy visibility, data/history retention and filtered empty state');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
