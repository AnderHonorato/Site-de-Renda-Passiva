// Sincronizado de compartilhado/scripts/interface/configurar-teclado-virtual.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/configurar-teclado-virtual.js

const TIPOS_SEM_TECLADO = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'hidden']);
const LIMIAR_EM_PIXELS = 120;

function campoÉEditável(elemento) {
  if (!(elemento instanceof HTMLElement)) return false;
  if (elemento instanceof HTMLTextAreaElement) return true;
  if (elemento instanceof HTMLInputElement) return !TIPOS_SEM_TECLADO.has(elemento.type);
  return elemento.isContentEditable === true;
}

/**
 * Detecta o teclado virtual aberto (via `window.visualViewport`, quando
 * existir) para recolher a navegação inferior, descer a ação contextual até
 * a borda visível e manter o campo em foco visível. Também marca
 * `html.tem-ação-contextual` — o reforço estático para o seletor `:has()`
 * usado em base.css e consentimento.css quando a página tem uma
 * `.ação-contextual`.
 */
export function configurarTecladoVirtual() {
  const raiz = document.documentElement;

  if (document.querySelector('.ação-contextual')) {
    raiz.classList.add('tem-ação-contextual');
  }

  const viewport = window.visualViewport;
  if (!viewport) return;

  let alturaDeReferência = viewport.height;

  function atualizar() {
    const campoAtivo = campoÉEditável(document.activeElement);
    const diferença = alturaDeReferência - viewport.height;

    if (!campoAtivo || diferença <= LIMIAR_EM_PIXELS) {
      raiz.classList.remove('teclado-aberto');
      alturaDeReferência = viewport.height;
      return;
    }

    raiz.classList.add('teclado-aberto');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  viewport.addEventListener('resize', atualizar);
  viewport.addEventListener('scroll', atualizar);
  document.addEventListener('focusin', () => window.setTimeout(atualizar, 60));
  document.addEventListener('focusout', () => window.setTimeout(atualizar, 60));
}
