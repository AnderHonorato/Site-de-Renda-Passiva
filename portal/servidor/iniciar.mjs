import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { abrirBanco } from './banco.mjs';
import { hash, token, erro, cookies, senhaHash, hashDummy, comparar, corpo } from './seguranca.mjs';
import { ferramentasProntas, ferramentaPorSlug } from '../dados/catálogo.js';
import { categorias } from '../dados/categorias.js';

const agora = () => Date.now();
const nomeSessao = process.env.URL_PUBLICA?.startsWith('https://') ? '__Host-sessao' : 'sessao';
const nomeCsrf = process.env.URL_PUBLICA?.startsWith('https://') ? '__Host-csrf' : 'csrf';
const secure = nomeSessao.startsWith('__Host-');
const origem = new URL(process.env.URL_PUBLICA || 'http://127.0.0.1:4400').origin;
const banco = abrirBanco();
for(const c of categorias)banco.prepare("INSERT OR IGNORE INTO salas(id,tipo,nome) VALUES(?,'categoria',?)").run(`categoria-${c.id}`,c.nome);
for(const f of ferramentasProntas)banco.prepare("INSERT OR IGNORE INTO salas(id,tipo,nome) VALUES(?,'ferramenta',?)").run(`ferramenta-${f.slug}`,f.nome);
const limites = new Map();
const ouvintes = new Set();
const reservados = new Set(['admin','administrador','suporte','moderador','sistema','root','api','conta','perfil','chat','null','undefined']);

function json(res, status, data, headers={}) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers });
  res.end(JSON.stringify(data));
}
function ip(req){const remoto=req.socket.remoteAddress||'desconhecido';const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remoto);const forwarded=local?req.headers['x-forwarded-for']?.split(',')[0]?.trim():null;return forwarded&&/^[0-9a-f:.]{3,45}$/i.test(forwarded)?forwarded:remoto;}
function setCookie(res,name,value,{httpOnly=false,maxAge=2592000}={}) {
  const c=`${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${httpOnly?'; HttpOnly':''}${secure?'; Secure':''}`;
  const prior=res.getHeader('Set-Cookie'); res.setHeader('Set-Cookie',prior?[...(Array.isArray(prior)?prior:[prior]),c]:c);
}
function usuarioPublico(u) { if(!u)return null; return {id:u.id,nome:u.nome,email:u.email,usuario:u.usuario,plano:u.plano,papel:u.papel,idade:u.idade,idioma:u.idioma,tema:u.tema,criado_em:u.criado_em,bio:u.bio,local:u.local,avatar:u.avatar,pontos:u.pontos,nivel:1+Math.floor(Math.sqrt(u.pontos/10)),chat_aceito:!!u.chat_aceito_em}; }
function sessao(req) {
  const t=cookies(req)[nomeSessao]; if(!t)return null;
  return banco.prepare(`SELECT u.*,s.id sessao_id FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>? AND u.situacao='ativo'`).get(hash(t),agora())||null;
}
function exigir(req){ const u=sessao(req); if(!u)throw erro(401,'sessao_necessaria'); return u; }
function admin(req){const u=exigir(req);if(u.papel!=='admin')throw erro(403,'acesso_negado');return u;}
function chatAtivo(){return process.env.PORTAL_CHAT_LOCAL==='1' && process.env.NODE_ENV!=='production' || process.env.PORTAL_CHAT_PUBLICO==='1';}
function exigirChat(req){if(!chatAtivo())throw erro(503,'chat_indisponivel');const u=exigir(req);if(!u.chat_aceito_em)throw erro(403,'aceite_chat_necessario');if(u.banido_em)throw erro(403,'chat_banido');return u;}
function validoUsuario(x){return typeof x==='string' && /^[a-z][a-z0-9_]{2,19}$/.test(x.toLowerCase()) && !reservados.has(x.toLowerCase());}
function senhaValida(x){return typeof x==='string' && x.length>=12 && x.length<=128;}
function conferirLimite(chave,max,janela){const tempo=agora();let l=limites.get(chave)||[];l=l.filter(t=>t>tempo-janela);if(l.length>=max){const e=erro(429,'muitas_tentativas');e.retryAfter=Math.max(1,Math.ceil((l[0]+janela-tempo)/1000));throw e;}l.push(tempo);limites.set(chave,l);if(limites.size>10000)for(const [k,v] of limites)if(v.at(-1)<tempo-janela)limites.delete(k);}
function proteger(req){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return;
  if(req.headers.origin!==origem || req.headers['sec-fetch-site']==='cross-site')throw erro(403,'origem_invalida');
  const cs=cookies(req)[nomeCsrf]; const h=req.headers['x-csrf-token'];
  if(!cs||!h||cs!==h||!(/^[A-Za-z0-9_-]{32,}$/.test(cs)))throw erro(403,'csrf_invalido');
}
function criarSessao(res,id){const t=token();banco.prepare('INSERT INTO sessoes(usuario_id,token_hash,expira_em) VALUES(?,?,?)').run(id,hash(t),agora()+30*86400000);setCookie(res,nomeSessao,t,{httpOnly:true});setCookie(res,nomeCsrf,token());}
function descartarSessaoAnterior(req){const t=cookies(req)[nomeSessao];if(t)banco.prepare('DELETE FROM sessoes WHERE token_hash=?').run(hash(t));}
function removerSessao(req,res){const t=cookies(req)[nomeSessao];if(t)banco.prepare('DELETE FROM sessoes WHERE token_hash=?').run(hash(t));setCookie(res,nomeSessao,'',{httpOnly:true,maxAge:0});}
function indisponivelPerfil(u,alvo){if(!alvo||banco.prepare('SELECT 1 FROM bloqueios WHERE (origem=? AND destino=?) OR (origem=? AND destino=?)').get(u.id,alvo.id,alvo.id,u.id))throw erro(404,'perfil_nao_localizado');}
function salaPermitida(u,id){const sala=banco.prepare('SELECT * FROM salas WHERE id=?').get(id);if(!sala)throw erro(404,'sala_nao_localizada');if(sala.tipo==='direta'){
  if(![sala.criador_id,sala.participante_id].includes(u.id))throw erro(404,'sala_nao_localizada');
  const outro=sala.criador_id===u.id?sala.participante_id:sala.criador_id;
  indisponivelPerfil(u,banco.prepare('SELECT id FROM usuarios WHERE id=?').get(outro));
  if(!banco.prepare("SELECT 1 FROM amizades WHERE estado='aceita' AND ((origem=? AND destino=?) OR (origem=? AND destino=?))").get(u.id,outro,outro,u.id))throw erro(404,'sala_nao_localizada');
}return sala;}
function mensagemPublica(m){return {id:m.id,sala_id:m.sala_id,texto:m.texto,criado_em:m.criado_em,autor:{id:m.autor_id,nome:m.nome,usuario:m.usuario,avatar:m.avatar,papel:m.papel,criado_em:m.autor_criado_em,nivel:1+Math.floor(Math.sqrt(m.pontos/10))}};}
function avisar(evento){
  const texto=`event: ${evento.removidaId?'remocao':'mensagem'}\ndata: ${JSON.stringify(evento)}\n\n`;
  const sala=banco.prepare('SELECT * FROM salas WHERE id=?').get(evento.sala);
  for(const item of ouvintes){
    const vivo=banco.prepare(`SELECT 1 FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>? AND u.situacao='ativo' AND u.banido_em IS NULL AND u.chat_aceito_em IS NOT NULL`).get(item.token_hash,agora());
    if(!vivo){item.res.end();ouvintes.delete(item);continue;}
    if(sala?.tipo==='direta'&&![sala.criador_id,sala.participante_id].includes(item.id))continue;
    const autor=evento.mensagem?.autor?.id;
    if(autor&&banco.prepare('SELECT 1 FROM bloqueios WHERE (origem=? AND destino=?) OR (origem=? AND destino=?)').get(item.id,autor,autor,item.id))continue;
    try{item.res.write(texto);}catch{ouvintes.delete(item);}
  }
}
function salaDiretaId(a,b){return `direta-${Math.min(a,b)}-${Math.max(a,b)}`;}
function registrarAdmin(u,acao,alvo,detalhe={}){banco.prepare('INSERT INTO auditoria_admin(admin_id,acao,alvo_id,detalhe) VALUES(?,?,?,?)').run(u.id,acao,alvo,JSON.stringify(detalhe));}
function enriquecerPerfil(perfil,u){perfil.ferramentas_mais_usadas=banco.prepare('SELECT slug,total FROM uso_ferramentas WHERE usuario_id=? ORDER BY total DESC LIMIT 5').all(u.id);perfil.ferramentas_recomendadas=JSON.parse(u.recomendadas||'[]');return perfil;}

async function rota(req,res){
  const url=new URL(req.url,'http://localhost');const p=url.pathname;const m=req.method;
  if(!p.startsWith('/api/'))throw erro(404,'nao_encontrado');
  conferirLimite(`global:${ip(req)}`,180,60000);
  if(m==='OPTIONS'){res.writeHead(204,{'Allow':'GET,POST,PATCH,DELETE,OPTIONS'});res.end();return;}
  if(m==='GET'&&p==='/api/autenticacao/sessao'){
    if(!(/^[A-Za-z0-9_-]{43}$/.test(cookies(req)[nomeCsrf]||'')))setCookie(res,nomeCsrf,token());
    const u=sessao(req);return json(res,200,{usuario:usuarioPublico(u),chat_habilitado:chatAtivo(),chat_aceito:!!u?.chat_aceito_em});
  }
  proteger(req);
  if(m==='POST'&&p==='/api/autenticacao/criar-conta'){
    conferirLimite(`cadastro:${ip(req)}`,5,3600000);const b=await corpo(req);
    const nome=String(b.nome||'').trim(),email=String(b.email||'').trim().toLowerCase(),handle=String(b.usuario||'').trim().toLowerCase();
    if(nome.length<2||nome.length>80||email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!validoUsuario(handle)||!senhaValida(b.senha)||!Number.isInteger(+b.idade)||+b.idade<13||+b.idade>120||b.aceitaTermos!==true)throw erro(400,'dados_invalidos');
    if(banco.prepare('SELECT 1 FROM usuarios WHERE email=? OR usuario=?').get(email,handle))throw erro(409,'conta_indisponivel');
    const h=await senhaHash(b.senha);let result;try{result=banco.prepare('INSERT INTO usuarios(email,usuario,nome,senha_hash,idade) VALUES(?,?,?,?,?)').run(email,handle,nome,h,+b.idade);}catch(e){if(String(e.code||'').startsWith('SQLITE_CONSTRAINT'))throw erro(409,'conta_indisponivel');throw e;}
    descartarSessaoAnterior(req);criarSessao(res,Number(result.lastInsertRowid));return json(res,201,{usuario:usuarioPublico(banco.prepare('SELECT * FROM usuarios WHERE id=?').get(Number(result.lastInsertRowid)))});
  }
  if(m==='POST'&&p==='/api/autenticacao/entrar'){
    conferirLimite(`login:${ip(req)}`,15,900000);const b=await corpo(req);const email=String(b.email||'').trim().toLowerCase();const u=banco.prepare('SELECT * FROM usuarios WHERE email=?').get(email);
    if(typeof b.senha!=='string'||b.senha.length>128)throw erro(401,'credenciais_invalidas');
    const confere=await comparar(b.senha,u?.senha_hash||await hashDummy);
    if(!u||u.situacao!=='ativo'||!confere)throw erro(401,'credenciais_invalidas');
    const atual=banco.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id);if(!atual||atual.situacao!=='ativo'||atual.senha_hash!==u.senha_hash)throw erro(401,'credenciais_invalidas');
    descartarSessaoAnterior(req);criarSessao(res,u.id);return json(res,200,{usuario:usuarioPublico(atual)});
  }
  if(m==='POST'&&p==='/api/autenticacao/sair'){removerSessao(req,res);return json(res,200,{ok:true});}
  if(m==='POST'&&p==='/api/autenticacao/recuperar-senha'){
    if(process.env.NODE_ENV==='production')throw erro(503,'recuperacao_indisponivel');
    conferirLimite(`recuperar:${ip(req)}`,5,3600000);const b=await corpo(req);const u=banco.prepare('SELECT id,email FROM usuarios WHERE email=?').get(String(b.email||'').trim().toLowerCase());
    if(u){const t=token();banco.prepare('INSERT INTO redefinicoes(usuario_id,token_hash,expira_em) VALUES(?,?,?)').run(u.id,hash(t),agora()+3600000);
      const pasta=process.env.PORTAL_EMAILS_DIR||resolve(import.meta.dirname,'.execucao','emails');mkdirSync(pasta,{recursive:true});
      appendFileSync(resolve(pasta,'recuperacao-local.txt'),`${new Date().toISOString()} ${u.email} ${origem}/redefinir-senha.html#token=${t}\n`,{mode:0o600});}
    return json(res,200,{ok:true});
  }
  if(m==='POST'&&p==='/api/autenticacao/redefinir-senha'){
    conferirLimite(`reset:${ip(req)}`,5,60000);const b=await corpo(req);if(!senhaValida(b.senha)||typeof b.token!=='string'||!(/^[A-Za-z0-9_-]{43}$/.test(b.token)))throw erro(400,'dados_invalidos');
    if(!banco.prepare('SELECT 1 FROM redefinicoes WHERE token_hash=? AND expira_em>? AND usado_em IS NULL').get(hash(b.token),agora()))throw erro(400,'token_invalido');
    const h=await senhaHash(b.senha);banco.exec('BEGIN IMMEDIATE');try{
      const r=banco.prepare('SELECT * FROM redefinicoes WHERE token_hash=? AND expira_em>? AND usado_em IS NULL').get(hash(b.token),agora());if(!r)throw erro(400,'token_invalido');
      banco.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(h,r.usuario_id);
      banco.prepare('DELETE FROM redefinicoes WHERE usuario_id=?').run(r.usuario_id);banco.prepare('DELETE FROM sessoes WHERE usuario_id=?').run(r.usuario_id);banco.exec('COMMIT');
    }catch(e){banco.exec('ROLLBACK');throw e;}return json(res,200,{ok:true});
  }
  if(m==='GET'&&p==='/api/conta'){return json(res,200,{usuario:usuarioPublico(exigir(req))});}
  if(m==='PATCH'&&p==='/api/conta'){
    const u=exigir(req),b=await corpo(req);const nome=b.nome===undefined?u.nome:String(b.nome).trim();const idioma=b.idioma??u.idioma,tema=b.tema??u.tema;
    if(nome.length<2||nome.length>80||!['pt-BR','en'].includes(idioma)||!['claro','escuro','sistema'].includes(tema))throw erro(400,'dados_invalidos');banco.prepare('UPDATE usuarios SET nome=?,idioma=?,tema=? WHERE id=?').run(nome,idioma,tema,u.id);
    return json(res,200,{usuario:usuarioPublico(banco.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id))});
  }
  if(m==='PATCH'&&p==='/api/conta/senha'){
    const u=exigir(req),b=await corpo(req);if(!await comparar(b.senhaAtual,u.senha_hash)||!senhaValida(b.novaSenha))throw erro(400,'senha_invalida');
    const novo=await senhaHash(b.novaSenha),atual=exigir(req);if(atual.id!==u.id||atual.senha_hash!==u.senha_hash)throw erro(401,'sessao_necessaria');
    banco.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(novo,u.id);banco.prepare('DELETE FROM sessoes WHERE usuario_id=?').run(u.id);criarSessao(res,u.id);return json(res,200,{ok:true});
  }
  if(m==='GET'&&p==='/api/conta/exportar'){
    const u=exigir(req);const mensagens=banco.prepare('SELECT id,sala_id,texto,criado_em FROM mensagens WHERE autor_id=?').all(u.id);
    const amizades=banco.prepare('SELECT * FROM amizades WHERE origem=? OR destino=?').all(u.id,u.id), bloqueios=banco.prepare('SELECT * FROM bloqueios WHERE origem=?').all(u.id);
    const favoritos=banco.prepare('SELECT slug,criado_em FROM favoritos WHERE usuario_id=?').all(u.id), suporte=banco.prepare('SELECT * FROM suporte WHERE usuario_id=?').all(u.id), uso=banco.prepare('SELECT slug,total,ultimo_uso_em FROM uso_ferramentas WHERE usuario_id=?').all(u.id);
    const denuncias=banco.prepare('SELECT id,alvo_usuario_id,mensagem_id,motivo,situacao,criado_em FROM denuncias WHERE denunciante_id=?').all(u.id);
    return json(res,200,{usuario:usuarioPublico(u),mensagens,amizades,bloqueios,favoritos,suporte,denuncias,uso});
  }
  if(m==='DELETE'&&p==='/api/conta'){
    const u=exigir(req),b=await corpo(req);if(!await comparar(b.senha,u.senha_hash))throw erro(403,'senha_invalida');
    const atual=exigir(req);if(atual.id!==u.id||atual.senha_hash!==u.senha_hash)throw erro(401,'sessao_necessaria');
    banco.prepare('DELETE FROM usuarios WHERE id=?').run(u.id);removerSessao(req,res);return json(res,200,{ok:true});
  }
  if(p==='/api/favoritos'&&m==='GET'){
    const u=exigir(req);return json(res,200,{favoritos:banco.prepare('SELECT slug FROM favoritos WHERE usuario_id=? ORDER BY criado_em DESC').all(u.id).map(x=>x.slug)});
  }
  const usoRota=p.match(/^\/api\/ferramentas\/([a-z0-9-]{2,80})\/uso$/);
  if(usoRota&&m==='POST'){
    const u=exigir(req),slug=usoRota[1];if(!ferramentaPorSlug[slug])throw erro(404,'ferramenta_nao_localizada');conferirLimite(`uso:${u.id}:${slug}`,30,3600000);
    banco.prepare('INSERT INTO uso_ferramentas(usuario_id,slug,total) VALUES(?,?,1) ON CONFLICT(usuario_id,slug) DO UPDATE SET total=total+1,ultimo_uso_em=CURRENT_TIMESTAMP').run(u.id,slug);
    const dia=new Date().toISOString().slice(0,10),hoje=u.pontos_dia===dia?u.pontos_hoje:0;
    if(hoje<100)banco.prepare('UPDATE usuarios SET pontos=pontos+2,pontos_dia=?,pontos_hoje=? WHERE id=?').run(dia,hoje+2,u.id);
    return json(res,200,{ok:true,nivel:1+Math.floor(Math.sqrt((u.pontos+(hoje<100?2:0))/10))});
  }
  const favorito=p.match(/^\/api\/favoritos\/([a-z0-9-]{2,80})$/);
  if(favorito&&m==='PUT'){
    const u=exigir(req);if(!ferramentaPorSlug[favorito[1]])throw erro(404,'ferramenta_nao_localizada');
    if(banco.prepare('SELECT 1 FROM favoritos WHERE usuario_id=? AND slug=?').get(u.id,favorito[1]))return json(res,200,{ok:true});
    if(banco.prepare('SELECT count(*) total FROM favoritos WHERE usuario_id=?').get(u.id).total>=(u.plano==='gratuito'?10:500))throw erro(403,'limite_favoritos');
    banco.prepare('INSERT OR IGNORE INTO favoritos(usuario_id,slug) VALUES(?,?)').run(u.id,favorito[1]);return json(res,200,{ok:true});
  }
  if(favorito&&m==='DELETE'){
    const u=exigir(req);banco.prepare('DELETE FROM favoritos WHERE usuario_id=? AND slug=?').run(u.id,favorito[1]);return json(res,200,{ok:true});
  }
  if(p==='/api/suporte'&&m==='GET'){
    const u=exigir(req);return json(res,200,{mensagens:banco.prepare('SELECT * FROM suporte WHERE usuario_id=? ORDER BY id DESC LIMIT 100').all(u.id)});
  }
  if(p==='/api/suporte'&&m==='POST'){
    const u=exigir(req),b=await corpo(req),assunto=String(b.assunto||'').trim(),texto=String(b.texto||'').trim();conferirLimite(`suporte:${u.id}`,5,86400000);
    if(assunto.length<3||assunto.length>100||texto.length<10||texto.length>2000)throw erro(400,'dados_invalidos');
    const r=banco.prepare('INSERT INTO suporte(usuario_id,assunto,texto) VALUES(?,?,?)').run(u.id,assunto,texto);return json(res,201,{id:Number(r.lastInsertRowid),ok:true});
  }
  if(p==='/api/admin/usuarios'&&m==='GET'){
    admin(req);return json(res,200,{usuarios:banco.prepare('SELECT id,email,usuario,nome,plano,papel,situacao,criado_em FROM usuarios ORDER BY id DESC LIMIT 200').all()});
  }
  const adminUsuario=p.match(/^\/api\/admin\/usuarios\/(\d+)$/);
  if(adminUsuario&&m==='PATCH'){
    const u=admin(req),id=+adminUsuario[1],b=await corpo(req),alvo=banco.prepare('SELECT * FROM usuarios WHERE id=?').get(id);if(!alvo||id===u.id)throw erro(400,'dados_invalidos');
    const plano=b.plano??alvo.plano,situacao=b.situacao??alvo.situacao;
    if(!['gratuito','plus','premium'].includes(plano)||!['ativo','suspenso'].includes(situacao))throw erro(400,'dados_invalidos');
    banco.prepare('UPDATE usuarios SET plano=?,situacao=? WHERE id=?').run(plano,situacao,id);if(situacao==='suspenso')banco.prepare('DELETE FROM sessoes WHERE usuario_id=?').run(id);
    registrarAdmin(u,'editar_usuario',id,{plano,situacao});return json(res,200,{ok:true});
  }
  if(p==='/api/admin/suporte'&&m==='GET'){
    admin(req);return json(res,200,{mensagens:banco.prepare('SELECT s.*,u.usuario,u.email FROM suporte s JOIN usuarios u ON u.id=s.usuario_id ORDER BY s.id DESC LIMIT 200').all()});
  }
  const adminSuporte=p.match(/^\/api\/admin\/suporte\/(\d+)$/);
  if(adminSuporte&&m==='PATCH'){
    const u=admin(req),b=await corpo(req),resposta=String(b.resposta||'').trim();if(resposta.length<2||resposta.length>2000)throw erro(400,'dados_invalidos');
    const r=banco.prepare("UPDATE suporte SET resposta=?,status='respondida',respondido_em=CURRENT_TIMESTAMP WHERE id=?").run(resposta,+adminSuporte[1]);if(!r.changes)throw erro(404,'mensagem_nao_localizada');registrarAdmin(u,'responder_suporte',+adminSuporte[1]);return json(res,200,{ok:true});
  }
  if(m==='GET'&&p==='/api/perfil/disponibilidade'){
    conferirLimite(`nome:${ip(req)}`,20,60000);const h=String(url.searchParams.get('usuario')||'').toLowerCase();
    const disponivel=validoUsuario(h)&&!banco.prepare('SELECT 1 FROM usuarios WHERE usuario=?').get(h);const sugestoes=[];
    if(!disponivel){for(let n=1;n<=20&&sugestoes.length<3;n++){const s=`${h.replace(/[^a-z0-9_]/g,'').slice(0,17)}${n}`;if(validoUsuario(s)&&!banco.prepare('SELECT 1 FROM usuarios WHERE usuario=?').get(s))sugestoes.push(s);}}
    return json(res,200,{disponivel,sugestoes});
  }
  if(m==='PATCH'&&p==='/api/perfil'){
    const u=exigir(req),b=await corpo(req);const nome=b.nome===undefined?u.nome:String(b.nome).trim(),bio=b.bio===undefined?u.bio:String(b.bio).trim(),local=b.local===undefined?u.local:String(b.local).trim(),avatar=b.avatar===undefined?u.avatar:String(b.avatar);
    if(nome.length<2||nome.length>80||bio.length>280||local.length>80||!['sol','folha','estrela'].includes(avatar))throw erro(400,'dados_invalidos');
    if(b.visibilidade!==undefined&&(b.visibilidade===null||typeof b.visibilidade!=='object'||Array.isArray(b.visibilidade)||Object.entries(b.visibilidade).some(([k,v])=>!['bio','local'].includes(k)||typeof v!=='boolean')))throw erro(400,'dados_invalidos');
    const vis=b.visibilidade===undefined?u.visibilidade:JSON.stringify(b.visibilidade);if(vis.length>1000)throw erro(400,'dados_invalidos');
    const recomendadas=b.ferramentas_recomendadas===undefined?JSON.parse(u.recomendadas):b.ferramentas_recomendadas;
    if(!Array.isArray(recomendadas)||recomendadas.length>5||recomendadas.some(s=>typeof s!=='string'||!banco.prepare('SELECT 1 FROM uso_ferramentas WHERE usuario_id=? AND slug=?').get(u.id,s)))throw erro(400,'ferramentas_nao_usadas');
    banco.prepare('UPDATE usuarios SET nome=?,bio=?,local=?,avatar=?,visibilidade=?,recomendadas=? WHERE id=?').run(nome,bio,local,avatar,vis,JSON.stringify(recomendadas),u.id);
    const atualizado=banco.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id);return json(res,200,{perfil:enriquecerPerfil({...usuarioPublico(atualizado),visibilidade:JSON.parse(atualizado.visibilidade)},atualizado)});
  }
  if(m==='GET'&&p.startsWith('/api/perfil/')){
    const u=exigir(req),alvo=banco.prepare('SELECT * FROM usuarios WHERE usuario=?').get(decodeURIComponent(p.slice('/api/perfil/'.length)));indisponivelPerfil(u,alvo);
    const perfil=usuarioPublico(alvo);delete perfil.email;delete perfil.idade;
    if(alvo.id===u.id)perfil.visibilidade=JSON.parse(alvo.visibilidade);
    if(alvo.id!==u.id){let v={};try{v=JSON.parse(alvo.visibilidade);}catch{};if(v.bio===false)delete perfil.bio;if(v.local===false)delete perfil.local;}
    return json(res,200,{perfil:enriquecerPerfil(perfil,alvo)});
  }
  if(p==='/api/amizades'&&m==='GET'){
    const u=exigir(req);return json(res,200,{amizades:banco.prepare(`SELECT a.origem,a.destino,a.estado,a.criado_em,u.usuario,u.nome FROM amizades a JOIN usuarios u ON u.id=CASE WHEN a.origem=? THEN a.destino ELSE a.origem END WHERE a.origem=? OR a.destino=?`).all(u.id,u.id,u.id)});
  }
  if(p==='/api/amizades'&&m==='POST'){
    const u=exigir(req),b=await corpo(req),alvo=banco.prepare('SELECT * FROM usuarios WHERE usuario=?').get(String(b.usuario||'').toLowerCase());indisponivelPerfil(u,alvo);if(u.id===alvo.id)throw erro(400,'dados_invalidos');
    banco.prepare("INSERT OR IGNORE INTO amizades(origem,destino,estado) VALUES(?,?,'pendente')").run(u.id,alvo.id);return json(res,200,{ok:true,estado:'pendente'});
  }
  if(p==='/api/amizades/aceitar'&&m==='POST'){
    const u=exigir(req),b=await corpo(req),alvo=banco.prepare('SELECT * FROM usuarios WHERE usuario=?').get(String(b.usuario||'').toLowerCase());indisponivelPerfil(u,alvo);
    const r=banco.prepare("UPDATE amizades SET estado='aceita' WHERE origem=? AND destino=? AND estado='pendente'").run(alvo.id,u.id);if(!r.changes)throw erro(404,'convite_nao_localizado');
    const id=salaDiretaId(u.id,alvo.id);banco.prepare("INSERT OR IGNORE INTO salas(id,tipo,nome,criador_id,participante_id) VALUES(?,'direta',?,?,?)").run(id,`@${u.usuario} · @${alvo.usuario}`,u.id,alvo.id);
    return json(res,200,{ok:true,sala:id});
  }
  if(p==='/api/bloqueios'&&m==='POST'){
    const u=exigir(req),b=await corpo(req),alvo=banco.prepare('SELECT * FROM usuarios WHERE usuario=?').get(String(b.usuario||'').toLowerCase());if(!alvo||alvo.id===u.id)throw erro(404,'perfil_nao_localizado');
    banco.prepare('INSERT OR IGNORE INTO bloqueios(origem,destino) VALUES(?,?)').run(u.id,alvo.id);
    banco.prepare('DELETE FROM amizades WHERE (origem=? AND destino=?) OR (origem=? AND destino=?)').run(u.id,alvo.id,alvo.id,u.id);return json(res,200,{ok:true});
  }
  if(p.startsWith('/api/bloqueios/')&&m==='DELETE'){
    const u=exigir(req),alvo=banco.prepare('SELECT id FROM usuarios WHERE usuario=?').get(p.slice('/api/bloqueios/'.length));if(alvo)banco.prepare('DELETE FROM bloqueios WHERE origem=? AND destino=?').run(u.id,alvo.id);return json(res,200,{ok:true});
  }
  if(p==='/api/chat/aceite'&&m==='POST'){
    if(!chatAtivo())throw erro(503,'chat_indisponivel');const u=exigir(req),b=await corpo(req);if(b.aceito!==true)throw erro(400,'aceite_obrigatorio');banco.prepare('UPDATE usuarios SET chat_aceito_em=CURRENT_TIMESTAMP WHERE id=?').run(u.id);return json(res,200,{aceito:true});
  }
  if(p==='/api/chat/salas'&&m==='GET'){
    const u=exigirChat(req);const salas=banco.prepare("SELECT * FROM salas WHERE tipo<>'direta' OR criador_id=? OR participante_id=? ORDER BY CASE tipo WHEN 'global' THEN 0 WHEN 'categoria' THEN 1 WHEN 'ferramenta' THEN 2 ELSE 3 END,nome").all(u.id,u.id).filter(s=>{try{salaPermitida(u,s.id);return true;}catch{return false;}});
    return json(res,200,{salas});
  }
  if(p==='/api/chat/eventos'&&m==='GET'){
    const u=exigirChat(req);if([...ouvintes].filter(x=>x.id===u.id).length>=3)throw erro(429,'muitas_conexoes');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': conectado\n\n');
    const item={res,id:u.id,token_hash:hash(cookies(req)[nomeSessao])};ouvintes.add(item);const keep=setInterval(()=>{
      const vivo=chatAtivo()&&banco.prepare(`SELECT 1 FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>? AND u.situacao='ativo' AND u.banido_em IS NULL AND u.chat_aceito_em IS NOT NULL`).get(item.token_hash,agora());
      if(!vivo){res.end();clearInterval(keep);ouvintes.delete(item);return;}try{res.write(': ping\n\n');}catch{res.end();clearInterval(keep);ouvintes.delete(item);}
    },Math.max(100,Number(process.env.PORTAL_SSE_PING_MS)||25000));req.on('close',()=>{clearInterval(keep);ouvintes.delete(item);});return;
  }
  const match=p.match(/^\/api\/chat\/salas\/([^/]+)\/mensagens$/);
  if(match&&m==='GET'){
    const u=exigirChat(req),id=decodeURIComponent(match[1]);salaPermitida(u,id);const antes=Math.max(0,Number(url.searchParams.get('antes'))||Number.MAX_SAFE_INTEGER);
    const mensagens=banco.prepare(`SELECT m.*,a.nome,a.usuario,a.avatar,a.papel,a.pontos,a.criado_em autor_criado_em FROM mensagens m JOIN usuarios a ON a.id=m.autor_id WHERE m.sala_id=? AND m.id<? AND m.removida_em IS NULL AND NOT EXISTS(SELECT 1 FROM bloqueios b WHERE (b.origem=? AND b.destino=m.autor_id) OR (b.destino=? AND b.origem=m.autor_id)) ORDER BY m.id DESC LIMIT 50`).all(id,antes,u.id,u.id).reverse().map(mensagemPublica);
    return json(res,200,{mensagens});
  }
  if(match&&m==='POST'){
    const u=exigirChat(req),id=decodeURIComponent(match[1]);salaPermitida(u,id);if(u.silenciado_ate&&Date.parse(u.silenciado_ate)>agora())throw erro(403,'chat_silenciado');
    conferirLimite(`chat2:${u.id}`,1,2000);conferirLimite(`chat60:${u.id}`,20,60000);const b=await corpo(req),texto=String(b.texto||'').trim();
    if(!texto||texto.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto))throw erro(400,'mensagem_invalida');
    if(Date.parse(u.criado_em)>agora()-7*86400000&&/(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|br|io|dev|app)\b)/i.test(texto))throw erro(403,'links_conta_nova');
    const r=banco.prepare('INSERT INTO mensagens(sala_id,autor_id,texto) VALUES(?,?,?)').run(id,u.id,texto);const msg=banco.prepare('SELECT m.*,a.nome,a.usuario,a.avatar,a.papel,a.pontos,a.criado_em autor_criado_em FROM mensagens m JOIN usuarios a ON a.id=m.autor_id WHERE m.id=?').get(Number(r.lastInsertRowid));
    const dia=new Date().toISOString().slice(0,10),hoje=u.pontos_dia===dia?u.pontos_hoje:0;if(hoje<20)banco.prepare('UPDATE usuarios SET pontos=pontos+1,pontos_dia=?,pontos_hoje=? WHERE id=?').run(dia,hoje+1,u.id);
    avisar({sala:id,salaId:id,mensagem:mensagemPublica(msg)});return json(res,201,{mensagem:mensagemPublica(msg)});
  }
  if(p==='/api/chat/denuncias'&&m==='POST'){
    const u=exigirChat(req),b=await corpo(req),motivo=String(b.motivo||'').trim();conferirLimite(`denuncia:${u.id}`,5,3600000);if(motivo.length<3||motivo.length>500||(!b.mensagemId&&!b.usuarioId))throw erro(400,'dados_invalidos');
    const msg=b.mensagemId?banco.prepare('SELECT autor_id,sala_id FROM mensagens WHERE id=? AND removida_em IS NULL').get(+b.mensagemId):null;
    if(b.mensagemId&&!msg)throw erro(404,'mensagem_nao_localizada');
    if(msg){salaPermitida(u,msg.sala_id);if(banco.prepare('SELECT 1 FROM bloqueios WHERE (origem=? AND destino=?) OR (origem=? AND destino=?)').get(u.id,msg.autor_id,msg.autor_id,u.id))throw erro(404,'mensagem_nao_localizada');}
    const alvo=msg?.autor_id||+b.usuarioId;
    if(!banco.prepare('SELECT 1 FROM usuarios WHERE id=?').get(alvo))throw erro(404,'perfil_nao_localizado');
    banco.prepare('INSERT INTO denuncias(denunciante_id,alvo_usuario_id,mensagem_id,motivo) VALUES(?,?,?,?)').run(u.id,alvo,msg?+b.mensagemId:null,motivo);return json(res,201,{ok:true});
  }
  if(p==='/api/admin/chat/denuncias'&&m==='GET'){admin(req);return json(res,200,{denuncias:banco.prepare("SELECT d.*,m.texto,u.usuario,u.nome FROM denuncias d LEFT JOIN mensagens m ON m.id=d.mensagem_id LEFT JOIN usuarios u ON u.id=d.alvo_usuario_id WHERE d.situacao='aberta' ORDER BY d.id DESC LIMIT 100").all()});}
  if(p==='/api/admin/chat/moderar'&&m==='POST'){
    const u=admin(req),b=await corpo(req),id=+b.usuarioId;if(!Number.isInteger(id)||id===u.id||!banco.prepare('SELECT 1 FROM usuarios WHERE id=?').get(id))throw erro(400,'dados_invalidos');
    if(b.acao==='silenciar'){const horas=Math.min(720,Math.max(1,+b.horas||24));banco.prepare('UPDATE usuarios SET silenciado_ate=? WHERE id=?').run(new Date(agora()+horas*3600000).toISOString(),id);}
    else if(b.acao==='banir')banco.prepare('UPDATE usuarios SET banido_em=CURRENT_TIMESTAMP WHERE id=?').run(id);
    else if(b.acao==='liberar')banco.prepare('UPDATE usuarios SET banido_em=NULL,silenciado_ate=NULL WHERE id=?').run(id);
    else throw erro(400,'dados_invalidos');registrarAdmin(u,b.acao,id,{horas:b.horas});return json(res,200,{ok:true});
  }
  if(p==='/api/admin/chat/mensagem'&&m==='DELETE'){
    const u=admin(req),b=await corpo(req);const msg=banco.prepare('SELECT sala_id FROM mensagens WHERE id=?').get(+b.mensagemId);banco.prepare('UPDATE mensagens SET removida_em=CURRENT_TIMESTAMP WHERE id=?').run(+b.mensagemId);registrarAdmin(u,'remover_mensagem',+b.mensagemId);if(msg)avisar({sala:msg.sala_id,salaId:msg.sala_id,removidaId:+b.mensagemId});return json(res,200,{ok:true});
  }
  if(p==='/api/admin/chat/denuncias'&&m==='PATCH'){
    const u=admin(req),b=await corpo(req);if(!['resolvida','descartada'].includes(b.situacao))throw erro(400,'dados_invalidos');banco.prepare('UPDATE denuncias SET situacao=? WHERE id=?').run(b.situacao,+b.id);registrarAdmin(u,'denuncia_'+b.situacao,+b.id);return json(res,200,{ok:true});
  }
  const denunciaAcao=p.match(/^\/api\/admin\/chat\/denuncias\/(\d+)$/);
  if(denunciaAcao&&m==='PATCH'){
    const u=admin(req),b=await corpo(req),id=+denunciaAcao[1],d=banco.prepare('SELECT * FROM denuncias WHERE id=?').get(id);if(!d)throw erro(404,'denuncia_nao_localizada');
    if(b.acao==='dispensar')banco.prepare("UPDATE denuncias SET situacao='descartada' WHERE id=?").run(id);
    else if(b.acao==='remover'&&d.mensagem_id){const msg=banco.prepare('SELECT sala_id FROM mensagens WHERE id=?').get(d.mensagem_id);banco.prepare('UPDATE mensagens SET removida_em=CURRENT_TIMESTAMP WHERE id=?').run(d.mensagem_id);banco.prepare("UPDATE denuncias SET situacao='resolvida' WHERE id=?").run(id);if(msg)avisar({sala:msg.sala_id,salaId:msg.sala_id,removidaId:d.mensagem_id});}
    else if(['silenciar','banir'].includes(b.acao)&&d.alvo_usuario_id!==u.id){
      if(b.acao==='silenciar')banco.prepare('UPDATE usuarios SET silenciado_ate=? WHERE id=?').run(new Date(agora()+86400000).toISOString(),d.alvo_usuario_id);
      else banco.prepare('UPDATE usuarios SET banido_em=CURRENT_TIMESTAMP WHERE id=?').run(d.alvo_usuario_id);
      banco.prepare("UPDATE denuncias SET situacao='resolvida' WHERE id=?").run(id);
    }else throw erro(400,'dados_invalidos');registrarAdmin(u,'denuncia_'+b.acao,d.alvo_usuario_id,{denuncia:id});return json(res,200,{ok:true});
  }
  if(p==='/api/anuncios'&&m==='GET'){
    const editor=String(process.env.PORTAL_ADS_EDITOR||'');const ativo=process.env.PORTAL_ADS_ATIVO==='1'&&/^ca-pub-\d{16}$/.test(editor);
    const referer=req.headers.referer||'';let caminho='';try{const ref=new URL(referer);if(ref.origin===origem)caminho=ref.pathname;}catch{}
    const normal=caminho.replace(/^\/en(?=\/)/,'');const ferramenta=normal.match(/^\/f\/([a-z0-9-]+)\/?(?:index\.html)?$/)?.[1];
    const ficha=ferramenta?ferramentaPorSlug[ferramenta]:null;
    const paginaPermitida=['/','/index.html','/ferramentas.html'].includes(normal)||!!(ficha&&ficha.status==='pronta'&&!['estudos'].includes(ficha.cat));
    const pagou=['plus','premium'].includes(sessao(req)?.plano);const permitido=ativo&&paginaPermitida&&!pagou;
    const blocos={};for(const chave of ['RODAPE','RESULTADO','LISTA']){const valor=String(process.env[`PORTAL_ADS_${chave}`]||'');if(/^\d{6,20}$/.test(valor))blocos[chave.toLowerCase()]=valor;}
    return json(res,200,{ativo,editor:permitido?editor:null,blocos:permitido?blocos:{},teste:process.env.PORTAL_ADS_TESTE==='1',permitido});
  }
  throw erro(404,'nao_encontrado');
}

export function iniciar({porta=Number(process.env.PORTAL_API_PORTA||4870),host='127.0.0.1'}={}){
  const servidor=createServer((req,res)=>{Promise.resolve(rota(req,res)).catch(e=>{if(res.headersSent){res.end();return;}json(res,e.status||500,{erro:e.codigo||'erro_interno'},e.status===429?{'Retry-After':String(e.retryAfter||2)}:{});});});
  const limpar=setInterval(()=>{
    try{
      banco.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-90 days')").run();
      banco.prepare('DELETE FROM sessoes WHERE expira_em<?').run(agora());
      banco.prepare('DELETE FROM redefinicoes WHERE expira_em<?').run(agora());
    }catch(e){process.stderr.write(`Falha na limpeza da API: ${e.message}\n`);}
  },3600000);
  limpar.unref();servidor.on('close',()=>clearInterval(limpar));
  return new Promise((ok,fail)=>{servidor.once('error',fail);servidor.listen(porta,host,()=>ok(servidor));});
}
export function fecharBanco(){banco.close();}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
  iniciar().then(s=>process.stdout.write(`Portal API em http://127.0.0.1:${s.address().port}\n`)).catch(e=>{process.stderr.write(`${e.message}\n`);process.exitCode=1;});
}
