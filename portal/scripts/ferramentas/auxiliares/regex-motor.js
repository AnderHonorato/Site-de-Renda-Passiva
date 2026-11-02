/** Motor puro: executar texto fornecido pelo usuário apenas no Web Worker. */
export const LIMITES_REGEX={expressao:350,texto:30000,substituicao:1200,resultados:150,textoGerado:70000};
export class ErroRegex extends Error{
 constructor(mensagem,campo='expressao'){super(mensagem);this.name='ErroRegex';this.campo=campo;}
}
export function validarRegex(dados){
 const expressao=String(dados.expressao??''),flags=String(dados.flags??'');
 const texto=String(dados.texto??''),substituicao=String(dados.substituicao??'');
 if(!expressao||expressao.length>LIMITES_REGEX.expressao)
  throw new ErroRegex('Informe expressão de até 350 caracteres.','expressao');
 if(!/^[dgimsuvy]*$/.test(flags)||new Set(flags).size!==flags.length||(flags.includes('u')&&flags.includes('v')))
  throw new ErroRegex('Sinalizadores JS inválidos, repetidos ou u/v incompatíveis.','flags');
 if(texto.length>LIMITES_REGEX.texto)throw new ErroRegex('Limite de 30 mil caracteres.','texto');
 if(substituicao.length>LIMITES_REGEX.substituicao)
  throw new ErroRegex('Limite de 1.200 caracteres no texto de substituição.','substituicao');
 try{new RegExp(expressao,flags);}catch(e){throw new ErroRegex('Padrão inválido: '+e.message,'expressao');}
 return {expressao,flags,texto,substituicao,substituir: dados.substituir===true||dados.substituir==='sim'||dados.substituir==='true'};
}
function avancar(texto,p,unicode){
 if(!unicode)return p+1;
 const c=texto.charCodeAt(p),d=texto.charCodeAt(p+1);
 return c>=0xd800&&c<=0xdbff&&d>=0xdc00&&d<=0xdfff?p+2:p+1;
}
export function processarRegex(dados){
 const v=validarRegex(dados),re=new RegExp(v.expressao,v.flags);
 const correspondencias=[];let m,limite=false;
 while((m=re.exec(v.texto))!==null){
  correspondencias.push({
   inicio:m.index,fim:m.index+m[0].length,
   trecho:m[0].slice(0,240),
   grupos:Array.from(m).slice(1,41).map(s=>s==null?null:s.slice(0,180)),
   nomes:Object.fromEntries(Object.entries(m.groups??{}).slice(0,30).map(([k,s])=>[k,s?.slice(0,180)??null])),
  });
  if(correspondencias.length===LIMITES_REGEX.resultados){limite=true;break;}
  if(!v.flags.includes('g'))break;
  if(m[0].length===0)re.lastIndex=avancar(v.texto,re.lastIndex,re.unicode||re.unicodeSets);
 }
 let substituido='';
 if(v.substituir){
  substituido=v.texto.replace(new RegExp(v.expressao,v.flags),v.substituicao);
  if(substituido.length>LIMITES_REGEX.textoGerado)throw new ErroRegex('Saída extensa demais. Reduza a substituição.','substituicao');
 }
 return {correspondencias,limite,substituido,substituiu:v.substituir,texto:v.texto,flags:v.flags};
}
