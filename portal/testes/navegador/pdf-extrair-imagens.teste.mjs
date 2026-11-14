/** Teste de navegador da ferramenta de extração, incluindo prévia e ZIP real. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { deflateSync } from 'node:zlib';
import { biblioteca } from '../auxiliares/pdf-de-teste.mjs';
import { calcularCrc32 } from '../../scripts/comum/exportação/calcular-crc32.js';

const PORTAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ = join(PORTAL, '..');
const chromium = await (async () => {
  if (process.env.PLAYWRIGHT_MODULO) {
    const módulo = process.env.PLAYWRIGHT_MODULO;
    return (await import(isAbsolute(módulo) ? pathToFileURL(módulo).href : módulo)).chromium;
  }
  for (const pacote of ['playwright', 'playwright-core']) {
    try { return createRequire(import.meta.url)(pacote).chromium; } catch { /* segue sem navegador */ }
  }
  return null;
})();
const pular = chromium ? false : 'Playwright não instalado; defina PLAYWRIGHT_MODULO para rodar o Chromium real.';
let servidor, navegador, base, logs = '';

async function portaLivre() {
  const s = createServer(); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  const porta = s.address().port; await new Promise(resolve => s.close(resolve)); return porta;
}
function chunk(tipo, dados) {
  const nome = new TextEncoder().encode(tipo), bytes = new Uint8Array(12 + dados.length), view = new DataView(bytes.buffer);
  view.setUint32(0, dados.length); bytes.set(nome, 4); bytes.set(dados, 8); view.setUint32(8 + dados.length, calcularCrc32(bytes.subarray(4, 8 + dados.length))); return bytes;
}
function pngFixture() {
  const ihdr = new Uint8Array(13), view = new DataView(ihdr.buffer); view.setUint32(0, 2); view.setUint32(4, 1); ihdr[8] = 8; ihdr[9] = 6;
  const zlib = deflateSync(Uint8Array.of(0, 255, 0, 0, 255, 0, 0, 255, 128));
  const partes = [Uint8Array.of(137,80,78,71,13,10,26,10), chunk('IHDR', ihdr), chunk('IDAT', zlib), chunk('IEND', new Uint8Array())];
  const bytes = new Uint8Array(partes.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of partes) { bytes.set(p, at); at += p.length; } return bytes;
}

before(async () => {
  if (!chromium) return;
  const porta = await portaLivre(); base = 'http://127.0.0.1:' + porta;
  servidor = spawn(process.execPath, ['portal/ferramentas/servir.mjs', 'portal', '--porta', String(porta), '--local'], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const fluxo of [servidor.stdout, servidor.stderr]) fluxo.on('data', bloco => { logs = (logs + bloco).slice(-12000); });
  let pronto = false;
  for (let i = 0; i < 100; i++) {
    if (servidor.exitCode !== null) throw new Error('Servidor local encerrou:\n' + logs);
    try { pronto = (await fetch(base + '/f/extrair-imagens-do-pdf/')).ok; } catch { /* inicializando */ }
    if (pronto) break; await esperar(100);
  }
  assert.ok(pronto, 'A página da ferramenta precisa estar integrada ao catálogo:\n' + logs);
  const candidatos = [process.env.PLAYWRIGHT_EXECUTAVEL];
  for (const pasta of (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')) {
    candidatos.push(join(pasta, 'chromium'), join(pasta, 'chromium-browser'), join(pasta, 'google-chrome'));
  }
  const executável = candidatos.find(caminho => caminho && existsSync(caminho));
  navegador = await chromium.launch({ headless: true, ...(executável ? { executablePath: executável } : {}) });
});

after(async () => {
  await navegador?.close();
  if (servidor && servidor.exitCode === null) { servidor.kill('SIGTERM'); await Promise.race([new Promise(resolve => servidor.once('exit', resolve)), esperar(3000)]); }
});

test('extrai PDF local, mostra prévia com alpha e baixa ZIP com manifesto', { skip: pular }, async () => {
  const doc = await biblioteca.PDFDocument.create();
  const foto = await doc.embedPng(pngFixture());
  doc.addPage([300, 300]).drawImage(foto, { x: 20, y: 20, width: 100, height: 50 });
  doc.getPage(0).drawImage(foto, { x: 140, y: 20, width: 100, height: 50 });
  const arquivo = await doc.save();
  const página = await navegador.newPage({ acceptDownloads: true });
  const erros = []; página.on('pageerror', erro => erros.push(String(erro)));
  const resposta = await página.goto(base + '/f/extrair-imagens-do-pdf/', { waitUntil: 'domcontentloaded' });
  assert.equal(resposta.status(), 200);
  const consentimento = página.getByRole('button', { name: 'Só o essencial', exact: true });
  if (await consentimento.isVisible()) await consentimento.click();
  await página.locator('#formulário').waitFor();
  await página.locator('#campo-arquivo').setInputFiles({ name: 'fotos.pdf', mimeType: 'application/pdf', buffer: Buffer.from(arquivo) });
  await página.getByRole('button', { name: 'Extrair imagens', exact: true }).click();
  await página.getByText('1 imagens extraídas', { exact: true }).waitFor({ timeout: 20000 });
  const miniatura = página.locator('#previas-imagens-extraidas img').first();
  await página.waitForFunction(() => { const img = document.querySelector('#previas-imagens-extraidas img'); return img && img.complete && img.naturalWidth === 2; });
  const pixel = await miniatura.evaluate(img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return [...x.getImageData(1, 0, 1, 1).data]; });
  assert.deepEqual(pixel, [0, 0, 255, 128]);
  const baixado = página.waitForEvent('download');
  await página.getByRole('button', { name: 'Baixar PNGs + manifesto (ZIP)', exact: true }).click();
  const download = await baixado; const caminho = await download.path(); const zip = await (await import('node:fs/promises')).readFile(caminho);
  assert.equal(zip.subarray(0, 2).toString(), 'PK');
  assert.ok(zip.includes(Buffer.from('manifesto.json')));
  assert.ok(zip.includes(Buffer.from('fotos-imagem-001.png')));
  assert.deepEqual(erros, []);
  await página.close();
});
