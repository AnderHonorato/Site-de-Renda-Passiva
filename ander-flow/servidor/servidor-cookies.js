// servidor-cookies.js — leitura defensiva de cookies HTTP sem dependências externas.
// Entradas inválidas são ignoradas sem interromper o processamento das seguintes.

const TAMANHO_MAXIMO_CABECALHO = 16 * 1024;
const NOME_VALIDO = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const NOMES_RESERVADOS = new Set(['__proto__', 'constructor', 'prototype']);
const CARACTERES_CONTROLE = /[\u0000-\u001f\u007f]/;

/** Interpreta o cabeçalho Cookie em um objeto sem protótipo. */
export function analisarCookies(cabecalho) {
  const cookies = Object.create(null);
  if (typeof cabecalho !== 'string' || cabecalho.length > TAMANHO_MAXIMO_CABECALHO) return cookies;

  for (const parte of cabecalho.split(';')) {
    const igual = parte.indexOf('=');
    if (igual <= 0) continue;
    const nome = parte.slice(0, igual).trim();
    if (!NOME_VALIDO.test(nome) || NOMES_RESERVADOS.has(nome)) continue;
    const bruto = parte.slice(igual + 1).trim();
    let valor;
    try {
      valor = decodeURIComponent(bruto);
    } catch {
      continue;
    }
    if (CARACTERES_CONTROLE.test(valor)) continue;
    // O primeiro cookie prevalece: duplicatas não sobrescrevem sessão/CSRF.
    if (!Object.hasOwn(cookies, nome)) cookies[nome] = valor;
  }
  return cookies;
}

/** Middleware Express: preenche req.cookies. */
export function middlewareCookies(req, res, next) {
  req.cookies = analisarCookies(req.headers.cookie);
  next();
}
