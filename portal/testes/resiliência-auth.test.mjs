import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
async function portaLivre() {
  const s = createServer(); await new Promise(ok => s.listen(0, '127.0.0.1', ok));
  const porta = s.address().port; await new Promise(ok => s.close(ok)); return porta;
}
async function subir(apiPorta, env = {}) {
  const porta = await portaLivre();
  const processo = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(porta), '--local'], {
    cwd: raiz, env: { ...process.env, PORTAL_API_PORTA: String(apiPorta), PORTAL_ADS_ATIVO: '0', ...env }, stdio: 'pipe', windowsHide: true,
  });
  const base = `http://127.0.0.1:${porta}`;
  for (let n = 0; n < 60; n++) {
    if (processo.exitCode !== null) throw Error('Servidor encerrado ao iniciar');
    try { if ((await fetch(base)).ok) return { processo, base }; } catch {}
    await esperar(50);
  }
  processo.kill(); throw Error('Servidor não iniciou');
}
async function parar(processo) {
  if (processo.exitCode !== null) return;
  await new Promise(ok => { processo.once('exit', ok); processo.kill(); });
}

test('API desligada: JSON 503 só na API, ferramentas e página continuam disponíveis', async () => {
  const apiPorta = await portaLivre(); const { processo, base } = await subir(apiPorta);
  try {
    const api = await fetch(`${base}/api/autenticacao/sessao`);
    assert.equal(api.status, 503); assert.deepEqual(await api.json(), { erro: 'servico_indisponivel' });
    for (const caminho of ['/', '/entrar.html', '/f/porcentagem/']) assert.equal((await fetch(base + caminho)).status, 200);
    for (const privado of ['/servidor/iniciar.mjs', '/servidor/.execucao/portal.sqlite', '/scripts-admin/conceder-admin.mjs', '/banco/dados.json']) assert.equal((await fetch(base + privado)).status, 404);
    const pagina = await fetch(base); const csp = pagina.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self';/); assert.doesNotMatch(csp, /googlesyndication|unsafe-inline|unsafe-eval/);
    assert.equal((await fetch(base + '/ads.txt')).status, 404);
  } finally { await parar(processo); }
});

test('proxy preserva método, Origin, CSRF e cookies; CSP usa nonce único só quando autorizado', async () => {
  const recebidas = [];
  const backend = createServer((req, res) => {
    recebidas.push({ metodo: req.method, origin: req.headers.origin, csrf: req.headers['x-csrf-token'], cookie: req.headers.cookie, ip: req.headers['x-forwarded-for'] });
    if (req.url === '/api/anuncios') {
      const negado = /entrar|conta|privacidade/.test(req.headers.referer || '');
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ permitido: !negado, editor: 'ca-pub-1234567890123456', blocos: { rodape: '1234567890' } }));
    }
    res.setHeader('Set-Cookie', ['sessao=teste; HttpOnly; SameSite=Lax; Path=/', 'csrf=teste; SameSite=Lax; Path=/']);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true }));
  });
  await new Promise(ok => backend.listen(0, '127.0.0.1', ok));
  const { processo, base } = await subir(backend.address().port, { PORTAL_ADS_ATIVO: '1', PORTAL_ADS_EDITOR: 'ca-pub-1234567890123456' });
  try {
    const r = await fetch(base + '/api/conta', { method: 'PATCH', headers: { Origin: base, 'X-CSRF-Token': 'teste', Cookie: 'sessao=teste', 'X-Forwarded-For': '203.0.113.8', 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Teste' }) });
    assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.getSetCookie().length, 2);
    assert.deepEqual(recebidas.at(-1), { metodo: 'PATCH', origin: base, csrf: 'teste', cookie: 'sessao=teste', ip: '127.0.0.1' });
    const a = await fetch(base); const b = await fetch(base);
    assert.notEqual(a.headers.get('content-security-policy'), b.headers.get('content-security-policy'));
    assert.match(a.headers.get('content-security-policy'), /'nonce-[^']+' 'strict-dynamic'/);
    assert.doesNotMatch(a.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
    const html = await a.text(); const nonce = /'nonce-([^']+)'/.exec(a.headers.get('content-security-policy'))[1];
    assert.ok([...html.matchAll(/<script\b[^>]*>/g)].every(m => m[0].includes(`nonce="${nonce}"`)));
    const entrar = await fetch(base + '/entrar.html'); assert.match(entrar.headers.get('content-security-policy'), /script-src 'self';/);
    assert.equal(await (await fetch(base + '/ads.txt')).text(), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    const confiavel = await subir(backend.address().port, { PORTAL_PROXY_CONFIAVEL: '1' });
    try {
      await fetch(confiavel.base + '/api/conta', { headers: { 'X-Forwarded-For': '203.0.113.8' } });
      assert.equal(recebidas.at(-1).ip, '203.0.113.8');
      await fetch(confiavel.base + '/api/conta', { headers: { 'X-Forwarded-For': '203.0.113.8, 1.2.3.4' } });
      assert.equal(recebidas.at(-1).ip, '127.0.0.1');
    } finally { await parar(confiavel.processo); }
  } finally { await parar(processo); await new Promise(ok => backend.close(ok)); }
});
