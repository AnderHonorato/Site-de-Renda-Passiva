import { api,en,estado,mensagemErro,obterSessao } from './comum.js';
const form=document.getElementById('form-evento'),lista=document.getElementById('lista-eventos');let atual;
function editar(item) {
  atual=item;form.reset();form.hidden=false;
  for(const [k,v]of Object.entries(item||{inicio:new Date().toISOString().slice(0,10),fim:new Date().toISOString().slice(0,10),meta:3,xp:10}))if(form.elements[k]){if(k==='ativo')form.elements[k].checked=!!v;else form.elements[k].value=v;}
  form.elements.titulo_pt.focus();
}
async function carregar() {
  const {eventos}=await api('/api/admin/recompensas/eventos');lista.replaceChildren();
  for(const item of eventos){const card=document.createElement('article');card.className='painel recompensas__evento-admin';const titulo=document.createElement('h2');titulo.textContent=en?item.titulo_en:item.titulo_pt;
    const texto=document.createElement('p');texto.textContent=`${item.inicio} → ${item.fim} · ${item.meta} ${en?'tools':'ferramentas'} · +${item.xp} XP · ${item.ativo?(en?'Published':'Publicado'):(en?'Draft / paused':'Rascunho / pausado')}`;
    const b=document.createElement('button');b.type='button';b.className='botão botão--linha';b.textContent=en?'Edit':'Editar';b.onclick=()=>editar(item);card.append(titulo,texto,b);lista.append(card);
  }
  if(!eventos.length)lista.textContent=en?'No events created.':'Nenhum evento criado.';
}
document.getElementById('novo-evento').onclick=()=>editar(null);document.getElementById('cancelar-evento').onclick=()=>{form.hidden=true;atual=null;};
form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('[type="submit"]');b.disabled=true;
  try{const dados=Object.fromEntries(new FormData(form));dados.meta=Number(dados.meta);dados.xp=Number(dados.xp);dados.ativo=form.elements.ativo.checked;if(atual)dados.versao=atual.versao;
    await api('/api/admin/recompensas/eventos'+(atual?`/${atual.id}`:''),{metodo:atual?'PUT':'POST',dados});form.hidden=true;atual=null;await carregar();estado(en?'Event saved.':'Evento salvo.');
  }catch(e){estado(mensagemErro(e),true);}finally{b.disabled=false;}
});
try{const s=await obterSessao();if(s.usuario?.papel!=='admin'){form.hidden=true;document.getElementById('novo-evento').hidden=true;estado(en?'Administrator access required.':'Acesso de administrador necessário.',true);}else await carregar();}catch(e){estado(mensagemErro(e),true);}
