import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcularLote,DEFINICOES} from '../scripts/núcleo/motores-ecommerce-lote.js';
const casos=[
 ['auditoria-margem-marketplace',24.8],
 ['simulador-devolucoes',56],
 ['analise-ponto-equilibrio-canais',134],
 ['simulador-reajuste-fornecedor',29],
 ['planejamento-meta-roas',4]
];
test('cinco ferramentas calculam exemplos editáveis sem rede',()=>{
 assert.equal(Object.keys(DEFINICOES).length,5);
 for(const [slug] of casos){
  const r=calcularLote(slug,DEFINICOES[slug].exemplo);
  assert.equal(r.linhas.length,2);
  assert.ok(Number.isFinite(r.total));
  assert.equal(r.cabecalho.length,3);
 }
});
test('margem marketplace deduz todos os custos',()=>{
 const r=calcularLote('auditoria-margem-marketplace','sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nA;100;40;10;2;5;3;5');
 assert.equal(r.total,35);
});
test('devoluções calculam custo esperado',()=>{
 const r=calcularLote('simulador-devolucoes','sku;pedidos;taxa_devolucao_pct;frete_reverso;custo_inspecao;perda_produto\nA;100;10;12;3;5');
 assert.equal(r.total,200);
});
test('equilíbrio arredonda pedidos para cima',()=>{
 const r=calcularLote('analise-ponto-equilibrio-canais','canal;preco_medio;custo_variavel;despesa_fixa\nSite;100;60;401');
 assert.equal(r.total,11);
});
test('reajuste compara contribuição líquida',()=>{
 const r=calcularLote('simulador-reajuste-fornecedor','sku;custo_atual;reajuste_pct;preco_venda;taxas_pct\nA;50;10;100;10');
 assert.equal(r.total,35);
});
test('ROAS agregado pondera investimento e não soma médias',()=>{
 const r=calcularLote('planejamento-meta-roas','campanha;investimento;receita;pedidos;meta_roas\nA;100;500;5;4\nB;900;1800;9;3');
 assert.equal(r.total,2.3);
});
test('rejeita percentuais inválidos, IDs repetidos, colunas incorretas e valores maliciosos',()=>{
 const slug='auditoria-margem-marketplace',cab='sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct';
 for(const corpo of ['A;100;40;110;2;5;3;5','A;=1+1;40;10;2;5;3;5','A;100;40;10;2;5;3;5\nA;100;40;10;2;5;3;5','A;100;40;10;2;5;3']){
  assert.throws(()=>calcularLote(slug,cab+'\n'+corpo));
 }
});
