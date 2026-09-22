// scripts-copiar-bibliotecas.js — copia bibliotecas e fontes do node_modules para o frontend.
// Roda sozinho no "postinstall". Os arquivos copiados ficam fora do git.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const modulos = join(raiz, 'node_modules');
const destinoBibliotecas = join(raiz, 'frontend', 'compartilhado', 'bibliotecas');
const destinoFontes = join(raiz, 'frontend', 'compartilhado', 'fontes');

const copias = [
  ['pdf-lib/dist/pdf-lib.esm.min.js', destinoBibliotecas, 'pdf-lib.esm.min.js'],
  ['xlsx/xlsx.mjs', destinoBibliotecas, 'xlsx.mjs'],
  ['@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2', destinoFontes, 'instrument-sans-latin-400-normal.woff2'],
  ['@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2', destinoFontes, 'instrument-sans-latin-500-normal.woff2'],
  ['@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2', destinoFontes, 'instrument-sans-latin-600-normal.woff2'],
  ['@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff2', destinoFontes, 'instrument-sans-latin-700-normal.woff2'],
  ['@fontsource/instrument-sans/files/instrument-sans-latin-400-italic.woff2', destinoFontes, 'instrument-sans-latin-400-italic.woff2'],
  ['@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2', destinoFontes, 'newsreader-latin-opsz-normal.woff2'],
  ['@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2', destinoFontes, 'newsreader-latin-opsz-italic.woff2'],
];

let faltando = 0;
for (const [origem, pasta, nome] of copias) {
  const caminhoOrigem = join(modulos, origem);
  if (!existsSync(caminhoOrigem)) {
    console.warn(`Aviso: não encontrei ${origem}. Rode "npm install" de novo.`);
    faltando++;
    continue;
  }
  mkdirSync(pasta, { recursive: true });
  copyFileSync(caminhoOrigem, join(pasta, nome));
}
console.log(`Bibliotecas e fontes copiadas (${copias.length - faltando} de ${copias.length}).`);
