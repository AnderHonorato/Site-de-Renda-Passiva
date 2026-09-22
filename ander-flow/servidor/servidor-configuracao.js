// servidor-configuracao.js — lê o ambiente e devolve um objeto de configuração congelado.
// Ver docs/contratos.md §8.1.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const AMBIENTES_VALIDOS = ['desenvolvimento', 'producao'];
const NIVEIS_LOG_VALIDOS = ['debug', 'info', 'aviso', 'erro'];
const MODOS_EMAIL_VALIDOS = ['arquivo'];

// Portas nunca escolhidas automaticamente (usadas por outras ferramentas de desenvolvimento).
const PORTAS_PROIBIDAS = Object.freeze([3000, 3001, 4200, 5000, 5173, 5500, 8000, 8080, 8888]);

/**
 * Carrega a configuração do servidor a partir de um objeto tipo `process.env`.
 * Nunca lança para valores ausentes (usa padrão); lança Error com mensagem clara
 * para valores presentes mas inválidos.
 *
 * @param {NodeJS.ProcessEnv} ambiente
 * @returns {Readonly<object>}
 */
export function carregarConfiguracao(ambiente = process.env) {
  carregarArquivoEnv();

  const modo = valorOuPadrao(ambiente.AMBIENTE, 'desenvolvimento');
  if (!AMBIENTES_VALIDOS.includes(modo)) {
    throw new Error(`AMBIENTE inválido: "${modo}". Use um de: ${AMBIENTES_VALIDOS.join(', ')}.`);
  }

  const porta = inteiroOuPadrao(ambiente.PORTA, 4870, 'PORTA');
  const portaFinal = inteiroOuPadrao(ambiente.PORTA_FINAL, 4889, 'PORTA_FINAL');
  if (portaFinal < porta) {
    throw new Error(`PORTA_FINAL (${portaFinal}) não pode ser menor que PORTA (${porta}).`);
  }

  const sessaoDias = inteiroOuPadrao(ambiente.SESSAO_DIAS, 30, 'SESSAO_DIAS');

  const logNivel = valorOuPadrao(ambiente.LOG_NIVEL, 'info');
  if (!NIVEIS_LOG_VALIDOS.includes(logNivel)) {
    throw new Error(`LOG_NIVEL inválido: "${logNivel}". Use um de: ${NIVEIS_LOG_VALIDOS.join(', ')}.`);
  }

  const emailModo = valorOuPadrao(ambiente.EMAIL_MODO, 'arquivo');
  if (!MODOS_EMAIL_VALIDOS.includes(emailModo)) {
    throw new Error(`EMAIL_MODO inválido: "${emailModo}". Use um de: ${MODOS_EMAIL_VALIDOS.join(', ')}.`);
  }

  const trustProxy = booleanoOuPadrao(ambiente.TRUST_PROXY, false, 'TRUST_PROXY');

  const bancoCaminhoBruto = valorOuPadrao(ambiente.BANCO_CAMINHO, join('banco', 'dados', 'ander-flow.sqlite'));
  const bancoCaminho = isAbsolute(bancoCaminhoBruto) ? bancoCaminhoBruto : join(raizProjeto, bancoCaminhoBruto);

  const emProducao = modo === 'producao';
  const urlPublica = valorOuPadrao(ambiente.URL_PUBLICA, `http://localhost:${porta}`);

  const planos = lerPlanos();

  return Object.freeze({
    raiz: raizProjeto,
    porta,
    portaFinal,
    portasProibidas: PORTAS_PROIBIDAS,
    ambiente: modo,
    emProducao,
    trustProxy,
    bancoCaminho,
    sessaoDias,
    urlPublica,
    emailModo,
    logNivel,
    pastaExecucao: join(raizProjeto, '.execucao'),
    limiteCorpo: '100kb',
    planos,
  });
}

function carregarArquivoEnv() {
  const caminhoEnv = join(raizProjeto, '.env');
  if (!existsSync(caminhoEnv)) return;
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(caminhoEnv);
    } catch {
      // .env malformado: segue com o que já estiver em process.env.
    }
  }
}

function lerPlanos() {
  const caminho = join(raizProjeto, 'servidor', 'servidor-planos.json');
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new Error(`Não consegui ler servidor/servidor-planos.json: ${erro.message}`);
  }
}

function valorOuPadrao(valor, padrao) {
  return valor === undefined || valor === '' ? padrao : valor;
}

function inteiroOuPadrao(valor, padrao, nome) {
  if (valor === undefined || valor === '') return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${nome} inválida: "${valor}". Informe um número inteiro positivo.`);
  }
  return numero;
}

function booleanoOuPadrao(valor, padrao, nome) {
  if (valor === undefined || valor === '') return padrao;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  throw new Error(`${nome} inválido: "${valor}". Use "true" ou "false".`);
}
