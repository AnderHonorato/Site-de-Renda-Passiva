import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarCubagem, calcularCubagemNaTela } from '../scripts/ferramentas/cubagem.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
test('cubagem agrega diversos volumes em metros cúbicos',()=>{
 const r=analisarCubagem([{descricao:'A',comprimento:60,largura:40,altura:50,quantidade:2},
 {descricao:'B',comprimento:30,largura:20,altura:10,quantidade:3}]);
 assert.ok(Math.abs(r.totalMetrosCubicos-0.258)<1e-12);
 assert.equal(r.totalVolumes,5);
 assert.equal(r.itens[0].volumeM3,0.24);
});
test('formulário mantém tabela para CSV e Excel automáticos',()=>{
 const r=calcularCubagemNaTela({volumes:'Caixa; 100; 100; 100; 1'});
 assert.match(r.valor,/1 m³/);
 assert.equal(r.tabela.linhas.length,1);
 assert.equal(r.tabela.cabeçalho.length,6);
 assert.match(r.texto,/Caixa/);
});
test('valida linhas, quantidades e dimensões sem aceitações silenciosas',()=>{
 for(const v of ['caixa; 10; 10; 10','caixa; 0; 10; 10; 1','caixa; 10; 10; 10; 1,5',
 'caixa; 10; 10; 10; -1','caixa; lixo; 10; 10; 1','; 10; 10; 10; 1']) {
  assert.throws(()=>calcularCubagemNaTela({volumes:v}),
   e=>e instanceof ErroDeEntrada&&e.campo==='volumes',v);
 }
});
test('limita quantidade de tipos de volumes',()=>{
 assert.throws(()=>calcularCubagemNaTela({volumes:Array(81).fill('Caixa; 1; 1; 1; 1').join('\n')}),/80/);
});
