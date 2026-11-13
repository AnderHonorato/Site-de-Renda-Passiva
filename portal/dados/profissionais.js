/** Metadados públicos do lote F252–F351. Os algoritmos vivem apenas no servidor. */
import { especificacoes as financeiro } from './profissionais/financeiro.js';
import { especificacoes as estatistica } from './profissionais/estatistica.js';
import { especificacoes as dados } from './profissionais/dados.js';
import { especificacoes as documentos } from './profissionais/documentos.js';

export const especificacoes = Object.freeze([
  ...financeiro.map(s => ({ ...s, dominio: 'financeiro' })),
  ...estatistica.map(s => ({ ...s, dominio: 'estatistica' })),
  ...dados.map(s => ({ ...s, dominio: 'dados' })),
  ...documentos.map(s => ({ ...s, dominio: 'documentos' })),
].map(s => Object.freeze(s)));
export const especificacaoPorSlug = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(especificacoes.map(s => [s.slug, s]))));

export function planoPermiteProfissional(plano, requerido) {
  return requerido === 'plus' ? plano === 'plus' || plano === 'premium' : plano === 'premium';
}
