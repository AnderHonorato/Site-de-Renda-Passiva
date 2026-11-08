import test from 'node:test';
import assert from 'node:assert/strict';
import { configurarNuvem, origemAutomaticaNorthflank } from '../ferramentas/iniciar-nuvem.mjs';

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
  assert.equal(configurarNuvem({ ...valido, URL_PUBLICA: 'https://127.example.com' }).origem, 'https://127.example.com');
  for (const [chave, valor] of [
    ['NODE_ENV', 'development'], ['PORT', '0'], ['PORT', 'abc'],
    ['URL_PUBLICA', 'http://portal-teste.up.railway.app'],
    ['URL_PUBLICA', 'https://localhost'], ['URL_PUBLICA', 'https://127.0.0.1'],
    ['URL_PUBLICA', 'https://[::1]'], ['URL_PUBLICA', 'https://servico.localhost'],
    ['URL_PUBLICA', 'https://localhost.'], ['URL_PUBLICA', 'https://127.2.3.4'],
    ['URL_PUBLICA', 'https://portal.test.'], ['URL_PUBLICA', 'https://portal.invalid.'], ['URL_PUBLICA', 'https://portal.local.'],
    ['URL_PUBLICA', 'https://[::ffff:127.0.0.1]'],
    ['URL_PUBLICA', 'https://portal-teste.up.railway.app/portal/'],
    ['URL_PUBLICA', 'https://usuario:senha@portal-teste.up.railway.app'],
    ['PORTAL_BANCO', 'servidor/.execucao/portal.sqlite'],
    ['PORTAL_CHAT_LOCAL', '1'], ['PORTAL_CHAT_PUBLICO', '1'],
  ]) assert.throws(() => configurarNuvem({ ...valido, [chave]: valor }), undefined, chave);
});

test('Northflank aceita um único domínio HTTPS code.run injetado, sem cabeçalhos do navegador', () => {
  const h='web--sites-ads--sandbox--example.code.run';
  const {URL_PUBLICA: descartada, ...semUrl}=valido;
  const nf={...semUrl,NF_PROJECT_ID:'sites-ads',NF_HOSTS:h};
  assert.equal(origemAutomaticaNorthflank(nf),'https://'+h);
  assert.equal(configurarNuvem(nf).origem,'https://'+h);
  assert.equal(configurarNuvem({...nf,URL_PUBLICA:'https://portal.exemplo.com'}).origem,'https://portal.exemplo.com');
  for (const hosts of ['',h+','+h,'evil.example.com','portal.test']){
    assert.equal(origemAutomaticaNorthflank({...nf,NF_HOSTS:hosts}),null);
    assert.throws(()=>configurarNuvem({...nf,NF_HOSTS:hosts}),/URL_PUBLICA/);
  }
  assert.equal(origemAutomaticaNorthflank({...nf,NF_PROJECT_ID:''}),null);
});
