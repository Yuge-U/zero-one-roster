const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('dialog',d=>d.accept());page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url(),r.failure()));
 await page.addInitScript(()=>{if(!localStorage.getItem('practice-test-seeded')){localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,players:[],records:[],teams:[{id:'a',name:'チームA'},{id:'b',name:'チームB'}]}));localStorage.setItem('practice-test-seeded','yes')}});
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');assert.equal(await page.locator('#appVersion').textContent(),'v0.1.29');await page.waitForFunction(()=>typeof RosterOneDrive!=='undefined'&&typeof document.querySelector('#addPracticeBtn').onclick==='function');
 const plan={id:'p1',revision:'r1',hash:'hash1',title:'パスからの攻撃',team:'U15',goal:'判断',totalMinutes:30,items:[{id:'i1',name:'パス練習',minutes:10},{id:'i2',name:'3対3',minutes:20}]};
 await page.evaluate(plan=>{RosterOneDrive.readPracticePlans=async()=>({plans:[plan],warnings:[]})},plan);
 await page.click('#addPracticeBtn');await page.click('#loadPracticeBtn');await page.waitForFunction(()=>practicePlans.length===1);
 await page.fill('#practiceDate','2026-10-03');await page.selectOption('#practiceTeam','a');await page.selectOption('#practicePlan','r1');await page.locator('[data-practice-item="i2"]').uncheck();await page.locator('[data-practice-minutes="i1"]').fill('12');await page.fill('#practiceNote','実施メモ');await page.locator('#practiceForm button[type=submit]').click();
 assert.equal(await page.locator('#practiceDayList .practiceRecord').count(),1);assert.match(await page.locator('#practiceDayList').textContent(),/チームA.*12分/s);
 await page.click('#addPracticeBtn');await page.selectOption('#practiceTeam','b');await page.selectOption('#practicePlan','r1');await page.locator('#practiceForm button[type=submit]').click();
 assert.equal(await page.evaluate(()=>state.records.length),2);assert.equal(await page.evaluate(()=>state.activities.filter(x=>x.date==='2026-10-03').length),2);
 await page.selectOption('#activeTeam','');assert.equal(await page.locator('#practiceDayList .practiceRecord').count(),2);
 await page.evaluate(()=>practicePlans[0].title='後日のプラン変更');assert.equal(await page.evaluate(()=>state.records[0].plan.title),'パスからの攻撃');
 await page.click('[data-view="records"]');assert.equal(await page.locator('#practiceHistoryList .practiceRecord').count(),2);await page.locator('#practiceHistoryList [data-edit-practice]').first().click();await page.fill('#practiceNote','履歴から編集');await page.locator('#practiceForm button[type=submit]').click();assert.equal(await page.evaluate(()=>state.records.length),2);
 await page.reload();await page.click('[data-view="records"]');await page.locator('#practiceHistoryList [data-edit-practice]').first().click();assert.equal(await page.locator('#practicePlan').inputValue(),'r1');await page.click('#deletePracticeBtn');assert.equal(await page.evaluate(()=>state.records.filter(x=>!x.deleted).length),1);
 // Use an authentic sealed backup shape through the actual file picker.
 await page.click('[data-view="roster"]');await page.click('#addPracticeBtn');
 const backup=await page.evaluate(async()=>{const body={format:'zero-one-lab-operation',schemaVersion:1,scope:'guest-local',opId:'backup-r',entityId:'backup-p',parents:[],kind:'practice',payload:{title:'バックアップ練習',team:'B',goal:'シュート',totalMinutes:10,items:[{id:'bi',name:'シュート',minutes:10}]}};const outer={format:'zero-one-lab-backup',schemaVersion:1,scope:'guest-local',operations:[{body,hash:await RosterPractice.hash(body)}]};return{body:outer,hash:await RosterPractice.hash(outer)}});
 await page.locator('#practiceBackupFile').setInputFiles({name:'ZERO_ONE_Backup.data',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>practicePlans.some(x=>x.revision==='backup-r'));await page.selectOption('#practicePlan','backup-r');await page.selectOption('#practiceTeam','__new__');await page.fill('#practiceNewTeam','チームC');await page.locator('#practiceForm button[type=submit]').click();assert(await page.evaluate(()=>state.teams.some(t=>t.name==='チームC')));
 if(process.env.PRACTICE_SCREENSHOT){await page.setViewportSize({width:390,height:844});await page.locator('#practiceDayList [data-edit-practice]').first().click();await page.screenshot({path:process.env.PRACTICE_SCREENSHOT})}
 assert.deepEqual(errors,[]);console.log('PASS: plan load; date/team/items/time; same-day A+B; pinned snapshot; history/edit/reload/delete; backup import/new team');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
