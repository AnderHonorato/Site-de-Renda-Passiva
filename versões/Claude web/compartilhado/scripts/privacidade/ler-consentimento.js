// Lê a escolha de privacidade guardada. Retorna null quando não há escolha válida:
// ausente, expirada, de outra versão da política ou armazenamento indisponível.
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';

export function lerConsentimento({ armazenamento = criarArmazenamento(), versão, agora = Date.now() } = {}) {
  const dados = armazenamento.ler('consentimento');
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return null;
  if (typeof dados.publicidade !== 'boolean' || typeof dados.medição !== 'boolean') return null;
  if (versão && dados.versão !== versão) return null;
  if (typeof dados.expiraEm !== 'number' || dados.expiraEm <= agora) return null;
  return {
    publicidade: dados.publicidade,
    medição: dados.medição,
    versão: dados.versão,
    decididoEm: dados.decididoEm,
    expiraEm: dados.expiraEm,
  };
}
