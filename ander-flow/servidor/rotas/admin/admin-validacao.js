// admin-validacao.js — validação dos campos das rotas de administração (docs/contratos.md §11, bloco "Admin").
// Funções puras: nunca tocam banco nem rede.

export const TIPOS_AVISO = ['sistema', 'popup'];
export const PUBLICOS_AVISO = ['todos', 'gratis', 'plus', 'anonimos'];
export const PLANOS = ['gratis', 'plus'];
export const PAPEIS = ['usuario', 'admin'];
export const SITUACOES = ['ativo', 'suspenso'];

const ITENS_POR_PAGINA = 20;
const TAMANHO_MAXIMO_BUSCA = 200;
const TAMANHO_MAXIMO_TITULO = 200;
const TAMANHO_MAXIMO_CORPO = 4000;
const TAMANHO_MAXIMO_ROTULO = 80;
const TAMANHO_MAXIMO_LINK = 2000;
const TAMANHO_MAXIMO_MENSAGEM = 2000;
const TAMANHO_MAXIMO_GRUPO = 100;
const TAMANHO_MAXIMO_CHAVE_BLOQUEIO = 300;

export const ITENS_POR_PAGINA_USUARIOS = ITENS_POR_PAGINA;

/** Escapa `%` e `_` para uso seguro num `LIKE ... ESCAPE '\'` (nunca vira curinga do usuário). */
export function escaparCoringasLike(texto) {
  return texto.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

/** Página válida (inteiro ≥ 1); qualquer entrada inválida cai para 1. */
export function paginaValida(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

export function buscaValida(valor) {
  return typeof valor === 'string' && valor.length <= TAMANHO_MAXIMO_BUSCA;
}

export function idValido(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function textoNaoVazio(valor, tamanhoMaximo) {
  return typeof valor === 'string' && valor.trim().length >= 1 && valor.length <= tamanhoMaximo;
}

export function dataIsoValida(valor) {
  return typeof valor === 'string' && valor.trim().length > 0 && !Number.isNaN(Date.parse(valor));
}

/** `https://…` ou caminho relativo `/…` sem começar por `//` (evita URL absoluta disfarçada). */
export function linkUrlValido(valor) {
  if (valor === null || valor === undefined) return true;
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > TAMANHO_MAXIMO_LINK) return false;
  if (valor.startsWith('https://')) return true;
  return valor.startsWith('/') && !valor.startsWith('//');
}

/** `PATCH /api/admin/ferramentas/:slug` — devolve `{ mudancas, campos }`; `campos` vazio = aceito. */
export function validarAjusteFerramenta({ ativa, plano, destaque }) {
  const mudancas = {};
  const campos = {};

  if (ativa !== undefined) {
    if (typeof ativa !== 'boolean') campos.ativa = 'formato_invalido';
    else mudancas.ativa = ativa ? 1 : 0;
  }
  if (plano !== undefined) {
    if (plano !== null && !PLANOS.includes(plano)) campos.plano = 'formato_invalido';
    else mudancas.plano = plano;
  }
  if (destaque !== undefined) {
    if (typeof destaque !== 'boolean') campos.destaque = 'formato_invalido';
    else mudancas.destaque = destaque ? 1 : 0;
  }

  return { mudancas, campos };
}

/** `PATCH /api/admin/usuarios/:id` — devolve `{ mudancas, campos }`. */
export function validarAtualizacaoUsuario({ plano, papel, situacao }) {
  const mudancas = {};
  const campos = {};

  if (plano !== undefined) {
    if (!PLANOS.includes(plano)) campos.plano = 'formato_invalido';
    else mudancas.plano = plano;
  }
  if (papel !== undefined) {
    if (!PAPEIS.includes(papel)) campos.papel = 'formato_invalido';
    else mudancas.papel = papel;
  }
  if (situacao !== undefined) {
    if (!SITUACOES.includes(situacao)) campos.situacao = 'formato_invalido';
    else mudancas.situacao = situacao;
  }

  return { mudancas, campos };
}

/**
 * Aviso — `POST` (`parcial = false`, todos os campos de texto são obrigatórios) e
 * `PATCH` (`parcial = true`, só valida o que foi enviado) de `/api/admin/avisos`.
 * Devolve `{ mudancas, campos }` com as colunas já no formato da tabela `avisos`.
 */
export function validarAviso(dados, { parcial = false } = {}) {
  const corpo = dados ?? {};
  const campos = {};
  const mudancas = {};
  const informado = (chave) => Object.prototype.hasOwnProperty.call(corpo, chave);

  function validarTexto(chave, tamanhoMaximo, { obrigatorio = true } = {}) {
    if (!informado(chave)) {
      if (obrigatorio && !parcial) campos[chave] = 'campo_obrigatorio';
      return;
    }
    const valor = corpo[chave];
    if (!textoNaoVazio(valor, tamanhoMaximo)) campos[chave] = 'formato_invalido';
    else mudancas[chave] = valor.trim();
  }

  if (!informado('tipo')) {
    if (!parcial) campos.tipo = 'campo_obrigatorio';
  } else if (!TIPOS_AVISO.includes(corpo.tipo)) {
    campos.tipo = 'formato_invalido';
  } else {
    mudancas.tipo = corpo.tipo;
  }

  if (!informado('publico')) {
    if (!parcial) campos.publico = 'campo_obrigatorio';
  } else if (!PUBLICOS_AVISO.includes(corpo.publico)) {
    campos.publico = 'formato_invalido';
  } else {
    mudancas.publico = corpo.publico;
  }

  validarTexto('titulo_pt_br', TAMANHO_MAXIMO_TITULO);
  validarTexto('titulo_en', TAMANHO_MAXIMO_TITULO);
  validarTexto('corpo_pt_br', TAMANHO_MAXIMO_CORPO);
  validarTexto('corpo_en', TAMANHO_MAXIMO_CORPO);
  validarTexto('link_rotulo_pt_br', TAMANHO_MAXIMO_ROTULO, { obrigatorio: false });
  validarTexto('link_rotulo_en', TAMANHO_MAXIMO_ROTULO, { obrigatorio: false });

  if (informado('link_url')) {
    if (!linkUrlValido(corpo.link_url)) campos.link_url = 'formato_invalido';
    else mudancas.link_url = corpo.link_url ?? null;
  }

  if (informado('inicio_em')) {
    if (!dataIsoValida(corpo.inicio_em)) campos.inicio_em = 'formato_invalido';
    else mudancas.inicio_em = new Date(corpo.inicio_em).toISOString();
  }
  if (informado('fim_em')) {
    if (corpo.fim_em !== null && !dataIsoValida(corpo.fim_em)) campos.fim_em = 'formato_invalido';
    else mudancas.fim_em = corpo.fim_em === null ? null : new Date(corpo.fim_em).toISOString();
  }
  if (informado('ativo')) {
    if (typeof corpo.ativo !== 'boolean') campos.ativo = 'formato_invalido';
    else mudancas.ativo = corpo.ativo ? 1 : 0;
  }

  return { mudancas, campos };
}

export function corpoMensagemValido(corpo) {
  return textoNaoVazio(corpo, TAMANHO_MAXIMO_MENSAGEM);
}

export function grupoEChaveValidos({ grupo, chave }) {
  return (
    typeof grupo === 'string' &&
    grupo.length > 0 &&
    grupo.length <= TAMANHO_MAXIMO_GRUPO &&
    typeof chave === 'string' &&
    chave.length > 0 &&
    chave.length <= TAMANHO_MAXIMO_CHAVE_BLOQUEIO
  );
}
