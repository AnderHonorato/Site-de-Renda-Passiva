/** Rolos de papel de parede, considerando a repetição da estampa. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { rolosDePapelDeParede } from '../cálculos/obra.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Meça a largura e a altura da parede que vai receber o papel.',
      'Copie do rótulo a largura e o comprimento do rolo. O rolo comum no Brasil tem 0,53 m de largura por 10 m.',
      'Informe a repetição da estampa (rapport): vem no rótulo, em centímetros. Estampa lisa tem repetição zero.',
      'O resultado diz quantos rolos comprar e quanto se perde por causa do casamento do desenho.',
    ],
    exemplo: {
      texto: 'Parede de 4 × 2,70 m, rolo de 0,53 × 10 m, repetição de 32 cm: 8 faixas, cada uma cortada em 2,88 m, '
        + '3 faixas por rolo, 3 rolos.',
    },
    limites: 'A conta é para uma parede retangular e inteira. Portas e janelas normalmente não são descontadas em papel de parede, '
      + 'porque a faixa precisa ser cortada em altura cheia de qualquer forma; descontar dá resultado otimista e falta rolo. '
      + 'A repetição faz o desperdício: com estampa lisa não há perda de casamento. Compre tudo do mesmo lote, '
      + 'porque a cor varia entre lotes.',
    perguntas: [
      { p: 'O que é repetição ou rapport?', r: 'É de quanto em quanto o desenho se repete na vertical. Para o desenho casar entre duas faixas vizinhas, cada faixa é cortada no próximo múltiplo da repetição, e o pedaço que passa da altura da parede vira perda.' },
      { p: 'Desconto a porta?', r: 'Em geral não. A faixa sobre a porta ainda precisa ser cortada da altura toda para o desenho casar com as vizinhas. Descontar faz faltar rolo.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular rolos',
      campos: [
        { nome: 'largura', rótulo: 'Largura da parede (m)', tipo: 'número', exemplo: '4' },
        { nome: 'altura', rótulo: 'Altura da parede (m)', tipo: 'número', exemplo: '2,70' },
        { nome: 'larguraDoRolo', rótulo: 'Largura do rolo (m)', tipo: 'número', padrão: '0,53' },
        { nome: 'comprimentoDoRolo', rótulo: 'Comprimento do rolo (m)', tipo: 'número', padrão: '10' },
        { nome: 'repetição', rótulo: 'Repetição da estampa (cm)', tipo: 'número', padrão: '0', dica: 'Zero para estampa lisa ou sem casamento.' },
      ],
      calcular(dados) {
        const largura = número(dados, 'largura', { rótulo: 'Largura da parede', mín: 0.01 });
        const altura = número(dados, 'altura', { rótulo: 'Altura da parede', mín: 0.01 });
        const larguraDoRolo = número(dados, 'larguraDoRolo', { rótulo: 'Largura do rolo', mín: 0.01 });
        const comprimentoDoRolo = número(dados, 'comprimentoDoRolo', { rótulo: 'Comprimento do rolo', mín: 0.1 });
        const repetiçãoCm = número(dados, 'repetição', { rótulo: 'Repetição', mín: 0, máx: 200 });

        const r = rolosDePapelDeParede({
          larguraDaParede: largura,
          alturaDaParede: altura,
          larguraDoRolo,
          comprimentoDoRolo,
          repetição: repetiçãoCm / 100,
        });

        const m = (v) => `${formatarNúmero(v, { casas: 2 })} m`;

        return {
          valor: `${r.rolos} rolo${r.rolos === 1 ? '' : 's'}`,
          resumo: `${r.faixas} faixas de ${m(r.alturaDaFaixa)}, ${r.faixasPorRolo} por rolo.`,
          linhas: [
            ['Faixas necessárias', String(r.faixas)],
            ['Altura de corte de cada faixa', m(r.alturaDaFaixa)],
            ['Faixas por rolo', String(r.faixasPorRolo)],
            ['Rolos a comprar', String(r.rolos)],
            ['Perda pelo casamento da estampa', m(r.desperdício)],
          ],
          observações: [
            repetiçãoCm > 0
              ? `Cada faixa perde ${formatarNúmero((r.alturaDaFaixa - altura) * 100, { casas: 0 })} cm para o desenho casar com a faixa vizinha.`
              : 'Estampa sem repetição: não há perda de casamento.',
            'Compre todos os rolos do mesmo lote: a cor varia entre lotes diferentes.',
          ],
        };
      },
    });
  },
};
