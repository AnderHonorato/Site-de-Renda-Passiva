import * as h from './helpers.js';

export default h.tool("consumo-de-energia",14,"Consumo de energia","Estime kWh e custo de uso de um aparelho.","kWh = potência em watts / 1.000 × horas por dia × dias. Custo = kWh × tarifa informada. Potência constante; não inclui tributos adicionais, bandeiras ou ciclos variáveis.",[h.numero('potencia','Potência (W)',1000),h.numero('horas','Horas por dia',2,0,24),h.numero('dias','Dias de uso',30,0,366),h.numero('tarifa','Tarifa informada (R$/kWh)',1)],async d=>{const k=h.n(d.potencia)/1000*h.n(d.horas)*h.inteiro(d.dias,'Dias',0,366);return h.resultado(h.reais(k*h.n(d.tarifa))+' estimados','Consumo: '+h.f(k)+' kWh');});

