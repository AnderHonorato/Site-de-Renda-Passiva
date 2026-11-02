import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { ferramentasProntas,ferramentas } from '../../dados/catálogo.js';
const portaLivre=()=>new Promise(ok=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});
test('Premium, missões, eventos, ranking, privacidade e paginação pela API real isolada',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-recompensas-'));process.env.PORTAL_BANCO=join(pasta,'banco.sqlite');
  const {iniciar,fecharBanco}=await import('../../servidor/iniciar.mjs');const servidor=await iniciar({porta:await portaLivre()});const base=`http://127.0.0.1:${servidor.address().port}`;const db=new DatabaseSync(process.env.PORTAL_BANCO);
  let cookie='',csrf='';
  async function pedir(p,m='GET',dados,{anonimo=false,csrfInvalido=false}={}){
    const r=await fetch(base+p,{method:m,headers:{...(!anonimo?{Cookie:cookie}:{}),...(m!=='GET'?{Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrfInvalido?'invalido':csrf,'Content-Type':'application/json'}:{})},body:dados!==undefined?JSON.stringify(dados):undefined});
    if(!anonimo){const mapa=new Map(cookie.split('; ').filter(Boolean).map(v=>v.split('=')));for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');mapa.set(k,v);}cookie=[...mapa].map(([k,v])=>`${k}=${v}`).join('; ');csrf=mapa.get('csrf')||csrf;}
    return {status:r.status,data:await r.json()};
  }
  try{
    assert.equal((await pedir('/api/recompensas')).status,401);assert.equal((await pedir('/api/recompensas/ranking')).status,401);
    await pedir('/api/autenticacao/sessao');const c=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Teste isolado',usuario:'teste_recompensas',email:'teste@example.test',senha:'Senha-de-teste-123!',idade:25,aceitaTermos:true});assert.equal(c.status,201);const id=c.data.usuario.id;
    assert.equal((await pedir('/api/recompensas')).data.ranking,false);assert.deepEqual((await pedir('/api/recompensas/ranking')).data.participantes,[]);
    assert.equal((await pedir('/api/recompensas/preferencias','PATCH',{ranking:true},{csrfInvalido:true})).status,403);
    assert.equal((await pedir('/api/admin/recompensas/eventos')).status,403);
    let r=await pedir('/api/recompensas/resgatar','POST',{tipo:'diaria',xp:999});assert.equal(r.status,409);
    for(const f of ferramentasProntas.slice(0,2))assert.equal((await pedir(`/api/ferramentas/${f.slug}/uso`,'POST',{})).status,200);
    const antes=db.prepare('SELECT pontos FROM usuarios WHERE id=?').get(id).pontos;
    const duas=await Promise.all([pedir('/api/recompensas/resgatar','POST',{tipo:'diaria',xp:999}),pedir('/api/recompensas/resgatar','POST',{tipo:'diaria'})]);assert.equal(duas.filter(r=>r.data.resgatada).length,1);assert.equal(db.prepare('SELECT pontos FROM usuarios WHERE id=?').get(id).pontos,antes+5);
    const planejada=ferramentas.find(f=>f.status!=='pronta');assert.equal((await pedir(`/api/ferramentas/${planejada.slug}/uso`,'POST',{})).status,404);
    assert.equal((await pedir('/api/recompensas/preferencias','PATCH',{ranking:true})).status,200);r=await pedir('/api/recompensas/ranking');assert.equal(r.data.participantes.length,1);assert.equal(r.data.participantes[0].usuario,'teste_recompensas');assert.equal('email' in r.data.participantes[0],false);
    assert.equal((await pedir('/api/recompensas/preferencias','PATCH',{ranking:false})).status,200);assert.equal((await pedir('/api/recompensas/ranking')).data.participantes.length,0);
    db.prepare("UPDATE usuarios SET papel='admin' WHERE id=?").run(id);const hoje=new Date().toISOString().slice(0,10);
    const evento={titulo_pt:'Explorar o portal',titulo_en:'Explore the portal',texto_pt:'Duas ferramentas.',texto_en:'Two tools.',inicio:hoje,fim:hoje,meta:2,xp:10,ativo:true};
    r=await pedir('/api/admin/recompensas/eventos','POST',evento);assert.equal(r.status,201);const e=r.data.evento;
    assert.equal((await pedir(`/api/admin/recompensas/eventos/${e.id}`,'PUT',{...evento,versao:0})).status,409);
    assert.equal((await pedir('/api/admin/recompensas/eventos','POST',{...evento,xp:999})).status,400);
    assert.equal((await pedir('/api/recompensas/resgatar','POST',{tipo:'evento',evento_id:e.id})).data.resgatada,true);
    assert.equal((await pedir('/api/recompensas/resgatar','POST',{tipo:'evento',evento_id:e.id})).data.resgatada,false);
    assert.equal((await pedir('/api/conquistas')).data.notificacoes.filter(n=>n.tipo==='missao').length,2);
    assert.equal((await pedir('/api/conta/exportar')).data.recompensas.resgates.length,2);
    const slug=ferramentasProntas[0].slug,dados={conteudo:'a'.repeat(70000)},trabalho={ferramenta_slug:slug,titulo:'Lista grande',dados};
    assert.equal((await pedir('/api/trabalhos','POST',trabalho)).data.erro,'limite_dados_do_plano');
    db.prepare("UPDATE usuarios SET plano='plus' WHERE id=?").run(id);assert.equal((await pedir('/api/trabalhos','POST',trabalho)).data.erro,'limite_dados_do_plano');
    db.prepare("UPDATE usuarios SET plano='premium' WHERE id=?").run(id);r=await pedir('/api/trabalhos','POST',trabalho);assert.equal(r.status,201);const trabalhoId=r.data.trabalho.id;
    assert.equal((await pedir('/api/planos')).data.planos.find(p=>p.id==='premium').limites.trabalhos,2000);
    db.prepare("UPDATE usuarios SET plano='gratuito' WHERE id=?").run(id);assert.equal((await pedir(`/api/trabalhos/${trabalhoId}`)).data.trabalho.dados.conteudo.length,70000);
    assert.equal((await pedir(`/api/trabalhos/${trabalhoId}`,'PATCH',{titulo:'Preservado'})).status,200);assert.equal((await pedir(`/api/trabalhos/${trabalhoId}`,'PATCH',{dados})).status,403);
    db.prepare("UPDATE usuarios SET plano='premium' WHERE id=?").run(id);const add=db.prepare('INSERT INTO trabalhos(usuario_id,ferramenta_slug,titulo,dados) VALUES(?,?,?,?)');db.exec('BEGIN');for(let i=1;i<=50;i++)add.run(id,slug,`Arquivo ${i}`,'{}');db.exec('COMMIT');
    r=await pedir('/api/trabalhos');assert.equal(r.data.total,51);assert.equal(r.data.paginas,2);assert.equal(r.data.trabalhos.length,50);assert.equal('dados' in r.data.trabalhos[0],false);
    assert.equal((await pedir('/api/trabalhos?pagina=2')).data.trabalhos.length,1);assert.equal((await pedir('/api/trabalhos?pagina=-1')).status,400);
    db.exec('BEGIN');for(let i=51;i<2000;i++)add.run(id,slug,`Arquivo ${i}`,'{}');db.exec('COMMIT');assert.equal((await pedir('/api/trabalhos','POST',{...trabalho,dados:{}})).data.erro,'limite_do_plano');
    const grandes=db.prepare('SELECT id FROM trabalhos WHERE usuario_id=? LIMIT 17').all(id);
    const dadoCheio=JSON.stringify({x:'á'.repeat((512*1024-8)/2)});
    for(const item of grandes)db.prepare('UPDATE trabalhos SET dados=? WHERE id=?').run(dadoCheio,item.id);
    db.prepare("UPDATE usuarios SET plano='plus' WHERE id=?").run(id);
    r=await pedir('/api/trabalhos');assert.ok(r.data.armazenamento.usado>r.data.armazenamento.maximo);
    assert.equal((await pedir('/api/trabalhos','POST',{...trabalho,dados:{}})).data.erro,'limite_armazenamento_do_plano');
    assert.equal((await pedir(`/api/trabalhos/${grandes[0].id}`,'PATCH',{titulo:'Ainda acessível'})).status,200);
    assert.equal((await pedir(`/api/trabalhos/${grandes[0].id}`,'PATCH',{dados:{x:'á'.repeat(30000)}})).status,200);
    const pequeno=db.prepare("SELECT id FROM trabalhos WHERE usuario_id=? AND dados='{}' LIMIT 1").get(id);
    assert.equal((await pedir(`/api/trabalhos/${pequeno.id}`,'PATCH',{dados:{x:'mais espaço'}})).data.erro,'limite_armazenamento_do_plano');
    await pedir('/api/conta','DELETE',{senha:'Senha-de-teste-123!'});for(const tabela of ['recompensas_preferencias','recompensas_resgates','recompensas_usos'])assert.equal(db.prepare(`SELECT count(*) n FROM ${tabela} WHERE usuario_id=?`).get(id).n,0);
  }finally{await new Promise(ok=>servidor.close(ok));fecharBanco();db.close();assert.ok(pasta.startsWith(tmpdir()));rmSync(pasta,{recursive:true,force:true});}
});
