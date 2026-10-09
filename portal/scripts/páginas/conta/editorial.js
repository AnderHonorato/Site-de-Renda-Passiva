import { api,en,estado,mensagemErro,obterSessao } from './comum.js';
let atual,planos=[],ocupado=false;
const cat=document.getElementById('editorial-catalogo'),txt=document.getElementById('editorial-textos'),regras=document.getElementById('editorial-regras');
const el=(tag,texto)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;return n;};
function preencherItem(){const tipo=cat.elements.tipo.value,id=cat.elements.namedItem('item').value,base=atual.base[tipo].find(i=>(i.slug||i.id)===id);if(!base)return;
  for(const l of ['pt-BR','en']){const v=atual.rascunho[tipo][id]?.[l]||base[l];cat.elements[`nome_${l}`].value=v.nome;cat.elements[`resumo_${l}`].value=v.resumo;cat.elements[`nome_${l}`].maxLength=tipo==='ferramentas'?80:60;cat.elements[`resumo_${l}`].maxLength=tipo==='ferramentas'?130:160;}
}
function filtrar(){const tipo=cat.elements.tipo.value,antes=cat.elements.namedItem('item').value,filtro=cat.elements.filtro.value.toLocaleLowerCase();cat.elements.namedItem('item').replaceChildren();
  for(const i of atual.base[tipo]){const nome=i[en?'en':'pt-BR'].nome,id=i.slug||i.id;if(!`${nome} ${id}`.toLocaleLowerCase().includes(filtro))continue;const o=el('option',nome);o.value=id;cat.elements.namedItem('item').append(o);}
  if([...cat.elements.namedItem('item').options].some(o=>o.value===antes))cat.elements.namedItem('item').value=antes;preencherItem();
}
function preencherTexto(){const v=atual.rascunho.textos[txt.elements.chave.value]||{};for(const l of ['pt-BR','en']){txt.elements[l].value=v[l]||'';txt.elements[l].maxLength=txt.elements.chave.value==='inicio.titulo'?120:1000;}}
function numero(area,nome,rotulo,valor,max){const label=el('label');label.className='conta__campo';const input=el('input');input.type='number';input.name=nome;input.value=valor;input.min='0';input.max=max;input.required=true;label.append(el('span',rotulo),input);area.append(label);}
function preencher(){for(const f of [cat,txt,regras])f.hidden=false;document.getElementById('editorial-recuperar').hidden=!atual.publicando;document.getElementById('editorial-versao').textContent=en?`Draft ${atual.versao} · Published ${atual.publicada_versao}`:`Rascunho ${atual.versao} · Publicada ${atual.publicada_versao}`;filtrar();const anterior=txt.elements.chave.value;txt.elements.chave.replaceChildren();
  const nomes={'inicio.titulo':['Título do início','Home heading'],'inicio.descricao':['Descrição do início','Home description'],'ajuda.introducao':['Introdução da ajuda','Help introduction'],'planos.introducao':['Introdução de planos','Plans introduction']};
  for(const k of atual.base.textos){const o=el('option',nomes[k]?.[en?1:0]||k);o.value=k;txt.elements.chave.append(o);}if(anterior)txt.elements.chave.value=anterior;preencherTexto();
  const pontos=document.getElementById('editorial-pontos');pontos.replaceChildren();const labels={por_uso:['XP por ferramenta','XP per tool',10],por_mensagem:['XP por mensagem','XP per message',5],limite_diario:['Teto diário de atividade','Daily activity cap',500],limite_chat:['Teto compartilhado do chat','Shared chat cap',100],diaria:['Recompensa diária','Daily mission reward',50],semanal:['Recompensa semanal','Weekly mission reward',100]};
  for(const [k,v]of Object.entries(labels))numero(pontos,k,v[en?1:0],atual.rascunho.pontos[k],v[2]);
  const limites=document.getElementById('editorial-limites');limites.replaceChildren();
  for(const p of planos){const v=atual.rascunho.limites[p.id]||p,fs=el('fieldset');fs.append(el('legend',p.id));
    numero(fs,`${p.id}_favoritos`,en?'Synced favorites':'Favoritos sincronizados',v.limites.favoritos,2000);numero(fs,`${p.id}_trabalhos`,en?'Saved works':'Trabalhos salvos',v.limites.trabalhos,5000);
    numero(fs,`${p.id}_dados`,en?'Bytes per work':'Bytes por trabalho',v.dados_maximo_bytes,524288);numero(fs,`${p.id}_total`,en?'Total storage in bytes':'Armazenamento total em bytes',v.armazenamento_maximo_bytes,67108864);limites.append(fs);
  }
}
async function executar(acao){if(ocupado)return;ocupado=true;const botoes=[...document.querySelectorAll('#editorial button')];botoes.forEach(b=>b.disabled=true);
  try{await acao();estado(en?'Saved.':'Salvo.');}catch(e){estado(mensagemErro(e),true);}finally{ocupado=false;botoes.forEach(b=>b.disabled=b.id==='editorial-atualizar'?false:!atual||(b.id!=='editorial-recuperar'&&atual.publicando));}
}
async function salvar(rascunho){atual=await api('/api/admin/editorial',{metodo:'PUT',dados:{versao:atual.versao,dados:rascunho}});preencher();await historico();}
async function historico(){const {revisoes}=await api('/api/admin/editorial/historico'),area=document.getElementById('editorial-historico');area.replaceChildren();
  for(const r of revisoes){const p=el('p',`${r.versao} · ${r.acao} · ${r.criado_em} `),b=el('button',en?'Restore to draft':'Restaurar como rascunho');b.type='button';b.className='botão botão--linha';b.onclick=()=>executar(async()=>{atual=await api('/api/admin/editorial/restaurar',{metodo:'POST',dados:{id:r.id,versao:atual.versao}});preencher();await historico();});p.append(b);area.append(p);}
}
async function carregar(){const s=await obterSessao();if(s.usuario?.papel!=='admin')throw {message:'acesso_negado'};[atual,{planos}]=await Promise.all([api('/api/admin/editorial'),api('/api/planos')]);preencher();await historico();}
cat.elements.tipo.onchange=filtrar;cat.elements.filtro.oninput=filtrar;cat.elements.namedItem('item').onchange=preencherItem;txt.elements.chave.onchange=preencherTexto;
cat.onsubmit=e=>{e.preventDefault();void executar(async()=>{const r=structuredClone(atual.rascunho),tipo=cat.elements.tipo.value,id=cat.elements.namedItem('item').value;if(!id)return;r[tipo][id]={};for(const l of ['pt-BR','en'])r[tipo][id][l]={nome:cat.elements[`nome_${l}`].value,resumo:cat.elements[`resumo_${l}`].value};await salvar(r);});};
txt.onsubmit=e=>{e.preventDefault();void executar(async()=>{const r=structuredClone(atual.rascunho),k=txt.elements.chave.value,v={};for(const l of ['pt-BR','en'])if(txt.elements[l].value.trim())v[l]=txt.elements[l].value;r.textos[k]=v;if(!Object.keys(v).length)delete r.textos[k];await salvar(r);});};
regras.onsubmit=e=>{e.preventDefault();void executar(async()=>{const r=structuredClone(atual.rascunho);for(const k of Object.keys(r.pontos))r.pontos[k]=Number(regras.elements[k].value);for(const p of planos)r.limites[p.id]={limites:{favoritos:Number(regras.elements[`${p.id}_favoritos`].value),trabalhos:Number(regras.elements[`${p.id}_trabalhos`].value)},dados_maximo_bytes:Number(regras.elements[`${p.id}_dados`].value),armazenamento_maximo_bytes:Number(regras.elements[`${p.id}_total`].value)};await salvar(r);});};
document.getElementById('editorial-publicar').onclick=()=>executar(async()=>{estado(en?'Publishing…':'Publicando…');atual=await api('/api/admin/editorial/publicar',{metodo:'POST',dados:{versao:atual.versao},prazoMs:45000});preencher();await historico();});
document.getElementById('editorial-atualizar').onclick=()=>executar(carregar);
document.getElementById('editorial-recuperar').onclick=()=>executar(async()=>{atual=await api('/api/admin/editorial/recuperar',{metodo:'POST',dados:{},prazoMs:45000});preencher();});
await executar(carregar);
