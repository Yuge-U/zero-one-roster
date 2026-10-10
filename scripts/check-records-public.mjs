import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.env.SITE_URL;
if(base!=='https://yuge-u.github.io/zero-one-roster/')throw new Error('Unexpected public URL');
for(const file of ['index.html','app.js','styles.css','records-calendar.js','practice-ui.js','daily-comments.js']){
  const local=await fs.readFile(new URL('../'+file,import.meta.url));
  const url=new URL(file,base);url.searchParams.set('release-check',Date.now());
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(file+': HTTP '+response.status);
  const remote=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');
  if(hash(local)!==hash(remote))throw new Error(file+': deployed bytes do not match this release');
  console.log('PASS public bytes '+file);
}
console.log('Verified ROSTER v0.1.37 public files');
