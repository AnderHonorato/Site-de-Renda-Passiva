/**
 * Encontra o Playwright sem exigir dependência no portal.
 *
 * No monorrepo ele vive em `ander-flow/node_modules`; o portal não instala nada. A busca sobe
 * pelas pastas acima (serve também para um worktree dentro de `.claude/worktrees/...`, que fica
 * debaixo da raiz do monorrepo) e aceita `PLAYWRIGHT_PACOTE=<caminho de um package.json>`.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** @returns o `chromium` do Playwright, ou null se não houver */
export function acharChromium() {
  const candidatos = [() => createRequire(import.meta.url)('playwright')];
  if (process.env.PLAYWRIGHT_PACOTE) candidatos.push(() => createRequire(process.env.PLAYWRIGHT_PACOTE)('playwright'));
  for (let pasta = AQUI; ; pasta = dirname(pasta)) {
    if (existsSync(join(pasta, 'ander-flow', 'node_modules', 'playwright'))) {
      candidatos.push(() => createRequire(join(pasta, 'ander-flow', 'package.json'))('playwright'));
    }
    if (pasta === parse(pasta).root) break;
  }
  for (const carregar of candidatos) {
    try { return carregar().chromium; } catch { /* próximo */ }
  }
  return null;
}

/**
 * Abre o navegador. Por padrão tenta o Chromium do Playwright e cai para o Edge instalado;
 * com `{ edgePrimeiro: true }` a ordem se inverte (as medições de desempenho usam o Edge).
 */
export async function abrirNavegador(chromium, { edgePrimeiro = false } = {}) {
  if (process.env.PLAYWRIGHT_EXECUTAVEL) return chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTAVEL });
  const abrir = [() => chromium.launch(), () => chromium.launch({ channel: 'msedge' })];
  if (edgePrimeiro) abrir.reverse();
  try { return await abrir[0](); } catch { return abrir[1](); }
}
