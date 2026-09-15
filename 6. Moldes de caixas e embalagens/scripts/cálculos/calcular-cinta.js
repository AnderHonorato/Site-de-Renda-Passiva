// Calcula o molde de uma cinta de papel para envolver uma caixa: uma faixa retangular
// cujo comprimento é o perímetro da caixa mais a sobreposição de colagem. Função pura, em
// milímetros. A rede tem só corte ao redor da faixa; uma linha tracejada marca onde começa
// a sobreposição, como referência para colar.
const MÍNIMO_MM = 20;
const MÁXIMO_PERÍMETRO_MM = 3000;

export function calcularCinta({ perímetroMm, sobreposiçãoMm, alturaMm, tipoDePapel = '', textoOpcional = '' }) {
  if (!Number.isFinite(perímetroMm) || perímetroMm < MÍNIMO_MM || perímetroMm > MÁXIMO_PERÍMETRO_MM) {
    return { válido: false, campo: 'perímetroMm', erro: `O perímetro precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_PERÍMETRO_MM} mm.` };
  }
  if (!Number.isFinite(sobreposiçãoMm) || sobreposiçãoMm < 5 || sobreposiçãoMm > perímetroMm / 2) {
    return { válido: false, campo: 'sobreposiçãoMm', erro: 'A sobreposição precisa ser de pelo menos 5 mm e não pode passar da metade do perímetro.' };
  }
  if (!Number.isFinite(alturaMm) || alturaMm < 10 || alturaMm > 400) {
    return { válido: false, campo: 'alturaMm', erro: 'A altura da cinta precisa estar entre 10 mm e 400 mm.' };
  }

  const comprimentoTotalMm = perímetroMm + sobreposiçãoMm;
  const segmentosDeCorte = [
    { x1: 0, y1: 0, x2: comprimentoTotalMm, y2: 0, tipo: 'corte' },
    { x1: comprimentoTotalMm, y1: 0, x2: comprimentoTotalMm, y2: alturaMm, tipo: 'corte' },
    { x1: comprimentoTotalMm, y1: alturaMm, x2: 0, y2: alturaMm, tipo: 'corte' },
    { x1: 0, y1: alturaMm, x2: 0, y2: 0, tipo: 'corte' },
  ];
  const segmentosDeDobra = [{ x1: perímetroMm, y1: 0, x2: perímetroMm, y2: alturaMm, tipo: 'dobra' }];

  return {
    válido: true,
    perímetroMm,
    sobreposiçãoMm,
    alturaMm,
    comprimentoTotalMm,
    tipoDePapel,
    textoOpcional,
    segmentosDeCorte,
    segmentosDeDobra,
    retânguloEnvolvente: { larguraMm: comprimentoTotalMm, alturaMm },
  };
}
