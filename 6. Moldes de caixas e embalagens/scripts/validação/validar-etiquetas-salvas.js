// Confere uma configuração de "Etiquetas" salva ou importada antes de aceitá-la.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarEtiquetasSalvas(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.larguraDaEtiquetaMm, 10, 190) &&
    numeroNaFaixa(registro.alturaDaEtiquetaMm, 10, 190) &&
    numeroNaFaixa(registro.espaçamentoMm, 0, 20) &&
    numeroNaFaixa(registro.margemMm, 5, 30) &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
