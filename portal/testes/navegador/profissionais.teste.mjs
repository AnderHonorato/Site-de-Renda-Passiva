/**
 * Integração real: navegador → proxy do portal → API Node → motor privado.
 * Nenhuma rota de análise é interceptada. Conta e CSRF usam o request do próprio
 * BrowserContext; somente o plano da conta fictícia é promovido no SQLite temporário.
 *
 * node --test testes/navegador/profissionais.teste.mjs
 * Opcionais: PLAYWRIGHT_MODULO=/caminho/index.mjs e PLAYWRIGHT_EXECUTAVEL=/usr/bin/chromium.
 * Os relatórios e capturas ficam em .execucao/profissionais-e2e/ (ignorado pelo Git).
 */
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { createServer as criarServidorHttp } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, isAbsolute, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { especificacoes } from '../../dados/profissionais.js';
import { lerCsv } from '../../scripts/cálculos/tabular.js';
import { compactarZip } from '../../scripts/comum/exportação/compactar-zip.js';
import * as xlsx from '../../recursos/bibliotecas/xlsx-0.20.3.mjs';
import { biblioteca } from '../auxiliares/pdf-de-teste.mjs';
import { montarPágina } from '../../ferramentas/modelo-de-página.mjs';
import { ferramentasProntas } from '../../dados/catálogo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARTEFATOS = join(RAIZ, '.execucao', 'profissionais-e2e');
const specs = Object.fromEntries(['F252', 'F269', 'F277', 'F303', 'F330', 'F334', 'F336'].map(id => [id, especificacoes.find(s => s.id === id)]));
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
const legivel = v => v === null ? '—' : typeof v === 'number' ? numero.format(v) : String(v);
const tabelaTexto = tabela => tabela.map(l => l.map(v => v === null ? '' : String(v)));
const cadeia = [['tarefa', 'duracao', 'predecessoras'], ...Array.from({ length: 31 }, (_, i) => [`T${String(i + 1).padStart(2, '0')}`, 1, i ? `T${String(i).padStart(2, '0')}` : ''])];
const csvCadeia = cadeia.map(l => l.join(';')).join('\n');
const pares = [['x', 'y'], [1, 2], [2, 4], [3, 5], [4, 4], [5, 5]];
const clausula = 'O fornecedor deve guardar os registros por noventa dias após o encerramento.';
const textoClausulas = `${clausula}\n\n${clausula}\n\nO sistema reinicia após manutenção.`;

let chromium;
if (process.env.PLAYWRIGHT_MODULO) {
  const modulo = process.env.PLAYWRIGHT_MODULO;
  chromium = (await import(isAbsolute(modulo) ? pathToFileURL(modulo).href : modulo)).chromium;
} else {
  for (const nome of ['playwright', 'playwright-core']) {
    try { chromium = createRequire(import.meta.url)(nome).chromium; break; } catch { /* tenta o próximo pacote instalado */ }
  }
}
const pular = chromium ? false : 'Playwright não instalado; instale playwright ou defina PLAYWRIGHT_MODULO para executar a integração real.';
let servidor, navegador, banco, pasta, base;
let logs = '';
const filhos = [];

async function portaLivre() {
  const reserva = createServer();
  await new Promise((resolve, reject) => { reserva.once('error', reject); reserva.listen(0, '127.0.0.1', resolve); });
  const porta = reserva.address().port;
  await new Promise(resolve => reserva.close(resolve));
  return porta;
}

before(async () => {
  if (!chromium) return;
  await mkdir(ARTEFATOS, { recursive: true });
  const candidatos = [process.env.PLAYWRIGHT_EXECUTAVEL,
    ...String(process.env.PATH || '').split(delimiter).flatMap(p => ['chromium', 'chromium-browser', 'google-chrome'].map(n => join(p, n)))];
  const executavel = candidatos.find(p => p && existsSync(p));
  navegador = await chromium.launch({ headless: true, ...(executavel ? { executablePath: executavel } : {}) });
});

// Cada cenário tem API/banco próprios: usuários diferentes não compartilham a cota da mesma rede de testes.
beforeEach(async () => {
  if (!chromium) return;
  logs = '';
  filhos.length = 0;
  pasta = await mkdtemp(join(tmpdir(), 'portal-profissionais-e2e-'));
  const porta = await portaLivre();
  let portaApi = await portaLivre();
  while (portaApi === porta) portaApi = await portaLivre();
  base = `http://127.0.0.1:${porta}`;
  servidor = spawn(process.execPath, ['ferramentas/desenvolver.mjs', '--porta', String(porta)], {
    cwd: RAIZ,
    env: { ...process.env, PORTAL_BANCO: join(pasta, 'teste.sqlite'), PORTAL_API_PORTA: String(portaApi), URL_PUBLICA: base },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  servidor.on('message', m => { if (m?.tipo === 'processos-portal') filhos.push(m.apiPid, m.sitePid); });
  for (const fluxo of [servidor.stdout, servidor.stderr]) fluxo.on('data', b => { logs = (logs + b).slice(-32000); });
  let pronto = false;
  for (let i = 0; i < 150; i++) {
    if (servidor.exitCode !== null) throw new Error(`Servidor encerrou durante a inicialização:\n${logs}`);
    try { pronto = (await fetch(`${base}/api/autenticacao/sessao`)).ok; } catch { /* API iniciando */ }
    if (pronto) break;
    await esperar(100);
  }
  assert.ok(pronto, `Servidor/API não ficaram prontos:\n${logs}`);
  banco = new DatabaseSync(join(pasta, 'teste.sqlite'));
});

afterEach(async t => {
  banco?.close();
  if (servidor && servidor.exitCode === null) {
    const acabou = new Promise(resolve => servidor.once('exit', resolve));
    if (servidor.connected) servidor.send({ tipo: 'encerrar' });
    else servidor.kill();
    await Promise.race([acabou, esperar(4000)]);
    if (servidor.exitCode === null) servidor.kill('SIGKILL');
  }
  // Apenas PIDs reportados pelo nosso desenvolver.mjs; nunca encerra um portal já aberto.
  for (const pid of filhos) { try { process.kill(pid, 'SIGTERM'); } catch { /* filho já encerrado */ } }
  if (pasta) await rm(pasta, { recursive: true, force: true });
  if (servidor) await writeFile(join(ARTEFATOS, `servidor-${t.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 100)}.log`), logs);
});
after(async () => { await navegador?.close(); });

async function post(contexto, caminho, dados) {
  const csrf = (await contexto.cookies(base)).find(c => c.name === 'csrf')?.value;
  assert.ok(csrf, 'CSRF veio da API real e está no mesmo cookie jar da página');
  return contexto.request.post(base + caminho, { data: dados, headers: { Origin: base, 'X-CSRF-Token': csrf } });
}

async function novaConta(contexto, indice) {
  assert.equal((await contexto.request.get(`${base}/api/autenticacao/sessao`)).status(), 200);
  const usuario = `prof_e2e_${indice}`;
  const r = await post(contexto, '/api/autenticacao/criar-conta', { nome: 'Teste profissional', email: `${usuario}@example.com`, usuario, senha: 'Senha-real-forte-123!', idade: 30, aceitaTermos: true });
  assert.equal(r.status(), 201, await r.text());
  assert.ok((await contexto.cookies(base)).some(c => c.name === 'sessao' && c.httpOnly));
  return usuario;
}

async function abrir(pagina, spec) {
  const r = await pagina.goto(`${base}/f/${spec.slug}/`, { waitUntil: 'networkidle' });
  assert.equal(r.status(), 200, `Página gerada de ${spec.id} precisa existir`);
  // Escolha real no painel, sem retirar overlays nem forçar cliques.
  const essencial = pagina.getByRole('button', { name: 'Só o essencial', exact: true });
  if (await essencial.isVisible()) await essencial.click();
  await pagina.locator('.profissional__formulario').waitFor();
}

async function importar(pagina, nome, buffer, mimeType = 'application/octet-stream') {
  await pagina.locator('.profissional__importacao input[type=file]').setInputFiles({ name: nome, mimeType, buffer: Buffer.from(buffer) });
  await pagina.waitForFunction(() => !document.querySelector('.profissional__entrada textarea').disabled);
  const erro = pagina.locator('.profissional__erro');
  assert.equal(await erro.isVisible(), false, await erro.textContent());
  assert.match(await pagina.locator('.profissional__importacao [role=status]').innerText(), /importado/);
}

async function executar(pagina, spec) {
  const [r] = await Promise.all([
    pagina.waitForResponse(r => r.url() === `${base}/api/profissionais/${spec.slug}` && r.request().method() === 'POST'),
    pagina.getByRole('button', { name: 'Executar análise', exact: true }).click(),
  ]);
  assert.equal(r.status(), 200, `${spec.id}: ${await r.text()}`);
  const { relatorio } = await r.json();
  await pagina.locator('.profissional__resultado:visible').waitFor();
  assert.equal(await pagina.locator('.profissional__resultado h2').innerText(), spec.nome);
  assert.deepEqual(await pagina.locator('.profissional__indicador').evaluateAll(nos => nos.map(n => [n.querySelector('dt').textContent, n.querySelector('dd').textContent])), relatorio.indicadores.map(([k, v]) => [k, legivel(v)]));
  const detalhes = pagina.locator('.profissional__resultado details');
  await detalhes.locator('summary').click();
  const notas = await detalhes.innerText();
  for (const t of [relatorio.metodo, spec.limites, ...relatorio.notas]) assert.ok(notas.includes(t), `Método/premissa visível: ${t}`);
  assert.deepEqual(await pagina.locator('.profissional__resultado tbody tr').evaluateAll(nos => nos.map(n => [...n.cells].map(c => c.textContent))), relatorio.linhas.slice(0, 25).map(l => l.map(legivel)));
  return relatorio;
}

async function baixar(pagina, rotulo, slug, extensao) {
  const workers = [];
  const observar = worker => workers.push(worker.url());
  pagina.on('worker', observar);
  try {
    const [download] = await Promise.all([pagina.waitForEvent('download', { timeout: 35000 }), pagina.locator('.profissional__exportacoes').getByRole('button', { name: rotulo, exact: true }).click()]);
    assert.equal(download.suggestedFilename(), `${slug}.${extensao}`);
    assert.equal(await download.failure(), null);
    const bytes = await readFile(await download.path());
    assert.ok(bytes.length > 0);
    assert.ok(workers.some(u => u.endsWith('/profissionais/exportar-trabalhador.js')), `${rotulo} foi gerado por Worker real`);
    await writeFile(join(ARTEFATOS, download.suggestedFilename()), bytes);
    return bytes;
  } finally { pagina.off('worker', observar); }
}

async function verificarExportacoes(pagina, spec, r) {
  // A busca está ativa e somente uma linha aparece; os arquivos precisam conter 31.
  await pagina.getByRole('searchbox', { name: 'Buscar no relatório' }).fill('T31');
  assert.equal(await pagina.locator('.profissional__resultado tbody tr').count(), 1);
  const json = await baixar(pagina, 'JSON', spec.slug, 'json');
  assert.deepEqual(JSON.parse(json.toString()), r, 'JSON preserva o relatório integral tipado, indicadores e premissas');
  const csv = await baixar(pagina, 'CSV', spec.slug, 'csv');
  const dados = tabelaTexto([r.colunas, ...r.linhas]);
  assert.deepEqual(lerCsv(csv.toString().replace(/^\uFEFF/, ''), { separador: ';' }), dados);
  const excel = await baixar(pagina, 'Excel', spec.slug, 'xlsx');
  assert.equal(excel.subarray(0, 2).toString(), 'PK');
  const livro = xlsx.read(excel, { type: 'buffer', cellFormula: true });
  assert.deepEqual(livro.SheetNames, ['Dados', 'Indicadores', 'Método']);
  const aba = nome => xlsx.utils.sheet_to_json(livro.Sheets[nome], { header: 1, defval: null });
  assert.deepEqual(aba('Dados'), [r.colunas, ...r.linhas]);
  assert.deepEqual(aba('Indicadores'), [['Indicador', 'Valor'], ...r.indicadores]);
  const metodo = aba('Método').slice(1);
  const reconstruir = (secao, item) => metodo.filter(l => l[0] === secao && l[1] === item).sort((a, b) => a[2] - b[2]).map(l => l[3]).join('');
  assert.equal(reconstruir('Relatório', 1), r.titulo);
  assert.equal(reconstruir('Método', 1), r.metodo);
  r.notas.forEach((nota, i) => assert.equal(reconstruir('Premissa', i + 1), nota));
  const txt = (await baixar(pagina, 'TXT', spec.slug, 'txt')).toString();
  for (const t of [r.titulo, r.metodo, ...r.notas, ...r.indicadores.map(([k, v]) => `${k}: ${v}`)]) assert.ok(txt.includes(t), `TXT preserva ${t}`);
  const csvNoTxt = txt.split('DADOS (CSV; textos que poderiam virar fórmulas são protegidos por apóstrofo)\n')[1].split('\n\nMÉTODO\n')[0];
  assert.deepEqual(lerCsv(csvNoTxt, { separador: ';' }), dados);
  const pdf = await baixar(pagina, 'PDF', spec.slug, 'pdf');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  // O leitor real do portal roda no browser, com o worker pdf.js e a CSP reais.
  const extraido = await pagina.evaluate(async bytes => {
    const { abrirComPdfjsParaTexto } = await import('/scripts/ferramentas/auxiliares/pdfjs-textos.js');
    const { montarTextoDaPágina } = await import('/scripts/cálculos/extrair-texto-de-pdf.js');
    const d = await abrirComPdfjsParaTexto(new Uint8Array(bytes));
    try { const textos = []; for (let n = 1; n <= d.páginas; n++) textos.push(montarTextoDaPágina((await d.texto(n)).itens)); return { paginas: d.páginas, texto: textos.join('\n') }; }
    finally { await d.fechar(); }
  }, [...pdf]);
  assert.ok(extraido.paginas > 1, 'PDF integral ultrapassa uma página');
  const normalizar = t => t.replace(/\s+/g, ' ').trim();
  for (const t of [r.titulo, r.metodo, ...r.notas, ...r.indicadores.map(([k]) => k), ...r.linhas.map(l => l[0])]) assert.ok(normalizar(extraido.texto).includes(normalizar(t)), `PDF preserva ${t}`);
  // Roundtrip real de todos os formatos tabulares baixados para a entrada editável.
  for (const [nome, bytes] of [['relatorio.json', json], ['relatorio.csv', csv], ['relatorio.xlsx', excel]]) {
    await importar(pagina, nome, bytes);
    assert.deepEqual(lerCsv(await pagina.locator('.profissional__entrada textarea').inputValue(), { separador: ';' }), dados);
    assert.equal(await pagina.locator('.profissional__resultado').isVisible(), false);
  }
}

function xlsxDe(tabela) {
  const livro = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(livro, xlsx.utils.aoa_to_sheet(tabela), 'Entrada');
  return xlsx.write(livro, { type: 'buffer', bookType: 'xlsx' });
}
function docxDe(texto) {
  const xml = texto.split('\n\n').map(p => `<w:p><w:r><w:t>${p.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</w:t></w:r></w:p>`).join('');
  return compactarZip([{ nome: '[Content_Types].xml', conteúdo: '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' }, { nome: 'word/document.xml', conteúdo: `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${xml}</w:body></w:document>` }]);
}

let indice = 0;
test('barra inferior aparece na abertura, antes de baixar o conteúdo e sem rolagem ou JavaScript', { skip: pular, timeout: 30000 }, async () => {
  const html = montarPágina({
    título: 'Abertura móvel', descrição: 'Teste da navegação inicial', atual: 'início',
    base: `${base}/`, raiz: `${base}/`,
    conteúdo: '<section style="min-height:3000px">Conteúdo ainda em transferência</section>',
  });
  const corte = html.indexOf('<main id="conteúdo">');
  let liberar;
  const restante = new Promise(resolve => { liberar = resolve; });
  const lento = criarServidorHttp(async (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.write(html.slice(0, corte));
    await restante;
    res.end(html.slice(corte));
  });
  await new Promise(resolve => lento.listen(0, '127.0.0.1', resolve));
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(`http://127.0.0.1:${lento.address().port}/`, { waitUntil: 'commit' });
    await pagina.locator('.topo').waitFor({ state: 'visible' });
    await pagina.locator('.barra-inferior').waitFor({ state: 'visible', timeout: 3000 });
    const conferir = async () => {
      const visivel = await pagina.locator('.barra-inferior').evaluate(nav => {
        const r = nav.getBoundingClientRect();
        return { topo: r.top, fundo: r.bottom, altura: innerHeight, alvos: [...nav.querySelectorAll('a')].every(a => {
          const b = a.getBoundingClientRect();
          return a.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
        }) };
      });
      assert.ok(visivel.topo >= 0 && Math.abs(visivel.fundo - visivel.altura) <= 1, JSON.stringify(visivel));
      assert.equal(visivel.alvos, true, 'os quatro menus ficam visíveis e recebem toque');
    };
    assert.equal(await pagina.evaluate(() => scrollY), 0);
    assert.equal(await pagina.locator('main').count(), 0, 'o restante do documento ainda não chegou');
    await conferir();
    await pagina.screenshot({ path: join(ARTEFATOS, 'barra-abertura-lenta.png') });
    liberar();
    await pagina.waitForLoadState('load');
    for (const altura of [650, 844]) {
      await pagina.setViewportSize({ width: 390, height: altura });
      await conferir();
      await pagina.evaluate(() => window.scrollTo(0, 500));
      assert.ok(await pagina.evaluate(() => scrollY > 0), 'a página realmente rolou');
      await conferir();
      await pagina.evaluate(() => window.scrollTo(0, 0));
    }
    await pagina.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await pagina.locator('.barra-inferior').isVisible(), false, 'desktop mantém a navegação do topo');
  } finally {
    liberar();
    await contexto.close();
    await new Promise(resolve => lento.close(resolve));
  }
});

test('Início volta à capa em português, inglês e páginas internas; animação mostra a contagem completa', { skip: pular, timeout: 60000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await contexto.addCookies([{ name: 'visto_novidades', value: '999999999999999', url: base }]);
  const pagina = await contexto.newPage();
  try {
    for (const [origem, destino] of [['ferramentas.html', '/'], ['en/ferramentas.html', '/en/'], [`f/${specs.F277.slug}/`, '/']]) {
      await pagina.goto(`${base}/${origem}`, { waitUntil: 'networkidle' });
      const essencial = pagina.getByRole('button', { name: 'Só o essencial', exact: true });
      if (await essencial.isVisible()) await essencial.click();
      await Promise.all([
        pagina.waitForURL(base + destino),
        pagina.locator('.barra-inferior a').first().click(),
      ]);
      assert.equal(new URL(pagina.url()).pathname, destino);
    }
    await pagina.waitForLoadState('networkidle');
    await pagina.locator('#busca').fill('regressao');
    await pagina.locator('#sugestões .insígnia-plano--premium').first().waitFor();
    await pagina.locator('#ir-para-busca').click();
    await pagina.locator('#busca-topo-campo').fill('regressao');
    await pagina.locator('#busca-topo-sugestões .insígnia-plano--premium').first().waitFor();
    for (const formato of ['paisagem', 'retrato']) {
      await pagina.goto(`${base}/vitrine/vitrine.html?formato=${formato}&render=${formato === 'retrato' ? '1080x1920' : '1920x1080'}`, { waitUntil: 'networkidle' });
      await pagina.waitForFunction(() => window.vitrineRender);
      await pagina.evaluate(async () => { await window.vitrineRender.pronto; window.vitrineRender.quadro(1.98); });
      assert.match(await pagina.locator('canvas').getAttribute('aria-label'), new RegExp(`${ferramentasProntas.length} ferramentas prontas`));
      await pagina.locator('canvas').screenshot({ path: join(ARTEFATOS, `contador-${formato}.png`) });
    }
  } finally { await contexto.close(); }
});

test('plano aparece antes de abrir e ferramentas pagas não carregam nem executam sem acesso', { skip: pular, timeout: 120000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await contexto.addCookies([{ name: 'visto_novidades', value: '999999999999999', url: base }]);
  const pagina = await contexto.newPage();
  const modulos = [], analises = [];
  pagina.on('request', r => {
    const caminho = new URL(r.url()).pathname;
    if (caminho.startsWith('/scripts/ferramentas/')) modulos.push(caminho);
    if (r.method() === 'POST' && caminho.startsWith('/api/profissionais/')) analises.push(caminho);
  });
  const protegido = async (spec, estado) => {
    await pagina.goto(`${base}/f/${spec.slug}/`, { waitUntil: 'networkidle' });
    const essencial = pagina.getByRole('button', { name: 'Só o essencial', exact: true });
    if (await essencial.isVisible()) await essencial.click();
    await pagina.locator(`.acesso-ferramenta[data-acesso="${estado}"]`).waitFor();
    assert.match(await pagina.locator('.ferramenta-topo .insígnia-plano').innerText(), spec.plano === 'premium' ? /Premium/ : /Plus/);
    assert.equal(await pagina.locator('#ferramenta form').count(), 0);
    assert.equal(await pagina.locator('#ferramenta input[type=file]').count(), 0);
    assert.equal(await pagina.getByRole('button', { name: 'Execução bloqueada', exact: true }).isDisabled(), true);
    assert.equal(modulos.includes(`/scripts/ferramentas/${spec.slug}.js`), false, 'código pago não foi carregado antes de confirmar o plano');
    await pagina.locator('#ferramenta').dispatchEvent('submit');
  };
  try {
    await pagina.goto(`${base}/ferramentas.html`, { waitUntil: 'networkidle' });
    for (const [spec, plano] of [[specs.F277, 'Premium'], [specs.F303, 'Plus']]) {
      const card = pagina.locator(`.ferramenta-linha[data-slug="${spec.slug}"]`);
      assert.equal(await card.locator('.insígnia-plano').innerText(), plano);
    }
    await protegido(specs.F277, 'visitante');
    const entrar = pagina.locator('.acesso-ferramenta').getByRole('link', { name: 'Entrar na conta', exact: true });
    assert.equal(new URL(await entrar.getAttribute('href'), pagina.url()).searchParams.get('volta'), `/f/${specs.F277.slug}/`);
    const usuario = await novaConta(contexto, 'bloqueio');
    await protegido(specs.F277, 'plano');
    await protegido(specs.F303, 'plano');
    assert.deepEqual(analises, [], 'visitante e plano gratuito não enviaram análise');
    banco.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run('plus', usuario);
    await protegido(specs.F277, 'plano');
    await abrir(pagina, specs.F303);
    await pagina.getByRole('button', { name: 'Usar exemplo', exact: true }).click();
    assert.equal(await pagina.locator('#ferramenta').evaluate(n => n.inert), false, 'formulário autorizado está interativo');
    assert.ok(await pagina.locator('.profissional__entrada textarea').inputValue());
    await executar(pagina, specs.F303);
    assert.equal(analises.length, 1, 'Plus executa sua análise autorizada');

    banco.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run('gratuito', usuario);
    await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
    await pagina.locator('.acesso-ferramenta[data-acesso="plano"]').waitFor();
    assert.equal(await pagina.locator('.profissional__formulario, .profissional__resultado').count(), 0, 'revogação remove controles e resultado');
    assert.equal(analises.length, 1);

    banco.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run('premium', usuario);
    await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
    await pagina.locator('.profissional__formulario').waitFor();
    await abrir(pagina, specs.F277);
    const falharSessao = rota => rota.abort('internetdisconnected');
    await pagina.route('**/api/autenticacao/sessao', falharSessao);
    await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
    await pagina.locator('.acesso-ferramenta[data-acesso="indisponivel"]').waitFor();
    assert.equal(await pagina.locator('#ferramenta form').count(), 0, 'falha de sessão não mantém o formulário liberado');
    await pagina.unroute('**/api/autenticacao/sessao', falharSessao);
    await pagina.locator('.acesso-ferramenta').getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await pagina.locator('.profissional__formulario').waitFor();
    banco.prepare('DELETE FROM sessoes WHERE usuario_id=(SELECT id FROM usuarios WHERE usuario=?)').run(usuario);
    await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
    await pagina.locator('.acesso-ferramenta[data-acesso="visitante"]').waitFor();
    assert.equal(await pagina.locator('#ferramenta form').count(), 0, 'sessão expirada volta a bloquear');
    assert.equal(analises.length, 1, 'nenhuma análise foi enviada nos estados bloqueados');

    await pagina.goto(`${base}/f/imc/`, { waitUntil: 'networkidle' });
    assert.equal(await pagina.locator('.acesso-ferramenta').count(), 0, 'ferramenta gratuita continua aberta');
    assert.ok(await pagina.locator('#ferramenta form').count() > 0);
  } catch (falha) {
    await pagina.screenshot({ path: join(ARTEFATOS, 'falha-bloqueio.png'), fullPage: true }).catch(() => {});
    await writeFile(join(ARTEFATOS, 'falha-bloqueio.html'), await pagina.content());
    throw falha;
  } finally { await contexto.close(); }
});

test('demonstrações animadas abrem no card e na ferramenta, com pausa, cenas e acesso protegido', { skip:pular, timeout:120000 }, async () => {
  await mkdir(join(ARTEFATOS,'demonstracoes'),{recursive:true});
  const contexto=await navegador.newContext({viewport:{width:390,height:900}});
  await contexto.addCookies([{name:'visto_novidades',value:'999999999999999',url:base}]);
  const pagina=await contexto.newPage();
  const analises=[],privados=[],erros=[];
  pagina.on('request',r=>{const u=new URL(r.url());if(r.method()==='POST'&&u.pathname.startsWith('/api/'))analises.push(u.pathname);if(u.pathname.includes('/servidor/'))privados.push(u.pathname);});
  pagina.on('pageerror',e=>erros.push(String(e)));
  try {
    await pagina.goto(`${base}/ferramentas.html?busca=regressao`,{waitUntil:'networkidle'});
    const essencial=pagina.getByRole('button',{name:'Só o essencial',exact:true});if(await essencial.isVisible())await essencial.click();
    const url=pagina.url();
    const gatilho=pagina.locator(`.ferramenta-linha[data-slug="${specs.F277.slug}"] [data-demonstracao-slug]`);
    await gatilho.click();
    const dialogo=pagina.locator('dialog.demonstracao-modal');
    await dialogo.locator('[data-demonstracao][data-pronta="sim"]').waitFor();
    assert.equal(pagina.url(),url,'ver o exemplo não sai do catálogo');
    const amostra=JSON.parse(await dialogo.locator('template[data-demonstracao-dados]').evaluate(n=>n.content.textContent));
    assert.equal(amostra.slug,specs.F277.slug);
    const quadros=[];
    for(const cena of ['1.8','6','12']){
      await dialogo.locator(`[data-demo-cena="${cena}"]`).click();
      assert.equal(await dialogo.locator(`[data-demo-cena="${cena}"]`).getAttribute('aria-pressed'),'true');
      quadros.push(await dialogo.locator('canvas').evaluate(c=>c.toDataURL()));
      await dialogo.locator('canvas').screenshot({path:join(ARTEFATOS,'demonstracoes',`regressao-390-${cena}.png`)});
    }
    assert.equal(new Set(quadros).size,3,'entrada, análise e resultado desenham cenas diferentes');
    const posicao=dialogo.locator('input[type=range]');
    const pausado=await posicao.inputValue();await esperar(150);assert.equal(await posicao.inputValue(),pausado,'selecionar cena pausa a reprodução');
    await posicao.focus();await posicao.press('End');
    assert.equal(await posicao.inputValue(),'15','o fim da barra mantém o resultado, sem voltar à entrada');
    assert.equal(await dialogo.locator('[data-demo-cena="12"]').getAttribute('aria-pressed'),'true');
    await posicao.press('Home');assert.equal(await posicao.inputValue(),'0','a barra funciona também por teclado');
    await dialogo.locator('[data-demo-repetir]').click();
    assert.ok(Number(await posicao.inputValue())<1,'repetir volta ao início');
    await dialogo.locator('[data-demo-tocar]').click();
    const detalhes=dialogo.locator('.demonstracao__dados');await detalhes.locator('summary').click();
    assert.deepEqual(await detalhes.locator('.demonstracao__indicadores>div').evaluateAll(ns=>ns.map(n=>[n.querySelector('dt').textContent,n.querySelector('dd').textContent])),amostra.indicadores.map(([k,v])=>[k,legivel(v)]));
    await pagina.keyboard.press('Escape');await dialogo.waitFor({state:'detached'});
    assert.equal(await gatilho.evaluate(n=>n===document.activeElement),true,'fechar retorna o foco ao card');

    for(const largura of [320,768,1280]){
      await pagina.setViewportSize({width:largura,height:900});
      await pagina.goto(`${base}/f/${specs.F252.slug}/`,{waitUntil:'networkidle'});
      const demo=pagina.locator('[data-demonstracao][data-pronta="sim"]');await demo.waitFor();
      await demo.locator('[data-demo-cena="12"]').click();
      assert.equal(await pagina.locator('#ferramenta form').count(),0);
      assert.equal(await pagina.getByRole('button',{name:'Execução bloqueada',exact:true}).isDisabled(),true);
      assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await demo.locator('canvas').evaluate(n=>n.scrollIntoView({block:'center'}));
      await demo.locator('canvas').screenshot({path:join(ARTEFATOS,'demonstracoes',`financeiro-${largura}.png`)});
    }
    for(const slug of [specs.F303.slug,specs.F330.slug,'redimensionar-imagens-em-lote']){
      await pagina.setViewportSize({width:390,height:900});
      await pagina.goto(`${base}/f/${slug}/`,{waitUntil:'networkidle'});
      const demo=pagina.locator('[data-demonstracao][data-pronta="sim"]');await demo.waitFor();
      await demo.locator('[data-demo-cena="12"]').click();
      assert.equal(await pagina.locator('#ferramenta form').count(),0);
      await demo.locator('canvas').evaluate(n=>n.scrollIntoView({block:'center'}));
      await demo.locator('canvas').screenshot({path:join(ARTEFATOS,'demonstracoes',`${slug}.png`)});
    }
    assert.deepEqual(analises,[],'a animação não chama a API de processamento');
    assert.deepEqual(privados,[],'nenhum motor privado é entregue ao navegador');
    assert.deepEqual(erros,[]);
  } finally {await contexto.close();}

  const reduzido=await navegador.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await reduzido.addCookies([{name:'visto_novidades',value:'999999999999999',url:base}]);
  try{
    const p=await reduzido.newPage();await p.goto(`${base}/f/${specs.F277.slug}/`,{waitUntil:'networkidle'});
    const essencial=p.getByRole('button',{name:'Só o essencial',exact:true});if(await essencial.isVisible())await essencial.click();
    const demo=p.locator('[data-demonstracao][data-pronta="sim"]');await demo.waitFor();
    assert.equal(await demo.locator('input[type=range]').inputValue(),'12');
    assert.equal(await demo.locator('[data-demo-tocar]').isDisabled(),true);
    await demo.locator('[data-demo-cena="1.8"]').click();
    assert.equal(await demo.locator('input[type=range]').inputValue(),'1.8','cenas continuam acessíveis sem animação');
  }finally{await reduzido.close();}
});

for (const largura of [390, 1280]) for (const tema of ['claro', 'escuro']) {
  const primeiro = ++indice === 1;
  const conta = indice;
  test(`profissionais reais: ${largura}px, tema ${tema}, quatro domínios e arquivos completos`, { skip: pular, timeout: 180000 }, async t => {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 }, colorScheme: tema === 'claro' ? 'light' : 'dark', acceptDownloads: true });
    await contexto.addInitScript(tema => localStorage.setItem('portal.tema', JSON.stringify(tema)), tema);
    await contexto.addCookies([{ name: 'visto_novidades', value: '999999999999999', url: base }]);
    const pagina = await contexto.newPage();
    const erros = [], chamadas = [];
    pagina.on('pageerror', e => erros.push(String(e)));
    pagina.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/profissionais/')) chamadas.push(r.url()); });
    const usuario = await novaConta(contexto, conta);
    try {
      if (primeiro) {
        const payload = { csv: 'x;y\n1;2\n2;4\n3;5\n4;4\n5;5' };
        assert.equal((await post(contexto, `/api/profissionais/${specs.F277.slug}`, payload)).status(), 403, 'conta gratuita é bloqueada pela API real');
        banco.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run('plus', usuario);
        assert.equal((await post(contexto, `/api/profissionais/${specs.F277.slug}`, payload)).status(), 403, 'Plus é bloqueado no motor Premium real');
      }
      banco.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run('premium', usuario);
      const capturar = async spec => {
        assert.equal(await pagina.locator('html').getAttribute('data-tema'), tema);
        assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${spec.id}: sem overflow em ${largura}px/${tema}`);
        const acessibilidade = await pagina.locator('.profissional__resultado').evaluate(resultado => {
          resultado.scrollIntoView({ block: 'start', behavior: 'instant' });
          const cabecalho = document.querySelector('header.topo').getBoundingClientRect();
          window.scrollBy({ top: resultado.getBoundingClientRect().top - cabecalho.bottom - 12, behavior: 'instant' });
          const titulo = resultado.querySelector('h2').getBoundingClientRect();
          const indicadores = [...resultado.querySelectorAll('.profissional__indicador')].map(indicador => {
            const r = indicador.getBoundingClientRect();
            return r.top >= cabecalho.bottom && r.bottom < innerHeight &&
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.profissional__indicador') === indicador;
          });
          return { tituloAcessivel: titulo.top >= cabecalho.bottom && titulo.bottom < innerHeight, indicadores };
        });
        assert.equal(acessibilidade.tituloAcessivel, true, `${spec.id}: título visível abaixo do cabeçalho`);
        assert.ok(acessibilidade.indicadores.every(Boolean), `${spec.id}: todos os indicadores visíveis e sem sobreposição`);
        await pagina.screenshot({ path: join(ARTEFATOS, `${spec.id}-${largura}-${tema}-viewport.png`), fullPage: false });
        await pagina.locator('.profissional__resultado').screenshot({ path: join(ARTEFATOS, `${spec.id}-${largura}-${tema}.png`) });
      };

      await abrir(pagina, specs.F269);
      await importar(pagina, 'tarefas.csv', Buffer.from(csvCadeia), 'text/csv');
      assert.deepEqual(lerCsv(await pagina.locator('.profissional__entrada textarea').inputValue(), { separador: ';' }), tabelaTexto(cadeia));
      const cpm = await executar(pagina, specs.F269);
      assert.equal(cpm.indicadores.find(([k]) => k === 'Duração mínima do projeto')[1], 31);
      assert.equal(cpm.indicadores.find(([k]) => k === 'Tarefas críticas')[1], 31);
      assert.equal(cpm.linhas.length, 31);
      await pagina.getByRole('button', { name: 'Próxima', exact: true }).click();
      assert.equal(await pagina.locator('.profissional__resultado tbody tr').count(), 6);
      assert.match(await pagina.locator('.profissional__paginacao').innerText(), /26–31 de 31 linhas · página 2\/2/);
      await pagina.getByRole('searchbox', { name: 'Buscar no relatório' }).fill('T31');
      assert.equal(await pagina.locator('.profissional__resultado tbody tr').count(), 1);
      await pagina.getByRole('searchbox', { name: 'Buscar no relatório' }).fill('sem-correspondencia');
      assert.match(await pagina.locator('.profissional__paginacao').innerText(), /Nenhuma linha encontrada/);
      await pagina.getByRole('searchbox', { name: 'Buscar no relatório' }).fill('');
      await capturar(specs.F269);
      if (primeiro) await verificarExportacoes(pagina, specs.F269, cpm);

      await abrir(pagina, specs.F277);
      await importar(pagina, 'observacoes.json', Buffer.from(JSON.stringify(pares)) , 'application/json');
      const regressao = await executar(pagina, specs.F277);
      assert.ok(Math.abs(regressao.indicadores.find(([k]) => k === 'Inclinação')[1] - 0.6) < 1e-9);
      await capturar(specs.F277);
      const entrada = pagina.locator('.profissional__entrada textarea');
      const anterior = await entrada.inputValue();
      await entrada.fill(anterior + '\n6;6');
      assert.equal(await pagina.locator('.profissional__resultado').isVisible(), false, 'editar invalida o relatório');
      assert.equal(await pagina.locator('.profissional__exportacoes:visible').count(), 0);
      const antesInvalido = await entrada.inputValue();
      await pagina.locator('.profissional__importacao input[type=file]').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{ invalido') });
      await pagina.locator('.profissional__erro:visible').waitFor();
      assert.match(await pagina.locator('.profissional__erro').innerText(), /JSON inválido/);
      assert.equal(await entrada.inputValue(), antesInvalido, 'importação inválida preserva o conteúdo editado');

      await abrir(pagina, specs.F303);
      const tabelaDados = lerCsv(specs.F303.exemplo, { separador: ';' });
      await importar(pagina, 'dependencias.xlsx', xlsxDe(tabelaDados));
      const dados = await executar(pagina, specs.F303);
      assert.equal(dados.indicadores.find(([k]) => k === 'Reparos mínimos')[1], 1);
      assert.equal(dados.indicadores.find(([k]) => k === 'Chaves conflitantes')[1], 1);
      await capturar(specs.F303);

      await abrir(pagina, specs.F330);
      await importar(pagina, 'clausulas.txt', Buffer.from(textoClausulas), 'text/plain');
      assert.equal(await entrada.inputValue(), textoClausulas);
      await importar(pagina, 'clausulas.docx', docxDe(textoClausulas));
      assert.equal(await entrada.inputValue(), textoClausulas, 'DOCX preserva os parágrafos necessários à comparação');
      const documento = await executar(pagina, specs.F330);
      assert.equal(documento.indicadores.find(([k]) => k === 'Pares semelhantes')[1], 1);
      assert.equal(documento.linhas[0][2], 1, 'parágrafos idênticos têm Jaccard 1');
      await capturar(specs.F330);
      if (primeiro) {
        const pdf = await biblioteca.PDFDocument.create();
        const paginaPdf = pdf.addPage();
        paginaPdf.drawText('Texto selecionavel para importacao real de PDF.', { x: 40, y: 700, size: 12 });
        await importar(pagina, 'texto.pdf', await pdf.save(), 'application/pdf');
        assert.match(await entrada.inputValue(), /Texto selecionavel para importacao real de PDF/);
        assert.match(await pagina.locator('.profissional__importacao [role=status]').innerText(), /não há OCR/);

        await abrir(pagina, specs.F252);
        await pagina.getByRole('button', { name: 'Usar exemplo', exact: true }).click();
        const financeiro = await executar(pagina, specs.F252);
        assert.ok(financeiro.series.length > 0);
        const svg = await baixar(pagina, 'SVG', specs.F252.slug, 'svg');
        const grafico = await pagina.evaluate(bytes => {
          const d = new DOMParser().parseFromString(new TextDecoder().decode(new Uint8Array(bytes)), 'image/svg+xml');
          return { erro: Boolean(d.querySelector('parsererror')), titulo: d.querySelector('title')?.textContent, texto: d.documentElement.textContent, barras: d.querySelectorAll('rect[fill="#275ea8"], rect[fill="#9a3f36"]').length };
        }, [...svg]);
        assert.equal(grafico.erro, false);
        assert.equal(grafico.titulo, financeiro.titulo);
        assert.equal(grafico.barras, financeiro.series.length);
        for (const serie of financeiro.series) assert.ok(grafico.texto.includes(String(serie.valor)), 'SVG preserva todas as séries');

        await abrir(pagina, specs.F334);
        await importar(pagina, 'legendas.srt', Buffer.from(specs.F334.exemplo), 'application/x-subrip');
        assert.equal(await entrada.inputValue(), specs.F334.exemplo, 'SRT chega ao validador sem renomear o arquivo');
        assert.ok((await executar(pagina, specs.F334)).linhas.length > 0);

        await abrir(pagina, specs.F336);
        await importar(pagina, 'inventario.cdx.json', Buffer.from(specs.F336.exemplo), 'application/json');
        assert.equal(await entrada.inputValue(), specs.F336.exemplo, 'SBOM JSON permanece documento e não vira tabela');
        assert.ok((await executar(pagina, specs.F336)).linhas.length > 0);
      }
      assert.deepEqual(erros, [], 'nenhum pageerror durante módulos, importadores, motores ou workers');
      assert.equal(chamadas.length, primeiro ? 7 : 4, 'somente os cálculos esperados são enviados; cada conta permanece abaixo da cota de 12/minuto');
      t.diagnostic(`${chamadas.length} cálculos reais; quatro domínios; sem overflow/pageerror. Artefatos: .execucao/profissionais-e2e`);
    } catch (falha) {
      await pagina.screenshot({ path: join(ARTEFATOS, `falha-${largura}-${tema}.png`), fullPage: true }).catch(() => {});
      throw falha;
    } finally {
      await contexto.close();
    }
  });
}
