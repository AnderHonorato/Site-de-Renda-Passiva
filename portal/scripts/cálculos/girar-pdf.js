/**
 * Girar PDF: soma 90, 180 ou 270 graus à rotação das páginas escolhidas, sem recomprimir nada.
 *
 * No iLovePDF a ferramenta gira o arquivo inteiro e só (documentação/pesquisa-ilovepdf/d-editar.md, D2);
 * aqui dá também para girar páginas escolhidas, pares ou ímpares, que é a melhoria que a própria
 * pesquisa recomenda. O giro SOMA à rotação que a página já tem (módulo 360), nunca a substitui.
 */
import { interpretarPáginas, abrirPdf, nomeBase, mensagemDeErro } from './páginas-do-pdf.js';

/** Giros oferecidos, em graus no sentido horário. */
export const ÂNGULOS = Object.freeze([90, 180, 270]);

export const RÓTULO_DOS_ÂNGULOS = Object.freeze({ 90: '90° para a direita', 180: '180° (de cabeça para baixo)', 270: '90° para a esquerda' });

/**
 * Rotação de uma página como número entre 0 e 270, múltiplo de 90.
 * Um /Rotate que não é múltiplo de 90 é inválido pela norma, e os leitores o tratam como 0.
 * @param {number} graus
 * @returns {0|90|180|270}
 */
export function rotaçãoNormalizada(graus) {
  if (!Number.isFinite(graus) || graus % 90 !== 0) return 0;
  return /** @type {0|90|180|270} */ (((graus % 360) + 360) % 360);
}

/**
 * Quais páginas girar.
 * @param {number} total
 * @param {{quais: 'todas'|'ímpares'|'pares'|'escolhidas', páginas?: string}} pedido
 * @returns {{ok: true, páginas: number[]} | {ok: false, erro: string, campo: 'páginas'|'quais', mensagem: string}}
 */
export function planejarGiro(total, { quais, páginas = '' }) {
  const todas = Array.from({ length: total }, (_, i) => i + 1);
  if (quais === 'todas') return { ok: true, páginas: todas };
  if (quais === 'ímpares' || quais === 'pares') {
    const lista = todas.filter((n) => (quais === 'ímpares' ? n % 2 === 1 : n % 2 === 0));
    if (lista.length === 0) {
      return { ok: false, erro: 'nenhuma_página', campo: 'quais', mensagem: `Este PDF tem só ${total} página e nenhuma é ${quais === 'pares' ? 'par' : 'ímpar'}. Escolha "Todas as páginas".` };
    }
    return { ok: true, páginas: lista };
  }
  const lidas = interpretarPáginas(páginas, total, { ordem: 'crescente' });
  if (!lidas.ok) return { ok: false, erro: lidas.erro, campo: 'páginas', mensagem: mensagemDeErro(lidas.erro, lidas.extras) };
  return { ok: true, páginas: lidas.páginas };
}

/**
 * Gira as páginas e grava o PDF. O arquivo é aberto de novo a cada chamada: o giro altera o
 * documento, e rodar duas vezes sobre o mesmo objeto acumularia os giros.
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {number[]} páginas páginas a girar (a partir de 1)
 * @param {number} ângulo 90, 180 ou 270
 * @param {{biblioteca: {PDFDocument: any, degrees: Function}}} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, total: number, giradas: number[], antes: number[], depois: number[], jáGiradas: number, nomeSugerido: string}
 *   | {ok: false, erro: string, mensagem: string}
 * >}
 */
export async function girarPdf({ nome, bytes }, páginas, ângulo, { biblioteca }) {
  if (!ÂNGULOS.includes(ângulo)) return { ok: false, erro: 'ângulo_inválido', mensagem: 'Escolha o giro: 90° para a direita, 180° ou 90° para a esquerda.' };
  const aberto = await abrirPdf({ nome, bytes }, { biblioteca });
  if (!aberto.ok) return { ok: false, erro: aberto.erro, mensagem: mensagemDeErro(aberto.erro, aberto.extras) };

  const { documento, total } = aberto;
  const alvo = new Set(páginas);
  const antes = [];
  const depois = [];
  let jáGiradas = 0;
  try {
    documento.getPages().forEach((página, i) => {
      const atual = rotaçãoNormalizada(página.getRotation().angle);
      antes.push(atual);
      if (!alvo.has(i + 1)) { depois.push(atual); return; }
      if (atual !== 0) jáGiradas++;
      const nova = (atual + ângulo) % 360;
      página.setRotation(biblioteca.degrees(nova));
      depois.push(nova);
    });
    const saída = await documento.save();
    return { ok: true, bytes: saída, total, giradas: [...páginas], antes, depois, jáGiradas, nomeSugerido: `${nomeBase(nome)}-girado` };
  } catch {
    return { ok: false, erro: 'falha_ao_montar', mensagem: mensagemDeErro('falha_ao_montar') };
  }
}
