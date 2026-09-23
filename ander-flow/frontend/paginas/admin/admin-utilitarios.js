// admin-utilitarios.js — funções puras de apoio às seções da administração (paginação e status).
// Sem DOM: testáveis diretamente no Node.

/** Página exibida (1-based) → intervalo `{ inicio, fim }` dentro de `total` itens. Sem itens, ambos 0. */
export function calcularFaixaPaginacao(pagina, porPagina, total) {
  const totalSeguro = Number(total) > 0 ? Number(total) : 0;
  if (!totalSeguro) return { inicio: 0, fim: 0 };
  const paginaSegura = Number(pagina) > 0 ? Number(pagina) : 1;
  const inicio = (paginaSegura - 1) * porPagina + 1;
  const fim = Math.min(paginaSegura * porPagina, totalSeguro);
  return { inicio, fim };
}

/** Quantidade de páginas para `total` itens a `porPagina` por página (mínimo 1). */
export function totalDePaginas(total, porPagina) {
  const totalSeguro = Number(total) > 0 ? Number(total) : 0;
  return Math.max(1, Math.ceil(totalSeguro / porPagina));
}

/** `true` se ainda houver uma próxima página a partir de `pagina` (1-based). */
export function temProximaPagina(pagina, porPagina, total) {
  return pagina < totalDePaginas(total, porPagina);
}

/**
 * Chave de tradução do status de uma ferramenta na tabela do admin, a partir de
 * `{ ativa, estado }` (ativa vem do ajuste do admin; estado vem do manifesto). Não decide cor:
 * quem chama escolhe a classe `.etiqueta--*` a partir do mesmo código.
 */
export function statusFerramentaAdmin({ ativa, estado }) {
  if (!ativa) return 'desativada';
  return estado === 'planejada' ? 'planejada' : 'pronta';
}
