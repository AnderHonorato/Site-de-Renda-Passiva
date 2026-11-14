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
  await contexto.route('**/api/atualizacoes', (rota) => rota.fulfill({ json: { itens: [] } }));
  await contexto.route('**/dados/atualizacoes.json', (rota) => rota.fulfill({ json: { itens: [] } }));
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

test('o blog aparece no sino com o texto completo e a página da atualização como ação', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ viewport: { width: 390, height: 844 } });
  const conteudo = [...Array(18)].map((_, i) => `Parágrafo ${i + 1}: este texto demonstra que o corpo completo da atualização permanece acessível dentro da rolagem de detalhes.`).join('\n\n') + '\n\nÚltimo parágrafo completo.';
  const publicação = {
    id: 'mudancas-de-novembro', slug: 'mudancas-de-novembro', categoria: 'melhoria', versao: '1.4.0',
    publicado_em: '2026-11-14T09:00:00.000Z', atualizado_em: '2026-11-14T09:00:00.000Z',
    pt: { titulo: 'Mudanças de novembro', resumo: 'Resumo curto da atualização.', conteudo },
  };
  await página.route('**/api/atualizacoes', (rota) => rota.fulfill({ json: { itens: [publicação] } }));
  await feedFalso(página, []);
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__contador:not([hidden])');
  await página.click('#abrir-notificações');
  await página.getByRole('button', { name: /Mudanças de novembro/ }).click();
  assert.match(await página.locator('.notificações__detalhe').textContent(), /Parágrafo 18:.*Último parágrafo completo\./s);
  assert.match(await página.locator('.notificações__detalhe').textContent(), /melhoria/);
  const área = await página.locator('.notificações__detalhe-corpo').evaluate(el => ({ altura: el.clientHeight, rolagem: el.scrollHeight }));
  assert.ok(área.rolagem > área.altura, 'o texto longo rola dentro dos detalhes');
  const painel = await página.locator('#painel-notificações').boundingBox();
  const ação = await página.locator('.notificações__ir').boundingBox();
  assert.ok(ação.y + ação.height <= painel.y + painel.height, 'CTA permanece visível antes do rodapé do painel');
  await página.getByRole('link', { name: /Ir para página/ }).click();
  await página.waitForURL(/atualizacoes\.html#mudancas-de-novembro/);
  await contexto.close();
});

test('o sino mostra novidades, abre detalhes sem navegar e guarda o que foi lido', { skip: pular }, async () => {
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
  assert.equal(await página.locator('.notificações__detalhe[role="dialog"]').isVisible(), true);
  assert.match(await página.locator('.notificações__detalhe').textContent(), /Resumo de/);
  assert.equal(await página.locator('.notificações__contador').textContent(), '1', 'abrir detalhe marca somente o item atual como lido');
  await página.keyboard.press('Escape');
  assert.equal(await página.locator('.notificações__detalhe').isVisible(), false, 'Escape volta à lista antes de fechar o painel');
  assert.equal(await página.evaluate(() => document.activeElement?.matches('.notificações__item')), true, 'o foco volta à lista');
  assert.equal(await página.locator('.notificações__painel').isVisible(), true);
  await página.click('.notificações__item >> nth=1');
  await página.getByRole('link', { name: /Ir para página/ }).click();
  await página.waitForURL(/\/f\/(juros|imc)\//);
  const lidas = await página.evaluate(() => JSON.parse(localStorage.getItem('notificacoes-lidas-v1')));
  assert.equal(lidas.length, 2, 'os itens abertos viram lidos');

  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  assert.equal(await página.locator('.notificações__contador:not([hidden])').count(), 0, 'todos os itens abertos continuam lidos');
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('limpar oculta os IDs atuais, preferência persiste e fica sincronizada entre abas', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await feedFalso(página, [item('limpar-1', 'Primeira'), item('limpar-2', 'Segunda')]);
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('.notificações__item', { state: 'attached' });
  await página.click('#abrir-notificações');
  const outraAba = await contexto.newPage();
  await feedFalso(outraAba, [item('limpar-1', 'Primeira'), item('limpar-2', 'Segunda')]);
  await outraAba.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await outraAba.waitForSelector('[data-notificações="alternar"]', { state: 'attached' });
  await página.getByRole('button', { name: /Marcar todas/ }).click();
  await outraAba.waitForFunction(() => !document.querySelector('.notificações__contador:not([hidden])'));
  await página.getByRole('button', { name: /Desativar notificações/ }).click();
  assert.equal(await página.locator('.notificações__contador:not([hidden])').count(), 0);
  await outraAba.waitForFunction(() => document.querySelector('[data-notificações="alternar"]')?.textContent === 'Ativar notificações');
  assert.equal(await outraAba.locator('[data-notificações="alternar"]').textContent(), 'Ativar notificações');
  await feedFalso(página, [item('limpar-1', 'Primeira'), item('limpar-2', 'Segunda'), item('limpar-futura', 'Futura')]);
  await página.evaluate(async () => {
    const m = await import(new URL('scripts/núcleo/notificações.js', location.origin + '/').href);
    m.registrarFonte('recarregar-teste-off', { carregar: async () => { await new Promise(resolve => setTimeout(resolve, 100)); window.__fonteRecarregada = true; return []; } });
  });
  await página.waitForFunction(() => window.__fonteRecarregada === true);
  await página.waitForFunction(() => document.querySelectorAll('.notificações__item').length === 2);
  assert.equal(await página.locator('.notificações__item').filter({ hasText: 'Futura' }).count(), 0, 'fonte nova não aparece enquanto o sino está desligado');
  await página.getByRole('button', { name: /Ativar notificações/ }).click();
  await página.waitForFunction(() => [...document.querySelectorAll('.notificações__item')].some(el => el.textContent.includes('Futura')));
  await página.getByRole('button', { name: /Limpar todas/ }).click();
  assert.equal(await página.locator('.notificações__item').count(), 0);
  assert.equal(await página.locator('.notificações__vazio').isVisible(), true);
  await outraAba.waitForFunction(() => document.querySelectorAll('.notificações__item').length === 0);
  assert.deepEqual(await página.evaluate(() => JSON.parse(localStorage.getItem('notificacoes-limpas-v1'))), ['ferramenta:limpar-1', 'ferramenta:limpar-2', 'ferramenta:limpar-futura']);
  await contexto.close();
});

test('topo das notificações permanece separado durante a rolagem, com barras no tema', {skip:pular},async()=>{
  for(const [viewport,tema] of [[{width:1366,height:600},'claro'],[{width:320,height:568},'escuro']]){
    const {contexto,página}=await abrir({viewport});
    try{
      await contexto.addInitScript(tema=>localStorage.setItem('portal.tema',JSON.stringify(tema)),tema);
      await feedFalso(página,Array.from({length:20},(_,i)=>item('juros','Ferramenta '+i)).map((x,i)=>({...x,id:'teste-'+i})));
      await página.goto(BASE+'/',{waitUntil:'networkidle'});await página.click('#abrir-notificações');
      const topo=await página.locator('.notificações__topo:not(.notificações__topo--detalhe)').boundingBox();
      const geometria=await página.locator('.notificações__topo:not(.notificações__topo--detalhe)').evaluate(el=>{const t=el.querySelector('b').getBoundingClientRect(),b=el.querySelector('button').getBoundingClientRect();return {tituloFim:t.right,botaoInicio:b.left};});
      assert.ok(geometria.tituloFim<=geometria.botaoInicio);
      await página.locator('.notificações__lista').evaluate(el=>el.scrollTop=el.scrollHeight);
      assert.ok(await página.locator('.notificações__lista').evaluate(el=>el.scrollTop>0));
      const depois=await página.locator('.notificações__topo:not(.notificações__topo--detalhe)').boundingBox();assert.ok(Math.abs(topo.y-depois.y)<1);
      assert.equal(await página.locator('.notificações__topo:not(.notificações__topo--detalhe)').evaluate(el=>el.contains(document.elementFromPoint(el.getBoundingClientRect().left+20,el.getBoundingClientRect().top+20))),true,'a lista não cobre o topo');
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
  assert.equal(await página.locator('button.notificações__item').count(), 3, 'itens são botões, sem navegação direta');
  assert.equal(await página.locator('.notificações__item b >> text=<img').count(), 1, 'o HTML aparece como texto');
  await página.locator('.notificações__item').nth(0).click();
  assert.equal(await página.locator('.notificações__ir:not([hidden])').count(), 0, 'javascript: não vira ação');
  await página.keyboard.press('Escape');
  await página.locator('.notificações__item').nth(1).click();
  assert.equal(await página.locator('.notificações__ir:not([hidden])').count(), 0, 'link externo não vira ação');
  await página.keyboard.press('Escape');
  const antes = página.url();
  await página.locator('.notificações__item').nth(2).click();
  assert.equal(página.url(), antes, 'o detalhe ainda não navega');
  assert.equal(await página.locator('.notificações__ir:not([hidden])').count(), 1, 'o link do próprio site fica no CTA');
  assert.match(await página.locator('.notificações__ir').getAttribute('href'), /\/f\/juros\//);
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
