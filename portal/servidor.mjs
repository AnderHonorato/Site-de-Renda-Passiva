import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepositorio = fileURLToPath(new URL('../', import.meta.url));
const porta = Number(process.env.PORT || 4480);
const tipos = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};

function json(res,status,dados){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(dados))}
function caminhoSeguro(url){
  const pathname = decodeURIComponent(new URL(url,'http://local').pathname);
  const pedido = pathname==='/' ? '/portal/index.html' : pathname;
  const limpo = normalize(pedido).replace(/^[/\\]+/, '').replace(/^([.][.][/\\])+/, '');
  const absoluto = join(raizRepositorio, limpo);
  if(!absoluto.startsWith(raizRepositorio)) return null;
  return absoluto;
}

const servidor=http.createServer(async(req,res)=>{
  if(req.url?.startsWith('/api/auth/status')) return json(res,200,{enabled:false,reason:'oauth-ainda-nao-configurado'});
  if(req.url?.startsWith('/api/health')) return json(res,200,{ok:true,servico:'portal-ferramentas'});

  const arquivo=caminhoSeguro(req.url||'/');
  if(!arquivo){res.writeHead(400);return res.end('Caminho inválido')}
  try{
    const info=await stat(arquivo);
    const final=info.isDirectory()?join(arquivo,'index.html'):arquivo;
    const corpo=await readFile(final);
    res.writeHead(200,{
      'content-type':tipos[extname(final)]||'application/octet-stream',
      'x-content-type-options':'nosniff',
      'referrer-policy':'strict-origin-when-cross-origin'
    });
    res.end(corpo);
  }catch{
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado');
  }
});

servidor.listen(porta,'127.0.0.1',()=>console.log(`Portal: http://127.0.0.1:${porta}/`));
