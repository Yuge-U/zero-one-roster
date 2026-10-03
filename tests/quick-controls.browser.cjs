const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(localStorage.getItem('quick-seeded'))return;localStorage.setItem('quick-seeded','yes');localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,teams:[{id:'a',name:'A'},{id:'b',name:'B'}],players:[{id:'p1',lastName:'確認',firstName:'一',teamId:'a',teamName:'A',rosuta:'A'},{id:'p2',lastName:'確認',firstName:'二',teamId:'b',teamName:'B'}],records:[]}))});
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>document.querySelector('[data-attendance]')?.onchange);assert.equal(await page.locator('#appVersion').textContent(),'v0.1.29');
 const date=await page.inputValue('#attendanceDate');await page.locator('[data-attendance="p1"]').check();assert.equal(await page.locator('#playerDialog').isVisible(),false);
 assert.equal(await page.evaluate(()=>state.attendance[0].teamId),'a');assert.equal(await page.evaluate(()=>state.attendance[0].date),date);
 await page.selectOption('[data-player-roster="p1"]','');assert.equal(await page.evaluate(()=>rosterValue(state.players[0])),'');assert.equal(await page.locator('#playerDialog').isVisible(),false);
 await page.selectOption('[data-player-roster="p1"]','B');await page.selectOption('#filterRoster','B');assert.equal(await page.locator('.player').count(),1);await page.click('#clearFilters');
 await page.click('#nextDate');assert.equal(await page.locator('[data-attendance="p1"]').isChecked(),false);await page.click('#prevDate');assert(await page.locator('[data-attendance="p1"]').isChecked());
 await page.reload();assert(await page.locator('[data-attendance="p1"]').isChecked());assert.equal(await page.inputValue('[data-player-roster="p1"]'),'B');
 await page.evaluate(()=>{globalThis.testWrites=[];RosterOneDrive.isConnected=()=>true;RosterOneDrive.photoUrl=async()=>'';RosterOneDrive.write=async data=>testWrites.push(structuredClone(data))});
 await page.locator('[data-attendance="p1"]').uncheck();await page.locator('[data-attendance="p2"]').check();await page.waitForFunction(()=>testWrites.length>0);
 assert.equal(await page.evaluate(()=>state.attendance.length),2);assert.equal(await page.evaluate(()=>testWrites.at(-1).attendance.find(x=>x.playerId==='p1').status),'absent');assert.equal(await page.evaluate(()=>testWrites.at(-1).attendance.find(x=>x.playerId==='p2').teamId),'b');
 if(process.env.ROSTER_SCREENSHOT)await page.screenshot({path:process.env.ROSTER_SCREENSHOT,fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: mobile card attendance/roster without dialog; legacy clear; date/team scopes; filter; reload; automatic cloud save');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
