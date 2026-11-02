/** Calculadora de porcentagem — cinco operações numa ferramenta só. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { porcentagem } from '../cálculos/dinheiro.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const OPERAÇÕES = [
  { valor: 'de', rótulo: 'Quanto é A% de B' },
  { valor: 'proporção', rótulo: 'A é quantos % de B' },
  { valor: 'aumento', rótulo: 'A com aumento de B%' },
  { valor: 'desconto', rótulo: 'A com desconto de B%' },
  { valor: 'variação', rótulo: 'Variação de A para B' },
];

const RÓTULOS = {
  de: ['Porcentagem (A)', 'Valor (B)'],
  proporção: ['Parte (A)', 'Total (B)'],
  aumento: ['Valor (A)', 'Aumento em % (B)'],
  desconto: ['Valor (A)', 'Desconto em % (B)'],
  variação: ['Valor inicial (A)', 'Valor final (B)'],
};

export default {
  instruções: {
    passos: [
      'Escolha a operação na lista: os rótulos dos dois campos mudam junto.',
      'Digite os dois valores. Pode usar vírgula como separador decimal.',
      'Toque em Calcular. O resultado aparece com a conta montada embaixo.',
      'Use Copiar para levar o resultado para onde você precisa.',
    ],
    exemplo: {
      texto: 'Uma peça de R$ 249,90 com 15% de desconto: escolha "A com desconto de B%", digite 249,90 e 15. '
        + 'O resultado é R$ 212,42, com o abatimento de R$ 37,49 mostrado à parte.',
    },
    limites: 'Os resultados aparecem com duas casas decimais, mas a conta é feita com a precisão do número inteiro digitado. '
      + 'Aumento e desconto são aplicados sobre o valor A, nunca em cascata.',
    perguntas: [
      { p: 'Por que 100 com 50% de aumento e depois 50% de desconto não volta para 100?', r: 'Porque o desconto incide sobre 150, não sobre 100. 50% de 150 é 75, então o resultado é 75. É matemática, não erro da ferramenta.' },
      { p: 'Qual a diferença entre "variação" e "A é quantos % de B"?', r: 'A variação compara dois momentos do mesmo valor (de 80 para 100 é +25%). A proporção compara uma parte com um total (80 é 80% de 100).' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      campos: [
        { nome: 'operação', rótulo: 'O que você quer calcular', tipo: 'seleção', opções: OPERAÇÕES, padrão: 'de' },
        { nome: 'a', rótulo: 'Valor A', tipo: 'número', exemplo: '15' },
        { nome: 'b', rótulo: 'Valor B', tipo: 'número', exemplo: '200' },
      ],
      calcular(dados) {
        const operação = dados.operação;
        const [rótuloA, rótuloB] = RÓTULOS[operação];
        const a = número(dados, 'a', { rótulo: rótuloA });
        const b = número(dados, 'b', { rótulo: rótuloB });
        const { valor, fórmula, extra = [] } = porcentagem(operação, a, b);
        const porcento = operação === 'proporção' || operação === 'variação';

        return {
          valor: porcento
            ? `${formatarNúmero(valor, { casas: 2 })}%`
            : formatarNúmero(valor, { casas: 2 }),
          resumo: fórmula,
          linhas: [
            [rótuloA, formatarNúmero(a, { casas: 2 })],
            [rótuloB, formatarNúmero(b, { casas: 2 })],
            ...extra.map(([r, v]) => [r, formatarNúmero(v, { casas: 2 })]),
          ],
          observações: operação === 'variação' && valor < 0
            ? ['A variação é negativa: o valor final é menor que o inicial.'] : [],
        };
      },
      aoMontar(elemento) {
        // Os rótulos dos campos acompanham a operação escolhida.
        const seleção = elemento.querySelector('#campo-operação');
        const rótuloA = elemento.querySelector('label[for="campo-a"]');
        const rótuloB = elemento.querySelector('label[for="campo-b"]');
        const sincronizar = () => {
          const [a, b] = RÓTULOS[seleção.value];
          rótuloA.textContent = a;
          rótuloB.textContent = b;
        };
        seleção.addEventListener('change', sincronizar);
        sincronizar();
      },
    });
  },
};
