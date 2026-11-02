import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analisarFunil,calcularFunilNaTela} from '../scripts/ferramentas/funil-de-vendas.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const base={etapas:'Visitantes; 1000\nLeads; 200\nPropostas; 40\nVendas; 10'};
test('funil calcula conversão entre etapas, total e gargalo',()=>{
 const r=analisarFunil([{nome:'Visitantes',pessoas:1000},{nome:'Leads',pessoas:200},
  {nome:'Propostas',pessoas:40},{nome:'Vendas',pessoas:10}]);
 assert.equal(r.conversaoTotal,0.01);
 assert.equal(r.etapas[1].taxaAnterior,0.2);
 assert.equal(r.etapas[3].perdidas,30);
 assert.equal(r.gargalo.nome,'Leads');
 const tela=calcularFunilNaTela(base);
 assert.equal(tela.valor,'1%');
 assert.match(tela.texto,/Propostas/);
 assert.equal(tela.tabela.linhas.length,4);
});
test('sem pessoas após etapa zero, taxa seguinte é não calculável',()=>{
 const tela=calcularFunilNaTela({etapas:'Visitantes; 10\nLeads; 0\nVendas; 0'});
 assert.equal(tela.tabela.linhas[2][2],'Não calculável');
 assert.equal(tela.valor,'0%');
});
test('funil recusa crescimento da coorte, números quebrados e duplicatas',()=>{
 for(const etapas of [
  'Visitas; 10\nVendas; 11','Visitas; 10\nVendas; 1,5',
  'Visitas; 10\nvisitas; 2','Visitas; 0\nVendas; 0',
  'Visitas; 10\nVendas; -1','Visitas; 10\nVendas; lixo'
 ])assert.throws(()=>calcularFunilNaTela({etapas}),
   e=>e instanceof ErroDeEntrada&&e.campo==='etapas',etapas);
});
test('funil avisa premissa de mesma coorte e oferece tabela para CSV/Excel',()=>{
 const r=calcularFunilNaTela(base);
 assert.equal(r.tabela.cabeçalho.length,6);
 assert.match(r.observações.join(' '),/MESMA coorte/);
});
