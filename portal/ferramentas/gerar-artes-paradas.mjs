/** Deriva os 34 recortes estáticos dos desenhos existentes; não cria uma segunda identidade visual. */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function gerarArtesParadas(raiz = join(dirname(fileURLToPath(import.meta.url)), '..')) {
  const origem = join(raiz, 'recursos', 'ilustrações', 'categorias', 'mini');
  const destino = join(raiz, 'recursos', 'ilustrações', 'paradas-categorias', 'mini');
  await mkdir(destino, { recursive: true });
  const nomes = (await readdir(origem)).filter(nome => nome.endsWith('.svg'));
  for (const nome of nomes) {
    const svg = await readFile(join(origem, nome), 'utf8');
    const parado = svg.replace('</svg>', '<style>*{animation:none!important;transition:none!important}</style></svg>');
    await writeFile(join(destino, nome), parado);
  }
  return nomes.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`${await gerarArtesParadas()} recortes estáticos derivados das categorias.`);
}
