/**
 * Teste de navegador de Ocultar informações do PDF: o desenho de verdade.
 *
 * O teste unitário prova a estrutura do arquivo com um desenho falso (o Node não tem canvas). Aqui a
 * página é desenhada pelo pdf.js no Chromium, a tarja é pintada, o PDF é gerado e baixado, e o arquivo
 * de saída é conferido de três jeitos: (1) o texto procurado não está em NENHUMA forma no arquivo
 * (cada fluxo descomprimido), (2) o pdf.js não acha letra nenhuma nas páginas ocultadas e (3) a tarja
 * é preta de verdade onde estava o texto, enquanto o que não foi ocultado continua visível.
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
import { inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PDFDocument, PDFRawStream, PDFString, StandardFonts, decodePDFRawStream,
} from '../../recursos/pdf-lib.esm.min.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4468;
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

/** Contrato de 3 páginas: o segredo nas páginas 1 e 2, um CPF válido em todas, título e autor nos metadados. */
async function pdfSecreto() {
  const documento = await PDFDocument.create();
  documento.setTitle('Documento de teste');
  documento.setAuthor('Autora Secreta');
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const página = documento.addPage([595.28, 841.89]);
    página.drawText(`Original ${i}`, { x: 50, y: 780, size: 18, font: fonte });
    página.drawText('Cliente: Maria Souza Santos', { x: 50, y: 740, size: 12, font: fonte });
    if (i !== 3) página.drawText('Codigo PALAVRA-SECRETA-123 do contrato', { x: 50, y: 700, size: 12, font: fonte });
    página.drawText('CPF 529.982.247-25 e CPF falso 123.456.789-00', { x: 50, y: 660, size: 12, font: fonte });
  }
  documento.getPage(1).node.addAnnot(documento.context.register(documento.context.obj({
    Type: 'Annot', Subtype: 'Text', Rect: [400, 700, 420, 720], Contents: PDFString.of('comentario PALAVRA-SECRETA-123'),
  })));
  return Buffer.from(await documento.save());
}

/** Todo o conteúdo do arquivo em formas pesquisáveis, em maiúsculas. */
async function conteúdoDoArquivo(bytes) {
  const partes = [Buffer.from(bytes).toString('latin1')];
  const documento = await PDFDocument.load(bytes, { updateMetadata: false });
  for (const [, objeto] of documento.context.enumerateIndirectObjects()) {
    if (objeto instanceof PDFRawStream) {
      let dados = objeto.contents;
      try { dados = decodePDFRawStream(objeto).decode(); } catch { try { dados = inflateSync(objeto.contents); } catch { /* imagem */ } }
      partes.push(Buffer.from(dados).toString('latin1'), String(objeto.dict));
    } else {
      partes.push(String(objeto));
    }
  }
  return partes.join('\n').toUpperCase();
}
const hex = (texto) => Buffer.from(texto, 'latin1').toString('hex').toUpperCase();

test('PROVA no navegador: a tarja é pintada, o texto some do arquivo e o resto da página continua visível', { skip: pular }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 1000, height: 900 }, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage();
  const erros = [];
  const externas = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  página.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  página.on('request', (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) externas.push(r.url()); });
  await página.goto(`${BASE}/f/ocultar-informacoes-do-pdf/`, { waitUntil: 'networkidle' });

  await página.setInputFiles('#campo-arquivo', { name: 'contrato.pdf', mimeType: 'application/pdf', buffer: await pdfSecreto() });
  await página.waitForSelector('[aria-label="Prévia da página do PDF com as tarjas"]', { state: 'visible' });
  await página.fill('#campo-termos', 'palavra-secreta-123');
  await página.check('#campo-tipo_cpf');
  await página.click('text=Procurar nos textos');
  await página.waitForSelector('[aria-label="Trechos achados"]:not([hidden])');
  // 2 termos + 3 CPFs válidos; o CPF fictício de dígitos errados não entra.
  const achados = await página.$$eval('[aria-label="Trechos achados"] label', (rótulos) => rótulos.map((l) => l.textContent));
  assert.equal(achados.length, 5);
  assert.ok(achados.every((a) => !a.includes('123.456.789-00')));

  // Desmarca o achado da página 3 (o CPF) para provar que o que não é marcado fica como está.
  await página.uncheck('#achado-4');
  await página.click('button[type=submit]');
  await página.waitForSelector('#resultado:not([hidden])', { timeout: 60_000 });
  const [download] = await Promise.all([página.waitForEvent('download'), página.click('[data-arquivo="0"]')]);
  const bytes = await readFile(await download.path());

  // (1) O segredo não está no arquivo em forma nenhuma; nem metadados nem comentário. (A página 3 foi copiada como estava e
  // segue com "Cliente" e o CPF: não entram na lista.)
  const tudo = await conteúdoDoArquivo(bytes);
  for (const rastro of ['PALAVRA-SECRETA-123', 'SECRETA', 'Autora Secreta', 'Documento de teste', 'comentario']) {
    assert.equal(tudo.includes(rastro.toUpperCase()) || tudo.includes(hex(rastro)), false, `o arquivo gerado não pode conter "${rastro}"`);
  }

  // (2) e (3) O pdf.js lê a saída: nenhum texto nas páginas 1 e 2; a página 3 (copiada) mantém o texto; a tarja é escura.
  const análise = await página.evaluate(async (dados) => {
    const pdfjs = await import('/recursos/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/recursos/pdfjs/pdf.worker.mjs';
    const documento = await pdfjs.getDocument({ data: new Uint8Array(dados), useWasm: false, disableFontFace: true, verbosity: 0 }).promise;
    const saída = [];
    for (let n = 1; n <= documento.numPages; n++) {
      const pg = await documento.getPage(n);
      const texto = (await pg.getTextContent()).items.map((i) => i.str).join(' ');
      const vista = pg.getViewport({ scale: 1 });
      const tela = document.createElement('canvas');
      tela.width = vista.width;
      tela.height = vista.height;
      const c = tela.getContext('2d', { willReadFrequently: true });
      await pg.render({ canvas: tela, canvasContext: c, viewport: vista, background: '#ffffff' }).promise;
      const escuros = (x, y, l, a) => {
        const d = c.getImageData(x, y, l, a).data;
        let k = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] < 60) k++;
        return k / (l * a);
      };
      // Linha do segredo: do topo, 841,89 − 700 ≈ 142 pt; a palavra começa a ~90 pt e tem ~110 pt de largura.
      saída.push({ n, texto, segredo: escuros(110, 137, 80, 10), original: escuros(50, 48, 80, 14) });
    }
    return saída;
  }, [...bytes]);

  assert.equal(análise.length, 3);
  assert.equal(análise[0].texto.trim(), '');
  assert.equal(análise[1].texto.trim(), '');
  assert.match(análise[2].texto, /Original 3/); // a página 3 não foi ocultada: continua com texto de verdade
  assert.ok(análise[0].segredo > 0.6 && análise[1].segredo > 0.6, `a tarja precisa ser escura onde estava o segredo: ${JSON.stringify(análise)}`);
  assert.ok(análise[0].original > 0.05, 'o que não foi coberto continua visível na imagem');
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  await contexto.close();
});
