// Converte uma medida digitada (em milímetros ou centímetros) para milímetros, a unidade
// interna usada por todos os cálculos de molde deste produto. Função pura.
export function converterParaMilímetros(valor, unidade) {
  if (!Number.isFinite(valor)) return NaN;
  if (unidade === 'cm') return Math.round(valor * 10 * 1000) / 1000;
  return valor;
}
