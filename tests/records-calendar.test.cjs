const {test}=require('node:test'),assert=require('node:assert/strict');
const Calendar=require('../records-calendar.js');
function fixture(){return {players:[{id:'p',lastName:'山田',firstName:'太郎',nameKana:'ヤマダ タロウ',teamId:'new'}],records:[{id:'c',type:'practice-comment',date:'2024-02-29',teamId:'old',teamName:'旧チームＡ',playerId:'p',playerName:'山田 太郎'},{id:'d',type:'practice-comment',date:'2024-02-29',teamId:'new',deleted:true},{id:'legacy',type:'communication',date:'2024/02/28',playerName:'退団した選手',note:'旧記録'},{id:'undated',type:'practice',menu:'日付なし',updatedAt:'2024-02-29T00:00:00Z'}],activities:[{date:'2024-02-29',teamId:'old',name:'練習'},{date:'2024-03-01',teamId:'new',name:'試合'}],attendance:[{date:'2024-02-29',teamId:'old',playerId:'p',status:'absent'},{date:'2024-02-29',teamId:'new',playerId:'missing',status:'present'}]}}
test('date selection respects leap days, year/month/day boundaries, and explicit dates only',()=>{
  assert.equal(Calendar.dateKey('2024-02-29T23:00:00Z'),'2024-02-29');assert.equal(Calendar.dateKey('2023-02-29'),'');assert.equal(Calendar.dateKey('2024-13-01'),'');assert.equal(Calendar.dateKey('2024/02/28'),'2024-02-28');
  assert.equal(Calendar.shift('2024-02-29','year',1),'2025-02-28');assert.equal(Calendar.shift('2024-01-31','month',1),'2024-02-29');assert.equal(Calendar.shift('2024-12-31','day',1),'2025-01-01');assert.equal(Calendar.shift('2025-01-01','month',-1),'2024-12-01');
});
test('read-only projection keeps historical teams, absent players, deleted-player snapshots, and undated source data',()=>{
  const data=fixture(),before=JSON.stringify(data),entries=Calendar.collect(data,[{id:'old',name:'現在のチームＡ'}]);
  assert.equal(entries.length,6);assert.equal(entries.find(e=>e.row.id==='c').teamId,'old');assert.equal(entries.find(e=>e.row.id==='legacy').playerName,'退団した選手');assert.equal(entries.filter(e=>e.kind==='attendance').length,2);
  assert(!entries.some(e=>e.row.id==='d'||e.row.id==='undated'));assert.equal(JSON.stringify(data),before);
});
test('team, name/kana, old/new team name and multiple search terms combine with exact period',()=>{
  const entries=Calendar.collect(fixture(),[{id:'old',name:'現在のチームＡ'}]);
  assert.equal(Calendar.filter(entries,{date:'2024-02-29',mode:'day',teamId:'old'}).length,3);
  assert.equal(Calendar.filter(entries,{date:'2024-02-29',mode:'month'}).length,5);assert.equal(Calendar.filter(entries,{date:'2024-02-29',mode:'year'}).length,6);
  assert.equal(Calendar.filter(entries,{query:'現在のチームa 山田　太郎'}).length,2);assert.equal(Calendar.filter(entries,{query:'旧チームa'}).length,1);
  assert.equal(Calendar.filter(entries,{query:'ﾔﾏﾀﾞﾀﾛｳ'}).length,2);assert.equal(Calendar.filter(entries,{query:'退団した選手'}).length,1);
  assert.equal(Calendar.filter(entries,{teamId:'new',query:'山田',date:'2024-02-29'}).length,0);assert.equal(Calendar.filter(entries,{date:'2025-02-28',mode:'year'}).length,0);
});
