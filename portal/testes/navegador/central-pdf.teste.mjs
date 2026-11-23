import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as esperar } from 'node:timers/promises';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';
import { biblioteca, pdfDeTeste } from '../auxiliares/pdf-de-teste.mjs';
import { lerZip, extrairEntrada } from '../../scripts/cálculos/zip.js';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const chromium = acharChromium();

async function portaLivre() {
  const reserva = createServer();
  await new Promise((resolve, reject) => reserva.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = reserva.address();
  await new Promise(resolve => reserva.close(resolve));
  return port;
}

test('visitante vê o bloqueio e assinante processa dois PDFs no servidor e baixa o pacote no celular', {
  skip: !chromium && 'Playwright precisa estar instalado',
  timeout: 90000,
}, async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'central-pdf-navegador-'));
  const portas = new Set();
  while (portas.size < 2) portas.add(await portaLivre());
  const [porta, portaApi] = portas;
  const base = 'http://127.0.0.1:' + porta;
  const url = base + '/f/central-pdf-em-lote/';
  const banco = join(pasta, 'portal.sqlite');
  const processos = [];
  let navegador;
  let logs = '';
  t.after(async () => {
    try {
      await navegador?.close();
    } finally {
      await Promise.all(processos.map(async filho => {
        if (filho.exitCode !== null || filho.signalCode !== null) return;
        const encerrou = new Promise(resolve => filho.once('exit', resolve));
        filho.kill();
        await encerrou;
      }));
      await rm(pasta, { recursive: true, force: true });
    }
  });
  const env = { ...process.env, PORTAL_API_PORTA: String(portaApi), PORTAL_BANCO: banco, URL_PUBLICA: base, NODE_ENV: 'development' };
  for (const args of [['servidor/iniciar.mjs'], ['ferramentas/servir.mjs', '.', '--porta', String(porta), '--loopback']]) {
    const filho = spawn(process.execPath, args, { cwd: raiz, env, stdio: ['ignore', 'pipe', 'pipe'] });
    processos.push(filho);
    for (const stream of [filho.stdout, filho.stderr]) stream.on('data', b => { logs = (logs + b).slice(-8000); });
  }
  let pronto = false;
  for (let i = 0; i < 100 && !pronto; i++) {
    assert.ok(processos.every(p => p.exitCode === null), logs);
    try { pronto = (await fetch(base + '/api/autenticacao/sessao')).ok; } catch { /* iniciando */ }
    if (!pronto) await esperar(100);
  }
  assert.ok(pronto, logs);

  navegador = await abrirNavegador(chromium);
  const contexto = await navegador.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
  await contexto.addCookies([{ name: 'visto_novidades', value: '999999999999999', url: base }]);
  const pagina = await contexto.newPage();
  await pagina.addLocatorHandler(pagina.locator('dialog.conquista[open]'), async dialogo => {
    await dialogo.getByRole('button', { name: 'Continuar', exact: true }).click();
  }, { noWaitAfter: true });
  const criar = '/api/central-pdf/trabalhos';
  const trabalhosCriados = [];
  pagina.on('request', req => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === criar) trabalhosCriados.push(req.url());
  });

  const resposta = await pagina.goto(url);
  assert.equal(resposta.status(), 200, 'A página gerada deve existir');
  await pagina.locator('.acesso-ferramenta[data-acesso="visitante"]').waitFor();
  assert.equal(await pagina.getByRole('button', { name: 'Execução bloqueada' }).isDisabled(), true);
  assert.equal(await pagina.locator('#ferramenta input[type=file]').count(), 0);
  assert.deepEqual(trabalhosCriados, []);
  await pagina.locator('[data-demonstracao]').waitFor();
  assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'exemplo e bloqueio cabem no celular');

  const csrf = (await contexto.cookies()).find(c => c.name === 'csrf').value;
  const conta = await contexto.request.post(base + '/api/autenticacao/criar-conta', {
    headers: { Origin: base, 'X-CSRF-Token': csrf },
    data: { nome: 'Teste Central PDF', email: 'central-pdf@example.com', usuario: 'central_pdf_teste', senha: 'Senha-real-forte-123!', idade: 30, aceitaTermos: true },
  });
  assert.equal(conta.status(), 201, await conta.text());
  const db = new DatabaseSync(banco);
  try {
    assert.equal(db.prepare("UPDATE usuarios SET plano='premium' WHERE usuario='central_pdf_teste'").run().changes, 1);
  } finally { db.close(); }

  await pagina.reload();
  const essencial = pagina.getByRole('button', { name: 'Só o essencial', exact: true });
  await pagina.addLocatorHandler(essencial, () => essencial.click());
  const ferramenta = pagina.locator('#ferramenta');
  const arquivos = await Promise.all([1, 2].map(async n => ({
    name: 'Documento ' + n + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdfDeTeste(n)),
  })));
  await ferramenta.locator('input[type=file]').setInputFiles(arquivos);
  await ferramenta.getByRole('button', { name: 'Processar lote', exact: true }).click();
  const baixar = pagina.getByRole('button', { name: 'Baixar pacote ZIP', exact: true });
  await baixar.waitFor({ timeout: 40000 });
  assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'resultado e downloads cabem no celular');
  assert.equal(trabalhosCriados.length, 1, 'um trabalho real para o lote inteiro');
  const [download] = await Promise.all([pagina.waitForEvent('download'), baixar.click()]);
  assert.equal(await download.failure(), null);
  assert.match(download.suggestedFilename(), /\.zip$/i);
  const bytes = await readFile(await download.path());
  const { entradas, avisos } = lerZip(bytes);
  assert.deepEqual(avisos, []);
  const extensoes = new Set(entradas.map(e => e.nome.split('.').at(-1)));
  for (const ext of ['pdf', 'xlsx', 'txt', 'csv', 'json']) assert.ok(extensoes.has(ext), 'pacote inclui ' + ext);
  const paginas = [];
  for (const entrada of entradas.filter(e => e.nome.endsWith('-otimizado.pdf'))) {
    const documento = await biblioteca.PDFDocument.load(await extrairEntrada(bytes, entrada));
    paginas.push(documento.getPageCount());
  }
  assert.deepEqual(paginas, [1, 2], 'os PDFs otimizados preservam as páginas das duas entradas');
  await pagina.getByRole('button', { name: 'Visualizar PDF' }).first().click();
  await pagina.locator('[data-pdf-estado="pronta"]').first().waitFor();
});
