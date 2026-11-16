import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium } from '../../ferramentas/achar-playwright.mjs';

const RAIZ=join(dirname(fileURLToPath(import.meta.url)),'..','..');
let BASE,PORTA,servidor,navegador;
const chromium=acharChromium();
const pular=chromium?false:'Playwright não encontrado';

before(async()=>{
  if(!chromium)return;
  PORTA=await new Promise(ok=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});
  BASE=`http://127.0.0.1:${PORTA}`;
  servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta',String(PORTA),'--local'],{cwd:RAIZ,stdio:'ignore'});
  for(let i=0;i<70;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  navegador=await chromium.launch().catch(()=>chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
});
after(async()=>{await navegador?.close();servidor?.kill();});

async function abrir(url,{width=390,dark=false,logado=false}={}){
  const context=await navegador.newContext({viewport:{width,height:844},colorScheme:dark?'dark':'light'});
  // Este cenário mede o cabeçalho; o modal inicial de novidades tem testes próprios.
  await context.addCookies([{name:'visto_novidades',value:'999999999999999',url:BASE}]);
  await context.route('**/api/autenticacao/sessao',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(logado?{usuario:{id:7,nome:'Pessoa Teste',usuario:'pessoa',avatar:'sol',plano:'free',papel:'usuario'}}:{usuario:null})}));
  const page=await context.newPage();
  await page.goto(BASE+url,{waitUntil:'domcontentloaded'});
  await page.locator('.conta-topo').waitFor();
  return {context,page};
}

test('CTA login/cadastro da capa é claro, navegável e cabe nas larguras solicitadas', {skip:pular,timeout:60000},async()=>{
  for(const idioma of ['pt','en']) for(const width of [320,390,768,1280]) {
    const caminho=idioma==='en'?'/en/':'/';
    const {context,page}=await abrir(caminho,{width,dark:width===320});
    try {
      const cta=page.locator('.conta-topo--inicio .conta-topo__login-cadastro');
      await cta.waitFor({state:'visible'});
      assert.equal((await cta.innerText()).trim(),idioma==='en'?'Sign in/register':'Login/cadastro');
      assert.equal(await cta.getAttribute('aria-label'),idioma==='en'?'Sign in or register':'Login ou cadastro');
      assert.equal(await page.locator('#abrir-preferencias').getAttribute('aria-label'),idioma==='en'?'Theme and language':'Tema e idioma');
      assert.equal(await page.locator('#abrir-preferencias').getAttribute('title'),idioma==='en'?'Theme and language':'Tema e idioma');
      if(width>=768) assert.equal((await page.locator('#abrir-preferencias').innerText()).trim(),idioma==='en'?'Theme and language':'Tema e idioma');
      const href=await cta.getAttribute('href');
      assert.equal(new URL(href,page.url()).pathname,idioma==='en'?'/en/entrar.html':'/entrar.html');
      const layout=await page.evaluate(()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};};
        const nomes=['.busca-topo','.notificações','#preferencias-visitante','.conta-topo'];
        const caixas=nomes.map(s=>{const e=document.querySelector(s);return e?{nome:s,...rect(e)}:null;}).filter(Boolean);
        const cruza=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
        const conflitos=[];for(let i=0;i<caixas.length;i++)for(let j=i+1;j<caixas.length;j++)if(cruza(caixas[i],caixas[j]))conflitos.push([caixas[i].nome,caixas[j].nome]);
        return {largura:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,caixas,conflitos};
      });
      assert.ok(layout.scroll<=layout.largura,`${idioma} ${width}px sem overflow: ${JSON.stringify(layout)}`);
      assert.deepEqual(layout.conflitos,[],`${idioma} ${width}px sem sobreposição de busca, sino, preferências ou acesso`);
      if(width===1280) {
        const buscaAntes=await page.locator('.busca-topo').boundingBox();
        await cta.hover();
        const buscaDepois=await page.locator('.busca-topo').boundingBox();
        assert.equal(buscaAntes.x,buscaDepois.x,'hover não desloca a busca');
        assert.equal(await cta.evaluate(e=>getComputedStyle(e).animationName),'login-cadastro-pulso');
      }
      if(width===320) {
        await page.emulateMedia({reducedMotion:'reduce'});
        assert.equal(await cta.evaluate(e=>getComputedStyle(e).animationName),'none','movimento reduzido desativa o pulso');
      }
    } finally {await context.close();}
  }
});

test('CTA só aparece para visitantes da capa; conta conectada e páginas internas mantêm o fluxo próprio', {skip:pular,timeout:60000},async()=>{
  const visitante=await abrir('/',{width:390});
  try {
    assert.equal(await visitante.page.locator('.conta-topo__login-cadastro').count(),1);
  } finally {await visitante.context.close();}
  const logado=await abrir('/',{width:390,logado:true});
  try {
    assert.equal(await logado.page.locator('.conta-topo--inicio').count(),0);
    assert.equal(await logado.page.locator('.conta-topo--usuario .conta-topo__gatilho').count(),1);
    assert.equal(await logado.page.locator('.conta-topo__avatar').count(),1);
  } finally {await logado.context.close();}
  const interno=await abrir('/ferramentas.html',{width:390});
  try {
    assert.equal(await interno.page.locator('.conta-topo--inicio').count(),0);
    assert.equal(await interno.page.locator('.conta-topo__entrar').count(),1);
    assert.equal(await interno.page.locator('.conta-topo__criar').count(),1);
  } finally {await interno.context.close();}
});
