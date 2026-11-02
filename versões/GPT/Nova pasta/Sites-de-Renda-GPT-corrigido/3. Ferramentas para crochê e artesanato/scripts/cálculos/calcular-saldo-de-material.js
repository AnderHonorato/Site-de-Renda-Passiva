// Controle local de estoque de um material: soma entradas e consumos lançados a um saldo
// inicial e devolve o histórico com o saldo acumulado após cada lançamento. Não é
// contabilidade: é apenas soma e subtração do que a pessoa informou.
export function calcularSaldoDeMaterial({ saldoInicial = 0, lançamentos = [] }) {
  if (!Number.isFinite(saldoInicial) || saldoInicial < 0) return { válido: false, erro: 'O saldo inicial precisa ser zero ou maior.' };
  if (!Array.isArray(lançamentos)) return { válido: false, erro: 'Lista de lançamentos inválida.' };
  if (lançamentos.length === 0) return { válido: false, erro: 'Informe ao menos um lançamento de entrada ou consumo.' };

  let saldoAcumulado = saldoInicial;
  let totalEntradas = 0;
  let totalConsumos = 0;
  const histórico = [];

  for (const [índice, lançamento] of lançamentos.entries()) {
    const { tipo, quantidade } = lançamento ?? {};
    if (tipo !== 'entrada' && tipo !== 'consumo') return { válido: false, erro: `Lançamento ${índice + 1}: tipo precisa ser "entrada" ou "consumo".` };
    if (!Number.isFinite(quantidade) || quantidade <= 0) return { válido: false, erro: `Lançamento ${índice + 1}: a quantidade precisa ser maior que zero.` };
    saldoAcumulado += tipo === 'entrada' ? quantidade : -quantidade;
    if (tipo === 'entrada') totalEntradas += quantidade;
    else totalConsumos += quantidade;
    histórico.push({ ...lançamento, saldoAcumulado });
  }

  return {
    válido: true,
    saldoAtual: saldoAcumulado,
    totalEntradas,
    totalConsumos,
    histórico,
    abaixoDeZero: saldoAcumulado < 0,
  };
}
