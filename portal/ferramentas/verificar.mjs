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
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ferramentas, ferramentasProntas, conferirCatálogo } from '../dados/catálogo.js';
import { nomesDeÍcone } from '../scripts/núcleo/ícones.js';

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
      if (['node_modules', 'publicação', 'recursos'].includes(entrada.name)) continue;
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
const páginas = await listar(RAIZ, (c) => c.endsWith('.html'));
const títulos = new Map();

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
  if (!html.includes('lang="pt-BR"')) reclamar(`${relativo} não declara lang="pt-BR".`);

  // Links internos precisam existir no disco.
  for (const [, destino] of html.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) {
    if (destino.startsWith('http') || destino.startsWith('//') || destino.startsWith('data:')) continue;
    const alvo = destino.endsWith('/') ? join(destino, 'index.html') : destino;
    const caminhoAbsoluto = resolve(dirname(página), decodeURI(alvo));
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
