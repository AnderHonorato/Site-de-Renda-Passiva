// idioma-servidor.test.js — testes de servidor/servidor-idioma.js

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';

import { criarIdioma } from '../../servidor/servidor-idioma.js';

let raiz;

before(() => {
  raiz = mkdtempSync(join(tmpdir(), 'af-idioma-'));

  const pastaCompartilhado = join(raiz, 'frontend', 'compartilhado');
  mkdirSync(pastaCompartilhado, { recursive: true });
  writeFileSync(
    join(pastaCompartilhado, 'compartilhado-idioma-pt-br.json'),
    JSON.stringify({
      compartilhado: {
        marca: { nome: 'Ander Flow' },
        rodape: { direitos: '© {ano} Ander Flow.' },
        erros: { dados_invalidos: 'Confira os campos destacados.' },
      },
    }),
  );
  writeFileSync(
    join(pastaCompartilhado, 'compartilhado-idioma-en.json'),
    JSON.stringify({
      compartilhado: {
        marca: { nome: 'Ander Flow (EN)' },
        // rodape.direitos ausente de propósito: deve cair para pt-BR
      },
    }),
  );

  const pastaPagina = join(raiz, 'frontend', 'paginas', 'teste');
  mkdirSync(pastaPagina, { recursive: true });
  writeFileSync(
    join(pastaPagina, 'teste-idioma-pt-br.json'),
    JSON.stringify({ teste: { titulo: 'Olá {nome}' } }),
  );
  writeFileSync(join(pastaPagina, 'teste-idioma-en.json'), JSON.stringify({ teste: { titulo: 'Hello {nome}' } }));
});

after(() => {
  rmSync(raiz, { recursive: true, force: true });
});

test('normalizarCodigo cai para pt-BR quando ausente ou inválido', () => {
  const idioma = criarIdioma({ raiz });
  assert.equal(idioma.normalizarCodigo(undefined), 'pt-BR');
  assert.equal(idioma.normalizarCodigo('fr'), 'pt-BR');
  assert.equal(idioma.normalizarCodigo('EN'), 'en');
  assert.equal(idioma.normalizarCodigo('en'), 'en');
});

test('idiomaDaRequisicao lê o cookie idioma', () => {
  const idioma = criarIdioma({ raiz });
  assert.equal(idioma.idiomaDaRequisicao({ cookies: { idioma: 'en' } }), 'en');
  assert.equal(idioma.idiomaDaRequisicao({ cookies: {} }), 'pt-BR');
  assert.equal(idioma.idiomaDaRequisicao({}), 'pt-BR');
});

test('dicionario mescla compartilhado + página em pt-BR', () => {
  const idioma = criarIdioma({ raiz });
  const dic = idioma.dicionario('pt-BR', 'teste');
  assert.equal(dic.compartilhado.marca.nome, 'Ander Flow');
  assert.equal(dic.teste.titulo, 'Olá {nome}');
});

test('dicionario em en cai para pt-BR quando a chave está ausente', () => {
  const idioma = criarIdioma({ raiz });
  const dic = idioma.dicionario('en', 'teste');
  assert.equal(dic.compartilhado.marca.nome, 'Ander Flow (EN)');
  // chave ausente no en -> cai para pt-BR
  assert.equal(dic.compartilhado.rodape.direitos, '© {ano} Ander Flow.');
  assert.equal(dic.teste.titulo, 'Hello {nome}');
});

test('traduzir substitui variáveis no texto', () => {
  const idioma = criarIdioma({ raiz });
  assert.equal(idioma.traduzir('pt-BR', 'teste.titulo', { nome: 'Ana' }, 'teste'), 'Olá Ana');
  assert.equal(idioma.traduzir('en', 'teste.titulo', { nome: 'Ana' }, 'teste'), 'Hello Ana');
});

test('traduzir cai para a própria chave quando ela não existe', () => {
  const idioma = criarIdioma({ raiz });
  assert.equal(idioma.traduzir('pt-BR', 'teste.inexistente', {}, 'teste'), 'teste.inexistente');
});

test('recarregar limpa o cache e relê os arquivos do disco', () => {
  const idioma = criarIdioma({ raiz });
  const antes = idioma.dicionario('pt-BR', 'teste');
  assert.equal(antes.teste.titulo, 'Olá {nome}');

  writeFileSync(
    join(raiz, 'frontend', 'paginas', 'teste', 'teste-idioma-pt-br.json'),
    JSON.stringify({ teste: { titulo: 'Novo título' } }),
  );

  const semRecarregar = idioma.dicionario('pt-BR', 'teste');
  assert.equal(semRecarregar.teste.titulo, 'Olá {nome}', 'deve continuar em cache');

  idioma.recarregar();
  const depois = idioma.dicionario('pt-BR', 'teste');
  assert.equal(depois.teste.titulo, 'Novo título');
});
