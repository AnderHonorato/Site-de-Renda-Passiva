// Sincronizado de compartilhado/scripts/privacidade/revogar-consentimento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Revoga os opcionais: registra publicidade e medição como recusadas.
// Dados funcionais salvos pelo usuário (receitas, listas) não são apagados.
import { salvarConsentimento } from './salvar-consentimento.js';

export function revogarConsentimento(opções = {}) {
  return salvarConsentimento({ publicidade: false, medição: false }, opções);
}
