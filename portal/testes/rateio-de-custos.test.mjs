import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distribuirCusto, calcularRateioNaTela } from '../scripts/ferramentas/rateio-de-custos.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
test('rateio distribui três partes iguais sem perder centavo', () => {
  const r = distribuirCusto(10000, ['A', 'B', 'C'].map((nome) => ({ nome, peso: 1 })));
  assert.deepEqual(r.itens.map((a) => a.centavos), [3334, 3333, 3333]);
  assert.equal(r.conferênciaCentavos, 10000);
});
test('rateio respeita proporções e total de 1 centavo', () => {
  const r = distribuirCusto(1, [{ nome: 'A', peso: 2 }, { nome: 'B', peso: 1 }]);
  assert.deepEqual(r.itens.map((a) => a.centavos), [1, 0]);
  assert.equal(r.conferênciaCentavos, 1);
  assert.deepEqual(distribuirCusto(30000, [{ nome: 'A', peso: 2 }, { nome: 'B', peso: 1 }])
    .itens.map((a) => a.centavos), [20000, 10000]);
});
test('tela exibe pesos, valores, CSV/Excel e PDF integrados ao montador', () => {
  const r = calcularRateioNaTela({ total: '100,00', itens: 'Produção; 1\nVendas; 1\nAdmin; 1' });
  assert.equal(r.tabela.linhas.length, 3);
  assert.equal(r.tabela.cabeçalho.length, 4);
  assert.match(r.texto, /Produção/);
  assert.match(r.observações[0], /sem sobrar ou faltar centavos/);
  assert.equal(r.arquivos[0].rótulo, 'Resumo em PDF');
});
test('rateio rejeita entrada malformada, duplicatas, pesos inválidos e centavo perdido', () => {
  const base = { total: '10', itens: 'A; 1\nB; 2' };
  for (const [chave, valor, campo] of [
    ['total', '0,001', 'total'], ['itens', 'A; 1', 'itens'],
    ['itens', 'A; 1\na; 2', 'itens'], ['itens', 'A; 0\nB; 1', 'itens'],
    ['itens', 'A; 1; 1\nB; 1', 'itens'], ['itens', 'A; -1\nB; 2', 'itens'],
  ]) assert.throws(() => calcularRateioNaTela({ ...base, [chave]: valor }),
    (e) => e instanceof ErroDeEntrada && e.campo === campo);
});
test('rateio entrega PDF válido para download', async () => {
  const r = calcularRateioNaTela({ total: '100,00', itens: 'A; 2\nB; 1' });
  const { nome, bytes, tipo } = await arquivoBaixado(r.arquivos[0].gerar);
  assert.equal(nome, 'rateio-de-custos.pdf');
  assert.equal(tipo, 'application/pdf');
  assert.match(new TextDecoder('latin1').decode(bytes.slice(0, 8)), /%PDF-1/);
});
