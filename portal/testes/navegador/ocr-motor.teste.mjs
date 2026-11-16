import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
let chromium; try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch {}
const skip = chromium ? false : 'Playwright não encontrado';
let servidor, navegador, BASE;
before(async () => {
  if (!chromium) return;
  const porta = await new Promise(ok => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
  BASE = `http://127.0.0.1:${porta}`;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(porta), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  navegador = await chromium.launch().catch(() => chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }));
});
after(async () => { await navegador?.close(); servidor?.kill(); });

test('OCR local: reconhece três idiomas e o PDF exportado contém texto pesquisável', { skip, timeout: 90000 }, async () => {
  const page = await navegador.newPage();
  const erros = [], remotas = [];
  page.on('pageerror', erro => erros.push(erro.message));
  page.on('request', pedido => { if (!pedido.url().startsWith(BASE) && !pedido.url().startsWith('data:')) remotas.push(pedido.url()); });
  await page.goto(`${BASE}/404.html`);
  const resultados = await page.evaluate(async () => {
    const { criarLeitorOCR } = await import('/scripts/comum/ocr/motor.js');
    const { carregarPdfjs } = await import('/scripts/ferramentas/auxiliares/leitor-pdfjs.js');
    const resultados = [];
    for (const [idioma, frase] of [['por', 'Documento digitalizado com texto'], ['eng', 'Document with searchable text'], ['spa', 'Documento con texto reconocido']]) {
      const tela = document.createElement('canvas'); tela.width = 1800; tela.height = 600;
      const c = tela.getContext('2d'); c.fillStyle = 'white'; c.fillRect(0, 0, 1800, 600); c.fillStyle = 'black'; c.font = '54px Arial';
      c.fillText(frase, 80, 120); c.fillText('Flower 12345', 80, 240);
      const etapas = [], leitor = await criarLeitorOCR({ idioma, aoProgredir: e => etapas.push(e.etapa) });
      try {
        const r = await leitor.reconhecer(tela, { pdf: true });
        const pdfjs = await carregarPdfjs();
        const task = pdfjs.getDocument({ data: r.pdf.slice(), useWasm: false, disableFontFace: true, verbosity: 0 });
        try {
          const doc = await task.promise, pagina = await doc.getPage(1);
          const texto = (await pagina.getTextContent()).items.map(x => x.str).join(' ').replace(/\s+/gu, ' ');
          resultados.push({ idioma, texto: r.texto, confianca: r.confianca, pdfTexto: texto, paginas: doc.numPages, tamanho: r.pdf.byteLength, etapas: [...new Set(etapas)] });
        } finally { await task.destroy(); }
      } finally { await leitor.fechar(); tela.width = tela.height = 0; }
    }
    return resultados;
  });
  for (const r of resultados) {
    assert.match(r.texto, /Flower 12345/u, r.idioma); assert.match(r.pdfTexto, /Flower 12345/u, r.idioma);
    assert.ok(r.confianca > 60, `${r.idioma}: confiança ${r.confianca}`); assert.ok(r.tamanho > 1000); assert.equal(r.paginas, 1);
    assert.ok(r.etapas.includes('carregando')); assert.ok(r.etapas.includes('reconhecendo'));
  }
  assert.deepEqual(remotas, []); assert.deepEqual(erros, []); await page.close();
});

test('OCR local: cancelar o primeiro carregamento termina o Worker e libera nova operação', { skip, timeout: 45000 }, async () => {
  const page = await navegador.newPage();
  await page.goto(`${BASE}/404.html`);
  const resultado = await page.evaluate(async () => {
    const Original = window.Worker;
    let criados = 0, encerrados = 0;
    window.Worker = class extends Original { constructor(...args) { super(...args); criados++; } terminate() { encerrados++; return super.terminate(); } };
    const { criarLeitorOCR } = await import('/scripts/comum/ocr/motor.js');
    const controller = new AbortController();
    const inicio = performance.now();
    const promessa = criarLeitorOCR({ signal: controller.signal });
    setTimeout(() => controller.abort(), 30);
    let erro;
    try { await promessa; } catch (e) { erro = { nome: e.name, cancelado: e.cancelado }; }
    const tempo = performance.now() - inicio;
    const leitor = await criarLeitorOCR({ idioma: 'eng' });
    const tela = document.createElement('canvas'); tela.width = 1200; tela.height = 300;
    const c = tela.getContext('2d'); c.fillStyle = 'white'; c.fillRect(0, 0, 1200, 300); c.fillStyle = 'black'; c.font = '50px Arial'; c.fillText('Another document 98765', 50, 130);
    let texto;
    try { texto = (await leitor.reconhecer(tela)).texto; } finally { await leitor.fechar(); window.Worker = Original; }
    return { erro, tempo, texto, criados, encerrados };
  });
  assert.equal(resultado.erro?.nome, 'AbortError'); assert.equal(resultado.erro?.cancelado, true);
  assert.ok(resultado.tempo < 2500); assert.equal(resultado.criados, resultado.encerrados); assert.match(resultado.texto, /98765/u);
  await page.close();
});

test('OCR local: motor indisponível mostra erro amigável e permite tentar novamente', { skip, timeout: 20000 }, async () => {
  const page = await navegador.newPage(); await page.goto(`${BASE}/404.html`);
  await page.route('**/recursos/ocr/worker.min.js', r => r.abort());
  const r = await page.evaluate(async () => { const { criarLeitorOCR } = await import('/scripts/comum/ocr/motor.js'); try { await criarLeitorOCR(); return null; } catch (e) { return { codigo: e.codigo, mensagem: e.message }; } });
  assert.equal(r.codigo, 'motor'); assert.match(r.mensagem, /conexão/u); assert.doesNotMatch(r.mensagem, /TypeError|WebAssembly|fetch/u);
  await page.close();
});
