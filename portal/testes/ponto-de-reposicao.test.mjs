import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularReposicao, calcularReposicaoNaTela } from '../scripts/ferramentas/ponto-de-reposicao.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={consumoDiario:'10',prazoDias:'5',seguranca:'20',emEstoque:'40',aReceber:'10'};
test('reposição usa consumo do prazo e segurança e avisa ponto atingido',()=>{
 const r=calcularReposicao({consumoDiario:10,prazoDias:5,seguranca:20,emEstoque:40,aReceber:10});
 assert.deepEqual([r.consumoNoPrazo,r.ponto,r.posicao,r.quantidadeParaPonto],[50,70,50,20]);
 assert.equal(r.precisaPedir,true);
 assert.match(calcularReposicaoNaTela(base).valor,/70 unidades/);
});
test('estoque acima do ponto não recomenda pedido',()=>{
 const r=calcularReposicao({consumoDiario:2,prazoDias:5,seguranca:10,emEstoque:21});
 assert.equal(r.ponto,20);
 assert.equal(r.precisaPedir,false);
 assert.equal(r.quantidadeParaPonto,0);
});
test('não há divisão por zero quando consumo é zero',()=>{
 const r=calcularReposicao({consumoDiario:0,prazoDias:3,seguranca:10,emEstoque:1});
 assert.equal(r.ponto,10);
 assert.equal(r.coberturaDias,null);
});
test('limites e unidades são validados em campos',()=>{
 for(const [k,v] of [['consumoDiario','-1'],['prazoDias','366'],['seguranca','1,5'],['emEstoque','-2'],['aReceber','1,2']]){
  assert.throws(()=>calcularReposicaoNaTela({...base,[k]:v}),e=>e instanceof ErroDeEntrada&&!!e.campo,k);
 }
});
test('orientação não confunde gatilho de compra com lote econômico',()=>{
 const t=calcularReposicaoNaTela(base); assert.match(t.observações[1],/NÃO é o lote ideal/);
});
