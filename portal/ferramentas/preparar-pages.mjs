import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { protegerPaginasPrivadas } from './indexacao-pages.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, '.execucao', 'pages');
const portal = join(destino, 'portal');
const resultado = spawnSync(process.execPath, [join(raiz, 'ferramentas', 'publicar.mjs'), portal], {
  cwd: raiz, stdio: 'inherit', windowsHide: true,
});
if (resultado.error) throw resultado.error;
if (resultado.status !== 0) process.exit(resultado.status ?? 1);

await mkdir(destino, { recursive: true });
await cp(join(raiz, '..', 'index.html'), join(destino, 'index.html'));
await writeFile(join(destino, '.nojekyll'), '');
const indice = await protegerPaginasPrivadas(portal);
await writeFile(join(destino, 'robots.txt'),
  'User-agent: *\nAllow: ' + new URL(indice.base).pathname +
  '\nSitemap: ' + indice.base + 'sitemap.xml\n', 'utf8');
console.log('Indexação: ' + indice.publicas + ' páginas públicas; ' +
  indice.privadas + ' páginas privadas/sem função pública com noindex.');
await cp(join(raiz, 'ferramentas', 'api-previa-pages.mjs'), join(portal, 'scripts', 'núcleo', 'api.js'));
// Aviso no lugar dos anúncios administrados pela API, que não existe no Pages.
await writeFile(join(portal, 'scripts', 'núcleo', 'banner-prioritario.js'), `
export function iniciarBannerPrioritario() {
  if (document.querySelector('[data-previa-pages]')) return;
  const cabecalho = document.querySelector('.cabeçalho, header');
  if (!cabecalho) return;
  const aviso = document.createElement('aside');
  aviso.className = 'largura';
  aviso.dataset.previaPages = 'sim';
  aviso.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Preview' : 'Prévia');
  const texto = document.createElement('p');
  texto.className = 'pequeno suave';
  texto.textContent = document.documentElement.lang === 'en'
    ? 'Preview: local tools are available. Sign-in, accounts and chat require the full server.'
    : 'Prévia: as ferramentas locais estão disponíveis. Login, conta e chat precisam do servidor completo.';
  aviso.append(texto);
  cabecalho.insertAdjacentElement('afterend', aviso);
}
`, 'utf8');
console.log(`Prévia estática pronta em ${destino}`);
