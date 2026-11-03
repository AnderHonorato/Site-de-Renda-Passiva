/** Canvas compartilhado: arquivos nunca saem do navegador. */
import { ErroDeEntrada } from '../../núcleo/montador.js';
import { validarArquivoImagem,validarDimensoes,MIME } from './imagens-puras.js';
export async function abrirImagem(arquivo,campo='arquivo'){
 validarArquivoImagem(arquivo,campo);
 if(typeof createImageBitmap!=='function')throw new ErroDeEntrada('Atualize o navegador para processar imagens.','arquivo');
 let bitmap;
 try{bitmap=await createImageBitmap(arquivo,{imageOrientation:'from-image'});}
 catch{throw new ErroDeEntrada('Não foi possível abrir a imagem. Verifique se está íntegra.',campo);}
 try{validarDimensoes(bitmap.width,bitmap.height,campo);}
 catch(e){bitmap.close();throw e;}
 return bitmap;
}
export function criarCanvas(largura,altura){
 validarDimensoes(largura,altura);
 const tela=document.createElement('canvas');
 tela.width=largura;tela.height=altura;
 const ctx=tela.getContext('2d',{willReadFrequently:false});
 if(!ctx)throw new ErroDeEntrada('Memória insuficiente para processar a imagem.','arquivo');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 return {tela,ctx};
}
export async function exportarCanvas(tela,formato='png',qualidade=0.85){
 if(!Object.hasOwn(MIME,formato))throw new ErroDeEntrada('Formato de saída inválido.','formato');
 const tipo=MIME[formato];
 const blob=await new Promise(resolve=>tela.toBlob(resolve,tipo,qualidade));
 if(!blob||blob.type!==tipo||blob.size===0)
  throw new ErroDeEntrada('Este navegador não conseguiu gerar '+formato.toUpperCase()+'.','formato');
 tela.width=1;tela.height=1;
 return blob;
}
export async function transformarImagem(arquivo,{largura,altura,formato='png',qualidade=0.85,recorte=null,fundo='branco'}){
 const bitmap=await abrirImagem(arquivo);
 try{
  const w=largura??bitmap.width,h=altura??bitmap.height;
  const {tela,ctx}=criarCanvas(w,h);
  if(formato==='jpeg'||fundo!=='transparente'){
   ctx.fillStyle=fundo==='preto'?'#101010':'#ffffff';
   ctx.fillRect(0,0,w,h);
  }
  if(recorte)ctx.drawImage(bitmap,recorte.x,recorte.y,recorte.largura,recorte.altura,0,0,w,h);
  else ctx.drawImage(bitmap,0,0,w,h);
  const blob=await exportarCanvas(tela,formato,qualidade);
  return {blob,largura:w,altura:h,origemL:bitmap.width,origemA:bitmap.height};
 }finally{bitmap.close();}
}
export function montarPreviaImagem(raiz,{titulo='Prévia do resultado',varias=false}={}){
 const painel=document.createElement('section');
 painel.className='estudio-imagens__previa';painel.hidden=true;
 const h=document.createElement('h3');h.textContent=titulo;
 const conteudo=document.createElement('div');conteudo.className=varias?'estudio-imagens__grade':'estudio-imagens__individual';
 painel.append(h,conteudo);
 raiz.querySelector('#resultado').after(painel);
 let urls=[];
 function limpar(){
  for(const u of urls)URL.revokeObjectURL(u);
  urls=[];conteudo.replaceChildren();painel.hidden=true;
 }
 function mostrar(itens){
  limpar();
  for(const item of itens){
   const fig=document.createElement('figure'),img=document.createElement('img');
   img.alt='Prévia: '+(item.nome??'imagem processada');
   const url=URL.createObjectURL(item.blob);urls.push(url);img.src=url;
   const texto=document.createElement('figcaption');
   texto.textContent=item.rotulo??item.nome??'Imagem pronta';
   fig.append(img,texto);conteudo.append(fig);
  }
  painel.hidden=false;
 }
 raiz.querySelector('#formulário').addEventListener('reset',limpar);
 window.addEventListener('pagehide',limpar,{once:true});
 return {limpar,mostrar};
}
