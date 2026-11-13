import { ícone } from './ícones.js';

/** Mesmo sinal de acesso nas listas, nas sugestões e nas páginas geradas. */
export function insígniaDePlano(f, compacta = false) {
  if (f.status === 'planejada' || !['plus', 'premium'].includes(f.plano)) return '';
  const nome = f.plano === 'plus' ? 'Plus' : 'Premium';
  return `<span class="insígnia-plano insígnia-plano--${f.plano}">${ícone('cadeado', { tamanho: compacta ? 10 : 12 })}<span>${nome}</span></span>`;
}
