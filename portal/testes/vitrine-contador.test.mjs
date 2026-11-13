import test from 'node:test';
import assert from 'node:assert/strict';
import { colunasDoContador } from '../vitrine/vitrine-contador.js';

const exibido = (valor, total) => colunasDoContador(valor, total).map(c => Math.floor(c.continuo) % 10).join('');

test('odômetro mostra o total completo, sem cortar centenas ou milhares', () => {
  for (const total of [0, 9, 49, 99, 100, 250, 351, 999, 1000]) assert.equal(exibido(total, total), String(total));
});

test('virada sincroniza cada casa somente no último passo da unidade inferior', () => {
  assert.deepEqual(colunasDoContador(199.5, 250).map(c => c.continuo), [1.5, 19.5, 199.5]);
  assert.equal(exibido(200, 250), '200');
  assert.equal(exibido(250, 250), '250');
  assert.deepEqual(colunasDoContador(0, 250).map(c => c.opacidade), [0, 0, 1]);
});
