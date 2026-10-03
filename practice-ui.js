'use strict';
let practicePlans=[],practiceEditing=null,practiceLoadedPlan=null,practiceLibraryBusy=false;
function practiceRecords(){return state.records.filter(r=>r.type==='practice-session'&&!r.deleted&&(!activeTeam||String(r.teamId)===String(activeTeam))).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt))}
function practiceRecordMarkup(r){return '<article class="practiceRecord"><div><strong>'+esc(r.plan.title)+'</strong><small>'+esc(r.date)+' · '+esc(r.teamName)+' · '+r.items.reduce((n,x)=>n+x.actualMinutes,0)+'分</small></div><ul>'+r.items.map(x=>'<li>'+esc(x.name)+' · '+x.actualMinutes+'分</li>').join('')+'</ul>'+(r.note?'<p>'+esc(r.note)+'</p>':'')+'<button type="button" class="btn light" data-edit-practice="'+esc(r.id)+'">詳細・編集</button></article>'}
function renderPracticeRecords(){
  const records=practiceRecords(),daily=records.filter(r=>r.date===activeDate());
  $('#practiceDayLabel').textContent=activeDate()+' · '+(selectedTeam()?.name||'すべてのチーム');
  $('#practiceDayList').innerHTML=daily.length?daily.map(practiceRecordMarkup).join(''):'<p class="practiceHint">この日の練習記録はまだありません。</p>';
  $('#practiceHistoryList').innerHTML=records.length?records.map(practiceRecordMarkup).join(''):'<p class="practiceHint">記録した練習を日付・チーム別に確認できます。</p>';
  document.querySelectorAll('[data-edit-practice]').forEach(b=>b.onclick=()=>openPracticeRecord(b.dataset.editPractice));
}
function fillPracticeChoices(selected=''){
  const choices=[...practicePlans];if(practiceLoadedPlan&&!choices.some(p=>p.revision===practiceLoadedPlan.revision))choices.unshift(practiceLoadedPlan);
  $('#practicePlan').innerHTML='<option value="">練習プランを選択</option>'+choices.map(p=>'<option value="'+esc(p.revision)+'">'+esc(p.title)+(p.team?'（'+esc(p.team)+'）':'')+'</option>').join('');
  $('#practicePlan').value=selected;
}
function showPracticeItems(plan,record=null){
  practiceLoadedPlan=plan;
  $('#practicePlanSummary').textContent=plan?[plan.goal,'プランの対象：'+plan.team,'予定 '+plan.totalMinutes+'分'].join(' · '):'';
  $('#practiceItems').innerHTML=plan?plan.items.map(item=>{const saved=record?.items.find(x=>x.id===item.id);return '<label class="practiceItem"><input type="checkbox" data-practice-item="'+esc(item.id)+'" '+(!record||saved?'checked':'')+'><span><b>'+esc(item.name)+'</b><small>'+esc([item.variation,item.rule].filter(Boolean).join(' · '))+'</small></span><span class="practiceMinutes"><input type="number" min="0" max="600" step="1" value="'+(saved?saved.actualMinutes:item.minutes)+'" data-practice-minutes="'+esc(item.id)+'" '+(record&&!saved?'disabled':'')+' aria-label="'+esc(item.name)+'の実施時間"> 分</span></label>'}).join(''):'';
  document.querySelectorAll('[data-practice-item]').forEach(el=>el.onchange=()=>{el.closest('.practiceItem').querySelector('input[type=number]').disabled=!el.checked});
}
function openPracticeRecord(id=''){
  practiceEditing=state.records.find(r=>r.id===id&&r.type==='practice-session'&&!r.deleted)||null;
  const teams=teamCatalog();$('#practiceTeam').innerHTML='<option value="">実施チームを選択</option>'+teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'<option value="__new__">新しいチームを登録</option>';
  if(practiceEditing&&!teams.some(t=>String(t.id)===practiceEditing.teamId))$('#practiceTeam').insertAdjacentHTML('beforeend','<option value="'+esc(practiceEditing.teamId)+'">'+esc(practiceEditing.teamName)+'</option>');
  $('#practiceDate').value=practiceEditing?.date||activeDate();$('#practiceTeam').value=practiceEditing?.teamId||activeTeam;$('#practiceNewTeam').value='';$('#practiceNewTeamLabel').hidden=true;
  $('#practiceNote').value=practiceEditing?.note||'';$('#practiceFormStatus').textContent='';$('#deletePracticeBtn').hidden=!practiceEditing;
  practiceLoadedPlan=practiceEditing?.plan||null;fillPracticeChoices(practiceLoadedPlan?.revision);showPracticeItems(practiceLoadedPlan,practiceEditing);
  $('#practiceDialog').showModal();if(!practicePlans.length&&!practiceEditing&&RosterOneDrive.isConnected())loadPracticeLibrary();
}
async function loadPracticeLibrary(file=null){
  if(practiceLibraryBusy)return;practiceLibraryBusy=true;$('#loadPracticeBtn').disabled=true;$('#practiceBackupFile').disabled=true;$('#practiceLibraryStatus').textContent='PRACTICEの練習プランを読み込み中…';
  try{
    let result;if(file){if(file.size>40*1024*1024)throw new Error('バックアップは40MB以下にしてください');result=await RosterPractice.backup(JSON.parse(await file.text()))}else result=await RosterOneDrive.readPracticePlans((n,total)=>{$('#practiceLibraryStatus').textContent='PRACTICEを読み込み中 '+n+' / '+total+'件'});
    practicePlans=result.plans;fillPracticeChoices(practiceLoadedPlan?.revision);
    $('#practiceLibraryStatus').textContent=practicePlans.length+'件の練習プランを読み込みました。'+(result.warnings.length?' '+result.warnings.join(' / '):'')+(practicePlans.length?'':' PRACTICEで保存・同期するか、全体バックアップを選択してください。');
  }catch(e){$('#practiceLibraryStatus').textContent='読み込み失敗：'+e.message}
  finally{practiceLibraryBusy=false;$('#loadPracticeBtn').disabled=false;$('#practiceBackupFile').disabled=false}
}
function initPracticeUI(){
  $('#addPracticeBtn').onclick=()=>openPracticeRecord();$('#practiceDialog .close').onclick=()=>$('#practiceDialog').close();
  $('#loadPracticeBtn').onclick=()=>loadPracticeLibrary();$('#practiceBackupFile').onchange=e=>{const file=e.target.files?.[0];if(file)loadPracticeLibrary(file);e.target.value=''};
  $('#practicePlan').onchange=e=>{const plan=practicePlans.find(p=>p.revision===e.target.value)||(practiceEditing?.plan.revision===e.target.value?practiceEditing.plan:null);showPracticeItems(plan)};
  $('#practiceTeam').onchange=()=>{$('#practiceNewTeamLabel').hidden=$('#practiceTeam').value!=='__new__'};
  $('#practiceForm').onsubmit=e=>{
    e.preventDefault();try{
      const teamId=$('#practiceTeam').value;let team=teamCatalog().find(t=>String(t.id)===teamId)||(practiceEditing?.teamId===teamId?{id:teamId,name:practiceEditing.teamName}:null);
      if(teamId==='__new__'){const name=$('#practiceNewTeam').value.trim();if(!name)throw new Error('チーム名を入力してください');team=teamCatalog().find(t=>t.name===name)||{id:uuid(),name,updatedAt:now()}}
      const items=[...document.querySelectorAll('[data-practice-item]')].filter(el=>el.checked).map(el=>{const item=practiceLoadedPlan.items.find(x=>x.id===el.dataset.practiceItem);const input=[...document.querySelectorAll('[data-practice-minutes]')].find(x=>x.dataset.practiceMinutes===item.id);return{...item,actualMinutes:input.value===''?NaN:Number(input.value)}});
      const record=RosterPractice.makeRecord({previous:practiceEditing,date:$('#practiceDate').value,team,plan:practiceLoadedPlan,items,note:$('#practiceNote').value});
      const current=state.records.findIndex(r=>r.id===record.id);if(current>=0)state.records[current]=record;else state.records.push(record);
      if(!teamCatalog().some(t=>String(t.id)===String(team.id)))state.teams.push(team);
      // Keep different teams' activities on the same date separate.
      if(!state.activities.some(a=>a.date===record.date&&String(a.teamId||'')===record.teamId))state.activities.push({id:uuid(),date:record.date,teamId:record.teamId,name:'練習',note:'',updatedAt:now()});
      activeTeam=record.teamId;selectedDate=record.date;selectedGrades.clear();localStorage.setItem('zero-one-roster-active-team',activeTeam);save();$('#practiceDialog').close();
    }catch(error){$('#practiceFormStatus').textContent=error.message}
  };
  $('#deletePracticeBtn').onclick=()=>{if(!practiceEditing||!confirm('この日の練習記録を削除しますか？ PRACTICEのプランは残ります。'))return;const record=state.records.find(r=>r.id===practiceEditing.id);if(record){record.deleted=true;record.updatedAt=now();save()}$('#practiceDialog').close()};
}
