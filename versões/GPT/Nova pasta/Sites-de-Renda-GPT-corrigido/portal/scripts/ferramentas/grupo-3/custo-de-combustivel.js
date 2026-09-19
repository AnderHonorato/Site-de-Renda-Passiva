import * as h from './helpers.js';

export default h.tool("custo-de-combustivel",15,"Custo de combustível","Estime litros e gasto para uma distância informada.","Litros = distância / rendimento em km/L. Gasto = litros × preço por litro. Não consulta mapas nem prevê condições de tráfego.",[h.numero('distancia','Distância total (km)',300),h.numero('rendimento','Rendimento (km/L)',12),h.numero('preco','Preço do litro (R$)',6)],async d=>{const litros=h.n(d.distancia)/h.positivo(d.rendimento,'Rendimento');return h.resultado(h.reais(litros*h.n(d.preco)),'Combustível: '+h.f(litros)+' L');});

