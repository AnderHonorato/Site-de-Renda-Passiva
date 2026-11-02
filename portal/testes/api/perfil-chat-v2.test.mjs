import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';

const origem = 'http://127.0.0.1:4400';
const portaLivre = () => new Promise(ok => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => ok(p));
  });
});

test('perfil avançado, não lidas, respostas e mídia privada', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'portal-api-v2-'));
  const porta = await portaLivre();
  process.env.PORTAL_BANCO = join(pasta, 'banco.sqlite');
  process.env.PORTAL_CHAT_LOCAL = '1';
  process.env.PORTAL_EMAILS_DIR = join(pasta, 'emails');
  const { iniciar, fecharBanco } = await import('../../servidor/iniciar.mjs');
  const servidor = await iniciar({ porta });
  const base = 'http://127.0.0.1:' + porta;

  let cookie = '';
  let csrf = '';

  function atualizarCookies(resposta) {
    const set = resposta.headers.getSetCookie?.() || [];
    if (!set.length) return;
    const mapa = new Map(cookie.split('; ').filter(Boolean).map(x => x.split('=')));
    for (const item of set) {
      const [k, v] = item.split(';')[0].split('=');
      mapa.set(k, v);
    }
    cookie = [...mapa].map(([k, v]) => k + '=' + v).join('; ');
    csrf = mapa.get('csrf') || csrf;
  }

  async function pedir(caminho, metodo = 'GET', body, jar = true) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: {
        ...(jar && cookie ? { Cookie: cookie } : {}),
        ...(metodo !== 'GET' && metodo !== 'HEAD'
          ? { Origin: origem, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (jar) atualizarCookies(resposta);
    return { status: resposta.status, data: await resposta.json() };
  }

  async function binario(caminho, metodo = 'GET', buffer, headers = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...((metodo !== 'GET' && metodo !== 'HEAD') ? { Origin: origem, 'X-CSRF-Token': csrf } : {}),
        ...headers,
      },
      body: buffer,
    });
    atualizarCookies(resposta);
    return resposta;
  }

  try {
    await pedir('/api/autenticacao/sessao');
    let r = await pedir('/api/autenticacao/criar-conta', 'POST', {
      nome: 'Alice Visual',
      email: 'alice.visual@example.com',
      usuario: 'alicevisual',
      senha: 'senha-alice-visual-123',
      idade: 25,
      aceitaTermos: true,
    });
    assert.equal(r.status, 201);
    const alice = { cookie, csrf, id: r.data.usuario.id };

    r = await pedir('/api/perfil/alicevisual');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.data.perfil.medalhas));
    assert.ok(r.data.perfil.progresso_nivel);
    assert.ok(r.data.perfil.personalizacoes.banners.some(x => x.id === 'brisa' && x.desbloqueado));
    assert.ok(r.data.perfil.criado_em);

    r = await pedir('/api/perfil', 'PATCH', {
      nome: 'Alice Visual',
      bio: 'Perfil de teste visual',
      local: 'São Paulo',
      avatar: 'lua',
      banner: 'grade',
      moldura: 'cobre',
      sociais: { instagram: 'alice.visual', whatsapp: '5511999999999', site: 'https://example.com/' },
      visibilidade: { bio: true, local: true },
      ferramentas_recomendadas: [],
    });
    assert.equal(r.status, 400, 'personalização de nível ainda bloqueada deve ser recusada');

    for (const slug of ['simulador-de-financiamento', 'assinar-pdf', 'texto-para-fala']) {
      r = await pedir('/api/ferramentas/' + slug + '/uso', 'POST', {});
      assert.equal(r.status, 200);
    }
    r = await pedir('/api/perfil/alicevisual');
    assert.ok(r.data.perfil.nivel >= 2, 'interações e medalhas devem contribuir para o nível');
    assert.ok(r.data.perfil.pontos_evolucao > r.data.perfil.pontos, 'bônus das medalhas deve entrar na evolução');

    r = await pedir('/api/perfil', 'PATCH', {
      nome: 'Alice Visual',
      bio: 'Perfil de teste visual',
      local: 'São Paulo',
      avatar: 'nuvem',
      banner: 'grade',
      moldura: 'cobre',
      sociais: { instagram: 'alice.visual', whatsapp: '5511999999999', site: 'https://example.com/' },
      visibilidade: { bio: true, local: true },
      ferramentas_recomendadas: ['simulador-de-financiamento'],
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.perfil.avatar, 'nuvem');
    assert.equal(r.data.perfil.banner, 'grade');
    assert.equal(r.data.perfil.moldura, 'cobre');
    assert.equal(r.data.perfil.sociais.instagram, 'alice.visual');

    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      Buffer.from('arquivo-png-de-teste'),
    ]);
    let resp = await binario('/api/perfil/foto', 'PUT', png, {
      'Content-Type': 'image/png',
    });
    assert.equal(resp.status, 200);
    const foto = await resp.json();
    assert.match(foto.foto_url, /^\/api\/perfil\/foto\/alicevisual/);

    resp = await binario('/api/perfil/foto/alicevisual');
    assert.equal(resp.status, 200);
    assert.equal(resp.headers.get('content-type'), 'image/png');
    assert.ok((await resp.arrayBuffer()).byteLength > 8);

    r = await pedir('/api/chat/aceite', 'POST', { aceito: true });
    assert.equal(r.status, 200);

    cookie = '';
    csrf = '';
    await pedir('/api/autenticacao/sessao');
    r = await pedir('/api/autenticacao/criar-conta', 'POST', {
      nome: 'Bob Visual',
      email: 'bob.visual@example.com',
      usuario: 'bobvisual',
      senha: 'senha-bob-visual-123',
      idade: 24,
      aceitaTermos: true,
    });
    assert.equal(r.status, 201);
    const bob = { cookie, csrf, id: r.data.usuario.id };

    await pedir('/api/chat/aceite', 'POST', { aceito: true });
    r = await pedir('/api/amizades', 'POST', { usuario: 'alicevisual' });
    assert.equal(r.status, 200);

    cookie = alice.cookie;
    csrf = alice.csrf;
    r = await pedir('/api/amizades/aceitar', 'POST', { usuario: 'bobvisual' });
    assert.equal(r.status, 200);
    const sala = r.data.sala;

    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/mensagens', 'POST', {
      texto: 'Mensagem para testar não lidas',
    });
    assert.equal(r.status, 201);
    const primeira = r.data.mensagem;

    cookie = bob.cookie;
    csrf = bob.csrf;
    r = await pedir('/api/chat/salas');
    const privadaBob = r.data.salas.find(x => x.id === sala);
    assert.ok(privadaBob);
    assert.equal(privadaBob.nao_lidas, 1);
    assert.equal(privadaBob.ultima_mensagem, 'Mensagem para testar não lidas');
    assert.equal(privadaBob.outro.usuario, 'alicevisual');

    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/mensagens');
    assert.equal(r.status, 200);
    assert.equal(r.data.mensagens.length, 1);

    r = await pedir('/api/chat/salas');
    assert.equal(r.data.salas.find(x => x.id === sala).nao_lidas, 1, 'listar mensagens não deve marcar como lida');

    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/leitura', 'PATCH', {
      ultimoId: primeira.id,
    });
    assert.equal(r.status, 200);
    r = await pedir('/api/chat/salas');
    assert.equal(r.data.salas.find(x => x.id === sala).nao_lidas, 0);

    await new Promise(ok => setTimeout(ok, 2100));
    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/mensagens', 'POST', {
      texto: 'Resposta vinculada',
      respostaA: primeira.id,
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.mensagem.resposta.id, primeira.id);
    assert.equal(r.data.mensagem.resposta.usuario, 'alicevisual');

    await new Promise(ok => setTimeout(ok, 2100));
    resp = await binario('/api/chat/salas/' + encodeURIComponent(sala) + '/midias', 'POST', png, {
      'Content-Type': 'image/png',
      'X-Arquivo-Nome': encodeURIComponent('print teste.png'),
      'X-Resposta-A': String(primeira.id),
    });
    assert.equal(resp.status, 201);
    const envioMidia = await resp.json();
    assert.equal(envioMidia.mensagem.midias.length, 1);
    assert.equal(envioMidia.mensagem.midias[0].tipo, 'imagem');
    const midia = envioMidia.mensagem.midias[0];

    resp = await binario('/api/chat/midias/' + midia.id, 'GET', undefined, { Range: 'bytes=0-3' });
    assert.equal(resp.status, 206);
    assert.match(resp.headers.get('content-range') || '', /^bytes 0-3\//);
    assert.equal((await resp.arrayBuffer()).byteLength, 4);

    r = await pedir('/api/chat/midias/' + midia.id + '/progresso', 'PATCH', {
      posicao: 12.5,
      duracao: 30,
      concluida: false,
    });
    assert.equal(r.status, 200);

    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/mensagens');
    const comMidia = r.data.mensagens.find(x => x.id === envioMidia.mensagem.id);
    assert.ok(comMidia);
    assert.equal(comMidia.midias[0].reproducao.posicao, 12.5);

    resp = await binario('/api/chat/salas/global/midias', 'POST', png, {
      'Content-Type': 'image/png',
      'X-Arquivo-Nome': encodeURIComponent('nao-publico.png'),
    });
    assert.equal(resp.status, 403, 'mídia no chat público deve ser recusada');

    const db = new DatabaseSync(join(pasta, 'banco.sqlite'));
    db.prepare("UPDATE mensagens SET criado_em=datetime('now','-49 hours') WHERE id=?").run(primeira.id);
    db.prepare("UPDATE chat_midias SET criado_em=datetime('now','-49 hours') WHERE id=?").run(midia.id);
    db.close();

    r = await pedir('/api/chat/salas/' + encodeURIComponent(sala) + '/mensagens');
    assert.ok(!r.data.mensagens.some(x => x.id === primeira.id), 'mensagem direta com mais de 48 h deve sumir');

    resp = await binario('/api/chat/midias/' + midia.id);
    assert.equal(resp.status, 404, 'mídia privada com mais de 48 h deve expirar');

    cookie = alice.cookie;
    csrf = alice.csrf;
    r = await pedir('/api/perfil/foto', 'DELETE', {});
    assert.equal(r.status, 200);
    r = await pedir('/api/perfil/alicevisual');
    assert.equal(r.data.perfil.foto_url, null);
  } finally {
    await new Promise(ok => servidor.close(ok));
    fecharBanco();
    rmSync(pasta, { recursive: true, force: true });
  }
});
