const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(localStorage.getItem('grades-test'))return;localStorage.setItem('grades-test','yes');const d=new Date(),fy=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;localStorage.setItem('zero-one-roster-v1',JSON.stringify({schema:'zero-one-roster',version:1,teams:[{id:'a',name:'A'},{id:'b',name:'B'}],players:[{id:'p1',birthday:(fy-14)+'-06-28T07:00:00Z',grade:'中学1年'},{id:'p2',grade:'中学校２年生'},{id:'p3',birthday:(fy-15)+'-06-28',grade:'中学2年'},{id:'p4',grade:'中学1年'},{id:'p5',grade:''},{id:'p6',teamId:'b',grade:'高校2年'}].map(p=>({lastName:'確認',firstName:p.id,status:'active',teamId:'a',...p})),records:[]}))});
 await page.goto(process.env.ROSTER_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>document.querySelector('#activeTeam')?.onchange);assert.equal(await page.locator('#appVersion').textContent(),'v0.1.32');await page.selectOption('#activeTeam','a');
 for(const grade of ['中1','中2','中3','unknown'])assert.equal(await page.locator('[data-grade="'+grade+'"]').count(),1);assert.equal(await page.locator('[data-grade="高2"]').count(),0);
 assert.match(await page.locator('[data-id="p1"]').textContent(),/中2/);assert.match(await page.locator('[data-id="p2"]').textContent(),/中2/);assert.match(await page.locator('[data-id="p3"]').textContent(),/中3/);
 await page.click('[data-grade="中2"]');assert.equal(await page.locator('.player').count(),2);await page.locator('[data-id="p1"]').locator('h3').click();assert.equal(await page.inputValue('#grade'),'中2');assert.match(await page.inputValue('#birthday'),/^\d{4}-06-28$/);await page.fill('#memo','生年月日を保持');await page.click('#savePlayerBtn');assert.equal(await page.locator('.player').count(),2);assert.match(await page.evaluate(()=>state.players[0].birthday),/^\d{4}-06-28$/);
 await page.locator('[data-id="p2"]').locator('h3').click();await page.fill('#memo','学年のみの旧データを保持');await page.click('#savePlayerBtn');assert.equal(await page.evaluate(()=>state.players[1].grade),'中2');
 await page.click('[data-grade=""]');await page.click('[data-grade="unknown"]');assert.equal(await page.locator('.player').count(),1);assert(await page.locator('[data-id="p5"]').isVisible());
 await page.selectOption('#activeTeam','b');assert.equal(await page.locator('[data-grade="高2"]').count(),1);await page.selectOption('#activeTeam','a');assert.equal(await page.locator('[data-grade="中2"]').count(),1);
 await page.reload();assert.equal(await page.locator('[data-grade="中2"]').count(),1);assert.deepEqual(errors,[]);console.log('PASS: mixed imported grades yield 中1/中2/中3; cards/filter/details agree; ISO birthday and fallback grade survive edits; unknown group; team switching/reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
