import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT=4493, API=48991;
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const origin='http://127.0.0.1:'+PORT;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('--loopback só escuta local, mas nunca simula sessão ou API real', async()=>{
  const server=spawn(process.execPath,['ferramentas/servir.mjs',ROOT,'--porta',String(PORT),'--loopback'],{
    cwd:ROOT,env:{...process.env,PORTAL_API_PORTA:String(API)},stdio:'ignore',windowsHide:true
  });
  try{
    let ready=false;
    for(let i=0;i<60;i++){
      try{const res=await fetch(origin+'/scripts/núcleo/api.js');if(res.status===200){ready=true;break;}}
      catch{}
      await wait(100);
    }
    assert.equal(ready,true,'site deve subir só no loopback');
    const res=await fetch(origin+'/api/autenticacao/sessao',{headers:{'sec-ch-ua':'"Chromium";v="120"'}});
    assert.equal(res.status,503,'sem API em 127.0.0.1:'+API+' não pode fingir usuário anônimo');
    assert.deepEqual(await res.json(),{erro:'servico_indisponivel'});
  }finally{server.kill();}
});
