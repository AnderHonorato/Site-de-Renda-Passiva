// Confere uma configuração de "Caligrafia" salva ou importada antes de aceitá-la.
const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarCaligrafiaSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    typeof registro.texto === 'string' &&
    registro.texto.trim().length >= 1 &&
    registro.texto.length <= 40 &&
    inteiroNaFaixa(registro.repetições, 1, 30) &&
    inteiroNaFaixa(registro.quantidadeDeLinhas, 1, 40) &&
    Number.isFinite(registro.tamanhoDaLetra) &&
    registro.tamanhoDaLetra >= 12 &&
    registro.tamanhoDaLetra <= 72 &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
