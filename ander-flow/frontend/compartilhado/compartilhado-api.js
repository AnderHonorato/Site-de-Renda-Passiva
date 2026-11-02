// compartilhado-api.js — chamada à API própria, com CSRF automático e erro tipado.

import { t } from './compartilhado-idioma.js';

export class ErroApi extends Error {
  constructor({ status, codigo, extras = {} }) {
    super(codigo);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.extras = extras;
  }
}

const METODOS_QUE_ALTERAM = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Lê o valor de um cookie a partir da string `document.cookie`. Função pura, testável sem DOM. */
export function lerValorCookie(textoCookie, nome) {
  if (!textoCookie) return null;
  const alvo = `${nome}=`;
  for (const parte of textoCookie.split(';')) {
    const item = parte.trim();
    if (item.startsWith(alvo)) return decodeURIComponent(item.slice(alvo.length));
  }
  return null;
}

function obterCookie(nome) {
  try {
    return lerValorCookie(document.cookie, nome);
  } catch {
    return null;
  }
}

/**
 * Chama uma rota própria (`/api/...`). Devolve o corpo já convertido de JSON, ou `null` em 204.
 * Erro HTTP → lança `ErroApi`. Falha de rede → `ErroApi({ status: 0, codigo: 'sem_conexao' })`.
 */
export async function chamarApi(caminho, { metodo = 'GET', corpo } = {}) {
  const metodoNormalizado = String(metodo).toUpperCase();
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (METODOS_QUE_ALTERAM.has(metodoNormalizado)) {
    const tokenCsrf = obterCookie('af_csrf');
    if (tokenCsrf) cabecalhos['X-CSRF-Token'] = tokenCsrf;
  }

  let resposta;
  try {
    resposta = await fetch(caminho, {
      method: metodoNormalizado,
      headers: cabecalhos,
      credentials: 'same-origin',
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi({ status: 0, codigo: 'sem_conexao' });
  }

  if (resposta.status === 204) return null;

  let dados = null;
  const tipoConteudo = resposta.headers.get('content-type') || '';
  if (tipoConteudo.includes('application/json')) {
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    const codigo = dados?.erro ?? 'erro_interno';
    throw new ErroApi({ status: resposta.status, codigo, extras: dados ?? {} });
  }

  return dados;
}

/** Devolve a mensagem traduzida para um `ErroApi` (ou erro com `codigo`/`extras` equivalentes). */
export function mensagemDeErro(erro) {
  const codigo = erro?.codigo ?? 'erro_interno';
  const extras = erro?.extras ?? {};
  return t(`compartilhado.erros.${codigo}`, extras);
}
