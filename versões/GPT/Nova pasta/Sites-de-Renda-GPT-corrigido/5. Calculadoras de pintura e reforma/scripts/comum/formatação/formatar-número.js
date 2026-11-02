// Sincronizado de compartilhado/scripts/formatação/formatar-número.js — edite a origem e rode "npm run sincronizar" na raiz.
// Formata um número no padrão brasileiro (1.234,5), com casas decimais controladas.
export function formatarNúmero(valor, { casas = 2, casasMínimas = 0 } = {}) {
  if (!Number.isFinite(valor)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.min(casasMínimas, casas),
    maximumFractionDigits: casas,
  }).format(valor === 0 ? 0 : valor);
}
