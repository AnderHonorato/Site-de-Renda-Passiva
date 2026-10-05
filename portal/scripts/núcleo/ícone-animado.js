/**
 * Ícones animados com a versão estática como segunda alternativa.
 *
 * O HTML traz o ícone estático (SVG inline) e, por cima dele, uma imagem animada. A estática
 * é a que aparece enquanto a animada carrega, se a conexão estiver lenta ou se ela não carregar.
 * Quando a animada termina de carregar, ela assume e a estática sai de cena.
 *
 * Este módulo serve aos dois lados: gera o HTML (no Node, em gerar.mjs, e no navegador, nas
 * listas) e liga os eventos de carregamento (só no navegador).
 */
import { ícone } from './ícones.js';

/** Nome do arquivo de um ícone: sem acento. Igual a slugDoÍcone em ferramentas/ícones-animados.mjs. */
export const slugDoÍcone = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * HTML de um ícone com versão animada.
 * @param {string} nome nome do ícone do conjunto (scripts/núcleo/ícones.js)
 * @param {{base?: string, tamanho?: number}} [opções] base = prefixo do caminho até a raiz do site
 */
export function íconeVivo(nome, { base = '', tamanho = 24 } = {}) {
  return `<span class="ícone-vivo" data-estado="carregando">${ícone(nome, { tamanho })}`
    + `<img class="ícone-vivo__animado" src="${base}recursos/ícones-animados/${slugDoÍcone(nome)}.svg"`
    + ` alt="" width="${tamanho}" height="${tamanho}" loading="lazy" decoding="async"></span>`;
}

/**
 * Par de imagens (tema claro e tema escuro) da mesma ilustração. Um SVG usado como imagem só
 * enxerga o tema do sistema, não o escolhido no botão do site; por isso são dois arquivos e o
 * CSS mostra o que combina com o tema atual.
 * @param {string} caminho caminho sem extensão, por exemplo "recursos/ilustrações/erro-404"
 * @param {{classe?: string, largura: number, altura: number, carregar?: 'lazy' | 'eager'}} opções
 */
export function imagemDoTema(caminho, { classe = '', largura, altura, carregar = 'lazy' }) {
  const comum = `alt="" width="${largura}" height="${altura}" loading="${carregar}" decoding="async"`;
  const c = classe ? ` ${classe}` : '';
  return `<img class="só-claro${c}" src="${caminho}.svg" ${comum}>`
    + `<img class="só-escuro${c}" src="${caminho}.escuro.svg" ${comum}>`;
}

/* ------------------------------------------------------------ no navegador */

function marcar(imagem, estado) {
  const caixa = imagem.closest('.ícone-vivo');
  if (caixa && caixa.dataset.estado !== 'pronto') caixa.dataset.estado = estado;
}

const éAnimado = (alvo) => alvo instanceof HTMLImageElement && alvo.classList.contains('ícone-vivo__animado');

/** Confere as imagens que já terminaram de carregar (antes de os eventos serem ligados). */
export function conferirÍconesVivos(raiz = document) {
  for (const imagem of raiz.querySelectorAll('img.ícone-vivo__animado')) {
    if (imagem.complete) marcar(imagem, imagem.naturalWidth > 0 ? 'pronto' : 'falhou');
  }
}

let ligado = false;

/**
 * Liga, uma vez por página, a escuta de carregamento de todo ícone animado, inclusive os criados
 * depois por JavaScript. Eventos de carregamento não borbulham, então a escuta é na captura.
 */
export function ligarÍconesVivos() {
  if (!ligado) {
    ligado = true;
    document.addEventListener('load', (evento) => { if (éAnimado(evento.target)) marcar(evento.target, 'pronto'); }, true);
    document.addEventListener('error', (evento) => { if (éAnimado(evento.target)) marcar(evento.target, 'falhou'); }, true);
  }
  conferirÍconesVivos();
}
