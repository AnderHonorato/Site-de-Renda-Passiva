// Lê um registro local pelo identificador. Retorna o registro ou null.
import { criarArmazenamento } from './criar-armazenamento.js';
import { listarRegistrosLocais } from './listar-registros-locais.js';

export function lerRegistroLocal(coleção, id, { armazenamento = criarArmazenamento() } = {}) {
  if (typeof id !== 'string' || !id) return null;
  return listarRegistrosLocais(coleção, { armazenamento }).find((registro) => registro.id === id) ?? null;
}
