// Confere um "Envelope" salvo ou importado antes de aceitá-lo.
const numeroNaFaixa = (valor, mínimo, máximo) => Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarEnvelopeSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    numeroNaFaixa(registro.larguraDoConteúdoMm, 20, 500) &&
    numeroNaFaixa(registro.alturaDoConteúdoMm, 20, 500) &&
    numeroNaFaixa(registro.folgaMm, 0, 15) &&
    numeroNaFaixa(registro.tamanhoDaAbaMm, 0.1, 250) &&
    typeof registro.tipoDePapel === 'string' &&
    registro.tipoDePapel.length <= 60 &&
    typeof registro.textoOpcional === 'string' &&
    registro.textoOpcional.length <= 200 &&
    (registro.unidade === 'mm' || registro.unidade === 'cm')
  );
}
