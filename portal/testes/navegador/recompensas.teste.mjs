import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { acharChromium,abrirNavegador } from '../../ferramentas/achar-playwright.mjs';
const RAIZ=join(import.meta.dirname,'../..'),PORTA=4488,BASE=`http://127.0.0.1:${PORTA}`;const chromium=acharChromium(),pular=chromium?false:'Playwright ausente';let servidor,navegador;
before(async()=>{if(!chromium)return;servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta',String(PORTA),'--local'],{cwd:RAIZ,stdio:'ignore',windowsHide:true});for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}navegador=await abrirNavegador(chromium);});
after(async()=>{await navegador?.close();servidor?.kill();});
test('planos apresentam espaço por trabalho e espaço total sem transbordar no computador e celular',{skip:pular},async()=>{
  for(const [viewport,en] of [[{width:1280,height:900},false],[{width:320,height:568},true]]){
    const {c,pagina,erros}=await contexto(viewport);
    try{
      await pagina.goto(`${BASE}/${en?'en/':''}planos.html`,{waitUntil:'networkidle'});
      const premium=pagina.locator('[data-plano="premium"]');
      assert.match(await premium.textContent(),/512 KiB/);assert.match(await premium.textContent(),/32 MiB/);
      assert.match(await pagina.locator('[data-plano="plus"]').textContent(),/8 MiB/);
      assert.match(await pagina.locator('[data-plano="gratuito"]').textContent(),/60 KiB/);
      await pagina.screenshot({path:join(RAIZ,`.execucao/planos-${viewport.width}-v1.3.5.png`)});
      const fora=await pagina.evaluate(()=>[...document.querySelectorAll('body *')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1);}).map(n=>({tag:n.tagName,classe:n.className,texto:n.textContent.slice(0,60),largura:n.getBoundingClientRect().width})).slice(0,12));
      assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,JSON.stringify(fora));
      assert.deepEqual(erros,[]);
    }finally{await c.close();}
  }
});
async function contexto(viewport={width:1280,height:900},colorScheme='light',tituloMissao) {
  const c=await navegador.newContext({viewport,colorScheme,reducedMotion:'reduce'});await c.addCookies([{name:'visto_novidades',value:'1',url:BASE}]);
  let ranking=false,resgatada=false,eventos=[],paginas=[];const erros=[],u={id:1,nome:'Conta de teste',usuario:'demo',avatar:'sol',nivel:1,plano:'premium',papel:'admin',idade:25,tema:'sistema',idioma:'pt-BR',criado_em:'2026-10-09 12:00:00'};
  const perfil={...u,bio:'Perfil de teste isolado',local:'São Paulo',banner:'brisa',moldura:'basica',sociais:{},visibilidade:{bio:true,local:true},progresso_nivel:{nivel:1,pontos:0,faltam:10,percentual:0},medalhas:[],personalizacoes:{banners:[],molduras:[]},ferramentas_recomendadas:[],ferramentas_mais_usadas:[]};
  const missoes=()=>[
    {tipo:'diaria',titulo_pt:tituloMissao||'Dois desafios resolvidos',titulo_en:tituloMissao||'Two challenges solved',texto_pt:'Conclua duas ferramentas diferentes.',texto_en:'Complete two different tools.',inicio:'2026-10-09',fim:'2026-10-09',meta:2,valor:2,xp:5,disponivel:!resgatada,resgatada},
    {tipo:'semanal',titulo_pt:'Explore cinco ferramentas',titulo_en:'Explore five tools',texto_pt:'Explore nesta semana.',texto_en:'Explore this week.',inicio:'2026-10-05',fim:'2026-10-11',meta:5,valor:3,xp:15,disponivel:false},
    {tipo:'evento',evento_id:5,titulo_pt:'Desafio da comunidade',titulo_en:'Community challenge',texto_pt:'Explore mais ferramentas.',texto_en:'Explore more tools.',inicio:'2026-10-10',fim:'2026-10-15',meta:10,valor:0,xp:30,disponivel:false,agendada:true},
  ];
  await c.route('**/api/**',async rota=>{const req=rota.request(),url=new URL(req.url()),p=url.pathname,m=req.method();let body={ok:true};
    if(p==='/api/autenticacao/sessao')body={usuario:u,chat_habilitado:false,chat_aceito:false};
    else if(p==='/api/perfil/demo')body={perfil};
    else if(p==='/api/conta')body={usuario:u,uso:{favoritos:0,trabalhos:51},limites:{favoritos:500,trabalhos:2000}};
    else if(p==='/api/conquistas')body={conquistas:[],notificacoes:resgatada?[{tipo:'missao',chave:'missao:1',resgate_id:1,titulo_pt:'Dois desafios resolvidos',titulo_en:'Two challenges solved',xp:5,data:'2026-10-09 20:00:00'}]:[]};
    else if(p==='/api/recompensas')body={missoes:missoes(),ranking,resgates:resgatada?[{id:1,titulo_pt:'Dois desafios resolvidos',titulo_en:'Two challenges solved',xp:5,criado_em:'2026-10-09 20:00:00'}]:[]};
    else if(p==='/api/recompensas/resgatar'){resgatada=true;body={resgatada:true,nivel:1,missao:missoes()[0]};}
    else if(p==='/api/recompensas/preferencias'){ranking=req.postDataJSON().ranking;body={ranking};}
    else if(p==='/api/recompensas/ranking')body={participantes:[{usuario:'luna',avatar:'lua',xp:90,posicao:1},...(ranking?[{usuario:'demo',avatar:'sol',xp:5,posicao:2,proprio:true}]:[])]};
    else if(p==='/api/admin/recompensas/eventos'&&m==='POST'){const evento={...req.postDataJSON(),id:1,versao:1};eventos.push(evento);body={evento};}
    else if(p==='/api/admin/recompensas/eventos')body={eventos};
    else if(p==='/api/trabalhos'){const n=Number(url.searchParams.get('pagina')||1);paginas.push(n);body={total:51,pagina:n,paginas:2,limite:2000,trabalhos:Array.from({length:n===1?50:1},(_,i)=>({id:(n-1)*50+i+1,titulo:`Trabalho ${(n-1)*50+i+1}`,ferramenta_slug:'porcentagem',ferramenta_nome:'Porcentagem',situacao:'salvo',atualizado_em:'2026-10-09'}))};}
    else if(p==='/api/amizades')body={amizades:[]};else if(p==='/api/favoritos')body={favoritos:[]};
    return rota.fulfill({json:body});
  });
  const pagina=await c.newPage();pagina.on('pageerror',e=>erros.push(e.message));return {c,pagina,erros,paginas};
}
for(const [viewport,tema,en]of [[{width:1280,height:900},'light',false],[{width:390,height:844},'light',false],[{width:320,height:568},'dark',true]])test(`missões no perfil, resgate, celebração e ranking ${viewport.width}px ${tema} ${en?'EN':'PT'}`,{skip:pular},async()=>{
  const {c,pagina,erros}=await contexto(viewport,tema);try{
    await pagina.goto(`${BASE}/${en?'en/':''}perfil.html?usuario=demo#missoes`,{waitUntil:'networkidle'});await pagina.waitForSelector('.recompensas__missao');assert.equal(await pagina.locator('.recompensas__missao').count(),3);
    assert.equal(await pagina.locator('.recompensas__opcao input').isChecked(),false);assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await pagina.locator('.recompensas').scrollIntoViewIfNeeded();await pagina.screenshot({path:join(RAIZ,`.execucao/missoes-${viewport.width}-${tema}-v1.3.5.png`)});
    await pagina.locator('.recompensas__opcao input').check();await pagina.waitForSelector('.recompensas__ranking [data-proprio="true"]');await pagina.locator('.recompensas__opcao input').uncheck();await pagina.waitForFunction(()=>!document.querySelector('.recompensas__ranking [data-proprio="true"]'));
    await pagina.getByRole('button',{name:en?'Claim 5 XP':'Receber 5 XP',exact:true}).click();await pagina.waitForSelector('dialog.conquista[open]');assert.match(await pagina.locator('dialog.conquista').textContent(),/5 XP/);
    const r=await pagina.locator('dialog.conquista').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=viewport.width+1&&r.y>=0&&r.y+r.height<=viewport.height+1,'a celebração cabe na tela');
    await pagina.screenshot({path:join(RAIZ,`.execucao/missao-celebracao-${viewport.width}-v1.3.5.png`)});await pagina.getByRole('button',{name:en?'Continue':'Continuar',exact:true}).click();
    await pagina.waitForSelector('.recompensas__missao [disabled]');assert.equal(await pagina.getByRole('button',{name:en?'Received':'Recebido',exact:true}).isDisabled(),true);
    await pagina.click('#abrir-notificações');assert.ok(await pagina.locator('.notificações__item').filter({hasText:en?'Two challenges solved':'Dois desafios resolvidos'}).count()>0);
    assert.deepEqual(erros,[]);
  }finally{await c.close();}
});
test('admin cria evento bilíngue e trabalhos navegam entre páginas leves',{skip:pular},async()=>{
  const {c,pagina,erros,paginas}=await contexto({width:390,height:844});try{
    await pagina.goto(BASE+'/admin/eventos/',{waitUntil:'networkidle'});await pagina.click('#novo-evento');for(const [nome,valor]of [['titulo_pt','Semana criativa'],['titulo_en','Creative week'],['texto_pt','Cinco ferramentas'],['texto_en','Five tools'],['inicio','2026-10-09'],['fim','2026-10-15'],['meta','5'],['xp','15']])await pagina.locator(`[name="${nome}"]`).fill(valor);
    await pagina.locator('[name="ativo"]').check();await pagina.getByRole('button',{name:'Salvar evento',exact:true}).click();await pagina.waitForSelector('.recompensas__evento-admin');assert.match(await pagina.locator('.recompensas__evento-admin').textContent(),/Semana criativa/);assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await pagina.goto(BASE+'/conta/trabalhos.html',{waitUntil:'networkidle'});await pagina.waitForSelector('.conta__trabalho');assert.equal(await pagina.locator('.conta__trabalho').count(),50);assert.match(await pagina.locator('#trabalhos-resumo').textContent(),/51 de 2000/);
    await pagina.getByRole('button',{name:'Próxima',exact:true}).click();await pagina.waitForFunction(()=>document.querySelectorAll('.conta__trabalho').length===1);assert.match(await pagina.locator('.conta__trabalho').textContent(),/Trabalho 51/);assert.deepEqual(paginas,[1,2]);assert.deepEqual(erros,[]);
  }finally{await c.close();}
});
test('falha de missões preserva perfil e permite nova tentativa',{skip:pular},async()=>{
  const {c,pagina,erros}=await contexto();let pedidos=0;await c.route('**/api/recompensas',r=>{pedidos++;return r.fulfill({status:503,json:{erro:'temporario'}});});
  try{await pagina.goto(BASE+'/perfil.html?usuario=demo#missoes',{waitUntil:'networkidle'});await pagina.waitForFunction(()=>document.querySelector('.recompensas__conteudo').textContent.includes('Não consegui carregar'));assert.match(await pagina.locator('#perfil-pessoa').textContent(),/Conta de teste/);
    await pagina.locator('#missoes').getByRole('button',{name:'Tentar novamente',exact:true}).click();await pagina.waitForFunction(()=>document.querySelector('.recompensas__conteudo').textContent.includes('Não consegui carregar'));assert.ok(pedidos>=2);assert.deepEqual(erros,[]);
  }finally{await c.close();}
});

test('celebração com título de 100 caracteres cabe em tela baixa e o botão permanece acessível',{skip:pular},async()=>{
  const {c,pagina,erros}=await contexto({width:320,height:360},'dark','Ferramentas'.repeat(10).slice(0,100));
  try{await pagina.goto(BASE+'/perfil.html?usuario=demo#missoes',{waitUntil:'networkidle'});await pagina.getByRole('button',{name:'Receber 5 XP',exact:true}).click();await pagina.waitForSelector('dialog.conquista[open]');
    const modal=await pagina.locator('dialog.conquista').boundingBox(),b=await pagina.locator('dialog.conquista button').boundingBox();assert.ok(b.y>=modal.y&&b.y+b.height<=modal.y+modal.height+1);assert.equal(await pagina.locator('dialog.conquista').evaluate(n=>n.scrollHeight<=n.clientHeight+1),true);await pagina.getByRole('button',{name:'Continuar',exact:true}).click();assert.deepEqual(erros,[]);
  }finally{await c.close();}
});

test('celebração extensa em tela muito baixa permite alcançar a ação sem barra lateral visível',{skip:pular},async()=>{
  const {c,pagina,erros}=await contexto({width:320,height:240},'dark','Conquista especial '.repeat(20));
  try{
    await pagina.goto(BASE+'/perfil.html?usuario=demo#missoes',{waitUntil:'networkidle'});
    await pagina.getByRole('button',{name:'Receber 5 XP',exact:true}).click();
    const dialogo=pagina.locator('dialog.conquista');
    await dialogo.waitFor({state:'visible'});
    const medidas=await dialogo.evaluate(no=>({altura:no.clientHeight,conteudo:no.scrollHeight,rolagem:getComputedStyle(no).overflowY,borda:no.getBoundingClientRect().bottom}));
    assert.equal(medidas.rolagem,'auto','o conteúdo pode rolar, em vez de ser cortado');
    assert.ok(medidas.conteudo>medidas.altura,'o teste exerce a situação de conteúdo extenso');
    assert.ok(medidas.borda<=240+1,'o modal permanece dentro da tela');
    await dialogo.getByRole('button',{name:'Continuar'}).click();
    assert.equal(await pagina.locator('dialog.conquista[open]').count(),0);
    assert.deepEqual(erros,[]);
  }finally{await c.close();}
});
