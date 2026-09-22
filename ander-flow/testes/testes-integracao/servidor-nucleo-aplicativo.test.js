// Testa a cadeia de middlewares de criarAplicativo() com substitutos simples (sem depender
// de módulos que outros agentes ainda vão escrever — catalogo, idioma, montador, seguranca/*).
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { criarAplicativo } from '../../servidor/servidor.js';
import { criarErro } from '../../servidor/servidor-erros.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function configuracaoDeTeste(extra = {}) {
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
    limiteCorpo: extra.limiteCorpo ?? '100kb',
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
      registrar(app) {
        app.get('/pagina-de-teste', (req, res) => res.status(200).send('ok'));
      },
      renderizarErro(req, res, status, variaveis) {
        res.status(status).json({ paginaErro: true, ...variaveis });
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
      return [
        (app) => {
          app.get('/api/teste/erro-validacao', (req, res, next) => {
            next(criarErro(400, 'dados_invalidos', { campos: { email: 'email_invalido' } }));
          });
          app.get('/api/teste/erro-429', (req, res, next) => {
            next(criarErro(429, 'muitas_tentativas', { tentar_de_novo_em_segundos: 42, minutos: 1 }));
          });
          app.get('/api/teste/erro-desconhecido', () => {
            throw new Error('detalhe interno não deve aparecer na resposta');
          });
          app.post('/api/teste/corpo', (req, res) => {
            res.status(200).json({ recebido: req.body });
          });
        },
      ];
    },
  };
}

async function subirAplicativo(extraConfiguracao = {}) {
  const configuracao = configuracaoDeTeste(extraConfiguracao);
  const { app } = await criarAplicativo({ configuracao, banco: {}, modulos: modulosDeTeste() });
  return new Promise((resolver) => {
    const servidor = app.listen(0, () => {
      const { port } = servidor.address();
      resolver({ servidor, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('criarAplicativo: rota de página registrada pelo montador responde 200', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/pagina-de-teste`);
    assert.equal(resposta.status, 200);
    assert.equal(await resposta.text(), 'ok');
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: erro de validação na API devolve 400 com campos', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/erro-validacao`);
    assert.equal(resposta.status, 400);
    const corpo = await resposta.json();
    assert.deepEqual(corpo, { erro: 'dados_invalidos', campos: { email: 'email_invalido' } });
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: 429 grava Retry-After e tentar_de_novo_em_segundos', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/erro-429`);
    assert.equal(resposta.status, 429);
    assert.equal(resposta.headers.get('retry-after'), '42');
    const corpo = await resposta.json();
    assert.equal(corpo.erro, 'muitas_tentativas');
    assert.equal(corpo.tentar_de_novo_em_segundos, 42);
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: erro desconhecido na API vira 500 sem vazar detalhe', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/erro-desconhecido`);
    assert.equal(resposta.status, 500);
    const corpo = await resposta.json();
    assert.deepEqual(corpo, { erro: 'erro_interno' });
    assert.equal(JSON.stringify(corpo).includes('detalhe interno'), false);
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: rota inexistente na API devolve 404 JSON, fora da API usa a página de erro', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const respostaApi = await fetch(`${baseUrl}/api/nao-existe`);
    assert.equal(respostaApi.status, 404);
    assert.deepEqual(await respostaApi.json(), { erro: 'pagina_inexistente' });

    const respostaPagina = await fetch(`${baseUrl}/rota-que-nao-existe`);
    assert.equal(respostaPagina.status, 404);
    const corpoPagina = await respostaPagina.json();
    assert.equal(corpoPagina.paginaErro, true);
    // O número HTTP é preenchido pelo montador real; aqui o montador é de mentira.
    assert.equal(corpoPagina.codigo_erro, 'pagina_inexistente');
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: corpo JSON válido chega em req.body', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/corpo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'Ander' }),
    });
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { recebido: { nome: 'Ander' } });
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: corpo maior que o limite devolve 413 corpo_grande_demais', async () => {
  const { servidor, baseUrl } = await subirAplicativo({ limiteCorpo: '20b' });
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/corpo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'um valor bem mais longo que vinte bytes' }),
    });
    assert.equal(resposta.status, 413);
    assert.deepEqual(await resposta.json(), { erro: 'corpo_grande_demais' });
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: corpo JSON malformado devolve 400 dados_invalidos', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/api/teste/corpo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ isto nao e json valido',
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: 'dados_invalidos' });
  } finally {
    servidor.close();
  }
});

test('criarAplicativo: /estatico nunca serve .html, mesmo se existisse', async () => {
  const { servidor, baseUrl } = await subirAplicativo();
  try {
    const resposta = await fetch(`${baseUrl}/estatico/paginas/principal/principal.html`);
    assert.equal(resposta.status, 404);
  } finally {
    servidor.close();
  }
});
