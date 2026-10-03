'use strict';
const RosterTeams=(()=>{
  function membership(player){
    const manual=player.teamAssignmentManual===true;
    const id=String(manual?(player.teamId||''):(player.teamId||player.jbaSource?.teamId||'')).trim();
    const name=String(manual?(player.teamName||''):(player.teamName||player.jbaSource?.teamName||'')).trim();
    return{id:id||(name?'name:'+name:''),name};
  }
  function catalog(data){const teams=new Map();for(const team of data.teams||[])if(team.id)teams.set(String(team.id),team);for(const player of data.players){const {id,name}=membership(player);if(id&&!teams.has(id))teams.set(id,{id,name:name||id,category:player.category||'',updatedAt:player.updatedAt})}return [...teams.values()]}
  function assign(data,player,teamId){const team=teamId?catalog(data).find(t=>String(t.id)===String(teamId)):null;if(teamId&&!team)throw new Error('所属チームを選び直してください');player.teamId=team?String(team.id):'';player.teamName=team?.name||'';player.teamAssignmentManual=true;return player}
  function upsert(data,id,fields){
    const name=String(fields.name||'').trim();if(!name)throw new Error('チーム名を入力してください');if(name.length>80)throw new Error('チーム名は80文字以内で入力してください');
    const teams=catalog(data),old=id?teams.find(t=>String(t.id)===String(id)):null;if(id&&!old)throw new Error('編集するチームが見つかりません');
    if(teams.some(t=>String(t.id)!==String(id)&&t.name.trim()===name))throw new Error('同じ名前のチームが登録されています');
    const updatedAt=new Date().toISOString();const team={...old,...fields,name,id:old?.id||crypto.randomUUID(),updatedAt};
    // Bind legacy name-only membership to its existing stable ID before changing the label.
    if(old)for(const player of data.players)if(membership(player).id===String(old.id)){player.teamId=String(old.id);player.teamName=name;player.updatedAt=updatedAt}
    const index=data.teams.findIndex(t=>String(t.id)===String(team.id));if(index<0)data.teams.push(team);else data.teams[index]=team;
    return team;
  }
  return{membership,catalog,assign,upsert};
})();
