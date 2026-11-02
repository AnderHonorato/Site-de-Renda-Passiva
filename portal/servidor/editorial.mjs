import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve,join } from 'node:path';
import { catálogoDoIdioma } from '../dados/catálogo.js';
import { categoriasDoIdioma } from '../dados/categorias.js';
import traducao from '../dados/traduções/en/catálogo.js';
import categoriasEn from '../dados/traduções/en/categorias.js';
import { erro } from './seguranca.mjs';

export const PONTOS_PADRAO={por_uso:2,por_mensagem:1,limite_diario:100,limite_chat:20,diaria:5,semanal:15};
export const CHAVES_TEXTO=['inicio.titulo','inicio.descricao','ajuda.introducao','planos.introducao'];
const basePt=catálogoDoIdioma(null,null,false).ferramentas,baseEn=catálogoDoIdioma(traducao,categoriasEn,false).ferramentas;
export const catalogoOriginal=Object.freeze(Object.fromEntries(basePt.map(f=>[f.slug,f])));
const categoriasPt=categoriasDoIdioma(null,false).categorias,catsEn=categoriasDoIdioma(categoriasEn,false).categorias;
const slugs=new Set(basePt.map(f=>f.slug)),cats=new Set(categoriasPt.map(c=>c.id));
const planosBase=JSON.parse(readFileSync(new URL('./servidor-planos.json',import.meta.url),'utf8')).planos;
const objeto=x=>x&&typeof x==='object'&&!Array.isArray(x);
function texto(s,max,min=1){if(typeof s!=='string'||s.trim().length<min||s.trim().length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(s))throw erro(400,'dados_invalidos');return s.trim();}
export function validarEditorial(valor){
  if(!objeto(valor)||Object.keys(valor).some(k=>!['ferramentas','categorias','textos','pontos','limites'].includes(k)))throw erro(400,'dados_invalidos');
  const r={ferramentas:{},categorias:{},textos:{},pontos:{...PONTOS_PADRAO},limites:{}};
  for(const [tipo,permitidos,maxNome,maxResumo]of [['ferramentas',slugs,80,130],['categorias',cats,60,160]]){
    if(!objeto(valor[tipo]||{}))throw erro(400,'dados_invalidos');
    for(const [id,langs]of Object.entries(valor[tipo]||{})){
      if(!permitidos.has(id)||!objeto(langs)||Object.keys(langs).some(l=>!['pt-BR','en'].includes(l)))throw erro(400,'dados_invalidos');
      r[tipo][id]={};for(const [l,m]of Object.entries(langs)){if(!objeto(m)||Object.keys(m).some(k=>!['nome','resumo'].includes(k)))throw erro(400,'dados_invalidos');r[tipo][id][l]={nome:texto(m.nome,maxNome),resumo:texto(m.resumo,maxResumo)};}
    }
  }
  for(const l of ['pt-BR','en']){
    const nomes=basePt.map((f,i)=>r.ferramentas[f.slug]?.[l]?.nome||(l==='en'?baseEn[i].nome:f.nome));
    if(new Set(nomes.map(n=>n.toLocaleLowerCase())).size!==nomes.length)throw erro(400,'nome_repetido');
  }
  if(!objeto(valor.textos||{}))throw erro(400,'dados_invalidos');
  for(const [k,v]of Object.entries(valor.textos||{})){
    if(!CHAVES_TEXTO.includes(k)||!objeto(v)||Object.keys(v).some(l=>!['pt-BR','en'].includes(l)))throw erro(400,'dados_invalidos');
    r.textos[k]={};for(const [l,s]of Object.entries(v))r.textos[k][l]=texto(s,k==='inicio.titulo'?120:1000);
  }
  if(valor.pontos!==undefined){if(!objeto(valor.pontos)||Object.keys(valor.pontos).some(k=>!Object.hasOwn(PONTOS_PADRAO,k)))throw erro(400,'dados_invalidos');
    for(const [k,v]of Object.entries(valor.pontos)){const max={por_uso:10,por_mensagem:5,limite_diario:500,limite_chat:100,diaria:50,semanal:100}[k];if(!Number.isInteger(v)||v<0||v>max)throw erro(400,'dados_invalidos');r.pontos[k]=v;}
    if(r.pontos.limite_chat>r.pontos.limite_diario)throw erro(400,'dados_invalidos');
  }
  if(!objeto(valor.limites||{}))throw erro(400,'dados_invalidos');
  for(const [id,p]of Object.entries(valor.limites||{})){
    if(!['gratuito','plus','premium'].includes(id)||!objeto(p)||!objeto(p.limites)||Object.keys(p).some(k=>!['limites','dados_maximo_bytes','armazenamento_maximo_bytes'].includes(k))||Object.keys(p.limites).sort().join(',')!=='favoritos,trabalhos')throw erro(400,'dados_invalidos');
    for(const [v,max]of [[p.limites.favoritos,2000],[p.limites.trabalhos,5000],[p.dados_maximo_bytes,524288],[p.armazenamento_maximo_bytes,67108864]])if(!Number.isSafeInteger(v)||v<1||v>max)throw erro(400,'dados_invalidos');
    if(p.armazenamento_maximo_bytes<p.dados_maximo_bytes)throw erro(400,'dados_invalidos');r.limites[id]={limites:{...p.limites},dados_maximo_bytes:p.dados_maximo_bytes,armazenamento_maximo_bytes:p.armazenamento_maximo_bytes};
  }
  const planos=planosBase.map(p=>({...p,...r.limites[p.id],limites:{...p.limites,...r.limites[p.id]?.limites}}));
  for(let i=1;i<planos.length;i++)for(const [a,b]of [[planos[i-1].limites.favoritos,planos[i].limites.favoritos],[planos[i-1].limites.trabalhos,planos[i].limites.trabalhos],[planos[i-1].dados_maximo_bytes,planos[i].dados_maximo_bytes],[planos[i-1].armazenamento_maximo_bytes,planos[i].armazenamento_maximo_bytes]])if(a>b)throw erro(400,'cotas_fora_de_ordem');
  return r;
}
export function iniciarEditorial(db){db.exec(`CREATE TABLE IF NOT EXISTS portal_editorial(id INTEGER PRIMARY KEY CHECK(id=1),rascunho TEXT NOT NULL,publicado TEXT NOT NULL,versao INTEGER NOT NULL DEFAULT 1,publicada_versao INTEGER NOT NULL DEFAULT 0,publicacao_pendente INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS editorial_historico(id INTEGER PRIMARY KEY,versao INTEGER NOT NULL,acao TEXT NOT NULL,dados TEXT NOT NULL,criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  const dados=JSON.stringify(validarEditorial({}));db.prepare('INSERT OR IGNORE INTO portal_editorial(id,rascunho,publicado) VALUES(1,?,?)').run(dados,dados);
}
export function criarEditorial(db,{pasta=process.env.PORTAL_EDITORIAL_PASTA||resolve(import.meta.dirname,'..'),aoPublicar=()=>{}}={}){
  iniciarEditorial(db);let publicando=false;
  const ler=()=>db.prepare('SELECT * FROM portal_editorial WHERE id=1').get();
  const publicado=()=>JSON.parse(ler().publicado);
  function salvar(dados,versao,acao='salvar_rascunho'){
    if(publicando||ler().publicacao_pendente)throw erro(409,'publicacao_em_andamento');const atual=ler();if(versao!==atual.versao)throw erro(409,'editorial_alterado');
    const json=JSON.stringify(validarEditorial(dados));db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO editorial_historico(versao,acao,dados) VALUES(?,?,?)').run(atual.versao,'anterior',atual.rascunho);
      db.prepare('UPDATE portal_editorial SET rascunho=?,versao=versao+1 WHERE id=1').run(json);
      db.prepare('INSERT INTO editorial_historico(versao,acao,dados) VALUES(?,?,?)').run(atual.versao+1,acao,json);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}return painel();
  }
  function painel(){const r=ler();return {rascunho:JSON.parse(r.rascunho),publicado:JSON.parse(r.publicado),versao:r.versao,publicada_versao:r.publicada_versao,publicando:publicando||!!r.publicacao_pendente,base:{ferramentas:basePt.map((f,i)=>({slug:f.slug,status:f.status,cat:f.cat,'pt-BR':{nome:f.nome,resumo:f.resumo},en:{nome:baseEn[i].nome,resumo:baseEn[i].resumo}})),categorias:categoriasPt.map((c,i)=>({id:c.id,'pt-BR':{nome:c.nome,resumo:c.resumo},en:{nome:catsEn[i].nome,resumo:catsEn[i].resumo}})),textos:CHAVES_TEXTO}};}
  function restaurar(id,versao){if(!Number.isSafeInteger(id))throw erro(400,'dados_invalidos');const r=db.prepare('SELECT dados FROM editorial_historico WHERE id=?').get(id);if(!r)throw erro(404,'revisao_inexistente');return salvar(JSON.parse(r.dados),versao,'restaurar_rascunho');}
  const executar=()=>new Promise((ok,fail)=>{
    const p=spawn(process.execPath,[join(pasta,'ferramentas/gerar.mjs')],{cwd:pasta,windowsHide:true,stdio:'ignore'});
    const timer=setTimeout(()=>{p.kill();fail(erro(503,'publicacao_falhou'));},30000);
    p.once('error',()=>{clearTimeout(timer);fail(erro(503,'publicacao_falhou'));});p.once('close',code=>{clearTimeout(timer);code===0?ok():fail(erro(503,'publicacao_falhou'));});
  });
  async function publicar(versao){
    if(publicando||ler().publicacao_pendente)throw erro(409,'publicacao_em_andamento');const atual=ler();if(versao!==atual.versao)throw erro(409,'editorial_alterado');
    if(atual.publicada_versao===versao)return painel();publicando=true;
    const destino=join(pasta,'dados/editorial-publicado.js'),temporario=destino+'.tmp';
    let anterior,gravado=false;
    const gravar=async s=>{await writeFile(temporario,s);await rename(temporario,destino);};
    try{
      await mkdir(join(pasta,'dados'),{recursive:true});try{anterior=await readFile(destino,'utf8');}catch{anterior='export const editorial = {};\n';}
      db.prepare('UPDATE portal_editorial SET publicacao_pendente=1 WHERE id=1').run();
      const config=validarEditorial(JSON.parse(atual.rascunho));await gravar(`// Metadados públicos publicados pelo administrador.\nexport const editorial = ${JSON.stringify(config).replaceAll('<','\\u003c')};\n`);gravado=true;await executar();
      db.exec('BEGIN IMMEDIATE');try{
        db.prepare('UPDATE portal_editorial SET publicado=?,publicada_versao=?,publicacao_pendente=0 WHERE id=1').run(JSON.stringify(config),versao);
        db.prepare('INSERT INTO editorial_historico(versao,acao,dados) VALUES(?,?,?)').run(versao,'publicar',JSON.stringify(config));db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}aoPublicar(config);return painel();
    }catch(e){if(gravado){await gravar(anterior);try{await executar();db.prepare('UPDATE portal_editorial SET publicacao_pendente=0 WHERE id=1').run();}catch{}}else db.prepare('UPDATE portal_editorial SET publicacao_pendente=0 WHERE id=1').run();throw e.status?e:erro(503,'publicacao_falhou');}finally{publicando=false;}
  }
  async function recuperar(){if(publicando)throw erro(409,'publicacao_em_andamento');if(!ler().publicacao_pendente)return;publicando=true;
    try{const destino=join(pasta,'dados/editorial-publicado.js');await mkdir(join(pasta,'dados'),{recursive:true});await writeFile(destino+'.tmp',`export const editorial = ${ler().publicado};\n`);await rename(destino+'.tmp',destino);await executar();db.prepare('UPDATE portal_editorial SET publicacao_pendente=0 WHERE id=1').run();}finally{publicando=false;}
  }
  return {painel,salvar,publicar,publicado,restaurar,recuperar,historico:()=>db.prepare('SELECT id,versao,acao,criado_em FROM editorial_historico ORDER BY id DESC LIMIT 100').all()};
}
