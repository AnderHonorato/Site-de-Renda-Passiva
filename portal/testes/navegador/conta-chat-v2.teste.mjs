import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from '../../ferramentas/achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = 4472;
const BASE = 'http://127.0.0.1:' + PORTA;

const chromium = acharChromium();
const pular = chromium ? false : 'Playwright não encontrado';
let servidor;
let navegador;

before(async () => {
  if (!chromium) return;
  servidor = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  navegador = await abrirNavegador(chromium);
});

after(async () => {
  await navegador?.close();
  servidor?.kill();
});

const perfil = {
  id: 1,
  nome: 'Ander Teste',
  usuario: 'ander_teste',
  avatar: 'sol',
  foto_url: null,
  nivel: 6,
  pontos: 140,
  pontos_evolucao: 165,
  plano: 'plus',
  papel: 'usuario',
  bio: 'Perfil compacto para teste.',
  local: 'São Paulo',
  criado_em: '2026-08-24 12:00:00',
  banner: 'aurora',
  moldura: 'ouro',
  sociais: { instagram: 'ander.teste', site: 'https://example.com/' },
  visibilidade: { bio: true, local: true },
  progresso_nivel: { nivel: 6, pontos: 165, faltam: 195, percentual: 38 },
  medalhas: [
    { id: 'explorador', nome: 'Explorador', descricao: 'Use ferramentas.', valor: 8, desbloqueada: true, tier: 2, patamar: 'Prata', meta: 15, completa: false, percentual: 50 },
    { id: 'pratica', nome: 'Mão na massa', descricao: 'Conclua usos.', valor: 80, desbloqueada: true, tier: 3, patamar: 'Ouro', meta: 160, completa: false, percentual: 20 },
  ],
  personalizacoes: {
    banners: [
      { id: 'brisa', nome: 'Brisa', nivel: 1, animado: false, desbloqueado: true },
      { id: 'aurora', nome: 'Aurora', nivel: 3, animado: false, desbloqueado: true },
      { id: 'prisma', nome: 'Prisma vivo', nivel: 12, animado: true, desbloqueado: false },
    ],
    molduras: [
      { id: 'basica', nome: 'Básica', nivel: 1, animado: false, desbloqueado: true },
      { id: 'ouro', nome: 'Ouro', nivel: 5, animado: false, desbloqueado: true },
      { id: 'neon', nome: 'Neon', nivel: 12, animado: true, desbloqueado: false },
    ],
  },
  ferramentas_recomendadas: ['simulador-de-financiamento'],
  ferramentas_mais_usadas: [
    { slug: 'simulador-de-financiamento', total: 18 },
    { slug: 'texto-para-fala', total: 12 },
  ],
};

async function contextoComApi({ viewport = { width: 1200, height: 800 }, chat = false,perfilAlterado={},reducedMotion } = {}) {
  const contexto = await navegador.newContext({ viewport,reducedMotion });
  await contexto.addCookies([{ name: 'visto_novidades', value: '1', url: BASE }]);

  await contexto.addInitScript(() => {
    class EventSourceFalso {
      constructor() { this.readyState = 1; this.listeners = new Map(); window.__eventSourceFalso=this; }
      addEventListener(nome, fn) { this.listeners.set(nome, fn); }
      close() { this.readyState = 2; }
      set onerror(_) {}
    }
    Object.defineProperty(window, 'EventSource', { value: EventSourceFalso, configurable: true });
  });

  let salas = [
    { id: 'global', tipo: 'global', nome: 'Geral', nao_lidas: 1, ultima_mensagem: 'Aviso público novo', ultima_em: '2026-10-06 22:00:00' },
    {
      id: 'direta-1-2',
      tipo: 'direta',
      nome: 'Conversa',
      nao_lidas: 2,
      ultima_mensagem: 'Última mensagem privada',
      ultima_em: '2026-10-06 22:10:00',
      outro: { id: 2, nome: 'Luna', usuario: 'luna', avatar: 'lua', foto_url: null },
    },
  ];
  let respostaEnviada = null;

  await contexto.route('**/api/**', async rota => {
    const req = rota.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const metodo = req.method();

    if (p === '/api/autenticacao/sessao') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          usuario: { id: 1, nome: 'Ander Teste', usuario: 'ander_teste', avatar: 'sol', nivel: 6, plano: 'plus', papel: 'usuario', chat_aceito: true },
          chat_habilitado: chat,
          chat_aceito: chat,
        }),
      });
    }
    if (p === '/api/conta' && metodo === 'GET') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ usuario: { id: 1, nome: 'Ander Teste', usuario: 'ander_teste', plano: 'plus', idioma: 'pt-BR', tema: 'sistema', nivel: 6 } }) });
    }
    if (p === '/api/conta' && metodo === 'PATCH') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ usuario: { id: 1, nome: 'Ander Alterado', usuario: 'ander_teste', plano: 'plus', idioma: 'pt-BR', tema: 'sistema', nivel: 6 } }) });
    }
    if (p === '/api/perfil/ander_teste' && metodo === 'GET') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil:{...perfil,...perfilAlterado} }) });
    }
    if(p==='/api/perfil/conquistas'&&metodo==='PATCH'){
      perfilAlterado.conquistas_destaque=req.postDataJSON().selecionadas;
      return rota.fulfill({contentType:'application/json',body:JSON.stringify({selecionadas:perfilAlterado.conquistas_destaque})});
    }
    if (p === '/api/perfil/ander_teste' && metodo === 'PATCH') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil: { ...perfil, ...req.postDataJSON() } }) });
    }
    if (p === '/api/perfil/luna') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ perfil: { ...perfil, id: 2, nome: 'Luna', usuario: 'luna', avatar: 'lua', plano: 'gratuito', banner: 'brisa', moldura: 'basica' } }) });
    }
    if (p === '/api/amizades') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ amizades: [] }) });
    }
    if (p === '/api/favoritos') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ favoritos: [] }) });
    }
    if (p === '/api/trabalhos') return rota.fulfill({contentType:'application/json',body:JSON.stringify({trabalhos:[],limite:3})});
    if (p === '/api/planos') return rota.fulfill({contentType:'application/json',body:JSON.stringify({planos:[{id:'gratuito',limites:{favoritos:10,trabalhos:3}},{id:'plus',limites:{favoritos:500,trabalhos:500}},{id:'premium',limites:{favoritos:500,trabalhos:500},provisorio:true}]})});
    if (p === '/api/suporte') return rota.fulfill({contentType:'application/json',body:JSON.stringify({mensagens:[]})});
    if (p === '/api/chat/salas') {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ salas, total_nao_lidas: salas.reduce((s, x) => s + x.nao_lidas, 0) }) });
    }
    if (p.endsWith('/leitura') && metodo === 'PATCH') {
      const salaId = decodeURIComponent(p.split('/')[4]);
      salas = salas.map(s => s.id === salaId ? { ...s, nao_lidas: 0 } : s);
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (p === '/api/chat/salas/global/mensagens' && metodo === 'GET') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ mensagens: [{ id: 10, sala_id: 'global', texto: 'Aviso público novo', criado_em: '2026-10-06 22:00:00', autor: { id: 2, usuario: 'luna', nome: 'Luna', avatar: 'lua' }, midias: [] }] }),
      });
    }
    if (p === '/api/chat/salas/direta-1-2/mensagens' && metodo === 'GET') {
      return rota.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          expira_em: 48,
          mensagens: [{
            id: 20,
            sala_id: 'direta-1-2',
            texto: 'Última mensagem privada',
            criado_em: '2026-10-06 22:10:00',
            autor: { id: 2, usuario: 'luna', nome: 'Luna', avatar: 'lua' },
            resposta: { id: 18, usuario: 'ander_teste', texto: 'Mensagem anterior' },
            midias: [{
              id: 44, nome: 'print.png', mime: 'image/png', tamanho: 1234, tipo: 'imagem',
              url: '/api/chat/midias/44', reproducao: null,
            }],
          }],
        }),
      });
    }
    if (p === '/api/chat/salas/direta-1-2/mensagens' && metodo === 'POST') {
      respostaEnviada = req.postDataJSON();
      return rota.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          mensagem: {
            id: 21, sala_id: 'direta-1-2', texto: respostaEnviada.texto,
            criado_em: '2026-10-06 22:12:00',
            autor: { id: 1, usuario: 'ander_teste', nome: 'Ander Teste', avatar: 'sol' },
            resposta: respostaEnviada.respostaA ? { id: 20, usuario: 'luna', texto: 'Última mensagem privada' } : null,
            midias: [],
          },
        }),
      });
    }
    if (p === '/api/chat/midias/44') {
      return rota.fulfill({ contentType: 'image/png', body: Buffer.from([137,80,78,71,13,10,26,10,1,2,3]) });
    }
    if (p.startsWith('/api/chat/denuncias')) {
      return rota.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (p.startsWith('/api/chat/midias/') && p.endsWith('/progresso')) {
      return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }

    return rota.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const página = await contexto.newPage();
  return { contexto, página, getResposta: () => respostaEnviada };
}

test('conta vira modal central amplo e alterações usam barra flutuante', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi();
  await página.goto(BASE + '/conta/', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('#conta-conteudo:not([hidden])');

  const caixa = await página.locator('.conta.conta--modal .conta__painel').boundingBox();
  assert.ok(caixa.width >= 760 && caixa.width <= 1120);
  assert.ok(caixa.x >= 0 && caixa.x + caixa.width <= 1200);
  assert.ok(caixa.height < 800);

  assert.equal(await página.locator('.conta__acoes-rapidas .conta__acao').count(), 0);
  assert.equal(await página.locator('#conta .medalha,#conta .ícone-nível').count(),0);
  assert.equal(await página.locator('#conta-salvar').isVisible(), false);

  const nome = página.locator('#form-perfil [name="nome"]');
  await nome.fill('Ander Alterado');
  await página.waitForSelector('#conta-salvar:not([hidden])');
  assert.equal(await página.locator('#conta-salvar').isVisible(), true);

  await página.click('#cancelar-alteracoes');
  assert.equal(await nome.inputValue(), 'Ander Teste');
  assert.equal(await página.locator('#conta-salvar').isVisible(), false);

  assert.equal(await página.locator('[data-conta-aba="aparencia"]').count(),0);
  await página.goto(BASE+'/conta/perfil.html');await página.waitForSelector('#conta-conteudo:not([hidden])');
  await página.click('[data-conta-aba="aparencia"]');
  assert.equal(await página.locator('#opcoes-banner .conta__personalizacao[disabled]').count(), 1);
  assert.equal(await página.locator('#conta-medalhas .medalha').count(), 0);

  await contexto.close();
});

test('perfil mantém tema claro, preserva dados no erro e salva em uma requisição', {skip:pular}, async()=>{
  const {contexto,página}=await contextoComApi();let falhar=true,gravacoes=[];
  await contexto.addInitScript(()=>localStorage.setItem('portal.tema','"claro"'));
  await contexto.route('**/api/perfil',rota=>{const entrada=rota.request().postDataJSON();gravacoes.push(entrada);return rota.fulfill({status:falhar?503:200,contentType:'application/json',body:JSON.stringify(falhar?{erro:'indisponivel'}:{perfil:{...perfil,...entrada},usuario:{...perfil,tema:entrada.tema,idioma:entrada.idioma}})});});
  await página.goto(BASE+'/conta/perfil.html');await página.waitForSelector('#form-perfil [name="nome"]');
  await página.locator('#form-perfil [name="nome"]').fill('Nome preservado');
  await página.locator('#form-perfil [name="bio"]').fill('Todas as alterações continuam aqui');
  await página.click('#salvar-alteracoes');await página.waitForFunction(()=>document.querySelector('.conta__estado')?.textContent.includes('continuam aqui'));
  assert.equal(await página.locator('#form-perfil [name="nome"]').inputValue(),'Nome preservado');assert.equal(await página.locator('html').getAttribute('data-tema'),'claro');
  falhar=false;await página.click('#salvar-alteracoes');await página.waitForFunction(()=>document.querySelector('.conta__estado')?.textContent==='Alterações salvas.');
  assert.equal(gravacoes.length,2);assert.equal(gravacoes[1].tema,'claro');assert.equal(await página.locator('html').getAttribute('data-tema'),'claro');assert.equal(await página.locator('#conta-salvar').isVisible(),false);
  await contexto.close();
});

test('trabalhos, favoritos e suporte deslizam dentro da conta sem trocar página', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi();await página.goto(BASE+'/conta/perfil.html');await página.waitForSelector('#conta-conteudo:not([hidden])');
  await página.locator('#form-perfil [name="bio"]').fill('Rascunho continua nas abas');
  for(const nome of ['trabalhos','favoritos','mensagens','planos']){
    await página.click(`.conta__acoes-rapidas [data-conta-aba="${nome}"]`);await página.waitForSelector(`[data-conta-painel="${nome}"]:not([hidden])`);
    assert.equal(new URL(página.url()).pathname,'/conta/perfil.html');assert.equal(await página.locator('.conta--modal').count(),1);assert.equal(await página.locator('[data-conta-painel]:not([hidden])').count(),1);
  }
  await página.waitForSelector('#conta-planos article');assert.equal(await página.locator('#conta-planos article').count(),3);
  await página.click('[data-conta-aba="aparencia"]');await página.waitForSelector('[data-conta-painel="aparencia"]:not([hidden])');await página.click('#previa-conquista');await página.waitForSelector('.conquista[open]');assert.match(await página.locator('#conquista-titulo').textContent(),/6/);await página.locator('.conquista button').click();
  await página.click('.conta__acoes-rapidas [data-conta-aba="perfil"]');await página.waitForSelector('[data-conta-painel="perfil"]:not([hidden])');assert.equal(await página.locator('#form-perfil [name="bio"]').inputValue(),'Rascunho continua nas abas');
  await página.click('[data-conta-aba="preferencias"]');await página.waitForSelector('[data-conta-painel="preferencias"]:not([hidden])');await página.locator('#sons-ativos').uncheck();assert.equal(await página.evaluate(()=>JSON.parse(localStorage.getItem('portal.sons'))),false);
  await contexto.close();
});

test('notificação da conquista aponta para a insígnia e detalhes param o brilho', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({viewport:{width:390,height:844}});
  await contexto.route('**/api/conquistas',rota=>rota.fulfill({contentType:'application/json',body:JSON.stringify({conquistas:[],notificacoes:[{tipo:'medalha',chave:'explorador:2',medalha:perfil.medalhas[0],data:'2026-10-07'}]})}));
  try {
    await página.goto(BASE+'/');await página.waitForSelector('.notificações__item--conquista',{state:'attached'});
    assert.equal(await página.locator('.topo__fim > :first-child').getAttribute('id'),'busca-topo', 'a busca fica ao lado do sino');
    await página.locator('.conta-topo--usuario .conta-topo__gatilho').hover();await página.waitForSelector('.conta-topo__painel:not([hidden])');
    assert.equal(await página.locator('.conta-topo__painel #alternar-tema').count(),1);assert.equal(await página.locator('.conta-topo__painel .idioma--topo').isVisible(),true);
    await página.click('#abrir-notificações');
    const geometria = await página.locator('.notificações__item--conquista').evaluate(item => {
      const selo = item.querySelector('.notificações__insignia')?.getBoundingClientRect();
      const titulo = item.querySelector('b')?.getBoundingClientRect();
      return selo && titulo ? { seloFim: selo.right, tituloInicio: titulo.left } : null;
    });
    assert.ok(geometria && geometria.seloFim <= geometria.tituloInicio, 'a insígnia ocupa coluna própria, sem cobrir o texto');
    await página.screenshot({path:join(RAIZ,'.execucao/notificacoes-colunas-2026-10-08.png')});
    const urlAntes=página.url();await página.locator('.notificações__item--conquista').click();await página.waitForSelector('.notificações__detalhe[role="dialog"]:not([hidden])');
    assert.equal(página.url(),urlAntes,'o clique no item abre detalhes sem navegar');
    await página.getByRole('link',{name:'Ir para página'}).click();await página.waitForSelector('.insignia-detalhe:popover-open');
    assert.equal(new URL(página.url()).searchParams.get('conquista'),'explorador:2');
    const alvo=página.locator('.perfil-comunidade__medalhas [data-conquista="explorador"]');assert.equal(await alvo.evaluate(el=>el.classList.contains('conquista-destacada')),true);
    const caixa=await página.locator('.insignia-detalhe').boundingBox();assert.ok(caixa.x>=0&&caixa.x+caixa.width<=390&&caixa.y>=0&&caixa.y+caixa.height<=844);
    await página.screenshot({path:join(RAIZ,'.execucao/insignia-notificacao-2026-10-07.png')});
    await página.locator('.insignia-detalhe__fechar').click();await alvo.click();await página.waitForSelector('.insignia-detalhe:popover-open');
    assert.equal(await alvo.evaluate(el=>el.classList.contains('conquista-destacada')),false);
    assert.match(await página.locator('.insignia-detalhe').textContent(),/Use ferramentas/);
    const caminhos=await página.locator('.perfil-comunidade__medalhas .emblema > path:nth-of-type(2)').evaluateAll(nos=>nos.map(no=>no.getAttribute('d')));assert.equal(new Set(caminhos).size,2);
  } finally {await contexto.close();}
});

test('cadastro preserva biografia, sociais e recomendações ao salvar nome', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({perfilAlterado:{ferramentas_recomendadas:['porcentagem']}});let salvo;
  await contexto.route('**/api/perfil',rota=>{salvo=rota.request().postDataJSON();return rota.fulfill({contentType:'application/json',body:JSON.stringify({perfil,usuario:perfil})});});
  try {
    await página.goto(BASE+'/conta/');await página.waitForSelector('#conta-resumo-slot strong');
    assert.equal(await página.locator('[name="bio"],.conta__sociais,.conta__acoes-rapidas,#opcoes-banner').count(),0);
    await página.locator('#form-perfil [name="nome"]').fill('Nome cadastral');await página.click('#salvar-alteracoes');await página.waitForFunction(()=>document.querySelector('.conta__estado')?.textContent==='Alterações salvas.');
    assert.equal(salvo.bio,perfil.bio);assert.deepEqual(salvo.sociais,perfil.sociais);assert.deepEqual(salvo.ferramentas_recomendadas,['porcentagem']);
  } finally {await contexto.close();}
});

test('recorte de uma foto retangular gera avatar quadrado e salvo atomicamente', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi();let salvo;
  await contexto.route('**/api/perfil',rota=>{salvo=rota.request().postDataJSON();return rota.fulfill({contentType:'application/json',body:JSON.stringify({perfil:{...perfil,foto_url:'/api/perfil/foto/ander_teste'},usuario:perfil})});});
  await página.goto(BASE+'/conta/');await página.waitForSelector('#conta-conteudo:not([hidden])');
  const imagem=await página.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle='#557c68';ctx.fillRect(0,0,320,320);ctx.fillStyle='#b38924';ctx.fillRect(320,0,320,320);return c.toDataURL('image/png').split(',')[1];});
  await página.locator('#foto-perfil').setInputFiles({name:'retangular.png',mimeType:'image/png',buffer:Buffer.from(imagem,'base64')});await página.waitForSelector('.avatar-recorte[open]');
  await página.locator('input[aria-label="Posição horizontal"]').fill('100');await página.getByRole('button',{name:'Usar este recorte',exact:true}).click();await página.waitForSelector('#avatar-preview img');
  const dimensoes=await página.locator('#avatar-preview img').evaluate(img=>[img.naturalWidth,img.naturalHeight]);assert.deepEqual(dimensoes,[512,512]);
  await página.click('#salvar-alteracoes');await página.waitForFunction(()=>document.querySelector('.conta__estado')?.textContent==='Alterações salvas.');assert.equal(salvo.foto.mime,'image/webp');assert.ok(salvo.foto.dados.length<1_600_000);
  await contexto.close();
});

test('conquista aguarda recorte de foto e Escape mantém o chat aberto', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({chat:true});
  try {
    await página.goto(BASE+'/conta/');await página.waitForSelector('#conta-conteudo:not([hidden])');
    await página.click('#chat-bolha');await página.waitForSelector('.chat__mensagem');
    const imagem=await página.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=320;c.getContext('2d').fillRect(0,0,640,320);return c.toDataURL('image/png').split(',')[1];});
    await página.locator('#foto-perfil').setInputFiles({name:'teste.png',mimeType:'image/png',buffer:Buffer.from(imagem,'base64')});
    await página.waitForSelector('.avatar-recorte[open]');
    await página.evaluate(async()=>{const evolução=await import('/scripts/núcleo/evolução.js');evolução.mostrarNovoNivel(5,6);});
    assert.equal(await página.locator('dialog[open]').count(),1);
    assert.equal(await página.locator('.conquista[open]').count(),0);
    await página.keyboard.press('Escape');await página.waitForSelector('.conquista[open]');
    assert.equal(await página.locator('dialog[open]').count(),1);
    assert.equal(await página.locator('#chat-painel').isVisible(),true);
    await página.keyboard.press('Escape');await página.waitForSelector('.conquista',{state:'detached'});
    assert.equal(await página.locator('#chat-painel').isVisible(),true);
  } finally {await contexto.close();}
});

test('conquistas ficam em fila, têm feixes de luz, cabem no celular e não repetem', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({viewport:{width:390,height:844}});let recebeu=new Set();
  const conquistas=[{tipo:'nivel',chave:'nivel:15',nivel:15},{tipo:'medalha',chave:'explorador:7',medalha:{...perfil.medalhas[0],tier:7,patamar:'Mítica'}}];
  await contexto.route('**/api/conquistas',rota=>rota.fulfill({contentType:'application/json',body:JSON.stringify({conquistas:conquistas.filter(c=>!recebeu.has(c.chave))})}));
  await contexto.route('**/api/conquistas/receber',rota=>{const {chave}=rota.request().postDataJSON();const nova=!recebeu.has(chave);recebeu.add(chave);return rota.fulfill({contentType:'application/json',body:JSON.stringify({recebida:nova})});});
  await página.goto(BASE+'/conta/');await página.waitForSelector('.conquista[open]');
  assert.equal(await página.locator('.conquista[open]').count(),1);assert.match(await página.locator('#conquista-titulo').textContent(),/15/);
  const caixa=await página.locator('.conquista').boundingBox();assert.ok(caixa.x>=0&&caixa.y>=0&&caixa.x+caixa.width<=390&&caixa.y+caixa.height<=844);
  assert.equal(await página.locator('.conquista__luz').count(),1);
  // O conteúdo do modal pode rolar; quem recorta os feixes decorativos é a camada de luz.
  assert.deepEqual(await página.locator('.conquista').evaluate(el=>[getComputedStyle(el).overflowX,getComputedStyle(el).overflowY]),['hidden','auto']);
  assert.equal(await página.locator('.conquista__luz').evaluate(el=>getComputedStyle(el).overflow),'clip');
  await página.screenshot({path:join(RAIZ,'.execucao/conquista-2026-10-07.png')});
  await página.locator('.conquista button').click();await página.waitForFunction(()=>document.querySelector('#conquista-titulo')?.textContent==='Explorador');assert.equal(await página.locator('.conquista .emblema').count(),1);
  await página.locator('.conquista button').click();await página.reload();await página.waitForSelector('#conta-conteudo:not([hidden])');assert.equal(await página.locator('.conquista').count(),0);
  await contexto.close();
});

test('sons só seguem eventos, não tocam para mensagem própria e podem ser silenciados', {skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({chat:true});
  await contexto.addInitScript(()=>{
    window.__notas=[];
    window.AudioContext=class{
      constructor(){this.state='running';this.currentTime=0;this.destination={};}
      resume(){this.state='running';return Promise.resolve();}
      createOscillator(){const osc={frequency:{value:0},connect(){},disconnect(){},stop(){},start(){window.__notas.push(osc.frequency.value);}};return osc;}
      createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    };
  });
  await página.goto(BASE+'/');await página.waitForSelector('#chat-bolha');assert.equal(await página.evaluate(()=>window.__notas.length),0);
  await página.click('#chat-bolha');await página.waitForSelector('.chat__mensagem');assert.equal(await página.evaluate(()=>window.__notas.length),2);
  await página.evaluate(()=>window.__eventSourceFalso.listeners.get('mensagem')({data:JSON.stringify({salaId:'global',mensagem:{id:51,texto:'Minha mensagem',autor:{id:1,usuario:'ander_teste',avatar:'sol'}}})}));
  assert.equal(await página.evaluate(()=>window.__notas.length),2);
  await página.evaluate(()=>window.__eventSourceFalso.listeners.get('mensagem')({data:JSON.stringify({salaId:'global',mensagem:{id:52,texto:'Nova mensagem recebida',autor:{id:2,usuario:'luna',avatar:'lua'}}})}));
  assert.equal(await página.evaluate(()=>window.__notas.length),4);
  await página.click('.chat__fechar');assert.equal(await página.evaluate(()=>window.__notas.length),6);await página.waitForSelector('#chat-painel[hidden]',{state:'attached'});
  await página.evaluate(()=>localStorage.setItem('portal.sons','false'));await página.click('#chat-bolha');assert.equal(await página.evaluate(()=>window.__notas.length),6);
  await contexto.close();
});

test('chat mantém não lidas por conversa, responde como citação e Shift+Enter quebra linha', { skip: pular }, async () => {
  const { contexto, página, getResposta } = await contextoComApi({ chat: true });
  await página.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  await página.waitForSelector('#chat-bolha .chat__bolha-badge:not([hidden])');
  assert.equal(await página.locator('.chat__bolha-badge').textContent(), '3');

  await página.click('#chat-bolha');
  await página.waitForSelector('.chat__layout');
  assert.equal(await página.locator('.chat__sala[data-sala-id="global"]').count(), 1);
  assert.equal(await página.locator('.chat__conversa .chat__anexo').count(), 0, 'sala pública permite apenas texto');

  await página.waitForFunction(() => document.querySelector('.chat__bolha-badge')?.textContent === '2');
  assert.equal(await página.locator('.chat__sala-badge:not([hidden])').count(), 1, 'só a conversa privada continua não lida');

  await página.locator('.chat__sala[data-sala-id="direta-1-2"]').click();
  await página.waitForSelector('.chat__mensagem[data-id="20"]');
  await página.waitForFunction(() => document.querySelector('.chat__bolha-badge')?.hidden === true);

  assert.equal(await página.locator('.chat__citado').count(), 1);
  assert.equal(await página.locator('.chat__midia-preview').count(), 1);

  const mensagem = página.locator('.chat__mensagem[data-id="20"]');
  await mensagem.hover();
  assert.equal(await mensagem.locator('.chat__denunciar').count(), 0, 'denúncia não fica poluindo o balão');
  await mensagem.locator('.chat__autor').hover();
  await página.waitForTimeout(220);
  assert.equal(await página.locator('.chat__mini-perfil').count(), 0, 'o chat não abre balão de perfil ao passar o mouse');
  assert.equal(await mensagem.locator('.chat__autor-avatar').count(), 1, 'o avatar continua sendo o único elemento visual do perfil no chat');
  assert.equal(await mensagem.locator('.chat__autor-selos,.chat__mini-insignia').count(), 0, 'o chat não repete níveis ou emblemas junto às mensagens');
  await mensagem.hover();
  await mensagem.locator('.chat__responder').click();
  assert.equal(await página.locator('.chat__reply').isVisible(), true);

  const textarea = página.locator('.chat__composer-linha textarea');
  await textarea.fill('linha 1');
  await textarea.press('Shift+Enter');
  await textarea.type('linha 2');
  assert.match(await textarea.inputValue(), /linha 1\nlinha 2/);

  await textarea.fill('texto formatado');
  await textarea.evaluate(el => {
    el.focus();
    el.setSelectionRange(0, 5);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 300, clientY: 500 }));
  });
  await página.waitForSelector('.chat__formatacao:not([hidden])');
  assert.equal(await página.locator('.chat__formatacao button').count(), 3);
  await página.locator('.chat__formatacao button').first().dispatchEvent('mousedown');
  assert.equal(await textarea.inputValue(), '**texto** formatado');

  await textarea.fill('resposta nova');
  await textarea.press('Enter');
  await página.waitForSelector('.chat__mensagem[data-id="21"]');
  assert.equal(getResposta().respostaA, 20);
  assert.equal(await página.locator('.chat__mensagem[data-id="21"] .chat__citado').count(), 1);

  await página.locator('.chat__midia-preview').first().click();
  await página.waitForSelector('.chat__midia-modal[open]');
  assert.equal(await página.locator('.chat__modal-imagem').count(), 1);
  await página.locator('.chat__midia-modal-acoes .chat__modal-botao').last().click();

  await contexto.close();
});

test('perfil público usa modal central, data de entrada, plano, medalhas, sociais e personalização', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi();
  await página.goto(BASE + '/perfil.html?usuario=ander_teste', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('.perfil-comunidade__hero');
  // A entrada do modal é animada; mede a largura depois de ele atingir o quadro final.
  await página.waitForFunction(() => {
    const painel = document.querySelector('.conta.conta--modal .conta__painel');
    const largura = painel?.getBoundingClientRect().width || 0;
    return largura >= 760 && largura <= 1120;
  });

  const modal = await página.locator('.conta.conta--modal .conta__painel').boundingBox();
  assert.ok(modal.width >= 760 && modal.width <= 1120);
  assert.equal(await página.locator('.perfil-comunidade__hero').getAttribute('data-banner'), 'aurora');
  assert.equal(await página.locator('.perfil-comunidade__avatar').getAttribute('data-moldura'), 'ouro');
  assert.match(await página.locator('.perfil-comunidade__tempo').textContent(), /Desde 24\/08\/2026/);
  assert.equal(await página.locator('.perfil-comunidade__plano').getAttribute('data-plano'), 'plus');
  assert.match(await página.locator('.perfil-comunidade__plano').getAttribute('href'), /planos\.html$/);
  assert.equal(await página.locator('.perfil-comunidade__medalhas .medalha').count(), 2);
  assert.equal(await página.locator('.perfil-comunidade__medalhas .medalha__rotulo').count(), 2);
  assert.equal(await página.locator('.perfil-comunidade__jornada progress').getAttribute('value'), '38');
  await página.screenshot({path:join(RAIZ,'.execucao/perfil-organizado-2026-10-08.png')});
  assert.equal(await página.locator('.perfil-comunidade__sociais a').count(), 2);
  assert.ok(await página.locator('.perfil-comunidade__ferramenta svg').count() >= 1);

  await contexto.close();
});

test('perfil próprio mostra edição e perfil de outra pessoa mostra ações sociais', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi();

  await página.goto(BASE + '/perfil.html?usuario=ander_teste', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('.perfil-comunidade__hero');
  assert.equal(await página.getByRole('link', { name: /Editar meu perfil/i }).count(), 1);
  assert.equal(await página.getByRole('button', { name: /Adicionar aos amigos/i }).count(), 0);

  await página.goto(BASE + '/perfil.html?usuario=luna', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('.perfil-comunidade__hero');
  assert.equal(await página.getByRole('button', { name: /Adicionar aos amigos/i }).count(), 1);
  assert.equal(await página.getByRole('link', { name: /Editar meu perfil/i }).count(), 0);
  await página.getByRole('button',{name:'Mais',exact:true}).click();
  await página.waitForSelector('.perfil-comunidade__mais-menu:popover-open');
  const menu=await página.locator('.perfil-comunidade__mais-menu').boundingBox();
  const bloquear=página.getByRole('button',{name:'Bloquear',exact:true});
  assert.equal(await bloquear.isVisible(),true);
  assert.ok(menu.y>=0&&menu.y+menu.height<=900,'menu cabe na tela');
  assert.equal(await bloquear.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'ação visível acima do cartão e de outras camadas');
  await página.keyboard.press('Escape');
  await página.waitForSelector('.perfil-comunidade__mais-menu:popover-open',{state:'hidden'});
  await página.waitForFunction(()=>document.querySelector('.perfil-comunidade__mais button').getAttribute('aria-expanded')==='false');

  await contexto.close();
});

test('editor agrupa todos os campos sem espaços implícitos ou cortes', {skip:pular},async()=>{
  for(const viewport of [{width:1366,height:900},{width:390,height:844},{width:320,height:740}]){
    const {contexto,página}=await contextoComApi({viewport,perfilAlterado:{sociais:{site:'https://example.com/',instagram:'ander.teste',facebook:'ander',tiktok:'ander',x:'ander',whatsapp:'5511999999999'}}});
    try{
      await página.goto(BASE+'/conta/perfil.html');await página.waitForSelector('#avatar-opcoes button');
      await página.waitForTimeout(350);
      assert.equal(await página.locator('#avatar-opcoes button').count(),15);
      for(const nome of ['nome','usuario','bio','local','site','instagram','facebook','tiktok','x','whatsapp','bioVisivel','localVisivel']){
        const campo=página.locator(`#form-perfil [name="${nome}"]`);
        assert.equal(await campo.count(),1,`preservado: ${nome}`);
        const largura=await campo.evaluate(el=>{const r=el.getBoundingClientRect(),f=el.closest('form').getBoundingClientRect();return r.left>=f.left-1&&r.right<=f.right+1;});
        assert.equal(largura,true,`campo dentro do formulário: ${nome}`);
      }
      assert.equal(await página.locator('#form-perfil [name="instagram"]').inputValue(),'ander.teste');
      const form=await página.locator('#form-perfil').boundingBox();
      assert.ok(form.height<(viewport.width>800?480:850),'formulário compacto sem remover entradas');
      assert.equal(await página.locator('.conta__rolagem').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      await página.screenshot({path:join(RAIZ,`.execucao/editor-integrado-${viewport.width}-v1.3.3.png`)});
    }finally{await contexto.close();}
  }
});

test('perfil salva cinco destaques ordenados, filtra a coleção e cabe no celular', {skip:pular},async()=>{
  const medalhas=['explorador','pratica','conversa','colecao','projetos','veterano','conexoes'].map((id,i)=>({id,nome:id,patamar:'Ouro',tier:3,desbloqueada:i<6,valor:100-i,meta:160,percentual:55,descricao:'Resolva tarefas para avançar nesta conquista.',etapas:Array.from({length:8},(_,j)=>({tier:j,nome:'Marco '+j,meta:(j+1)*10,desbloqueada:i<6&&j<=3}))}));
  const dados={medalhas,progresso_nivel:{nivel:6,pontos:250,faltam:110,percentual:0}};
  const {contexto,página}=await contextoComApi({viewport:{width:1366,height:900},perfilAlterado:dados});
  try{
    await página.goto(BASE+'/perfil.html?usuario=ander_teste');await página.waitForSelector('.colecao-conquistas');
    await página.locator('[data-destacar="colecao"]').click();await página.locator('[data-destacar="projetos"]').click();
    await página.locator('[data-destacar="veterano"]').click();
    assert.match(await página.locator('.colecao-conquistas__status').textContent(),/até 5/);
    await página.getByRole('button',{name:'Mover antes: projetos',exact:true}).click();
    await página.getByRole('button',{name:'Salvar destaques',exact:true}).click();
    await página.waitForFunction(()=>document.querySelectorAll('.perfil-comunidade__medalhas>.medalha').length===5);
    assert.deepEqual(dados.conquistas_destaque,['explorador','pratica','conversa','projetos','colecao']);
    await página.reload();await página.waitForSelector('.colecao-conquistas');
    assert.deepEqual(await página.locator('.perfil-comunidade__medalhas>.medalha').evaluateAll(nos=>nos.map(n=>n.dataset.conquista)),dados.conquistas_destaque);
    await página.locator('[data-filtro="ganhas"]').click();assert.equal(await página.locator('.colecao-conquistas__card').count(),6);
    await página.locator('[data-filtro="todas"]').click();assert.equal(await página.locator('.colecao-conquistas__card').count(),7);
    assert.equal(await página.locator('.colecao-conquistas progress').count(),0,'progresso acompanha o emblema, sem barra duplicada');
    const anel=página.locator('.colecao-conquistas .emblema-progresso__anel').first();
    assert.equal(await anel.getAttribute('aria-valuenow'),'55');
    await anel.scrollIntoViewIfNeeded();
    await página.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.querySelector('.colecao-conquistas .emblema-progresso__valor')).strokeDashoffset)-45)<.1);
    assert.equal(await anel.locator('.emblema-progresso__valor').evaluate(el=>parseFloat(getComputedStyle(el).strokeDashoffset)),45);
    assert.notEqual(await página.locator('.emblema-progresso').first().evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
    await página.locator('.conta__rolagem').evaluate(el=>el.scrollTop=0);await página.screenshot({path:join(RAIZ,'.execucao/perfil-ranks-2026-10-08.png')});
    const hero=await página.locator('.perfil-comunidade__hero').boundingBox();
    assert.ok(hero.height<410,'identificação, XP e cinco destaques formam uma carteira compacta');
    const stats=await página.locator('.perfil-comunidade__estatisticas').boundingBox();
    assert.ok(stats.y+stats.height<900,'estatísticas visíveis na primeira tela do computador');
    await página.locator('.colecao-conquistas').scrollIntoViewIfNeeded();await página.screenshot({path:join(RAIZ,'.execucao/colecao-conquistas-2026-10-08.png')});
    await página.setViewportSize({width:320,height:740});await página.locator('.conta__rolagem').evaluate(el=>el.scrollTop=0);
    assert.equal(await página.evaluate(()=>document.documentElement.scrollWidth),320);
    const identidade=await página.locator('.perfil-comunidade__identidade').boundingBox();
    await página.screenshot({path:join(RAIZ,'.execucao/perfil-ranks-mobile-2026-10-08.png')});
    assert.ok(identidade.width>=170,`identificação continua legível com avatar ao lado em tela de 320px (${identidade.width}px)`);
    assert.equal(await página.locator('.conta__rolagem').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'perfil sem rolagem lateral interna');
    await página.screenshot({path:join(RAIZ,'.execucao/perfil-ranks-mobile-2026-10-08.png')});
  }finally{await contexto.close();}
});

test('perfil limita destaques e abre pela notificação uma conquista que ficou na coleção', {skip:pular},async()=>{
  const medalhas=['explorador','pratica','conversa','colecao','veterano'].map((id,i)=>({id,nome:id,patamar:'Prata',tier:2,desbloqueada:true,valor:20-i,meta:30,descricao:'Um marco de teste.'}));
  const {contexto,página}=await contextoComApi({perfilAlterado:{medalhas}});
  try {
    await página.goto(BASE+'/perfil.html?usuario=ander_teste&conquista=veterano:2');
    await página.waitForSelector('.insignia-detalhe:popover-open');
    assert.equal(await página.locator('.perfil-comunidade__conquistas > .perfil-comunidade__medalhas > .medalha').count(),3);
    assert.equal(await página.locator('.colecao-conquistas__card').count(),5);
    assert.equal(await página.locator('.colecao-conquistas [data-conquista="veterano"]').isVisible(),true);
    assert.equal(await página.locator('[data-conquista="veterano"]').evaluate(el=>el.classList.contains('conquista-destacada')),true);
  } finally { await contexto.close(); }
});

test('modal de conta e chat cabem em 390 px sem rolagem lateral', { skip: pular }, async () => {
  const { contexto, página } = await contextoComApi({ viewport: { width: 390, height: 844 }, chat: true });
  await página.goto(BASE + '/conta/', { waitUntil: 'domcontentloaded' });
  await página.waitForSelector('#conta-conteudo:not([hidden])');
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth), 390);

  const caixa = await página.locator('.conta.conta--modal .conta__painel').boundingBox();
  assert.ok(caixa.x >= 0 && caixa.x + caixa.width <= 390);
  assert.ok(caixa.y>=0&&caixa.y+caixa.height<=844,'conta inteira dentro da altura da tela');

  await página.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await página.click('#chat-bolha');
  const chat = await página.locator('.chat__painel').boundingBox();
  assert.ok(chat.x >= 0 && chat.x + chat.width <= 390);
  assert.ok(chat.y>=0&&chat.y+chat.height<=844,'chat inteiro dentro da altura da tela');
  assert.equal(await página.evaluate(() => document.documentElement.scrollWidth), 390);

  await contexto.close();
});

for(const viewport of [{width:1366,height:768},{width:1024,height:600},{width:844,height:390},{width:320,height:568}]) {
  test(`conta e perfil dentro da tela ${viewport.width} × ${viewport.height}`,{skip:pular},async()=>{
    const {contexto,página}=await contextoComApi({viewport});
    try {
      for(const url of ['/conta/','/perfil.html?usuario=ander_teste']) {
        await página.goto(BASE+url,{waitUntil:'domcontentloaded'});
        await página.waitForSelector(url.startsWith('/conta')?'#conta-conteudo:not([hidden])':'.perfil-comunidade__hero');
        await página.waitForTimeout(350);
        const box=await página.locator('.conta--modal .conta__painel').boundingBox();
        assert.ok(box.x>=0&&box.x+box.width<=viewport.width+1,`${url}: largura`);
        assert.ok(box.y>=0&&box.y+box.height<=viewport.height+1,`${url}: altura`);
        assert.equal(await página.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
      }
    } finally { await contexto.close(); }
  });
}

test('conversas recolhem, texto permanece legível e chat cabe em tela baixa',{skip:pular},async()=>{
  const {contexto,página}=await contextoComApi({viewport:{width:1024,height:500},chat:true});
  try {
    await página.goto(BASE+'/',{waitUntil:'domcontentloaded'});await página.click('#chat-bolha');
    await página.waitForSelector('.chat__mensagem');await página.waitForTimeout(350);
    const box=await página.locator('.chat__painel').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=500);
    const toggle=página.getByRole('button',{name:'Mostrar ou recolher conversas'});
    await toggle.click();assert.equal(await página.locator('.chat__salas').isVisible(),false);
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await toggle.click();assert.equal(await página.locator('.chat__salas').isVisible(),true);
    const size=await página.locator('.chat__texto').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));assert.ok(size>=14);
  } finally {await contexto.close();}
});

test('perfil evoluído tem aura e emblemas, sem animação quando movimento é reduzido',{skip:pular},async()=>{
  for(const reducedMotion of ['no-preference','reduce']) {
    const {contexto,página}=await contextoComApi({reducedMotion,perfilAlterado:{nivel:13,banner:'lenda',moldura:'mitica',medalhas:[{id:'explorador',nome:'Explorador',tier:7,desbloqueada:true,patamar:'Mítica',descricao:'Use ferramentas.',valor:100,meta:100,completa:true}]}});
    try {
      await página.goto(BASE+'/perfil.html?usuario=ander_teste',{waitUntil:'domcontentloaded'});await página.waitForSelector('.perfil-comunidade__hero');
      assert.equal(await página.locator('.perfil-comunidade').getAttribute('data-prestigio'),'4');
      assert.equal(await página.locator('.perfil-comunidade__nivel svg').getAttribute('data-evolucao'),'4');
      const animation=await página.locator('.perfil-comunidade__fundo').evaluate(el=>getComputedStyle(el,'::before').animationName);
      assert.equal(animation,reducedMotion==='reduce'?'none':'prestigio-aura');
      const aura=await página.locator('.emblema-progresso').first().evaluate(el=>getComputedStyle(el,'::before').animationName);
      assert.equal(aura,reducedMotion==='reduce'?'none':'emblema-aura');
      if(reducedMotion==='no-preference') await página.screenshot({path:join(RAIZ,'.execucao','perfil-prestigio-2026-10-07.png')});
    } finally {await contexto.close();}
  }
});
