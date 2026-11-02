// ferramentas-rotas-api.test.js — testes de integração de servidor/rotas/ferramentas e
// servidor/rotas/idioma (docs/contratos.md §11 "Idioma e ferramentas").

import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';

import { criarIdioma } from '../../servidor/servidor-idioma.js';
import { criarCatalogo } from '../../servidor/servidor-catalogo.js';
import { criarMontador } from '../../servidor/servidor-montador-paginas.js';
import registrarRotasFerramentas from '../../servidor/rotas/ferramentas/ferramentas-rotas.js';
import registrarRotasIdioma from '../../servidor/rotas/idioma/idioma-rotas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

let raiz;
let banco;
let servidorHttp;
let baseUrl;
let usuarioAtual = null;

function escreverManifesto(slug, dados) {
  const pasta = join(raiz, 'frontend', 'ferramentas', slug);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, `${slug}-manifesto.json`), JSON.stringify({ slug, ...dados }));
}

before(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'af-ferramentas-rotas-'));

  mkdirSync(join(raiz, 'frontend', 'ferramentas'), { recursive: true });
  writeFileSync(
    join(raiz, 'frontend', 'ferramentas', 'ferramentas-categorias.json'),
    JSON.stringify({ categorias: [{ id: 'dinheiro', ordem: 1, icone: 'dinheiro' }] }),
  );

  mkdirSync(join(raiz, 'frontend', 'compartilhado'), { recursive: true });
  writeFileSync(
    join(raiz, 'frontend', 'compartilhado', 'compartilhado-idioma-pt-br.json'),
    JSON.stringify({ compartilhado: { categorias: { dinheiro: { nome: 'Dinheiro', resumo: 'Resumo' } } } }),
  );

  escreverManifesto('ferramenta-livre', {
    estado: 'pronta',
    categoria: 'dinheiro',
    plano: 'gratis',
    processamento: 'navegador',
    icone: 'dinheiro',
    ordem: 10,
    nome: { 'pt-BR': 'Ferramenta Livre', en: 'Free Tool' },
    descricao: { 'pt-BR': 'Descrição', en: 'Description' },
    intencoes: { 'pt-BR': [], en: [] },
    etiquetas: { 'pt-BR': [], en: [] },
    relacionadas: [],
  });

  escreverManifesto('ferramenta-premium', {
    estado: 'pronta',
    categoria: 'dinheiro',
    plano: 'plus',
    processamento: 'navegador',
    icone: 'dinheiro',
    ordem: 20,
    nome: { 'pt-BR': 'Ferramenta Premium', en: 'Premium Tool' },
    descricao: { 'pt-BR': 'Descrição', en: 'Description' },
    intencoes: { 'pt-BR': [], en: [] },
    etiquetas: { 'pt-BR': [], en: [] },
    relacionadas: [],
    recursos_plus: ['recurso-x'],
  });
  writeFileSync(
    join(raiz, 'frontend', 'ferramentas', 'ferramenta-premium', 'ferramenta-premium-plus-recurso-x.js'),
    'export const valor = 42;\n',
  );

  banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
  banco.prepare("INSERT INTO usuarios (id, email, nome, senha_hash, plano) VALUES (1, 'a@b.com', 'Ana', 'x', 'plus')").run();

  const idioma = criarIdioma({ raiz });
  const catalogo = criarCatalogo({ raiz, banco });
  const configuracao = {
    raiz,
    ambiente: 'teste',
    planos: {
      planos: [
        { id: 'gratis', preco_mensal: 0, preco_anual: 0, limites: { favoritos: 10, trabalhos: 3, lote_arquivos: 3 } },
        { id: 'plus', preco_mensal: 14.9, preco_anual: 149, limites: { favoritos: 500, trabalhos: 500, lote_arquivos: 100 } },
      ],
    },
  };
  const montador = criarMontador({ raiz, idioma, catalogo, configuracao });
  const contexto = { configuracao, banco, catalogo, idioma, montador, registrarLog: () => {} };

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.usuario = usuarioAtual;
    next();
  });

  registrarRotasIdioma(app, contexto);
  registrarRotasFerramentas(app, contexto);

  // tratador mínimo só para este teste (o tratador real é do agente A1a).
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ erro: err.codigo || 'erro_interno', ...(err.extras || {}) });
  });

  servidorHttp = http.createServer(app);
  await new Promise((resolve) => servidorHttp.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${servidorHttp.address().port}`;
});

after(async () => {
  usuarioAtual = null;
  banco.close();
  await new Promise((resolve) => servidorHttp.close(resolve));
  rmSync(raiz, { recursive: true, force: true });
});

test('GET /api/ferramentas lista só ativas, com categorias e contagens', async () => {
  usuarioAtual = null;
  const resposta = await fetch(`${baseUrl}/api/ferramentas`);
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();
  assert.equal(corpo.ferramentas.length, 2);
  assert.equal(corpo.contagens.total, 2);
  assert.equal(corpo.contagens.plus, 1);
  assert.ok(corpo.categorias.some((c) => c.id === 'dinheiro'));
});

test('GET /api/ferramentas/:slug retorna a ferramenta ou 404 ferramenta_inexistente', async () => {
  const ok = await fetch(`${baseUrl}/api/ferramentas/ferramenta-livre`);
  assert.equal(ok.status, 200);
  const corpoOk = await ok.json();
  assert.equal(corpoOk.ferramenta.nome, 'Ferramenta Livre');

  const inexistente = await fetch(`${baseUrl}/api/ferramentas/nao-existe`);
  assert.equal(inexistente.status, 404);
  const corpoErro = await inexistente.json();
  assert.equal(corpoErro.erro, 'ferramenta_inexistente');
});

test('POST /api/ferramentas/:slug/uso soma em usos_ferramentas e, com sessão, em usos_usuarios', async () => {
  usuarioAtual = null;
  const resposta1 = await fetch(`${baseUrl}/api/ferramentas/ferramenta-livre/uso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'uso' }),
  });
  assert.equal(resposta1.status, 204);

  usuarioAtual = { id: 1, nome: 'Ana', email: 'a@b.com', plano: 'plus', papel: 'usuario' };
  const resposta2 = await fetch(`${baseUrl}/api/ferramentas/ferramenta-livre/uso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'uso' }),
  });
  assert.equal(resposta2.status, 204);
  usuarioAtual = null;

  const dia = new Date().toISOString().slice(0, 10);
  const linhaFerramenta = banco
    .prepare('SELECT contagem FROM usos_ferramentas WHERE ferramenta_slug = ? AND dia = ? AND tipo = ?')
    .get('ferramenta-livre', dia, 'uso');
  assert.equal(linhaFerramenta.contagem, 2);

  const mes = dia.slice(0, 7);
  const linhaUsuario = banco
    .prepare('SELECT contagem FROM usos_usuarios WHERE usuario_id = 1 AND ferramenta_slug = ? AND mes = ? AND tipo = ?')
    .get('ferramenta-livre', mes, 'uso');
  assert.equal(linhaUsuario.contagem, 1);
});

test('POST /api/ferramentas/:slug/uso com tipo inválido devolve dados_invalidos', async () => {
  const resposta = await fetch(`${baseUrl}/api/ferramentas/ferramenta-livre/uso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'errado' }),
  });
  assert.equal(resposta.status, 400);
  const corpo = await resposta.json();
  assert.equal(corpo.erro, 'dados_invalidos');
});

test('GET /plus/:slug/:recurso exige sessão e plano plus, e serve o arquivo certo', async () => {
  usuarioAtual = null;
  const semSessao = await fetch(`${baseUrl}/plus/ferramenta-premium/recurso-x`);
  assert.equal(semSessao.status, 401);
  assert.equal((await semSessao.json()).erro, 'sessao_necessaria');

  usuarioAtual = { id: 2, nome: 'Beto', email: 'b@b.com', plano: 'gratis', papel: 'usuario' };
  const planoErrado = await fetch(`${baseUrl}/plus/ferramenta-premium/recurso-x`);
  assert.equal(planoErrado.status, 403);
  assert.equal((await planoErrado.json()).erro, 'plano_insuficiente');

  usuarioAtual = { id: 1, nome: 'Ana', email: 'a@b.com', plano: 'plus', papel: 'usuario' };
  const recursoInexistente = await fetch(`${baseUrl}/plus/ferramenta-premium/nao-listado`);
  assert.equal(recursoInexistente.status, 404);

  const ok = await fetch(`${baseUrl}/plus/ferramenta-premium/recurso-x`);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /text\/javascript/);
  const corpo = await ok.text();
  assert.match(corpo, /valor = 42/);

  usuarioAtual = null;
});

test('GET /plus/:slug/:recurso recusa path traversal no slug e no recurso', async () => {
  usuarioAtual = { id: 1, nome: 'Ana', email: 'a@b.com', plano: 'plus', papel: 'usuario' };
  // "..%2Fsecret" não é um segmento "duplo-ponto" puro (a normalização de URL só colapsa
  // "..", ".%2e", "%2e." e "%2e%2e" exatos), então chega ao roteador como um único segmento
  // e só depois de decodificado (em "../secret") é que a validação de regex da rota entra em ação.
  const resposta = await fetch(`${baseUrl}/plus/..%2Fsecret/..%2Fsecret2`);
  assert.equal(resposta.status, 404);
  assert.equal((await resposta.json()).erro, 'nao_encontrado');

  // slug com barra codificada (tentativa de escapar a pasta de ferramentas)
  const respostaBarra = await fetch(`${baseUrl}/plus/ferramenta-premium%2Foutra/recurso-x`);
  assert.equal(respostaBarra.status, 404);
  usuarioAtual = null;
});

test('GET /api/idioma/:codigo/:pagina devolve textos mesclados e variáveis globais', async () => {
  const resposta = await fetch(`${baseUrl}/api/idioma/en/qualquer-pagina`);
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();
  assert.equal(corpo.idioma, 'en');
  assert.ok(corpo.textos.compartilhado);
  assert.equal(corpo.variaveis.ferramentas_total, 2);
});

test('GET /api/idioma/:codigo/:pagina recusa nome de página com caracteres inválidos', async () => {
  const resposta = await fetch(`${baseUrl}/api/idioma/pt-BR/${encodeURIComponent('Pagina_Invalida!')}`);
  assert.equal(resposta.status, 400);
  assert.equal((await resposta.json()).erro, 'dados_invalidos');

  // "..%2Fsecret" não é normalizado como segmento "duplo-ponto" puro pela URL, então chega ao
  // roteador como um segmento só, testando a validação de regex do handler contra path traversal.
  const respostaTraversal = await fetch(`${baseUrl}/api/idioma/pt-BR/..%2Fsecret`);
  assert.equal(respostaTraversal.status, 400);
  assert.equal((await respostaTraversal.json()).erro, 'dados_invalidos');
});
