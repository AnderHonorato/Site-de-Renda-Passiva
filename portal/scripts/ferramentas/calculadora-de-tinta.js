/** Litros de tinta necessários e a combinação de embalagens mais barata. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { litrosDeTinta, combinaçõesDeEmbalagem } from '../cálculos/obra.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/** Lê as embalagens no formato "nome; litros; preço". */
function lerEmbalagens(valor) {
  const linhas = String(valor ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) throw new ErroDeEntrada('Informe ao menos uma embalagem.', 'embalagens');
  if (linhas.length > 10) throw new ErroDeEntrada('Limite de 10 embalagens.', 'embalagens');

  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[;|]\s*/).map((p) => p.trim());
    if (partes.length < 3) {
      throw new ErroDeEntrada(
        `A linha ${índice + 1} precisa ter nome, litros e preço. Exemplo: Lata 18 L; 18; 289,90`,
        'embalagens',
      );
    }
    const [nome, litrosBrutos, preçoBruto] = partes;
    const litros = paraNúmero(litrosBrutos);
    const preço = paraNúmero(preçoBruto);
    if (!Number.isFinite(litros) || litros <= 0) throw new ErroDeEntrada(`Volume inválido na linha ${índice + 1}.`, 'embalagens');
    if (!Number.isFinite(preço) || preço < 0) throw new ErroDeEntrada(`Preço inválido na linha ${índice + 1}.`, 'embalagens');
    return { nome: nome || `Embalagem ${índice + 1}`, litros, preçoCentavos: emCentavos(preço) };
  });
}

export default {
  instruções: {
    passos: [
      'Informe a área a pintar. Se não souber, use antes a ferramenta de área de paredes.',
      'Diga quantas demãos você vai dar: duas é o padrão sobre superfície já pintada; três sobre massa corrida nova ou mudança de cor forte.',
      'Copie o rendimento do rótulo da tinta, em metros quadrados por litro.',
      'Liste as embalagens disponíveis na loja: nome; litros; preço.',
      'O resultado mostra os litros necessários e qual combinação de latas sai mais barata.',
    ],
    exemplo: {
      texto: '35 m² com 2 demãos e rendimento de 10 m²/L dão 7 litros. Com 10% de perda, 7,7 litros. '
        + 'Entre uma lata de 18 L por R$ 289,90 e galões de 3,6 L por R$ 79,90, a conta mostra qual sai melhor.',
    },
    limites: 'O rendimento do rótulo é medido em condição ideal, sobre superfície selada e lisa. '
      + 'Parede nova, muito absorvente ou texturizada rende menos, e por isso existe a margem de perda. '
      + 'A comparação considera preço e volume: não avalia qualidade, cobertura nem durabilidade da tinta.',
    perguntas: [
      { p: 'Por que a tinta rende menos do que diz o rótulo?', r: 'Porque o rótulo supõe superfície selada e lisa. Em parede nova sem selador, em gesso ou em textura, o consumo sobe. Trabalhe com 10% a 20% de margem.' },
      { p: 'Vale sempre levar a lata maior?', r: 'Nem sempre. Se você precisa de 7,7 litros, uma lata de 18 L custa caro e sobra metade. A ferramenta testa também a mistura de tamanhos, que costuma ser o melhor negócio.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular tinta',
      campos: [
        { nome: 'área', rótulo: 'Área a pintar (m²)', tipo: 'número', exemplo: '35' },
        { nome: 'demãos', rótulo: 'Demãos', tipo: 'número', padrão: '2' },
        { nome: 'rendimento', rótulo: 'Rendimento do rótulo (m² por litro)', tipo: 'número', padrão: '10' },
        { nome: 'perda', rótulo: 'Margem de perda (%)', tipo: 'número', padrão: '10' },
        {
          nome: 'embalagens', rótulo: 'Embalagens disponíveis', tipo: 'área', linhas: 4,
          padrão: 'Lata 18 L; 18; 289,90\nGalão 3,6 L; 3,6; 79,90\nQuarto 0,9 L; 0,9; 27,90',
          dica: 'nome; litros; preço em reais',
        },
      ],
      calcular(dados) {
        const área = número(dados, 'área', { rótulo: 'Área a pintar', mín: 0.01 });
        const demãos = número(dados, 'demãos', { rótulo: 'Demãos', mín: 1, máx: 6, inteiro: true });
        const rendimento = número(dados, 'rendimento', { rótulo: 'Rendimento', mín: 0.1 });
        const perda = número(dados, 'perda', { rótulo: 'Margem de perda', mín: 0, máx: 100 });
        const embalagens = lerEmbalagens(dados.embalagens);

        const { litros, litrosComPerda } = litrosDeTinta({ área, demãos, rendimentoPorLitro: rendimento, perda });
        const opções = combinaçõesDeEmbalagem(litrosComPerda, embalagens).slice(0, 6);
        const melhor = opções[0];

        const litrosTexto = (v) => `${formatarNúmero(v, { casas: 2 })} L`;

        return {
          valor: melhor.nome,
          resumo: `${formatarMoeda(melhor.custoCentavos / 100)} para ${litrosTexto(litrosComPerda)} necessários.`,
          linhas: [
            ['Área × demãos', `${formatarNúmero(área * demãos, { casas: 2 })} m²`],
            ['Litros pelo rendimento', litrosTexto(litros)],
            [`Com ${formatarNúmero(perda, { casas: 0 })}% de perda`, litrosTexto(litrosComPerda)],
            ['Compra sugerida', melhor.nome],
            ['Custo', formatarMoeda(melhor.custoCentavos / 100)],
            ['Sobra', litrosTexto(melhor.sobra)],
          ],
          tabela: {
            cabeçalho: ['Opção de compra', 'Litros', 'Custo', 'Custo por litro', 'Sobra'],
            linhas: opções.map((o) => [
              o.nome,
              formatarNúmero(o.litros, { casas: 2 }),
              formatarMoeda(o.custoCentavos / 100),
              formatarMoeda(o.custoCentavos / 100 / o.litros),
              formatarNúmero(o.sobra, { casas: 2 }),
            ]),
          },
          observações: [
            'O rendimento do rótulo vale para superfície selada e lisa; parede nova ou texturizada consome mais.',
            'A comparação é de preço e volume: não avalia cobertura nem durabilidade da tinta.',
          ],
        };
      },
    });
  },
};
