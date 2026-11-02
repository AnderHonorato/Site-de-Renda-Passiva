// testes/testes-integracao/admin-criar.test.js — criação/promoção de admin (contratos.md §7, §9.4).
// O teste que usa gerarHashSenha pula se servidor/seguranca/seguranca-senha.js ainda não existir
// (é escrito por outro agente em paralelo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import {
  analisarArgumentos,
  criarOuPromoverAdmin,
  importarGerarHashSenha,
} from '../../scripts/scripts-admin-criar.js';

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const caminhoModuloSenha = path.join(raizProjeto, 'servidor', 'seguranca', 'seguranca-senha.js');
const moduloSenhaExiste = fs.existsSync(caminhoModuloSenha);

test('analisarArgumentos lê --email e --nome', () => {
  const resultado = analisarArgumentos(['--email', 'a@b.com', '--nome', 'Fulano']);
  assert.deepEqual(resultado, { email: 'a@b.com', nome: 'Fulano' });
});

test('analisarArgumentos ignora argumentos desconhecidos', () => {
  const resultado = analisarArgumentos(['--outra-coisa', 'x']);
  assert.deepEqual(resultado, {});
});

test('criarOuPromoverAdmin cria usuário novo com papel admin', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const resultado = criarOuPromoverAdmin(banco, {
      email: 'novo@exemplo.com',
      nome: 'Novo Admin',
      senhaHash: 'hash-fake',
    });
    assert.equal(resultado.criado, true);
    assert.equal(resultado.promovido, false);

    const usuario = banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(resultado.id);
    assert.equal(usuario.email, 'novo@exemplo.com');
    assert.equal(usuario.papel, 'admin');
    assert.equal(usuario.senha_hash, 'hash-fake');
  } finally {
    banco.close();
  }
});

test('criarOuPromoverAdmin promove usuário comum existente sem alterar a senha', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const agora = new Date().toISOString();
    const id = banco
      .prepare(
        `INSERT INTO usuarios (email, nome, senha_hash, papel, criado_em, atualizado_em)
         VALUES (?, ?, ?, 'usuario', ?, ?)`
      )
      .run('comum@exemplo.com', 'Comum', 'senha-original', agora, agora).lastInsertRowid;

    const resultado = criarOuPromoverAdmin(banco, {
      email: 'comum@exemplo.com',
      nome: 'Comum',
      senhaHash: 'hash-novo-ignorado',
    });

    assert.equal(resultado.criado, false);
    assert.equal(resultado.promovido, true);

    const usuario = banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    assert.equal(usuario.papel, 'admin');
    assert.equal(usuario.senha_hash, 'senha-original');
  } finally {
    banco.close();
  }
});

test('criarOuPromoverAdmin em admin já existente não altera nada', () => {
  const banco = abrirBanco(':memory:');
  try {
    migrar(banco);
    const agora = new Date().toISOString();
    const id = banco
      .prepare(
        `INSERT INTO usuarios (email, nome, senha_hash, papel, criado_em, atualizado_em)
         VALUES (?, ?, ?, 'admin', ?, ?)`
      )
      .run('admin@exemplo.com', 'Admin', 'senha-original', agora, agora).lastInsertRowid;

    const resultado = criarOuPromoverAdmin(banco, {
      email: 'admin@exemplo.com',
      nome: 'Admin',
      senhaHash: 'hash-novo-ignorado',
    });

    assert.equal(resultado.criado, false);
    assert.equal(resultado.promovido, false);
    assert.equal(resultado.id, id);

    const usuario = banco.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(id);
    assert.equal(usuario.senha_hash, 'senha-original');
  } finally {
    banco.close();
  }
});

test(
  'admin-criar usa gerarHashSenha do módulo de segurança para criar o admin',
  { skip: !moduloSenhaExiste && 'servidor/seguranca/seguranca-senha.js ainda não existe neste worktree' },
  async () => {
    const gerarHashSenha = await importarGerarHashSenha();
    const hash = await gerarHashSenha('senha-de-teste-1234');
    assert.equal(typeof hash, 'string');
    assert.ok(hash.length > 0);

    const banco = abrirBanco(':memory:');
    try {
      migrar(banco);
      const resultado = criarOuPromoverAdmin(banco, {
        email: 'via-hash@exemplo.com',
        nome: 'Via Hash',
        senhaHash: hash,
      });
      assert.equal(resultado.criado, true);
      const usuario = banco.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(resultado.id);
      assert.equal(usuario.senha_hash, hash);
    } finally {
      banco.close();
    }
  }
);

test(
  'importarGerarHashSenha lança erro claro quando o módulo de segurança não existe',
  { skip: moduloSenhaExiste && 'servidor/seguranca/seguranca-senha.js existe neste worktree' },
  async () => {
    await assert.rejects(() => importarGerarHashSenha(), /seguranca-senha\.js/);
  }
);
