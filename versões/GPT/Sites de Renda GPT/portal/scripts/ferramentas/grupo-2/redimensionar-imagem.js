import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,file} from './comum.js';
import {canvas,carregarImagem,codificar,cor,tipo,resultadoImagem,comImagem,temExif} from './imagem-base.js';
export default definir("redimensionar-imagem",8,"Redimensionar imagem","Altere a largura preservando a proporção da foto.","Altura arredondada pela razão original. Limites de saída: 16 megapixels e 8.192 px por lado.",[F(),N('largura','Largura final (px)',1200,1,8192)],async d=>{return comImagem(d,async(im,f)=>{const w=inteiro(d,'largura',1,8192),c=canvas(w,w*im.height/im.width);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return resultadoImagem(c,'image/png',1,f.size);});});

