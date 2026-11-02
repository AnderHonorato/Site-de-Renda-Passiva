import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularGiro, calcularGiroNaTela } from '../scripts/ferramentas/giro-de-estoque.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={cmv:'120000',estoqueMedio:'30000',dias:'90'};
test('giro calcula quatro ciclos e 22,5 dias com CMV ao custo',()=>{
 const r=calcularGiro({cmv:120000,estoqueMedio:30000,dias:90});
 assert.equal(r.giro,4);assert.equal(r.diasDeEstoque,22.5);
 assert.match(calcularGiroNaTela(base).valor,/4/);
});
test('sem vendas exibe permanência não calculável',()=>{
 const r=calcularGiro({cmv:0,estoqueMedio:30000,dias:30});assert.equal(r.giro,0);assert.equal(r.diasDeEstoque,null);
});
test('CMV positivo com estoque médio zero exige correção',()=>{
 assert.throws(()=>calcularGiroNaTela({...base,estoqueMedio:'0'}),
  e=>e instanceof ErroDeEntrada&&e.campo==='estoqueMedio');
});
test('dias não inteiros e custos negativos são rejeitados',()=>{
 for(const [k,v] of [['cmv','-1'],['estoqueMedio','-2'],['dias','0'],['dias','30,5']])
 assert.throws(()=>calcularGiroNaTela({...base,[k]:v}),e=>e instanceof ErroDeEntrada&&!!e.campo,k);
});
test('explica por que faturamento não substitui CMV',()=>{
 assert.match(calcularGiroNaTela(base).observações.join(' '),/não do preço de venda/);
});
