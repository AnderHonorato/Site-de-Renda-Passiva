import * as h from './helpers.js';

export default h.tool("divisor-de-contas-da-casa",14,"Divisor de contas da casa","Divida contas igualmente ou por pesos escolhidos.","Cada linha: pessoa; peso. Na divisão igual, todos recebem peso 1. Rateio por maiores resíduos distribui centavos mantendo o total.",[h.numero('total','Conta total (R$)',600),h.escolha('modo','Modo',[['pesos','Por pesos'],['igual','Igualmente']]),h.texto('pessoas','Pessoa; peso','Pessoa A;1\nPessoa B;2')],async d=>{h.opcao(d.modo,['pesos','igual']);const a=h.tabela(d.pessoas,2),p=a.map(x=>{const n=h.n(x[1],'Peso',0);return d.modo==='igual'?1:n;}),r=h.ratear(h.n(d.total),p);return h.resultado(h.reais(h.soma(r))+' distribuídos',...a.map((x,i)=>x[0]+': '+h.reais(r[i])));});

