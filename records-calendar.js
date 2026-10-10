'use strict';
// Read-only calendar projection. Dates and historical team IDs never change here.
const RosterRecordCalendar=(()=>{
  const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/gu,'');
  function dateKey(value){
    const match=String(value??'').match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:$|[T\s])/);
    if(!match)return '';
    const [,year,month,day]=match,probe=new Date(Number(year),Number(month)-1,Number(day),12);
    return probe.getFullYear()===Number(year)&&probe.getMonth()+1===Number(month)&&probe.getDate()===Number(day)?`${year}-${month}-${day}`:'';
  }
  function period(date,mode){return mode==='year'?date.slice(0,4):mode==='month'?date.slice(0,7):date}
  function shift(date,mode,amount){
    const [y,m,d]=date.split('-').map(Number);let next;
    if(mode==='day')next=new Date(y,m-1,d+amount,12);
    else{const first=new Date(y+(mode==='year'?amount:0),m-1+(mode==='month'?amount:0),1,12);next=new Date(first.getFullYear(),first.getMonth(),Math.min(d,new Date(first.getFullYear(),first.getMonth()+1,0).getDate()),12)}
    return [next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');
  }
  function collect(data,teams=[]){
    const players=new Map(data.players.map(p=>[String(p.id),p])),catalog=new Map(teams.map(t=>[String(t.id),t.name]));
    const entries=[];
    function add(kind,row){
      const date=dateKey(row.date);if(row.deleted||!date)return;
      const teamId=String(row.teamId||''),player=players.get(String(row.playerId));
      const playerName=player?([player.lastName,player.firstName].filter(Boolean).join(' ')||player.name||row.playerName||'選手'):row.playerName||'削除済み選手';
      const teamName=catalog.get(teamId)||row.teamName||teamId||'チーム未設定';
      const search=[teamName,row.teamName,row.playerName,player?.nameKana,player?.name,player?playerName:''].map(normalize).join('\n');
      entries.push({kind,row,date,teamId,teamName,playerName,search});
    }
    for(const row of data.records)add(row.type==='practice-session'?'practice':row.type==='practice-comment'?'comment':'other',row);
    for(const row of data.activities||[])add('activity',row);
    for(const row of data.attendance||[])add('attendance',row);
    return entries;
  }
  function filter(entries,{teamId='',query='',date='',mode='day'}={}){
    const words=String(query).normalize('NFKC').toLowerCase().trim().split(/\s+/u).filter(Boolean).map(normalize),prefix=date?period(date,mode):'';
    return entries.filter(e=>(!teamId||e.teamId===teamId)&&(!prefix||e.date.startsWith(prefix))&&words.every(word=>e.search.includes(word)));
  }
  return{dateKey,period,shift,collect,filter};
})();
if(typeof module!=='undefined')module.exports=RosterRecordCalendar;

let recordDate='',recordMode='day',recordTeam='',recordCalendarStarted=false;
function recordCalendarEnter(){
  if(!recordCalendarStarted){recordDate=activeDate();recordTeam=activeTeam;recordCalendarStarted=true}
  renderRecordCalendar();
}
function recordCalendarTeams(){
  const teams=new Map(teamCatalog().map(t=>[String(t.id),t]));
  for(const row of [...state.records,...state.activities,...state.attendance])if(row.teamId&&!teams.has(String(row.teamId)))teams.set(String(row.teamId),{id:String(row.teamId),name:row.teamName||String(row.teamId)});
  return [...teams.values()];
}
function renderRecordCalendar(){
  if(!recordCalendarStarted||$('#recordsView').hidden)return;
  const teams=recordCalendarTeams();
  $('#recordTeam').innerHTML='<option value="">すべてのチーム</option>'+teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
  $('#recordTeam').value=recordTeam;
  const entries=RosterRecordCalendar.collect(state,teams),query=$('#recordSearch').value;
  const matches=RosterRecordCalendar.filter(entries,{teamId:recordTeam,query});
  const visible=RosterRecordCalendar.filter(matches,{date:recordDate,mode:recordMode});
  const counts=new Map();for(const e of matches)counts.set(e.date,(counts.get(e.date)||0)+1);
  const [y,m,d]=recordDate.split('-').map(Number),month=recordDate.slice(0,7);
  document.querySelectorAll('[data-record-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.recordMode===recordMode)));
  const pickers={year:$('#recordYear'),month:$('#recordMonth'),day:$('#recordDate')};
  for(const [mode,input] of Object.entries(pickers))input.closest('label').hidden=mode!==recordMode;
  pickers.year.value=y;pickers.month.value=month;pickers.day.value=recordDate;
  const label=y+'年'+(recordMode!=='year'?' '+m+'月':'')+(recordMode==='day'?' '+d+'日':'');
  $('#recordPeriodTitle').textContent=label;
  $('#recordPrev').setAttribute('aria-label',recordMode==='year'?'前年':recordMode==='month'?'前月':'前日');
  $('#recordNext').setAttribute('aria-label',recordMode==='year'?'翌年':recordMode==='month'?'翌月':'翌日');
  $('#recordWeek').hidden=recordMode==='year';
  const calendar=$('#recordCalendar');calendar.className=recordMode==='year'?'recordYearGrid':'recordMonthGrid';
  if(recordMode==='year'){
    const totals=new Map();for(const e of matches)if(e.date.startsWith(String(y)))totals.set(e.date.slice(0,7),(totals.get(e.date.slice(0,7))||0)+1);
    calendar.innerHTML=Array.from({length:12},(_,i)=>{const key=y+'-'+String(i+1).padStart(2,'0'),count=totals.get(key)||0;return '<button type="button" data-record-month="'+key+'" class="recordMonth '+(count?'hasRecords':'')+'" aria-label="'+y+'年'+(i+1)+'月、記録'+count+'件"><b>'+(i+1)+'月</b><span>記録 '+count+'件</span></button>'}).join('');
  }else{
    const cells=Array.from({length:new Date(y,m-1,1).getDay()},()=>'<div class="recordDay blank" aria-hidden="true"></div>');
    for(let day=1;day<=new Date(y,m,0).getDate();day++){
      const date=month+'-'+String(day).padStart(2,'0'),count=counts.get(date)||0;
      cells.push('<button type="button" data-record-date="'+date+'" class="recordDay '+(count?'hasRecords':'')+' '+(date===recordDate?'selected':'')+'" aria-pressed="'+(recordMode==='day'&&date===recordDate)+'" '+(date===today()?'aria-current="date"':'')+' aria-label="'+y+'年'+m+'月'+day+'日、記録'+count+'件"><b>'+day+'</b><span>'+(count?count+'件':'')+'</span></button>');
    }
    calendar.innerHTML=cells.join('');
  }
  $('#recordResultsLabel').textContent=label+' · '+new Set(visible.map(e=>e.date)).size+'日 · 記録 '+visible.length+'件';
  $('#recordEmpty').hidden=visible.length>0;
  const sorted=kind=>visible.filter(e=>e.kind===kind).sort((a,b)=>b.date.localeCompare(a.date)||String(b.row.updatedAt||'').localeCompare(String(a.row.updatedAt||'')));
  const comments=sorted('comment'),practice=sorted('practice'),other=sorted('other');
  $('#commentHistoryList').innerHTML=comments.map(e=>commentMarkup(e.row)).join('');
  $('#commentHistoryList').closest('section').hidden=!comments.length;
  $('#practiceHistoryList').innerHTML=practice.map(e=>practiceRecordMarkup(e.row)).join('');
  $('#practiceHistoryList').closest('section').hidden=!practice.length;
  $('#recordOtherList').innerHTML=other.map(e=>'<article class="practiceRecord"><strong>'+esc(e.row.menu||e.row.genre||(e.row.playerId||e.row.playerName?e.playerName:'記録'))+'</strong><small>'+esc(e.date)+' · '+esc(e.teamName)+'</small><p>'+esc(e.row.content||e.row.note||'')+'</p></article>').join('');
  $('#recordOtherSection').hidden=!other.length;
  const groups=new Map();
  for(const entry of visible.filter(e=>e.kind==='activity'||e.kind==='attendance')){
    const key=JSON.stringify([entry.date,entry.teamId]);if(!groups.has(key))groups.set(key,{...entry,activities:[],attendance:[]});
    groups.get(key)[entry.kind==='activity'?'activities':'attendance'].push(entry);
  }
  const activities=[...groups.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.teamName.localeCompare(b.teamName,'ja'));
  $('#recordActivitySection').hidden=!activities.length;
  $('#recordSummary').textContent='活動・出欠 '+activities.length+'件';
  $('#activityHistory').innerHTML=activities.map(g=>'<article class="historyRow"><div><strong>'+esc(g.date)+'</strong><span>'+esc(g.teamName)+'</span></div><p>'+esc(g.activities.map(e=>e.row.name).join('、')||'出欠記録')+'</p>'+(g.activities.some(e=>e.row.note)?'<p>'+esc(g.activities.map(e=>e.row.note).filter(Boolean).join(' / '))+'</p>':'')+'<p>'+esc(g.attendance.map(e=>e.playerName+'（'+(e.row.status==='present'?'出席':'欠席')+'）').join('、')||'出欠の記録なし')+'</p><button type="button" class="btn light" data-history-date="'+esc(g.date)+'" data-history-team="'+esc(g.teamId)+'">この日の名簿を見る</button></article>').join('');
  $('#recordsView').querySelectorAll('[data-edit-comment]').forEach(b=>b.onclick=()=>openDailyComment('',b.dataset.editComment));
  $('#recordsView').querySelectorAll('[data-edit-practice]').forEach(b=>b.onclick=()=>openPracticeRecord(b.dataset.editPractice));
  $('#recordsView').querySelectorAll('[data-history-date]').forEach(b=>b.onclick=()=>{
    selectedDate=b.dataset.historyDate;activeTeam=teamCatalog().some(t=>String(t.id)===b.dataset.historyTeam)?b.dataset.historyTeam:'';
    selectedGrades.clear();localStorage.setItem('zero-one-roster-active-team',activeTeam);
    document.querySelector('[data-view="roster"]').click();render();
  });
  calendar.querySelectorAll('[data-record-month]').forEach(b=>b.onclick=()=>{recordDate=b.dataset.recordMonth+'-01';recordMode='month';renderRecordCalendar()});
  calendar.querySelectorAll('[data-record-date]').forEach(b=>b.onclick=()=>{recordDate=b.dataset.recordDate;recordMode='day';renderRecordCalendar()});
}
function initRecordCalendar(){
  document.querySelectorAll('[data-record-mode]').forEach(b=>b.onclick=()=>{recordMode=b.dataset.recordMode;renderRecordCalendar()});
  $('#recordDate').onchange=e=>{const date=RosterRecordCalendar.dateKey(e.target.value);if(date)recordDate=date;renderRecordCalendar()};
  $('#recordMonth').onchange=e=>{const date=RosterRecordCalendar.dateKey(e.target.value+'-01');if(date)recordDate=date;renderRecordCalendar()};
  $('#recordYear').onchange=e=>{const year=Number(e.target.value);if(Number.isInteger(year)&&year>=1900&&year<=9999)recordDate=RosterRecordCalendar.shift(recordDate,'year',year-Number(recordDate.slice(0,4)));renderRecordCalendar()};
  $('#recordPrev').onclick=()=>{const next=RosterRecordCalendar.shift(recordDate,recordMode,-1);if(Number(next.split('-')[0])>=1900)recordDate=next;renderRecordCalendar()};
  $('#recordNext').onclick=()=>{const next=RosterRecordCalendar.shift(recordDate,recordMode,1);if(Number(next.split('-')[0])<=9999)recordDate=next;renderRecordCalendar()};
  $('#recordToday').onclick=()=>{recordDate=today();renderRecordCalendar()};
  $('#recordTeam').onchange=e=>{recordTeam=e.target.value;renderRecordCalendar()};
  $('#recordSearch').oninput=renderRecordCalendar;
  $('#recordClear').onclick=()=>{recordTeam='';$('#recordSearch').value='';renderRecordCalendar()};
}
