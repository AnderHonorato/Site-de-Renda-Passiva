/**
 * Remover páginas do PDF: devolve o PDF só com as páginas que NÃO foram marcadas.
 *
 * Comportamento a partir da pesquisa do iLovePDF (documentação/pesquisa-ilovepdf/a-organizar.md):
 * lá, apagar todas as páginas só falha no servidor, depois do envio ("fora de alcance");
 * aqui a recusa vem antes, no campo, com o que fazer.
 */
import {
  interpretarPáginas, montarPdfComPáginas, nomeBase, mensagemDeErro,
} from './páginas-do-pdf.js';

/**
 * @param {{documento: any, total: number, nome: string}} aberto PDF já aberto por `abrirPdf`
 * @param {string} texto páginas a remover, como "1, 3-5, 9"
 * @param {{biblioteca: {PDFDocument: any}}} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, antes: number, depois: number, removidas: number[], nomeSugerido: string}
 *   | {ok: false, erro: string, campo: 'páginas'|'arquivo', mensagem: string}
 * >}
 */
export async function removerPáginas({ documento, total, nome }, texto, { biblioteca }) {
  const lidas = interpretarPáginas(texto, total, { ordem: 'crescente' });
  if (!lidas.ok) return { ok: false, erro: lidas.erro, campo: 'páginas', mensagem: mensagemDeErro(lidas.erro, lidas.extras) };

  const removidas = lidas.páginas;
  if (removidas.length >= total) {
    return { ok: false, erro: 'tudo_removido', campo: 'páginas', mensagem: mensagemDeErro('tudo_removido') };
  }

  const apagar = new Set(removidas);
  const mantidas = [];
  for (let página = 1; página <= total; página++) if (!apagar.has(página)) mantidas.push(página - 1);

  let bytes;
  try {
    bytes = await montarPdfComPáginas(documento, mantidas, { biblioteca });
  } catch {
    return { ok: false, erro: 'falha_ao_montar', campo: 'arquivo', mensagem: mensagemDeErro('falha_ao_montar') };
  }
  return {
    ok: true,
    bytes,
    antes: total,
    depois: mantidas.length,
    removidas,
    nomeSugerido: `${nomeBase(nome)}-sem-paginas`,
  };
}
