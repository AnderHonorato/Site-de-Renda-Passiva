// Testa a regra pura que decide se, ao desligar, avisamos o processo "supervisor de watch"
// (o `node --watch` que envolve o servidor no modo --desenvolver). Ver servidor/servidor.js e
// docs/debate-criticos.md T1: só o desligamento PEDIDO pela rota de controle deve avisar o
// supervisor — um sinal recebido direto (por exemplo, o próprio --watch reiniciando o filho ao
// salvar um arquivo) nunca avisa, senão o auto-reload do modo desenvolver quebra no Linux/macOS.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decidirAvisoAoSupervisor } from '../../servidor/servidor.js';

test('decidirAvisoAoSupervisor: desligamento pela rota de controle, sob --watch, avisa', () => {
  assert.equal(decidirAvisoAoSupervisor({ motivo: 'controle', sobWatch: true }), true);
});

test('decidirAvisoAoSupervisor: desligamento pela rota de controle, fora do --watch, nunca avisa', () => {
  assert.equal(decidirAvisoAoSupervisor({ motivo: 'controle', sobWatch: false }), false);
});

test('decidirAvisoAoSupervisor: sinal recebido direto nunca avisa, mesmo sob --watch', () => {
  assert.equal(decidirAvisoAoSupervisor({ motivo: 'sinal', sobWatch: true }), false);
});

test('decidirAvisoAoSupervisor: sinal recebido direto, fora do --watch, nunca avisa', () => {
  assert.equal(decidirAvisoAoSupervisor({ motivo: 'sinal', sobWatch: false }), false);
});
