/** FFmpeg single-thread local, fixado e carregado apenas quando houver uma edição. */
import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const motor = join(raiz, 'node_modules/@ffmpeg/core');
const cliente = join(raiz, 'node_modules/@ffmpeg/ffmpeg');
for (const [pasta, versao] of [[motor, '0.12.10'], [cliente, '0.12.15']]) {
  if (JSON.parse(await readFile(join(pasta, 'package.json'))).version !== versao) throw new Error(`Versão inesperada do motor de mídia: ${versao}.`);
}
const hashes = {
  'ffmpeg-core.js': '67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3',
  'ffmpeg-core.wasm': '9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7',
};
const destinoMotor = join(raiz, 'recursos/midia');
const destinoCliente = join(raiz, 'scripts/terceiros/midia');
await mkdir(destinoMotor, { recursive: true });
await mkdir(destinoCliente, { recursive: true });
for (const [arquivo, esperado] of Object.entries(hashes)) {
  const bytes = await readFile(join(motor, 'dist/esm', arquivo));
  if (createHash('sha256').update(bytes).digest('hex') !== esperado) throw new Error(`Integridade inesperada de ${arquivo}.`);
  await writeFile(join(destinoMotor, arquivo), bytes);
}
for (const arquivo of await readdir(join(cliente, 'dist/esm'))) {
  if (arquivo.endsWith('.js')) await cp(join(cliente, 'dist/esm', arquivo), join(destinoCliente, arquivo));
}
// Nenhuma biblioteca usa CDN: até os valores padrão apontam aos arquivos locais.
const constantes = join(destinoCliente, 'const.js');
await writeFile(constantes, (await readFile(constantes, 'utf8')).replace(
  /export const CORE_URL = `[^`]+`;/u,
  "export const CORE_URL = new URL('../../../recursos/midia/ffmpeg-core.js', import.meta.url).href;",
));
await cp(join(raiz, 'ferramentas/licencas/ffmpeg-core-GPL-2.0.txt'), join(destinoMotor, 'GPL-2.0.txt'));
await cp(join(raiz, 'ferramentas/licencas/ffmpeg-wrapper-MIT.txt'), join(destinoCliente, 'MIT.txt'));
await writeFile(join(destinoMotor, 'AVISOS.txt'), [
  'FFmpeg WebAssembly single-thread @ffmpeg/core 0.12.10 — GPL-2.0-or-later.',
  'Cliente @ffmpeg/ffmpeg 0.12.15 — MIT. Copyright Jerome Wu e colaboradores.',
  'Código-fonte, receitas de compilação, licenças e releases correspondentes:',
  'https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core',
  'https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/ffmpeg',
  'https://github.com/ffmpegwasm/ffmpeg.wasm/releases/tag/v0.12.10',
  'https://www.ffmpeg.org/legal.html',
  JSON.stringify(hashes, null, 2), '',
].join('\n'));
console.log('Motor de mídia local preparado: FFmpeg core 0.12.10 + cliente 0.12.15.');
