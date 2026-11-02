import * as h from './helpers.js';

export default h.tool("margem-e-markup",12,"Margem e markup","Diferencie margem sobre venda e acréscimo sobre custo.","Lucro bruto = preço − custo. Margem = lucro/preço × 100; markup percentual = lucro/custo × 100; fator markup = preço/custo. Demais custos não entram.",[h.numero('custo','Custo unitário (R$)',60),h.numero('preco','Preço de venda (R$)',100)],async d=>{const c=h.positivo(d.custo,'Custo'),p=h.positivo(d.preco,'Preço'),l=p-c;return h.resultado('Margem: '+h.f(l/p*100)+'%','Lucro bruto: '+h.reais(l),'Markup percentual: '+h.f(l/c*100)+'%','Fator markup: '+h.f(p/c));});

