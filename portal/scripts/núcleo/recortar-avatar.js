const texto = (pt, en) => document.documentElement.lang === 'en' ? en : pt;
function no(tag, classe, rotulo) { const el=document.createElement(tag);el.className=classe||'';if(rotulo)el.textContent=rotulo;return el; }

/** O recorte é local. O mesmo quadrado é usado na conta, no perfil e no chat. */
export async function recortarAvatar(arquivo) {
  if(!/^image\/(png|jpeg|webp)$/.test(arquivo.type))throw new Error('imagem_invalida');
  if(arquivo.size>12*1024*1024)throw new Error('corpo_grande');
  const bitmap=await createImageBitmap(arquivo).catch(()=>{throw new Error('imagem_invalida');});
  const dialogo=no('dialog','avatar-recorte');
  dialogo.setAttribute('aria-labelledby','avatar-recorte-titulo');
  const titulo=no('h2','',texto('Enquadre sua foto','Frame your photo'));titulo.id='avatar-recorte-titulo';
  const aviso=no('p','suave',texto('Ajuste o enquadramento. A foto ficará alinhada no perfil e no chat.','Adjust the framing. Your photo will fit both your profile and chat.'));
  const previa=no('div','avatar-recorte__previas'),canvas=no('canvas','avatar-recorte__canvas');canvas.width=512;canvas.height=512;
  const mini=no('canvas','avatar-recorte__mini');mini.width=96;mini.height=96;mini.setAttribute('aria-label',texto('Prévia no chat','Chat preview'));
  previa.append(canvas,mini);
  const controles=no('div','avatar-recorte__controles');
  function faixa(nome,min,max,valor,passo){const label=no('label','conta__campo');const input=no('input');input.type='range';input.min=min;input.max=max;input.value=valor;input.step=passo;input.setAttribute('aria-label',nome);label.append(no('span','',nome),input);controles.append(label);return input;}
  const zoom=faixa(texto('Zoom','Zoom'),1,4,1,.01),horizontal=faixa(texto('Posição horizontal','Horizontal position'),0,100,50,1),vertical=faixa(texto('Posição vertical','Vertical position'),0,100,50,1);
  function pintar(){const lado=Math.min(bitmap.width,bitmap.height)/Number(zoom.value),x=(bitmap.width-lado)*Number(horizontal.value)/100,y=(bitmap.height-lado)*Number(vertical.value)/100;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,512);ctx.drawImage(bitmap,x,y,lado,lado,0,0,512,512);mini.getContext('2d').drawImage(canvas,0,0,96,96);}
  for(const input of [zoom,horizontal,vertical])input.addEventListener('input',pintar);
  const acoes=no('div','ações'),cancelar=no('button','botão botão--linha',texto('Cancelar','Cancel')),usar=no('button','botão botão--primário',texto('Usar este recorte','Use this crop'));
  cancelar.type=usar.type='button';acoes.append(cancelar,usar);dialogo.append(titulo,aviso,previa,controles,acoes);document.body.append(dialogo);pintar();dialogo.showModal();
  return new Promise(resolve=>{let resultado=null;cancelar.addEventListener('click',()=>dialogo.close());usar.addEventListener('click',()=>{usar.disabled=true;canvas.toBlob(blob=>{resultado=blob;dialogo.close();},'image/webp',.9);});dialogo.addEventListener('close',()=>{bitmap.close();dialogo.remove();resolve(resultado);},{once:true});});
}

export function fotoParaDados(blob) {
  return new Promise((resolve,reject)=>{const leitor=new FileReader();leitor.onload=()=>resolve({mime:blob.type,dados:String(leitor.result).split(',')[1]});leitor.onerror=()=>reject(new Error('imagem_invalida'));leitor.readAsDataURL(blob);});
}
