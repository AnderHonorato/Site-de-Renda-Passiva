import test from 'node:test';
import assert from 'node:assert/strict';
import { lerSitemap, ajustarPagina } from '../ferramentas/indexacao-pages.mjs';

const base = 'https://anderhonorato.github.io/Site-de-Renda-Passiva/portal/';
const xml = '<?xml version="1.0"?><urlset><url><loc>' + base +
  '</loc></url><url><loc>' + base + 'f/juros/</loc></url>' +
  '<url><loc>' + base + 'en/ajuda.html</loc></url></urlset>';
const indice = lerSitemap(xml);

test('sitemap preserva HTTPS com subpasta e mapeia ferramentas', () => {
  assert.equal(indice.base, base);
  assert.deepEqual([...indice.paginas].sort(), ['en/ajuda.html', 'f/juros/index.html', 'index.html'].sort());
  assert.throws(() => lerSitemap('<urlset></urlset>'), /URLs públicas/);
  assert.throws(() => lerSitemap(xml.replaceAll('https:', 'http:')), /HTTPS/);
  assert.throws(() => lerSitemap(xml.replace(base + 'f/juros/', 'https://exemplo.com/')), /fora do portal/);
});

test('página pública preserva canonical correta e não pode ser noindex', () => {
  const html = '<html><head><link rel="canonical" href="' + base + 'f/juros/"></head><body></body></html>';
  assert.equal(ajustarPagina(html, 'f/juros/index.html', indice), html);
  assert.throws(() => ajustarPagina('<head></head>', 'f/juros/index.html', indice), /sem canonical/);
  assert.throws(() => ajustarPagina(html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'),
    'f/juros/index.html', indice), /noindex/);
});

test('login, conta, chat, administração e 404 ficam noindex sem alterar interface', () => {
  for (const caminho of ['entrar.html', 'conta/index.html', 'en/conta/index.html', 'admin/editorial/index.html', '404.html']) {
    const original = '<html><head><link rel="canonical" href="' + base + caminho +
      '"><meta property="og:url" content="' + base + caminho + '"></head><body><h1>Portal</h1></body></html>';
    const resultado = ajustarPagina(original, caminho, indice);
    assert.match(resultado, /name="robots" content="noindex,follow"/);
    assert.doesNotMatch(resultado, /rel="canonical"|property="og:url"/);
    assert.match(resultado, /<body><h1>Portal<\/h1><\/body>/);
    assert.equal(ajustarPagina(resultado, caminho, indice), resultado);
  }
});
