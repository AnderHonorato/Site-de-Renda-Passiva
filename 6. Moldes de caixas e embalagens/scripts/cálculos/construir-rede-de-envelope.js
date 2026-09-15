// Monta a rede plana de um envelope: um bolso retangular central com quatro abas
// trapezoidais (uma por lado), cortadas a 45° nos cantos para não se sobreporem quando
// dobradas para dentro. Função pura, em milímetros.
//
// Sistema de coordenadas: bolso em x:[aba, aba+largura], y:[aba, aba+altura]; cada aba se
// projeta para fora do bolso, com a ponta encolhida em "aba" mm de cada lado (corte a 45°).
export function construirRedeDeEnvelope({ larguraMm, alturaMm, abaMm }) {
  const w = larguraMm;
  const h = alturaMm;
  const t = abaMm;
  if (!(w > 0) || !(h > 0) || !(t > 0) || t >= w / 2 || t >= h / 2) return null;

  const segmentosDeCorte = [];
  const segmentosDeDobra = [];
  const corte = (x1, y1, x2, y2) => segmentosDeCorte.push({ x1, y1, x2, y2, tipo: 'corte' });
  const dobra = (x1, y1, x2, y2) => segmentosDeDobra.push({ x1, y1, x2, y2, tipo: 'dobra' });

  const x0 = t;
  const x1 = t + w;
  const y0 = t;
  const y1 = t + h;

  // Aba de cima (dobra ao longo de y0, projeta-se para y=0).
  dobra(x0, y0, x1, y0);
  corte(x1, y0, x1 - t, 0);
  corte(x1 - t, 0, x0 + t, 0);
  corte(x0 + t, 0, x0, y0);

  // Aba de baixo (dobra ao longo de y1, projeta-se para y = h + 2t).
  dobra(x0, y1, x1, y1);
  corte(x1, y1, x1 - t, y1 + t);
  corte(x1 - t, y1 + t, x0 + t, y1 + t);
  corte(x0 + t, y1 + t, x0, y1);

  // Aba da esquerda (dobra ao longo de x0, projeta-se para x=0).
  dobra(x0, y0, x0, y1);
  corte(x0, y1, 0, y1 - t);
  corte(0, y1 - t, 0, y0 + t);
  corte(0, y0 + t, x0, y0);

  // Aba da direita (dobra ao longo de x1, projeta-se para x = w + 2t).
  dobra(x1, y0, x1, y1);
  corte(x1, y1, x1 + t, y1 - t);
  corte(x1 + t, y1 - t, x1 + t, y0 + t);
  corte(x1 + t, y0 + t, x1, y0);

  return {
    segmentosDeCorte,
    segmentosDeDobra,
    retânguloEnvolvente: { larguraMm: w + 2 * t, alturaMm: h + 2 * t },
  };
}
