// montador-paginas.test.js — testes de servidor/servidor-montador-paginas.js

import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';

import { criarIdioma } from '../../servidor/servidor-idioma.js';
import { criarCatalogo } from '../../servidor/servidor-catalogo.js';
import { criarMontador } from '../../servidor/servidor-montador-paginas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

let raiz;
let banco;
let idioma;
let catalogo;
let configuracao;

function criarFakeRes() {
  const estado = { status: 200, headers: {}, corpo: null, redirecionadoPara: null };
  const res = {
    status(codigo) {
      estado.status = codigo;
      return res;
    },
    set(nome, valor) {
      estado.headers[nome] = valor;
      return res;
    },
    send(corpo) {
      estado.corpo = corpo;
      return res;
    },
    json(objeto) {
      estado.corpo = objeto;
      return res;
    },
    redirect(codigo, destino) {
      estado.status = codigo;
      estado.redirecionadoPara = destino;
      return res;
    },
    end() {
      return res;
    },
  };
  return { res, estado };
}

before(() => {
  raiz = mkdtempSync(join(tmpdir(), 'af-montador-'));

  // compartilhado
  const pastaCompartilhado = join(raiz, 'frontend', 'compartilhado');
  mkdirSync(pastaCompartilhado, { recursive: true });
  writeFileSync(join(pastaCompartilhado, 'compartilhado-cabeca.html'), '<meta charset="utf-8">\n');
  writeFileSync(join(pastaCompartilhado, 'compartilhado-rodape-teste.html'), '<footer data-texto="compartilhado.pe_de_pagina"></footer>\n');
  writeFileSync(
    join(pastaCompartilhado, 'compartilhado-idioma-pt-br.json'),
    JSON.stringify({ compartilhado: { pe_de_pagina: 'Rodapé compartilhado' } }),
  );
  writeFileSync(
    join(pastaCompartilhado, 'compartilhado-idioma-en.json'),
    JSON.stringify({ compartilhado: { pe_de_pagina: 'Shared footer' } }),
  );

  // página de teste
  const pastaPagina = join(raiz, 'frontend', 'paginas', 'pagina-teste');
  mkdirSync(pastaPagina, { recursive: true });
  writeFileSync(
    join(pastaPagina, 'pagina-teste.html'),
    [
      '<!doctype html>',
      '<html>',
      '<head>',
      '  <!-- incluir: compartilhado-cabeca -->',
      '  <meta name="af-rota" content="/pagina-teste">',
      '  <meta name="af-acesso" content="publico">',
      '  <title data-texto="pagina-teste.titulo"></title>',
      '  <meta name="description" data-texto-content="pagina-teste.descricao">',
      '</head>',
      '<body>',
      '  <!-- incluir: pagina-teste-bloco -->',
      '  <p data-texto="pagina-teste.saudacao"></p>',
      '  <p>{{ferramentas_total}} ferramentas</p>',
      '  <input class="campo__entrada" data-texto-placeholder="pagina-teste.campo_marcador" placeholder="">',
      '</body>',
      '</html>',
      '',
    ].join('\n'),
  );
  writeFileSync(join(pastaPagina, 'pagina-teste-bloco.html'), '<div class="bloco"><!-- incluir: compartilhado-rodape-teste --></div>\n');
  writeFileSync(
    join(pastaPagina, 'pagina-teste-idioma-pt-br.json'),
    JSON.stringify({
      'pagina-teste': {
        titulo: 'Título de teste',
        descricao: 'Descrição da página de teste',
        saudacao: 'Olá **{nome}**, bem-vindo! <script>alert(1)</script>',
        campo_marcador: 'Digite aqui',
      },
    }),
  );
  writeFileSync(
    join(pastaPagina, 'pagina-teste-idioma-en.json'),
    JSON.stringify({ 'pagina-teste': { titulo: 'Test title' } }),
  );

  // página de erro
  const pastaErro = join(raiz, 'frontend', 'paginas', 'erro');
  mkdirSync(pastaErro, { recursive: true });
  writeFileSync(
    join(pastaErro, 'erro.html'),
    [
      '<!doctype html>',
      '<html>',
      '<head>',
      '  <meta name="af-rota" content="">',
      '  <title data-texto="erro.{codigo}.titulo"></title>',
      '</head>',
      '<body>',
      '  <p data-texto="erro.{codigo}.texto"></p>',
      '</body>',
      '</html>',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(pastaErro, 'erro-idioma-pt-br.json'),
    JSON.stringify({
      erro: {
        404: { titulo: 'Página não encontrada', texto: 'Não achamos {caminho}.' },
        403: { titulo: 'Acesso negado', texto: 'Sem permissão.' },
      },
    }),
  );

  banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));

  idioma = criarIdioma({ raiz });
  catalogo = criarCatalogo({ raiz, banco });
  configuracao = {
    raiz,
    ambiente: 'desenvolvimento',
    planos: {
      planos: [
        { id: 'gratis', preco_mensal: 0, preco_anual: 0, limites: { favoritos: 10, trabalhos: 3, lote_arquivos: 3 } },
        {
          id: 'plus',
          preco_mensal: 14.9,
          preco_anual: 149,
          limites: { favoritos: 500, trabalhos: 500, lote_arquivos: 100 },
        },
      ],
    },
  };
});

after(() => {
  banco.close();
  rmSync(raiz, { recursive: true, force: true });
});

test('paginas() descobre rotas declaradas e ignora páginas sem af-rota', () => {
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const lista = montador.paginas();
  const nomes = lista.map((p) => p.nome);
  assert.ok(nomes.includes('pagina-teste'));
  assert.ok(!nomes.includes('erro'), 'erro.html não declara rota (content vazio)');
  const paginaTeste = lista.find((p) => p.nome === 'pagina-teste');
  assert.equal(paginaTeste.rota, '/pagina-teste');
  assert.equal(paginaTeste.acesso, 'publico');
});

test('renderizar() monta inclusões aninhadas, traduz em pt-BR, aplica negrito, variáveis e escapa HTML hostil', () => {
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const { res, estado } = criarFakeRes();
  const req = { cookies: {}, usuario: null, originalUrl: '/pagina-teste' };

  montador.renderizar(req, res, 'pagina-teste', { nome: 'Ana' });

  assert.equal(estado.status, 200);
  const html = estado.corpo;

  // inclusão aninhada: página -> pagina-teste-bloco (mesma pasta) -> compartilhado-rodape-teste
  assert.ok(html.includes('<meta charset="utf-8">'), 'incluiu compartilhado-cabeca');
  assert.ok(html.includes('Rodapé compartilhado'), 'incluiu bloco aninhado até o compartilhado');

  // tradução de conteúdo e atributo data-texto-content
  assert.match(html, /<title[^>]*>Título de teste<\/title>/);
  assert.ok(html.includes('content="Descrição da página de teste"'));

  // negrito e variável dentro do texto traduzido
  assert.ok(html.includes('<strong>Ana</strong>'), 'converteu **negrito**');

  // variável global via {{chave-dupla}} direto no HTML
  assert.ok(html.includes('0 ferramentas'), 'substituiu {{ferramentas_total}}');

  // atributo preenchido a partir de data-texto-placeholder (elemento sem o atributo real ainda)
  assert.ok(html.includes('placeholder="Digite aqui"'));

  // HTML hostil do dicionário nunca aparece como tag executável
  assert.ok(!html.includes('<script>alert(1)</script>'), 'não deve haver script executável vindo do dicionário');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'o texto deve estar escapado no corpo');
  assert.ok(/u003cscript/i.test(html), 'o bloco JSON af-textos deve escapar < como \\u003c');

  // atributos do <html>
  assert.ok(/<html[^>]*lang="pt-BR"/.test(html));
  assert.ok(/<html[^>]*data-pagina="pagina-teste"/.test(html));
  assert.ok(/<html[^>]*data-sessao="anonima"/.test(html));
  assert.ok(/<html[^>]*data-ambiente="desenvolvimento"/.test(html));

  // blocos JSON injetados antes de </head>
  assert.ok(html.includes('id="af-textos"'));
  assert.ok(html.includes('id="af-variaveis"'));
});

test('renderizar() em en cai para pt-BR nas chaves ausentes', () => {
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const { res, estado } = criarFakeRes();
  const req = { cookies: { idioma: 'en' }, usuario: null, originalUrl: '/pagina-teste' };

  montador.renderizar(req, res, 'pagina-teste', { nome: 'Ana' });
  const html = estado.corpo;

  assert.match(html, /<title[^>]*>Test title<\/title>/, 'usa a chave existente em en');
  assert.ok(html.includes('content="Descrição da página de teste"'), 'cai para pt-BR quando falta em en');
  assert.ok(html.includes('placeholder="Digite aqui"'), 'placeholder cai para pt-BR');
  assert.ok(html.includes('Shared footer'), 'compartilhado existe em en');
  assert.ok(/<html[^>]*lang="en"/.test(html));
});

test('renderizarErro() troca {codigo} no atributo data-texto antes de traduzir', () => {
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const { res, estado } = criarFakeRes();
  const req = { cookies: {}, usuario: null, originalUrl: '/qualquer' };

  montador.renderizarErro(req, res, 404, { caminho: '/rota-desconhecida' });

  assert.equal(estado.status, 404);
  const html = estado.corpo;
  assert.match(html, /<title[^>]*>Página não encontrada<\/title>/);
  assert.ok(html.includes('Não achamos /rota-desconhecida.'));
});

test('variaveisGlobais() calcula contagens e preços formatados', () => {
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const globais = montador.variaveisGlobais({ cookies: {}, usuario: null });
  assert.equal(globais.ferramentas_total, 0);
  assert.equal(globais.limite_favoritos_gratis, 10);
  assert.match(globais.preco_plus_mensal, /R\$\s*14,90/);
});
