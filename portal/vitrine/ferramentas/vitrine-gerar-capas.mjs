// portal/vitrine/ferramentas/vitrine-gerar-capas.mjs
// Redesenha as capas estáticas da vitrine (quadro final, t = 14,29 s) a partir do mesmo código
// da animação e grava o resumo que o `npm run verificar` confere.
//
// Requisitos (só para gerar capa; o site não precisa de nada disso):
//   npm i -D playwright && npx playwright install chromium   (ou o Edge instalado no Windows)
//
// Uso (dentro de portal/):  npm run vitrine:capas
// Saída: portal/vitrine/imagens/vitrine-capa-paisagem.webp, vitrine-capa-retrato.webp, capas.sha256

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ARQUIVO_DO_RESUMO, calcularResumoDaCapa } from '../../ferramentas/resumo-da-capa.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const PORTA = 4417;
const QUADRO_FINAL = 14.29;
const CAPAS = [
  ['vitrine-capa-paisagem.webp', 1280, 720, ''],
  ['vitrine-capa-retrato.webp', 720, 1280, '&formato=retrato'],
];

async function importarNavegador() {
  const tentativas = [
    () => import('playwright'),
    () => import('playwright-core'),
    // No monorrepo, o Playwright vive em ander-flow/.
    () => createRequire(new URL('../../../ander-flow/package.json', import.meta.url))('playwright'),
  ];
  for (const tentar of tentativas) {
    try { const módulo = await tentar(); return módulo.chromium ?? módulo.default?.chromium; } catch { /* próximo */ }
  }
  console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

async function abrirNavegador(chromium) {
  try { return await chromium.launch(); } catch { return chromium.launch({ channel: 'msedge' }); }
}

async function esperarServidor() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${PORTA}/`)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
  throw new Error('O servidor local não subiu.');
}

const servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
let navegador;
try {
  await esperarServidor();
  navegador = await abrirNavegador(await importarNavegador());
  for (const [arquivo, largura, altura, extra] of CAPAS) {
    const página = await navegador.newPage({ viewport: { width: largura, height: altura } });
    await página.goto(`http://127.0.0.1:${PORTA}/vitrine/vitrine.html?render=${largura}x${altura}${extra}`, { waitUntil: 'networkidle' });
    await página.evaluate(() => window.vitrineRender.pronto);
    await página.evaluate((t) => window.vitrineRender.quadro(t), QUADRO_FINAL);
    const url = await página.evaluate(() => document.querySelector('canvas').toDataURL('image/webp', 0.9));
    const bytes = Buffer.from(url.split(',')[1], 'base64');
    await writeFile(new URL(`../imagens/${arquivo}`, import.meta.url), bytes);
    console.log(`${arquivo}: ${largura}×${altura}, ${bytes.length} bytes`);
    await página.close();
  }
  await writeFile(new URL(`../../${ARQUIVO_DO_RESUMO}`, import.meta.url), `${await calcularResumoDaCapa(RAIZ)}\n`, 'utf8');
  console.log('Resumo gravado em vitrine/imagens/capas.sha256.');
} finally {
  await navegador?.close();
  servidor.kill();
}
