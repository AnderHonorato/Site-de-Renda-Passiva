// Sincronizado de compartilhado/scripts/formatação/formatar-moeda.js — edite a origem e rode "npm run sincronizar" na raiz.
// Formata um valor em reais no padrão brasileiro: R$ 1.234,56.
const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valorEmReais) {
  if (!Number.isFinite(valorEmReais)) return '—';
  return formatador.format(valorEmReais === 0 ? 0 : valorEmReais);
}
