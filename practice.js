'use strict';
// Read-only adapter for ZERO ONE PRACTICE 1.x operations and backups.
const RosterPractice=(()=>{
  const url='https://yuge-u.github.io/zero-one-practice-lab/';
  const fail=message=>{throw new Error(message)};
  function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'}
  async function hash(value){const bytes=new TextEncoder().encode(typeof value==='string'?value:canonical(value));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function verify(wire){if(!wire?.body||wire.body.schemaVersion!==1||await hash(wire.body)!==wire.hash)fail('プラクティスのデータ形式または内容の確認に失敗しました');return wire.body}
  async function plans(operations,scope){
    if(!Array.isArray(operations)||operations.length>2000)fail('練習データの件数を確認できません');
    const all=new Map();
    for(const wire of operations){const body=await verify(wire);if(body.format!=='zero-one-lab-operation'||body.scope!==scope||!body.opId||!body.entityId||!Array.isArray(body.parents))fail('プラクティスの保存先または操作形式が一致しません');if(all.has(body.opId)&&all.get(body.opId).hash!==wire.hash)fail('同じ練習版に異なる内容があります');all.set(body.opId,wire)}
    const grouped=new Map();for(const wire of all.values()){const b=wire.body;if(b.kind!=='practice')continue;if(!grouped.has(b.entityId))grouped.set(b.entityId,[]);grouped.get(b.entityId).push(wire)}
    const result=[],warnings=[];
    for(const entries of grouped.values()){
      const parents=new Set(entries.flatMap(x=>x.body.parents));const heads=entries.filter(x=>!parents.has(x.body.opId));
      if(heads.length!==1){warnings.push('競合しているプランはPRACTICEで解決して再同期してください');continue}
      const wire=heads[0],b=wire.body,p=b.payload;
      if(!p||typeof p.title!=='string'||!p.title.trim()||!Array.isArray(p.items)||!p.items.length||p.items.length>100)fail('練習プランの必須項目がありません');
      if(entries.some(x=>x.body.parents.some(id=>!all.has(id)))){warnings.push(p.title+'：更新前の版が未同期です');continue}
      if(p.archived)continue;
      const items=p.items.map(item=>{if(!item.id||typeof item.name!=='string'||!item.name.trim()||!Number.isFinite(item.minutes)||item.minutes<1||item.minutes>240)fail('練習項目の形式が不正です');return{id:item.id,name:item.name,minutes:item.minutes,category:String(item.category||''),variation:String(item.resolved?.variationName||''),rule:String(item.resolved?.rule||'')}});
      if(new Set(items.map(x=>x.id)).size!==items.length)fail('練習項目のIDが重複しています');
      result.push({id:b.entityId,revision:b.opId,hash:wire.hash,title:p.title,team:String(p.team||''),goal:String(p.goal||''),totalMinutes:p.totalMinutes,items});
    }
    return{plans:result.sort((a,b)=>a.title.localeCompare(b.title,'ja')),warnings:[...new Set(warnings)]};
  }
  async function backup(data){const body=await verify(data);if(body.format!=='zero-one-lab-backup'||typeof body.scope!=='string')fail('PRACTICEの全体バックアップを選んでください');return plans(body.operations,body.scope)}
  function makeRecord({previous,date,team,plan,items,note}){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)fail('実施日を選択してください');
    if(!team?.id||!team?.name)fail('実施チームを選択してください');if(!plan?.revision)fail('練習プランを選択してください');
    if(!items.length)fail('実施した練習を1つ以上選択してください');
    if(items.some(x=>!plan.items.some(p=>p.id===x.id)||!Number.isInteger(x.actualMinutes)||x.actualMinutes<0||x.actualMinutes>600))fail('実施時間は0〜600分の整数で入力してください');
    return{id:previous?.id||crypto.randomUUID(),type:'practice-session',date,teamId:String(team.id),teamName:team.name,source:'zero-one-practice',sourceUrl:url,practiceId:plan.id,practiceRevision:plan.revision,plan:structuredClone(plan),items:structuredClone(items),note:String(note||'').trim(),updatedAt:new Date().toISOString(),deleted:false};
  }
  return{url,hash,verify,plans,backup,makeRecord};
})();
