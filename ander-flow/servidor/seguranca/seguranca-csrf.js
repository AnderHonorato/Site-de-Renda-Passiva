// seguranca-csrf.js — CSRF de submissão dupla (§9.3 dos contratos).
// Toda requisição sem cookie af_csrf recebe um token novo. Métodos que alteram dados em
// /api/* precisam repetir o token no cabeçalho X-CSRF-Token (comparação em tempo constante).
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { criarErro } from '../servidor-erros.js';

const NOME_COOKIE = 'af_csrf';
const NOME_CABECALHO = 'x-csrf-token';
const METODOS_PROTEGIDOS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function tokenValido(valor) {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{43}$/.test(valor)
    && Buffer.from(valor, 'base64url').toString('base64url') === valor;
}

function tokenAleatorio() {
  return randomBytes(32).toString('base64url');
}

/**
 * Compara duas strings em tempo constante independente do tamanho, comparando o hash de
 * cada uma (evita o vazamento de tamanho que `timingSafeEqual` teria com buffers desiguais).
 */
function compararTempoConstante(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

function precisaDeToken(req) {
  return METODOS_PROTEGIDOS.has(req.method) && (req.path === '/api' || req.path.startsWith('/api/'));
}

export function middlewareCsrf(configuracao = {}) {
  return function csrf(req, res, next) {
    let token = req.cookies?.[NOME_COOKIE];
    // Cookies inválidos ou excessivos não devem ser aceitos nem processados no hash.
    if (!tokenValido(token)) {
      token = tokenAleatorio();
      res.cookie(NOME_COOKIE, token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: Boolean(configuracao.emProducao),
        path: '/',
      });
      req.cookies = { ...(req.cookies ?? {}), [NOME_COOKIE]: token };
    }

    if (!precisaDeToken(req)) return next();

    const recebido = req.get(NOME_CABECALHO);
    if (!tokenValido(recebido)) {
      return next(criarErro(403, 'csrf_invalido'));
    }
    if (!compararTempoConstante(token, recebido ?? '')) {
      return next(criarErro(403, 'csrf_invalido'));
    }
    next();
  };
}
