// portal/vitrine/vitrine-pagina.js
// Página de prévia e renderização da vitrine (vitrine.html).
// Parâmetros:
//   ?formato=retrato      prévia 9:16 (padrão: paisagem 16:9)
//   ?idioma=en            textos em inglês
//   ?t=12.8               congela no instante indicado
//   ?render=1920x1080     modo de renderização quadro a quadro (usado pelo script de vídeo)

import { carregarFontes, montarVitrine } from './vitrine.js';

const parâmetros = new URLSearchParams(location.search);
const corpo = document.body;
const elemento = document.querySelector('[data-vitrine]');

corpo.dataset.formato = parâmetros.get('formato') === 'retrato' ? 'retrato' : 'paisagem';
const render = parâmetros.get('render');
if (render) corpo.dataset.render = render;

const vitrine = montarVitrine(elemento, { idioma: parâmetros.get('idioma') || undefined });

if (render) {
  const [l, a] = render.split('x').map(Number);
  vitrine.fixarTamanho(l, a);
  window.vitrineRender = {
    pronto: carregarFontes().then(() => document.fonts.ready),
    quadro: (t) => vitrine.quadroExato(t),
  };
} else if (parâmetros.has('t')) {
  vitrine.pausar();
  carregarFontes().then(() => vitrine.irPara(Number(parâmetros.get('t')) || 0));
}
