import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as esperar } from 'node:timers/promises';

test('API Premium respeita revogação durante upload e limite HTTP de corpo', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'portal-premium-revogacao-'));
  process.env.PORTAL_BANCO = join(pasta, 'banco.sqlite');
  const { iniciar, fecharBanco } = await import('../../servidor/iniciar.mjs');
  const servidor = await iniciar({ porta: 0 });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const db = new DatabaseSync(process.env.PORTAL_BANCO);
  let cookie = '', csrf = '';
  async function pedir(path, dados) {
    const r = await fetch(base + path, { method: dados ? 'POST' : 'GET', headers: { Cookie: cookie, ...(dados ? { Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' } : {}) }, body: dados ? JSON.stringify(dados) : undefined });
    const mapa = new Map(cookie.split('; ').filter(Boolean).map(x => x.split('=')));
    for (const item of r.headers.getSetCookie()) { const [k, v] = item.split(';')[0].split('='); mapa.set(k, v); }
    cookie = [...mapa].map(([k, v]) => `${k}=${v}`).join('; '); csrf = mapa.get('csrf') || csrf;
    return r;
  }
  try {
    await pedir('/api/autenticacao/sessao');
    assert.equal((await pedir('/api/autenticacao/criar-conta', { nome: 'Teste', email: 'teste@example.com', usuario: 'teste', senha: 'senha-forte-teste-123', idade: 22, aceitaTermos: true })).status, 201);
    const rotas = ['/api/premium/previsao-de-vendas', '/api/premium/planejamento-estoque', '/api/premium/auditar-feed', '/api/premium/auditar-seo-produtos', '/api/premium/lote/simulador-margem-marketplaces', '/api/premium/estrategia/precificacao-de-promocoes', '/api/premium/operacoes/planejamento-kits-combos', '/api/premium/analitica/experimentos-ab-lote'];
    for (const rota of rotas) {
      db.prepare("UPDATE usuarios SET plano='premium' WHERE usuario='teste'").run();
      const resultado = new Promise((resolve, reject) => {
        const req = request(base + rota, { method: 'POST', headers: { Cookie: cookie, Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', 'Content-Length': '2' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
        req.on('error', reject); req.write('{');
        (async () => { await esperar(80); db.prepare("UPDATE usuarios SET plano='gratuito' WHERE usuario='teste'").run(); req.end('}'); })().catch(reject);
      });
      assert.equal(await resultado, 403, rota);
    }
    db.prepare("UPDATE usuarios SET plano='premium' WHERE usuario='teste'").run();
    const grande = await fetch(base + '/api/premium/previsao-de-vendas', {
      method: 'POST', headers: { Cookie: cookie, Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ historico: 'x'.repeat(300000) }),
    });
    assert.equal(grande.status, 413);
    assert.equal((await grande.json()).erro, 'corpo_grande');
    const statusFragmentado = await new Promise((resolve, reject) => {
      const req = request(base + '/api/premium/previsao-de-vendas', {
        method: 'POST', headers: { Cookie: cookie, Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
      }, res => { req.end(); res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.setTimeout(3000, () => req.destroy(new Error('tempo excedido')));
      req.on('error', reject);
      req.write('x'.repeat(300001));
    });
    assert.equal(statusFragmentado, 413);
    const statusSessao = await new Promise((resolve, reject) => {
      const req = request(base + '/api/premium/previsao-de-vendas', {
        method: 'POST', headers: { Cookie: cookie, Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', 'Content-Length': '2' },
      }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.write('{');
      (async () => { await esperar(80); db.prepare('DELETE FROM sessoes').run(); req.end('}'); })().catch(reject);
    });
    assert.equal(statusSessao, 401);
  } finally {
    db.close(); await new Promise(ok => servidor.close(ok)); fecharBanco(); rmSync(pasta, { recursive: true, force: true });
  }
});
