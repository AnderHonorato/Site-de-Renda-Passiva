import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nomeValido, prefixadoPelaPastaMae } from '../../scripts/scripts-verificar-nomes.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const caminhoScript = join(raizProjeto, 'scripts', 'scripts-verificar-nomes.js');

test('nomeValido reprova acento, espaço, underscore e maiúscula', () => {
  assert.equal(nomeValido('compartilhado-idioma.js'), true);
  assert.equal(nomeValido('compartilhado-ação.js'), false);
  assert.equal(nomeValido('compartilhado idioma.js'), false);
  assert.equal(nomeValido('compartilhado_idioma.js'), false);
  assert.equal(nomeValido('Compartilhado-idioma.js'), false);
});

test('prefixadoPelaPastaMae aceita o nome de qualquer ancestral', () => {
  assert.equal(prefixadoPelaPastaMae('catalogo-lista.js', ['frontend', 'paginas', 'catalogo']), true);
  assert.equal(prefixadoPelaPastaMae('banco-sementes.js', ['banco', 'sementes']), true);
  assert.equal(prefixadoPelaPastaMae('arquivo-qualquer.js', ['banco', 'sementes']), false);
});

test('prefixadoPelaPastaMae exige apenas ".test.js" dentro de testes/', () => {
  assert.equal(prefixadoPelaPastaMae('compartilhado-idioma.test.js', ['testes', 'testes-unidade']), true);
  assert.equal(prefixadoPelaPastaMae('compartilhado-idioma.js', ['testes', 'testes-unidade']), false);
});

function criarProjetoTemporario() {
  const pasta = mkdtempSync(join(tmpdir(), 'af-verificar-nomes-'));
  mkdirSync(join(pasta, 'frontend', 'compartilhado'), { recursive: true });
  return pasta;
}

test('script reprova nome de arquivo com acento', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma-ção.js'), '// nome ruim\n');
    assert.throws(() => execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' }));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('script aprova nomes corretos', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma.js'), '// nome bom\n');
    const saida = execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' });
    assert.match(saida, /APROVADO/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
