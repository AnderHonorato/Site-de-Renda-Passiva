// Sincronizado de compartilhado/scripts/armazenamento/exportar-cópia-local.js — edite a origem e rode "npm run sincronizar" na raiz.
// Monta a cópia de segurança versionada de todas as coleções locais do produto.
import { criarArmazenamento } from './criar-armazenamento.js';
import { listarRegistrosLocais } from './listar-registros-locais.js';

export const VERSÃO_DA_CÓPIA_LOCAL = 1;

export function exportarCópiaLocal(coleçõesLocais, { armazenamento = criarArmazenamento(), agora = new Date() } = {}) {
  const coleções = {};
  for (const coleção of coleçõesLocais) {
    coleções[coleção.chave] = listarRegistrosLocais(coleção.chave, { armazenamento });
  }
  return {
    esquema: `${armazenamento.prefixo}.cópia-local`,
    versão: VERSÃO_DA_CÓPIA_LOCAL,
    exportadoEm: agora.toISOString(),
    coleções,
  };
}
