'use strict';
const RosterOneDrive=(()=>{const CLIENT_ID='b75b499d-2b47-42ed-9e10-41cd76dbc6c5',SCOPES=['Files.ReadWrite.AppFolder'],GRAPH='https://graph.microsoft.com/v1.0';let client,account;
function msalApi(){return window.msal||null}
async function init(){const api=msalApi();if(!api?.PublicClientApplication)throw new Error('Microsoft接続機能を読み込めません。OneDrive接続時に再試行してください。');client=new api.PublicClientApplication({auth:{clientId:CLIENT_ID,authority:'https://login.microsoftonline.com/consumers',redirectUri:new URL('./',location.href).href,postLogoutRedirectUri:new URL('./',location.href).href},cache:{cacheLocation:'localStorage'},system:{allowPlatformBroker:false}});await client.initialize();const r=await client.handleRedirectPromise();const accounts=client.getAllAccounts();account=r?.account||client.getActiveAccount()||(accounts.length===1?accounts[0]:null);if(account)client.setActiveAccount(account);return account}
async function connect(){if(!client)await init();await client.loginRedirect({scopes:SCOPES,redirectUri:new URL('./',location.href).href,prompt:'select_account'})}
async function request(path,options={},asText=false){if(!account)throw new Error('Microsoftアカウントへ接続してください');const token=(await client.acquireTokenSilent({account,scopes:SCOPES})).accessToken;const r=await fetch(GRAPH+path,{...options,headers:{...options.headers,Authorization:'Bearer '+token}});if(!r.ok){let detail='';try{detail=await r.text()}catch{}const e=new Error('OneDrive '+r.status+(detail?' '+detail.slice(0,180):''));e.status=r.status;e.detail=detail;throw e}return asText?r.text():r.status===204?null:r.json()}
async function folder(parent,name){const list=await request('/me/drive/items/'+parent+'/children');const found=list.value.find(x=>x.folder&&x.name.toLowerCase()===name.toLowerCase());if(found)return found;return request('/me/drive/items/'+parent+'/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})})}
async function target(){const root=await request('/me/drive/special/approot');return folder(root.id,'ROSTER')}
async function read(){const f=await target();try{const item=await request('/me/drive/items/'+f.id+':/roster.data');return JSON.parse(await request('/me/drive/items/'+item.id+'/content',{},true))}catch(e){if(e.status===404)return null;throw e}}
async function photoFolder(){const root=await target();return folder(root.id,'photos')}
async function uploadPhoto(playerId,blob){const f=await photoFolder();return request('/me/drive/items/'+f.id+':/'+encodeURIComponent(playerId)+'.jpg:/content',{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:blob})}
async function uploadPhotoFromUrl(playerId,url){const response=await fetch(url,{credentials:'include'});if(!response.ok)throw new Error('旧写真取得 '+response.status);const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error('画像形式ではありません');return uploadPhoto(playerId,blob)}
async function photoUrl(playerId){const f=await photoFolder();try{const item=await request('/me/drive/items/'+f.id+':/'+encodeURIComponent(playerId)+'.jpg');return item['@microsoft.graph.downloadUrl']||''}catch(e){if(e.status===404)return'';throw e}}
async function write(data){const f=await target();return request('/me/drive/items/'+f.id+':/roster.data:/content',{method:'PUT',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(data)})}
// Practice plans are read from the existing app folder; this never creates or writes Practice files.
async function childrenAll(id){let path='/me/drive/items/'+encodeURIComponent(id)+'/children',out=[];while(path){const page=await request(path);out.push(...page.value);if(out.length>10000)throw new Error('ファイル数が多すぎます');if(page['@odata.nextLink']){const next=new URL(page['@odata.nextLink']);if(next.origin!=='https://graph.microsoft.com'||!next.pathname.startsWith('/v1.0/me/'))throw new Error('一覧の続きのURLが不正です');path=next.pathname.slice('/v1.0'.length)+next.search}else path=''}return out}
async function readPracticePlans(progress=()=>{}){
  if(!account)throw new Error('先にOneDriveへ接続してください');
  const owner=account.homeAccountId,scope='ms-'+await RosterPractice.hash(CLIENT_ID+'|'+owner);
  const root=await request('/me/drive/special/approot'),folder=(await childrenAll(root.id)).find(x=>x.name==='ZERO_ONE_PRACTICE_LAB_V02'&&x.folder);
  if(!folder)throw new Error('PRACTICEで同じMicrosoftアカウントへ接続し、練習を同期してください');
  const marker=JSON.parse(await request('/me/drive/items/'+encodeURIComponent(folder.id)+':/store.marker.data:/content',{},true));
  if(marker.format!=='zero-one-browser-lab-store'||marker.schemaVersion!==1||marker.scope!==scope)throw new Error('PRACTICEのアカウントまたは保存形式が一致しません');
  const files=(await childrenAll(folder.id)).filter(x=>/^O_[a-f0-9-]{36}_[a-f0-9]{64}\.data$/.test(x.name));
  if(files.length>2000)throw new Error('練習データが多いため読み込めません');
  const operations=[];let next=0,done=0;
  const fetched=await Promise.allSettled(Array.from({length:Math.min(4,files.length)},async()=>{while(next<files.length){const file=files[next++];if(file.size>2*1024*1024)throw new Error('練習ファイルが大きすぎます');const raw=await request('/me/drive/items/'+encodeURIComponent(file.id)+'/content',{},true);if(raw.length>2*1024*1024)throw new Error('練習ファイルが大きすぎます');const wire=JSON.parse(raw);if(file.name!=='O_'+wire.body?.opId+'_'+wire.hash+'.data')throw new Error('練習ファイル名と内容が一致しません');operations.push(wire);progress(++done,files.length)}}));
  const rejected=fetched.find(x=>x.status==='rejected');if(rejected)throw rejected.reason;
  if(account?.homeAccountId!==owner)throw new Error('アカウントが変わりました。再読込してください');
  return RosterPractice.plans(operations,scope);
}
const accountInfo=()=>account?{username:account.username||'',homeAccountId:account.homeAccountId||''}:null;return{init,connect,read,write,readPracticePlans,accountInfo,uploadPhoto,uploadPhotoFromUrl,photoUrl,isConnected:()=>!!account};})();