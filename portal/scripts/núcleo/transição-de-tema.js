/**
 * Troca de tema com a tela inteira coberta por uma animação do tempo passando.
 *
 * Ao escurecer: o céu esquenta (entardecer), o sol desce atrás da colina, a lua e as
 * estrelas nascem, e a tela se abre já no tema escuro. Ao clarear, o contrário.
 * O tema é trocado quando a tela está totalmente coberta, então não há piscada.
 *
 * A pílula do botão muda na hora (ela é a primeira a responder ao clique); a cobertura
 * começa um instante depois, para o sol virar lua à vista de quem clicou.
 *
 * Com "reduzir movimento" (ou sem animações) a troca é imediata e nenhuma camada é criada.
 * A camada é só decoração: aria-hidden, sem foco, e some sozinha.
 */
import { movimentoReduzido } from './movimento.js';

const DURAÇÃO = 1600; // ms; igual a --tt-duração em estilos/movimento.css
const MOMENTO_DA_TROCA = 0.5;
const ATRASO_DA_COBERTURA = 380; // ms; tempo do sol virar lua na pílula

let rodando = false;

function elemento(classe, pai) {
  const e = document.createElement('div');
  e.className = classe;
  pai?.append(e);
  return e;
}

/** Cria a cena. As estrelas são sorteadas a cada vez, para nunca repetir o mesmo céu. */
function montarCena(direção) {
  const cena = elemento('transição-tema');
  cena.dataset.direção = direção;
  cena.setAttribute('aria-hidden', 'true');
  elemento('tt__dia', cena);
  const noite = elemento('tt__noite', cena);
  for (let i = 0; i < 28; i += 1) {
    const estrela = elemento('tt__estrela', noite);
    estrela.style.left = `${Math.round(Math.random() * 100)}%`;
    estrela.style.top = `${Math.round(Math.random() * 62)}%`;
    estrela.style.animationDelay = `${Math.round(Math.random() * 900)}ms`;
    if (i % 5 === 0) estrela.classList.add('tt__estrela--grande');
  }
  elemento('tt__sol', cena);
  const lua = elemento('tt__lua', cena);
  elemento('tt__cratera tt__cratera--a', lua);
  elemento('tt__cratera tt__cratera--b', lua);
  elemento('tt__colina', cena);
  return cena;
}

/**
 * Executa a troca de tema com a animação.
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
      cena = montarCena(paraEscuro ? 'escurecer' : 'clarear');
      document.body.append(cena);
      relógioDaTroca = setTimeout(trocar, DURAÇÃO * MOMENTO_DA_TROCA);
      cena.addEventListener('animationend', (evento) => { if (evento.target === cena) terminar(); });
      // Aba em segundo plano ou CSS que não carregou: o relógio garante o fim.
      relógioDeSegurança = setTimeout(terminar, DURAÇÃO + 500);
    }, ATRASO_DA_COBERTURA);
  });
}
