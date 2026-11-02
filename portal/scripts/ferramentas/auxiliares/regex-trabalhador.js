/** Worker descartável: o painel encerra por terminate() ao exceder o tempo. */
import {processarRegex} from './regex-motor.js';
self.addEventListener('message',evento=>{
 try{self.postMessage({ok:true,resultado:processarRegex(evento.data)});}
 catch(erro){self.postMessage({ok:false,erro:{mensagem:erro?.message??'Erro na expressão.',campo:erro?.campo??'expressao'}});}
});
