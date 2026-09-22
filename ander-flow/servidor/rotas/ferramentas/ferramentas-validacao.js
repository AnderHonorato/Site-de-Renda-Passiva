// ferramentas-validacao.js — validação de identificadores usados nas rotas de ferramentas.
// Regra única: minúsculas, dígitos e hífen — evita path traversal ao montar caminhos de arquivo.

const REGEX_IDENTIFICADOR = /^[a-z0-9-]+$/;

export function identificadorValido(valor) {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 100 && REGEX_IDENTIFICADOR.test(valor);
}

export function slugValido(slug) {
  return identificadorValido(slug);
}

export function recursoValido(recurso) {
  return identificadorValido(recurso);
}

export function tipoUsoValido(tipo) {
  return tipo === 'uso' || tipo === 'documento';
}
