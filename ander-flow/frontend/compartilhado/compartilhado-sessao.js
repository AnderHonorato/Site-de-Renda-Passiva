// compartilhado-sessao.js — sessão do usuário (lida do DOM) e listas locais (salvos/recentes).

import { chamarApi } from './compartilhado-api.js';

const CHAVE_SALVOS_LOCAIS = 'af-salvos-locais';
const CHAVE_RECENTES = 'af-recentes';
const MAXIMO_SALVOS_LOCAIS = 10;
const MAXIMO_RECENTES = 8;

let promessaUsuario = null;

/** Lê `data-sessao`/`data-plano`/`data-papel` de `<html>`. */
export function usuarioAtual() {
  try {
    const dados = document.documentElement.dataset;
    return {
      sessaoAtiva: dados.sessao === 'ativa',
      plano: dados.plano || 'gratis',
      papel: dados.papel || 'usuario',
    };
  } catch {
    return { sessaoAtiva: false, plano: 'gratis', papel: 'usuario' };
  }
}

/** Busca `/api/autenticacao/sessao` uma única vez por carregamento de página. */
export function obterUsuario() {
  if (!promessaUsuario) {
    promessaUsuario = chamarApi('/api/autenticacao/sessao')
      .then((resposta) => resposta?.usuario ?? null)
      .catch(() => null);
  }
  return promessaUsuario;
}

function lerListaArmazenada(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function gravarListaArmazenada(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    // armazenamento indisponível; a lista fica só em memória
  }
}

/** Move `valor` para o início da lista, sem repetir, cortando em `maximo`. Função pura. */
export function adicionarComLimite(lista, valor, maximo) {
  const semORepetido = (lista ?? []).filter((item) => item !== valor);
  semORepetido.unshift(valor);
  return semORepetido.slice(0, maximo);
}

/** Corta a lista para os `maximo` primeiros itens únicos, preservando a ordem. Função pura. */
export function limitarLista(lista, maximo) {
  const vistos = new Set();
  const resultado = [];
  for (const item of lista ?? []) {
    if (vistos.has(item)) continue;
    vistos.add(item);
    resultado.push(item);
    if (resultado.length >= maximo) break;
  }
  return resultado;
}

export function salvosLocais() {
  return lerListaArmazenada(CHAVE_SALVOS_LOCAIS);
}

export function definirSalvosLocais(slugs) {
  const lista = limitarLista((slugs ?? []).filter(Boolean), MAXIMO_SALVOS_LOCAIS);
  gravarListaArmazenada(CHAVE_SALVOS_LOCAIS, lista);
  return lista;
}

export function recentesLocais() {
  return lerListaArmazenada(CHAVE_RECENTES);
}

export function registrarRecente(slug) {
  if (!slug) return recentesLocais();
  const lista = adicionarComLimite(lerListaArmazenada(CHAVE_RECENTES), slug, MAXIMO_RECENTES);
  gravarListaArmazenada(CHAVE_RECENTES, lista);
  return lista;
}
