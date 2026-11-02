import { erro } from './seguranca.mjs';

export const MAX_IMAGEM_BANNER = 1024 * 1024;
const campos = ['titulo_pt','texto_pt','titulo_en','texto_en','botao_pt','botao_en','url','alt_pt','alt_en','cor_texto','cor_fundo','alinhamento','peso','fonte','animacao','ordem','ativo','publicar_em','retirar_em'];

export function iniciarBanners(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS banners_prioritarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo_pt TEXT NOT NULL, texto_pt TEXT NOT NULL, titulo_en TEXT NOT NULL, texto_en TEXT NOT NULL,
    botao_pt TEXT NOT NULL DEFAULT '', botao_en TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
    alt_pt TEXT NOT NULL DEFAULT '', alt_en TEXT NOT NULL DEFAULT '',
    cor_texto TEXT NOT NULL DEFAULT '#fff7ed', cor_fundo TEXT NOT NULL DEFAULT '#452c24',
    alinhamento TEXT NOT NULL DEFAULT 'inicio', peso INTEGER NOT NULL DEFAULT 600,
    fonte TEXT NOT NULL DEFAULT 'site', animacao TEXT NOT NULL DEFAULT 'deslizar',
    ordem INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 0,
    publicar_em TEXT, retirar_em TEXT, imagem BLOB, imagem_mime TEXT,
    versao INTEGER NOT NULL DEFAULT 1
  );`);
}

function transacao(db, acao) {
  db.exec('BEGIN IMMEDIATE');
  try { const r=acao(); db.exec('COMMIT'); return r; }
  catch(e) { db.exec('ROLLBACK'); throw e; }
}

export function linkBannerSeguro(valor) {
  if (!valor) return true;
  if (/[\\\s\u0000-\u001f]/u.test(valor)) return false;
  try {
    const url=new URL(valor,'https://portal.invalid');
    if (url.username || url.password) return false;
    if (valor.startsWith('/')) {
      const decodificado=decodeURIComponent(url.pathname);
      return url.origin==='https://portal.invalid' && !/^\/[/\\]/u.test(decodificado)
        && !/\\/u.test(decodificado) && !/^\/(?:api|admin)(?:\/|$)/u.test(decodificado)
        && !/^\/en\/admin(?:\/|$)/u.test(decodificado);
    }
    return valor.startsWith('https://') && url.protocol==='https:' && url.hostname.includes('.') && !/%0[ad]/iu.test(valor);
  } catch { return false; }
}

function luminancia(cor) {
  const partes=cor.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);
  return partes[0]*0.2126+partes[1]*0.7152+partes[2]*0.0722;
}

export function validarBanner(b) {
  if (!b || typeof b!=='object' || Array.isArray(b)) throw erro(400,'dados_invalidos');
  const v={};
  for(const [nome,max,min] of [['titulo_pt',120,1],['texto_pt',700,0],['titulo_en',120,1],['texto_en',700,0],['botao_pt',60,0],['botao_en',60,0],['url',700,0],['alt_pt',200,0],['alt_en',200,0]]) {
    if(b[nome]!==undefined && typeof b[nome]!=='string') throw erro(400,'dados_invalidos');
    v[nome]=(b[nome]||'').trim();
    if(v[nome].length<min || v[nome].length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v[nome])) throw erro(400,'dados_invalidos');
  }
  if(!linkBannerSeguro(v.url)) throw erro(400,'link_invalido');
  if(!!v.url!==!!v.botao_pt || !!v.url!==!!v.botao_en) throw erro(400,'dados_invalidos');
  for(const [nome,padrao] of [['cor_texto','#fff7ed'],['cor_fundo','#452c24']]) {
    v[nome]=b[nome]??padrao;
    if(typeof v[nome]!=='string' || !/^#[0-9a-f]{6}$/iu.test(v[nome])) throw erro(400,'cor_invalida');
  }
  const a=luminancia(v.cor_texto),f=luminancia(v.cor_fundo);
  if((Math.max(a,f)+0.05)/(Math.min(a,f)+0.05)<4.5) throw erro(400,'contraste_insuficiente');
  for(const [nome,padrao,opcoes] of [['alinhamento','inicio',['inicio','centro']],['fonte','site',['site','titulo']],['animacao','deslizar',['deslizar','suave','nenhuma']],['peso',600,[400,600,700]]]) {
    v[nome]=b[nome]??padrao;
    if(!opcoes.includes(v[nome])) throw erro(400,'dados_invalidos');
  }
  v.ordem=b.ordem??0;v.ativo=Number(b.ativo);
  if(!Number.isInteger(v.ordem)||v.ordem<0||v.ordem>9999||typeof b.ativo!=='boolean') throw erro(400,'dados_invalidos');
  for(const nome of ['publicar_em','retirar_em']) {
    const valor=b[nome];v[nome]=null;
    if(valor!==undefined && valor!==null && valor!=='') {
      if(typeof valor!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/u.test(valor)||!Number.isFinite(Date.parse(valor))) throw erro(400,'data_invalida');
      v[nome]=new Date(valor).toISOString();
      if(v[nome].slice(0,16)!==valor.slice(0,16)) throw erro(400,'data_invalida');
    }
  }
  if(v.retirar_em && Date.parse(v.retirar_em)<=Date.parse(v.publicar_em||new Date().toISOString())) throw erro(400,'data_invalida');
  return v;
}

export function bannerAdmin(db,id) {
  const item=db.prepare(`SELECT id,${campos.join(',')},versao,imagem_mime FROM banners_prioritarios WHERE id=?`).get(id);
  if(!item)throw erro(404,'banner_nao_localizado');
  return {...item,ativo:!!item.ativo,imagem_url:item.imagem_mime?`/api/admin/banners/${id}/imagem?v=${item.versao}`:null};
}

export function salvarBanner(db,b,id=null) {
  const v=validarBanner(b);
  return transacao(db,()=>{
    const anterior=id?bannerAdmin(db,id):null;
    if(anterior&&anterior.versao!==b.versao)throw erro(409,'banner_desatualizado');
    if(anterior?.imagem_mime&&(!v.alt_pt||!v.alt_en))throw erro(400,'alt_obrigatorio');
    if(v.ativo&&db.prepare('SELECT COUNT(*) n FROM banners_prioritarios WHERE ativo=1 AND id<>?').get(id||0).n>=12)throw erro(400,'limite_banners');
    if(id)db.prepare(`UPDATE banners_prioritarios SET ${campos.map(c=>c+'=?').join(',')},versao=versao+1 WHERE id=?`).run(...campos.map(c=>v[c]),id);
    else id=Number(db.prepare(`INSERT INTO banners_prioritarios(${campos.join(',')}) VALUES(${campos.map(()=>'?').join(',')})`).run(...campos.map(c=>v[c])).lastInsertRowid);
    return bannerAdmin(db,id);
  });
}

export function imagemBannerValida(bytes,mime) {
  if(!bytes?.length||bytes.length>MAX_IMAGEM_BANNER)return false;
  if(mime==='image/png')return bytes.length>8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/webp')return bytes.length>12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  return false;
}

export function salvarImagemBanner(db,id,versao,bytes,mime) {
  if(bytes&&!imagemBannerValida(bytes,mime))throw erro(400,'imagem_invalida');
  return transacao(db,()=>{
    const anterior=bannerAdmin(db,id);
    if(anterior.versao!==versao)throw erro(409,'banner_desatualizado');
    if(bytes&&(!anterior.alt_pt||!anterior.alt_en))throw erro(400,'alt_obrigatorio');
    db.prepare('UPDATE banners_prioritarios SET imagem=?,imagem_mime=?,versao=versao+1 WHERE id=?').run(bytes||null,bytes?mime:null,id);
    return bannerAdmin(db,id);
  });
}

export function bannersPublicos(db,idioma='pt-BR',agora=Date.now()) {
  const lingua=idioma==='en'?'en':'pt',data=new Date(agora).toISOString();
  const itens=db.prepare(`SELECT id,${campos.join(',')},versao,imagem_mime FROM banners_prioritarios WHERE ativo=1 AND (publicar_em IS NULL OR publicar_em<=?) AND (retirar_em IS NULL OR retirar_em>?) ORDER BY ordem,id LIMIT 12`).all(data,data);
  return {itens:itens.map(i=>({id:i.id,titulo:i['titulo_'+lingua],texto:i['texto_'+lingua],botao:i['botao_'+lingua],url:i.url,alt:i['alt_'+lingua],cor_texto:i.cor_texto,cor_fundo:i.cor_fundo,alinhamento:i.alinhamento,peso:i.peso,fonte:i.fonte,animacao:i.animacao,imagem_url:i.imagem_mime?`/api/banners/${i.id}/imagem?v=${i.versao}`:null}))};
}

/** Call before generic API routes. Authorization and CSRF use the server's existing guards. */
export async function tratarBanners(req,res,ctx) {
  const url=new URL(req.url,'http://localhost'),p=url.pathname,m=req.method;
  if(!/^\/api\/(?:admin\/)?banners(?:\/|$)/u.test(p))return false;
  const {banco:db,json,admin,proteger,corpo,corpoBinario,registrarAdmin}=ctx;
  if(!['GET','HEAD'].includes(m))proteger(req);
  if(p==='/api/banners'&&m==='GET'){json(res,200,bannersPublicos(db,url.searchParams.get('idioma')));return true;}
  if(p==='/api/admin/banners'&&m==='GET'){admin(req);json(res,200,{itens:db.prepare('SELECT id FROM banners_prioritarios ORDER BY ordem,id').all().map(i=>bannerAdmin(db,i.id))});return true;}
  if(p==='/api/admin/banners'&&m==='POST'){const u=admin(req),item=salvarBanner(db,await corpo(req));registrarAdmin(u,'criar_banner',item.id);json(res,201,{item});return true;}
  const registro=p.match(/^\/api\/admin\/banners\/(\d+)$/u);
  if(registro&&m==='PUT'){const u=admin(req),item=salvarBanner(db,await corpo(req),Number(registro[1]));registrarAdmin(u,'editar_banner',item.id);json(res,200,{item});return true;}
  if(registro&&m==='DELETE'){
    const u=admin(req),b=await corpo(req),id=Number(registro[1]);
    transacao(db,()=>{if(bannerAdmin(db,id).versao!==b.versao)throw erro(409,'banner_desatualizado');db.prepare('DELETE FROM banners_prioritarios WHERE id=?').run(id);});
    registrarAdmin(u,'remover_banner',id);json(res,200,{ok:true});return true;
  }
  const imagem=p.match(/^\/api\/(admin\/)?banners\/(\d+)\/imagem$/u);
  if(imagem&&m==='GET'){
    const id=Number(imagem[2]);
    if(imagem[1])admin(req);else if(!bannersPublicos(db).itens.some(i=>i.id===id))throw erro(404,'banner_nao_localizado');
    const item=db.prepare('SELECT imagem,imagem_mime FROM banners_prioritarios WHERE id=?').get(id);
    if(!item?.imagem)throw erro(404,'banner_nao_localizado');
    res.writeHead(200,{'Content-Type':item.imagem_mime,'Content-Length':item.imagem.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});res.end(item.imagem);return true;
  }
  if(imagem?.[1]&&['POST','DELETE'].includes(m)){
    const u=admin(req),id=Number(imagem[2]),bytes=m==='POST'?await corpoBinario(req,MAX_IMAGEM_BANNER):null;
    const item=salvarImagemBanner(db,id,Number(req.headers['x-banner-versao']),bytes,String(req.headers['content-type']||''));
    registrarAdmin(u,m==='POST'?'imagem_banner':'remover_imagem_banner',id);json(res,200,{item});return true;
  }
  throw erro(404,'nao_encontrado');
}
