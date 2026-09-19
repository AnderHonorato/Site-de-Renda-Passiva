/** Preço de venda com margem sobre a receita, taxas e imposto. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { preçoDeVenda, emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Informe o custo total do que você vai vender: matéria-prima, insumos e embalagem.',
      'Informe a margem que você quer ficar, em porcentagem sobre o preço de venda.',
      'Acrescente as taxas de cartão ou plataforma e o imposto, se houver.',
      'Se o custo é de um lote, informe quantas unidades saem dele para ver o preço unitário.',
      'Confira a composição do preço: ela mostra para onde vai cada parte do que o cliente paga.',
    ],
    exemplo: {
      texto: 'Um lote custa R$ 80,00, você quer 30% de margem e paga 4% de taxa de cartão, saindo 50 unidades. '
        + 'O preço do lote fica R$ 121,22 e cada unidade sai por R$ 2,43.',
    },
    limites: 'Margem, taxas e imposto são percentuais sobre o preço de venda, não sobre o custo — é assim que o varejo calcula. '
      + 'Se a soma passar de 100%, não existe preço possível e a ferramenta avisa em vez de devolver um número absurdo. '
      + 'O preço por unidade é arredondado para cima, para não perder a margem no centavo.',
    perguntas: [
      { p: 'Margem de 30% é o mesmo que aumentar o custo em 30%?', r: 'Não. Aumentar o custo em 30% (markup) resulta numa margem de apenas 23%. A ferramenta mostra os dois números para você comparar.' },
      { p: 'Devo incluir meu trabalho no custo?', r: 'Sim, se você quer que o preço pague o seu tempo. Some o valor da sua hora ao custo, ou use o campo de despesa fixa por lote.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular preço',
      campos: [
        { nome: 'custo', rótulo: 'Custo do lote (R$)', tipo: 'número', exemplo: '80,00' },
        { nome: 'fixo', rótulo: 'Despesa fixa por lote (R$)', tipo: 'número', padrão: '0', dica: 'Aluguel, energia, entrega: o que não varia com a quantidade.' },
        { nome: 'margem', rótulo: 'Margem desejada (%)', tipo: 'número', exemplo: '30' },
        { nome: 'taxas', rótulo: 'Taxas de cartão ou plataforma (%)', tipo: 'número', padrão: '0' },
        { nome: 'imposto', rótulo: 'Imposto sobre a venda (%)', tipo: 'número', padrão: '0' },
        { nome: 'unidades', rótulo: 'Unidades no lote', tipo: 'número', padrão: '1' },
      ],
      calcular(dados) {
        const custo = número(dados, 'custo', { rótulo: 'Custo do lote', mín: 0 });
        const fixo = número(dados, 'fixo', { rótulo: 'Despesa fixa', mín: 0, obrigatório: false, padrão: 0 });
        const margem = número(dados, 'margem', { rótulo: 'Margem', mín: 0, máx: 99 });
        const taxas = número(dados, 'taxas', { rótulo: 'Taxas', mín: 0, máx: 99, obrigatório: false, padrão: 0 });
        const imposto = número(dados, 'imposto', { rótulo: 'Imposto', mín: 0, máx: 99, obrigatório: false, padrão: 0 });
        const unidades = número(dados, 'unidades', { rótulo: 'Unidades', mín: 1, inteiro: true });

        const r = preçoDeVenda({
          custoCentavos: emCentavos(custo),
          fixoCentavos: emCentavos(fixo),
          margem, taxas, imposto, unidades,
        });

        return {
          valor: `${formatarMoeda(r.preçoCentavos / 100)} o lote`,
          resumo: `Cada unidade por ${formatarMoeda(r.porUnidadeCentavos / 100)}.`,
          linhas: [
            ['Preço do lote', formatarMoeda(r.preçoCentavos / 100)],
            ['Preço por unidade', formatarMoeda(r.porUnidadeCentavos / 100)],
            ['Lucro no lote', formatarMoeda(r.lucroCentavos / 100)],
            ['Markup equivalente', `${formatarNúmero(r.markup, { casas: 1 })}%`],
          ],
          tabela: {
            cabeçalho: ['Composição do preço', 'Valor', 'Parte do preço'],
            linhas: r.composição
              .filter(([, v]) => v !== 0)
              .map(([rótulo, centavos]) => [
                rótulo,
                formatarMoeda(centavos / 100),
                `${formatarNúmero((centavos / r.preçoCentavos) * 100, { casas: 1 })}%`,
              ]),
          },
          observações: [
            'Margem, taxas e imposto incidem sobre o preço final, não sobre o custo.',
            'O preço por unidade foi arredondado para cima para preservar a margem.',
          ],
        };
      },
    });
  },
};
