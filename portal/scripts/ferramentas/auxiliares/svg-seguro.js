/** Segurança da exportação SVG: remove nós ativos e referências de rede. */
import {ErroDeDiagrama} from './diagramas-regras.js';

export function limparSvgGerado(texto){
 if(typeof DOMParser==='undefined'||typeof XMLSerializer==='undefined')
  throw new ErroDeDiagrama('Este navegador não consegue validar SVG.');
 if(typeof texto!=='string'||texto.length>1800000)
  throw new ErroDeDiagrama('SVG excedeu o limite de segurança.');
 const documento=new DOMParser().parseFromString(texto,'image/svg+xml');
 if(documento.querySelector('parsererror')||documento.documentElement.localName!=='svg')
  throw new ErroDeDiagrama('O gerador não produziu um SVG válido.');
 const svg=documento.documentElement;
 for(const elemento of [...svg.querySelectorAll('script,foreignObject,iframe,object,embed,image,audio,video,animate,set,animateTransform,animateMotion')]){
  elemento.remove();
 }
 // Impede scripts e links externos mesmo ao abrir o SVG como arquivo local.
 for(const elemento of [svg,...svg.querySelectorAll('*')]){
  for(const atributo of [...elemento.attributes]){
   const nome=atributo.name.toLowerCase(),v=atributo.value;
   if(nome.startsWith('on')||nome==='href'||nome==='xlink:href'||
      /javascript:|data:|@import|(?:https?:)?\/\//i.test(v)||
      /url\(\s*['"]?\s*(?!#)/i.test(v)){
    elemento.removeAttribute(atributo.name);
   }
  }
 }
 for(const estilo of svg.querySelectorAll('style')){
  // O CSS do Mermaid fica dentro do próprio SVG; nunca carrega fontes ou imagens externas.
  if(/@import|@font-face|(?:https?:)?\/\//i.test(estilo.textContent??''))estilo.remove();
 }
 const viewBox=svg.getAttribute('viewBox');
 let largura=1000,altura=600;
 if(viewBox){
  const a=viewBox.trim().split(/[\s,]+/).map(Number);
  if(a.length===4&&a.every(Number.isFinite)&&a[2]>0&&a[3]>0){
    const fator=Math.min(1,2400/a[2],2400/a[3],Math.sqrt(4000000/(a[2]*a[3])));
    largura=Math.max(1,Math.round(a[2]*fator));altura=Math.max(1,Math.round(a[3]*fator));
  }
 }
 svg.setAttribute('width',String(largura));
 svg.setAttribute('height',String(altura));
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
 const seguro=new XMLSerializer().serializeToString(svg);
 if(seguro.length>1800000)throw new ErroDeDiagrama('SVG processado excedeu o limite.');
 return {svg:seguro,largura,altura};
}

export async function transformarPng(resultado){
 const blobSvg=new Blob([resultado.svg],{type:'image/svg+xml;charset=utf-8'});
 const url=URL.createObjectURL(blobSvg);
 try{
  const imagem=new Image();imagem.src=url;
  await imagem.decode();
  const tela=document.createElement('canvas');
  tela.width=resultado.largura;tela.height=resultado.altura;
  const ctx=tela.getContext('2d');
  if(!ctx)throw new Error('Memória insuficiente para gerar PNG.');
  ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,tela.width,tela.height);
  ctx.drawImage(imagem,0,0,tela.width,tela.height);
  const png=await new Promise(resolve=>tela.toBlob(resolve,'image/png'));
  tela.width=1;tela.height=1;
  if(!png)throw new Error('Este navegador não conseguiu converter SVG em PNG.');
  return png;
 }finally{URL.revokeObjectURL(url);}
}
