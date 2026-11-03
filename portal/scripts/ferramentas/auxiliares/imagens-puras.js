/** Regras puras compartilhadas por cinco ferramentas de imagens. */
import { ErroDeEntrada } from '../../núcleo/montador.js';
export const LIMITES_IMAGEM=Object.freeze({porArquivo:18*1024*1024,totalLote:56*1024*1024,lote:12,pixels:24_000_000,lado:8192});
export const MIME=Object.freeze({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'});
export const EXT=Object.freeze({png:'png',jpeg:'jpg',webp:'webp'});
export function validarArquivoImagem(arquivo,campo='arquivo'){
 if(!arquivo||!Number.isFinite(arquivo.size)||arquivo.size<1||arquivo.size>LIMITES_IMAGEM.porArquivo)
  throw new ErroDeEntrada('Selecione uma imagem entre 1 byte e 18 MB.',campo);
 if(!Object.values(MIME).includes(arquivo.type))
  throw new ErroDeEntrada('Somente imagens JPG, PNG ou WebP são aceitas.',campo);
 return arquivo;
}
export function validarLoteImagem(arquivos){
 const itens=Array.from(arquivos??[]);
 if(!itens.length||itens.length>LIMITES_IMAGEM.lote)
  throw new ErroDeEntrada('Selecione de 1 a 12 imagens.','arquivos');
 let total=0;
 for(const arquivo of itens){validarArquivoImagem(arquivo,'arquivos');total+=arquivo.size;}
 if(total>LIMITES_IMAGEM.totalLote)throw new ErroDeEntrada('O lote ultrapassa 56 MB. Divida-o em dois.','arquivos');
 return itens;
}
export function validarDimensoes(largura,altura,campo='arquivo'){
 if(!Number.isInteger(largura)||!Number.isInteger(altura)||largura<1||altura<1||
   largura>LIMITES_IMAGEM.lado||altura>LIMITES_IMAGEM.lado||largura*altura>LIMITES_IMAGEM.pixels)
  throw new ErroDeEntrada('Imagem inválida, acima de 24 megapixels ou 8192 px por lado.',campo);
 return {largura,altura};
}
export function formatoDaSaida(formato){
 if(!Object.hasOwn(MIME,formato))throw new ErroDeEntrada('Escolha JPG, PNG ou WebP.','formato');
 return {formato,tipo:MIME[formato],extensao:EXT[formato]};
}
export function qualidadeImagem(valor){
 const n=Number(valor);
 if(!Number.isInteger(n)||n<20||n>100)
  throw new ErroDeEntrada('Qualidade entre 20 e 100.', 'qualidade');
 return n/100;
}
export function planejarRedimensionamento(origemL,origemA,maxL,maxA,ampliar=false){
 validarDimensoes(origemL,origemA);
 if(![maxL,maxA].every(n=>Number.isInteger(n)&&n>=64&&n<=8192))
  throw new ErroDeEntrada('Largura e altura máximas entre 64 e 8192 px.','largura');
 const fator=Math.min(maxL/origemL,maxA/origemA,ampliar?Infinity:1);
 const largura=Math.max(1,Math.round(origemL*fator)),altura=Math.max(1,Math.round(origemA*fator));
 validarDimensoes(largura,altura,'largura');
 return {largura,altura,fator};
}
export const PROPORCOES=Object.freeze({'livre':null,'1:1':1,'4:5':4/5,'9:16':9/16,'16:9':16/9,'3:2':3/2});
export function planejarRecorte(largura,altura,proporcao='1:1',posicao='centro'){
 validarDimensoes(largura,altura);
 if(!Object.hasOwn(PROPORCOES,proporcao))throw new ErroDeEntrada('Escolha a proporção.','proporcao');
 if(!['centro','topo','baixo','esquerda','direita'].includes(posicao))
  throw new ErroDeEntrada('Posição de recorte inválida.','posicao');
 const alvo=PROPORCOES[proporcao];
 if(alvo===null)return {x:0,y:0,largura,altura};
 let w=largura,h=altura;
 if(largura/altura>alvo)w=Math.max(1,Math.round(altura*alvo));
 else h=Math.max(1,Math.round(largura/alvo));
 let x=Math.floor((largura-w)/2),y=Math.floor((altura-h)/2);
 if(posicao==='esquerda')x=0;
 if(posicao==='direita')x=largura-w;
 if(posicao==='topo')y=0;
 if(posicao==='baixo')y=altura-h;
 return {x,y,largura:w,altura:h};
}
export function nomeSeguroImagem(nome,sufixo,extensao){
 const base=String(nome??'imagem').replace(/\.[^.]+$/,'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-')
  .replace(/^-+|-+$/g,'').slice(0,52).toLowerCase()||'imagem';
 const tag=String(sufixo??'imagem').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,22)||'saida';
 if(!['png','jpg','webp'].includes(extensao))throw new ErroDeEntrada('Extensão inválida.','formato');
 return base+'-'+tag+'.'+extensao;
}
export function tamanhoHumano(n){
 return n>=1024*1024?(n/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MB':
  (n/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';
}
/** Detecção por contêiner, sem divulgar coordenadas nem copiar texto de EXIF. */
export function detectarBlocosDeMetadados(bytes,tipo){
 const dados=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 const tags=new Set();
 if(tipo==='image/jpeg'&&dados.length>4&&dados[0]===0xff&&dados[1]===0xd8){
  let p=2;
  while(p+4<=dados.length){
   if(dados[p]!==0xff)break;
   const marcador=dados[p+1];if(marcador===0xda||marcador===0xd9)break;
   const tam=(dados[p+2]<<8)|dados[p+3];if(tam<2||p+2+tam>dados.length)break;
   const payload=dados.subarray(p+4,p+2+tam);
   if(marcador===0xe1){
    const prefixo=String.fromCharCode(...payload.subarray(0,Math.min(32,payload.length)));
    tags.add(prefixo.startsWith('Exif\0\0')?'EXIF (câmera, data e possível GPS)':'XMP/APP1');
   }
   if(marcador===0xed)tags.add('IPTC/APP13');
   if(marcador===0xfe)tags.add('Comentários JPEG');
   p+=2+tam;
  }
 }else if(tipo==='image/png'&&dados.length>=8&&dados[0]===137&&dados[1]===80){
  const dv=new DataView(dados.buffer,dados.byteOffset,dados.byteLength);
  let p=8;
  while(p+12<=dados.length){
   const t=dv.getUint32(p,false),fim=p+12+t;if(t>dados.length||fim>dados.length)break;
   const nome=String.fromCharCode(...dados.subarray(p+4,p+8));
   if(['eXIf','tEXt','zTXt','iTXt','tIME'].includes(nome))tags.add('PNG '+nome);
   if(nome==='IEND')break;
   p=fim;
  }
 }else if(tipo==='image/webp'&&dados.length>=12&&String.fromCharCode(...dados.subarray(0,4))==='RIFF'){
  const dv=new DataView(dados.buffer,dados.byteOffset,dados.byteLength);
  let p=12;
  while(p+8<=dados.length){
   const nome=String.fromCharCode(...dados.subarray(p,p+4));
   const tam=dv.getUint32(p+4,true);
   if(tam>dados.length||p+8+tam>dados.length)break;
   if(['EXIF','XMP '].includes(nome))tags.add('WebP '+nome.trim());
   p+=8+tam+(tam%2);
  }
 }
 return [...tags];
}
export function extrairPaletaRGBA(dados,largura,altura,quantidade=6){
 if(![4,6,8].includes(quantidade))throw new ErroDeEntrada('Escolha 4, 6 ou 8 cores.','quantidade');
 if(!Number.isInteger(largura)||!Number.isInteger(altura)||largura<1||altura<1||
   !dados||dados.length<largura*altura*4)throw new ErroDeEntrada('Pixels inválidos.','arquivo');
 const mapa=new Map();let validos=0;
 for(let i=0;i<largura*altura*4;i+=4){
  const a=dados[i+3];if(a<32)continue;
  const r=dados[i],g=dados[i+1],b=dados[i+2];
  const chave=((r>>4)<<8)|((g>>4)<<4)|(b>>4);
  let e=mapa.get(chave);if(!e){e={peso:0,r:0,g:0,b:0};mapa.set(chave,e);}
  e.peso+=a/255;e.r+=r*a/255;e.g+=g*a/255;e.b+=b*a/255;validos+=a/255;
 }
 if(validos===0)throw new ErroDeEntrada('Não há pixels visíveis nesta imagem.','arquivo');
 const grupos=[...mapa.values()].sort((a,b)=>b.peso-a.peso);
 const paleta=[];
 for(const item of grupos){
  const r=Math.round(item.r/item.peso),g=Math.round(item.g/item.peso),b=Math.round(item.b/item.peso);
  if(paleta.some(c=>(c.r-r)**2+(c.g-g)**2+(c.b-b)**2<28**2))continue;
  const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  paleta.push({hex,rgb:'rgb('+r+', '+g+', '+b+')',r,g,b,percentual:100*item.peso/validos});
  if(paleta.length===quantidade)break;
 }
 return paleta;
}
