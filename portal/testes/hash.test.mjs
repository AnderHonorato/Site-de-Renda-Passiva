import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcularHash,compararHash,calcularHashNaTela,LIMITE_ARQUIVO} from '../scripts/ferramentas/hash.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const data=new TextEncoder().encode('abc');
test('SHA-256 do texto abc é o vetor público conhecido',async()=>{
 const r=await calcularHash(data,'SHA-256');
 assert.equal(r,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(compararHash(r,r.toUpperCase(),'SHA-256'),true);
 assert.equal(compararHash(r,'0'.repeat(64),'SHA-256'),false);
});
test('todos os algoritmos suportados têm o comprimento correto',async()=>{
 for(const [a,n] of [['SHA-1',40],['SHA-256',64],['SHA-384',96],['SHA-512',128]]){
  const h=await calcularHash(data,a);assert.equal(h.length,n);
 }
});
test('hash esperado inválido é rejeitado com campo indicado',()=>{
 for(const valor of ['abc','z'.repeat(64),'a'.repeat(63)]){
  assert.throws(()=>compararHash('b'.repeat(64),valor,'SHA-256'),
    e=>e instanceof ErroDeEntrada&&e.campo==='esperado');
 }
});
test('texto calcula localmente sem enviar conteúdo para servidor',async()=>{
 const r=await calcularHashNaTela({modo:'texto',algoritmo:'SHA-256',conteudo:'abc',esperado:''});
 assert.equal(r.valor,'Hash calculado');
 assert.match(r.texto,/ba7816bf/);
 assert.match(r.observações.join(' '),/não são transmitidos/);
});
test('arquivos fora do limite e modos ausentes falham corretamente',async()=>{
 await assert.rejects(()=>calcularHashNaTela({modo:'arquivo',algoritmo:'SHA-256',esperado:''}),/Escolha um arquivo/);
 await assert.rejects(()=>calcularHashNaTela({modo:'arquivo',algoritmo:'SHA-256',esperado:''},
    {name:'gigante.bin',size:LIMITE_ARQUIVO+1}),/25 MB/);
 await assert.rejects(()=>calcularHashNaTela({modo:'incorreto',algoritmo:'SHA-256'}),/tipo de entrada/);
});
