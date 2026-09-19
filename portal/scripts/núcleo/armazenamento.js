/**
 * Armazenamento local do portal.
 *
 * Tudo fica no navegador de quem usa. Nada é enviado a servidor.
 * A leitura é defensiva: dado corrompido ou adulterado nunca derruba a página,
 * e chaves perigosas de protótipo são descartadas na desserialização.
 */

const PREFIXO = 'portal.';
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

function disponível() {
  try {
    const teste = `${PREFIXO}teste`;
    localStorage.setItem(teste, '1');
    localStorage.removeItem(teste);
    return true;
  } catch {
    return false;
  }
}

const ATIVO = typeof localStorage !== 'undefined' && disponível();

/** Analisa JSON descartando chaves que poluem o protótipo. */
function analisarSeguro(texto) {
  return JSON.parse(texto, (chave, valor) => (CHAVES_PROIBIDAS.has(chave) ? undefined : valor));
}

/**
 * Lê um valor salvo.
 * @template T
 * @param {string} chave
 * @param {T} padrão valor devolvido quando não existe ou está corrompido
 * @returns {T}
 */
export function ler(chave, padrão) {
  if (!ATIVO) return padrão;
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    if (bruto === null) return padrão;
    const valor = analisarSeguro(bruto);
    return valor === undefined || valor === null ? padrão : valor;
  } catch {
    return padrão;
  }
}

/**
 * Grava um valor. Devolve false quando o navegador recusa (modo privado, cota cheia).
 * @param {string} chave
 * @param {unknown} valor
 * @returns {boolean}
 */
export function gravar(chave, valor) {
  if (!ATIVO) return false;
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/**
 * Apaga uma chave.
 * @param {string} chave
 */
export function apagar(chave) {
  if (!ATIVO) return;
  try {
    localStorage.removeItem(PREFIXO + chave);
  } catch { /* nada a fazer */ }
}

/**
 * Exporta tudo o que o portal guardou neste aparelho, para backup.
 * @returns {{versão: number, gerado: string, dados: Record<string, unknown>}}
 */
export function exportarTudo() {
  const dados = {};
  if (ATIVO) {
    for (let i = 0; i < localStorage.length; i += 1) {
      const chave = localStorage.key(i);
      if (!chave || !chave.startsWith(PREFIXO)) continue;
      try {
        dados[chave.slice(PREFIXO.length)] = analisarSeguro(localStorage.getItem(chave));
      } catch { /* entrada corrompida: fica de fora da cópia */ }
    }
  }
  return { versão: 1, gerado: new Date().toISOString(), dados };
}

/**
 * Importa uma cópia gerada por `exportarTudo`.
 * @param {unknown} conteúdo
 * @returns {{importadas: number, ignoradas: number}}
 * @throws {Error} quando o arquivo não tem o formato esperado
 */
export function importarTudo(conteúdo) {
  if (!conteúdo || typeof conteúdo !== 'object') throw new Error('Arquivo inválido.');
  const { versão, dados } = /** @type {any} */ (conteúdo);
  if (versão !== 1 || !dados || typeof dados !== 'object') {
    throw new Error('Este arquivo não é uma cópia do portal.');
  }
  let importadas = 0;
  let ignoradas = 0;
  for (const [chave, valor] of Object.entries(dados)) {
    if (CHAVES_PROIBIDAS.has(chave) || !/^[\w.\-]{1,60}$/.test(chave)) { ignoradas += 1; continue; }
    if (gravar(chave, valor)) importadas += 1; else ignoradas += 1;
  }
  return { importadas, ignoradas };
}

/** Informa se o navegador aceita guardar dados. */
export const armazenamentoAtivo = ATIVO;
