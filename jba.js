'use strict';
const RosterJba=(()=>{
  const text=v=>v==null?'':String(v).normalize('NFKC').trim();
  const present=v=>v!==null&&v!==undefined&&text(v)!=='';
  const id=v=>text(v).replace(/\.0$/,'');
  const name=v=>text(v).replace(/[\s\u200B-\u200D\uFEFF]/gu,'');
  function birthday(value,{date1904=false}={}){
    if(!present(value))return '';
    if(typeof value==='number'){
      if(!Number.isFinite(value)||value<0||(!date1904&&Math.floor(value)===60))return '';
      const days=Math.floor(value),epoch=date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,31);
      const date=new Date(epoch+(days-(!date1904&&days>60?1:0))*86400000);
      return Number.isNaN(date.getTime())?'':date.toISOString().slice(0,10);
    }
    if(value instanceof Date)return Number.isNaN(value.getTime())?'':value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0');
    let s=text(value).replace(/年/g,'-').replace(/月/g,'-').replace(/日/g,'').replace(/[./]/g,'-');
    const era=s.match(/^([HR])(\d{1,2})-(\d{1,2})-(\d{1,2})$/i);if(era)s=((era[1].toUpperCase()==='H'?1988:2018)+Number(era[2]))+'-'+era[3]+'-'+era[4];
    const match=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s]\d{1,2}:\d{2})/);if(!match)return '';
    const [y,m,d]=match.slice(1).map(Number),date=new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear()===y&&date.getUTCMonth()+1===m&&date.getUTCDate()===d?y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):'';
  }
  function parse(row,options={}){
    const cells=new Map(Object.entries(row||{}).map(([key,value])=>[text(key).replace(/\s/g,''),value]));
    const get=(...keys)=>{for(const key of keys){const value=cells.get(key);if(present(value))return value}return ''};
    const patch={},warnings=[];const put=(key,...columns)=>{const v=get(...columns);if(present(v))patch[key]=text(v)};
    put('jbaId','メンバーID','JBA_ID','JBAID');if(patch.jbaId)patch.jbaId=id(patch.jbaId);
    const fullName=text(get('氏名'));const parts=fullName.split(/\s+/);if(fullName){patch.lastName=parts[0];if(parts.length>1)patch.firstName=parts.slice(1).join(' ')}
    put('nameKana','氏名カナ');put('position','ポジション');put('height','身長');put('weight','体重');put('school','在学校名','在籍校');put('grade','学年');put('number','ユニフォーム番号');put('classification','構成員区分');put('category','カテゴリー');
    const rawBirth=get('生年月日');if(present(rawBirth)){const value=birthday(rawBirth,options);if(value)patch.birthday=value;else warnings.push('生年月日の形式を確認してください（既存値は保持）')}
    const rawGender=get('性別');if(present(rawGender)){const gender={'男性':'男','男子':'男','男':'男','女性':'女','女子':'女','女':'女','その他':'その他'}[text(rawGender)];if(gender)patch.gender=gender;else warnings.push('性別の表記を確認してください（既存値は保持）')}
    const source={};for(const [key,column] of [['teamId','チームID'],['teamName','チーム名'],['registrationStatus','登録状態'],['coachLicense','コーチ資格'],['developerLicense','コーチデベロッパー資格']]){const value=get(column);if(present(value))source[key]=text(value)}
    return{patch,source,fullName,warnings};
  }
  function match(players,incoming){
    const jba=incoming.patch.jbaId,full=name(incoming.fullName),birth=incoming.patch.birthday;
    let candidates=players,matchedId=false;
    if(jba){const same=players.filter(p=>id(p.jbaId)===jba);if(same.length===1)return{player:same[0]};if(same.length>1){candidates=same;matchedId=true}}
    if(full){let same=candidates.filter(p=>name((p.lastName||'')+(p.firstName||'')||p.name||'')===full);
      if(same.length>1&&birth){const dated=same.filter(p=>birthday(p.birthday)===birth);if(dated.length)same=dated}
      if(same.length===1){if(jba&&id(same[0].jbaId)&&id(same[0].jbaId)!==jba)return{reason:'氏名が一致しますがJBA IDが異なります'};return{player:same[0]}}
      if(same.length>1)return{reason:'同姓同名の候補が複数あります'};
    }
    if(matchedId)return{reason:'JBA IDが重複しており選手を特定できません'};
    return{};
  }
  function merge(existing,incoming){
    const patch={...incoming.patch};
    if(!patch.firstName&&incoming.fullName&&existing){delete patch.lastName;delete patch.firstName}
    const player={...(existing||{}),...patch,jbaSource:{...(existing?.jbaSource||{}),...incoming.source}};
    if(!existing){player.id=crypto.randomUUID();player.lastName=player.lastName||'';player.firstName=player.firstName||'';player.status='active';player.category=player.category||'Other'}
    if(!existing?.teamAssignmentManual&&(incoming.source.teamId||incoming.source.teamName)){
      player.teamId=incoming.source.teamId||existing?.teamId||('name:'+incoming.source.teamName);
      player.teamName=incoming.source.teamName||existing?.teamName||'';
    }
    player.updatedAt=new Date().toISOString();return player;
  }
  return{parse,match,merge,birthday};
})();
