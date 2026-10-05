/**
 * Política de segurança e de publicação do portal, num lugar só.
 *
 * Quem decide o que o navegador pode carregar (cabeçalhos), o que o servidor de
 * desenvolvimento nunca entrega (caminhos privados) e o que vai para a pasta publicada
 * (lista branca) é este arquivo. `servir.mjs` e `publicar.mjs` leem daqui, e os testes
 * conferem as duas listas contra a pasta real.
 *
 * Regra: a lista de publicação é BRANCA. Arquivo novo não vai para o ar até alguém
 * decidir isso aqui. É o contrário da lista negra, em que o esquecido vaza.
 */

/** Política de conteúdo estrita: nada de script ou estilo embutido, tudo da própria origem. */
export const CABEÇALHOS_DE_SEGURANÇA = Object.freeze({
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

/** Pastas da raiz do portal que existem só para desenvolver e nunca devem ser entregues. */
export const PASTAS_PRIVADAS = Object.freeze(['testes', 'ferramentas', 'visuais', 'node_modules', 'publicação']);

/** Arquivos da raiz que nunca devem ser entregues. */
export const ARQUIVOS_PRIVADOS = Object.freeze(['package.json', 'package-lock.json', 'README.md']);

/** Dentro de pastas públicas, estes caminhos continuam privados (ferramentas de produção da vitrine). */
export const SUBPASTAS_PRIVADAS = Object.freeze(['vitrine/ferramentas', 'vitrine/midia']);

/** Arquivos da raiz que vão para o ar. */
export const ARQUIVOS_DA_RAIZ = Object.freeze([
  'index.html', 'ferramentas.html', 'salvos.html', 'ajuda.html', 'privacidade.html', 'termos.html',
  '404.html', 'manifesto.webmanifest', 'robots.txt', 'sitemap.xml',
]);

/** Pastas inteiras que vão para o ar (com os filtros de extensão e de subpasta abaixo). */
export const PASTAS_PUBLICADAS = Object.freeze(['estilos', 'scripts', 'dados', 'recursos', 'f', 'en', 'vitrine']);

/** Extensões que o navegador precisa. Documentação (.md), mapas e testes ficam de fora. */
export const EXTENSÕES_PUBLICÁVEIS = Object.freeze([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.woff2', '.png', '.jpg', '.webp', '.ico', '.txt', '.xml', '.pdf', '.webmanifest',
]);

/** Normaliza para barras e sem "./" no início, e devolve também as partes do caminho. */
function partesDe(relativo) {
  const limpo = String(relativo).replaceAll('\\', '/').replace(/^\.?\//, '');
  return { limpo, partes: limpo.split('/').filter(Boolean) };
}

/**
 * Diz se o servidor de desenvolvimento deve fingir que o caminho não existe.
 * Cobre pastas de desenvolvimento, arquivos de projeto, qualquer ponto-arquivo e as
 * subpastas de produção da vitrine. `scripts/ferramentas/` NÃO é privada: são as
 * ferramentas que o navegador carrega.
 */
export function caminhoÉPrivado(relativo) {
  const { limpo, partes } = partesDe(relativo);
  if (partes.length === 0) return false;
  if (partes.some((parte) => parte.startsWith('.'))) return true;
  if (PASTAS_PRIVADAS.includes(partes[0])) return true;
  if (partes.length === 1 && ARQUIVOS_PRIVADOS.includes(partes[0])) return true;
  return SUBPASTAS_PRIVADAS.some((sub) => limpo === sub || limpo.startsWith(`${sub}/`));
}

/** Diz se um arquivo (caminho relativo à raiz do portal) entra na pasta publicada. */
export function deveSerPublicado(relativo) {
  const { limpo, partes } = partesDe(relativo);
  if (partes.length === 0 || caminhoÉPrivado(limpo)) return false;
  if (partes.length === 1) return ARQUIVOS_DA_RAIZ.includes(partes[0]);
  if (!PASTAS_PUBLICADAS.includes(partes[0])) return false;
  if (/\.test\.[cm]?js$/.test(limpo)) return false;
  const ponto = limpo.lastIndexOf('.');
  return ponto > 0 && EXTENSÕES_PUBLICÁVEIS.includes(limpo.slice(ponto).toLowerCase());
}

/** Conteúdo do arquivo `_headers` (Netlify e Cloudflare Pages) com a mesma política do servidor local. */
export function arquivoDeCabeçalhos() {
  const linhas = Object.entries(CABEÇALHOS_DE_SEGURANÇA).map(([nome, valor]) => `  ${nome}: ${valor}`);
  return `# Gerado por ferramentas/publicar.mjs. Não edite à mão.\n/*\n${linhas.join('\n')}\n`;
}
