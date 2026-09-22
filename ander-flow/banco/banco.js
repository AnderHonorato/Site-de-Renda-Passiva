// banco/banco.js — abertura da conexão SQLite (contratos.md §7, §8.1).
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let instancia = null;
let envCarregado = false;

function carregarEnvSePreciso() {
  if (envCarregado) return;
  envCarregado = true;
  const caminhoEnv = path.join(raizProjeto, '.env');
  if (fs.existsSync(caminhoEnv)) {
    process.loadEnvFile(caminhoEnv);
  }
}

function resolverCaminhoPadrao() {
  carregarEnvSePreciso();
  const doAmbiente = process.env.BANCO_CAMINHO;
  if (doAmbiente) {
    if (doAmbiente === ':memory:' || path.isAbsolute(doAmbiente)) return doAmbiente;
    return path.join(raizProjeto, doAmbiente);
  }
  return path.join(raizProjeto, 'banco', 'dados', 'ander-flow.sqlite');
}

/**
 * Abre uma conexão SQLite com os pragmas exigidos pelo contrato.
 * Sem argumento: usa BANCO_CAMINHO (carregando .env se existir) ou o caminho
 * padrão, sempre relativo à raiz do projeto. ':memory:' é aceito para testes.
 */
export function abrirBanco(caminho) {
  const caminhoFinal = caminho ?? resolverCaminhoPadrao();

  if (caminhoFinal !== ':memory:') {
    const pasta = path.dirname(caminhoFinal);
    fs.mkdirSync(pasta, { recursive: true });
  }

  const banco = new Database(caminhoFinal);
  banco.pragma('journal_mode = WAL');
  banco.pragma('foreign_keys = ON');
  banco.pragma('busy_timeout = 5000');
  return banco;
}

/** Instância única do processo (abre se ainda não existir). */
export function obterBanco() {
  if (!instancia) {
    instancia = abrirBanco();
  }
  return instancia;
}

/** Fecha a instância única do processo, se houver. */
export function fecharBanco() {
  if (instancia) {
    instancia.close();
    instancia = null;
  }
}
