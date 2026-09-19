import * as h from './helpers.js';

export default h.tool("consumo-de-agua",14,"Consumo de água","Estime o volume e o custo variável de um uso diário.","Litros = vazão em L/min × minutos por uso × usos por dia × dias. Divide por 1.000 para m³ e multiplica pela tarifa constante informada. Não calcula faixas tarifárias, mínimo ou esgoto.",[h.numero('vazao','Vazão medida (L/min)',6),h.numero('minutos','Minutos por uso',10),h.numero('usos','Usos por dia',2,0,10000),h.numero('dias','Dias no período',30,0,366),h.numero('tarifa','Tarifa variável (R$/m³)',5)],async d=>{const l=h.n(d.vazao)*h.n(d.minutos)*h.inteiro(d.usos,'Usos por dia',0,10000)*h.inteiro(d.dias,'Dias',0,366);return h.resultado(h.f(l)+' L','Volume: '+h.f(l/1000)+' m³','Custo variável estimado: '+h.reais(l/1000*h.n(d.tarifa)));});

