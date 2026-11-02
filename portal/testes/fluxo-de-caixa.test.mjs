import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarFluxoDeCaixa, calcularFluxoNaTela } from '../scripts/ferramentas/fluxo-de-caixa.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { formatarMoeda } from '../scripts/comum/formatação/formatar-moeda.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';

const base = { saldoInicial: '100,00', dataCorte: '2026-11-02',
  lancamentos: '05/11/2026; aluguel; saída; 900\n02/11/2026; venda; entrada; 1.200,00' };
test('fluxo ordena por dia e separa saldo atual do projetado', () => {
  const r = calcularFluxoNaTela(base);
  assert.equal(r.valor, formatarMoeda(1300));
  assert.equal(Object.fromEntries(r.linhas)['Saldo projetado (todos os lançamentos)'], formatarMoeda(400));
  assert.deepEqual(r.tabela.linhas.map((l) => l[1]), ['venda', 'aluguel']);
  assert.equal(r.tabela.linhas[1][2], 'Saída prevista');
  assert.match(r.texto, /aluguel/);
  assert.equal(r.arquivos.length, 1);
});
test('fluxo avisa data de primeiro saldo negativo e não simula receitas ausentes', () => {
  const r = calcularFluxoNaTela({ saldoInicial: '0', dataCorte: '2026-11-02',
    lancamentos: '03/11/2026; compra; saída; 10\n04/11/2026; venda; entrada; 11' });
  assert.match(r.observações[0], /03\/11\/2026/);
  assert.equal(r.tabela.linhas[0][4], formatarMoeda(-10));
});
test('movimentos no mesmo dia mantêm a ordem informada', () => {
  const r = calcularFluxoNaTela({ saldoInicial: '', dataCorte: '2026-11-02',
    lancamentos: '02/11/2026; primeira; entrada; 0,01\n02/11/2026; segunda; saída; 0,01' });
  assert.equal(r.tabela.linhas[0][4], formatarMoeda(0.01));
  assert.equal(r.tabela.linhas[1][4], formatarMoeda(0));
});
test('fluxo rejeita campos incorretos sem arredondar dinheiro abaixo de um centavo', () => {
  for (const [chave, valor, campo] of [
    ['lancamentos', '30/02/2026; erro; entrada; 10', 'lancamentos'],
    ['lancamentos', '02/11/2026; erro; outro; 10', 'lancamentos'],
    ['lancamentos', '02/11/2026; erro; entrada; 0,004', 'lancamentos'],
    ['lancamentos', '02/11/2026; erro; entrada; -2', 'lancamentos'],
    ['lancamentos', '02/11/2026; sem valor', 'lancamentos'],
    ['dataCorte', '2026-02-30', 'dataCorte'],
  ]) {
    assert.throws(() => calcularFluxoNaTela({ ...base, [chave]: valor }), (e) => e instanceof ErroDeEntrada && e.campo === campo);
  }
});
test('fluxo recusa saldos que ultrapassam precisão e muitos lançamentos', () => {
  assert.throws(() => calcularFluxoNaTela({ ...base, lancamentos: Array(101).fill('02/11/2026; venda; entrada; 1').join('\n') }), /100 lançamentos/);
  assert.throws(() => analisarFluxoDeCaixa({ saldoInicialCentavos: Number.MAX_SAFE_INTEGER,
    dataCorte: '2026-11-02', lançamentos: [] }), /Saldo inicial/);
});
test('PDF do fluxo tem cabeçalho e é entregue em formato válido', async () => {
  const saida = calcularFluxoNaTela(base);
  const { nome, tipo, bytes } = await arquivoBaixado(saida.arquivos[0].gerar);
  assert.equal(nome, 'fluxo-de-caixa.pdf');
  assert.equal(tipo, 'application/pdf');
  assert.match(new TextDecoder('latin1').decode(bytes.slice(0, 8)), /%PDF-1/);
});
