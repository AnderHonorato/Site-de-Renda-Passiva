// servidor.js — núcleo do servidor: monta o app Express e, em execução direta, escuta numa porta livre.
// Ver docs/contratos.md §8.3, §8.4, §8.5.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import compression from 'compression';
import express from 'express';

import { carregarConfiguracao } from './servidor-configuracao.js';
import { middlewareCookies } from './servidor-cookies.js';
import { criarErro } from './servidor-erros.js';
import { escutarComTentativas } from './servidor-porta.js';
import { registrarControle } from './servidor-controle.js';
import { criarTratadorErros } from './servidor-tratador-erros.js';

const NIVEIS_LOG = ['debug', 'info', 'aviso', 'erro'];

/**
 * Registrador de log em JSON de uma linha; nunca inclui senha, token ou corpo de requisição.
 * @param {{ logNivel?: string }} configuracao
 */
export function criarRegistrador(configuracao) {
  const minimo = NIVEIS_LOG.indexOf(configuracao?.logNivel ?? 'info');
  return function registrarLog(nivel, evento, dados = {}) {
    if (NIVEIS_LOG.indexOf(nivel) < minimo) return;
    const linha = JSON.stringify({ tempo: new Date().toISOString(), nivel, evento, ...dados });
    if (nivel === 'erro') console.error(linha);
    else console.log(linha);
  };
}

function chaveIpPadrao(req) {
  return req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
}

function criarLeitorCorpoJson(configuracao) {
  const analisador = express.json({ limit: configuracao.limiteCorpo });
  return function leitorCorpoJson(req, res, next) {
    analisador(req, res, (erro) => {
      if (!erro) {
        next();
        return;
      }
      if (erro.type === 'entity.too.large' || erro.status === 413) {
        next(criarErro(413, 'corpo_grande_demais'));
        return;
      }
      if (erro.type === 'entity.parse.failed' || erro instanceof SyntaxError) {
        next(criarErro(400, 'dados_invalidos'));
        return;
      }
      next(erro);
    });
  };
}

/** `/estatico/<caminho>` → `frontend/<caminho>`, exceto .html, "-plus-" e "-manifesto.json" (§3.4). */
function criarMiddlewareEstatico(configuracao) {
  const raizFrontend = join(configuracao.raiz, 'frontend');
  const servirArquivo = express.static(raizFrontend, {
    setHeaders(res) {
      res.setHeader('Cache-Control', configuracao.emProducao ? 'max-age=3600' : 'no-cache');
    },
  });
  return function middlewareEstatico(req, res, next) {
    const caminho = req.path;
    if (caminho.endsWith('.html') || caminho.includes('-plus-') || caminho.endsWith('-manifesto.json')) {
      next();
      return;
    }
    servirArquivo(req, res, next);
  };
}

/** Descoberta automática de `servidor/rotas/<nome>/<nome>-rotas.js`, em ordem alfabética (§8.4). */
async function descobrirRotasPadrao(raiz) {
  const pastaRotas = join(raiz, 'servidor', 'rotas');
  let entradas;
  try {
    entradas = readdirSync(pastaRotas, { withFileTypes: true });
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }

  const nomes = entradas
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const registradores = [];
  for (const nome of nomes) {
    const caminhoArquivo = join(pastaRotas, nome, `${nome}-rotas.js`);
    if (!existsSync(caminhoArquivo)) continue;
    const modulo = await import(pathToFileURL(caminhoArquivo).href);
    if (typeof modulo.default === 'function') registradores.push(modulo.default);
  }
  return registradores;
}

/**
 * Monta o app Express com toda a cadeia de middlewares descrita em §8.3.
 * `modulos` permite injetar substitutos nos testes; sem ele, usa import dinâmico dos caminhos reais.
 * `controle`, se informado ({ token, desligar }), registra a rota interna de desligamento.
 *
 * @param {{ configuracao: object, banco: object, modulos?: object, controle?: { token: string, desligar: Function } }} entrada
 * @returns {Promise<{ app: import('express').Express, contexto: object }>}
 */
export async function criarAplicativo({ configuracao, banco, modulos = {}, controle }) {
  const app = express();
  app.set('trust proxy', configuracao.trustProxy);

  const registrarLog = modulos.registrarLog ?? criarRegistrador(configuracao);

  const aplicarCabecalhos =
    modulos.aplicarCabecalhos ?? (await import('./seguranca/seguranca-cabecalhos.js')).aplicarCabecalhos;
  aplicarCabecalhos(app, configuracao);

  app.use(compression());
  app.use(middlewareCookies);
  app.use(criarLeitorCorpoJson(configuracao));

  if (controle) {
    registrarControle(app, { token: controle.token, desligar: controle.desligar, registrarLog });
  }

  app.use('/estatico', criarMiddlewareEstatico(configuracao));

  const catalogo =
    modulos.catalogo ??
    (await (async () => {
      const { criarCatalogo } = await import('./servidor-catalogo.js');
      return criarCatalogo({ raiz: configuracao.raiz, banco });
    })());

  const idioma =
    modulos.idioma ??
    (await (async () => {
      const { criarIdioma } = await import('./servidor-idioma.js');
      return criarIdioma({ raiz: configuracao.raiz });
    })());

  const montador =
    modulos.montador ??
    (await (async () => {
      const { criarMontador } = await import('./servidor-montador-paginas.js');
      return criarMontador({ raiz: configuracao.raiz, idioma, catalogo, configuracao });
    })());

  const limitador =
    modulos.limitador ??
    (await (async () => {
      const { criarLimitador } = await import('./seguranca/seguranca-limite-trafego.js');
      const { readFileSync } = await import('node:fs');
      const regras = JSON.parse(
        readFileSync(join(configuracao.raiz, 'servidor', 'seguranca', 'seguranca-limite-trafego-regras.json'), 'utf8'),
      );
      return criarLimitador({ banco, regras, registrarLog });
    })());

  const sessao =
    modulos.sessao ??
    (await (async () => {
      const { criarGerenciadorSessao } = await import('./seguranca/seguranca-sessao.js');
      return criarGerenciadorSessao({ banco, configuracao });
    })());

  app.use((req, res, next) => {
    const grupo = req.path.startsWith('/api/') ? 'api' : 'paginas';
    limitador.middleware(grupo, { chave: chaveIpPadrao })(req, res, next);
  });

  const middlewareCsrf =
    modulos.middlewareCsrf ?? (await import('./seguranca/seguranca-csrf.js')).middlewareCsrf;
  app.use(middlewareCsrf(configuracao));

  app.use(sessao.middleware);

  const contexto = { configuracao, banco, limitador, sessao, catalogo, idioma, montador, registrarLog };

  const descobrirRotas = modulos.descobrirRotas ?? descobrirRotasPadrao;
  const registradores = await descobrirRotas(configuracao.raiz);
  for (const registrar of registradores) registrar(app, contexto);

  montador.registrar(app, contexto);

  app.use((req, res, next) => {
    next(criarErro(404, 'pagina_inexistente'));
  });

  app.use(criarTratadorErros(contexto));

  return { app, contexto };
}

async function desligarComLimpeza({ referenciaServidor, banco, configuracao, registrarLog }) {
  registrarLog?.('info', 'desligando', {});

  await new Promise((resolver) => {
    const servidorHttp = referenciaServidor.servidorHttp;
    if (!servidorHttp) {
      resolver();
      return;
    }
    let concluido = false;
    const finalizar = () => {
      if (concluido) return;
      concluido = true;
      clearTimeout(forcar);
      resolver();
    };
    servidorHttp.close(finalizar);
    const forcar = setTimeout(() => {
      servidorHttp.closeAllConnections?.();
    }, 5000);
  });

  try {
    banco?.close?.();
  } catch {
    // já fechado — sem problema.
  }

  try {
    const caminhoPorta = join(configuracao.pastaExecucao, 'servidor.porta');
    if (existsSync(caminhoPorta)) rmSync(caminhoPorta);
  } catch {
    // limpeza best-effort.
  }

  process.exit(0);
}

async function iniciarDiretamente() {
  const configuracao = carregarConfiguracao();
  mkdirSync(configuracao.pastaExecucao, { recursive: true });

  const { abrirBanco } = await import('../banco/banco.js');
  const { migrar } = await import('../banco/banco-migrador.js');
  const banco = abrirBanco(configuracao.bancoCaminho);
  migrar(banco);

  const registrarLog = criarRegistrador(configuracao);
  const referenciaServidor = {};
  const token = process.env.TOKEN_CONTROLE ?? randomBytes(32).toString('base64url');

  const { app } = await criarAplicativo({
    configuracao,
    banco,
    modulos: { registrarLog },
    controle: {
      token,
      desligar: () => desligarComLimpeza({ referenciaServidor, banco, configuracao, registrarLog }),
    },
  });

  const servidorHttp = http.createServer(app);
  servidorHttp.headersTimeout = 15000;
  servidorHttp.requestTimeout = 30000;
  servidorHttp.maxHeaderSize = 16 * 1024;
  referenciaServidor.servidorHttp = servidorHttp;

  let desligando = false;
  const tratarSinal = () => {
    if (desligando) return;
    desligando = true;
    desligarComLimpeza({ referenciaServidor, banco, configuracao, registrarLog });
  };
  process.on('SIGINT', tratarSinal);
  process.on('SIGTERM', tratarSinal);

  const { porta, tentadas } = await escutarComTentativas(servidorHttp, {
    inicial: configuracao.porta,
    final: configuracao.portaFinal,
    proibidas: configuracao.portasProibidas,
  });

  writeFileSync(join(configuracao.pastaExecucao, 'servidor.porta'), String(porta));

  const portaInicial = tentadas[0];
  const mensagem =
    porta === portaInicial
      ? `Ander Flow rodando em http://localhost:${porta}`
      : `Ander Flow rodando em http://localhost:${porta} (a ${portaInicial} estava ocupada)`;
  console.log(mensagem);
  registrarLog('info', 'servidor_iniciado', { porta });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  iniciarDiretamente().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
