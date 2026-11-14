/**
 * Fluxo no navegador do editor de metadados: preenche os valores ao escolher o PDF,
 * bloqueia o envio enquanto lê, grava a cópia, desenha a prévia e confere o download.
 * Execute com `npm run testar:navegador` depois de gerar a página F352.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as biblioteca from '../../recursos/pdf-lib.esm.min.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4484;
const BASE = `http://127.0.0.1:${PORTA}`;
let chromium = null;
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
]) {
  try { chromium = carregar().chromium; break; } catch { /* próximo */ }
}
const executável = process.env.PLAYWRIGHT_EXECUTAVEL || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : null);
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
  try { navegador = await chromium.launch({ ...(executável ? { executablePath: executável } : {}) }); }
  catch { navegador = await chromium.launch({ channel: 'msedge' }); }
});
after(async () => { await navegador?.close(); servidor?.kill(); });

async function pdfComMetadados() {
  const documento = await biblioteca.PDFDocument.create();
  const pagina = documento.addPage([300, 400]);
  pagina.drawText('Contrato de servicos', { x: 28, y: 350, size: 16 });
  pagina.drawText('Documento de exemplo para revisar os metadados.', { x: 28, y: 320, size: 9 });
  documento.setTitle('Título original');
  documento.setAuthor('Autor para remover');
  documento.setSubject('Contrato');
  documento.setKeywords(['jurídico', '日本語']);
  documento.catalog.set(biblioteca.PDFName.of('Metadata'), documento.context.register(documento.context.stream('<x:xmpmeta>valor antigo</x:xmpmeta>')));
  return Buffer.from(await documento.save({ updateFieldAppearances: false }));
}

test('F352: leitura, corrida de prefill, prévia e PDF alterado no download', { skip: pular }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  const erros = [];
  const externas = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  página.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  página.on('request', (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) externas.push(r.url()); });
  await página.route('**/api/anuncios', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"permitido":false}' }));
  // O teste trata do PDF local. O feed do sino é validado com API real na suíte do CMS.
  await página.route('**/api/atualizacoes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"itens":[]}' }));
  let liberarBiblioteca, avisarPedido;
  const bloqueio = new Promise(resolve => { liberarBiblioteca = resolve; });
  const pedidoDaBiblioteca = new Promise(resolve => { avisarPedido = resolve; });
  await página.route('**/recursos/pdf-lib.esm.min.js', async rota => {
    avisarPedido(); await bloqueio; await rota.continue();
  });
  await página.goto(`${BASE}/f/editar-metadados-do-pdf/`, { waitUntil: 'networkidle' });
  await página.setInputFiles('#campo-arquivo', { name: 'contrato.pdf', mimeType: 'application/pdf', buffer: await pdfComMetadados() });
  try {
    await pedidoDaBiblioteca;
    await página.click('#formulário button[type=submit]');
    await página.getByText('Aguarde a leitura dos metadados terminar antes de salvar o PDF.', { exact: true }).waitFor();
    assert.equal(await página.locator('#resultado').isVisible(), false, 'não apaga campos ainda não carregados');
  } finally { liberarBiblioteca(); }
  await página.waitForFunction(() => document.querySelector('#campo-titulo')?.value === 'Título original');
  assert.equal(await página.locator('#campo-autor').inputValue(), 'Autor para remover');

  await página.fill('#campo-titulo', 'Versão pública — junho');
  await página.fill('#campo-autor', '');
  await página.fill('#campo-palavras-chave', 'relatório; público; 日本語');
  await página.click('#formulário button[type=submit]');
  await página.waitForSelector('#resultado:not([hidden])');
  await página.waitForSelector('#resultado [data-pdf-estado="pronta"]', { timeout: 30_000 });

  await página.setViewportSize({ width: 320, height: 640 });
  await página.waitForTimeout(100);
  const largura = await página.evaluate(() => ({ janela: innerWidth, documento: document.documentElement.scrollWidth }));
  assert.ok(largura.documento <= largura.janela, `sem rolagem horizontal a 320 px: ${JSON.stringify(largura)}`);
  const [download] = await Promise.all([página.waitForEvent('download'), página.click('#resultado [data-arquivo="0"]')]);
  const arquivo = await readFile(await download.path());
  const saída = await biblioteca.PDFDocument.load(arquivo, { updateMetadata: false });
  assert.equal(saída.getTitle(), 'Versão pública — junho');
  assert.equal(saída.getAuthor(), undefined);
  assert.equal(saída.getKeywords(), 'relatório, público, 日本語');
  assert.equal(saída.getPageCount(), 1);
  assert.equal(saída.catalog.get(biblioteca.PDFName.of('Metadata')), undefined);
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});
