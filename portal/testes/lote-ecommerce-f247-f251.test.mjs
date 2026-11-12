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

test('auditoria avisa contribuição negativa',()=>{
 const r=calcularLote('auditoria-margem-marketplace','sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nA;50;60;10;0;0;0;0');
 assert.equal(r.abaixoMeta,1);
 assert.match(r.alertas[0],/negativa/);
});
test('ROAS calcula CPA agregado por pedidos reais',()=>{
 const r=calcularLote('planejamento-meta-roas','campanha;investimento;receita;pedidos;meta_roas\nA;100;200;2;3\nB;300;1200;6;3');
 assert.equal(r.total,3.5);
 assert.match(r.indicadores[2][1],/50,00/);
 assert.equal(r.abaixoMeta,1);
});
test('ponto de equilíbrio inclui receita necessária',()=>{
 const r=calcularLote('analise-ponto-equilibrio-canais','canal;preco_medio;custo_variavel;despesa_fixa\nSite;100;60;401');
 assert.match(r.linhas[0][2],/1.100,00/);
});

test('CSV aceita campos entre aspas, aspas escapadas e identificadores com separador',()=>{
 const entrada='canal;preco_medio;custo_variavel;despesa_fixa\n"Loja; Centro";100;60;400\n"Loja ""B""";120;80;200';
 const r=calcularLote('analise-ponto-equilibrio-canais',entrada);
 assert.deepEqual(r.linhas.map(x=>x[0]),['Loja; Centro','Loja "B"']);
 assert.equal(r.total,15);
});
test('CSV rejeita aspas quebradas, fórmulas em identificadores e tamanho por bytes',()=>{
 const cab='canal;preco_medio;custo_variavel;despesa_fixa';
 for(const linha of ['"Loja;100;60;400','=SOMA(1);100;60;400','+1;100;60;400','Loja;"100"0;60;400']){
  assert.throws(()=>calcularLote('analise-ponto-equilibrio-canais',cab+'\n'+linha));
 }
 assert.throws(()=>calcularLote('analise-ponto-equilibrio-canais',cab+'\n'+'Á'.repeat(51000)));
});
test('CSV TSV permite cabeçalho e dados com tabulação',()=>{
 const r=calcularLote('analise-ponto-equilibrio-canais','canal\tpreco_medio\tcusto_variavel\tdespesa_fixa\nSite\t100\t60\t400');
 assert.equal(r.total,10);
});

test('preço mínimo cobre comissão, tributos e custos fixos por unidade',()=>{
 const r=calcularLote('auditoria-margem-marketplace','sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nA;100;40;10;2;5;3;5');
 assert.match(r.linhas[0][2],/58,82/);
});
test('reajuste informa preço necessário para preservar contribuição',()=>{
 const r=calcularLote('simulador-reajuste-fornecedor','sku;custo_atual;reajuste_pct;preco_venda;taxas_pct\nA;50;10;100;10');
 assert.match(r.linhas[0][2],/105,56/);
});
test('devoluções mostram custo esperado por pedido',()=>{
 const r=calcularLote('simulador-devolucoes','sku;pedidos;taxa_devolucao_pct;frete_reverso;custo_inspecao;perda_produto\nA;100;10;12;3;5');
 assert.match(r.linhas[0][2],/R\$\\s*2,00/);
});

test('F249 exibe sensibilidade a custo fixo em dois cenários',()=>{
 const r=calcularLote('analise-ponto-equilibrio-canais',
 'canal;preco_medio;custo_variavel;despesa_fixa\nSite;100;60;400');
 assert.equal(r.total,10);
 assert.match(r.linhas[0][2],/-10%: 9 pedidos/);
 assert.match(r.linhas[0][2],/\+10%: 11 pedidos/);
});
test('F251 calcula pedidos adicionais para alcançar ROAS alvo',()=>{
 const r=calcularLote('planejamento-meta-roas',
 'campanha;investimento;receita;pedidos;meta_roas\nAds;100;200;4;3');
 assert.equal(r.total,2);
 assert.match(r.linhas[0][2],/pedidos adicionais ao ticket atual 2/);
});
test('F251 evita previsão de pedidos sem ticket histórico',()=>{
 const r=calcularLote('planejamento-meta-roas',
 'campanha;investimento;receita;pedidos;meta_roas\nAds;100;0;0;3');
 assert.match(r.linhas[0][2],/não estimável/);
});

test('F247 informa preço mínimo para atingir margem de 20%',()=>{
 const r=calcularLote('auditoria-margem-marketplace','sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nSKU;100;50;10;5;5;0;5');
 assert.match(r.linhas[0][2],/preço para margem de 20% R\$ 92,31/);
});
test('F247 informa meta inviável quando taxas consomem a margem',()=>{
 const r=calcularLote('auditoria-margem-marketplace','sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nSKU;100;20;80;0;0;0;5');
 assert.match(r.linhas[0][2],/preço para margem de 20% inviável/);
});
test('F250 informa aumento de preço para preservar contribuição',()=>{
 const r=calcularLote('simulador-reajuste-fornecedor','sku;custo_atual;reajuste_pct;preco_venda;taxas_pct\nSKU;50;10;100;10');
 assert.match(r.linhas[0][2],/aumento mínimo do preço 5,56%|aumento mínimo do preço 5.56%/);
});

test('F247 aceita meta de margem editável e altera preço-alvo',()=>{
 const csv='sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nSKU;100;50;10;5;5;0;5';
 const base=calcularLote('auditoria-margem-marketplace',csv);
 const ajustado=calcularLote('auditoria-margem-marketplace',csv,{margemPercentual:'30,5'});
 assert.match(base.linhas[0][2],/margem de 20%/);
 assert.match(ajustado.linhas[0][2],/margem de 30.5%/);
 assert.notEqual(base.linhas[0][2],ajustado.linhas[0][2]);
});
test('F248 alerta devoluções segundo limite personalizado',()=>{
 const csv='sku;pedidos;taxa_devolucao_pct;frete_reverso;custo_inspecao;perda_produto\nSKU;100;8;12;3;5';
 assert.equal(calcularLote('simulador-devolucoes',csv).abaixoMeta,0);
 const custom=calcularLote('simulador-devolucoes',csv,{alertaDevolucao:'7,5'});
 assert.equal(custom.abaixoMeta,1);
 assert.match(custom.alertas[0],/7.5%/);
});
test('metas fora do intervalo são recusadas',()=>{
 const csv=DEFINICOES['auditoria-margem-marketplace'].exemplo;
 for(const margemPercentual of [-1,100,'abc','Infinity']){
  assert.throws(()=>calcularLote('auditoria-margem-marketplace',csv,{margemPercentual}));
 }
 assert.throws(()=>calcularLote('simulador-devolucoes',DEFINICOES['simulador-devolucoes'].exemplo,{alertaDevolucao:101}));
});


test('F249 cenários personalizáveis alteram pedidos sem mudar equilíbrio principal',()=>{
 const csv='canal;preco_medio;custo_variavel;despesa_fixa\nSite;100;60;1000';
 const r=calcularLote('analise-ponto-equilibrio-canais',csv,{variacaoCenario:'25,5'});
 assert.equal(r.total,25);
 assert.match(r.linhas[0][2],/25.5%: 19 pedidos/);
 assert.match(r.linhas[0][2],/25.5%: 32 pedidos/);
});
test('F249 rejeita cenários fora de faixa',()=>{
 const csv='canal;preco_medio;custo_variavel;despesa_fixa\nSite;100;60;1000';
 for(const variacaoCenario of ['-1','101','infinito'])assert.throws(()=>calcularLote('analise-ponto-equilibrio-canais',csv,{variacaoCenario}));
});
