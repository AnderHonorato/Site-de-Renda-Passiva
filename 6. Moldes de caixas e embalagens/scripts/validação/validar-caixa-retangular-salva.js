// Confere uma "Caixa retangular" salva ou importada antes de aceitá-la.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarCaixaRetangularSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.comprimentoInternoMm, 10, 1000) &&
    numeroNaFaixa(registro.larguraInternoMm, 10, 1000) &&
    numeroNaFaixa(registro.alturaInternoMm, 10, 1000) &&
    numeroNaFaixa(registro.espessuraDoPapelMm, 0, 3) &&
    numeroNaFaixa(registro.tamanhoDaAbaMm, 0.1, registro.alturaInternoMm) &&
    typeof registro.tipoDePapel === 'string' &&
    registro.tipoDePapel.length <= 60 &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
