import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCronogramaDoEvento } from '../scripts/cálculos/calcular-cronograma-do-evento.js';

test('exemplo do catálogo: festa às 18h, montagem de 2h → início às 16h', () => {
  const resultado = calcularCronogramaDoEvento({ horárioDaFesta: '18:00', etapas: [{ nome: 'Montagem', duraçãoEmMinutos: 120 }] });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.horárioDeInício, '16:00');
  assert.equal(resultado.etapas[0].início, '16:00');
  assert.equal(resultado.etapas[0].fim, '18:00');
});

test('várias etapas são encadeadas da festa para trás, na ordem informada', () => {
  const resultado = calcularCronogramaDoEvento({
    horárioDaFesta: '19:00',
    etapas: [
      { nome: 'Compras', duraçãoEmMinutos: 90 },
      { nome: 'Preparo', duraçãoEmMinutos: 60 },
      { nome: 'Montagem', duraçãoEmMinutos: 30 },
    ],
  });
  assert.equal(resultado.etapas[0].início, '16:00');
  assert.equal(resultado.etapas[0].fim, '17:30');
  assert.equal(resultado.etapas[1].início, '17:30');
  assert.equal(resultado.etapas[1].fim, '18:30');
  assert.equal(resultado.etapas[2].início, '18:30');
  assert.equal(resultado.etapas[2].fim, '19:00');
});

test('cruza a meia-noite corretamente quando a preparação começa no dia anterior', () => {
  const resultado = calcularCronogramaDoEvento({ horárioDaFesta: '01:00', etapas: [{ nome: 'Montagem', duraçãoEmMinutos: 180 }] });
  assert.equal(resultado.horárioDeInício, '22:00');
  assert.equal(resultado.etapas[0].começaNoDiaAnterior, true);
});

test('recusa horário inválido, lista vazia e duração fora da faixa', () => {
  assert.equal(calcularCronogramaDoEvento({ horárioDaFesta: '25:00', etapas: [{ nome: 'A', duraçãoEmMinutos: 30 }] }).válido, false);
  assert.equal(calcularCronogramaDoEvento({ horárioDaFesta: '18:00', etapas: [] }).válido, false);
  assert.equal(calcularCronogramaDoEvento({ horárioDaFesta: '18:00', etapas: [{ nome: 'A', duraçãoEmMinutos: 0 }] }).válido, false);
});
