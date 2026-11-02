// Converte o orçamento nas linhas da planilha: identificação, itens com números reais
// (quantidade, preço e subtotal como valores, não texto) e totais.
import { calcularTotaisDoOrçamento } from './calcular-totais-do-orçamento.js';
import { formatarDataDoOrçamento } from './formatar-data-do-orçamento.js';

export function montarPlanilhaDoOrçamento(orçamento, { marca = orçamento.marca || '' } = {}) {
  const totais = calcularTotaisDoOrçamento(orçamento);
  const datas = formatarDataDoOrçamento(orçamento);
  const faixa = (textoDaFaixa) => [{ texto: textoDaFaixa, estilo: 'cabeçalho' }, ...Array.from({ length: 4 }, () => ({ texto: '', estilo: 'cabeçalho' }))];
  const informação = (rótulo, valor) => (valor ? [[{ texto: rótulo, estilo: 'negrito' }, { texto: valor }]] : []);
  const linhas = [
    faixa([marca, orçamento.título].filter(Boolean).join(' — ')),
    ...informação('Emitido por', orçamento.emissor.nome),
    ...informação('Contato', orçamento.emissor.contato),
    ...informação('Para', orçamento.cliente.nome),
    ...informação('Data', datas.emitidoEm),
    ...informação('Válido até', datas.válidoAté),
    ...informação('Prazo', orçamento.prazo),
    [],
    ['Descrição', 'Quantidade', 'Unidade', 'Preço unitário', 'Subtotal'].map((título) => ({ texto: título, estilo: 'cabeçalho' })),
    ...totais.itens.map((item) => [
      { texto: item.descrição },
      { número: item.quantidade, formato: 'decimal' },
      { texto: item.unidade },
      { número: item.preçoUnitárioEmCentavos / 100, formato: 'moeda' },
      { número: item.subtotalEmCentavos / 100, formato: 'moeda' },
    ]),
    [],
    ...(totais.descontoEmCentavos
      ? [
          [null, null, null, { texto: 'Subtotal', estilo: 'negrito' }, { número: totais.subtotalEmCentavos / 100, formato: 'moeda' }],
          [null, null, null, { texto: 'Desconto', estilo: 'negrito' }, { número: -totais.descontoEmCentavos / 100, formato: 'moeda' }],
        ]
      : []),
    [null, null, null, { texto: 'Total', estilo: 'negrito' }, { número: totais.totalEmCentavos / 100, estilo: 'moedaNegrito' }],
    ...(orçamento.observações ? [[], ...informação('Observações', orçamento.observações)] : []),
  ];
  return { linhas, largurasDasColunas: [48, 14, 12, 18, 18] };
}
