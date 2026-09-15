// Calcula o custo de uma linha de compra a partir da quantidade comprada e do preço que
// a pessoa usuária informou por unidade de compra: por quilograma para itens em gramas,
// por litro para itens em mililitros, por pacote para itens em unidade com embalagem
// informada, ou por unidade avulsa quando não há embalagem. O preço já entra e sai em
// centavos inteiros — a função nunca trata um valor em centavos como se fosse reais
// (esse foi o defeito relatado: multiplicar um resultado que já estava em centavos por
// 100 de novo, inflando o custo em 100×). Função pura.
export function calcularCustoDeCompra({ quantidadeComprada, unidadeBase, embalagemNaUnidadeBase = null, preçoPorUnidadeDeCompraEmCentavos }) {
  if (preçoPorUnidadeDeCompraEmCentavos === null || preçoPorUnidadeDeCompraEmCentavos === undefined) return null;
  if (!Number.isFinite(quantidadeComprada) || quantidadeComprada < 0) return null;
  if (!Number.isInteger(preçoPorUnidadeDeCompraEmCentavos) || preçoPorUnidadeDeCompraEmCentavos < 0) return null;

  const unidadesPorCompra = unidadeBase === 'un' ? (Number.isFinite(embalagemNaUnidadeBase) && embalagemNaUnidadeBase > 0 ? embalagemNaUnidadeBase : 1) : 1000;
  return Math.round((quantidadeComprada / unidadesPorCompra) * preçoPorUnidadeDeCompraEmCentavos);
}
