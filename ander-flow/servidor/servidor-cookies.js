// servidor-cookies.js — leitor de cookies próprio e simples (sem dependência externa).
// Preenche req.cookies. Ver docs/contratos.md §8.3 (ordem dos middlewares).

/**
 * Interpreta o cabeçalho `Cookie: nome=valor; nome2=valor2` num objeto simples.
 * Nunca lança: entradas malformadas são ignoradas.
 * @param {string | undefined} cabecalho
 * @returns {Record<string, string>}
 */
export function analisarCookies(cabecalho) {
  const cookies = {};
  if (!cabecalho) return cookies;

  for (const parte of cabecalho.split(';')) {
    const posicaoIgual = parte.indexOf('=');
    if (posicaoIgual === -1) continue;
    const nome = parte.slice(0, posicaoIgual).trim();
    if (!nome) continue;
    const valorBruto = parte.slice(posicaoIgual + 1).trim();
    try {
      cookies[nome] = decodeURIComponent(valorBruto);
    } catch {
      cookies[nome] = valorBruto;
    }
  }
  return cookies;
}

/** Middleware Express: preenche `req.cookies`. */
export function middlewareCookies(req, res, next) {
  req.cookies = analisarCookies(req.headers.cookie);
  next();
}
