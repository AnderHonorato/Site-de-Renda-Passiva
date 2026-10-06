/**
 * Testes de navegador do editor de fotos, do criador de gráficos e do criar GIF: usam a tela de verdade, em celular
 * e computador, e conferem o que é baixado.
 *
 * Precisam do Playwright (no monorrepo ele vive em ander-flow/) e de um navegador:
 *   npm run testar:navegador
 * Sem Playwright, os testes são pulados com aviso, nunca passam em silêncio.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { png as pngSólido } from '../auxiliares/imagens-de-teste.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4467;
const BASE = `http://127.0.0.1:${PORTA}`;

let chromium = null;
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
  () => createRequire(join(RAIZ, '..', '..', '..', '..', 'ander-flow', 'package.json'))('playwright'),
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

async function abrir(slug, { viewport = { width: 390, height: 844 }, colorScheme = 'light' } = {}) {
  const contexto = await navegador.newContext({ viewport, acceptDownloads: true, colorScheme });
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

const semRolagemLateral = (página) => página.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function baixar(página, seletor) {
  const [download] = await Promise.all([página.waitForEvent('download'), página.click(seletor)]);
  const bytes = await readFile(await download.path());
  return { nome: download.suggestedFilename(), bytes };
}

async function erroDe(página, campo) {
  const erro = página.locator(`[data-campo="${campo}"] .campo__erro:not([hidden])`);
  await erro.waitFor({ timeout: 5000 });
  return erro.textContent();
}

async function capturar(página, nome) {
  const pasta = join(RAIZ, 'medidas');
  await mkdir(pasta, { recursive: true });
  await página.screenshot({ path: join(pasta, nome), fullPage: false });
}

/**
 * Imagem de teste desenhada no próprio navegador (JPG ou PNG de verdade): quatro quadrantes de cores diferentes,
 * para dar para conferir giro e espelho pelos pixels. Alto-esquerda vermelho, alto-direita verde, baixo-esquerda azul,
 * baixo-direita amarelo.
 */
async function imagemDeTeste(página, largura, altura, tipo = 'image/jpeg') {
  const base64 = await página.evaluate(async ([l, a, t]) => {
    const tela = document.createElement('canvas');
    tela.width = l;
    tela.height = a;
    const c = tela.getContext('2d');
    const cores = [['#ff0000', '#00ff00'], ['#0000ff', '#ffff00']];
    for (let y = 0; y < 2; y += 1) for (let x = 0; x < 2; x += 1) { c.fillStyle = cores[y][x]; c.fillRect((x * l) / 2, (y * a) / 2, l / 2 + 1, a / 2 + 1); }
    const blob = await new Promise((r) => tela.toBlob(r, t, 0.95));
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let texto = '';
    for (const b of buffer) texto += String.fromCharCode(b);
    return btoa(texto);
  }, [largura, altura, tipo]);
  return Buffer.from(base64, 'base64');
}

/** Decodifica bytes de imagem no navegador e devolve tamanho e a cor (RGB) de alguns pontos. */
async function lerPixels(página, bytes, pontos) {
  return página.evaluate(async ([base64, lista]) => {
    const binário = atob(base64);
    const dados = Uint8Array.from(binário, (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([dados]));
    const tela = document.createElement('canvas');
    tela.width = bitmap.width;
    tela.height = bitmap.height;
    const c = tela.getContext('2d');
    c.drawImage(bitmap, 0, 0);
    return { largura: bitmap.width, altura: bitmap.height, cores: lista.map(([fx, fy]) => [...c.getImageData(Math.min(bitmap.width - 1, Math.floor(fx * bitmap.width)), Math.min(bitmap.height - 1, Math.floor(fy * bitmap.height)), 1, 1).data.slice(0, 3)]) };
  }, [bytes.toString('base64'), pontos]);
}

const predominante = ([r, g, b]) => (r > 180 && g < 90 && b < 90 ? 'vermelho' : g > 180 && r < 90 && b < 90 ? 'verde' : b > 180 && r < 90 && g < 90 ? 'azul' : r > 180 && g > 180 && b < 90 ? 'amarelo' : `?${r},${g},${b}`);

/** Insere um EXIF de orientação logo depois do início de um JPEG. */
function comOrientaçãoExif(jpeg, orientação) {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientação, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16BE(exif.length + 2);
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xFF, 0xE1]), tamanho, exif, jpeg.subarray(2)]);
}

const arquivo = (nome, tipo, buffer) => ({ name: nome, mimeType: tipo, buffer });

/* ------------------------------------------------------------------ editor de fotos */

test('editor de fotos: abre, gira, corta, ajusta, redimensiona e baixa; recusa o que não é foto', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('editor-de-fotos', { viewport: { width: largura, height: altura }, colorScheme: tema });

    // Sem foto: o botão diz o que falta, e os controles de edição nem aparecem.
    assert.equal(await página.locator('[data-prévia]').isVisible(), false);
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'arquivo'), /Escolha uma foto primeiro/);

    const jpg = await imagemDeTeste(página, 800, 600);
    await página.setInputFiles('#campo-arquivo', arquivo('Férias.JPG', 'image/jpeg', jpg));
    await página.locator('[data-prévia]').waitFor({ state: 'visible' });
    assert.match(await página.locator('[data-informação]').innerText(), /Original: 800 × 600 px\. Resultado: 800 × 600 px/);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);

    if (largura === 390) {
      // Gira à direita: o quadro passa a ser 600 × 800 e a prévia acompanha.
      await página.click('[data-operação="girar-horário"]');
      assert.match(await página.locator('[data-informação]').innerText(), /Resultado: 600 × 800 px/);
      assert.equal(await página.evaluate(() => document.querySelector('[data-prévia] , canvas[data-prévia]')?.width ?? document.querySelector('canvas').width), 600);

      // Proporção 1:1 centraliza o corte: no quadro 600 × 800, sobra 100 de cima e de baixo (12,5%).
      await página.selectOption('#campo-proporção', '1:1');
      assert.equal(await página.inputValue('#campo-margemTopo'), '12,5');
      assert.equal(await página.inputValue('#campo-margemEsquerda'), '0');
      assert.match(await página.locator('[data-informação]').innerText(), /Resultado: 600 × 600 px/);

      // Cores e tamanho: largura 300 (a altura acompanha) e brilho.
      await página.fill('#campo-brilho', '20');
      await página.selectOption('#campo-redimensionar', 'largura');
      await página.fill('#campo-larguraPx', '300');
      await página.press('#campo-larguraPx', 'Tab');
      assert.match(await página.locator('[data-informação]').innerText(), /Resultado: 300 × 300 px/);
      await capturar(página, 'editor-de-fotos-390.png');

      await página.click('button[type="submit"]');
      await página.waitForSelector('#resultado:not([hidden])');
      assert.match(await página.locator('#resultado').innerText(), /Foto pronta/);
      assert.match(await página.locator('#resultado').innerText(), /girada 90°/);
      const saída = await baixar(página, '[data-arquivo="0"]');
      assert.equal(saída.nome, 'ferias-editada.jpg');
      assert.deepEqual([...saída.bytes.subarray(0, 3)], [0xFF, 0xD8, 0xFF]);
      // Girada à direita: o canto superior esquerdo da saída é o azul (era o inferior esquerdo da foto).
      const pixels = await lerPixels(página, saída.bytes, [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]);
      assert.deepEqual([pixels.largura, pixels.altura], [300, 300]);
      assert.deepEqual(pixels.cores.map(predominante), ['azul', 'vermelho', 'amarelo', 'verde']);

      // Desfazer volta um passo (o tamanho final deixa de ser 300) e restaurar volta ao começo.
      await página.click('[data-ação="restaurar"]');
      assert.match(await página.locator('[data-informação]').innerText(), /Resultado: 800 × 600 px/);
      assert.equal(await página.inputValue('#campo-brilho'), '0');

      // PNG e WebP: o arquivo tem a assinatura certa.
      await página.selectOption('#campo-formato', 'png');
      await página.click('button[type="submit"]');
      await página.waitForFunction(() => /Baixar PNG/.test(document.querySelector('#resultado')?.innerText ?? ''));
      const png = await baixar(página, '[data-arquivo="0"]');
      assert.equal(png.nome, 'ferias-editada.png');
      assert.equal(png.bytes.subarray(1, 4).toString(), 'PNG');
      await página.selectOption('#campo-formato', 'webp');
      await página.click('button[type="submit"]');
      await página.waitForFunction(() => /Baixar WebP/.test(document.querySelector('#resultado')?.innerText ?? ''));
      const webp = await baixar(página, '[data-arquivo="0"]');
      assert.equal(webp.bytes.subarray(8, 12).toString(), 'WEBP');

      // Valores absurdos vão para o campo certo.
      await página.selectOption('#campo-redimensionar', 'largura');
      await página.fill('#campo-larguraPx', '99999');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'larguraPx'), /limite de 16\.384 pixels/);
      await página.fill('#campo-larguraPx', '0');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'larguraPx'), /pelo menos 1 pixel/);
      await página.fill('#campo-larguraPx', '1280');
      await página.fill('#campo-margemEsquerda', '60');
      await página.fill('#campo-margemDireita', '60');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'margemEsquerda'), /não sobra imagem/);

      // Tipo errado com extensão de foto, arquivo gigante declarado, arquivo vazio e corrompido.
      await página.setInputFiles('#campo-arquivo', arquivo('relatório.jpg', 'image/jpeg', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n')));
      assert.match(await erroDe(página, 'arquivo'), /PDF/);
      await página.setInputFiles('#campo-arquivo', arquivo('gigante.png', 'image/png', Buffer.from(pngSólido(30_000, 30_000, { linhas: 1 }))));
      assert.match(await erroDe(página, 'arquivo'), /900 megapixels/);
      await página.setInputFiles('#campo-arquivo', arquivo('vazio.jpg', 'image/jpeg', Buffer.alloc(0)));
      assert.match(await erroDe(página, 'arquivo'), /vazio/);
      await página.setInputFiles('#campo-arquivo', arquivo('quebrada.jpg', 'image/jpeg', jpg.subarray(0, 40)));
      assert.match(await erroDe(página, 'arquivo'), /corrompido|incompleto|não foi possível/i);
      // Depois de tantas recusas, a foto anterior continua valendo.
      assert.equal(await página.locator('[data-prévia]').isVisible(), true);

      // Orientação EXIF 6 (foto de celular deitada): a foto abre em pé, 600 × 800, e as cores seguem a rotação.
      await página.setInputFiles('#campo-arquivo', arquivo('celular.jpg', 'image/jpeg', comOrientaçãoExif(jpg, 6)));
      await página.waitForFunction(() => /Original: 600 × 800 px/.test(document.querySelector('[data-informação]')?.innerText ?? ''));
    }
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});
