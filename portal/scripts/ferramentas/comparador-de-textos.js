/** Comparação textual por linhas com algoritmo LCS limitado. */
import { montarFerramenta, texto, ErroDeEntrada, baixar } from '../núcleo/montador.js';
export const MAX_LINHAS=400;
export function compararLinhas(a,b){
 const A=String(a).replace(/\r\n?/g,'\n').split('\n'),B=String(b).replace(/\r\n?/g,'\n').split('\n');
 if(A.length>MAX_LINHAS||B.length>MAX_LINHAS)throw new ErroDeEntrada('Limite de 400 linhas por versão.','antes');
 const tabela=Array.from({length:A.length+1},()=>new Uint16Array(B.length+1));
 for(let i=A.length-1;i>=0;i--)for(let j=B.length-1;j>=0;j--)
  tabela[i][j]=A[i]===B[j]?tabela[i+1][j+1]+1:Math.max(tabela[i+1][j],tabela[i][j+1]);
 const mudanças=[];let i=0,j=0;
 while(i<A.length||j<B.length){
  if(i<A.length&&j<B.length&&A[i]===B[j]){mudanças.push({tipo:'igual',linha:A[i]});i++;j++;}
  else if(j<B.length&&(i===A.length||tabela[i][j+1]>=tabela[i+1][j])){mudanças.push({tipo:'adicionada',linha:B[j++]});}
  else{mudanças.push({tipo:'removida',linha:A[i++]});}
 }
 return mudanças;
}
export function calcularComparacao(dados){
 const a=texto(dados,'antes',{rótulo:'Versão anterior',máximo:30000});
 const b=texto(dados,'depois',{rótulo:'Versão atual',máximo:30000});
 const mudanças=compararLinhas(a,b),incluidas=mudanças.filter(x=>x.tipo==='adicionada').length,removidas=mudanças.filter(x=>x.tipo==='removida').length;
 const diff=mudanças.map(x=>(x.tipo==='igual'?'  ':x.tipo==='adicionada'?'+ ':'- ')+x.linha).join('\n');
 return {valor:incluidas+removidas===0?'Sem diferenças':'Diferenças encontradas',
 resumo:incluidas+' linha(s) adicionada(s), '+removidas+' removida(s).',
 linhas:[['Linhas adicionadas',String(incluidas)],['Linhas removidas',String(removidas)]],
 texto:diff,arquivos:[{rótulo:'Baixar diferenças TXT',gerar:()=>baixar(diff,'comparacao-de-textos.txt','text/plain;charset=utf-8')}],
 observações:['A comparação é por linha exata; mudanças de espaço também contam. Linhas com alterações aparecem como remoção e adição.']};
}
export default {
 instruções:{passos:['Cole a versão anterior no primeiro campo.','Cole a versão atual no segundo campo.','Compare as linhas: + indica inclusão, - indica remoção.','Copie o resultado ou baixe o TXT.'],
 exemplo:{texto:'Antes: Olá / Hoje. Depois: Olá / Amanhã. A linha Hoje aparece removida e Amanhã adicionada.'},
 limites:'Até 400 linhas e 30 mil caracteres por versão. Comparação exata, incluindo espaços e acentos, sem enviar texto ao servidor.',
 perguntas:[{p:'Por que uma linha alterada aparece duas vezes?',r:'Uma alteração é representada como uma remoção e uma inclusão, para mostrar exatamente o que mudou.'}]},
 montar(raiz,ferramenta){montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Comparar versões',campos:[
 {nome:'antes',rótulo:'Versão anterior',tipo:'área',linhas:6},
 {nome:'depois',rótulo:'Versão atual',tipo:'área',linhas:6},
 ],calcular:calcularComparacao});},
};
