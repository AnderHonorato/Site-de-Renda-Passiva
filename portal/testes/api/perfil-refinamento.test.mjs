import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('perfil: gravação atômica com preferências e foto; conquistas recebidas uma vez por patamar',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-refinamento-'));process.env.PORTAL_BANCO=join(pasta,'db.sqlite');
  const {iniciar,fecharBanco}=await import('../../servidor/iniciar.mjs');const servidor=await iniciar({porta:0});const base=`http://127.0.0.1:${servidor.address().port}`;
  let cookie='',csrf='',db;
  async function pedir(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrf,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const mapa=new Map(cookie.split('; ').filter(Boolean).map(x=>x.split('=')));for(const c of r.headers.getSetCookie()){const[k,v]=c.split(';')[0].split('=');mapa.set(k,v);}cookie=[...mapa].map(([k,v])=>`${k}=${v}`).join('; ');csrf=mapa.get('csrf')||'';return {status:r.status,data:await r.json()};}
  try{
    assert.equal((await pedir('/api/conquistas')).status,401);
    await pedir('/api/autenticacao/sessao');
    const criado=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Perfil Teste',usuario:'perfil_refinado',email:'perfil@example.com',senha:'senha-teste-refinado-123',idade:21,aceitaTermos:true});assert.equal(criado.status,201);
    const foto={mime:'image/png',dados:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII='};
    const entrada={nome:'Perfil completo',bio:'Biografia preservada',local:'São Paulo',tema:'claro',idioma:'en',foto,sociais:{instagram:'https://www.instagram.com/ander.teste/',x:'https://x.com/ander',facebook:'https://www.facebook.com/ander',tiktok:'https://www.tiktok.com/@ander',site:'https://example.com',whatsapp:'+55 (11) 99999-9999'}};
    let r=await pedir('/api/perfil','PATCH',entrada);assert.equal(r.status,200);assert.equal(r.data.usuario.tema,'claro');assert.equal(r.data.perfil.bio,entrada.bio);assert.equal(r.data.perfil.sociais.instagram,'ander.teste');assert.ok(r.data.perfil.foto_url);
    r=await pedir('/api/perfil','PATCH',{...entrada,nome:'Não deve salvar',tema:'invalido'});assert.equal(r.status,400);
    r=await pedir('/api/perfil','PATCH',{...entrada,nome:'Também não salva',foto:{mime:'image/png',dados:'PHN2Zy8+'}});assert.equal(r.status,400);
    r=await pedir('/api/perfil','PATCH',{...entrada,nome:'Outro inválido',sociais:{instagram:'https://instagram.com.evil.test/ander'}});assert.equal(r.status,400);assert.equal(r.data.erro,'sociais_invalidas');
    r=await pedir('/api/conta');assert.equal(r.data.usuario.nome,entrada.nome);assert.equal(r.data.usuario.tema,'claro');
    const imagem=await fetch(base+'/api/perfil/foto/perfil_refinado',{headers:{Cookie:cookie}});assert.equal(imagem.status,200);assert.equal(imagem.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await imagem.arrayBuffer()),Buffer.from(foto.dados,'base64'));
    assert.equal((await pedir('/api/conquistas')).data.conquistas.length,0);
    db=new DatabaseSync(process.env.PORTAL_BANCO);db.prepare('UPDATE usuarios SET pontos=1960 WHERE id=?').run(criado.data.usuario.id);
    await pedir('/api/favoritos/porcentagem','PUT',{});
    let pendentes=(await pedir('/api/conquistas')).data.conquistas;assert.ok(pendentes.some(c=>c.chave==='nivel:15'));assert.ok(pendentes.some(c=>c.chave==='colecao:0'));
    for(const conquista of pendentes){assert.equal((await pedir('/api/conquistas/receber','POST',{chave:conquista.chave})).data.recebida,true);assert.equal((await pedir('/api/conquistas/receber','POST',{chave:conquista.chave})).data.recebida,false);}
    const aposCelebrar=(await pedir('/api/conquistas')).data;
    assert.equal(aposCelebrar.conquistas.length,0);
    assert.ok(aposCelebrar.notificacoes.some(c=>c.chave==='nivel:15'),'notificação persiste após receber a animação');
    assert.ok(aposCelebrar.notificacoes.some(c=>c.chave==='colecao:0'));
    const consultar=()=>pedir('/api/perfil/perfil_refinado');
    assert.equal((await consultar()).data.perfil.rank.id,'criador');
    assert.equal((await pedir('/api/perfil/conquistas','PATCH',{selecionadas:['colecao']})).status,200);
    assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,['colecao']);
    for(const invalida of [['colecao','colecao'],['nao_existe'],['explorador'],['colecao','colecao','colecao','colecao','colecao','colecao'],null]){
      assert.equal((await pedir('/api/perfil/conquistas','PATCH',{selecionadas:invalida})).status,400);
      assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,['colecao'],'seleção anterior preservada em entradas inválidas');
    }
    await pedir('/api/favoritos/porcentagem','DELETE');
    let colecao=(await consultar()).data.perfil.medalhas.find(m=>m.id==='colecao');
    assert.equal(colecao.valor,0);assert.equal(colecao.desbloqueada,true,'conquista recebida não some ao remover favorito');
    assert.equal(colecao.etapas.length,8);assert.equal(colecao.etapas[0].desbloqueada,true);
    assert.deepEqual((await pedir('/api/conta/exportar')).data.conquistas_destaque,['colecao']);
    await pedir('/api/perfil/conquistas','PATCH',{selecionadas:[]});
    assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,[],'nenhum destaque também é uma escolha persistente');
    assert.equal((await pedir('/api/conquistas/receber','POST',{chave:'nivel:99999'})).status,400);assert.equal((await pedir('/api/conquistas/receber','POST',{chave:'colecao:7'})).status,400);
    db.prepare('UPDATE usuarios SET pontos=2250 WHERE id=?').run(criado.data.usuario.id);pendentes=(await pedir('/api/conquistas')).data.conquistas;assert.deepEqual(pendentes.map(c=>c.chave),['nivel:16']);
    r=await pedir('/api/perfil','PATCH',{foto:null});assert.equal(r.status,200);assert.equal(r.data.perfil.foto_url,null);assert.equal(r.data.usuario.tema,'claro');
    db.prepare("UPDATE usuarios SET criado_em='2020-01-01 00:00:00' WHERE id=?").run(criado.data.usuario.id);
    db.prepare('INSERT INTO uso_ferramentas(usuario_id,slug,total) VALUES(?,?,?)').run(criado.data.usuario.id,'porcentagem',3);
    db.prepare('INSERT INTO trabalhos(usuario_id,ferramenta_slug,titulo) VALUES(?,?,?)').run(criado.data.usuario.id,'porcentagem','Trabalho de teste');
    await pedir('/api/favoritos/porcentagem','PUT',{});
    const cinco=['projetos','veterano','colecao','pratica','explorador'];
    assert.equal((await pedir('/api/perfil/conquistas','PATCH',{selecionadas:cinco})).status,200);
    assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,cinco,'cinco posições mantêm a ordem escolhida');
    const semCsrf=await fetch(base+'/api/perfil/conquistas',{method:'PATCH',headers:{Cookie:cookie,Origin:'http://127.0.0.1:4400','Content-Type':'application/json'},body:JSON.stringify({selecionadas:[]})});
    assert.equal(semCsrf.status,403);assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,cinco);
    const originalCookie=cookie,originalCsrf=csrf;cookie='';csrf='';await pedir('/api/autenticacao/sessao');
    await pedir('/api/autenticacao/criar-conta','POST',{nome:'Outra Conta',usuario:'outra_conta',email:'outra@example.com',senha:'senha-teste-outra-123',idade:21,aceitaTermos:true});
    assert.equal((await pedir('/api/perfil/conquistas','PATCH',{selecionadas:[],usuario_id:criado.data.usuario.id})).status,200);
    assert.deepEqual((await consultar()).data.perfil.conquistas_destaque,cinco,'uma conta não altera os destaques de outra');
    cookie=originalCookie;csrf=originalCsrf;
    db.close();db=new DatabaseSync(process.env.PORTAL_BANCO);
    assert.deepEqual(JSON.parse(db.prepare('SELECT selecionadas FROM perfil_conquistas_destaque WHERE usuario_id=?').get(criado.data.usuario.id).selecionadas),cinco);
  }finally{db?.close();await new Promise(resolve=>servidor.close(resolve));fecharBanco();rmSync(pasta,{recursive:true,force:true});}
});
