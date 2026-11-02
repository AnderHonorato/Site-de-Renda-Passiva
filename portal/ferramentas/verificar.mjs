/**
 * Verificação estrutural do portal gerado.
 *
 * Roda depois de `gerar.mjs` e barra o que os testes unitários não pegam:
 * link apontando para arquivo que não existe, ferramenta marcada como pronta
 * sem módulo, ícone inventado, título repetido e sobras de desenvolvimento.
 *
 * Uso: node portal/ferramentas/verificar.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ferramentas, ferramentasProntas, conferirCatálogo } from '../dados/catálogo.js';
import { nomesDeÍcone } from '../scripts/núcleo/ícones.js';
import { site } from '../dados/site.js';
import { ARQUIVO_DO_RESUMO, calcularResumoDaCapa } from './resumo-da-capa.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const problemas = [];
const avisos = [];

const reclamar = (mensagem) => problemas.push(mensagem);
const avisar = (mensagem) => avisos.push(mensagem);

async function existe(caminho) {
  try { await stat(caminho); return true; } catch { return false; }
}

/** Lista todos os arquivos de uma pasta, recursivamente. */
async function listar(pasta, filtro = () => true) {
  const encontrados = [];
  for (const entrada of await readdir(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name.startsWith('.')) continue;
      if (['node_modules', 'publicação', 'recursos', 'servidor', 'banco', 'scripts-admin'].includes(entrada.name)) continue;
      encontrados.push(...await listar(caminho, filtro));
    } else if (filtro(caminho)) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

/* --------------------------------------------------------- 1. catálogo */
for (const problema of conferirCatálogo()) reclamar(`Catálogo: ${problema}`);

for (const f of ferramentas) {
  if (!nomesDeÍcone.includes(f.ícone)) {
    reclamar(`${f.id} usa um ícone que não existe: "${f.ícone}".`);
  }
}

/* ------------------------------ 2. toda ferramenta pronta tem módulo e página */
for (const f of ferramentasProntas) {
  const módulo = join(RAIZ, 'scripts', 'ferramentas', `${f.slug}.js`);
  const página = join(RAIZ, 'f', f.slug, 'index.html');
  if (!await existe(módulo)) reclamar(`${f.id} (${f.slug}) está como pronta mas não tem módulo em scripts/ferramentas/.`);
  if (!await existe(página)) reclamar(`${f.id} (${f.slug}) está como pronta mas a página não foi gerada.`);
}

/* ------------------------ 3. módulo órfão: existe código sem entrada no catálogo */
const pastaDeFerramentas = join(RAIZ, 'scripts', 'ferramentas');
if (await existe(pastaDeFerramentas)) {
  for (const arquivo of await readdir(pastaDeFerramentas)) {
    if (!arquivo.endsWith('.js')) continue;
    const slug = arquivo.replace(/\.js$/, '');
    const entrada = ferramentas.find((f) => f.slug === slug);
    if (!entrada) reclamar(`Existe o módulo ${arquivo} sem ferramenta correspondente no catálogo.`);
    else if (entrada.status !== 'pronta') avisar(`${arquivo} existe mas ${entrada.id} ainda está como planejada.`);
  }
}

/* ----------------------------------- 4. todo import aponta para arquivo existente */
const scripts = await listar(join(RAIZ, 'scripts'), (c) => c.endsWith('.js'));
const dados = await listar(join(RAIZ, 'dados'), (c) => c.endsWith('.js'));
for (const arquivo of [...scripts, ...dados, join(RAIZ, 'ferramentas', 'gerar.mjs'), join(RAIZ, 'ferramentas', 'modelo-de-página.mjs')]) {
  const conteúdo = await readFile(arquivo, 'utf8');
  for (const [, caminho] of conteúdo.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    // Imports dinâmicos com variável não podem ser conferidos aqui.
    if (caminho.includes('${')) continue;
    const destino = resolve(dirname(arquivo), caminho);
    if (!await existe(destino)) {
      reclamar(`${relative(RAIZ, arquivo)} importa "${caminho}", que não existe.`);
    }
  }
}

/* ------------------------------------- 5. páginas geradas: links e estrutura */
// Prévia interna da vitrine animada (noindex, não gerada pelo catálogo): fica fora das regras de página.
const PRÉVIAS = ['vitrine/vitrine.html'];
const páginas = await listar(RAIZ, (c) => c.endsWith('.html') && !PRÉVIAS.includes(relative(RAIZ, c).replace(/\\/g, '/')));
const títulos = new Map();
const sitemapGerado = await readFile(join(RAIZ, 'sitemap.xml'), 'utf8').catch(() => '');
const baseSitemap = sitemapGerado.match(/<loc>(https:\/\/[^<]+)<\/loc>/u)?.[1];
const origemPublica = baseSitemap ? new URL(baseSitemap) : null;

for (const página of páginas) {
  const html = await readFile(página, 'utf8');
  const relativo = relative(RAIZ, página).replace(/\\/g, '/');

  const título = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  if (!título) reclamar(`${relativo} está sem <title>.`);
  else if (títulos.has(título)) reclamar(`Título repetido em ${relativo} e ${títulos.get(título)}: "${título}".`);
  else títulos.set(título, relativo);

  const h1 = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1 !== 1) reclamar(`${relativo} tem ${h1} elementos <h1>; o certo é exatamente 1.`);

  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) {
    reclamar(`${relativo} está sem descrição útil no <meta name="description">.`);
  }
  // O idioma da página precisa bater com a pasta: en/ é inglês, o resto é português.
  const esperado = relativo.startsWith('en/') ? 'en' : 'pt-BR';
  if (!html.includes(`<html lang="${esperado}"`)) reclamar(`${relativo} deveria declarar <html lang="${esperado}">.`);
  // hreflang recíproco: a página equivalente existe e aponta de volta para esta.
  const resolverPar = (de, destino) => {
    // Produção e Pages usam hreflang HTTPS absoluto. Só aceitamos a URL base
    // declarada no sitemap e continuamos conferindo o HTML local correspondente.
    if (/^https?:\/\//u.test(destino)) {
      if (!origemPublica) return null;
      const url = new URL(destino);
      if (url.origin !== origemPublica.origin || !url.pathname.startsWith(origemPublica.pathname)
          || url.search || url.hash) return null;
      const relativo = decodeURI(url.pathname.slice(origemPublica.pathname.length));
      const arquivo = (!relativo || relativo.endsWith('/')) ? join(relativo, 'index.html') : relativo;
      const local = resolve(RAIZ, arquivo);
      return local.startsWith(RAIZ + sep) ? local : null;
    }
    return resolve(dirname(de), destino === './' ? 'index.html' : destino.endsWith('/') ? join(destino, 'index.html') : destino);
  };
  for (const [, código, destino] of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) {
    if (código === 'x-default') continue;
    const alvoDoPar = resolverPar(página, destino);
    if (!await existe(alvoDoPar)) { reclamar(`${relativo}: o hreflang ${código} aponta para "${destino}", que não existe.`); continue; }
    const volta = await readFile(alvoDoPar, 'utf8');
    const apontaDeVolta = [...volta.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
      .some(([, c, d]) => c !== 'x-default' && resolverPar(alvoDoPar, d) === página);
    if (!apontaDeVolta) reclamar(`${relativo}: a página "${destino}" não aponta de volta (hreflang recíproco).`);
  }

  // Links internos precisam existir no disco.
  for (const [, destino] of html.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) {
    if (destino.startsWith('http') || destino.startsWith('//') || destino.startsWith('data:')) continue;
    const alvo = destino.endsWith('/') ? join(destino, 'index.html') : destino;
    // "/estilos/…" é raiz do site (a 404 usa isso); o resto é relativo à página.
    const caminhoAbsoluto = destino.startsWith('/') ? join(RAIZ, decodeURI(alvo)) : resolve(dirname(página), decodeURI(alvo));
    if (!await existe(caminhoAbsoluto)) {
      reclamar(`${relativo} aponta para "${destino}", que não existe.`);
    }
  }
}

/* ------------------------------------------- 6. sobras de desenvolvimento */
const PROIBIDOS = [
  // Sem `i`: em português "todo" e "todos" são palavras comuns; só a forma
  // toda em maiúsculas é marcação de tarefa esquecida no código.
  { padrão: /\b(TODO|FIXME|XXX|HACK)\b/, motivo: 'marcação de tarefa pendente' },
  { padrão: /\bem breve\b/i, motivo: 'promessa sem prazo' },
  { padrão: /\blorem ipsum\b/i, motivo: 'texto de preenchimento' },
  { padrão: /console\.log\(/, motivo: 'registro de depuração' },
  { padrão: /\bdebugger\b/, motivo: 'ponto de parada esquecido' },
];
for (const arquivo of [...scripts, ...dados, ...páginas]) {
  const conteúdo = await readFile(arquivo, 'utf8');
  for (const { padrão, motivo } of PROIBIDOS) {
    if (padrão.test(conteúdo)) {
      reclamar(`${relative(RAIZ, arquivo).replace(/\\/g, '/')} contém ${motivo}.`);
    }
  }
}

/* ------------------------------ 8. nome do site e vitrine em dia com o catálogo */
// O nome só pode estar escrito em dados/site.js; o resto lê de lá.
const NOME_COMPLETO = `${site.destaque} ${site.complemento}`;
const códigoDoSite = [
  ...await listar(join(RAIZ, 'dados'), (c) => c.endsWith('.js')),
  ...await listar(join(RAIZ, 'scripts'), (c) => /\.(js|mjs)$/.test(c)),
  ...await listar(join(RAIZ, 'vitrine'), (c) => /\.(js|mjs|css)$/.test(c) && !c.includes(join('vitrine', 'ferramentas'))),
  ...await listar(join(RAIZ, 'estilos'), (c) => c.endsWith('.css')),
  join(RAIZ, 'ferramentas', 'gerar.mjs'), join(RAIZ, 'ferramentas', 'modelo-de-página.mjs'),
];
for (const arquivo of códigoDoSite) {
  const relativo = relative(RAIZ, arquivo).replace(/\\/g, '/');
  if (relativo === 'dados/site.js') continue;
  if ((await readFile(arquivo, 'utf8')).includes(NOME_COMPLETO)) {
    reclamar(`${relativo} escreve o nome do site à mão; leia de dados/site.js.`);
  }
}

// vitrine-números.js é gerado: se o catálogo mudou e ninguém rodou "npm run gerar", está velho.
const númerosDaVitrine = await readFile(join(RAIZ, 'vitrine', 'vitrine-números.js'), 'utf8').catch(() => '');
if (!númerosDaVitrine.includes(`prontas: ${ferramentasProntas.length},`)) {
  reclamar('vitrine/vitrine-números.js está desatualizado em relação ao catálogo. Rode "npm run gerar".');
}

// As capas estáticas da vitrine (quem não tem JavaScript ou anda sem movimento vê só elas) são
// desenhadas pelo mesmo código da animação. Se esse código mudou depois da última capa, a capa mente.
const resumoDaCapa = (await readFile(join(RAIZ, ARQUIVO_DO_RESUMO), 'utf8').catch(() => '')).trim();
if (resumoDaCapa !== await calcularResumoDaCapa(RAIZ)) {
  reclamar('As capas da vitrine estão desatualizadas em relação ao código da animação. Rode "npm run vitrine:capas".');
}

/* -------------------------------------- 7. nomes de arquivo normalizados */
for (const arquivo of [...scripts, ...dados, ...páginas]) {
  const nome = relative(RAIZ, arquivo);
  if (nome !== nome.normalize('NFC')) {
    reclamar(`O nome do arquivo ${nome} não está normalizado em NFC.`);
  }
}

/* ---------------------------------------------------------- resultado */
console.log(`Verificadas ${páginas.length} páginas, ${scripts.length} scripts e ${ferramentas.length} entradas de catálogo.`);
for (const aviso of avisos) console.log(`  aviso: ${aviso}`);
if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s):`);
  for (const problema of problemas) console.error(`  - ${problema}`);
  process.exitCode = 1;
} else {
  console.log('Nenhum problema encontrado.');
}
