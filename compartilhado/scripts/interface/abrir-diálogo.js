// compartilhado/scripts/interface/abrir-diálogo.js

/**
 * Abre um <dialog> como modal, guarda o elemento que tinha foco para
 * restaurar depois (Escape, clique no backdrop ou fechar-diálogo.js
 * disparam o mesmo 'close' nativo, então a restauração é feita uma única
 * vez aqui, com {once: true}) e leva o foco para dentro do diálogo.
 * @param {HTMLDialogElement} diálogo
 */
export function abrirDiálogo(diálogo) {
  if (!diálogo || typeof diálogo.showModal !== 'function' || diálogo.open) return;

  const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  diálogo.addEventListener(
    'close',
    () => {
      if (elementoAnterior && document.contains(elementoAnterior) && typeof elementoAnterior.focus === 'function') {
        elementoAnterior.focus();
      }
    },
    { once: true },
  );

  diálogo.showModal();

  const focoInicial = diálogo.querySelector('[autofocus]') || diálogo.querySelector('input, select, textarea, button, a[href]') || diálogo;
  if (focoInicial instanceof HTMLElement) {
    focoInicial.focus();
  }
}
