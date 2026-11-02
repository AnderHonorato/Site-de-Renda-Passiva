// Confere um cálculo de custo de material salvo ou importado antes de aceitá-lo.
const UNIDADES_VÁLIDAS = ['g', 'kg', 'cm', 'm', 'un'];
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarMaterialSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!númeroNaFaixa(registro.precoDeCompra, 0.01, 1e9)) return false;
  if (!númeroNaFaixa(registro.quantidadeComprada, 0.0001, 1e9)) return false;
  if (!UNIDADES_VÁLIDAS.includes(registro.unidadeComprada)) return false;
  if (!númeroNaFaixa(registro.consumo, 0.0001, 1e9)) return false;
  if (!UNIDADES_VÁLIDAS.includes(registro.unidadeConsumo)) return false;
  if (registro.metrosPor100g !== null && !númeroNaFaixa(registro.metrosPor100g, 0.01, 1e6)) return false;
  return true;
}
