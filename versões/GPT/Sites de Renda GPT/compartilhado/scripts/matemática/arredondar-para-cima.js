// Arredonda para o próximo inteiro, ignorando resíduos de ponto flutuante.
// Exemplo: 22 / 2,2 = 10,000000000000002 → 10 (e não 11 caixas).
export function arredondarParaCima(valor) {
  if (!Number.isFinite(valor)) throw new RangeError('Valor inválido para arredondamento.');
  const resultado = Math.ceil(valor - 1e-9 * Math.max(1, Math.abs(valor)));
  return resultado === 0 ? 0 : resultado;
}
