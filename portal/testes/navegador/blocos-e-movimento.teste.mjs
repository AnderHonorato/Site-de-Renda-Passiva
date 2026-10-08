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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4432;
const BASE = `http://127.0.0.1:${PORTA}`;

const chromium = acharChromium();
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
  navegador = await abrirNavegador(chromium);
});
after(async () => {
  await navegador?.close();
  servidor?.kill();
});

/** Por padrão a pessoa já viu o popup de boas-vindas (ele cobre a página); `primeiraVisita: true` mostra o popup. */
async function abrir({ primeiraVisita = false, ...opções } = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, ...opções });
  if (!primeiraVisita) await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  return { contexto, página, erros };
}

const bloquear = (página, trecho) => página.route(`**/${trecho}**`, (rota) => rota.abort());

test('publicidade bloqueada não derruba listas, catálogo, consentimento nem apresentação automática', {skip:pular}, async()=>{
  const {contexto,página}=await abrir({primeiraVisita:true});
  try {
    await página.route('**/publicidade/**', rota=>rota.abort('blockedbyclient'));
    await página.goto(BASE+'/',{waitUntil:'networkidle'});
    await página.waitForFunction(()=>document.documentElement.dataset.consentimentoPronto==='sim');
    assert.equal(await página.locator('#lista-prontas .ferramenta-linha').count(),65);
    assert.equal(await página.locator('#lista-prontas .bloco-falhou').count(),0);
    await página.waitForSelector('dialog[open] [data-vitrine]');
    await página.keyboard.press('Escape');
    await página.goto(BASE+'/ferramentas.html',{waitUntil:'networkidle'});
    assert.ok(await página.locator('.ferramenta-linha').count()>=65);
    assert.equal(await página.locator('.bloco-falhou').count(),0);
  } finally {await contexto.close();}
});

test('menu de categorias cabe em telas baixas e continua acessível após redimensionar', {skip:pular}, async()=>{
  const {contexto,página}=await abrir();
  try {
    await página.goto(BASE+'/',{waitUntil:'networkidle'});
    for(const viewport of [{width:1366,height:600},{width:1024,height:600},{width:934,height:510},{width:900,height:390}]){
      await página.setViewportSize(viewport);
      await página.locator('#abrir-categorias').hover();
      await página.locator('#painel-categorias').waitFor({state:'visible'});
      await página.waitForFunction(()=>document.getElementById('painel-categorias').getAnimations().every(a=>a.playState==='finished'));
      const geometria=await página.locator('#painel-categorias').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));
      assert.ok(geometria.top>=0&&geometria.bottom<=viewport.height-14,JSON.stringify({viewport,geometria}));
      assert.equal(geometria.overflow,'auto');
      await página.locator('#painel-categorias').evaluate(el=>{el.scrollTop=el.scrollHeight;});
      if(geometria.scroll>geometria.height+1)assert.ok(await página.locator('#painel-categorias').evaluate(el=>el.scrollTop>0),JSON.stringify({viewport,geometria}));
    }
    await página.keyboard.press('Escape');
    assert.equal(await página.locator('#painel-categorias').isHidden(),true);
    await página.locator('#abrir-categorias').click();
    await página.locator('#painel-categorias').waitFor({state:'visible'});
    await página.setViewportSize({width:390,height:640});
    await página.locator('#painel-categorias').waitFor({state:'hidden'});
  } finally {await contexto.close();}
});

test('busca fica junto do sino e abre somente um campo curto para a esquerda', {skip:pular},async()=>{
  for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:740}]){
    const {contexto,página}=await abrir({viewport});
    try {
      await página.goto(BASE+'/',{waitUntil:'networkidle'});
      assert.equal(await página.locator('.topo__fim > :first-child').getAttribute('id'),'busca-topo');
      const fechada=await página.locator('#ir-para-busca').boundingBox();
      const sino=await página.locator('#abrir-notificações').boundingBox();
      assert.ok(fechada.x+fechada.width<=sino.x+1,'lupa imediatamente antes do sino');
      await página.click('#ir-para-busca');
      await página.waitForTimeout(380);
      const aberta=await página.locator('#busca-topo-campo').boundingBox();
      assert.ok(aberta.x>=10&&aberta.width>80&&aberta.width<=240&&aberta.x<fechada.x);
      assert.ok(Math.abs(aberta.x+aberta.width-(fechada.x+fechada.width))<2,'campo cresce para a esquerda da lupa');
      const sinoAberto=await página.locator('#abrir-notificações').boundingBox();assert.ok(Math.abs(sino.x-sinoAberto.x)<1,'sino mantém sua posição');
      await página.locator('#busca-topo-campo').fill('porcentagem');
      await página.waitForSelector('#busca-topo-sugestões:not([hidden])');
      const sugestoes=await página.locator('#busca-topo-sugestões').boundingBox();
      assert.ok(Math.abs(sugestoes.width-aberta.width)<2,'sugestões acompanham a largura curta do campo');
      assert.ok(Math.abs(sugestoes.x+sugestoes.width-(fechada.x+fechada.width))<2,'sugestões também ancoradas na lupa, sem ocupar a tela inteira');
      await página.screenshot({path:join(RAIZ,`.execucao/busca-compacta-${viewport.width}-v1.3.3.png`)});
      await página.keyboard.press('Escape');
      assert.equal(await página.locator('#busca-topo').getAttribute('data-aberta'),'não');
      await página.click('#abrir-notificações');
      assert.equal(await página.locator('#painel-notificações').isVisible(),true);
    } finally {await contexto.close();}
  }
});

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

test('apresentação é automática na primeira visita e o cookie impede a repetição', { skip: pular }, async () => {
  const { contexto, página, erros } = await abrir({ primeiraVisita: true });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('dialog.boas-vindas[open]', { timeout: 8000 });
  assert.equal(await página.locator('[data-vitrine]').count(), 1, 'a animação está dentro do popup');
  assert.ok((await contexto.cookies()).some(c=>c.name==='visto_novidades'),'registra a visualização ao abrir');
  assert.equal(await página.locator('#ver-apresentação').count(),0,'não exige abertura manual');
  assert.equal(await página.locator('#bloco-vitrine').count(), 0, 'a vitrine saiu da página');
  await página.click('[data-bv="próximo"]');
  await página.click('[data-bv="próximo"]');
  await página.click('[data-bv="próximo"]');
  await página.waitForTimeout(500); // a saída é animada
  assert.equal(await página.locator('dialog.boas-vindas').count(), 0, 'concluir fecha o popup');
  assert.ok((await contexto.cookies()).some((c) => c.name === 'visto_novidades'), 'a escolha fica no cookie');
  await página.reload({ waitUntil: 'networkidle' });
  await página.waitForTimeout(3500);
  assert.equal(await página.locator('dialog.boas-vindas').count(), 0, 'na segunda visita não abre sozinho');
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('apresentação aguarda outro diálogo e não repete após recarregar sem concluir', {skip:pular},async()=>{
  const {contexto,página}=await abrir({primeiraVisita:true});
  try{
    await página.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const d=document.createElement('dialog');d.id='dialogo-pendente';d.textContent='Teste';document.body.append(d);d.showModal();}));
    await página.goto(BASE+'/',{waitUntil:'networkidle'});
    assert.equal(await página.locator('.boas-vindas[open]').count(),0);
    await página.locator('#dialogo-pendente').evaluate(d=>{d.close();d.remove();});
    await página.waitForSelector('.boas-vindas[open]');
    await página.reload({waitUntil:'networkidle'});
    await página.locator('#dialogo-pendente').evaluate(d=>{d.close();d.remove();});
    await página.waitForTimeout(2200);
    assert.equal(await página.locator('.boas-vindas').count(),0);
  }finally{await contexto.close();}
});

test('falha na animação do popup: o popup continua útil sem ela e a busca responde', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ primeiraVisita: true });
  await bloquear(página, 'vitrine/vitrine-cenas.js');
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.waitForSelector('dialog.boas-vindas--sem-arte[open]', { timeout: 8000 });
  assert.equal(await página.locator('.boas-vindas__slide:not([hidden])').count(), 1, 'o texto continua lá');
  await página.click('[data-bv="fechar"] >> nth=1');
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
  await página.locator('#ferramenta').getByRole('button', { name: 'Tentar novamente' }).click();
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

/* ----------------------------------------- botão de tema e ícones animados */

test('o botão de tema vira a pílula, troca o tema com a tela coberta e não deixa camada para trás', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ colorScheme: 'light' });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  assert.equal(await página.getAttribute('#alternar-tema', 'aria-checked'), 'false');
  await página.click('#abrir-preferencias');
  await página.click('#alternar-tema');
  await página.waitForSelector('.transição-tema', { timeout: 2000 });
  assert.equal(await página.getAttribute('#alternar-tema', 'aria-checked'), 'true', 'a pílula responde ao clique na hora');
  await página.waitForSelector('.transição-tema', { state: 'detached', timeout: 4000 });
  assert.equal(await página.evaluate(() => document.documentElement.getAttribute('data-tema')), 'escuro');
  // No tema escolhido no botão, a variante escura das ilustrações aparece mesmo com o sistema claro.
  const visíveis = await página.evaluate(() => ({
    claro: [...document.querySelectorAll('.só-claro')].every((i) => getComputedStyle(i).display === 'none'),
    escuro: [...document.querySelectorAll('.só-escuro')].every((i) => getComputedStyle(i).display !== 'none'),
  }));
  assert.deepEqual(visíveis, { claro: true, escuro: true });
  // A paleta é uma escolha pontual dentro do menu do visitante: a transição devolve o
  // foco ao cabeçalho, então o painel é aberto de novo para a próxima escolha.
  await página.click('#abrir-preferencias');
  await página.click('#alternar-tema');
  await página.waitForSelector('.transição-tema', { timeout: 2000 }); // a cobertura começa depois da pílula
  await página.waitForSelector('.transição-tema', { state: 'detached', timeout: 5000 });
  assert.equal(await página.evaluate(() => document.documentElement.getAttribute('data-tema')), 'claro');
  assert.equal(await página.getAttribute('#alternar-tema', 'aria-checked'), 'false');
  await contexto.close();
});

test('com movimento reduzido a troca de tema é imediata e sem camada', { skip: pular }, async () => {
  const { contexto, página } = await abrir({ reducedMotion: 'reduce' });
  await página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await página.click('#abrir-preferencias');
  await página.click('#alternar-tema');
  await página.waitForFunction(() => document.documentElement.getAttribute('data-tema') === 'escuro', null, { timeout: 1000 });
  assert.equal(await página.locator('.transição-tema').count(), 0);
  await contexto.close();
});

test('ícone animado lento mostra o estático; ícone que falha deixa o estático', { skip: pular }, async () => {
  const lento = await abrir();
  await lento.página.route(/%C3%ADcones-animados/, async (rota) => { await new Promise((r) => setTimeout(r, 1500)); await rota.continue(); });
  await lento.página.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await lento.página.locator('#lista-prontas .ícone-vivo').first().waitFor();
  await lento.página.locator('#lista-prontas').scrollIntoViewIfNeeded(); // o controle só baixa o que está na tela
  await lento.página.waitForSelector('#lista-prontas .ícone-vivo:has(img[src])');
  const durante = await lento.página.evaluate(() => {
    const caixa = document.querySelector('#lista-prontas .ícone-vivo:has(img[src])');
    return { estado: caixa.dataset.estado, estático: getComputedStyle(caixa.firstElementChild).opacity };
  });
  assert.equal(durante.estado, 'carregando');
  assert.equal(durante.estático, '1', 'o estático aparece enquanto a animada demora');
  await lento.página.waitForFunction(() => document.querySelector('#lista-prontas .ícone-vivo:has(img[src])')?.dataset.estado === 'pronto', null, { timeout: 8000 });
  await lento.contexto.close();

  const quebrado = await abrir();
  await quebrado.página.route(/%C3%ADcones-animados/, (rota) => rota.abort());
  await quebrado.página.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await quebrado.página.locator('#lista-prontas').scrollIntoViewIfNeeded();
  await quebrado.página.waitForSelector('#lista-prontas .ícone-vivo[data-estado="falhou"]');
  const depois = await quebrado.página.evaluate(() => {
    const caixa = document.querySelector('#lista-prontas .ícone-vivo[data-estado="falhou"]');
    return { estado: caixa.dataset.estado, estático: getComputedStyle(caixa.firstElementChild).opacity, animado: getComputedStyle(caixa.querySelector('img')).display };
  });
  assert.deepEqual(depois, { estado: 'falhou', estático: '1', animado: 'none' });
  await quebrado.contexto.close();
});

/* ------------------------------------------------------------------ inglês */

test('a página em inglês mostra tudo em inglês e leva às ferramentas em português com aviso', { skip: pular }, async () => {
  const { contexto, página, erros } = await abrir();
  await página.goto(`${BASE}/en/`, { waitUntil: 'networkidle' });
  assert.equal(await página.evaluate(() => document.documentElement.lang), 'en');
  assert.match(await página.locator('h1').innerText(), /What do you need to solve right now\?/);
  // Lista de prontas em inglês, com o aviso de que a ferramenta é em português.
  const primeira = página.locator('#lista-prontas .ferramenta-linha').first();
  assert.match(await primeira.locator('.ferramenta-linha__nome').innerText(), /Percentage calculator/);
  assert.match(await primeira.locator('.ferramenta-linha__nome').innerText(), /In Portuguese/);
  assert.equal(await primeira.locator('a.ferramenta-linha__alvo').getAttribute('href'), '../f/porcentagem/');
  // Categorias e contagem em inglês.
  assert.match(await página.locator('.categoria-cartão small[data-contagem="dinheiro"]').innerText(), /\d+ of \d+ ready/);
  assert.ok((await página.locator('.grade-categorias b').allInnerTexts()).includes('Money and pricing'));
  // O seletor volta ao português na mesma página; EN é o atual.
  assert.equal(await página.locator('.idioma--topo [aria-current="true"]').innerText(), 'EN');
  assert.equal(await página.locator('.idioma--topo a[hreflang="pt-BR"]').getAttribute('href'), '../');
  // A busca fala inglês e encontra pela palavra em inglês.
  await página.fill('#busca', 'discount');
  await página.waitForSelector('#sugestões:not([hidden]) .sugestões__item');
  assert.match(await página.locator('.sugestões__item b').first().innerText(), /Percentage calculator|Selling price/);
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('na página de ferramenta o EN aparece desligado, com o motivo escrito', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  await página.goto(`${BASE}/f/juros/`, { waitUntil: 'networkidle' });
  const desligado = página.locator('.idioma--topo .idioma__item--desligado');
  assert.equal(await desligado.getAttribute('aria-disabled'), 'true');
  assert.match(await desligado.getAttribute('title'), /not available yet/);
  await contexto.close();
});

test('um endereço inexistente em /en/ devolve a 404 em inglês', { skip: pular }, async () => {
  const { contexto, página } = await abrir();
  const resposta = await página.goto(`${BASE}/en/nao/existe`, { waitUntil: 'networkidle' });
  assert.equal(resposta.status(), 404);
  assert.equal(await página.locator('h1').innerText(), 'This page does not exist');
  await contexto.close();
});
