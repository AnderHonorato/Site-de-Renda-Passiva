import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TIPOS_OPERACOES,executarOperacoes,ErroOperacoes} from '../servidor/operacoes-profissionais.mjs';
import {criarModuloOperacoes,apresentarOperacao} from '../scripts/núcleo/operacoes-profissionais.js';
const amostras={
 'planejamento-kits-combos':{
  kits:'kit;preco;unidades_previstas;comissao_pct;tarifa_fixa;embalagem;ads_unitario\nK1;180;8;10;0;5;0\nK2;120;8;10;0;5;0',
  componentes:'kit;componente;quantidade;estoque;cmv\nK1;A;2;20;20\nK1;B;1;15;10\nK2;A;1;20;20'},
 'auditoria-sla-logistico':{
  data_referencia:'2026-11-03',
  pedidos:'pedido;canal;data_pagamento;prazo_postagem;data_postagem;prazo_entrega;data_entrega;valor\nP1;Loja;2026-10-01;2026-10-03;2026-10-04;2026-10-06;2026-10-09;100\nP2;Loja;2026-10-30;2026-11-01;;2026-11-02;;200'},
 'coortes-retencao-ltv':{
  pedidos:'pedido;cliente;data;receita;cmv;outros_custos\nP1;C1;2026-07-03;100;40;10\nP2;C2;2026-07-11;80;30;10\nP3;C1;2026-08-04;150;60;20',
  aquisicao:'mes;gasto_aquisicao\n2026-07;60'},
 'transferencias-entre-cds':{
  estoques:'sku;cd;estoque;reservado;demanda_diaria;prazo_fornecedor;dias_seguranca\nS1;A;100;0;1;7;3\nS1;B;2;0;3;10;2',
  rotas:'origem;destino;prazo_dias;custo_unitario;capacidade\nA;B;3;2;20'},
 'risco-concentracao-comercial':{
  csv:'sku;canal;fornecedor;receita;custos_variaveis\nS1;Canal A;Fab1;1000;500\nS2;Canal A;Fab2;500;300\nS3;Canal B;Fab2;500;200',
  queda_top_canal_pct:30,queda_top_fornecedor_pct:40}
};
test('cinco ferramentas retornam planilhas completas e módulos com ajuda Premium',()=>{
 assert.equal(TIPOS_OPERACOES.length,5);
 for(const slug of TIPOS_OPERACOES){
  const resultado=executarOperacoes(slug,amostras[slug]);
  const ui=criarModuloOperacoes(slug);
  assert.ok(resultado.planilha.length>1,slug);
  assert.ok(resultado.planilha.slice(1).every(x=>x.length===resultado.planilha[0].length),slug);
  assert.equal(apresentarOperacao(resultado,slug).arquivos.length,2);
  assert.ok(ui.instruções.passos.length>=5&&typeof ui.montar==='function');
 }
});
test('kits compartilham estoques e não alocam componente duas vezes',()=>{
 const r=executarOperacoes('planejamento-kits-combos',amostras['planejamento-kits-combos']);
 assert.equal(r.planilha[1][3],8); // K1 maior contribuição e consome 16 A
 assert.equal(r.planilha[2][3],4); // K2 só dispõe de 4 A
 assert.equal(r.indicadores[1][1],12);
});
test('SLA classifica atraso realizado e atraso de pedido aberto',()=>{
 const r=executarOperacoes('auditoria-sla-logistico',amostras['auditoria-sla-logistico']);
 assert.equal(r.indicadores[2][1],2);
 assert.equal(r.indicadores[3][1],2);
 assert.equal(r.planilha[1][9],'Entregue com violação');
});
test('coortes isolam clientes por primeira compra e calculam M1',()=>{
 const r=executarOperacoes('coortes-retencao-ltv',amostras['coortes-retencao-ltv']);
 assert.equal(r.planilha[1][0],'2026-07');
 assert.equal(r.planilha[1][1],2);
 assert.equal(r.planilha[1][6],50);
 assert.equal(r.indicadores[0][1],2);
});
test('CD propõe transferência limitada por estoque e rota',()=>{
 const r=executarOperacoes('transferencias-entre-cds',amostras['transferencias-entre-cds']);
 assert.equal(r.indicadores[1][1],20);
 assert.equal(r.planilha[1][3],20);
 assert.ok(r.planilha.some(x=>x.includes('Falta não atendida')));
});
test('concentração calcula HHI por canal e mantém cenários independentes',()=>{
 const r=executarOperacoes('risco-concentracao-comercial',amostras['risco-concentracao-comercial']);
 assert.equal(r.indicadores.find(x=>x[0]==='HHI por canal')[1],6250);
 assert.ok(r.avisos.join(' ').includes('SEPARADOS'));
});
test('coortes ainda não observadas não são classificadas como abandono',()=>{
 const r=executarOperacoes('coortes-retencao-ltv',amostras['coortes-retencao-ltv']);
 assert.equal(r.planilha[1][6],50);
 assert.equal(r.planilha[1][7],'n/d');
 assert.equal(r.planilha[1][9],'n/d');
});
test('entrada insegura, repetição e sequência de datas inválida são recusadas',()=>{
 const d=amostras['planejamento-kits-combos'];
 assert.throws(()=>executarOperacoes('planejamento-kits-combos',{...d,
  componentes:d.componentes.replace(';20;20',';20;-20')}),ErroOperacoes);
 assert.throws(()=>executarOperacoes('qualquer',{}),ErroOperacoes);
 const sla=amostras['auditoria-sla-logistico'];
 assert.throws(()=>executarOperacoes('auditoria-sla-logistico',{...sla,
  data_referencia:'2026-02-31'}),ErroOperacoes);
 const c=amostras['coortes-retencao-ltv'];
 assert.throws(()=>executarOperacoes('coortes-retencao-ltv',{...c,
  pedidos:c.pedidos.replace('C1','pessoa@email.com')}),ErroOperacoes);
});
test('a rota Premium requer sessão, plano e rate limit antes do corpo',async()=>{
 const s=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=s.indexOf("const rotaOperacoes=p.match(/^\\/api\\/premium\\/operacoes\\/([a-z0-9-]+)$/)");
 const b=s.indexOf("if(p==='/api/planos'&&m==='GET')",a);
 assert.ok(a>=0&&b>a);
 const r=s.slice(a,b);
 const i=r.indexOf('const u=exigir(req)'),p=r.indexOf("u.plano!=='premium'"),
  l=r.indexOf("conferirLimite('operacoes-profissionais:'"),c=r.indexOf('await corpo(req,600000)');
 assert.ok(i>=0&&p>i&&l>p&&c>l);
 assert.match(s,/proteger\(req\);/);
});
