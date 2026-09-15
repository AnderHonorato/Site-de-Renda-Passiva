// Desenha, dentro de um contêiner na tela, a prévia SVG de um molde na escala indicada:
// linhas de corte contínuas e de dobra tracejadas, com um rótulo de escala. Efeito
// colateral sobre o DOM (usa criarElementoSvg); não é uma função pura, por isso vive em
// scripts/interface/ e não em scripts/geração/.
import { criarElementoSvg } from './criar-elemento-svg.js';

export function desenharPréviaDoMolde(contêiner, { segmentosDeCorte, segmentosDeDobra, retânguloEnvolvente, larguraMáximaPx = 520 }) {
  const { larguraMm, alturaMm } = retânguloEnvolvente;
  const escala = Math.min(larguraMáximaPx / larguraMm, 1.6);
  const larguraPx = Math.round(larguraMm * escala);
  const alturaPx = Math.round(alturaMm * escala);

  const linha = (segmento, classe) => criarElementoSvg('line', { x1: segmento.x1, y1: segmento.y1, x2: segmento.x2, y2: segmento.y2, class: classe });

  const svg = criarElementoSvg(
    'svg',
    {
      class: 'prévia-de-molde-svg',
      viewBox: `0 0 ${larguraMm} ${alturaMm}`,
      width: larguraPx,
      height: alturaPx,
      role: 'img',
      'aria-label': `Prévia do molde, ${Math.round(larguraMm)} por ${Math.round(alturaMm)} milímetros, em escala reduzida para a tela.`,
    },
    [
      criarElementoSvg('rect', { x: 0, y: 0, width: larguraMm, height: alturaMm, class: 'prévia-de-molde-fundo' }),
      ...segmentosDeDobra.map((segmento) => linha(segmento, 'prévia-de-molde-dobra')),
      ...segmentosDeCorte.map((segmento) => linha(segmento, 'prévia-de-molde-corte')),
    ],
  );

  contêiner.replaceChildren(svg);
  return { larguraMm, alturaMm, escala };
}
