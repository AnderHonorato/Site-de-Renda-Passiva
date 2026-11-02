/**
 * Resumo (SHA-256) do código que desenha as capas estáticas da vitrine.
 *
 * `vitrine/ferramentas/vitrine-gerar-capas.mjs` grava o resumo em
 * `vitrine/imagens/capas.sha256` quando redesenha as capas, e `verificar.mjs` confere se o
 * código mudou depois disso. Assim uma capa que mostra o que o site já não diz é barrada.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Arquivos que, se mudarem, podem mudar o desenho da capa (caminhos relativos a vitrine/).
 * vitrine-números.js fica de fora de propósito: a capa é o quadro final (a assinatura) e não mostra
 * a contagem de ferramentas; incluí-lo faria cada ferramenta nova acusar a capa como velha.
 */
export const FONTES_DA_CAPA = Object.freeze([
  'vitrine-cenas.js', 'vitrine-motor.js', 'vitrine-textos.js', '../dados/site.js',
]);

export async function calcularResumoDaCapa(raiz) {
  const resumo = createHash('sha256');
  for (const nome of FONTES_DA_CAPA) {
    resumo.update(nome).update(await readFile(join(raiz, 'vitrine', nome), 'utf8').catch(() => ''));
  }
  return resumo.digest('hex');
}

export const ARQUIVO_DO_RESUMO = 'vitrine/imagens/capas.sha256';
