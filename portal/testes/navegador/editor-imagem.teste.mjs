/** Verificação em navegador real do editor de fotos: camadas, desfazer/refazer, pixel exportado e responsividade. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngDe } from '../auxiliares/qr-de-teste.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4477;
const BASE = `http://127.0.0.1:${PORTA}`;
let chromium = null;
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
  () => createRequire(join(RAIZ, '..', '..', '..', '..', 'ander-flow', 'package.json'))('playwright'),
]) { try { chromium = carregar().chromium; break; } catch { /* próximo */ } }
const pular = chromium ? false : 'Playwright não encontrado (npm i -D playwright)';
let servidor, navegador;
before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) { try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* aguardando */ } await new Promise((r) => setTimeout(r, 100)); }
  navegador = await chromium.launch().catch(() => chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }));
});
after(async () => { await navegador?.close(); servidor?.kill(); });

const imagem = { width: 100, height: 60, data: new Uint8ClampedArray(100 * 60 * 4).map((_, i) => i % 4 === 3 ? 255 : 20) };

test('camada de forma sobrevive a desfazer/refazer e chega como pixels reais ao PNG baixado', { skip: pular, timeout: 60000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage(); const erros = []; const externos = [];
  página.on('pageerror', (erro) => erros.push(String(erro)));
  página.on('console', (mensagem) => { if (mensagem.type() === 'error') erros.push(mensagem.text()); });
  página.on('request', (pedido) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(pedido.url())) externos.push(pedido.url()); });
  await página.goto(`${BASE}/f/editor-de-fotos/`, { waitUntil: 'networkidle' });
  if (!(await página.locator('link[href$="editor-imagem.css"]').count())) await página.addStyleTag({ url: `${BASE}/estilos/editor-imagem.css` });
  await página.setInputFiles('#campo-arquivo', { name: 'quadro.png', mimeType: 'image/png', buffer: pngDe(imagem) });
  await página.waitForSelector('[data-prévia]:not([hidden])', { timeout: 10000 }).catch(async () => página.locator('[data-prévia]').waitFor());
  await página.click('[data-camada="forma"]');
  assert.equal(await página.locator('[data-lista-camadas] .editor-imagem__camada').count(), 1);
  await página.click('[data-ação="desfazer"]');
  assert.equal(await página.locator('[data-lista-camadas] .editor-imagem__camada').count(), 0, 'desfazer remove a forma');
  await página.click('[data-ação="refazer"]');
  assert.equal(await página.locator('[data-lista-camadas] .editor-imagem__camada').count(), 1, 'refazer restaura a forma');
  await página.selectOption('#campo-formato', 'png');
  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])', { timeout: 30000 });
  const [download] = await Promise.all([página.waitForEvent('download'), página.click('[data-arquivo="0"]')]);
  const arquivo = await readFile(await download.path());
  assert.equal(download.suggestedFilename(), 'quadro-editada.png');
  assert.equal(arquivo.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.deepEqual([arquivo.readUInt32BE(16), arquivo.readUInt32BE(20)], [100, 60]);
  const pixel = await página.evaluate(async (bytes) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0);
    const rgba = [...ctx.getImageData(20, 54, 1, 1).data]; bitmap.close(); return rgba;
  }, [...arquivo]);
  assert.deepEqual(pixel, [255, 242, 223, 255], 'a cor da forma aparece no pixel do arquivo final');
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sem overflow em 390px');
  await página.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sem overflow em 1280px');
  assert.deepEqual(erros, []);
  assert.deepEqual(externos, []);
  await contexto.close();
});
