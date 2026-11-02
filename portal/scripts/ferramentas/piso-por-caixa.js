/** Caixas de piso ou revestimento a comprar. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { caixasDePiso } from '../cálculos/obra.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Informe a área do ambiente em metros quadrados.',
      'Veja na caixa quantos metros quadrados ela cobre e digite aqui.',
      'Ajuste a margem de recorte: 10% é o usual; suba para 15% ou 20% em ambiente com muitos cantos ou assentamento na diagonal.',
      'O resultado diz quantas caixas comprar e quanto vai sobrar.',
    ],
    exemplo: {
      texto: 'Ambiente de 20 m², caixa que cobre 2,2 m², margem de 10%: 22 m² com a margem, 10 caixas, cobrindo 22 m².',
    },
    limites: 'O arredondamento é sempre para cima, porque meia caixa não se compra. '
      + 'A margem de recorte cobre quebra e peça cortada, não cobre erro de medição: meça o ambiente com cuidado. '
      + 'Vale guardar a sobra, porque lote diferente costuma ter tonalidade diferente.',
    perguntas: [
      { p: 'Por que 10% de margem?', r: 'É a perda típica de corte em ambiente retangular. Em assentamento diagonal ou ambiente com muitos recortes, a perda sobe para 15% ou 20%.' },
      { p: 'Posso comprar exatamente a área do ambiente?', r: 'Não é recomendável. Sem margem, qualquer peça quebrada no transporte ou no corte interrompe a obra, e o lote novo pode ter tom diferente.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular caixas',
      campos: [
        { nome: 'área', rótulo: 'Área do ambiente (m²)', tipo: 'número', exemplo: '20' },
        { nome: 'cobertura', rótulo: 'Cobertura de cada caixa (m²)', tipo: 'número', exemplo: '2,2' },
        { nome: 'perda', rótulo: 'Margem de recorte (%)', tipo: 'número', padrão: '10' },
      ],
      calcular(dados) {
        const área = número(dados, 'área', { rótulo: 'Área do ambiente', mín: 0.01 });
        const cobertura = número(dados, 'cobertura', { rótulo: 'Cobertura da caixa', mín: 0.01 });
        const perda = número(dados, 'perda', { rótulo: 'Margem de recorte', mín: 0, máx: 100 });
        const r = caixasDePiso({ área, coberturaPorCaixa: cobertura, perda });

        return {
          valor: `${r.caixas} caixa${r.caixas === 1 ? '' : 's'}`,
          resumo: `Cobrem ${formatarNúmero(r.áreaCoberta, { casas: 2 })} m².`,
          linhas: [
            ['Área do ambiente', `${formatarNúmero(área, { casas: 2 })} m²`],
            [`Área com ${formatarNúmero(perda, { casas: 0 })}% de margem`, `${formatarNúmero(r.áreaComPerda, { casas: 2 })} m²`],
            ['Caixas a comprar', String(r.caixas)],
            ['Área coberta', `${formatarNúmero(r.áreaCoberta, { casas: 2 })} m²`],
            ['Sobra em relação ao ambiente', `${formatarNúmero(r.sobra, { casas: 2 })} m²`],
          ],
          observações: ['Guarde a sobra: um lote comprado depois pode ter tonalidade diferente.'],
        };
      },
    });
  },
};
