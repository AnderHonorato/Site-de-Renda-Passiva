/** Flower UI: conversa local/offline, acessibilidade, olhos, erros e viewport móvel. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ=join(dirname(fileURLToPath(import.meta.url)),'..','..');
let PORTA,BASE;
let chromium=null;for(const carregar of [()=>createRequire(import.meta.url)('playwright'),()=>createRequire(join(RAIZ,'..','ander-flow','package.json'))('playwright'),()=>createRequire(join(RAIZ,'..','..','..','..','ander-flow','package.json'))('playwright')]){try{chromium=carregar().chromium;break;}catch{}}
const pular=chromium?false:'Playwright não encontrado';let servidor,navegador;
before(async()=>{if(!chromium)return;PORTA=await new Promise(ok=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});BASE=`http://127.0.0.1:${PORTA}`;servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta',String(PORTA),'--local'],{cwd:RAIZ,stdio:'ignore'});for(let i=0;i<70;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}navegador=await chromium.launch().catch(()=>chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));});
after(async()=>{await navegador?.close();servidor?.kill();});

test('Flower local: FAQ offline, IA com erro, foco, olhos, movimento reduzido e 390px', {skip:pular,timeout:60000},async()=>{
  const context=await navegador.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const posts=[],external=[];
  page.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
  await page.route('**/api/flower/status',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"indisponivel"}'}));
  await page.route('**/api/flower/chat',r=>{posts.push(r.request().postDataJSON());return r.fulfill({status:502,contentType:'application/json',body:'{"erro":"flower_provedor_indisponivel"}'});});
  await page.goto(`${BASE}/404.html`,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('link[href$="flower.css"]').count(),1,'CSS global da Flower está integrado');
  const fab=page.locator('.flower__fab');await fab.waitFor();await fab.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await page.locator('.flower__close').evaluate(e=>document.activeElement===e),true);
  const chatFab=await page.evaluate(()=>{const b=document.createElement('button');b.className='chat__bolha';document.body.append(b);return b.getBoundingClientRect().toJSON();});
  const flowerFab=await fab.boundingBox();assert.ok(flowerFab.y+flowerFab.height<=chatFab.y,'Flower fica acima da bolha do chat sem sobreposição');
  assert.equal(await page.locator('#flower-status').textContent(),'Respostas padrão');
  await page.locator('.flower__input').fill('Como encontro o portal?');await page.locator('.flower__form button').click();
  await page.locator('.flower__messages').getByText(/Abra Ferramentas e pesquise/u).waitFor();await page.waitForFunction(()=>document.querySelector('.flower__dialog').dataset.state==='idle');assert.equal(posts.length,0,'FAQ offline não chama endpoint de chat');
  await page.setViewportSize({width:320,height:568});
  let bounds=await page.locator('.flower__dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=320&&bounds.y+bounds.height<=568,'chat cabe em 320×568');
  await page.setViewportSize({width:320,height:320});bounds=await page.locator('.flower__dialog').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=320,'chat acompanha viewport reduzido pelo teclado');
  await page.setViewportSize({width:390,height:844});
  const pupil=page.locator('#flower-modal-left');
  await dialog.dispatchEvent('pointermove',{clientX:20,clientY:100});await page.waitForTimeout(40);const first=await pupil.getAttribute('style');
  await dialog.dispatchEvent('pointermove',{clientX:370,clientY:700});await page.waitForTimeout(40);const second=await pupil.getAttribute('style');assert.notEqual(first,second,'pupila acompanha o ponteiro no modal');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.flower__avatar .flower__eyes').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('.flower__input').fill('Você consegue consultar minha conta privada?');await page.locator('.flower__form button').click();
  await page.locator('.flower__messages').getByText(/Flower não acessa sua conta/u).waitFor();assert.equal(posts.length,0,'modo offline nunca finge consultar a conta');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/api/flower/status',r=>r.fulfill({status:200,contentType:'application/json',body:'{"online":true,"provider":"openai","model":"modelo-teste"}'}));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.flower__fab').click();await page.locator('.flower__input').fill('Qual a previsão do tempo na minha rua?');await page.locator('.flower__form button').click();
  await page.locator('.flower__messages').getByText(/precisa da IA online/u).waitFor();assert.equal(posts.length,1,'um envio produz exatamente uma chamada');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'sem rolagem horizontal no celular');
  await page.keyboard.press('Escape');assert.equal(await dialog.isHidden(),true);assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('flower__fab')),true);
  await page.goto(`${BASE}/admin/flower/`,{waitUntil:'domcontentloaded'});
  await page.locator('#flower-admin-form').waitFor();
  assert.equal(await page.locator('input[name="apiKey"]').getAttribute('type'),'password','o campo de chave é password');
  assert.equal(await page.locator('#flower-admin-save').isDisabled(),true,'a página estática não permite salvar uma chave');
  await page.getByText(/página estática não pode salvar chaves/u).waitFor();
  assert.deepEqual(external,[]);await context.close();
});


test('Flower laranja: movimento real, reconexão sem reenvio e teclado via visualViewport', {skip:pular,timeout:60000}, async()=>{
  const context=await navegador.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{
    const vv=new EventTarget();Object.assign(vv,{height:844,width:390,offsetTop:0,offsetLeft:0});
    Object.defineProperty(window,'visualViewport',{value:vv,configurable:true});window.__flowerViewport=vv;
  });
  const page=await context.newPage();let connected=false,statusGets=0,posts=0,finish;
  await page.route('**/api/flower/status',r=>{statusGets++;return r.fulfill({json:{online:connected,provider:'openai',model:'teste'}});});
  await page.route('**/api/flower/chat',async r=>{posts++;await new Promise(resolve=>finish=resolve);await r.fulfill({json:{reply:'Resposta online de teste'}});});
  await page.goto(`${BASE}/404.html`);await page.locator('.flower__fab').click();
  await page.getByText('Respostas padrão',{exact:true}).waitFor();
  assert.equal(await page.locator('.flower__skin').first().evaluate(e=>getComputedStyle(e).fill),'rgb(255, 139, 61)');
  assert.equal(await page.locator('.flower__hair,.flower__smile').count(),0,'personagem simples com dois olhos, sem rosto humano');
  const motion=page.locator('.flower__avatar .flower__body');
  const before=await motion.evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(160);
  assert.notEqual(await motion.evaluate(e=>getComputedStyle(e).transform),before,'personagem se move de verdade');
  connected=true;await page.locator('.flower__retry').click();await page.getByText('IA online',{exact:true}).waitFor();
  assert.ok(statusGets>=2);assert.equal(posts,0,'reconectar apenas consulta status');
  await page.locator('.flower__input').fill('Explique as fases da Lua');await page.locator('.flower__send').click();
  await page.waitForFunction(()=>document.querySelector('.flower__dialog').dataset.state==='thinking');
  assert.equal(await motion.evaluate(e=>getComputedStyle(e).animationName),'flower-think');finish();
  await page.locator('.flower__messages').getByText('Resposta online de teste',{exact:true}).waitFor();assert.equal(posts,1);
  await page.evaluate(()=>{Object.assign(window.__flowerViewport,{height:300,offsetTop:150});window.__flowerViewport.dispatchEvent(new Event('resize'));});
  const input=await page.locator('.flower__input').boundingBox(),send=await page.locator('.flower__send').boundingBox();
  assert.ok(input.y>=150&&input.y+input.height<=450&&send.y+send.height<=450,'entrada e enviar ficam dentro da janela acima do teclado');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await motion.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.flower__fab').evaluate(e=>e.inert),false);
  await context.close();
});
