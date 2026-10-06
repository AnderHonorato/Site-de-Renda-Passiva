/**
 * Testes de navegador das ferramentas de páginas do PDF (remover, extrair, dividir, girar, organizar):
 * escolhem um PDF gerado aqui, usam a tela de verdade e conferem o arquivo baixado.
 *
 * Precisam do Playwright (no monorrepo ele vive em ander-flow/) e de um navegador:
 *   npm run testar:navegador
 * Sem Playwright, os testes são pulados com aviso, nunca passam em silêncio.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from '../../recursos/pdf-lib.esm.min.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4467;
const BASE = `http://127.0.0.1:${PORTA}`;

let chromium = null;
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
]) {
  try { chromium = carregar().chromium; break; } catch { /* próximo */ }
}
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
  try { navegador = await chromium.launch(); } catch { navegador = await chromium.launch({ channel: 'msedge' }); }
});
after(async () => {
  await navegador?.close();
  servidor?.kill();
});

/** PDF em que a página n tem largura 100 + n. */
async function pdfNumerado(quantidade) {
  const documento = await PDFDocument.create();
  for (let n = 1; n <= quantidade; n++) documento.addPage([100 + n, 200]);
  return Buffer.from(await documento.save());
}
const arquivoPdf = async (quantidade, nome = 'teste.pdf') => ({ name: nome, mimeType: 'application/pdf', buffer: await pdfNumerado(quantidade) });

async function abrir(slug, viewport = { width: 390, height: 844 }) {
  const contexto = await navegador.newContext({ viewport, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  const erros = [];
  const externas = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  página.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  página.on('request', (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) externas.push(r.url()); });
  await página.goto(`${BASE}/f/${slug}/`, { waitUntil: 'networkidle' });
  return { contexto, página, erros, externas };
}

async function escolher(página, quantidade, nome) {
  await página.setInputFiles('#campo-arquivo', await arquivoPdf(quantidade, nome));
  await página.waitForSelector('[aria-label="PDF escolhido"]:not([hidden])');
}

async function baixar(página, índice = 0) {
  const [download] = await Promise.all([página.waitForEvent('download'), página.click(`[data-arquivo="${índice}"]`)]);
  const bytes = await readFile(await download.path());
  return { nome: download.suggestedFilename(), bytes };
}

/** O erro chega depois do clique (a ferramenta valida de forma assíncrona): espera ele aparecer. */
async function erroDe(página, campo) {
  const erro = página.locator(`[data-campo="${campo}"] .campo__erro:not([hidden])`);
  await erro.waitFor({ timeout: 5000 });
  return erro.textContent();
}

const origens = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()) - 100);
const semRolagemLateral = (página) => página.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('remover páginas: escolhe, marca pelos números, remove e baixa; erros aparecem no campo certo', { skip: pular }, async () => {
  for (const largura of [390, 320]) {
    const { contexto, página, erros, externas } = await abrir('remover-paginas-do-pdf', { width: largura, height: 800 });
    await página.click('button[type="submit"]');
    assert.equal(await erroDe(página, 'arquivo'), 'Escolha um PDF primeiro.');
    await página.setInputFiles('#campo-arquivo', { name: 'falso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('isto não é pdf') });
    await página.waitForFunction(() => document.querySelector('[data-campo="arquivo"] .campo__erro')?.textContent.includes('não é um PDF'));
    await escolher(página, 10, 'contrato.pdf');
    assert.match(await página.locator('[aria-label="PDF escolhido"]').innerText(), /10 páginas/);

    await página.fill('#campo-páginas', '1-10');
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'páginas'), /pelo menos uma página/);
    await página.fill('#campo-páginas', '1,15-20,abc');
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'páginas'), /Não entendi "abc"/);

    await página.fill('#campo-páginas', '');
    await página.click('summary:has-text("Marcar as páginas")');
    for (const n of [2, 4, 5, 6]) await página.click(`button[aria-label="Página ${n}"]`);
    assert.equal(await página.inputValue('#campo-páginas'), '2, 4-6');
    await página.click('button[type="submit"]');
    await página.waitForSelector('#resultado:not([hidden])');
    const saída = await baixar(página);
    assert.equal(saída.nome, 'contrato-sem-paginas.pdf');
    assert.deepEqual(await origens(saída.bytes), [1, 3, 7, 8, 9, 10]);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);

    await página.fill('#campo-páginas', '3');
    assert.equal(await página.locator('#resultado').isHidden(), true, 'mudar o campo esconde o resultado velho');
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});

test('extrair páginas: respeita a ordem digitada e avisa da página repetida', { skip: pular }, async () => {
  const { contexto, página, erros, externas } = await abrir('extrair-paginas-do-pdf');
  await escolher(página, 10, 'relatorio.pdf');
  await página.fill('#campo-páginas', '8, 2-3, 3');
  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])');
  assert.match(await página.locator('#resultado').innerText(), /A página 3 apareceu mais de uma vez/);
  const saída = await baixar(página);
  assert.equal(saída.nome, 'relatorio-extraido.pdf');
  assert.deepEqual(await origens(saída.bytes), [8, 2, 3, 3]);
  await página.fill('#campo-páginas', '11');
  await página.click('button[type="submit"]');
  assert.equal(await erroDe(página, 'páginas'), 'A página 11 não existe: o PDF tem 10 páginas.');
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});

test('dividir PDF: por intervalos e a cada N, com ZIP e botões por arquivo', { skip: pular }, async () => {
  const { contexto, página, erros, externas } = await abrir('dividir-pdf');
  assert.equal(await página.locator('[data-campo="tamanho"]').isVisible(), false, 'só o campo do modo escolhido aparece');
  await escolher(página, 10, 'contrato.pdf');
  await página.fill('#campo-intervalos', '5-11');
  await página.click('button[type="submit"]');
  assert.equal(await erroDe(página, 'intervalos'), 'O intervalo 5-11 passa do fim: o PDF tem 10 páginas.');

  await página.fill('#campo-intervalos', '1-3, 4-10');
  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])');
  const zip = await baixar(página, 0);
  assert.equal(zip.nome, 'contrato-dividido.zip');
  assert.equal(zip.bytes.subarray(0, 4).toString('hex'), '504b0304', 'é um ZIP de verdade');
  const parte = await baixar(página, 2);
  assert.equal(parte.nome, 'contrato-4-10.pdf');
  assert.deepEqual(await origens(parte.bytes), [4, 5, 6, 7, 8, 9, 10]);

  await página.selectOption('#campo-modo', 'a-cada');
  assert.equal(await página.locator('#resultado').isHidden(), true);
  assert.equal(await página.locator('[data-campo="intervalos"]').isVisible(), false);
  await página.fill('#campo-tamanho', '0');
  await página.click('button[type="submit"]');
  assert.match(await erroDe(página, 'tamanho'), /número inteiro a partir de 1/);
  await página.fill('#campo-tamanho', '4');
  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])');
  assert.match(await página.locator('#resultado .resultado__valor').innerText(), /3 arquivos prontos/);
  assert.equal(await semRolagemLateral(página), true);
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});

test('girar PDF: páginas escolhidas, 90° à esquerda, e o arquivo baixado tem a rotação certa', { skip: pular }, async () => {
  const { contexto, página, erros, externas } = await abrir('girar-pdf', { width: 320, height: 700 });
  assert.equal(await página.locator('[data-campo="páginas"]').isVisible(), false);
  await escolher(página, 6, 'scan.pdf');
  await página.selectOption('#campo-quais', 'escolhidas');
  await página.click('button[type="submit"]');
  assert.equal(await erroDe(página, 'páginas'), 'Informe as páginas, por exemplo: 1, 3-5, 9.');
  await página.fill('#campo-páginas', '2, 5');
  await página.selectOption('#campo-ângulo', '270');
  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])');
  const saída = await baixar(página);
  assert.equal(saída.nome, 'scan-girado.pdf');
  const rotações = (await PDFDocument.load(saída.bytes)).getPages().map((p) => p.getRotation().angle);
  assert.deepEqual(rotações, [0, 270, 0, 0, 270, 0]);
  assert.equal(await semRolagemLateral(página), true);
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});

test('organizar PDF: remove, gira, insere página em branco, move e desfaz; recusa PDF acima do limite', { skip: pular }, async () => {
  const { contexto, página, erros, externas } = await abrir('organizar-pdf', { width: 320, height: 700 });
  await página.setInputFiles('#campo-arquivo', await arquivoPdf(501, 'enorme.pdf'));
  await página.waitForFunction(() => document.querySelector('[data-campo="arquivo"] .campo__erro')?.textContent.includes('limite desta ferramenta é 500'));

  await escolher(página, 5, 'scan.pdf');
  assert.equal(await página.locator('[role="listitem"]').count(), 5);
  await página.click('[data-ação="remover"][data-índice="1"]');
  await página.click('[data-ação="girar"][data-índice="1"]');
  await página.click('[data-ação="branca"][data-índice="0"]');
  await página.fill('#campo-de', '5');
  await página.fill('#campo-para', '1');
  await página.press('#campo-para', 'Enter');
  assert.equal(await página.locator('#resultado').isHidden(), true, 'Enter nos campos de mover não grava o PDF');
  const nomes = async () => (await página.locator('[role="listitem"] .ferramenta-linha__nome').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
  assert.deepEqual(await nomes(), [
    '1. Página 5 do original', '2. Página 1 do original', '3. Página em branco nova', '4. Página 3 do original girada 90° à direita', '5. Página 4 do original',
  ]);
  await página.click('[data-barra="desfazer"]');
  assert.match((await nomes())[0], /^1\. Página 1 do original/);
  await página.click('[data-barra="mover"]');
  await página.fill('#campo-de', '9');
  await página.click('[data-barra="mover"]');
  assert.match(await erroDe(página, 'de'), /entre 1 e 5/);

  await página.click('button[type="submit"]');
  await página.waitForSelector('#resultado:not([hidden])');
  const saída = await baixar(página);
  assert.equal(saída.nome, 'scan-organizado.pdf');
  const documento = await PDFDocument.load(saída.bytes);
  assert.equal(documento.getPageCount(), 5);
  assert.deepEqual(documento.getPages().map((p) => p.getRotation().angle), [0, 0, 0, 90, 0]);
  assert.equal(await semRolagemLateral(página), true);
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});
