import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarCookieTema, temaEfetivo } from '../../frontend/compartilhado/compartilhado-tema.js';

test('montarCookieTema monta cookie de 1 ano, SameSite=Lax, path=/', () => {
  const cookie = montarCookieTema('escuro');
  assert.match(cookie, /^tema=escuro;/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /SameSite=Lax/);
});

test('temaEfetivo usa a escolha explícita', () => {
  assert.equal(temaEfetivo('claro', true), 'claro');
  assert.equal(temaEfetivo('escuro', false), 'escuro');
});

test('temaEfetivo com "sistema" segue prefers-color-scheme', () => {
  assert.equal(temaEfetivo('sistema', true), 'escuro');
  assert.equal(temaEfetivo('sistema', false), 'claro');
});
