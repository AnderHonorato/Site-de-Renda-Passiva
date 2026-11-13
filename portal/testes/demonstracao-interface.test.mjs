import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlDemonstracao, formatoDemo } from '../scripts/núcleo/demonstracao-html.js';
import { validarDemonstracao } from '../scripts/núcleo/demonstracoes.js';

const demo = () => ({ slug:'teste-premium',nome:'Análise de exemplo',plano:'premium',tipo:'calculado',
  entrada:{rotulo:'CSV',colunas:['x','y'],linhas:[[1,2]]},indicadores:[['Inclinação',.6]],
  tabela:{colunas:['x','y'],linhas:[[1,2]]},series:[{rotulo:'A',valor:2}],metodo:'Método do exemplo.',notas:[],exporta:['pdf','xlsx','txt'] });

test('a demonstração contém resultado sem JavaScript, controles reais e dados escapados sem scripts inline', () => {
  const d=demo();d.nome='Exemplo </template><script>alert(1)</script>';
  const html=htmlDemonstracao(d);
  assert.ok(html.includes('Ver os dados e o resultado em texto'));
  assert.ok(html.includes('<th scope="col">x</th>'));
  assert.ok(html.includes('<dd>0,6</dd>'));
  assert.ok(html.includes('data-demo-cena="12"'));
  assert.ok(html.includes('data-demo-repetir'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.doesNotMatch(html, /<script|<form|type="file"|onclick=/i);
});

test('validação da amostra recusa séries inválidas, tabelas enormes e metadados inesperados', () => {
  assert.equal(validarDemonstracao(demo()).slug,'teste-premium');
  for(const alterar of [d=>{d.series[0].valor=Infinity;},d=>{d.plano='admin';},d=>{d.slug='../api/conta';},d=>{d.tabela.linhas=Array.from({length:50},()=>[1]);}]){
    const d=demo();alterar(d);assert.throws(()=>validarDemonstracao(d));
  }
});

test('valores pequenos preservam sua ordem de grandeza e não viram zero', () => {
  assert.match(formatoDemo(.00000001),/e-8/);
  assert.equal(formatoDemo(.6),'0,6');
  assert.equal(formatoDemo(null),'—');
});
