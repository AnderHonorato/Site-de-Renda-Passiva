/** Parcelamento pela Tabela Price, comparado com o pagamento à vista. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { parcelamento, emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Informe o valor total da compra e a entrada, se houver.',
      'Informe o número de parcelas e a taxa de juros mensal cobrada pela loja.',
      'Se existe desconto para pagamento à vista, preencha o campo: a comparação fica honesta.',
      'O resultado mostra a parcela, o total pago e qual opção sai mais barata.',
    ],
    exemplo: {
      texto: 'R$ 3.000,00 em 10 vezes a 2% ao mês dá parcela de R$ 333,98 e total de R$ 3.339,80. '
        + 'Com 8% de desconto à vista, o pagamento imediato sairia por R$ 2.760,00 — R$ 579,80 mais barato.',
    },
    limites: 'Usa a Tabela Price, que é o sistema do crediário e do cartão. Não inclui IOF, seguro nem tarifa de cadastro, '
      + 'então o custo real de um financiamento bancário costuma ser um pouco maior que o mostrado aqui. '
      + 'Se a taxa informada for zero, o parcelamento é considerado sem juros.',
    perguntas: [
      { p: 'A loja diz "sem juros". Preciso preencher a taxa?', r: 'Coloque zero. Mas confira se existe desconto à vista: se existe, o parcelamento "sem juros" tem juros embutidos, e a comparação vai mostrar isso.' },
      { p: 'Por que meu banco cobra mais do que o resultado?', r: 'Porque o banco soma IOF, tarifas e às vezes seguro. Esta ferramenta calcula só os juros da taxa informada.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Simular',
      campos: [
        { nome: 'valor', rótulo: 'Valor total (R$)', tipo: 'número', exemplo: '3000,00' },
        { nome: 'entrada', rótulo: 'Entrada (R$)', tipo: 'número', padrão: '0' },
        { nome: 'parcelas', rótulo: 'Número de parcelas', tipo: 'número', exemplo: '10' },
        { nome: 'taxa', rótulo: 'Juros ao mês (%)', tipo: 'número', padrão: '0' },
        { nome: 'desconto', rótulo: 'Desconto à vista (%)', tipo: 'número', padrão: '0' },
      ],
      calcular(dados) {
        const valor = número(dados, 'valor', { rótulo: 'Valor total', mín: 0.01 });
        const entrada = número(dados, 'entrada', { rótulo: 'Entrada', mín: 0, obrigatório: false, padrão: 0 });
        const parcelas = número(dados, 'parcelas', { rótulo: 'Parcelas', mín: 1, máx: 480, inteiro: true });
        const taxa = número(dados, 'taxa', { rótulo: 'Juros', mín: 0, máx: 100, obrigatório: false, padrão: 0 });
        const desconto = número(dados, 'desconto', { rótulo: 'Desconto à vista', mín: 0, máx: 99, obrigatório: false, padrão: 0 });

        const r = parcelamento({
          valorCentavos: emCentavos(valor),
          entradaCentavos: emCentavos(entrada),
          parcelas,
          taxa,
        });

        const àVistaCentavos = Math.round(emCentavos(valor) * (1 - desconto / 100));
        const diferença = r.totalCentavos - àVistaCentavos;
        const melhor = diferença > 0 ? 'à vista' : 'parcelado';

        const diferençaRelevante = Math.abs(diferença) >= 100; // menos de um real não é vantagem

        return {
          valor: `${parcelas}× de ${formatarMoeda(r.parcelaCentavos / 100)}`,
          resumo: `Total parcelado: ${formatarMoeda(r.totalCentavos / 100)}.`,
          linhas: [
            ['Valor financiado', formatarMoeda((emCentavos(valor) - emCentavos(entrada)) / 100)],
            ['Parcela', formatarMoeda(r.parcelaCentavos / 100)],
            ...(r.últimaParcelaCentavos !== r.parcelaCentavos
              ? [['Última parcela', formatarMoeda(r.últimaParcelaCentavos / 100)]]
              : []),
            ['Total parcelado', formatarMoeda(r.totalCentavos / 100)],
            ['Juros embutidos', formatarMoeda(r.jurosCentavos / 100)],
            ['Total à vista', formatarMoeda(àVistaCentavos / 100)],
            ['Diferença', formatarMoeda(Math.abs(diferença) / 100)],
          ],
          observações: [
            !diferençaRelevante
              ? 'As duas opções custam praticamente o mesmo: a diferença não chega a um real.'
              : `Pagar ${melhor} economiza ${formatarMoeda(Math.abs(diferença) / 100)} (${formatarNúmero((Math.abs(diferença) / Math.max(r.totalCentavos, àVistaCentavos)) * 100, { casas: 1 })}%).`,
            'Não inclui IOF, tarifas nem seguro. O custo real de um financiamento bancário costuma ser um pouco maior.',
          ],
        };
      },
    });
  },
};
