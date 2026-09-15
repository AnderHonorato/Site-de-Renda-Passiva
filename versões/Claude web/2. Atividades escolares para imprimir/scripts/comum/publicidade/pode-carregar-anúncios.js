// Sincronizado de compartilhado/scripts/publicidade/pode-carregar-anúncios.js — edite a origem e rode "npm run sincronizar" na raiz.
// Decide, sem efeitos colaterais, se a página pode carregar anúncios.
// Todas as condições precisam ser verdadeiras; o motivo explica a primeira que falhou.
export function podeCarregarAnúncios({ configuração, consentimento, página = {} }) {
  const publicidade = configuração?.publicidade;
  if (!publicidade || publicidade.ativa !== true) return { pode: false, motivo: 'Publicidade desativada na configuração.' };
  if (!/^ca-pub-\d{16}$/.test(String(publicidade.identificadorDoPublicador ?? ''))) {
    return { pode: false, motivo: 'Identificador do publicador ausente ou inválido.' };
  }
  if (publicidade.consentimentoConfigurado !== true) return { pode: false, motivo: 'Mensagem de consentimento ainda não configurada.' };
  const blocos = Object.values(publicidade.blocos ?? {}).filter((bloco) => /^\d{6,20}$/.test(String(bloco)));
  if (blocos.length === 0) return { pode: false, motivo: 'Nenhum bloco de anúncio configurado.' };
  if (página.permiteAnúncios === false) return { pode: false, motivo: 'Esta página não exibe anúncios.' };
  if (página.impressão === true) return { pode: false, motivo: 'Material impresso não recebe anúncios.' };
  if (!consentimento || consentimento.publicidade !== true) return { pode: false, motivo: 'Sem consentimento para publicidade.' };
  return { pode: true, motivo: 'Configuração completa e consentimento concedido.' };
}
