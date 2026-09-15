// Confere um cálculo de rodapé (barras) salvo ou importado antes de aceitá-lo.
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function listaDeMedidasVálida(lista, { mínimo = 0, permiteVazia = false } = {}) {
  return Array.isArray(lista) && lista.length <= 200 && (permiteVazia || lista.length >= 1) && lista.every((valor) => númeroNaFaixa(valor, mínimo, 1000));
}

export function validarRodapéSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!listaDeMedidasVálida(registro.lados, { mínimo: 0.01 })) return false;
  if (!listaDeMedidasVálida(registro.trechosSemInstalação ?? [], { mínimo: 0, permiteVazia: true })) return false;
  if (!númeroNaFaixa(registro.perdaPercentual, 0, 200)) return false;
  if (!númeroNaFaixa(registro.comprimentoDaBarra, 0.01, 1000)) return false;
  return true;
}
