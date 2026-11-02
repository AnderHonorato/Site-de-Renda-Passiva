// Sincronizado de compartilhado/scripts/orçamento/compartilhar-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Compartilha o link do orçamento pelo menu nativo do aparelho (celular) ou copia o link.
// Se nada disso for possível, mostra o link selecionado numa janela para cópia manual.
// Retorna 'compartilhado', 'copiado', 'manual' (janela exibida), 'cancelado' ou 'falhou'.
import { copiarTexto } from '../apoio/copiar-texto.js';
import { criarLinkDoOrçamento } from './criar-link-do-orçamento.js';
import { mostrarLinkDoOrçamento } from './mostrar-link-do-orçamento.js';

export async function compartilharOrçamento(orçamento) {
  let link;
  try {
    link = await criarLinkDoOrçamento(orçamento);
  } catch {
    return 'falhou';
  }
  const dados = { title: orçamento.título, text: `Orçamento de ${orçamento.emissor.nome}`, url: link };
  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(dados))) {
    try {
      await navigator.share(dados);
      return 'compartilhado';
    } catch (erro) {
      if (erro?.name === 'AbortError') return 'cancelado';
    }
  }
  if (await copiarTexto(link)) return 'copiado';
  await mostrarLinkDoOrçamento(link);
  return 'manual';
}
