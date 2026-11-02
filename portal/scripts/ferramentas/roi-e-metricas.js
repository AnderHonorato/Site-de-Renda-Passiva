/** Métricas de campanhas e aquisição: ROI, ROAS, CAC e LTV com hipóteses explícitas. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const valor = (n) => formatarMoeda(n);
const razão = (n) => n === null ? 'Não calculável' : formatarNúmero(n, { casas: 2 }) + ' ×';
const percentual = (n) => n === null ? 'Não calculável' : formatarNúmero(n, { casas: 2 }) + '%';

export function calcularMetricas({ investimentoTotal, receitaTotal, investimentoAnuncios = 0,
  receitaAnuncios = 0, clientes = 0, ticket = 0, comprasPorCliente = 1, margem = 100 }) {
  const monetários = { investimentoTotal, receitaTotal, investimentoAnuncios, receitaAnuncios, ticket };
  const nomes = { investimentoTotal: 'investimento', receitaTotal: 'receita',
    investimentoAnuncios: 'anuncios', receitaAnuncios: 'receitaAnuncios', ticket: 'ticket' };
  for (const [nome, numero] of Object.entries(monetários)) {
    if (!Number.isFinite(numero) || numero < 0 || numero > 1_000_000_000) {
      throw new ErroDeEntrada('O valor precisa estar entre zero e um bilhão de reais.', nomes[nome]);
    }
  }
  if (investimentoTotal <= 0) throw new ErroDeEntrada('O investimento total precisa ser maior que zero.', 'investimento');
  if (investimentoAnuncios > investimentoTotal) {
    throw new ErroDeEntrada('Gasto com anúncios não pode ultrapassar o investimento total informado.', 'anuncios');
  }
  if (receitaAnuncios > receitaTotal) {
    throw new ErroDeEntrada('Receita atribuída aos anúncios não pode superar a receita total.', 'receitaAnuncios');
  }
  if (!Number.isSafeInteger(clientes) || clientes < 0 || clientes > 1_000_000) {
    throw new ErroDeEntrada('Número de clientes inválido.', 'clientes');
  }
  if (!Number.isInteger(comprasPorCliente) || comprasPorCliente < 1 || comprasPorCliente > 1000) {
    throw new ErroDeEntrada('Compras por cliente deve ser um inteiro entre 1 e 1.000.', 'compras');
  }
  if (!Number.isFinite(margem) || margem < 0 || margem > 100) {
    throw new ErroDeEntrada('Margem precisa estar entre 0% e 100%.', 'margem');
  }
  return {
    roi: ((receitaTotal - investimentoTotal) / investimentoTotal) * 100,
    roas: investimentoAnuncios ? receitaAnuncios / investimentoAnuncios : null,
    cac: investimentoAnuncios && clientes ? investimentoAnuncios / clientes : null,
    ltv: ticket * comprasPorCliente * (margem / 100),
    relação: investimentoAnuncios && clientes
      ? (ticket * comprasPorCliente * (margem / 100)) / (investimentoAnuncios / clientes) : null,
    retornoBruto: receitaTotal - investimentoTotal,
    investimentoTotal, receitaTotal, investimentoAnuncios, receitaAnuncios, clientes, ticket,
    comprasPorCliente, margem,
  };
}

export function calcularMetricasNaTela(dados) {
  const investimentoTotal = número(dados, 'investimento', { rótulo: 'Investimento total', mín: 0 });
  const receitaTotal = número(dados, 'receita', { rótulo: 'Receita total', mín: 0 });
  const investimentoAnuncios = número(dados, 'anuncios', { rótulo: 'Gasto com anúncios', mín: 0, obrigatório: false, padrão: 0 });
  const receitaAnuncios = número(dados, 'receitaAnuncios', { rótulo: 'Receita atribuída aos anúncios', mín: 0, obrigatório: false, padrão: 0 });
  const clientes = número(dados, 'clientes', { rótulo: 'Novos clientes', mín: 0, inteiro: true, obrigatório: false, padrão: 0 });
  const ticket = número(dados, 'ticket', { rótulo: 'Ticket médio', mín: 0, obrigatório: false, padrão: 0 });
  const comprasPorCliente = número(dados, 'compras', { rótulo: 'Compras por cliente', mín: 1, inteiro: true, obrigatório: false, padrão: 1 });
  const margem = número(dados, 'margem', { rótulo: 'Margem de contribuição', mín: 0, máx: 100, obrigatório: false, padrão: 100 });
  const r = calcularMetricas({ investimentoTotal, receitaTotal, investimentoAnuncios, receitaAnuncios,
    clientes, ticket, comprasPorCliente, margem });
  const linhas = [
    ['ROI simplificado', percentual(r.roi)],
    ['ROAS de anúncios', razão(r.roas)],
    ['CAC de mídia (somente anúncios)', r.cac === null ? 'Não calculável' : valor(r.cac)],
    ['LTV estimado pela contribuição', valor(r.ltv)],
    ['Relação LTV/CAC de mídia', razão(r.relação)],
    ['Receita menos investimento informado', valor(r.retornoBruto)],
  ];
  const observações = [
    'ROI simplificado = (receita total − investimento total) ÷ investimento total × 100. Não equivale a lucro contábil.',
    'ROAS = receita atribuída aos anúncios ÷ gasto com anúncios. Não inclui custos fora da mídia.',
    'CAC exibido considera apenas custo de anúncios ÷ novos clientes; vendas, equipe e outros custos de aquisição não estão incluídos.',
    'LTV estimado = ticket médio × compras por cliente × margem de contribuição. É uma hipótese, não previsão comprovada.',
    'Sem gasto com anúncios ou sem novos clientes, ROAS/CAC ou LTV/CAC podem ser não calculáveis; não são apresentados como zero.',
  ];
  return {
    valor: percentual(r.roi), resumo: 'Retorno estimado com base nos valores fornecidos, não lucro líquido.',
    linhas, observações,
    texto: ['ROI, ROAS, CAC e LTV', ...linhas.map(([nome, resultado]) => nome + ': ' + resultado),
      'Dados: investimento ' + valor(r.investimentoTotal) + '; receita ' + valor(r.receitaTotal)
        + '; anúncios ' + valor(r.investimentoAnuncios) + '; receita de anúncios ' + valor(r.receitaAnuncios)
        + '; clientes ' + r.clientes + '; ticket ' + valor(r.ticket) + '; compras/cliente '
        + r.comprasPorCliente + '; margem ' + r.margem + '%',
      ...observações].join('\n'),
  };
}

export default {
  instruções: {
    passos: [
      'Informe investimento total e receita total do mesmo período para obter ROI simplificado.',
      'Se houver mídia paga, informe gasto em anúncios e receita atribuída a esses anúncios para obter ROAS.',
      'Informe novos clientes para calcular o custo por cliente considerando apenas anúncios.',
      'Informe ticket médio, compras esperadas por cliente e margem de contribuição para estimar LTV.',
      'Compare os indicadores e copie o relatório com hipóteses e limitações.',
    ],
    exemplo: { texto: 'Investimento total de R$ 2.000,00 e receita de R$ 5.000,00 dão ROI simplificado de 150%. '
      + 'R$ 1.000,00 em anúncios com R$ 3.000,00 atribuídos dão ROAS de 3 ×; 20 clientes dão CAC de mídia de R$ 50,00.' },
    limites: 'ROI simplificado não mede lucro fiscal e ROAS não desconta custos. '
      + 'CAC considera somente mídia paga (não a equipe de vendas); a estimativa de LTV supõe '
      + 'que o ticket, a frequência de compras e a margem serão mantidos. Todas as contas são locais.',
    perguntas: [
      { p: 'ROAS é a mesma coisa que ROI?', r: 'Não. ROAS compara receita atribuída e gasto em anúncios. ROI simplificado usa receita total e investimento total.' },
      { p: 'LTV é sempre receita?', r: 'Aqui o LTV usa a margem de contribuição, para evitar chamar faturamento de lucro futuro.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular indicadores',
      campos: [
        { nome: 'investimento', rótulo: 'Investimento total no período (R$)', tipo: 'número', padrão: '2000' },
        { nome: 'receita', rótulo: 'Receita total no período (R$)', tipo: 'número', padrão: '5000' },
        { nome: 'anuncios', rótulo: 'Gasto com anúncios (R$)', tipo: 'número', padrão: '1000',
          dica: 'Incluído no investimento total; base do ROAS e do CAC de mídia.' },
        { nome: 'receitaAnuncios', rótulo: 'Receita atribuída aos anúncios (R$)', tipo: 'número', padrão: '3000' },
        { nome: 'clientes', rótulo: 'Novos clientes adquiridos', tipo: 'número', padrão: '20' },
        { nome: 'ticket', rótulo: 'Ticket médio por compra (R$)', tipo: 'número', padrão: '250' },
        { nome: 'compras', rótulo: 'Compras estimadas por cliente', tipo: 'número', padrão: '3' },
        { nome: 'margem', rótulo: 'Margem de contribuição (%)', tipo: 'número', padrão: '40' },
      ], calcular: calcularMetricasNaTela,
    });
  },
};
