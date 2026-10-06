/**
 * Testes de navegador: proteção contra cópia e aviso de bloqueador de anúncios.
 *
 *   npm run testar:navegador
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4466;
const BASE = `http://127.0.0.1:${PORTA}`;

const chromium = acharChromium();
const pular = chromium ? false : 'Playwright não encontrado (defina PLAYWRIGHT_PACOTE)';
let servidor;
let navegador;

before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  navegador = await abrirNavegador(chromium);
});
after(async () => {
  await navegador?.close();
  servidor?.kill();
});

async function abrir(init) {
  const contexto = await navegador.newContext({ viewport: { width: 1200, height: 800 } });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  if (init) await página.addInitScript(init);
  const erros = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  return { contexto, página, erros };
}

/** Seleciona o texto de um elemento e dispara o comando de cópia, devolvendo se o navegador deixou passar. */
const copiar = (página, seletor) => página.evaluate((sel) => {
  const alvo = document.querySelector(sel);
  const faixa = document.createRange();
  faixa.selectNodeContents(alvo);
  const seleção = getSelection();
  seleção.removeAllRanges();
  seleção.addRange(faixa);
  const evento = new ClipboardEvent('copy', { cancelable: true, bubbles: true, clipboardData: new DataTransfer() });
  document.dispatchEvent(evento);
  return { bloqueado: evento.defaultPrevented, texto: evento.clipboardData.getData('text/plain') };
}, seletor);

test('anti-cópia: o texto da página não copia, mas o campo e o resultado copiam', { skip: pular }, async () => {
  const { contexto, página, erros } = await abrir();
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  assert.equal(await página.evaluate(() => document.documentElement.classList.contains('anti-cópia')), true);

  const texto = await copiar(página, 'h1');
  assert.equal(texto.bloqueado, true, 'copiar o título é barrado');
  assert.match(texto.texto, /Conteúdo protegido/);
  assert.equal(await página.evaluate(() => getComputedStyle(document.body).userSelect), 'none');

  await página.fill('input', '1234');
  const campo = await copiar(página, 'input');
  assert.equal(campo.bloqueado, false, 'copiar de um campo continua permitido');

  const menu = await página.evaluate(() => {
    const evento = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    document.querySelector('h1').dispatchEvent(evento);
    return evento.defaultPrevented;
  });
  assert.equal(menu, true, 'o menu de contexto do texto é barrado');
  assert.deepEqual(erros, []);
  await contexto.close();
});

/**
 * Simula a página gerada com anúncios ativos e o consentimento dado. O script de início roda antes de
 * existir o <html>, então espera ele nascer para marcar os atributos antes de qualquer módulo executar.
 */
const comAnúncios = (consentimento = true, extra = '') => `
  ${consentimento ? "localStorage.setItem('consentimento-v1', JSON.stringify({ publicidade: true }));" : ''}
  const marcar = () => {
    document.documentElement.dataset.anuncios = 'sim';
    document.documentElement.dataset.exigirSemBloqueador = 'sim';
    ${extra}
  };
  if (document.documentElement) marcar();
  else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); marcar(); } }).observe(document, { childList: true });
`;
/** Faz o que um bloqueador faz: esconde as classes de anúncio (por folha adotada, que a CSP permite). */
const bloquear = (página) => página.evaluate(() => {
  const folha = new CSSStyleSheet();
  folha.replaceSync('.adsbox, .ad-banner { display: none !important; }');
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, folha];
});

test('anti-bloqueador: sem bloqueador a ferramenta fica livre', { skip: pular }, async () => {
  const { contexto, página } = await abrir(comAnúncios());
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  await página.waitForTimeout(6500);
  assert.equal(await página.locator('dialog.aviso-de-bloqueador').count(), 0);
  assert.equal(await página.locator('#ferramenta[inert]').count(), 0);
  await contexto.close();
});

test('anti-bloqueador: com bloqueador a ferramenta pausa, e volta quando ele é desligado', { skip: pular }, async () => {
  const { contexto, página } = await abrir(comAnúncios());
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  await bloquear(página);
  await página.waitForSelector('dialog.aviso-de-bloqueador[open]', { timeout: 10000 });
  assert.equal(await página.locator('#ferramenta[inert]').count(), 1, 'a ferramenta fica inerte');
  // Esc não fecha o aviso.
  await página.keyboard.press('Escape');
  assert.equal(await página.locator('dialog.aviso-de-bloqueador[open]').count(), 1);
  // Apagar o aviso pelo console não adianta: ele volta.
  await página.evaluate(() => document.querySelector('dialog.aviso-de-bloqueador').remove());
  await página.waitForSelector('dialog.aviso-de-bloqueador[open]', { timeout: 6000 });
  // Desligar o bloqueador libera.
  await página.evaluate(() => { document.adoptedStyleSheets = []; });
  await página.waitForFunction(() => !document.querySelector('dialog.aviso-de-bloqueador'), null, { timeout: 8000 });
  assert.equal(await página.locator('#ferramenta[inert]').count(), 0);
  await contexto.close();
});

test('anti-bloqueador: sem consentimento para anúncios a ferramenta nunca é bloqueada', { skip: pular }, async () => {
  const { contexto, página } = await abrir(comAnúncios(false));
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  await bloquear(página);
  await página.waitForTimeout(6500);
  assert.equal(await página.locator('dialog.aviso-de-bloqueador').count(), 0);
  await contexto.close();
});

test('anti-bloqueador: Plus e Premium (sem anúncios) nunca são bloqueados', { skip: pular }, async () => {
  const { contexto, página } = await abrir(comAnúncios(true, "document.documentElement.dataset.semAnuncios = 'sim';"));
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  await bloquear(página);
  await página.waitForTimeout(6500);
  assert.equal(await página.locator('dialog.aviso-de-bloqueador').count(), 0);
  await contexto.close();
});
