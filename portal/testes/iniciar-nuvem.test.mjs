import test from 'node:test';
import assert from 'node:assert/strict';
import { configurarNuvem } from '../ferramentas/iniciar-nuvem.mjs';

const valido = {
  PORT: '8080', NODE_ENV: 'production',
  URL_PUBLICA: 'https://portal-teste.up.railway.app',
  PORTAL_BANCO: '/data/portal.sqlite',
  PORTAL_CHAT_LOCAL: '0', PORTAL_CHAT_PUBLICO: '0',
};

test('nuvem exige produção HTTPS, banco absoluto persistente e desliga chat público', () => {
  assert.deepEqual(configurarNuvem(valido), {
    porta: 8080, origem: 'https://portal-teste.up.railway.app', banco: '/data/portal.sqlite',
  });
  for (const [chave, valor] of [
    ['NODE_ENV', 'development'], ['PORT', '0'], ['PORT', 'abc'],
    ['URL_PUBLICA', 'http://portal-teste.up.railway.app'],
    ['URL_PUBLICA', 'https://portal-teste.up.railway.app/portal/'],
    ['URL_PUBLICA', 'https://usuario:senha@portal-teste.up.railway.app'],
    ['PORTAL_BANCO', 'servidor/.execucao/portal.sqlite'],
    ['PORTAL_CHAT_LOCAL', '1'], ['PORTAL_CHAT_PUBLICO', '1'],
  ]) assert.throws(() => configurarNuvem({ ...valido, [chave]: valor }), undefined, chave);
});
