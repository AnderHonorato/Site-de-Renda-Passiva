// Confere uma configuração de "Operações matemáticas" salva ou importada antes de
// aceitá-la — usado por definições-do-produto.js na importação de cópia local.
const OPERADORES_VÁLIDOS = ['+', '−', '×', '÷'];
const RESERVAS_VÁLIDAS = ['indiferente', 'exigir', 'evitar'];
const DIVISÕES_VÁLIDAS = ['exata', 'comResto'];
const APRESENTAÇÕES_VÁLIDAS = ['armada', 'linha'];

const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarOperaçõesSalvas(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.operadores) &&
    registro.operadores.length >= 1 &&
    registro.operadores.every((operador) => OPERADORES_VÁLIDOS.includes(operador)) &&
    inteiroNaFaixa(registro.quantidade, 1, 200) &&
    inteiroNaFaixa(registro.mínimo, 0, 1_000_000) &&
    inteiroNaFaixa(registro.máximo, 0, 1_000_000) &&
    registro.mínimo <= registro.máximo &&
    typeof registro.permitirNegativos === 'boolean' &&
    RESERVAS_VÁLIDAS.includes(registro.reserva) &&
    DIVISÕES_VÁLIDAS.includes(registro.divisão) &&
    APRESENTAÇÕES_VÁLIDAS.includes(registro.apresentação) &&
    Number.isFinite(registro.semente) &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
