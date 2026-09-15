// Confere uma "Cinta para embalagem" salva ou importada antes de aceitá-la.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarCintaSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.perímetroMm, 20, 3000) &&
    numeroNaFaixa(registro.sobreposiçãoMm, 5, registro.perímetroMm / 2) &&
    numeroNaFaixa(registro.alturaMm, 10, 400) &&
    typeof registro.tipoDePapel === 'string' &&
    registro.tipoDePapel.length <= 60 &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
