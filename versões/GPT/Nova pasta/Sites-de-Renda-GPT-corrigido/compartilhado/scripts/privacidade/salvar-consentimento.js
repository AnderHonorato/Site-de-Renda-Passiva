// Guarda a escolha de privacidade com versão da política e prazo de validade,
// e avisa a página pelo evento "consentimento-alterado".
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';

const MILISSEGUNDOS_POR_DIA = 86_400_000;

export function salvarConsentimento(
  { publicidade, medição = false },
  { armazenamento = criarArmazenamento(), versão = '', validadeEmDias = 180, agora = Date.now() } = {},
) {
  const consentimento = {
    publicidade: publicidade === true,
    medição: medição === true,
    versão,
    decididoEm: agora,
    expiraEm: agora + validadeEmDias * MILISSEGUNDOS_POR_DIA,
  };
  const salvo = armazenamento.gravar('consentimento', consentimento);
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('consentimento-alterado', { detail: { consentimento, salvo } }));
  }
  return { salvo, consentimento };
}
