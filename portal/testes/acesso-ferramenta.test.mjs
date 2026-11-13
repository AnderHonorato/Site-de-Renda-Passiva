import test from 'node:test';
import assert from 'node:assert/strict';
import { temAcessoFerramenta } from '../scripts/núcleo/acesso-ferramenta.js';

test('ferramentas públicas continuam acessíveis sem consultar plano ou login', () => {
  assert.equal(temAcessoFerramenta('gratuito', null), true);
});

test('visitantes e contas gratuitas não têm acesso a ferramentas pagas', () => {
  for (const plano of ['plus', 'premium']) {
    assert.equal(temAcessoFerramenta(plano, null), false);
    assert.equal(temAcessoFerramenta(plano, { plano: 'gratuito' }), false);
    assert.equal(temAcessoFerramenta(plano, { plano: 'desconhecido' }), false);
  }
});

test('Plus libera Plus; Premium inclui Plus e Premium', () => {
  assert.equal(temAcessoFerramenta('plus', { plano: 'plus' }), true);
  assert.equal(temAcessoFerramenta('premium', { plano: 'plus' }), false);
  assert.equal(temAcessoFerramenta('plus', { plano: 'premium' }), true);
  assert.equal(temAcessoFerramenta('premium', { plano: 'premium' }), true);
});

test('admin mantém acesso operacional, mas conta suspensa ou plano inválido não libera', () => {
  assert.equal(temAcessoFerramenta('premium', { papel: 'admin', plano: 'gratuito' }), true);
  assert.equal(temAcessoFerramenta('premium', { papel: 'admin', situacao: 'suspenso' }), false);
  assert.equal(temAcessoFerramenta('plus', { plano: 'premium', situacao: 'suspenso' }), false);
  assert.equal(temAcessoFerramenta('desconhecido', { papel: 'admin' }), false);
});
