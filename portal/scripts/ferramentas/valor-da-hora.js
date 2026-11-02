/** Valor da hora de trabalho, a partir da renda desejada e das horas vendáveis. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { valorDaHora } from '../cálculos/produção.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Informe quanto você quer tirar por mês para você, já livre.',
      'Some as despesas fixas do trabalho: aluguel, energia, internet, ferramentas, plataforma.',
      'Diga quantas horas por mês você tem disponíveis para trabalhar.',
      'Ajuste o aproveitamento: a parte dessas horas que realmente vira trabalho cobrado.',
      'Leve o valor da hora para a ferramenta de preço de venda, somando-o ao custo.',
    ],
    exemplo: {
      texto: 'Renda desejada de R$ 3.000,00, despesas fixas de R$ 800,00, 160 horas por mês e 70% de aproveitamento: '
        + '112 horas vendáveis e valor da hora de R$ 33,93.',
    },
    limites: 'O aproveitamento existe porque nem toda hora disponível é hora cobrada: comprar material, responder cliente, '
      + 'divulgar e entregar consomem tempo que ninguém paga separado. 70% é um ponto de partida comum para quem trabalha sozinho; '
      + 'ajuste para a sua realidade. O valor é bruto: imposto e taxa de plataforma entram depois, na formação do preço.',
    perguntas: [
      { p: 'Por que não dividir a renda pelas horas direto?', r: 'Porque isso supõe que 100% do seu tempo é cobrado. Se você cobra só 70% e calculou com 100%, falta quase um terço do faturamento no fim do mês.' },
      { p: 'Devo incluir minha renda desejada como despesa?', r: 'Ela entra separada de propósito. Despesa fixa é o que o trabalho consome; a renda desejada é o que sobra para você.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular valor da hora',
      campos: [
        { nome: 'renda', rótulo: 'Renda desejada por mês (R$)', tipo: 'número', exemplo: '3000,00' },
        { nome: 'despesas', rótulo: 'Despesas fixas do trabalho (R$)', tipo: 'número', padrão: '0' },
        { nome: 'horas', rótulo: 'Horas disponíveis por mês', tipo: 'número', exemplo: '160' },
        { nome: 'aproveitamento', rótulo: 'Aproveitamento das horas (%)', tipo: 'número', padrão: '70', dica: 'Quanto desse tempo vira trabalho realmente cobrado.' },
      ],
      calcular(dados) {
        const renda = número(dados, 'renda', { rótulo: 'Renda desejada', mín: 0 });
        const despesas = número(dados, 'despesas', { rótulo: 'Despesas fixas', mín: 0, obrigatório: false, padrão: 0 });
        const horas = número(dados, 'horas', { rótulo: 'Horas por mês', mín: 1, máx: 744 });
        const aproveitamento = número(dados, 'aproveitamento', { rótulo: 'Aproveitamento', mín: 1, máx: 100 });

        const r = valorDaHora({
          rendaDesejadaCentavos: emCentavos(renda),
          despesasFixasCentavos: emCentavos(despesas),
          horasPorMês: horas,
          aproveitamento,
        });

        return {
          valor: `${formatarMoeda(r.valorDaHoraCentavos / 100)} por hora`,
          resumo: `${formatarNúmero(r.horasVendáveis, { casas: 0 })} horas vendáveis por mês.`,
          linhas: [
            ['Faturamento necessário', formatarMoeda(r.faturamentoNecessárioCentavos / 100)],
            ['Horas disponíveis', formatarNúmero(horas, { casas: 0 })],
            ['Horas realmente cobradas', formatarNúmero(r.horasVendáveis, { casas: 0 })],
            ['Valor da hora', formatarMoeda(r.valorDaHoraCentavos / 100)],
          ],
          observações: [
            'Valor bruto: imposto e taxa de plataforma entram depois, na formação do preço.',
            'Some este valor ao custo do material na ferramenta de preço de venda.',
          ],
        };
      },
    });
  },
};
