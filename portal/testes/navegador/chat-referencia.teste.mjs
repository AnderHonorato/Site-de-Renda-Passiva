import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://127.0.0.1:4491';
const chromium = acharChromium();
const skip = chromium ? false : 'Playwright não encontrado';
let servidor, navegador;
before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', '4491', '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  navegador = await abrirNavegador(chromium);
});
after(async () => { await navegador?.close(); servidor?.kill(); });

const luna = { id: 2, nome: 'Luna', usuario: 'luna', avatar: 'lua', nivel: 7 };
const ander = { id: 1, nome: 'Ander', usuario: 'ander', avatar: 'sol', nivel: 4, chat_aceito: true };
const mensagens = [
  { id: 10, autor: luna, texto: 'Qual ferramenta vocês usam para organizar um novo projeto?', criado_em: '2026-10-07 13:00:00' },
  { id: 11, autor: luna, texto: 'Estou preparando uma planilha para acompanhar os resultados.', criado_em: '2026-10-07 13:01:00' },
  { id: 12, autor: ander, texto: 'Uso a calculadora de preço e salvo os trabalhos no meu perfil.', criado_em: '2026-10-08 13:02:00' },
];
async function abrir(viewport, tema = 'claro') {
  const contexto = await navegador.newContext({ viewport, reducedMotion: 'reduce' });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  await contexto.addInitScript(tema => {
    localStorage.setItem('portal.tema', JSON.stringify(tema));
    class Fonte {
      constructor() { window.__fonte = this; this.listeners = new Map(); }
      addEventListener(nome, fn) { this.listeners.set(nome, fn); }
      close() {}
    }
    window.EventSource = Fonte;
  }, tema);
  let enviado;
  await contexto.route('**/api/**', async rota => {
    const url = new URL(rota.request().url());
    const p = url.pathname;
    let body = { ok: true };
    if (p === '/api/autenticacao/sessao') body = { usuario: ander, chat_aceito: true, chat_habilitado: true };
    else if (p === '/api/chat/salas') body = { salas: [
      { id: 'global', nome: 'Geral', tipo: 'global', nao_lidas: 1 },
      { id: 'educacao', nome: 'Educação', tipo: 'categoria' },
      { id: 'direta-1-2', tipo: 'direta', outro: luna },
    ] };
    else if (p.endsWith('/mensagens') && rota.request().method() === 'POST') {
      enviado = rota.request().postDataJSON();
      body = { mensagem: { id: 13, autor: ander, texto: enviado.texto, criado_em: '2026-10-08 13:03:00', resposta: { id: 10, usuario: 'luna', texto: mensagens[0].texto } } };
    } else if (p.endsWith('/mensagens')) body = { mensagens: url.searchParams.has('antes') ? [] : mensagens };
    else if (p === '/api/novidades') body = { novidades: [] };
    else if (p === '/api/banners') body = { itens: [] };
    await rota.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  const pagina = await contexto.newPage();
  await pagina.goto(BASE + '/ajuda.html');
  await pagina.waitForSelector('#chat-bolha');
  await pagina.click('#chat-bolha');
  await pagina.waitForSelector('.chat__mensagem[data-id="12"]');
  return { contexto, pagina, enviado: () => enviado };
}

test('chat tem três colunas, mensagens abertas, dias e agrupamento sem repetir identidade', { skip }, async () => {
  const { contexto, pagina } = await abrir({ width: 1366, height: 768 });
  try {
    const painel = await pagina.locator('.chat__painel').boundingBox();
    assert.ok(painel.width > 1200);
    assert.ok(painel.y >= 0 && painel.y + painel.height <= 768);
    assert.equal(await pagina.locator('.chat__participante').count(), 2);
    assert.equal(await pagina.locator('.chat__participante-nivel').first().textContent(), 'Nível 7');
    assert.equal(await pagina.locator('.chat__dia').count(), 2);
    assert.equal(await pagina.locator('.chat__mensagem--continuacao').count(), 1);
    assert.equal(await pagina.locator('[data-id="11"] .chat__mensagem-avatar').isVisible(), false);
    assert.equal(await pagina.locator('.chat__mini-perfil,.chat__autor-selos').count(), 0);
    const estilo = await pagina.locator('[data-id="10"]').evaluate(el => ({ border: getComputedStyle(el).borderWidth, width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth }));
    assert.equal(estilo.border, '0px');
    assert.ok(estilo.width >= estilo.parent - 30);
    const campo = await pagina.locator('textarea').boundingBox();
    const conversa = await pagina.locator('.chat__conversa').boundingBox();
    assert.ok(campo.width > conversa.width * .8, 'o campo público ocupa a largura sem coluna fantasma do anexo');
    await pagina.screenshot({ path: join(RAIZ, '.execucao/chat-referencia-desktop.png') });
    await pagina.locator('.chat__pesquisa-salas').fill('Educação');
    assert.equal(await pagina.locator('.chat__sala').count(), 1);
    assert.equal(await pagina.locator('.chat__sala').getAttribute('data-sala-id'), 'educacao');
  } finally { await contexto.close(); }
});

test('chat celular abre salas em painel e volta à conversa sem estouro', { skip }, async () => {
  for (const width of [320, 390]) {
    const { contexto, pagina } = await abrir({ width, height: 700 });
    try {
      assert.equal(await pagina.locator('.chat__lateral').isVisible(), false);
      await pagina.locator('.chat__alternar-salas').click();
      assert.equal(await pagina.locator('.chat__lateral').isVisible(), true);
      await pagina.locator('[data-sala-id="direta-1-2"]').click();
      await pagina.waitForSelector('.chat__anexo');
      assert.equal(await pagina.locator('.chat__lateral').isVisible(), false);
      const painel = await pagina.locator('.chat__painel').boundingBox();
      assert.ok(painel.x >= 0 && painel.x + painel.width <= width);
      assert.ok(painel.y + painel.height <= 700);
      assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth), width);
      await pagina.screenshot({ path: join(RAIZ, '.execucao/chat-referencia-mobile-' + width + '.png') });
    } finally { await contexto.close(); }
  }
});

test('chat mantém resposta, envio, atualização em tempo real e moderação', { skip }, async () => {
  const { contexto, pagina, enviado } = await abrir({ width: 1200, height: 800 });
  try {
    await pagina.locator('[data-id="10"] .chat__responder').click();
    assert.equal(await pagina.locator('.chat__reply').isVisible(), true);
    await pagina.locator('textarea').fill('Vou testar agora.');
    await pagina.locator('textarea').press('Enter');
    await pagina.waitForSelector('[data-id="13"]');
    assert.equal(enviado().respostaA, 10);
    assert.equal(await pagina.locator('[data-id="13"] .chat__citado').count(), 1);
    await pagina.evaluate(() => window.__fonte.listeners.get('mensagem')({ data: JSON.stringify({ salaId: 'global', mensagem: { id: 14, autor: { id: 3, nome: 'Sofia', usuario: 'sofia', avatar: 'flor', nivel: 2 }, texto: 'Olá!', criado_em: '2026-10-08 13:04:00' } }) }));
    await pagina.waitForSelector('[data-id="14"]');
    assert.equal(await pagina.locator('.chat__participante').count(), 3);
    await pagina.evaluate(() => window.__fonte.listeners.get('remocao')({ data: JSON.stringify({ removidaId: 14 }) }));
    assert.equal(await pagina.locator('[data-id="14"]').count(), 0);
    assert.equal(await pagina.locator('.chat__participante').count(), 2);
  } finally { await contexto.close(); }
});

test('chat usa tema escuro e cabe em computador de altura curta', { skip }, async () => {
  const { contexto, pagina } = await abrir({ width: 1024, height: 500 }, 'escuro');
  try {
    assert.equal(await pagina.locator('html').getAttribute('data-tema'), 'escuro');
    const painel = await pagina.locator('.chat__painel').boundingBox();
    assert.ok(painel.y >= 0 && painel.y + painel.height <= 500);
    const layout = await pagina.locator('.chat__layout').boundingBox();
    assert.ok(layout.height > 150);
    await pagina.locator('.chat__alternar-salas').click();
    assert.equal(await pagina.locator('.chat__lateral').isVisible(), false);
    assert.equal(await pagina.locator('.chat__participantes').isVisible(), true);
    await pagina.screenshot({ path: join(RAIZ, '.execucao/chat-referencia-escuro.png') });
  } finally { await contexto.close(); }
});
