import test from 'node:test';
import assert from 'node:assert/strict';
import { obterSessao, limparSessao, confirmarSessaoAposAutenticacao } from '../scripts/núcleo/sessão.js';

test('cadastro/login renova cache visitante e avisa cabeçalho com usuário real', async () => {
  const fetchAnterior = globalThis.fetch;
  const documentoAnterior = globalThis.document;
  let chamadas=0;
  const eventos=[];
  globalThis.document={ dispatchEvent(evento){eventos.push(evento);return true;} };
  globalThis.fetch=async()=>{
    chamadas++;
    return new Response(JSON.stringify({
      usuario:chamadas===1?null:{id:37,usuario:'qa_sessao',papel:'usuario'},
      chat_habilitado:false,chat_aceito:false
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    limparSessao();
    assert.equal((await obterSessao()).usuario,null);
    assert.equal((await obterSessao()).usuario,null);
    assert.equal(chamadas,1);
    const sessao=await confirmarSessaoAposAutenticacao();
    assert.equal(sessao.usuario.usuario,'qa_sessao');
    assert.equal((await obterSessao()).usuario.usuario,'qa_sessao');
    assert.equal(chamadas,2);
    assert.equal(eventos.length,1);
    assert.equal(eventos[0].type,'portal:sessao-alterada');
    assert.equal(eventos[0].detail.usuario.id,37);
  }finally{
    limparSessao();
    globalThis.fetch=fetchAnterior;
    globalThis.document=documentoAnterior;
  }
});

test('se cookies não persistirem não anuncia sessão falsa',async()=>{
  const fetchAnterior=globalThis.fetch;
  const documentoAnterior=globalThis.document;
  const eventos=[];
  globalThis.document={dispatchEvent(evento){eventos.push(evento);return true;}};
  globalThis.fetch=async()=>new Response(JSON.stringify({
    usuario:null,chat_habilitado:false,chat_aceito:false
  }),{status:200,headers:{'Content-Type':'application/json'}});
  try{
    limparSessao();
    await assert.rejects(confirmarSessaoAposAutenticacao(),{message:'sessao_nao_persistida'});
    assert.equal(eventos.length,0);
  }finally{
    limparSessao();
    globalThis.fetch=fetchAnterior;
    globalThis.document=documentoAnterior;
  }
});
