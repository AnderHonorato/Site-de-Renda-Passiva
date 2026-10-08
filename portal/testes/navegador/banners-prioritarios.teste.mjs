/** Testa o aviso prioritário no navegador, separado de sessão, conta e chat. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const PORTA=4468,BASE=`http://127.0.0.1:${PORTA}`;
const chromium=acharChromium(),pular=chromium?false:'Playwright não encontrado';
let servidor,navegador;

before(async()=>{
  if(!chromium)return;
  servidor=spawn(process.execPath,['ferramentas/servir.mjs','.', '--porta',String(PORTA),'--local'],{cwd:RAIZ,stdio:'ignore'});
  for(let i=0;i<60;i+=1){try{if((await fetch(`${BASE}/`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  navegador=await abrirNavegador(chromium);
});
after(async()=>{await navegador?.close();servidor?.kill();});

const avisos={itens:[
  {id:1,titulo:'Novidade para organizar seu trabalho',texto:'Uma chamada com a identidade visual do portal.',botao:'Conhecer agora',url:'/f/juros/',alt:'',cor_texto:'#fff7ed',cor_fundo:'#452c24',alinhamento:'inicio',peso:600,fonte:'site',animacao:'deslizar',imagem_url:null},
  {id:2,titulo:'Segundo aviso do carrossel',texto:'Outro conteúdo configurado pelo administrador.',botao:'Abrir ferramenta',url:'/f/porcentagem/',alt:'',cor_texto:'#fff7ed',cor_fundo:'#5a3227',alinhamento:'centro',peso:700,fonte:'titulo',animacao:'suave',imagem_url:null},
]};

async function abrir({falhar=false,reducedMotion}={}){
  const contexto=await navegador.newContext({viewport:{width:1280,height:800},reducedMotion});
  await contexto.addCookies([{name:'visto_novidades',value:'1',url:BASE}]);
  const página=await contexto.newPage();
  let chamadas=0;
  await página.route('**/api/banners?**',rota=>{
    chamadas+=1;
    if(falhar&&chamadas===1)return rota.fulfill({status:503,contentType:'application/json',body:'{}'});
    return rota.fulfill({contentType:'application/json',body:JSON.stringify(avisos)});
  });
  return {contexto,página,quantidade:()=>chamadas};
}

test('aviso prioritário aparece logo abaixo do cabeçalho, navega no carrossel e preserva o site', {skip:pular}, async()=>{
  const {contexto,página}=await abrir();
  await página.goto(`${BASE}/`,{waitUntil:'networkidle'});
  const aviso=página.locator('.aviso-prioritario');
  await aviso.waitFor({state:'visible'});
  assert.match(await aviso.locator('h2').innerText(),/Novidade para organizar/);
  assert.equal(await página.evaluate(()=>{
    const header=document.querySelector('.cabeçalho,header'),banner=document.querySelector('.aviso-prioritario');
    return !!header&&header.nextElementSibling===banner;
  }),true,'fica imediatamente depois do cabeçalho');
  await aviso.getByRole('button',{name:'Próximo aviso'}).click();
  assert.match(await aviso.locator('h2').innerText(),/Segundo aviso/);
  assert.equal(await aviso.locator('.aviso-prioritario__contador').innerText(),'2 / 2');
  await aviso.getByRole('button',{name:'Pausar carrossel'}).click();
  assert.equal(await aviso.getByRole('button',{name:'Continuar carrossel'}).getAttribute('aria-pressed'),'true');
  assert.ok(await página.locator('#lista-prontas a').count()>10,'a lista principal continua disponível');
  await contexto.close();
});

test('aviso que falha mostra recuperação no próprio espaço e tentar novamente restaura somente o aviso', {skip:pular}, async()=>{
  const {contexto,página,quantidade}=await abrir({falhar:true});
  await página.goto(`${BASE}/`,{waitUntil:'networkidle'});
  const aviso=página.locator('.aviso-prioritario');
  await aviso.getByText('Não conseguimos carregar os avisos.').waitFor();
  assert.equal(await aviso.getAttribute('data-estado'),'erro');
  assert.ok(await página.locator('#lista-prontas a').count()>10,'a falha não paralisa a página');
  await aviso.getByRole('button',{name:'Tentar novamente'}).click();
  await aviso.locator('h2').waitFor();
  assert.equal(await aviso.getAttribute('data-estado'),'pronto');
  assert.equal(quantidade(),2);
  await contexto.close();
});

test('aviso lento mostra um esqueleto coerente sem reservar uma faixa vazia quando não há conteúdo', {skip:pular}, async()=>{
  const contexto=await navegador.newContext({viewport:{width:1280,height:800}});
  await contexto.addCookies([{name:'visto_novidades',value:'1',url:BASE}]);
  const página=await contexto.newPage();
  await página.route('**/api/banners?**',async rota=>{await new Promise(r=>setTimeout(r,1000));await rota.fulfill({contentType:'application/json',body:JSON.stringify(avisos)});});
  await página.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  const aviso=página.locator('.aviso-prioritario');
  await aviso.locator('.aviso-prioritario__esqueleto').waitFor();
  assert.equal(await aviso.getAttribute('aria-busy'),'true');
  await aviso.locator('h2').waitFor();
  assert.equal(await aviso.getAttribute('aria-busy'),null);
  await contexto.close();
});

test('movimento reduzido mantém o conteúdo do aviso e não agenda rotação automática', {skip:pular}, async()=>{
  const {contexto,página}=await abrir({reducedMotion:'reduce'});
  await página.goto(`${BASE}/`,{waitUntil:'networkidle'});
  const aviso=página.locator('.aviso-prioritario');
  await aviso.locator('h2').waitFor();
  await página.waitForTimeout(6800);
  assert.match(await aviso.locator('h2').innerText(),/Novidade para organizar/);
  await contexto.close();
});
