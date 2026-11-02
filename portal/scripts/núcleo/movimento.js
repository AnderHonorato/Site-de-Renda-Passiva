/**
 * Movimento no JavaScript: o que o CSS sozinho não faz.
 *
 * O CSS (`estilos/movimento.css`) cuida das entradas. Aqui ficam as curvas, a mola, a
 * contagem até um valor e o observador que avisa quando um bloco chega à tela. Tudo respeita
 * "reduzir movimento": nesse caso o valor final aparece na hora, sem passar pelo caminho.
 */

/** Verdadeiro quando a pessoa pediu menos movimento no sistema. */
export function movimentoReduzido() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------ curvas */
const limitar = (x) => Math.min(1, Math.max(0, x));

/** Curvas de 0 a 1. As mesmas famílias do CSS: saída rápida que assenta, e saída com folga. */
export const curva = Object.freeze({
  linear: (t) => limitar(t),
  saídaCúbica: (t) => 1 - (1 - limitar(t)) ** 3,
  saídaExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * limitar(t))),
  entradaSaída: (t) => { const x = limitar(t); return x < 0.5 ? 4 * x ** 3 : 1 - ((-2 * x + 2) ** 3) / 2; },
});

/**
 * Mola amortecida: sobe passando um pouco do alvo e assenta, como a mola da vitrine.
 * @param {number} t tempo desde o início, em segundos
 * @param {number} [amortecimento] maior = para mais rápido
 * @param {number} [frequência] maior = oscila mais depressa
 * @returns {number} 0 no começo, tende a 1
 */
export function mola(t, amortecimento = 6, frequência = 11) {
  if (t <= 0) return 0;
  return 1 - Math.exp(-amortecimento * t) * Math.cos(frequência * t);
}

/* ---------------------------------------------------------------- contagem */

/**
 * Conta de 0 até o valor escrevendo no elemento. Com movimento reduzido, escreve o valor final.
 * Devolve uma função que cancela a contagem.
 * @param {HTMLElement} elemento
 * @param {number} valor
 * @param {{duração?: number, formatar?: (n: number) => string, aoTerminar?: () => void}} [opções]
 */
export function contarAté(elemento, valor, { duração = 900, formatar = (n) => String(Math.round(n)), aoTerminar } = {}) {
  if (movimentoReduzido() || duração <= 0) {
    elemento.textContent = formatar(valor);
    aoTerminar?.();
    return () => {};
  }
  let cancelado = false;
  let início;
  const passo = (agora) => {
    if (cancelado) return;
    início ??= agora;
    const t = (agora - início) / duração;
    elemento.textContent = formatar(valor * curva.saídaExpo(t));
    if (t < 1) requestAnimationFrame(passo);
    else { elemento.textContent = formatar(valor); aoTerminar?.(); }
  };
  requestAnimationFrame(passo);
  return () => { cancelado = true; };
}

/* ------------------------------------------------------------- observador */

/**
 * Chama `aoEntrar` uma única vez por elemento, quando ele chega perto da área visível.
 * Sem IntersectionObserver (ou sem tela), chama na hora: o conteúdo nunca fica preso.
 * @param {Element[] | NodeListOf<Element>} elementos
 * @param {(elemento: Element) => void} aoEntrar
 * @param {{margem?: string}} [opções]
 */
export function observarEntrada(elementos, aoEntrar, { margem = '0px 0px -8% 0px' } = {}) {
  const lista = [...elementos];
  if (typeof IntersectionObserver !== 'function') { lista.forEach(aoEntrar); return () => {}; }
  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      observador.unobserve(entrada.target);
      aoEntrar(entrada.target);
    }
  }, { rootMargin: margem });
  lista.forEach((e) => observador.observe(e));
  return () => observador.disconnect();
}

/* ---------------------------------------------------------- classes de CSS */

/**
 * Toca uma animação de CSS por classe e limpa a classe no fim, para poder tocar de novo.
 * @param {Element} elemento
 * @param {string} classe por exemplo "pulso" ou "virada"
 */
export function tocar(elemento, classe) {
  if (!elemento || movimentoReduzido()) return;
  elemento.classList.remove(classe);
  void elemento.offsetWidth; // força o navegador a reiniciar a animação
  elemento.classList.add(classe);
  elemento.addEventListener('animationend', () => elemento.classList.remove(classe), { once: true });
}

/** Confirma um toque: o elemento dá um pulinho. */
export const pulsar = (elemento) => tocar(elemento, 'pulso');

/** Faz os filhos de um contêiner entrarem em cascata na primeira vez que aparecem. */
export function entrarEmCascata(contêiner) {
  if (!contêiner || movimentoReduzido()) return;
  contêiner.classList.add('cascata');
  const limpar = () => contêiner.classList.remove('cascata');
  // 540 ms de atraso máximo + 520 ms da entrada, com folga.
  setTimeout(limpar, 1300);
}

/**
 * Marca o resultado da ferramenta: a primeira aparição abre o quadro, as atualizações
 * (ferramentas que recalculam a cada tecla) só erguem o valor.
 * @param {HTMLElement} caixa
 * @param {boolean} primeiraVez
 */
export function marcarResultado(caixa, primeiraVez) {
  if (!caixa || movimentoReduzido()) return;
  caixa.removeAttribute('data-novo');
  caixa.removeAttribute('data-atualizado');
  void caixa.offsetWidth;
  caixa.setAttribute(primeiraVez ? 'data-novo' : 'data-atualizado', 'sim');
}
