// Sincronizado de compartilhado/scripts/armazenamento/duplicar-registro-local.js — edite a origem e rode "npm run sincronizar" na raiz.
// Duplica um registro local com novo identificador e nome marcado como cópia.
import { criarArmazenamento } from './criar-armazenamento.js';
import { lerRegistroLocal } from './ler-registro-local.js';
import { salvarRegistroLocal } from './salvar-registro-local.js';

export function duplicarRegistroLocal(coleção, id, { armazenamento = criarArmazenamento(), agora = new Date() } = {}) {
  const original = lerRegistroLocal(coleção, id, { armazenamento });
  if (!original) return { salvo: false, erro: 'Item não encontrado.' };
  const { id: _idOriginal, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, ...dados } = original;
  if (typeof dados.nome === 'string') dados.nome = `${dados.nome} (cópia)`.slice(0, 120);
  return salvarRegistroLocal(coleção, dados, { armazenamento, agora });
}
