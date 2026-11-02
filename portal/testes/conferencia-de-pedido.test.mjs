import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerItensConferencia, conferirPedido, calcularConferenciaNaTela } from '../scripts/ferramentas/conferencia-de-pedido.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={pedido:'SKU-A; 3\nSKU-B; 2',separado:'SKU-A; 2\nSKU-B; 4'};
test('conferência detecta um faltante e dois excedentes',()=>{
 const r=calcularConferenciaNaTela(base);
 assert.equal(r.valor,'Divergências encontradas');
 assert.deepEqual(r.tabela.linhas.map(l=>[l[0],l[3],l[4]]),[['SKU-A','1','0'],['SKU-B','0','2']]);
 assert.match(r.texto,/unidades faltantes/i);
});
test('conferência soma duplicatas da mesma referência ignorando caixa',()=>{
 const p=lerItensConferencia('abc; 1\nABC; 2','pedido');
 const s=lerItensConferencia('Abc; 3','separado');
 const r=conferirPedido({pedido:p,separado:s});
 assert.equal(r.aprovado,true);
 assert.equal(r.corretas,1);
});
test('separação vazia lista os itens totalmente faltantes',()=>{
 const r=calcularConferenciaNaTela({pedido:'Produto; 7',separado:''});
 assert.equal(r.tabela.linhas[0][3],'7');
 assert.equal(r.valor,'Divergências encontradas');
});
test('detecta item não pedido',()=>{
 const r=calcularConferenciaNaTela({pedido:'A; 1',separado:'A; 1\nEXTRA; 2'});
 assert.equal(r.tabela.linhas[1][5],'Item não pedido');
});
test('rejeita valores fracionários, sem referência ou negativos',()=>{
 for(const [campo,valor] of [['pedido','A; 0'],['pedido','A; 1,5'],['pedido','; 2'],
   ['separado','A; -2'],['pedido','A; 1; 2']]){
  assert.throws(()=>calcularConferenciaNaTela({...base,[campo]:valor}),
    e=>e instanceof ErroDeEntrada&&e.campo===campo,campo+':'+valor);
 }
});
