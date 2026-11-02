/** Ordenação local de listas, preservando duplicatas e linhas vazias. */
import { montarFerramenta, texto, ErroDeEntrada, baixar } from '../núcleo/montador.js';
export function ordenarLinhas(conteudo,modo='az',ignorarCaixa=true){
 const linhas=String(conteudo).replace(/\r\n?/g,'\n').split('\n');
 if(linhas.length>10000)throw new ErroDeEntrada('Limite de 10 mil linhas.','conteudo');
 const collator=new Intl.Collator('pt-BR',{sensitivity:ignorarCaixa?'base':'variant',numeric:false});
 const itens=linhas.map((valor,indice)=>({valor,indice}));
 const comparar=(a,b)=>{
  if(modo==='numerico'){
   const n=Number(a.valor.trim().replace(',','.')),m=Number(b.valor.trim().replace(',','.'));
   if(!Number.isFinite(n)||!Number.isFinite(m)||!a.valor.trim()||!b.valor.trim())
    throw new ErroDeEntrada('Para ordenar numericamente, todas as linhas devem conter números válidos.','conteudo');
   return n-m||a.indice-b.indice;
  }
  return (modo==='za'?-1:1)*collator.compare(a.valor,b.valor)||a.indice-b.indice;
 };
 if(!['az','za','numerico','inverter'].includes(modo))throw new ErroDeEntrada('Modo de ordenação inválido.','modo');
 if(modo==='inverter')itens.reverse();else itens.sort(comparar);
 return itens.map(x=>x.valor).join('\n');
}
export function calcularOrdenacao(dados){
 const entrada=texto(dados,'conteudo',{rótulo:'Linhas',máximo:200000});
 const saida=ordenarLinhas(entrada,dados.modo,dados.caixa==='sim');
 return {valor:'Lista ordenada',resumo:saida.split('\n').length.toLocaleString('pt-BR')+' linhas processadas.',
 texto:saida,arquivos:[{rótulo:'Baixar lista TXT',gerar:()=>baixar(saida,'lista-ordenada.txt','text/plain;charset=utf-8')}],
 observações:['A lista preserva duplicatas e linhas vazias. A ordenação alfabética considera o português brasileiro.']};
}
export default {
 instruções:{passos:['Cole a lista com um item por linha.','Escolha ordem alfabética A–Z, Z–A, numérica ou inversão da ordem original.','Escolha se maiúsculas e minúsculas devem ser tratadas como equivalentes.','Ordene e copie ou baixe o TXT.'],
 exemplo:{texto:'A lista 20, 3, 10 em modo numérico vira 3, 10, 20. A ordem alfabética é diferente da numérica.'},
 limites:'Até 10 mil linhas e 200 mil caracteres. Não remove duplicatas nem altera os itens.',
 perguntas:[{p:'Por que a ordenação numérica recusou?',r:'Cada linha precisa conter um número; linhas vazias e textos não são aceitos no modo numérico.'}]},
 montar(raiz,ferramenta){montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Ordenar linhas',campos:[
 {nome:'conteudo',rótulo:'Lista',tipo:'área',linhas:7},
 {nome:'modo',rótulo:'Ordenação',tipo:'seleção',padrão:'az',opções:[
 {valor:'az',rótulo:'Alfabética A–Z'},{valor:'za',rótulo:'Alfabética Z–A'},
 {valor:'numerico',rótulo:'Numérica crescente'},{valor:'inverter',rótulo:'Inverter ordem'}]},
 {nome:'caixa',rótulo:'Ignorar maiúsculas/minúsculas',tipo:'seleção',padrão:'sim',opções:[{valor:'sim',rótulo:'Sim'},{valor:'nao',rótulo:'Não'}]},
 ],calcular:calcularOrdenacao});},
};
