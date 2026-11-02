import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape} from './comum.js';
import {molde,bandeja,linha,rect,pol,label} from './moldes.js';
export default definir("cinta-para-embalagem",6,"Cinta para embalagem","Gere faixa para envolver um perímetro informado.","Comprimento = perímetro + sobreposição. O perímetro pode ser medido na embalagem pronta.",[N('perimetro','Perímetro medido (mm)',300,10,1500),N('sobreposicao','Sobreposição de cola (mm)',15,2,100),N('largura','Largura da cinta (mm)',30,5,300)],async d=>{const p=n(d,'perimetro',10,1500),a=n(d,'sobreposicao',2,100),w=n(d,'largura',5,300);return molde('Cinta',p+a,w,rect(0,0,p+a,w)+linha(p,0,p,w,true),['Comprimento total: '+fmt(p+a)+' mm. Área após o tracejado: sobreposição para colar.']);});

