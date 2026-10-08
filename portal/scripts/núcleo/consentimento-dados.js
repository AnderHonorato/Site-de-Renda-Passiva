/** As preferências de privacidade não dependem do carregamento de publicidade. */
export const CHAVE_CONSENTIMENTO = 'consentimento-portal-v1';
export const VERSAO_CONSENTIMENTO = '1';
export function consentimentoVigente(consentimento, agora = Date.now()) {
  return !!consentimento && consentimento.versao === VERSAO_CONSENTIMENTO &&
    Number.isFinite(consentimento.expiraEm) && consentimento.expiraEm > agora &&
    ['aceitar', 'essencial'].includes(consentimento.escolha);
}
