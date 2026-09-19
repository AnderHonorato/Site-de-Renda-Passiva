// Confere uma configuração de "Tabuada" salva ou importada antes de aceitá-la.
const ORDENS_VÁLIDAS = ['sequencial', 'embaralhada'];
const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;

export function validarTabuadaSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.fatores) &&
    registro.fatores.length >= 1 &&
    registro.fatores.length <= 20 &&
    registro.fatores.every((fator) => inteiroNaFaixa(fator, 0, 1000)) &&
    inteiroNaFaixa(registro.multiplicadorMínimo, 0, 1000) &&
    inteiroNaFaixa(registro.multiplicadorMáximo, 0, 1000) &&
    registro.multiplicadorMínimo <= registro.multiplicadorMáximo &&
    ORDENS_VÁLIDAS.includes(registro.ordem) &&
    Number.isFinite(registro.semente) &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
