import * as h from './helpers.js';

export default h.tool("descontos-sucessivos",12,"Descontos sucessivos","Aplique uma sequência de descontos sobre o saldo.","Cada desconto é aplicado ao preço restante. Desconto equivalente = 1 − produto(1 − desconto/100). Uma porcentagem por linha.",[h.numero('preco','Preço inicial (R$)',100),h.texto('descontos','Descontos (%) — um por linha','10\n10')],async d=>{const p=h.n(d.preco),a=h.linhas(d.descontos).map(v=>h.n(v,'Desconto',0,100));let fator=1;const passos=a.map((v,i)=>{fator*=1-v/100;return 'Etapa '+(i+1)+': '+h.reais(p*fator);});return h.resultado(h.reais(p*fator),'Desconto equivalente: '+h.f((1-fator)*100)+'%','Economia: '+h.reais(p*(1-fator)),...passos);});

