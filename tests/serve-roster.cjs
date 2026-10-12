// Serve existing browser regressions on an OS-selected local port.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('.'),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(process.argv[2],`http://127.0.0.1:${server.address().port}/`));
process.on('SIGTERM',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
