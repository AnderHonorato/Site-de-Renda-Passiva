/**
 * Modelo único de página do portal.
 *
 * Todas as páginas — início, catálogo, salvos, institucionais e as de cada
 * ferramenta — saem daqui. Cabeçalho, barra inferior e rodapé ficam idênticos
 * em todo o site, que é o que faz disto um site só e não uma coleção de páginas.
 *
 * Idioma: cada página é montada com o contexto do seu idioma (textos e categorias). Dois
 * prefixos de caminho andam juntos:
 *   base  = da página até a raiz do IDIOMA (onde estão ferramentas.html, salvos.html...);
 *   raiz  = da página até a raiz do SITE (onde estão estilos/, scripts/, recursos/ e f/).
 * Em português os dois são iguais. Em /en/ a raiz do site fica um nível acima da do idioma.
 */
import { ícone } from '../scripts/núcleo/ícones.js';
import { site } from '../dados/site.js';
import { códigosDeIdioma, idiomas } from '../dados/idiomas.js';
import { contextoPt } from './contexto-de-idioma.mjs';
import { onda } from './ondas.mjs';
import { arteDoRodapé } from './arte-do-rodapé.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Itens da navegação principal, usados no topo e na barra inferior. O nome vem do dicionário. */
const NAVEGAÇÃO = [
  { id: 'início', href: '', ícone: 'início' },
  { id: 'ferramentas', href: 'ferramentas.html', ícone: 'grade' },
  { id: 'salvos', href: 'salvos.html', ícone: 'marcador' },
  { id: 'ajuda', href: 'ajuda.html', ícone: 'ajuda' },
];

/**
 * Seletor de idioma. O idioma atual não é link; o outro leva à página equivalente, ou, se ela
 * ainda não existe naquele idioma (as ferramentas ainda são só em português), aparece desligado
 * com o motivo escrito.
 * @param {object} ctx contexto do idioma da página
 * @param {Record<string, string | null>} alternativas endereço da página equivalente em cada idioma
 * @param {string} classe classe do contêiner
 */
function seletorDeIdioma(ctx, alternativas, classe) {
  const itens = códigosDeIdioma.map((código) => {
    const { curto, nome, hreflang } = idiomas[código];
    const rótulo = código === 'en' ? ctx.t('moldura.idioma.inglês') : ctx.t('moldura.idioma.português');
    if (código === ctx.código) {
      return `<span class="idioma__item" lang="${hreflang}" aria-current="true" title="${escapar(rótulo)}">${curto}</span>`;
    }
    const destino = alternativas[código];
    if (destino === null || destino === undefined) {
      const motivo = ctx.código === 'pt-BR' ? ctx.t('moldura.idioma.indisponível') : ctx.t('moldura.idioma.ferramentaSóEmPortuguês');
      return `<span class="idioma__item idioma__item--desligado" lang="${hreflang}" aria-disabled="true" title="${escapar(motivo)}">${curto}</span>`;
    }
    return `<a class="idioma__item" href="${escapar(destino)}" hreflang="${hreflang}" lang="${hreflang}" title="${escapar(nome)}">${curto}</a>`;
  }).join('');
  return `<div class="${classe}" role="group" aria-label="${escapar(ctx.t('moldura.idioma.rótulo'))}">${itens}</div>`;
}

function cabeçalho(ctx, base, atual, alternativas) {
  const { t } = ctx;
  const links = NAVEGAÇÃO.slice(1).map((item) => {
    const atualAqui = item.id === atual ? ' aria-current="page"' : '';
    return `<a href="${base}${item.href}"${atualAqui}>${escapar(t(`moldura.nav.${item.id}`))}</a>`;
  }).join('');

  const categoriasMenu = ctx.categorias.map((c) => `
        <a href="${base}ferramentas.html?categoria=${encodeURIComponent(c.id)}">${ícone(c.ícone)}<span>${escapar(c.nome)}<small>${escapar(c.resumo)}</small></span></a>`).join('');

  return `<header class="topo">
  <div class="largura topo__interior">
    <a class="marca" href="${base || './'}" aria-label="${escapar(t('moldura.marcaInício'))}">
      <span class="marca__selo">${ícone('marca')}</span>
      <span class="marca__nome"><b>${escapar(site.destaque)}</b><span>${escapar(site.complemento)}</span></span>
    </a>
    <nav class="topo__nav" aria-label="${escapar(t('moldura.navPrincipal'))}">
      <span class="menu-categorias">
        <button type="button" id="abrir-categorias" aria-expanded="false" aria-controls="painel-categorias">
          ${escapar(t('moldura.categorias'))} ${ícone('chevron-baixo', { tamanho: 14 })}
        </button>
        <div class="menu-categorias__painel" id="painel-categorias" hidden>
          <p class="rótulo b-2">${escapar(t('moldura.menuTítulo'))}</p>
          <div class="menu-categorias__grade">${categoriasMenu}
          </div>
          <div class="menu-categorias__rodapé">
            <span class="suave pequeno">${escapar(t('moldura.menuRodapé'))}</span>
            <a href="${base}ferramentas.html">${escapar(t('moldura.menuVerCatálogo'))}</a>
          </div>
        </div>
      </span>
      ${links}
    </nav>
    <span class="topo__espaço"></span>
    <div class="topo__fim">
      ${seletorDeIdioma(ctx, alternativas, 'idioma idioma--topo')}
      <form class="busca-topo" id="busca-topo" role="search" data-aberta="não" autocomplete="off" action="${base}ferramentas.html">
        <button class="ícone-botão busca-topo__botão" type="button" id="ir-para-busca" aria-expanded="false" aria-controls="busca-topo-campo" aria-label="${escapar(t('moldura.buscar'))}">${ícone('busca')}</button>
        <input class="busca-topo__campo" id="busca-topo-campo" name="busca" type="search" tabindex="-1" role="combobox" aria-expanded="false" aria-controls="busca-topo-sugestões" aria-autocomplete="list" aria-label="${escapar(t('moldura.buscar'))}" placeholder="${escapar(t('moldura.buscaTopoMarcador'))}">
        <div class="sugestões busca-topo__sugestões" id="busca-topo-sugestões" role="listbox" hidden></div>
      </form>
      <button class="tema-pílula" type="button" id="alternar-tema" role="switch" aria-checked="false" aria-label="${escapar(t('moldura.temaRótulo'))}">
        <span class="tema-pílula__estrelas" aria-hidden="true"><i></i><i></i><i></i></span>
        <svg class="tema-pílula__astro" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <g class="astro__raios"><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1 7 7M17 17l1.9 1.9M5.1 18.9 7 17M17 7l1.9-1.9"/></g>
          <circle class="astro__núcleo" cx="12" cy="12" r="5.2"/>
          <circle class="astro__corte" cx="17" cy="8" r="4.6"/>
        </svg>
      </button>
    </div>
  </div>
</header>`;
}

function barraInferior(ctx, base, atual) {
  const itens = NAVEGAÇÃO.map((item) => {
    const atualAqui = item.id === atual ? ' aria-current="page"' : '';
    return `<a href="${base}${item.href}"${atualAqui}>${ícone(item.ícone, { tamanho: 20 })}${escapar(ctx.t(`moldura.nav.${item.id}`))}</a>`;
  }).join('');
  return `<nav class="barra-inferior" aria-label="${escapar(ctx.t('moldura.navCelular'))}">${itens}</nav>`;
}

function rodapé(ctx, base, alternativas) {
  const { t } = ctx;
  const porCategoria = ctx.categorias.slice(0, 6).map((c) =>
    `<li><a href="${base}ferramentas.html?categoria=${encodeURIComponent(c.id)}">${escapar(c.nome)}</a></li>`).join('');
  return `${onda(false, 'onda--rodapé')}
<footer class="rodapé">
  ${arteDoRodapé()}
  <div class="largura rodapé__interior">
    <div>
      <a class="marca" href="${base || './'}"><span class="marca__selo">${ícone('marca')}</span><span class="marca__nome"><b>${escapar(site.destaque)}</b><span>${escapar(site.complemento)}</span></span></a>
      <p class="pequeno suave t-1 medida-curta">${escapar(t('moldura.rodapéDescrição'))}</p>
    </div>
    <div><h4>${escapar(t('moldura.rodapéCategorias'))}</h4><ul>${porCategoria}</ul></div>
    <div><h4>${escapar(t('moldura.rodapéPortal'))}</h4><ul>
      <li><a href="${base}ferramentas.html">${escapar(t('moldura.rodapéTodas'))}</a></li>
      <li><a href="${base}salvos.html">${escapar(t('moldura.rodapéSalvos'))}</a></li>
      <li><a href="${base}ajuda.html">${escapar(t('moldura.rodapéComoUsar'))}</a></li>
    </ul></div>
    <div><h4>${escapar(t('moldura.rodapéLegal'))}</h4><ul>
      <li><a href="${base}privacidade.html">${escapar(t('moldura.rodapéPrivacidade'))}</a></li>
      <li><a href="${base}termos.html">${escapar(t('moldura.rodapéTermos'))}</a></li>
    </ul></div>
  </div>
  <div class="largura rodapé__legal">
    <span>${escapar(t('moldura.criadoPor'))}</span>
    ${seletorDeIdioma(ctx, alternativas, 'idioma idioma--rodapé')}
    <span>${escapar(t('moldura.dadosNoAparelho'))}</span>
  </div>
</footer>`;
}

/**
 * Monta uma página completa do portal.
 * @param {{
 *   ctx?: object, título: string, descrição: string, base?: string, raiz?: string, atual?: string,
 *   conteúdo: string, scripts?: string[], estilos?: string[], canônica?: string, semÍndice?: boolean,
 *   alternativas?: Record<string, string | null>
 * }} opções
 *   ctx: contexto do idioma da página (padrão: português). alternativas: endereço da página
 *   equivalente em cada idioma, relativo a esta página; null = ainda não existe naquele idioma.
 * @returns {string} HTML completo
 */
export function montarPágina({
  ctx = contextoPt, título, descrição, base = '', raiz = base, atual = '', conteúdo,
  scripts = [], estilos = [], canônica, semÍndice = false, alternativas = {},
}) {
  // Caminho começando com "./" é relativo à raiz do site (ex.: a vitrine), não a estilos/ ou scripts/.
  const caminho = (pasta, arquivo) => (arquivo.startsWith('./') ? `${raiz || './'}${arquivo.slice(2)}` : `${raiz}${pasta}/${arquivo}`);
  const folhas = ['núcleo.css', 'fontes.css', 'layout.css', 'componentes.css', 'movimento.css', 'páginas.css', ...estilos]
    .map((f) => `  <link rel="stylesheet" href="${caminho('estilos', f)}">`).join('\n');
  const módulos = scripts
    .map((s) => `  <script type="module" src="${caminho('scripts', s)}"></script>`).join('\n');

  // Páginas equivalentes: o idioma da própria página sempre existe (aponta para si mesma).
  const todas = { ...alternativas, [ctx.código]: alternativas[ctx.código] ?? '' };
  const hreflangs = códigosDeIdioma
    .filter((código) => todas[código] !== null && todas[código] !== undefined)
    .map((código) => `  <link rel="alternate" hreflang="${idiomas[código].hreflang}" href="${escapar(todas[código] || './')}">`);
  const padrão = todas['pt-BR'];
  if (padrão !== null && padrão !== undefined && hreflangs.length > 1) {
    hreflangs.push(`  <link rel="alternate" hreflang="x-default" href="${escapar(padrão || './')}">`);
  }
  // Uma página sem equivalente em outro idioma (a 404, a de ferramenta) não declara hreflang nenhum.
  if (hreflangs.length < 2) hreflangs.length = 0;

  return `<!doctype html>
<html lang="${ctx.código}" data-raiz="${escapar(raiz)}" data-raiz-idioma="${escapar(base)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${escapar(título)}</title>
  <meta name="description" content="${escapar(descrição)}">
  <meta name="theme-color" content="#f5f2ed" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)">
${semÍndice ? '  <meta name="robots" content="noindex,follow">\n' : ''}${canônica ? `  <link rel="canonical" href="${escapar(canônica)}">\n` : ''}${hreflangs.length ? `${hreflangs.join('\n')}\n` : ''}  <link rel="icon" href="${raiz}recursos/ícone.svg" type="image/svg+xml">
  <link rel="manifest" href="${raiz}manifesto.webmanifest">
  <link rel="preload" href="${raiz}recursos/fontes/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${folhas}
  <script src="${raiz}scripts/núcleo/tema-inicial.js"></script>
${módulos}
</head>
<body>
  <a class="pular" href="#conteúdo">${escapar(ctx.t('moldura.pular'))}</a>
${cabeçalho(ctx, base, atual, todas)}
  <main id="conteúdo">
${conteúdo}
  </main>
${rodapé(ctx, base, todas)}
${barraInferior(ctx, base, atual)}
  <div class="notificação" id="aviso" role="status" aria-live="polite"></div>
  <script type="module" src="${raiz}scripts/núcleo/cabeçalho.js"></script>
</body>
</html>
`;
}

export { escapar, NAVEGAÇÃO };
