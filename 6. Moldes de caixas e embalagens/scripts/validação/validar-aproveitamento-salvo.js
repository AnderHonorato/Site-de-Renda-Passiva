// Confere um "Aproveitamento de folha" salvo ou importado antes de aceitá-lo.
const numeroNaFaixa = (valor, mínimo) => Number.isFinite(valor) && valor > mínimo;

export function validarAproveitamentoSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.larguraDaFolhaMm, 0) &&
    numeroNaFaixa(registro.alturaDaFolhaMm, 0) &&
    numeroNaFaixa(registro.larguraDaPeçaMm, 0) &&
    numeroNaFaixa(registro.alturaDaPeçaMm, 0) &&
    Number.isFinite(registro.espaçamentoMm) &&
    registro.espaçamentoMm >= 0 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
