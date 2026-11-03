/**
 * Gera um único módulo ESM self-hosted para formatação.
 * Requer: npm install --no-save --no-package-lock --ignore-scripts
 *         prettier@3.9.10 sql-formatter@15.9.0 esbuild@0.25.12
 */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'scripts', 'terceiros', 'formatadores.js');
await mkdir(dirname(destino), { recursive: true });
const resultado = await build({
  entryPoints: [join(raiz, 'ferramentas', 'entradas', 'formatadores.mjs')],
  outfile: destino,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  legalComments: 'inline',
  logLevel: 'warning',
  metafile: true,
});
const saida = Object.values(resultado.metafile.outputs)
  .find((arquivo) => arquivo.entryPoint?.endsWith('formatadores.mjs'));
if(!saida) throw new Error('A entrada dos formatadores não apareceu no artefato do esbuild.');
if(saida.imports.length !== 0)
  throw new Error('O pacote final não é autossuficiente: ' + saida.imports.map(i=>i.path).join(', '));
if(saida.bytes < 100000) throw new Error('Pacote de formatação vazio ou incompleto.');
console.log('Formatadores locais autossuficientes: ' + destino + ' (' + saida.bytes + ' bytes).');
