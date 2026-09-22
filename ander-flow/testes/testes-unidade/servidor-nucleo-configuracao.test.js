import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

test('carregarConfiguracao: valores padrão em ambiente vazio', () => {
  const configuracao = carregarConfiguracao({});
  assert.equal(configuracao.porta, 4870);
  assert.equal(configuracao.portaFinal, 4889);
  assert.deepEqual([...configuracao.portasProibidas], [3000, 3001, 4200, 5000, 5173, 5500, 8000, 8080, 8888]);
  assert.equal(configuracao.ambiente, 'desenvolvimento');
  assert.equal(configuracao.emProducao, false);
  assert.equal(configuracao.trustProxy, false);
  assert.equal(configuracao.sessaoDias, 30);
  assert.equal(configuracao.emailModo, 'arquivo');
  assert.equal(configuracao.logNivel, 'info');
  assert.equal(configuracao.limiteCorpo, '100kb');
  assert.match(configuracao.bancoCaminho, /ander-flow\.sqlite$/);
  assert.ok(configuracao.planos.planos.length >= 2);
  assert.equal(configuracao.urlPublica, 'http://localhost:4870');
});

test('carregarConfiguracao: é congelado (Object.freeze)', () => {
  const configuracao = carregarConfiguracao({});
  assert.throws(() => {
    configuracao.porta = 9999;
  });
});

test('carregarConfiguracao: lê overrides válidos do ambiente', () => {
  const configuracao = carregarConfiguracao({
    AMBIENTE: 'producao',
    PORTA: '5900',
    PORTA_FINAL: '5910',
    LOG_NIVEL: 'debug',
    TRUST_PROXY: 'true',
    URL_PUBLICA: 'https://exemplo.com',
    BANCO_CAMINHO: 'banco/dados/outro.sqlite',
  });
  assert.equal(configuracao.ambiente, 'producao');
  assert.equal(configuracao.emProducao, true);
  assert.equal(configuracao.porta, 5900);
  assert.equal(configuracao.portaFinal, 5910);
  assert.equal(configuracao.logNivel, 'debug');
  assert.equal(configuracao.trustProxy, true);
  assert.equal(configuracao.urlPublica, 'https://exemplo.com');
  assert.match(configuracao.bancoCaminho, /outro\.sqlite$/);
});

test('carregarConfiguracao: rejeita AMBIENTE inválido', () => {
  assert.throws(() => carregarConfiguracao({ AMBIENTE: 'testando' }), /AMBIENTE inválido/);
});

test('carregarConfiguracao: rejeita PORTA inválida', () => {
  assert.throws(() => carregarConfiguracao({ PORTA: 'abc' }), /PORTA inválida/);
  assert.throws(() => carregarConfiguracao({ PORTA: '-1' }), /PORTA inválida/);
  assert.throws(() => carregarConfiguracao({ PORTA: '0' }), /PORTA inválida/);
});

test('carregarConfiguracao: rejeita PORTA_FINAL menor que PORTA', () => {
  assert.throws(() => carregarConfiguracao({ PORTA: '4880', PORTA_FINAL: '4870' }), /PORTA_FINAL/);
});

test('carregarConfiguracao: rejeita LOG_NIVEL inválido', () => {
  assert.throws(() => carregarConfiguracao({ LOG_NIVEL: 'grito' }), /LOG_NIVEL inválido/);
});

test('carregarConfiguracao: rejeita TRUST_PROXY inválido', () => {
  assert.throws(() => carregarConfiguracao({ TRUST_PROXY: 'talvez' }), /TRUST_PROXY inválido/);
});
