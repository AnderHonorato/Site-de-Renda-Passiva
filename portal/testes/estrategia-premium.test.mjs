import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TIPOS_ESTRATEGIA,executarEstrategiaPremium,ErroEstrategia} from '../servidor/estrategia-premium.mjs';
import {criarModuloEstrategia,apresentarEstrategia} from '../scripts/núcleo/estrategia-premium.js';
const amostras={
 'precificacao-de-promocoes':{csv:'sku;preco_normal;preco_promocional;cmv;comissao_pct;imposto_pct;frete;ads;unidades_previstas;meta_margem_pct\nSKU1;120;100;50;10;5;4;3;10;15'},
 'projecao-caixa-operacional':{saldo_inicial:'100',saldo_minimo:'50',
  recebiveis:'data;origem;valor;probabilidade_pct\n2026-11-08;Cliente;100;80',
  pagamentos:'data;categoria;valor\n2026-11-09;Fornecedor;90'},
 'comparador-de-fornecedores':{csv:'sku;fornecedor;quantidade;preco_unitario;frete_total;imposto_pct;prazo_dias;minimo_lote;orcamento\nSKU1;A;10;20;10;5;3;10;300\nSKU1;B;10;19;20;5;5;10;300'},
 'auditoria-de-cupons':{csv:'campanha;sku;preco;cmv;comissao_pct;imposto_pct;frete;ads;desconto_pct;subsidio_fixo;unidades\nCampA;S1;100;50;10;5;5;5;10;2;10'},
 'priorizacao-de-catalogo':{csv:'sku;visitas;pedidos;receita;cmv;ads;devolucoes;estoque;prazo_dias;dias_periodo\nSKU1;1000;40;4000;1700;500;2;5;7;30\nSKU2;500;10;900;400;200;1;30;10;30'}
};
test('cinco análises entregam dados consistentes e os módulos aceitam montagem',()=>{
 assert.equal(TIPOS_ESTRATEGIA.length,5);
 for(const tipo of TIPOS_ESTRATEGIA){
  const r=executarEstrategiaPremium(tipo,amostras[tipo]),ui=criarModuloEstrategia(tipo);
  assert.ok(r.planilha.length>=2,tipo);
  assert.ok(r.planilha.slice(1).every(a=>a.length===r.planilha[0].length),tipo);
  assert.equal(apresentarEstrategia(r,tipo).arquivos.length,2);
  assert.equal(typeof ui.montar,'function');assert.ok(ui.instruções.passos.length>=4);
 }
});
test('promoção calcula contribuição e perda financeira contra preço normal',()=>{
 const r=executarEstrategiaPremium('precificacao-de-promocoes',amostras['precificacao-de-promocoes']);
 assert.equal(r.planilha[1][5],28);
 assert.equal(r.planilha[1][9],17);
});
test('caixa pondera recebíveis e detecta projeção conservadora',()=>{
 const r=executarEstrategiaPremium('projecao-caixa-operacional',amostras['projecao-caixa-operacional']);
 assert.equal(r.indicadores[1][1],90);
 assert.equal(r.indicadores[2][1],50);
});
test('comparador aponta menor custo viável por SKU',()=>{
 const r=executarEstrategiaPremium('comparador-de-fornecedores',amostras['comparador-de-fornecedores']);
 assert.ok(r.planilha.slice(1).some(a=>a.at(-1).includes('Menor custo')));
});
test('cupom calcula teto viável e margem descontada',()=>{
 const r=executarEstrategiaPremium('auditoria-de-cupons',amostras['auditoria-de-cupons']);
 assert.equal(r.planilha[1][3],90);
 assert.ok(r.planilha[1][5]>0);
});
test('ranking explicita risco de estoque e classe ABC sem inventar lucro líquido',()=>{
 const r=executarEstrategiaPremium('priorizacao-de-catalogo',amostras['priorizacao-de-catalogo']);
 assert.equal(r.planilha[1][0],'SKU1');
 assert.ok(r.alertas.some(a=>a.includes('cobertura')));
 assert.match(r.avisos.join(' '),/NÃO/);
});
test('recusa negativos, SKU duplicado e pedido maior que visitas',()=>{
 const a=amostras['priorizacao-de-catalogo'];
 assert.throws(()=>executarEstrategiaPremium('priorizacao-de-catalogo',{csv:a.csv.replace('1000;40;','5;40;')}),ErroEstrategia);
 assert.throws(()=>executarEstrategiaPremium('outro',a),ErroEstrategia);
 const b=amostras['precificacao-de-promocoes'];
 assert.throws(()=>executarEstrategiaPremium('precificacao-de-promocoes',{csv:b.csv.replace(';120;100;',';120;130;')}),ErroEstrategia);
});
test('rota premium autoriza e aplica limite antes de ler dados de estratégia',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=src.indexOf("const rotaEstrategia=p.match(/^\\/api\\/premium\\/estrategia\\/([a-z0-9-]+)$/)");
 assert.ok(a>=0);const b=src.slice(a,src.indexOf("if(p==='/api/planos'&&m==='GET')",a));
 assert.ok(b.indexOf('const u=exigir(req)')<b.indexOf('await corpo(req,300000)'));
 assert.ok(b.indexOf("u.plano!=='premium'")<b.indexOf('await corpo(req,300000)'));
 assert.match(b,/conferirLimite/);assert.match(src,/proteger\(req\);/);
});
