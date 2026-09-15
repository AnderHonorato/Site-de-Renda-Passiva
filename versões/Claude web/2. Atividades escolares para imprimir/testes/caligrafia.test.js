import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFolhaDeCaligrafia } from '../scripts/cálculos/calcular-folha-de-caligrafia.js';
import { validarCaligrafiaSalva } from '../scripts/validação/validar-caligrafia-salva.js';

test('gera as três linhas-guia (base, x-altura e ascendente) em ordem crescente de altura', () => {
  const folha = calcularFolhaDeCaligrafia({ texto: 'João', repetições: 5, quantidadeDeLinhas: 4, tamanhoDaLetra: 28 });
  assert.equal(folha.válido, true);
  for (const linha of folha.linhas) {
    assert.ok(linha.ascendenteYMm < linha.xAlturaYMm);
    assert.ok(linha.xAlturaYMm < linha.baselineYMm);
  }
});

test('preserva acentos do texto do responsável', () => {
  const folha = calcularFolhaDeCaligrafia({ texto: 'João', repetições: 3, quantidadeDeLinhas: 2, tamanhoDaLetra: 24 });
  assert.equal(folha.texto, 'João');
});

test('a primeira repetição de cada linha é o modelo sólido; as demais são para cobrir (contorno)', () => {
  const folha = calcularFolhaDeCaligrafia({ texto: 'sol', repetições: 6, quantidadeDeLinhas: 2, tamanhoDaLetra: 24 });
  for (const linha of folha.linhas) {
    assert.equal(linha.repetições[0].contorno, false);
    for (const repetição of linha.repetições.slice(1)) assert.equal(repetição.contorno, true);
  }
});

test('nunca gera mais linhas ou repetições do que cabem na página A4', () => {
  const folha = calcularFolhaDeCaligrafia({ texto: 'abcdefghijklmnop', repetições: 30, quantidadeDeLinhas: 40, tamanhoDaLetra: 60 });
  assert.equal(folha.válido, true);
  assert.ok(folha.linhasReais <= folha.linhasSolicitadas);
  assert.ok(folha.repetiçõesReais <= folha.repetiçõesSolicitadas);
  assert.equal(folha.limitadoPelaPágina, true);
  for (const linha of folha.linhas) {
    assert.ok(linha.baselineYMm <= folha.alturaPáginaMm - folha.margemMm + 0.01);
    for (const repetição of linha.repetições) assert.ok(repetição.xMm >= folha.margemMm - 0.01);
  }
});

test('a mesma configuração é sempre determinística (mesma geometria)', () => {
  const opções = { texto: 'ana', repetições: 8, quantidadeDeLinhas: 5, tamanhoDaLetra: 22 };
  assert.deepEqual(calcularFolhaDeCaligrafia(opções), calcularFolhaDeCaligrafia(opções));
});

test('rejeita texto vazio, longo demais ou tamanho de letra fora da faixa', () => {
  assert.equal(calcularFolhaDeCaligrafia({ texto: '', repetições: 3, quantidadeDeLinhas: 3, tamanhoDaLetra: 20 }).válido, false);
  assert.equal(calcularFolhaDeCaligrafia({ texto: 'x'.repeat(50), repetições: 3, quantidadeDeLinhas: 3, tamanhoDaLetra: 20 }).válido, false);
  assert.equal(calcularFolhaDeCaligrafia({ texto: 'ana', repetições: 3, quantidadeDeLinhas: 3, tamanhoDaLetra: 5 }).válido, false);
});

test('validador de caligrafia salva recusa dados adulterados', () => {
  const válido = { nome: 'Nome do João', texto: 'João', repetições: 6, quantidadeDeLinhas: 5, tamanhoDaLetra: 28, comCabeçalho: true, tituloDaAtividade: 'Caligrafia' };
  assert.equal(validarCaligrafiaSalva(válido), true);
  assert.equal(validarCaligrafiaSalva({ ...válido, texto: '' }), false);
  assert.equal(validarCaligrafiaSalva({ ...válido, tamanhoDaLetra: 5 }), false);
  assert.equal(validarCaligrafiaSalva(null), false);
});
