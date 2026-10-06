/** Simulador de financiamento: Tabela Price e SAC lado a lado, com seguro, tarifas e CET. */
import { montarFerramenta, número, ErroDeEntrada, baixarCsv, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import {
  simularFinanciamento, linhasDaTabela, ErroDeFinanciamento, BASES_DA_TAXA,
  PRAZO_MÁXIMO, TAXA_MENSAL_MÁXIMA, TAXA_ANUAL_MÁXIMA, VALOR_MÁXIMO_CENTAVOS,
} from '../cálculos/simulador-de-financiamento.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const reais = (centavos) => formatarMoeda(centavos / 100);
const percentual = (valor) => `${formatarNúmero(valor, { casas: 2, casasMínimas: 2 })}%`;
const NOMES = { price: 'Tabela Price', sac: 'SAC' };

/** Premissas que ficam na tela junto de qualquer resultado: sem elas o número parece mais exato do que é. */
export const PREMISSAS = 'Premissas: taxa fixa durante todo o prazo, sem correção monetária (TR, IPCA) e sem IOF. '
  + 'O seguro é um percentual ao mês sobre o saldo devedor; a tarifa mensal é somada a cada parcela; a tarifa inicial é paga na assinatura, fora do valor financiado. '
  + 'O CET é calculado com esses itens, então o do banco costuma sair um pouco maior (IOF e outros tributos). Confirme com o contrato antes de decidir.';

/**
 * Lê o formulário, simula e monta o que a tela mostra. Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function simularNaTela(dados) {
  const valor = número(dados, 'valor', { rótulo: 'Valor do bem', mín: 1, máx: VALOR_MÁXIMO_CENTAVOS / 100 });
  const entrada = número(dados, 'entrada', { rótulo: 'Entrada', mín: 0, máx: VALOR_MÁXIMO_CENTAVOS / 100, obrigatório: false, padrão: 0 });
  const prazo = número(dados, 'prazo', { rótulo: 'Prazo (meses)', mín: 1, máx: PRAZO_MÁXIMO, inteiro: true });
  const baseDaTaxa = Object.hasOwn(BASES_DA_TAXA, dados.baseDaTaxa) ? dados.baseDaTaxa : 'mês';
  const taxa = número(dados, 'taxa', { rótulo: 'Taxa de juros', mín: 0, máx: baseDaTaxa === 'mês' ? TAXA_MENSAL_MÁXIMA : TAXA_ANUAL_MÁXIMA });
  const seguro = número(dados, 'seguro', { rótulo: 'Seguro', mín: 0, obrigatório: false, padrão: 0 });
  const tarifaMensal = número(dados, 'tarifaMensal', { rótulo: 'Tarifa mensal', mín: 0, máx: VALOR_MÁXIMO_CENTAVOS / 100, obrigatório: false, padrão: 0 });
  const tarifaInicial = número(dados, 'tarifaInicial', { rótulo: 'Tarifa inicial', mín: 0, máx: VALOR_MÁXIMO_CENTAVOS / 100, obrigatório: false, padrão: 0 });
  const tabelaEscolhida = dados.tabela === 'sac' ? 'sac' : 'price';

  let r;
  try {
    r = simularFinanciamento({
      valorCentavos: emCentavos(valor),
      entradaCentavos: emCentavos(entrada),
      prazo,
      taxa,
      baseDaTaxa,
      seguroPercentual: seguro,
      tarifaMensalCentavos: emCentavos(tarifaMensal),
      tarifaInicialCentavos: emCentavos(tarifaInicial),
    });
  } catch (erro) {
    if (erro instanceof ErroDeFinanciamento) throw new ErroDeEntrada(erro.message, erro.campo);
    throw erro;
  }

  const { price, sac } = r;
  const diferença = price.custoDoCréditoCentavos - sac.custoDoCréditoCentavos;
  const barato = diferença > 0 ? 'sac' : 'price';
  const empate = Math.abs(diferença) < 100;

  const cet = (resumo) => (resumo.cet
    ? `${percentual(resumo.cet.mensal)} ao mês (${percentual(resumo.cet.anual)} ao ano)`
    : 'não foi possível calcular');
  const bloco = (nome, resumo) => [
    [`${nome}: primeira parcela`, reais(resumo.primeiraCentavos)],
    [`${nome}: última parcela`, reais(resumo.últimaCentavos)],
    [`${nome}: total das parcelas`, reais(resumo.totalPagoCentavos)],
    [`${nome}: juros totais`, reais(resumo.jurosCentavos)],
    [`${nome}: CET`, cet(resumo)],
  ];

  const linhas = [
    ['Valor financiado', reais(r.financiadoCentavos)],
    ['Entrada', reais(r.entradaCentavos)],
    ['Prazo', `${prazo} ${prazo === 1 ? 'mês' : 'meses'}`],
    ['Taxa mensal usada na conta', `${formatarNúmero(r.taxaMensalPercentual, { casas: 4 })}%`],
    ...bloco('Price', price),
    ...bloco('SAC', sac),
    ['Price: desembolso total (entrada, tarifa inicial e parcelas)', reais(r.desembolsoDoPriceCentavos)],
    ['SAC: desembolso total (entrada, tarifa inicial e parcelas)', reais(r.desembolsoDoSacCentavos)],
  ];
  if (price.segurosETarifasCentavos > 0) {
    linhas.push(['Seguros e tarifas mensais (Price)', reais(price.segurosETarifasCentavos)]);
    linhas.push(['Seguros e tarifas mensais (SAC)', reais(sac.segurosETarifasCentavos)]);
  }
  if (r.tarifaInicialCentavos > 0) linhas.push(['Tarifa inicial', reais(r.tarifaInicialCentavos)]);

  const observações = [];
  if (sac.primeiraCentavos > price.primeiraCentavos) {
    observações.push(`A SAC começa com parcela ${reais(sac.primeiraCentavos - price.primeiraCentavos)} maior que a da Price e termina em ${reais(sac.últimaCentavos)}. `
      + 'Se a parcela inicial pesa no orçamento, a Price cabe melhor no começo; se o objetivo é pagar menos juros, a SAC leva vantagem.');
  } else if (prazo > 1) {
    observações.push('Com esta taxa, as duas tabelas começam com parcelas praticamente iguais.');
  }
  observações.push(PREMISSAS);
  if (prazo > 1 && r.price.jurosCentavos > 0) {
    observações.push('Os juros mostrados são só os da taxa; seguros e tarifas aparecem à parte e entram no custo total e no CET.');
  }

  const parcelasMostradas = (tabelaEscolhida === 'sac' ? sac : price).parcelas;
  const nomeDoArquivo = (sistema) => `${nomeDeArquivo('financiamento')}-${sistema}`;
  const linhasDaPlanilha = (parcelas) => {
    const cabeçalho = linhasDaTabela(parcelas)[0].map((texto) => ({ texto, estilo: 'cabeçalho' }));
    const moeda = (centavos) => ({ número: centavos / 100, formato: 'moeda' });
    return [cabeçalho, ...parcelas.map((p) => [
      p.número, moeda(p.parcelaCentavos), moeda(p.jurosCentavos), moeda(p.amortizaçãoCentavos),
      moeda(p.seguroETarifaCentavos), moeda(p.saldoCentavos),
    ])];
  };

  const texto = [
    `Financiamento de ${reais(r.financiadoCentavos)} em ${prazo} meses (entrada ${reais(r.entradaCentavos)}).`,
    ...linhas.slice(4).map(([rótulo, v]) => `${rótulo}: ${v}`),
    PREMISSAS,
  ].join('\n');

  return {
    valor: empate
      ? 'Price e SAC custam praticamente o mesmo'
      : `${barato === 'sac' ? 'SAC' : 'Price'} custa ${reais(Math.abs(diferença))} a menos`,
    resumo: `Price: parcela de ${reais(price.primeiraCentavos)}. SAC: de ${reais(sac.primeiraCentavos)} a ${reais(sac.últimaCentavos)}. `
      + `Custo do crédito (juros, seguros e tarifas): ${reais(price.custoDoCréditoCentavos)} na Price e ${reais(sac.custoDoCréditoCentavos)} na SAC.`,
    linhas,
    texto,
    tabela: {
      cabeçalho: ['Nº', 'Parcela', 'Juros', 'Amortização', 'Seguro e tarifa', 'Saldo devedor'],
      linhas: parcelasMostradas.map((p) => [
        p.número, reais(p.parcelaCentavos), reais(p.jurosCentavos), reais(p.amortizaçãoCentavos),
        reais(p.seguroETarifaCentavos), reais(p.saldoCentavos),
      ]),
      semExportação: true,
    },
    arquivos: [
      { rótulo: 'CSV da Price', ícone: 'baixar', gerar: () => baixarCsv(linhasDaTabela(price.parcelas), nomeDoArquivo('price')) },
      { rótulo: 'CSV da SAC', ícone: 'baixar', gerar: () => baixarCsv(linhasDaTabela(sac.parcelas), nomeDoArquivo('sac')) },
      {
        rótulo: `Planilha (${NOMES[tabelaEscolhida]})`, ícone: 'planilha',
        gerar: () => baixarPlanilha(linhasDaPlanilha(parcelasMostradas), nomeDoArquivo(tabelaEscolhida), {
          aba: NOMES[tabelaEscolhida], larguras: [11, 16, 16, 16, 18, 18],
        }),
      },
    ],
    observações,
  };
}

export default {
  instruções: {
    passos: [
      'Informe o valor do bem e a entrada que você vai dar (pode ser zero).',
      'Informe o prazo em meses e a taxa de juros, escolhendo se ela é ao mês ou ao ano. Contratos de imóvel costumam anunciar a taxa ao ano.',
      'Se houver seguro, tarifa mensal ou tarifa inicial, preencha. Sem isso o CET fica igual à taxa de juros.',
      'Toque em "Simular". O resultado compara a Tabela Price e a SAC, e a tabela mês a mês mostra o sistema que você escolher. Baixe o CSV ou a planilha para conferir ou guardar.',
    ],
    exemplo: {
      texto: 'Um bem de R$ 150.000,00 com entrada de R$ 30.000,00 financia R$ 120.000,00. Em 12 meses a 1% ao mês, a Price tem parcela fixa de R$ 10.661,85 e paga R$ 7.942,26 de juros. '
        + 'A SAC começa em R$ 11.200,00, termina em R$ 10.100,00 e paga R$ 7.800,00 de juros, R$ 142,26 a menos.',
    },
    limites: `Prazo de 1 a ${PRAZO_MÁXIMO} meses, taxa de até ${TAXA_MENSAL_MÁXIMA}% ao mês ou ${TAXA_ANUAL_MÁXIMA}% ao ano e valor de até R$ 1 bilhão. `
      + 'A conta assume taxa fixa e não inclui correção monetária (TR, IPCA), IOF nem amortizações extras. '
      + 'Taxa "ao ano, efetiva" usa juros compostos ((1 + taxa)^(1/12) − 1); "nominal" divide por 12, como muitos contratos de imóvel. '
      + 'O CET é a taxa interna de retorno do fluxo (valor recebido menos tarifa inicial contra todas as parcelas, com seguro e tarifa mensal), '
      + 'no espírito da Resolução CMN nº 3.517/2007; sem IOF, o do banco costuma ser um pouco maior. '
      + 'Todos os valores são calculados em centavos e a última parcela quita o saldo restante, para a soma fechar certinha. '
      + 'É uma simulação para comparar e planejar, não uma proposta de crédito. Nada é enviado para fora do seu aparelho.',
    perguntas: [
      { p: 'Qual é melhor, Price ou SAC?', r: 'Depende do que pesa mais. A SAC paga menos juros no total, mas a primeira parcela é maior. A Price tem parcela igual do começo ao fim, mais fácil de encaixar no orçamento, e custa mais juros.' },
      { p: 'Por que o CET é maior que a taxa de juros?', r: 'Porque o CET inclui seguro e tarifas. Se você deixar seguro e tarifas zerados, o CET fica igual à taxa de juros.' },
      { p: 'Minha parcela no banco saiu diferente. Por quê?', r: 'Bancos somam correção monetária da taxa referencial, IOF, seguros com regras próprias e podem arredondar de outro jeito. Use a simulação para comparar sistemas e prazos, e o contrato para o valor final.' },
      { p: 'A taxa do meu contrato é "12% ao ano". Qual opção escolho?', r: 'Se o contrato diz "taxa nominal", escolha "ao ano, nominal" (12% ao ano vira 1% ao mês). Se diz "taxa efetiva", escolha "ao ano, efetiva" (12% ao ano vira cerca de 0,9489% ao mês).' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Simular',
      campos: [
        { nome: 'valor', rótulo: 'Valor do bem (R$)', tipo: 'número', exemplo: '150000,00' },
        { nome: 'entrada', rótulo: 'Entrada (R$)', tipo: 'número', padrão: '0', exemplo: '30000,00' },
        { nome: 'prazo', rótulo: 'Prazo (meses)', tipo: 'número', exemplo: '360', dica: `De 1 a ${PRAZO_MÁXIMO} meses.` },
        { nome: 'taxa', rótulo: 'Taxa de juros (%)', tipo: 'número', exemplo: '1' },
        {
          nome: 'baseDaTaxa', rótulo: 'A taxa é', tipo: 'seleção', padrão: 'mês',
          opções: Object.entries(BASES_DA_TAXA).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        { nome: 'seguro', rótulo: 'Seguro (% ao mês do saldo devedor)', tipo: 'número', padrão: '0', dica: 'Deixe 0 se não houver.' },
        { nome: 'tarifaMensal', rótulo: 'Tarifa mensal (R$)', tipo: 'número', padrão: '0', dica: 'Somada a cada parcela.' },
        { nome: 'tarifaInicial', rótulo: 'Tarifa inicial (R$)', tipo: 'número', padrão: '0', dica: 'Paga na assinatura, fora do valor financiado.' },
        {
          nome: 'tabela', rótulo: 'Tabela mês a mês', tipo: 'seleção', padrão: 'price',
          opções: [
            { valor: 'price', rótulo: 'Tabela Price' },
            { valor: 'sac', rótulo: 'SAC' },
          ],
        },
      ],
      calcular: simularNaTela,
    });
  },
};
