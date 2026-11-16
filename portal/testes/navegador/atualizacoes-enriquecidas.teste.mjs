import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(import.meta.dirname, '../..');
const chromium = acharChromium();
const pular = chromium ? false : 'Playwright não encontrado';
const SEMENTES = JSON.parse(await readFile(new URL('../../dados/atualizacoes.json', import.meta.url), 'utf8'));
let navegador, servidor, base;

async function portaLivre() {
  const teste = createServer();
  await new Promise((resolve, reject) => { teste.once('error', reject); teste.listen(0, '127.0.0.1', resolve); });
  const porta = teste.address().port;
  await new Promise(resolve => teste.close(resolve));
  return porta;
}

before(async () => {
  if (!chromium) return;
  base = `http://127.0.0.1:${await portaLivre()}`;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', base.split(':').at(-1), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    try { if ((await fetch(base)).ok) break; } catch { /* servidor subindo */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  navegador = await abrirNavegador(chromium);
});

after(async () => { await navegador?.close(); servidor?.kill(); });

test('cards de atualização mostram detalhes, CTAs reais e permanecem seguros e responsivos', { skip: pular }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const página = await contexto.newPage();
  const erros = [];
  const falhas = [];
  página.on('pageerror', erro => erros.push(String(erro)));
  página.on('console', mensagem => { if (mensagem.type() === 'error') erros.push(mensagem.text()); });
  página.on('requestfailed', pedido => falhas.push(`${pedido.method()} ${pedido.url()} ${pedido.failure()?.errorText}`));
  const registro = {
    itens: [{
      id: 'post-cms-futuro', slug: 'post-cms-futuro', categoria: 'novo', versao: '9.0',
      publicado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
      pt: {
        titulo: '<img src=x onerror=alert(1)> Editor de áudio',
        resumo: 'Veja a ferramenta Editor de áudio.',
        conteudo: 'O Editor de áudio abre arquivos no navegador.\n\n<script>window.__injetado=true</script>',
      },
    }, {
      id: 'post-sem-ferramenta', slug: 'post-sem-ferramenta', categoria: 'melhoria', versao: '9.0',
      publicado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
      pt: { titulo: 'Uma nota editorial', resumo: 'Publicação sem ligação com ferramenta.', conteudo: 'Um texto curto de atualização.' },
    }],
  };
  await página.route('**/api/atualizacoes', rota => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(registro) }));
  try {
    await página.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    const cartão = página.locator('#post-cms-futuro');
    try { await cartão.waitFor({ state: 'visible', timeout: 10000 }); }
    catch {
      const diagnóstico = await página.evaluate(async () => {
        try {
          const [catálogo, feed] = await Promise.all([import('/dados/catálogo.js'), fetch('/api/atualizacoes').then(r => r.json())]);
          const validador = await import('/scripts/núcleo/atualizacoes.js');
          return { tools: catálogo.ferramentas.length, feed, validated: validador.validarFeedAtualizacoes(feed) };
        } catch (erro) { return String(erro); }
      });
      throw new Error(`feed de teste não renderizou; status=${await página.locator('#estado-atualizacoes').textContent()}; erros=${erros.join(' | ')}; requests=${falhas.join(' | ')}; catalogo=${JSON.stringify(diagnóstico)}`);
    }
    assert.equal(await cartão.locator('h3').textContent(), registro.itens[0].pt.titulo);
    assert.equal(await cartão.locator('img,script').count(), 0, 'dados do CMS viram texto, não markup executável');
    assert.equal(await página.evaluate(() => window.__injetado), undefined);
    assert.equal(await página.locator('#post-sem-ferramenta .atualizacoes__enriquecimento').count(), 0, 'post genérico continua legível sem painel vazio');
    const ferramenta = cartão.locator('.atualizacoes__ferramenta').filter({ hasText: 'Editor de áudio' });
    assert.equal(await ferramenta.count(), 1, 'nome real do catálogo é reconhecido em texto novo do CMS');
    const hrefFerramenta = await ferramenta.getAttribute('href');
    const respostaFerramenta = await contexto.request.get(new URL(hrefFerramenta, base).href);
    assert.equal(respostaFerramenta.status(), 200, `rota catalogada funciona: ${hrefFerramenta}`);

    let eventoFlower = false;
    await página.route('**/api/atualizacoes', rota => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEMENTES) }));
    await página.reload({ waitUntil: 'networkidle' });
    await página.evaluate(() => window.addEventListener('portal:flower-abrir', () => { window.__flowerEvento = true; }, { once: true }));
    await página.locator('#flower-sua-assistente-no-portal .atualizacoes__cta--flower').click();
    eventoFlower = await página.evaluate(() => Boolean(window.__flowerEvento));
    assert.equal(eventoFlower, true, 'botão Flower publica o evento combinado com o app');
    await página.locator('.flower__dialog').waitFor({state:'visible'});
    await página.locator('.flower__close').click();
    const flowerNova = página.locator('#flower-interativa-e-ajuda-guiada');
    assert.ok(await flowerNova.locator('.atualizacoes__visual--flower').count(), 'o novo post da Flower recebe o visual curado');
    assert.equal(await flowerNova.locator('.atualizacoes__cta--flower').count(), 1);

    for (const largura of [320, 390, 1280]) {
      await página.setViewportSize({ width: largura, height: 850 });
      await página.evaluate(() => { document.documentElement.dataset.tema = 'escuro'; });
      const larguraDocumento = await página.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(larguraDocumento <= largura, `sem rolagem horizontal em ${largura}px (documento: ${larguraDocumento}px)`);
      assert.ok(await página.locator('.atualizacoes__visual').first().isVisible());
    }

    await página.unroute('**/api/atualizacoes');
    await página.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    const documentos = página.locator('#ocr-scanner-e-markdown');
    assert.equal(await documentos.locator('.atualizacoes__visual--documento').count(), 1);
    assert.equal(await documentos.locator('.atualizacoes__ferramenta').count(), 4, 'as quatro ferramentas do lote podem ser abertas no post');
    assert.equal(await página.locator('#editores-pdf-imagens-audio-video-office .atualizacoes__ferramenta').count(),7,'todos os sete editores mencionados têm acesso direto');
    const linksDeFerramenta = await página.locator('.atualizacoes__ferramenta').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.ok(linksDeFerramenta.length >= 8, 'posts atuais expõem os atalhos de ferramenta relacionados');
    for (const href of linksDeFerramenta) {
      const resposta = await contexto.request.get(new URL(href, base).href);
      assert.equal(resposta.status(), 200, `rota catalogada funciona: ${href}`);
    }
    await página.goto(`${base}/en/atualizacoes.html`, { waitUntil: 'networkidle' });
    const flowerInglês = página.locator('#flower-interativa-e-ajuda-guiada');
    await flowerInglês.waitFor({ state: 'visible' });
    const linkFerramentasEn = await flowerInglês.locator('.atualizacoes__cta--secundario').getAttribute('href');
    assert.equal(new URL(linkFerramentasEn, base).pathname, '/en/ferramentas.html', 'atalho respeita a pasta de idioma no site publicado');
    assert.equal((await contexto.request.get(new URL(linkFerramentasEn, base).href)).status(), 200);
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});
