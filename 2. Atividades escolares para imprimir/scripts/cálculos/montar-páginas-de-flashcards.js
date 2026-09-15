// Organiza pares de pergunta/resposta em páginas de flashcards prontas para impressão
// frente e verso: cada página tem uma grade fixa (2 colunas × 4 linhas = 8 cartões) com a
// frente (perguntas) e o verso correspondente (respostas). Quando espelharVerso é
// verdadeiro, a ordem das colunas do verso sai invertida (direita para esquerda) em
// relação à frente — assim, ao imprimir dos dois lados da folha (duplex, virando pela
// borda longa), cada verso cai exatamente atrás da frente certa. Função pura: a mesma
// grade alimenta a prévia na tela e o PDF.
export const COLUNAS_POR_PÁGINA = 2;
export const LINHAS_POR_PÁGINA = 4;
export const CARTÕES_POR_PÁGINA = COLUNAS_POR_PÁGINA * LINHAS_POR_PÁGINA;
export const QUANTIDADE_MÁXIMA_DE_PARES = 40;
export const TAMANHO_MÁXIMO_DO_TEXTO = 80;

function paresDaLinha(paresDaPágina, linha) {
  const célulasDaLinha = [];
  for (let coluna = 0; coluna < COLUNAS_POR_PÁGINA; coluna += 1) {
    célulasDaLinha.push(paresDaPágina[linha * COLUNAS_POR_PÁGINA + coluna] ?? null);
  }
  return célulasDaLinha;
}

export function montarPáginasDeFlashcards({ pares = [], espelharVerso = true } = {}) {
  const paresLimpos = Array.isArray(pares)
    ? pares.map((par) => ({ pergunta: String(par?.pergunta ?? '').trim(), resposta: String(par?.resposta ?? '').trim() })).filter((par) => par.pergunta !== '' || par.resposta !== '')
    : [];

  if (paresLimpos.length === 0) return { válido: false, erro: 'Adicione ao menos um par de pergunta e resposta.' };
  if (paresLimpos.length > QUANTIDADE_MÁXIMA_DE_PARES) return { válido: false, erro: `Use no máximo ${QUANTIDADE_MÁXIMA_DE_PARES} pares.` };
  const incompleto = paresLimpos.find((par) => !par.pergunta || !par.resposta);
  if (incompleto) return { válido: false, erro: 'Preencha a pergunta e a resposta de cada par (ou remova o par incompleto).' };
  const textoLongoDemais = paresLimpos.find((par) => par.pergunta.length > TAMANHO_MÁXIMO_DO_TEXTO || par.resposta.length > TAMANHO_MÁXIMO_DO_TEXTO);
  if (textoLongoDemais) return { válido: false, erro: `Cada pergunta e resposta pode ter até ${TAMANHO_MÁXIMO_DO_TEXTO} caracteres.` };

  const páginas = [];
  for (let início = 0; início < paresLimpos.length; início += CARTÕES_POR_PÁGINA) {
    const paresDaPágina = paresLimpos.slice(início, início + CARTÕES_POR_PÁGINA);
    const linhasFrente = [];
    const linhasVerso = [];
    for (let linha = 0; linha < LINHAS_POR_PÁGINA; linha += 1) {
      const célulasDaLinha = paresDaLinha(paresDaPágina, linha);
      if (célulasDaLinha.every((par) => par === null)) break;
      linhasFrente.push(célulasDaLinha.map((par) => par?.pergunta ?? null));
      const célulasDoVerso = espelharVerso ? célulasDaLinha.slice().reverse() : célulasDaLinha;
      linhasVerso.push(célulasDoVerso.map((par) => par?.resposta ?? null));
    }
    páginas.push({ frente: linhasFrente, verso: linhasVerso, quantidadeDeCartões: paresDaPágina.length });
  }

  return { válido: true, pares: paresLimpos, páginas, colunas: COLUNAS_POR_PÁGINA, linhas: LINHAS_POR_PÁGINA, espelharVerso };
}
