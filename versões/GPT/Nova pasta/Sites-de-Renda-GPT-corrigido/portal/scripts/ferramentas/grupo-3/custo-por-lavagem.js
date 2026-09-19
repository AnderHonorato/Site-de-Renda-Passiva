import * as h from './helpers.js';

export default h.tool("custo-por-lavagem",14,"Custo por lavagem","Some água, energia e insumos por ciclo.","Custo por ciclo = água + energia + insumos declarados em reais. Total do período = custo por ciclo × número inteiro de ciclos. Não inclui depreciação ou manutenção.",[h.numero('agua','Água por ciclo (R$)',1),h.numero('energia','Energia por ciclo (R$)',2),h.numero('insumos','Sabão e outros insumos por ciclo (R$)',3),h.numero('ciclos','Ciclos no período',10,0,10000)],async d=>{const c=h.n(d.agua)+h.n(d.energia)+h.n(d.insumos),q=h.inteiro(d.ciclos,'Ciclos',0,10000);return h.resultado(h.reais(c)+' por ciclo','Total para '+q+' ciclos: '+h.reais(c*q));});

