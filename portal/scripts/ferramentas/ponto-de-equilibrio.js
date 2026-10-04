/** Ponto de equilíbrio: quanto vender no mês para cobrir os custos, em quantidade e em faturamento. */
import { montarFerramenta, número, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { pontoDeEquilíbrio, DIAS_DO_MÊS, éQuaseInteiro } from '../cálculos/custos.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import {
  noCampoCerto, centavosDoCampo, formatarÍndice, formatarPercentual, unidades, reaisExatos,
  avisoDeMargemArredondada, textoDoResumo, pdfDoResumo,
} from './auxiliares/resumo-de-custos.js';

const TÍTULO = 'Ponto de equilíbrio';
const reais = (centavos) => formatarMoeda(centavos / 100);

/**
 * Lê o formulário, calcula e monta o que a tela, o texto copiado e o PDF mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularPontoNaTela(dados) {
  const custosFixos = número(dados, 'custosFixos', { rótulo: 'Custos fixos do mês', mín: 0 });
  const lucro = número(dados, 'lucro', { rótulo: 'Lucro desejado', mín: 0, obrigatório: false, padrão: 0 });
  const preço = número(dados, 'preço', { rótulo: 'Preço de venda', mín: 0 });
  const custoVariável = número(dados, 'custoVariável', { rótulo: 'Custo variável', mín: 0, obrigatório: false, padrão: 0 });
  const percentual = número(dados, 'percentual', { rótulo: 'Percentual que sai do preço', mín: 0, obrigatório: false, padrão: 0 });

  // `número` já garantiu valores finitos; a conversão só recusa fração de centavo que viraria zero.
  const entrada = {
    custosFixosCentavos: centavosDoCampo(custosFixos, 'custosFixos', 'Custos fixos do mês'),
    lucroDesejadoCentavos: centavosDoCampo(lucro, 'lucro', 'Lucro desejado'),
    preçoCentavos: centavosDoCampo(preço, 'preço', 'Preço de venda'),
    custoVariávelCentavos: centavosDoCampo(custoVariável, 'custoVariável', 'Custo variável'),
    percentual,
  };
  const r = noCampoCerto(() => pontoDeEquilíbrio(entrada));

  const destaque = ['Você precisa vender', unidades(r.quantidade)];
  const resultados = [
    ['Faturamento necessário', reais(r.receitaCentavos)],
    ['Margem de contribuição por unidade', reais(r.margemCentavos)],
    ['Índice de margem', formatarÍndice(r.índice)],
    [`Média por dia (mês de ${DIAS_DO_MÊS} dias)`, unidades(r.porDia)],
  ];
  const dadosUsados = [
    ['Custos fixos do mês', reais(entrada.custosFixosCentavos)],
    ['Lucro desejado no mês', reais(entrada.lucroDesejadoCentavos)],
    ['Preço de venda por unidade', reais(entrada.preçoCentavos)],
    ['Custo variável por unidade', reais(entrada.custoVariávelCentavos)],
    ['Percentual que sai do preço', formatarPercentual(percentual)],
  ];

  // A conta escrita usa a margem exata, a mesma do cálculo: refeita à mão, dá o número mostrado.
  let quociente = unidades(r.quantidade);
  if (!éQuaseInteiro(r.quantidadeExata)) {
    const exata = formatarNúmero(r.quantidadeExata, { casas: 2 });
    const pareceInteira = !exata.includes(',');
    quociente = `${pareceInteira ? 'pouco mais de ' : ''}${exata}; arredondando para cima, ${unidades(r.quantidade)}`;
  }
  const conta = [
    'A conta: quantidade = (custos fixos + lucro) ÷ margem de contribuição por unidade = '
      + `${reais(r.alvoCentavos)} ÷ ${reaisExatos(r.margemExataCentavos)} = ${quociente}.`,
    ...avisoDeMargemArredondada(r.margemExataCentavos, reais(r.margemCentavos)),
    'A margem por unidade já desconta o custo variável e o percentual que sai do preço. '
      + 'A quantidade é arredondada para cima, porque não se vende parte de uma unidade.',
  ];
  if (r.alvoCentavos === 0) {
    conta.push(`Sem custo fixo e sem lucro desejado não há o que cobrir: cada venda já deixa ${reais(r.margemCentavos)}.`);
  } else if (r.receitaDaQuantidadeInteiraCentavos !== r.receitaCentavos) {
    conta.push(`Vendendo ${unidades(r.quantidade)} inteiras, o faturamento fica em `
      + `${reais(r.receitaDaQuantidadeInteiraCentavos)}. O faturamento necessário é menor porque a última `
      + 'unidade vendida já passa do ponto de equilíbrio.');
  }

  const resumo = { título: TÍTULO, destaque, resultados, dados: dadosUsados, conta };
  let frase;
  if (r.alvoCentavos === 0) {
    frase = 'Sem custos fixos nem lucro desejado, não há mínimo de vendas a atingir.';
  } else {
    const para = entrada.lucroDesejadoCentavos > 0
      ? `cobrir ${reais(entrada.custosFixosCentavos)} de custos fixos e ainda lucrar ${reais(entrada.lucroDesejadoCentavos)}`
      : `cobrir ${reais(entrada.custosFixosCentavos)} de custos fixos`;
    frase = `É o que você precisa vender no mês para ${para}, faturando ${reais(r.receitaCentavos)}.`;
  }

  return {
    valor: unidades(r.quantidade),
    resumo: frase,
    linhas: resultados,
    observações: conta,
    texto: textoDoResumo(resumo),
    arquivos: [{
      rótulo: 'Baixar resumo em PDF',
      ícone: 'documento',
      gerar: () => baixar(
        pdfDoResumo({ ...resumo, subtítulo: `${unidades(r.quantidade)} no mês` }),
        `${nomeDeArquivo(`ponto-de-equilibrio-${r.quantidade}-unidades`)}.pdf`,
        'application/pdf',
      ),
    }],
  };
}

export default {
  instruções: {
    passos: [
      'Some tudo o que sai do caixa todo mês mesmo sem vender nada: aluguel, salários, internet, contador. Esse é o custo fixo.',
      'Informe o preço de venda e o que sai em cada venda: o custo variável em reais e o percentual que sai do preço.',
      'Se quiser um lucro além de empatar, escreva o valor. A quantidade sobe junto.',
      'Copie o resultado ou baixe o resumo em PDF, com os dados usados e a conta feita.',
    ],
    exemplo: {
      texto: 'Custos fixos de R$ 5.000,00 no mês, preço de R$ 50,00, custo variável de R$ 20,00 e 10% de taxas: '
        + 'cada venda deixa R$ 25,00, então você precisa vender 200 unidades e faturar R$ 10.000,00 — '
        + 'uma média de 7 por dia. Querendo R$ 2.500,00 de lucro, a conta sobe para 300 unidades e R$ 15.000,00.',
    },
    limites: 'A conta considera um produto (ou um preço médio) e um mês comercial de 30 dias. '
      + 'Custo variável e percentual são por venda; custo fixo e lucro desejado, por mês. '
      + 'Se o custo variável mais o percentual chegam ao preço, nenhuma quantidade fecha a conta e a ferramenta avisa em vez de inventar um número. '
      + 'O faturamento necessário é o valor exato; a quantidade é arredondada para cima.',
    perguntas: [
      { p: 'Como sei se um custo é fixo ou variável?', r: 'Pergunte: se eu não vender nada este mês, ainda pago? Se sim, é fixo. Se só aparece quando há venda, é variável.' },
      { p: 'Serve para serviço, não só para produto?', r: 'Serve. No lugar de unidade, pense em atendimento, hora ou contrato: o preço é o valor cobrado e o custo variável é o que você gasta para entregar aquele serviço.' },
      { p: 'E se a conta não fechar de jeito nenhum?', r: 'Quando a margem por unidade é zero ou negativa, vender mais só aumenta o prejuízo. Antes de buscar volume, reveja preço, custo variável ou as taxas.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular ponto de equilíbrio',
      campos: [
        {
          nome: 'custosFixos', rótulo: 'Custos fixos do mês (R$)', tipo: 'número', exemplo: '5.000,00',
          dica: 'Aluguel, salários, internet, contador: o que você paga mesmo vendendo zero.',
        },
        {
          nome: 'lucro', rótulo: 'Lucro que você quer no mês (R$)', tipo: 'número', padrão: '0',
          dica: 'Opcional. Deixe 0 para calcular só o empate.',
        },
        { nome: 'preço', rótulo: 'Preço de venda por unidade (R$)', tipo: 'número', exemplo: '50,00' },
        {
          nome: 'custoVariável', rótulo: 'Custo variável por unidade (R$)', tipo: 'número', padrão: '0',
          dica: 'O que só existe quando vende: matéria-prima, embalagem, frete de envio.',
        },
        {
          nome: 'percentual', rótulo: 'Percentual que sai do preço (%)', tipo: 'número', padrão: '0',
          dica: 'Taxa de cartão, comissão e imposto somados, em percentual do preço.',
        },
      ],
      calcular: calcularPontoNaTela,
    });
  },
};
