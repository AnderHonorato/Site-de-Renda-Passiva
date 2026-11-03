import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planejarEstoque,ErroEstoque} from '../servidor/estoque-abc-xyz.mjs';
const item=(sku,demandaMensal,extra={})=>({sku,demandaMensal,preco:100,custo:40,estoque:0,prazoDias:10,...extra});
test('ABC distribui valor de consumo e XYZ separa demanda regular',()=>{
 const r=planejarEstoque({itens:[item('A',[100,100,100]),item('B',[10,10,10]),item('C',[1,1,1])]});
 assert.equal(r.totalSkus,3);assert.deepEqual(r.itens.map(i=>i.classeABC),['A','A','B']);
 assert.equal(r.itens[0].classeXYZ,'X');assert.equal(r.itens[0].classeCombinada,'AX');
 assert.equal(r.itens[0].valorConsumoAnual,120000);
 assert.equal(r.itens[0].pontoPedido,57);
 assert.equal(r.itens[0].reposicaoSugerida,157);
});
test('sazonalidade altera projeção, ponto de pedido e custo de reposição',()=>{
 const r=planejarEstoque({horizonteMeses:2,itens:[item('S',[20,20,20],{sazonalidade:[2,0.5],estoque:5,recebimentos:10,pedidosPendentes:3})]});
 const i=r.itens[0];assert.deepEqual(i.demandaPrevista,[40,10]);assert.equal(i.demandaHorizonte,50);
 assert.equal(i.posicaoEstoque,12);assert.equal(i.pontoPedido,23);assert.equal(i.reposicaoSugerida,51);
 assert.equal(r.investimentoReposicao,2040);
});
test('zero demanda não gera compra artificial sem pendências',()=>{
 const i=planejarEstoque({itens:[item('ZERO',[0,0,0],{estoque:4})]}).itens[0];
 assert.equal(i.classeXYZ,'Z');assert.equal(i.reposicaoSugerida,0);
 assert.equal(i.classeABC,'C');assert.equal(i.coeficienteVariacao,null);
});
test('XYZ identifica alta volatilidade',()=>{
 const i=planejarEstoque({itens:[item('IRREG',[0,0,100])]}).itens[0];
 assert.equal(i.classeXYZ,'Z');assert.ok(i.alertas.some(a=>a.includes('irregular')));
});
test('rejeita SKU repetido, entradas maliciosas, NaN e fatores incompletos',()=>{
 for(const itens of [
  [item('X',[1,1,1]),item('X',[2,2,2])],
  [item('<script>',[1,1,1])],
  [item('X',[1,NaN,1])],
  [item('X',[1,1,1],{sazonalidade:[1]})],
  [item('X',[1,1,1],{prazoDias:-1})],
 ])assert.throws(()=>planejarEstoque({itens}),ErroEstoque);
});
test('não altera objetos originais e impõe limites de volume',()=>{
 const i=item('SKU',[1,2,3]);const original=JSON.stringify(i);
 planejarEstoque({itens:[i]});assert.equal(JSON.stringify(i),original);
 assert.throws(()=>planejarEstoque({itens:Array(501).fill(i)}),ErroEstoque);
 assert.throws(()=>planejarEstoque({itens:[i],horizonteMeses:13}),ErroEstoque);
});
