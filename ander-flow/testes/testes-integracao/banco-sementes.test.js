// testes/testes-integracao/banco-sementes.test.js — sementes idempotentes, sem usuários.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { semear } from '../../banco/sementes/banco-sementes.js';

test('semear cria 1 aviso tipo sistema ativo e 1 tipo popup inativo, em pt-BR e en', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const inseridos = semear(banco);
    assert.equal(inseridos.length, 2);

    const avisos = banco.prepare('SELECT * FROM avisos ORDER BY tipo').all();
    assert.equal(avisos.length, 2);

    const sistema = avisos.find((a) => a.tipo === 'sistema');
    const popup = avisos.find((a) => a.tipo === 'popup');

    assert.ok(sistema);
    assert.equal(sistema.ativo, 1);
    assert.ok(sistema.titulo_pt_br.length > 0);
    assert.ok(sistema.titulo_en.length > 0);
    assert.ok(sistema.corpo_pt_br.length > 0);
    assert.ok(sistema.corpo_en.length > 0);

    assert.ok(popup);
    assert.equal(popup.ativo, 0);
    assert.ok(popup.titulo_pt_br.length > 0);
    assert.ok(popup.titulo_en.length > 0);

    const totalUsuarios = banco.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
    assert.equal(totalUsuarios, 0);
  } finally {
    banco.close();
  }
});

test('semear é idempotente: rodar duas vezes não duplica os avisos', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const primeira = semear(banco);
    const segunda = semear(banco);

    assert.equal(primeira.length, 2);
    assert.equal(segunda.length, 0);

    const total = banco.prepare('SELECT COUNT(*) AS n FROM avisos').get().n;
    assert.equal(total, 2);
  } finally {
    banco.close();
  }
});
