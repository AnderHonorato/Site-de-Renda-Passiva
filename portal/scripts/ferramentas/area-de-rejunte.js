/** Volume e massa de rejunte, pela geometria das juntas. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { rejunteNecessário } from '../cálculos/obra.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export default {
  instruções: {
    passos: [
      'Informe a área revestida em metros quadrados.',
      'Meça a peça em milímetros: uma peça de 60 × 60 cm tem 600 × 600 mm.',
      'Informe a largura da junta e a profundidade, também em milímetros. A profundidade costuma ser a espessura da peça.',
      'A densidade vem no saco do rejunte; 1,6 kg/L é um valor comum.',
      'O resultado é a estimativa de massa a comprar.',
    ],
    exemplo: {
      texto: 'Área de 20 m², peça de 600 × 600 mm, junta de 3 mm de largura por 8 mm de profundidade, densidade 1,6: '
        + 'cerca de 2,56 kg de rejunte.',
    },
    limites: 'A conta é a fórmula usual do setor e dá uma estimativa, não um número exato: '
      + 'peça com borda retificada, assentamento irregular e perda no acabamento mudam o consumo real. '
      + 'Compre com folga e prefira um saco a mais a interromper o serviço. '
      + 'A profundidade é a da junta preenchida, normalmente igual à espessura da peça.',
    perguntas: [
      { p: 'Por que o consumo muda tanto com o tamanho da peça?', r: 'Porque peça pequena tem muito mais metro linear de junta por metro quadrado. Pastilha consome várias vezes mais rejunte que porcelanato grande.' },
      { p: 'A estimativa serve para piso e parede?', r: 'Serve para os dois, desde que você informe a medida da peça e da junta de cada superfície separadamente.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Estimar rejunte',
      campos: [
        { nome: 'área', rótulo: 'Área revestida (m²)', tipo: 'número', exemplo: '20' },
        { nome: 'larguraDaPeça', rótulo: 'Largura da peça (mm)', tipo: 'número', padrão: '600' },
        { nome: 'alturaDaPeça', rótulo: 'Altura da peça (mm)', tipo: 'número', padrão: '600' },
        { nome: 'larguraDaJunta', rótulo: 'Largura da junta (mm)', tipo: 'número', padrão: '3' },
        { nome: 'profundidade', rótulo: 'Profundidade da junta (mm)', tipo: 'número', padrão: '8' },
        { nome: 'densidade', rótulo: 'Densidade do rejunte (kg/L)', tipo: 'número', padrão: '1,6' },
      ],
      calcular(dados) {
        const área = número(dados, 'área', { rótulo: 'Área revestida', mín: 0.01 });
        const larguraDaPeça = número(dados, 'larguraDaPeça', { rótulo: 'Largura da peça', mín: 1, máx: 5000 });
        const alturaDaPeça = número(dados, 'alturaDaPeça', { rótulo: 'Altura da peça', mín: 1, máx: 5000 });
        const larguraDaJunta = número(dados, 'larguraDaJunta', { rótulo: 'Largura da junta', mín: 0.1, máx: 50 });
        const profundidade = número(dados, 'profundidade', { rótulo: 'Profundidade da junta', mín: 0.1, máx: 100 });
        const densidade = número(dados, 'densidade', { rótulo: 'Densidade', mín: 0.1, máx: 5 });

        const r = rejunteNecessário({
          área, larguraDaPeça, alturaDaPeça, larguraDaJunta, profundidade, densidade,
        });
        const consumoPorM2 = r.massaKg / área;

        return {
          valor: `${formatarNúmero(r.massaKg, { casas: 2 })} kg`,
          resumo: `Cerca de ${formatarNúmero(consumoPorM2, { casas: 3 })} kg por metro quadrado.`,
          linhas: [
            ['Consumo por m²', `${formatarNúmero(consumoPorM2, { casas: 3 })} kg`],
            ['Massa total estimada', `${formatarNúmero(r.massaKg, { casas: 2 })} kg`],
            ['Volume das juntas', `${formatarNúmero(r.volumeLitros, { casas: 2 })} L`],
            ['Sugestão de compra', `${Math.ceil(r.massaKg / 5)} saco(s) de 5 kg`],
          ],
          observações: [
            'É uma estimativa: borda retificada, assentamento irregular e perda no acabamento mudam o consumo real.',
            'Prefira comprar um saco a mais do que interromper o serviço no meio.',
          ],
        };
      },
    });
  },
};
