// Gera cartelas de bingo determinísticas (mesma semente → mesmas cartelas) a partir de
// um intervalo de números e um tamanho de grade (3×3, 4×4 ou 5×5). Cada cartela sai sem
// números repetidos nela mesma (é sempre um subconjunto de números distintos do
// intervalo) e nenhuma cartela sai idêntica a outra (mesmo conjunto de números, em
// qualquer ordem) — cartelas repetidas anulariam o jogo. Recusa configuração impossível
// (intervalo com menos números do que casas na cartela) antes de tentar sortear.
import { criarGeradorPseudoaleatório } from '../geração/criar-gerador-pseudoaleatório.js';

export const TAMANHOS_DE_CARTELA_VÁLIDOS = [3, 4, 5];
export const QUANTIDADE_MÁXIMA_DE_CARTELAS = 50;
export const INTERVALO_MÁXIMO_DE_NÚMEROS = 10_000;
export const TENTATIVAS_MÁXIMAS_POR_CARTELA = 200;

function assinaturaDoConjunto(números) {
  return números.slice().sort((a, b) => a - b).join(',');
}

export function gerarCartelasDeBingo({ intervaloMínimo = 1, intervaloMáximo = 75, tamanhoDaGrade = 5, quantidadeDeCartelas = 1, semente = 1 } = {}) {
  if (!Number.isInteger(intervaloMínimo) || !Number.isInteger(intervaloMáximo) || intervaloMínimo < 0 || intervaloMáximo > 1_000_000) {
    return { válido: false, erro: 'O intervalo precisa ser dois números inteiros não negativos.' };
  }
  if (intervaloMínimo > intervaloMáximo) {
    return { válido: false, erro: 'O início do intervalo precisa ser menor ou igual ao fim.' };
  }
  const quantidadeDeNúmeros = intervaloMáximo - intervaloMínimo + 1;
  if (quantidadeDeNúmeros > INTERVALO_MÁXIMO_DE_NÚMEROS) {
    return { válido: false, erro: `O intervalo tem ${quantidadeDeNúmeros} números; use no máximo ${INTERVALO_MÁXIMO_DE_NÚMEROS} para manter o sorteio rápido.` };
  }
  if (!TAMANHOS_DE_CARTELA_VÁLIDOS.includes(tamanhoDaGrade)) {
    return { válido: false, erro: 'Escolha uma cartela 3×3, 4×4 ou 5×5.' };
  }
  const casas = tamanhoDaGrade * tamanhoDaGrade;
  if (quantidadeDeNúmeros < casas) {
    return {
      válido: false,
      erro: `O intervalo tem ${quantidadeDeNúmeros} número(s), menos que as ${casas} casas de uma cartela ${tamanhoDaGrade}×${tamanhoDaGrade}. Aumente o intervalo ou diminua o tamanho da cartela.`,
    };
  }
  if (!Number.isInteger(quantidadeDeCartelas) || quantidadeDeCartelas < 1 || quantidadeDeCartelas > QUANTIDADE_MÁXIMA_DE_CARTELAS) {
    return { válido: false, erro: `A quantidade de cartelas precisa ser um número inteiro de 1 a ${QUANTIDADE_MÁXIMA_DE_CARTELAS}.` };
  }
  if (!Number.isFinite(semente)) return { válido: false, erro: 'A semente precisa ser um número.' };

  const rng = criarGeradorPseudoaleatório(semente);
  // Array de trabalho reaproveitado entre sorteios: cada cartela embaralha só as
  // primeiras "casas" posições (Fisher–Yates parcial), o que mantém o custo baixo mesmo
  // com intervalos grandes — sem precisar copiar o array inteiro a cada tentativa.
  const trabalho = Array.from({ length: quantidadeDeNúmeros }, (_, índice) => intervaloMínimo + índice);

  function sortearSubconjunto(quantidade) {
    for (let i = 0; i < quantidade; i += 1) {
      const j = rng.inteiroEntre(i, trabalho.length - 1);
      [trabalho[i], trabalho[j]] = [trabalho[j], trabalho[i]];
    }
    return trabalho.slice(0, quantidade);
  }

  const assinaturasUsadas = new Set();
  const cartelas = [];
  for (let índiceDaCartela = 0; índiceDaCartela < quantidadeDeCartelas; índiceDaCartela += 1) {
    let números = null;
    for (let tentativa = 0; tentativa < TENTATIVAS_MÁXIMAS_POR_CARTELA; tentativa += 1) {
      const candidato = sortearSubconjunto(casas);
      const assinatura = assinaturaDoConjunto(candidato);
      if (assinaturasUsadas.has(assinatura)) continue;
      assinaturasUsadas.add(assinatura);
      números = candidato;
      break;
    }
    if (!números) {
      return {
        válido: false,
        erro: `Não foi possível gerar ${quantidadeDeCartelas} cartela(s) sem repetição com este intervalo e tamanho (só existe um número limitado de combinações possíveis). Aumente o intervalo, diminua a quantidade de cartelas ou reduza o tamanho da grade.`,
      };
    }
    const grade = [];
    for (let linha = 0; linha < tamanhoDaGrade; linha += 1) {
      grade.push(números.slice(linha * tamanhoDaGrade, (linha + 1) * tamanhoDaGrade));
    }
    cartelas.push({ número: índiceDaCartela + 1, grade });
  }

  const listaDeSorteio = rng.embaralhar(trabalho);

  return { válido: true, cartelas, listaDeSorteio, tamanhoDaGrade, intervaloMínimo, intervaloMáximo, sementeUsada: semente };
}
