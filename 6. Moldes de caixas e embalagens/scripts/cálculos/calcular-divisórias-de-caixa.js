// Calcula as tiras encaixáveis (tipo "grade de garrafeira") que dividem o interior de uma
// caixa em linhas × colunas compartimentos. Para C colunas são precisas C-1 tiras
// "verticais" (cada uma com o comprimento da largura interna da caixa, com entalhes
// abertos por cima) e para L linhas são precisas L-1 tiras "horizontais" (cada uma com o
// comprimento do comprimento interno, com entalhes abertos por baixo); os entalhes têm a
// espessura do material e profundidade igual à metade da altura, para encaixar na metade
// da altura da tira perpendicular. Função pura, em milímetros.
const MÍNIMO_MM = 20;
const MÁXIMO_MM = 1000;

function montarTira(comprimentoMm, alturaMm, quantidadeDeEntalhes, espessuraMm, entalheNoTopo) {
  const segmentosDeCorte = [
    { x1: 0, y1: 0, x2: comprimentoMm, y2: 0, tipo: 'corte' },
    { x1: comprimentoMm, y1: 0, x2: comprimentoMm, y2: alturaMm, tipo: 'corte' },
    { x1: comprimentoMm, y1: alturaMm, x2: 0, y2: alturaMm, tipo: 'corte' },
    { x1: 0, y1: alturaMm, x2: 0, y2: 0, tipo: 'corte' },
  ];
  const profundidadeMm = alturaMm / 2;
  for (let índice = 1; índice <= quantidadeDeEntalhes; índice += 1) {
    const centroMm = (comprimentoMm * índice) / (quantidadeDeEntalhes + 1);
    const x1 = centroMm - espessuraMm / 2;
    const x2 = centroMm + espessuraMm / 2;
    if (entalheNoTopo) {
      segmentosDeCorte.push(
        { x1, y1: 0, x2: x1, y2: profundidadeMm, tipo: 'corte' },
        { x1: x1, y1: profundidadeMm, x2: x2, y2: profundidadeMm, tipo: 'corte' },
        { x1: x2, y1: profundidadeMm, x2: x2, y2: 0, tipo: 'corte' },
      );
    } else {
      segmentosDeCorte.push(
        { x1, y1: alturaMm, x2: x1, y2: profundidadeMm, tipo: 'corte' },
        { x1: x1, y1: profundidadeMm, x2: x2, y2: profundidadeMm, tipo: 'corte' },
        { x1: x2, y1: profundidadeMm, x2: x2, y2: alturaMm, tipo: 'corte' },
      );
    }
  }
  return { segmentosDeCorte, segmentosDeDobra: [], retânguloEnvolvente: { larguraMm: comprimentoMm, alturaMm } };
}

export function calcularDivisóriasDeCaixa({ comprimentoInternoMm, larguraInternoMm, alturaInternoMm, linhas, colunas, espessuraMm = 2, tipoDePapel = '', textoOpcional = '' }) {
  for (const [campo, rótulo, valor] of [
    ['comprimentoInternoMm', 'Comprimento interno', comprimentoInternoMm],
    ['larguraInternoMm', 'Largura interna', larguraInternoMm],
    ['alturaInternoMm', 'Altura interna', alturaInternoMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isInteger(linhas) || linhas < 1 || linhas > 10) return { válido: false, campo: 'linhas', erro: 'O número de linhas precisa ser um inteiro de 1 a 10.' };
  if (!Number.isInteger(colunas) || colunas < 1 || colunas > 10) return { válido: false, campo: 'colunas', erro: 'O número de colunas precisa ser um inteiro de 1 a 10.' };
  if (!Number.isFinite(espessuraMm) || espessuraMm <= 0 || espessuraMm > 10) return { válido: false, campo: 'espessuraMm', erro: 'A espessura do material precisa estar entre 0 e 10 mm.' };

  const tirasVerticais = [];
  for (let índice = 0; índice < colunas - 1; índice += 1) tirasVerticais.push(montarTira(larguraInternoMm, alturaInternoMm, linhas - 1, espessuraMm, true));

  const tirasHorizontais = [];
  for (let índice = 0; índice < linhas - 1; índice += 1) tirasHorizontais.push(montarTira(comprimentoInternoMm, alturaInternoMm, colunas - 1, espessuraMm, false));

  return {
    válido: true,
    comprimentoInternoMm,
    larguraInternoMm,
    alturaInternoMm,
    linhas,
    colunas,
    compartimentos: linhas * colunas,
    espessuraMm,
    tipoDePapel,
    textoOpcional,
    tirasVerticais,
    tirasHorizontais,
  };
}
