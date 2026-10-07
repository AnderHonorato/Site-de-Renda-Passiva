import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('novidades: permissões, CSRF, rascunho, publicação, imagem e retirada pela API',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-novidades-'));
  process.env.PORTAL_BANCO=join(pasta,'banco.sqlite');
  const { iniciar,fecharBanco }=await import('../../servidor/iniciar.mjs');
  const servidor=await iniciar({porta:0});
  const base=`http://127.0.0.1:${servidor.address().port}`;
  let cookie='',csrf='',db;
  async function pedir(p,metodo='GET',dados,headers={}) {
    const r=await fetch(base+p,{method:metodo,headers:{Cookie:cookie,...(metodo==='GET'?{}:{Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrf,'Content-Type':'application/json'}),...headers},body:dados instanceof Buffer?dados:dados?JSON.stringify(dados):undefined});
    const mapa=new Map(cookie.split('; ').filter(Boolean).map(x=>x.split('=')));
    for(const c of r.headers.getSetCookie()) { const [k,v]=c.split(';')[0].split('=');mapa.set(k,v); }
    cookie=[...mapa].map(([k,v])=>`${k}=${v}`).join('; ');csrf=mapa.get('csrf')||'';
    return { status:r.status, data:r.headers.get('content-type')?.startsWith('image/')?Buffer.from(await r.arrayBuffer()):await r.json(), headers:r.headers };
  }
  const dados={titulo_pt:'Notícia de teste',texto_pt:'<script>alert(1)</script>',titulo_en:'Test news',texto_en:'Safe plain text',ordem:2,ativo:false,alt_pt:'Um pixel',alt_en:'One pixel'};
  try {
    assert.equal((await pedir('/api/admin/novidades')).status,401);
    await pedir('/api/autenticacao/sessao');
    const conta=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Teste',email:'noticia@example.com',usuario:'noticias_teste',senha:'senha-teste-noticia-123',idade:21,aceitaTermos:true});assert.equal(conta.status,201);
    assert.equal((await pedir('/api/admin/novidades','POST',dados)).status,403);
    assert.equal((await pedir('/api/admin/publicidade')).status,403);
    db=new DatabaseSync(process.env.PORTAL_BANCO);db.prepare("UPDATE usuarios SET papel='admin' WHERE id=?").run(conta.data.usuario.id);
    assert.equal((await pedir('/api/admin/novidades','POST',dados,{'X-CSRF-Token':'errado'})).status,403);
    assert.equal((await pedir('/api/admin/novidades','POST',dados,{Origin:'http://evil.example'})).status,403);
    let item=(await pedir('/api/admin/novidades','POST',dados)).data.item; assert.ok(item.id);
    assert.equal((await pedir('/api/novidades')).data.itens.length,0);
    assert.equal((await pedir('/api/admin/novidades')).data.itens.length,1);
    const path=`/api/admin/novidades/${item.id}/imagem`;
    let r=await pedir(path,'POST',Buffer.from('<svg/>'),{'Content-Type':'image/png','X-Novidade-Versao':String(item.versao)});assert.equal(r.status,400);
    r=await pedir(path,'POST',Buffer.alloc(1048577),{'Content-Type':'image/png','X-Novidade-Versao':String(item.versao)});assert.equal(r.status,413);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=','base64');
    r=await pedir(path,'POST',png,{'Content-Type':'image/png','X-Novidade-Versao':String(item.versao)});assert.equal(r.status,200);item=r.data.item;
    assert.equal((await pedir(`/api/novidades/${item.id}/imagem`)).status,404);
    item=(await pedir(`/api/admin/novidades/${item.id}`,'PUT',{...dados,ativo:true,versao:item.versao})).data.item;
    r=await pedir('/api/novidades?idioma=en');assert.equal(r.data.itens[0].titulo,'Test news');assert.ok(r.data.itens[0].revisao>1);
    r=await pedir('/api/novidades');assert.equal(r.data.itens[0].texto,dados.texto_pt);assert.equal('imagem' in r.data.itens[0],false);
    r=await pedir(`/api/novidades/${item.id}/imagem`);assert.deepEqual(r.data,png);assert.equal(r.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await pedir(`/api/admin/novidades/${item.id}`,'PUT',{...dados,versao:item.versao-1})).status,409);
    const retirada={...dados,ativo:true,versao:item.versao,publicar_em:new Date(Date.now()-7200000).toISOString(),retirar_em:new Date(Date.now()-3600000).toISOString()};
    item=(await pedir(`/api/admin/novidades/${item.id}`,'PUT',retirada)).data.item;
    assert.equal((await pedir('/api/novidades')).data.itens.length,0);
    assert.equal((await pedir(`/api/novidades/${item.id}/imagem`)).status,404);
    assert.equal((await pedir(`/api/admin/novidades/${item.id}`,'DELETE',{versao:item.versao})).status,200);
    assert.equal((await pedir('/api/admin/novidades')).data.itens.length,0);
    assert.ok(db.prepare("SELECT COUNT(*) n FROM auditoria_admin WHERE acao LIKE '%novidade%'").get().n>=4);
    assert.equal((await pedir('/api/autenticacao/sessao')).data.usuario.usuario,'noticias_teste');
    const demo={ativo:true,demonstracao:true,teste:true,editor:'',blocos:{}};
    assert.equal((await pedir('/api/admin/publicidade','PUT',demo,{'X-CSRF-Token':'errado'})).status,403);
    assert.equal((await pedir('/api/admin/publicidade','PUT',demo)).status,200);
    r=await pedir('/api/anuncios','GET',undefined,{Referer:'http://127.0.0.1:4400/'});assert.equal(r.data.demonstracao,true);assert.equal(r.data.editor,null);
    r=await pedir('/api/anuncios','GET',undefined,{Referer:'http://127.0.0.1:4400/perfil.html'});assert.equal(r.data.permitido,false);
    r=await pedir('/api/anuncios','GET',undefined,{Referer:'http://127.0.0.1:4400/f/calculadora-de-datas/'});assert.equal(r.data.permitido,true);
    db.prepare("UPDATE usuarios SET plano='plus' WHERE id=?").run(conta.data.usuario.id);
    r=await pedir('/api/anuncios','GET',undefined,{Referer:'http://127.0.0.1:4400/'});assert.equal(r.data.permitido,false);
    assert.equal((await pedir('/api/admin/publicidade')).data.config.demonstracao,true);
  } finally { await new Promise(ok=>servidor.close(ok));db?.close();fecharBanco();rmSync(pasta,{recursive:true,force:true}); }
});
