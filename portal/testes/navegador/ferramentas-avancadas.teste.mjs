/**
 * Testes de navegador das ferramentas avançadas (simulador de financiamento, ler QR Code, texto para fala,
 * converter planilha e ZIP): usam a tela de verdade, em celular e computador, e conferem o que é baixado.
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

import { desenharQr, pngDe, ruído } from '../auxiliares/qr-de-teste.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4478;
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

async function abrir(slug, { viewport = { width: 390, height: 844 }, colorScheme = 'light', antes = null } = {}) {
  const contexto = await navegador.newContext({ viewport, acceptDownloads: true, colorScheme });
  if (antes) await contexto.addInitScript(antes);
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

/* ------------------------------------------------------------------ simulador de financiamento */

test('simulador de financiamento: simula, compara Price e SAC, valida e exporta CSV', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('simulador-de-financiamento', { viewport: { width: largura, height: altura }, colorScheme: tema });
    await página.fill('#campo-valor', '150000');
    await página.fill('#campo-entrada', '30000');
    await página.fill('#campo-prazo', '12');
    await página.fill('#campo-taxa', '1');
    await página.click('button[type="submit"]');
    await página.waitForSelector('#resultado:not([hidden])');
    const texto = await página.locator('#resultado').innerText();
    assert.match(texto, /SAC custa R\$\s?142,26 a menos/);
    assert.match(texto, /10\.661,85/);
    assert.match(texto, /Premissas/);
    assert.equal(await página.locator('#resultado tbody tr').count(), 12);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);
    await capturar(página, `financiamento-${largura}-${tema}.png`);

    // Erro no campo certo.
    await página.fill('#campo-entrada', '150000');
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'entrada'), /não sobra nada para financiar/);
    await página.fill('#campo-entrada', '30000');
    await página.fill('#campo-prazo', '0');
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'prazo'), /Prazo/);
    await página.fill('#campo-prazo', '12');
    await página.fill('#campo-taxa', 'abc');
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'taxa'), /precisa ser um número/);

    if (largura === 390) {
      await página.fill('#campo-taxa', '1');
      await página.click('button[type="submit"]');
      await página.waitForSelector('#resultado:not([hidden])');
      const csv = await baixar(página, '[data-arquivo="0"]');
      assert.equal(csv.nome, 'financiamento-price.csv');
      const linhas = new TextDecoder().decode(csv.bytes).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
      assert.equal(linhas.length, 13);
      // Número com vírgula decimal sai entre aspas (CSV válido; o Excel em português lê como número).
      assert.equal(linhas[1], '1;"10661,85";"1200,00";"9461,85";"0,00";"110538,15"');
      const sac = await baixar(página, '[data-arquivo="1"]');
      assert.equal(sac.nome, 'financiamento-sac.csv');
      const xlsx = await baixar(página, '[data-arquivo="2"]');
      assert.equal(xlsx.nome, 'financiamento-price.xlsx');
      assert.equal(xlsx.bytes.subarray(0, 2).toString(), 'PK');
    }
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});

/* ------------------------------------------------------------------ ler QR Code */

const arquivoPng = (imagem, nome = 'qr.png') => ({ name: nome, mimeType: 'image/png', buffer: pngDe(imagem) });

test('ler QR Code: lê a imagem, mostra o conteúdo e os alertas, e não abre nada sozinho', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('scanner-de-qr-code', { viewport: { width: largura, height: altura }, colorScheme: tema });
    const abertas = [];
    contexto.on('page', (nova) => abertas.push(nova.url()));
    assert.match(await página.locator('#campo-arquivo').evaluate((e) => e.closest('.campo').innerText), /Nenhuma imagem|Imagem com o QR/);

    // Sem imagem: o erro vai para o campo certo.
    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'arquivo'), /Escolha uma imagem/);

    // Link com alerta (encurtador) em PNG de verdade.
    await página.setInputFiles('#campo-arquivo', arquivoPng(desenharQr(['https://bit.ly/abc123'], { escala: 5 })));
    await página.waitForSelector('#resultado:not([hidden])', { timeout: 20000 });
    const texto = await página.locator('#resultado').innerText();
    assert.match(texto, /Link/);
    assert.match(texto, /encurtador/);
    assert.match(texto, /Nada foi aberto/);
    assert.equal(await página.locator('#conteúdo-lido-0').inputValue(), 'https://bit.ly/abc123');
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);
    await capturar(página, `qr-${largura}-${tema}.png`);

    // O botão existe, mas nada foi aberto antes do clique.
    assert.equal(abertas.length, 0);
    assert.equal(await página.locator('[data-arquivo="0"]').innerText().then((t) => /Abrir o link/.test(t)), true);

    if (largura === 390) {
      // Pix de verdade: CRC conferido e dados mostrados.
      await página.setInputFiles('#campo-arquivo', arquivoPng(desenharQr(['Mesa 12 · Café com açúcar'], { escala: 5 })));
      await página.waitForFunction(() => document.querySelector('#conteúdo-lido-0')?.value.includes('Café com açúcar'), null, { timeout: 20000 });
      // Imagem sem QR Code (só um quadro cinza): mensagem clara no campo.
      await página.setInputFiles('#campo-arquivo', arquivoPng({ data: new Uint8ClampedArray(300 * 300 * 4).fill(200), width: 300, height: 300 }, 'cinza.png'));
      assert.match(await erroDe(página, 'arquivo'), /Não encontrei nenhum QR Code/);
      // Arquivo errado, com a extensão trocada: PDF disfarçado de PNG.
      await página.setInputFiles('#campo-arquivo', { name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('%PDF-1.4' + String.fromCharCode(10) + '1 0 obj') });
      assert.match(await erroDe(página, 'arquivo'), /é um PDF, não uma imagem/);
      // Imagem corrompida: cabeçalho de PNG sem o resto.
      await página.setInputFiles('#campo-arquivo', { name: 'quebrado.png', mimeType: 'image/png', buffer: pngDe(desenharQr(['x'])).subarray(0, 20) });
      assert.match(await erroDe(página, 'arquivo'), /corrompido|incompleto/);
      // Bomba de pixels: PNG minúsculo que declara 60000 x 60000.
      const bomba = pngDe(desenharQr(['x']));
      bomba.writeUInt32BE(60000, 16);
      bomba.writeUInt32BE(60000, 20);
      await página.setInputFiles('#campo-arquivo', { name: 'bomba.png', mimeType: 'image/png', buffer: bomba });
      assert.match(await erroDe(página, 'arquivo'), /100 megapixels/);
    }
    assert.deepEqual(erros.filter((e) => !/Failed to load resource.*(40[0-9])/.test(e)), []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});

test('ler QR Code: imagem cheia de ruído não trava a página (prazo) e a leitura de três códigos funciona', { skip: pular }, async () => {
  const { contexto, página, erros } = await abrir('scanner-de-qr-code');
  await página.setInputFiles('#campo-arquivo', arquivoPng(desenharQr(['https://um.exemplo.com', 'https://dois.exemplo.com', 'https://tres.exemplo.com'], { escala: 4 }), 'tres.png'));
  await página.waitForSelector('#resultado:not([hidden])', { timeout: 30000 });
  assert.match(await página.locator('#resultado').innerText(), /3 QR Codes encontrados/);

  const inicio = Date.now();
  await página.setInputFiles('#campo-arquivo', arquivoPng(ruído(1400, 1000), 'ruido.png'));
  // Enquanto lê, a página continua respondendo: o botão de tirar o arquivo ainda recebe foco.
  assert.match(await erroDe(página, 'arquivo'), /demorou demais|Não encontrei/);
  assert.ok(Date.now() - inicio < 45000, 'a leitura de ruído precisa terminar no prazo');
  assert.deepEqual(erros.filter((e) => !/Failed to load resource/.test(e)), []);
  await contexto.close();
});

/* ------------------------------------------------------------------ texto para fala */

/** Sintetizador de mentira, instalado antes da página: o teste não depende de voz nem de som do computador. */
function sintetizadorFalso({ comVozes = true } = {}) {
  const instalar = (comVozes) => {
    window.__falas = [];
    window.__eventos = [];
    const vozes = [
      { voiceURI: 'Maria', name: 'Maria', lang: 'pt-BR', localService: true },
      { voiceURI: 'Rede', name: 'Voz de rede', lang: 'pt-BR', localService: false },
      { voiceURI: 'Alex', name: 'Alex', lang: 'en-US', localService: true },
    ];
    window.SpeechSynthesisUtterance = class { constructor(texto) { this.text = texto; this.rate = 1; this.pitch = 1; } };
    let última = null;
    const sint = {
      speaking: false, pending: false, paused: false,
      getVoices: () => (comVozes ? vozes : []),
      addEventListener() {},
      speak(fala) { última = fala; window.__falas.push({ texto: fala.text, voz: fala.voice?.name, velocidade: fala.rate, tom: fala.pitch }); this.speaking = true; setTimeout(() => fala.onstart?.(), 0); },
      cancel() { this.speaking = false; window.__eventos.push('cancel'); },
      pause() { this.paused = true; window.__eventos.push('pause'); },
      resume() { this.paused = false; window.__eventos.push('resume'); },
    };
    window.__terminar = () => { sint.speaking = false; última?.onend?.(); };
    Object.defineProperty(window, 'speechSynthesis', { value: sint, configurable: true });
  };
  // O script roda dentro da página, sem acesso às variáveis daqui: o argumento vai escrito no código.
  return { content: `(${instalar.toString()})(${JSON.stringify(comVozes)})` };
}

const QUEBRA = String.fromCharCode(10);

test('texto para fala: lê em fila, pausa, pula de parágrafo, para; erros no campo certo e sem arquivo de áudio', { skip: pular }, async () => {
  for (const [largura, altura, tema] of [[390, 844, 'light'], [320, 640, 'dark'], [1280, 900, 'light']]) {
    const { contexto, página, erros, externas } = await abrir('texto-para-fala', { viewport: { width: largura, height: altura }, colorScheme: tema, antes: sintetizadorFalso() });
    await página.waitForFunction(() => document.querySelector('#campo-voz').value === 'Maria');
    // Só vozes do aparelho, em português, por padrão.
    assert.deepEqual(await página.locator('#campo-voz option').allInnerTexts(), ['Maria (pt-BR) — no aparelho']);

    await página.click('button[type="submit"]');
    assert.match(await erroDe(página, 'texto'), /Escreva ou cole/);

    await página.fill('#campo-texto', ['Primeiro parágrafo aqui.', 'Segundo parágrafo, mais longo.', 'Terceiro.'].join(QUEBRA));
    await página.selectOption('#campo-velocidade', '1.5');
    await página.click('button[type="submit"]');
    await página.waitForSelector('#resultado:not([hidden])');
    assert.deepEqual(await página.evaluate(() => window.__falas), [{ texto: 'Primeiro parágrafo aqui.', voz: 'Maria', velocidade: 1.5, tom: 1 }]);
    assert.match(await página.locator('#situação-da-leitura').innerText(), /Lendo o parágrafo 1 de 3/);
    assert.match(await página.locator('#resultado').innerText(), /Não é gerado arquivo de áudio/);
    assert.equal(await semRolagemLateral(página), true, `sem rolagem lateral em ${largura}px`);
    await capturar(página, `fala-${largura}-${tema}.png`);

    // Fim do trecho: passa para o seguinte, sozinho.
    await página.evaluate(() => window.__terminar());
    assert.equal((await página.evaluate(() => window.__falas)).at(-1).texto, 'Segundo parágrafo, mais longo.');
    // Pausar e continuar.
    await página.click('button:has-text("Pausar")');
    assert.match(await página.locator('#situação-da-leitura').innerText(), /Pausado no parágrafo 2 de 3/);
    await página.click('button:has-text("Continuar")');
    assert.match(await página.locator('#situação-da-leitura').innerText(), /Lendo o parágrafo 2 de 3/);
    // Pular de parágrafo.
    await página.click('button:has-text("Parágrafo seguinte")');
    assert.equal((await página.evaluate(() => window.__falas)).at(-1).texto, 'Terceiro.');
    assert.equal(await página.locator('button:has-text("Parágrafo seguinte")').isDisabled(), true);
    await página.click('button:has-text("Parágrafo anterior")');
    assert.equal((await página.evaluate(() => window.__falas)).at(-1).texto, 'Segundo parágrafo, mais longo.');
    // Parar.
    await página.click('button:has-text("Parar")');
    assert.equal(await página.locator('button:has-text("Pausar")').isHidden(), true);
    assert.equal((await página.evaluate(() => window.__eventos)).at(-1), 'cancel');

    // Mostrar vozes de outros idiomas e de rede.
    await página.uncheck('#campo-sóDoAparelho');
    await página.check('#campo-todosOsIdiomas');
    assert.equal(await página.locator('#campo-voz option').count(), 3);
    await página.selectOption('#campo-voz', 'Rede');
    await página.click('button[type="submit"]');
    await página.waitForSelector('#resultado:not([hidden])');
    assert.match(await página.locator('#resultado').innerText(), /voz é de rede.*enviar o texto/);
    assert.deepEqual(erros, []);
    assert.deepEqual(externas, [], 'nenhuma requisição para fora');
    await contexto.close();
  }
});

test('texto para fala: sem suporte e sem vozes, a tela diz o que acontece e o que fazer', { skip: pular }, async () => {
  const semApi = await abrir('texto-para-fala', { antes: { content: 'delete window.SpeechSynthesisUtterance; Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });' } });
  assert.equal(await semApi.página.locator('button[type="submit"]').isDisabled(), true);
  assert.match(await semApi.página.locator('#campo-voz-dica').innerText(), /não tem leitura em voz alta/);
  await semApi.contexto.close();

  const semVozes = await abrir('texto-para-fala', { antes: sintetizadorFalso({ comVozes: false }) });
  await semVozes.página.waitForFunction(() => /não informou nenhuma voz/.test(document.querySelector('#campo-voz-dica').textContent), null, { timeout: 6000 });
  await semVozes.página.fill('#campo-texto', 'Olá');
  await semVozes.página.click('button[type="submit"]');
  assert.match(await erroDe(semVozes.página, 'voz'), /Configurações/);
  await semVozes.contexto.close();
});
