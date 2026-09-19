import * as h from './helpers.js';

export default h.tool("porcentagem",11,"Porcentagem","Calcule uma parte percentual de qualquer valor.","Parte = total × percentual / 100; valores negativos são permitidos.",[h.numero('total','Total',200,-1e12),h.numero('percentual','Percentual (%)',15,-100000)],async d=>{const t=h.n(d.total), p=h.n(d.percentual);return h.resultado(h.f(t*p/100),h.f(p)+'% de '+h.f(t)+' = '+h.f(t*p/100));});

