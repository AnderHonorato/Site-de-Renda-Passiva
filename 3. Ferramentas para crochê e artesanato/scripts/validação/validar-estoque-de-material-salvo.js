// Confere uma ficha de controle de estoque de material salva ou importada antes de aceitá-la.
const UNIDADES_VÁLIDAS = ['g', 'kg', 'cm', 'm', 'un'];
const TIPOS_VÁLIDOS = ['entrada', 'consumo'];
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function lançamentosVálidos(lançamentos) {
  return (
    Array.isArray(lançamentos) &&
    lançamentos.length >= 1 &&
    lançamentos.length <= 500 &&
    lançamentos.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        TIPOS_VÁLIDOS.includes(item.tipo) &&
        númeroNaFaixa(item.quantidade, 0.0001, 1e9) &&
        (item.nota === undefined || (typeof item.nota === 'string' && item.nota.length <= 200)),
    )
  );
}

export function validarEstoqueDeMaterialSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!UNIDADES_VÁLIDAS.includes(registro.unidade)) return false;
  if (!númeroNaFaixa(registro.saldoInicial, 0, 1e9)) return false;
  if (!lançamentosVálidos(registro.lançamentos)) return false;
  return true;
}
