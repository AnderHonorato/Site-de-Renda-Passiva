// trabalhos-validacao.js — validação dos campos e limites dos trabalhos salvos (docs/contratos.md §7, §10.3, §11).

const REGEX_SLUG = /^[a-z0-9-]+$/;
export const SITUACOES = ['em_aberto', 'salvo'];
export const TITULO_MAXIMO = 120;
export const DADOS_MAXIMO_BYTES = 20 * 1024; // 20 kB

export function slugValido(valor) {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 100 && REGEX_SLUG.test(valor);
}

export function tituloValido(valor) {
  return typeof valor === 'string' && valor.trim().length >= 1 && valor.trim().length <= TITULO_MAXIMO;
}

export function situacaoValida(valor) {
  return SITUACOES.includes(valor);
}

/** `dados` precisa ser um objeto simples (não array, não nulo) serializável em até 20 kB de JSON. */
export function dadosValidos(valor) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  let texto;
  try {
    texto = JSON.stringify(valor);
  } catch {
    return false;
  }
  return Buffer.byteLength(texto, 'utf8') <= DADOS_MAXIMO_BYTES;
}

/** Limite de trabalhos do plano do usuário, a partir de `configuracao.planos` (docs/contratos.md §10.3). */
export function limiteDeTrabalhos(planosConfig, planoUsuario) {
  const plano = planosConfig?.planos?.find((item) => item.id === planoUsuario);
  return plano?.limites?.trabalhos ?? 0;
}

/** Valida o corpo de `POST /api/trabalhos`; devolve `{ campos }` vazio quando aceito. */
export function validarNovoTrabalho({ ferramenta_slug, titulo, dados, situacao }) {
  const campos = {};
  if (!slugValido(ferramenta_slug)) campos.ferramenta_slug = 'formato_invalido';
  if (!tituloValido(titulo)) campos.titulo = 'formato_invalido';
  if (!dadosValidos(dados)) campos.dados = 'formato_invalido';
  if (situacao !== undefined && !situacaoValida(situacao)) campos.situacao = 'formato_invalido';
  return { campos };
}

/** Valida o corpo de `PATCH /api/trabalhos/:id`; devolve `{ mudancas, campos }`. */
export function validarEdicaoTrabalho({ titulo, dados, situacao }) {
  const mudancas = {};
  const campos = {};

  if (titulo !== undefined) {
    if (!tituloValido(titulo)) campos.titulo = 'formato_invalido';
    else mudancas.titulo = titulo.trim();
  }
  if (dados !== undefined) {
    if (!dadosValidos(dados)) campos.dados = 'formato_invalido';
    else mudancas.dados = JSON.stringify(dados);
  }
  if (situacao !== undefined) {
    if (!situacaoValida(situacao)) campos.situacao = 'formato_invalido';
    else mudancas.situacao = situacao;
  }

  return { mudancas, campos };
}
