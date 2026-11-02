// Valor da hora produtiva: quanto cobrar por hora de trabalho para que a meta mensal de
// retirada e os custos fixos do mês sejam cobertos pelas horas realmente produtivas
// (as horas em que a pessoa está de fato produzindo peças, não o total de horas do mês).
export function calcularValorDaHora({ metaMensal, custosFixosMensais = 0, horasProdutivasPorMês }) {
  if (!Number.isFinite(metaMensal) || metaMensal < 0) return { válido: false, erro: 'A meta mensal de retirada precisa ser zero ou maior.' };
  if (!Number.isFinite(custosFixosMensais) || custosFixosMensais < 0) return { válido: false, erro: 'Os custos fixos mensais precisam ser zero ou maiores.' };
  if (!Number.isFinite(horasProdutivasPorMês) || horasProdutivasPorMês <= 0) return { válido: false, erro: 'As horas produtivas por mês precisam ser maiores que zero.' };

  const totalMensalNecessário = metaMensal + custosFixosMensais;
  if (totalMensalNecessário <= 0) return { válido: false, erro: 'A meta mensal somada aos custos fixos precisa ser maior que zero.' };

  return {
    válido: true,
    totalMensalNecessário,
    valorPorHora: totalMensalNecessário / horasProdutivasPorMês,
  };
}
