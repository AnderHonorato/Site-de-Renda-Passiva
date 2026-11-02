import { ler,guardar } from './armazenamento.js';
export function configurarPrivacidade(){
 const aviso=document.getElementById('privacidade');const personalizar=document.getElementById('personalizacao');
 const anterior=ler('privacidade',null);aviso.hidden=!!(anterior?.versao===1&&Date.now()-anterior.data<180*86400000);
 const salvar=(opcionais)=>{guardar('privacidade',{versao:1,data:Date.now(),opcionais});aviso.hidden=true;};
 document.getElementById('aceitar').onclick=()=>salvar(true);document.getElementById('rejeitar').onclick=()=>salvar(false);
 document.getElementById('personalizar').onclick=()=>{personalizar.hidden=!personalizar.hidden;};
 document.getElementById('salvar-privacidade').onclick=()=>salvar(document.getElementById('opcionais').checked);
 document.querySelectorAll('[data-privacidade]').forEach(b=>b.onclick=()=>{aviso.hidden=false;personalizar.hidden=false;document.getElementById('opcionais').checked=ler('privacidade',{})?.opcionais===true;document.getElementById('rejeitar').focus();});
}
