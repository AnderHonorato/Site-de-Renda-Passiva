import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autorizadoParaDesligar } from '../../servidor/servidor-controle.js';

test('autorizadoParaDesligar: aceita 127.0.0.1 com token certo', () => {
  assert.equal(
    autorizadoParaDesligar({ enderecoRemoto: '127.0.0.1', tokenRecebido: 'segredo', tokenEsperado: 'segredo' }),
    true,
  );
});

test('autorizadoParaDesligar: aceita ::1 com token certo', () => {
  assert.equal(
    autorizadoParaDesligar({ enderecoRemoto: '::1', tokenRecebido: 'segredo', tokenEsperado: 'segredo' }),
    true,
  );
});

test('autorizadoParaDesligar: recusa endereço remoto não local', () => {
  assert.equal(
    autorizadoParaDesligar({ enderecoRemoto: '10.0.0.5', tokenRecebido: 'segredo', tokenEsperado: 'segredo' }),
    false,
  );
});

test('autorizadoParaDesligar: recusa token errado', () => {
  assert.equal(
    autorizadoParaDesligar({ enderecoRemoto: '127.0.0.1', tokenRecebido: 'errado', tokenEsperado: 'segredo' }),
    false,
  );
});

test('autorizadoParaDesligar: recusa token ausente', () => {
  assert.equal(
    autorizadoParaDesligar({ enderecoRemoto: '127.0.0.1', tokenRecebido: undefined, tokenEsperado: 'segredo' }),
    false,
  );
});
