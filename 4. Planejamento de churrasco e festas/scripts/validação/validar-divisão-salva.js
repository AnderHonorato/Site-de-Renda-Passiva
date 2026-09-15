// Confere uma divisão de despesas salva ou importada antes de aceitá-la.
const MODOS_VÁLIDOS = ['igual', 'pesos'];
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function itemDeGastoVálido(item) {
  return item !== null && typeof item === 'object' && typeof item.descrição === 'string' && item.descrição.length >= 1 && item.descrição.length <= 120 && númeroNaFaixa(item.valor, 0, 1e8);
}

function paganteVálido(pagante) {
  return (
    pagante !== null &&
    typeof pagante === 'object' &&
    typeof pagante.nome === 'string' &&
    pagante.nome.trim().length >= 1 &&
    pagante.nome.length <= 80 &&
    númeroNaFaixa(pagante.peso, 0.01, 1000)
  );
}

export function validarDivisãoSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    MODOS_VÁLIDOS.includes(registro.modo) &&
    Array.isArray(registro.itens) &&
    registro.itens.length <= 100 &&
    registro.itens.every(itemDeGastoVálido) &&
    Array.isArray(registro.pagantes) &&
    registro.pagantes.length >= 1 &&
    registro.pagantes.length <= 200 &&
    registro.pagantes.every(paganteVálido)
  );
}
