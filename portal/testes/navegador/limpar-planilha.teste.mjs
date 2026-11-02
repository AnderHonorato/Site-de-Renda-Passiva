import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from '../../recursos/bibliotecas/xlsx-0.20.3.mjs';
import { lerCsv } from '../../scripts/cálculos/tabular.js';
import { tabelaParaTexto } from '../../scripts/cálculos/importar-planilha.js';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const PORTA=4486,BASE=`http://127.0.0.1:${PORTA}`;
const chromium=acharChromium(),pular=chromium?false:'Playwright não encontrado';
let servidor,navegador;
before(async()=>{
  if(!chromium)return;
  servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta',String(PORTA),'--local'],{cwd:RAIZ,stdio:'ignore'});
  for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  navegador=await abrirNavegador(chromium);
});
after(async()=>{await navegador?.close();servidor?.kill();});
const clientes=[['nome','email','codigo'],['Ana','a@x.com','007'],['Bruno','b@x.com','008'],['Ana Atual','a@x.com','009'],['','','']];
function xlsx(abas){const livro=XLSX.utils.book_new();for(const[nome,tabela]of abas)XLSX.utils.book_append_sheet(livro,XLSX.utils.aoa_to_sheet(tabela),nome);return Buffer.from(XLSX.write(livro,{type:'array',bookType:'xlsx',compression:true}));}
async function abrir(viewport={width:1280,height:900},colorScheme='light'){
  const contexto=await navegador.newContext({viewport,colorScheme,acceptDownloads:true});
  await contexto.addCookies([{name:'visto_novidades',value:'1',url:BASE}]);
  const pagina=await contexto.newPage();const erros=[],envios=[];
  pagina.on('pageerror',e=>erros.push(e.message));
  pagina.on('request',r=>{if(!r.url().startsWith(BASE)||(['POST','PUT','PATCH'].includes(r.method())&&!r.url().endsWith('/api/usos')))envios.push(r.url());});
  await pagina.goto(BASE+'/f/limpar-planilha/',{waitUntil:'networkidle'});await pagina.waitForSelector('#limpeza-configurar');
  return{contexto,pagina,erros,envios};
}
async function revisar(pagina){await pagina.click('#limpeza-configurar');await pagina.getByRole('button',{name:'Revisar limpeza',exact:true}).click();await pagina.waitForSelector('#ferramenta[data-etapa="3"]');}
async function baixar(pagina,texto){const[d]=await Promise.all([pagina.waitForEvent('download'),pagina.getByRole('button',{name:texto,exact:true}).click()]);return readFile(await d.path());}

test('XLSX escolhe aba, compara pelo e-mail, mantém última e exporta resultado completo',{skip:pular},async()=>{
  const{contexto,pagina,erros,envios}=await abrir();
  try{
    await pagina.locator('#campo-arquivo').setInputFiles({name:'clientes.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:xlsx([['Clientes',clientes],['Estoque',[['sku','quantidade'],['0007',2]]]])});
    await pagina.waitForSelector('#limpeza-aba:not([disabled])');assert.equal(await pagina.locator('#limpeza-aba option').count(),2);
    await pagina.selectOption('#limpeza-aba','1');await pagina.waitForFunction(()=>document.querySelector('#campo-conteúdo').value.includes('0007'));
    await pagina.waitForSelector('#limpeza-aba:not([disabled])');await pagina.selectOption('#limpeza-aba','0');await pagina.waitForFunction(()=>document.querySelector('#campo-conteúdo').value.includes('Ana Atual'));
    await pagina.waitForSelector('#limpeza-configurar:not([disabled])');await pagina.click('#limpeza-configurar');
    const tamanhoCaixas=await pagina.locator('.limpeza-etapas__colunas input').evaluateAll(cs=>cs.map(c=>c.getBoundingClientRect().width));
    assert.ok(tamanhoCaixas.every(l=>l<=20),'as caixas de seleção não herdam a largura dos campos de texto');
    await pagina.evaluate(()=>window.scrollTo(0,document.querySelector('#ferramenta').getBoundingClientRect().top+scrollY-80));
    await pagina.screenshot({path:join(RAIZ,'.execucao/planilha-configurar-v1.3.4.png')});
    await pagina.locator('.limpeza-etapas__colunas input[value="0"]').uncheck();await pagina.locator('.limpeza-etapas__colunas input[value="2"]').uncheck();await pagina.selectOption('#campo-manter','ultima');
    await pagina.getByRole('button',{name:'Revisar limpeza',exact:true}).click();await pagina.waitForSelector('#ferramenta[data-etapa="3"]');
    assert.match(await pagina.locator('#resultado').textContent(),/2 linhas limpas/);
    assert.equal(await pagina.getByRole('button',{name:'Baixar CSV completo',exact:true}).isVisible(),false);
    await pagina.click('#limpeza-confirmar');
    const csv=await baixar(pagina,'Baixar CSV completo');assert.deepEqual(lerCsv(csv.toString('utf8')), [['nome','email','codigo'],['Bruno','b@x.com','008'],['Ana Atual','a@x.com','009']]);
    const bytes=await baixar(pagina,'Baixar XLSX completo');const wb=XLSX.read(bytes,{type:'buffer'});assert.deepEqual(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false}),lerCsv(csv.toString('utf8')));
    assert.deepEqual(erros,[]);assert.deepEqual(envios,[]);
  }finally{await contexto.close();}
});

test('reabrir trabalho recupera dados, colunas escolhidas e a última ocorrência sem gravar na conta',{skip:pular},async()=>{
  const{contexto,pagina,erros}=await abrir();const gravacoes=[];
  try{
    await contexto.route('**/api/**',async rota=>{
      const req=rota.request(),p=new URL(req.url()).pathname;
      if(p==='/api/ferramentas/limpar-planilha/uso')assert.deepEqual(req.postDataJSON(),{},'o registro de uso não contém células nem configurações');
      else if(['POST','PATCH','PUT','DELETE'].includes(req.method())&&p!='/api/usos')gravacoes.push(p);
      if(p==='/api/autenticacao/sessao')return rota.fulfill({json:{usuario:{id:77,nome:'Teste isolado',usuario:'teste_isolado',plano:'gratuito'},chat_habilitado:false}});
      if(p==='/api/trabalhos/77')return rota.fulfill({json:{trabalho:{id:77,ferramenta_slug:'limpar-planilha',dados:{conteúdo:tabelaParaTexto(clientes),comCabeçalho:'sim',removerDuplicadas:'sim',colunasChave:'[1]',manter:'ultima',removerVazias:'sim',aparar:'sim',espaçosDuplos:'sim',caixa:'nenhuma'}}}});
      return rota.fulfill({json:{usuario:null,favoritos:[],notificacoes:[],trabalhos:[],ok:true}});
    });
    await pagina.goto(BASE+'/f/limpar-planilha/?trabalho=77',{waitUntil:'networkidle'});
    await pagina.waitForSelector('#ferramenta[data-etapa="3"]');assert.match(await pagina.locator('#resultado').textContent(),/2 linhas limpas/);
    await pagina.getByRole('button',{name:'Ajustar limpeza',exact:true}).click();
    assert.deepEqual(await pagina.locator('.limpeza-etapas__colunas input:checked').evaluateAll(cs=>cs.map(c=>c.value)),['1']);
    assert.equal(await pagina.locator('#campo-manter').inputValue(),'ultima');
    await pagina.getByRole('button',{name:'Revisar limpeza',exact:true}).click();await pagina.waitForSelector('#ferramenta[data-etapa="3"]');await pagina.click('#limpeza-confirmar');
    assert.deepEqual(lerCsv((await baixar(pagina,'Baixar CSV completo')).toString('utf8')),[['nome','email','codigo'],['Bruno','b@x.com','008'],['Ana Atual','a@x.com','009']]);
    assert.deepEqual(gravacoes,[]);assert.deepEqual(erros,[]);
  }finally{await contexto.close();}
});

test('falha do leitor XLSX fica isolada e permite continuar com dados colados',{skip:pular},async()=>{
  const{contexto,pagina,erros}=await abrir();
  try{
    await contexto.route('**/trabalhador-planilha.js',r=>r.abort('failed'));
    await pagina.fill('#campo-conteúdo','nome;codigo\nAna;007');
    await pagina.locator('#campo-arquivo').setInputFiles({name:'clientes.xlsx',mimeType:'application/octet-stream',buffer:xlsx([['Clientes',clientes]])});
    await pagina.waitForSelector('.limpeza-etapas__erro:not([hidden])');assert.match(await pagina.locator('.limpeza-etapas__erro').textContent(),/leitor de XLSX/);
    await pagina.waitForSelector('#limpeza-configurar:not([disabled])');assert.match(await pagina.locator('#campo-conteúdo').inputValue(),/Ana;007/);
    await revisar(pagina);assert.match(await pagina.locator('#resultado').textContent(),/1 linhas limpas/);assert.deepEqual(erros,[]);
  }finally{await contexto.close();}
});

for(const[viewport,tema]of [[{width:1280,height:900},'light'],[{width:390,height:844},'light'],[{width:320,height:740},'dark']])test(`texto em etapas e exportação inteira ${viewport.width}px ${tema}`,{skip:pular},async()=>{
  const{contexto,pagina,erros,envios}=await abrir(viewport,tema);
  try{
    const tabela=[Array.from({length:15},(_,i)=>'Coluna '+i),...Array.from({length:25},(_,i)=>Array.from({length:15},(_,j)=>`${i}:${j}`))];
    await pagina.fill('#campo-conteúdo',tabelaParaTexto(tabela));await revisar(pagina);
    assert.equal(await pagina.locator('#resultado tbody tr').count(),20);assert.equal(await pagina.locator('#resultado th').count(),12);
    assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await pagina.locator('#ferramenta').scrollIntoViewIfNeeded();await pagina.screenshot({path:join(RAIZ,`.execucao/planilha-etapas-${viewport.width}-${tema}-v1.3.4.png`)});
    await pagina.click('#limpeza-confirmar');const bytes=await baixar(pagina,'Baixar CSV completo');assert.deepEqual(lerCsv(bytes.toString('utf8')),tabela);
    await pagina.getByRole('button',{name:'Ajustar limpeza',exact:true}).click();assert.equal(await pagina.locator('#ferramenta').getAttribute('data-etapa'),'2');
    await pagina.locator('#campo-comCabeçalho').uncheck();assert.equal(await pagina.locator('#ferramenta').getAttribute('data-etapa'),'2');
    assert.equal(await pagina.getByRole('button',{name:'4. Baixar',exact:true}).isEnabled(),false,'configuração alterada invalida o download anterior');
    assert.deepEqual(erros,[]);assert.deepEqual(envios,[]);
  }finally{await contexto.close();}
});

test('arquivo inválido preserva dados anteriores e uma primeira aba vazia permite selecionar outra',{skip:pular},async()=>{
  const{contexto,pagina,erros}=await abrir();
  try{
    await pagina.fill('#campo-conteúdo','nome;codigo\nAna;007');
    await pagina.locator('#campo-arquivo').setInputFiles({name:'quebrado.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('não é xlsx')});
    await pagina.waitForSelector('.limpeza-etapas__erro:not([hidden])');assert.match(await pagina.locator('.limpeza-etapas__erro').textContent(),/XLSX/);assert.match(await pagina.locator('#campo-conteúdo').inputValue(),/Ana;007/);
    await pagina.waitForSelector('#campo-arquivo:not([disabled])');
    await pagina.locator('#campo-arquivo').setInputFiles({name:'abas.xlsx',mimeType:'application/octet-stream',buffer:xlsx([['Vazia',[]],['Clientes',clientes]])});
    await pagina.waitForSelector('#limpeza-aba:not([disabled])');await pagina.selectOption('#limpeza-aba','1');await pagina.waitForFunction(()=>document.querySelector('#campo-conteúdo').value.includes('Ana Atual'));
    await pagina.waitForSelector('#limpeza-configurar:not([disabled])');await revisar(pagina);assert.match(await pagina.locator('#resultado').textContent(),/3 linhas limpas/);assert.deepEqual(erros,[]);
  }finally{await contexto.close();}
});

test('CSV Windows-1252, fórmulas como texto, sem cabeçalho e reinício da ferramenta',{skip:pular},async()=>{
  const{contexto,pagina,erros}=await abrir();
  try{
    await pagina.locator('#campo-arquivo').setInputFiles({name:'dados.csv',mimeType:'text/csv',buffer:Buffer.from('Andr\xe9;007\n=1+1;008','latin1')});
    await pagina.waitForSelector('#limpeza-configurar:not([disabled])');await pagina.waitForFunction(()=>document.querySelector('#campo-conteúdo').value.includes('André'));await pagina.click('#limpeza-configurar');await pagina.locator('#campo-comCabeçalho').uncheck();
    await pagina.getByRole('button',{name:'Revisar limpeza',exact:true}).click();await pagina.waitForSelector('#ferramenta[data-etapa="3"]');await pagina.click('#limpeza-confirmar');
    const bytes=await baixar(pagina,'Baixar CSV completo');assert.deepEqual(lerCsv(bytes.toString('utf8')),[['André','007'],["'=1+1",'008']]);
    await pagina.getByRole('button',{name:'Ajustar limpeza',exact:true}).click();await pagina.getByRole('button',{name:'Começar novamente',exact:true}).click();
    assert.equal(await pagina.locator('#ferramenta').getAttribute('data-etapa'),'1');assert.equal(await pagina.locator('#campo-conteúdo').inputValue(),'');assert.deepEqual(erros,[]);
  }finally{await contexto.close();}
});
