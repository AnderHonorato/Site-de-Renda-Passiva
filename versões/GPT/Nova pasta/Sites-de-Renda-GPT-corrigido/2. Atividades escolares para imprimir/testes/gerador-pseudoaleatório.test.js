import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarGeradorPseudoaleatório, sementeAPartirDeTexto } from '../scripts/geração/criar-gerador-pseudoaleatório.js';

test('a mesma semente produz sempre a mesma sequência', () => {
  const a = criarGeradorPseudoaleatório(42);
  const b = criarGeradorPseudoaleatório(42);
  for (let índice = 0; índice < 20; índice += 1) {
    assert.equal(a.decimal(), b.decimal());
  }
});

test('sementes diferentes tendem a produzir sequências diferentes', () => {
  const a = criarGeradorPseudoaleatório(1);
  const b = criarGeradorPseudoaleatório(2);
  const sequênciaA = Array.from({ length: 10 }, () => a.decimal());
  const sequênciaB = Array.from({ length: 10 }, () => b.decimal());
  assert.notDeepEqual(sequênciaA, sequênciaB);
});

test('inteiroEntre respeita os limites, incluindo as pontas', () => {
  const gerador = criarGeradorPseudoaleatório(7);
  for (let índice = 0; índice < 200; índice += 1) {
    const valor = gerador.inteiroEntre(3, 5);
    assert.ok(valor >= 3 && valor <= 5, `${valor} fora de [3,5]`);
    assert.ok(Number.isInteger(valor));
  }
});

test('embaralhar não altera a lista original e preserva os elementos', () => {
  const gerador = criarGeradorPseudoaleatório(9);
  const original = [1, 2, 3, 4, 5];
  const embaralhada = gerador.embaralhar(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...embaralhada].sort(), [1, 2, 3, 4, 5]);
});

test('sementeAPartirDeTexto é determinística', () => {
  assert.equal(sementeAPartirDeTexto('Folha Pronta'), sementeAPartirDeTexto('Folha Pronta'));
  assert.notEqual(sementeAPartirDeTexto('a'), sementeAPartirDeTexto('b'));
});
