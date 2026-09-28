// portal/vitrine/ferramentas/vitrine-renderizar-video.mjs
// Gera os vídeos da vitrine a partir do mesmo código do site: abre vitrine.html num
// Chromium sem janela, desenha cada quadro no instante exato e envia para o ffmpeg.
//
// Requisitos (só para gerar vídeo; o site não precisa de nada disso):
//   npm i -D playwright && npx playwright install chromium
//   ffmpeg no PATH
//
// Uso (dentro de portal/):
//   npm run vitrine:video                                        → paisagem + retrato, pt-BR
//   npm run vitrine:video -- --formato retrato --idioma en --fps 60
// Saída: portal/vitrine/midia/

import http from 'node:http';
import { readFile, stat, mkdir, writeFile, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { gerarTrilha } from './vitrine-trilha.mjs';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const SAÍDA = fileURLToPath(new URL('../midia/', import.meta.url));
const DURAÇÃO = 15;
const FORMATOS = { paisagem: [1920, 1080], retrato: [1080, 1920] };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json' };

function lerArgumento(nome, padrão) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrão;
}

async function importarNavegador() {
  for (const pacote of ['playwright', 'playwright-core']) {
    try { return (await import(pacote)).chromium; } catch { /* tenta o próximo */ }
  }
  console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

function exigirFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (r.status !== 0) { console.error('ffmpeg não encontrado no PATH. Instale e rode de novo.'); process.exit(1); }
}

function servirRepositório() {
  const servidor = http.createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const absoluto = join(RAIZ, normalize(caminho).replace(/^([/\\]|\.\.[/\\])+/, ''));
      if (!absoluto.startsWith(RAIZ)) { res.writeHead(400); return res.end(); }
      const info = await stat(absoluto);
      if (!info.isFile()) throw new Error('não é arquivo');
      res.writeHead(200, { 'content-type': TIPOS[extname(absoluto)] || 'application/octet-stream' });
      res.end(await readFile(absoluto));
    } catch { res.writeHead(404); res.end(); }
  });
  // Porta 0: o sistema escolhe uma livre, sem conflito com a 3000 ou com o portal.
  return new Promise((resolver) => servidor.listen(0, '127.0.0.1', () => resolver(servidor)));
}

async function renderizar(navegador, porta, formato, idioma, fps, trilha) {
  const [l, a] = FORMATOS[formato];
  const página = await navegador.newPage({ viewport: { width: l, height: a }, deviceScaleFactor: 1 });
  página.on('pageerror', (e) => console.error('Erro na página:', e.message));
  await página.goto(`http://127.0.0.1:${porta}/portal/vitrine/vitrine.html?render=${l}x${a}&idioma=${encodeURIComponent(idioma)}`);
  await página.waitForFunction(() => window.vitrineRender);
  await página.evaluate(() => window.vitrineRender.pronto);

  const sufixo = idioma === 'pt-BR' ? '' : `-${idioma}`;
  const arquivo = join(SAÍDA, `vitrine-15s-${formato}${sufixo}.mp4`);
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-i', trilha,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
    arquivo,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const terminou = new Promise((resolver, rejeitar) => ffmpeg.on('close', (c) => (c === 0 ? resolver() : rejeitar(new Error(`ffmpeg saiu com código ${c}`)))));

  const total = Math.round(DURAÇÃO * fps);
  for (let i = 0; i < total; i++) {
    await página.evaluate((t) => window.vitrineRender.quadro(t), i / fps);
    const quadro = await página.screenshot({ type: 'png' });
    if (!ffmpeg.stdin.write(quadro)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${formato}: ${Math.round((i / total) * 100)}%   `);
  }
  ffmpeg.stdin.end();
  await terminou;

  await página.evaluate(() => window.vitrineRender.quadro(14.29));
  await writeFile(join(SAÍDA, `vitrine-capa-${formato}${sufixo}.png`), await página.screenshot({ type: 'png' }));
  await página.close();
  console.log(`\r${formato}: pronto → ${arquivo}`);
}

const formato = lerArgumento('formato', 'ambos');
const idioma = lerArgumento('idioma', 'pt-BR');
const fps = Number(lerArgumento('fps', '30'));
if (![24, 25, 30, 50, 60].includes(fps)) { console.error('Use --fps 24, 25, 30, 50 ou 60.'); process.exit(1); }
const formatos = formato === 'ambos' ? Object.keys(FORMATOS) : [formato];
if (formatos.some((f) => !FORMATOS[f])) { console.error('Use --formato paisagem, retrato ou ambos.'); process.exit(1); }

exigirFfmpeg();
const chromium = await importarNavegador();
await mkdir(SAÍDA, { recursive: true });
const trilha = join(SAÍDA, '.trilha-temporaria.wav');
await writeFile(trilha, gerarTrilha());
const servidor = await servirRepositório();
const navegador = await chromium.launch(process.env.CHROMIUM_CAMINHO ? { executablePath: process.env.CHROMIUM_CAMINHO } : {});
try {
  for (const f of formatos) await renderizar(navegador, servidor.address().port, f, idioma, fps, trilha);
} finally {
  await navegador.close();
  servidor.close();
  await rm(trilha, { force: true });
}
