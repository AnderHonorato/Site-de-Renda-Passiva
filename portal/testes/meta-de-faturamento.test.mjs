import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distribuirMeta,calcularMetaNaTela} from '../scripts/ferramentas/meta-de-faturamento.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const dados={meta:'30000',faturado:'10000',dias:'22',restantes:'10',vendedores:'2',ticket:'200'};
test('meta calcula metas diária, semanal e por vendedor',()=>{
 const r=distribuirMeta({metaCentavos:3000000,faturadoCentavos:1000000,diasUteis:22,diasRestantes:10,vendedores:2,ticketCentavos:20000});
 assert.equal(r.restanteCentavos,2000000);
 assert.equal(r.porDiaCentavos,200000);
 assert.equal(r.porDiaVendedorCentavos,100000);
 assert.equal(r.semanaCentavos,1000000);
 assert.equal(r.vendasRestantes,100);
 assert.equal(r.vendasPorDia,10);
 assert.match(calcularMetaNaTela(dados).resumo,/10 dia/);
});
test('quando meta foi superada, falta e metas novas ficam zeradas',()=>{
 const r=distribuirMeta({metaCentavos:10000,faturadoCentavos:20000,diasUteis:20,diasRestantes:0,vendedores:2,ticketCentavos:1000});
 assert.equal(r.atingida,true);
 assert.equal(r.restanteCentavos,0);
 assert.equal(r.porDiaCentavos,null);
 assert.equal(r.vendasRestantes,0);
});
test('prazo esgotado não oferece meta diária fictícia',()=>{
 const r=calcularMetaNaTela({...dados,restantes:'0'});
 assert.match(r.resumo,/Prazo/);
 assert.ok(r.linhas.some(([k,v])=>k==='Meta por dia útil restante'&&v==='Sem dias úteis restantes'));
});
test('valida dias restantes, ticket, equipe e valores negativos',()=>{
 for(const [chave,valor,campo] of [
  ['restantes','23','restantes'],['dias','0','dias'],['vendedores','0','vendedores'],
  ['ticket','-1','ticket'],['meta','0','meta'],['faturado','-1','faturado'],
 ])assert.throws(()=>calcularMetaNaTela({...dados,[chave]:valor}),
  e=>e instanceof ErroDeEntrada&&e.campo===campo,chave);
});
