// seguranca-senha.js — hash e verificação de senha com scrypt (§9.4 dos contratos).
// Formato armazenado: 'scrypt$<N>$<r>$<p>$<sal em base64>$<hash em base64>'.
import { randomBytes, scrypt as scryptAssincrono, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptAssincrono);

const CUSTO_N = 16384;
const PARALELISMO_R = 8;
const PARALELISMO_P = 1;
const TAMANHO_SAL = 16;
const TAMANHO_HASH = 64;
const MEMORIA_MAXIMA = 32 * 1024 * 1024; // 32 MiB — cobre N=16384 r=8 (16 MiB) com margem.
const PREFIXO = 'scrypt';

/** Gera o hash de uma senha em texto puro. Nunca lança para entrada válida. */
export async function gerarHashSenha(senha) {
  if (typeof senha !== 'string' || senha.length === 0) {
    throw new TypeError('senha deve ser uma string não vazia');
  }
  const sal = randomBytes(TAMANHO_SAL);
  const hash = await scrypt(senha, sal, TAMANHO_HASH, {
    N: CUSTO_N,
    r: PARALELISMO_R,
    p: PARALELISMO_P,
    maxmem: MEMORIA_MAXIMA,
  });
  return [
    PREFIXO,
    CUSTO_N,
    PARALELISMO_R,
    PARALELISMO_P,
    sal.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/**
 * Verifica senha contra hash armazenado, em tempo constante.
 * Formato inválido (ou qualquer erro de decodificação/derivação) → false, nunca lança.
 */
export async function verificarSenha(senha, hashArmazenado) {
  if (typeof senha !== 'string' || typeof hashArmazenado !== 'string') return false;

  const partes = hashArmazenado.split('$');
  if (partes.length !== 6) return false;
  const [prefixo, nTexto, rTexto, pTexto, salBase64, hashBase64] = partes;
  if (prefixo !== PREFIXO) return false;

  const n = Number(nTexto);
  const r = Number(rTexto);
  const p = Number(pTexto);
  if (![n, r, p].every((valor) => Number.isInteger(valor) && valor > 0)) return false;
  // Custo (128 * N * r * p) fora de um teto razoável: recusa em vez de gastar memória/CPU.
  if (128 * n * r * p > MEMORIA_MAXIMA) return false;

  let sal;
  let hashEsperado;
  try {
    sal = Buffer.from(salBase64, 'base64');
    hashEsperado = Buffer.from(hashBase64, 'base64');
  } catch {
    return false;
  }
  if (sal.length === 0 || hashEsperado.length === 0) return false;

  let hashCalculado;
  try {
    hashCalculado = await scrypt(senha, sal, hashEsperado.length, {
      N: n,
      r,
      p,
      maxmem: MEMORIA_MAXIMA,
    });
  } catch {
    return false;
  }

  if (hashCalculado.length !== hashEsperado.length) return false;
  return timingSafeEqual(hashCalculado, hashEsperado);
}
