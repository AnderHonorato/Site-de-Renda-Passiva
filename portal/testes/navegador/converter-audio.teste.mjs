/** E2E do editor F191: áudio sintetizado, recorte com fades e exportação WAV/MP3. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4478;
const BASE = `http://127.0.0.1:${PORTA}`;
let chromium = null;
if (process.env.PLAYWRIGHT_MODULO) {
  try { chromium = (await import(pathToFileURL(process.env.PLAYWRIGHT_MODULO).href)).chromium; } catch { /* tenta os locais habituais */ }
}
for (const carregar of [
  () => createRequire(import.meta.url)('playwright'),
  () => createRequire(join(RAIZ, '..', 'ander-flow', 'package.json'))('playwright'),
  () => createRequire(join(RAIZ, '..', '..', '..', '..', 'ander-flow', 'package.json'))('playwright'),
]) { try { chromium = carregar().chromium; break; } catch { /* tenta o próximo local */ } }
const pular = chromium ? false : 'Playwright não encontrado';
let servidor, navegador;
before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) { try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* aguardando servidor */ } await new Promise((r) => setTimeout(r, 100)); }
  const executablePath = process.env.PLAYWRIGHT_EXECUTAVEL;
  navegador = await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox'] } : undefined)
    .catch(() => chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }));
});
after(async () => { await navegador?.close(); servidor?.kill(); });

test('tom local tem WAV recortado com fades e conversão MP3 real', { skip: pular, timeout: 180000 }, async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);
  const página = await contexto.newPage(); const erros = [];
  página.on('pageerror', (erro) => erros.push(String(erro)));
  página.on('console', (msg) => { if (msg.type() === 'error') erros.push(msg.text()); });
  await página.goto(`${BASE}/f/converter-audio/`, { waitUntil: 'networkidle' });
  await página.click('[data-role="demo"]');
  await página.waitForFunction(() => document.querySelector('[data-role="export"]')?.disabled === false, undefined, { timeout: 15000 });
  await página.fill('[data-role="start"]', '1'); await página.fill('[data-role="end"]', '3');
  await página.fill('[data-role="fade-in"]', '0.1'); await página.fill('[data-role="fade-out"]', '0.15');
  await página.locator('[data-role="speed"]').fill('200');
  await página.selectOption('[data-role="format"]', 'wav');
  const wavDownload = página.waitForEvent('download'); await página.click('[data-role="export"]');
  const wavResult = await wavDownload;
  assert.equal(wavResult.suggestedFilename(),'tom-de-exemplo-editado.wav','o download automático usa o nome de saída');
  const wav = await readFile(await wavResult.path());
  const player=página.locator('[data-role="result-audio"]');
  await página.waitForFunction(()=>{const a=document.querySelector('[data-role="result-audio"]');return a?.readyState>=1;},undefined,{timeout:10000});
  const preview=await player.evaluate(a=>({url:a.currentSrc,duration:a.duration}));
  assert.match(preview.url,/^blob:/,'a prévia usa o blob exportado');
  assert.ok(preview.duration>0.95&&preview.duration<1.05,`a prévia deve tocar o resultado de 1 s, não o original de 5 s (${preview.duration}s)`);
  const reDownload=página.waitForEvent('download');await página.click('[data-role="download-again"]');
  assert.equal((await reDownload).suggestedFilename(),'tom-de-exemplo-editado.wav','o botão baixa o resultado novamente');
  const progressoVisual=página.locator('[data-progressocontainer].execucao-visual');
  assert.equal(await progressoVisual.getAttribute('data-execucao-estado'),'concluído','a cena compartilhada mantém o estado de conclusão depois do download');
  assert.equal(await progressoVisual.locator('canvas').isVisible(),true,'o canvas decorativo permanece visível após o resultado');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  let cursor=12,hz=0,channels=0,bits=0,dataStart=-1,dataBytes=0;
  while(cursor+8<=wav.length){const tag=wav.toString('ascii',cursor,cursor+4),length=wav.readUInt32LE(cursor+4),body=cursor+8;
    if(tag==='fmt '){channels=wav.readUInt16LE(body+2);hz=wav.readUInt32LE(body+4);bits=wav.readUInt16LE(body+14);}
    if(tag==='data'){dataStart=body;dataBytes=length;break;}cursor=body+length+(length%2);
  }
  assert.ok(dataStart>=0 && hz>0 && channels>0 && bits===16,'WAV contém cabeçalho fmt e amostras PCM de 16 bits');
  const duration = dataBytes / (hz * channels * bits/8);
  assert.ok(duration > 0.95 && duration < 1.05, `dois segundos de entrada a 2× devem resultar em um segundo; saiu ${duration}s`);
  const view=new DataView(wav.buffer,wav.byteOffset+dataStart,dataBytes);
  const rms = (a, b) => { let sum=0,count=0;for(let i=a;i<b;i++){sum+=(view.getInt16(i*2,true)/32768)**2;count++;}return Math.sqrt(sum/Math.max(1,count)); };
  assert.ok(rms(0, Math.floor(hz*0.05*channels)) < rms(Math.floor(hz*0.4*channels), Math.floor(hz*0.5*channels))*0.65, 'fade inicial reduz a amplitude');
  await página.selectOption('[data-role="format"]', 'mp3');
  const mp3Download = página.waitForEvent('download'); await página.click('[data-role="export"]');
  const mp3 = await readFile(await (await mp3Download).path());
  assert.equal(await progressoVisual.getAttribute('data-execucao-estado'),'concluído','a segunda execução atualiza a mesma cena visual');
  assert.ok(mp3.length > 1000);
  assert.ok(mp3.subarray(0,3).toString('ascii') === 'ID3' || (mp3[0] === 0xff && (mp3[1] & 0xe0) === 0xe0), 'assinatura de quadro MP3');
  assert.deepEqual(erros, []);
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sem overflow em 390px');
  await contexto.close();
});
