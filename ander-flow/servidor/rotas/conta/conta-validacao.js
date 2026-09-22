// conta-validacao.js — validação dos campos da conta (docs/contratos.md §11, bloco "Conta").

export const IDIOMAS = ['pt-BR', 'en'];
export const TEMAS = ['sistema', 'claro', 'escuro'];
export const TAMANHO_MINIMO_SENHA = 10;
export const TAMANHO_MAXIMO_SENHA = 200;

export function nomeValido(nome) {
  return typeof nome === 'string' && nome.trim().length >= 1 && nome.trim().length <= 80;
}

export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= TAMANHO_MINIMO_SENHA && senha.length <= TAMANHO_MAXIMO_SENHA;
}

/** Devolve `{ mudancas, campos }`: `campos` vazio significa entrada aceita. */
export function validarPreferencias({ nome, idioma, tema }) {
  const mudancas = {};
  const campos = {};

  if (nome !== undefined) {
    if (!nomeValido(nome)) campos.nome = 'formato_invalido';
    else mudancas.nome = nome.trim();
  }
  if (idioma !== undefined) {
    if (!IDIOMAS.includes(idioma)) campos.idioma = 'formato_invalido';
    else mudancas.idioma = idioma;
  }
  if (tema !== undefined) {
    if (!TEMAS.includes(tema)) campos.tema = 'formato_invalido';
    else mudancas.tema = tema;
  }

  return { mudancas, campos };
}

export function mesAtual(agora = new Date()) {
  return agora.toISOString().slice(0, 7);
}
