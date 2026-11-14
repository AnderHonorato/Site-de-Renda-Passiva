/**
 * E2E dos PDFs de recibo e orçamento: renderização de prévia e arquivo baixado.
 *
 * node --test testes/navegador/documentos.teste.mjs
 * Opcionais: PLAYWRIGHT_MODULO=/caminho/index.mjs e PLAYWRIGHT_EXECUTAVEL=/usr/bin/chromium.
 * Capturas de inspeção ficam em .execucao/documentos-e2e/.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { biblioteca } from '../auxiliares/pdf-de-teste.mjs';

const PORTAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPOSITÓRIO = join(PORTAL, '..');
const CAPTURAS = join(PORTAL, '.execucao', 'documentos-e2e');
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

function decodificarLiteralPdf(literal) {
  const bytes = [];
  for (let i = 0; i < literal.length; i++) {
    const código = literal.charCodeAt(i);
    if (código !== 0x5c) { bytes.push(código & 0xff); continue; }
    const próximo = literal[++i];
    if (próximo >= '0' && próximo <= '7') {
      let octal = próximo;
      for (let n = 0; n < 2 && literal[i + 1] >= '0' && literal[i + 1] <= '7'; n++) octal += literal[++i];
      bytes.push(parseInt(octal, 8));
    } else {
      const escapes = { n: 10, r: 13, t: 9, b: 8, f: 12 };
      bytes.push(escapes[próximo] ?? (próximo?.charCodeAt(0) ?? 0));
    }
  }
  return new TextDecoder('windows-1252').decode(Uint8Array.from(bytes));
}

/** Extrai a coluna Descrição pela coordenada X, para não confundir as células da mesma linha. */
function textosColunaPdf(bytes, xAlvo) {
  const fonte = new TextDecoder('latin1').decode(bytes);
  const x = Number(xAlvo);
  return [...fonte.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .flatMap(([, conteúdo]) => [...conteúdo.matchAll(/([-\d.]+)\s+([-\d.]+)\s+Td\s+\(((?:\\.|[^\\)])*)\)\s*Tj\s*ET/g)]
      .filter(([, posição]) => Math.abs(Number(posição) - x) <= 0.04)
      .map(([, , , literal]) => decodificarLiteralPdf(literal)))
    .join(' ');
}

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
  await mkdir(CAPTURAS, { recursive: true });
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
    try { pronto = (await fetch(`${base}/f/recibo/`)).ok; } catch { /* servidor iniciando */ }
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

async function abrirFerramenta(slug, largura = 390) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 844 }, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: base }]);
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', erro => erros.push(String(erro)));
  página.on('console', mensagem => { if (mensagem.type() === 'error') erros.push(mensagem.text()); });
  const resposta = await página.goto(`${base}/f/${slug}/`, { waitUntil: 'domcontentloaded' });
  assert.equal(resposta.status(), 200, `A página ${slug} precisa existir`);
  const essencial = página.getByRole('button', { name: 'Só o essencial', exact: true });
  if (await essencial.isVisible()) await essencial.click();
  await página.locator('#formulário').waitFor();
  return { contexto, página, erros };
}

async function esperarPrévia(página) {
  const wrapper = página.locator('#resultado section[data-pdf-previa]');
  await wrapper.waitFor({ state: 'visible', timeout: 20000 });
  await página.waitForFunction(() => {
    const prévia = document.querySelector('#resultado section[data-pdf-previa]');
    return prévia?.getAttribute('data-pdf-estado') === 'pronta'
      && prévia.querySelector('.pdf-previa__area > .pdf-previa__papel > canvas[role="img"]');
  }, null, { timeout: 20000 });
  assert.equal(await wrapper.getAttribute('role'), 'region');
  assert.equal(await wrapper.getAttribute('aria-label'), 'Prévia do documento PDF');
  return wrapper;
}

async function baixar(página, nomeBotão) {
  const downloadPronto = página.waitForEvent('download', { timeout: 20000 });
  await página.getByRole('button', { name: nomeBotão, exact: true }).click();
  const download = await downloadPronto;
  assert.equal(await download.failure(), null);
  const bytes = await readFile(await download.path());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  return { nome: download.suggestedFilename(), bytes };
}

async function inspecionarPdf(página, bytes) {
  const dados = [...bytes];
  const inspeção = await página.evaluate(async bytesDoArquivo => {
    const { abrirComPdfjsParaTexto } = await import('/scripts/ferramentas/auxiliares/pdfjs-textos.js');
    const { montarTextoDaPágina } = await import('/scripts/cálculos/extrair-texto-de-pdf.js');
    const documento = await abrirComPdfjsParaTexto(new Uint8Array(bytesDoArquivo));
    try {
      const páginas = [];
      for (let n = 1; n <= documento.páginas; n++) {
        páginas.push(montarTextoDaPágina((await documento.texto(n)).itens));
      }
      return { quantidade: documento.páginas, páginas };
    } finally { await documento.fechar(); }
  }, dados);
  const pdf = await biblioteca.PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), inspeção.quantidade, 'pdf-lib e pdf.js concordam no número de páginas');
  return { ...inspeção, pdf };
}

async function conferirPréviaIgualAoArquivo(página, wrapper, bytes) {
  // Renderiza os bytes baixados no mesmo tamanho e com o mesmo leitor usado pela prévia.
  // Isso comprova que o Canvas representa exatamente o documento entregue no download.
  const resultado = await página.evaluate(async ({ seletor, bytesDoArquivo }) => {
    const canvasPrévia = document.querySelector(`${seletor} > .pdf-previa__area > .pdf-previa__papel > canvas`);
    if (!canvasPrévia) throw new Error('canvas da prévia ausente');
    const { abrirComPdfjsParaTexto } = await import('/scripts/ferramentas/auxiliares/pdfjs-textos.js');
    const documento = await abrirComPdfjsParaTexto(new Uint8Array(bytesDoArquivo));
    try {
      const esperado = document.createElement('canvas');
      await documento.desenharNaTela(1, esperado, canvasPrévia.width);
      const a = canvasPrévia.getContext('2d').getImageData(0, 0, canvasPrévia.width, canvasPrévia.height).data;
      const b = esperado.getContext('2d').getImageData(0, 0, esperado.width, esperado.height).data;
      if (canvasPrévia.width !== esperado.width || canvasPrévia.height !== esperado.height) {
        return { mesmaDimensão: false, diferenças: Infinity, pixels: a.length / 4 };
      }
      let diferenças = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diferenças++;
      }
      return { mesmaDimensão: true, diferenças, pixels: a.length / 4 };
    } finally { await documento.fechar(); }
  }, { seletor: '#resultado [data-pdf-previa]', bytesDoArquivo: [...bytes] });
  assert.equal(resultado.mesmaDimensão, true, 'prévia e PDF baixado usam a mesma página e escala');
  assert.ok(resultado.diferenças <= Math.max(4, resultado.pixels * 0.0001), `prévia renderiza o mesmo PDF; divergências: ${resultado.diferenças}/${resultado.pixels}`);
}

async function conferirPáginasPreview(página, wrapper, quantidade) {
  const anterior = wrapper.getByRole('button', { name: 'Página anterior', exact: true });
  const próxima = wrapper.getByRole('button', { name: 'Próxima página', exact: true });
  const navegação = wrapper.locator('.pdf-previa__navegacao');
  const contador = navegação.locator('p');
  if (quantidade === 1) {
    assert.equal(await navegação.isVisible(), false, 'não há navegação visível para um PDF de uma página');
  } else {
    assert.equal(await navegação.isVisible(), true);
    assert.equal(await anterior.isDisabled(), true, 'a prévia inicia na primeira página');
    assert.equal(await próxima.isDisabled(), false);
    assert.equal((await contador.innerText()).trim(), `Página 1 de ${quantidade}`);
    const canvas = wrapper.locator('.pdf-previa__papel canvas');
    const primeira = await canvas.evaluate(no => no.toDataURL());
    await próxima.click();
    await página.waitForFunction(({ seletor, primeiraPagina }) =>
      document.querySelector(`${seletor} .pdf-previa__papel canvas`)?.toDataURL() !== primeiraPagina,
    { seletor: '#resultado section[data-pdf-previa]', primeiraPagina: primeira });
    assert.equal((await contador.innerText()).trim(), `Página 2 de ${quantidade}`);
    assert.equal(await anterior.isDisabled(), false);
    await anterior.click();
    await página.waitForFunction(({ seletor, primeiraPagina }) =>
      document.querySelector(`${seletor} .pdf-previa__papel canvas`)?.toDataURL() === primeiraPagina,
    { seletor: '#resultado section[data-pdf-previa]', primeiraPagina: primeira });
    assert.equal((await contador.innerText()).trim(), `Página 1 de ${quantidade}`);
  }
  const zoom = wrapper.getByRole('combobox', { name: 'Zoom da prévia' });
  assert.equal(await zoom.inputValue(), 'ajustar');
  const larguraAjustada = await wrapper.locator('.pdf-previa__papel canvas').evaluate(no => no.width);
  await zoom.selectOption('1.5');
  await página.waitForFunction(({ seletor, largura }) =>
    document.querySelector(seletor)?.dataset.pdfEstado === 'pronta'
      && document.querySelector(`${seletor} .pdf-previa__papel canvas`)?.width > largura,
  { seletor: '#resultado section[data-pdf-previa]', largura: larguraAjustada });
  assert.equal(await zoom.inputValue(), '1.5');
  assert.ok(await wrapper.locator('.pdf-previa__papel canvas').evaluate(no => no.width) > larguraAjustada, 'zoom 150% aumenta a resolução da prévia');
  await zoom.selectOption('ajustar');
  await página.waitForFunction(seletor => document.querySelector(seletor)?.dataset.pdfEstado === 'pronta', '#resultado section[data-pdf-previa]');
}

async function conferirLarguras(página, prefixo, larguras = [390, 1280]) {
  for (const largura of larguras) {
    await página.setViewportSize({ width: largura, height: 900 });
    await página.waitForFunction(() => document.querySelector('#resultado section[data-pdf-previa]')?.dataset.pdfEstado === 'pronta');
    const medida = await página.evaluate(() => ({ janela: innerWidth, documento: document.documentElement.scrollWidth }));
    assert.ok(medida.documento <= medida.janela + 1, `sem rolagem horizontal a ${largura}px: ${JSON.stringify(medida)}`);
    await página.locator('#resultado').screenshot({ path: join(CAPTURAS, `resultado-${prefixo}-${largura}.png`) });
  }
}

async function gerarResultado(página, rótulo) {
  await página.getByRole('button', { name: rótulo, exact: true }).click();
  await página.locator('#resultado').waitFor({ state: 'visible' });
  return esperarPrévia(página);
}

test('recibo em uma via e em duas vias gera PDF íntegro e prévia navegável', { skip: pular, timeout: 50000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('recibo');
  try {
    await página.locator('#campo-recebedor').fill('Ana Recebedora de Teste');
    await página.locator('#campo-pagador').fill('Bruno Pagador de Teste');
    await página.locator('#campo-valor').fill('1250,00');
    await página.locator('#campo-referência').fill('Manutenção elétrica do escritório');
    await página.locator('#campo-cidade').fill('São Paulo');
    await página.locator('#campo-data').fill('2026-11-13');

    let wrapper = await gerarResultado(página, 'Gerar recibo');
    let saída = await baixar(página, 'Baixar recibo em PDF');
    assert.match(saída.nome, /recibo-ana-recebedora-de-teste\.pdf$/i);
    let inspeção = await inspecionarPdf(página, saída.bytes);
    assert.equal(inspeção.quantidade, 1);
    const textoUmaVia = inspeção.páginas.join('\n').replace(/\s+/g, ' ');
    assert.match(textoUmaVia, /Ana Recebedora de Teste/);
    assert.match(textoUmaVia, /Bruno Pagador de Teste/);
    assert.match(textoUmaVia, /R\$ 1\.250,00/);
    await conferirPáginasPreview(página, wrapper, inspeção.quantidade);
    await conferirPréviaIgualAoArquivo(página, wrapper, saída.bytes);

    await página.locator('#campo-referência').fill('Revisão preventiva do quadro elétrico');
    await página.locator('#resultado').waitFor({ state: 'hidden' });
    assert.equal(await página.locator('#resultado [data-arquivo="0"]').isVisible(), false, 'editar campos invalida a prévia e esconde o download antigo');
    await página.locator('#campo-duasVias').check();
    wrapper = await gerarResultado(página, 'Gerar recibo');
    saída = await baixar(página, 'Baixar recibo em PDF');
    inspeção = await inspecionarPdf(página, saída.bytes);
    assert.equal(inspeção.quantidade, 1, 'as duas vias permanecem na mesma folha');
    const texto = inspeção.páginas.join('\n').replace(/\s+/g, ' ');
    assert.match(texto, /1ª via/);
    assert.match(texto, /2ª via/);
    assert.match(texto, /Ana Recebedora de Teste/);
    assert.match(texto, /Bruno Pagador de Teste/);
    assert.match(texto, /Revisão preventiva do quadro elétrico/);
    assert.doesNotMatch(texto, /Manutenção elétrica do escritório/);
    await conferirPáginasPreview(página, wrapper, inspeção.quantidade);
    await conferirPréviaIgualAoArquivo(página, wrapper, saída.bytes);
    await conferirLarguras(página, 'recibo');
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('recibo com logo inválido explica o erro e permite gerar sem o arquivo', { skip: pular, timeout: 50000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('recibo');
  try {
    await página.getByRole('button', { name: 'Preencher exemplo', exact: true }).click();
    let wrapper = await gerarResultado(página, 'Gerar recibo');
    await wrapper.waitFor({ state: 'visible' });
    assert.equal(await wrapper.getAttribute('data-pdf-estado'), 'pronta');
    assert.equal(await página.locator('#campo-recebedor').inputValue(), 'João da Silva');

    await página.getByText('Personalizar documento (opcional)', { exact: true }).click();
    const logo = página.locator('#campo-logoDocumento');
    await logo.setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('%PDF-1.4\nIsto é um PDF, não um PNG.'),
    });
    await página.locator('#resultado').waitFor({ state: 'hidden' });
    assert.equal(await página.locator('#resultado [data-arquivo="0"]').isVisible(), false, 'a prévia e o download anteriores somem ao trocar o arquivo');

    await página.getByRole('button', { name: 'Gerar recibo', exact: true }).click();
    const erro = página.locator('[data-campo="logoDocumento"] .campo__erro:not([hidden])');
    await erro.waitFor();
    assert.equal((await erro.innerText()).trim(), 'O logotipo precisa ser uma imagem PNG ou JPG válida.');
    assert.equal(await página.locator('.documento-personalizacao').evaluate(no => no.open), true, 'o grupo de personalização abre para revelar o erro');
    assert.equal(await página.locator('#campo-recebedor').inputValue(), 'João da Silva', 'os demais valores permanecem preenchidos');
    assert.equal(await página.locator('#resultado').isVisible(), false, 'não se oferece o PDF antigo depois da falha');
    assert.equal(await página.locator('#resultado [data-arquivo="0"]').isVisible(), false);

    await logo.setInputFiles([]);
    await página.getByRole('button', { name: 'Gerar recibo', exact: true }).click();
    await página.locator('#resultado').waitFor({ state: 'visible' });
    wrapper = await esperarPrévia(página);
    assert.equal(await wrapper.getAttribute('data-pdf-estado'), 'pronta', 'sem logo, o PDF opcional continua gerável');
    assert.equal(await página.locator('#campo-recebedor').inputValue(), 'João da Silva');
    assert.equal(await página.getByRole('button', { name: 'Baixar recibo em PDF', exact: true }).isVisible(), true);
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('orçamento de três itens incorpora PNG e cor escolhida na prévia e no PDF baixado', { skip: pular, timeout: 50000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('orcamento');
  try {
    await página.getByRole('button', { name: 'Preencher exemplo', exact: true }).click();
    assert.equal((await página.locator('#campo-itens').inputValue()).trim().split(/\r?\n/).length, 3, 'o botão de exemplo preenche os três itens reais');
    await página.locator('#campo-emissor').fill('Estúdio Azul de Teste');
    await página.locator('#campo-contato').fill('contato@azul.example');
    await página.locator('#campo-cliente').fill('Cliente de Teste');
    await página.locator('#campo-número').fill('314');
    await página.locator('#campo-itens').fill([
      'Projeto de identidade visual; 1; 1200,00',
      'Manual de aplicação da marca; 2; 450,00',
      'Acompanhamento de implantação; 3; 180,00',
    ].join('\n'));
    await página.locator('#campo-desconto').fill('5');
    await página.locator('#campo-validade').fill('14');
    await página.locator('#campo-condições').fill('Entrega digital em até cinco dias úteis.');
    await página.getByText('Personalizar documento (opcional)', { exact: true }).click();
    await página.locator('#campo-corDocumento').fill('#0055cc');
    const logo = await página.evaluate(async () => {
      const tela = document.createElement('canvas');
      tela.width = 96; tela.height = 32;
      const ctx = tela.getContext('2d');
      ctx.fillStyle = '#0055cc'; ctx.fillRect(0, 0, 96, 32);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('AZUL', 13, 22);
      const blob = await new Promise(resolve => tela.toBlob(resolve, 'image/png'));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    await página.locator('#campo-logoDocumento').setInputFiles({ name: 'logo-azul.png', mimeType: 'image/png', buffer: Buffer.from(logo) });

    const wrapper = await gerarResultado(página, 'Montar orçamento');
    const saída = await baixar(página, 'Baixar PDF');
    assert.match(saída.nome, /orcamento-314-cliente-de-teste\.pdf$/i);
    const inspeção = await inspecionarPdf(página, saída.bytes);
    const texto = inspeção.páginas.join('\n');
    for (const trecho of ['Estúdio Azul de Teste', 'Cliente de Teste', 'Projeto de identidade visual', 'Manual de aplicação da marca', 'Acompanhamento de implantação', 'R$ 2.508,00']) {
      assert.ok(texto.includes(trecho), `PDF inclui ${trecho}`);
    }
    assert.match(new TextDecoder('latin1').decode(saída.bytes), /(?:^|\s)0 0\.333 0\.8 (?:rg|RG)(?:\s|$)/m, 'PDF usa o azul escolhido no campo');
    const xobjects = inspeção.pdf.getPage(0).node.Resources()?.lookup(biblioteca.PDFName.of('XObject'));
    assert.ok(xobjects?.entries().length > 0, 'o PDF incorpora o logo PNG enviado');
    await conferirPáginasPreview(página, wrapper, inspeção.quantidade);
    await conferirPréviaIgualAoArquivo(página, wrapper, saída.bytes);
    await conferirLarguras(página, 'orcamento-3-itens');
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});

test('orçamento respeita o limite e preserva 40 descrições longas em todas as páginas', { skip: pular, timeout: 60000 }, async () => {
  const { contexto, página, erros } = await abrirFerramenta('orcamento');
  try {
    await página.locator('#campo-emissor').fill('Oficina de Testes');
    await página.locator('#campo-cliente').fill('Cliente com muitas linhas');
    await página.locator('#campo-número').fill('900');
    const descrições = Array.from({ length: 40 }, (_, índice) => {
      const código = String(índice + 1).padStart(2, '0');
      return `Serviço ${código} — revisão detalhada de equipamentos e acompanhamento técnico presencial`;
    });
    const alémDoLimite = [...descrições, 'Serviço 41 — item fora do limite permitido'];
    await página.locator('#campo-itens').fill(alémDoLimite.map((nome, i) => `${nome}; 1; 12,34`).join('\n'));
    await página.getByRole('button', { name: 'Montar orçamento', exact: true }).click();
    const erroDoLimite = página.locator('[data-campo="itens"] .campo__erro:not([hidden])');
    await erroDoLimite.waitFor();
    assert.equal((await erroDoLimite.innerText()).trim(), 'Limite de 40 itens por orçamento.');
    await página.locator('#campo-itens').fill(descrições.map((nome, i) => `${nome}; 1; 12,34`).join('\n'));
    const wrapper = await gerarResultado(página, 'Montar orçamento');
    const saída = await baixar(página, 'Baixar PDF');
    const inspeção = await inspecionarPdf(página, saída.bytes);
    await writeFile(join(CAPTURAS, 'orcamento-40-itens.pdf'), saída.bytes);
    await writeFile(join(CAPTURAS, 'orcamento-40-itens.txt'), inspeção.páginas.join('\n\n--- PÁGINA ---\n\n'));
    await writeFile(join(CAPTURAS, 'orcamento-40-itens.html'), await página.locator('#resultado').evaluate(no => no.outerHTML));
    await página.screenshot({ path: join(CAPTURAS, 'orcamento-40-itens-full.png'), fullPage: true });
    assert.ok(inspeção.quantidade > 1, '40 itens são paginados em mais de uma folha');
    const descriçõesNoPdf = textosColunaPdf(saída.bytes, 56.69).replace(/\s+/g, ' ');
    for (const descrição of descrições) assert.ok(descriçõesNoPdf.includes(descrição), `PDF não corta: ${descrição}`);
    await conferirPáginasPreview(página, wrapper, inspeção.quantidade);
    await conferirPréviaIgualAoArquivo(página, wrapper, saída.bytes);
    await conferirLarguras(página, 'orcamento-40-itens');
    assert.deepEqual(erros, []);
  } finally { await contexto.close(); }
});
