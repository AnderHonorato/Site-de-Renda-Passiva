// compartilhado-tema.js — tema claro/escuro (a escolha inicial, sem piscar, é feita por
// compartilhado-tema-inicial.js, que roda antes deste módulo).

import { chamarApi } from './compartilhado-api.js';

const VALORES_VALIDOS = new Set(['claro', 'escuro', 'sistema']);

/** Monta a string do cookie `tema` (1 ano, SameSite=Lax, path=/). Função pura. */
export function montarCookieTema(valor, { emProducao = false } = {}) {
  const partes = [`tema=${encodeURIComponent(valor)}`, `Max-Age=${60 * 60 * 24 * 365}`, 'Path=/', 'SameSite=Lax'];
  if (emProducao) partes.push('Secure');
  return partes.join('; ');
}

/** A partir da escolha salva (`claro|escuro|sistema`) e do sistema, calcula `claro|escuro`. Função pura. */
export function temaEfetivo(escolha, sistemaEscuro = false) {
  if (escolha === 'claro' || escolha === 'escuro') return escolha;
  return sistemaEscuro ? 'escuro' : 'claro';
}

export function temaAtual() {
  try {
    return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export async function definirTema(valor) {
  if (typeof document === 'undefined') return;
  const escolha = VALORES_VALIDOS.has(valor) ? valor : 'sistema';
  let sistemaEscuro = false;
  try {
    sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    // matchMedia indisponível; assume claro
  }
  const efetivo = temaEfetivo(escolha, sistemaEscuro);
  document.documentElement.dataset.tema = efetivo;
  try {
    localStorage.setItem('af-tema', escolha);
  } catch {
    // armazenamento indisponível
  }
  try {
    document.cookie = montarCookieTema(escolha, { emProducao: document.location.protocol === 'https:' });
  } catch {
    // armazenamento indisponível
  }
  if (document.documentElement.dataset.sessao === 'ativa') {
    try {
      await chamarApi('/api/conta', { metodo: 'PATCH', corpo: { tema: escolha } });
    } catch {
      // falha ao sincronizar preferência da conta; a troca local já ocorreu
    }
  }
}

export async function alternarTema() {
  await definirTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
}
