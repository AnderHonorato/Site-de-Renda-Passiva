// Confere uma configuração de "Bingo de números" salva ou importada antes de aceitá-la.
const TAMANHOS_VÁLIDOS = [3, 4, 5];
const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarBingoSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    inteiroNaFaixa(registro.intervaloMínimo, 0, 1_000_000) &&
    inteiroNaFaixa(registro.intervaloMáximo, 0, 1_000_000) &&
    registro.intervaloMínimo <= registro.intervaloMáximo &&
    TAMANHOS_VÁLIDOS.includes(registro.tamanhoDaGrade) &&
    inteiroNaFaixa(registro.quantidadeDeCartelas, 1, 50) &&
    Number.isFinite(registro.semente) &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
