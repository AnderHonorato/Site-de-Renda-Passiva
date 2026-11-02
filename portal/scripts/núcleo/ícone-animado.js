/**
 * Ícones e ilustrações animados com a versão estática como segunda alternativa.
 *
 * O HTML traz o ícone estático (SVG inline) e, por cima dele, uma imagem animada SEM endereço.
 * Quem coloca o endereço, e quando, é `animação-viva.js`: só nas imagens que estão na tela e
 * cabem no orçamento de animações do aparelho, e só na variante do tema atual. A estática é a que
 * aparece enquanto a animada carrega, se a conexão estiver lenta, se ela falhar, se estiver fora
 * da tela ou se a pessoa pediu menos movimento. Quando a animada termina de carregar, ela assume.
 *
 * Este módulo serve aos dois lados: gera o HTML (no Node, em gerar.mjs, e no navegador, nas
 * listas) e liga o controle (só no navegador).
 */
import { ícone } from './ícones.js';
import { registrarAnimações, ligarAnimaçãoViva } from './animação-viva.js';

/** Nome do arquivo de um ícone: sem acento. Igual a slugDoÍcone em ferramentas/ícones-animados.mjs. */
export const slugDoÍcone = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * HTML de um ícone com versão animada.
 * @param {string} nome nome do ícone do conjunto (scripts/núcleo/ícones.js)
 * @param {{base?: string, tamanho?: number}} [opções] base = prefixo do caminho até a raiz do site
 */
export function íconeVivo(nome, { base = '', tamanho = 24 } = {}) {
  return `<span class="ícone-vivo" data-estado="carregando">${ícone(nome, { tamanho })}`
    + `<img class="ícone-vivo__animado" data-viva="ícone" data-fonte="${base}recursos/ícones-animados/${slugDoÍcone(nome)}.svg"`
    + ` alt="" width="${tamanho}" height="${tamanho}" decoding="async"></span>`;
}

/**
 * Ilustração animada com par de arquivos (tema claro e escuro), numa só imagem. O HTML não traz o
 * endereço: o controle escolhe a variante do tema atual e só baixa essa (a outra, só se o tema mudar).
 * Um SVG usado como imagem só enxerga o tema do sistema, não o do botão do site; por isso são dois arquivos.
 * @param {string} caminho caminho sem extensão, por exemplo "recursos/ilustrações/categorias/dinheiro"
 * @param {{classe?: string, largura: number, altura: number, tipo?: 'arte' | 'topo'}} opções
 *   `tipo: 'topo'` marca a ilustração do cabeçalho da ferramenta: tem prioridade e nunca é revezada.
 */
export function arteViva(caminho, { classe = '', largura, altura, tipo = 'arte' }) {
  const c = classe ? ` class="${classe}"` : '';
  return `<img${c} data-viva="${tipo}" data-fonte-claro="${caminho}.svg" data-fonte-escuro="${caminho}.escuro.svg"`
    + ` alt="" width="${largura}" height="${altura}" decoding="async">`;
}

/**
 * Par de imagens (tema claro e tema escuro) da mesma ilustração, para as que aparecem sozinhas
 * (erro, estado vazio): são poucas, e o CSS mostra a que combina com o tema atual.
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

/** Passa a cuidar das imagens animadas já desenhadas dentro de `raiz` (chamar depois de desenhar uma lista). */
export const conferirÍconesVivos = (raiz = document) => registrarAnimações(raiz);

/** Liga, uma vez por página, o controle das animações (veja animação-viva.js). */
export const ligarÍconesVivos = ligarAnimaçãoViva;
