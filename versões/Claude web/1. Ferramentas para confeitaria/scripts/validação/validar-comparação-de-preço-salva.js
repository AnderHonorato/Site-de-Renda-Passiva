// Confere uma comparação de preço por unidade salva ou importada antes de aceitá-la.
const UNIDADES_VÁLIDAS = new Set(['g', 'kg', 'ml', 'L', 'unidade']);
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function embalagemVálida(embalagem) {
  return (
    embalagem !== null &&
    typeof embalagem === 'object' &&
    typeof embalagem.nome === 'string' &&
    embalagem.nome.length <= 60 &&
    UNIDADES_VÁLIDAS.has(embalagem.unidade) &&
    númeroNaFaixa(embalagem.quantidade, 0.0001, 1e6) &&
    númeroNaFaixa(embalagem.preço, 0.01, 1e9)
  );
}

export function validarComparaçãoDePreçoSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.embalagens) &&
    registro.embalagens.length >= 2 &&
    registro.embalagens.length <= 4 &&
    registro.embalagens.every(embalagemVálida)
  );
}
