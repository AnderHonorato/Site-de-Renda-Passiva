// Sincronizado de compartilhado/ferramentas/verificar-projeto.mjs — edite a origem e rode "npm run sincronizar" na raiz.
// Verificações estáticas do produto: links e recursos internos, importações de módulos,
// ícones do sprite, padrões proibidos (HTML em linha, innerHTML, alert…), nomes de
// arquivo em NFC, títulos únicos e pendências esquecidas. Sai com código 1 se houver erro.
// Uso, dentro da pasta do produto: npm run verificar
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(process.argv[2] ?? process.cwd());
const erros = [];
const IGNORADOS = new Set(['node_modules', 'publicação', '.git']);

function listarArquivos(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    if (IGNORADOS.has(entrada.name)) return [];
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
  });
}

const relativo = (arquivo) => path.relative(raiz, arquivo).split(path.sep).join('/');
const número = (texto, índice) => texto.slice(0, índice).split('\n').length;
const arquivos = listarArquivos(raiz);

for (const arquivo of arquivos) {
  const nome = relativo(arquivo);
  if (nome !== nome.normalize('NFC')) erros.push(`nome de arquivo fora da normalização NFC: ${nome}`);
}

const idsDoSprite = new Set();
const sprite = path.join(raiz, 'recursos', 'ícones', 'ícones.svg');
if (fs.existsSync(sprite)) for (const [, id] of fs.readFileSync(sprite, 'utf8').matchAll(/<symbol id="([^"]+)"/g)) idsDoSprite.add(id);

function verificarReferência(origem, arquivoDeOrigem, endereço, índice, texto) {
  if (/^(https?:|mailto:|data:|blob:|#)/.test(endereço) || endereço === '') return;
  const [semÂncora, âncora] = endereço.split('#');
  const caminho = semÂncora.split('?')[0];
  let alvo;
  try {
    alvo = path.resolve(path.dirname(arquivoDeOrigem), decodeURIComponent(caminho));
  } catch {
    erros.push(`${origem}:${número(texto, índice)} endereço mal codificado: ${endereço}`);
    return;
  }
  if (caminho && !fs.existsSync(alvo)) erros.push(`${origem}:${número(texto, índice)} destino inexistente: ${endereço}`);
  else if (caminho.endsWith('ícones.svg') && âncora && !idsDoSprite.has(âncora)) erros.push(`${origem}:${número(texto, índice)} ícone inexistente no sprite: ${âncora}`);
}

const páginas = arquivos.filter((arquivo) => {
  const nome = relativo(arquivo);
  return nome === 'index.html' || /^páginas\/[^/]+\.html$/.test(nome);
});
if (páginas.length === 0) erros.push('nenhuma página gerada: rode npm run gerar.');
const títulos = new Map();
for (const página of páginas) {
  const nome = relativo(página);
  const texto = fs.readFileSync(página, 'utf8');
  for (const correspondência of texto.matchAll(/\s(?:href|src)="([^"]*)"/g)) verificarReferência(nome, página, correspondência[1], correspondência.index, texto);
  const regras = [
    [/<script(?![^>]*\ssrc=)[^>]*>/g, 'script em linha'],
    [/<style[\s>]/g, 'bloco <style> em linha'],
    [/\sstyle="/g, 'atributo style em linha'],
    [/\son[a-z]+="/g, 'manipulador de evento em linha'],
    [/href="#"/g, 'link sem destino (#)'],
  ];
  for (const [padrão, descrição] of regras) for (const achado of texto.matchAll(padrão)) erros.push(`${nome}:${número(texto, achado.index)} ${descrição}`);
  const título = /<title>([^<]*)<\/title>/.exec(texto)?.[1];
  if (!título) erros.push(`${nome}: sem <title>`);
  else if (títulos.has(título)) erros.push(`${nome}: título repetido de ${títulos.get(título)}`);
  else títulos.set(título, nome);
  if (!/<meta name="description" content="[^"]+"/.test(texto)) erros.push(`${nome}: sem meta description`);
  if ((texto.match(/<h1[\s>]/g) ?? []).length !== 1) erros.push(`${nome}: deve ter exatamente um <h1>`);
}

const PROIBIDOS_EM_JS = [
  [/\.(inner|outer)HTML\s*=/g, 'atribuição a innerHTML/outerHTML'],
  [/insertAdjacentHTML\s*\(/g, 'insertAdjacentHTML'],
  [/document\.write\s*\(/g, 'document.write'],
  [/\beval\s*\(/g, 'eval'],
  [/new\s+Function\s*\(/g, 'new Function'],
  [/(^|[^.\w])(alert|confirm|prompt)\s*\(/g, 'alert/confirm/prompt'],
  [/setAttribute\(\s*['"](style|on\w+)['"]/g, 'atributo style/on* via setAttribute'],
];
// Substitui comentários por espaços (preservando as quebras de linha) para que menções
// em comentários, como "substitui confirm()", não sejam confundidas com código.
function semComentários(texto) {
  const apagar = (trecho) => trecho.replace(/[^\n]/g, ' ');
  return texto.replace(/\/\*[\s\S]*?\*\//g, apagar).replace(/(^|[\s;{}(),])\/\/.*$/gm, (trecho, antes) => antes + apagar(trecho.slice(antes.length)));
}

const scripts = arquivos.filter((arquivo) => /^scripts\/.+\.js$/.test(relativo(arquivo)));
for (const arquivo of scripts) {
  const nome = relativo(arquivo);
  const texto = fs.readFileSync(arquivo, 'utf8');
  const código = semComentários(texto);
  for (const [padrão, descrição] of PROIBIDOS_EM_JS) for (const achado of código.matchAll(padrão)) erros.push(`${nome}:${número(código, achado.index)} ${descrição}`);
  const especificadores = [
    ...texto.matchAll(/^\s*(?:import|export)\s[^;]*?\sfrom\s*['"]([^'"]+)['"]/gm),
    ...texto.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
    ...texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
  ];
  for (const correspondência of especificadores) {
    const especificador = correspondência[1];
    if (!especificador.startsWith('.')) {
      erros.push(`${nome}:${número(texto, correspondência.index)} importação não relativa: ${especificador}`);
      continue;
    }
    if (!fs.existsSync(path.resolve(path.dirname(arquivo), especificador))) erros.push(`${nome}:${número(texto, correspondência.index)} importação inexistente: ${especificador}`);
  }
}

const autorais = arquivos.filter((arquivo) => /^(scripts|conteúdo|estilos|testes)\/.+\.(js|html|css)$/.test(relativo(arquivo)) && !relativo(arquivo).startsWith('estilos/site.css'));
for (const arquivo of autorais) {
  const nome = relativo(arquivo);
  const texto = fs.readFileSync(arquivo, 'utf8');
  for (const achado of texto.matchAll(/\b(TODO|FIXME|XXX)\b|[Ll]orem ipsum/g)) erros.push(`${nome}:${número(texto, achado.index)} pendência esquecida: ${achado[0]}`);
  if (/\.\.\/compartilhado\//.test(texto)) erros.push(`${nome}: referência a ../compartilhado/ (o produto deve ser independente)`);
}

if (erros.length) {
  console.error(`Verificação encontrou ${erros.length} problema(s):`);
  for (const erro of erros) console.error(`  - ${erro}`);
  process.exit(1);
}
console.log(`Verificação concluída sem problemas: ${páginas.length} páginas, ${scripts.length} scripts.`);
