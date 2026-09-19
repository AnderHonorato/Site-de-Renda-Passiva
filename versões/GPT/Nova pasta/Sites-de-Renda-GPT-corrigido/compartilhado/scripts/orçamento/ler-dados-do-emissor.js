// Lê o nome e o contato de quem emite orçamentos, guardados só neste aparelho.
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';

export function lerDadosDoEmissor({ armazenamento = criarArmazenamento() } = {}) {
  const dados = armazenamento.ler('emissor');
  if (!dados || typeof dados !== 'object') return { nome: '', contato: '' };
  return {
    nome: typeof dados.nome === 'string' ? dados.nome.slice(0, 80) : '',
    contato: typeof dados.contato === 'string' ? dados.contato.slice(0, 120) : '',
  };
}
