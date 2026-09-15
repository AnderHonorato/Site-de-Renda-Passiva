// Confere um cálculo de quantidade de tinta salvo ou importado antes de aceitá-lo.
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;
const TIPOS_VÁLIDOS = ['porDemão', 'acabado'];

function embalagensVálidas(embalagens) {
  return (
    Array.isArray(embalagens) &&
    embalagens.length <= 20 &&
    embalagens.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        (item.nome === undefined || (typeof item.nome === 'string' && item.nome.length <= 60)) &&
        númeroNaFaixa(item.litros, 0.01, 10000),
    )
  );
}

export function validarCálculoDeTintaSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!númeroNaFaixa(registro.área, 0.01, 1e6)) return false;
  if (!Number.isInteger(registro.demãos) || registro.demãos < 1 || registro.demãos > 20) return false;
  if (!númeroNaFaixa(registro.rendimento, 0.01, 1e6)) return false;
  if (!TIPOS_VÁLIDOS.includes(registro.tipoDeRendimento)) return false;
  if (!númeroNaFaixa(registro.reservaPercentual, 0, 200)) return false;
  if (!embalagensVálidas(registro.embalagens ?? [])) return false;
  return true;
}
