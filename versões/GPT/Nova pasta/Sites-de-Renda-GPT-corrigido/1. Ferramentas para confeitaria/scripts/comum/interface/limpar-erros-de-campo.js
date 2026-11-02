// Sincronizado de compartilhado/scripts/interface/limpar-erros-de-campo.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/limpar-erros-de-campo.js

/**
 * Desfaz o que mostrar-erro-de-campo.js aplicou num formulário: tira o
 * `aria-invalid` e esconde as mensagens. Mensagens que já existem no HTML
 * (`<p id="<campo>-erro" class="campo-erro" hidden>`) são apenas esvaziadas e
 * escondidas, nunca removidas, porque as páginas as referenciam pelo id.
 * Somente as mensagens criadas dinamicamente (`data-erro-dinâmico`) são removidas.
 * @param {HTMLFormElement} formulário
 */
export function limparErrosDeCampo(formulário) {
  if (!formulário) return;

  for (const campo of formulário.querySelectorAll('[aria-invalid]')) {
    campo.removeAttribute('aria-invalid');
  }

  for (const elementoDeErro of formulário.querySelectorAll('.campo-erro')) {
    if (elementoDeErro.dataset.erroDinâmico !== 'sim') {
      elementoDeErro.textContent = '';
      elementoDeErro.hidden = true;
      continue;
    }
    const id = elementoDeErro.id;
    if (id) {
      for (const dono of formulário.querySelectorAll('[aria-describedby]')) {
        const descritos = dono.getAttribute('aria-describedby').split(/\s+/).filter((valor) => valor && valor !== id);
        if (descritos.length > 0) dono.setAttribute('aria-describedby', descritos.join(' '));
        else dono.removeAttribute('aria-describedby');
      }
    }
    elementoDeErro.remove();
  }
}
