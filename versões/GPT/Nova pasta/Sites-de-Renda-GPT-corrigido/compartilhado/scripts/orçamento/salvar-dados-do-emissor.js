// Lembra o nome e o contato de quem emite orçamentos, só neste aparelho.
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';

export function salvarDadosDoEmissor({ nome = '', contato = '' }, { armazenamento = criarArmazenamento() } = {}) {
  return armazenamento.gravar('emissor', { nome: String(nome).trim().slice(0, 80), contato: String(contato).trim().slice(0, 120) });
}
