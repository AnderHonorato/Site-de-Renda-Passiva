// favoritos-fluxo.test.js — POST /api/favoritos/juntar (docs/contratos.md §11, §10.3;
// servidor/rotas/favoritos/favoritos-rotas.js:73). Junta favoritos locais (do aparelho, sem
// sessão) aos da conta: nunca substitui os existentes, ignora slug inválido/inexistente e
// respeita o limite do plano Grátis (10 — servidor/servidor-planos.json).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

const SENHA = 'senha-de-teste-123';

// Slugs reais do catálogo (frontend/ferramentas/*), suficientes para estourar o limite de 10
// do plano Grátis. catalogo.obter() aceita ferramentas "planejada" também (só precisa existir
// o manifesto), então não precisamos das 6 que estão "pronta".
const SLUGS_REAIS = [
  'ajuste-de-receita',
  'area-de-paredes',
  'area-de-rejunte',
  'ata-de-reuniao',
  'avaliacao-de-desempenho',
  'base64',
  'bingo-de-numeros',
  'briefing-criativo',
  'caca-palavras',
  'calculadora-de-churrasco',
  'calculadora-de-datas',
  'calculadora-de-frete',
  'calculadora-de-horas',
  'calculadora-de-nps',
];

async function subirServidor() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-favoritos-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { banco, base, fechar: () => servidor.close() };
}

async function abrirSessao(base) {
  const inicial = await fetch(base);
  const csrf = (inicial.headers.getSetCookie?.() ?? [])
    .map((linha) => /af_csrf=([^;]+)/.exec(linha)?.[1])
    .find(Boolean);
  let cookies = `af_csrf=${csrf}`;

  async function chamar(caminho, { metodo = 'GET', corpo, semCsrf = false } = {}) {
    const cabecalhos = { 'Content-Type': 'application/json', Cookie: cookies };
    if (!semCsrf) cabecalhos['X-CSRF-Token'] = csrf;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
      .find((valor) => valor !== undefined);
    if (sessao !== undefined) cookies = `af_csrf=${csrf}; af_sessao=${sessao}`;
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, resposta };
  }

  return { chamar };
}

async function criarUsuario(base, email) {
  const usuario = await abrirSessao(base);
  await usuario.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Teste', email, senha: SENHA, aceitou_termos: true },
  });
  return usuario;
}

test('junta favoritos locais aos da conta sem substituir os existentes', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-a@teste.dev');

  await usuario.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug: SLUGS_REAIS[0] } });

  const juntar = await usuario.chamar('/api/favoritos/juntar', {
    metodo: 'POST',
    corpo: { slugs: [SLUGS_REAIS[0], SLUGS_REAIS[1], SLUGS_REAIS[2]] },
  });

  assert.equal(juntar.status, 200);
  assert.equal(juntar.corpo.ignorados.length, 0);
  const slugsFinais = juntar.corpo.favoritos.map((item) => item.slug).sort();
  assert.deepEqual(slugsFinais, [SLUGS_REAIS[0], SLUGS_REAIS[1], SLUGS_REAIS[2]].sort());

  const lista = await usuario.chamar('/api/favoritos');
  assert.equal(lista.corpo.favoritos.length, 3);
});

test('ignora slug de formato inválido e ferramenta inexistente, mantendo os válidos', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-b@teste.dev');

  const invalidoFormato = 'Slug Inválido!';
  const inexistente = 'ferramenta-que-nao-existe-123';

  const juntar = await usuario.chamar('/api/favoritos/juntar', {
    metodo: 'POST',
    corpo: { slugs: [SLUGS_REAIS[0], invalidoFormato, inexistente, SLUGS_REAIS[1]] },
  });

  assert.equal(juntar.status, 200);
  assert.deepEqual(juntar.corpo.ignorados.sort(), [invalidoFormato, inexistente].sort());
  const slugsFinais = juntar.corpo.favoritos.map((item) => item.slug).sort();
  assert.deepEqual(slugsFinais, [SLUGS_REAIS[0], SLUGS_REAIS[1]].sort());
});

test('duplicado na lista e slug já favoritado não contam duas vezes nem viram ignorados', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-c@teste.dev');

  await usuario.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug: SLUGS_REAIS[0] } });

  const juntar = await usuario.chamar('/api/favoritos/juntar', {
    metodo: 'POST',
    corpo: { slugs: [SLUGS_REAIS[0], SLUGS_REAIS[0], SLUGS_REAIS[1], SLUGS_REAIS[1]] },
  });

  assert.equal(juntar.status, 200);
  assert.equal(juntar.corpo.ignorados.length, 0, 'nem duplicado nem já-favoritado é "ignorado"');
  assert.equal(juntar.corpo.favoritos.length, 2, 'sem duplicar linhas de favorito');
  const slugsFinais = juntar.corpo.favoritos.map((item) => item.slug).sort();
  assert.deepEqual(slugsFinais, [SLUGS_REAIS[0], SLUGS_REAIS[1]].sort());
});

test('respeita o limite de 10 favoritos do plano Grátis, ignorando o excedente', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-d@teste.dev');

  assert.ok(SLUGS_REAIS.length >= 12, 'precisa de pelo menos 12 slugs reais para este teste');

  const juntar = await usuario.chamar('/api/favoritos/juntar', {
    metodo: 'POST',
    corpo: { slugs: SLUGS_REAIS.slice(0, 12) },
  });

  assert.equal(juntar.status, 200);
  assert.equal(juntar.corpo.favoritos.length, 10, 'para no limite do plano Grátis');
  assert.deepEqual(juntar.corpo.ignorados.sort(), SLUGS_REAIS.slice(10, 12).sort());

  const conta = await usuario.chamar('/api/conta');
  assert.equal(conta.corpo.uso.favoritos, 10);
});

test('respeita o limite quando a conta já tem favoritos: só entra o que sobra de vaga', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-e@teste.dev');

  // Preenche 8 vagas primeiro, direto pela rota normal de favoritar.
  for (const slug of SLUGS_REAIS.slice(0, 8)) {
    const resposta = await usuario.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug } });
    assert.equal(resposta.status, 201);
  }

  // Tenta juntar mais 5 (SLUGS_REAIS[8..12]): só 2 cabem até o limite de 10.
  const novos = SLUGS_REAIS.slice(8, 13);
  const juntar = await usuario.chamar('/api/favoritos/juntar', { metodo: 'POST', corpo: { slugs: novos } });

  assert.equal(juntar.status, 200);
  assert.equal(juntar.corpo.favoritos.length, 10);
  assert.deepEqual(juntar.corpo.ignorados.sort(), novos.slice(2).sort());
});

test('corpo com "slugs" vazio ou acima de 50 itens responde 400 dados_invalidos', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-f@teste.dev');

  const vazio = await usuario.chamar('/api/favoritos/juntar', { metodo: 'POST', corpo: { slugs: [] } });
  assert.equal(vazio.status, 400);
  assert.equal(vazio.corpo.erro, 'dados_invalidos');
  assert.equal(vazio.corpo.campos.slugs, 'formato_invalido');

  const demais = Array.from({ length: 51 }, (_, indice) => `slug-${indice}`);
  const grandeDemais = await usuario.chamar('/api/favoritos/juntar', { metodo: 'POST', corpo: { slugs: demais } });
  assert.equal(grandeDemais.status, 400);
  assert.equal(grandeDemais.corpo.erro, 'dados_invalidos');

  const semLista = await usuario.chamar('/api/favoritos/juntar', { metodo: 'POST', corpo: {} });
  assert.equal(semLista.status, 400);
});

test('sem sessão responde 401 e sem CSRF responde 403', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'juntar-g@teste.dev');

  await usuario.chamar('/api/autenticacao/sair', { metodo: 'POST' });
  const semSessao = await usuario.chamar('/api/favoritos/juntar', { metodo: 'POST', corpo: { slugs: [SLUGS_REAIS[0]] } });
  assert.equal(semSessao.status, 401);
  assert.equal(semSessao.corpo.erro, 'sessao_necessaria');

  const outroUsuario = await criarUsuario(ambiente.base, 'juntar-h@teste.dev');
  const semCsrf = await outroUsuario.chamar('/api/favoritos/juntar', {
    metodo: 'POST',
    corpo: { slugs: [SLUGS_REAIS[0]] },
    semCsrf: true,
  });
  assert.equal(semCsrf.status, 403);
  assert.equal(semCsrf.corpo.erro, 'csrf_invalido');
});
