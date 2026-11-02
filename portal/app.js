const RAIZ = '../';
const categorias = [
  {id:'confeitaria',nome:'Confeitaria',pasta:'1. Ferramentas para confeitaria',letra:'C'},
  {id:'educacao',nome:'Educação',pasta:'2. Atividades escolares para imprimir',letra:'E'},
  {id:'artesanato',nome:'Crochê e artesanato',pasta:'3. Ferramentas para crochê e artesanato',letra:'A'},
  {id:'festas',nome:'Churrasco e festas',pasta:'4. Planejamento de churrasco e festas',letra:'F'},
  {id:'reforma',nome:'Pintura e reforma',pasta:'5. Calculadoras de pintura e reforma',letra:'R'},
  {id:'embalagens',nome:'Caixas e embalagens',pasta:'6. Moldes de caixas e embalagens',letra:'M'}
];

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
  url:`${RAIZ}${encodeURI(cat.pasta)}/páginas/ferramentas.html`
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

function ferramentaCard(f,compacto=false){
  return `<a class="cartao" href="${f.url}" data-ferramenta="${f.id}" ${compacto?'data-compacto="true"':''}>
    <span class="cartao__icone" aria-hidden="true">${f.letra}</span>
    <h3>${escapar(f.nome)}</h3>
    <p>${escapar(f.descricao)}</p>
    <footer><span class="cartao__categoria">${escapar(f.categoriaNome)}</span><span class="cartao__seta" aria-hidden="true">↗</span></footer>
  </a>`;
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

function carregarRecentes(){
  try{return JSON.parse(localStorage.getItem('ander.portal.recentes')||'[]')}catch{return []}
}
function salvarRecente(id){
  const atual=carregarRecentes().filter(x=>x!==id); atual.unshift(id); localStorage.setItem('ander.portal.recentes',JSON.stringify(atual.slice(0,8)));
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
  $('#busca').addEventListener('input',renderizar);
  $('#grade-ferramentas').addEventListener('click',e=>{const a=e.target.closest('[data-ferramenta]');if(a)salvarRecente(a.dataset.ferramenta)});
  $('#grade-recentes').addEventListener('click',e=>{const a=e.target.closest('[data-ferramenta]');if(a)salvarRecente(a.dataset.ferramenta)});
  $('#limpar-recentes').addEventListener('click',()=>{localStorage.removeItem('ander.portal.recentes');renderizarRecentes();toast('Histórico local limpo.')});
  $('#banner-anterior').addEventListener('click',()=>proximoBanner(-1));
  $('#banner-proximo').addEventListener('click',()=>proximoBanner(1));
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();$('#busca').focus()}});
  setInterval(()=>proximoBanner(1),30000);
  let dica=0; setTimeout(()=>{toast(dicas[dica++%dicas.length]);setInterval(()=>toast(dicas[dica++%dicas.length]),45000)},12000);
}

montarFaixa(); montarCategorias(); montarBanner(); renderizar(); renderizarRecentes(); prepararModais(); prepararRevelacao(); prepararEventos();
