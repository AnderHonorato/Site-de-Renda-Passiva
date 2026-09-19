/**
 * Modelo único de página do portal.
 *
 * Todas as páginas — início, catálogo, salvos, institucionais e as de cada
 * ferramenta — saem daqui. Cabeçalho, barra inferior e rodapé ficam idênticos
 * em todo o site, que é o que faz disto um site só e não uma coleção de páginas.
 */
import { ícone } from '../scripts/núcleo/ícones.js';
import { categorias } from '../dados/categorias.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Itens da navegação principal, usados no topo e na barra inferior. */
const NAVEGAÇÃO = [
  { id: 'início', nome: 'Início', href: '', ícone: 'início' },
  { id: 'ferramentas', nome: 'Ferramentas', href: 'ferramentas.html', ícone: 'grade' },
  { id: 'salvos', nome: 'Salvos', href: 'salvos.html', ícone: 'marcador' },
  { id: 'ajuda', nome: 'Ajuda', href: 'ajuda.html', ícone: 'ajuda' },
];

function cabeçalho(base, atual) {
  const links = NAVEGAÇÃO.slice(1).map((item) => {
    const atualAqui = item.id === atual ? ' aria-current="page"' : '';
    return `<a href="${base}${item.href}"${atualAqui}>${escapar(item.nome)}</a>`;
  }).join('');

  const categoriasMenu = categorias.map((c) => `
        <a href="${base}ferramentas.html?categoria=${encodeURIComponent(c.id)}">${ícone(c.ícone)}<span>${escapar(c.nome)}<small>${escapar(c.resumo)}</small></span></a>`).join('');

  return `<header class="topo">
  <div class="largura topo__interior">
    <a class="marca" href="${base || './'}" aria-label="Ferramentas do Ander, início">
      <span class="marca__selo">${ícone('marca')}</span>
      <span class="marca__nome"><b>Ferramentas</b><span>do Ander</span></span>
    </a>
    <nav class="topo__nav" aria-label="Navegação principal">
      <span class="menu-categorias">
        <button type="button" id="abrir-categorias" aria-expanded="false" aria-controls="painel-categorias">
          Categorias ${ícone('chevron-baixo', { tamanho: 14 })}
        </button>
        <div class="menu-categorias__painel" id="painel-categorias" hidden>
          <p class="rótulo b-2">Encontre pelo que precisa fazer</p>
          <div class="menu-categorias__grade">${categoriasMenu}
          </div>
          <div class="menu-categorias__rodapé">
            <span class="suave pequeno">Processamento no seu navegador</span>
            <a href="${base}ferramentas.html">Ver o catálogo completo</a>
          </div>
        </div>
      </span>
      ${links}
    </nav>
    <span class="topo__espaço"></span>
    <div class="topo__fim">
      <button class="ícone-botão" type="button" id="ir-para-busca" aria-label="Buscar ferramenta">${ícone('busca')}</button>
      <button class="ícone-botão" type="button" id="alternar-tema" aria-label="Alternar tema claro e escuro">${ícone('lua')}</button>
    </div>
  </div>
</header>`;
}

function barraInferior(base, atual) {
  const itens = NAVEGAÇÃO.map((item) => {
    const atualAqui = item.id === atual ? ' aria-current="page"' : '';
    return `<a href="${base}${item.href}"${atualAqui}>${ícone(item.ícone, { tamanho: 20 })}${escapar(item.nome)}</a>`;
  }).join('');
  return `<nav class="barra-inferior" aria-label="Navegação no celular">${itens}</nav>`;
}

function rodapé(base) {
  const porCategoria = categorias.slice(0, 6).map((c) =>
    `<li><a href="${base}ferramentas.html?categoria=${encodeURIComponent(c.id)}">${escapar(c.nome)}</a></li>`).join('');
  return `<footer class="rodapé">
  <div class="largura rodapé__interior">
    <div>
      <a class="marca" href="${base || './'}"><span class="marca__selo">${ícone('marca')}</span><span class="marca__nome"><b>Ferramentas</b><span>do Ander</span></span></a>
      <p class="pequeno suave t-1 medida-curta">Ferramentas para calcular, criar e organizar. Rodam no seu navegador, sem cadastro.</p>
    </div>
    <div><h4>Categorias</h4><ul>${porCategoria}</ul></div>
    <div><h4>Portal</h4><ul>
      <li><a href="${base}ferramentas.html">Todas as ferramentas</a></li>
      <li><a href="${base}salvos.html">Meus salvos</a></li>
      <li><a href="${base}ajuda.html">Como usar</a></li>
    </ul></div>
    <div><h4>Legal</h4><ul>
      <li><a href="${base}privacidade.html">Privacidade</a></li>
      <li><a href="${base}termos.html">Termos de uso</a></li>
    </ul></div>
  </div>
  <div class="largura rodapé__legal">
    <span>Criado por Anderson · 2026</span>
    <span>Seus dados ficam neste aparelho.</span>
  </div>
</footer>`;
}

/**
 * Monta uma página completa do portal.
 * @param {{
 *   título: string, descrição: string, base?: string, atual?: string,
 *   conteúdo: string, scripts?: string[], estilos?: string[],
 *   canônica?: string, semÍndice?: boolean
 * }} opções
 * @returns {string} HTML completo
 */
export function montarPágina({
  título, descrição, base = '', atual = '', conteúdo,
  scripts = [], estilos = [], canônica, semÍndice = false,
}) {
  const folhas = ['núcleo.css', 'fontes.css', 'layout.css', 'componentes.css', 'páginas.css', ...estilos]
    .map((f) => `  <link rel="stylesheet" href="${base}estilos/${f}">`).join('\n');
  const módulos = scripts
    .map((s) => `  <script type="module" src="${base}scripts/${s}"></script>`).join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${escapar(título)}</title>
  <meta name="description" content="${escapar(descrição)}">
  <meta name="theme-color" content="#f6f1ea" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#15110f" media="(prefers-color-scheme: dark)">
${semÍndice ? '  <meta name="robots" content="noindex,follow">\n' : ''}${canônica ? `  <link rel="canonical" href="${escapar(canônica)}">\n` : ''}  <link rel="icon" href="${base}recursos/ícone.svg" type="image/svg+xml">
  <link rel="manifest" href="${base}manifesto.webmanifest">
${folhas}
  <script src="${base}scripts/núcleo/tema-inicial.js"></script>
${módulos}
</head>
<body>
  <a class="pular" href="#conteúdo">Pular para o conteúdo</a>
${cabeçalho(base, atual)}
  <main id="conteúdo">
${conteúdo}
  </main>
${rodapé(base)}
${barraInferior(base, atual)}
  <div class="notificação" id="aviso" role="status" aria-live="polite"></div>
  <script type="module" src="${base}scripts/núcleo/cabeçalho.js"></script>
</body>
</html>
`;
}

export { escapar, NAVEGAÇÃO };
