// Endereço completo da página de orçamento compartilhado deste site, com o orçamento no fragmento.
import { obterRaiz } from '../interface/obter-raiz.js';
import { codificarOrçamentoParaLink } from './codificar-orçamento-para-link.js';

export async function criarLinkDoOrçamento(orçamento) {
  const endereço = new URL(`${obterRaiz()}páginas/orçamento-compartilhado.html`, window.location.href);
  endereço.search = '';
  endereço.hash = `o=${await codificarOrçamentoParaLink(orçamento)}`;
  return endereço.href;
}
