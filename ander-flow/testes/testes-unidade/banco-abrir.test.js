// testes/testes-unidade/banco-abrir.test.js — abrirBanco/obterBanco/fecharBanco (contratos.md §7).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBanco, obterBanco, fecharBanco } from '../../banco/banco.js';

test('abrirBanco(":memory:") aplica os pragmas exigidos', () => {
  const banco = abrirBanco(':memory:');
  try {
    assert.equal(banco.pragma('foreign_keys', { simple: true }), 1);
    assert.equal(banco.pragma('busy_timeout', { simple: true }), 5000);
    // SQLite não sustenta WAL em banco em memória; confirma que não lança erro.
    assert.ok(banco.pragma('journal_mode', { simple: true }));
  } finally {
    banco.close();
  }
});

test('abrirBanco com caminho em arquivo real usa journal_mode WAL', () => {
  const pastaTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'ander-flow-banco-'));
  const caminho = path.join(pastaTemporaria, 'teste.sqlite');
  const banco = abrirBanco(caminho);
  try {
    assert.equal(String(banco.pragma('journal_mode', { simple: true })).toLowerCase(), 'wal');
    assert.ok(fs.existsSync(caminho));
  } finally {
    banco.close();
    fs.rmSync(pastaTemporaria, { recursive: true, force: true });
  }
});

test('abrirBanco cria a pasta do arquivo quando ela ainda não existe', () => {
  const pastaTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'ander-flow-banco-'));
  const caminho = path.join(pastaTemporaria, 'subpasta', 'aninhada', 'teste.sqlite');
  const banco = abrirBanco(caminho);
  try {
    assert.ok(fs.existsSync(caminho));
  } finally {
    banco.close();
    fs.rmSync(pastaTemporaria, { recursive: true, force: true });
  }
});

test('obterBanco devolve a mesma instância até fecharBanco', () => {
  const caminhoOriginal = process.env.BANCO_CAMINHO;
  process.env.BANCO_CAMINHO = ':memory:';
  try {
    const primeira = obterBanco();
    const segunda = obterBanco();
    assert.equal(primeira, segunda);
    fecharBanco();
    const terceira = obterBanco();
    assert.notEqual(terceira, primeira);
    fecharBanco();
  } finally {
    if (caminhoOriginal === undefined) delete process.env.BANCO_CAMINHO;
    else process.env.BANCO_CAMINHO = caminhoOriginal;
  }
});

test('fecharBanco sem instância aberta não lança erro', () => {
  fecharBanco();
  assert.ok(true);
});
