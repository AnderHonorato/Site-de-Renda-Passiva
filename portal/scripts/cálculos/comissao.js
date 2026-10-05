/**
 * Comissão de vendas: percentual único ou escalonada por faixa.
 *
 * Na comissão escalonada cada faixa paga o seu percentual **só sobre a parte
 * das vendas que cai dentro dela**, como o imposto de renda progressivo. Quem
 * vende R$ 25.000,00 com faixas até 10 mil (3%), até 20 mil (5%) e acima (8%)
 * não ganha 8% sobre tudo: ganha 3% dos primeiros 10 mil, 5% dos 10 mil
 * seguintes e 8% só dos 5 mil que passaram.
 *
 * Dinheiro entra e sai em **centavos inteiros**, e os percentuais viram
 * inteiros em centésimos de ponto percentual ("pontos-base": 3,25% = 325).
 * Assim `centavos × pontos-base` é um inteiro exato, em décimos de milésimo de
 * centavo, e a soma das faixas não carrega erro de ponto flutuante. Aceitar
 * mais de duas casas no percentual obrigaria a arredondar o que a pessoa
 * digitou; a ferramenta recusa em vez de mudar o número calado.
 *
 * Arredondamento (regra única, escrita também na tela):
 * - as faixas são somadas com todas as casas e **só a soma** é arredondada ao
 *   centavo, metade para cima — somar faixas já arredondadas acumularia erro;
 * - o desconto incide sobre a comissão bruta **já arredondada** e também é
 *   arredondado ao centavo; a líquida é bruta − desconto, de modo que os três
 *   números mostrados sempre fecham entre si.
 *
 * O percentual é escrito como na tela: 5 significa 5%.
 */

/** Mais de cinco faixas não cabem na tela do celular e raramente existem em plano de comissão. */
export const MÁXIMO_DE_FAIXAS = 5;

/**
 * Maior valor de vendas aceito: R$ 1 bilhão. Com 100% de comissão o produto
 * `centavos × pontos-base` chega a 1e15, ainda dentro dos inteiros seguros do
 * JavaScript (9e15), então nenhuma conta perde precisão.
 */
export const LIMITE_DE_VENDAS_CENTAVOS = 100_000_000_000;

/** Uma unidade interna vale 1/10.000 de centavo: centavos × pontos-base. */
export const UNIDADES_POR_CENTAVO = 10_000;

/**
 * Cria a recusa de uma regra de negócio apontando o dado culpado.
 * @param {string} mensagem
 * @param {string} campo propriedade da entrada que precisa ser corrigida
 * @param {string} [código] identificador estável do tipo de recusa
 */
function recusa(mensagem, campo, código) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  if (código) erro.código = código;
  return erro;
}

/** Valor em reais por extenso curto, só para as mensagens de recusa. */
function reaisParaMensagem(centavos) {
  return `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Converte o percentual da tela em pontos-base inteiros.
 * @param {number} percentual como escrito na tela (3,25 = 3,25%)
 * @param {string} campo
 * @param {string} rótulo
 * @returns {number}
 */
export function emPontosBase(percentual, campo, rótulo) {
  if (typeof percentual !== 'number' || !Number.isFinite(percentual)) {
    throw recusa(`${rótulo} precisa ser um número.`, campo);
  }
  if (percentual < 0) throw recusa(`${rótulo} não pode ser negativo.`, campo);
  if (percentual > 100) throw recusa(`${rótulo} não pode passar de 100%.`, campo);
  const pontos = Math.round(percentual * 100);
  // A folga cobre só o erro da multiplicação (0,07 × 100 = 7,000000000000001).
  if (Math.abs(percentual * 100 - pontos) > 1e-6) {
    throw recusa(`${rótulo}: use no máximo duas casas decimais (por exemplo, 3,25%).`, campo, 'percentual_com_muitas_casas');
  }
  return pontos;
}

function exigirCentavos(valor, campo, rótulo) {
  if (!Number.isSafeInteger(valor)) throw recusa(`${rótulo}: o valor precisa estar em centavos inteiros.`, campo);
  if (valor < 0) throw recusa(`${rótulo} não pode ser negativo.`, campo);
  if (valor > LIMITE_DE_VENDAS_CENTAVOS) {
    throw recusa(`${rótulo}: o limite é ${reaisParaMensagem(LIMITE_DE_VENDAS_CENTAVOS)}.`, campo);
  }
}

/**
 * Arredonda unidades internas (1/10.000 de centavo) para centavos, metade para
 * cima. Usa só inteiros: dividir em ponto flutuante e arredondar erraria nas
 * metades exatas de valores grandes.
 * @param {number} unidades inteiro não negativo
 */
export function paraCentavos(unidades) {
  const somada = unidades + UNIDADES_POR_CENTAVO / 2;
  return (somada - (somada % UNIDADES_POR_CENTAVO)) / UNIDADES_POR_CENTAVO;
}

/**
 * Confere as faixas e as devolve prontas para somar. Cada faixa termina em
 * `ateCentavos` (vendas acumuladas); só a última pode ficar sem limite (`null`).
 * @param {{ateCentavos: number|null, percentual: number}[]} faixas
 */
function prepararFaixas(faixas) {
  if (!Array.isArray(faixas) || faixas.length === 0) {
    throw recusa('Informe pelo menos uma faixa de comissão.', 'faixas', 'faixas_invalidas');
  }
  if (faixas.length > MÁXIMO_DE_FAIXAS) {
    throw recusa(`Use no máximo ${MÁXIMO_DE_FAIXAS} faixas.`, 'faixas', 'faixas_invalidas');
  }

  let anterior = 0;
  return faixas.map((faixa, índice) => {
    const número = índice + 1;
    const éÚltima = índice === faixas.length - 1;
    const pontosBase = emPontosBase(faixa?.percentual, `faixa${número}.percentual`, `A comissão da faixa ${número}`);

    let ate = faixa?.ateCentavos;
    if (ate === null || ate === undefined) {
      if (!éÚltima) {
        throw recusa(
          `Só a última faixa pode ficar sem limite. Informe até quanto vai a faixa ${número}.`,
          `faixa${número}.ateCentavos`,
          'faixas_invalidas',
        );
      }
      ate = null;
    } else {
      exigirCentavos(ate, `faixa${número}.ateCentavos`, `O fim da faixa ${número}`);
      if (ate <= anterior) {
        throw recusa(
          índice === 0
            ? 'O fim da faixa 1 precisa ser maior que zero.'
            : `A faixa ${número} precisa terminar acima de ${reaisParaMensagem(anterior)}, onde termina a faixa ${número - 1}.`,
          `faixa${número}.ateCentavos`,
          'faixas_invalidas',
        );
      }
    }

    const parte = { ordem: número, deCentavos: anterior, ateCentavos: ate, pontosBase };
    if (ate !== null) anterior = ate;
    return parte;
  });
}

/**
 * Calcula a comissão.
 *
 * @param {{
 *   vendasCentavos: number,
 *   modo?: 'simples'|'escalonada',
 *   percentual?: number,
 *   faixas?: {ateCentavos: number|null, percentual: number}[],
 *   descontoPercentual?: number
 * }} entrada
 * @returns {{
 *   modo: string, vendasCentavos: number,
 *   partes: {ordem: number, deCentavos: number, ateCentavos: number|null, pontosBase: number,
 *            baseCentavos: number, exatoEmUnidades: number}[],
 *   somaExataEmUnidades: number, brutaCentavos: number,
 *   descontoPontosBase: number, descontoCentavos: number, líquidaCentavos: number,
 *   foraDeFaixaCentavos: number
 * }}
 */
export function calcularComissão({
  vendasCentavos, modo = 'simples', percentual, faixas = [], descontoPercentual = 0,
}) {
  if (modo !== 'simples' && modo !== 'escalonada') {
    throw recusa('Escolha comissão simples ou escalonada.', 'modo');
  }
  exigirCentavos(vendasCentavos, 'vendasCentavos', 'As vendas do período');
  const descontoPontosBase = emPontosBase(descontoPercentual, 'descontoPercentual', 'O desconto sobre a comissão');

  const preparadas = modo === 'simples'
    ? [{
      ordem: 1, deCentavos: 0, ateCentavos: null,
      pontosBase: emPontosBase(percentual, 'percentual', 'O percentual de comissão'),
    }]
    : prepararFaixas(faixas);

  let restante = vendasCentavos;
  let somaExataEmUnidades = 0;
  const partes = preparadas.map((faixa) => {
    const largura = faixa.ateCentavos === null ? restante : faixa.ateCentavos - faixa.deCentavos;
    const baseCentavos = Math.min(restante, largura);
    restante -= baseCentavos;
    const exatoEmUnidades = baseCentavos * faixa.pontosBase;
    somaExataEmUnidades += exatoEmUnidades;
    return { ...faixa, baseCentavos, exatoEmUnidades };
  });

  const brutaCentavos = paraCentavos(somaExataEmUnidades);
  const descontoCentavos = paraCentavos(brutaCentavos * descontoPontosBase);

  return {
    modo,
    vendasCentavos,
    partes,
    somaExataEmUnidades,
    brutaCentavos,
    descontoPontosBase,
    descontoCentavos,
    líquidaCentavos: brutaCentavos - descontoCentavos,
    // Só sobra quando a última faixa tem limite: o que passou dele não rende comissão.
    foraDeFaixaCentavos: restante,
  };
}
