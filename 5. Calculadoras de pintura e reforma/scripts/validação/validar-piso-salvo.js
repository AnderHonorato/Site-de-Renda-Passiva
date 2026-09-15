// Confere um cálculo de piso/revestimento por caixa salvo ou importado antes de aceitá-lo.
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarPisoSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!númeroNaFaixa(registro.área, 0.01, 1e6)) return false;
  if (!númeroNaFaixa(registro.margemPercentual, 0, 200)) return false;
  if (!númeroNaFaixa(registro.coberturaPorCaixa, 0.001, 1e4)) return false;
  return true;
}
