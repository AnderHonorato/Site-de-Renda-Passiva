import {pdfLib} from './ferramentas/grupo-2/pdf-base.js';
export async function svgParaPdf(blob){
 const texto=await blob.text();const doc=new DOMParser().parseFromString(texto,'image/svg+xml');const svg=doc.documentElement;
 if(svg.localName!=='svg'||doc.querySelector('parsererror'))throw Error('Desenho inválido para exportação.');
 const medida=(valor,padrao)=>{const m=/^([\d.]+)(mm|cm|px)?$/.exec(valor??'');if(!m)return padrao;return Number(m[1])*(m[2]==='cm'?10:m[2]==='mm'?1:25.4/96);};
 const largura=medida(svg.getAttribute('width'),210),altura=medida(svg.getAttribute('height'),297);if(largura<=0||altura<=0||largura>2100||altura>2100)throw Error('Medidas fora do limite de exportação.');
 const escala=Math.min(200/25.4,Math.sqrt(16000000/(largura*altura)));const canvas=document.createElement('canvas');canvas.width=Math.ceil(largura*escala);canvas.height=Math.ceil(altura*escala);
 const url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw Error('Não foi possível preparar o PDF.');const {PDFDocument}=await pdfLib();const pdf=await PDFDocument.create();const imagem=await pdf.embedPng(await png.arrayBuffer());const pagina=pdf.addPage([largura*72/25.4,altura*72/25.4]);pagina.drawImage(imagem,{x:0,y:0,width:pagina.getWidth(),height:pagina.getHeight()});return new Blob([await pdf.save()],{type:'application/pdf'});}finally{URL.revokeObjectURL(url);canvas.width=canvas.height=1;}
}
