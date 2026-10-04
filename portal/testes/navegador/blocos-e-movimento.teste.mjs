/**
 * Testes de navegador (Onda 0): erro isolado por bloco e movimento.
 *
 * Precisam do Playwright (no monorrepo ele vive em ander-flow/) e de um navegador:
 *   npm run testar:navegador
 * Sem Playwright, os testes são pulados com aviso, nunca passam em silêncio.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4432;
const BASE = `http://127.0.0.1:${PORTA}`;

let chromium = null;
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
]) {
  try { chromium = carregar().chromium; break; } catch { /* próximo */ }
}
const pular = chromium ? false : 'Playwright não encontrado (npm i -D playwright)';

let servidor;
let navegador;

before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  try { navegador = await chromium.launch(); } catch { navegador = await chromium.launch({ channel: 'msedge' }); }
});
after(async () => {
  await navegador?.close();
  servidor?.kill();
});

async function abrir(opções = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, ...opções });
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  return { contexto, página, erros };
}

const bloquear = (página, trecho) => página.route(`**/${trecho}**`, (rota) => rota.abort());

test('falha na busca: só a busca mostra a mensagem; listas, cabeçalho e vitrine seguem', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  // O endereço chega com o acento codificado (n%C3%BAcleo).
  await página.route(/n%C3%BAcleo\/busca\.js/, (rota) => rota.abort());
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  assert.equal(await página.locator('#bloco-busca > .bloco-falhou').count(), 1, 'a mensagem aparece no bloco da busca');
  assert.ok(await página.locator('#lista-prontas a').count() > 10, 'as listas continuam desenhadas');
  assert.equal(await página.locator('#lista-prontas .bloco-falhou').count(), 0);
  await página.click('#abrir-categorias');
  assert.equal(await página.locator('#painel-categorias').isVisible(), true, 'o menu do cabeçalho responde');
  await contexto.close();
});

test('falha na vitrine: só ela mostra a mensagem; a busca continua respondendo', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await bloquear(página, 'vitrine/vitrine-cenas.js');
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  assert.equal(await página.locator('#bloco-vitrine > .bloco-falhou').count(), 1);
  await página.fill('#busca', 'juros');
  await página.waitForSelector('#sugestões:not([hidden]) .sugestões__item');
  assert.ok(await página.locator('.sugestões__item').count() > 0, 'a busca devolve sugestões');
  assert.ok(await página.locator('#lista-prontas a').count() > 10);
  await contexto.close();
});

test('falha numa ferramenta: só a área dela falha, e "Tentar de novo" recupera', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await bloquear(página, 'scripts/ferramentas/juros.js');
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  assert.equal(await página.locator('#ferramenta > .bloco-falhou').count(), 1);
  await página.click('#abrir-categorias');
  assert.equal(await página.locator('#painel-categorias').isVisible(), true, 'o cabeçalho responde');
  await página.keyboard.press('Escape'); // fecha o menu, que cobre parte da página
  await página.unroute('**/scripts/ferramentas/juros.js**');
  await página.click('.bloco-falhou button:has-text("Tentar de novo")');
  await página.waitForSelector('#formulário', { timeout: 5000 });
  assert.equal(await página.locator('#ferramenta > .bloco-falhou').count(), 0);
  await contexto.close();
});

test('com movimento reduzido nada fica animando e a contagem mostra o valor final na hora', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ reducedMotion: 'reduce' });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const resultado = await página.evaluate(() => ({
    longas: document.getAnimations().filter((a) => {
      const tempo = a.effect?.getComputedTiming?.().duration;
      return typeof tempo === 'number' && tempo > 5;
    }).length,
    conta: document.querySelector('[data-conta]')?.textContent,
    final: document.querySelector('[data-conta]')?.dataset.conta,
  }));
  assert.equal(resultado.longas, 0, 'nenhuma animação com duração real');
  assert.equal(resultado.conta, resultado.final);
  await contexto.close();
});

test('as entradas animadas não deslocam o layout (CLS baixo) na página inicial e numa ferramenta', { skip: pular }, async () => {
  for (const caminho of ['/', '/f/porcentagem/']) {
    const { contexto, página } = await abrir();
    await página.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await página.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' });
    await página.waitForTimeout(1500);
    const cls = await página.evaluate(() => window.__cls);
    assert.ok(cls < 0.1, `CLS de ${caminho} foi ${cls.toFixed(3)}`);
    await contexto.close();
  }
});

test('a página 404 mostra o desenho ao lado do texto', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  const resposta = await página.goto(`${BASE}/nao-existe/nada`, { waitUntil: 'networkidle' });
  assert.equal(resposta.status(), 404);
  const largura = await página.evaluate(() => document.querySelector('img.ilustração')?.naturalWidth ?? 0);
  assert.ok(largura > 0, 'o SVG da 404 carregou');
  assert.equal(await página.locator('h1').innerText(), 'Esta página não existe');
  await contexto.close();
});
