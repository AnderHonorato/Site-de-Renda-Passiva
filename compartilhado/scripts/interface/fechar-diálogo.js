// compartilhado/scripts/interface/fechar-diálogo.js

/**
 * Fecha um <dialog> aberto. A restauração do foco para quem abriu o diálogo
 * é feita pelo listener de 'close' registrado em abrir-diálogo.js, então
 * funciona igual seja fechado por aqui, por Escape ou pelo clique no backdrop.
 * @param {HTMLDialogElement} diálogo
 * @param {string} [valor] Vira `diálogo.returnValue` quando informado.
 */
export function fecharDiálogo(diálogo, valor) {
  if (!diálogo || !diálogo.open) return;
  if (valor === undefined) {
    diálogo.close();
  } else {
    diálogo.close(valor);
  }
}
