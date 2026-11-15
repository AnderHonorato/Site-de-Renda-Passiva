/** Browser real do editor: anota texto/imagem, move por teclado e reabre a exportação. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { PDFDocument } from '../../recursos/pdf-lib.esm.min.js';
import { matrizesDeTexto } from '../auxiliares/pdf-de-teste.mjs';
import { geometriaDaPágina, paraEspaçoDoPdf } from '../../scripts/cálculos/pdf-páginas.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4479, BASE = `http://127.0.0.1:${PORT}`;
let chromium;
for (const load of [
  () => createRequire(import.meta.url)('playwright').chromium,
  () => createRequire(join(ROOT, '..', 'ander-flow', 'package.json'))('playwright').chromium,
]) { try { chromium = load(); break; } catch {} }
if (!chromium) try { chromium = (await import('/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/playwright/driver/package/index.mjs')).chromium; } catch {}
const skip = chromium ? false : 'Playwright não disponível';
let server, browser;
function pngVermelho() {
  const crc=(bytes)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;};
  const chunk=(tipo,conteudo)=>{const t=Buffer.from(tipo),dados=Buffer.concat([t,conteudo]),tam=Buffer.alloc(4),soma=Buffer.alloc(4);tam.writeUInt32BE(conteudo.length);soma.writeUInt32BE(crc(dados));return Buffer.concat([tam,dados,soma]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(2,0);ihdr.writeUInt32BE(2,4);ihdr[8]=8;ihdr[9]=6;
  const row=Buffer.from([0,255,0,0,255,255,0,0,255,255,0,0,255,255,0,0,255]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.concat([row,row]))),chunk('IEND',Buffer.alloc(0))]);
}
before(async () => {
  if (!chromium) return;
  server = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORT), '--local'], { cwd: ROOT, stdio: 'ignore' });
  for (let i=0;i<60;i++) { try { if ((await fetch(`${BASE}/`)).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
});
after(async()=>{ await browser?.close(); server?.kill(); });

test('upload, prévia PNG, anotação por toque, teclado e exportação reaberta', { skip }, async()=>{
  const doc = await PDFDocument.create();
  const page=doc.addPage([360,480]);
  const font=await doc.embedFont('Helvetica');
  page.drawText('Página original', {x:30,y:440,size:18,font});
  const pdf=Buffer.from(await doc.save());
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7ioAAAAASUVORK5CYII=','base64');
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const pageUi=await context.newPage(); const errors=[]; pageUi.on('pageerror',e=>errors.push(String(e)));
  await pageUi.goto(`${BASE}/f/editar-pdf/`,{waitUntil:'networkidle'});
  await pageUi.setInputFiles('#campo-arquivo',{name:'original.pdf',mimeType:'application/pdf',buffer:pdf});
  await pageUi.waitForFunction(()=>document.querySelector('[data-count]')?.textContent.includes('Página 1 de 1'));
  await pageUi.evaluate(()=>{ window.__editorEvents=[]; const svg=document.querySelector('[data-overlay]'); for(const type of ['pointerdown','click']) svg.addEventListener(type,e=>window.__editorEvents.push({type,x:e.clientX,y:e.clientY}),true); });
  await pageUi.locator('[data-overlay]').click({position:{x:95,y:100}});
  await pageUi.locator('[data-overlay] [data-i="0"]').waitFor();
  const firstClick=await pageUi.evaluate(()=>({events:window.__editorEvents,box:(()=>{const r=document.querySelector('[data-i="0"] rect');return {x:Number(r.getAttribute('x')),y:Number(r.getAttribute('y')),w:Number(r.getAttribute('width')),h:Number(r.getAttribute('height'))}})()}));
  assert.deepEqual(firstClick.events.map(e=>e.type),['pointerdown','click'],'the editor receives real pointerdown and click DOM events');
  await pageUi.locator('[data-overlay] [data-i="0"]').focus();
  await pageUi.keyboard.press('ArrowRight');
  const movedBox=await pageUi.evaluate(()=>{const r=document.querySelector('[data-i="0"] rect');return {x:Number(r.getAttribute('x')),y:Number(r.getAttribute('y')),w:Number(r.getAttribute('width')),h:Number(r.getAttribute('height'))}});
  assert.ok(movedBox.x>firstClick.box.x,'ArrowRight moves the selected annotation in the preview');
  await pageUi.getByRole('button',{name:'Imagem PNG/JPG'}).click();
  await pageUi.locator('[data-overlay]').click({position:{x:175,y:175}});
  await pageUi.locator('[data-image]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:png});
  await pageUi.locator('[data-overlay] image').waitFor();
  await pageUi.getByRole('button',{name:'Texto',exact:true}).click();
  await pageUi.locator('[data-text]').fill('Texto do teste');
  await pageUi.locator('[data-overlay]').click({position:{x:120,y:230}});
  const lastBox=await pageUi.evaluate(()=>{const r=document.querySelector('[data-i="2"] rect');return {x:Number(r.getAttribute('x')),y:Number(r.getAttribute('y')),w:Number(r.getAttribute('width')),h:Number(r.getAttribute('height'))}});
  await pageUi.getByRole('button',{name:'Linha'}).click();
  await pageUi.locator('[data-overlay]').click({position:{x:220,y:280}});
  await pageUi.locator('[data-overlay] [data-i="3"] line').waitFor();
  await pageUi.getByRole('button',{name:'Exportar PDF'}).click();
  await pageUi.getByRole('button',{name:'Baixar PDF editado'}).waitFor();
  const [download]=await Promise.all([pageUi.waitForEvent('download'),pageUi.getByRole('button',{name:'Baixar PDF editado'}).click()]);
  const bytes=await readFile(await download.path()); const output=await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(),1);
  const contents=output.getPage(0).node.Contents(); assert.ok(contents,'output includes page content streams');
  const { PDFName } = await import('../../recursos/pdf-lib.esm.min.js');
  const xobjects=output.getPage(0).node.Resources().lookup(PDFName.of('XObject'));
  assert.ok(xobjects?.entries?.().length > 0,'PNG image is embedded in the output PDF');
  const matrices=matrizesDeTexto(output,0);
  const placed=matrices.at(-2); // o último texto adicionado fica em cima da anotação anterior
  const last=matrices.at(-1);
  assert.ok(Math.abs(placed[4]-movedBox.x)<0.1,`exported PDF x ${placed[4]} matches preview x ${movedBox.x}`);
  assert.ok(Math.abs(placed[5]-(480-movedBox.y-movedBox.h))<0.1,`exported PDF y ${placed[5]} matches preview y ${480-movedBox.y-movedBox.h}`);
  assert.ok(Math.abs(last[4]-lastBox.x)<0.1,'final click x coordinate matches the preview');
  assert.ok(Math.abs(last[5]-(480-lastBox.y-lastBox.h))<0.1,'final click y coordinate matches the preview');
  assert.deepEqual(errors,[]);
  await context.close();
});

test('CropBox et rotações 90°/270°: prévia SVG bate com os pixels do PDF exportado', { skip }, async()=>{
  for(const rotation of [90,270]){
    const source=await PDFDocument.create();
    const sourcePage=source.addPage([800,900]);
    sourcePage.setCropBox(40,50,520,700);
    sourcePage.setRotation((await import('../../recursos/pdf-lib.esm.min.js')).degrees(rotation));
    const sourceBytes=Buffer.from(await source.save());
    const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
    const ui=await context.newPage();const errors=[];ui.on('pageerror',e=>errors.push(String(e)));
    await ui.goto(`${BASE}/f/editar-pdf/`,{waitUntil:'networkidle'});
    await ui.setInputFiles('#campo-arquivo',{name:`cortado-${rotation}.pdf`,mimeType:'application/pdf',buffer:sourceBytes});
    await ui.waitForFunction(()=>document.querySelector('[data-count]')?.textContent.includes('Página 1 de 1'));
    const overlayBounds=await ui.locator('[data-overlay]').boundingBox();
    await ui.getByRole('button',{name:'Imagem PNG/JPG'}).click();
    await ui.locator('[data-overlay]').click({position:{x:overlayBounds.width*.15,y:overlayBounds.height*.15}});
    await ui.locator('[data-image]').setInputFiles({name:'pixel-vermelho.png',mimeType:'image/png',buffer:pngVermelho()});
    await ui.locator('[data-overlay] [data-i="0"] image').waitFor();
    await ui.getByRole('button',{name:'Retângulo'}).click();
    await ui.locator('[data-overlay]').click({position:{x:overlayBounds.width*.45,y:overlayBounds.height*.35}});
    await ui.locator('[data-overlay] [data-i="1"] > rect').first().waitFor();
    await ui.getByRole('button',{name:'Texto',exact:true}).click();
    await ui.locator('[data-text]').fill('Após rotação');
    await ui.locator('[data-overlay]').click({position:{x:overlayBounds.width*.7,y:overlayBounds.height*.6}});
    await ui.locator('[data-overlay] [data-i="2"]').waitFor();
    const shapes=await ui.evaluate(()=>{
      const coords=(sel)=>{const n=document.querySelector(sel);return Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(n.getAttribute(k))]));};
      return {image:coords('[data-i="0"] image'),rect:coords('[data-i="1"] rect'),text:coords('[data-i="2"] rect'),textInk:(()=>{const b=document.querySelector('[data-i="2"] text').getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height}})(),view:document.querySelector('[data-overlay]').getAttribute('viewBox')};
    });
    await ui.getByRole('button',{name:'Exportar PDF'}).click();
    await ui.getByRole('button',{name:'Baixar PDF editado'}).waitFor();
    const [download]=await Promise.all([ui.waitForEvent('download'),ui.getByRole('button',{name:'Baixar PDF editado'}).click()]);
    const outputBytes=await readFile(await download.path());
    const output=await PDFDocument.load(outputBytes);const page=output.getPage(0);
    assert.equal(page.getRotation().angle,rotation);
    const view=geometriaDaPágina(page);
    const textMatrix=matrizesDeTexto(output,0).at(-1);
    const expected=paraEspaçoDoPdf(view,shapes.text.x,view.altura-shapes.text.y-shapes.text.height);
    assert.ok(Math.abs(textMatrix[4]-expected.x)<0.1 && Math.abs(textMatrix[5]-expected.y)<0.1,'rotated/cropped text origin follows the visible SVG coordinates');
    const pixels=await ui.evaluate(async ({b64,image,rect,text})=>{
      const pdfjs=await import('/recursos/pdfjs/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='/recursos/pdfjs/pdf.worker.mjs';
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      const doc=await pdfjs.getDocument({data:bytes,useWasm:false,disableFontFace:true,verbosity:0}).promise;
      const p=await doc.getPage(1),vp=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
      await p.render({canvas:c,canvasContext:c.getContext('2d'),viewport:vp,background:'#ffffff'}).promise;
      const ctx=c.getContext('2d'),sample=(x,y)=>[...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data],data=ctx.getImageData(0,0,c.width,c.height).data;
      const scan=(box)=>{let minX=c.width,minY=c.height,maxX=-1,maxY=-1;const x0=Math.max(0,Math.floor(box.x-6)),x1=Math.min(c.width,Math.ceil(box.x+box.width+6)),y0=Math.max(0,Math.floor(box.y-6)),y1=Math.min(c.height,Math.ceil(box.y+box.height+6));for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const k=(y*c.width+x)*4,r=data[k],g=data[k+1],b=data[k+2];if(r>100&&r>g*1.5&&b<150){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}return {minX:minX===c.width?-1:minX,minY:minY===c.height?-1:minY,maxX,maxY};};
      return {width:c.width,height:c.height,image:sample(image.x+image.width/2,image.y+image.height/2),rectPixels:scan(rect),textPixels:scan(text)};
    },{b64:outputBytes.toString('base64'),image:shapes.image,rect:shapes.rect,text:shapes.textInk});
    const parse=(s)=>s.split(' ').map(Number);
    assert.ok(Math.abs(pixels.width-parse(shapes.view)[2])<1 && Math.abs(pixels.height-parse(shapes.view)[3])<1,'PDF.js output page dimensions match the preview SVG viewBox');
    // Use points in the overlay viewBox as pixels at scale 1. Sample the red image
    // center, the rectangle top border, and its right border in PDF.js output.
    assert.ok(pixels.image[0]>220 && pixels.image[1]<50 && pixels.image[2]<50,`PNG occupies its preview box in rendered PDF.js output (${rotation}°)`);
    assert.ok(Math.abs(pixels.rectPixels.minX-shapes.rect.x)<=2 && Math.abs(pixels.rectPixels.maxX-(shapes.rect.x+shapes.rect.width))<=2,`PDF.js rectangle horizontal pixels match SVG (${rotation}°): ${JSON.stringify(pixels.rectPixels)} vs ${JSON.stringify(shapes.rect)}`);
    assert.ok(Math.abs(pixels.rectPixels.minY-shapes.rect.y)<=2 && Math.abs(pixels.rectPixels.maxY-(shapes.rect.y+shapes.rect.height))<=2,`PDF.js rectangle vertical pixels match SVG (${rotation}°): ${JSON.stringify(pixels.rectPixels)} vs ${JSON.stringify(shapes.rect)}`);
    assert.ok(pixels.textPixels.minX>=0 && Math.abs(pixels.textPixels.minX-shapes.textInk.x)<=6 && Math.abs(pixels.textPixels.minY-shapes.textInk.y)<=6,`PDF.js rendered text ink begins near its SVG bounds (${rotation}°): ${JSON.stringify(pixels.textPixels)} vs ${JSON.stringify(shapes.textInk)}`);
    assert.deepEqual(errors,[]);
    await context.close();
  }
});
