const RAIZ = '../';
const categorias = [
  {id:'confeitaria',nome:'Confeitaria',pasta:'1. Ferramentas para confeitaria',letra:'C'},
  {id:'educacao',nome:'Educação',pasta:'2. Atividades escolares para imprimir',letra:'E'},
  {id:'artesanato',nome:'Crochê e artesanato',pasta:'3. Ferramentas para crochê e artesanato',letra:'A'},
  {id:'festas',nome:'Churrasco e festas',pasta:'4. Planejamento de churrasco e festas',letra:'F'},
  {id:'reforma',nome:'Pintura e reforma',pasta:'5. Calculadoras de pintura e reforma',letra:'R'},
  {id:'embalagens',nome:'Caixas e embalagens',pasta:'6. Moldes de caixas e embalagens',letra:'M'}
];

const paginas = {
  "confeitaria": [
    "custo-da-receita",
    "preço-de-venda",
    "ajuste-de-quantidade",
    "lista-de-compras",
    "orçamento",
    "preço-por-unidade",
    "conversor-de-formas",
    "rendimento-com-perdas",
    "ficha-técnica"
  ],
  "educacao": [
    "operações-matemáticas",
    "tabuada",
    "caça-palavras",
    "caligrafia",
    "bingo-de-números",
    "papel-quadriculado",
    "flashcards",
    "planejador-de-estudos"
  ],
  "artesanato": [
    "custo-do-material",
    "valor-da-hora",
    "preço-da-peça",
    "simulador-de-desconto",
    "planejador-de-encomendas",
    "orçamento",
    "conversor-de-amostras-de-pontos",
    "controle-de-materiais"
  ],
  "festas": [
    "churrasco",
    "festa-infantil",
    "almoço",
    "divisor-de-despesas",
    "orçamento-do-evento",
    "checklist",
    "cronograma",
    "lista-de-convidados"
  ],
  "reforma": [
    "área-de-paredes",
    "quantidade-de-tinta",
    "piso-por-caixa",
    "rodapé",
    "orçamento",
    "papel-de-parede",
    "área-de-rejunte",
    "comparador-de-tinta"
  ],
  "embalagens": [
    "caixa-retangular",
    "caixa-com-tampa",
    "envelope",
    "etiquetas",
    "cinta-para-embalagem",
    "divisórias-de-caixa",
    "saco-de-papel",
    "aproveitamento-de-folha"
  ]
};

const nomes = {
  confeitaria:['Custo da receita','Preço de venda','Ajuste de quantidade','Lista de compras','Orçamento ao cliente','Preço por unidade','Conversor de formas','Rendimento com perdas','Ficha técnica'],
  educacao:['Operações matemáticas','Tabuada','Caça-palavras','Caligrafia','Bingo educativo','Papel quadriculado','Flashcards','Planejador de estudos'],
  artesanato:['Custo do material','Valor da hora','Preço da peça','Desconto','Controle de encomendas','Orçamento de artesanato','Amostra de pontos','Controle de materiais'],
  festas:['Planejar churrasco','Festa infantil','Planejar almoço','Divisor de despesas','Orçamento do evento','Checklist da festa','Cronograma do evento','Lista de convidados'],
  reforma:['Área de paredes','Quantidade de tinta','Piso por caixa','Rodapé','Orçamento da reforma','Papel de parede','Rejunte','Comparador de tintas'],
  embalagens:['Caixa retangular','Caixa com tampa','Envelope','Etiquetas','Cinta para embalagem','Divisórias','Saco de papel','Aproveitamento de folha']
};

const descricoes = {
  confeitaria:'Cálculos e documentos para produção e venda.',educacao:'Geradores prontos para imprimir e estudar.',artesanato:'Custos, preços e controle de produção manual.',festas:'Quantidades, despesas, cronogramas e convidados.',reforma:'Medições e estimativas para compra de material.',embalagens:'Moldes e aproveitamento para corte e montagem.'
};

const ferramentas = categorias.flatMap(cat => nomes[cat.id].map((nome,i)=>({
  id:`${cat.id}-${i+1}`,
  nome,
  categoria:cat.id,
  categoriaNome:cat.nome,
  letra:cat.letra,
  descricao:descricoes[cat.id],
  url:`${RAIZ}${encodeURIComponent(cat.pasta)}/p%C3%A1ginas/${encodeURIComponent(paginas[cat.id][i])}.html`
})));

const banners = [
  {rotulo:'Atalho',titulo:'Volte ao que você estava fazendo',texto:'O portal guarda localmente as ferramentas vistas recentemente para você não precisar procurar tudo de novo.'},
  {rotulo:'Organização',titulo:'Seis áreas, um único ponto de entrada',texto:'Confeitaria, educação, artesanato, festas, reforma e embalagens aparecem numa busca única.'},
  {rotulo:'Privacidade',titulo:'O básico continua sem cadastro',texto:'Login será opcional para sincronização entre aparelhos. As ferramentas públicas continuam abertas.'}
];

const avisos = ['Busca instantânea por ferramenta','Histórico local de vistos recentes','Atalho / para pesquisar','Ajuda rápida em qualquer tela','Interface adaptada para celular'];
const dicas = ['Pressione / para ir direto para a busca.','Use uma categoria para reduzir o catálogo sem perder sua pesquisa.','As últimas ferramentas abertas ficam em “Vistos recentemente”.','Você pode usar as ferramentas públicas sem criar conta.'];

const $ = (s)=>document.querySelector(s);
const normalizar = (v)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escapar = (v)=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const CHAVE_RECENTES = 'ander.portal.recentes';
const CHAVE_FAVORITOS = 'ander.portal.favoritos';
const CHAVE_TEMA = 'ander.portal.tema';

function lerLista(chave) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(valor) ? valor.filter(item => typeof item === 'string') : [];
  } catch { return []; }
}
function guardarLista(chave, itens) {
  try { localStorage.setItem(chave, JSON.stringify(itens)); } catch { /* Armazenamento indisponível. */ }
}

let filtroAtual = 'todas';
let bannerAtual = 0;
let toastTimer;

function montarFaixa(){
  const duplicados=[...avisos,...avisos];
  $('#faixa-trilho').innerHTML=duplicados.map(a=>`<span>${escapar(a)}</span>`).join('');
}

function montarCategorias(){
  const alvo=$('#categorias');
  alvo.innerHTML=[{id:'todas',nome:'Todas'},...categorias].map(c=>`<button type="button" data-categoria="${c.id}" aria-pressed="${c.id==='todas'}">${escapar(c.nome)}</button>`).join('');
  const select=$('#filtro-categoria');
  select.innerHTML=[{id:'todas',nome:'Todas as categorias'},...categorias].map(c=>`<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
  alvo.addEventListener('click',e=>{
    const b=e.target.closest('[data-categoria]'); if(!b)return;
    filtroAtual=b.dataset.categoria; select.value=filtroAtual; atualizarCategorias(); renderizar();
  });
  select.addEventListener('change',()=>{filtroAtual=select.value; atualizarCategorias(); renderizar();});
}

function atualizarCategorias(){
  document.querySelectorAll('[data-categoria]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.categoria===filtroAtual)));
}

function ferramentaCard(f, compacto=false){
  const ativo = carregarFavoritos().includes(f.id);
  const acao = ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  return `<article class="cartao" ${compacto?'data-compacto="true"':''}>
    <button type="button" class="cartao__favorito" data-favorito="${f.id}" aria-pressed="${ativo}" aria-label="${acao}: ${escapar(f.nome)}" title="${acao}">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.8 2.9 6 6.6 1-4.8 4.7 1.1 6.7L12 18.1l-5.8 3.1 1.1-6.7-4.8-4.7 6.6-1z"/></svg>
    </button>
    <a class="cartao__link" href="${f.url}" data-ferramenta="${f.id}">
      <span class="cartao__icone" aria-hidden="true">${f.letra}</span>
      <h3>${escapar(f.nome)}</h3>
      <p>${escapar(f.descricao)}</p>
      <footer><span class="cartao__categoria">${escapar(f.categoriaNome)}</span><span class="cartao__seta" aria-hidden="true">↗</span></footer>
    </a>
  </article>`;
}

function filtradas(){
  const termo=normalizar($('#busca').value.trim());
  return ferramentas.filter(f=>(filtroAtual==='todas'||f.categoria===filtroAtual)&&(!termo||normalizar(`${f.nome} ${f.categoriaNome} ${f.descricao}`).includes(termo)));
}

function renderizar(){
  const lista=filtradas();
  $('#grade-ferramentas').innerHTML=lista.map(f=>ferramentaCard(f)).join('');
  $('#estado-vazio').hidden=lista.length!==0;
  $('#contador-ferramentas').textContent=`${ferramentas.length} ferramentas`;
  const termo=$('#busca').value.trim();
  $('#resultado-busca').textContent=termo?`${lista.length} resultado${lista.length===1?'':'s'} para “${termo}”.`:'';
}

function carregarRecentes(){ return lerLista(CHAVE_RECENTES); }
function carregarFavoritos(){ return lerLista(CHAVE_FAVORITOS); }
function salvarRecente(id){
  if (!ferramentas.some(f=>f.id===id)) return;
  guardarLista(CHAVE_RECENTES,[id,...carregarRecentes().filter(x=>x!==id)].slice(0,8));
}
function alternarFavorito(id){
  const ferramenta=ferramentas.find(f=>f.id===id);
  if(!ferramenta) return;
  const lista=carregarFavoritos();
  const ativo=lista.includes(id);
  guardarLista(CHAVE_FAVORITOS,ativo?lista.filter(x=>x!==id):[id,...lista].slice(0,49));
  renderizar(); renderizarRecentes(); renderizarFavoritos();
  toast(ativo?'Removido dos favoritos.':'Adicionado aos favoritos.');
}
function renderizarFavoritos(){
  const lista=carregarFavoritos().map(id=>ferramentas.find(f=>f.id===id)).filter(Boolean);
  $('#grade-favoritos').innerHTML=lista.map(f=>ferramentaCard(f,true)).join('');
  $('#grade-favoritos').hidden=!lista.length;
  $('#favoritos-vazio').hidden=!!lista.length;
}
function renderizarRecentes(){
  const ids=carregarRecentes();
  const lista=ids.map(id=>ferramentas.find(f=>f.id===id)).filter(Boolean);
  $('#recentes').hidden=!lista.length;
  $('#grade-recentes').innerHTML=lista.slice(0,4).map(f=>ferramentaCard(f,true)).join('');
}

function montarBanner(){
  const b=banners[bannerAtual];
  $('#banner-conteudo').innerHTML=`<p class="rotulo" style="color:#ffd8de">${escapar(b.rotulo)}</p><h2>${escapar(b.titulo)}</h2><p>${escapar(b.texto)}</p>`;
}
function proximoBanner(delta=1){bannerAtual=(bannerAtual+delta+banners.length)%banners.length; montarBanner()}

function toast(texto){
  const el=$('#toast'); clearTimeout(toastTimer); el.textContent=texto; el.hidden=false; toastTimer=setTimeout(()=>el.hidden=true,3800);
}

function aplicarTema(tema){
  document.documentElement.dataset.tema=tema;
  const botao=$('#botao-tema');
  botao.textContent=tema==='escuro'?'Tema claro':'Tema escuro';
  botao.setAttribute('aria-label',tema==='escuro'?'Ativar tema claro':'Ativar tema escuro');
}
function prepararTema(){
  let salvo=null;
  try{salvo=localStorage.getItem(CHAVE_TEMA)}catch{}
  const doSistema=window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(salvo==='escuro'||(salvo!=='claro'&&doSistema)?'escuro':'claro');
  $('#botao-tema').addEventListener('click',()=>{
    const proximo=document.documentElement.dataset.tema==='escuro'?'claro':'escuro';
    aplicarTema(proximo);
    try{localStorage.setItem(CHAVE_TEMA,proximo)}catch{}
  });
}

function prepararModais(){
  $('#botao-ajuda').addEventListener('click',()=>$('#modal-ajuda').showModal());
  $('#botao-conta').addEventListener('click',()=>$('#modal-conta').showModal());
  if(!localStorage.getItem('ander.portal.boasVindas')){
    setTimeout(()=>$('#modal-boas-vindas').showModal(),350);
    $('#modal-boas-vindas').addEventListener('close',()=>localStorage.setItem('ander.portal.boasVindas','1'),{once:true});
  }
  document.querySelectorAll('[data-login]').forEach(b=>b.addEventListener('click',()=>{
    const provedor=b.dataset.login;
    fetch(`/api/auth/status?provider=${encodeURIComponent(provedor)}`,{headers:{accept:'application/json'}})
      .then(r=>{if(!r.ok)throw new Error();return r.json()})
      .then(d=>{if(d?.enabled)location.href=`/api/auth/login/${provedor}`;else toast(`Login com ${provedor} ainda não foi configurado.`)})
      .catch(()=>toast(`Login com ${provedor} ainda não foi configurado neste ambiente.`));
  }));
}

function prepararRevelacao(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.revelar').forEach(e=>e.classList.add('visivel'));return}
  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visivel');obs.unobserve(e.target)}}),{threshold:.08});
  document.querySelectorAll('.revelar').forEach(e=>obs.observe(e));
}

function prepararEventos(){
  document.addEventListener('click',e=>{const botao=e.target.closest('[data-favorito]');if(botao)alternarFavorito(botao.dataset.favorito)});
  $('#grade-favoritos').addEventListener('click',e=>{const link=e.target.closest('[data-ferramenta]');if(link)salvarRecente(link.dataset.ferramenta)});
  $('#busca').addEventListener('input',renderizar);
  $('#grade-ferramentas').addEventListener('click',e=>{const a=e.target.closest('[data-ferramenta]');if(a)salvarRecente(a.dataset.ferramenta)});
  $('#grade-recentes').addEventListener('click',e=>{const a=e.target.closest('[data-ferramenta]');if(a)salvarRecente(a.dataset.ferramenta)});
  $('#limpar-recentes').addEventListener('click',()=>{localStorage.removeItem(CHAVE_RECENTES);renderizarRecentes();toast('Histórico local limpo.')});
  $('#banner-anterior').addEventListener('click',()=>proximoBanner(-1));
  $('#banner-proximo').addEventListener('click',()=>proximoBanner(1));
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey) return;
    const alvo=document.activeElement;
    const editando=alvo?.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(alvo?.tagName||'');
    if(e.key==='/'&&!editando){e.preventDefault();$('#busca').focus();$('#busca').select();}
    if(e.key==='Escape'&&alvo===$('#busca')&&$('#busca').value){
      $('#busca').value='';renderizar();
    }
  });
  setInterval(()=>proximoBanner(1),30000);
  setTimeout(()=>toast(dicas[0]),12000);
}

prepararTema(); montarFaixa(); montarCategorias(); montarBanner(); renderizar(); renderizarRecentes(); renderizarFavoritos(); prepararModais(); prepararRevelacao(); prepararEventos();
