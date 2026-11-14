/** Fluxo de ponta a ponta do CMS de atualizações: API/SQLite, admin e páginas públicas. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { delimiter, dirname, isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as esperar } from 'node:timers/promises';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARTEFATOS = join(RAIZ, '.execucao', 'atualizacoes-e2e');
const require = createRequire(import.meta.url);
let chromium;
if (process.env.PLAYWRIGHT_MODULO) {
  const modulo = process.env.PLAYWRIGHT_MODULO;
  chromium = (await import(isAbsolute(modulo) ? pathToFileURL(modulo).href : modulo)).chromium;
} else {
  for (const nome of ['playwright', 'playwright-core']) {
    try { chromium = require(nome).chromium; break; } catch { /* tenta o próximo pacote */ }
  }
}
const pular = chromium ? false : 'Playwright não instalado; defina PLAYWRIGHT_MODULO para executar o teste E2E.';

let navegador, contexto, servidorSite, servidorApi, fecharApi, banco, pasta, bancoPath, base, logs = '';
let paginaId = 0;
const envAnterior = {};

async function portaLivre() {
  const reserva = createServer();
  await new Promise((ok, falha) => { reserva.once('error', falha); reserva.listen(0, '127.0.0.1', ok); });
  const porta = reserva.address().port;
  await new Promise(ok => reserva.close(ok));
  return porta;
}

async function esperarPor(url, predicado = resposta => resposta.ok) {
  for (let i = 0; i < 150; i += 1) {
    try { const resposta = await fetch(url); if (predicado(resposta)) return resposta; } catch { /* servidor subindo */ }
    await esperar(100);
  }
  throw new Error(`Servidor não ficou pronto: ${url}\n${logs}`);
}

before(async () => {
  if (!chromium) return;
  await mkdir(ARTEFATOS, { recursive: true });
  pasta = await mkdtemp(join(tmpdir(), 'portal-atualizacoes-e2e-'));
  bancoPath = join(pasta, 'teste.sqlite');
  for (const nome of ['PORTAL_BANCO', 'PORTAL_API_PORTA', 'URL_PUBLICA']) envAnterior[nome] = process.env[nome];
  process.env.PORTAL_BANCO = bancoPath;
  base = `http://127.0.0.1:${await portaLivre()}`;
  process.env.URL_PUBLICA = base;

  // A API é iniciada diretamente para usar porta efêmera e banco isolado por execução.
  const moduloApi = await import('../../servidor/iniciar.mjs');
  servidorApi = await moduloApi.iniciar({ porta: 0, host: '127.0.0.1' });
  fecharApi = moduloApi.fecharBanco;
  const portaApi = servidorApi.address().port;
  process.env.PORTAL_API_PORTA = String(portaApi);

  servidorSite = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', base.split(':').at(-1), '--loopback'], {
    cwd: RAIZ,
    env: { ...process.env, PORTAL_API_PORTA: String(portaApi), URL_PUBLICA: base },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  for (const fluxo of [servidorSite.stdout, servidorSite.stderr]) fluxo.on('data', dados => { logs = (logs + dados).slice(-12000); });
  await esperarPor(base);
  await esperarPor(`${base}/api/saude`);

  const candidatos = [process.env.PLAYWRIGHT_EXECUTAVEL,
    ...String(process.env.PATH || '').split(delimiter).flatMap(p => ['chromium', 'chromium-browser', 'google-chrome'].map(n => join(p, n)))];
  const executavel = candidatos.find(caminho => caminho && existsSync(caminho));
  navegador = await chromium.launch({ headless: true, ...(executavel ? { executablePath: executavel } : {}) });
  banco = new DatabaseSync(bancoPath);
});

after(async () => {
  banco?.close();
  await navegador?.close();
  if (servidorSite && servidorSite.exitCode === null) {
    servidorSite.kill('SIGTERM');
    await Promise.race([new Promise(resolve => servidorSite.once('exit', resolve)), esperar(3000)]);
    if (servidorSite.exitCode === null) servidorSite.kill('SIGKILL');
  }
  if (servidorApi?.listening) await new Promise(resolve => servidorApi.close(resolve));
  fecharApi?.();
  for (const [nome, valor] of Object.entries(envAnterior)) {
    if (valor === undefined) delete process.env[nome]; else process.env[nome] = valor;
  }
  if (pasta) await rm(pasta, { recursive: true, force: true });
});

async function criarConta(contextoConta, sufixo, papel = 'usuario') {
  const sessao = await contextoConta.request.get(`${base}/api/autenticacao/sessao`);
  assert.equal(sessao.status(), 200);
  const csrfCookie = (await contextoConta.cookies(base)).find(cookie => /csrf$/u.test(cookie.name));
  assert.ok(csrfCookie, 'a API emite o cookie CSRF antes da criação da conta');
  const csrf = decodeURIComponent(csrfCookie.value);
  const usuario = `e2e_blog_${sufixo}`.slice(0, 20);
  const email = `${usuario}@example.test`;
  const senha = 'Senha-E2E-atualizacoes-123!';
  const resposta = await contextoConta.request.post(`${base}/api/autenticacao/criar-conta`, {
    data: { nome: 'Teste E2E Blog', email, usuario, senha, idade: 30, aceitaTermos: true },
    headers: { Origin: base, 'X-CSRF-Token': csrf },
  });
  const textoResposta = await resposta.text();
  assert.equal(resposta.status(), 201, textoResposta);
  const criado = JSON.parse(textoResposta);
  if (papel === 'admin') banco.prepare("UPDATE usuarios SET papel='admin' WHERE id=?").run(criado.usuario.id);
  return { email, senha, usuario };
}

async function novoPainel() {
  contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  await criarConta(contexto, String(++paginaId), 'admin');
  assert.ok((await contexto.cookies(base)).some(cookie => cookie.name === 'sessao' && cookie.httpOnly));
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', erro => erros.push(String(erro)));
  assert.equal((await contexto.request.get(`${base}/api/admin/atualizacoes`)).status(), 200, 'usuário de setup tem papel admin na API');
  const resposta = await pagina.goto(`${base}/admin/atualizacoes/`, { waitUntil: 'networkidle' });
  assert.equal(resposta.status(), 200);
  try { await pagina.locator('#admin-atualizacoes').waitFor({ state: 'visible', timeout: 8000 }); }
  catch (erro) {
    const diagnóstico = await pagina.evaluate(async () => {
      const [sessao, admin] = await Promise.all([fetch('/api/autenticacao/sessao').then(r => r.json()), fetch('/api/admin/atualizacoes').then(async r => ({ status: r.status, body: await r.text() }))]);
      return { papel: sessao.usuario?.papel, autenticado: Boolean(sessao.usuario), admin: { status: admin.status, tamanho: admin.body.length, começo: admin.body.slice(0, 80) }, cookies: document.cookie.split('; ').map(x => x.split('=')[0]) };
    });
    throw new Error(`${erro.message}; url=${pagina.url()}; cookies=${(await contexto.cookies(base)).map(cookie => cookie.name).join(',')}; diagnóstico=${JSON.stringify(diagnóstico)}`);
  }
  pagina._errosE2E = erros;
  assert.deepEqual(erros, [], 'carregamento do CMS não gera erros JavaScript');
  return { pagina };
}

async function preencherAtualizacao(pagina, { titulo, slug, resumo, conteudo }) {
  await pagina.locator('#nova-atualizacao').click();
  const form = pagina.locator('#form-admin-atualizacao');
  await form.locator('[name=titulo_pt]').fill(titulo);
  await form.locator('[name=resumo_pt]').fill(resumo);
  await form.locator('[name=conteudo_pt]').fill(conteudo);
  await form.locator('[name=categoria]').selectOption('melhoria');
  await form.locator('[name=versao]').fill('9.8.7');
  await form.locator('[name=slug]').fill(slug);
  const data = new Date(Date.now() - 60_000);
  const dataHoraLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await form.locator('[name=publicado_em]').fill(dataHoraLocal);
}

test('admin cria, publica e edita; blog e sino abrem a atualização e API restringe usuário comum', { skip: pular }, async () => {
  const { pagina } = await novoPainel();
  const sufixo = `${Date.now()}-${paginaId}`;
  const slug = `e2e-atualizacao-${sufixo}`;
  const titulo = `Atualização E2E ${sufixo}`;
  const resumo = 'Resumo publicado pelo fluxo administrativo real.';
  const conteudoV1 = 'Conteúdo original persistido no SQLite.';
  const conteudoV2 = 'Conteúdo revisado e persistido no SQLite.';

  try {
    await preencherAtualizacao(pagina, { titulo, slug, resumo, conteudo: conteudoV1 });
    await Promise.all([
      pagina.waitForResponse(resposta => resposta.url() === `${base}/api/admin/atualizacoes` && resposta.request().method() === 'POST'),
      pagina.locator('#form-admin-atualizacao button[name=acao][value=rascunho]').click(),
    ]);
    await pagina.locator('#lista-admin-atualizacoes').getByText(titulo, { exact: true }).waitFor({ state: 'visible' });
    const rascunhoAdmin = pagina.locator('.admin-atualizacoes__item').filter({ hasText: titulo });
    assert.match(await rascunhoAdmin.innerText(), /Rascunho/u);
    const feedRascunho = await contexto.request.get(`${base}/api/atualizacoes`).then(r => r.json());
    assert.equal(feedRascunho.itens.some(item => item.slug === slug), false, 'rascunho não entra no feed público');

    let respostaBlog = await pagina.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    assert.equal(respostaBlog.status(), 200);
    assert.equal(await pagina.locator(`#${slug}`).count(), 0, 'rascunho não aparece na página pública');

    await pagina.goto(`${base}/admin/atualizacoes/`, { waitUntil: 'networkidle' });
    let painel = await contexto.request.get(`${base}/api/admin/atualizacoes`).then(r => r.json());
    let item = painel.itens.find(registro => registro.slug === slug);
    assert.equal(item?.revisao, 1);
    const itemAdmin = pagina.locator('.admin-atualizacoes__item').filter({ hasText: titulo });
    await itemAdmin.getByRole('button', { name: 'Editar', exact: true }).click();
    await Promise.all([
      pagina.waitForResponse(resposta => resposta.url() === `${base}/api/admin/atualizacoes/${item.id}` && resposta.request().method() === 'PUT'),
      pagina.locator('#form-admin-atualizacao button[name=acao][value=publicado]').click(),
    ]);
    painel = await contexto.request.get(`${base}/api/admin/atualizacoes`).then(r => r.json());
    item = painel.itens.find(registro => registro.slug === slug);
    assert.equal(item?.estado, 'publicado');
    assert.equal(item?.revisao, 2, 'a mudança de rascunho para publicado incrementa a revisão');
    let feed = await contexto.request.get(`${base}/api/atualizacoes`).then(r => r.json());
    assert.equal(feed.itens.some(registro => registro.slug === slug), true);

    // A atualização publicada chega à lista do sino. Abrir a notificação mostra detalhe sem trocar de página.
    await pagina.goto(`${base}/`, { waitUntil: 'networkidle' });
    const fecharBoasVindas = pagina.locator('dialog.boas-vindas[open] .boas-vindas__fechar');
    if (await fecharBoasVindas.isVisible()) await fecharBoasVindas.click();
    await pagina.locator('#abrir-notificações').click();
    const notificação = pagina.locator('.notificações__item').filter({ hasText: titulo });
    await notificação.waitFor({ state: 'visible' });
    const caminhoAntesDoDetalhe = new URL(pagina.url()).pathname;
    await notificação.click();
    await pagina.locator('.notificações__detalhe[role=dialog]').waitFor({ state: 'visible' });
    assert.equal(new URL(pagina.url()).pathname, caminhoAntesDoDetalhe, 'abrir o detalhe do sino não navega');
    await pagina.locator('a.notificações__ir').click();
    await pagina.waitForURL(url => url.pathname.endsWith('/atualizacoes.html') && url.hash === `#${slug}`);
    await pagina.locator(`#${slug} .atualizacoes__detalhes:not([hidden])`).waitFor({ state: 'visible' });

    // No blog, abrir o cartão também expande o conteúdo na mesma página.
    await pagina.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    const cartão = pagina.locator(`#${slug}`);
    await cartão.waitFor({ state: 'visible' });
    const rotaBlog = new URL(pagina.url()).pathname;
    await cartão.locator('.atualizacoes__abrir').click();
    await cartão.locator('.atualizacoes__detalhes:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(new URL(pagina.url()).pathname, rotaBlog, 'abrir o post mantém a rota do blog');
    assert.equal(await cartão.innerText().then(texto => texto.includes(conteudoV1)), true);

    // Alteração pela UI, segunda revisão após publicar, e persistência após recarregar o painel.
    await pagina.goto(`${base}/admin/atualizacoes/`, { waitUntil: 'networkidle' });
    const itemParaEditar = pagina.locator('.admin-atualizacoes__item').filter({ hasText: titulo });
    await itemParaEditar.getByRole('button', { name: 'Editar', exact: true }).click();
    await pagina.locator('#form-admin-atualizacao [name=conteudo_pt]').fill(conteudoV2);
    await Promise.all([
      pagina.waitForResponse(resposta => resposta.url() === `${base}/api/admin/atualizacoes/${item.id}` && resposta.request().method() === 'PUT'),
      pagina.locator('#form-admin-atualizacao button[name=acao][value=publicado]').click(),
    ]);
    painel = await contexto.request.get(`${base}/api/admin/atualizacoes`).then(r => r.json());
    item = painel.itens.find(registro => registro.slug === slug);
    assert.equal(item?.revisao, 3, 'edição concorrente não apaga revisão anterior');
    assert.equal(item?.pt.conteudo, conteudoV2);
    await pagina.reload({ waitUntil: 'networkidle' });
    const itemPersistido = pagina.locator('.admin-atualizacoes__item').filter({ hasText: titulo });
    await itemPersistido.waitFor({ state: 'visible' });
    assert.match(await itemPersistido.innerText(), /revisão 3/u);

    const comum = await navegador.newContext();
    try {
      await criarConta(comum, String(++paginaId), 'usuario');
      const negado = await comum.request.get(`${base}/api/admin/atualizacoes`);
      assert.equal(negado.status(), 403, 'a API administrativa rejeita uma sessão de usuário comum');
    } finally { await comum.close(); }

    assert.deepEqual(pagina._errosE2E, []);
    await contexto.close(); contexto = null;
  } finally {
    await contexto?.close(); contexto = null;
  }
});

test('com API 404, feed estático segue público e painel local preserva remoções, rascunhos e exportação', { skip: pular }, async () => {
  const { pagina } = await novoPainel();
  const sufixo = `${Date.now()}-${paginaId}`;
  const slugPronto = `pronto-e2e-${sufixo}`;
  const tituloPronto = `Preparado para exportação ${sufixo}`;
  const slugRascunho = `rascunho-e2e-${sufixo}`;
  const tituloRascunho = `Rascunho local E2E ${sufixo}`;
  try {
    await pagina.route('**/api/atualizacoes', rota => rota.fulfill({
      status: 404, contentType: 'application/json', body: JSON.stringify({ erro: 'nao_encontrado' }),
    }));
    const blog = await pagina.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    assert.equal(blog.status(), 200);
    const feedEstático = await pagina.evaluate(() => fetch('/dados/atualizacoes.json').then(resposta => resposta.json()));
    assert.ok(feedEstático.itens.length > 0);
    await pagina.getByRole('heading', { name: feedEstático.itens[0].pt.titulo }).waitFor({ state: 'visible' });
    assert.equal(await pagina.locator('#lista-atualizacoes .atualizacoes__cartao').count(), feedEstático.itens.length);
    assert.equal(await pagina.locator('#estado-atualizacoes').innerText(), '');

    await pagina.route('**/api/admin/atualizacoes', rota => rota.fulfill({
      status: 404, contentType: 'application/json', body: JSON.stringify({ erro: 'nao_encontrado' }),
    }));
    await pagina.goto(`${base}/admin/atualizacoes/`, { waitUntil: 'networkidle' });
    await pagina.locator('#admin-atualizacoes').waitFor({ state: 'visible' });
    const semente = feedEstático.itens[0];
    const artigoSemente = pagina.locator('.admin-atualizacoes__item').filter({ hasText: semente.pt.titulo });
    await artigoSemente.getByRole('button', { name: 'Remover', exact: true }).click();
    await artigoSemente.getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
    await pagina.locator('.admin-atualizacoes__item').filter({ hasText: semente.pt.titulo }).waitFor({ state: 'detached' });
    await pagina.reload({ waitUntil: 'networkidle' });
    assert.equal(await pagina.locator('.admin-atualizacoes__item').filter({ hasText: semente.pt.titulo }).count(), 0, 'marcador local de remoção impede a semente de reaparecer no painel');

    await preencherAtualizacao(pagina, {
      titulo: tituloPronto, slug: slugPronto, resumo: 'Conteúdo preparado, ainda não publicado no site.',
      conteudo: 'A preparação local só entra no JSON exportado.',
    });
    await pagina.locator('#form-admin-atualizacao button[name=acao][value=publicado]').click();
    await pagina.locator('#status-admin-atualizacoes').getByText(/não foi publicado no site/u).waitFor({ state: 'visible' });
    const prontoLocal = pagina.locator('.admin-atualizacoes__item').filter({ hasText: tituloPronto });
    await prontoLocal.waitFor({ state: 'visible' });
    assert.match(await prontoLocal.innerText(), /Pronto para exportar · não publicado no site/u);

    await pagina.reload({ waitUntil: 'networkidle' });
    assert.equal(await pagina.locator('.admin-atualizacoes__item').filter({ hasText: semente.pt.titulo }).count(), 0);
    await pagina.locator('.admin-atualizacoes__item').filter({ hasText: tituloPronto }).waitFor({ state: 'visible' });
    await preencherAtualizacao(pagina, {
      titulo: tituloRascunho, slug: slugRascunho, resumo: 'Rascunho local mantido só neste navegador.',
      conteudo: 'Rascunhos não entram no JSON de publicação.',
    });
    await pagina.locator('#form-admin-atualizacao button[name=acao][value=rascunho]').click();
    const rascunhoLocal = pagina.locator('.admin-atualizacoes__item').filter({ hasText: tituloRascunho });
    await rascunhoLocal.waitFor({ state: 'visible' });
    assert.match(await rascunhoLocal.innerText(), /Rascunho local · não publicado no site/u);
    await pagina.reload({ waitUntil: 'networkidle' });
    assert.equal(await pagina.locator('.admin-atualizacoes__item').filter({ hasText: semente.pt.titulo }).count(), 0);
    await pagina.locator('.admin-atualizacoes__item').filter({ hasText: tituloRascunho }).waitFor({ state: 'visible' });

    const [download] = await Promise.all([
      pagina.waitForEvent('download'),
      pagina.locator('#exportar-atualizacoes').click(),
    ]);
    assert.equal(download.suggestedFilename(), 'atualizacoes.json');
    const exportado = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(exportado.itens.length, feedEstático.itens.length, 'exporta sementes restantes mais o item preparado; exclui semente removida e rascunho local');
    assert.equal(exportado.itens.some(item => item.slug === semente.slug), false);
    assert.equal(exportado.itens.some(item => item.slug === slugPronto), true);
    assert.equal(exportado.itens.some(item => item.slug === slugRascunho), false);

    await pagina.goto(`${base}/atualizacoes.html`, { waitUntil: 'networkidle' });
    assert.equal(await pagina.locator(`#${slugPronto}, #${slugRascunho}`).count(), 0, 'alterações e rascunhos locais não aparecem no feed estático');
    assert.equal(await pagina.locator(`#${semente.slug}`).count(), 1, 'a remoção local só afeta o JSON exportado até ser publicado no site');
    await contexto.close(); contexto = null;
  } finally {
    await contexto?.close(); contexto = null;
  }
});
