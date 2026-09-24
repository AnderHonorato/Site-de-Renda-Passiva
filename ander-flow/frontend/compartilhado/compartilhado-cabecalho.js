// compartilhado-cabecalho.js — liga as ações do cabeçalho (tema, idioma, sair, menu da conta,
// destaque do item de navegação atual e o atalho "/" para a busca).

import { alternarTema, temaAtual } from './compartilhado-tema.js';
import { trocarIdioma, t, aoTrocarIdioma, idiomaAtual } from './compartilhado-idioma.js';
import { chamarApi } from './compartilhado-api.js';

const PAGINAS_CONHECIDAS = new Set([
  'inicio', 'ferramentas', 'entrar', 'recuperar-senha', 'conta', 'avisos',
  'trabalho', 'salvos', 'planos', 'privacidade', 'termos', 'cookies',
  'admin', 'vitrine', 'erro',
]);

/**
 * Decide se o item de navegação `dataNav` deve ficar marcado como atual para `dataPagina`.
 * A Início usa `data-pagina="principal"` e marca só o item "inicio". Ferramentas (páginas fora
 * da lista conhecida) marcam o item "ferramentas". Função pura.
 */
export function deveMarcarAtual(dataNav, dataPagina) {
  if (!dataNav || !dataPagina) return false;
  if (dataPagina === 'principal') return dataNav === 'inicio';
  if (dataNav === dataPagina) return true;
  return dataNav === 'ferramentas' && !PAGINAS_CONHECIDAS.has(dataPagina);
}

function atualizarBotaoTema(botao) {
  const escuro = temaAtual() === 'escuro';
  botao.setAttribute('aria-pressed', String(escuro));
  botao.setAttribute('aria-label', t(escuro ? 'compartilhado.tema.usar_claro' : 'compartilhado.tema.usar_escuro'));
}

function ligarBotoesDeTema() {
  const botoes = document.querySelectorAll('[data-acao="alternar-tema"]');
  for (const botao of botoes) {
    atualizarBotaoTema(botao);
    botao.addEventListener('click', async () => {
      await alternarTema();
      atualizarBotaoTema(botao);
    });
  }
}

/** O botão do idioma em que a página está fica pressionado; o HTML chega sempre com pt-BR marcado. */
function marcarIdiomaAtivo() {
  const atual = idiomaAtual();
  for (const botao of document.querySelectorAll('[data-acao="trocar-idioma"]')) {
    botao.setAttribute('aria-pressed', String(botao.dataset.idioma === atual));
  }
}

function ligarBotoesDeIdioma() {
  const botoes = document.querySelectorAll('[data-acao="trocar-idioma"]');
  for (const botao of botoes) {
    const codigo = botao.dataset.idioma;
    if (!codigo) continue;
    botao.addEventListener('click', () => trocarIdioma(codigo));
  }
}

function ligarBotaoSair() {
  const botoes = document.querySelectorAll('[data-acao="sair"]');
  for (const botao of botoes) {
    botao.addEventListener('click', async () => {
      try {
        await chamarApi('/api/autenticacao/sair', { metodo: 'POST' });
      } catch {
        // mesmo se falhar, seguimos para a página inicial
      }
      window.location.href = '/';
    });
  }
}

function ligarMenuDaConta() {
  const botoes = document.querySelectorAll('[data-acao="abrir-menu-conta"]');
  for (const botao of botoes) {
    botao.addEventListener('click', () => {
      const aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
    });
  }
}

function marcarNavegacaoAtual() {
  const paginaAtual = document.documentElement.dataset.pagina || '';
  const itens = document.querySelectorAll('[data-nav]');
  for (const item of itens) {
    if (deveMarcarAtual(item.dataset.nav, paginaAtual)) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  }
}

function ligarAtalhoDeBusca() {
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const alvo = evento.target;
    const editando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
    if (editando) return;
    const campo = document.querySelector('.busca-intencao__entrada');
    if (!campo) return;
    evento.preventDefault();
    campo.focus();
  });
}

export function iniciarCabecalho() {
  if (typeof document === 'undefined') return;
  ligarBotoesDeTema();
  ligarBotoesDeIdioma();
  marcarIdiomaAtivo();
  ligarBotaoSair();
  ligarMenuDaConta();
  marcarNavegacaoAtual();
  ligarAtalhoDeBusca();
  aoTrocarIdioma(() => {
    marcarIdiomaAtivo();
    for (const botao of document.querySelectorAll('[data-acao="alternar-tema"]')) atualizarBotaoTema(botao);
  });
}
