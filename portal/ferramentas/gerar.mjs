/**
 * Gera o HTML do portal a partir do catálogo e do modelo de página.
 *
 * Nada de HTML escrito à mão em duplicidade: cabeçalho, rodapé e barra inferior
 * vêm de `modelo-de-página.mjs`, e as páginas de ferramenta vêm do catálogo.
 *
 * Uso: node portal/ferramentas/gerar.mjs
 */
import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPágina, escapar } from './modelo-de-página.mjs';
import { contextoPt, contextoEn } from './contexto-de-idioma.mjs';
import { arteDaCategoria, páginaInicial, páginaDeCatálogo, páginaDeSalvos, páginasInstitucionais, página404 } from './páginas.mjs';
import { ícone } from '../scripts/núcleo/ícones.js';
import { ferramentas, ferramentasProntas, conferirCatálogo } from '../dados/catálogo.js';
import { categorias, tarefas } from '../dados/categorias.js';
import { site } from '../dados/site.js';
import { íconeVivo, arteViva } from '../scripts/núcleo/ícone-animado.js';
import { gerarÍconesAnimados } from './ícones-animados.mjs';
import { lerRegistro, atualizarRegistro, montarFeed } from './lançamentos.mjs';
import { paginasConta } from './páginas-conta.mjs';
import { apresentarPlanos } from './painel-planos.mjs';
import { editorial } from '../dados/editorial-publicado.js';
import { paginasErros } from './paginas-erros.mjs';
import { instrucoesEmHtml } from '../scripts/núcleo/instruções.js';
import { basePublica, completarSeo } from './seo.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const RÓTULO_DE_EXPORTAÇÃO = {
  copiar: 'copiar', baixar: 'baixar arquivo', pdf: 'PDF', xlsx: 'planilha Excel',
  csv: 'CSV', json: 'JSON', png: 'PNG', svg: 'SVG', link: 'link para compartilhar', imprimir: 'impressão',
};

/* --------------------------------------------------- página de ferramenta */

function páginaDeFerramenta(f, instruções) {
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
          <button class="botão botão--linha ferramenta-topo__ajuda" type="button" data-como-funciona aria-haspopup="dialog" aria-controls="dialogo-como-funciona">${ícone('ajuda')}Como funciona</button>
          <button class="ícone-botão favorito" type="button" data-favorito="${escapar(f.slug)}" aria-pressed="false" aria-label="Salvar nos favoritos">${ícone('marcador')}</button>
        </div>
        ${arteViva(`../../${arteDaCategoria(f.cat)}`, { classe: 'ferramenta-topo__arte', largura: 480, altura: 200, tipo: 'topo' })}
      </header>

      <div class="ferramenta-área">
        <div class="ferramenta-corpo">
          <div class="painel" id="ferramenta" data-slug="${escapar(f.slug)}">
            <noscript><p>Esta ferramenta precisa de JavaScript para calcular. As instruções e informações continuam disponíveis na página.</p></noscript>
          </div>
        </div>
      </div>

      <dialog class="diálogo ajuda-modal" id="dialogo-como-funciona" aria-labelledby="titulo-como-funciona" aria-describedby="resumo-como-funciona">
        <div class="diálogo__topo ajuda-modal__topo">
          <div><p class="rótulo">Ajuda da ferramenta</p><h2 id="titulo-como-funciona">Como funciona</h2></div>
          <button class="botão botão--linha ajuda-modal__fechar" type="button" data-fechar-ajuda>${ícone('fechar')}Fechar</button>
        </div>
        <div class="diálogo__corpo ajuda-modal__corpo">
          <p class="ajuda-modal__resumo" id="resumo-como-funciona">${escapar(f.resumo)}</p>
          <section class="prosa ajuda-modal__instrucoes" id="como-usar" aria-labelledby="titulo-passos">
            <h3 id="titulo-passos">Passo a passo</h3>
            <div id="instruções">${instrucoesEmHtml(instruções)}</div>
          </section>
          <details class="ajuda-modal__extra">
            <summary>O que entra, o que sai e onde processa</summary>
            <dl class="ficha">
              <div><dt>Para que serve</dt><dd>${escapar(f.problema)}</dd></div>
              <div><dt>Você informa</dt><dd>${escapar(f.entra)}</dd></div>
              <div><dt>Você recebe</dt><dd>${escapar(f.sai)}</dd></div>
              <div><dt>Onde processa</dt><dd>${f.local ? 'No seu navegador. Nada é enviado.' : 'Exige servidor; o aviso aparece antes do envio.'}</dd></div>
              <div><dt>Você pode levar</dt><dd>${escapar(exporta)}</dd></div>
            </dl>
            <p class="pequeno t-2"><strong>Como é calculado:</strong> ${escapar(f.processa)}</p>
            ${unificadas}
          </details>
          ${relacionadas ? '<details class="ajuda-modal__extra"><summary>Ferramentas relacionadas</summary><div class="relacionadas">' + relacionadas + '</div></details>' : ''}
        </div>
      </dialog>
      ${f.cat !== 'estudos' ? '<div data-anuncio-posicao="resultado" class="publicidade-vazia"></div>' : ''}
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
    estilos: f.slug === 'limpar-planilha' ? ['limpeza-planilha.css']
      : f.slug === 'ficha-de-cliente' ? ['ficha-de-cliente.css'] : [],
    anunciosPermitidos: f.cat !== 'estudos',
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

function robots(base = basePublica()) {
  if (!base) return 'User-agent: *\nDisallow: /\n';
  const prefixo = new URL(base).pathname;
  const privados = [
    'admin/', 'en/admin/', 'api/', 'conta/', 'en/conta/',
    'perfil.html', 'en/perfil.html', 'salvos.html', 'en/salvos.html',
  ];
  return [
    'User-agent: *',
    'Allow: ' + prefixo,
    ...privados.map((caminho) => 'Disallow: ' + prefixo + caminho),
    'Sitemap: ' + base + 'sitemap.xml',
    '',
  ].join('\n');
}

function sitemap(base = basePublica()) {
  if (!base) return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
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
  const en = ctx.código === 'en';
  const cookies = montarPágina({ ctx, título: en ? 'Cookies and privacy preferences' : 'Cookies e preferências de privacidade',
    descrição: en ? 'Choose your advertising preferences and learn about essential session cookies.' : 'Escolha suas preferências de publicidade e conheça os cookies essenciais da sua sessão.',
    base: '', raiz: ctx.idioma.raizDoSite || (en ? '../' : ''), atual: '', anunciosPermitidos: false,
    alternativas: { 'pt-BR': en ? '../cookies.html' : 'cookies.html', en: en ? 'cookies.html' : 'en/cookies.html' },
    conteúdo: `<div class="largura seção prosa"><h1>${en ? 'Cookies and privacy preferences' : 'Cookies e preferências de privacidade'}</h1><p>${en ? 'Session cookies are HttpOnly and essential for your account. A separate CSRF cookie protects changes. Theme, saved tools and advertising preferences are stored on this device.' : 'O cookie de sessão é HttpOnly e essencial para a conta. Outro cookie protege alterações contra CSRF. Tema, ferramentas salvas e preferências de anúncios ficam neste aparelho.'}</p><p>${en ? 'Google does not load before your choice, when there are no configured ads, or on account, administration and legal pages. Your choice lasts 180 days. Essential only requests non-personalized ads; Reject ads prevents Google from loading. Non-personalized ads may still use storage for security and frequency. Regional requirements may also require Google’s certified consent platform before public advertising.' : 'Nada do Google carrega antes da escolha, sem anúncios configurados ou em páginas de conta, administração e textos legais. A escolha dura 180 dias. Só o essencial solicita anúncios não personalizados; Recusar anúncios impede o carregamento do Google. Anúncios não personalizados ainda podem usar armazenamento para segurança e frequência. Exigências regionais também podem exigir uma plataforma de consentimento certificada pelo Google antes da publicidade pública.'}</p><div id="preferencias-cookies"></div><p id="estado-consentimento" role="status"></p></div>`,
  });
  const planos = montarPágina({ ctx, título: en ? 'Plans and account access' : 'Planos e acesso da conta',
    descrição: en ? 'Free public tools and manually granted Plus and Premium accounts without automatic billing.' : 'Ferramentas públicas gratuitas e contas Plus e Premium liberadas manualmente, sem cobrança automática.',
    base: '', raiz: en ? '../' : '', atual: '', anunciosPermitidos: false,
    alternativas: { 'pt-BR': en ? '../planos.html' : 'planos.html', en: en ? 'planos.html' : 'en/planos.html' },
    estilos: ['conta.css'],
    conteúdo: `<section class="largura seção prosa"><h1>${en ? 'Plans' : 'Planos'}</h1><p>${escapar(editorial.textos?.['planos.introducao']?.[ctx.código] || (en ? 'Public browser tools remain free. Plus and Premium are granted manually by an administrator; there is no automatic charge or checkout.' : 'As ferramentas públicas continuam gratuitas. Plus e Premium são liberados manualmente pelo administrador; não há cobrança automática nem checkout.'))}</p>${apresentarPlanos(en)}<p><a class="botão" href="conta/mensagens.html">${en ? 'Request plan activation' : 'Solicitar ativação do plano'}</a></p></section>`,
  });
  return [
    [`${pasta}index.html`, páginaInicial(ctx)],
    [`${pasta}ferramentas.html`, páginaDeCatálogo(ctx)],
    [`${pasta}salvos.html`, páginaDeSalvos(ctx)],
    [`${pasta}404.html`, página404(ctx)],
    ...paginasErros(ctx),
    ...páginasInstitucionais(ctx).map((p) => [`${pasta}${p.arquivo}`, p.html]),
    ...paginasConta(ctx),
    [`${pasta}cookies.html`, cookies],
    [`${pasta}planos.html`, planos],
  ];
}

async function escrever(caminhoRelativo, conteúdo) {
  const destino = join(RAIZ, caminhoRelativo);
  await mkdir(dirname(destino), { recursive: true });
  const temporario=destino+'.gerando';
  try{await writeFile(temporario,conteúdo,'utf8');await rename(temporario,destino);}finally{await rm(temporario,{force:true});}
}

async function principal() {
  const problemas = conferirCatálogo();
  if (problemas.length > 0) {
    console.error('Catálogo inválido:');
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  // Confere todas as definições antes de substituir as páginas da prévia ao vivo.
  const definicoes = new Map();
  for (const ferramenta of ferramentasProntas) {
    const modulo = await import(new URL(`../scripts/ferramentas/${ferramenta.slug}.js`, import.meta.url));
    definicoes.set(ferramenta.slug, (modulo.default || modulo.definição)?.instruções);
  }
  // Preserva as páginas disponíveis durante a publicação; cada arquivo é trocado por rename.
  await gerarÍconesAnimados();

  // Lançamentos: registra as ferramentas que ficaram prontas desde a última geração e monta o feed do sino.
  const hoje = new Date().toISOString().slice(0, 10);
  const registroAtual = await lerRegistro(join(RAIZ, 'dados', 'lançamentos.json'));
  const { registro, novos, mudou } = atualizarRegistro(registroAtual, ferramentasProntas.map((f) => f.slug), hoje);
  if (mudou) {
    await escrever('dados/lançamentos.json', `${JSON.stringify(registro, null, 2)}\n`);
    if (novos.length) console.log(`Novas ferramentas desde a última geração (viram novidade no sino): ${novos.join(', ')}`);
  }
  const feed = montarFeed(registro, contextoPt.ferramentasProntas, contextoEn.ferramentasProntas, {
    pt: (nome) => contextoPt.t('notificações.novaFerramenta', { item: nome }),
    en: (nome) => contextoEn.t('notificações.novaFerramenta', { item: nome }),
  }, hoje);

  const ferramentasGeradas=[];
  for(const f of ferramentasProntas) {
    ferramentasGeradas.push([`f/${f.slug}/index.html`,páginaDeFerramenta(f,definicoes.get(f.slug))]);
  }
  const arquivos = [
    ...páginasDoIdioma(contextoPt),
    ...páginasDoIdioma(contextoEn),
    ['manifesto.webmanifest', manifesto()],
    ['recursos/ícone.svg', íconeDoSite()],
    ['vitrine/vitrine-números.js', númerosDaVitrine()],
    ['sitemap.xml', sitemap()],
    ['dados/novidades.json', `${JSON.stringify(feed)}\n`],
    ['robots.txt', robots()],
    ...ferramentasGeradas,
  ];

  for (const [caminho, conteúdo] of arquivos) await escrever(caminho,caminho.endsWith('.html') ? completarSeo(conteúdo,caminho,{ferramenta:ferramentasProntas.find(f=>caminho===`f/${f.slug}/index.html`)}) : conteúdo);

  console.log(`Geradas ${arquivos.length} saídas: ${ferramentasProntas.length} páginas de ferramenta `
    + `+ ${arquivos.length - ferramentasProntas.length} arquivos do portal.`);
  console.log(`Catálogo: ${ferramentas.length} ferramentas, ${ferramentasProntas.length} prontas.`);
}

await principal();
