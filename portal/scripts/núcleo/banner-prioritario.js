const en=()=>document.documentElement.lang==='en';
const t=(pt,english)=>en()?english:pt;
let instancia;

function elemento(tag,classe,texto) {
  const el=document.createElement(tag);if(classe)el.className=classe;if(texto)el.textContent=texto;return el;
}

/** Independent of account, chat and the rest of the portal bootstrap. */
export async function iniciarBannerPrioritario() {
  if(instancia?.isConnected)return instancia;
  const cabecalho=document.querySelector('.cabeçalho, header');if(!cabecalho)return null;
  const regiao=elemento('section','aviso-prioritario');instancia=regiao;
  regiao.setAttribute('aria-label',t('Avisos do portal','Portal announcements'));
  cabecalho.insertAdjacentElement('afterend',regiao);
  let timer=null,itens=[],indice=0,pausado=false,hover=false,foco=false,visivel=true;
  const movimento=matchMedia('(prefers-reduced-motion: reduce)');
  function parar(){clearTimeout(timer);timer=null;}
  function agendar(){
    parar();if(itens.length<2||pausado||hover||foco||document.hidden||!visivel||movimento.matches||!regiao.isConnected)return;
    timer=setTimeout(()=>mostrar(indice+1,false),6500);
  }
  let conteudo,controles,marcador,pause;
  function mostrar(numero,manual=true){
    indice=(numero+itens.length)%itens.length;const item=itens[indice];
    conteudo.replaceChildren();regiao.dataset.alinhamento=item.alinhamento;regiao.dataset.fonte=item.fonte;
    regiao.dataset.animacao=item.animacao;regiao.style.setProperty('--aviso-cor',item.cor_texto);regiao.style.setProperty('--aviso-fundo',item.cor_fundo);
    regiao.style.setProperty('--aviso-peso',String(item.peso));
    const slide=elemento('div','aviso-prioritario__slide');slide.setAttribute('role','group');slide.setAttribute('aria-label',`${indice+1} ${t('de','of')} ${itens.length}`);
    if(item.imagem_url){const img=elemento('img','aviso-prioritario__imagem');img.src=item.imagem_url;img.alt=item.alt;img.decoding='async';img.addEventListener('error',()=>img.remove(),{once:true});slide.append(img);}
    const corpo=elemento('div','aviso-prioritario__corpo'),texto=elemento('div','aviso-prioritario__texto');
    texto.append(elemento('span','aviso-prioritario__rotulo',t('ANDER FLOW · AVISO','ANDER FLOW · ANNOUNCEMENT')),elemento('h2','',item.titulo));
    if(item.texto)texto.append(elemento('p','',item.texto));
    corpo.append(texto);
    if(item.url){const link=elemento('a','aviso-prioritario__link',item.botao);link.href=item.url;if(/^https:\/\//u.test(item.url)){link.rel='noopener noreferrer';}corpo.append(link);}
    slide.append(corpo);conteudo.append(slide);
    marcador.textContent=`${indice+1} / ${itens.length}`;
    conteudo.setAttribute('aria-live',manual?'polite':'off');agendar();
  }
  function botao(rotulo,conteudo,acao){const b=elemento('button','aviso-prioritario__controle',conteudo);b.type='button';b.setAttribute('aria-label',rotulo);b.addEventListener('click',acao);return b;}
  function montar(){
    regiao.replaceChildren();conteudo=elemento('div','aviso-prioritario__viewport');conteudo.setAttribute('aria-atomic','true');
    controles=elemento('div','aviso-prioritario__controles');marcador=elemento('span','aviso-prioritario__contador');
    if(itens.length>1){
      pause=botao(t('Pausar carrossel','Pause carousel'),'Ⅱ',()=>{pausado=!pausado;pause.textContent=pausado?'▷':'Ⅱ';pause.setAttribute('aria-label',pausado?t('Continuar carrossel','Resume carousel'):t('Pausar carrossel','Pause carousel'));pause.setAttribute('aria-pressed',String(pausado));agendar();});
      controles.append(botao(t('Aviso anterior','Previous announcement'),'‹',()=>mostrar(indice-1)),marcador,botao(t('Próximo aviso','Next announcement'),'›',()=>mostrar(indice+1)),pause);
    }
    regiao.append(conteudo,controles);mostrar(0,false);
  }
  async function carregar(){
    parar();regiao.hidden=true;regiao.dataset.estado='carregando';
    // Não cria uma faixa vazia que empurra o conteúdo quando ainda não existe aviso. Se a API
    // demorar, o esqueleto aparece no formato final; nas respostas rápidas e vazias, a página
    // permanece estável desde o primeiro quadro.
    let aguardando=true;
    const esqueleto=setTimeout(()=>{if(aguardando){regiao.hidden=false;regiao.replaceChildren(elemento('div','aviso-prioritario__esqueleto'));}},250);
    regiao.setAttribute('aria-busy','true');
    try {
      const r=await fetch(`/api/banners?idioma=${en()?'en':'pt-BR'}`,{credentials:'same-origin',signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw Error();const b=await r.json();if(!Array.isArray(b.itens))throw Error();
      itens=b.itens;regiao.dataset.estado='pronto';regiao.hidden=!itens.length;
      if(itens.length)montar();else regiao.replaceChildren();
    }catch{
      regiao.hidden=false;regiao.dataset.estado='erro';const linha=elemento('div','aviso-prioritario__falha');
      linha.append(elemento('p','',t('Não conseguimos carregar os avisos.','We could not load announcements.')),botao(t('Tentar novamente','Try again'),t('Tentar novamente','Try again'),carregar));regiao.replaceChildren(linha);
    }finally{aguardando=false;clearTimeout(esqueleto);regiao.removeAttribute('aria-busy');}
  }
  regiao.addEventListener('mouseenter',()=>{hover=true;parar();});regiao.addEventListener('mouseleave',()=>{hover=false;agendar();});
  regiao.addEventListener('focusin',()=>{foco=true;parar();});regiao.addEventListener('focusout',e=>{if(!regiao.contains(e.relatedTarget)){foco=false;agendar();}});
  document.addEventListener('visibilitychange',agendar);movimento.addEventListener('change',agendar);
  if('IntersectionObserver'in window){const io=new IntersectionObserver(([e])=>{visivel=e.isIntersecting;agendar();});io.observe(regiao);}
  await carregar();return regiao;
}
