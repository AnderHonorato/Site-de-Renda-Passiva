/**
 * Remover linhas duplicadas: fica a primeira ocorrência de cada linha.
 *
 * Função pura, sem DOM, coberta por teste. O comportamento vem da
 * especificação do Ander Flow (remover-linhas-duplicadas-de-texto): a linha
 * que sai é sempre a original, com a caixa e os espaços de quem a escreveu;
 * só a comparação é que pode ignorar maiúsculas e espaços nas bordas.
 */

const IDIOMA = 'pt-BR';

/** Limites da especificação: o texto inteiro e o número de linhas. */
export const LIMITE_DE_CARACTERES = 100000;
export const LIMITE_DE_LINHAS = 20000;

const QUEBRA_DE_LINHA = /\r\n|\r|\n/;
const QUEBRA_NO_FIM = /(?:\r\n|\r|\n)$/;

const formatar = (valor) => valor.toLocaleString('pt-BR');

/**
 * Chave usada só para comparar. As linhas "café" escritas com a letra
 * composta e com o acento solto parecem iguais na tela, por isso a chave
 * passa por NFC: quem vê duas linhas idênticas espera uma só.
 */
function chaveDaLinha(linha, ignorarMaiúsculas, ignorarEspaçosNasBordas) {
  let chave = linha.normalize('NFC');
  if (ignorarEspaçosNasBordas) chave = chave.trim();
  if (ignorarMaiúsculas) chave = chave.toLocaleLowerCase(IDIOMA);
  return chave;
}

/**
 * Separa o texto em linhas. Uma quebra no fim fecha a última linha em vez de
 * abrir uma linha vazia: a lista "a\nb\n" tem duas linhas, como se vê na tela.
 * @returns {{linhas: string[], quebraNoFim: boolean}}
 */
function dividirEmLinhas(texto) {
  if (texto === '') return { linhas: [], quebraNoFim: false };
  const quebraNoFim = QUEBRA_NO_FIM.test(texto);
  const corpo = quebraNoFim ? texto.replace(QUEBRA_NO_FIM, '') : texto;
  return { linhas: corpo.split(QUEBRA_DE_LINHA), quebraNoFim };
}

/**
 * Tira as linhas repetidas de um texto, mantendo a primeira de cada uma.
 *
 * Com `ignorarLinhasVazias`, as linhas vazias não são comparadas entre si:
 * todas ficam. Uma linha só com espaços só é "vazia" quando os espaços nas
 * bordas também são ignorados, porque é a comparação que decide o que é vazio.
 *
 * As quebras de linha do texto de saída são sempre `\n`.
 * @param {string} texto
 * @param {{ignorarMaiúsculas?: boolean, ignorarEspaçosNasBordas?: boolean, ignorarLinhasVazias?: boolean}} [opções]
 * @returns {{
 *   texto: string,
 *   mantidas: {linha: string, vezes: number}[],
 *   linhasNaEntrada: number, linhasNaSaída: number, linhasRemovidas: number,
 *   vaziasRemovidas: number
 * }}
 * @throws {Error} quando o texto passa do limite de caracteres ou de linhas
 */
export function removerLinhasDuplicadas(texto, opções = {}) {
  const {
    ignorarMaiúsculas = true,
    ignorarEspaçosNasBordas = true,
    ignorarLinhasVazias = false,
  } = opções;
  const conteúdo = String(texto ?? '');

  if (conteúdo.length > LIMITE_DE_CARACTERES) {
    throw new Error(`O texto passou de ${formatar(LIMITE_DE_CARACTERES)} caracteres. Divida a lista em partes menores.`);
  }
  const { linhas, quebraNoFim } = dividirEmLinhas(conteúdo);
  if (linhas.length > LIMITE_DE_LINHAS) {
    throw new Error(`A lista tem ${formatar(linhas.length)} linhas e o limite é ${formatar(LIMITE_DE_LINHAS)}. Divida em partes menores.`);
  }

  const vistas = new Map(); // chave → posição em `mantidas`
  const mantidas = [];
  let vaziasRemovidas = 0;

  for (const linha of linhas) {
    const chave = chaveDaLinha(linha, ignorarMaiúsculas, ignorarEspaçosNasBordas);
    if (ignorarLinhasVazias && chave === '') {
      mantidas.push({ linha, vezes: 1 });
      continue;
    }
    if (vistas.has(chave)) {
      mantidas[vistas.get(chave)].vezes++;
      if (chave === '') vaziasRemovidas++;
      continue;
    }
    vistas.set(chave, mantidas.length);
    mantidas.push({ linha, vezes: 1 });
  }

  const saída = mantidas.map((item) => item.linha).join('\n') + (quebraNoFim && mantidas.length ? '\n' : '');
  return {
    texto: saída,
    mantidas,
    linhasNaEntrada: linhas.length,
    linhasNaSaída: mantidas.length,
    linhasRemovidas: linhas.length - mantidas.length,
    vaziasRemovidas,
  };
}
