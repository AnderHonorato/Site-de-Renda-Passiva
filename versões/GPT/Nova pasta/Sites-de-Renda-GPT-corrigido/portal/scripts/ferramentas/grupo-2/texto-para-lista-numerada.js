import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,arquivoTexto,saidaTexto,data,iso,palavras} from './comum.js';
export default definir("texto-para-lista-numerada",7,"Texto para lista numerada","Transforme uma linha por item em uma lista numerada.","Linhas em branco são ignoradas. Numeração consecutiva a partir do início escolhido.",[T('texto','Um item por linha','Comprar\nSeparar\nEntregar'),N('inicio','Começar em',1,0,100000)],async d=>{const a=lista(d,'texto'),n0=inteiro(d,'inicio',0,100000);return saidaTexto(a.map((x,i)=>(n0+i)+'. '+x).join('\n'));});

