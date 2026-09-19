// Sincronizado de compartilhado/scripts/armazenamento/excluir-registro-local.js — edite a origem e rode "npm run sincronizar" na raiz.
// Exclui um registro local. Retorna true se ele existia e foi removido.
import { criarArmazenamento } from './criar-armazenamento.js';
import { listarRegistrosLocais } from './listar-registros-locais.js';

export function excluirRegistroLocal(coleção, id, { armazenamento = criarArmazenamento() } = {}) {
  const registros = listarRegistrosLocais(coleção, { armazenamento });
  const restantes = registros.filter((registro) => registro.id !== id);
  if (restantes.length === registros.length) return false;
  return armazenamento.gravar(`coleção:${coleção}`, restantes);
}
