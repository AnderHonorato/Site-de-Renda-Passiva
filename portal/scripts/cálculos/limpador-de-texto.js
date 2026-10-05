/**
 * Limpeza de texto: espaços repetidos, linhas vazias em excesso e quebras de
 * linha soltas no meio da frase.
 *
 * Função pura, sem DOM. O comportamento segue a especificação do Ander Flow
 * (docs/catalogo/catalogo-texto.md, "limpador-de-texto"): um pipeline sobre as
 * linhas, na ordem aparar, espaços duplos, quebras soltas e linhas vazias, cada
 * etapa ligada ao seu marcador. Os acréscimos ficam descritos onde acontecem.
 */

/** Opções ligadas por padrão: o que quase todo texto colado precisa. */
export const OPÇÕES_PADRÃO = Object.freeze({
  aparar: true,
  espaçosDuplos: true,
  linhasVazias: true,
  quebrasSoltas: false,
});

/** Espaço em branco que não é quebra de linha: espaço, tabulação, NBSP e afins. */
const ESPAÇO_NA_LINHA = /[^\S\n]{2,}/g;

/**
 * Final de frase: ponto, exclamação, interrogação, dois-pontos, ponto e vírgula
 * ou hífen, com reticências e fechamento de aspas ou parênteses logo depois
 * (`fim."`, `(veja isto.)`). O hífen entra porque "pala-\nvra" é palavra
 * partida, que juntar com espaço estragaria.
 */
const FINAL_DE_FRASE = /[.!?:;…-][)\]}"'”’»]*$/;

/** Linha que abre item de lista ("- ", "• ", "1. ", "2) "): nunca é continuação. */
const ABRE_ITEM_DE_LISTA = /^(?:[-–—•*·▪●◦]|\d{1,3}[.)])\s/;

/**
 * Quebras de linha de qualquer origem: Windows (CR LF), Mac antigo (CR) e os
 * separadores de linha e de parágrafo do Unicode. Os dois últimos entram por
 * código porque escritos direto no texto do código quebrariam a linha.
 */
const SEPARADORES_DE_LINHA = new RegExp(`\\r\\n?|${String.fromCharCode(0x2028)}|${String.fromCharCode(0x2029)}`, 'g');

/**
 * Padroniza as quebras de linha (Windows, Mac antigo e separadores Unicode)
 * em `\n`, para o resto do pipeline trabalhar com um único tipo.
 * @param {string} texto
 */
function padronizarQuebras(texto) {
  return texto.replace(SEPARADORES_DE_LINHA, '\n');
}

/** Linha só de espaços conta como vazia: é separação de parágrafo, não conteúdo. */
const éVazia = (linha) => linha.trim() === '';

/**
 * Junta as linhas que são a mesma frase partida no meio (texto colado de PDF).
 *
 * Os pedaços de cada parágrafo ficam numa lista e só viram texto no fim:
 * emendar de pedaço em pedaço com `+` refaria a cópia do texto inteiro a cada
 * linha, e um arquivo de 200 mil caracteres quebrado a cada palavra travaria a
 * página.
 * @param {string[]} linhas
 * @returns {{linhas: string[], unidas: number}}
 */
function juntarQuebrasSoltas(linhas) {
  const saída = [];
  let pedaços = [];
  let unidas = 0;

  const fechar = () => {
    if (pedaços.length) saída.push(pedaços.join(' '));
    pedaços = [];
  };

  for (const linha of linhas) {
    if (éVazia(linha)) {
      fechar();
      saída.push(linha);
      continue;
    }
    const anterior = pedaços[pedaços.length - 1];
    const continua = anterior !== undefined
      && !FINAL_DE_FRASE.test(anterior.trimEnd())
      && !ABRE_ITEM_DE_LISTA.test(linha.trimStart());
    if (continua) {
      // Sem os espaços da emenda, juntar "frase " com " resto" deixaria três espaços.
      pedaços[pedaços.length - 1] = anterior.trimEnd();
      pedaços.push(linha.trimStart());
      unidas++;
    } else {
      fechar();
      pedaços.push(linha);
    }
  }
  fechar();
  return { linhas: saída, unidas };
}

/**
 * Deixa uma linha vazia no lugar de cada sequência de linhas vazias.
 * Preserva a separação de parágrafos; não apaga todas.
 * @param {string[]} linhas
 */
function colapsarLinhasVazias(linhas) {
  const saída = [];
  for (const linha of linhas) {
    if (éVazia(linha) && saída.length && éVazia(saída[saída.length - 1])) continue;
    saída.push(linha);
  }
  return saída;
}

/** Tira as linhas vazias do começo e do fim do texto inteiro. */
function aparaBordasDoTexto(linhas) {
  let começo = 0;
  let fim = linhas.length;
  while (começo < fim && éVazia(linhas[começo])) começo++;
  while (fim > começo && éVazia(linhas[fim - 1])) fim--;
  return linhas.slice(começo, fim);
}

/**
 * Limpa um texto.
 *
 * Ordem das etapas, cada uma só se a opção estiver ligada:
 * 1. `aparar`: tira os espaços do começo e do fim de cada linha e as linhas
 *    vazias do começo e do fim do texto (acréscimo: a spec só fala de linha);
 * 2. `espaçosDuplos`: dois espaços ou mais viram um, na mesma linha;
 * 3. `quebrasSoltas`: junta com um espaço a linha que não termina em final de
 *    frase com a seguinte (nunca antes de um item de lista);
 * 4. `linhasVazias`: várias linhas vazias seguidas viram uma só.
 *
 * `caracteresRemovidos` conta em pontos de código, o que dá a conta exata do
 * que saiu (trocar uma quebra por espaço não remove nada) e não depende do
 * agrupamento visual de emojis. As quebras de linha do Windows são padronizadas
 * antes de contar, então "\r\n" virar "\n" não conta como remoção.
 * @param {string} texto
 * @param {{aparar?: boolean, espaçosDuplos?: boolean, linhasVazias?: boolean, quebrasSoltas?: boolean}} [opções]
 * @returns {{texto: string, caracteresRemovidos: number, linhasUnidas: number, linhasNaEntrada: number, linhasNaSaída: number}}
 */
export function limparTexto(texto = '', opções = {}) {
  const { aparar, espaçosDuplos, linhasVazias, quebrasSoltas } = { ...OPÇÕES_PADRÃO, ...opções };
  const entrada = padronizarQuebras(String(texto ?? ''));
  let linhas = entrada.split('\n');
  const linhasNaEntrada = entrada === '' ? 0 : linhas.length;

  if (aparar) linhas = aparaBordasDoTexto(linhas.map((linha) => linha.trim()));
  if (espaçosDuplos) linhas = linhas.map((linha) => linha.replace(ESPAÇO_NA_LINHA, ' '));
  let linhasUnidas = 0;
  if (quebrasSoltas) {
    ({ linhas, unidas: linhasUnidas } = juntarQuebrasSoltas(linhas));
  }
  if (linhasVazias) linhas = colapsarLinhasVazias(linhas);

  const saída = linhas.join('\n');
  const removidos = [...entrada].length - [...saída].length;
  return {
    texto: saída,
    caracteresRemovidos: Math.max(0, removidos),
    linhasUnidas,
    linhasNaEntrada,
    linhasNaSaída: saída === '' ? 0 : linhas.length,
  };
}
