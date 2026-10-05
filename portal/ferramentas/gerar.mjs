/**
 * Gera o HTML do portal a partir do catálogo e do modelo de página.
 *
 * Nada de HTML escrito à mão em duplicidade: cabeçalho, rodapé e barra inferior
 * vêm de `modelo-de-página.mjs`, e as páginas de ferramenta vêm do catálogo.
 *
 * Uso: node portal/ferramentas/gerar.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPágina, escapar } from './modelo-de-página.mjs';
import { contextoPt, contextoEn } from './contexto-de-idioma.mjs';
import { arteDaCategoria, páginaInicial, páginaDeCatálogo, páginaDeSalvos, páginasInstitucionais, página404 } from './páginas.mjs';
import { ícone } from '../scripts/núcleo/ícones.js';
import { ferramentas, ferramentasProntas, conferirCatálogo } from '../dados/catálogo.js';
import { categorias, tarefas } from '../dados/categorias.js';
import { site } from '../dados/site.js';
import { íconeVivo, imagemDoTema } from '../scripts/núcleo/ícone-animado.js';
import { gerarÍconesAnimados } from './ícones-animados.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const RÓTULO_DE_EXPORTAÇÃO = {
  copiar: 'copiar', baixar: 'baixar arquivo', pdf: 'PDF', xlsx: 'planilha Excel',
  csv: 'CSV', json: 'JSON', png: 'PNG', svg: 'SVG', link: 'link para compartilhar', imprimir: 'impressão',
};

/* --------------------------------------------------- página de ferramenta */

function páginaDeFerramenta(f) {
  const categoria = categorias.find((c) => c.id === f.cat);
  const exporta = f.exporta.length
    ? f.exporta.map((e) => RÓTULO_DE_EXPORTAÇÃO[e] ?? e).join(', ')
    : 'resultado na tela';
  // As relações declaradas no catálogo vêm primeiro, na ordem escrita; o resto
  // das cinco vagas é completado pela mesma categoria ou tarefa, prontas antes.
  const declaradas = (f.relacionadas ?? [])
    .map((slug) => ferramentas.find((o) => o.slug === slug))
    .filter((o) => o && o.slug !== f.slug);
  const semelhantes = ferramentas
    .filter((o) => o.slug !== f.slug && !declaradas.includes(o)
      && (o.cat === f.cat || o.tarefas.some((t) => f.tarefas.includes(t))))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'pronta' ? -1 : 1));
  const relacionadas = [...declaradas, ...semelhantes]
    .slice(0, 5)
    .map((o) => `<a href="${o.status === 'pronta' ? `../${o.slug}/` : `../../ferramentas.html#${o.slug}`}">${ícone(o.ícone)}${escapar(o.nome)}</a>`)
    .join('');

  const unificadas = f.unifica.length
    ? `<p class="pequeno suave">Esta ferramenta reúne: ${f.unifica.map(escapar).join(' · ')}.</p>`
    : '';

  const conteúdo = `    <div class="largura">
      <nav class="caminho" aria-label="Você está em">
        <a href="../../">Início</a>${ícone('chevron', { tamanho: 12 })}
        <a href="../../ferramentas.html?categoria=${encodeURIComponent(f.cat)}">${escapar(categoria.nome)}</a>${ícone('chevron', { tamanho: 12 })}
        <span aria-current="page">${escapar(f.nome)}</span>
      </nav>

      <header class="ferramenta-topo">
        <span class="ferramenta-topo__ícone">${íconeVivo(f.ícone, { base: '../../', tamanho: 22 })}</span>
        <div>
          <h1>${escapar(f.nome)}</h1>
          <p>${escapar(f.resumo)}</p>
        </div>
        <div class="ferramenta-topo__ações">
          <button class="ícone-botão favorito" type="button" data-favorito="${escapar(f.slug)}" aria-pressed="false" aria-label="Salvar nos favoritos">${ícone('marcador')}</button>
        </div>
        ${imagemDoTema(`../../${arteDaCategoria(f.cat)}`, { classe: 'ferramenta-topo__arte', largura: 480, altura: 200, carregar: 'eager' })}
      </header>

      <div class="ferramenta-área">
      <dl class="ficha">
        <div><dt>Para que serve</dt><dd>${escapar(f.problema)}</dd></div>
        <div><dt>Você informa</dt><dd>${escapar(f.entra)}</dd></div>
        <div><dt>Você recebe</dt><dd>${escapar(f.sai)}</dd></div>
        <div><dt>Onde processa</dt><dd>${f.local ? 'No seu navegador. Nada é enviado.' : 'Exige servidor; o aviso aparece antes do envio.'}</dd></div>
        <div><dt>Você pode levar</dt><dd>${escapar(exporta)}</dd></div>
      </dl>

      <div class="ferramenta-corpo">
        <div class="painel" id="ferramenta" data-slug="${escapar(f.slug)}">
          <noscript><p>Esta ferramenta precisa de JavaScript para calcular. O processamento continua sendo feito no seu navegador.</p></noscript>
        </div>
        <aside class="ferramenta-lado">
          <div class="painel">
            <p class="rótulo">Como funciona a conta</p>
            <p class="pequeno t-1">${escapar(f.processa)}</p>
            ${unificadas}
          </div>
          ${relacionadas ? `<div class="painel"><p class="rótulo b-2">Ferramentas relacionadas</p><div class="relacionadas">${relacionadas}</div></div>` : ''}
        </aside>
      </div>

      </div>

      <section class="seção prosa" id="como-usar">
        <h2>Como usar</h2>
        <div id="instruções"></div>
      </section>
    </div>`;

  return montarPágina({
    ctx: contextoPt,
    título: `${f.nome} — ${site.nome}`,
    descrição: f.resumo,
    base: '../../',
    raiz: '../../',
    // As ferramentas ainda não têm versão em inglês (Onda 9): o seletor mostra EN desligado.
    alternativas: { 'pt-BR': '', en: null },
    atual: 'ferramentas',
    conteúdo,
    scripts: ['núcleo/página-de-ferramenta.js'],
  });
}

/* ------------------------------------------------------------- auxiliares */

function manifesto() {
  return JSON.stringify({
    name: site.nome,
    short_name: site.nomeCurto,
    description: site.descrição,
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#f5f2ed',
    theme_color: '#f5f2ed',
    lang: 'pt-BR',
    icons: [{ src: 'recursos/ícone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    shortcuts: ferramentasProntas.slice(0, 4).map((f) => ({
      name: f.nome, url: `f/${f.slug}/`,
    })),
  }, null, 2);
}

/** Números que a vitrine mostra. Saem do catálogo, nunca são digitados à mão. */
function númerosDaVitrine() {
  return `// Gerado por ferramentas/gerar.mjs a partir do catálogo. Não edite à mão.
export const números = Object.freeze({ prontas: ${ferramentasProntas.length}, catálogo: ${ferramentas.length}, categorias: ${categorias.length} });
`;
}

function íconeDoSite() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect width="24" height="24" rx="6" fill="#1a1a1a"/>
  <g transform="translate(12 12) scale(.8) translate(-12 -12)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9">
    <path stroke="#f5f2ed" d="M10.27 4.5L10.66 2.49L13.34 2.49L13.73 4.5L16.08 5.47L17.78 4.33L19.67 6.22L18.53 7.92L19.5 10.27L21.51 10.66L21.51 13.34L19.5 13.73L18.53 16.08L19.67 17.78L17.78 19.67L16.08 18.53L13.73 19.5L13.34 21.51L10.66 21.51L10.27 19.5L7.92 18.53L6.22 19.67L4.33 17.78L5.47 16.08L4.5 13.73L2.49 13.34L2.49 10.66L4.5 10.27L5.47 7.92L4.33 6.22L6.22 4.33L7.92 5.47Z"/>
    <path stroke="#d97757" stroke-width="2.3" d="M8.9 12.3l2.2 2.2 4.2-4.7"/>
  </g>
</svg>
`;
}

function sitemap(base = 'https://exemplo.invalid/portal/') {
  const páginasDoIdioma = ['', 'ferramentas.html', 'ajuda.html', 'privacidade.html', 'termos.html'];
  const urls = [...páginasDoIdioma, ...páginasDoIdioma.map((u) => `en/${u}`),
    ...ferramentasProntas.map((f) => `f/${f.slug}/`)];
  const corpo = urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`;
}

/* ------------------------------------------------------------- execução */

/** Todas as páginas de um idioma: português na raiz, inglês em en/. */
function páginasDoIdioma(ctx) {
  const pasta = ctx.idioma.pasta;
  return [
    [`${pasta}index.html`, páginaInicial(ctx)],
    [`${pasta}ferramentas.html`, páginaDeCatálogo(ctx)],
    [`${pasta}salvos.html`, páginaDeSalvos(ctx)],
    [`${pasta}404.html`, página404(ctx)],
    ...páginasInstitucionais(ctx).map((p) => [`${pasta}${p.arquivo}`, p.html]),
  ];
}

async function escrever(caminhoRelativo, conteúdo) {
  const destino = join(RAIZ, caminhoRelativo);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, conteúdo, 'utf8');
}

async function principal() {
  const problemas = conferirCatálogo();
  if (problemas.length > 0) {
    console.error('Catálogo inválido:');
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  await rm(join(RAIZ, 'f'), { recursive: true, force: true });
  await rm(join(RAIZ, 'en'), { recursive: true, force: true });
  await gerarÍconesAnimados();

  const arquivos = [
    ...páginasDoIdioma(contextoPt),
    ...páginasDoIdioma(contextoEn),
    ['manifesto.webmanifest', manifesto()],
    ['recursos/ícone.svg', íconeDoSite()],
    ['vitrine/vitrine-números.js', númerosDaVitrine()],
    ['sitemap.xml', sitemap()],
    ['robots.txt', 'User-agent: *\nAllow: /\nDisallow: /salvos.html\n'],
    ...ferramentasProntas.map((f) => [`f/${f.slug}/index.html`, páginaDeFerramenta(f)]),
  ];

  for (const [caminho, conteúdo] of arquivos) await escrever(caminho, conteúdo);

  console.log(`Geradas ${arquivos.length} saídas: ${ferramentasProntas.length} páginas de ferramenta `
    + `+ ${arquivos.length - ferramentasProntas.length} arquivos do portal.`);
  console.log(`Catálogo: ${ferramentas.length} ferramentas, ${ferramentasProntas.length} prontas.`);
}

await principal();
