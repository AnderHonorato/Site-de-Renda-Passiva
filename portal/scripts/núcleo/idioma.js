/**
 * Idioma da página, no navegador.
 *
 * O idioma é o do atributo lang do <html> (que o gerador escreve certo em cada página). Só o
 * dicionário daquele idioma é carregado, com import() no topo do módulo (top-level await): a
 * página em português não baixa uma linha de inglês, e a em inglês não baixa o português.
 *
 *   import { t, idioma, base } from './idioma.js';
 *   t('lista.planejada')
 */
import { criarTradutor } from './traduzir.js';
import { normalizarIdioma } from '../../dados/idiomas.js';

/** 'pt-BR' ou 'en'. */
export const idioma = normalizarIdioma(typeof document !== 'undefined' ? document.documentElement.lang : '');

const dicionário = (await (idioma === 'en'
  ? import('../../dados/traduções/js-en.js')
  : import('../../dados/traduções/js-pt.js'))).default;

/** Traduz uma chave do dicionário do navegador. Chave inexistente é erro. */
export const t = criarTradutor(dicionário);

/** Lista de textos (por exemplo as sugestões de busca). */
export const lista = (chave) => {
  let atual = dicionário;
  for (const parte of chave.split('.')) atual = atual?.[parte];
  if (!Array.isArray(atual)) throw new Error(`"${chave}" não é uma lista`);
  return atual;
};

export const éInglês = idioma === 'en';

/**
 * Prefixo dos caminhos da página até a raiz do SITE (onde ficam recursos/, scripts/ e f/).
 * Em páginas de /en/ é um nível acima do da pasta da página. O gerador escreve o valor em
 * <html data-raiz="..."> de cada página.
 */
export const raizDoSite = typeof document !== 'undefined' ? (document.documentElement.dataset.raiz ?? '') : '';

/** Prefixo até a raiz do IDIOMA (onde ficam ferramentas.html, salvos.html...). Em /en/ é '' também. */
export const raizDoIdioma = typeof document !== 'undefined' ? (document.documentElement.dataset.raizIdioma ?? '') : '';
