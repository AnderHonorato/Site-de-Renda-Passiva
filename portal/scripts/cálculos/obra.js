/**
 * Cálculos de obra e acabamento.
 *
 * Todas as medidas entram em metros e as quantidades de compra são sempre
 * arredondadas **para cima**: faltar material no meio da obra custa mais caro
 * que sobrar um pouco.
 */

/**
 * Área de paredes e teto, descontando aberturas.
 * @param {{nome: string, largura: number, altura: number, quantidade?: number}[]} superfícies
 * @param {{nome: string, largura: number, altura: number, quantidade?: number}[]} aberturas
 * @returns {{áreaBruta: number, áreaDeAberturas: number, áreaLíquida: number, detalhe: {nome: string, área: number}[]}}
 */
export function áreaDeSuperfícies(superfícies, aberturas = []) {
  if (!Array.isArray(superfícies) || superfícies.length === 0) {
    throw new Error('Informe ao menos uma parede ou teto.');
  }

  const medir = (lista) => lista.map((s) => {
    const quantidade = s.quantidade ?? 1;
    if (!(s.largura > 0) || !(s.altura > 0)) throw new Error(`Medidas inválidas em "${s.nome}".`);
    if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error(`Quantidade inválida em "${s.nome}".`);
    return { nome: s.nome, área: s.largura * s.altura * quantidade };
  });

  const detalhe = medir(superfícies);
  const áreaBruta = detalhe.reduce((soma, s) => soma + s.área, 0);
  const áreaDeAberturas = medir(aberturas).reduce((soma, a) => soma + a.área, 0);

  if (áreaDeAberturas >= áreaBruta) {
    throw new Error('As aberturas somam mais que a área das paredes. Confira as medidas.');
  }

  return { áreaBruta, áreaDeAberturas, áreaLíquida: áreaBruta - áreaDeAberturas, detalhe };
}

/**
 * Litros de tinta e embalagens a comprar.
 * @param {{área: number, demãos: number, rendimentoPorLitro: number, perda?: number}} entrada rendimento em m² por litro
 * @returns {{litros: number, litrosComPerda: number}}
 */
export function litrosDeTinta({ área, demãos, rendimentoPorLitro, perda = 0 }) {
  if (!(área > 0)) throw new Error('A área precisa ser maior que zero.');
  if (!Number.isInteger(demãos) || demãos < 1 || demãos > 6) throw new Error('Informe de 1 a 6 demãos.');
  if (!(rendimentoPorLitro > 0)) throw new Error('O rendimento precisa ser maior que zero.');
  if (perda < 0 || perda > 100) throw new Error('A perda precisa ficar entre 0% e 100%.');

  const litros = (área * demãos) / rendimentoPorLitro;
  return { litros, litrosComPerda: litros * (1 + perda / 100) };
}

/**
 * Escolhe a combinação de embalagens mais barata que cobre os litros necessários.
 *
 * Testa cada embalagem sozinha e também a mistura de duas, que é o que a
 * pessoa faz na loja: leva a lata grande e completa com a menor.
 * @param {number} litrosNecessários
 * @param {{nome: string, litros: number, preçoCentavos: number}[]} embalagens
 * @returns {{nome: string, unidades: {nome: string, quantidade: number}[], litros: number, custoCentavos: number, sobra: number}[]}
 */
export function combinaçõesDeEmbalagem(litrosNecessários, embalagens) {
  if (!(litrosNecessários > 0)) throw new Error('Informe os litros necessários.');
  if (!Array.isArray(embalagens) || embalagens.length === 0) throw new Error('Informe ao menos uma embalagem.');
  for (const e of embalagens) {
    if (!(e.litros > 0)) throw new Error(`Volume inválido em "${e.nome}".`);
    if (!Number.isSafeInteger(e.preçoCentavos) || e.preçoCentavos < 0) throw new Error(`Preço inválido em "${e.nome}".`);
  }

  const opções = [];

  for (const embalagem of embalagens) {
    const quantidade = Math.ceil(litrosNecessários / embalagem.litros);
    opções.push({
      nome: `${quantidade}× ${embalagem.nome}`,
      unidades: [{ nome: embalagem.nome, quantidade }],
      litros: quantidade * embalagem.litros,
      custoCentavos: quantidade * embalagem.preçoCentavos,
      sobra: quantidade * embalagem.litros - litrosNecessários,
    });
  }

  // Mistura de duas embalagens: a maior cobre o grosso, a menor completa.
  for (const maior of embalagens) {
    for (const menor of embalagens) {
      if (menor.litros >= maior.litros) continue;
      const doMaior = Math.floor(litrosNecessários / maior.litros);
      if (doMaior < 1) continue;
      const restante = litrosNecessários - doMaior * maior.litros;
      if (restante <= 0) continue;
      const doMenor = Math.ceil(restante / menor.litros);
      const litros = doMaior * maior.litros + doMenor * menor.litros;
      opções.push({
        nome: `${doMaior}× ${maior.nome} + ${doMenor}× ${menor.nome}`,
        unidades: [{ nome: maior.nome, quantidade: doMaior }, { nome: menor.nome, quantidade: doMenor }],
        litros,
        custoCentavos: doMaior * maior.preçoCentavos + doMenor * menor.preçoCentavos,
        sobra: litros - litrosNecessários,
      });
    }
  }

  // Empate de preço é desempatado pela menor sobra.
  return opções
    .sort((a, b) => a.custoCentavos - b.custoCentavos || a.sobra - b.sobra)
    .filter((opção, i, lista) => lista.findIndex((o) => o.nome === opção.nome) === i);
}

/**
 * Caixas de piso a comprar.
 * @param {{área: number, coberturaPorCaixa: number, perda?: number}} entrada
 * @returns {{áreaComPerda: number, caixas: number, áreaCoberta: number, sobra: number}}
 */
export function caixasDePiso({ área, coberturaPorCaixa, perda = 10 }) {
  if (!(área > 0)) throw new Error('A área precisa ser maior que zero.');
  if (!(coberturaPorCaixa > 0)) throw new Error('A cobertura da caixa precisa ser maior que zero.');
  if (perda < 0 || perda > 100) throw new Error('A margem de recorte precisa ficar entre 0% e 100%.');

  const áreaComPerda = área * (1 + perda / 100);
  const caixas = Math.ceil(áreaComPerda / coberturaPorCaixa);
  const áreaCoberta = caixas * coberturaPorCaixa;
  return { áreaComPerda, caixas, áreaCoberta, sobra: áreaCoberta - área };
}

/**
 * Barras de rodapé a comprar.
 * @param {{lados: number[], vãos?: number[], comprimentoDaBarra: number, perda?: number}} entrada
 * @returns {{perímetro: number, metrosÚteis: number, metrosComPerda: number, barras: number, sobra: number}}
 */
export function barrasDeRodapé({ lados, vãos = [], comprimentoDaBarra, perda = 10 }) {
  if (!Array.isArray(lados) || lados.length < 3) throw new Error('Informe pelo menos três lados do cômodo.');
  if (lados.some((l) => !(l > 0))) throw new Error('Todos os lados precisam ser maiores que zero.');
  if (!(comprimentoDaBarra > 0)) throw new Error('O comprimento da barra precisa ser maior que zero.');

  const perímetro = lados.reduce((soma, l) => soma + l, 0);
  const descontos = vãos.reduce((soma, v) => soma + Math.max(0, v), 0);
  if (descontos >= perímetro) throw new Error('Os vãos somam mais que o perímetro. Confira as medidas.');

  const metrosÚteis = perímetro - descontos;
  const metrosComPerda = metrosÚteis * (1 + perda / 100);
  const barras = Math.ceil(metrosComPerda / comprimentoDaBarra);
  return { perímetro, metrosÚteis, metrosComPerda, barras, sobra: barras * comprimentoDaBarra - metrosÚteis };
}

/**
 * Rolos de papel de parede, considerando a repetição da estampa.
 *
 * A repetição (rapport) obriga a desperdiçar um pedaço em cada faixa para o
 * desenho casar. Ignorar isso é o erro que faz faltar rolo no fim da parede.
 * @param {{larguraDaParede: number, alturaDaParede: number, larguraDoRolo: number, comprimentoDoRolo: number, repetição?: number}} entrada
 * @returns {{faixas: number, alturaDaFaixa: number, faixasPorRolo: number, rolos: number, desperdício: number}}
 */
export function rolosDePapelDeParede({
  larguraDaParede, alturaDaParede, larguraDoRolo, comprimentoDoRolo, repetição = 0,
}) {
  if (!(larguraDaParede > 0) || !(alturaDaParede > 0)) throw new Error('As medidas da parede precisam ser maiores que zero.');
  if (!(larguraDoRolo > 0) || !(comprimentoDoRolo > 0)) throw new Error('As medidas do rolo precisam ser maiores que zero.');
  if (repetição < 0) throw new Error('A repetição não pode ser negativa.');
  if (alturaDaParede > comprimentoDoRolo) throw new Error('A parede é mais alta que o rolo inteiro: não há como cortar uma faixa.');

  const faixas = Math.ceil(larguraDaParede / larguraDoRolo);
  // Com repetição, cada faixa é cortada no próximo múltiplo do desenho.
  const alturaDaFaixa = repetição > 0
    ? Math.ceil(alturaDaParede / repetição) * repetição
    : alturaDaParede;
  const faixasPorRolo = Math.floor(comprimentoDoRolo / alturaDaFaixa);
  if (faixasPorRolo < 1) throw new Error('Com esta repetição não cabe nenhuma faixa inteira no rolo.');

  const rolos = Math.ceil(faixas / faixasPorRolo);
  return {
    faixas,
    alturaDaFaixa,
    faixasPorRolo,
    rolos,
    desperdício: (alturaDaFaixa - alturaDaParede) * faixas,
  };
}

/**
 * Rejunte necessário, pela geometria das juntas.
 * @param {{área: number, larguraDaPeça: number, alturaDaPeça: number, larguraDaJunta: number, profundidade: number, densidade?: number}} entrada medidas da peça e da junta em milímetros
 * @returns {{volumeLitros: number, massaKg: number}}
 */
export function rejunteNecessário({
  área, larguraDaPeça, alturaDaPeça, larguraDaJunta, profundidade, densidade = 1.6,
}) {
  if (!(área > 0)) throw new Error('A área precisa ser maior que zero.');
  if (!(larguraDaPeça > 0) || !(alturaDaPeça > 0)) throw new Error('As medidas da peça precisam ser maiores que zero.');
  if (!(larguraDaJunta > 0) || !(profundidade > 0)) throw new Error('A junta precisa ter largura e profundidade maiores que zero.');
  if (!(densidade > 0)) throw new Error('A densidade precisa ser maior que zero.');

  // Fórmula usual do setor: (L + A) ÷ (L × A) × largura × profundidade × densidade,
  // com as medidas da peça em milímetros, resultando em kg por metro quadrado.
  const consumoPorM2 = ((larguraDaPeça + alturaDaPeça) / (larguraDaPeça * alturaDaPeça))
    * larguraDaJunta * profundidade * densidade;
  const massaKg = consumoPorM2 * área;
  return { volumeLitros: massaKg / densidade, massaKg };
}
