import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TIPOS_LOTE_PREMIUM,analisarLotePremium,ErroLotePremium} from '../servidor/analises-premium-lote.mjs';
import {criarModuloLotePremium,montarRelatorioLote} from '../scripts/núcleo/premium-lote.js';
const amostras={
 'simulador-margem-marketplaces':{csv:'sku;canal;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_unitario;imposto_pct;devolucao_pct;meta_margem_pct\nS1;CanalA;10;100;40;10;2;5;3;5;2;15'},
 'conciliacao-de-repasses':{pedidos:'pedido;canal;previsto;status\nP1;Canal A;100;pago\nP2;Canal A;30;pago',repasses:'pedido;recebido;taxas\nP1;90;10\nP2;20;5'},
 'auditoria-de-devolucoes':{vendas:'sku;vendidas;preco;cmv;frete;taxas\nS1;10;100;40;20;30',devolucoes:'sku;devolvidas;reembolsos;frete_reverso;perdas\nS1;2;200;20;30'},
 'divergencias-de-inventario':{csv:'sku;erp;contagem;reservado;custo\nS1;30;28;5;40'},
 'analise-de-campanhas-ads':{csv:'campanha;impressoes;cliques;pedidos;receita;gasto;cmv;taxas;meta_roas\nA;1000;100;10;1200;200;500;100;3'}
};
test('cinco motores produzem relatórios completos e interfaces premium distintas',()=>{
 assert.equal(TIPOS_LOTE_PREMIUM.length,5);
 for(const slug of TIPOS_LOTE_PREMIUM){
  const relatorio=analisarLotePremium(slug,amostras[slug]), ui=criarModuloLotePremium(slug);
  assert.equal(typeof ui.montar,'function');
  assert.ok(ui.instruções.passos.length>=4);
  assert.ok(Array.isArray(relatorio.planilha)&&relatorio.planilha.length>=2,slug);
  assert.ok(relatorio.planilha.slice(1).every(l=>l.length===relatorio.planilha[0].length),slug);
  assert.equal(montarRelatorioLote(relatorio,slug).arquivos.length,2);
 }
});
test('marketplace calcula preço mínimo e contribuição após impostos e Ads',()=>{
 const a=analisarLotePremium('simulador-margem-marketplaces',amostras['simulador-margem-marketplaces']);
 assert.equal(a.indicadores.find(x=>x[0]==='Contribuição após custos')[1],330);
 assert.equal(a.planilha[1][2],10);
 assert.ok(a.planilha[1][7]>0);
});
test('conciliação encontra discrepância e repasse ausente',()=>{
 const a=analisarLotePremium('conciliacao-de-repasses',amostras['conciliacao-de-repasses']);
 assert.equal(a.indicadores.at(-1)[1],1);
 assert.equal(a.planilha[2].at(-1),'Divergente');
});
test('devoluções invalidam quantidade maior que vendas',()=>{
 const p=amostras['auditoria-de-devolucoes'];
 assert.throws(()=>analisarLotePremium('auditoria-de-devolucoes',{...p,devolucoes:p.devolucoes.replace(';2;',';11;')}),/superam/);
});
test('estoque com ERP e contagem reporta falta monetizada',()=>{
 const a=analisarLotePremium('divergencias-de-inventario',amostras['divergencias-de-inventario']);
 assert.equal(a.indicadores.at(-1)[1],-80);
 assert.equal(a.planilha[1].at(-1),'Falta');
});
test('Ads computa métricas sem atribuir lucro a ROAS alto',()=>{
 const a=analisarLotePremium('analise-de-campanhas-ads',amostras['analise-de-campanhas-ads']);
 assert.equal(a.indicadores[2][1],400);
 assert.equal(a.planilha[1][6],6);
});
test('campos inválidos e duplicatas são recusados',()=>{
 const a=amostras['simulador-margem-marketplaces'];
 assert.throws(()=>analisarLotePremium('simulador-margem-marketplaces',{csv:a.csv.replace(';10;100;',';10;-100;')}),ErroLotePremium);
 assert.throws(()=>analisarLotePremium('outro',{csv:a.csv}),ErroLotePremium);
 assert.throws(()=>analisarLotePremium('conciliacao-de-repasses',{...amostras['conciliacao-de-repasses'],pedidos:amostras['conciliacao-de-repasses'].pedidos+'\nP1;Canal A;100;pago'}),/duplicado/);
});
test('rota exige sessão Premium e limite antes de ler entrada',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=src.indexOf("const rotaLote=p.match(/^\\/api\\/premium\\/lote\\/([a-z0-9-]+)$/)");
 assert.ok(a>=0);
 const bloco=src.slice(a,src.indexOf("if(p==='/api/planos'&&m==='GET')",a));
 assert.ok(bloco.indexOf('const u=exigir(req)')<bloco.indexOf('await corpo(req,300000)'));
 assert.ok(bloco.indexOf("u.plano!=='premium'")<bloco.indexOf('await corpo(req,300000)'));
 assert.match(bloco,/conferirLimite/);assert.match(src,/proteger\(req\);/);
});

test('conciliação rejeita taxas superiores ao bruto para evitar líquido esperado negativo',()=>{
 const pedidos='pedido;canal;previsto;status\nP1;Canal A;100;pago';
 const repasses='pedido;recebido;taxas\nP1;0;150';
 assert.throws(()=>analisarLotePremium('conciliacao-de-repasses',{pedidos,repasses}),/taxas superam/);
});
