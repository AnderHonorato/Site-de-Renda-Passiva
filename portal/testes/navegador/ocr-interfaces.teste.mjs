/** Testes pela interface: OCR real, bytes baixados e cancelamento do carregamento. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfLib from '../../recursos/pdf-lib.esm.min.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://127.0.0.1:4489';
let chromium;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* instalação opcional fora da CI */ }
const skip = chromium && existsSync(join(ROOT, 'recursos/ocr/worker.min.js')) ? false : 'Playwright ou motor OCR local ausente';
let server, browser;
before(async () => {
  if (skip) return;
  server = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', '4489', '--local'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ } await new Promise((r) => setTimeout(r, 100)); }
  const executablePath = process.env.PLAYWRIGHT_EXECUTAVEL || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill(); });

async function abrir(tipo, { largura = 390, reduzido = false } = {}) {
  const context = await browser.newContext({ viewport: { width: largura, height: 844 }, acceptDownloads: true, reducedMotion: reduzido ? 'reduce' : 'no-preference' });
  await context.addCookies([{ name: 'visto_novidades', value: '999999999999999', url: BASE }]);
  const page = await context.newPage();
  const erros = [], externas = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) externas.push(r.url()); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(async (slug) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/estilos/ocr-documentos.css'; document.head.append(css);
    const raiz = document.createElement('main'); raiz.id = 'fixture-ocr'; document.body.replaceChildren(raiz);
    const ferramenta = (await import(`/scripts/ferramentas/${slug}.js`)).default;
    ferramenta.montar(raiz, { slug, nome: 'OCR', cat: 'pdf', exporta: ['baixar'], plano: 'gratuito' });
  }, tipo);
  return { page, context, erros, externas };
}
async function reconhecerExemplo(page) {
  await page.locator('[data-ocr-exemplo]').click();
  await page.locator('.lista-ferramentas [role=listitem]').waitFor();
  await page.locator('#formulário button[type=submit]').click();
  await page.locator('#resultado:not([hidden])').waitFor({ timeout: 100000 });
}

test('OCR imagem: exemplo real, texto revisável e TXT com a revisão em 320 px', { skip, timeout: 150000 }, async () => {
  const { page, context, erros, externas } = await abrir('ocr-de-imagem', { largura: 320, reduzido: true });
  try {
    await reconhecerExemplo(page);
    const texto = await page.locator('#ocr-texto-revisao').inputValue();
    assert.match(texto, /RELATORIO DE NOVEMBRO/i); assert.match(texto, /Ana Silva/); assert.match(texto, /1\.250,00/);
    assert.equal(await page.locator('.ocr-documentos').getAttribute('aria-busy'), 'false');
    assert.equal(await page.locator('#formulário button[type=submit]').isEnabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.locator('#ocr-texto-revisao').fill('Texto revisado: Ana Silva — R$ 1.250,00.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await page.getByRole('button', { name: 'Copiar texto revisado', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Texto revisado: Ana Silva — R$ 1.250,00.');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar TXT revisado', exact: true }).click()]);
    assert.equal((await readFile(await download.path())).toString('utf8'), 'Texto revisado: Ana Silva — R$ 1.250,00.');
    await page.locator('#formulário button[type=reset]').click();
    assert.equal(await page.locator('.ocr-revisao').isVisible(), false); assert.equal(await page.locator('#resultado').isVisible(), false);
    assert.deepEqual(erros, []); assert.deepEqual(externas, []);
  } finally { await context.close(); }
});

test('OCR PDF: download pesquisável preserva dimensão e contém texto real', { skip, timeout: 150000 }, async () => {
  const { page, context, erros, externas } = await abrir('ocr-pdf');
  try {
    await reconhecerExemplo(page);
    await page.locator('[data-pdf-estado="pronta"]').waitFor({ timeout: 15000 });
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar PDF pesquisável', exact: true }).click()]);
    const bytes = await readFile(await download.path());
    const doc = await pdfLib.PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 1); assert.deepEqual(doc.getPages()[0].getSize(), { width: 468, height: 594 });
    const extraido = await page.evaluate(async (dados) => {
      const { abrirComPdfjsParaTexto } = await import('/scripts/ferramentas/auxiliares/pdfjs-textos.js');
      const leitor = await abrirComPdfjsParaTexto(new Uint8Array(dados));
      try { return (await leitor.texto(1)).itens.map((i) => i.str).join(' '); } finally { await leitor.fechar(); }
    }, [...bytes]);
    assert.match(extraido, /Ana\s+Silva/); assert.match(extraido, /NOVEMBRO/i);
    assert.match(await page.locator('#ocr-texto-nota').textContent(), /não alteram a camada/);
    await page.locator('#ocr-texto-revisao').fill('Revisão separada do texto do PDF.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await page.getByRole('button', { name: 'Copiar texto revisado', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Revisão separada do texto do PDF.');
    assert.deepEqual(erros, []); assert.deepEqual(externas, []);
  } finally { await context.close(); }
});

test('OCR imagem respeita EXIF 3 e 6 sem girar a foto duas vezes', { skip, timeout: 150000 }, async () => {
  const { page, context, erros } = await abrir('ocr-de-imagem');
  try {
    for (const orientacao of [3, 6]) {
      const jpeg = await page.evaluate(async (orientacao) => {
        const original = document.createElement('canvas'); original.width = 1300; original.height = 1650;
        const ctx = original.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1300, 1650);
        ctx.fillStyle = '#111'; ctx.font = 'bold 60px Arial'; ctx.fillText('DOCUMENTO FLOWER', 100, 200);
        ctx.font = '45px Arial'; ctx.fillText('Cliente: Ana Silva', 100, 400); ctx.fillText('Total: 1250 reais', 100, 550);
        const foto = document.createElement('canvas'); foto.width = orientacao === 6 ? 1650 : 1300; foto.height = orientacao === 6 ? 1300 : 1650;
        const dest = foto.getContext('2d');
        if (orientacao === 6) { dest.translate(0, 1300); dest.rotate(-Math.PI / 2); }
        else { dest.translate(1300, 1650); dest.rotate(Math.PI); }
        dest.drawImage(original, 0, 0);
        const blob = await new Promise((r) => foto.toBlob(r, 'image/jpeg', .95));
        return [...new Uint8Array(await blob.arrayBuffer())];
      }, orientacao);
      const exif = Buffer.from([255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 18, 1, 3, 0, 1, 0, 0, 0, orientacao, 0, 0, 0, 0, 0, 0, 0]);
      const bytes = Buffer.from(jpeg);
      await page.setInputFiles('#campo-arquivo', { name: `foto-exif-${orientacao}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.concat([bytes.subarray(0, 2), exif, bytes.subarray(2)]) });
      await page.locator('.lista-ferramentas [role=listitem]').waitFor();
      await page.locator('#formulário button[type=submit]').click();
      await page.locator('#resultado:not([hidden])').waitFor({ timeout: 100000 });
      const texto = await page.locator('#ocr-texto-revisao').inputValue();
      assert.match(texto, /DOCUMENTO FLOWER/); assert.match(texto, /Ana Silva/);
      await page.locator('#formulário button[type=reset]').click();
    }
    assert.deepEqual(erros, []);
  } finally { await context.close(); }
});

test('OCR: cancelar durante carga do motor libera a tela e não entrega resultado', { skip, timeout: 30000 }, async () => {
  const { page, context, erros } = await abrir('ocr-de-imagem');
  let liberar;
  const bloqueio = new Promise((r) => { liberar = r; });
  let carregou;
  const pedido = new Promise((r) => { carregou = r; });
  await page.route('**/recursos/ocr/worker.min.js', async (route) => { carregou(); await bloqueio; await route.abort().catch(() => {}); });
  try {
    await page.locator('[data-ocr-exemplo]').click();
    await page.locator('.lista-ferramentas [role=listitem]').waitFor();
    await page.locator('#formulário button[type=submit]').click();
    await pedido;
    await page.getByRole('button', { name: 'Cancelar reconhecimento', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.ocr-documentos')?.getAttribute('aria-busy') === 'false');
    assert.equal(await page.locator('#resultado').isVisible(), false); assert.equal(await page.locator('.ocr-revisao').isVisible(), false);
    assert.equal(await page.locator('#formulário button[type=submit]').isEnabled(), true);
    assert.deepEqual(erros, []);
  } finally { liberar(); await context.close(); }
});

test('OCR PDF: valida quantidade e faixa antes de reconhecer somente a página escolhida', { skip, timeout: 150000 }, async () => {
  const { page, context, erros } = await abrir('ocr-pdf');
  try {
    const grande = await pdfLib.PDFDocument.create();
    for (let i = 0; i < 21; i++) grande.addPage([300, 400]);
    await page.setInputFiles('#campo-arquivo', { name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await grande.save()) });
    await page.locator('.lista-ferramentas [role=listitem]').waitFor();
    await page.locator('#formulário button[type=submit]').click();
    await page.getByText('O PDF tem mais de 20 páginas. Divida o documento e processe uma parte por vez.', { exact: true }).waitFor();
    assert.equal(await page.locator('#resultado').isVisible(), false);
    const doc = await pdfLib.PDFDocument.create();
    const p1 = doc.addPage([300, 400]); p1.drawText('PRIMEIRA PAGINA', { x: 25, y: 310, size: 22 });
    const p2 = doc.addPage([300, 400]); p2.drawText('SEGUNDA PAGINA', { x: 25, y: 310, size: 22 }); p2.drawText('Cliente: Ana Silva', { x: 25, y: 250, size: 20 });
    await page.setInputFiles('#campo-arquivo', { name: 'duas-paginas.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) });
    await page.locator('.ferramenta-linha__nome').filter({ hasText: 'duas-paginas.pdf' }).waitFor();
    await page.fill('#campo-paginas', '9');
    await page.locator('#formulário button[type=submit]').click();
    await page.locator('[data-campo="paginas"] .campo__erro').waitFor();
    assert.equal(await page.locator('#resultado').isVisible(), false);
    await page.fill('#campo-paginas', '2');
    await page.locator('#formulário button[type=submit]').click();
    await page.locator('#resultado:not([hidden])').waitFor({ timeout: 100000 });
    const texto = await page.locator('#ocr-texto-revisao').inputValue();
    assert.match(texto, /Página 2/); assert.match(texto, /SEGUNDA PAGINA/); assert.doesNotMatch(texto, /PRIMEIRA PAGINA/);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar PDF pesquisável', exact: true }).click()]);
    const resultado = await pdfLib.PDFDocument.load(await readFile(await download.path()));
    assert.equal(resultado.getPageCount(), 1); assert.deepEqual(resultado.getPages()[0].getSize(), { width: 300, height: 400 });
    assert.deepEqual(erros, []);
  } finally { await context.close(); }
});
