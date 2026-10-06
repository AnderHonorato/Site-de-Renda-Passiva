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

/* ------------------------------------------------------------------ criador de gráficos */

test('criador de gráficos: cria barras, linhas e pizza, valida, exporta PNG, SVG e CSV e não deixa texto de fora virar marcação', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('criador-de-graficos', { viewport: { width: largura, height: altura }, colorScheme: tema });
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'dados'), /Cole os dados/);

    await página.click('text=Preencher com um exemplo');
    await página.fill('#campo-título', 'Vendas do <1º> quadrimestre');
    await página.fill('#campo-prefixo', 'R$');
    await página.click('button[type="submit"]');
    await página.waitForSelector('#resultado:not([hidden])');
    assert.match(await página.locator('#resultado').innerText(), /Gráfico de barras/);
    assert.equal(await página.locator('#resultado tbody tr').count(), 4);
    assert.match(await página.locator('#resultado').innerText(), /R\$ 1\.200/);
    // O gráfico é um SVG válido, sem estilo embutido, com título e descrição, e cabe na tela.
    const svg = await página.evaluate(() => {
      const el = document.querySelector('figure svg');
      const xml = new DOMParser().parseFromString(new XMLSerializer().serializeToString(el), 'image/svg+xml');
      return {
        válido: !xml.querySelector('parsererror'), estilos: el.querySelectorAll('[style]').length + el.querySelectorAll('style').length,
        título: el.querySelector('title')?.textContent, papel: el.getAttribute('role'), largura: el.getBoundingClientRect().width,
        retângulos: el.querySelectorAll('rect').length, imagens: document.querySelectorAll('figure img').length,
      };
    });
    assert.equal(svg.válido, true);
    assert.equal(svg.estilos, 0);
    assert.equal(svg.título, 'Vendas do <1º> quadrimestre');
    assert.equal(svg.papel, 'img');
    assert.ok(svg.largura <= largura, `o gráfico tem ${svg.largura}px numa tela de ${largura}px`);
    assert.equal(svg.retângulos, 1 + 8 + 2);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);
    await capturar(página, `criador-de-graficos-${largura}-${tema}.png`);

    if (largura === 390) {
      // Exporta: SVG (texto XML), PNG (imagem de 1120 × 800) e a tabela em CSV.
      const arquivoSvg = await baixar(página, '[data-arquivo="1"]');
      assert.equal(arquivoSvg.nome, 'vendas-do-1-quadrimestre.svg');
      const texto = arquivoSvg.bytes.toString('utf8');
      assert.ok(texto.startsWith('<?xml version="1.0"'));
      assert.match(texto, /width="560" height="400"/);
      assert.match(texto, /Vendas do &lt;1º&gt; quadrimestre/);
      const arquivoPng = await baixar(página, '[data-arquivo="0"]');
      assert.equal(arquivoPng.nome, 'vendas-do-1-quadrimestre.png');
      assert.equal(arquivoPng.bytes.subarray(1, 4).toString(), 'PNG');
      const pixels = await lerPixels(página, arquivoPng.bytes, [[0.01, 0.01]]);
      assert.deepEqual([pixels.largura, pixels.altura], [1120, 800]);
      assert.deepEqual(pixels.cores[0], [255, 255, 255]);
      const csv = await baixar(página, '[data-tabela="csv"]');
      assert.match(csv.bytes.toString('utf8'), /Janeiro;R\$ 1\.200;R\$ 800/);

      // Trocar o tipo refaz o gráfico sozinho: a pizza usa a primeira série e avisa.
      await página.selectOption('#campo-tipo', 'pizza');
      await página.waitForFunction(() => document.querySelector('figure svg path') && /Gráfico de pizza/.test(document.querySelector('#resultado').innerText));
      assert.equal(await página.locator('figure svg path').count(), 4);
      assert.match(await página.locator('#resultado').innerText(), /uma coluna só: usei "Vendas"/);
      assert.match(await página.locator('#resultado').innerText(), /Participação/i);
      assert.equal(await página.locator('[data-campo="rótuloX"]').isVisible(), false);

      await página.selectOption('#campo-tipo', 'linhas');
      await página.selectOption('#campo-fundo', 'escuro');
      await página.waitForFunction(() => document.querySelector('figure svg polyline'));
      assert.equal(await página.locator('figure svg polyline').count(), 2);
      assert.equal(await página.locator('figure svg > rect').first().getAttribute('fill'), '#15171c');
      const escuro = await baixar(página, '[data-arquivo="0"]');
      assert.deepEqual((await lerPixels(página, escuro.bytes, [[0.01, 0.01]])).cores[0], [21, 23, 28]);

      // Barras com 41 categorias: a mensagem manda usar linhas.
      await página.selectOption('#campo-tipo', 'barras');
      await página.fill('#campo-dados', `Nome;V\n${Array.from({ length: 41 }, (_, i) => `C${i};${i}`).join('\n')}`);
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'tipo'), /41 categorias.*gráfico de linhas/);
      assert.equal(await página.locator('figure svg').count(), 0);

      // Texto no lugar de número: linha e coluna.
      await página.fill('#campo-dados', 'Mês;Vendas\nJan;100\nFev;abc');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'dados'), /Linha 3 \(Fev\), coluna "Vendas": "abc" não é um número/);

      // Texto hostil nos nomes e no título não vira elemento da página.
      await página.fill('#campo-dados', 'Nome;V\n"<img src=x onerror=window.__hack=1>";5\n"</text><script>window.__hack=2</script>";7');
      await página.fill('#campo-título', '<img src=x onerror=window.__hack=3>');
      await página.click('button[type="submit"]');
      await página.waitForSelector('figure svg');
      assert.equal(await página.evaluate(() => [document.querySelectorAll('figure img').length, document.querySelectorAll('figure script').length, window.__hack ?? 'nenhum'].join('|')), '0|0|nenhum');
      assert.match(await página.locator('figure svg').innerHTML(), /&lt;img src=x/);

      // CSV em Windows-1252 (Excel em português): vira o conteúdo da caixa, com os acentos certos.
      const cp1252 = Buffer.concat([Buffer.from('Produto;Vendas\r\n', 'latin1'), Buffer.from([0x43, 0x61, 0x66, 0xE9]), Buffer.from(';1.234,5\r\n', 'latin1'), Buffer.from([0x41, 0xE7, 0xFA, 0x63, 0x61, 0x72]), Buffer.from(';900\r\n', 'latin1')]);
      await página.setInputFiles('#campo-arquivo', arquivo('vendas.csv', 'text/csv', cp1252));
      await página.waitForFunction(() => /Café/.test(document.querySelector('#campo-dados').value));
      assert.match(await página.inputValue('#campo-dados'), /Açúcar/);
      await página.waitForFunction(() => /1\.234,5/.test(document.querySelector('#resultado')?.innerText ?? ''));
      // Um XLSX (ZIP) é recusado com a explicação.
      await página.setInputFiles('#campo-arquivo', arquivo('planilha.xlsx', 'application/zip', Buffer.from([0x50, 0x4B, 3, 4, 0, 0, 0, 0])));
      assert.match(await erroDe(página, 'arquivo'), /não é um CSV de texto/);
    }
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});

/* ------------------------------------------------------------------ criar GIF */

/** Decodifica um GIF com o decodificador do próprio Chromium (WebCodecs) e devolve quadros, repetição, tamanho e a cor de pontos do primeiro quadro. */
async function lerGifNoNavegador(página, bytes, pontos = []) {
  return página.evaluate(async ([base64, lista]) => {
    const dados = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const decodificador = new ImageDecoder({ data: dados, type: 'image/gif' });
    await decodificador.tracks.ready;
    const faixa = decodificador.tracks.selectedTrack;
    const { image } = await decodificador.decode({ frameIndex: 0 });
    const tela = new OffscreenCanvas(image.displayWidth, image.displayHeight);
    const c = tela.getContext('2d');
    c.drawImage(image, 0, 0);
    const cores = lista.map(([fx, fy]) => [...c.getImageData(Math.floor(fx * (image.displayWidth - 1)), Math.floor(fy * (image.displayHeight - 1)), 1, 1).data]);
    const duração = image.duration;
    image.close();
    return { quadros: faixa.frameCount, repetições: faixa.repetitionCount, largura: tela.width, altura: tela.height, cores, duração };
  }, [bytes.toString('base64'), pontos]);
}

test('criar GIF: monta o GIF de várias imagens, na ordem escolhida, confere no decodificador do navegador e recusa o que não é imagem', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('criar-gif', { viewport: { width: largura, height: altura }, colorScheme: tema });
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'arquivo'), /pelo menos 2 imagens/);

    const horizontal = await imagemDeTeste(página, 800, 600);
    const vertical = await imagemDeTeste(página, 300, 400, 'image/png');
    const quadrada = await imagemDeTeste(página, 200, 200, 'image/png');
    await página.setInputFiles('#campo-arquivo', [arquivo('a-horizontal.jpg', 'image/jpeg', horizontal), arquivo('b-vertical.png', 'image/png', vertical), arquivo('c-quadrada.png', 'image/png', quadrada)]);
    await página.waitForFunction(() => document.querySelectorAll('[role="listitem"]').length === 3);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);

    if (largura === 390) {
      // Reordenar: mover a primeira para baixo troca a ordem, e o primeiro botão "para cima" da lista fica desligado.
      assert.equal(await página.locator('[data-mover="0"][data-sentido="-1"]').isDisabled(), true);
      await página.click('[data-mover="0"][data-sentido="1"]');
      assert.match(await página.locator('[role="listitem"]').first().innerText(), /b-vertical\.png/);
      await página.click('[data-mover="1"][data-sentido="-1"]');
      assert.match(await página.locator('[role="listitem"]').first().innerText(), /a-horizontal\.jpg/);

      // Opções inválidas vão para o campo certo, antes de abrir qualquer imagem.
      await página.fill('#campo-largura', '5');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'largura'), /entre 16 e 1\.000/);
      await página.fill('#campo-largura', '480');
      await página.fill('#campo-atraso', '5');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'atraso'), /entre 20 e 10\.000/);
      await página.fill('#campo-atraso', '200');

      // GIF de verdade: 3 imagens com ida e volta = 4 quadros de 480 × 360 (a primeira é 4:3).
      await página.check('#campo-idaEVolta');
      await página.click('button[type="submit"]');
      await página.waitForSelector('#resultado:not([hidden])', { timeout: 60_000 });
      assert.match(await página.locator('#resultado').innerText(), /GIF pronto/);
      assert.match(await página.locator('#resultado').innerText(), /4 quadros de 480 × 360 px/);
      const prévia = página.locator('figure img');
      await prévia.waitFor();
      assert.equal(await prévia.evaluate((img) => img.complete && img.naturalWidth), 480);
      const gif = await baixar(página, '[data-arquivo="0"]');
      assert.equal(gif.nome, 'a-horizontal.gif');
      assert.equal(gif.bytes.subarray(0, 6).toString('latin1'), 'GIF89a');
      const lido = await lerGifNoNavegador(página, gif.bytes, [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]);
      assert.deepEqual([lido.quadros, lido.largura, lido.altura, lido.repetições], [4, 480, 360, Infinity]);
      assert.deepEqual(lido.cores.map(predominante), ['vermelho', 'verde', 'azul', 'amarelo']);
      assert.equal(lido.duração, 200_000, 'microssegundos: 200 ms');
      await capturar(página, `criar-gif-${largura}-${tema}.png`);

      // Repetir uma vez: o navegador lê contagem 0 (não há extensão de repetição).
      await página.selectOption('#campo-repetições', '1');
      await página.click('button[type="submit"]');
      await página.waitForFunction(() => document.querySelector('#resultado dd, #resultado li')?.innerText?.length > 0 && /Uma vez/.test(document.querySelector('#resultado').innerText));
      const uma = await lerGifNoNavegador(página, await baixar(página, '[data-arquivo="0"]').then((a) => a.bytes));
      assert.equal(uma.repetições, 0);

      // PNG com transparência e fundo transparente: o canto vazado sai com alfa 0.
      const transparente = await página.evaluate(async () => {
        const tela = document.createElement('canvas'); tela.width = 100; tela.height = 100;
        const c = tela.getContext('2d'); c.fillStyle = '#e11d48'; c.fillRect(30, 30, 40, 40);
        const blob = await new Promise((r) => tela.toBlob(r, 'image/png'));
        let t = ''; for (const b of new Uint8Array(await blob.arrayBuffer())) t += String.fromCharCode(b); return btoa(t);
      });
      await página.click('[data-tirar="0"]');
      await página.click('[data-tirar="0"]');
      await página.click('[data-tirar="0"]');
      await página.setInputFiles('#campo-arquivo', [arquivo('t1.png', 'image/png', Buffer.from(transparente, 'base64')), arquivo('t2.png', 'image/png', Buffer.from(transparente, 'base64'))]);
      await página.waitForFunction(() => document.querySelectorAll('[role="listitem"]').length === 2);
      await página.selectOption('#campo-fundo', 'transparente');
      await página.selectOption('#campo-repetições', 'infinito');
      await página.click('button[type="submit"]');
      await página.waitForFunction(() => /2 quadros de 480 × 480/.test(document.querySelector('#resultado')?.innerText ?? ''), null, { timeout: 60_000 });
      const vazado = await lerGifNoNavegador(página, (await baixar(página, '[data-arquivo="0"]')).bytes, [[0.02, 0.02], [0.5, 0.5]]);
      assert.equal(vazado.cores[0][3], 0, 'o canto é transparente');
      assert.deepEqual(vazado.cores[1].slice(0, 3), [225, 29, 72]);

      // Entradas hostis: PDF com nome de imagem, arquivo vazio, cabeçalho de 900 megapixels e lista cheia.
      await página.setInputFiles('#campo-arquivo', arquivo('relatório.png', 'image/png', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n')));
      assert.match(await erroDe(página, 'arquivo'), /PDF.*não uma imagem/);
      await página.setInputFiles('#campo-arquivo', arquivo('vazia.png', 'image/png', Buffer.alloc(0)));
      assert.match(await erroDe(página, 'arquivo'), /vazio/);
      await página.setInputFiles('#campo-arquivo', arquivo('gigante.png', 'image/png', Buffer.from(pngSólido(30_000, 30_000, { linhas: 1 }))));
      assert.match(await erroDe(página, 'arquivo'), /900 megapixels/);
      const muitas = Array.from({ length: 62 }, (_, i) => arquivo(`q${i}.png`, 'image/png', Buffer.from(pngSólido(8 + i, 8))));
      await página.setInputFiles('#campo-arquivo', muitas);
      await página.waitForFunction(() => document.querySelectorAll('[role="listitem"]').length === 60, null, { timeout: 60_000 });
      assert.match(await erroDe(página, 'arquivo'), /Limite de 60 arquivos/);
      // Com 60 quadros de proporção estranha e largura grande, o orçamento de pixels recusa antes de abrir as imagens.
      await página.fill('#campo-largura', '1000');
      await página.click('button[type="submit"]');
      assert.match(await erroDe(página, 'largura'), /24 milhões/);
    }
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});
