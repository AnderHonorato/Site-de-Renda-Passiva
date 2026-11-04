import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { tokenSessaoValido } from '../../servidor/seguranca/seguranca-sessao.js';

test('aceita tokens de sessão de 32 bytes em base64url canônico', () => {
  for (let indice = 0; indice < 20; indice++) {
    assert.equal(tokenSessaoValido(randomBytes(32).toString('base64url')), true);
  }
});

test('recusa tokens inválidos, excessivos ou tipos inesperados', () => {
  for (const valor of [null, undefined, {}, 123, '', 'x'.repeat(10000),
    'a'.repeat(42), 'a'.repeat(44), 'a'.repeat(42) + '=',
    'a'.repeat(42) + '%', 'a'.repeat(42) + '/', 'a'.repeat(42) + '\\n']) {
    assert.equal(tokenSessaoValido(valor), false);
  }
});

test('recusa base64url não canônico', () => {
  // Últimos dois bits do último caractere devem ser zero para 32 bytes.
  assert.equal(tokenSessaoValido('A'.repeat(42) + 'B'), false);
});
