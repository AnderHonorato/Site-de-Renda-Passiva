// testes/testes-unidade/banco-migrador.test.js — migrar() isolado, com pasta de migrações de teste.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';

function criarPastaMigracoes(arquivos) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'ander-flow-migracoes-'));
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    fs.writeFileSync(path.join(pasta, nome), conteudo, 'utf8');
  }
  return pasta;
}

test('migrar cria a tabela migracoes_aplicadas e aplica os arquivos em ordem numérica', () => {
  const pastaMigracoes = criarPastaMigracoes({
    'banco-migracao-002-segunda.sql': 'CREATE TABLE b (id INTEGER PRIMARY KEY);',
    'banco-migracao-001-primeira.sql': 'CREATE TABLE a (id INTEGER PRIMARY KEY);',
    'banco-migracao-010-decima.sql': 'CREATE TABLE c (id INTEGER PRIMARY KEY);',
  });
  const banco = abrirBanco(':memory:');
  try {
    const aplicadas = migrar(banco, { pastaMigracoes });
    assert.deepEqual(aplicadas, [
      'banco-migracao-001-primeira.sql',
      'banco-migracao-002-segunda.sql',
      'banco-migracao-010-decima.sql',
    ]);
    const tabelas = banco
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((linha) => linha.name);
    assert.ok(tabelas.includes('migracoes_aplicadas'));
    assert.ok(tabelas.includes('a'));
    assert.ok(tabelas.includes('b'));
    assert.ok(tabelas.includes('c'));

    const registros = banco.prepare('SELECT nome, aplicada_em FROM migracoes_aplicadas').all();
    assert.equal(registros.length, 3);
    assert.ok(registros.every((registro) => typeof registro.aplicada_em === 'string' && registro.aplicada_em.length > 0));
  } finally {
    banco.close();
    fs.rmSync(pastaMigracoes, { recursive: true, force: true });
  }
});

test('rodar migrar duas vezes não reaplica o que já foi aplicado', () => {
  const pastaMigracoes = criarPastaMigracoes({
    'banco-migracao-001-primeira.sql': 'CREATE TABLE a (id INTEGER PRIMARY KEY);',
  });
  const banco = abrirBanco(':memory:');
  try {
    const primeiraRodada = migrar(banco, { pastaMigracoes });
    assert.deepEqual(primeiraRodada, ['banco-migracao-001-primeira.sql']);

    const segundaRodada = migrar(banco, { pastaMigracoes });
    assert.deepEqual(segundaRodada, []);

    const total = banco.prepare('SELECT COUNT(*) AS total FROM migracoes_aplicadas').get().total;
    assert.equal(total, 1);
  } finally {
    banco.close();
    fs.rmSync(pastaMigracoes, { recursive: true, force: true });
  }
});

test('migração com SQL quebrado desfaz a transação e informa o nome do arquivo', () => {
  const pastaMigracoes = criarPastaMigracoes({
    'banco-migracao-001-boa.sql': 'CREATE TABLE boa (id INTEGER PRIMARY KEY);',
    'banco-migracao-002-quebrada.sql': 'CREATE TABLE quebrada (id INTEGER PRIMARY KEY); ISSO NAO E SQL;',
  });
  const banco = abrirBanco(':memory:');
  try {
    assert.throws(
      () => migrar(banco, { pastaMigracoes }),
      (erro) => erro.message.includes('banco-migracao-002-quebrada.sql')
    );

    // A primeira migração (boa) ficou registrada; a quebrada não deixou rastro.
    const registradas = banco.prepare('SELECT nome FROM migracoes_aplicadas').all().map((l) => l.nome);
    assert.deepEqual(registradas, ['banco-migracao-001-boa.sql']);

    // A tabela da migração quebrada não deve existir (transação desfeita).
    const tabelas = banco
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((linha) => linha.name);
    assert.ok(!tabelas.includes('quebrada'));
  } finally {
    banco.close();
    fs.rmSync(pastaMigracoes, { recursive: true, force: true });
  }
});

test('pasta de migrações inexistente resulta em nenhuma migração aplicada', () => {
  const banco = abrirBanco(':memory:');
  try {
    const aplicadas = migrar(banco, { pastaMigracoes: path.join(os.tmpdir(), 'pasta-que-nao-existe-af') });
    assert.deepEqual(aplicadas, []);
  } finally {
    banco.close();
  }
});
