// Monta a grade do caça-palavras de forma determinística (mesma semente → mesma
// grade). Estratégia limitada: cada palavra tenta um número máximo de posições
// aleatórias; se nenhuma funcionar, a palavra entra em "não colocadas" com o motivo
// — nunca é omitida em silêncio, e o laço nunca é infinito.
import { criarGeradorPseudoaleatório } from './criar-gerador-pseudoaleatório.js';
import { normalizarPalavraParaGrade } from './normalizar-palavra-para-grade.js';

export const TENTATIVAS_MÁXIMAS_POR_PALAVRA = 300;
const LINHAS_MÍNIMAS = 4;
const LINHAS_MÁXIMAS = 30;
const PALAVRAS_MÁXIMAS = 30;
const ALFABETO_DE_PREENCHIMENTO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const VETORES_POR_DIREÇÃO = {
  horizontal: [0, 1],
  vertical: [1, 0],
  'diagonal-desce': [1, 1],
  'diagonal-sobe': [-1, 1],
};
const DIREÇÕES_VÁLIDAS = Object.keys(VETORES_POR_DIREÇÃO);

function intervaloDeInícios(passo, comprimento, tamanho) {
  if (passo === 0) return [0, tamanho - 1];
  if (passo === 1) return [0, tamanho - comprimento];
  return [comprimento - 1, tamanho - 1];
}

function vetoresCandidatos(direções, permitirInvertidas) {
  const vetores = [];
  for (const direção of direções) {
    const [dl, dc] = VETORES_POR_DIREÇÃO[direção];
    vetores.push({ direção, invertida: false, dl, dc });
    if (permitirInvertidas) vetores.push({ direção, invertida: true, dl: -dl, dc: -dc });
  }
  return vetores;
}

function vetorCabeNaGrade(vetor, comprimento, linhas, colunas) {
  const [lMín, lMáx] = intervaloDeInícios(vetor.dl, comprimento, linhas);
  const [cMín, cMáx] = intervaloDeInícios(vetor.dc, comprimento, colunas);
  return lMín <= lMáx && cMín <= cMáx ? { lMín, lMáx, cMín, cMáx } : null;
}

function tentarColocar(grade, palavra, vetores, rng, linhas, colunas) {
  const candidatos = vetores
    .map((vetor) => ({ vetor, faixa: vetorCabeNaGrade(vetor, palavra.length, linhas, colunas) }))
    .filter((item) => item.faixa);
  if (candidatos.length === 0) return null;

  for (let tentativa = 0; tentativa < TENTATIVAS_MÁXIMAS_POR_PALAVRA; tentativa += 1) {
    const { vetor, faixa } = rng.elementoDe(candidatos);
    const linhaInicial = rng.inteiroEntre(faixa.lMín, faixa.lMáx);
    const colunaInicial = rng.inteiroEntre(faixa.cMín, faixa.cMáx);
    let conflito = false;
    const posições = [];
    for (let índice = 0; índice < palavra.length; índice += 1) {
      const linha = linhaInicial + vetor.dl * índice;
      const coluna = colunaInicial + vetor.dc * índice;
      const atual = grade[linha][coluna];
      if (atual !== null && atual !== palavra[índice]) {
        conflito = true;
        break;
      }
      posições.push({ linha, coluna });
    }
    if (conflito) continue;
    for (let índice = 0; índice < palavra.length; índice += 1) {
      grade[posições[índice].linha][posições[índice].coluna] = palavra[índice];
    }
    return { linha: linhaInicial, coluna: colunaInicial, direção: vetor.direção, invertida: vetor.invertida };
  }
  return null;
}

export function gerarCaçaPalavras({
  palavras = [],
  direções = ['horizontal', 'vertical'],
  permitirInvertidas = false,
  linhas = 12,
  colunas = 12,
  modoDeAcentos = 'manter',
  semente = 1,
} = {}) {
  if (!Number.isInteger(linhas) || !Number.isInteger(colunas) || linhas < LINHAS_MÍNIMAS || colunas < LINHAS_MÍNIMAS || linhas > LINHAS_MÁXIMAS || colunas > LINHAS_MÁXIMAS) {
    return { válido: false, erro: `A grade precisa ter entre ${LINHAS_MÍNIMAS} e ${LINHAS_MÁXIMAS} linhas e colunas.` };
  }
  const direçõesEscolhidas = Array.isArray(direções) ? direções.filter((direção) => DIREÇÕES_VÁLIDAS.includes(direção)) : [];
  if (direçõesEscolhidas.length === 0) return { válido: false, erro: 'Escolha ao menos uma direção (horizontal, vertical ou diagonal).' };
  if (modoDeAcentos !== 'manter' && modoDeAcentos !== 'remover') return { válido: false, erro: 'Modo de acentos desconhecido.' };
  const listaOriginal = Array.isArray(palavras) ? palavras.map((palavra) => String(palavra ?? '').trim()).filter(Boolean) : [];
  if (listaOriginal.length === 0) return { válido: false, erro: 'Digite ao menos uma palavra para montar o caça-palavras.' };
  if (listaOriginal.length > PALAVRAS_MÁXIMAS) return { válido: false, erro: `Use no máximo ${PALAVRAS_MÁXIMAS} palavras.` };
  if (!Number.isFinite(semente)) return { válido: false, erro: 'A semente precisa ser um número.' };

  const rng = criarGeradorPseudoaleatório(semente);
  const vetores = vetoresCandidatos(direçõesEscolhidas, Boolean(permitirInvertidas));
  const grade = Array.from({ length: linhas }, () => Array.from({ length: colunas }, () => null));

  const normalizadas = [];
  const jáVistas = new Set();
  const nãoColocadas = [];
  for (const original of listaOriginal) {
    const normalizada = normalizarPalavraParaGrade(original, modoDeAcentos);
    if (!normalizada) {
      nãoColocadas.push({ palavra: original, motivo: 'A palavra ficou vazia depois de remover pontuação e espaços.' });
      continue;
    }
    if (jáVistas.has(normalizada)) {
      nãoColocadas.push({ palavra: original, motivo: 'Palavra repetida (já usada antes na lista).' });
      continue;
    }
    jáVistas.add(normalizada);
    normalizadas.push({ original, normalizada });
  }

  // Palavras maiores primeiro: ajuda a encaixar todas em grades apertadas.
  normalizadas.sort((a, b) => b.normalizada.length - a.normalizada.length);

  const colocadas = [];
  for (const { original, normalizada } of normalizadas) {
    if (normalizada.length > linhas && normalizada.length > colunas) {
      nãoColocadas.push({ palavra: original, motivo: `A palavra tem ${normalizada.length} letras e não cabe numa grade de ${linhas}×${colunas}.` });
      continue;
    }
    const posição = tentarColocar(grade, normalizada, vetores, rng, linhas, colunas);
    if (posição) {
      colocadas.push({ palavra: original, palavraNaGrade: normalizada, ...posição });
    } else {
      nãoColocadas.push({ palavra: original, motivo: 'Não coube na grade com o tamanho, as direções e as palavras já colocadas. Aumente a grade ou reduza a lista.' });
    }
  }

  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      if (grade[linha][coluna] === null) grade[linha][coluna] = rng.elementoDe(ALFABETO_DE_PREENCHIMENTO.split(''));
    }
  }

  return { válido: true, grade, linhas, colunas, modoDeAcentos, colocadas, nãoColocadas, sementeUsada: semente };
}
