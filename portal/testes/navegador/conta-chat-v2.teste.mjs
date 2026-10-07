import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4472;
const BASE = 'http://127.0.0.1:' + PORTA;

const chromium = acharChromium();
const pular = chromium ? false : 'Playwright não encontrado';
let servidor;
let navegador;

before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  navegador = await abrirNavegador(chromium);
});

after(async () => {
  await navegador?.close();
  servidor?.kill();
});

const perfil = {
  id: 1,
  nome: 'Ander Teste',
  usuario: 'ander_teste',
  avatar: 'sol',
  foto_url: null,
  nivel: 6,
  pontos: 140,
  pontos_evolucao: 165,
  plano: 'plus',
  papel: 'usuario',
  bio: 'Perfil compacto para teste.',
  local: 'São Paulo',
  criado_em: '2026-08-24 12:00:00',
  banner: 'aurora',
  moldura: 'ouro',
  sociais: { instagram: 'ander.teste', site: 'https://example.com/' },
  visibilidade: { bio: true, local: true },
  progresso_nivel: { nivel: 6, pontos: 165, faltam: 195, percentual: 38 },
  medalhas: [
    { id: 'explorador', nome: 'Explorador', descricao: 'Use ferramentas.', valor: 8, desbloqueada: true, tier: 2, patamar: 'Prata', meta: 15, completa: false, percentual: 50 },
    { id: 'pratica', nome: 'Mão na massa', descricao: 'Conclua usos.', valor: 80, desbloqueada: true, tier: 3, patamar: 'Ouro', meta: 160, completa: false, percentual: 20 },
  ],
  personalizacoes: {
    banners: [
      { id: 'brisa', nome: 'Brisa', nivel: 1, animado: false, desbloqueado: true },
      { id: 'aurora', nome: 'Aurora', nivel: 3, animado: false, desbloqueado: true },
      { id: 'prisma', nome: 'Prisma vivo', nivel: 12, animado: true, desbloqueado: false },
    ],
    molduras: [
      { id: 'basica', nome: 'Básica', nivel: 1, animado: false, desbloqueado: true },
      { id: 'ouro', nome: 'Ouro', nivel: 5, animado: false, desbloqueado: true },
      { id: 'neon', nome: 'Neon', nivel: 12, animado: true, desbloqueado: false },
    ],
  },
  ferramentas_recomendadas: ['simulador-de-financiamento'],
  ferramentas_mais_usadas: [
    { slug: 'simulador-de-financiamento', total: 18 },
    { slug: 'texto-para-fala', total: 12 },
  ],
};

async function contextoComApi({ viewport = { width: 1200, height: 800 }, chat = false } = {}) {
  const contexto = await navegador.newContext({ viewport });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);

  await contexto.addInitScript(() => {
    class EventSourceFalso {
      constructor() { this.readyState = 1; this.listeners = new Map(); }
      addEventListener(nome, fn) { this.listeners.set(nome, fn); }
      close() { this.readyState = 2; }
      set onerror(_) {}
    }
    Object.defineProperty(window, 'EventSource', { value: EventSourceFalso, configurable: true });
  });

  let salas = [
    { id: 'global', tipo: 'global', nome: 'Geral', nao_lidas: 1, ultima_mensagem: 'Aviso público novo', ultima_em: '2026-10-06 22:00:00' },
    {
      id: 'direta-1-2',
      tipo: 'direta',
      nome: 'Conversa',
      nao_lidas: 2,
      ultima_mensagem: 'Última mensagem privada',
      ultima_em: '2026-10-06 22:10:00',
      outro: { id: 2, nome: 'Luna', usuario: 'luna', avatar: 'lua', foto_url: null },
    },
  ];
  let respostaEnviada = null;

  await contexto.route('**/api/**', async rota => {
    const req = rota.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const metodo = req.method();

    if (p === '/api/autenticacao/sessao') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          usuario: { id: 1, nome: 'Ander Teste', usuario: 'ander_teste', avatar: 'sol', nivel: 6, plano: 'plus', papel: 'usuario', chat_aceito: true },
          chat_habilitado: chat,
          chat_aceito: chat,
        }),
      });
    }
    if (p === '/api/conta' && metodo === 'GET') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ usuario: { id: 1, nome: 'Ander Teste', usuario: 'ander_teste', plano: 'plus', idioma: 'pt-BR', tema: 'sistema', nivel: 6 } }) });
    }
    if (p === '/api/conta' && metodo === 'PATCH') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ usuario: { id: 1, nome: 'Ander Alterado', usuario: 'ander_teste', plano: 'plus', idioma: 'pt-BR', tema: 'sistema', nivel: 6 } }) });
    }
    if (p === '/api/perfil/ander_teste' && metodo === 'GET') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil }) });
    }
    if (p === '/api/perfil/ander_teste' && metodo === 'PATCH') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil: { ...perfil, ...req.postDataJSON() } }) });
    }
    if (p === '/api/perfil/luna') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil: { ...perfil, id: 2, nome: 'Luna', usuario: 'luna', avatar: 'lua', plano: 'gratuito', banner: 'brisa', moldura: 'basica' } }) });
    }
    if (p === '/api/amizades') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ amizades: [] }) });
    }
    if (p === '/api/favoritos') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ favoritos: [] }) });
    }
    if (p === '/api/chat/salas') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ salas, total_nao_lidas: salas.reduce((s, x) => s + x.nao_lidas, 0) }) });
    }
    if (p.endsWith('/leitura') && metodo === 'PATCH') {
      const salaId = decodeURIComponent(p.split('/')[4]);
      salas = salas.map(s => s.id === salaId ? { ...s, nao_lidas: 0 } : s);
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (p === '/api/chat/salas/global/mensagens' && metodo === 'GET') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ mensagens: [{ id: 10, sala_id: 'global', texto: 'Aviso público novo', criado_em: '2026-10-06 22:00:00', autor: { id: 2, usuario: 'luna', nome: 'Luna', avatar: 'lua' }, midias: [] }] }),
      });
    }
    if (p === '/api/chat/salas/direta-1-2/mensagens' && metodo === 'GET') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          expira_em: 48,
          mensagens: [{
            id: 20,
            sala_id: 'direta-1-2',
            texto: 'Última mensagem privada',
            criado_em: '2026-10-06 22:10:00',
            autor: { id: 2, usuario: 'luna', nome: 'Luna', avatar: 'lua' },
            resposta: { id: 18, usuario: 'ander_teste', texto: 'Mensagem anterior' },
            midias: [{
              id: 44, nome: 'print.png', mime: 'image/png', tamanho: 1234, tipo: 'imagem',
              url: '/api/chat/midias/44', reproducao: null,
            }],
          }],
        }),
      });
    }
    if (p === '/api/chat/salas/direta-1-2/mensagens' && metodo === 'POST') {
      respostaEnviada = req.postDataJSON();
      return rota.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          mensagem: {
            id: 21, sala_id: 'direta-1-2', texto: respostaEnviada.texto,
            criado_em: '2026-10-06 22:12:00',
            autor: { id: 1, usuario: 'ander_teste', nome: 'Ander Teste', avatar: 'sol' },
            resposta: respostaEnviada.respostaA ? { id: 20, usuario: 'luna', texto: 'Última mensagem privada' } : null,
            midias: [],
          },
        }),
      });
    }
    if (p === '/api/chat/midias/44') {
      return rota.fulfill({ contentType: 'image/png', body: Buffer.from([137,80,78,71,13,10,26,10,1,2,3]) });
    }
    if (p.startsWith('/api/chat/denuncias')) {
      return rota.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (p.startsWith('/api/chat/midias/') && p.endsWith('/progresso')) {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }

    return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const página = await contexto.newPage();
  return { contexto, página, getResposta: () => respostaEnviada };
}

test('conta vira drawer compacto e alterações usam barra flutuante', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi();
  await página.goto(BASE + '/conta/', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('#conta-conteudo:not([hidden])');

  const caixa = await página.locator('.conta.conta--drawer .conta__painel').boundingBox();
  assert.ok(caixa.width <= 448);
  assert.ok(caixa.x + caixa.width <= 1200);
  assert.ok(caixa.height < 800);

  assert.equal(await página.locator('.conta__acoes-rapidas .conta__acao').count(), 5);
  assert.equal(await página.locator('#conta-salvar').isVisible(), false);

  const nome = página.locator('#form-perfil [name="nome"]');
  await nome.fill('Ander Alterado');
  await página.waitForSelector('#conta-salvar:not([hidden])');
  assert.equal(await página.locator('#conta-salvar').isVisible(), true);

  await página.click('#cancelar-alteracoes');
  assert.equal(await nome.inputValue(), 'Ander Teste');
  assert.equal(await página.locator('#conta-salvar').isVisible(), false);

  await página.click('[data-conta-aba="aparencia"]');
  assert.equal(await página.locator('#opcoes-banner .conta__personalizacao[disabled]').count(), 1);
  assert.equal(await página.locator('#conta-medalhas .medalha').count(), 2);

  await contexto.close();
});

test('chat mantém não lidas por conversa, responde como citação e Shift+Enter quebra linha', { skip: pular }, async () => {
  const { contexto, página, getResposta } = await contextoComApi({ chat: true });
  await página.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  await página.waitForSelector('#chat-bolha .chat__bolha-badge:not([hidden])');
  assert.equal(await página.locator('.chat__bolha-badge').textContent(), '3');

  await página.click('#chat-bolha');
  await página.waitForSelector('.chat__layout');
  assert.equal(await página.locator('.chat__sala[data-sala-id="global"]').count(), 1);
  assert.equal(await página.locator('.chat__conversa .chat__anexo').count(), 0, 'sala pública permite apenas texto');

  await página.waitForFunction(() => document.querySelector('.chat__bolha-badge')?.textContent === '2');
  assert.equal(await página.locator('.chat__sala-badge:not([hidden])').count(), 1, 'só a conversa privada continua não lida');

  await página.locator('.chat__sala[data-sala-id="direta-1-2"]').click();
  await página.waitForSelector('.chat__mensagem[data-id="20"]');
  await página.waitForFunction(() => document.querySelector('.chat__bolha-badge')?.hidden === true);

  assert.equal(await página.locator('.chat__citado').count(), 1);
  assert.equal(await página.locator('.chat__midia-preview').count(), 1);

  const mensagem = página.locator('.chat__mensagem[data-id="20"]');
  await mensagem.hover();
  assert.equal(await mensagem.locator('.chat__denunciar').count(), 0, 'denúncia não fica poluindo o balão');
  await mensagem.locator('.chat__autor').hover();
  await página.waitForSelector('.chat__mini-perfil:not([hidden])');
  assert.equal(await página.locator('.chat__mini-denunciar').count(), 1, 'denúncia fica no mini perfil do usuário');
  await mensagem.hover();
  await mensagem.locator('.chat__responder').click();
  assert.equal(await página.locator('.chat__reply').isVisible(), true);

  const textarea = página.locator('.chat__composer-linha textarea');
  await textarea.fill('linha 1');
  await textarea.press('Shift+Enter');
  await textarea.type('linha 2');
  assert.match(await textarea.inputValue(), /linha 1\nlinha 2/);

  await textarea.fill('texto formatado');
  await textarea.evaluate(el => {
    el.focus();
    el.setSelectionRange(0, 5);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 300, clientY: 500 }));
  });
  await página.waitForSelector('.chat__formatacao:not([hidden])');
  assert.equal(await página.locator('.chat__formatacao button').count(), 3);
  await página.locator('.chat__formatacao button').first().dispatchEvent('mousedown');
  assert.equal(await textarea.inputValue(), '**texto** formatado');

  await textarea.fill('resposta nova');
  await textarea.press('Enter');
  await página.waitForSelector('.chat__mensagem[data-id="21"]');
  assert.equal(getResposta().respostaA, 20);
  assert.equal(await página.locator('.chat__mensagem[data-id="21"] .chat__citado').count(), 1);

  await página.locator('.chat__midia-preview').first().click();
  await página.waitForSelector('.chat__midia-modal[open]');
  assert.equal(await página.locator('.chat__modal-imagem').count(), 1);
  await página.locator('.chat__midia-modal-acoes .chat__modal-botao').last().click();

  await contexto.close();
});

test('perfil público usa drawer, data de entrada, plano, medalhas, sociais e personalização', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi();
  await página.goto(BASE + '/perfil.html?usuario=ander_teste', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('.perfil-comunidade__hero');

  const drawer = await página.locator('.conta.conta--drawer .conta__painel').boundingBox();
  assert.ok(drawer.width <= 448);
  assert.equal(await página.locator('.perfil-comunidade__hero').getAttribute('data-banner'), 'aurora');
  assert.equal(await página.locator('.perfil-comunidade__avatar').getAttribute('data-moldura'), 'ouro');
  assert.match(await página.locator('.perfil-comunidade__tempo').textContent(), /Desde 24\/08\/2026/);
  assert.equal(await página.locator('.perfil-comunidade__plano').getAttribute('data-plano'), 'plus');
  assert.match(await página.locator('.perfil-comunidade__plano').getAttribute('href'), /planos\.html$/);
  assert.equal(await página.locator('.perfil-comunidade__medalhas .medalha').count(), 2);
  assert.equal(await página.locator('.perfil-comunidade__sociais a').count(), 2);
  assert.ok(await página.locator('.perfil-comunidade__ferramenta svg').count() >= 1);

  await contexto.close();
});

test('drawer e chat cabem em 390 px sem rolagem lateral', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi({ viewport: { width: 390, height: 844 }, chat: true });
  await página.goto(BASE + '/conta/', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('#conta-conteudo:not([hidden])');
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth), 390);

  const caixa = await página.locator('.conta.conta--drawer .conta__painel').boundingBox();
  assert.ok(caixa.x >= 0 && caixa.x + caixa.width <= 390);

  await página.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await página.click('#chat-bolha');
  const chat = await página.locator('.chat__painel').boundingBox();
  assert.ok(chat.x >= 0 && chat.x + chat.width <= 390);
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth), 390);

  await contexto.close();
});
