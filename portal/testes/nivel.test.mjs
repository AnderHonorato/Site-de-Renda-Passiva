import test from 'node:test';
import assert from 'node:assert/strict';
import { geometriaNivel, nomesAvataresDisponíveis, resumoTempoNaComunidade } from '../scripts/núcleo/nível.js';

test('níveis de ordens diferentes recebem geometria distinta e determinística', () => {
  const níveis = [1, 10, 100, 1_000, 100_000];
  const formas = níveis.map(geometriaNivel);
  assert.deepEqual(níveis.map((nível) => geometriaNivel(nível)), formas);
  assert.equal(new Set(formas.map(({ patamar, cor, pontas, raioExterior }) => `${patamar}:${cor}:${pontas}:${raioExterior}`)).size, níveis.length);
  assert.deepEqual(formas.map(({ nivel, patamar }) => [nivel, patamar]), [[1, 0], [10, 1], [100, 2], [1_000, 3], [100_000, 5]]);
});

test('geometria mantém todos os valores finitos e quantidade de elementos limitada', () => {
  for (const entrada of [0, -10, NaN, Infinity, '999999999999999999999999', '<svg onload=alert(1)>']) {
    const g = geometriaNivel(entrada);
    assert.ok(Number.isFinite(g.nivel));
    assert.ok(Number.isFinite(g.raioExterior));
    assert.ok(g.nivel >= 1 && g.nivel <= 1_000_000_000);
    assert.ok(g.ornamentos.length <= 6);
    assert.ok(g.ornamentos.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  }
  assert.equal(geometriaNivel('<svg onload=alert(1)>').nivel, 1);
});

test('biblioteca de avatares expõe somente desenhos fixos', () => {
  assert.deepEqual(nomesAvataresDisponíveis, ['sol', 'folha', 'estrela']);
});

test('tempo na comunidade apresenta uma duração segura, sem reutilizar o texto da data', () => {
  const agora = Date.UTC(2026, 0, 1);
  assert.deepEqual(resumoTempoNaComunidade(Date.UTC(2025, 0, 1), agora), { título: 'Na comunidade há 1 ano', valor: 1, unidade: 'ano' });
  const inválido = resumoTempoNaComunidade('<svg onload=alert(1)>', agora);
  assert.equal(inválido.título, 'Tempo na comunidade indisponível');
  assert.doesNotMatch(inválido.título, /<|onload/i);
});
