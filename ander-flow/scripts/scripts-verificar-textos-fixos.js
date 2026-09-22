#!/usr/bin/env node
// scripts-verificar-textos-fixos.js — HTML sem texto solto nem style=/onclick=/<script> inline/
// innerHTML; JS de frontend/ sem literal de texto visível em textContent/placeholder/title/
// aria-label nem innerHTML; nenhuma cor literal fora dos três arquivos de tokens de tema.
// Ignora node_modules, frontend/compartilhado/bibliotecas, testes/ e docs/.
// Uso: node scripts/scripts-verificar-textos-fixos.js [--raiz <pasta>]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PASTAS_IGNORADAS = new Set(['node_modules', 'bibliotecas', 'testes', 'docs']);
const ARQUIVOS_DE_TOKENS_DE_COR = new Set([
  'compartilhado-tokens.css',
  'compartilhado-tema-claro.css',
  'compartilhado-tema-escuro.css',
]);

function listarArquivos(pasta, filtro) {
  const resultado = [];
  if (!existsSync(pasta)) return resultado;
  for (const nome of readdirSync(pasta)) {
    if (PASTAS_IGNORADAS.has(nome)) continue;
    const caminho = join(pasta, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) resultado.push(...listarArquivos(caminho, filtro));
    else if (filtro(caminho)) resultado.push(caminho);
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Funções puras (recebem o conteúdo do arquivo como texto), testáveis sem disco.
// ---------------------------------------------------------------------------

/** Símbolos soltos aceitos como texto puro no HTML, sem precisar de chave de idioma. */
const SIMBOLOS_PUROS = /^[\s/·—]*$/;

/** Devolve os textos soltos (fora de chave de idioma) encontrados entre tags no HTML. Função pura. */
export function encontrarTextoSolto(html) {
  let semComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
  // Remove blocos <script>...</script> inteiros (json de dados ou módulo) — não são "texto solto".
  semComentarios = semComentarios.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>');
  const pedacos = semComentarios.split(/<[^>]+>/g);
  const encontrados = [];
  for (const pedaco of pedacos) {
    const decodificado = pedaco.replace(/&nbsp;/g, ' ');
    if (SIMBOLOS_PUROS.test(decodificado)) continue;
    const limpo = decodificado.trim();
    if (limpo) encontrados.push(limpo);
  }
  return encontrados;
}

/** `<script>` sem `src=` e sem `type="application/json"` → script inline proibido. Função pura. */
export function encontrarScriptInline(html) {
  const encontrados = [];
  const expressao = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let correspondencia;
  while ((correspondencia = expressao.exec(html))) {
    const atributos = correspondencia[1];
    const conteudo = correspondencia[2].trim();
    const temSrc = /\bsrc\s*=/.test(atributos);
    const ehJson = /type\s*=\s*["']application\/json["']/.test(atributos);
    if (!temSrc && !ehJson && conteudo) encontrados.push(conteudo.slice(0, 60));
  }
  return encontrados;
}

/** `style=`, `onclick=` (ou outro `on*=`) no HTML. Função pura. */
export function encontrarAtributosProibidos(html) {
  const encontrados = [];
  if (/\sstyle\s*=\s*["']/.test(html)) encontrados.push('style=');
  const correspondenciaEvento = html.match(/\son[a-z]+\s*=\s*["']/i);
  if (correspondenciaEvento) encontrados.push(correspondenciaEvento[0].trim());
  return encontrados;
}

/** `#abc`/`#aabbcc`/`rgb(`/`rgba(` fora dos arquivos de tokens de tema. Função pura. */
export function encontrarCorLiteral(conteudo) {
  const encontrados = [];
  const expressaoHex = /(?<![\w-])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let correspondencia;
  while ((correspondencia = expressaoHex.exec(conteudo))) encontrados.push(correspondencia[0]);
  const expressaoRgb = /\brgba?\(/g;
  while ((correspondencia = expressaoRgb.exec(conteudo))) encontrados.push(correspondencia[0]);
  return encontrados;
}

/** `innerHTML`/`outerHTML`/`insertAdjacentHTML` no JS. Função pura. */
export function encontrarInnerHtml(js) {
  const correspondencia = js.match(/\.(innerHTML|outerHTML|insertAdjacentHTML)\b/g);
  return correspondencia ?? [];
}

/** Literal de texto visível atribuído a textContent/placeholder/title/value/aria-label no JS. Função pura. */
export function encontrarTextoLiteralEmJs(js) {
  const encontrados = [];
  const expressaoPropriedade = /\.(textContent|placeholder|title|value)\s*=\s*(['"])((?:(?!\2)[^\\]|\\.)+)\2/g;
  let correspondencia;
  while ((correspondencia = expressaoPropriedade.exec(js))) {
    encontrados.push(`${correspondencia[1]} = ${correspondencia[2]}${correspondencia[3]}${correspondencia[2]}`);
  }
  const expressaoAtributo = /\.setAttribute\(\s*(['"])(placeholder|aria-label|title|alt|style)\1\s*,\s*(['"])((?:(?!\3)[^\\]|\\.)+)\3/g;
  while ((correspondencia = expressaoAtributo.exec(js))) {
    encontrados.push(`setAttribute(${correspondencia[2]}, ${correspondencia[3]}${correspondencia[4]}${correspondencia[3]})`);
  }
  return encontrados;
}

/** Roda a verificação completa em `raiz` (pasta frontend/) e devolve a lista de problemas. */
export function verificarTextosFixos(raiz) {
  const problemas = [];
  const pastaFrontend = join(raiz, 'frontend');

  for (const caminho of listarArquivos(pastaFrontend, (c) => c.endsWith('.html'))) {
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    const conteudo = readFileSync(caminho, 'utf8');
    for (const texto of encontrarTextoSolto(conteudo)) problemas.push(`${rotulo}: texto solto no HTML: "${texto}"`);
    for (const trecho of encontrarScriptInline(conteudo)) problemas.push(`${rotulo}: <script> inline: "${trecho}"`);
    for (const atributo of encontrarAtributosProibidos(conteudo)) problemas.push(`${rotulo}: atributo proibido (${atributo})`);
    for (const cor of encontrarCorLiteral(conteudo)) problemas.push(`${rotulo}: cor literal fora dos tokens (${cor})`);
  }

  for (const caminho of listarArquivos(pastaFrontend, (c) => c.endsWith('.js'))) {
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    const conteudo = readFileSync(caminho, 'utf8');
    for (const trecho of encontrarInnerHtml(conteudo)) problemas.push(`${rotulo}: uso proibido de ${trecho}`);
    for (const trecho of encontrarTextoLiteralEmJs(conteudo)) problemas.push(`${rotulo}: texto visível fixo no JS (${trecho}) — use t()`);
    for (const cor of encontrarCorLiteral(conteudo)) problemas.push(`${rotulo}: cor literal fora dos tokens (${cor})`);
  }

  for (const caminho of listarArquivos(pastaFrontend, (c) => c.endsWith('.css'))) {
    if (ARQUIVOS_DE_TOKENS_DE_COR.has(basename(caminho))) continue;
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    const conteudo = readFileSync(caminho, 'utf8');
    for (const cor of encontrarCorLiteral(conteudo)) problemas.push(`${rotulo}: cor literal fora dos tokens (${cor})`);
  }

  return problemas;
}

function ehModuloPrincipal() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (ehModuloPrincipal()) {
  const raizPadrao = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const argumentos = process.argv.slice(2);
  const indiceRaiz = argumentos.indexOf('--raiz');
  const raiz = resolve(indiceRaiz >= 0 ? argumentos[indiceRaiz + 1] : raizPadrao);

  const problemas = verificarTextosFixos(raiz);
  if (problemas.length) {
    console.error(`REPROVADO: ${problemas.length} problema(s) de texto fixo/estilo:`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exit(1);
  }
  console.log('APROVADO: sem texto fixo, estilo inline ou cor literal fora dos tokens.');
}
