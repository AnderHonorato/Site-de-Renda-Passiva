import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('atualizações: seed, feed público, proteção admin e revisão otimista', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'portal-atualizacoes-'));
  process.env.PORTAL_BANCO = join(pasta, 'banco.sqlite');
  const { iniciar, fecharBanco } = await import('../../servidor/iniciar.mjs');
  const servidor = await iniciar({ porta: 0 });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  let cookie = '', csrf = '', db;
  async function pedir(path, metodo = 'GET', dados, extras = {}) {
    const resposta = await fetch(base + path, { method: metodo, headers: {
      Cookie: cookie, ...(metodo === 'GET' ? {} : { Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }), ...extras
    }, body: dados === undefined ? undefined : JSON.stringify(dados) });
    const mapa = new Map(cookie.split('; ').filter(Boolean).map(valor => valor.split('=')));
    for (const item of resposta.headers.getSetCookie()) { const [chave, valor] = item.split(';')[0].split('='); mapa.set(chave, valor); }
    cookie = [...mapa].map(([chave, valor]) => `${chave}=${valor}`).join('; '); csrf = mapa.get('csrf') || csrf;
    return { status: resposta.status, data: await resposta.json() };
  }
  try {
    const estatico = JSON.parse(readFileSync(new URL('../../dados/atualizacoes.json', import.meta.url), 'utf8'));
    const quantidadeInicial = estatico.itens.length;
    const feed = await pedir('/api/atualizacoes');
    assert.equal(feed.status, 200);
    assert.deepEqual(feed.data.itens.sort((a, b) => a.id.localeCompare(b.id)), estatico.itens.sort((a, b) => a.id.localeCompare(b.id)));
    assert.equal(feed.data.itens.length, quantidadeInicial);
    assert.equal('estado' in feed.data.itens[0], false);
    assert.equal((await pedir('/api/admin/atualizacoes')).status, 401);

    await pedir('/api/autenticacao/sessao');
    const conta = await pedir('/api/autenticacao/criar-conta', 'POST', {
      nome: 'Teste', email: 'atualizacoes@example.test', usuario: 'teste_atualiza',
      senha: 'Senha-teste-atualizacao-123!', idade: 25, aceitaTermos: true
    });
    assert.equal(conta.status, 201);
    assert.equal((await pedir('/api/admin/atualizacoes')).status, 403);
    db = new DatabaseSync(process.env.PORTAL_BANCO);
    db.prepare("UPDATE usuarios SET papel='admin' WHERE id=?").run(conta.data.usuario.id);
    assert.equal((await pedir('/api/admin/atualizacoes')).data.itens.length, quantidadeInicial);

    const corpo = {
      slug: 'recurso-teste', categoria: 'novo', versao: '1.3.0',
      publicado_em: '2026-11-14T12:00:00.000Z', estado: 'rascunho',
      pt: { titulo: 'Recurso de teste', resumo: 'Resumo curto.', conteudo: 'Primeiro parágrafo.\n\nSegundo parágrafo.' }
    };
    assert.equal((await pedir('/api/admin/atualizacoes', 'POST', corpo, { 'X-CSRF-Token': 'invalido' })).status, 403);
    const markup = await pedir('/api/admin/atualizacoes', 'POST', { ...corpo, slug: 'texto-com-marcacao', pt: { ...corpo.pt, conteudo: 'Texto literal <script> mostrado como texto.' } });
    assert.equal(markup.status, 201);
    assert.equal(markup.data.item.pt.conteudo, 'Texto literal <script> mostrado como texto.');
    assert.equal((await pedir(`/api/admin/atualizacoes/${markup.data.item.id}`, 'DELETE', { revisao: 1 })).status, 200);
    const utf8NoLimite = await pedir('/api/admin/atualizacoes', 'POST', { ...corpo, slug: 'conteudo-unicode-limite', pt: { ...corpo.pt, conteudo: '🙂'.repeat(6000) } });
    assert.equal(utf8NoLimite.status, 201);
    assert.equal(utf8NoLimite.data.item.pt.conteudo.length, 12000);
    assert.equal((await pedir(`/api/admin/atualizacoes/${utf8NoLimite.data.item.id}`, 'DELETE', { revisao: 1 })).status, 200);
    const criado = await pedir('/api/admin/atualizacoes', 'POST', corpo);
    assert.equal(criado.status, 201);
    let item = criado.data.item;
    assert.equal(item.revisao, 1);
    assert.equal((await pedir('/api/atualizacoes')).data.itens.length, quantidadeInicial);

    const futuro = { ...corpo, estado: 'publicado', publicado_em: '2999-01-01T00:00:00.000Z', revisao: item.revisao };
    const atualizado = await pedir(`/api/admin/atualizacoes/${item.id}`, 'PUT', futuro);
    assert.equal(atualizado.status, 200);
    item = atualizado.data.item;
    assert.equal(item.revisao, 2);
    assert.equal((await pedir('/api/atualizacoes')).data.itens.length, quantidadeInicial);
    assert.equal((await pedir(`/api/admin/atualizacoes/${item.id}`, 'PUT', futuro)).status, 409);
    assert.equal((await pedir(`/api/admin/atualizacoes/${item.id}`, 'DELETE', { revisao: 1 })).status, 409);
    assert.equal((await pedir(`/api/admin/atualizacoes/${item.id}`, 'DELETE', { revisao: item.revisao })).status, 200);
    assert.ok(db.prepare("SELECT COUNT(*) total FROM auditoria_admin WHERE acao LIKE '%atualizacao%' ").get().total >= 3);

    // Rodar o seed de novo preserva os registros editados e não duplica os iniciais.
    const { inicializarAtualizacoes } = await import('../../servidor/atualizacoes.mjs');
    inicializarAtualizacoes(db);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes').get().total, quantidadeInicial);
  } finally {
    await new Promise(ok => servidor.close(ok)); db?.close(); fecharBanco(); rmSync(pasta, { recursive: true, force: true });
  }
});
