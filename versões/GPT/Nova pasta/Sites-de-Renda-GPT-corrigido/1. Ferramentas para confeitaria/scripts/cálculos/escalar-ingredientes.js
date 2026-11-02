// Multiplica a quantidade usada de cada ingrediente por um fator de escala, mantendo
// os demais dados (unidades, preços de compra) intactos para recalcular o custo.
export function escalarIngredientes(ingredientes, fatorDeEscala) {
  if (!Array.isArray(ingredientes)) return [];
  if (!Number.isFinite(fatorDeEscala) || fatorDeEscala <= 0) {
    throw new RangeError('Fator de escala inválido: precisa ser um número maior que zero.');
  }
  return ingredientes.map((ingrediente) => ({
    ...ingrediente,
    quantidadeUsada: ingrediente.quantidadeUsada * fatorDeEscala,
  }));
}
