/** Editor visual de linha do tempo: renderização real na API Node/FFmpeg. */
import {api,ErroApi} from './api.js';

const NOMES={
 video:{titulo:'Estúdio de vídeo',acao:'Renderizar vídeo',aceita:'.mp4,.webm,video/mp4,video/webm',mime:'video/',
  texto:'Combine vídeos, recorte cenas, ajuste cores e exporte um MP4 em 720p.'},
 audio:{titulo:'Estúdio de podcast',acao:'Produzir episódio',aceita:'.mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg',
  mime:'audio/',texto:'Organize trechos, ajuste volumes e gere um MP3 com fades e normalização.'}
};
const FILTROS=[
 ['neutro','Original'],['quente','Quente'],['frio','Frio'],
 ['pb','Preto e branco'],['cinema','Cinema']
];
const nomeArquivo=x=>String(x||'Mídia').slice(0,70);
const exibirTempo=t=>Number(t||0).toLocaleString('pt-BR',{maximumFractionDigits:1})+' s';
function no(tag,classe,texto){
 const e=document.createElement(tag);
 if(classe)e.className=classe;
 if(texto!==undefined)e.textContent=texto;
 return e;
}
function botao(texto,classe='botão botão--linha'){
 const e=no('button',classe,texto);e.type='button';return e;
}
function rotulo(texto,controle){
 const l=no('label','estudio__rotulo',texto);l.append(controle);return l;
}
function bloquear(el,valor){if(el)el.disabled=valor;}
function csrf(){
 const k=document.cookie.split('; ').find(s=>s.startsWith('__Host-csrf=')||s.startsWith('csrf='));
 try{return decodeURIComponent(k?.split('=').slice(1).join('=')||'');}catch{return '';}
}
function carregarCSS(){
 const href=new URL('../../estilos/estudio-midia-servidor.css',import.meta.url).href;
 if([...document.querySelectorAll('link[rel=stylesheet]')].some(l=>l.href===href))return;
 const l=no('link');l.rel='stylesheet';l.href=href;document.head.append(l);
}
export function criarEstudioVisual(tipo){
 const config=NOMES[tipo];
 if(!config)throw new Error('Tipo de estúdio inválido.');
 return {
  instruções:{
   passos:[
    'Abra o site completo com uma conta Premium e escolha até quatro mídias MP4, WebM, MP3, WAV ou OGG, conforme o estúdio.',
    'Toque nos clipes da linha do tempo para visualizar, recortar o início/fim e mudar a ordem pelas setas. Você pode duplicar um trecho.',
    'Defina o volume de cada trecho e, no vídeo, escolha um dos filtros visuais disponíveis.',
    'Inicie a renderização. O progresso mostrado vem do FFmpeg real em execução no servidor.',
    'Confira o resultado no player e baixe o MP4/MP3. Remova o projeto para excluir os arquivos temporários.'
   ],
   exemplo:{texto:tipo==='video'
    ?'Exemplo: vídeo de produto com abertura, demonstração e encerramento. Corte 0–4 s do primeiro clipe, use a segunda cena e aplique o filtro Quente.'
    :'Exemplo: podcast com introdução, entrevista e encerramento. Ajuste os cortes e o volume antes de renderizar um MP3 normalizado.'},
   limites:'Exige servidor Node com FFmpeg instalado, HTTPS e plano Premium. Até 4 arquivos de 25 MB cada, 8 trechos e 3 minutos de saída. Projeto temporário por 45 minutos. O vídeo é exportado em MP4 720p/24 fps com áudio AAC; episódios em MP3 normalizado. Nem todos os codecs e arquivos protegidos são aceitos. Somente dados de teste: não envie gravações privadas ao servidor experimental.',
   perguntas:[
    {p:'Esse processamento funciona no GitHub Pages?',r:'Não. A prévia estática não executa FFmpeg; é necessário o backend real e conta Premium.'},
    {p:'O progresso é uma animação simulada?',r:'Não. É calculado pelos timestamps que o FFmpeg informa, sem estimativa fictícia.'},
    {p:'Os arquivos ficam armazenados para sempre?',r:'Não. Projetos e resultados são temporários e excluídos após 45 minutos ou quando você remove o projeto.'}
   ]
  },
  montar(raiz,ferramenta){
   carregarCSS();raiz.classList.add('estudio-servidor');
   const estado={projeto:null,arquivos:[],trechos:[],ocupado:false,selecionado:null,contador:0,
    timer:null,renderizando:false};
   const card=no('div','estudio__painel');
   const topo=no('div','estudio__topo');
   topo.append(no('p','estudio__selo','Premium · FFmpeg no servidor'),
    no('h2','',config.titulo),no('p','estudio__descricao',config.texto));
   const painel=no('div','estudio__grade');
   const editor=no('section','estudio__editor');
   const envio=no('section','estudio__importacao');
   envio.append(no('h3','','1. Adicione mídias'));
   const entrada=no('input');entrada.type='file';entrada.multiple=true;entrada.accept=config.aceita;
   entrada.setAttribute('aria-label','Selecionar arquivos para edição');
   envio.append(entrada,no('p','estudio__dica','Até 4 arquivos · 25 MB cada · uso exclusivo de teste'));
   const linhaTopo=no('div','estudio__secao-topo');
   linhaTopo.append(no('h3','','2. Linha do tempo'));
   const contador=no('span','estudio__contador','0 trechos · 0 s');
   linhaTopo.append(contador);
   const lista=no('ol','estudio__timeline');
   lista.setAttribute('aria-label','Sequência editável de clipes');
   const vazio=no('div','estudio__vazio','Seus clipes aparecerão aqui. Reordene, corte e ajuste antes de renderizar.');
   const acoes=no('div','estudio__acoes');
   const executar=botao(config.acao,'botão botão--g');
   const cancelar=botao('Cancelar renderização');
   const limpar=botao('Excluir projeto');
   cancelar.hidden=true;limpar.hidden=true;executar.disabled=true;
   acoes.append(executar,cancelar,limpar);
   const andamento=no('section','estudio__andamento');
   andamento.hidden=true;
   const tituloAndamento=no('p','','Preparando…');
   const barra=no('progress');barra.max=100;barra.value=0;
   barra.setAttribute('aria-label','Progresso real da renderização');
   andamento.append(tituloAndamento,barra);
   const aviso=no('p','estudio__status');
   aviso.setAttribute('role','status');aviso.setAttribute('aria-live','polite');
   editor.append(envio,linhaTopo,lista,vazio,acoes,andamento,aviso);
   const lateral=no('aside','estudio__lateral');
   lateral.append(no('h3','','3. Prévia'));
   const caixaPrevia=no('div','estudio__previa');
   const placeholder=no('div','estudio__placeholder');
   placeholder.append(no('span','estudio__forma',tipo==='video'?'▣':'≋'),
    no('p','','Toque em um clipe para visualizar'));
   caixaPrevia.append(placeholder);
   const resultado=no('div','estudio__resultado');resultado.hidden=true;
   lateral.append(caixaPrevia,resultado,no('p','estudio__dica','Vídeos em 720p e áudio normalizado. A renderização roda na nuvem, não no celular.'));
   painel.append(editor,lateral);
   card.append(topo,painel);raiz.replaceChildren(card);
   let tocando=null;
   function mensagem(valor,erro=false){aviso.textContent=valor;aviso.dataset.erro=erro?'sim':'nao';}
   function endereco(resto=''){return '/api/estudio/sessoes/'+estado.projeto.id+resto;}
   function total(){
    return estado.trechos.reduce((s,t)=>s+Math.max(0,Number(t.fim)-Number(t.inicio)),0);
   }
   function validarTrechos(){
    if(!estado.trechos.length)throw Error('Adicione ao menos um trecho.');
    for(const [i,t] of estado.trechos.entries()){
     const a=estado.arquivos.find(f=>f.id===t.arquivo);
     if(!a||!Number.isFinite(t.inicio)||!Number.isFinite(t.fim)||t.inicio<0||
       t.fim-t.inicio<0.2||t.fim>a.duracao+0.005)
      throw Error('Revise o início e o fim do trecho '+(i+1)+'.');
    }
    if(total()>180)throw Error('A edição ultrapassa 3 minutos.');
    return estado.trechos.map(t=>({arquivo:t.arquivo,inicio:t.inicio,fim:t.fim,
     volume:t.volume,filtro:t.filtro}));
   }
   function renderLista(){
    lista.replaceChildren();
    contador.textContent=estado.trechos.length+' trechos · '+exibirTempo(total());
    vazio.hidden=estado.trechos.length>0;
    executar.disabled=estado.ocupado||!estado.trechos.length;
    limpar.hidden=!estado.projeto;
    estado.trechos.forEach((t,i)=>{
     const arquivo=estado.arquivos.find(f=>f.id===t.arquivo);
     const item=no('li','estudio__clipe');
     item.dataset.selecionado=estado.selecionado===i?'sim':'nao';
     const cab=no('div','estudio__clipe-topo');
     const abrir=botao((i+1)+'. '+nomeArquivo(arquivo?.nome),'estudio__clipe-titulo');
     abrir.setAttribute('aria-label','Prévia do clipe '+(i+1));
     abrir.onclick=()=>{estado.selecionado=i;mostrarPrevia(t.arquivo);renderLista();};
     const subir=botao('↑','estudio__mini');
     subir.disabled=i===0;subir.title='Mover clipe para cima';
     subir.setAttribute('aria-label','Mover trecho '+(i+1)+' para cima');
     subir.onclick=()=>mover(i,-1);
     const descer=botao('↓','estudio__mini');descer.disabled=i===estado.trechos.length-1;
     descer.title='Mover clipe para baixo';
     descer.setAttribute('aria-label','Mover trecho '+(i+1)+' para baixo');
     descer.onclick=()=>mover(i,1);
     const repetir=botao('Duplicar','estudio__mini');repetir.disabled=estado.trechos.length>=8;
     repetir.onclick=()=>{estado.trechos.splice(i+1,0,{...t});renderLista();};
     const excluir=botao('×','estudio__mini');
     excluir.setAttribute('aria-label','Remover trecho '+(i+1));
     excluir.onclick=()=>{estado.trechos.splice(i,1);estado.selecionado=null;renderLista();};
     cab.append(abrir,subir,descer,repetir,excluir);
     const campos=no('div','estudio__controles');
     for(const [chave,nome] of [['inicio','Início (s)'],['fim','Fim (s)']]){
      const input=no('input');input.type='number';input.min='0';input.max=String(arquivo?.duracao||180);
      input.step='0.1';input.value=String(t[chave]);
      input.addEventListener('change',()=>{
       const n=Number(input.value);
       if(Number.isFinite(n))t[chave]=n;
       contador.textContent=estado.trechos.length+' trechos · '+exibirTempo(total());
       mensagem('Ajuste pronto. Renderize para aplicar os cortes.');
      });
      campos.append(rotulo(nome,input));
     }
     const volume=no('input');volume.type='range';volume.min='0';volume.max='2';volume.step='0.05';volume.value=String(t.volume);
     const labelVolume=rotulo('Volume · '+Math.round(t.volume*100)+'%',volume);
     volume.oninput=()=>{t.volume=Number(volume.value);labelVolume.firstChild.textContent='Volume · '+Math.round(t.volume*100)+'%';};
     campos.append(labelVolume);
     if(tipo==='video'){
      const selecao=no('select');
      FILTROS.forEach(([k,v])=>{const opt=no('option','',v);opt.value=k;opt.selected=t.filtro===k;selecao.append(opt);});
      selecao.onchange=()=>{t.filtro=selecao.value;mensagem('Filtro aplicado na próxima renderização.');};
      campos.append(rotulo('Cor do clipe',selecao));
     }
     item.append(cab,campos);lista.append(item);
    });
   }
   function mover(i,delta){
    const [t]=estado.trechos.splice(i,1);
    estado.trechos.splice(i+delta,0,t);
    estado.selecionado=i+delta;renderLista();
   }
   function mostrarPrevia(id,resultadoFinal=false){
    if(tocando){tocando.pause();tocando.remove();tocando=null;}
    caixaPrevia.replaceChildren();
    const m=no(tipo==='video'?'video':'audio','estudio__player');
    m.controls=true;m.preload='metadata';
    if(tipo==='video')m.playsInline=true;
    m.src=resultadoFinal?endereco('/resultado'):endereco('/arquivos/'+id);
    caixaPrevia.append(m);tocando=m;
   }
   async function criarProjeto(){
    if(estado.projeto)return;
    await api('/api/autenticacao/sessao');
    const data=await api('/api/estudio/sessoes',{metodo:'POST',dados:{tipo}});
    estado.projeto=data.projeto;limpar.hidden=false;
   }
   async function upload(arquivo){
    const response=await fetch(endereco('/arquivos'),{
     method:'POST',headers:{'Content-Type':arquivo.type,'X-CSRF-Token':csrf()},
     credentials:'same-origin',body:arquivo
    });
    const dados=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(dados.erro||'Falha no envio.');return dados.arquivo;
   }
   entrada.onchange=async()=>{
    const escolhidos=[...entrada.files];entrada.value='';
    if(!escolhidos.length||estado.ocupado)return;
    if(escolhidos.length+estado.arquivos.length>4){
      mensagem('Limite de quatro arquivos por projeto.',true);return;
    }
    estado.ocupado=true;renderLista();bloquear(entrada,true);
    try{
     await criarProjeto();
     for(let i=0;i<escolhidos.length;i++){
      const f=escolhidos[i];
      if(f.size>25*1024*1024||f.size<20)throw Error('Arquivo inválido ou acima de 25 MB.');
      mensagem('Enviando arquivo '+(i+1)+' de '+escolhidos.length+'…');
      const info=await upload(f);
      estado.arquivos.push({...info,nome:f.name});
      const fim=Math.min(info.duracao,25);
      estado.trechos.push({arquivo:info.id,inicio:0,fim:Math.round(fim*10)/10,
       volume:1,filtro:'neutro'});
      if(estado.selecionado===null){estado.selecionado=0;mostrarPrevia(info.id);}
     }
     mensagem('Mídias prontas para editar. Ajuste os trechos e renderize.');
    }catch(e){
     mensagem(e instanceof ErroApi&&e.status===403?'Sua conta precisa do plano Premium para processar na API.':e.message||'Envio indisponível.',true);
    }finally{estado.ocupado=false;bloquear(entrada,false);renderLista();}
   };
   async function acompanhar(){
    if(!estado.projeto||!estado.renderizando||!raiz.isConnected)return;
    try{
     const x=(await api(endereco(),{prazoMs:12000})).projeto;
     barra.value=x.progresso;
     tituloAndamento.textContent=x.estado==='processando'
      ?'Renderizando no servidor · '+x.progresso+'%':x.estado==='concluido'?'Arquivo pronto':'Conferindo resultado…';
     if(x.estado==='concluido'){
      estado.renderizando=false;estado.ocupado=false;renderLista();
      cancelar.hidden=true;andamento.hidden=true;
      mostrarPrevia(null,true);
      resultado.replaceChildren();
      resultado.append(no('p','estudio__selo','Concluído · '+exibirTempo(x.duracao)));
      const link=no('a','botão botão--g','Baixar '+(tipo==='video'?'MP4':'MP3'));
      link.href=endereco('/resultado');link.download=tipo==='video'?'video-editado.mp4':'episodio-editado.mp3';
      resultado.append(link);resultado.hidden=false;
      mensagem('Seu arquivo foi renderizado pelo servidor e está pronto para baixar.');
      return;
     }
     if(['erro','cancelado'].includes(x.estado)){
      estado.renderizando=false;estado.ocupado=false;renderLista();
      cancelar.hidden=true;andamento.hidden=true;
      mensagem(x.mensagem||'Renderização não concluída.',true);return;
     }
    }catch(e){mensagem('Conexão com o servidor interrompida. Tentando verificar o progresso…',true);}
    estado.timer=setTimeout(acompanhar,1200);
   }
   executar.onclick=async()=>{
    if(estado.ocupado||!estado.projeto)return;
    let trechos;
    try{trechos=validarTrechos();}catch(e){mensagem(e.message,true);return;}
    estado.ocupado=true;estado.renderizando=true;renderLista();
    resultado.hidden=true;andamento.hidden=false;barra.value=0;
    cancelar.hidden=false;tituloAndamento.textContent='Preparando renderização…';
    try{
     await api(endereco('/renderizar'),{metodo:'POST',dados:{trechos},prazoMs:20000});
     mensagem('O servidor está processando '+estado.trechos.length+' trechos.');
     void acompanhar();
    }catch(e){
     estado.renderizando=false;estado.ocupado=false;cancelar.hidden=true;andamento.hidden=true;
     renderLista();mensagem(e.message||'Falha ao iniciar a renderização.',true);
    }
   };
   cancelar.onclick=async()=>{
    if(!estado.renderizando)return;
    bloquear(cancelar,true);
    try{
     await api(endereco('/cancelar'),{metodo:'POST'});
     estado.renderizando=false;estado.ocupado=false;
     clearTimeout(estado.timer);andamento.hidden=true;cancelar.hidden=true;
     renderLista();mensagem('Renderização interrompida.');
    }catch(e){mensagem(e.message,true);}finally{bloquear(cancelar,false);}
   };
   limpar.onclick=async()=>{
    if(!estado.projeto)return;
    try{
     await api(endereco(),{metodo:'DELETE'});
     clearTimeout(estado.timer);tocando?.pause();
     estado.projeto=null;estado.arquivos=[];estado.trechos=[];estado.selecionado=null;
     estado.ocupado=false;estado.renderizando=false;
     resultado.hidden=true;andamento.hidden=true;
     caixaPrevia.replaceChildren(placeholder);
     renderLista();mensagem('Projeto excluído; mídias temporárias apagadas do servidor.');
    }catch(e){mensagem(e.message,true);}
   };
   renderLista();
  }
 };
}