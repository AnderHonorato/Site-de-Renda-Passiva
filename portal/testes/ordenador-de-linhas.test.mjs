import {test} from 'node:test';import assert from 'node:assert/strict';
import {ordenarLinhas,calcularOrdenacao} from '../scripts/ferramentas/ordenador-de-linhas.js';
test('alfabética considera português e preserva duplicatas',()=>{
 assert.equal(ordenarLinhas('zebra\nárvore\nárvore','az'),'árvore\nárvore\nzebra');
});
test('inversão e ordem numérica',()=>{
 assert.equal(ordenarLinhas('1\n2\n3','inverter'),'3\n2\n1');
 assert.equal(ordenarLinhas('20\n3\n10','numerico'),'3\n10\n20');
});
test('números inválidos e excesso de linhas são rejeitados',()=>{
 assert.throws(()=>ordenarLinhas('3\nabc','numerico'),/números válidos/);
 assert.throws(()=>ordenarLinhas('x\n'.repeat(10001)),/10 mil/);
 assert.throws(()=>ordenarLinhas('x','modo-inexistente'),/inválido/);
});
test('exportação de lista disponível',()=>{
 const r=calcularOrdenacao({conteudo:'b\na',modo:'az',caixa:'sim'});
 assert.equal(r.texto,'a\nb');assert.equal(r.arquivos.length,1);
});
