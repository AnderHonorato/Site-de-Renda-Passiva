// Confere um cálculo de preço de venda salvo ou importado antes de aceitá-lo.
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarPrecificaçãoSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    númeroNaFaixa(registro.custoTotal, 0.01, 1e9) &&
    Number.isInteger(registro.quantidade) &&
    númeroNaFaixa(registro.quantidade, 1, 1e6) &&
    númeroNaFaixa(registro.margemPercentual, 0, 99.99) &&
    númeroNaFaixa(registro.taxasPercentuais, 0, 99.99) &&
    ['acima', 'próximo'].includes(registro.modoDeArredondamento)
  );
}
