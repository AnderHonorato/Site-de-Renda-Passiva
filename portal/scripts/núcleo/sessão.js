import { api } from './api.js';

let pedido;
export function obterSessao({ renovar = false } = {}) {
  if (!pedido || renovar) pedido = api('/api/autenticacao/sessao').catch((erro) => {
    pedido = undefined;
    throw erro;
  });
  return pedido;
}

export function limparSessao() { pedido = undefined; }

export function caminhoDoIdioma(arquivo = '') {
  const raiz = document.documentElement.dataset.raizIdioma || './';
  return `${raiz}${arquivo}`;
}

export function voltaSegura(valor) {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return caminhoDoIdioma('conta/');
  try { return new URL(valor, location.origin).origin === location.origin ? valor : caminhoDoIdioma('conta/'); }
  catch { return caminhoDoIdioma('conta/'); }
}
