import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdf from '../../recursos/pdf-lib.esm.min.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://127.0.0.1:4488';
let chromium;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch {}
const skip = chromium ? false : 'Playwright não encontrado';
let server, browser;
before(async () => {
  if (!chromium) return;
  server = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', '4488', '--local'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  const executablePath = process.env.PLAYWRIGHT_EXECUTAVEL || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill(); });

async function fixture() {
  const doc = await pdf.PDFDocument.create();
  const font = await doc.embedFont(pdf.StandardFonts.Helvetica);
  for (let n = 1; n <= 2; n++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`Guia ${n}`, { x: 40, y: 780, font, size: 24 });
    p.drawText('Texto de corpo para conferir a estrutura do documento.', { x: 40, y: 730, font, size: 12 });
    p.drawText('A conversao mantem as letras e organiza os paragrafos.', { x: 40, y: 712, font, size: 12 });
    p.drawText('- Primeiro item', { x: 40, y: 670, font, size: 12 });
    p.drawText('- Segundo item', { x: 40, y: 652, font, size: 12 });
    p.drawText('<script>alert(1)</script> [link](https://example.com)', { x: 40, y: 610, font, size: 12 });
  }
  return Buffer.from(await doc.save());
}

async function montar(page) {
  await page.context().addCookies([{ name: 'visto_novidades', value: '999999999999999', url: BASE }]);
  await page.addInitScript(() => sessionStorage.setItem('flower.convites.sessao', '{"exibidos":3,"proximo":0}'));
  await page.goto(BASE);
  await page.evaluate(async () => {
    const m = await import('/scripts/ferramentas/pdf-para-markdown.js');
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/estilos/pdf-para-markdown.css'; document.head.append(link);
    const main = document.querySelector('main') || document.body;
    main.replaceChildren(); const root = document.createElement('div'); main.append(root);
    m.default.montar(root, { slug: 'pdf-para-markdown', nome: 'PDF para Markdown', cat: 'pdf', exporta: ['copiar', 'baixar'] });
  });
}

test('PDF→Markdown: arquivo real, seleção, prévia segura, downloads e celular320px', { skip, timeout: 60_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await montar(page);
  await page.locator('#campo-arquivo').setInputFiles({ name: 'guia.pdf', buffer: await fixture(), mimeType: 'application/pdf' });
  await page.waitForSelector('.ferramenta-linha');
  await page.locator('#campo-páginas').fill('2');
  await page.locator('#formulário button[type="submit"]').click();
  await page.waitForSelector('#resultado:not([hidden])');
  assert.match(await page.locator('.md-pdf__papel').innerText(), /Guia 2/);
  assert.doesNotMatch(await page.locator('.md-pdf__papel').innerText(), /Guia 1/);
  assert.equal(await page.locator('.md-pdf__papel script').count(), 0);
  assert.equal(await page.locator('.md-pdf__papel a').count(), 0);
  assert.equal(await page.locator('.md-pdf__papel ul li').count(), 2);
  await page.getByRole('button', { name: 'Código Markdown', exact: true }).click();
  const md = await page.locator('.md-pdf__fonte').inputValue();
  assert.match(md, /# Guia 2/); assert.match(md, /- Primeiro item\n- Segundo item/);
  assert.match(md, /\\<script\\>alert\(1\)\\<\/script\\>/);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.locator('#resultado [data-copiar]').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), md);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#resultado [data-arquivo="0"]').click()]);
  assert.match(download.suggestedFilename(), /\.md$/);
  assert.equal(await readFile(await download.path(), 'utf8'), md);
  const [txt] = await Promise.all([page.waitForEvent('download'), page.locator('#resultado [data-arquivo="1"]').click()]);
  assert.match(await readFile(await txt.path(), 'utf8'), /Página 2\n\nGuia 2/);
  const measure = await page.evaluate(() => ({ width: innerWidth, doc: document.documentElement.scrollWidth, anim: getComputedStyle(document.querySelector('.md-pdf__amostra--codigo')).animationName }));
  assert.ok(measure.doc <= measure.width, JSON.stringify(measure)); assert.equal(measure.anim, 'none');
  await page.locator('#campo-páginas').fill('1'); assert.equal(await page.locator('.md-pdf__resultado').isVisible(), false);
  assert.equal(await page.locator('#resultado').isVisible(), false, 'não oferece exportação antiga depois de mudar páginas');
  assert.deepEqual(errors, []); await page.close();
});

test('PDF→Markdown: exemplo gera PDF de verdade, reset e arquivo escaneado orienta OCR', { skip, timeout: 60_000 }, async () => {
  const page = await browser.newPage({ acceptDownloads: true }); await montar(page);
  await page.getByRole('button', { name: 'Usar PDF de exemplo' }).click();
  await page.waitForSelector('.ferramenta-linha');
  await page.locator('#formulário button[type="submit"]').click();
  await page.waitForSelector('#resultado:not([hidden])');
  assert.match(await page.locator('.md-pdf__papel').innerText(), /Guia de projeto/);
  await page.locator('#formulário button[type="reset"]').click();
  assert.equal(await page.locator('.md-pdf__resultado').isVisible(), false);
  const doc = await pdf.PDFDocument.create(); doc.addPage();
  await page.locator('#campo-arquivo').setInputFiles({ name: 'foto.pdf', buffer: Buffer.from(await doc.save()), mimeType: 'application/pdf' });
  await page.waitForSelector('.ferramenta-linha');
  await page.locator('#formulário button[type="submit"]').click();
  await page.getByText(/Não encontrei texto selecionável/).waitFor();
  assert.match(await page.locator('.md-pdf__ocr').getAttribute('href'), /f\/ocr-pdf\/$/);
  assert.equal(await page.locator('#resultado').isVisible(), false);
  await page.close();
});

test('PDF→Markdown: resposta atrasada do exemplo respeita Limpar e escolha de outro arquivo', { skip, timeout: 60_000 }, async () => {
  for (const ação of ['limpar', 'escolher']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    let liberar, pediu;
    const bloqueio = new Promise((r) => { liberar = r; });
    const pedido = new Promise((r) => { pediu = r; });
    await page.route('**/recursos/pdf-lib.esm.min.js', async (route) => {
      pediu(); await bloqueio; await route.continue();
    });
    try {
      await montar(page);
      await page.getByRole('button', { name: 'Usar PDF de exemplo' }).click();
      await pedido;
      if (ação === 'limpar') await page.locator('#formulário button[type="reset"]').click();
      else {
        await page.locator('#campo-arquivo').setInputFiles({ name: 'meu-documento.pdf', buffer: await fixture(), mimeType: 'application/pdf' });
        await page.waitForSelector('.ferramenta-linha');
      }
      liberar();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.getByRole('button', { name: 'Usar PDF de exemplo' }).isDisabled(), false);
      assert.equal(await page.locator('.md-pdf__demo [role="status"]').innerText(), '');
      if (ação === 'limpar') assert.equal(await page.locator('.ferramenta-linha').count(), 0, 'exemplo atrasado não restaura arquivo após Limpar');
      else {
        assert.equal(await page.locator('.ferramenta-linha').count(), 1);
        assert.match(await page.locator('.ferramenta-linha').innerText(), /meu-documento.pdf/);
        assert.doesNotMatch(await page.locator('.ferramenta-linha').innerText(), /guia-de-projeto/);
      }
      assert.equal(await page.locator('#resultado').isVisible(), false);
    } finally { liberar(); await context.close(); }
  }
});
