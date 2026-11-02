// Sincronizado de compartilhado/scripts/interface/mostrar-erro-de-campo.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/mostrar-erro-de-campo.js
import { criarElemento } from './criar-elemento.js';

function idDoErro(entrada) {
  if (!entrada.id) {
    entrada.id = `campo-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
  }
  return `${entrada.id}-erro`;
}

function adicionarEmDescribedBy(entrada, id) {
  const atual = (entrada.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!atual.includes(id)) {
    atual.push(id);
    entrada.setAttribute('aria-describedby', atual.join(' '));
  }
}

/**
 * Mostra a mensagem de erro de um campo junto a ele, ligada por
 * `aria-describedby` e `#<id>-erro`, e marca `aria-invalid="true"`.
 * @param {HTMLElement} entrada
 * @param {string} mensagem
 */
export function mostrarErroDeCampo(entrada, mensagem) {
  if (!entrada) return;
  const id = idDoErro(entrada);
  entrada.setAttribute('aria-invalid', 'true');
  adicionarEmDescribedBy(entrada, id);

  let elementoDeErro = document.getElementById(id);
  if (elementoDeErro) {
    elementoDeErro.textContent = mensagem;
    elementoDeErro.hidden = false;
  } else {
    elementoDeErro = criarElemento('p', { classe: 'campo-erro', texto: mensagem, atributos: { id }, dados: { erroDinâmico: 'sim' } });
    const ancoragem = entrada.closest('.campo-com-unidade') || entrada;
    ancoragem.insertAdjacentElement('afterend', elementoDeErro);
  }
}
