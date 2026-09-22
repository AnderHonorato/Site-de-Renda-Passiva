// testes/testes-integracao/banco-migracao.test.js — migração real (banco/migracoes) contra
// um banco em memória: as 13 tabelas do esquema, idempotência e cascata de exclusão.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';

const TABELAS_DO_ESQUEMA = [
  'usuarios',
  'sessoes',
  'recuperacoes_senha',
  'favoritos',
  'trabalhos',
  'avisos',
  'avisos_lidos',
  'mensagens',
  'ferramentas_ajustes',
  'usos_ferramentas',
  'usos_usuarios',
  'limites_trafego',
  'registros_admin',
];

test('migrar cria as 13 tabelas do esquema mais migracoes_aplicadas', () => {
  const banco = abrirBanco(':memory:');
  try {
    const aplicadas = migrar(banco);
    assert.deepEqual(aplicadas, ['banco-migracao-001-inicial.sql']);

    const tabelas = new Set(
      banco
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all()
        .map((linha) => linha.name)
    );

    for (const tabela of TABELAS_DO_ESQUEMA) {
      assert.ok(tabelas.has(tabela), `tabela ausente: ${tabela}`);
    }
    assert.ok(tabelas.has('migracoes_aplicadas'));
    assert.equal(tabelas.size, TABELAS_DO_ESQUEMA.length + 1);
  } finally {
    banco.close();
  }
});

test('rodar a migração duas vezes não reaplica nada', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const segunda = migrar(banco);
    assert.deepEqual(segunda, []);
    const total = banco.prepare('SELECT COUNT(*) AS total FROM migracoes_aplicadas').get().total;
    assert.equal(total, 1);
  } finally {
    banco.close();
  }
});

test('foreign_keys ON: excluir usuário apaga sessões e favoritos em cascata', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    assert.equal(banco.pragma('foreign_keys', { simple: true }), 1);

    const agora = new Date().toISOString();
    const usuarioId = banco
      .prepare(
        `INSERT INTO usuarios (email, nome, senha_hash, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run('pessoa@exemplo.com', 'Pessoa', 'hash-fake', agora, agora).lastInsertRowid;

    banco
      .prepare(
        `INSERT INTO sessoes (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)`
      )
      .run(usuarioId, 'token-hash-fake', agora);

    banco
      .prepare(`INSERT INTO favoritos (usuario_id, ferramenta_slug) VALUES (?, ?)`)
      .run(usuarioId, 'preco-de-venda');

    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 1);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM favoritos').get().n, 1);

    banco.prepare('DELETE FROM usuarios WHERE id = ?').run(usuarioId);

    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 0);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM favoritos').get().n, 0);
  } finally {
    banco.close();
  }
});

test('sem migrar, a tabela usuarios ainda não existe', () => {
  const banco = abrirBanco(':memory:');
  try {
    assert.throws(() => banco.prepare('SELECT * FROM usuarios').get());
  } finally {
    banco.close();
  }
});
