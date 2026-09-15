import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDivisãoDeDespesas } from '../scripts/cálculos/calcular-divisao-de-despesas.js';

test('exemplo do catálogo: R$ 300 entre 4 pagantes → R$ 75 para cada', () => {
  const resultado = calcularDivisãoDeDespesas({ totalInformadoEmCentavos: 30000, pagantes: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }, { nome: 'D' }], modo: 'igual' });
  assert.equal(resultado.válido, true);
  assert.deepEqual(resultado.partes.map((parte) => parte.valorEmCentavos), [7500, 7500, 7500, 7500]);
});

test('zero pagantes: mensagem clara, sem dividir por zero', () => {
  const resultado = calcularDivisãoDeDespesas({ totalInformadoEmCentavos: 10000, pagantes: [], modo: 'igual' });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /pagante/);
});

test('divisão por pesos: proporcional e soma exata ao total, mesmo com resto de centavos', () => {
  const resultado = calcularDivisãoDeDespesas({
    totalInformadoEmCentavos: 10000,
    pagantes: [{ nome: 'Casal', peso: 2 }, { nome: 'Solteiro', peso: 1 }],
    modo: 'pesos',
  });
  assert.equal(resultado.válido, true);
  assert.deepEqual(resultado.partes.map((parte) => parte.valorEmCentavos), [6667, 3333]);
  const soma = resultado.partes.reduce((total, parte) => total + parte.valorEmCentavos, 0);
  assert.equal(soma, resultado.totalEmCentavos);
});

test('lista de gastos soma corretamente e ignora total informado à parte', () => {
  const resultado = calcularDivisãoDeDespesas({
    itens: [{ descrição: 'Carne', valor: 180.5 }, { descrição: 'Bebidas', valor: 119.5 }],
    pagantes: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }],
    modo: 'igual',
  });
  assert.equal(resultado.totalEmCentavos, 30000);
  const soma = resultado.partes.reduce((total, parte) => total + parte.valorEmCentavos, 0);
  assert.equal(soma, 30000);
});

test('peso inválido, total zero e nome vazio são recusados', () => {
  assert.equal(calcularDivisãoDeDespesas({ totalInformadoEmCentavos: 1000, pagantes: [{ nome: 'A', peso: 0 }], modo: 'pesos' }).válido, false);
  assert.equal(calcularDivisãoDeDespesas({ totalInformadoEmCentavos: 0, pagantes: [{ nome: 'A' }], modo: 'igual' }).válido, false);
  assert.equal(calcularDivisãoDeDespesas({ totalInformadoEmCentavos: 1000, pagantes: [{ nome: '  ' }], modo: 'igual' }).válido, false);
});
