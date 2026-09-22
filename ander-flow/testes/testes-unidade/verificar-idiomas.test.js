import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { achatar, valorVazio, compararParidade } from '../../scripts/scripts-verificar-idiomas.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const caminhoScript = join(raizProjeto, 'scripts', 'scripts-verificar-idiomas.js');

test('achatar transforma objeto aninhado em chaves com ponto', () => {
  assert.deepEqual(achatar({ compartilhado: { rodape: { direitos: 'texto' } } }), {
    'compartilhado.rodape.direitos': 'texto',
  });
});

test('achatar preserva arrays como valor de folha (não desce dentro deles)', () => {
  assert.deepEqual(achatar({ preco: { intencoes: ['a', 'b'] } }), { 'preco.intencoes': ['a', 'b'] });
});

test('valorVazio detecta string em branco, array vazio e array com item vazio', () => {
  assert.equal(valorVazio(''), true);
  assert.equal(valorVazio('  '), true);
  assert.equal(valorVazio('ok'), false);
  assert.equal(valorVazio([]), true);
  assert.equal(valorVazio(['a', '']), true);
  assert.equal(valorVazio(['a', 'b']), false);
});

test('compararParidade acusa chave faltando no en', () => {
  const problemas = compararParidade({ 'a.b': 'valor' }, {}, 'pt-br.json', 'en.json');
  assert.ok(problemas.some((p) => p.includes('en.json') && p.includes('falta a chave "a.b"')));
});

test('compararParidade acusa chave faltando no pt-br (sobrando no en)', () => {
  const problemas = compararParidade({}, { 'a.b': 'valor' }, 'pt-br.json', 'en.json');
  assert.ok(problemas.some((p) => p.includes('pt-br.json') && p.includes('falta a chave "a.b"')));
});

test('compararParidade sem problemas quando as chaves e valores batem', () => {
  assert.deepEqual(compararParidade({ 'a.b': 'x' }, { 'a.b': 'y' }, 'pt', 'en'), []);
});

function criarProjetoTemporario() {
  const pasta = mkdtempSync(join(tmpdir(), 'af-verificar-idiomas-'));
  mkdirSync(join(pasta, 'frontend', 'compartilhado'), { recursive: true });
  return pasta;
}

test('script reprova chave faltando no en', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(
      join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma-pt-br.json'),
      JSON.stringify({ compartilhado: { ola: 'Olá' } }),
    );
    writeFileSync(join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma-en.json'), JSON.stringify({ compartilhado: {} }));
    assert.throws(() => execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' }));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('script aprova quando pt-br e en têm as mesmas chaves preenchidas', () => {
  const pasta = criarProjetoTemporario();
  try {
    writeFileSync(
      join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma-pt-br.json'),
      JSON.stringify({ compartilhado: { ola: 'Olá' } }),
    );
    writeFileSync(
      join(pasta, 'frontend', 'compartilhado', 'compartilhado-idioma-en.json'),
      JSON.stringify({ compartilhado: { ola: 'Hello' } }),
    );
    const saida = execFileSync('node', [caminhoScript, '--raiz', pasta], { encoding: 'utf8' });
    assert.match(saida, /APROVADO/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
