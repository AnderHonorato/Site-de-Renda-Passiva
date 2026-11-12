/** Simulador MEI parametrizado: valores legais devem ser confirmados para o ano consultado. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';

export function calcularMei({ salarioMinimo, faturamento, mesAbertura, limiteAnual, atividade }) {
  for (const [chave, valor] of Object.entries({ salarioMinimo, faturamento, mesAbertura, limiteAnual })) {
    if (!Number.isFinite(valor)) throw new ErroDeEntrada('Informe um número válido.', chave);
  }
  if (salarioMinimo <= 0 || limiteAnual <= 0 || faturamento < 0 || !Number.isInteger(mesAbertura) || mesAbertura < 1 || mesAbertura > 12)
    throw new ErroDeEntrada('Confira os valores e o mês de abertura (1 a 12).', 'mesAbertura');
  if (!['comercio','servicos','ambos'].includes(atividade)) throw new ErroDeEntrada('Selecione a atividade.', 'atividade');
  const meses = 13 - mesAbertura;
  const teto = Math.round(limiteAnual / 12 * meses * 100) / 100;
  const inss = Math.round(salarioMinimo * 0.05 * 100) / 100;
  const icms = atividade === 'comercio' || atividade === 'ambos' ? 1 : 0;
  const iss = atividade === 'servicos' || atividade === 'ambos' ? 5 : 0;
  const das = Math.round((inss + icms + iss) * 100) / 100;
  return { meses, teto, inss, icms, iss, das, restante: Math.round((teto - faturamento) * 100) / 100,
    percentual: Math.round(faturamento / teto * 10000) / 100 };
}

export function calcularMeiNaTela(dados) {
  const salarioMinimo = número(dados, 'salarioMinimo', { rótulo: 'Salário mínimo do ano (R$)', mín: 1, máx: 100000 });
  const faturamento = número(dados, 'faturamento', { rótulo: 'Faturamento acumulado (R$)', mín: 0, máx: 1e10 });
  const mesAbertura = número(dados, 'mesAbertura', { rótulo: 'Mês de abertura', mín: 1, máx: 12, inteiro: true });
  const limiteAnual = número(dados, 'limiteAnual', { rótulo: 'Limite anual aplicável (R$)', mín: 1, máx: 1e10 });
  const atividade = String(dados.atividade || 'comercio').trim().toLowerCase();
  const r = calcularMei({ salarioMinimo, faturamento, mesAbertura, limiteAnual, atividade });
  const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const linhas = [
    ['DAS mensal estimado', reais(r.das)], ['INSS (5%)', reais(r.inss)],
    ['ICMS', reais(r.icms)], ['ISS', reais(r.iss)], ['Meses considerados', String(r.meses)],
    ['Limite proporcional', reais(r.teto)], ['Faturamento acumulado', reais(faturamento)],
    ['Saldo até o limite', reais(Math.max(0, r.restante))],
    ['Limite utilizado', r.percentual.toLocaleString('pt-BR') + '%'],
  ];
  const observações = [
    'Simulação para MEI comum com INSS de 5% do salário mínimo, ICMS de R$ 1 e ISS de R$ 5 conforme a atividade.',
    'Informe os valores oficiais do ano consultado. Não são atualizados automaticamente.',
    'O limite proporcional considera abertura no mês informado. Para empresas abertas em anos anteriores, use mês 1.',
    'MEI caminhoneiro, benefícios, situações especiais, excesso de receita e tributos em atraso exigem análise específica.',
  ];
  if (r.restante < 0) observações.unshift('Atenção: o faturamento informado supera o limite proporcional. Procure orientação contábil.');
  return { valor: reais(r.das), resumo: 'DAS mensal estimado: ' + reais(r.das) + ' · Limite usado: ' + r.percentual.toLocaleString('pt-BR') + '%',
    linhas, observações, texto: [...linhas.map(([k,v])=>k+': '+v), ...observações].join('\n') };
}

export default {
  instruções: {
    passos: ['Informe o salário mínimo e o limite anual oficiais do ano.', 'Escolha o tipo de atividade e o mês de abertura.', 'Compare DAS, faturamento e limite proporcional.'],
    exemplo: { texto: 'Exemplo didático: salário mínimo R$ 1.500, limite anual R$ 81.000, comércio, abertura em janeiro e faturamento R$ 40.000. Ajuste para o ano real.' },
    limites: 'Não substitui o PGMEI/DAS oficial nem considera o MEI caminhoneiro, multas ou atrasos.',
    perguntas: [{ p: 'Os valores são atualizados automaticamente?', r: 'Não. Confirme salário mínimo e limite do ano nas fontes oficiais antes de simular.' }],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Simular DAS e limite',
      campos: [
        { nome:'salarioMinimo', rótulo:'Salário mínimo do ano (R$)', exemplo:'1500', padrão:'1500' },
        { nome:'limiteAnual', rótulo:'Limite anual aplicável (R$)', exemplo:'81000', padrão:'81000' },
        { nome:'faturamento', rótulo:'Faturamento acumulado (R$)', exemplo:'40000', padrão:'40000' },
        { nome:'mesAbertura', rótulo:'Mês de abertura (1–12)', exemplo:'1', padrão:'1' },
        { nome:'atividade', rótulo:'Atividade', tipo:'seleção', padrão:'comercio', opções:[{valor:'comercio',rótulo:'Comércio ou indústria'},{valor:'servicos',rótulo:'Serviços'},{valor:'ambos',rótulo:'Comércio e serviços'}] },
      ],
      calcular: calcularMeiNaTela,
    });
  },
};
