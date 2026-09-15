// Monta a rede plana (die-line) de uma caixa retangular: uma base central, quatro paredes
// dobradas a partir das arestas da base e, quando há espaço para abas, quatro abas de
// emenda nos cantos (dobradas a partir das paredes de topo e de baixo, para colar por
// dentro das paredes esquerda e direita). Função pura em milímetros: não valida limites de
// uso — isso é feito por quem chama (calcular-caixa-retangular.js, calcular-caixa-com-tampa.js)
// — apenas recusa montar uma rede geometricamente impossível.
//
// Sistema de coordenadas: origem no canto superior esquerdo do retângulo envolvente.
//   parede-topo:      x:[a, a+c]     y:[0, a]
//   parede-baixo:     x:[a, a+c]     y:[a+l, a+l+a]
//   parede-esquerda:  x:[0, a]       y:[a, a+l]
//   parede-direita:   x:[a+c, a+c+a] y:[a, a+l]
//   base (não desenhada; suas 4 arestas são as dobras das paredes): x:[a,a+c] y:[a,a+l]
//   abas (quando abaMm > 0), nos quatro cantos livres deixados pelas paredes topo/baixo.
export function construirRedeDeCaixa({ comprimentoMm, larguraMm, alturaMm, abaMm }) {
  const c = comprimentoMm;
  const l = larguraMm;
  const a = alturaMm;
  const t = abaMm ?? 0;
  if (!(c > 0) || !(l > 0) || !(a > 0) || !(t >= 0) || t > a) return null;

  const segmentos = [];
  const linha = (x1, y1, x2, y2, tipo) => segmentos.push({ x1, y1, x2, y2, tipo });
  const dobraOuCorte = t > 0 ? 'dobra' : 'corte';

  // Parede topo.
  linha(a, a, a + c, a, 'dobra');
  linha(a, 0, a + c, 0, 'corte');
  linha(a, 0, a, a, dobraOuCorte);
  linha(a + c, 0, a + c, a, dobraOuCorte);

  // Parede baixo.
  linha(a, a + l, a + c, a + l, 'dobra');
  linha(a, a + l + a, a + c, a + l + a, 'corte');
  linha(a, a + l, a, a + l + a, dobraOuCorte);
  linha(a + c, a + l, a + c, a + l + a, dobraOuCorte);

  // Parede esquerda.
  linha(a, a, a, a + l, 'dobra');
  linha(0, a, 0, a + l, 'corte');
  linha(0, a, a, a, 'corte');
  linha(0, a + l, a, a + l, 'corte');

  // Parede direita.
  linha(a + c, a, a + c, a + l, 'dobra');
  linha(a + c + a, a, a + c + a, a + l, 'corte');
  linha(a + c, a, a + c + a, a, 'corte');
  linha(a + c, a + l, a + c + a, a + l, 'corte');

  if (t > 0) {
    // Aba topo-esquerda.
    linha(a - t, 0, a - t, a, 'corte');
    linha(a - t, 0, a, 0, 'corte');
    linha(a - t, a, a, a, 'corte');
    // Aba topo-direita.
    linha(a + c + t, 0, a + c + t, a, 'corte');
    linha(a + c, 0, a + c + t, 0, 'corte');
    linha(a + c, a, a + c + t, a, 'corte');
    // Aba baixo-esquerda.
    linha(a - t, a + l, a - t, a + l + a, 'corte');
    linha(a - t, a + l, a, a + l, 'corte');
    linha(a - t, a + l + a, a, a + l + a, 'corte');
    // Aba baixo-direita.
    linha(a + c + t, a + l, a + c + t, a + l + a, 'corte');
    linha(a + c, a + l, a + c + t, a + l, 'corte');
    linha(a + c, a + l + a, a + c + t, a + l + a, 'corte');
  }

  const xs = segmentos.flatMap((segmento) => [segmento.x1, segmento.x2]);
  const ys = segmentos.flatMap((segmento) => [segmento.y1, segmento.y2]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const retânguloEnvolvente = { x: minX, y: minY, larguraMm: Math.max(...xs) - minX, alturaMm: Math.max(...ys) - minY };

  // Normaliza para que o retângulo envolvente comece em (0,0), independente de a-t ser negativo.
  const segmentosNormalizados = segmentos.map((segmento) => ({
    tipo: segmento.tipo,
    x1: segmento.x1 - minX,
    y1: segmento.y1 - minY,
    x2: segmento.x2 - minX,
    y2: segmento.y2 - minY,
  }));

  return {
    segmentosDeCorte: segmentosNormalizados.filter((segmento) => segmento.tipo === 'corte'),
    segmentosDeDobra: segmentosNormalizados.filter((segmento) => segmento.tipo === 'dobra'),
    retânguloEnvolvente: { larguraMm: retânguloEnvolvente.larguraMm, alturaMm: retânguloEnvolvente.alturaMm },
  };
}
