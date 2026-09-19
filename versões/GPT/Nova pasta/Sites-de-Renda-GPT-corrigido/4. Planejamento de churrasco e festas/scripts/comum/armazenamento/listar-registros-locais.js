// Sincronizado de compartilhado/scripts/armazenamento/listar-registros-locais.js — edite a origem e rode "npm run sincronizar" na raiz.
// Lista os registros de uma coleção local, do mais recente para o mais antigo.
import { criarArmazenamento } from './criar-armazenamento.js';

export const LIMITE_DE_REGISTROS_POR_COLEÇÃO = 500;

export function listarRegistrosLocais(coleção, { armazenamento = criarArmazenamento() } = {}) {
  const dados = armazenamento.ler(`coleção:${coleção}`);
  if (!Array.isArray(dados)) return [];
  return dados
    .filter((registro) => registro && typeof registro === 'object' && !Array.isArray(registro) && typeof registro.id === 'string')
    .sort((a, b) => String(b.atualizadoEm ?? '').localeCompare(String(a.atualizadoEm ?? '')));
}
