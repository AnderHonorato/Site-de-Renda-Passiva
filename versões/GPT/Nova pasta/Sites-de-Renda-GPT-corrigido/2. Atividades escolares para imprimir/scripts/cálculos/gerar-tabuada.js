// Gera exercícios de tabuada (fator × multiplicador) para os fatores escolhidos,
// em ordem sequencial (por fator, do multiplicador mínimo ao máximo) ou embaralhada
// por semente. O resultado vem de resolverOperaçãoMatemática, igual em folha e gabarito.
import { criarGeradorPseudoaleatório } from '../geração/criar-gerador-pseudoaleatório.js';
import { resolverOperaçãoMatemática } from './resolver-operação-matemática.js';

const ORDENS_VÁLIDAS = ['sequencial', 'embaralhada'];
const QUANTIDADE_MÁXIMA_DE_ITENS = 400;

export function gerarTabuada({ fatores = [], multiplicadorMínimo = 1, multiplicadorMáximo = 10, ordem = 'sequencial', semente = 1 } = {}) {
  const fatoresVálidos = Array.isArray(fatores) ? fatores.filter((fator) => Number.isInteger(fator) && fator >= 0 && fator <= 1000) : [];
  if (fatoresVálidos.length === 0) return { válido: false, erro: 'Escolha ao menos um fator para treinar (por exemplo, o 7).' };
  if (!Number.isInteger(multiplicadorMínimo) || !Number.isInteger(multiplicadorMáximo) || multiplicadorMínimo < 0 || multiplicadorMáximo > 1000 || multiplicadorMínimo > multiplicadorMáximo) {
    return { válido: false, erro: 'O intervalo de multiplicadores precisa ser dois inteiros não negativos, do menor ao maior.' };
  }
  if (!ORDENS_VÁLIDAS.includes(ordem)) return { válido: false, erro: 'Ordem desconhecida.' };
  if (!Number.isFinite(semente)) return { válido: false, erro: 'A semente precisa ser um número.' };

  const quantidadeTotal = fatoresVálidos.length * (multiplicadorMáximo - multiplicadorMínimo + 1);
  if (quantidadeTotal > QUANTIDADE_MÁXIMA_DE_ITENS) {
    return { válido: false, erro: `Essa combinação geraria ${quantidadeTotal} exercícios; reduza os fatores ou o intervalo para no máximo ${QUANTIDADE_MÁXIMA_DE_ITENS}.` };
  }

  let itens = [];
  for (const fator of fatoresVálidos) {
    for (let multiplicador = multiplicadorMínimo; multiplicador <= multiplicadorMáximo; multiplicador += 1) {
      const { resposta } = resolverOperaçãoMatemática({ operandoA: fator, operandoB: multiplicador, operador: '×' });
      itens.push({ fator, multiplicador, resposta });
    }
  }

  if (ordem === 'embaralhada') {
    const rng = criarGeradorPseudoaleatório(semente);
    itens = rng.embaralhar(itens);
  }

  return {
    válido: true,
    itens: itens.map((item, índice) => ({ id: índice + 1, ...item })),
    sementeUsada: semente,
  };
}
