'use strict';
// One record per date/team/subject lets separate comments merge independently.
const RosterComments={
  id(date,teamId,playerId=''){return 'practice-comment:'+JSON.stringify([date,String(teamId||''),String(playerId||'')])},
  make({date,teamId='',teamName='',playerId='',playerName='',text,updatedAt=new Date().toISOString()}){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日付を選択してください');
    if(!teamId&&!playerId)throw new Error('チームを選択してください');
    text=String(text||'').trim();if(text.length>500)throw new Error('コメントは500文字以内で入力してください');
    return {id:this.id(date,teamId,playerId),type:'practice-comment',date,teamId:String(teamId),teamName,playerId:String(playerId),playerName,text,deleted:!text,updatedAt};
  }
};
let commentTarget=null;
function playerCommentName(p){return [p.lastName,p.firstName].filter(Boolean).join(' ')||p.name||'選手'}
function dailyCommentFor(player){const teamId=activeTeam||RosterTeams.membership(player).id;return state.records.find(r=>r.id===RosterComments.id(activeDate(),teamId,player.id)&&!r.deleted)}
function playerCommentMarkup(player){const record=dailyCommentFor(player);return '<div class="playerComment"><button type="button" class="btn light" data-player-comment="'+esc(player.id)+'">'+(record?'一言を編集':'一言コメント')+'</button>'+(record?'<p>'+esc(record.text)+'</p>':'')+'</div>'}
function commentMarkup(record){const player=state.players.find(p=>p.id===record.playerId);return '<article class="practiceRecord"><strong>'+esc(record.playerId?(player?playerCommentName(player):record.playerName||'選手'):'チーム全体')+'</strong><small>'+esc(record.date)+' · '+esc(teamDisplayName(record.teamId,record.teamName)||'チーム未設定')+'</small><p>'+esc(record.text)+'</p><button type="button" class="btn light" data-edit-comment="'+esc(record.id)+'">一言を編集</button></article>'}
function renderDailyComments(){
  const records=state.records.filter(r=>r.type==='practice-comment'&&!r.deleted&&(!activeTeam||r.teamId===activeTeam)).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
  const daily=records.filter(r=>!r.playerId&&r.date===activeDate());
  $('#teamCommentList').innerHTML=daily.length?daily.map(commentMarkup).join(''):'<p class="practiceHint">チーム全体への一言を残せます。</p>';
  $('#commentHistoryList').innerHTML=records.length?records.map(commentMarkup).join(''):'<p class="practiceHint">チーム・選手への一言が日付順に表示されます。</p>';
  document.querySelectorAll('[data-player-comment]').forEach(b=>b.onclick=()=>openDailyComment(b.dataset.playerComment));
  document.querySelectorAll('[data-edit-comment]').forEach(b=>b.onclick=()=>openDailyComment('',b.dataset.editComment));
}
function openDailyComment(playerId='',recordId=''){
  const record=state.records.find(r=>r.id===recordId&&r.type==='practice-comment');
  const player=state.players.find(p=>p.id===(record?.playerId||playerId));
  const teamId=record?.teamId??(activeTeam||(player?RosterTeams.membership(player).id:''));
  commentTarget={date:record?.date||activeDate(),teamId,teamName:record?.teamName||teamDisplayName(teamId),playerId:record?.playerId||playerId,playerName:record?.playerName||(player?playerCommentName(player):'')};
  $('#commentTitle').textContent=commentTarget.playerId?'選手への一言':'チームへの一言';
  $('#commentContext').textContent=commentTarget.date+' · '+(commentTarget.playerId?commentTarget.playerName:'チーム全体');
  const teams=teamCatalog();if(teamId&&!teams.some(t=>String(t.id)===teamId))teams.push({id:teamId,name:commentTarget.teamName||teamId});
  $('#commentTeam').innerHTML='<option value="">'+(commentTarget.playerId?'チーム未設定':'チームを選択')+'</option>'+teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
  $('#commentTeam').value=teamId;$('#commentTeam').disabled=!!record||!!playerId;$('#commentTeam').required=!commentTarget.playerId;
  loadDailyCommentText();$('#commentStatus').textContent='';$('#commentDialog').showModal();
}
function loadDailyCommentText(){
  commentTarget.teamId=$('#commentTeam').value;
  const record=state.records.find(r=>r.id===RosterComments.id(commentTarget.date,commentTarget.teamId,commentTarget.playerId));
  $('#commentText').value=record&&!record.deleted?record.text:'';
}
function initDailyCommentsUI(){
  $('#addTeamCommentBtn').onclick=()=>openDailyComment();
  $('#commentDialog .close').onclick=()=>$('#commentDialog').close();
  $('#commentTeam').onchange=()=>{loadDailyCommentText();$('#commentStatus').textContent=''};
  $('#commentForm').onsubmit=e=>{
    e.preventDefault();try{
      const record=RosterComments.make({...commentTarget,teamName:teamDisplayName(commentTarget.teamId,commentTarget.teamName),text:$('#commentText').value});
      const index=state.records.findIndex(r=>r.id===record.id);if(index<0)state.records.push(record);else state.records[index]=record;
      save();$('#commentDialog').close();
    }catch(error){$('#commentStatus').textContent=error.message}
  };
}
