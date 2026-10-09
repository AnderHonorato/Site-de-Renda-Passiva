import { test,before,after } from 'node:test';import assert from 'node:assert/strict';import { spawn } from 'node:child_process';import { join } from 'node:path';
import { acharChromium,abrirNavegador } from '../../ferramentas/achar-playwright.mjs';import { PONTOS_PADRAO } from '../../servidor/editorial.mjs';
const RAIZ=join(import.meta.dirname,'../..'),BASE='http://127.0.0.1:4489',chromium=acharChromium(),skip=chromium?false:'Playwright ausente';let servidor,navegador;
before(async()=>{if(!chromium)return;servidor=spawn(process.execPath,['ferramentas/servir.mjs','.','--porta','4489','--local'],{cwd:RAIZ,stdio:'ignore',windowsHide:true});for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}navegador=await abrirNavegador(chromium);});after(async()=>{await navegador?.close();servidor?.kill();});
async function abrir(viewport,colorScheme='light',admin=true,publicando=false){const c=await navegador.newContext({viewport,colorScheme,reducedMotion:'reduce'}),erros=[];await c.addCookies([{name:'visto_novidades',value:'1',url:BASE}]);
  let estado={rascunho:{ferramentas:{},categorias:{},textos:{},limites:{},pontos:{...PONTOS_PADRAO}},publicado:{textos:{}},versao:1,publicada_versao:0,base:{ferramentas:[{slug:'porcentagem',status:'pronta',cat:'calculo','pt-BR':{nome:'Calculadora de porcentagem',resumo:'Calcule porcentagens.'},en:{nome:'Percentage calculator',resumo:'Calculate percentages.'}}],categorias:[{id:'dinheiro','pt-BR':{nome:'Dinheiro e preços',resumo:'Cálculos financeiros.'},en:{nome:'Money and prices',resumo:'Financial calculations.'}}],textos:['inicio.titulo','inicio.descricao','ajuda.introducao','planos.introducao']}},revisoes=[],ativo=true;
  const usuario={id:1,nome:'Conta de teste',usuario:'demo',avatar:'sol',nivel:1,plano:'gratuito',papel:admin?'admin':'usuario',idioma:'pt-BR',tema:'sistema',criado_em:'2026-10-09'};
  estado.publicando=publicando;
  await c.route('**/api/**',async rota=>{const r=rota.request(),p=new URL(r.url()).pathname,m=r.method();let json={ok:true};
    if(p==='/api/autenticacao/sessao')json={usuario,chat_habilitado:false};
    else if(p==='/api/admin/editorial'&&m==='GET')json=estado;
    else if(p==='/api/admin/editorial'&&m==='PUT'){estado.rascunho=r.postDataJSON().dados;estado.versao++;revisoes.push({id:1,versao:estado.versao,acao:'salvar_rascunho',criado_em:'2026-10-09'});json=estado;}
    else if(p==='/api/admin/editorial/publicar'){estado.publicada_versao=estado.versao;estado.publicado=structuredClone(estado.rascunho);json=estado;}
    else if(p==='/api/admin/editorial/historico')json={revisoes};
    else if(p==='/api/planos')json={planos:[{id:'gratuito',limites:{favoritos:10,trabalhos:3},dados_maximo_bytes:20480,armazenamento_maximo_bytes:61440},{id:'plus',limites:{favoritos:500,trabalhos:500},dados_maximo_bytes:65536,armazenamento_maximo_bytes:8388608},{id:'premium',limites:{favoritos:500,trabalhos:2000},dados_maximo_bytes:524288,armazenamento_maximo_bytes:33554432}]};
    else if(p==='/api/admin/operacao/desbloquear'){ativo=false;}
    else if(p==='/api/admin/operacao')json={bloqueios:[{id:'a'.repeat(64),grupo:'login',reincidencias:2,bloqueado_ate:Date.now()+60000,ativo}],auditoria:[{id:1,acao:'salvar_editorial',criado_em:'2026-10-09'}],erros:[]};
    else if(p==='/api/conquistas')json={conquistas:[],notificacoes:[]};else if(p==='/api/banners')json={banners:[]};else if(p==='/api/anuncios')json={ativo:false,permitido:false,blocos:{}};
    return rota.fulfill({json});
  });const pagina=await c.newPage();pagina.on('pageerror',e=>erros.push(e.message));return {c,pagina,erros};
}
for(const [width,tema,en]of [[1280,'light',false],[390,'light',false],[320,'dark',true]])test(`editorial: salva/publica e operação libera bloqueio ${width}px ${tema} ${en?'EN':'PT'}`,{skip},async()=>{
  const {c,pagina,erros}=await abrir({width,height:width===1280?900:568},tema);try{
    await pagina.goto(BASE+`/${en?'en/':''}admin/editorial/`,{waitUntil:'networkidle'});await pagina.waitForFunction(()=>!document.getElementById('editorial-catalogo').hidden);
    await pagina.locator('[name="filtro"]').fill('nada-encontrado-zzzz');assert.equal(await pagina.locator('#editorial-sem-itens').isVisible(),true);assert.equal(await pagina.locator('[name="nome_pt-BR"]').isDisabled(),true);assert.equal(await pagina.locator('[name="nome_pt-BR"]').inputValue(),'');assert.equal(await pagina.getByRole('button',{name:en?'Save item draft':'Salvar rascunho do item',exact:true}).isDisabled(),true);
    await pagina.locator('[name="filtro"]').fill('');assert.equal(await pagina.locator('#editorial-sem-itens').isVisible(),false);assert.equal(await pagina.locator('[name="nome_pt-BR"]').isEnabled(),true);
    await pagina.locator('[name="nome_pt-BR"]').fill('Porcentagem para seu negócio');await pagina.locator('[name="nome_en"]').fill('Percentage for your business');await pagina.getByRole('button',{name:en?'Save item draft':'Salvar rascunho do item',exact:true}).click();await pagina.waitForFunction(()=>document.getElementById('editorial-versao').textContent.includes('2'));
    await pagina.getByRole('button',{name:en?'Publish current draft':'Publicar rascunho atual',exact:true}).click();await pagina.waitForFunction(()=>/Publicada 2|Published 2/.test(document.getElementById('editorial-versao').textContent));
    await pagina.locator('.conta__rolagem').evaluate(el=>el.scrollTop=0);await pagina.locator('#editorial').screenshot({path:join(RAIZ,`.execucao/editorial-${width}-${tema}-v1.3.7.png`)});assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await pagina.getByText(en?'Revision history':'Histórico de revisões',{exact:true}).click();assert.match(await pagina.locator('#editorial-historico').textContent(),en?/Draft saved/:/Rascunho salvo/);assert.doesNotMatch(await pagina.locator('#editorial-historico').textContent(),/salvar_rascunho/);
    await pagina.locator('#editorial-historico').scrollIntoViewIfNeeded();await pagina.locator('#editorial').screenshot({path:join(RAIZ,`.execucao/editorial-historico-${width}-${tema}-v1.3.7.png`)});
    await pagina.goto(BASE+`/${en?'en/':''}admin/operacao/`,{waitUntil:'networkidle'});await pagina.getByRole('button',{name:en?'Release restriction':'Liberar restrição',exact:true}).click();await pagina.waitForFunction(()=>/Liberado|Released/.test(document.getElementById('operacao-bloqueios').textContent));assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.match(await pagina.locator('#operacao-auditoria').textContent(),en?/Content saved to draft/:/Conteúdo salvo em rascunho/);assert.deepEqual(erros,[]);
  }finally{await c.close();}
});
test('falha editorial permite atualizar sem esconder cabeçalho; conta comum não recebe formulário',{skip},async()=>{
  const {c,pagina,erros}=await abrir({width:390,height:568});try{let falhar=true;await c.route('**/api/admin/editorial',r=>falhar?r.fulfill({status:503,json:{erro:'indisponivel'}}):r.fallback());await pagina.goto(BASE+'/admin/editorial/',{waitUntil:'networkidle'});assert.equal(await pagina.locator('#abrir-notificações').isVisible(),true);falhar=false;await pagina.getByRole('button',{name:'Atualizar',exact:true}).click();await pagina.waitForFunction(()=>!document.getElementById('editorial-catalogo').hidden);assert.deepEqual(erros,[]);}finally{await c.close();}
  const comum=await abrir({width:320,height:568},'dark',false);try{await comum.pagina.goto(BASE+'/admin/editorial/',{waitUntil:'networkidle'});assert.equal(await comum.pagina.locator('#editorial-catalogo').isVisible(),false);assert.match(await comum.pagina.locator('.conta__estado').textContent(),/acesso|Acesso/);assert.deepEqual(comum.erros,[]);}finally{await comum.c.close();}
});
test('filtrar catálogo não libera edição durante publicação pendente',{skip},async()=>{
  const {c,pagina,erros}=await abrir({width:320,height:568},'dark',true,true);try{
    await pagina.goto(BASE+'/admin/editorial/',{waitUntil:'networkidle'});await pagina.waitForFunction(()=>!document.getElementById('editorial-catalogo').hidden);
    await pagina.locator('[name="filtro"]').fill('porcentagem');
    assert.equal(await pagina.locator('[name="nome_pt-BR"]').isDisabled(),true);
    assert.equal(await pagina.getByRole('button',{name:'Salvar rascunho do item',exact:true}).isDisabled(),true);
    assert.equal(await pagina.locator('#editorial-publicar').isDisabled(),true);
    assert.equal(await pagina.locator('#editorial-recuperar').isEnabled(),true);assert.deepEqual(erros,[]);
  }finally{await c.close();}
});
