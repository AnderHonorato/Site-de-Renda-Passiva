import { api } from './api.js';

let pedido;
export function obterSessao({ renovar = false } = {}) {
  if (!pedido || renovar) {
    const atual = api('/api/autenticacao/sessao').catch((erro) => {
      // Uma resposta antiga que falhou não deve apagar uma renovação que já está em curso.
      if (pedido === atual) pedido = undefined;
      throw erro;
    });
    pedido = atual;
  }
  return pedido;
}

export function limparSessao() { pedido = undefined; }

/** Verifica cookies e emite atualização somente quando a sessão está realmente ativa. */
export async function confirmarSessaoAposAutenticacao() {
  limparSessao();
  const sessao = await obterSessao({ renovar: true });
  if (!sessao?.usuario) {
    limparSessao();
    throw new Error('sessao_nao_persistida');
  }
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('portal:sessao-alterada', { detail: sessao }));
  }
  return sessao;
}

export function caminhoDoIdioma(arquivo = '') {
  const raiz = document.documentElement.dataset.raizIdioma || './';
  return `${raiz}${arquivo}`;
}

export function voltaSegura(valor) {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return caminhoDoIdioma('conta/');
  try { return new URL(valor, location.origin).origin === location.origin ? valor : caminhoDoIdioma('conta/'); }
  catch { return caminhoDoIdioma('conta/'); }
}
