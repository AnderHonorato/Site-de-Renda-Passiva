// Sincronizado de compartilhado/scripts/interface/limpar-erros-de-campo.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/limpar-erros-de-campo.js

/**
 * Remove todas as mensagens de erro e o `aria-invalid` de um formulário,
 * desfazendo o que mostrar-erro-de-campo.js aplicou.
 * @param {HTMLFormElement} formulário
 */
export function limparErrosDeCampo(formulário) {
  if (!formulário) return;

  for (const campo of formulário.querySelectorAll('[aria-invalid]')) {
    campo.removeAttribute('aria-invalid');
    const id = campo.id ? `${campo.id}-erro` : null;
    if (id) {
      const descritos = (campo.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((valor) => valor && valor !== id);
      if (descritos.length > 0) {
        campo.setAttribute('aria-describedby', descritos.join(' '));
      } else {
        campo.removeAttribute('aria-describedby');
      }
    }
  }

  for (const elementoDeErro of formulário.querySelectorAll('.campo-erro')) {
    elementoDeErro.remove();
  }
}
