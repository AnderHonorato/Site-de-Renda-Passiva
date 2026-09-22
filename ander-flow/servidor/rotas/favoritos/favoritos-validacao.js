// favoritos-validacao.js — validação de identificadores e limites usados nas rotas de favoritos.

const REGEX_SLUG = /^[a-z0-9-]+$/;
const MAXIMO_JUNTAR = 50;

export function slugValido(valor) {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 100 && REGEX_SLUG.test(valor);
}

export function listaDeSlugsValida(valor) {
  return Array.isArray(valor) && valor.length > 0 && valor.length <= MAXIMO_JUNTAR;
}

/** Limite de favoritos do plano do usuário, a partir de `configuracao.planos` (docs/contratos.md §10.3). */
export function limiteDeFavoritos(planosConfig, planoUsuario) {
  const plano = planosConfig?.planos?.find((item) => item.id === planoUsuario);
  return plano?.limites?.favoritos ?? 0;
}
