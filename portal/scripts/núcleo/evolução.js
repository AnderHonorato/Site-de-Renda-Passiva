import { criarIconeNivel } from './nível.js';
import { criarIconeMedalha } from './emblemas.js';
import { tocarSom } from './sons.js';
import { api } from './api.js';

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
  const nivel=conquista.tipo==='nivel';
  palco.append(nivel?criarIconeNivel(conquista.nivel):criarIconeMedalha(conquista.medalha));
  palco.dataset.tier=String(conquista.medalha?.tier??Math.min(7,Math.floor(conquista.nivel/2)));
  const titulo=elemento('h2','',nivel?(en()?`Level ${conquista.nivel} unlocked!`:`Nível ${conquista.nivel} desbloqueado!`):(conquista.medalha.nome));titulo.id='conquista-titulo';
  const texto=elemento('p','',nivel?(en()?'Your journey is taking shape. Explore the profile styles you have unlocked.':'Sua jornada está ganhando forma. Confira os visuais que você desbloqueou no perfil.'):`${conquista.medalha.patamar} · ${conquista.medalha.descricao}`);texto.id='conquista-texto';
  const continuar=elemento('button','botão botão--primário',en()?'Continue':'Continuar');continuar.type='button';continuar.addEventListener('click',()=>dialogo.close());
  conteudo.append(etiqueta,palco,titulo,texto,continuar);dialogo.append(luz,conteudo);document.body.append(dialogo);
  dialogo.showModal();tocarSom(nivel?'nivel':'conquista');
  return new Promise(resolve=>dialogo.addEventListener('close',()=>{dialogo.remove();resolve();},{once:true}));
}
async function consumirFila(){
  if(exibindo)return;exibindo=true;
  try{while(fila.length){const item=fila.shift();
    if(item.chave){try{const resposta=await api('/api/conquistas/receber',{metodo:'POST',dados:{chave:item.chave}});if(!resposta.recebida){enfileiradas.delete(item.chave);continue;}}catch{enfileiradas.delete(item.chave);continue;}}
    await celebrar(item);if(item.chave)enfileiradas.delete(item.chave);
  }}finally{exibindo=false;}
}
export function conferirConquistas(sessao){
  if(!sessao?.usuario)return Promise.resolve();
  if(pedido)return pedido;
  pedido=api('/api/conquistas').then(resposta=>{
    for(const item of resposta.conquistas||[]){if(!item?.chave||enfileiradas.has(item.chave))continue;enfileiradas.add(item.chave);fila.push(item);}
    void consumirFila();
  }).catch(()=>{}).finally(()=>{pedido=undefined;});
  return pedido;
}
/** Prévia explícita de um avanço; o uso real recebe os marcos confirmados pela API. */
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
