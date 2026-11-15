import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:net';

const portaLivre=()=>new Promise(ok=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});

test('Flower API: status público, administração protegida, configuração sem retorno de segredo e chat validado',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-flower-api-'));
  process.env.PORTAL_BANCO=join(pasta,'banco.sqlite');
  process.env.PORTAL_IA_CHAVE_MESTRA_FILE=join(pasta,'flower-master.key');
  const {iniciar,fecharBanco}=await import('../../servidor/iniciar.mjs');
  const servidor=await iniciar({porta:await portaLivre()});
  const base=`http://127.0.0.1:${servidor.address().port}`;
  let cookie='',csrf='',db;
  async function pedir(path,metodo='GET',dados,headers={}){
    const r=await fetch(base+path,{method:metodo,headers:{Cookie:cookie,...(metodo==='GET'?{}:{Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrf,'Content-Type':'application/json'}),...headers},body:dados===undefined?undefined:JSON.stringify(dados)});
    const map=new Map(cookie.split('; ').filter(Boolean).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
    for(const c of r.headers.getSetCookie()){const [part]=c.split(';'),i=part.indexOf('=');map.set(part.slice(0,i),part.slice(i+1));}
    cookie=[...map].map(([k,v])=>`${k}=${v}`).join('; ');csrf=decodeURIComponent(map.get('csrf')||map.get('__Host-csrf')||'');
    return {status:r.status,data:await r.json()};
  }
  try {
    const status=await pedir('/api/flower/status');assert.equal(status.status,200);assert.equal(status.data.online,false);assert.deepEqual(Object.keys(status.data).sort(),['model','online','provider']);
    assert.equal((await pedir('/api/admin/flower')).status,401);
    await pedir('/api/autenticacao/sessao');
    const conta=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Flower Teste',email:'flower@example.com',usuario:'flower_teste',senha:'senha-flower-teste-456',idade:22,aceitaTermos:true});assert.equal(conta.status,201);
    db=new DatabaseSync(process.env.PORTAL_BANCO);db.prepare("UPDATE usuarios SET papel='admin' WHERE id=?").run(conta.data.usuario.id);
    assert.equal((await pedir('/api/admin/flower')).status,200);
    const config={provider:'openai',model:'modelo-teste',apiKey:'segredo-de-api-de-teste',enabled:true,revision:1};
    assert.equal((await pedir('/api/admin/flower','PUT',config,{'X-CSRF-Token':'invalido'})).status,403);
    assert.equal((await pedir('/api/admin/flower','PUT',config,{Origin:'https://origem-invalida.example'})).status,403);
    const salvo=await pedir('/api/admin/flower','PUT',config);assert.equal(salvo.status,200);assert.equal(salvo.data.hasKey,true);assert.equal(salvo.data.online,true);
    assert.equal(JSON.stringify(salvo.data).includes('segredo-de-api-de-teste'),false);
    const leitura=await pedir('/api/admin/flower');assert.equal(leitura.status,200);assert.equal('key_ciphertext' in leitura.data,false);assert.equal('apiKey' in leitura.data,false);
    assert.equal((await pedir('/api/flower/status')).data.online,true);
    assert.equal((await pedir('/api/flower/chat','POST',{messages:[]})).status,400);
    assert.equal((await pedir('/api/flower/chat','POST',{messages:[{role:'user',content:'oi'},{role:'user',content:'mais'}]})).status,400);
    const stored=db.prepare('SELECT key_ciphertext FROM flower_config').get();assert.ok(stored.key_ciphertext);assert.notEqual(Buffer.from(stored.key_ciphertext,'base64').toString(),'segredo-de-api-de-teste');
    assert.equal(statSync(process.env.PORTAL_IA_CHAVE_MESTRA_FILE).mode&0o777,0o600);
  } finally {
    db?.close();servidor.closeAllConnections?.();await new Promise(ok=>servidor.close(ok));fecharBanco();
    delete process.env.PORTAL_BANCO;delete process.env.PORTAL_IA_CHAVE_MESTRA_FILE;rmSync(pasta,{recursive:true,force:true});
  }
});
