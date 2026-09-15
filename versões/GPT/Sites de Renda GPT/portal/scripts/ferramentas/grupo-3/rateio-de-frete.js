import * as h from './helpers.js';

export default h.tool("rateio-de-frete",12,"Rateio de frete","Distribua frete por valor, peso ou quantidade.","Uma linha: item; base de rateio. Cotas proporcionais; centavos restantes são distribuídos pelos maiores resíduos, preservando o total.",[h.numero('frete','Frete total (R$)',30),h.escolha('base','Critério',[['peso','Peso'],['valor','Valor'],['quantidade','Quantidade']]),h.texto('itens','Item; base do rateio','Item A;1\nItem B;2')],async d=>{h.opcao(d.base,['peso','valor','quantidade']);const a=h.tabela(d.itens,2),p=a.map(([_,v])=>h.n(v,'Base de rateio',0)),r=h.ratear(h.n(d.frete),p);return h.resultado(h.reais(h.soma(r))+' distribuídos',...a.map((x,i)=>x[0]+': '+h.reais(r[i])));});

