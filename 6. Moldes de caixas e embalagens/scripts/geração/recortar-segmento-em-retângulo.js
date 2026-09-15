// Recorta um segmento de reta (x1,y1)-(x2,y2) pela área de um retângulo alinhado aos
// eixos, usando o algoritmo de Liang-Barsky. Devolve o segmento recortado (mesmo formato
// de entrada) ou null quando o segmento fica inteiramente fora do retângulo. Usado para
// dividir um molde grande em folhas A4 sem redesenhar a geometria original. Função pura.
export function recortarSegmentoEmRetângulo(segmento, retângulo) {
  const { x1, y1, x2, y2 } = segmento;
  const { x: rx, y: ry, larguraMm, alturaMm } = retângulo;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMínimo = 0;
  let tMáximo = 1;

  const limites = [
    [-dx, x1 - rx],
    [dx, rx + larguraMm - x1],
    [-dy, y1 - ry],
    [dy, ry + alturaMm - y1],
  ];

  for (const [p, q] of limites) {
    if (p === 0) {
      if (q < 0) return null; // paralelo ao lado e fora dele.
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > tMáximo) return null;
      if (r > tMínimo) tMínimo = r;
    } else {
      if (r < tMínimo) return null;
      if (r < tMáximo) tMáximo = r;
    }
  }
  if (tMínimo > tMáximo) return null;

  return {
    tipo: segmento.tipo,
    x1: x1 + tMínimo * dx,
    y1: y1 + tMínimo * dy,
    x2: x1 + tMáximo * dx,
    y2: y1 + tMáximo * dy,
  };
}
