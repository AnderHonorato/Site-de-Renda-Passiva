export function elemento(tag,classe,texto){const e=document.createElement(tag);if(classe)e.className=classe;if(texto!==undefined)e.textContent=texto;return e;}
export function icone(nome){const img=document.createElement('img');img.src=`recursos/icones/${nome}.svg`;img.alt='';img.width=22;img.height=22;return img;}
export function botao(texto,acao,classe='botao secundario'){const b=elemento('button',classe,texto);b.type='button';b.addEventListener('click',acao);return b;}
