import { ler, gravar } from './armazenamento.js';
let contexto;
let ultimoAviso = 0;
export function sonsAtivos(){return ler('sons',true)!==false;}
export function definirSons(ativo){gravar('sons',Boolean(ativo));}
function preparar(){
  if(!sonsAtivos())return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;contexto ||= new Audio();if(contexto.state==='suspended')void contexto.resume().catch(()=>{});}catch{}
}
if(typeof document!=='undefined')for(const evento of ['pointerdown','keydown'])document.addEventListener(evento,preparar,{passive:true});
/** Sinais discretos sintetizados localmente; nenhuma mídia externa ou reprodução automática. */
export function tocarSom(tipo){
  if(!sonsAtivos()||!contexto||contexto.state!=='running')return false;
  const agora=Date.now();if(tipo==='notificacao'&&agora-ultimoAviso<2000)return false;if(tipo==='notificacao')ultimoAviso=agora;
  const partituras={notificacao:[784,1046],nivel:[523,659,784,1046],conquista:[659,880,1046,1318],abrir:[440,659],fechar:[659,440]};
  const notas=partituras[tipo];if(!notas)return false;
  const inicio=contexto.currentTime;
  notas.forEach((frequencia,i)=>{const osc=contexto.createOscillator(),volume=contexto.createGain();osc.type='sine';osc.frequency.value=frequencia;const t=inicio+i*.085;volume.gain.setValueAtTime(0,t);volume.gain.linearRampToValueAtTime(.045,t+.012);volume.gain.exponentialRampToValueAtTime(.0001,t+.17);osc.connect(volume);volume.connect(contexto.destination);osc.start(t);osc.stop(t+.18);osc.onended=()=>{osc.disconnect();volume.disconnect();};});
  return true;
}
