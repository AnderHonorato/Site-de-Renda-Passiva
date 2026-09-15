import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularOrçamentoDoEvento } from '../scripts/cálculos/calcular-orçamento-do-evento.js';

test('exemplo do catálogo: itens R$ 400 + reserva de 10% → R$ 440', () => {
  const resultado = calcularOrçamentoDoEvento({ itens: [{ descrição: 'Carnes', valor: 250 }, { descrição: 'Buffet', valor: 150 }], reservaPercentual: 10 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.subtotalEmCentavos, 40000);
  assert.equal(resultado.reservaEmCentavos, 4000);
  assert.equal(resultado.totalEmCentavos, 44000);
});

test('total dos itens é sempre igual ao subtotal exibido (soma exata, sem perda de centavo)', () => {
  const itens = [{ descrição: 'A', valor: 33.33 }, { descrição: 'B', valor: 66.67 }, { descrição: 'C', valor: 10.01 }];
  const resultado = calcularOrçamentoDoEvento({ itens, reservaPercentual: 0 });
  const soma = resultado.itens.reduce((total, item) => total + item.valorEmCentavos, 0);
  assert.equal(soma, resultado.subtotalEmCentavos);
  assert.equal(resultado.totalEmCentavos, resultado.subtotalEmCentavos);
});

test('sem reserva, o total é igual ao subtotal', () => {
  const resultado = calcularOrçamentoDoEvento({ itens: [{ descrição: 'Som', valor: 500, categoria: 'serviço' }], reservaPercentual: 0 });
  assert.equal(resultado.totalEmCentavos, 50000);
  assert.equal(resultado.itens[0].categoria, 'serviço');
});

test('recusa lista vazia, valor negativo e reserva fora da faixa', () => {
  assert.equal(calcularOrçamentoDoEvento({ itens: [], reservaPercentual: 10 }).válido, false);
  assert.equal(calcularOrçamentoDoEvento({ itens: [{ descrição: 'X', valor: -1 }], reservaPercentual: 0 }).válido, false);
  assert.equal(calcularOrçamentoDoEvento({ itens: [{ descrição: 'X', valor: 10 }], reservaPercentual: 100 }).válido, false);
  assert.equal(calcularOrçamentoDoEvento({ itens: [{ descrição: '', valor: 10 }], reservaPercentual: 0 }).válido, false);
});
