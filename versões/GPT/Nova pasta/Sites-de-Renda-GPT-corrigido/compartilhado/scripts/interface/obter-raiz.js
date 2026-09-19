// compartilhado/scripts/interface/obter-raiz.js

/**
 * Lê o prefixo relativo até a raiz do site, gravado pelo gerador em
 * `<html data-raiz="…">` (ex.: './' na página inicial, '../' num nível abaixo).
 * @returns {string}
 */
export function obterRaiz() {
  const raiz = document.documentElement.getAttribute('data-raiz');
  return raiz || './';
}
