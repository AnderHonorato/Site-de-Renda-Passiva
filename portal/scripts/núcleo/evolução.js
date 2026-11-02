import { criarIconeMedalha } from './emblemas.js';
import { criarSeloRank } from './ranks.js';
import { rankDoNivel } from '../../dados/recompensas.js';
import { tocarSom } from './sons.js';
import { api } from './api.js';
import { registrarFonte } from './notificações.js';
import { ícone } from './ícones.js';

const en = () => document.documentElement.lang === 'en';

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

const fila=[];
const enfileiradas=new Set();
let exibindo=false,pedido;
function celebrar(conquista) {
  const dialogo=elemento('dialog','conquista');
  dialogo.setAttribute('aria-labelledby','conquista-titulo');
  dialogo.setAttribute('aria-describedby','conquista-texto');
  const luz=elemento('div','conquista__luz');luz.setAttribute('aria-hidden','true');
  const conteudo=elemento('div','conquista__conteudo');
  const etiqueta=elemento('p','conquista__etiqueta',en()?'A new milestone':'Uma nova conquista');
  const palco=elemento('div','conquista__palco');
  const nivel=conquista.tipo==='nivel',missao=conquista.tipo==='missao';
  if(missao)dialogo.classList.add('conquista--missao');
  if(missao){const selo=elemento('div','conquista__missao');const estrela=elemento('span');estrela.innerHTML=ícone('estrela');selo.append(estrela,elemento('b','',`+${conquista.xp} XP`));palco.append(selo);}else palco.append(nivel?criarSeloRank(conquista.nivel,{ingles:en()}):criarIconeMedalha(conquista.medalha));
  palco.dataset.tier=String(missao?3:conquista.medalha?.tier??Math.min(7,Math.floor(conquista.nivel/2)));
  const titulo=elemento('h2','',missao?conquista.titulo:nivel?(en()?`Level ${conquista.nivel} unlocked!`:`Nível ${conquista.nivel} desbloqueado!`):(conquista.medalha.nome));titulo.id='conquista-titulo';
  const rank=nivel?rankDoNivel(conquista.nivel):null;
  const texto=elemento('p','',missao?(en()?`Mission completed! ${conquista.xp} XP have been added to your progress.`:`Missão concluída! ${conquista.xp} XP foram acrescentados à sua evolução.`):nivel?`${en()?rank.nome_en:rank.nome} ${rank.subnivel} · ${en()?'Explore the profile styles you have unlocked.':'Confira os visuais que você desbloqueou no perfil.'}`:`${conquista.medalha.patamar} · ${conquista.medalha.descricao}`);texto.id='conquista-texto';
  const continuar=elemento('button','botão botão--primário',en()?'Continue':'Continuar');continuar.type='button';continuar.addEventListener('click',()=>dialogo.close());
  conteudo.append(etiqueta,palco,titulo,texto,continuar);dialogo.append(luz,conteudo);document.body.append(dialogo);
  dialogo.showModal();tocarSom(nivel?'nivel':'conquista');
  return new Promise(resolve=>dialogo.addEventListener('close',()=>{dialogo.remove();resolve();},{once:true}));
}
async function consumirFila(){
  if(exibindo)return;exibindo=true;
  try{while(fila.length){const item=fila.shift();
    await esperarOutrosDialogos();
    if(item.chave){try{const resposta=await api('/api/conquistas/receber',{metodo:'POST',dados:{chave:item.chave}});if(!resposta.recebida){enfileiradas.delete(item.chave);continue;}}catch{enfileiradas.delete(item.chave);continue;}}
    await esperarOutrosDialogos();
    await celebrar(item);if(item.chave)enfileiradas.delete(item.chave);
  }}finally{exibindo=false;}
}
function esperarOutrosDialogos(){
  if(!document.querySelector('dialog[open]'))return Promise.resolve();
  return new Promise(resolve=>{
    const observador=new MutationObserver(()=>{if(!document.querySelector('dialog[open]')){observador.disconnect();resolve();}});
    observador.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  });
}
export function conferirConquistas(sessao){
  if(!sessao?.usuario)return Promise.resolve();
  if(pedido)return pedido;
  pedido=api('/api/conquistas').then(resposta=>{
    const base=document.documentElement.dataset.raizIdioma||'./';
    const itens=(resposta.notificacoes||resposta.conquistas||[]).map(item=>({
      id:`conquista:${sessao.usuario.id}:${item.chave}`,
      título:item.tipo==='missao'?(en()?item.titulo_en:item.titulo_pt):item.tipo==='nivel'?(en()?`Level ${item.nivel} unlocked`:`Nível ${item.nivel} desbloqueado`):item.medalha.nome,
      texto:item.tipo==='missao'?`+${item.xp} XP · ${en()?'Reward received.':'Recompensa recebida.'}`:item.tipo==='nivel'?(en()?'See your progress on your profile.':'Veja sua evolução no perfil.'):`${item.medalha.patamar} · ${item.medalha.descricao}`,
      link:`${base}perfil.html?usuario=${encodeURIComponent(sessao.usuario.usuario)}&${item.tipo==='missao'?'missao':'conquista'}=${encodeURIComponent(item.tipo==='missao'?item.resgate_id:item.chave)}${item.tipo==='missao'?'#missoes':''}`,
      data:item.data||new Date().toISOString(),origem:'conquista',...(item.tipo==='missao'?{}:{conquista:item}),
    }));
    registrarFonte('conquistas',{carregar:async()=>itens});
    for(const item of resposta.conquistas||[]){if(!item?.chave||enfileiradas.has(item.chave))continue;enfileiradas.add(item.chave);fila.push(item);}
    void consumirFila();
  }).catch(()=>{}).finally(()=>{pedido=undefined;});
  return pedido;
}
/** Prévia explícita de um avanço; o uso real recebe os marcos confirmados pela API. */
export function celebrarMissao({titulo,xp}) { fila.push({tipo:'missao',titulo,xp});void consumirFila(); }
export function mostrarNovoNivel(anterior,atual){
  if(!Number.isInteger(Number(atual))||Number(atual)<=Number(anterior))return;
  fila.push({tipo:'nivel',nivel:Number(atual)});void consumirFila();
}

/** Atualiza a sessão compartilhada e avisa os componentes visíveis. */
export function atualizarNivel(sessao, nivel) {
  if (!sessao?.usuario) return false;
  const atual = Number(nivel);
  if (!Number.isInteger(atual) || atual < 1) return false;
  const anterior = Number(sessao.usuario.nivel) || 1;
  if (atual <= anterior) { void conferirConquistas(sessao); return false; }
  sessao.usuario.nivel = atual;
  document.dispatchEvent(new CustomEvent('portal:nivel-alterado', {
    detail: { usuarioId: sessao.usuario.id, anterior, atual },
  }));
  void conferirConquistas(sessao);
  return true;
}
