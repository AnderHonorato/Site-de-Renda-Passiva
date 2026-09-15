// Sincronizado de compartilhado/scripts/interface/exibir-mensagem.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/exibir-mensagem.js
import { criarElemento } from './criar-elemento.js';
import { obterRaiz } from './obter-raiz.js';

const NOMES_DE_ÍCONE = {
  sucesso: 'sucesso',
  erro: 'erro',
  aviso: 'alerta',
  informação: 'informação',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// document.createElement() não serve para SVG (cria um HTMLUnknownElement);
// aqui, e só aqui, usamos createElementNS diretamente para o ícone do sprite.
function criarÍcone(nome, classe = 'ícone') {
  const raiz = obterRaiz();
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(SVG_NS, 'use');
  uso.setAttribute('href', `${raiz}recursos/ícones/ícones.svg#${nome}`);
  svg.append(uso);
  return svg;
}

/**
 * Mostra uma mensagem temporária na região `[data-região-de-mensagens]`
 * (topo no celular, canto inferior direito no computador — ver
 * notificações.css). Substitui `alert()`.
 * @param {string} texto
 * @param {object} [opções]
 * @param {'informação'|'sucesso'|'erro'|'aviso'} [opções.tipo]
 * @param {number} [opções.duração] Em milissegundos; 0 mantém até fechar manualmente.
 * @returns {HTMLElement|null} O elemento da mensagem, ou `null` se a região não existir.
 */
export function exibirMensagem(texto, { tipo = 'informação', duração = 5000 } = {}) {
  const região = document.querySelector('[data-região-de-mensagens]');
  if (!região) return null;

  const tipoVálido = tipo in NOMES_DE_ÍCONE ? tipo : 'informação';
  const íconeFechar = criarÍcone('fechar', 'ícone');
  const botãoFechar = criarElemento(
    'button',
    { classe: 'botão botão-ícone botão-fantasma mensagem-fechar', atributos: { type: 'button', 'aria-label': 'Fechar mensagem' } },
    [íconeFechar],
  );

  const mensagem = criarElemento('div', { classe: `mensagem mensagem-${tipoVálido}`, atributos: { role: 'status' } }, [
    criarÍcone(NOMES_DE_ÍCONE[tipoVálido]),
    criarElemento('p', { texto }),
    botãoFechar,
  ]);

  function remover() {
    if (!mensagem.isConnected) return;
    mensagem.setAttribute('data-saindo', '');
    mensagem.addEventListener('animationend', () => mensagem.remove(), { once: true });
    setTimeout(() => mensagem.remove(), 400);
  }

  botãoFechar.addEventListener('click', remover);
  região.append(mensagem);

  if (Number.isFinite(duração) && duração > 0) {
    setTimeout(remover, duração);
  }

  return mensagem;
}
