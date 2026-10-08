import { api,en,estado,mensagemErro,obterSessao } from './comum.js';
const t=(pt,english)=>en?english:pt;
const form=document.getElementById('form-banner'),lista=document.getElementById('lista-banners');
const campos=['titulo_pt','texto_pt','titulo_en','texto_en','botao_pt','botao_en','url','alt_pt','alt_en','cor_texto','cor_fundo','alinhamento','peso','fonte','animacao','ordem'];
const padrao={cor_texto:'#fff7ed',cor_fundo:'#452c24',alinhamento:'inicio',peso:600,fonte:'site',animacao:'deslizar',ordem:0};
let editando=null,ocupado=false;
function claro(e){return ({banner_desatualizado:t('Outra alteração foi salva. Atualize a lista antes de editar novamente.','Another change was saved. Refresh the list before editing again.'),contraste_insuficiente:t('Escolha cores com maior contraste para manter o texto legível.','Choose colors with greater contrast to keep text readable.'),cor_invalida:t('Confira as cores.','Check the colors.'),limite_banners:t('Desative um aviso antes de ultrapassar 12 ativos.','Disable an announcement before exceeding 12 active items.'),link_invalido:t('Use um link interno fora da API e do admin, ou um endereço HTTPS sem senha.','Use an internal link outside API and admin, or an HTTPS address without credentials.'),alt_obrigatorio:t('Descreva a imagem em português e inglês.','Describe the image in Portuguese and English.'),data_invalida:t('Confira as datas de publicação e retirada.','Check publication and withdrawal dates.')})[e.message]||mensagemErro(e);}
function local(data){if(!data)return '';const d=new Date(data);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function editar(item=null){
  if(ocupado)return;editando=item;form.reset();form.hidden=false;
  for(const campo of campos)form.elements[campo].value=item?.[campo]??padrao[campo]??'';
  for(const campo of ['publicar_em','retirar_em'])form.elements[campo].value=local(item?.[campo]);
  form.elements.ativo.checked=!!item?.ativo;form.elements.titulo_pt.focus();
}
function valores(){const b=Object.fromEntries(new FormData(form));return {...Object.fromEntries(campos.map(c=>[c,b[c]])),peso:Number(b.peso),ordem:Number(b.ordem),ativo:form.elements.ativo.checked,versao:editando?.versao,publicar_em:b.publicar_em?new Date(b.publicar_em).toISOString():null,retirar_em:b.retirar_em?new Date(b.retirar_em).toISOString():null};}
async function atualizar(){
  const b=await api('/api/admin/banners');lista.replaceChildren();
  if(!b.itens.length){const p=document.createElement('p');p.textContent=t('Nenhum aviso criado. O cabeçalho fica livre até você publicar.','No announcements created. The header stays clear until you publish.');lista.append(p);}
  for(const item of b.itens){
    const artigo=document.createElement('article');artigo.className='painel conta__denuncia';
    const titulo=document.createElement('b');titulo.textContent=`${item.ordem} · ${en?item.titulo_en:item.titulo_pt}`;
    const status=document.createElement('p');status.textContent=!item.ativo?t('Rascunho','Draft'):item.retirar_em&&Date.parse(item.retirar_em)<=Date.now()?t('Retirado','Withdrawn'):item.publicar_em&&Date.parse(item.publicar_em)>Date.now()?t('Agendado','Scheduled'):t('Publicado','Published');
    const acoes=document.createElement('div');acoes.className='ações';
    const abrir=document.createElement('button');abrir.type='button';abrir.className='botão botão--linha';abrir.textContent=t('Editar','Edit');abrir.addEventListener('click',()=>editar(item));
    const remover=document.createElement('button');remover.type='button';remover.className='botão botão--texto';remover.textContent=t('Remover','Remove');
    remover.addEventListener('click',async()=>{if(ocupado)return;if(remover.dataset.confirmar!=='sim'){remover.dataset.confirmar='sim';remover.textContent=t('Confirmar remoção','Confirm removal');return;}ocupado=true;remover.disabled=true;try{await api(`/api/admin/banners/${item.id}`,{metodo:'DELETE',dados:{versao:item.versao}});if(editando?.id===item.id){editando=null;form.hidden=true;}await atualizar();estado(t('Aviso removido.','Announcement removed.'));}catch(e){estado(claro(e),true);remover.disabled=false;}finally{ocupado=false;}});
    acoes.append(abrir,remover);artigo.append(titulo,status,acoes);lista.append(artigo);
  }
}
async function enviarImagem(item,arquivo,remover){
  let csrf='';try{csrf=decodeURIComponent(document.cookie.split('; ').find(x=>/^(__Host-)?csrf=/u.test(x))?.split('=')[1]||'');}catch{}
  const r=await fetch(`/api/admin/banners/${item.id}/imagem`,{method:remover?'DELETE':'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf,'X-Banner-Versao':String(item.versao),...(arquivo?{'Content-Type':arquivo.type}:{})},body:remover?undefined:arquivo,signal:AbortSignal.timeout(10000)});
  const b=await r.json();if(!r.ok)throw Error(b.erro);return b.item;
}
try {
  if((await obterSessao()).usuario?.papel!=='admin')location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
  else {
    document.getElementById('novo-banner').addEventListener('click',()=>editar());
    document.getElementById('cancelar-banner').addEventListener('click',()=>{if(!ocupado){editando=null;form.hidden=true;}});
    document.getElementById('atualizar-banners').addEventListener('click',()=>{if(!ocupado)atualizar().catch(e=>estado(claro(e),true));});
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(ocupado)return;const arquivo=form.elements.imagem.files[0],remover=form.elements.remover_imagem.checked;
      if(arquivo&&(arquivo.size>1048576||!['image/png','image/jpeg','image/webp'].includes(arquivo.type))){estado(t('Use PNG, JPEG ou WebP até 1 MB.','Use PNG, JPEG or WebP up to 1 MB.'),true);return;}
      const b=valores();if(arquivo&&(!b.alt_pt||!b.alt_en)){estado(claro(Error('alt_obrigatorio')),true);return;}
      ocupado=true;const botao=form.querySelector('[type="submit"]');botao.disabled=true;
      try {
        const atualizarImagem=!!arquivo||remover;
        let r=await api(editando?`/api/admin/banners/${editando.id}`:'/api/admin/banners',{metodo:editando?'PUT':'POST',dados:{...b,ativo:atualizarImagem?false:b.ativo}});editando=r.item;
        if(atualizarImagem){editando=await enviarImagem(editando,arquivo,remover&&!arquivo);if(b.ativo){r=await api(`/api/admin/banners/${editando.id}`,{metodo:'PUT',dados:{...b,versao:editando.versao}});editando=r.item;}}
        form.hidden=true;editando=null;await atualizar();estado(t('Aviso salvo. Reabra a página do portal para conferir.','Announcement saved. Reopen the portal page to inspect.'));
      }catch(e){estado(claro(e),true);if(editando)form.elements.ativo.checked=editando.ativo;}
      finally{ocupado=false;botao.disabled=false;}
    });
    await atualizar();
  }
}catch(e){estado(claro(e),true);}
