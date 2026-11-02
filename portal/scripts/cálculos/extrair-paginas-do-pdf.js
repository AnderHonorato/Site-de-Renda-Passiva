/**
 * Extrair páginas do PDF: cria um PDF novo só com as páginas pedidas, NA ORDEM EM QUE FORAM DIGITADAS.
 *
 * No iLovePDF, "extrair" é uma aba de Dividir e não ficou claro se a ordem digitada é respeitada
 * (documentação/pesquisa-ilovepdf/a-organizar.md, A4). Aqui é: "8, 2-3" dá as páginas 8, 2 e 3.
 * Página repetida entra repetida, com aviso, porque quase sempre é engano de digitação.
 */
import {
  interpretarPáginas, montarPdfComPáginas, nomeBase, mensagemDeErro,
} from './páginas-do-pdf.js';

/**
 * @param {{documento: any, total: number, nome: string}} aberto PDF já aberto por `abrirPdf`
 * @param {string} texto páginas a extrair, como "2, 4-7, 10"
 * @param {{biblioteca: {PDFDocument: any}}} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, total: number, extraídas: number[], repetidas: number[], nomeSugerido: string}
 *   | {ok: false, erro: string, campo: 'páginas'|'arquivo', mensagem: string}
 * >}
 */
export async function extrairPáginas({ documento, total, nome }, texto, { biblioteca }) {
  const lidas = interpretarPáginas(texto, total, { ordem: 'digitada' });
  if (!lidas.ok) return { ok: false, erro: lidas.erro, campo: 'páginas', mensagem: mensagemDeErro(lidas.erro, lidas.extras) };

  let bytes;
  try {
    bytes = await montarPdfComPáginas(documento, lidas.páginas.map((página) => página - 1), { biblioteca });
  } catch {
    return { ok: false, erro: 'falha_ao_montar', campo: 'arquivo', mensagem: mensagemDeErro('falha_ao_montar') };
  }
  return {
    ok: true,
    bytes,
    total,
    extraídas: lidas.páginas,
    repetidas: lidas.repetidas,
    nomeSugerido: `${nomeBase(nome)}-extraido`,
  };
}
