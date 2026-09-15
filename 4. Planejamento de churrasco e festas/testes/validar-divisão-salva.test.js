import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarDivisãoSalva } from '../scripts/validação/validar-divisão-salva.js';

const válido = { nome: 'Rateio do almoço', modo: 'igual', itens: [{ descrição: 'Carnes', valor: 180.5 }], pagantes: [{ nome: 'Ana', peso: 1 }, { nome: 'Bia', peso: 1 }] };

test('registro bem formado é aceito', () => {
  assert.equal(validarDivisãoSalva(válido), true);
});

test('registros adulterados são recusados', () => {
  assert.equal(validarDivisãoSalva(null), false);
  assert.equal(validarDivisãoSalva({ ...válido, modo: 'sorteio' }), false);
  assert.equal(validarDivisãoSalva({ ...válido, pagantes: [] }), false);
  assert.equal(validarDivisãoSalva({ ...válido, pagantes: [{ nome: '', peso: 1 }] }), false);
  assert.equal(validarDivisãoSalva({ ...válido, pagantes: [{ nome: 'Ana', peso: -1 }] }), false);
  assert.equal(validarDivisãoSalva({ ...válido, itens: [{ descrição: 'X', valor: -5 }] }), false);
  assert.equal(validarDivisãoSalva({ ...válido, nome: 'x'.repeat(121) }), false);
});
