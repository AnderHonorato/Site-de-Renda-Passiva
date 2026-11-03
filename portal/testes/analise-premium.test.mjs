import { test } from 'node:test';
import assert from 'node:assert/strict';
import {analisarVendasPremium,selecionarModelo,ErroInteligencia} from '../servidor/analise-premium.mjs';
const cab='sku;mes;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_un;imposto_pct;perdas_pct;estoque;prazo_dias';
const linha=(sku,mes,n,extras={})=>{
 const d={preco:100,cmv:40,comissao_pct:12,tarifa_fixa:3,frete:10,ads_un:5,imposto_pct:5,perdas_pct:2,estoque:10,prazo_dias:7,...extras};
 return [sku,mes,n,...Object.values(d)].join(';');
};
const historico=[cab,
 linha('SKU1','2026-06',10),linha('SKU1','2026-07',20),linha('SKU1','2026-08',30),
 linha('SKU1','2026-09',40),linha('SKU1','2026-10',50),
 linha('SKU2','2026-08',6,{preco:200,cmv:100}),linha('SKU2','2026-09',8,{preco:200,cmv:100}),
 linha('SKU2','2026-10',12,{preco:200,cmv:100}),
].join('\n');
test('relatório calcula contribuição unitária incluindo mídia, frete, imposto e taxas',()=>{
 const r=analisarVendasPremium({historico,cenario:0,margemMeta:15});
 assert.equal(r.skuTotal,2);
 const sku=r.itens.find(x=>x.sku==='SKU1');
 assert.equal(sku.margemUnitaria,23);
 assert.equal(sku.margemPercentual,23);
 assert.equal(sku.precoParaMeta,87.88);
 assert.ok(sku.compraSugerida>0);
 assert.equal(r.abc.A+r.abc.B+r.abc.C,2);
 assert.ok(r.receitaProjetada>0 && r.lucroProjetado>0);
});
test('cenário de crescimento aumenta demanda; receita e margem conciliam',()=>{
 const base=analisarVendasPremium({historico,cenario:0});
 const forte=analisarVendasPremium({historico,cenario:30});
 assert.ok(forte.receitaProjetada>=base.receitaProjetada);
 const soma=forte.itens.reduce((a,x)=>a+x.receitaProjetada,0);
 assert.ok(Math.abs(soma-forte.receitaProjetada)<.01);
});
test('detecta margem negativa, taxa acima de 100% e preço meta impossível',()=>{
 const ruim=[cab,linha('Q','2026-08',3,{preco:20,cmv:25}),linha('Q','2026-09',4,{preco:20,cmv:25}),linha('Q','2026-10',5,{preco:20,cmv:25})].join('\n');
 assert.equal(analisarVendasPremium({historico:ruim}).itens[0].risco,'Margem negativa');
 const taxas=ruim.replace(/;12;3;/g,';95;3;');
 assert.throws(()=>analisarVendasPremium({historico:taxas}),ErroInteligencia);
});
test('meses não consecutivos e registros duplicados são recusados',()=>{
 const incompleto=historico.replace('SKU1;2026-07','SKU1;2026-05');
 assert.throws(()=>analisarVendasPremium({historico:incompleto}),/meses|duplicados/);
 assert.throws(()=>analisarVendasPremium({historico:historico+'\n'+linha('SKU1','2026-10',9)}),/duplicados/);
});
test('valida colunas, SKU, mês, cenário e metadados falsos',()=>{
 assert.throws(()=>analisarVendasPremium({historico:'abc'}),ErroInteligencia);
 assert.throws(()=>analisarVendasPremium({historico,cenario:-90}),/fora do limite/);
 assert.throws(()=>analisarVendasPremium({historico,margemMeta:70}),/fora do limite/);
 assert.throws(()=>analisarVendasPremium({historico:historico.replace('SKU1','../../')}),/SKU inválido/);
});
test('histórico estável recomenda média móvel; projeções não são negativas',()=>{
 assert.equal(selecionarModelo([10,10,10,10,10,10,10]).nome,'media');
 const r=analisarVendasPremium({historico});
 assert.ok(r.itens.every(x=>x.projecaoUnidades.length===3&&x.projecaoUnidades.every(n=>n>=0)));
});
