// Calcula o molde plano (não montado, "folha escalada") de uma sacola de papel simples,
// sem alça estrutural: um tubo retangular achatado (frente, duas sanfonas laterais e
// verso), com uma aba de colagem lateral, mais a aba de fundo (dobra para fechar por
// baixo) e a aba superior (dobra para fechar por cima). Função pura, em milímetros.
const MÍNIMO_MM = 30;
const MÁXIMO_MM = 600;

export function calcularSacoDePapel({ larguraMm, profundidadeMm, alturaMm, abaSuperiorMm, abaDeColagemMm = 15, tipoDePapel = '', textoOpcional = '' }) {
  for (const [campo, rótulo, valor] of [
    ['larguraMm', 'Largura', larguraMm],
    ['profundidadeMm', 'Profundidade', profundidadeMm],
    ['alturaMm', 'Altura', alturaMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isFinite(abaSuperiorMm) || abaSuperiorMm < 0 || abaSuperiorMm > 100) {
    return { válido: false, campo: 'abaSuperiorMm', erro: 'A aba superior precisa estar entre 0 mm e 100 mm.' };
  }
  if (!Number.isFinite(abaDeColagemMm) || abaDeColagemMm < 8 || abaDeColagemMm > 40) {
    return { válido: false, campo: 'abaDeColagemMm', erro: 'A aba de colagem lateral precisa estar entre 8 mm e 40 mm.' };
  }

  const w = larguraMm;
  const d = profundidadeMm;
  const h = alturaMm;
  const t = abaDeColagemMm;

  // Posições verticais das dobras (esquerda para direita): meia-sanfona, frente, sanfona,
  // verso, meia-sanfona, aba de colagem.
  const x1 = d / 2;
  const x2 = x1 + w;
  const x3 = x2 + d;
  const x4 = x3 + w;
  const x5 = x4 + d / 2;
  const larguraTotalMm = x5 + t;

  const y0 = abaSuperiorMm;
  const y1 = y0 + h;
  const y2 = y1 + d; // aba de fundo, dobra a partir daqui, mesma profundidade da sanfona.
  const alturaTotalMm = y2;

  const segmentosDeDobra = [x1, x2, x3, x4, x5].map((x) => ({ x1: x, y1: 0, x2: x, y2: alturaTotalMm, tipo: 'dobra' }));
  if (abaSuperiorMm > 0) segmentosDeDobra.push({ x1: 0, y1: y0, x2: larguraTotalMm, y2: y0, tipo: 'dobra' });
  segmentosDeDobra.push({ x1: 0, y1: y1, x2: larguraTotalMm, y2: y1, tipo: 'dobra' });

  const segmentosDeCorte = [
    { x1: 0, y1: 0, x2: larguraTotalMm, y2: 0, tipo: 'corte' },
    { x1: larguraTotalMm, y1: 0, x2: larguraTotalMm, y2: alturaTotalMm, tipo: 'corte' },
    { x1: larguraTotalMm, y1: alturaTotalMm, x2: 0, y2: alturaTotalMm, tipo: 'corte' },
    { x1: 0, y1: alturaTotalMm, x2: 0, y2: 0, tipo: 'corte' },
  ];

  return {
    válido: true,
    larguraMm: w,
    profundidadeMm: d,
    alturaMm: h,
    abaSuperiorMm,
    abaDeColagemMm: t,
    tipoDePapel,
    textoOpcional,
    segmentosDeCorte,
    segmentosDeDobra,
    retânguloEnvolvente: { larguraMm: larguraTotalMm, alturaMm: alturaTotalMm },
  };
}
