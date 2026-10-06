/**
 * Monta a pasta que vai para o ar: `portal/publicação/`.
 *
 * Copia só o que a lista branca de `política-de-segurança.mjs` permite. Testes, ferramentas
 * de desenvolvimento, imagens de verificação visual, `package.json` e documentação ficam
 * de fora. Gera também `_headers` com a política de conteúdo estrita.
 *
 * Uso: node ferramentas/publicar.mjs [pasta-de-destino]
 *      (rode `npm run gerar` antes, ou use `npm run construir`, que faz as duas coisas)
 */
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivoDeCabeçalhos, deveSerPublicado } from './política-de-segurança.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS_QUE_NUNCA_SÃO_VARRIDAS = new Set(['node_modules', 'testes', 'visuais', 'publicação', 'ferramentas', 'servidor', 'banco', 'scripts-admin']);

/** Lista os arquivos que entram na publicação, como caminhos relativos com barra normal. */
export async function listarPublicáveis(raiz = RAIZ) {
  const achados = [];
  async function varrer(pasta) {
    for (const entrada of await readdir(pasta, { withFileTypes: true })) {
      const caminho = join(pasta, entrada.name);
      const relativo = relative(raiz, caminho).replaceAll('\\', '/');
      if (entrada.isDirectory()) {
        // "ferramentas" da raiz é privada; scripts/ferramentas é código do navegador e entra.
        if (!relativo.includes('/') && PASTAS_QUE_NUNCA_SÃO_VARRIDAS.has(entrada.name)) continue;
        if (entrada.name.startsWith('.')) continue;
        await varrer(caminho);
      } else if (deveSerPublicado(relativo)) {
        achados.push(relativo);
      }
    }
  }
  await varrer(raiz);
  return achados.sort();
}

async function principal() {
  const destino = resolve(process.argv[2] ?? join(RAIZ, 'publicação'));
  if (destino === RAIZ || RAIZ.startsWith(destino)) {
    console.error('O destino não pode ser a pasta do portal nem uma pasta acima dela.');
    process.exitCode = 2;
    return;
  }
  try { await stat(join(RAIZ, 'index.html')); } catch {
    console.error('Não há index.html. Rode "npm run gerar" antes de publicar.');
    process.exitCode = 2;
    return;
  }

  // Só apaga uma pasta que esta própria ferramenta criou (tem o _headers dela) ou que está vazia.
  const existente = await readdir(destino).catch(() => null);
  if (existente && existente.length > 0 && !existente.includes('_headers')) {
    console.error(`${destino} já tem arquivos que não são de uma publicação anterior. Escolha uma pasta vazia.`);
    process.exitCode = 2;
    return;
  }

  const arquivos = await listarPublicáveis();
  await rm(destino, { recursive: true, force: true });
  for (const relativo of arquivos) {
    const saída = join(destino, relativo);
    await mkdir(dirname(saída), { recursive: true });
    await cp(join(RAIZ, relativo), saída);
  }
  await writeFile(join(destino, '_headers'), arquivoDeCabeçalhos(), 'utf8');
  console.log(`Publicação pronta em ${destino}: ${arquivos.length} arquivos e _headers.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
