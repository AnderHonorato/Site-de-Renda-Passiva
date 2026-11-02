/**
 * Indexação segura da publicação estática: apenas páginas públicas listadas no
 * sitemap recebem canonical. Conta, administração e 404 ficam como noindex.
 * Não altera conteúdo, scripts, componentes ou identidade visual.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export function lerSitemap(xml) {
  const locais = [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/gu)]
    .map((achado) => achado[1].replaceAll('&amp;', '&'));
  if (!locais.length) throw new Error('O sitemap precisa ter URLs públicas.');
  const base = new URL(locais[0]);
  if (base.protocol !== 'https:' || !base.pathname.endsWith('/') ||
      base.username || base.password || base.search || base.hash) {
    throw new Error('A URL base do sitemap precisa ser HTTPS e terminar em /.');
  }
  const paginas = new Set();
  for (const local of locais) {
    const endereco = new URL(local);
    if (endereco.origin !== base.origin || !endereco.pathname.startsWith(base.pathname) ||
        endereco.search || endereco.hash) {
      throw new Error('O sitemap contém um endereço fora do portal.');
    }
    const caminho = endereco.pathname.slice(base.pathname.length);
    if (caminho.includes('..')) throw new Error('Caminho inválido no sitemap.');
    paginas.add(!caminho ? 'index.html' : caminho.endsWith('/') ? caminho + 'index.html' : caminho);
  }
  return { base: base.href, paginas };
}

export function ajustarPagina(html, caminho, indice) {
  if (!html.includes('</head>')) throw new Error('HTML sem cabeçalho: ' + caminho);
  if (indice.paginas.has(caminho)) {
    const relativo = caminho.replace(/index\.html$/u, '');
    const url = new URL(relativo, indice.base).href;
    if (!html.includes('<link rel="canonical" href="' + url + '">')) {
      throw new Error('Página pública sem canonical correta: ' + caminho);
    }
    if (/<meta name="robots" content="[^"]*noindex/iu.test(html)) {
      throw new Error('Página pública noindex presente no sitemap: ' + caminho);
    }
    return html;
  }
  let seguro = html
    .replace(/\s*<link rel="canonical" href="[^"]*">/gu, '')
    .replace(/\s*<meta property="og:url" content="[^"]*">/gu, '');
  if (!/<meta name="robots" content="[^"]*noindex/iu.test(seguro)) {
    seguro = seguro.replace('</head>', '  <meta name="robots" content="noindex,follow">\n</head>');
  }
  return seguro;
}

export async function protegerPaginasPrivadas(pasta) {
  const indice = lerSitemap(await readFile(join(pasta, 'sitemap.xml'), 'utf8'));
  let publicas = 0;
  let privadas = 0;
  const encontradas = new Set();
  async function visitar(diretorio) {
    for (const item of await readdir(diretorio, { withFileTypes: true })) {
      const arquivo = join(diretorio, item.name);
      if (item.isDirectory()) {
        await visitar(arquivo);
        continue;
      }
      if (!item.isFile() || !item.name.endsWith('.html')) continue;
      const relativo = relative(pasta, arquivo).replaceAll('\\', '/');
      const html = await readFile(arquivo, 'utf8');
      const ajustado = ajustarPagina(html, relativo, indice);
      if (ajustado !== html) await writeFile(arquivo, ajustado, 'utf8');
      if (indice.paginas.has(relativo)) {
        encontradas.add(relativo);
        publicas += 1;
      } else {
        privadas += 1;
      }
    }
  }
  await visitar(pasta);
  for (const pagina of indice.paginas) {
    if (!encontradas.has(pagina)) throw new Error('URL do sitemap sem HTML publicado: ' + pagina);
  }
  return { ...indice, publicas, privadas };
}
