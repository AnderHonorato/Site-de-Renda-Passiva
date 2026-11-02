// Compara embalagens de tinta pelo custo por litro e pelo custo por m² de cobertura
// declarada pelo fabricante — os dois números que importam antes de decidir qual comprar.
export function calcularComparadorDeTinta({ embalagens = [] }) {
  if (!Array.isArray(embalagens) || embalagens.length < 2) return { válido: false, erro: 'Adicione ao menos duas embalagens para comparar.' };
  if (embalagens.length > 20) return { válido: false, erro: 'Use no máximo 20 embalagens.' };

  const itens = [];
  for (const [índice, embalagem] of embalagens.entries()) {
    const posição = `Embalagem ${índice + 1}`;
    const { litros, preço, coberturaDeclaradaEmM2 } = embalagem ?? {};
    if (!Number.isFinite(litros) || litros <= 0) return { válido: false, erro: `${posição}: informe a capacidade em litros, maior que zero.` };
    if (!Number.isFinite(preço) || preço <= 0) return { válido: false, erro: `${posição}: informe o preço, maior que zero.` };
    if (!Number.isFinite(coberturaDeclaradaEmM2) || coberturaDeclaradaEmM2 <= 0) {
      return { válido: false, erro: `${posição}: informe a cobertura declarada na embalagem, maior que zero.` };
    }
    itens.push({ ...embalagem, custoPorLitro: preço / litros, custoPorM2: preço / coberturaDeclaradaEmM2 });
  }

  const melhorPorLitro = itens.reduce((melhor, item) => (item.custoPorLitro < melhor.custoPorLitro ? item : melhor));
  const melhorPorM2 = itens.reduce((melhor, item) => (item.custoPorM2 < melhor.custoPorM2 ? item : melhor));

  return { válido: true, itens, melhorPorLitroId: melhorPorLitro.id, melhorPorM2Id: melhorPorM2.id };
}
