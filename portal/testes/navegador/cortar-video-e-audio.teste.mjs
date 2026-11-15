/** A prévia deve usar um arquivo de vídeo real criado no teste, sem solicitar uma conversão FFmpeg. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4469;
const BASE = `http://127.0.0.1:${PORTA}`;
let chromium = null;
if (process.env.PLAYWRIGHT_MODULO) {
  try { chromium = (await import(pathToFileURL(process.env.PLAYWRIGHT_MODULO).href)).chromium; } catch { /* tentativa local abaixo */ }
}
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
  () => createRequire(join(RAIZ, '..', '..', '..', '..', 'ander-flow', 'package.json'))('playwright'),
]) { try { chromium = carregar().chromium; break; } catch { /* tentativa seguinte */ } }
const pular = chromium ? false : 'Playwright não encontrado (npm i -D playwright)';
let servidor, navegador;

before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) { try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* inicialização */ } await new Promise((r) => setTimeout(r, 100)); }
  const execução = process.env.PLAYWRIGHT_EXECUTAVEL ? { executablePath: process.env.PLAYWRIGHT_EXECUTAVEL, args: ['--no-sandbox'] } : {};
  try { navegador = await chromium.launch(execução); } catch { navegador = await chromium.launch({ channel: 'msedge' }); }
});
after(async () => { await navegador?.close(); servidor?.kill(); });

test('arquivo WebM real é pré-visualizado e exportado de verdade como MP4, GIF e WAV', { skip: pular, timeout: 180000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const página = await contexto.newPage();
  const erros = [];
  página.on('pageerror', (erro) => erros.push(String(erro)));
  await página.goto(`${BASE}/f/cortar-video-e-audio/`, { waitUntil: 'networkidle' });

  const bytes = await página.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    const audio = new AudioContext(); await audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain(), saídaÁudio = audio.createMediaStreamDestination();
    oscillator.frequency.value = 440; gain.gain.value = 0.08; oscillator.connect(gain).connect(saídaÁudio); oscillator.start();
    const vídeo = canvas.captureStream(8);
    const stream = new MediaStream([...vídeo.getVideoTracks(), ...saídaÁudio.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    const partes = [];
    recorder.ondataavailable = (evento) => { if (evento.data.size) partes.push(evento.data); };
    recorder.start();
    for (let i = 0; i < 24; i += 1) {
      ctx.fillStyle = i % 2 ? '#b84e35' : '#263f59'; ctx.fillRect(0, 0, 64, 48);
      ctx.fillStyle = '#fff'; ctx.fillRect(i * 7, 12, 10, 10);
      await new Promise((resolve) => setTimeout(resolve, 130));
    }
    await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
    oscillator.stop(); stream.getTracks().forEach((track) => track.stop()); await audio.close();
    const data = new Uint8Array(await new Blob(partes, { type: 'video/webm' }).arrayBuffer());
    let binary = ''; for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  await página.locator('#campo-arquivo').setInputFiles({ name: 'fixture.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes, 'base64') });
  await página.locator('.editor-video__meta').waitFor();
  await página.waitForFunction(() => document.querySelector('.editor-video__meta')?.textContent.includes('64 × 48 px'), null, { timeout: 8000 });
  await página.waitForFunction(() => Number.isFinite(document.querySelector('.editor-video video')?.duration) && document.querySelector('.editor-video video').duration > 2.5, null, { timeout: 8000 });
  await página.locator('#editor-video-seek').evaluate((seek) => { seek.value = '500'; seek.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await página.locator('video').getAttribute('src') === null, false);
  assert.match(await página.locator('.editor-video__nota').textContent(), /prévia do arquivo original/i);
  await página.locator('[name="início"]').fill('1');
  await página.locator('[name="fim"]').fill('2');
  await página.locator('[name="velocidade"]').fill('2');

  await página.locator('#formulário button[type="submit"]').click();
  await página.locator('#resultado:not([hidden])').waitFor({ timeout: 150000 });
  const [mp4Download] = await Promise.all([
    página.waitForEvent('download', { timeout: 30000 }), página.locator('#resultado [data-arquivo="0"]').click(),
  ]);
  const mp4 = await readFile(await mp4Download.path());
  assert.ok(mp4.length > 100, 'FFmpeg produziu bytes de vídeo');
  assert.equal(mp4.toString('ascii', 4, 8), 'ftyp', 'arquivo MP4 tem assinatura ISO BMFF');
  assert.ok(mp4.includes(Buffer.from('mp4a')), 'MP4 contém a faixa de áudio AAC transcodificada');
  const mp4Base64 = mp4.toString('base64');
  const metadadosMp4 = await página.evaluate(async (base64) => {
    const binary = atob(base64), bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'video/mp4' }), url = URL.createObjectURL(blob);
    const player = document.createElement('video'); player.src = url;
    try { await new Promise((resolve, reject) => { player.onloadedmetadata = resolve; player.onerror = reject; }); return { width: player.videoWidth, height: player.videoHeight, duration: player.duration }; }
    finally { URL.revokeObjectURL(url); }
  }, mp4Base64);
  assert.deepEqual([metadadosMp4.width, metadadosMp4.height], [64, 48]);
  assert.ok(metadadosMp4.duration > 0.3 && metadadosMp4.duration < 0.9, `duração MP4 ${metadadosMp4.duration}s respeita o trecho acelerado de 1s a 2s`);
  const préviaMp4 = página.locator('#resultado .editor-video__resultado video');
  await página.waitForFunction(() => Number.isFinite(document.querySelector('#resultado .editor-video__resultado video')?.duration), null, { timeout: 8000 });
  assert.equal(await préviaMp4.evaluate((player) => player.videoWidth), 64);
  assert.ok(await préviaMp4.evaluate((player) => player.duration > 0.3 && player.duration < 0.9), 'prévia inline confirma a duração exportada');
  assert.match(await página.locator('#resultado .editor-video__resultado h3').textContent(), /fixture-editado\.mp4/);

  await página.locator('[name="formato"]').selectOption('gif');
  await página.locator('#formulário button[type="submit"]').click();
  await página.waitForFunction(() => document.querySelector('#resultado:not([hidden])')?.textContent.includes('fixture-editado.gif'), null, { timeout: 150000 });
  const [gifDownload] = await Promise.all([
    página.waitForEvent('download', { timeout: 30000 }), página.locator('#resultado [data-arquivo="0"]').click(),
  ]);
  const gif = await readFile(await gifDownload.path());
  assert.ok(gif.length > 100, 'FFmpeg produziu bytes de GIF');
  assert.ok(['GIF87a', 'GIF89a'].includes(gif.toString('ascii', 0, 6)), 'arquivo tem cabeçalho GIF válido');
  await página.waitForFunction(() => document.querySelector('#resultado .editor-video__resultado img')?.naturalWidth === 640, null, { timeout: 8000 });
  assert.match(await página.locator('#resultado .editor-video__resultado h3').textContent(), /fixture-editado\.gif/);
  assert.match(await página.locator('#resultado .editor-video__resultado .editor-video__nota').textContent(), /duração não medida para GIF/);

  await página.locator('[name="formato"]').selectOption('wav');
  await página.locator('#formulário button[type="submit"]').click();
  await página.waitForFunction(() => document.querySelector('#resultado:not([hidden])')?.textContent.includes('fixture-editado.wav'), null, { timeout: 150000 });
  const [wavDownload] = await Promise.all([
    página.waitForEvent('download', { timeout: 30000 }), página.locator('#resultado [data-arquivo="0"]').click(),
  ]);
  const wav = await readFile(await wavDownload.path());
  assert.ok(wav.length > 100, 'FFmpeg produziu bytes de áudio PCM');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF', 'arquivo tem cabeçalho RIFF/WAV válido');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE', 'arquivo contém formato WAVE');
  await página.waitForFunction(() => Number.isFinite(document.querySelector('#resultado .editor-video__resultado audio')?.duration), null, { timeout: 8000 });
  const préviaWav = página.locator('#resultado .editor-video__resultado audio');
  assert.ok(await préviaWav.evaluate((player) => player.duration > 0.3 && player.duration < 0.9), 'WAV exportado respeita o trecho acelerado');
  assert.match(await página.locator('#resultado .editor-video__resultado h3').textContent(), /fixture-editado\.wav/);

  await página.locator('[name="formato"]').selectOption('webm');
  await página.locator('#formulário button[type="submit"]').click();
  await página.waitForFunction(() => document.querySelector('#resultado:not([hidden])')?.textContent.includes('fixture-editado.webm'), null, { timeout: 60000 });
  const [webmDownload] = await Promise.all([
    página.waitForEvent('download', { timeout: 30000 }), página.locator('#resultado [data-arquivo="0"]').click(),
  ]);
  const webm = await readFile(await webmDownload.path());
  assert.ok(webm.length > 100, 'FFmpeg produziu bytes WebM');
  assert.equal(webm.toString('hex', 0, 4), '1a45dfa3', 'arquivo tem cabeçalho EBML/WebM válido');
  assert.ok(webm.includes(Buffer.from('A_VORBIS')), 'WebM contém faixa Vorbis');
  const webmBase64 = webm.toString('base64');
  const metadadosWebm = await página.evaluate(async (base64) => {
    const binary = atob(base64), bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' })), player = document.createElement('video'); player.src = url;
    try { await new Promise((resolve, reject) => { player.onloadedmetadata = resolve; player.onerror = reject; }); return { width: player.videoWidth, height: player.videoHeight, duration: player.duration }; }
    finally { URL.revokeObjectURL(url); }
  }, webmBase64);
  assert.deepEqual([metadadosWebm.width, metadadosWebm.height], [64, 48]);
  assert.ok(metadadosWebm.duration > 0.3 && metadadosWebm.duration < 0.9, `duração WebM ${metadadosWebm.duration}s respeita o trecho acelerado`);
  await página.waitForFunction(() => Number.isFinite(document.querySelector('#resultado .editor-video__resultado video')?.duration), null, { timeout: 8000 });
  assert.match(await página.locator('#resultado .editor-video__resultado h3').textContent(), /fixture-editado\.webm/);
  assert.equal(await página.locator('#resultado .editor-video__resultado').count(), 1, 'a prévia anterior foi substituída e o URL antigo removido');

  assert.deepEqual(erros, []);
  await contexto.close();
});
