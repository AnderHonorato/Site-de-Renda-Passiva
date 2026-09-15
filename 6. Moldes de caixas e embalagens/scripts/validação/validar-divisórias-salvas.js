// Confere "Divisórias de caixa" salvas ou importadas antes de aceitá-las.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;
const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarDivisóriasSalvas(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.comprimentoInternoMm, 20, 1000) &&
    numeroNaFaixa(registro.larguraInternoMm, 20, 1000) &&
    numeroNaFaixa(registro.alturaInternoMm, 20, 1000) &&
    inteiroNaFaixa(registro.linhas, 1, 10) &&
    inteiroNaFaixa(registro.colunas, 1, 10) &&
    numeroNaFaixa(registro.espessuraMm, 0.1, 10) &&
    typeof registro.tipoDePapel === 'string' &&
    registro.tipoDePapel.length <= 60 &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
