/** Conversor de moedas: cotação informada pela pessoa, sem inventar preço em tempo real. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export const MOEDAS = Object.freeze(['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'ARS', 'MXN']);
const formato = (valor, moeda) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: moeda, currencyDisplay: 'code',
  minimumFractionDigits: 2, maximumFractionDigits: 6,
}).format(valor);

/**
 * Taxa sempre significa unidades de destino por 1 unidade de origem.
 * Não consulta serviços nem afirma que a taxa seja atual.
 */
export function converterMoedas({ valor, origem, destino, cotacao, tarifa = 0 }) {
  if (!MOEDAS.includes(origem) || !MOEDAS.includes(destino) || origem === destino) {
    throw new ErroDeEntrada('Escolha duas moedas diferentes disponíveis na lista.', 'destino');
  }
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000_000) {
    throw new ErroDeEntrada('Informe valor maior que zero e de até um bilhão.', 'valor');
  }
  if (!Number.isFinite(cotacao) || cotacao <= 0 || cotacao > 1_000_000_000) {
    throw new ErroDeEntrada('A cotação precisa ser positiva e não pode ultrapassar um bilhão.', 'cotacao');
  }
  if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 1_000_000_000) {
    throw new ErroDeEntrada('A tarifa não pode ser negativa.', 'tarifa');
  }
  const bruto = valor * cotacao;
  const liquido = bruto - tarifa;
  if (!Number.isFinite(bruto) || !Number.isFinite(liquido) || liquido < 0 ||
      bruto > 1_000_000_000_000_000 || (bruto > 0 && bruto < 0.0000005)) {
    throw new ErroDeEntrada('A cotação ou a tarifa gerou um resultado fora do limite confiável.', 'cotacao');
  }
  return { bruto, liquido, tarifa, valor, origem, destino, cotacao };
}

export function calcularCambioNaTela(dados) {
  const valor = número(dados, 'valor', { rótulo: 'Valor de origem', mín: 0 });
  const cotacao = número(dados, 'cotacao', { rótulo: 'Cotação de conversão', mín: 0 });
  const tarifa = número(dados, 'tarifa', { rótulo: 'Tarifa fixa na moeda de destino', mín: 0, obrigatório: false, padrão: 0 });
  const r = converterMoedas({ valor, cotacao, tarifa, origem: dados.origem, destino: dados.destino });
  const linhas = [
    ['Valor antes da tarifa', formato(r.bruto, r.destino)],
    ['Tarifa fixa', formato(r.tarifa, r.destino)],
    ['Valor líquido estimado', formato(r.liquido, r.destino)],
    ['Cotação informada', '1 ' + r.origem + ' = ' + formatarNúmero(r.cotacao, { casas: 8 }) + ' ' + r.destino],
  ];
  const observações = [
    'A cotação foi informada manualmente: este site não acompanha o câmbio em tempo real.',
    'Não inclui IOF, spread bancário nem tarifas percentuais. Informe na tarifa fixa os custos que desejar descontar.',
    'Os resultados mantêm precisão de cálculo e são exibidos com até seis casas decimais.',
  ];
  return {
    valor: formato(r.liquido, r.destino),
    resumo: formato(r.valor, r.origem) + ' convertidos com a cotação fornecida.',
    linhas, observações,
    texto: ['Conversor de moedas', 'Origem: ' + formato(r.valor, r.origem),
      ...linhas.map(([rotulo, conteúdo]) => rotulo + ': ' + conteúdo), ...observações].join('\n'),
  };
}

export default {
  instruções: {
    passos: [
      'Selecione a moeda do valor original e a moeda que deseja receber.',
      'Informe uma cotação obtida na fonte de sua preferência: quanto vale uma unidade da origem em unidades do destino.',
      'Opcionalmente desconte uma tarifa fixa cobrada na moeda de destino.',
      'Calcule e copie o valor convertido e a cotação utilizada.',
    ],
    exemplo: { texto: 'Com 100 USD e cotação de 5,30 BRL para cada 1 USD, a conversão bruta é R$ 530,00. '
      + 'Uma tarifa de R$ 10,00 deixa R$ 520,00 líquidos.' },
    limites: 'Não é uma cotação ao vivo nem uma oferta de compra ou venda. '
      + 'Taxas bancárias, spread e impostos variam por operação e não são estimados automaticamente. '
      + 'Aceita valores positivos e até seis casas decimais no resultado; cálculo local, sem conexão com serviços financeiros.',
    perguntas: [
      { p: 'A cotação muda sozinha?', r: 'Não. Você insere a cotação e controla qual taxa foi utilizada.' },
      { p: 'Inclui IOF?', r: 'Não. Se quiser, calcule a despesa separadamente e informe como tarifa fixa.' },
    ],
  },
  montar(raiz, ferramenta) {
    const opções = MOEDAS.map((moeda) => ({ valor: moeda, rótulo: moeda }));
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter valor',
      campos: [
        { nome: 'valor', rótulo: 'Valor de origem', tipo: 'número', padrão: '100,00' },
        { nome: 'origem', rótulo: 'Moeda de origem', tipo: 'seleção', opções, padrão: 'USD' },
        { nome: 'destino', rótulo: 'Moeda de destino', tipo: 'seleção', opções, padrão: 'BRL' },
        { nome: 'cotacao', rótulo: 'Cotação (1 origem = quantos destinos?)', tipo: 'número', padrão: '5,30',
          dica: 'Exemplo de preenchimento, não cotação atual. Atualize usando sua fonte.' },
        { nome: 'tarifa', rótulo: 'Tarifa fixa na moeda de destino (opcional)', tipo: 'número', padrão: '0' },
      ], calcular: calcularCambioNaTela,
    });
  },
};
