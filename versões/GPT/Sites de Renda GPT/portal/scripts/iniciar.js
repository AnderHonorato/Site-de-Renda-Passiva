import {ferramentas} from './catalogo.js';
import {categorias} from './categorias.js';
import {elemento,icone,botao} from './elemento.js';
import {filtrar} from './filtrar.js';
import {ler,guardar,validarBackup} from './armazenamento.js';
import {renderizarFerramenta} from './renderizar-ferramenta.js';
import {configurarPrivacidade} from './privacidade.js';
import {notificar} from './notificar.js';
import {baixar} from './baixar.js';
import {renderizarApoio} from './renderizar-apoio.js';
import {renderizarLegal} from './renderizar-legal.js';
import {iniciarExperiencia,registrarRecente,renderizarRecentes} from './experiencia.js';
import {iniciarEstudio} from './estudio-arquivos.js';
const $=id=>document.getElementById(id);let limite=24;let soFavoritos=false;let favoritos=ler('favoritos',[]);if(!Array.isArray(favoritos))favoritos=[];
let configuracao={};try{const resposta=await fetch('configurações/publica.json');if(resposta.ok)configuracao=await resposta.json();}catch{notificar('Configuração de contato indisponível. As ferramentas continuam funcionando.');}
for(const c of categorias){const op=elemento('option','',c.nome);op.value=c.id;$('categoria').append(op);}
const opcoes=[{id:0,nome:'Todas'},...categorias.filter(c=>[1,2,5,8,9,14].includes(c.id))];
for(const c of opcoes){const b=botao(c.nome,()=>{$('categoria').value=c.id;limite=24;renderizarCatalogo();},'filtro');b.dataset.categoria=c.id;b.setAttribute('aria-pressed',String(c.id===0));if(c.icone)b.prepend(icone(c.icone));$('atalhos').append(b);}
function abrir(f,registro){const categoria=categorias.find(c=>c.id===f.categoria);registrarRecente(f,categoria);const similares=ferramentas.filter(item=>item.categoria===f.categoria&&item.id!==f.id).slice(0,3);renderizarFerramenta(f,categoria,registro,similares,item=>abrir(item));}
function renderizarCatalogo(){
 const lista=filtrar(ferramentas,{busca:$('busca').value,categoria:$('categoria').value,favoritos:soFavoritos?favoritos:null},categorias);$('contagem').textContent=`${lista.length} ${lista.length===1?'ferramenta encontrada':'ferramentas encontradas'}`;
 $('atalhos').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.categoria===$('categoria').value)));
 const fragmento=document.createDocumentFragment();
 for(const f of lista.slice(0,limite)){const c=categorias.find(c=>c.id===f.categoria);const card=elemento('article','cartao');card.style.setProperty('--destaque',c.cor);const topo=elemento('div','cartao-topo');const grafico=elemento('span','icone-ferramenta');grafico.append(icone(c.icone));topo.append(grafico,elemento('span','',c.nome));
  const favorito=botao('',()=>{favoritos=favoritos.includes(f.id)?favoritos.filter(id=>id!==f.id):[...favoritos,f.id];if(!guardar('favoritos',favoritos))notificar('Favorito disponível apenas nesta sessão: armazenamento bloqueado.');renderizarCatalogo();},'favoritar');favorito.setAttribute('aria-label',`${favoritos.includes(f.id)?'Remover dos':'Adicionar aos'} favoritos: ${f.titulo}`);favorito.setAttribute('aria-pressed',String(favoritos.includes(f.id)));favorito.append(icone('bookmark'));
  const abrirBotao=botao('Abrir ferramenta',()=>abrir(f),'abrir-ferramenta');abrirBotao.setAttribute('aria-label','Abrir '+f.titulo);abrirBotao.append(icone('arrow-up-right'));card.append(topo,favorito,elemento('h3','',f.titulo),elemento('p','',f.descricao),abrirBotao);fragmento.append(card);
 }
 if(!lista.length)fragmento.append(elemento('p','vazio',soFavoritos?'Nenhum favorito neste filtro. Marque ferramentas pelo botão de favorito.':'Não encontramos uma ferramenta. Experimente outra palavra ou escolha todas as categorias.'));
 $('lista-ferramentas').replaceChildren(fragmento);$('ver-mais').hidden=lista.length<=limite;$('ver-mais').textContent=`Mostrar mais (${lista.length-Math.min(limite,lista.length)} restantes)`;
}
$('busca').oninput=()=>{limite=24;renderizarCatalogo();};$('categoria').onchange=()=>{limite=24;renderizarCatalogo();};$('ver-mais').onclick=()=>{limite+=24;renderizarCatalogo();};$('apenas-favoritos').onclick=()=>{soFavoritos=!soFavoritos;$('apenas-favoritos').setAttribute('aria-pressed',String(soFavoritos));limite=24;renderizarCatalogo();};
function renderizarSalvos(){const registros=ler('registros',[]);const alvo=$('registros');alvo.replaceChildren();if(!registros.length){alvo.append(elemento('p','vazio','Seu próximo plano começa aqui. Abra uma ferramenta, gere um resultado e escolha Salvar no aparelho.'));return;}
 for(const r of registros){const f=ferramentas.find(f=>f.id===r.ferramenta);if(!f)continue;const card=elemento('article','registro');const acoes=elemento('div','acoes');acoes.append(botao('Continuar',()=>abrir(f,r)),botao('Duplicar',()=>{const todos=ler('registros',[]);if(todos.length>=200){notificar('Limite de 200 registros.');return;}todos.unshift({...r,id:crypto.randomUUID(),nome:(r.nome+' (cópia)').slice(0,120)});if(guardar('registros',todos))renderizarSalvos();else notificar('Não foi possível salvar a cópia.');}),botao('Excluir',()=>{const d=$('confirmacao');$('confirmar-exclusao').onclick=()=>{if(guardar('registros',ler('registros',[]).filter(x=>x.id!==r.id))){d.close();renderizarSalvos();notificar('Registro excluído.');}else notificar('Não foi possível excluir.');};d.showModal();}));card.append(elemento('h3','',r.nome),elemento('small','',f.titulo),acoes);alvo.append(card);}
}
$('exportar').onclick=()=>baixar(new Blob([JSON.stringify({versao:1,registros:ler('registros',[])},null,2)],{type:'application/json'}),'doce-oficio-meus-salvos.json');
$('importar').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('A cópia deve ter até 2 MB.');const registros=validarBackup(await file.text(),ferramentas.map(f=>f.id));const existentes=ler('registros',[]);if(existentes.length+registros.length>200)throw Error('A importação excederia 200 registros.');if(!guardar('registros',[...registros,...existentes]))throw Error('Não foi possível guardar os registros.');renderizarSalvos();notificar(`${registros.length} registros importados.`);}catch(e){notificar('Importação não realizada: '+e.message);}finally{e.target.value='';}};
function navegar(){const hash=decodeURIComponent(location.hash.slice(1)||'inicio');const inicial=['inicio','ferramentas','sobre','como-funciona'].includes(hash);$('pagina-inicio').hidden=!inicial;$('pagina-salvos').hidden=hash!=='salvos';$('pagina-apoio').hidden=hash!=='apoiar';$('pagina-legal').hidden=inicial||['salvos','apoiar'].includes(hash);
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('.navegacao-mobile a').forEach(a=>{if(a.hash===location.hash||(hash==='inicio'&&a.hash==='#inicio'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(hash==='salvos')renderizarSalvos();else if(hash==='apoiar')renderizarApoio(configuracao);else if(!inicial)renderizarLegal(hash,configuracao);
 if(inicial){requestAnimationFrame(()=>$(hash)?.scrollIntoView({behavior:'instant'}));}else window.scrollTo({top:0,behavior:'instant'});
 document.title=hash==='inicio'?'Doce Ofício — pequenas contas, grandes planos':`${hash==='ferramentas'?'150 ferramentas':hash==='salvos'?'Meus salvos':hash==='apoiar'?'Apoiar':'Doce Ofício'} · Doce Ofício`;
}
document.querySelectorAll('[data-fechar]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('mais').onclick=()=>$('menu-mais').showModal();window.addEventListener('hashchange',navegar);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();location.hash='ferramentas';setTimeout(()=>$('busca').focus(),0);}});
configurarPrivacidade();renderizarCatalogo();iniciarEstudio();iniciarExperiencia(categorias,id=>{const ferramenta=ferramentas.find(item=>item.id===id);if(ferramenta)abrir(ferramenta);});renderizarRecentes(id=>{const ferramenta=ferramentas.find(item=>item.id===id);if(ferramenta)abrir(ferramenta);});navegar();
