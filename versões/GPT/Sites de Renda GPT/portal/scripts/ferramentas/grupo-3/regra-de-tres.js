import * as h from './helpers.js';

export default h.tool("regra-de-tres",11,"Regra de três","Resolva proporções diretas e inversas.","Direta: x = b × c / a. Inversa: x = a × b / c. As grandezas precisam representar uma relação proporcional real.",[h.numero('a','Primeira quantidade',3),h.numero('b','Valor correspondente',12),h.numero('c','Nova quantidade',5),h.escolha('modo','Proporção',[['direta','Direta'],['inversa','Inversa']])],async d=>{const a=h.positivo(d.a,'Primeira quantidade'), b=h.n(d.b), c=h.positivo(d.c,'Nova quantidade');h.opcao(d.modo,['direta','inversa']);const x=d.modo==='direta'?b*c/a:a*b/c;return h.resultado(h.f(x),d.modo==='direta'?'x = b × c / a':'x = a × b / c');});

