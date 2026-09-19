// compartilhado/scripts/interface/configurar-navegação.js
import { fecharDiálogo } from './fechar-diálogo.js';

/**
 * Liga o comportamento comum de navegação da página:
 * — fecha qualquer `<dialog>` aberto ao clicar num `[data-fechar-diálogo]`
 *   dentro dele (usado no menu Mais e nas Preferências de privacidade);
 * — fecha qualquer `<dialog>` aberto ao clicar no fundo (fora da caixa),
 *   sem depender de cada diálogo cuidar disso por conta própria;
 * — evita recarregar a página ao clicar num link do cabeçalho ou da
 *   navegação inferior que já aponta para a página atual.
 */
export function configurarNavegação() {
  document.addEventListener('click', (evento) => {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;

    const botãoDeFechar = alvo.closest('[data-fechar-diálogo]');
    if (botãoDeFechar) {
      const diálogo = botãoDeFechar.closest('dialog');
      if (diálogo) fecharDiálogo(diálogo, 'cancelar');
      return;
    }

    // Clique no ::backdrop: o navegador entrega o próprio <dialog> como alvo
    // do evento quando o clique cai fora da caixa de conteúdo.
    if (alvo.tagName === 'DIALOG' && alvo instanceof HTMLDialogElement && alvo.open) {
      fecharDiálogo(alvo, 'cancelar');
    }
  });

  document.addEventListener('click', (evento) => {
    const link = evento.target instanceof Element ? evento.target.closest('a[aria-current="page"]') : null;
    if (link && (link.closest('.cabeçalho-navegação') || link.closest('.navegação-inferior'))) {
      evento.preventDefault();
    }
  });
}
