import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { acharChromium,abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ=join(import.meta.dirname,'../..'),BASE='http://127.0.0.1:4474';
const chromium=acharChromium(),pular=chromium?false:'Playwright não encontrado';
let servidor,navegador;
before(async()=>{
  if(!chromium)return;
  servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta','4474','--local'],{cwd:RAIZ,stdio:'ignore'});
  for(let n=0;n<60;n++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  navegador=await abrirNavegador(chromium);
});
after(async()=>{await navegador?.close();servidor?.kill();});

async function abrir({itens=[],anuncios=false,visto=1}={}) {
  const contexto=await navegador.newContext({viewport:{width:1280,height:800}});
  if(visto!==null)await contexto.addCookies([{name:'visto_novidades',value:String(visto),url:BASE}]);
  let externos=0;
  await contexto.route('**/*',rota=>{
    const u=new URL(rota.request().url());
    if(u.origin!==BASE){externos++;return rota.abort();}
    if(u.pathname==='/api/anuncios')return rota.fulfill({contentType:'application/json',body:JSON.stringify({ativo:anuncios,permitido:anuncios,demonstracao:anuncios,editor:null,blocos:anuncios?{lista:'demonstracao',rodape:'demonstracao',resultado:'demonstracao'}:{}})});
    if(u.pathname==='/api/novidades')return rota.fulfill({contentType:'application/json',body:JSON.stringify({itens})});
    if(u.pathname.startsWith('/api/'))return rota.fulfill({contentType:'application/json',body:JSON.stringify({usuario:null,chat_habilitado:false})});
    return rota.continue();
  });
  const página=await contexto.newPage();return {contexto,página,externos:()=>externos};
}

test('publicidade local exige escolha, aparece entre listas e não chama o Google',{skip:pular},async()=>{
  const {contexto,página,externos}=await abrir({anuncios:true});
  try {
    await página.goto(BASE+'/ferramentas.html',{waitUntil:'networkidle'});
    assert.equal(await página.locator('.publicidade-demonstracao').count(),0);
    await página.getByRole('button',{name:'Só o essencial',exact:true}).click();
    await página.locator('[data-anuncio-posicao="lista"]').first().scrollIntoViewIfNeeded();
    await página.waitForSelector('.publicidade-demonstracao');
    assert.equal(await página.locator('[data-anuncio-posicao]').count(),3);
    assert.match(await página.locator('.publicidade-demonstracao').first().textContent(),/Demonstração local/);
    assert.equal(externos(),0);assert.equal(await página.locator('script[data-script-adsense]').count(),0);
    await página.screenshot({path:join(RAIZ,'.execucao','publicidade-previa-2026-10-07.png')});
    await página.goto(BASE+'/cookies.html');await página.getByRole('button',{name:'Recusar anúncios',exact:true}).click();
    await página.goto(BASE+'/ferramentas.html',{waitUntil:'networkidle'});
    assert.equal(await página.locator('.publicidade-demonstracao').count(),0);
  } finally {await contexto.close();}
});

test('novidade inédita abre uma vez, escreve texto hostil como texto e não repete após fechar',{skip:pular},async()=>{
  const itens=[{id:1,revisao:2,titulo:'<img src=x onerror=alert(1)>',texto:'Notícia nova',url:'javascript:alert(1)',botao:'Abrir'}];
  const {contexto,página}=await abrir({itens});
  try {
    await página.goto(BASE+'/',{waitUntil:'networkidle'});await página.waitForSelector('.boas-vindas[open]');
    assert.equal(await página.locator('.boas-vindas__slide h2').textContent(),itens[0].titulo);
    assert.equal(await página.locator('.boas-vindas__slide img,.boas-vindas__slide a').count(),0);
    assert.equal(await página.locator('.boas-vindas__segmentos').isVisible(),false);
    await página.keyboard.press('Escape');await página.waitForSelector('.boas-vindas',{state:'detached'});
    assert.equal((await contexto.cookies()).find(c=>c.name==='visto_novidades').value,'2');
    await página.reload({waitUntil:'networkidle'});await página.waitForTimeout(1600);
    assert.equal(await página.locator('.boas-vindas').count(),0);
  } finally {await contexto.close();}
});

test('novidades aguardam consentimento, têm segmentos e navegação de teclado',{skip:pular},async()=>{
  const itens=[{id:1,revisao:2,titulo:'Primeira',texto:'Texto um'},{id:2,revisao:3,titulo:'Segunda',texto:'Texto dois'}];
  const {contexto,página}=await abrir({itens,anuncios:true});
  try {
    await página.goto(BASE+'/',{waitUntil:'networkidle'});await página.waitForTimeout(1800);
    assert.equal(await página.locator('.boas-vindas[open]').count(),0);
    await página.getByRole('button',{name:'Recusar anúncios',exact:true}).click();await página.waitForSelector('.boas-vindas[open]');
    assert.equal(await página.locator('.boas-vindas__segmentos i').count(),2);
    await página.keyboard.press('ArrowRight');assert.match(await página.locator('[data-bv-posicao]').textContent(),/Item 2 de 2/);
    await página.keyboard.press('ArrowLeft');assert.match(await página.locator('[data-bv-posicao]').textContent(),/Item 1 de 2/);
    await página.keyboard.press('Escape');
    await página.goto(BASE+'/f/porcentagem/',{waitUntil:'networkidle'});await página.waitForTimeout(1200);
    assert.equal(await página.locator('.boas-vindas').count(),0);
  } finally {await contexto.close();}
});
