// Converte quantidades entre unidades compatíveis: massa (g ↔ kg), volume (ml ↔ L)
// ou contagem (unidade). Nunca converte massa em volume nem volume em massa: isso
// exigiria a densidade específica do ingrediente, que esta ferramenta não presume.
const FATOR_PARA_BASE = { g: 1, kg: 1000, ml: 1, L: 1000, unidade: 1 };
const FAMÍLIA_DA_UNIDADE = { g: 'massa', kg: 'massa', ml: 'volume', L: 'volume', unidade: 'contagem' };

export const UNIDADES_SUPORTADAS = Object.keys(FATOR_PARA_BASE);

/**
 * @param {number} quantidade
 * @param {string} deUnidade
 * @param {string} paraUnidade
 * @returns {{válido: true, valor: number} | {válido: false, erro: string}}
 */
export function converterUnidade(quantidade, deUnidade, paraUnidade) {
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return { válido: false, erro: 'Quantidade inválida para conversão de unidade.' };
  }
  const famíliaDeOrigem = FAMÍLIA_DA_UNIDADE[deUnidade];
  const famíliaDeDestino = FAMÍLIA_DA_UNIDADE[paraUnidade];
  if (!famíliaDeOrigem || !famíliaDeDestino) {
    return { válido: false, erro: 'Unidade desconhecida.' };
  }
  if (famíliaDeOrigem !== famíliaDeDestino) {
    return {
      válido: false,
      erro: `Não é possível converter ${deUnidade} em ${paraUnidade}: são grandezas diferentes (massa, volume ou unidade) e isso exigiria uma densidade específica, que não presumimos.`,
    };
  }
  const quantidadeNaBase = quantidade * FATOR_PARA_BASE[deUnidade];
  return { válido: true, valor: quantidadeNaBase / FATOR_PARA_BASE[paraUnidade] };
}
