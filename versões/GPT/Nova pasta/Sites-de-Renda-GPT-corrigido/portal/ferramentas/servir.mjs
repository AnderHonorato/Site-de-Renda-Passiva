import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const pasta=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);const porta=Number(args[args.indexOf('--port')+1]||4480);const host=args.includes('--host')?args[args.indexOf('--host')+1]:'127.0.0.1';
const raiz=args.includes('--producao')?path.join(pasta,'publicacao'):pasta;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.pdf':'application/pdf'};
const servidor=http.createServer((req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}const url=new URL(req.url,'http://localhost');const relativo=decodeURIComponent(url.pathname);let arquivo=path.resolve(raiz,'.'+relativo);if(!arquivo.startsWith(raiz+path.sep)&&arquivo!==raiz){res.writeHead(403);res.end();return;}if(relativo.split('/').some(p=>p.startsWith('.'))||/^\/(?:testes|ferramentas)(?:\/|$)/.test(relativo)){res.writeHead(404);res.end();return;}if(fs.existsSync(arquivo)&&fs.statSync(arquivo).isDirectory())arquivo=path.join(arquivo,'index.html');if(!fs.existsSync(arquivo)){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Página não encontrada.');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(arquivo)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",'Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(arquivo).pipe(res);
 }catch{res.writeHead(400);res.end('Solicitação inválida.');}});
servidor.listen(porta,host,()=>console.log(`Doce Ofício: http://${host}:${porta} (${raiz})`));

