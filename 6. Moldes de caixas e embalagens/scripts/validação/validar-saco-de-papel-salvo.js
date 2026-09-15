// Confere um "Saco de papel simples" salvo ou importado antes de aceitá-lo.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarSacoDePapelSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.larguraMm, 30, 600) &&
    numeroNaFaixa(registro.profundidadeMm, 30, 600) &&
    numeroNaFaixa(registro.alturaMm, 30, 600) &&
    numeroNaFaixa(registro.abaSuperiorMm, 0, 100) &&
    numeroNaFaixa(registro.abaDeColagemMm, 8, 40) &&
    typeof registro.tipoDePapel === 'string' &&
    registro.tipoDePapel.length <= 60 &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
