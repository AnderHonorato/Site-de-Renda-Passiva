// Confere uma configuração de "Caça-palavras" salva ou importada antes de aceitá-la.
const DIREÇÕES_VÁLIDAS = ['horizontal', 'vertical', 'diagonal-desce', 'diagonal-sobe'];
const MODOS_DE_ACENTO_VÁLIDOS = ['manter', 'remover'];
const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarCaçaPalavrasSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.palavras) &&
    registro.palavras.length >= 1 &&
    registro.palavras.length <= 30 &&
    registro.palavras.every((palavra) => typeof palavra === 'string' && palavra.trim().length >= 1 && palavra.length <= 30) &&
    Array.isArray(registro.direções) &&
    registro.direções.length >= 1 &&
    registro.direções.every((direção) => DIREÇÕES_VÁLIDAS.includes(direção)) &&
    typeof registro.permitirInvertidas === 'boolean' &&
    inteiroNaFaixa(registro.linhas, 4, 30) &&
    inteiroNaFaixa(registro.colunas, 4, 30) &&
    MODOS_DE_ACENTO_VÁLIDOS.includes(registro.modoDeAcentos) &&
    Number.isFinite(registro.semente) &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
