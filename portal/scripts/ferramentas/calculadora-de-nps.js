/** Calculadora de NPS: detratores, neutros, promotores e o índice, com a conta à vista. */
import { montarFerramenta, texto, comCampo, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import {
  lerRespostas, calcularNps, FORMAS, MÁXIMO_DE_NOTAS, MÁXIMO_DE_CARACTERES, MÁXIMO_POR_NOTA,
  LIMITE_DE_POUCAS_RESPOSTAS, LIMITE_DE_AMOSTRA_RAZOÁVEL, ZONAS,
} from '../cálculos/calculadora-de-nps.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { plural } from '../núcleo/texto.js';

const TÍTULO = 'Calculadora de NPS';
const GRUPOS = {
  promotores: 'Promotores (notas 9 e 10)',
  neutros: 'Neutros (notas 7 e 8)',
  detratores: 'Detratores (notas 0 a 6)',
};

const inteiro = (n) => formatarNúmero(n, { casas: 0 });
const percentual = (p) => `${formatarNúmero(p, { casas: 1, casasMínimas: 1 })}%`;
const respostas = (n) => `${inteiro(n)} ${plural(n, 'resposta', 'respostas')}`;

/**
 * Escreve o quociente exato sem fingir que é inteiro: 3 ÷ 8 × 100 = 37,5 e
 * 1 ÷ 3 × 100 = 33,33; um valor que arredonda para "33" mas não é 33 ganha
 * mais casas, para a conta escrita não contradizer o arredondamento depois dela.
 */
function quocienteExato(numerador, divisor) {
  if (numerador % divisor === 0) return inteiro(numerador / divisor);
  const exato = numerador / divisor;
  for (const casas of [2, 4, 6, 8, 10]) {
    const escrito = formatarNúmero(exato, { casas });
    if (escrito.includes(',')) return escrito;
  }
  return formatarNúmero(exato, { casas: 10 });
}

function margemEscrita(margem) {
  if (margem < 0.1) return 'menos de ± 0,1 ponto';
  return `± ${formatarNúmero(margem, { casas: margem < 10 ? 1 : 0 })} ${margem < 1 ? 'ponto' : 'pontos'}`;
}

/** O que a linha de margem de erro diz quando não há número para mostrar. */
function margemNaLinha(r) {
  if (r.margemDeErro !== null) return margemEscrita(r.margemDeErro);
  return r.total < LIMITE_DE_POUCAS_RESPOSTAS
    ? `não calculada (menos de ${LIMITE_DE_POUCAS_RESPOSTAS} respostas)`
    : 'não calculada (um só grupo)';
}

/** Avisos sobre o tamanho da amostra: o que a quantidade de respostas permite concluir. */
function avisosDeAmostra(r) {
  const pontos = formatarNúmero(r.pesoDeUmaResposta, { casas: 1 });
  if (r.amostra === 'muito pequena') {
    return [
      `Poucas respostas: com ${respostas(r.total)}, o NPS descreve essas pessoas e não o seu público todo. `
      + `Uma única resposta que mude de detratora para promotora move o NPS em ${pontos} pontos. `
      + 'Junte mais respostas antes de tirar conclusões ou de comparar períodos.',
    ];
  }
  if (r.margemDeErro === null) {
    return [
      `Com ${respostas(r.total)} todas caíram no mesmo grupo, e a margem de erro não pode ser calculada: `
      + 'isso não significa certeza, só que a amostra não mostra variação.',
    ];
  }
  const margem = margemEscrita(r.margemDeErro);
  if (r.amostra === 'pequena') {
    return [
      `Amostra pequena: com ${respostas(r.total)}, a margem de erro é de cerca de ${margem} (95% de confiança). `
      + 'Diferença pequena entre duas pesquisas pode ser só acaso.',
    ];
  }
  return [
    `Com ${respostas(r.total)}, a margem de erro é de cerca de ${margem} (95% de confiança): `
    + 'variação menor que isso entre duas pesquisas não indica mudança real.',
  ];
}

/** Texto para copiar: resultado, conta e distribuição, legível fora da ferramenta. */
function textoParaCopiar(r, conta) {
  const linhas = [
    TÍTULO,
    `NPS: ${r.nps} (${r.zona.nome})`,
    `Respostas: ${inteiro(r.total)}`,
    ...Object.entries(GRUPOS).map(([grupo, rótulo]) => `${rótulo}: ${inteiro(r[grupo])} (${percentual(r.percentuais[grupo])})`),
    '',
    conta,
    '',
    'Distribuição das notas:',
    ...r.porNota.map((l) => `Nota ${l.nota}: ${respostas(l.respostas)} (${percentual(l.percentual)})`),
  ];
  return linhas.join('\n');
}

/** Linhas da planilha: células tipadas (texto, número), porque o gerador de .xlsx lê objetos. */
function linhasDaPlanilha(r) {
  const t = (valor, estilo) => ({ texto: String(valor), ...(estilo ? { estilo } : {}) });
  const n = (valor) => ({ número: valor, formato: 'decimal' });
  return [
    ['Nota', 'Respostas', 'Percentual (%)', 'Grupo'].map((c) => t(c, 'cabeçalho')),
    ...r.porNota.map((l) => [n(l.nota), n(l.respostas), n(l.percentual), t(l.grupo)]),
    [],
    [t('Total de respostas', 'negrito'), n(r.total), n(100)],
    ...Object.entries(GRUPOS).map(([grupo, rótulo]) => [t(rótulo), n(r[grupo]), n(r.percentuais[grupo])]),
    [],
    [t('NPS', 'negrito'), n(r.nps)],
    [t('Zona'), t(r.zona.nome)],
    [t('Margem de erro (95%, em pontos)'), r.margemDeErro === null ? t('não calculada') : n(Math.round(r.margemDeErro * 10) / 10)],
  ];
}

/**
 * Lê o formulário, calcula e monta o que a tela, o texto copiado e a planilha mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularNpsNaTela(dados) {
  const bruto = texto(dados, 'notas', { rótulo: 'Respostas da pesquisa', obrigatório: false, máximo: Number.MAX_SAFE_INTEGER });
  const forma = FORMAS.includes(dados.forma) ? dados.forma : 'notas';
  const r = comCampo('notas', () => calcularNps(lerRespostas(bruto, forma)));

  // A conta usa as contagens, não os percentuais arredondados: refeita à mão, dá o número mostrado.
  const quociente = quocienteExato(r.diferença * 100, r.total);
  const arredondou = (r.diferença * 100) % r.total !== 0;
  const conta = `A conta: NPS = (promotores − detratores) ÷ total × 100 = (${inteiro(r.promotores)} − ${inteiro(r.detratores)}) `
    + `÷ ${inteiro(r.total)} × 100 = ${quociente}`
    + `${arredondou ? `; arredondando para o inteiro mais próximo, ${inteiro(r.nps)}` : ''}.`;

  const linhas = [
    ...Object.entries(GRUPOS).map(([grupo, rótulo]) => [rótulo, `${inteiro(r[grupo])} · ${percentual(r.percentuais[grupo])}`]),
    ['Total de respostas', inteiro(r.total)],
    ['Margem de erro (95%)', margemNaLinha(r)],
  ];

  const observações = [
    conta,
    'Os neutros (7 e 8) não entram na diferença, mas contam no total: por isso um grupo grande de neutros puxa o NPS para perto de zero.',
    ...avisosDeAmostra(r),
    'A margem supõe que quem respondeu representa os seus clientes; quem não respondeu pode pensar diferente.',
    `Leitura usual do índice: ${ZONAS.map((z) => `${z.nome.toLowerCase()} de ${z.faixa}`).join(', ')}. `
    + 'O que é um bom NPS varia de setor para setor.',
  ];

  return {
    valor: `NPS ${r.nps}`,
    resumo: `${r.zona.nome}, com ${respostas(r.total)}: ${percentual(r.percentuais.promotores)} promotores, `
      + `${percentual(r.percentuais.neutros)} neutros e ${percentual(r.percentuais.detratores)} detratores.`,
    linhas,
    tabela: {
      semExportação: true,
      cabeçalho: ['Nota', 'Respostas', '%', 'Grupo'],
      linhas: r.porNota.map((l) => [String(l.nota), inteiro(l.respostas), percentual(l.percentual), l.grupo]),
    },
    observações,
    texto: textoParaCopiar(r, conta),
    arquivos: [{
      rótulo: 'Baixar planilha (XLSX)',
      ícone: 'planilha',
      gerar: () => baixarPlanilha(
        linhasDaPlanilha(r),
        nomeDeArquivo(`nps-${r.nps}-${r.total}-respostas`),
        { aba: 'NPS', larguras: [34, 12, 16, 14], título: TÍTULO },
      ),
    }],
  };
}

export default {
  instruções: {
    passos: [
      'Cole as notas da pesquisa: uma por resposta, separadas por vírgula, espaço ou quebra de linha. Dá para copiar a coluna direto da planilha.',
      'Se você só tem o resumo, em vez de cada nota, escolha a contagem por nota e escreva uma linha por nota, como "10: 25".',
      'Clique em Calcular NPS. A ferramenta separa detratores, neutros e promotores e mostra a conta feita.',
      'Veja o aviso sobre o tamanho da amostra antes de comparar com outra pesquisa. Copie o resultado ou baixe a planilha.',
    ],
    exemplo: {
      texto: 'As notas 9, 10, 8, 6, 10, 7, 9, 3, 10, 8 são 10 respostas: 5 promotores (9, 10, 10, 9, 10), 3 neutros (8, 7, 8) '
        + 'e 2 detratores (6, 3). NPS = (5 − 2) ÷ 10 × 100 = 30, na zona de aperfeiçoamento. '
        + 'Como são só 10 respostas, a ferramenta avisa que a amostra é pequena: uma resposta que mude de grupo move o índice em 20 pontos.',
    },
    limites: `Notas inteiras de 0 a 10; a vírgula separa notas, então "8,5" é lido como 8 e 5. `
      + `Coladas uma a uma, cabem até ${MÁXIMO_DE_NOTAS.toLocaleString('pt-BR')} notas (e ${MÁXIMO_DE_CARACTERES.toLocaleString('pt-BR')} caracteres); `
      + `na contagem por nota não há limite prático, até ${MÁXIMO_POR_NOTA.toLocaleString('pt-BR')} respostas em cada nota. `
      + 'Quem não respondeu não entra: só conta quem deu nota. '
      + `O NPS sai como inteiro, e meio ponto arredonda para longe do zero. A margem de erro (95% de confiança) só é calculada a partir de ${LIMITE_DE_POUCAS_RESPOSTAS} respostas `
      + `e supõe que quem respondeu representa os seus clientes. A leitura por zonas é uma convenção de mercado, não uma regra. `
      + 'Tudo roda no seu navegador: as notas não são enviadas a lugar nenhum.',
    perguntas: [
      { p: 'O que são detratores, neutros e promotores?', r: 'Detratores deram de 0 a 6 e tendem a falar mal; neutros (também chamados de passivos) deram 7 ou 8 e estão satisfeitos, mas não indicam; promotores deram 9 ou 10 e recomendam. O NPS é o percentual de promotores menos o de detratores.' },
      { p: 'Por que os neutros não entram na conta, mas mudam o resultado?', r: 'Eles não somam nem subtraem, porém fazem parte do total de respostas. Quanto maior o grupo de neutros, menores ficam os percentuais de promotores e de detratores e mais perto de zero o NPS.' },
      { p: 'Quantas respostas preciso para confiar no NPS?', r: `Com menos de ${LIMITE_DE_POUCAS_RESPOSTAS} respostas o índice oscila demais: uma única resposta pode mover vários pontos. A partir de ${LIMITE_DE_AMOSTRA_RAZOÁVEL} a margem de erro já fica razoável. A ferramenta mostra a margem de erro e avisa quando a amostra é pequena.` },
      { p: 'Posso colar um resumo em vez de todas as notas?', r: 'Pode. Escolha "Contagem por nota" e escreva uma linha por nota, como "10: 25" (25 pessoas deram 10). Notas que não aparecem valem zero. Se você tem só as onze quantidades, da nota 0 à 10, use a terceira opção.' },
      { p: 'O que é um NPS bom?', r: 'Depende do setor e do público. Como referência comum: acima de 50 é considerado bom e acima de 75, excelente. Compare principalmente com o seu próprio histórico, sempre com amostras de tamanho parecido.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular NPS',
      campos: [
        {
          nome: 'notas', rótulo: 'Respostas da pesquisa', tipo: 'área', linhas: 8, exemplo: '9, 10, 8, 6, 10, 7, 9, 3, 10, 8',
          dica: 'Uma nota de 0 a 10 por resposta, separadas por vírgula, espaço ou linha. Para colar contagens, mude "Como as respostas estão".',
        },
        {
          nome: 'forma', rótulo: 'Como as respostas estão', tipo: 'seleção', padrão: 'notas',
          opções: [
            { valor: 'notas', rótulo: 'Uma nota por resposta (9, 10, 8…)' },
            { valor: 'pares', rótulo: 'Contagem por nota, uma linha por nota (10: 25)' },
            { valor: 'onze', rótulo: 'Só as 11 quantidades, da nota 0 à 10' },
          ],
        },
      ],
      calcular: calcularNpsNaTela,
    });
  },
};
