/** Contratos de interação da Flower: toque, olhar, digitação, FAQ e convite. */
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

async function abrirPagina(opcoes={},comRelogio=false){
  const context=await navegador.newContext({viewport:{width:390,height:844},...opcoes});
  const page=await context.newPage();
  if(comRelogio)await page.clock.install();
  await page.route('**/api/flower/status',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"indisponivel"}'}));
  await page.route('**/api/flower/chat',r=>r.fulfill({status:502,contentType:'application/json',body:'{"erro":"offline"}'}));
  await page.goto(`${BASE}/404.html`,{waitUntil:'domcontentloaded'});
  await page.locator('.flower__fab').waitFor();
  return {context,page};
}

test('Flower: avatar tocável, olhar por ponteiro/caret e estado de digitação', {skip:pular,timeout:60000},async()=>{
  const {context,page}=await abrirPagina({hasTouch:true,isMobile:true});
  const fab=page.locator('.flower__fab');await fab.tap();
  const dialog=page.locator('.flower__dialog');await dialog.waitFor({state:'visible'});
  assert.ok(['idle','pointer','touch','typing','reply'].includes(await dialog.getAttribute('data-gaze')),'diálogo expõe o estado de olhar');
  assert.equal(await dialog.getAttribute('data-state'),'idle','diálogo inicia em repouso');

  const avatar=page.locator('.flower__avatar');
  assert.equal(await avatar.evaluate(e=>e.tagName),'BUTTON','avatar do cabeçalho é um botão acessível e tocável');
  assert.match(await avatar.getAttribute('aria-label')||'',/olhar|flower/iu);
  assert.equal(await avatar.locator('.flower__skin').evaluate(e=>getComputedStyle(e).fill),'rgb(255, 139, 61)','avatar usa laranja #ff8b3d');
  const pupil=page.locator('#flower-modal-left');
  const beforeTouch=await pupil.evaluate(e=>getComputedStyle(e).transform);
  await avatar.tap({position:{x:25,y:15}});
  await page.waitForFunction(()=>document.querySelector('.flower__dialog')?.dataset.gaze==='touch');
  const afterTouch=await pupil.evaluate(e=>getComputedStyle(e).transform);
  assert.notEqual(afterTouch,beforeTouch,'toque real muda a posição efetiva da pupila');

  const input=page.locator('.flower__input');await input.focus();
  await page.waitForFunction(()=>document.querySelector('.flower__dialog')?.dataset.gaze==='typing');
  const beforeCaret=await pupil.evaluate(e=>getComputedStyle(e).transform);
  await input.fill('Como editar um PDF?');
  await input.evaluate(e=>e.setSelectionRange(4,4));
  await page.waitForTimeout(80);
  const afterCaret=await pupil.evaluate(e=>getComputedStyle(e).transform);
  assert.notEqual(afterCaret,beforeCaret,'posição do olhar acompanha a posição do caret ao digitar');
  assert.equal(await page.locator('.flower__fab').getAttribute('data-gaze')!==null,true,'botão flutuante também expõe data-gaze');
  assert.equal(await page.locator('.flower__fab').getAttribute('data-state'),'idle');

  await page.locator('.flower__send').click();
  await page.waitForFunction(()=>document.querySelector('.flower__dialog')?.dataset.gaze==='reply');
  assert.equal(await dialog.getAttribute('data-state'),'speaking','estado de resposta é exposto enquanto o texto aparece');
  await page.waitForFunction(()=>document.querySelector('.flower__dialog')?.dataset.state==='idle');
  await context.close();
});

test('Flower: respostas locais incrementais, pular animação, follow-up contextual e movimento reduzido', {skip:pular,timeout:60000},async()=>{
  const {context,page}=await abrirPagina();
  await page.locator('.flower__fab').click();
  const input=page.locator('.flower__input');
  await input.fill('Como editar um PDF?');await page.locator('.flower__send').click();
  const reply=page.locator('.flower__message--assistant .flower__message-text').last();
  await reply.waitFor();
  const skip=page.getByRole('button',{name:'Mostrar resposta completa'});
  await skip.waitFor({state:'visible'});
  const partial=await reply.textContent();
  assert.ok(partial.length>0&&partial.length<150,'resposta começa incrementalmente, em vez de aparecer inteira de uma vez');
  await skip.click();
  await page.waitForFunction(()=>{
    const textos=[...document.querySelectorAll('.flower__message--assistant .flower__message-text')];
    return (textos.at(-1)?.textContent.length||0)>150;
  });
  assert.match(await reply.textContent(),/Editar PDF/u);
  assert.equal(await skip.count(),0,'controle para pular some quando a resposta termina');

  const suggestions=page.locator('.flower__suggestion');
  await suggestions.first().waitFor();
  const suggestion=suggestions.filter({hasText:/pdf/i}).first();
  if(await suggestion.count()){
    const faqId=await suggestion.getAttribute('data-faq-id');
    assert.ok(faqId,'sugestão identifica a pergunta local por data-faq-id');
    await suggestion.click();
    const contextual=page.locator('.flower__message--assistant .flower__message-text').last();
    await contextual.waitFor();
    await page.waitForFunction(()=>{
      const textos=[...document.querySelectorAll('.flower__message--assistant .flower__message-text')];
      return (textos.at(-1)?.textContent.length||0)>0;
    });
    assert.ok((await contextual.textContent()).length>0,'chip produz uma resposta local contextualizada');
  } else {
    const first=suggestions.first();
    assert.ok(await first.getAttribute('data-faq-id'),'sugestão identifica a pergunta local por data-faq-id');
    await first.click();
    await page.locator('.flower__message--assistant .flower__message-text').last().waitFor();
  }
  const toolLink=page.locator('.flower__tool-link').first();await toolLink.waitFor();
  const href=await toolLink.getAttribute('href');
  assert.ok(href&&new URL(href,BASE).origin===BASE,'link da ferramenta aponta para uma rota real do próprio portal');
  assert.ok((await toolLink.getAttribute('href')).startsWith('/'),'link real é navegável e relativo ao portal');

  await page.emulateMedia({reducedMotion:'reduce'});
  await input.fill('Como editar uma imagem?');await page.locator('.flower__send').click();
  const reducedReply=page.locator('.flower__message--assistant .flower__message-text').last();
  await page.waitForFunction(()=>{
    const textos=[...document.querySelectorAll('.flower__message--assistant .flower__message-text')];
    return (textos.at(-1)?.textContent.length||0)>100;
  });
  assert.equal(await page.locator('.flower__skip').count(),0,'movimento reduzido mostra a resposta inteira sem animação');

  await page.emulateMedia({reducedMotion:'no-preference'});
  await input.fill('Como editar um DOCX?');await page.locator('.flower__send').click();
  const closingReply=page.locator('.flower__message--assistant .flower__message-text').last();
  await page.locator('.flower__skip').waitFor({state:'visible'});
  await page.locator('.flower__close').click();
  await page.waitForFunction(()=>{
    const textos=[...document.querySelectorAll('.flower__message--assistant .flower__message-text')];
    return (textos.at(-1)?.textContent.length||0)>100;
  });
  await page.locator('.flower__fab').click();
  assert.match(await closingReply.textContent(),/Editor de documentos/u,'fechar o diálogo conclui a resposta e a mantém completa ao reabrir');
  await context.close();
});

test('Flower: convite inicial, adiamento ao abrir chat e limite após dispensar', {skip:pular,timeout:60000},async()=>{
  const context=await navegador.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();await page.clock.install();
  await page.route('**/api/flower/status',r=>r.fulfill({status:503,contentType:'application/json',body:'{"erro":"indisponivel"}'}));
  await page.route('**/api/flower/chat',r=>r.fulfill({status:502,contentType:'application/json',body:'{"erro":"offline"}'}));
  await page.goto(`${BASE}/404.html`,{waitUntil:'domcontentloaded'});
  await page.locator('.flower__fab').waitFor();
  const dialog=page.locator('.flower__dialog'),invite=page.locator('.flower__invite');
  assert.equal(await invite.count(),1,'convite existe no DOM desde o início para acessibilidade');
  assert.equal(await invite.isHidden(),true,'convite começa oculto');
  await page.clock.fastForward(6000);
  await page.clock.fastForward(120);
  await invite.waitFor({state:'visible'});
  const open=page.locator('.flower__invite-open'),dismiss=page.locator('.flower__invite-close');
  assert.ok(await open.isVisible()&&await dismiss.isVisible(),'convite oferece abrir a conversa ou dispensar');
  await open.click();
  await dialog.waitFor({state:'visible'});
  assert.equal(await invite.isHidden(),true,'abrir pelo convite fecha o balão e abre o diálogo');
  const idlePupil=page.locator('#flower-modal-left');
  const gazeBeforeIdle=await idlePupil.evaluate(e=>getComputedStyle(e).transform);
  await page.clock.fastForward(6000);
  await page.clock.fastForward(120);
  assert.notEqual(await idlePupil.evaluate(e=>getComputedStyle(e).transform),gazeBeforeIdle,'olhos mudam sozinhos depois que o chat permanece em repouso');
  assert.equal(await invite.isHidden(),true,'não há convite sobre a conversa aberta');
  await page.locator('.flower__close').click();
  await page.clock.fastForward(180001);
  await page.clock.fastForward(120);
  await invite.waitFor({state:'visible'});
  await dismiss.click();assert.equal(await invite.isHidden(),true,'dispensar oculta o convite');
  await page.clock.fastForward(60000);
  assert.equal(await invite.isHidden(),true,'descarte aplica o cooldown de sessão e impede repetição insistente');
  await page.reload({waitUntil:'domcontentloaded'});await page.clock.fastForward(6000);
  assert.equal(await invite.isHidden(),true,'cooldown armazenado na sessão persiste após recarregar');
  await context.close();
});


test('Flower: convite espera por outro diálogo e pausa enquanto o usuário preenche um campo', {skip:pular,timeout:60000}, async()=>{
 const {context,page}=await abrirPagina({},true);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='dialogo-teste';d.textContent='Outra tarefa';document.body.append(d);d.showModal();});
 await page.clock.fastForward(6000);assert.equal(await page.locator('.flower__invite').isHidden(),true);
 await page.evaluate(()=>{document.getElementById('dialogo-teste').close();const input=document.createElement('input');input.id='campo-teste';document.body.append(input);input.focus();});await page.clock.fastForward(6000);assert.equal(await page.locator('.flower__invite').isHidden(),true);
 await page.evaluate(()=>document.getElementById('campo-teste').remove());await page.clock.fastForward(6000);await page.locator('.flower__invite').waitFor({state:'visible'});
 await context.close();
});
