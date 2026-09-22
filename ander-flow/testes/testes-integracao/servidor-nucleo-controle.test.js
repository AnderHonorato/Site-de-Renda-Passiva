// Testa a rota POST /__controle/desligar já ligada na cadeia real de criarAplicativo().
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { criarAplicativo } from '../../servidor/servidor.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function configuracaoDeTeste() {
  return Object.freeze({
    raiz: raizProjeto,
    porta: 4870,
    portaFinal: 4889,
    portasProibidas: [],
    ambiente: 'desenvolvimento',
    emProducao: false,
    trustProxy: false,
    bancoCaminho: ':memory:',
    sessaoDias: 30,
    urlPublica: 'http://localhost:4870',
    emailModo: 'arquivo',
    logNivel: 'erro',
    pastaExecucao: join(raizProjeto, '.execucao'),
    limiteCorpo: '100kb',
    planos: { moeda: 'BRL', pagamento_integrado: false, planos: [] },
  });
}

function modulosDeTeste() {
  return {
    registrarLog() {},
    aplicarCabecalhos() {},
    catalogo: {},
    idioma: {},
    montador: {
      registrar() {},
      renderizarErro(req, res, status, variaveis) {
        res.status(status).json(variaveis);
      },
    },
    limitador: {
      middleware() {
        return (req, res, next) => next();
      },
    },
    sessao: {
      middleware(req, res, next) {
        next();
      },
    },
    middlewareCsrf() {
      return (req, res, next) => next();
    },
    async descobrirRotas() {
      return [];
    },
  };
}

async function subirComControle(desligar) {
  const configuracao = configuracaoDeTeste();
  const { app } = await criarAplicativo({
    configuracao,
    banco: {},
    modulos: modulosDeTeste(),
    controle: { token: 'token-secreto-de-teste', desligar },
  });
  return new Promise((resolver) => {
    const servidor = app.listen(0, () => {
      const { port } = servidor.address();
      resolver({ servidor, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('/__controle/desligar: token certo devolve 204 e chama desligar()', async () => {
  let chamado = false;
  const { servidor, baseUrl } = await subirComControle(() => {
    chamado = true;
  });
  try {
    const resposta = await fetch(`${baseUrl}/__controle/desligar`, {
      method: 'POST',
      headers: { 'X-Token-Controle': 'token-secreto-de-teste' },
    });
    assert.equal(resposta.status, 204);
    // desligar() é chamado com setImmediate, depois da resposta sair.
    await new Promise((r) => setImmediate(r));
    assert.equal(chamado, true);
  } finally {
    servidor.close();
  }
});

test('/__controle/desligar: token errado devolve 403 e não desliga', async () => {
  let chamado = false;
  const { servidor, baseUrl } = await subirComControle(() => {
    chamado = true;
  });
  try {
    const resposta = await fetch(`${baseUrl}/__controle/desligar`, {
      method: 'POST',
      headers: { 'X-Token-Controle': 'token-errado' },
    });
    assert.equal(resposta.status, 403);
    await new Promise((r) => setImmediate(r));
    assert.equal(chamado, false);
  } finally {
    servidor.close();
  }
});

test('/__controle/desligar: sem token devolve 403', async () => {
  const { servidor, baseUrl } = await subirComControle(() => {});
  try {
    const resposta = await fetch(`${baseUrl}/__controle/desligar`, { method: 'POST' });
    assert.equal(resposta.status, 403);
  } finally {
    servidor.close();
  }
});
