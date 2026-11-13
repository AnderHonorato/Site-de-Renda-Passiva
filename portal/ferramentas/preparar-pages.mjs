import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { protegerPaginasPrivadas } from './indexacao-pages.mjs';
import { redirecionarAutenticacaoPages } from './redirecionar-autenticacao-pages.mjs';

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
// O Pages não possui sessão: evitar botões "Entrar" e "Criar conta" que
// reaparecem mesmo quando o visitante já está logado no servidor.
await cp(join(raiz, 'ferramentas', 'conta-topo-previa-pages.mjs'),
  join(portal, 'scripts', 'núcleo', 'conta-topo.js'));
// No GitHub Pages não há cookies nem API Node. As páginas de autenticação
// encaminham ao endereço fixo que encontra a instância HTTPS real em execução.
for (const idioma of ['', 'en/']) {
  for (const [arquivo, destino] of [['entrar.html', 'entrar'], ['criar-conta.html', 'cadastro']]) {
    const caminho = join(portal, idioma, arquivo);
    const html = await readFile(caminho, 'utf8');
    await writeFile(caminho, redirecionarAutenticacaoPages(html, destino, Boolean(idioma)), 'utf8');
  }
}
// Interface pública sem faixa de demonstração. Falhas de API são informadas apenas no fluxo afetado.
await writeFile(join(portal, 'scripts', 'núcleo', 'banner-prioritario.js'),
  'export function iniciarBannerPrioritario() {}\n', 'utf8');
console.log(`Prévia estática pronta em ${destino}`);
