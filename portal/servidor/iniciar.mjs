import { createServer } from 'node:http';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { abrirBanco } from './banco.mjs';
import { hash, token, erro, cookies, senhaHash, hashDummy, comparar, corpo } from './seguranca.mjs';
import { ferramentasProntas } from '../dados/catálogo.js';
import { categorias } from '../dados/categorias.js';
import { aplicarLimitesPublicados, limitesDoPlano, limiteDadosDoPlano, limiteArmazenamento, bytesUsados, dadosDeTrabalhoValidos, planosPublicos, trabalhoPublico, validarEdicaoTrabalho, validarNovoTrabalho } from './trabalhos.mjs';
import { AVATARES, medalhasDoUsuario, nivelDePontos, personalizacoesDoNivel, progressoDeNivel, validarPersonalizacao, validarSociais } from './perfil.mjs';
import { progressoDeRank } from '../dados/recompensas.js';
import { MAX_IMAGEM, itemAdmin, novidadesPublicas, removerNovidade, salvarImagem, salvarNovidade } from './novidades.mjs';
import { configuracaoPublicidade, salvarPublicidade } from './publicidade.mjs';
import { iniciarBanners, tratarBanners } from './banners.mjs';
import { tratarRecompensas, registrarAtividadeRecompensa } from './recompensas.mjs';
import { criarEditorial,catalogoOriginal } from './editorial.mjs';
import { criarProtecao } from './trafego.mjs';
import { CABEÇALHOS_DE_SEGURANÇA } from '../ferramentas/política-de-segurança.mjs';

const agora = () => Date.now();
const nomeSessao = process.env.URL_PUBLICA?.startsWith('https://') ? '__Host-sessao' : 'sessao';
const nomeCsrf = process.env.URL_PUBLICA?.startsWith('https://') ? '__Host-csrf' : 'csrf';
const secure = nomeSessao.startsWith('__Host-');
const origem = new URL(process.env.URL_PUBLICA || 'http://127.0.0.1:4400').origin;
const origensPermitidas = new Set([origem]);
if(process.env.NODE_ENV==='development'&&process.env.PORTAL_CHAT_LOCAL==='1'&&origem==='http://127.0.0.1:4400'){
  origensPermitidas.add('http://localhost:4400');
  for(const lista of Object.values(networkInterfaces()))for(const rede of lista||[])if(rede.family==='IPv4')origensPermitidas.add(`http://${rede.address}:4400`);
}
const banco = abrirBanco();
iniciarBanners(banco);
for(const c of categorias)banco.prepare("INSERT OR IGNORE INTO salas(id,tipo,nome) VALUES(?,'categoria',?)").run(`categoria-${c.id}`,c.nome);
for(const f of ferramentasProntas)banco.prepare("INSERT OR IGNORE INTO salas(id,tipo,nome) VALUES(?,'ferramenta',?)").run(`ferramenta-${f.slug}`,f.nome);
const protecao=criarProtecao(banco);
const ferramentaPorSlug={...catalogoOriginal};
let regrasPontos;
function aplicarConfiguracao(config){regrasPontos=config.pontos;aplicarLimitesPublicados(config.limites);for(const [slug,f]of Object.entries(catalogoOriginal))ferramentaPorSlug[slug]={...f,...config.ferramentas[slug]?.['pt-BR'],categoriaNome:config.categorias[f.cat]?.['pt-BR']?.nome||f.categoriaNome};}
const editor=criarEditorial(banco,{aoPublicar:aplicarConfiguracao});
aplicarConfiguracao(editor.publicado());
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
function jsonSeguro(valor,padrao={}){try{const x=JSON.parse(valor||'');return x&&typeof x==='object'&&!Array.isArray(x)?x:padrao;}catch{return padrao;}}
function listaSegura(valor){try{const x=JSON.parse(valor||'');return Array.isArray(x)?x:[];}catch{return [];}}
function pontosDeEvolucao(u){const bonus=medalhasDoUsuario(banco,u).filter(m=>m.desbloqueada).reduce((s,m)=>s+((m.tier+1)*5),0);return Math.max(0,Number(u.pontos)||0)+bonus;}
function nivelDoUsuario(u){return nivelDePontos(pontosDeEvolucao(u));}
function usuarioPublico(u) {
  if(!u)return null;
  return {
    id:u.id,nome:u.nome,email:u.email,usuario:u.usuario,plano:u.plano,papel:u.papel,idade:u.idade,
    idioma:u.idioma,tema:u.tema,criado_em:u.criado_em,bio:u.bio,local:u.local,avatar:u.avatar,
    foto_url:u.avatar_foto?`/api/perfil/foto/${encodeURIComponent(u.usuario)}`:null,
    banner:u.banner||'brisa',moldura:u.moldura||'basica',sociais:jsonSeguro(u.sociais,{}),
    pontos:u.pontos,pontos_evolucao:pontosDeEvolucao(u),nivel:nivelDoUsuario(u),chat_aceito:!!u.chat_aceito_em
  };
}
function sessao(req) {
  const t=cookies(req)[nomeSessao]; if(!t)return null;
  return banco.prepare(`SELECT u.*,s.id sessao_id FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>? AND u.situacao='ativo'`).get(hash(t),agora())||null;
}
function exigir(req){ const u=sessao(req); if(!u)throw erro(401,'sessao_necessaria'); return u; }
function admin(req){const u=exigir(req);if(u.papel!=='admin')throw erro(403,'acesso_negado');return u;}
function revalidarPremium(req, id){const u=exigir(req);if(u.id!==id)throw erro(401,'sessao_necessaria');if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');}
function chatAtivo(){return process.env.PORTAL_CHAT_LOCAL==='1' && process.env.NODE_ENV!=='production' || process.env.PORTAL_CHAT_PUBLICO==='1';}
function exigirChat(req){if(!chatAtivo())throw erro(503,'chat_indisponivel');const u=exigir(req);if(!u.chat_aceito_em)throw erro(403,'aceite_chat_necessario');if(u.banido_em)throw erro(403,'chat_banido');return u;}
function validoUsuario(x){return typeof x==='string' && /^[a-z][a-z0-9_]{2,19}$/.test(x.toLowerCase()) && !reservados.has(x.toLowerCase());}
function senhaValida(x){return typeof x==='string' && x.length>=12 && x.length<=128;}
function conferirLimite(chave,max,janela){protecao.conferir(chave,max,janela);}
function creditarAtividade(u,tipo){
  const dia=new Date().toISOString().slice(0,10),hoje=u.pontos_dia===dia?u.pontos_hoje:0;
  const cap=tipo==='uso'?regrasPontos.limite_diario:regrasPontos.limite_chat;
  const ganho=Math.max(0,Math.min(tipo==='uso'?regrasPontos.por_uso:regrasPontos.por_mensagem,cap-hoje));
  if(ganho)banco.prepare('UPDATE usuarios SET pontos=pontos+?,pontos_dia=?,pontos_hoje=? WHERE id=?').run(ganho,dia,hoje+ganho,u.id);
}
function proteger(req){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return;
  if(!origensPermitidas.has(req.headers.origin) || req.headers['sec-fetch-site']==='cross-site')throw erro(403,'origem_invalida');
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
function mensagemPublica(m,leitorId=null){
  const resposta=m.resposta_id?{id:m.resposta_id,texto:m.resposta_texto,usuario:m.resposta_usuario}:null;
  return {id:m.id,sala_id:m.sala_id,texto:m.texto,resposta_a:m.resposta_a||null,resposta,criado_em:m.criado_em,midias:midiasPublicas(m.id,leitorId),autor:{
    id:m.autor_id,nome:m.nome,usuario:m.usuario,avatar:m.avatar,
    foto_url:m.autor_tem_foto?`/api/perfil/foto/${encodeURIComponent(m.usuario)}`:null,
    papel:m.papel,criado_em:m.autor_criado_em,nivel:nivelDePontos(m.pontos)
  }};
}
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

function tipoMidia(mime){
  if(mime.startsWith('image/'))return 'imagem';
  if(mime.startsWith('audio/'))return 'audio';
  if(mime.startsWith('video/'))return 'video';
  return 'arquivo';
}
function limiteMidia(mime){
  if(['image/png','image/jpeg','image/webp','image/gif'].includes(mime))return 8*1024*1024;
  if(['audio/mpeg','audio/wav','audio/ogg','audio/mp4'].includes(mime))return 20*1024*1024;
  if(['video/mp4','video/webm'].includes(mime))return 40*1024*1024;
  if(['application/pdf','text/plain','text/csv','application/zip','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime))return 15*1024*1024;
  return 0;
}
function conteudoMidiaValido(buffer,mime){
  if(!buffer.length)return false;
  if(mime==='image/png')return buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mime==='image/webp')return buffer.length>12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
  if(mime==='image/gif')return buffer.length>6&&['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString());
  if(mime==='application/pdf')return buffer.subarray(0,5).toString()==='%PDF-';
  if(['application/zip','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime))return buffer.length>4&&buffer[0]===0x50&&buffer[1]===0x4b;
  if(mime==='video/mp4'||mime==='audio/mp4')return buffer.length>12&&buffer.subarray(4,8).toString()==='ftyp';
  if(mime==='video/webm')return buffer.length>4&&buffer[0]===0x1a&&buffer[1]===0x45&&buffer[2]===0xdf&&buffer[3]===0xa3;
  if(mime==='audio/ogg')return buffer.length>4&&buffer.subarray(0,4).toString()==='OggS';
  if(mime==='audio/wav')return buffer.length>12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WAVE';
  if(mime==='audio/mpeg')return (buffer.length>3&&buffer.subarray(0,3).toString()==='ID3')||(buffer.length>2&&buffer[0]===0xff&&(buffer[1]&0xe0)===0xe0);
  if(['text/plain','text/csv'].includes(mime))return !buffer.includes(0);
  return true;
}
function nomeMidiaSeguro(valor){
  let nome='';
  try{nome=decodeURIComponent(String(valor||''));}catch{nome=String(valor||'');}
  nome=nome.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim().slice(0,120);
  return nome||'arquivo';
}
function midiasPublicas(mensagemId,leitorId=null){
  const linhas=banco.prepare('SELECT id,nome,mime,tamanho,duracao,criado_em FROM chat_midias WHERE mensagem_id=? ORDER BY id').all(mensagemId);
  return linhas.map(item=>{
    const leitura=leitorId?banco.prepare('SELECT posicao,duracao,concluida,aberto_em,atualizado_em FROM chat_reproducao WHERE usuario_id=? AND midia_id=?').get(leitorId,item.id):null;
    return {
      id:item.id,nome:item.nome,mime:item.mime,tamanho:item.tamanho,duracao:item.duracao,
      tipo:tipoMidia(item.mime),url:'/api/chat/midias/'+item.id,criado_em:item.criado_em,
      reproducao:leitura?{posicao:leitura.posicao,duracao:leitura.duracao,concluida:!!leitura.concluida,aberto_em:leitura.aberto_em}:null
    };
  });
}
function midiaComAcesso(u,id){
  const item=banco.prepare('SELECT x.*,m.sala_id,m.autor_id mensagem_autor FROM chat_midias x JOIN mensagens m ON m.id=x.mensagem_id WHERE x.id=? AND m.removida_em IS NULL').get(id);
  if(!item)throw erro(404,'midia_nao_localizada');
  const sala=salaPermitida(u,item.sala_id);
  if(sala.tipo==='direta'&&Date.parse(String(item.criado_em).replace(' ','T')+'Z')<agora()-48*3600000)throw erro(404,'midia_nao_localizada');
  return item;
}

function registrarAdmin(u,acao,alvo,detalhe={}){banco.prepare('INSERT INTO auditoria_admin(admin_id,acao,alvo_id,detalhe) VALUES(?,?,?,?)').run(u.id,acao,alvo,JSON.stringify(detalhe));}
function enriquecerPerfil(perfil,u){
  perfil.ferramentas_mais_usadas=banco.prepare('SELECT slug,total FROM uso_ferramentas WHERE usuario_id=? ORDER BY total DESC LIMIT 5').all(u.id);
  perfil.ferramentas_recomendadas=JSON.parse(u.recomendadas||'[]');
  perfil.medalhas=medalhasDoUsuario(banco,u);
  perfil.progresso_nivel=progressoDeNivel(pontosDeEvolucao(u));
  perfil.rank=progressoDeRank(perfil.progresso_nivel.pontos);
  const destaques=banco.prepare('SELECT selecionadas FROM perfil_conquistas_destaque WHERE usuario_id=?').get(u.id);
  perfil.conquistas_destaque=destaques?listaSegura(destaques.selecionadas):null;
  perfil.personalizacoes=personalizacoesDoNivel(perfil.nivel);
  return perfil;
}
async function corpoBinario(req,maximo){
  const tamanho=Number(req.headers['content-length']||0);
  if(tamanho>maximo)throw erro(413,'corpo_grande');
  const partes=[];let total=0;
  for await(const parte of req){total+=parte.length;if(total>maximo)throw erro(413,'corpo_grande');partes.push(parte);}
  return Buffer.concat(partes);
}
function imagemValida(buffer,mime){
  if(!buffer.length)return false;
  if(mime==='image/png')return buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mime==='image/webp')return buffer.length>12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
  return false;
}

async function rota(req,res){
  const url=new URL(req.url,'http://localhost');const p=url.pathname;const m=req.method;
  if(!p.startsWith('/api/'))throw erro(404,'nao_encontrado');
  // Um administrador autenticado ainda pode consultar e desfazer bloqueios da própria rede.
  if(!p.startsWith('/api/admin/operacao')||sessao(req)?.papel!=='admin')conferirLimite(`global:${ip(req)}`,180,60000);
  if(m==='OPTIONS'){res.writeHead(204,{'Allow':'GET,POST,PUT,PATCH,DELETE,OPTIONS'});res.end();return;}
  // Sem conta ou dados privados: permite que o orquestrador de hospedagem verifique API e SQLite.
  if(m==='GET'&&p==='/api/saude'){
    try{banco.prepare('SELECT 1').get();return json(res,200,{estado:'ok'});}
    catch{return json(res,503,{estado:'indisponivel'});}
  }
  if(await tratarBanners(req,res,{banco,json,admin,proteger,corpo,corpoBinario,registrarAdmin}))return;
  if(m==='GET'&&p==='/api/autenticacao/sessao'){
    if(!(/^[A-Za-z0-9_-]{43}$/.test(cookies(req)[nomeCsrf]||'')))setCookie(res,nomeCsrf,token());
    const u=sessao(req);return json(res,200,{usuario:usuarioPublico(u),chat_habilitado:chatAtivo(),chat_aceito:!!u?.chat_aceito_em});
  }
  proteger(req);
  if(await tratarRecompensas(req,res,{db:banco,json,exigir,admin,corpo,registrarAdmin,nivelDoUsuario,pontos:()=>regrasPontos}))return;
  if(p==='/api/regras-pontos'&&m==='GET')return json(res,200,{pontos:regrasPontos});
  if(p==='/api/admin/editorial'&&m==='GET'){admin(req);return json(res,200,editor.painel());}
  if(p==='/api/admin/editorial'&&m==='PUT'){admin(req);const b=await corpo(req,262144),u=admin(req);const r=editor.salvar(b.dados,b.versao);registrarAdmin(u,'salvar_editorial',null,{versao:r.versao});return json(res,200,r);}
  if(p==='/api/admin/editorial/historico'&&m==='GET'){admin(req);return json(res,200,{revisoes:editor.historico()});}
  if(p==='/api/admin/editorial/restaurar'&&m==='POST'){admin(req);const b=await corpo(req),u=admin(req),r=editor.restaurar(b.id,b.versao);registrarAdmin(u,'restaurar_editorial',null,{id:b.id,versao:r.versao});return json(res,200,r);}
  if(p==='/api/admin/editorial/publicar'&&m==='POST'){admin(req);const b=await corpo(req),u=admin(req),r=await editor.publicar(b.versao);registrarAdmin(u,'publicar_editorial',null,{versao:r.publicada_versao});return json(res,200,r);}
  if(p==='/api/admin/editorial/recuperar'&&m==='POST'){const u=admin(req);await editor.recuperar();registrarAdmin(u,'recuperar_editorial',null);return json(res,200,editor.painel());}
  if(p==='/api/admin/operacao'&&m==='GET'){admin(req);return json(res,200,{bloqueios:protecao.listar(),erros:banco.prepare('SELECT * FROM operacao_erros ORDER BY id DESC LIMIT 100').all(),auditoria:banco.prepare('SELECT id,acao,alvo_id,criado_em FROM auditoria_admin ORDER BY id DESC LIMIT 100').all()});}
  if(p==='/api/admin/operacao/desbloquear'&&m==='POST'){admin(req);const b=await corpo(req),u=admin(req);protecao.desbloquear(b.id,b.versao);registrarAdmin(u,'desbloquear_trafego',null,{identificador:b.id});return json(res,200,{ok:true});}
  if(p==='/api/admin/publicidade'&&m==='GET') { admin(req);return json(res,200,{config:configuracaoPublicidade(banco),local:process.env.NODE_ENV!=='production'}); }
  if(p==='/api/admin/publicidade'&&m==='PUT') {
    const u=admin(req),config=salvarPublicidade(banco,await corpo(req));registrarAdmin(u,'editar_publicidade',null,{ativo:config.ativo,demonstracao:config.demonstracao});return json(res,200,{config});
  }
  if(p==='/api/novidades'&&m==='GET') return json(res,200,novidadesPublicas(banco,url.searchParams.get('idioma')));
  if(p==='/api/admin/novidades'&&m==='GET'){
    admin(req); return json(res,200,{itens:banco.prepare('SELECT id FROM novidades ORDER BY ordem,id').all().map(x=>itemAdmin(banco,x.id))});
  }
  if(p==='/api/admin/novidades'&&m==='POST'){
    const u=admin(req),item=salvarNovidade(banco,await corpo(req));registrarAdmin(u,'criar_novidade',item.id);return json(res,201,{item});
  }
  const novidade=p.match(/^\/api\/admin\/novidades\/(\d+)$/);
  if(novidade&&m==='PUT'){
    const u=admin(req),item=salvarNovidade(banco,await corpo(req),Number(novidade[1]));registrarAdmin(u,'editar_novidade',item.id);return json(res,200,{item});
  }
  if(novidade&&m==='DELETE'){
    const u=admin(req),b=await corpo(req);removerNovidade(banco,Number(novidade[1]),b.versao);registrarAdmin(u,'remover_novidade',Number(novidade[1]));return json(res,200,{ok:true});
  }
  const imagemNovidade=p.match(/^\/api\/(admin\/)?novidades\/(\d+)\/imagem$/);
  if(imagemNovidade&&m==='GET'){
    const id=Number(imagemNovidade[2]);
    if(imagemNovidade[1])admin(req);
    else if(!novidadesPublicas(banco).itens.some(x=>x.id===id))throw erro(404,'novidade_nao_localizada');
    const item=banco.prepare('SELECT imagem,imagem_mime FROM novidades WHERE id=?').get(id);
    if(!item?.imagem)throw erro(404,'novidade_nao_localizada');
    res.writeHead(200,{'Content-Type':item.imagem_mime,'Content-Length':item.imagem.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});return res.end(item.imagem);
  }
  if(imagemNovidade?.[1]&&['POST','DELETE'].includes(m)){
    const u=admin(req),id=Number(imagemNovidade[2]);
    const bytes=m==='POST'?await corpoBinario(req,MAX_IMAGEM):null;
    const item=salvarImagem(banco,id,Number(req.headers['x-novidade-versao']),bytes,String(req.headers['content-type']||''));
    registrarAdmin(u,m==='POST'?'imagem_novidade':'remover_imagem_novidade',id);return json(res,200,{item});
  }
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
  if(m==='GET'&&p==='/api/conta'){
    const u=exigir(req), limitesPlano=limitesDoPlano(u.plano);
    const usoConta={
      favoritos:banco.prepare('SELECT count(*) total FROM favoritos WHERE usuario_id=?').get(u.id).total,
      trabalhos:banco.prepare('SELECT count(*) total FROM trabalhos WHERE usuario_id=?').get(u.id).total,
    };
    return json(res,200,{usuario:usuarioPublico(u),limites:limitesPlano,uso:usoConta});
  }
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
    const trabalhos=banco.prepare('SELECT ferramenta_slug,titulo,dados,situacao,criado_em,atualizado_em FROM trabalhos WHERE usuario_id=? ORDER BY atualizado_em DESC').all(u.id).map(item=>({...item,dados:JSON.parse(item.dados)}));
    const denuncias=banco.prepare('SELECT id,alvo_usuario_id,mensagem_id,motivo,situacao,criado_em FROM denuncias WHERE denunciante_id=?').all(u.id);
    const conquistas=medalhasDoUsuario(banco,u),destaques=banco.prepare('SELECT selecionadas FROM perfil_conquistas_destaque WHERE usuario_id=?').get(u.id);
    const recompensas={preferencia:banco.prepare('SELECT ranking FROM recompensas_preferencias WHERE usuario_id=?').get(u.id)||{ranking:0},resgates:banco.prepare('SELECT chave,titulo_pt,titulo_en,xp,criado_em FROM recompensas_resgates WHERE usuario_id=?').all(u.id),usos:banco.prepare('SELECT dia,slug FROM recompensas_usos WHERE usuario_id=?').all(u.id)};
    return json(res,200,{usuario:usuarioPublico(u),mensagens,amizades,bloqueios,favoritos,trabalhos,suporte,denuncias,uso,conquistas,recompensas,conquistas_destaque:destaques?listaSegura(destaques.selecionadas):null});
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
    const u=exigir(req),slug=usoRota[1];if(ferramentaPorSlug[slug]?.status!=='pronta')throw erro(404,'ferramenta_nao_localizada');conferirLimite(`uso:${u.id}:${slug}`,30,3600000);
    banco.prepare('INSERT INTO uso_ferramentas(usuario_id,slug,total) VALUES(?,?,1) ON CONFLICT(usuario_id,slug) DO UPDATE SET total=total+1,ultimo_uso_em=CURRENT_TIMESTAMP').run(u.id,slug);
    registrarAtividadeRecompensa(banco,u.id,slug);
    creditarAtividade(u,'uso');
    const atualizado=banco.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id);
    return json(res,200,{ok:true,nivel:nivelDoUsuario(atualizado),pontos_evolucao:pontosDeEvolucao(atualizado)});
  }
  const favorito=p.match(/^\/api\/favoritos\/([a-z0-9-]{2,80})$/);
  if(favorito&&m==='PUT'){
    const u=exigir(req);if(!ferramentaPorSlug[favorito[1]])throw erro(404,'ferramenta_nao_localizada');
    if(banco.prepare('SELECT 1 FROM favoritos WHERE usuario_id=? AND slug=?').get(u.id,favorito[1]))return json(res,200,{ok:true});
    if(banco.prepare('SELECT count(*) total FROM favoritos WHERE usuario_id=?').get(u.id).total>=limitesDoPlano(u.plano).favoritos)throw erro(403,'limite_favoritos');
    banco.prepare('INSERT OR IGNORE INTO favoritos(usuario_id,slug) VALUES(?,?)').run(u.id,favorito[1]);return json(res,200,{ok:true});
  }
  if(favorito&&m==='DELETE'){
    const u=exigir(req);banco.prepare('DELETE FROM favoritos WHERE usuario_id=? AND slug=?').run(u.id,favorito[1]);return json(res,200,{ok:true});
  }
  // F252–F351: plano canônico, CSRF e cota antes do upload; cálculos isolados da API.
  const rotaProfissional = p.match(/^\/api\/profissionais\/([a-z0-9-]{2,100})$/);
  if (rotaProfissional && m === 'POST') {
    const { especificacaoPorSlug, planoPermiteProfissional } = await import('../dados/profissionais.js');
    const spec = especificacaoPorSlug[rotaProfissional[1]];
    if (!spec) throw erro(404, 'nao_encontrado');
    const autorizar = (id) => {
      const usuario = exigir(req);
      if (id !== undefined && usuario.id !== id) throw erro(401, 'sessao_necessaria');
      if (usuario.papel !== 'admin' && !planoPermiteProfissional(usuario.plano, spec.plano)) {
        throw erro(403, spec.plano === 'premium' ? 'plano_premium_necessario' : 'plano_plus_necessario');
      }
      return usuario;
    };
    const usuario = autorizar();
    conferirLimite('ferramentas-profissionais:' + usuario.id, 12, 60000);
    const dados = await corpo(req, 2200000);
    autorizar(usuario.id);
    const controle = new AbortController();
    const aoDesconectar = () => controle.abort();
    res.once('close', aoDesconectar);
    try {
      const { executarProfissional } = await import('./profissionais/executar.mjs');
      const relatorio = await executarProfissional(spec.slug, dados, { usuario: usuario.id, signal: controle.signal });
      // Um plano ou uma sessão revogados durante o cálculo não recebem o relatório.
      autorizar(usuario.id);
      if (!res.destroyed) return json(res, 200, { relatorio });
      return;
    } catch (e) {
      if (res.destroyed) return;
      if (e?.name === 'ErroProfissional') return json(res, 400, { erro: 'dados_invalidos', mensagem: e.message.slice(0, 400) });
      if (e?.name === 'ErroExecucaoProfissional') return json(res, e.status, { erro: 'processamento_indisponivel', mensagem: e.message });
      throw e;
    } finally {
      res.off('close', aoDesconectar);
    }
  }
  // A autorização ocorre no servidor, ANTES de ler CSV comercial.
  if(p==='/api/premium/previsao-de-vendas'&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('analise-premium:'+u.id,12,60000);
    const entrada=await corpo(req,300000);
    try{
      const {analisarVendasPremium}=await import('./analise-premium.mjs');
      revalidarPremium(req,u.id);
      const relatorio=analisarVendasPremium(entrada);
      return json(res,200,{relatorio});
    }catch(e){
      if(e?.name==='ErroInteligencia')
        return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // Motor de estoque privado: sessão, plano e limite conferidos antes de receber dados.
  if(p==='/api/premium/planejamento-estoque'&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('planejamento-estoque:'+u.id,8,60000);
    const entrada=await corpo(req,300000);
    try{
      const {planejarEstoque}=await import('./estoque-abc-xyz.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:planejarEstoque(entrada)});
    }catch(e){
      if(e?.name==='ErroEstoque')
        return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  if(p==='/api/premium/auditar-feed'&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('auditoria-merchant:'+u.id,12,60000);
    const entrada=await corpo(req,300000);
    try{
      const {auditarFeedMerchant}=await import('./auditoria-merchant.mjs');
      revalidarPremium(req,u.id);
      const relatorio=auditarFeedMerchant(entrada);
      return json(res,200,{relatorio});
    }catch(e){
      if(e?.name==='ErroMerchant')
        return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
    // Segurança Premium antes de ler metadados e JSON-LD.
  if(p==='/api/premium/auditar-seo-produtos'&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('auditoria-seo-produtos:'+u.id,8,60000);
    const dados=await corpo(req,300000);
    try{
      const {auditarSeoProdutos}=await import('./auditoria-seo-produtos.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:auditarSeoProdutos(dados)});
    }catch(e){
      if(e?.name==='ErroSeo')return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // Cinco módulos Premium em lote. Verifica permissão e throttling antes do CSV.
  const rotaLote=p.match(/^\/api\/premium\/lote\/([a-z0-9-]+)$/);
  if(rotaLote&&m==='POST'){
    const {TIPOS_LOTE_PREMIUM,analisarLotePremium}=await import('./analises-premium-lote.mjs');
    if(!TIPOS_LOTE_PREMIUM.includes(rotaLote[1]))throw erro(404,'nao_encontrado');
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('lote-premium:'+u.id,12,60000);
    const dados=await corpo(req,300000);
    revalidarPremium(req,u.id);
    try{return json(res,200,{relatorio:analisarLotePremium(rotaLote[1],dados)});}
    catch(e){
      if(e?.name==='ErroLotePremium')return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // Estratégia Premium: login, plano e taxa antes de ler dados financeiros.
  const rotaEstrategia=p.match(/^\/api\/premium\/estrategia\/([a-z0-9-]+)$/);
  if(rotaEstrategia&&m==='POST'){
    const {TIPOS_ESTRATEGIA,executarEstrategiaPremium}=await import('./estrategia-premium.mjs');
    if(!TIPOS_ESTRATEGIA.includes(rotaEstrategia[1]))throw erro(404,'nao_encontrado');
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('estrategia-premium:'+u.id,12,60000);
    const dados=await corpo(req,300000);
    revalidarPremium(req,u.id);
    try{return json(res,200,{relatorio:executarEstrategiaPremium(rotaEstrategia[1],dados)});}
    catch(e){
      if(e?.name==='ErroEstrategia')return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // Operações Premium: autorização antes de receber dados de clientes, estoque ou pedidos.
  const rotaOperacoes=p.match(/^\/api\/premium\/operacoes\/([a-z0-9-]+)$/);
  if(rotaOperacoes&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('operacoes-profissionais:'+u.id,10,60000);
    const dados=await corpo(req,600000);
    try{
      const {executarOperacoes}=await import('./operacoes-profissionais.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:executarOperacoes(rotaOperacoes[1],dados)});
    }catch(e){
      if(e?.name==='ErroOperacoes')return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // Auditorias profissionais Premium: sessão, assinatura e rate limit antes do CSV.
  const rotaAnalitica=p.match(/^\/api\/premium\/analitica\/([a-z0-9-]+)$/);
  if(rotaAnalitica&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('analitica-profissional:'+u.id,10,60000);
    const dados=await corpo(req,600000);
    try{
      const {executarAnalitica}=await import('./analitica-profissional.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:executarAnalitica(rotaAnalitica[1],dados)});
    }catch(e){
      if(e?.name==='ErroAnalitica')return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // F232–F236: autorização e limitação de uso ANTES de ler CSV comercial.
  const rotaPlanejamento=p.match(/^\/api\/premium\/planejamento\/([a-z0-9-]+)$/);
  if(rotaPlanejamento&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('planejamento-profissional:'+u.id,10,60000);
    const dados=await corpo(req,300000);
    try{
      const {executarPlanejamento}=await import('./planejamento-premium-2.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:executarPlanejamento(rotaPlanejamento[1],dados)});
    }catch(e){
      if(e?.name==='ErroPlanejamento')
        return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  // F237–F246: autenticação e cota Premium ANTES de receber CSV comercial.
  const rotaOperacoesAvancadas=p.match(/^\/api\/premium\/operacoes-avancadas\/([a-z0-9-]+)$/);
  if(rotaOperacoesAvancadas&&m==='POST'){
    const u=exigir(req);
    if(u.plano!=='premium'&&u.papel!=='admin')throw erro(403,'plano_premium_necessario');
    conferirLimite('operacoes-avancadas:'+u.id,10,60000);
    const dados=await corpo(req,300000);
    try{
      const {executarOperacaoAvancada}=await import('./operacoes-avancadas-2.mjs');
      revalidarPremium(req,u.id);
      return json(res,200,{relatorio:executarOperacaoAvancada(rotaOperacoesAvancadas[1],dados)});
    }catch(e){
      if(e?.name==='ErroOperacaoAvancada')
        return json(res,400,{erro:'dados_invalidos',mensagem:e.message.slice(0,280)});
      throw e;
    }
  }
  if(p==='/api/planos'&&m==='GET'){return json(res,200,{planos:planosPublicos()});}
  if(p==='/api/trabalhos'&&m==='GET'){
    const u=exigir(req),situacao=url.searchParams.get('situacao');
    if(situacao!==null&&!['em_aberto','salvo'].includes(situacao))throw erro(400,'dados_invalidos');
    const pagina=Number(url.searchParams.get('pagina')||1);if(!Number.isSafeInteger(pagina)||pagina<1||pagina>100000)throw erro(400,'dados_invalidos');
    const filtro=situacao?' AND situacao=?':'',args=situacao?[u.id,situacao]:[u.id];
    const total=Number(banco.prepare(`SELECT count(*) total FROM trabalhos WHERE usuario_id=?${filtro}`).get(...args).total);
    const linhas=banco.prepare(`SELECT id,ferramenta_slug,titulo,situacao,criado_em,atualizado_em FROM trabalhos WHERE usuario_id=?${filtro} ORDER BY atualizado_em DESC,id DESC LIMIT 50 OFFSET ?`).all(...args,(pagina-1)*50);
    return json(res,200,{trabalhos:linhas.map(x=>trabalhoPublico(x,ferramentaPorSlug[x.ferramenta_slug],false)),total,pagina,paginas:Math.max(1,Math.ceil(total/50)),limite:limitesDoPlano(u.plano).trabalhos,dados_maximo_bytes:limiteDadosDoPlano(u.plano),armazenamento:{usado:bytesUsados(banco,u.id),maximo:limiteArmazenamento(u.plano)}});
  }
  if(p==='/api/trabalhos'&&m==='POST'){
    exigir(req);const b=await corpo(req,limiteDadosDoPlano('premium')+8192),u=exigir(req);
    if(b.dados&&typeof b.dados==='object'&&!Array.isArray(b.dados)&&!dadosDeTrabalhoValidos(b.dados,u.plano))throw erro(403,'limite_dados_do_plano');
    if(!validarNovoTrabalho(b,u.plano))throw erro(400,'dados_invalidos');
    if(bytesUsados(banco,u.id)+Buffer.byteLength(JSON.stringify(b.dados),'utf8')>limiteArmazenamento(u.plano))throw erro(403,'limite_armazenamento_do_plano');
    const ferramenta=ferramentaPorSlug[b.ferramenta_slug];if(!ferramenta||ferramenta.status!=='pronta')throw erro(404,'ferramenta_nao_localizada');
    const limite=limitesDoPlano(u.plano).trabalhos,total=banco.prepare('SELECT count(*) total FROM trabalhos WHERE usuario_id=?').get(u.id).total;
    if(total>=limite)throw erro(403,'limite_do_plano');
    const r=banco.prepare('INSERT INTO trabalhos(usuario_id,ferramenta_slug,titulo,dados,situacao) VALUES(?,?,?,?,?)')
      .run(u.id,b.ferramenta_slug,b.titulo.trim(),JSON.stringify(b.dados),b.situacao||'salvo');
    const linha=banco.prepare('SELECT * FROM trabalhos WHERE id=?').get(Number(r.lastInsertRowid));
    return json(res,201,{trabalho:trabalhoPublico(linha,ferramenta),limite});
  }
  const trabalhoRota=p.match(/^\/api\/trabalhos\/(\d+)$/);
  if(trabalhoRota&&m==='GET'){
    const u=exigir(req),linha=banco.prepare('SELECT * FROM trabalhos WHERE id=? AND usuario_id=?').get(+trabalhoRota[1],u.id);
    if(!linha)throw erro(404,'trabalho_inexistente');
    return json(res,200,{trabalho:trabalhoPublico(linha,ferramentaPorSlug[linha.ferramenta_slug])});
  }
  if(trabalhoRota&&m==='PATCH'){
    const u=exigir(req),id=+trabalhoRota[1];
    if(!banco.prepare('SELECT id FROM trabalhos WHERE id=? AND usuario_id=?').get(id,u.id))throw erro(404,'trabalho_inexistente');
    const b=await corpo(req,limiteDadosDoPlano('premium')+8192),atualSessao=exigir(req);
    const linha=banco.prepare('SELECT * FROM trabalhos WHERE id=? AND usuario_id=?').get(id,atualSessao.id);
    if(!linha)throw erro(404,'trabalho_inexistente');
    if(b.dados&&typeof b.dados==='object'&&!Array.isArray(b.dados)&&!dadosDeTrabalhoValidos(b.dados,atualSessao.plano))throw erro(403,'limite_dados_do_plano');
    if(!validarEdicaoTrabalho(b,atualSessao.plano))throw erro(400,'dados_invalidos');
    if(b.dados!==undefined){const novo=Buffer.byteLength(JSON.stringify(b.dados),'utf8'),antigo=Buffer.byteLength(linha.dados,'utf8');if(novo>antigo&&bytesUsados(banco,u.id)-antigo+novo>limiteArmazenamento(atualSessao.plano))throw erro(403,'limite_armazenamento_do_plano');}
    const titulo=b.titulo===undefined?linha.titulo:b.titulo.trim(),dados=b.dados===undefined?linha.dados:JSON.stringify(b.dados),situacao=b.situacao??linha.situacao;
    banco.prepare('UPDATE trabalhos SET titulo=?,dados=?,situacao=?,atualizado_em=CURRENT_TIMESTAMP WHERE id=? AND usuario_id=?').run(titulo,dados,situacao,id,u.id);
    const atualizado=banco.prepare('SELECT * FROM trabalhos WHERE id=?').get(id);
    return json(res,200,{trabalho:trabalhoPublico(atualizado,ferramentaPorSlug[atualizado.ferramenta_slug])});
  }
  if(trabalhoRota&&m==='DELETE'){
    const u=exigir(req),r=banco.prepare('DELETE FROM trabalhos WHERE id=? AND usuario_id=?').run(+trabalhoRota[1],u.id);
    if(!r.changes)throw erro(404,'trabalho_inexistente');
    return json(res,200,{ok:true});
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
  if(m==='PUT'&&p==='/api/perfil/foto'){
    const u=exigir(req),mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
    if(!['image/png','image/jpeg','image/webp'].includes(mime))throw erro(415,'imagem_invalida');
    const arquivo=await corpoBinario(req,1_200_000);
    if(!imagemValida(arquivo,mime))throw erro(400,'imagem_invalida');
    banco.prepare('UPDATE usuarios SET avatar_foto=?,avatar_foto_mime=? WHERE id=?').run(arquivo,mime,u.id);
    return json(res,200,{foto_url:`/api/perfil/foto/${encodeURIComponent(u.usuario)}?v=${agora()}`});
  }
  if(m==='DELETE'&&p==='/api/perfil/foto'){
    const u=exigir(req);banco.prepare('UPDATE usuarios SET avatar_foto=NULL,avatar_foto_mime=NULL WHERE id=?').run(u.id);
    return json(res,200,{ok:true});
  }
  if(m==='GET'&&p.startsWith('/api/perfil/foto/')){
    const u=exigir(req),handle=decodeURIComponent(p.slice('/api/perfil/foto/'.length)),alvo=banco.prepare('SELECT * FROM usuarios WHERE usuario=?').get(handle);
    indisponivelPerfil(u,alvo);if(!alvo.avatar_foto||!alvo.avatar_foto_mime)throw erro(404,'imagem_nao_localizada');
    res.writeHead(200,{'Content-Type':alvo.avatar_foto_mime,'Content-Length':alvo.avatar_foto.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});
    res.end(alvo.avatar_foto);return;
  }
  if(p==='/api/conquistas'&&m==='GET'){
    const u=exigir(req),nivel=nivelDoUsuario(u),registros=banco.prepare('SELECT tipo,patamar,visto_em FROM conquistas_vistas WHERE usuario_id=?').all(u.id),vistas=new Map(registros.map(v=>[v.tipo,v.patamar]));
    const conquistas=[];
    const notificacoes=[];
    if(nivel>1)notificacoes.push({tipo:'nivel',chave:`nivel:${nivel}`,nivel});
    if(nivel>1&&nivel>(vistas.get('nivel')||1))conquistas.push({tipo:'nivel',chave:`nivel:${nivel}`,nivel});
    for(const medalha of medalhasDoUsuario(banco,u))if(medalha.desbloqueada){
      const item={tipo:'medalha',chave:`${medalha.id}:${medalha.tier}`,medalha};notificacoes.push(item);
      if(medalha.tier>(vistas.get(medalha.id)??-1))conquistas.push(item);
    }
    for(const item of notificacoes)item.data=registros.find(v=>v.tipo===item.chave.split(':')[0])?.visto_em||u.criado_em;
    for(const r of banco.prepare('SELECT id,titulo_pt,titulo_en,xp,criado_em FROM recompensas_resgates WHERE usuario_id=? ORDER BY id DESC LIMIT 30').all(u.id))notificacoes.push({tipo:'missao',chave:`missao:${r.id}`,resgate_id:r.id,titulo_pt:r.titulo_pt,titulo_en:r.titulo_en,xp:r.xp,data:r.criado_em});
    return json(res,200,{conquistas,notificacoes});
  }
  if(p==='/api/conquistas/receber'&&m==='POST'){
    const u=exigir(req),b=await corpo(req),chave=String(b.chave||''),partes=/^([a-z]+):(\d{1,9})$/.exec(chave);
    if(!partes)throw erro(400,'dados_invalidos');
    const tipo=partes[1],patamar=Number(partes[2]);
    const medalha=medalhasDoUsuario(banco,u).find(m=>m.id===tipo);
    if(tipo==='nivel'?(patamar<2||patamar>nivelDoUsuario(u)):(!medalha?.desbloqueada||patamar>medalha.tier))throw erro(400,'dados_invalidos');
    const r=banco.prepare(`INSERT INTO conquistas_vistas(usuario_id,tipo,patamar) VALUES(?,?,?)
      ON CONFLICT(usuario_id,tipo) DO UPDATE SET patamar=excluded.patamar,visto_em=datetime('now') WHERE conquistas_vistas.patamar<excluded.patamar`).run(u.id,tipo,patamar);
    return json(res,200,{recebida:Boolean(r.changes)});
  }
  if(m==='PATCH'&&p==='/api/perfil/conquistas'){
    const u=exigir(req),b=await corpo(req),selecionadas=b.selecionadas;
    const ganhas=new Set(medalhasDoUsuario(banco,u).filter(m=>m.desbloqueada).map(m=>m.id));
    if(!Array.isArray(selecionadas)||selecionadas.length>5||new Set(selecionadas).size!==selecionadas.length
      ||selecionadas.some(id=>typeof id!=='string'||!ganhas.has(id)))throw erro(400,'conquistas_invalidas');
    banco.prepare('INSERT INTO perfil_conquistas_destaque(usuario_id,selecionadas) VALUES(?,?) ON CONFLICT(usuario_id) DO UPDATE SET selecionadas=excluded.selecionadas').run(u.id,JSON.stringify(selecionadas));
    return json(res,200,{selecionadas});
  }
  if(m==='PATCH'&&p==='/api/perfil'){
    const u=exigir(req),b=await corpo(req,1_750_000);
    const nome=b.nome===undefined?u.nome:String(b.nome).trim(),bio=b.bio===undefined?u.bio:String(b.bio).trim(),local=b.local===undefined?u.local:String(b.local).trim(),avatar=b.avatar===undefined?u.avatar:String(b.avatar);
    const banner=b.banner===undefined?(u.banner||'brisa'):String(b.banner),moldura=b.moldura===undefined?(u.moldura||'basica'):String(b.moldura);
    const nivel=nivelDoUsuario(u);
    if(nome.length<2||nome.length>80||bio.length>280||local.length>80||!AVATARES.includes(avatar)||!validarPersonalizacao({avatar,banner,moldura},nivel))throw erro(400,'dados_invalidos');
    if(b.visibilidade!==undefined&&(b.visibilidade===null||typeof b.visibilidade!=='object'||Array.isArray(b.visibilidade)||Object.entries(b.visibilidade).some(([k,v])=>!['bio','local'].includes(k)||typeof v!=='boolean')))throw erro(400,'dados_invalidos');
    const vis=b.visibilidade===undefined?u.visibilidade:JSON.stringify(b.visibilidade);if(vis.length>1000)throw erro(400,'dados_invalidos');
    const recomendadas=b.ferramentas_recomendadas===undefined?JSON.parse(u.recomendadas):b.ferramentas_recomendadas;
    if(!Array.isArray(recomendadas)||recomendadas.length>5||recomendadas.some(s=>typeof s!=='string'||!banco.prepare('SELECT 1 FROM uso_ferramentas WHERE usuario_id=? AND slug=?').get(u.id,s)))throw erro(400,'ferramentas_nao_usadas');
    const sociais=b.sociais===undefined?jsonSeguro(u.sociais,{}):validarSociais(b.sociais);
    if(sociais===null)throw erro(400,'sociais_invalidas');
    const tema=b.tema??u.tema,idioma=b.idioma??u.idioma;
    if(!['claro','escuro','sistema'].includes(tema)||!['pt-BR','en'].includes(idioma))throw erro(400,'dados_invalidos');
    let foto=u.avatar_foto,mime=u.avatar_foto_mime;
    if(b.foto===null){foto=null;mime=null;}
    else if(b.foto!==undefined){
      if(!b.foto||typeof b.foto!=='object'||typeof b.foto.dados!=='string'||b.foto.dados.length>1_600_000||!['image/png','image/jpeg','image/webp'].includes(b.foto.mime)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.foto.dados))throw erro(400,'imagem_invalida');
      foto=Buffer.from(b.foto.dados,'base64');mime=b.foto.mime;
      if(foto.length>1_200_000||!imagemValida(foto,mime))throw erro(400,'imagem_invalida');
    }
    banco.prepare('UPDATE usuarios SET nome=?,bio=?,local=?,avatar=?,banner=?,moldura=?,sociais=?,visibilidade=?,recomendadas=?,tema=?,idioma=?,avatar_foto=?,avatar_foto_mime=? WHERE id=?')
      .run(nome,bio,local,avatar,banner,moldura,JSON.stringify(sociais),vis,JSON.stringify(recomendadas),tema,idioma,foto,mime,u.id);
    const atualizado=banco.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id);
    return json(res,200,{usuario:usuarioPublico(atualizado),perfil:enriquecerPerfil({...usuarioPublico(atualizado),visibilidade:JSON.parse(atualizado.visibilidade)},atualizado)});
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
    const u=exigirChat(req);
    const linhas=banco.prepare("SELECT * FROM salas WHERE tipo<>'direta' OR criador_id=? OR participante_id=? ORDER BY CASE tipo WHEN 'global' THEN 0 WHEN 'categoria' THEN 1 WHEN 'ferramenta' THEN 2 ELSE 3 END,nome").all(u.id,u.id)
      .filter(s=>{try{salaPermitida(u,s.id);return true;}catch{return false;}});
    const salas=linhas.map(s=>{
      const leitura=banco.prepare('SELECT ultimo_id FROM chat_leituras WHERE usuario_id=? AND sala_id=?').get(u.id,s.id)?.ultimo_id||0;
      const janela=s.tipo==='direta'?" AND criado_em>=datetime('now','-48 hours') ":'';
      const ultima=banco.prepare(`SELECT id,texto,criado_em,autor_id FROM mensagens WHERE sala_id=? AND removida_em IS NULL ${janela} ORDER BY id DESC LIMIT 1`).get(s.id);
      const nao_lidas=Number(banco.prepare(`SELECT count(*) total FROM mensagens WHERE sala_id=? AND id>? AND autor_id<>? AND removida_em IS NULL ${janela}`).get(s.id,leitura,u.id).total);
      let outro=null;
      if(s.tipo==='direta'){
        const outroId=s.criador_id===u.id?s.participante_id:s.criador_id;
        const pessoa=banco.prepare('SELECT id,nome,usuario,avatar,avatar_foto IS NOT NULL tem_foto FROM usuarios WHERE id=?').get(outroId);
        if(pessoa)outro={...pessoa,foto_url:pessoa.tem_foto?`/api/perfil/foto/${encodeURIComponent(pessoa.usuario)}`:null};
      }
      return {...s,nao_lidas,ultima_mensagem:ultima?.texto||'',ultima_em:ultima?.criado_em||null,outro};
    });
    return json(res,200,{salas,total_nao_lidas:salas.reduce((sala,item)=>sala+item.nao_lidas,0)});
  }
  if(p==='/api/chat/eventos'&&m==='GET'){
    const u=exigirChat(req);if([...ouvintes].filter(x=>x.id===u.id).length>=3)throw erro(429,'muitas_conexoes');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': conectado\n\n');
    const item={res,id:u.id,token_hash:hash(cookies(req)[nomeSessao])};ouvintes.add(item);const keep=setInterval(()=>{
      const vivo=chatAtivo()&&banco.prepare(`SELECT 1 FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>? AND u.situacao='ativo' AND u.banido_em IS NULL AND u.chat_aceito_em IS NOT NULL`).get(item.token_hash,agora());
      if(!vivo){res.end();clearInterval(keep);ouvintes.delete(item);return;}try{res.write(': ping\n\n');}catch{res.end();clearInterval(keep);ouvintes.delete(item);}
    },Math.max(100,Number(process.env.PORTAL_SSE_PING_MS)||25000));req.on('close',()=>{clearInterval(keep);ouvintes.delete(item);});return;
  }
  const leituraRota=p.match(/^\/api\/chat\/salas\/([^/]+)\/leitura$/);
  if(leituraRota&&m==='PATCH'){
    const u=exigirChat(req),id=decodeURIComponent(leituraRota[1]);salaPermitida(u,id);const b=await corpo(req),ultimo=Number(b.ultimoId);
    if(!Number.isInteger(ultimo)||ultimo<0)throw erro(400,'dados_invalidos');
    if(ultimo&& !banco.prepare('SELECT 1 FROM mensagens WHERE id=? AND sala_id=?').get(ultimo,id))throw erro(400,'dados_invalidos');
    banco.prepare(`INSERT INTO chat_leituras(usuario_id,sala_id,ultimo_id) VALUES(?,?,?) ON CONFLICT(usuario_id,sala_id) DO UPDATE SET ultimo_id=max(ultimo_id,excluded.ultimo_id),atualizado_em=CURRENT_TIMESTAMP`).run(u.id,id,ultimo);
    return json(res,200,{ok:true});
  }
  const uploadMidia=p.match(/^\/api\/chat\/salas\/([^/]+)\/midias$/);
  if(uploadMidia&&m==='POST'){
    const u=exigirChat(req),id=decodeURIComponent(uploadMidia[1]),sala=salaPermitida(u,id);
    if(sala.tipo!=='direta')throw erro(403,'midia_apenas_privado');
    if(u.silenciado_ate&&Date.parse(u.silenciado_ate)>agora())throw erro(403,'chat_silenciado');
    conferirLimite('midia:'+u.id,10,60000);
    const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(),maximo=limiteMidia(mime);
    if(!maximo)throw erro(415,'midia_invalida');
    const nome=nomeMidiaSeguro(req.headers['x-arquivo-nome']),arquivo=await corpoBinario(req,maximo);
    const duracaoBruta=Number(req.headers['x-midia-duracao']),duracao=Number.isFinite(duracaoBruta)&&duracaoBruta>0&&duracaoBruta<=86400?duracaoBruta:null;
    if(!conteudoMidiaValido(arquivo,mime))throw erro(400,'midia_invalida');
    let respostaA=null;const cabecaResposta=req.headers['x-resposta-a'];
    if(cabecaResposta!==undefined&&cabecaResposta!==''){respostaA=Number(cabecaResposta);if(!Number.isInteger(respostaA)||!banco.prepare('SELECT 1 FROM mensagens WHERE id=? AND sala_id=? AND removida_em IS NULL').get(respostaA,id))throw erro(400,'resposta_invalida');}
    banco.exec('BEGIN IMMEDIATE');
    let mensagemId,midiaId;
    try{
      const rm=banco.prepare('INSERT INTO mensagens(sala_id,autor_id,texto,resposta_a) VALUES(?,?,?,?)').run(id,u.id,'',respostaA);mensagemId=Number(rm.lastInsertRowid);
      const rx=banco.prepare('INSERT INTO chat_midias(mensagem_id,autor_id,nome,mime,tamanho,dados,duracao) VALUES(?,?,?,?,?,?,?)').run(mensagemId,u.id,nome,mime,arquivo.length,arquivo,duracao);midiaId=Number(rx.lastInsertRowid);
      banco.exec('COMMIT');
    }catch(e){try{banco.exec('ROLLBACK');}catch{}throw e;}
    const msg=banco.prepare('SELECT m.*,a.nome,a.usuario,a.avatar,a.avatar_foto IS NOT NULL autor_tem_foto,a.papel,a.pontos,a.criado_em autor_criado_em,r.id resposta_id,r.texto resposta_texto,ra.usuario resposta_usuario FROM mensagens m JOIN usuarios a ON a.id=m.autor_id LEFT JOIN mensagens r ON r.id=m.resposta_a LEFT JOIN usuarios ra ON ra.id=r.autor_id WHERE m.id=?').get(mensagemId);
    creditarAtividade(u,'mensagem');
    const publica=mensagemPublica(msg,u.id);avisar({sala:id,salaId:id,mensagem:publica});return json(res,201,{mensagem:publica,midiaId});
  }
  const progressoMidia=p.match(/^\/api\/chat\/midias\/(\d+)\/progresso$/);
  if(progressoMidia&&m==='PATCH'){
    const u=exigirChat(req),id=Number(progressoMidia[1]);midiaComAcesso(u,id);const b=await corpo(req);
    const posicao=Math.max(0,Math.min(86400,Number(b.posicao)||0)),duracao=b.duracao==null?null:Math.max(0,Math.min(86400,Number(b.duracao)||0)),concluida=b.concluida===true?1:0;
    banco.prepare('INSERT INTO chat_reproducao(usuario_id,midia_id,posicao,duracao,concluida) VALUES(?,?,?,?,?) ON CONFLICT(usuario_id,midia_id) DO UPDATE SET posicao=excluded.posicao,duracao=excluded.duracao,concluida=excluded.concluida,atualizado_em=CURRENT_TIMESTAMP').run(u.id,id,posicao,duracao,concluida);
    return json(res,200,{ok:true,posicao,duracao,concluida:!!concluida});
  }
  const midiaRota=p.match(/^\/api\/chat\/midias\/(\d+)$/);
  if(midiaRota&&(m==='GET'||m==='HEAD')){
    const u=exigirChat(req),item=midiaComAcesso(u,Number(midiaRota[1])),dados=Buffer.from(item.dados);
    banco.prepare('INSERT INTO chat_reproducao(usuario_id,midia_id,posicao) VALUES(?,?,0) ON CONFLICT(usuario_id,midia_id) DO UPDATE SET atualizado_em=CURRENT_TIMESTAMP').run(u.id,item.id);
    const baixar=url.searchParams.get('download')==='1'||tipoMidia(item.mime)==='arquivo';
    const disposicao=(baixar?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(item.nome);
    const baseHeaders={'Content-Type':item.mime,'Accept-Ranges':'bytes','Content-Disposition':disposicao,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
    const faixa=String(req.headers.range||'').match(/^bytes=(\d+)-(\d*)$/);
    if(faixa){
      const inicio=Math.min(dados.length-1,Number(faixa[1])),fim=faixa[2]?Math.min(dados.length-1,Number(faixa[2])):dados.length-1;
      if(!Number.isFinite(inicio)||!Number.isFinite(fim)||inicio>fim){res.writeHead(416,{...baseHeaders,'Content-Range':'bytes */'+dados.length});res.end();return;}
      const parte=dados.subarray(inicio,fim+1);res.writeHead(206,{...baseHeaders,'Content-Length':parte.length,'Content-Range':'bytes '+inicio+'-'+fim+'/'+dados.length});if(m==='HEAD')return res.end();res.end(parte);return;
    }
    res.writeHead(200,{...baseHeaders,'Content-Length':dados.length});if(m==='HEAD')return res.end();res.end(dados);return;
  }
  const match=p.match(/^\/api\/chat\/salas\/([^/]+)\/mensagens$/);
  if(match&&m==='GET'){
    const u=exigirChat(req),id=decodeURIComponent(match[1]),sala=salaPermitida(u,id),antes=Math.max(0,Number(url.searchParams.get('antes'))||Number.MAX_SAFE_INTEGER);
    const janela=sala.tipo==='direta'?" AND m.criado_em>=datetime('now','-48 hours') ":'';
    const mensagens=banco.prepare(`SELECT m.*,a.nome,a.usuario,a.avatar,a.avatar_foto IS NOT NULL autor_tem_foto,a.papel,a.pontos,a.criado_em autor_criado_em,r.id resposta_id,r.texto resposta_texto,ra.usuario resposta_usuario FROM mensagens m JOIN usuarios a ON a.id=m.autor_id LEFT JOIN mensagens r ON r.id=m.resposta_a LEFT JOIN usuarios ra ON ra.id=r.autor_id WHERE m.sala_id=? AND m.id<? AND m.removida_em IS NULL ${janela} AND NOT EXISTS(SELECT 1 FROM bloqueios b WHERE (b.origem=? AND b.destino=m.autor_id) OR (b.destino=? AND b.origem=m.autor_id)) ORDER BY m.id DESC LIMIT 50`).all(id,antes,u.id,u.id).reverse().map(msg=>mensagemPublica(msg,u.id));
    return json(res,200,{mensagens,expira_em:sala.tipo==='direta'?48:null});
  }
  if(match&&m==='POST'){
    const u=exigirChat(req),id=decodeURIComponent(match[1]),sala=salaPermitida(u,id);if(u.silenciado_ate&&Date.parse(u.silenciado_ate)>agora())throw erro(403,'chat_silenciado');
    conferirLimite(`chat2:${u.id}`,1,2000);conferirLimite(`chat60:${u.id}`,20,60000);const b=await corpo(req),texto=String(b.texto||'').trim();
    if(!texto||texto.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto))throw erro(400,'mensagem_invalida');
    if(Date.parse(String(u.criado_em).replace(' ','T')+'Z')>agora()-7*86400000&&/(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|br|io|dev|app)\b)/i.test(texto))throw erro(403,'links_conta_nova');
    let respostaA=null;
    if(b.respostaA!==undefined&&b.respostaA!==null){respostaA=Number(b.respostaA);if(!Number.isInteger(respostaA)||!banco.prepare('SELECT 1 FROM mensagens WHERE id=? AND sala_id=? AND removida_em IS NULL').get(respostaA,id))throw erro(400,'resposta_invalida');}
    const r=banco.prepare('INSERT INTO mensagens(sala_id,autor_id,texto,resposta_a) VALUES(?,?,?,?)').run(id,u.id,texto,respostaA);
    const msg=banco.prepare(`SELECT m.*,a.nome,a.usuario,a.avatar,a.avatar_foto IS NOT NULL autor_tem_foto,a.papel,a.pontos,a.criado_em autor_criado_em,r.id resposta_id,r.texto resposta_texto,ra.usuario resposta_usuario FROM mensagens m JOIN usuarios a ON a.id=m.autor_id LEFT JOIN mensagens r ON r.id=m.resposta_a LEFT JOIN usuarios ra ON ra.id=r.autor_id WHERE m.id=?`).get(Number(r.lastInsertRowid));
    creditarAtividade(u,'mensagem');
    const publica=mensagemPublica(msg,u.id);avisar({sala:id,salaId:id,mensagem:publica});return json(res,201,{mensagem:publica,expira_em:sala.tipo==='direta'?48:null});
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
  if(p==='/api/admin/chat/denuncias'&&m==='GET'){admin(req);return json(res,200,{denuncias:banco.prepare("SELECT d.*,m.texto,u.usuario,u.nome,x.id midia_id,x.nome midia_nome,x.mime midia_mime,x.tamanho midia_tamanho FROM denuncias d LEFT JOIN mensagens m ON m.id=d.mensagem_id LEFT JOIN usuarios u ON u.id=d.alvo_usuario_id LEFT JOIN chat_midias x ON x.id=(SELECT id FROM chat_midias WHERE mensagem_id=d.mensagem_id ORDER BY id LIMIT 1) WHERE d.situacao='aberta' ORDER BY d.id DESC LIMIT 100").all()});}
  const midiaAdmin=p.match(/^\/api\/admin\/chat\/midias\/(\d+)$/);
  if(midiaAdmin&&m==='GET'){
    admin(req);const item=banco.prepare("SELECT x.* FROM chat_midias x JOIN denuncias d ON d.mensagem_id=x.mensagem_id WHERE x.id=? AND d.situacao='aberta' ORDER BY d.id DESC LIMIT 1").get(Number(midiaAdmin[1]));
    if(!item)throw erro(404,'midia_nao_localizada');const dados=Buffer.from(item.dados),inline=tipoMidia(item.mime)!=='arquivo';
    res.writeHead(200,{'Content-Type':item.mime,'Content-Length':dados.length,'Content-Disposition':(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(item.nome),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(dados);return;
  }
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
    const config=configuracaoPublicidade(banco),editor=config.editor;
    const demonstracao=config.demonstracao&&process.env.NODE_ENV!=='production';
    const ativo=config.ativo&&(config.demonstracao?demonstracao:/^ca-pub-\d{16}$/.test(editor));
    const referer=req.headers.referer||'';let caminho='';try{const ref=new URL(referer);if(origensPermitidas.has(ref.origin))caminho=ref.pathname;}catch{}
    const normal=caminho.replace(/^\/en(?=\/)/,'');const ferramenta=normal.match(/^\/f\/([a-z0-9-]+)\/?(?:index\.html)?$/)?.[1];
    const ficha=ferramenta?ferramentaPorSlug[ferramenta]:null;
    const paginaPermitida=['/','/index.html','/ferramentas.html'].includes(normal)||!!(ficha&&ficha.status==='pronta'&&!['estudos'].includes(ficha.cat));
    const pagou=['plus','premium'].includes(sessao(req)?.plano);const permitido=ativo&&paginaPermitida&&!pagou;
    const blocos={};for(const chave of ['rodape','resultado','lista']){const valor=config.blocos[chave];if(demonstracao)blocos[chave]='demonstracao';else if(/^\d{6,20}$/.test(valor))blocos[chave]=valor;}
    return json(res,200,{ativo,editor:permitido&&!demonstracao?editor:null,blocos:permitido?blocos:{},teste:config.teste,demonstracao:permitido&&demonstracao,permitido});
  }
  throw erro(404,'nao_encontrado');
}

export async function iniciar({porta=Number(process.env.PORTAL_API_PORTA||4870),host='127.0.0.1'}={}){
  void editor.recuperar().catch(()=>{try{protecao.registrarErro('OUTRO');}catch{}});
  const servidor=createServer({maxHeaderSize:16384,headersTimeout:10000,requestTimeout:30000},(req,res)=>{Promise.resolve(rota(req,res)).catch(e=>{
    if(res.headersSent){res.end();return;}const status=e.status||500,headers=status===429?{'Retry-After':String(e.retryAfter||2)}:{};
    if(status>=500)try{protecao.registrarErro(req.method);}catch{}
    if([429,500].includes(status)&&req.headers.accept?.includes('text/html')){
      const en=req.headers['accept-language']?.startsWith('en');
      try{let html=readFileSync(new URL(`../${en?'en/':''}${status===429?'429.html':'erro.html'}`,import.meta.url),'utf8');
        const raizHtml=en?'/en/':'/';html=html.replace(/(href|src)="([^"]*)"/g,(t,a,v)=>{if(!v||v.startsWith('#')||/^(?:[a-z]+:|\/)/i.test(v))return t;const u=new URL(v,'http://portal'+raizHtml);return `${a}="${u.pathname}${u.search}${u.hash}"`;}).replace(/data-raiz="[^"]*"/,'data-raiz="/"').replace(/data-raiz-idioma="[^"]*"/,`data-raiz-idioma="${raizHtml}"`);
        if(status===429)html=html.replace('</h1>',`</h1><p>${en?'Try again after':'Tente novamente após'} ${Number(e.retryAfter||2)} ${en?'seconds.':'segundos.'}</p>`);
        res.writeHead(status,{...CABEÇALHOS_DE_SEGURANÇA,...headers,'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8'});res.end(html);return;
      }catch{}
    }
    json(res,status,{erro:e.codigo||'erro_interno'},headers);
  });});
  const limpar=setInterval(()=>{
    try{
      banco.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-90 days') AND sala_id NOT IN (SELECT id FROM salas WHERE tipo='direta')").run();
      banco.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-48 hours') AND sala_id IN (SELECT id FROM salas WHERE tipo='direta')").run();
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
