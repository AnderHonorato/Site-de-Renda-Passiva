/** Utilidades de texto usadas por todo o portal. */

/**
 * Remove acentos e baixa a caixa, para comparação e busca.
 * @param {unknown} valor
 * @returns {string}
 */
export function achatar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Escapa texto para inserção segura em HTML.
 * @param {unknown} valor
 * @returns {string}
 */
export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Divide um texto em termos de busca, ignorando partículas curtas.
 * @param {string} texto
 * @returns {string[]}
 */
export function termos(texto) {
  const descartáveis = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'para', 'por', 'com', 'um', 'uma', 'que', 'meu', 'minha']);
  return achatar(texto)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !descartáveis.has(t));
}

/**
 * Converte um número escrito por pessoa ("1.234,56", "1234.56", "12%") em número.
 * Devolve NaN quando não é possível interpretar.
 * @param {unknown} valor
 * @returns {number}
 */
export function paraNúmero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN;
  let texto = String(valor ?? '').trim().replace(/\s|R\$|%/g, '');
  if (!texto) return NaN;
  const temVírgula = texto.includes(',');
  const temPonto = texto.includes('.');
  if (temVírgula && temPonto) {
    // O separador decimal é o último que aparece.
    texto = texto.lastIndexOf(',') > texto.lastIndexOf('.')
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '');
  } else if (temVírgula) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (temPonto && /\.\d{3}(\D|$)/.test(texto) && !/\.\d{1,2}$/.test(texto)) {
    // "1.234" é milhar, não decimal.
    texto = texto.replace(/\./g, '');
  }
  const número = Number(texto);
  return Number.isFinite(número) ? número : NaN;
}

/**
 * Pluraliza uma palavra conforme a quantidade.
 * @param {number} quantidade
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
export function plural(quantidade, singular, plural) {
  return quantidade === 1 ? singular : plural;
}
