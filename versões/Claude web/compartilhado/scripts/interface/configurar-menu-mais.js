// compartilhado/scripts/interface/configurar-menu-mais.js
import { abrirDiálogo } from './abrir-diálogo.js';

/**
 * Liga o botão "Mais" da navegação inferior (`[data-abrir-menu-mais]`) ao
 * diálogo `#menu-mais`. O fechamento (Escape, clique no fundo, itens
 * `[data-fechar-diálogo]`) é tratado de forma genérica por
 * configurar-navegação.js.
 */
export function configurarMenuMais() {
  const botão = document.querySelector('[data-abrir-menu-mais]');
  const diálogo = document.getElementById('menu-mais');
  if (!botão || !diálogo) return;

  botão.addEventListener('click', () => {
    abrirDiálogo(diálogo);
  });
}
