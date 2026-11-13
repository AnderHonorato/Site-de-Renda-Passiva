/**
 * Integração em Chromium da execução visual do montador e das exportações locais.
 *
 * node --test testes/navegador/execucao-visual.teste.mjs
 * Opcionais: PLAYWRIGHT_MODULO=/caminho/index.mjs e PLAYWRIGHT_EXECUTAVEL=/usr/bin/chromium.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { pdfDeTeste, biblioteca } from '../auxiliares/pdf-de-teste.mjs';
import { lerCsv } from '../../scripts/cálculos/tabular.js';
import * as xlsx from '../../recursos/bibliotecas/xlsx-0.20.3.mjs';

const PORTAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPOSITÓRIO = join(PORTAL, '..');
const CAPTURAS = join(PORTAL, '.execucao', 'execucao-visual-e2e');
const chromium = await (async () => {
  if (process.env.PLAYWRIGHT_MODULO) {
    const módulo = process.env.PLAYWRIGHT_MODULO;
    return (await import(isAbsolute(módulo) ? pathToFileURL(módulo).href : módulo)).chromium;
  }
  for (const pacote of ['playwright', 'playwright-core']) {
    try { return createRequire(import.meta.url)(pacote).chromium; } catch { /* tenta o próximo */ }
  }
  return null;
})();
const pular = chromium ? false : 'Playwright não instalado; defina PLAYWRIGHT_MODULO para rodar o Chromium real.';

let servidor;
let navegador;
let base;
let logs = '';

async function portaLivre() {
  const reserva = createServer();
  await new Promise((resolve, reject) => {
    reserva.once('error', reject);
    reserva.listen(0, '127.0.0.1', resolve);
  });
  const porta = reserva.address().port;
  await new Promise(resolve => reserva.close(resolve));
  return porta;
}

before(async () => {
  if (!chromium) return;
  const porta = await portaLivre();
  base = `http://127.0.0.1:${porta}`;
  servidor = spawn(process.execPath, ['portal/ferramentas/servir.mjs', 'portal', '--porta', String(porta), '--local'], {
    cwd: REPOSITÓRIO,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const fluxo of [servidor.stdout, servidor.stderr]) fluxo.on('data', bloco => { logs = (logs + bloco).slice(-12000); });
  let pronto = false;
  for (let i = 0; i < 100; i++) {
    if (servidor.exitCode !== null) throw new Error(`Servidor local encerrou durante a inicialização:\n${logs}`);
    try { pronto = (await fetch(`${base}/f/porcentagem/`)).ok; } catch { /* servidor iniciando */ }
    if (pronto) break;
    await esperar(100);
  }
  assert.ok(pronto, `Servidor local não ficou pronto:\n${logs}`);

  const candidatos = [process.env.PLAYWRIGHT_EXECUTAVEL];
  if (process.env.PATH) {
    for (const pasta of process.env.PATH.split(process.platform === 'win32' ? ';' : ':')) {
      candidatos.push(join(pasta, 'chromium'), join(pasta, 'chromium-browser'), join(pasta, 'google-chrome'));
    }
  }
  const executável = candidatos.find(caminho => caminho && existsSync(caminho));
  navegador = await chromium.launch({ headless: true, ...(executável ? { executablePath: executável } : {}) });
});

after(async () => {
  await navegador?.close();
  if (servidor && servidor.exitCode === null) {
    servidor.kill('SIGTERM');
    await Promise.race([new Promise(resolve => servidor.once('exit', resolve)), esperar(3000)]);
    if (servidor.exitCode === null) servidor.kill('SIGKILL');
  }
});

async function abrirFerramenta(slug, opções = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 820 }, ...opções });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: base }]);
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', erro => erros.push(String(erro)));
  const resposta = await página.goto(`${base}/f/${slug}/`, { waitUntil: 'domcontentloaded' });
  assert.equal(resposta.status(), 200, `A página ${slug} precisa existir`);
  const essencial = página.getByRole('button', { name: 'Só o essencial', exact: true });
  if (await essencial.isVisible()) await essencial.click();
  await página.locator('#formulário').waitFor();
  return { contexto, página, erros };
}

async function esperarEstado(página, seletor, estado = 'concluído') {
  const visual = página.locator(seletor);
  await visual.waitFor({ state: 'visible' });
  await página.waitForFunction(({ seletor: alvo, estado: esperado }) => {
    return document.querySelector(alvo)?.getAttribute('data-execucao-estado') === esperado;
  }, { seletor, estado });
  return visual;
}

async function clicarDownload(página, botão) {
  const esperado = página.waitForEvent('download', { timeout: 15000 });
  await botão.click();
  const download = await esperado;
  assert.equal(await download.failure(), null);
  return { download, bytes: await readFile(await download.path()) };
}

test('porcentagem: duas execuções reais, tema, responsividade e reset', { skip: pular, timeout: 30000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('porcentagem', { colorScheme: 'light', reducedMotion: 'reduce' });
  try {
    await página.locator('#campo-a').fill('15');
    await página.locator('#campo-b').fill('200');
    await página.getByRole('button', { name: 'Calcular', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    let visual = await esperarEstado(página, '#progresso');
    assert.equal(await página.locator('.resultado__cabecalho .rótulo').evaluate(el => el.textContent.trim()), 'Resultado');
    assert.equal(await página.locator('[data-estado-resultado]').evaluate(el => el.textContent.trim()), 'Pronto');
    assert.equal(await página.locator('.resultado__valor').innerText(), '30');
    assert.equal(await visual.locator('[role=progressbar]').getAttribute('aria-valuenow'), '100');

    await página.locator('#campo-a').fill('25');
    await página.getByRole('button', { name: 'Calcular', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    visual = await esperarEstado(página, '#progresso');
    assert.equal(await página.locator('.resultado__valor').innerText(), '50');
    assert.equal(await visual.locator('[role=progressbar]').getAttribute('aria-valuenow'), '100');

    // Capturas de referência da ferramenta realmente montada, nos dois extremos do layout.
    await mkdir(CAPTURAS, { recursive: true });
    for (const largura of [320, 1280]) {
      await página.setViewportSize({ width: largura, height: 900 });
      await página.locator('#resultado').screenshot({ path: join(CAPTURAS, `resultado-${largura}.png`) });
    }
    await página.evaluate(async () => {
      const { criarProgresso } = await import('/scripts/núcleo/interface.js');
      window.__capturaProgresso = criarProgresso(document.querySelector('#progresso'));
      window.__capturaProgresso.iniciar('Calculando resultado para captura de referência');
    });
    for (const largura of [320, 1280]) {
      await página.setViewportSize({ width: largura, height: 900 });
      await página.locator('#progresso').screenshot({ path: join(CAPTURAS, `execucao-ativa-${largura}.png`) });
    }
    await página.evaluate(() => window.__capturaProgresso.concluir('Pronto'));

    await página.locator('#abrir-preferencias').click();
    const botãoTema = página.locator('#alternar-tema');
    await botãoTema.click();
    await página.waitForFunction(() => document.documentElement.dataset.tema === 'escuro');
    const fundoEscuro = await página.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim());
    await botãoTema.click();
    await página.waitForFunction(() => document.documentElement.dataset.tema === 'claro');
    const fundoClaro = await página.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim());
    assert.notEqual(fundoEscuro, fundoClaro, 'a paleta efetiva muda entre claro e escuro');
    assert.equal(await página.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);

    for (const largura of [320, 768, 1280]) for (const tema of ['claro', 'escuro']) {
      await página.evaluate(t => { document.documentElement.dataset.tema = t; }, tema);
      await página.setViewportSize({ width: largura, height: 820 });
      const larguraDocumento = await página.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: innerWidth }));
      assert.ok(larguraDocumento.documento <= larguraDocumento.janela + 1, `sem overflow horizontal a ${largura}px/${tema}: ${JSON.stringify(larguraDocumento)}`);
    }

    await página.getByRole('button', { name: 'Limpar', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'hidden' });
    await página.locator('#progresso').waitFor({ state: 'hidden' });
    assert.equal(await página.locator('#campo-a').inputValue(), '');
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('as exportações CSV e XLSX de uma tabela concluem após gerar arquivos válidos', { skip: pular, timeout: 30000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('preco-de-venda');
  try {
    await página.locator('#campo-custo').fill('80');
    await página.locator('#campo-margem').fill('30');
    await página.getByRole('button', { name: 'Calcular preço', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    await esperarEstado(página, '#progresso');
    assert.ok(await página.locator('.resultado__tabela table tbody tr').count() > 0);

    let arquivo = await clicarDownload(página, página.locator('[data-tabela="csv"]'));
    let exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-tipo-execucao'), 'arquivo');
    assert.match(arquivo.bytes.toString('utf8'), /Composição do preço/);
    assert.deepEqual(lerCsv(arquivo.bytes.toString('utf8').replace(/^\uFEFF/, ''), { separador: ';' })[0], ['Composição do preço', 'Valor', 'Parte do preço']);

    arquivo = await clicarDownload(página, página.locator('[data-tabela="xlsx"]'));
    exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-tipo-execucao'), 'arquivo');
    assert.equal(arquivo.bytes.subarray(0, 2).toString(), 'PK');
    const livro = xlsx.read(arquivo.bytes, { type: 'buffer' });
    assert.deepEqual(xlsx.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1 })[0], ['Composição do preço', 'Valor', 'Parte do preço']);
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('juntar PDFs: upload, processamento e download preservam as páginas reais', { skip: pular, timeout: 40000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('juntar-pdf');
  try {
    const primeiro = await pdfDeTeste(2, { texto: true });
    const segundo = await pdfDeTeste(1, { texto: true });
    await página.locator('#campo-arquivos').setInputFiles([
      { name: 'primeiro.pdf', mimeType: 'application/pdf', buffer: Buffer.from(primeiro) },
      { name: 'segundo.pdf', mimeType: 'application/pdf', buffer: Buffer.from(segundo) },
    ]);
    await página.getByRole('list', { name: 'PDFs escolhidos, na ordem da junção' }).getByRole('listitem').nth(1).waitFor();
    await página.getByRole('button', { name: 'Juntar PDFs', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible', timeout: 20000 });
    const visual = await esperarEstado(página, '#progresso');
    assert.match(await página.locator('.resultado__valor').innerText(), /PDF pronto: 3 páginas/);
    assert.equal(await visual.locator('[role=progressbar]').getAttribute('aria-valuenow'), '100');

    const { download, bytes } = await clicarDownload(página, página.locator('[data-arquivo="0"]'));
    assert.equal(download.suggestedFilename(), 'juntado.pdf');
    const exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-execucao-estado'), 'concluído');
    const documento = await biblioteca.PDFDocument.load(bytes);
    assert.equal(documento.getPageCount(), 3);
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('comprimir imagem: PNG gerado no Canvas vira download com dimensões reais', { skip: pular, timeout: 40000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('comprimir-imagem', { reducedMotion: 'reduce' });
  try {
    const bytesPng = await página.evaluate(async () => {
      const tela = document.createElement('canvas');
      tela.width = 64;
      tela.height = 32;
      const contextoCanvas = tela.getContext('2d');
      contextoCanvas.fillStyle = '#e4572e';
      contextoCanvas.fillRect(0, 0, 32, 32);
      contextoCanvas.fillStyle = '#167c80';
      contextoCanvas.fillRect(32, 0, 32, 32);
      const blob = await new Promise(resolve => tela.toBlob(resolve, 'image/png'));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    await página.locator('#campo-arquivo').setInputFiles({ name: 'faixas.png', mimeType: 'image/png', buffer: Buffer.from(bytesPng) });
    await página.locator('#campo-largura').fill('0');
    await página.getByRole('button', { name: 'Comprimir imagem', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible', timeout: 20000 });
    const visual = await esperarEstado(página, '#progresso');
    assert.equal(await visual.getAttribute('data-execucao-estado'), 'concluído');
    assert.match(await página.locator('.resultado__linhas').innerText(), /64 × 32 px/);
    await página.locator('.compressao-previa img').waitFor({ state: 'visible' });

    const { download, bytes } = await clicarDownload(página, página.locator('[data-arquivo="0"]'));
    assert.equal(download.suggestedFilename(), 'faixas-comprimida.webp');
    const exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-execucao-estado'), 'concluído');
    const dimensões = await página.evaluate(async entrada => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(entrada)]));
      const resultado = { largura: bitmap.width, altura: bitmap.height };
      bitmap.close();
      return resultado;
    }, [...bytes]);
    assert.deepEqual(dimensões, { largura: 64, altura: 32 });
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('QR Code: PNG assíncrono de 1024 px e progresso só conclui após o download', { skip: pular, timeout: 30000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('qr-code');
  try {
    await página.locator('#campo-principal').fill('https://example.com/loja');
    await página.getByRole('button', { name: 'Gerar QR Code', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    await esperarEstado(página, '#progresso');
    await página.locator('#resultado .resultado__valor svg').waitFor();
    assert.equal(await página.locator('#resultado .resultado__valor svg').getAttribute('aria-label'), 'QR Code do conteúdo informado');

    const { download, bytes } = await clicarDownload(página, página.locator('[data-arquivo="1"]'));
    assert.equal(download.suggestedFilename(), 'qr-code.png');
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-execucao-estado'), 'concluído');
    const dimensões = await página.evaluate(async entrada => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(entrada)]));
      const resultado = { largura: bitmap.width, altura: bitmap.height };
      bitmap.close();
      return resultado;
    }, [...bytes]);
    assert.deepEqual(dimensões, { largura: 1024, altura: 1024 });
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('criador de gráficos: a Promise do PNG gera imagem válida e conclui sua faixa', { skip: pular, timeout: 30000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('criador-de-graficos');
  try {
    await página.locator('#campo-dados').fill('Mês;Vendas\nJaneiro;10\nFevereiro;20');
    await página.locator('#campo-título').fill('Vendas da loja');
    await página.getByRole('button', { name: 'Criar gráfico', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    await esperarEstado(página, '#progresso');
    assert.ok(await página.locator('figure[aria-label="Gráfico criado"] svg').isVisible());
    const { download, bytes } = await clicarDownload(página, página.getByRole('button', { name: 'Baixar PNG', exact: true }));
    assert.match(download.suggestedFilename(), /\.png$/);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const exportação = await esperarEstado(página, '[data-progresso-arquivo]');
    assert.equal(await exportação.getAttribute('data-execucao-estado'), 'concluído');
    const dimensões = await página.evaluate(async entrada => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(entrada)]));
      const resultado = { largura: bitmap.width, altura: bitmap.height };
      bitmap.close();
      return resultado;
    }, [...bytes]);
    assert.deepEqual(dimensões, { largura: 1120, altura: 800 });
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('helper visual: transições terminais antigas, pausa, percentual e estados de falha/cancelamento', { skip: pular, timeout: 15000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 900, height: 700 }, reducedMotion: 'no-preference' });
  const página = await contexto.newPage();
  try {
    await página.goto(`${base}/f/porcentagem/`, { waitUntil: 'domcontentloaded' });
    await página.locator('#ferramenta').waitFor();
    await página.evaluate(async () => {
      const { criarExecucaoVisual } = await import('/scripts/núcleo/execucao-visual.js');
      const elemento = document.createElement('div');
      elemento.className = 'progresso';
      elemento.id = 'helper-visual-teste';
      elemento.hidden = true;
      document.body.append(elemento);
      const controle = criarExecucaoVisual(elemento, { titulo: 'Teste do helper' });
      window.__controleVisualTeste = controle;
      controle.andar(37, 'Etapa real');
      if (elemento.querySelector('[role=progressbar]').getAttribute('aria-valuenow') !== '37') throw new Error('percentual determinado divergente');
      controle.iniciar('Sem percentual informado');
      if (elemento.querySelector('[role=progressbar]').hasAttribute('aria-valuenow')) throw new Error('estado indeterminado anunciou percentual');
      if (elemento.querySelector('[role=progressbar]').dataset.indeterminado !== 'sim') throw new Error('estado não ficou indeterminado');
    });
    const alvo = página.locator('#helper-visual-teste');
    const botãoPausa = alvo.locator('.execucao-visual__pausar');
    assert.equal(await botãoPausa.isVisible(), true);
    await botãoPausa.click();
    assert.equal(await botãoPausa.getAttribute('aria-pressed'), 'true');
    assert.equal(await alvo.getAttribute('data-execucao-estado'), 'processando', 'pausar afeta somente a cena, não o processamento');
    assert.equal(await alvo.locator('.execucao-visual__palco').getAttribute('aria-busy'), 'true');
    await botãoPausa.click();
    assert.equal(await botãoPausa.getAttribute('aria-pressed'), 'false');

    await página.evaluate(async () => {
      const controle = window.__controleVisualTeste;
      const elemento = document.querySelector('#helper-visual-teste');
      controle.concluir('Resultado antigo');
      await new Promise(resolve => setTimeout(resolve, 250));
      controle.iniciar('Nova execução');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (elemento.dataset.execucaoEstado !== 'processando' || elemento.querySelector('.execucao-visual__palco').hidden) {
        throw new Error('timer terminal antigo alterou a execução nova');
      }
    });
    await página.emulateMedia({ reducedMotion: 'reduce' });
    await página.evaluate(() => window.__controleVisualTeste.iniciar('Movimento reduzido'));
    assert.equal(await botãoPausa.isHidden(), true, 'movimento reduzido esconde o controle de animação');
    await página.evaluate(() => {
      const alvo = document.querySelector('#helper-visual-teste');
      window.__controleVisualTeste.falhar('Falha real');
      const erro = { estado: alvo.dataset.execucaoEstado, valor: alvo.querySelector('[role=progressbar]').getAttribute('aria-valuenow') };
      window.__controleVisualTeste.cancelar('Cancelamento real');
      const cancelado = { estado: alvo.dataset.execucaoEstado, valor: alvo.querySelector('[role=progressbar]').getAttribute('aria-valuenow') };
      if (erro.estado !== 'erro' || erro.valor !== null) throw new Error('falha não pode anunciar 100%');
      if (cancelado.estado !== 'cancelado' || cancelado.valor !== null) throw new Error('cancelamento não pode anunciar 100%');
      window.__controleVisualTeste.destruir();
    });
  } finally { await contexto.close(); }
});
