import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analisarVendas,calcularTicketNaTela} from '../scripts/ferramentas/ticket-medio.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const dados={faturamento:'10000',pedidos:'100',atendimentos:'1000',aumentoTicket:'10',aumentoConversao:'20'};
test('ticket e conversão produzem cenário de +10% ticket e +20% conversão',()=>{
 const r=analisarVendas({faturamentoCentavos:1000000,pedidos:100,atendimentos:1000,
  aumentoTicket:10,aumentoConversao:20});
 assert.equal(r.ticketCentavos,10000);
 assert.equal(r.conversao,0.1);
 assert.equal(r.conversaoProjetada,0.12);
 assert.equal(r.pedidosEstimados,120);
 assert.equal(r.faturamentoProjetadoCentavos,1320000);
 assert.equal(r.ganhoProjetadoCentavos,320000);
 assert.match(calcularTicketNaTela(dados).valor,/100,00/);
});
test('sem visitas, conversão e projeção não são inventadas',()=>{
 const r=analisarVendas({faturamentoCentavos:10000,pedidos:1,atendimentos:0});
 assert.equal(r.conversao,null);
 assert.equal(r.faturamentoProjetadoCentavos,null);
 const tela=calcularTicketNaTela({...dados,atendimentos:'0'});
 assert.ok(tela.linhas.some(([k,v])=>k==='Taxa de conversão atual'&&v==='Não calculável'));
});
test('sem vendas e faturamento zero, ticket é não calculável',()=>{
 const r=analisarVendas({faturamentoCentavos:0,pedidos:0,atendimentos:100});
 assert.equal(r.ticketCentavos,null);
 assert.equal(r.conversao,0);
 assert.equal(r.faturamentoProjetadoCentavos,null);
});
test('cenários não ultrapassam 100% de conversão',()=>{
 const r=analisarVendas({faturamentoCentavos:10000,pedidos:8,atendimentos:10,aumentoConversao:100});
 assert.equal(r.conversaoProjetada,1);
 assert.equal(r.pedidosEstimados,10);
});
test('rejeita inconsistências de pedido, receita, aumento e visitantes',()=>{
 for(const [campo,valor] of [['pedidos','0'],['atendimentos','10'],['aumentoTicket','1001'],
  ['aumentoConversao','-1'],['faturamento','-1']]) {
  assert.throws(()=>calcularTicketNaTela({...dados,[campo]:valor}),
   e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});
