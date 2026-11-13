/** Colunas de um odômetro com tantas casas quanto o total real exige. */
export function colunasDoContador(valor, total) {
  const casas = String(Math.max(0, Math.trunc(total))).length;
  return Array.from({ length: casas }, (_, coluna) => {
    const ordem = 10 ** (casas - coluna - 1);
    const continuo = Math.floor(valor / ordem) + Math.max(0, valor % ordem - (ordem - 1));
    return { continuo, opacidade: coluna === casas - 1 ? 1 : Math.min(1, continuo * 1.4) };
  });
}
