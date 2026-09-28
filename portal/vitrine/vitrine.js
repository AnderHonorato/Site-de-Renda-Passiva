// portal/vitrine/vitrine.js
// Monta a vitrine animada em todo elemento com [data-vitrine].
// Marcação esperada:
//   <div class="vitrine" data-vitrine data-idioma="pt-BR">
//     <canvas class="vitrine__tela"></canvas>
//     <button class="vitrine__controle" type="button" data-vitrine-controle></button>
//   </div>

import { criarVitrine } from './vitrine-motor.js';
import { desenharQuadro } from './vitrine-cenas.js';
import { obterTextos } from './vitrine-textos.js';

// Só os arquivos "latin": cobrem todo o português (á, ã, ç, ê, õ, ×).
const FONTES = [
  ['Vitrine Caprasimo', 'caprasimo-latin-400-normal.woff2', '400'],
  ['Vitrine Figtree', 'figtree-latin-400-normal.woff2', '400'],
  ['Vitrine Figtree', 'figtree-latin-600-normal.woff2', '600'],
  ['Vitrine Figtree', 'figtree-latin-700-normal.woff2', '700'],
  ['Vitrine Caveat', 'caveat-latin-700-normal.woff2', '700'],
];

let fontesProntas = null;

export function carregarFontes(limiteMs = 3000) {
  if (fontesProntas) return fontesProntas;
  const carregamentos = FONTES.map(([família, arquivo, peso]) => {
    const url = new URL(`./fontes/${arquivo}`, import.meta.url);
    const face = new FontFace(família, `url("${url.href}") format("woff2")`, { weight: peso, display: 'swap' });
    return face.load().then((f) => document.fonts.add(f));
  });
  const limite = new Promise((resolver) => setTimeout(resolver, limiteMs));
  fontesProntas = Promise.race([Promise.allSettled(carregamentos), limite]);
  return fontesProntas;
}

export function montarVitrine(elemento, { idioma } = {}) {
  const canvas = elemento.querySelector('canvas');
  const botão = elemento.querySelector('[data-vitrine-controle]');
  const tx = obterTextos(idioma || elemento.dataset.idioma || document.documentElement.lang);

  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', tx.descrição);

  const vitrine = criarVitrine(canvas, {
    desenhar: (ctx, t, palco) => desenharQuadro(ctx, t, palco, tx),
    aoMudarEstado: ({ tocando, pausadoPeloUsuário, reduzido }) => {
      if (!botão) return;
      botão.hidden = reduzido;
      const pausado = pausadoPeloUsuário || !tocando;
      botão.dataset.estado = pausadoPeloUsuário ? 'pausado' : 'tocando';
      botão.setAttribute('aria-label', pausadoPeloUsuário ? tx.tocar : tx.pausar);
      botão.setAttribute('aria-pressed', String(pausadoPeloUsuário));
      elemento.classList.toggle('vitrine--pausada', pausado);
    },
  });

  botão?.addEventListener('click', () => vitrine.alternar());
  carregarFontes().then(() => vitrine.repintar());
  elemento.__vitrine = vitrine;
  return vitrine;
}

// Monta só quando a vitrine chega perto da tela: no celular ela fica abaixo da dobra,
// então fontes (~106 KB) e desenho não disputam o carregamento inicial da página.
function montarTodas() {
  const pendentes = [...document.querySelectorAll('[data-vitrine]')].filter((el) => !el.__vitrine && !el.hasAttribute('data-vitrine-manual'));
  if (!pendentes.length) return;
  if (!('IntersectionObserver' in window)) { pendentes.forEach((el) => montarVitrine(el)); return; }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      observador.unobserve(e.target);
      carregarFontes(1500).then(() => montarVitrine(e.target));
    });
  }, { rootMargin: '400px 0px' });
  pendentes.forEach((el) => observador.observe(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarTodas, { once: true });
else montarTodas();
