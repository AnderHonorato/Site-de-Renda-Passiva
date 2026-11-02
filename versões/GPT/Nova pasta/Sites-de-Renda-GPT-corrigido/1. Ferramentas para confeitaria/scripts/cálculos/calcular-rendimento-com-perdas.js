// Unidades realmente aproveitáveis depois de uma perda percentual (quebra, teste de
// forno, embalagem malfeita etc.), e o custo por unidade aproveitável quando o custo
// total do lote é informado.
export function calcularRendimentoComPerdas({ unidadesProduzidas, percentualDePerda, custoTotal }) {
  if (!Number.isFinite(unidadesProduzidas) || unidadesProduzidas <= 0) {
    return { válido: false, erro: 'Informe quantas unidades foram produzidas.' };
  }
  if (!Number.isFinite(percentualDePerda) || percentualDePerda < 0 || percentualDePerda >= 100) {
    return { válido: false, erro: 'A perda precisa ficar entre 0% e 99,99%.' };
  }

  const unidadesAproveitáveis = Math.floor(unidadesProduzidas * (1 - percentualDePerda / 100) + 1e-9);
  const perdaEmUnidades = unidadesProduzidas - unidadesAproveitáveis;
  const resultado = { válido: true, unidadesAproveitáveis, perdaEmUnidades };

  if (custoTotal !== undefined && custoTotal !== null) {
    if (!Number.isFinite(custoTotal) || custoTotal <= 0) {
      return { válido: false, erro: 'O custo total precisa ser maior que zero quando informado.' };
    }
    if (unidadesAproveitáveis <= 0) {
      return { válido: false, erro: 'Com essa perda, nenhuma unidade sobra aproveitável: revise o percentual.' };
    }
    resultado.custoPorUnidadeAproveitável = custoTotal / unidadesAproveitáveis;
  }

  return resultado;
}
