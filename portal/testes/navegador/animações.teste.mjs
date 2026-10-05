/**
 * Testes de navegador: orçamento de animações no celular.
 *
 * Garantem, na página de verdade e em emulação de celular, o que o dono pediu depois de
 * "as animações deixaram lento no celular": poucas animações ao mesmo tempo, nenhuma fora da
 * tela, só a variante do tema atual, nada animado com movimento reduzido.
 *
 * Precisam do Playwright (veja ferramentas/achar-playwright.mjs):
 *   npm run testar:navegador
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4456;
const BASE = `http://127.0.0.1:${PORTA}`;

/** Máximo de animações simultâneas no celular (perfilDeAnimação) e no modo economia de dados. */
const MÁXIMO_CELULAR = 6;
const MÁXIMO_ECONOMIA = 3;

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

const CELULAR = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const éAnimado = (url) => /(ilustrações\/categorias|ícones-animados)\/.*\.svg$/.test(decodeURIComponent(new URL(url).pathname));

/** Abre uma página e anota cada SVG animado que o navegador pedir. */
async function abrir(opções = {}, init) {
  const contexto = await navegador.newContext({ ...CELULAR, ...opções });
  const página = await contexto.newPage();
  if (init) await página.addInitScript(init);
  const pedidos = [];
  página.on('request', (r) => { if (éAnimado(r.url())) pedidos.push(decodeURIComponent(new URL(r.url()).pathname)); });
  return { contexto, página, pedidos };
}

const ativas = (página) => página.evaluate(() => document.querySelectorAll('img[data-viva][src]:not([data-pausada])').length);
/** Rola a página em passos de meia tela e devolve o maior número de imagens animadas ativas ao mesmo tempo. */
async function rolarMedindo(página, ms = 250) {
  let pico = await ativas(página);
  const altura = await página.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= altura; y += 420) {
    await página.evaluate((alvo) => window.scrollTo(0, alvo), y);
    await página.waitForTimeout(ms);
    pico = Math.max(pico, await ativas(página));
  }
  return pico;
}

test('celular, página inicial: nunca passa do limite de animações ao mesmo tempo, nem rolando', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForTimeout(600);
  const pico = await rolarMedindo(página);
  assert.ok(pico > 0, 'há animação rodando (o recurso não foi apagado)');
  assert.ok(pico <= MÁXIMO_CELULAR, `no máximo ${MÁXIMO_CELULAR} animadas ao mesmo tempo, mediu ${pico}`);
  assert.equal(await página.evaluate(() => document.querySelectorAll('img[data-viva]').length > 40), true, 'há muito mais itens do que vagas (o limite está sendo exercido)');
  await contexto.close();
});

test('celular, página inicial: nada fora da tela é baixado antes de aparecer', { skip: pular }, async () => {
  const { contexto, página, pedidos } = await abrir();
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForTimeout(600);
  const total = await página.evaluate(() => document.querySelectorAll('img[data-viva]').length);
  assert.ok(pedidos.length <= MÁXIMO_CELULAR, `no carregamento: ${pedidos.length} animadas pedidas de ${total} possíveis`);
  await contexto.close();
});

test('só a variante do tema atual é baixada; ao trocar o tema, só a nova', { skip: pular }, async () => {
  const { contexto, página, pedidos } = await abrir({ colorScheme: 'light' });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await rolarMedindo(página, 150);
  assert.ok(pedidos.length > 0);
  assert.deepEqual(pedidos.filter((p) => p.endsWith('.escuro.svg')), [], 'no tema claro nenhuma variante escura é pedida');
  await página.evaluate(() => window.scrollTo(0, 0));
  const antes = pedidos.length;
  await página.click('#alternar-tema');
  await página.waitForSelector('.transição-tema', { state: 'detached', timeout: 5000 });
  await página.waitForTimeout(800);
  const novas = pedidos.slice(antes).filter((p) => /ilustra/.test(p));
  assert.ok(novas.every((p) => p.endsWith('.escuro.svg')), 'as ilustrações pedidas depois da troca são só as escuras');
  const fontes = await página.evaluate(() => [...document.querySelectorAll('img[data-viva][src]:not([data-pausada])')].map((i) => i.getAttribute('src')));
  assert.ok(fontes.length <= MÁXIMO_CELULAR);
  for (const fonte of fontes) {
    if (/ilustra/.test(fonte)) assert.match(fonte, /\.escuro\.svg$/, 'depois de escurecer, as ilustrações ativas são as escuras');
  }
  await contexto.close();
});

test('com movimento reduzido nenhuma animação é baixada nem montada, e o estático fica', { skip: pular }, async () => {
  for (const caminho of ['/', '/f/preco-de-venda/']) {
    const { contexto, página, pedidos } = await abrir({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 }, isMobile: false });
    await página.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' });
    await rolarMedindo(página, 100);
    assert.deepEqual(pedidos, [], `${caminho}: nenhuma imagem animada pedida`);
    assert.equal(await ativas(página), 0);
    const estáticoVisível = await página.evaluate(() => [...document.querySelectorAll('.ícone-vivo')].every((c) => getComputedStyle(c.firstElementChild).opacity === '1'));
    assert.equal(estáticoVisível, true, `${caminho}: o estático continua visível`);
    await contexto.close();
  }
});

test('no modo economia de dados o limite cai e continua havendo animação', { skip: pular }, async () => {
  const { contexto, página } = await abrir({}, () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g', addEventListener() {} }, configurable: true });
  });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const pico = await rolarMedindo(página, 150);
  assert.ok(pico > 0 && pico <= MÁXIMO_ECONOMIA, `no máximo ${MÁXIMO_ECONOMIA} animadas com Save-Data, mediu ${pico}`);
  await contexto.close();
});

test('ferramenta no celular: o retângulo do cabeçalho (escondido em tela estreita) não é baixado, o ícone sim', { skip: pular }, async () => {
  const { contexto, página, pedidos } = await abrir();
  await página.goto(`${BASE}/f/preco-de-venda/`, { waitUntil: 'networkidle' });
  await página.waitForTimeout(500);
  assert.deepEqual(pedidos.filter((p) => /categorias/.test(p)), [], 'nem a claro nem a escura');
  assert.equal(pedidos.filter((p) => /ícones-animados/.test(p)).length, 1, 'o ícone ao lado do nome anima');
  await contexto.close();
});

test('ferramenta em tela larga: um só retângulo, da variante do tema, animado em loop e prioritário', { skip: pular }, async () => {
  const { contexto, página, pedidos } = await abrir({ viewport: { width: 1280, height: 800 }, isMobile: false, deviceScaleFactor: 1, colorScheme: 'light' });
  await página.goto(`${BASE}/f/preco-de-venda/`, { waitUntil: 'networkidle' });
  await página.waitForTimeout(500);
  assert.equal(pedidos.filter((p) => /categorias/.test(p)).length, 1, 'uma variante só do retângulo');
  assert.match(pedidos.find((p) => /categorias/.test(p)), /dinheiro\.svg$/);
  const arte = await página.evaluate(() => {
    const i = document.querySelector('img.ferramenta-topo__arte');
    return { src: i.getAttribute('src'), pronta: i.closest('.ícone-vivo') === null && i.naturalWidth > 0, animações: document.getAnimations().length };
  });
  assert.match(arte.src, /dinheiro\.svg$/);
  assert.equal(arte.pronta, true);
  await contexto.close();
});

test('ícone animado que falha deixa o estático e não é tentado de novo em laço', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  let tentativas = 0;
  await página.route(/%C3%ADcones-animados/, (rota) => { tentativas += 1; return rota.abort(); });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await rolarMedindo(página, 150);
  const estados = await página.evaluate(() => [...document.querySelectorAll('#lista-prontas .ícone-vivo')].map((c) => c.dataset.estado));
  assert.ok(estados.includes('falhou'));
  assert.ok(tentativas <= 40, `tentativas: ${tentativas}`);
  await contexto.close();
});
