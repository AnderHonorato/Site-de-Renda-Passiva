// autenticacao-validacao.js — validação de entrada das rotas de autenticação (docs/contratos.md §11).
// Funções puras: nunca tocam banco nem rede.

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MAXIMO_EMAIL = 254;
const TAMANHO_MINIMO_NOME = 1;
const TAMANHO_MAXIMO_NOME = 80;
const TAMANHO_MINIMO_SENHA = 10;
const TAMANHO_MAXIMO_SENHA = 200;

/** E-mail em minúsculas e sem espaço nas pontas — forma canônica gravada no banco. */
export function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function emailValido(email) {
  if (typeof email !== 'string') return false;
  const normalizado = normalizarEmail(email);
  return normalizado.length > 0 && normalizado.length <= TAMANHO_MAXIMO_EMAIL && REGEX_EMAIL.test(normalizado);
}

export function nomeValido(nome) {
  if (typeof nome !== 'string') return false;
  const tamanho = nome.trim().length;
  return tamanho >= TAMANHO_MINIMO_NOME && tamanho <= TAMANHO_MAXIMO_NOME;
}

export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= TAMANHO_MINIMO_SENHA && senha.length <= TAMANHO_MAXIMO_SENHA;
}

/**
 * Validação estrutural de `POST /api/autenticacao/criar-conta`.
 * Devolve `{ ok: true }` ou `{ ok: false, codigo, campos? }` — `codigo` é o erro a devolver
 * (dados_invalidos com campos, ou um código isolado como senha_fraca/termos_nao_aceitos).
 */
export function validarCriarConta({ nome, email, senha, aceitou_termos }) {
  const campos = {};
  if (!nomeValido(nome)) campos.nome = 'formato_invalido';
  if (!emailValido(email)) campos.email = 'email_invalido';
  if (Object.keys(campos).length > 0) return { ok: false, codigo: 'dados_invalidos', campos };

  if (!senhaValida(senha)) return { ok: false, codigo: 'senha_fraca' };
  if (aceitou_termos !== true) return { ok: false, codigo: 'termos_nao_aceitos' };

  return { ok: true };
}

/** Validação estrutural de `POST /api/autenticacao/entrar` — nunca revela se o e-mail existe. */
export function validarEntrar({ email, senha }) {
  const campos = {};
  if (typeof email !== 'string' || email.trim().length === 0) campos.email = 'campo_obrigatorio';
  if (typeof senha !== 'string' || senha.length === 0) campos.senha = 'campo_obrigatorio';
  if (Object.keys(campos).length > 0) return { ok: false, codigo: 'dados_invalidos', campos };
  return { ok: true };
}

export function validarRecuperarSenha({ email }) {
  if (!emailValido(email)) return { ok: false, codigo: 'dados_invalidos', campos: { email: 'email_invalido' } };
  return { ok: true };
}

export function validarRedefinirSenha({ token, senha }) {
  if (typeof token !== 'string' || token.trim().length === 0) return { ok: false, codigo: 'token_invalido' };
  if (!senhaValida(senha)) return { ok: false, codigo: 'senha_fraca' };
  return { ok: true };
}
