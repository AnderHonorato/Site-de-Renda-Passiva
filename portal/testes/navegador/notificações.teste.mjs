/**
 * Testes de navegador: sino de notificações (visitante sem conta).
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
const PORTA = 4468;
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

async function abrir(opções = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 1200, height: 800 }, ...opções });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  return { contexto, página, erros };
}

/** Feed falso e estável: não depende da data de hoje nem de quais ferramentas são novas. */
const feedFalso = (página, itens) => página.route('**/dados/novidades.json', (rota) => rota.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ versão: 1, itens }),
}));
const hoje = new Date().toISOString().slice(0, 10);
const item = (slug, nome) => ({
  id: `ferramenta:${slug}`, data: hoje, slug, link: `f/${slug}/`,
  pt: { título: `Nova ferramenta: ${nome}`, texto: `Resumo de ${nome}` }, en: { título: `New tool: ${nome}`, texto: `Summary of ${nome}` },
});

test('o sino mostra as novidades para quem não tem conta, leva à ferramenta e guarda o que foi lido', { skip: pular }, async () => {
  const { contexto, página, erros } = await abrir();
  await feedFalso(página, [item('juros', 'Juros'), item('imc', 'IMC')]);
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  assert.equal(await página.locator('.notificações__contador').textContent(), '2');
  await página.click('#abrir-notificações');
  assert.equal(await página.locator('#painel-notificações').isVisible(), true);
  assert.equal(await página.locator('.notificações__item').count(), 2);
  assert.match(await página.locator('.notificações__item b').first().textContent(), /Nova ferramenta/);

  await página.click('.notificações__item >> nth=0');
  await página.waitForURL(/\/f\/(juros|imc)\//);
  const lidas = await página.evaluate(() => JSON.parse(localStorage.getItem('notificacoes-lidas-v1')));
  assert.equal(lidas.length, 1, 'o item aberto vira lido');

  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  assert.equal(await página.locator('.notificações__contador').textContent(), '1', 'só sobrou um não lido');
  await página.click('#abrir-notificações');
  await página.click('[data-notificações="marcar-todas"]');
  assert.equal(await página.locator('.notificações__contador:not([hidden])').count(), 0, 'marcar todas zera o contador');
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('topo das notificações permanece separado durante a rolagem, com barras no tema', {skip:pular},async()=>{
  for(const [viewport,tema] of [[{width:1366,height:600},'claro'],[{width:320,height:568},'escuro']]){
    const {contexto,página}=await abrir({viewport});
    try{
      await contexto.addInitScript(tema=>localStorage.setItem('portal.tema',JSON.stringify(tema)),tema);
      await feedFalso(página,Array.from({length:20},(_,i)=>item('juros','Ferramenta '+i)).map((x,i)=>({...x,id:'teste-'+i})));
      await página.goto(BASE+'/',{waitUntil:'networkidle'});await página.click('#abrir-notificações');
      const topo=await página.locator('.notificações__topo').boundingBox();
      const geometria=await página.locator('.notificações__topo').evaluate(el=>{const t=el.querySelector('b').getBoundingClientRect(),b=el.querySelector('button').getBoundingClientRect();return {tituloFim:t.right,botaoInicio:b.left};});
      assert.ok(geometria.tituloFim<=geometria.botaoInicio);
      await página.locator('.notificações__lista').evaluate(el=>el.scrollTop=el.scrollHeight);
      assert.ok(await página.locator('.notificações__lista').evaluate(el=>el.scrollTop>0));
      const depois=await página.locator('.notificações__topo').boundingBox();assert.ok(Math.abs(topo.y-depois.y)<1);
      assert.equal(await página.locator('.notificações__topo').evaluate(el=>el.contains(document.elementFromPoint(el.getBoundingClientRect().left+20,el.getBoundingClientRect().top+20))),true,'a lista não cobre o topo');
      assert.equal(await página.locator('.notificações__lista').evaluate(el=>getComputedStyle(el).scrollbarWidth),'thin');
      assert.notEqual(await página.locator('.notificações__lista').evaluate(el=>getComputedStyle(el).scrollbarColor),'auto');
      await página.screenshot({path:join(RAIZ,`.execucao/notificacoes-rolagem-${tema}-2026-10-08.png`)});
      await página.getByRole('button',{name:/Marcar todas|Marcar todos/}).click();
      assert.equal(await página.locator('.notificações__contador:not([hidden])').count(),0);
    }finally{await contexto.close();}
  }
});

test('em inglês o sino mostra os textos em inglês', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await feedFalso(página, [item('juros', 'Juros')]);
  await página.goto(`${BASE}/en/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  await página.click('#abrir-notificações');
  assert.match(await página.locator('.notificações__item b').first().textContent(), /New tool/);
  await contexto.close();
});

test('texto malicioso vira só texto e link de outro lugar ou javascript: não vira link', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await feedFalso(página, []);
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.evaluate(async () => {
    const m = await import(new URL('scripts/núcleo/notificações.js', location.origin + '/').href);
    m.registrarFonte('teste', {
      carregar: async () => [
        { id: 't1', título: '<img src=x onerror="window.__xss=1">', texto: '<b>negrito</b>', link: 'javascript:window.__xss=2', data: '2026-10-06', origem: 'manual' },
        { id: 't2', título: 'Fora', texto: 'x', link: 'https://exemplo.com/', data: '2026-10-05', origem: 'manual' },
        { id: 't3', título: 'Dentro', texto: 'x', link: 'f/juros/', data: '2026-10-04', origem: 'manual' },
      ],
    });
  });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  await página.click('#abrir-notificações');
  await página.waitForSelector('.notificações__item');
  assert.equal(await página.evaluate(() => window.__xss), undefined, 'nenhum script executou');
  assert.equal(await página.locator('.notificações__item img').count(), 0);
  assert.equal(await página.locator('a.notificações__item').count(), 1, 'só o link do próprio site vira link');
  assert.equal(await página.locator('.notificações__item b >> text=<img').count(), 1, 'o HTML aparece como texto');
  await contexto.close();
});

test('no celular o painel cabe na tela', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ viewport: { width: 360, height: 700 } });
  await feedFalso(página, [item('juros', 'Juros')]);
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  await página.click('#abrir-notificações');
  const caixa = await página.locator('#painel-notificações').boundingBox();
  assert.ok(caixa.x >= 0 && caixa.x + caixa.width <= 360, `painel em ${caixa.x}..${caixa.x + caixa.width}`);
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth), 360);
  await contexto.close();
});
