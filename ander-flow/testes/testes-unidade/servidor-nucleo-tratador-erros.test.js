import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarErro } from '../../servidor/servidor-erros.js';
import { criarTratadorErros } from '../../servidor/servidor-tratador-erros.js';

function criarRespostaFalsa() {
  const res = {
    status(codigo) {
      res.statusCode = codigo;
      return res;
    },
    set(nome, valor) {
      res.cabecalhos = res.cabecalhos ?? {};
      res.cabecalhos[nome] = valor;
      return res;
    },
    json(corpo) {
      res.corpoJson = corpo;
      return res;
    },
    type() {
      return res;
    },
    send(corpo) {
      res.corpoTexto = corpo;
      return res;
    },
    headersSent: false,
  };
  return res;
}

test('tratador: erro com código na API devolve JSON com status e extras', () => {
  const contexto = { registrarLog() {} };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/api/ferramentas/xyz', path: '/api/ferramentas/xyz' };
  const res = criarRespostaFalsa();

  tratador(criarErro(404, 'ferramenta_inexistente'), req, res, () => {
    throw new Error('não deveria chamar next()');
  });

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.corpoJson, { erro: 'ferramenta_inexistente' });
});

test('tratador: erro de validação inclui extras (campos)', () => {
  const contexto = { registrarLog() {} };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/api/autenticacao/criar-conta', path: '/api/autenticacao/criar-conta' };
  const res = criarRespostaFalsa();

  tratador(criarErro(400, 'dados_invalidos', { campos: { email: 'email_invalido' } }), req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.corpoJson, { erro: 'dados_invalidos', campos: { email: 'email_invalido' } });
});

test('tratador: erro desconhecido na API vira 500 genérico, sem vazar detalhe', () => {
  const logados = [];
  const contexto = { registrarLog: (...args) => logados.push(args) };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/api/qualquer', path: '/api/qualquer' };
  const res = criarRespostaFalsa();

  tratador(new Error('detalhe sensível do banco'), req, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.corpoJson, { erro: 'erro_interno' });
  assert.equal(JSON.stringify(res.corpoJson).includes('sensível'), false);
  // O detalhe foi para o log, não para o cliente.
  assert.equal(logados.length, 1);
  assert.equal(logados[0][0], 'erro');
});

test('tratador: 429 sempre grava Retry-After e tentar_de_novo_em_segundos na API', () => {
  const contexto = { registrarLog() {} };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/api/autenticacao/entrar', path: '/api/autenticacao/entrar' };
  const res = criarRespostaFalsa();

  tratador(criarErro(429, 'muitas_tentativas', { tentar_de_novo_em_segundos: 42, minutos: 1 }), req, res, () => {});

  assert.equal(res.statusCode, 429);
  assert.equal(res.cabecalhos['Retry-After'], '42');
  assert.deepEqual(res.corpoJson, { erro: 'muitas_tentativas', tentar_de_novo_em_segundos: 42, minutos: 1 });
});

test('tratador: página (fora de /api/) usa montador.renderizarErro', () => {
  const chamadas = [];
  const contexto = {
    registrarLog() {},
    montador: {
      renderizarErro(req, res, status, variaveis) {
        chamadas.push({ status, variaveis });
        res.status(status).send('pagina-erro');
      },
    },
  };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/ferramentas/nao-existe', path: '/ferramentas/nao-existe' };
  const res = criarRespostaFalsa();

  tratador(criarErro(404, 'pagina_inexistente'), req, res, () => {});

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].status, 404);
  assert.equal(chamadas[0].variaveis.codigo, 'pagina_inexistente');
  assert.equal(res.corpoTexto, 'pagina-erro');
});

test('tratador: se os cabeçalhos já foram enviados, só propaga (next)', () => {
  const contexto = { registrarLog() {} };
  const tratador = criarTratadorErros(contexto);
  const req = { originalUrl: '/api/x', path: '/api/x' };
  const res = criarRespostaFalsa();
  res.headersSent = true;

  let propagou = false;
  tratador(criarErro(500, 'erro_interno'), req, res, () => {
    propagou = true;
  });

  assert.equal(propagou, true);
  assert.equal(res.corpoJson, undefined);
});
