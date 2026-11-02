import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarTabuada } from '../scripts/cálculos/gerar-tabuada.js';
import { validarTabuadaSalva } from '../scripts/validação/validar-tabuada-salva.js';

test('gera a tabuada do 7 de 1 a 10 com respostas corretas, em ordem sequencial', () => {
  const tabuada = gerarTabuada({ fatores: [7], multiplicadorMínimo: 1, multiplicadorMáximo: 10, ordem: 'sequencial', semente: 1 });
  assert.equal(tabuada.válido, true);
  assert.equal(tabuada.itens.length, 10);
  assert.equal(tabuada.itens[0].multiplicador, 1);
  assert.equal(tabuada.itens[9].multiplicador, 10);
  assert.equal(tabuada.itens[9].resposta, 70);
  for (const item of tabuada.itens) assert.equal(item.resposta, item.fator * item.multiplicador);
});

test('vários fatores multiplicam a quantidade de itens', () => {
  const tabuada = gerarTabuada({ fatores: [2, 5, 7], multiplicadorMínimo: 1, multiplicadorMáximo: 10, semente: 1 });
  assert.equal(tabuada.itens.length, 30);
});

test('ordem embaralhada mantém os mesmos itens, só muda a ordem, e é reprodutível pela semente', () => {
  const opções = { fatores: [3, 4], multiplicadorMínimo: 1, multiplicadorMáximo: 10, ordem: 'embaralhada', semente: 99 };
  const primeira = gerarTabuada(opções);
  const segunda = gerarTabuada(opções);
  assert.deepEqual(primeira.itens, segunda.itens);

  const sequencial = gerarTabuada({ ...opções, ordem: 'sequencial' });
  const comparar = (lista) => lista.map((item) => `${item.fator}×${item.multiplicador}`).sort();
  assert.deepEqual(comparar(primeira.itens), comparar(sequencial.itens));
});

test('rejeita fatores vazios, intervalo inválido e combinação grande demais', () => {
  assert.equal(gerarTabuada({ fatores: [], multiplicadorMínimo: 1, multiplicadorMáximo: 10 }).válido, false);
  assert.equal(gerarTabuada({ fatores: [2], multiplicadorMínimo: 10, multiplicadorMáximo: 1 }).válido, false);
  assert.equal(gerarTabuada({ fatores: Array.from({ length: 20 }, (_, i) => i), multiplicadorMínimo: 1, multiplicadorMáximo: 1000 }).válido, false);
});

test('validador de tabuada salva recusa dados adulterados', () => {
  const válido = { nome: 'Tabuada do 7', fatores: [7], multiplicadorMínimo: 1, multiplicadorMáximo: 10, ordem: 'sequencial', semente: 1, comCabeçalho: false, tituloDaAtividade: '' };
  assert.equal(validarTabuadaSalva(válido), true);
  assert.equal(validarTabuadaSalva({ ...válido, ordem: 'aleatória' }), false);
  assert.equal(validarTabuadaSalva({ ...válido, fatores: [] }), false);
  assert.equal(validarTabuadaSalva(null), false);
});
