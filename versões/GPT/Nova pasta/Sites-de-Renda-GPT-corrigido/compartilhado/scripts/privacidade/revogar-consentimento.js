// Revoga os opcionais: registra publicidade e medição como recusadas.
// Dados funcionais salvos pelo usuário (receitas, listas) não são apagados.
import { salvarConsentimento } from './salvar-consentimento.js';

export function revogarConsentimento(opções = {}) {
  return salvarConsentimento({ publicidade: false, medição: false }, opções);
}
