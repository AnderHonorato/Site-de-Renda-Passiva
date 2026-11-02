import * as h from './helpers.js';

export default h.tool("media-ponderada",11,"Média ponderada","Calcule notas ou médias com pesos personalizados.","Cada linha: valor; peso. Média = soma(valor × peso) / soma dos pesos. Pesos não negativos, com soma positiva.",[h.texto('itens','Valor; peso (uma linha por item)','6;1\n8;3')],async d=>{const a=h.tabela(d.itens,2).map(([v,p])=>[h.n(v,'Valor'),h.n(p,'Peso',0)]),p=h.soma(a.map(a=>a[1]));if(!p)throw new Error('A soma dos pesos deve ser maior que zero.');return h.resultado(h.f(h.soma(a.map(a=>a[0]*a[1]))/p),'Soma dos pesos: '+h.f(p),'Itens: '+a.length);});

