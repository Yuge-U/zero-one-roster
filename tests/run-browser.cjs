const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(body)})});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const env={...process.env,ROSTER_URL:'http://127.0.0.1:'+server.address().port+'/'};
  for(const name of ['comments','grades','jba','loading-save','practice','quick-controls','status-filter','team-filter','teams','connection-hub']){
    await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,name+'.browser.cjs')],{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(name+' browser regression failed: '+code)))});
  }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
