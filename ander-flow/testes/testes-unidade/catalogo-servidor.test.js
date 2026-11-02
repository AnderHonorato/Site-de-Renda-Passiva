// catalogo-servidor.test.js — testes de servidor/servidor-catalogo.js

import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, after, beforeEach } from 'node:test';

import { criarCatalogo } from '../../servidor/servidor-catalogo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

let raiz;
let banco;

function escreverManifesto(raiz, slug, dados) {
  const pasta = join(raiz, 'frontend', 'ferramentas', slug);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, `${slug}-manifesto.json`), JSON.stringify({ slug, ...dados }));
}

before(() => {
  raiz = mkdtempSync(join(tmpdir(), 'af-catalogo-'));

  mkdirSync(join(raiz, 'frontend', 'ferramentas'), { recursive: true });
  writeFileSync(
    join(raiz, 'frontend', 'ferramentas', 'ferramentas-categorias.json'),
    JSON.stringify({
      categorias: [
        { id: 'dinheiro', ordem: 1, icone: 'dinheiro' },
        { id: 'vendas', ordem: 2, icone: 'vendas' },
      ],
    }),
  );

  mkdirSync(join(raiz, 'frontend', 'compartilhado'), { recursive: true });
  writeFileSync(
    join(raiz, 'frontend', 'compartilhado', 'compartilhado-idioma-pt-br.json'),
    JSON.stringify({
      compartilhado: {
        categorias: {
          dinheiro: { nome: 'Dinheiro e preços', resumo: 'Resumo dinheiro' },
          vendas: { nome: 'Vendas', resumo: 'Resumo vendas' },
        },
      },
    }),
  );

  escreverManifesto(raiz, 'ferramenta-a', {
    estado: 'pronta',
    categoria: 'dinheiro',
    plano: 'gratis',
    processamento: 'navegador',
    icone: 'dinheiro',
    ordem: 10,
    nome: { 'pt-BR': 'Ferramenta A', en: 'Tool A' },
    descricao: { 'pt-BR': 'Descrição A', en: 'Description A' },
    intencoes: { 'pt-BR': ['a'], en: ['a'] },
    etiquetas: { 'pt-BR': ['x'], en: ['x'] },
    relacionadas: [],
  });
  escreverManifesto(raiz, 'ferramenta-b', {
    estado: 'pronta',
    categoria: 'dinheiro',
    plano: 'plus',
    processamento: 'navegador',
    icone: 'dinheiro',
    ordem: 5,
    nome: { 'pt-BR': 'Ferramenta B', en: 'Tool B' },
    descricao: { 'pt-BR': 'Descrição B', en: 'Description B' },
    intencoes: { 'pt-BR': [], en: [] },
    etiquetas: { 'pt-BR': [], en: [] },
    relacionadas: [],
  });
  escreverManifesto(raiz, 'ferramenta-c', {
    estado: 'planejada',
    categoria: 'vendas',
    plano: 'gratis',
    processamento: 'navegador',
    icone: 'vendas',
    ordem: 1,
    nome: { 'pt-BR': 'Ferramenta C', en: 'Tool C' },
    descricao: { 'pt-BR': 'Descrição C', en: 'Description C' },
    intencoes: { 'pt-BR': [], en: [] },
    etiquetas: { 'pt-BR': [], en: [] },
    relacionadas: [],
  });
});

after(() => {
  rmSync(raiz, { recursive: true, force: true });
});

beforeEach(() => {
  banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
});

test('contagens() soma só ferramentas ativas', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  const contagens = catalogo.contagens();
  assert.equal(contagens.total, 3);
  assert.equal(contagens.prontas, 2);
  assert.equal(contagens.planejadas, 1);
  assert.equal(contagens.plus, 1);
});

test('listar() ordena por categoria.ordem, depois manifesto.ordem, depois nome', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  const lista = catalogo.listar({ idioma: 'pt-BR' });
  assert.deepEqual(lista.map((f) => f.slug), ['ferramenta-b', 'ferramenta-a', 'ferramenta-c']);
});

test('obter() localiza campos no idioma pedido e retorna null para slug inexistente', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  const ferramenta = catalogo.obter('ferramenta-a', { idioma: 'en' });
  assert.equal(ferramenta.nome, 'Tool A');
  assert.equal(ferramenta.url, '/ferramentas/ferramenta-a');
  assert.equal(catalogo.obter('nao-existe'), null);

  const planejada = catalogo.obter('ferramenta-c', { idioma: 'pt-BR' });
  assert.equal(planejada.url, null, 'ferramenta planejada não tem página');
});

test('categorias() traz nome, resumo e total só das ativas', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  const categorias = catalogo.categorias({ idioma: 'pt-BR' });
  const dinheiro = categorias.find((c) => c.id === 'dinheiro');
  assert.equal(dinheiro.nome, 'Dinheiro e preços');
  assert.equal(dinheiro.total, 2);
});

test('ajuste do admin: inativa some da listagem e do total', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  banco
    .prepare('INSERT INTO ferramentas_ajustes (ferramenta_slug, ativa) VALUES (?, 0)')
    .run('ferramenta-a');

  const lista = catalogo.listar({ idioma: 'pt-BR' });
  assert.ok(!lista.some((f) => f.slug === 'ferramenta-a'));

  const contagens = catalogo.contagens();
  assert.equal(contagens.total, 2);

  const comInativas = catalogo.listar({ idioma: 'pt-BR', incluirInativas: true });
  assert.ok(comInativas.some((f) => f.slug === 'ferramenta-a' && f.ativa === false));
});

test('ajuste do admin: plano sobrescreve o do manifesto', () => {
  const catalogo = criarCatalogo({ raiz, banco });
  banco
    .prepare('INSERT INTO ferramentas_ajustes (ferramenta_slug, ativa, plano) VALUES (?, 1, ?)')
    .run('ferramenta-a', 'plus');

  assert.equal(catalogo.planoEfetivo('ferramenta-a'), 'plus');
  const ferramenta = catalogo.obter('ferramenta-a', { idioma: 'pt-BR' });
  assert.equal(ferramenta.plano, 'plus');
});
