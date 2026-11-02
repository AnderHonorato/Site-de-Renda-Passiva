/** Rateio proporcional de custos com centavos exatos e arredondamento auditável. */
import { montarFerramenta, número, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { pdfDoResumo } from './auxiliares/resumo-de-custos.js';

export function distribuirCusto(totalCentavos, itens) {
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos < 1 || totalCentavos > 100_000_000_00) {
    throw new ErroDeEntrada('Informe total de R$ 0,01 a R$ 100 milhões.', 'total');
  }
  if (!Array.isArray(itens) || itens.length < 2 || itens.length > 100) {
    throw new ErroDeEntrada('Informe de 2 a 100 beneficiários.', 'itens');
  }
  const pesos = itens.map((item) => item.peso);
  if (pesos.some((p) => !Number.isFinite(p) || p <= 0 || p > 1_000_000_000)) {
    throw new ErroDeEntrada('Todos os pesos precisam ser maiores que zero e até um bilhão.', 'itens');
  }
  const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  if (!Number.isFinite(somaPesos) || somaPesos <= 0) {
    throw new ErroDeEntrada('A soma dos pesos é inválida.', 'itens');
  }
  const quotas = itens.map((item, indice) => {
    const exato = (totalCentavos * item.peso) / somaPesos;
    const inteiro = Math.floor(exato);
    return { ...item, indice, exato, centavos: inteiro, resto: exato - inteiro };
  });
  let restantes = totalCentavos - quotas.reduce((soma, item) => soma + item.centavos, 0);
  // A distribuição por maiores restos nunca perde um centavo, e empates preservam a ordem da entrada.
  const ordem = [...quotas].sort((a, b) => b.resto - a.resto || a.indice - b.indice);
  for (const item of ordem) {
    if (restantes <= 0) break;
    item.centavos += 1;
    restantes--;
  }
  if (restantes !== 0) throw new ErroDeEntrada('Não foi possível conciliar os centavos do rateio.', 'itens');
  return { totalCentavos, somaPesos, itens: quotas, conferênciaCentavos: quotas.reduce((s, l) => s + l.centavos, 0) };
}

export function calcularRateioNaTela(dados) {
  const total = número(dados, 'total', { rótulo: 'Custo total', mín: 0 });
  if (total > 100_000_000) throw new ErroDeEntrada('Custo total acima de R$ 100 milhões.', 'total');
  const centavos = Math.round(total * 100);
  if (centavos === 0) throw new ErroDeEntrada('O custo precisa ser de pelo menos R$ 0,01.', 'total');
  const texto = String(dados.itens ?? '').trim();
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length < 2 || linhas.length > 100) throw new ErroDeEntrada('Informe de 2 a 100 beneficiários.', 'itens');
  const vistos = new Set();
  const itens = linhas.map((linha, indice) => {
    const partes = linha.split(';').map((s) => s.trim());
    const n = indice + 1;
    if (partes.length !== 2 || !partes[0] || partes[0].length > 80) {
      throw new ErroDeEntrada('Linha ' + n + ': use nome; peso (nome de até 80 caracteres).', 'itens');
    }
    const chave = partes[0].toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) throw new ErroDeEntrada('Linha ' + n + ': nome repetido.', 'itens');
    vistos.add(chave);
    const peso = paraNúmero(partes[1]);
    if (!Number.isFinite(peso) || peso <= 0 || peso > 1_000_000_000) {
      throw new ErroDeEntrada('Linha ' + n + ': peso precisa ser positivo e até um bilhão.', 'itens');
    }
    return { nome: partes[0], peso };
  });
  const r = distribuirCusto(centavos, itens);
  const valores = r.itens.map((item) => [item.nome, formatarMoeda(item.centavos / 100)]);
  const tabela = {
    cabeçalho: ['Beneficiário', 'Peso', 'Participação', 'Valor rateado'],
    linhas: r.itens.map((item) => [item.nome,
      formatarNúmero(item.peso, { casas: 6 }),
      formatarNúmero((item.peso / r.somaPesos) * 100, { casas: 4 }) + '%',
      formatarMoeda(item.centavos / 100)]),
  };
  const observações = [
    'Total distribuído = ' + formatarMoeda(r.conferênciaCentavos / 100) +
      ', sem sobrar ou faltar centavos.',
    'Os centavos que não cabem no primeiro arredondamento vão para as maiores frações. '
      + 'Em caso de empate, prevalece a ordem dos beneficiários.',
    'Os pesos indicam proporções, não precisam somar 100%. '
      + 'Pesos iguais dividem o custo igualmente (com ajuste de centavos).',
  ];
  return {
    valor: formatarMoeda(r.conferênciaCentavos / 100),
    resumo: 'Distribuído entre ' + r.itens.length + ' beneficiários, respeitando os pesos.',
    linhas: [['Custo total distribuído', formatarMoeda(r.conferênciaCentavos / 100)],
      ['Beneficiários', String(r.itens.length)],
      ...valores],
    observações, tabela,
    texto: ['Rateio de custos', 'Total: ' + formatarMoeda(r.conferênciaCentavos / 100),
      tabela.cabeçalho.join('; '), ...tabela.linhas.map((linha) => linha.join('; ')),
      ...observações].join('\n'),
    arquivos: [{ rótulo: 'Resumo em PDF', ícone: 'documento',
      gerar: () => baixar(pdfDoResumo({ título: 'Rateio de custos',
        subtítulo: 'Distribuição proporcional por peso',
        destaque: ['Custo distribuído', formatarMoeda(r.conferênciaCentavos / 100)],
        resultados: [['Beneficiários', String(r.itens.length)]],
        dados: valores, conta: observações }),
      nomeDeArquivo('rateio-de-custos') + '.pdf', 'application/pdf') }],
  };
}

export default {
  instruções: {
    passos: [
      'Informe o custo total que precisa dividir em reais.',
      'Escreva uma linha para cada pessoa, setor ou produto: nome; peso.',
      'Peso 1 para todos faz divisão igual; pesos 2 e 1 dividem na proporção de dois terços e um terço.',
      'Calcule e confira o total, a participação de cada beneficiário e a distribuição exata de centavos.',
      'Copie o rateio ou baixe PDF, CSV e Excel.',
    ],
    exemplo: { texto: 'Com R$ 100,00 e três setores de peso 1, cada um receberia R$ 33,333... de custo. '
      + 'O portal distribui R$ 33,34 ao primeiro e R$ 33,33 aos demais, somando exatamente R$ 100,00.' },
    limites: 'Até 100 beneficiários distintos, valor total de R$ 0,01 a R$ 100 milhões. '
      + 'Todos os pesos devem ser positivos; o arredondamento usa maiores restos, nunca altera o total. '
      + 'O rateio é calculado no navegador, sem enviar os valores ao servidor.',
    perguntas: [
      { p: 'Por que um dos valores ficou um centavo maior?', r: 'Porque o total precisa bater exatamente, e centavos indivisíveis são distribuídos pelas maiores frações.' },
      { p: 'Posso usar horas ou quantidade como peso?', r: 'Sim. Todos os pesos precisam representar a mesma medida, como horas trabalhadas ou unidades produzidas.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Distribuir custo',
      campos: [
        { nome: 'total', rótulo: 'Custo total (R$)', tipo: 'número', padrão: '100,00' },
        { nome: 'itens', rótulo: 'Beneficiários e pesos', tipo: 'área', linhas: 8,
          padrão: 'Produção; 1\nVendas; 1\nAdministrativo; 1',
          dica: 'Uma linha por setor ou pessoa, no formato nome; peso.' },
      ], calcular: calcularRateioNaTela,
    });
  },
};
