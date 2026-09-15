import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularContagemDeConvidados } from '../scripts/cálculos/calcular-contagem-de-convidados.js';

test('exemplo do catálogo: 8 confirmados, 2 pendentes → totais separados', () => {
  const convidados = [
    ...Array.from({ length: 8 }, () => ({ estado: 'confirmado' })),
    ...Array.from({ length: 2 }, () => ({ estado: 'pendente' })),
  ];
  const resultado = calcularContagemDeConvidados(convidados);
  assert.equal(resultado.confirmados, 8);
  assert.equal(resultado.pendentes, 2);
  assert.equal(resultado.totalDeConvidados, 10);
});

test('separa adultos e crianças entre os confirmados', () => {
  const resultado = calcularContagemDeConvidados([
    { estado: 'confirmado', éCriança: false },
    { estado: 'confirmado', éCriança: true },
    { estado: 'recusado', éCriança: true },
  ]);
  assert.equal(resultado.adultosConfirmados, 1);
  assert.equal(resultado.criançasConfirmadas, 1);
  assert.equal(resultado.recusados, 1);
});

test('lista vazia não gera erro', () => {
  const resultado = calcularContagemDeConvidados([]);
  assert.equal(resultado.válido, true);
  assert.equal(resultado.totalDeConvidados, 0);
});

test('estado desconhecido ou ausente conta como pendente', () => {
  const resultado = calcularContagemDeConvidados([{}, { estado: 'algo-estranho' }]);
  assert.equal(resultado.pendentes, 2);
});
