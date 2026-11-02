/** Regra de três direta e inversa. */
import { montarFerramenta, número, comCampo } from '../núcleo/montador.js';
import { regraDeTrês } from '../cálculos/medidas.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Preencha os três valores que você já conhece, na ordem em que aparecem na frase do problema.',
      'Escolha direta quando aumentar um aumenta o outro, e inversa quando aumentar um diminui o outro.',
      'O resultado mostra o valor de X e a conta montada.',
    ],
    exemplo: {
      texto: 'Se 3 pães custam R$ 7,50, quanto custam 8 pães? A = 3, B = 7,50, C = 8, proporção direta. X = R$ 20,00.',
    },
    limites: 'A proporção direta resolve X = (B × C) ÷ A. A inversa resolve X = (A × B) ÷ C. '
      + 'O primeiro valor não pode ser zero, porque dividir por zero não tem resultado.',
    perguntas: [
      { p: 'Quando a proporção é inversa?', r: 'Quando aumentar uma grandeza diminui a outra. Três pedreiros levam 10 dias; seis pedreiros levam 5. Mais gente, menos tempo.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      campos: [
        { nome: 'a', rótulo: 'Se A', tipo: 'número', exemplo: '3' },
        { nome: 'b', rótulo: 'está para B', tipo: 'número', exemplo: '7,50' },
        { nome: 'c', rótulo: 'assim como C', tipo: 'número', exemplo: '8' },
        {
          nome: 'tipo', rótulo: 'Tipo de proporção', tipo: 'seleção', padrão: 'direta',
          opções: [
            { valor: 'direta', rótulo: 'Direta (aumenta junto)' },
            { valor: 'inversa', rótulo: 'Inversa (aumenta um, diminui o outro)' },
          ],
        },
      ],
      calcular(dados) {
        const a = número(dados, 'a', { rótulo: 'Valor A' });
        const b = número(dados, 'b', { rótulo: 'Valor B' });
        const c = número(dados, 'c', { rótulo: 'Valor C' });
        const { x, fórmula } = comCampo(dados.tipo === 'inversa' ? 'c' : 'a',
          () => regraDeTrês(a, b, c, { inversa: dados.tipo === 'inversa' }));
        return {
          valor: formatarNúmero(x, { casas: 4, casasMínimas: 0 }),
          resumo: fórmula,
          linhas: [
            ['A', formatarNúmero(a, { casas: 4, casasMínimas: 0 })],
            ['B', formatarNúmero(b, { casas: 4, casasMínimas: 0 })],
            ['C', formatarNúmero(c, { casas: 4, casasMínimas: 0 })],
            ['X', formatarNúmero(x, { casas: 4, casasMínimas: 0 })],
          ],
        };
      },
    });
  },
};
