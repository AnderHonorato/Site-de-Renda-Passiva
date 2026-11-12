import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCep, consultarCep, consultarCepNaTela } from '../scripts/ferramentas/consulta-de-cep.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const ok = async () => ({ok:true,json:async()=>({
  cep:'01001-000',logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',
  uf:'SP',ibge:'3550308',ddd:'11',
})});
test('aceita CEP formatado e sem pontuação',()=>{
  assert.equal(validarCep('01001-000'),'01001000');
  assert.equal(validarCep('01001000'),'01001000');
  for(const valor of ['0100','123456789','abc12345','12345-67x',''])assert.throws(()=>validarCep(valor),ErroDeEntrada);
});
test('consulta realista valida o CEP retornado e monta endereço e exportação',async()=>{
  const r=await consultarCepNaTela({cep:'01001-000'},{buscar:ok});
  assert.equal(r.valor,'01001-000');
  assert.match(r.resumo,/Praça da Sé/);
  assert.match(r.texto,/3550308/);
  assert.match(r.observações[0],/ViaCEP/);
});
test('CEP não encontrado e respostas incompatíveis não são aceitos',async()=>{
  await assert.rejects(consultarCep('01001000',{buscar:async()=>({ok:true,json:async()=>({erro:true})})}),ErroDeEntrada);
  await assert.rejects(consultarCep('01001000',{buscar:async()=>({ok:true,json:async()=>({cep:'99999-999',localidade:'São Paulo',uf:'SP'})})}),ErroDeEntrada);
  await assert.rejects(consultarCep('01001000',{buscar:async()=>({ok:false})}),ErroDeEntrada);
  await assert.rejects(consultarCep('01001000',{buscar:async()=>{throw Error('offline')}}),ErroDeEntrada);
});
