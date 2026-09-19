import * as h from './helpers.js';

export default h.tool("consumo-medio-do-veiculo",15,"Consumo médio do veículo","Calcule rendimento e litros por 100 km.","km/L = distância percorrida / litros repostos. L/100 km = litros / distância × 100. Medir entre abastecimentos comparáveis de tanque cheio; combustível comprado isoladamente não mede consumo.",[h.numero('distancia','Distância entre medições (km)',480),h.numero('litros','Litros repostos (L)',40)],async d=>{const km=h.positivo(d.distancia,'Distância'),l=h.positivo(d.litros,'Litros');return h.resultado(h.f(km/l)+' km/L',h.f(l/km*100)+' L/100 km','Use medições consistentes entre abastecimentos de tanque cheio.');});

