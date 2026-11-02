// Gera o pacote publicável do produto em publicação/: somente arquivos servidos ao
// visitante, .htaccess para Apache e manifesto de integridade (SHA-256) para autoria.
// Uso, dentro da pasta do produto: npm run construir
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { gerarPáginas } from './gerar-páginas.mjs';

const raiz = path.resolve(process.argv[2] ?? process.cwd());
const destino = path.join(raiz, 'publicação');

const relatório = await gerarPáginas(raiz);
if (relatório.erros.length) {
  console.error('A geração falhou; corrija antes de construir:');
  for (const erro of relatório.erros) console.error(`  - ${erro}`);
  process.exit(1);
}

function copiarItem(relativo, filtro = () => true) {
  const origem = path.join(raiz, relativo);
  if (!fs.existsSync(origem)) return;
  fs.cpSync(origem, path.join(destino, relativo), {
    recursive: true,
    filter: (caminho) => fs.statSync(caminho).isDirectory() || filtro(caminho),
  });
}

function listarArquivos(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
  });
}

function caminhoCodificado(relativo) {
  return relativo.split('/').map(encodeURIComponent).join('/');
}

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });
for (const item of ['index.html', 'páginas', 'robots.txt', 'sitemap.xml', 'LICENÇA.txt', 'recursos']) copiarItem(item);
copiarItem('estilos/site.css');
copiarItem('scripts', (caminho) => caminho.endsWith('.js'));
copiarItem('configurações/configuração-pública.json');

const configuração = JSON.parse(fs.readFileSync(path.join(raiz, 'configurações', 'configuração-pública.json'), 'utf8'));
const base = relatório.pendências.some((problema) => problema.campo === 'publicação.endereçoBase') ? null : configuração.publicação?.endereçoBase;
const caminhoBase = base ? new URL(base.endsWith('/') ? base : `${base}/`).pathname : '/';
const páginaDeErro = `${caminhoBase}${caminhoCodificado('páginas/página-não-encontrada.html')}`;
const políticaDeSegurança =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

fs.writeFileSync(
  path.join(destino, '.htaccess'),
  `# Apache — perfil SEM anúncios. Gerado por npm run construir.
# Para o perfil com AdSense, veja documentação/segurança-e-hospedagem.md do produto.
${base ? '' : '# ATENÇÃO: endereço base não configurado; ErrorDocument supõe o site na raiz do domínio.\n'}Options -Indexes
AddDefaultCharset utf-8
AddType text/javascript .js .mjs
AddType application/json .json
AddType image/svg+xml .svg
AddType font/woff2 .woff2
DirectoryIndex index.html
ErrorDocument 404 ${páginaDeErro}

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "${políticaDeSegurança}"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "DENY"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  # Ative HSTS somente depois de confirmar HTTPS em todo o domínio e subdomínios:
  # Header always set Strict-Transport-Security "max-age=31536000"
  <FilesMatch "\\.(html|json)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.(css|js|svg)$">
    Header set Cache-Control "public, max-age=86400"
  </FilesMatch>
  <FilesMatch "\\.woff2$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
`,
  'utf8',
);

const proibidos = [/\.test\.js$/, /(^|\/)testes\//, /(^|\/)conteúdo\//, /(^|\/)ferramentas\//, /(^|\/)node_modules\//, /(^|\/)\.env/, /\.map$/];
const arquivos = listarArquivos(destino).map((arquivo) => path.relative(destino, arquivo).split(path.sep).join('/'));
const erros = [];
for (const relativo of arquivos) {
  if (proibidos.some((padrão) => padrão.test(relativo))) erros.push(`arquivo não publicável no pacote: ${relativo}`);
  if (/\.(html|css|js|json|svg|txt|xml)$/.test(relativo)) {
    const conteúdo = fs.readFileSync(path.join(destino, relativo), 'utf8');
    if (/\.\.\/compartilhado\/|\.\.\/\d\. /.test(conteúdo)) erros.push(`referência a pasta externa ao produto em ${relativo}`);
  }
}
if (erros.length) {
  console.error('Pacote inválido:');
  for (const erro of erros) console.error(`  - ${erro}`);
  process.exit(1);
}

const hashes = {};
let bytes = 0;
for (const relativo of arquivos.sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
  const conteúdo = fs.readFileSync(path.join(destino, relativo));
  bytes += conteúdo.length;
  hashes[relativo] = crypto.createHash('sha256').update(conteúdo).digest('hex');
}
fs.writeFileSync(
  path.join(destino, 'manifesto-de-integridade.json'),
  `${JSON.stringify({ produto: configuração.site?.marca, autor: 'Anderson', versão: configuração.site?.versão, geradoEm: new Date().toISOString(), algoritmo: 'SHA-256', arquivos: hashes }, null, 2)}\n`,
  'utf8',
);

console.log(`Pacote gerado em ${destino}: ${arquivos.length + 1} arquivos, ${(bytes / 1024).toFixed(1)} KiB.`);
if (relatório.pendências.length) {
  console.log('Pendências de configuração antes de publicar:');
  for (const problema of relatório.pendências) console.log(`  - ${problema.campo}: ${problema.mensagem}`);
}
