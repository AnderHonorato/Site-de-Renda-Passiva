/** Margem de contribuição: o que sobra de cada venda para pagar o custo fixo e virar lucro. */
import { montarFerramenta, número, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { margemDeContribuição } from '../cálculos/custos.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import {
  noCampoCerto, formatarÍndice, formatarPercentual, unidades, textoDoResumo, pdfDoResumo,
} from './auxiliares/resumo-de-custos.js';

const TÍTULO = 'Margem de contribuição';
const reais = (centavos) => formatarMoeda(centavos / 100);

/** O campo opcional só entra no resultado quando a pessoa escreveu alguma coisa nele. */
const preenchido = (dados, nome) => String(dados[nome] ?? '').trim() !== '';

/**
 * Lê o formulário, calcula e monta o que a tela, o texto copiado e o PDF mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularMargemNaTela(dados) {
  const preço = número(dados, 'preço', { rótulo: 'Preço de venda', mín: 0 });
  const custoVariável = número(dados, 'custoVariável', { rótulo: 'Custo variável', mín: 0, obrigatório: false, padrão: 0 });
  const percentual = número(dados, 'percentual', { rótulo: 'Percentual que sai do preço', mín: 0, obrigatório: false, padrão: 0 });
  const quantidade = número(dados, 'quantidade', {
    rótulo: 'Quantidade vendida no mês', mín: 0, inteiro: true, obrigatório: false, padrão: 0,
  });
  const custosFixos = número(dados, 'custosFixos', { rótulo: 'Custos fixos do mês', mín: 0, obrigatório: false, padrão: 0 });
  const comQuantidade = preenchido(dados, 'quantidade');
  const comCustosFixos = preenchido(dados, 'custosFixos');

  // `número` já garantiu valores finitos; a conversão para centavos não falha aqui.
  const entrada = {
    preçoCentavos: emCentavos(preço),
    custoVariávelCentavos: emCentavos(custoVariável),
    percentual,
    quantidade,
    custosFixosCentavos: emCentavos(custosFixos),
  };
  const r = noCampoCerto(() => margemDeContribuição(entrada));

  const destaque = ['Sobra por venda', reais(r.margemCentavos)];
  const resultados = [
    ['Sobra por venda', reais(r.margemCentavos)],
    ['Índice de margem', formatarÍndice(r.índice)],
  ];
  if (comQuantidade) resultados.push(['Margem total no mês', reais(r.totalCentavos)]);
  if (comQuantidade && comCustosFixos) resultados.push(['Resultado depois do custo fixo', reais(r.resultadoCentavos)]);
  if (r.quantidadeDeEquilíbrio !== null) resultados.push(['Vendas para empatar no mês', unidades(r.quantidadeDeEquilíbrio)]);

  const dadosUsados = [
    ['Preço de venda por unidade', reais(entrada.preçoCentavos)],
    ['Custo variável por unidade', reais(entrada.custoVariávelCentavos)],
    ['Percentual que sai do preço', formatarPercentual(percentual)],
  ];
  if (comQuantidade) dadosUsados.push(['Quantidade vendida no mês', unidades(quantidade)]);
  if (comCustosFixos) dadosUsados.push(['Custos fixos do mês', reais(entrada.custosFixosCentavos)]);

  const conta = [
    'A conta: margem = preço − custo variável − preço × percentual → '
      + `${reais(r.margemCentavos)} = ${reais(entrada.preçoCentavos)} − ${reais(entrada.custoVariávelCentavos)} `
      + `− ${reais(entrada.preçoCentavos)} × ${formatarPercentual(percentual)}.`,
    'O índice é a margem dividida pelo preço: quanto de cada real vendido fica para pagar o custo fixo.',
  ];
  if (comQuantidade && comCustosFixos) {
    conta.push(r.resultadoCentavos >= 0
      ? `Com ${unidades(quantidade)} no mês, as margens somam ${reais(r.totalCentavos)}: pagam `
        + `${reais(entrada.custosFixosCentavos)} de custo fixo e sobram ${reais(r.resultadoCentavos)}.`
      : `Com ${unidades(quantidade)} no mês, as margens somam ${reais(r.totalCentavos)}: faltam `
        + `${reais(-r.resultadoCentavos)} para pagar ${reais(entrada.custosFixosCentavos)} de custo fixo.`);
  }
  if (r.quantidadeDeEquilíbrio !== null) {
    conta.push('As vendas para empatar são o custo fixo dividido pela sobra de cada venda, arredondado para cima.');
  }
  if (!comQuantidade && !comCustosFixos && !r.margemNegativa) {
    conta.push('Informe a quantidade vendida e os custos fixos do mês para ver se o mês fecha no azul.');
  }

  let frase;
  if (r.margemExataCentavos < 0) {
    frase = 'A margem está negativa: cada venda aumenta o prejuízo. Vender mais não resolve — reveja preço, custo variável ou taxas.';
  } else if (r.margemNegativa) {
    frase = 'A margem é zero: cada venda só paga o próprio custo e não sobra nada para o custo fixo. Reveja preço, custo variável ou taxas.';
  } else {
    frase = `De cada ${reais(entrada.preçoCentavos)} vendido, ${reais(r.margemCentavos)} (${formatarÍndice(r.índice)}) `
      + 'ficam para pagar o custo fixo e virar lucro.';
  }

  const resumo = { título: TÍTULO, destaque, resultados: resultados.slice(1), dados: dadosUsados, conta: [frase, ...conta] };

  return {
    valor: `${reais(r.margemCentavos)} por venda`,
    resumo: frase,
    linhas: resultados,
    observações: conta,
    texto: textoDoResumo(resumo),
    arquivos: [{
      rótulo: 'Baixar resumo em PDF',
      ícone: 'documento',
      gerar: () => baixar(
        pdfDoResumo({ ...resumo, subtítulo: `${reais(r.margemCentavos)} por venda` }),
        `${nomeDeArquivo('margem-de-contribuicao')}.pdf`,
        'application/pdf',
      ),
    }],
  };
}

export default {
  instruções: {
    passos: [
      'Comece por uma venda: preço, custo variável em reais e o percentual que sai do preço em taxas e imposto.',
      'O que sobra é a margem de contribuição. Ela ainda não é lucro: é o dinheiro que vai pagar o custo fixo.',
      'Se quiser, informe a quantidade vendida no mês e os custos fixos para ver se o mês fecha no azul e quantas vendas empatam a conta.',
      'Copie o resultado ou baixe o resumo em PDF, com os dados usados e a conta feita.',
    ],
    exemplo: {
      texto: 'Preço de R$ 80,00, custo variável de R$ 32,00 e 12% de taxas e imposto: sobram R$ 38,40 por venda, '
        + 'um índice de 48,0%. Vendendo 150 unidades, as margens somam R$ 5.760,00; com R$ 4.000,00 de custo fixo, '
        + 'o mês fecha com R$ 1.760,00 — e 105 vendas já empatam a conta.',
    },
    limites: 'A conta considera um produto por vez (ou um preço médio). Custo variável e percentual são por venda; '
      + 'quantidade e custo fixo, por mês. Margem zero ou negativa não é escondida: a ferramenta mostra o valor e avisa '
      + 'que vender mais não resolve. As vendas para empatar só aparecem com custo fixo informado e margem positiva, '
      + 'e são arredondadas para cima.',
    perguntas: [
      { p: 'Margem de contribuição é lucro?', r: 'Não. É o que sobra da venda antes do custo fixo. Só vira lucro depois que a soma das margens do mês paga aluguel, salários e o resto que não depende de vender.' },
      { p: 'Tenho vários produtos. Como uso?', r: 'Calcule um de cada vez. Comparar a margem de cada produto mostra qual deles realmente sustenta o negócio — às vezes o mais vendido não é o que mais contribui.' },
      { p: 'Para que serve o índice de margem?', r: 'Ele diz quanto de cada real vendido fica com você. É útil para comparar produtos de preços bem diferentes, onde o valor em reais engana.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular margem',
      campos: [
        { nome: 'preço', rótulo: 'Preço de venda por unidade (R$)', tipo: 'número', exemplo: '80,00' },
        {
          nome: 'custoVariável', rótulo: 'Custo variável por unidade (R$)', tipo: 'número', padrão: '0',
          dica: 'Matéria-prima, embalagem, frete de envio: o que só sai quando vende.',
        },
        {
          nome: 'percentual', rótulo: 'Percentual que sai do preço (%)', tipo: 'número', padrão: '0',
          dica: 'Taxa de cartão, comissão e imposto somados, em percentual do preço.',
        },
        {
          nome: 'quantidade', rótulo: 'Quantidade vendida no mês', tipo: 'número', exemplo: '150',
          dica: 'Opcional. Serve para ver o total do mês.',
        },
        {
          nome: 'custosFixos', rótulo: 'Custos fixos do mês (R$)', tipo: 'número', exemplo: '4.000,00',
          dica: 'Opcional. Serve para saber se o mês fecha no azul.',
        },
      ],
      calcular: calcularMargemNaTela,
    });
  },
};
