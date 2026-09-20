/**
 * Cálculos de produção artesanal, cozinha e eventos.
 *
 * Aqui também vale a regra do dinheiro em centavos inteiros: o custo de cada
 * insumo é proporcional ao que foi consumido, e o arredondamento acontece uma
 * vez só, no fim.
 */

/**
 * Custo proporcional de insumos.
 *
 * Serve tanto para ingredientes de receita quanto para material de artesanato:
 * em ambos, você compra um pacote e usa uma parte dele.
 *
 * @param {{nome: string, quantidadeDoPacote: number, preçoDoPacoteCentavos: number, quantidadeUsada: number}[]} insumos
 * @param {{rendimento?: number}} [opções] unidades produzidas com esse consumo
 * @returns {{totalCentavos: number, porUnidadeCentavos: number, detalhe: {nome: string, custoCentavos: number, parteDoTotal: number}[]}}
 */
export function custoDeInsumos(insumos, { rendimento = 1 } = {}) {
  if (!Array.isArray(insumos) || insumos.length === 0) throw new Error('Informe ao menos um insumo.');
  if (!(rendimento > 0)) throw new Error('O rendimento precisa ser maior que zero.');

  const detalhe = insumos.map((i) => {
    if (!(i.quantidadeDoPacote > 0)) throw new Error(`Quantidade do pacote inválida em "${i.nome}".`);
    if (!Number.isSafeInteger(i.preçoDoPacoteCentavos) || i.preçoDoPacoteCentavos < 0) {
      throw new Error(`Preço inválido em "${i.nome}".`);
    }
    if (!(i.quantidadeUsada >= 0)) throw new Error(`Quantidade usada inválida em "${i.nome}".`);
    if (i.quantidadeUsada > i.quantidadeDoPacote * 1000) {
      throw new Error(`O consumo de "${i.nome}" é mais de mil pacotes. Confira as unidades.`);
    }
    // Arredonda só no fim: arredondar cada insumo acumula erro.
    const custoCentavos = (i.preçoDoPacoteCentavos * i.quantidadeUsada) / i.quantidadeDoPacote;
    return { nome: i.nome, custoCentavos };
  });

  const totalExato = detalhe.reduce((soma, d) => soma + d.custoCentavos, 0);
  const totalCentavos = Math.round(totalExato);

  return {
    totalCentavos,
    porUnidadeCentavos: Math.ceil(totalCentavos / rendimento),
    detalhe: detalhe.map((d) => ({
      nome: d.nome,
      custoCentavos: Math.round(d.custoCentavos),
      parteDoTotal: totalExato === 0 ? 0 : (d.custoCentavos / totalExato) * 100,
    })),
  };
}

/**
 * Valor da hora de trabalho.
 *
 * Considera que nem toda hora disponível é hora vendável: parte do tempo vai
 * para compra de material, divulgação e entrega. Ignorar isso é o que faz o
 * preço não fechar no fim do mês.
 *
 * @param {{rendaDesejadaCentavos: number, despesasFixasCentavos: number, horasPorMês: number, aproveitamento?: number}} entrada
 * @returns {{horasVendáveis: number, valorDaHoraCentavos: number, faturamentoNecessárioCentavos: number}}
 */
export function valorDaHora({
  rendaDesejadaCentavos, despesasFixasCentavos, horasPorMês, aproveitamento = 70,
}) {
  if (!Number.isSafeInteger(rendaDesejadaCentavos) || rendaDesejadaCentavos < 0) throw new Error('Renda desejada inválida.');
  if (!Number.isSafeInteger(despesasFixasCentavos) || despesasFixasCentavos < 0) throw new Error('Despesas fixas inválidas.');
  if (!(horasPorMês > 0) || horasPorMês > 744) throw new Error('Informe de 1 a 744 horas por mês.');
  if (!(aproveitamento > 0) || aproveitamento > 100) throw new Error('O aproveitamento precisa ficar entre 1% e 100%.');

  const horasVendáveis = horasPorMês * (aproveitamento / 100);
  const faturamentoNecessárioCentavos = rendaDesejadaCentavos + despesasFixasCentavos;
  return {
    horasVendáveis,
    faturamentoNecessárioCentavos,
    valorDaHoraCentavos: Math.ceil(faturamentoNecessárioCentavos / horasVendáveis),
  };
}

/**
 * Consumo por pessoa num churrasco ou almoço.
 *
 * As premissas são explícitas e editáveis de propósito: quantidade de comida
 * depende do grupo, e um número fechado sem premissa à mostra é chute disfarçado.
 */
export const CONSUMO_PADRÃO = Object.freeze({
  churrasco: {
    nome: 'Churrasco',
    itens: [
      { nome: 'Carne bovina', unidade: 'g', porAdulto: 300, porCriança: 120 },
      { nome: 'Linguiça', unidade: 'g', porAdulto: 120, porCriança: 60 },
      { nome: 'Frango', unidade: 'g', porAdulto: 150, porCriança: 80 },
      { nome: 'Pão de alho', unidade: 'un', porAdulto: 1.5, porCriança: 1 },
      { nome: 'Carvão', unidade: 'g', porAdulto: 500, porCriança: 250 },
      { nome: 'Arroz cru', unidade: 'g', porAdulto: 80, porCriança: 50 },
      { nome: 'Farofa pronta', unidade: 'g', porAdulto: 50, porCriança: 30 },
      { nome: 'Vinagrete', unidade: 'g', porAdulto: 100, porCriança: 50 },
      { nome: 'Gelo', unidade: 'g', porAdulto: 1000, porCriança: 500 },
    ],
  },
  almoço: {
    nome: 'Almoço ou encontro',
    itens: [
      { nome: 'Prato principal', unidade: 'g', porAdulto: 250, porCriança: 120 },
      { nome: 'Arroz cru', unidade: 'g', porAdulto: 90, porCriança: 50 },
      { nome: 'Feijão cru', unidade: 'g', porAdulto: 60, porCriança: 30 },
      { nome: 'Salada', unidade: 'g', porAdulto: 120, porCriança: 60 },
      { nome: 'Pão', unidade: 'un', porAdulto: 1, porCriança: 1 },
      { nome: 'Sobremesa', unidade: 'un', porAdulto: 1, porCriança: 1 },
    ],
  },
});

/** Bebidas ficam separadas porque dependem da duração e de quem bebe álcool. */
export const BEBIDAS_PADRÃO = Object.freeze([
  { nome: 'Cerveja', unidade: 'ml', porHoraPorAdultoQueBebe: 500, alcoólica: true },
  { nome: 'Refrigerante', unidade: 'ml', porHoraPorAdulto: 250, porHoraPorCriança: 300, alcoólica: false },
  { nome: 'Água', unidade: 'ml', porHoraPorAdulto: 200, porHoraPorCriança: 150, alcoólica: false },
]);

/**
 * Calcula as quantidades de um evento.
 * @param {{adultos: number, crianças?: number, horas: number, adultosQueBebem?: number, apetite?: number, tipo?: 'churrasco'|'almoço'}} entrada apetite em % (100 = padrão)
 * @returns {{comida: {nome: string, quantidade: number, unidade: string}[], bebidas: {nome: string, quantidade: number, unidade: string}[], premissas: string[]}}
 */
export function quantidadesDoEvento({
  adultos, crianças = 0, horas, adultosQueBebem = 0, apetite = 100, tipo = 'churrasco',
}) {
  if (!Number.isInteger(adultos) || adultos < 0) throw new Error('Número de adultos inválido.');
  if (!Number.isInteger(crianças) || crianças < 0) throw new Error('Número de crianças inválido.');
  if (adultos + crianças < 1) throw new Error('Informe pelo menos uma pessoa.');
  if (!(horas > 0) || horas > 24) throw new Error('A duração precisa ficar entre 1 e 24 horas.');
  if (!Number.isInteger(adultosQueBebem) || adultosQueBebem < 0) throw new Error('Número inválido de adultos que bebem.');
  if (adultosQueBebem > adultos) throw new Error('Há mais pessoas bebendo álcool do que adultos na festa.');
  if (!(apetite >= 50) || apetite > 200) throw new Error('O apetite precisa ficar entre 50% e 200%.');

  const cardápio = CONSUMO_PADRÃO[tipo];
  if (!cardápio) throw new Error(`Tipo de evento desconhecido: ${tipo}`);
  const fator = apetite / 100;

  const comida = cardápio.itens.map((item) => ({
    nome: item.nome,
    unidade: item.unidade,
    quantidade: (item.porAdulto * adultos + item.porCriança * crianças) * fator,
  }));

  const bebidas = BEBIDAS_PADRÃO.map((bebida) => {
    const quantidade = bebida.alcoólica
      ? bebida.porHoraPorAdultoQueBebe * adultosQueBebem * horas
      : (bebida.porHoraPorAdulto * adultos + (bebida.porHoraPorCriança ?? 0) * crianças) * horas;
    return { nome: bebida.nome, unidade: bebida.unidade, quantidade };
  }).filter((b) => b.quantidade > 0);

  return {
    comida,
    bebidas,
    premissas: [
      `${adultos} adulto(s) e ${crianças} criança(s), ${horas} hora(s) de evento.`,
      `Apetite em ${apetite}% do padrão.`,
      adultosQueBebem > 0
        ? `${adultosQueBebem} adulto(s) bebendo álcool, a 500 ml por hora cada.`
        : 'Nenhuma bebida alcoólica: ninguém foi declarado como quem bebe.',
      'Crianças não entram em nenhuma conta de bebida alcoólica.',
    ],
  };
}
