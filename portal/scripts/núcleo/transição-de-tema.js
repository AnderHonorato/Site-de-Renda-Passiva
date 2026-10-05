/**
 * Troca de tema com um rolo de pintura.
 *
 * Um rolo (desenhado em CSS e SVG) desce pela tela inteira pintando a cor do tema novo. No
 * meio da tela ele quase para, como quem aperta o rolo na parede, e volta a andar; quando a
 * tinta cobre tudo, o tema é trocado por baixo e a camada de tinta some. Clareando, o rolo
 * leva tinta marfim; escurecendo, tinta grafite.
 *
 * É a metáfora do site (ferramentas) no lugar do céu da versão anterior, e é leve: uma camada
 * de cor, um rolo e seis gotas, tudo animado só com transform e clip-path.
 *
 * A pílula do botão muda na hora (ela é a primeira a responder ao clique); o rolo entra um
 * instante depois, para o sol virar lua à vista de quem clicou.
 *
 * Com "reduzir movimento" (ou sem animações) a troca é imediata e nenhuma camada é criada.
 * A camada é só decoração: aria-hidden, sem foco, e some sozinha.
 */
import { movimentoReduzido } from './movimento.js';

const DURAÇÃO = 1600; // ms do rolo de ponta a ponta
const SAÍDA_DA_TINTA = 260; // ms para a tinta sumir depois da troca
const ATRASO_DO_ROLO = 380; // ms; tempo do sol virar lua na pílula
const ALTURA_DO_ROLO = 64;

/**
 * Posição do centro do rolo ao longo do tempo, como fração da altura da tela. O trecho do meio
 * (de 34% a 66% do tempo) cobre só 14% da tela: é a "parada" em que o rolo quase pára.
 * [fração do tempo, posição em frações da altura, suavização do trecho que termina aqui]
 */
const TRAJETO = [
  [0, -0.06, 'linear'],
  [0.1, 0.02, 'cubic-bezier(.2,.8,.3,1)'],
  [0.34, 0.43, 'cubic-bezier(.3,0,.5,1)'],
  [0.66, 0.57, 'cubic-bezier(.4,0,.6,1)'],
  [0.9, 1.0, 'cubic-bezier(.5,0,.8,.6)'],
  [1, 1.14, 'linear'],
];

/** Em que ponto do tempo a tinta já cobre a tela inteira (o rolo passou da borda de baixo). */
const MOMENTO_DA_TROCA = 0.9;

let rodando = false;

function elemento(tag, classe, pai) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  pai?.append(e);
  return e;
}

/** SVG do cabo: arame que sai da ponta do rolo e dobra para a mão, com o punho de borracha. */
function desenharCabo(pai) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'rolo__cabo');
  svg.setAttribute('viewBox', '0 0 130 120');
  svg.setAttribute('aria-hidden', 'true');
  const formas = [
    ['path', { d: 'M0 32h38c20 0 30 10 30 28v22', class: 'rolo__arame' }],
    ['rect', { x: '55', y: '76', width: '26', height: '42', rx: '9', class: 'rolo__punho' }],
    ['path', { d: 'M58 90h20M58 100h20M58 110h20', class: 'rolo__costelas' }],
    ['circle', { cx: '10', cy: '32', r: '9', class: 'rolo__tampa' }],
  ];
  for (const [tag, atributos] of formas) {
    const forma = document.createElementNS(ns, tag);
    for (const [nome, valor] of Object.entries(atributos)) forma.setAttribute(nome, valor);
    svg.append(forma);
  }
  pai.append(svg);
}

/** Monta a camada: tinta, rolo com cabo e gotas. */
function montarCena(direção) {
  const cena = elemento('div', 'transição-tema');
  cena.dataset.direção = direção;
  cena.setAttribute('aria-hidden', 'true');
  const tinta = elemento('div', 'tt__tinta', cena);
  const rolo = elemento('div', 'rolo', cena);
  const corpo = elemento('div', 'rolo__corpo', rolo);
  desenharCabo(rolo);
  for (let i = 0; i < 6; i += 1) {
    const gota = elemento('i', 'rolo__gota', corpo);
    gota.style.left = `${8 + i * 15 + (i % 2 ? 3 : -2)}%`;
    gota.style.animationDelay = `${i * 140}ms`;
  }
  return { cena, tinta, rolo, corpo };
}

/** Quadros-chave do trajeto em pixels, para a altura de tela de agora. */
function quadros(altura, montar) {
  return TRAJETO.map(([offset, fração, easing]) => ({ offset, easing, ...montar(fração * altura) }));
}

/**
 * Executa a troca de tema com o rolo.
 * @param {() => void} aplicar função que troca o tema de fato (grava e põe o atributo)
 * @param {boolean} paraEscuro verdadeiro se o tema novo é o escuro
 * @returns {Promise<void>} resolve quando tudo terminou (tema trocado e camada removida)
 */
export function trocarTemaComTransição(aplicar, paraEscuro) {
  let trocou = false;
  const trocar = () => { if (!trocou) { trocou = true; aplicar(); } };

  if (rodando) return Promise.resolve();
  if (movimentoReduzido() || typeof document.body?.animate !== 'function') {
    trocar();
    return Promise.resolve();
  }
  rodando = true;

  return new Promise((resolver) => {
    let cena;
    let relógioDaTroca;
    let relógioDeSegurança;

    const terminar = () => {
      clearTimeout(relógioDaTroca);
      clearTimeout(relógioDeSegurança);
      trocar(); // se algo impediu a animação, o tema ainda assim é trocado
      cena?.remove();
      rodando = false;
      resolver();
    };

    setTimeout(() => {
      const peças = montarCena(paraEscuro ? 'escurecer' : 'clarear');
      cena = peças.cena;
      document.body.append(cena);
      const altura = window.innerHeight;

      // O rolo desce pelo trajeto; a tinta é revelada até o meio do rolo; a textura do rolo gira.
      peças.rolo.animate(
        quadros(altura, (y) => ({ transform: `translateY(${Math.round(y - ALTURA_DO_ROLO / 2)}px)` })),
        { duration: DURAÇÃO, fill: 'forwards' },
      );
      peças.tinta.animate(
        quadros(altura, (y) => ({ clipPath: `inset(0 0 ${Math.max(0, Math.round(altura - y))}px 0)` })),
        { duration: DURAÇÃO, fill: 'forwards' },
      );
      peças.corpo.animate(
        [{ backgroundPosition: '0 0, 0 0' }, { backgroundPosition: '0 0, 0 330px' }],
        { duration: DURAÇÃO, easing: 'linear' },
      );

      relógioDaTroca = setTimeout(() => {
        trocar();
        // A tinta já cobre tudo e o tema novo está por baixo: a tinta sai e deixa a página à mostra.
        const saída = peças.tinta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SAÍDA_DA_TINTA, easing: 'ease-out', fill: 'forwards' });
        saída.addEventListener('finish', terminar);
      }, DURAÇÃO * MOMENTO_DA_TROCA);

      // Aba em segundo plano ou animação que não rodou: o relógio garante o fim.
      relógioDeSegurança = setTimeout(terminar, DURAÇÃO + SAÍDA_DA_TINTA + 700);
    }, ATRASO_DO_ROLO);
  });
}
