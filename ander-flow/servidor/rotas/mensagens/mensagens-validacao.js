// mensagens-validacao.js — validação do corpo das mensagens com o admin (docs/contratos.md §7, §11).

export const CORPO_MAXIMO = 2000;

export function corpoValido(valor) {
  return typeof valor === 'string' && valor.length >= 1 && valor.length <= CORPO_MAXIMO && valor.trim().length > 0;
}
