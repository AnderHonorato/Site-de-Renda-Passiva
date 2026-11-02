import * as h from './helpers.js';

export default h.tool("meta-de-vendas",12,"Meta de vendas","Calcule quantas vendas alcançam uma meta de contribuição.","Quantidade = teto(meta / contribuição unitária). A contribuição é o valor restante por venda após os custos variáveis declarados; sem previsão de demanda.",[h.numero('meta','Meta de contribuição (R$)',1000),h.numero('contribuicao','Contribuição por venda (R$)',25)],async d=>{const m=h.n(d.meta),c=h.positivo(d.contribuicao,'Contribuição');const q=Math.ceil(m/c);return h.resultado(h.f(q)+' vendas','Contribuição total: '+h.reais(q*c),'Excedente sobre a meta: '+h.reais(q*c-m));});

