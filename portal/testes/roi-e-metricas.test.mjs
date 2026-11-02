import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMetricas, calcularMetricasNaTela } from '../scripts/ferramentas/roi-e-metricas.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const dados = { investimento: '2000', receita: '5000', anuncios: '1000', receitaAnuncios: '3000',
  clientes: '20', ticket: '250', compras: '3', margem: '40' };
test('métricas calculam ROI, ROAS, CAC de mídia e LTV com premissas explícitas', () => {
  const r = calcularMetricas({ investimentoTotal: 2000, receitaTotal: 5000,
    investimentoAnuncios: 1000, receitaAnuncios: 3000, clientes: 20, ticket: 250,
    comprasPorCliente: 3, margem: 40 });
  assert.equal(r.roi, 150);
  assert.equal(r.roas, 3);
  assert.equal(r.cac, 50);
  assert.equal(r.ltv, 300);
  assert.equal(r.relação, 6);
  const tela = calcularMetricasNaTela(dados);
  assert.equal(tela.valor, '150%');
  assert.equal(Object.fromEntries(tela.linhas)['ROAS de anúncios'], '3 ×');
  assert.match(tela.texto, /CAC de mídia/);
});
test('ausência de gasto ou clientes não causa divisão por zero nem métrica falsa', () => {
  const r = calcularMetricas({ investimentoTotal: 1000, receitaTotal: 0, clientes: 0, ticket: 0 });
  assert.equal(r.roi, -100);
  assert.equal(r.roas, null);
  assert.equal(r.cac, null);
  assert.equal(r.relação, null);
  assert.equal(calcularMetricasNaTela({ investimento: '1000', receita: '0', anuncios: '0',
    receitaAnuncios: '0', clientes: '0', ticket: '0', compras: '1', margem: '100' }).linhas[1][1], 'Não calculável');
});
test('rejeita incoerência entre gastos ou receitas e os totais', () => {
  for (const [chave, valor, campo] of [
    ['investimento', '0', 'investimento'], ['anuncios', '3000', 'anuncios'],
    ['receitaAnuncios', '6000', 'receitaAnuncios'], ['clientes', '1,5', 'clientes'],
    ['compras', '0', 'compras'], ['margem', '101', 'margem'],
  ]) assert.throws(() => calcularMetricasNaTela({ ...dados, [chave]: valor }),
    (e) => e instanceof ErroDeEntrada && e.campo === campo, chave);
});
test('resultado informa limitações de ROI e CAC', () => {
  const r = calcularMetricasNaTela(dados);
  assert.ok(r.observações.some((o) => o.includes('lucro contábil')));
  assert.ok(r.observações.some((o) => o.includes('equipe')));
});
