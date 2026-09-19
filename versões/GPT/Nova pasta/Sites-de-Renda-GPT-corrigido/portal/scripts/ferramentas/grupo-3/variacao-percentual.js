import * as h from './helpers.js';

export default h.tool("variacao-percentual",11,"Variação percentual","Compare o crescimento ou redução entre dois valores.","Variação = (final − inicial) / |inicial| × 100. Base inicial zero é indefinida; o módulo permite interpretar bases negativas.",[h.numero('inicial','Valor inicial',80,-1e12),h.numero('final','Valor final',100,-1e12)],async d=>{const a=h.n(d.inicial),b=h.n(d.final);if(a===0)throw new Error('Não existe variação percentual definida sobre base zero.');const v=(b-a)/Math.abs(a)*100;return h.resultado(h.f(v)+'%',(v>0?'Aumento':v<0?'Redução':'Sem variação')+' de '+h.f(b-a)+' unidades.');});

