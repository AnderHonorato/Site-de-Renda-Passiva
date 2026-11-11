import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {executarOperacaoAvancada,ErroOperacaoAvancada,TIPOS_OPERACOES_AVANCADAS}
  from '../servidor/operacoes-avancadas-2.mjs';
import {criarModuloOperacaoAvancada,apresentarOperacaoAvancada,TIPOS_OPERACOES_INTERFACE}
  from '../scripts/núcleo/operacoes-avancadas-2.js';
import {ferramentaPorSlug} from '../dados/catálogo.js';

const EXEMPLOS={
 'descontos-progressivos-lote':'sku;preco_normal;desconto_pct;quantidade;custo_unitario;taxas_pct;frete_total;meta_margem_pct\nA;100;15;50;55;12;100;10',
 'estoque-parado-capital':'sku;estoque;dias_sem_venda;vendas_90_dias;custo_unitario;preco;custo_carrego_pct_mes\nA;120;120;0;50;95;2',
 'ciclo-financeiro-capital-giro':'unidade;cmv_anual;estoque_medio;receita_anual;contas_receber;compras_anuais;contas_pagar;reduzir_dso_dias\nLoja A;365000;50000;730000;60000;300000;28000;10',
 'auditoria-taxas-pagamentos':'transacao;meio;valor_bruto;taxa_contratada_pct;taxa_cobrada_pct;fixa_contratada;fixa_cobrada;antecipacao_contratada;antecipacao_cobrada\nT1;Cartao;200;2,5;3;0;0;0;1',
 'politica-frete-faixas':'faixa;pedidos;ticket_medio;cmv_pct;taxas_pct;frete_pago;frete_cobrado;ads_por_pedido;meta_margem_pct\nAte 99;100;80;40;12;15;10;4;10',
 'estoque-seguranca-estatistico':'sku;media_dia;desvio_dia;prazo_dias;estoque;recebimentos;fator_z;custo_unitario\nA;10;4;9;70;10;1,65;55',
 'custo-cancelamentos-pedidos':'motivo;cancelados;recuperados;ticket_medio;tarifas_perdidas_total;frete_perdido_total;ads_perdidos_total\nPagamento recusado;50;12;100;70;0;150',
 'ocupacao-armazenagem':'zona;posicoes;largura_m;profundidade_m;altura_util_m;ocupado_m3;entrada_prevista_m3;reserva_pct\nA1;50;1,2;1;2;70;20;10',
 'compras-priorizadas-orcamento':'sku;demanda_prazo;estoque;recebimentos;custo_unitario;prioridade;lote_minimo\nCAM-01;100;20;10;20;5;10\nCAM-02;120;35;5;35;3;10\nCAM-03;30;20;0;10;4;5',
 'projecao-assinaturas-recorrentes':'plano;assinantes_inicio;novos_mes;churn_pct;preco_mes;custo_mes;taxa_pct;cac_novo;meses\nEssencial;100;20;5;40;10;4;45;1'
};
const dados=slug=>({csv:EXEMPLOS[slug],...(slug==='compras-priorizadas-orcamento'?{orcamento:1500}:{})});
const rel=slug=>executarOperacaoAvancada(slug,dados(slug));
test('F237-F246 têm 10 cálculos, módulos, ajuda, catálogo Premium e exportações',()=>{
 assert.deepEqual(TIPOS_OPERACOES_AVANCADAS,TIPOS_OPERACOES_INTERFACE);
 assert.equal(TIPOS_OPERACOES_AVANCADAS.length,10);
 for(const slug of TIPOS_OPERACOES_AVANCADAS){
  const r=rel(slug),mod=criarModuloOperacaoAvancada(slug);
  assert.ok(r.planilha.length>=2,slug);
  assert.ok(r.planilha[0].length>=8,slug);
  assert.ok(r.planilha.every(row=>row.length===r.planilha[0].length),slug);
  assert.ok(r.indicadores.length>=3,slug);
  assert.ok(r.avisos.length>=2,slug);
  assert.ok(mod.instruções.passos.length>=5,slug);
  assert.equal(typeof mod.montar,'function',slug);
  assert.equal(apresentarOperacaoAvancada(r,slug).arquivos.length,2,slug);
  assert.equal(ferramentaPorSlug[slug].status,'pronta',slug);
  assert.equal(ferramentaPorSlug[slug].plano,'premium',slug);
  assert.equal(ferramentaPorSlug[slug].local,false,slug);
 }
});
test('F237: desconto preserva volume e considera frete único por lote',()=>{
 const x=rel('descontos-progressivos-lote').planilha[1];
 assert.equal(x[4],85);
 assert.equal(x[5],1550);
 assert.equal(x[6],890);
 assert.equal(x[8],-660);
 assert.equal(x[9],73.08);
});
test('F238: estoque sem giro expõe capital a custo e carrego mensal informado',()=>{
 const x=rel('estoque-parado-capital').planilha[1];
 assert.equal(x[4],6000);assert.equal(x[5],120);
 assert.equal(x[6],'Sem giro');assert.equal(x[8],'Parado');
});
test('F239: ciclo financeiro separa dias de estoque, recebimento e pagamento',()=>{
 const x=rel('ciclo-financeiro-capital-giro').planilha[1];
 assert.equal(x[1],50);assert.equal(x[2],30);assert.equal(x[3],34.07);
 assert.equal(x[4],45.93);assert.equal(x[5],45933.33);
 assert.equal(x[6],10);assert.equal(x[7],20000);
});
test('F240: taxas contratadas e cobradas têm valores independentes',()=>{
 const x=rel('auditoria-taxas-pagamentos').planilha[1];
 assert.equal(x[3],5);assert.equal(x[4],7);assert.equal(x[5],2);
 assert.equal(x[6],193);assert.equal(x[7],'Revisar');
});
test('F241: subsídio por faixa mantém frete pago e retira receita de frete',()=>{
 const x=rel('politica-frete-faixas').planilha[1];
 assert.equal(x[3],29.4);assert.equal(x[4],19.4);
 assert.equal(x[5],24.25);assert.equal(x[6],1000);
 assert.equal(x[7],26.4);
});
test('F242: cálculo de segurança usa z vezes desvio vezes raiz do prazo',()=>{
 const x=rel('estoque-seguranca-estatistico').planilha[1];
 assert.equal(x[5],20);assert.equal(x[6],110);assert.equal(x[7],80);
 assert.equal(x[8],30);assert.equal(x[9],1650);
});
test('F243: vendas potencialmente perdidas são diferentes dos custos não recuperáveis',()=>{
 const x=rel('custo-cancelamentos-pedidos').planilha[1];
 assert.equal(x[3],38);assert.equal(x[4],24);
 assert.equal(x[5],3800);assert.equal(x[9],220);
});
test('F244: ocupação calcula capacidade útil e reserva de espaço',()=>{
 const x=rel('ocupacao-armazenagem').planilha[1];
 assert.equal(x[2],120);assert.equal(x[3],108);
 assert.equal(x[6],90);assert.equal(x[7],83.33);
 assert.equal(x[8],0);
});
test('F245: compra respeita orçamento e lotes mínimos por prioridade',()=>{
 const r=rel('compras-priorizadas-orcamento'),x=r.planilha;
 assert.equal(x.length,4);
 assert.equal(x[1][0],'CAM-01');assert.equal(x[1][7],70);
 assert.equal(x[2][0],'CAM-03');assert.equal(x[2][7],10);
 assert.equal(x[3][0],'CAM-02');assert.equal(x[3][7],0);
 assert.equal(r.indicadores[2][1],1500);
 assert.equal(r.indicadores[4][1],80);
});
test('F246: assina após churn e desconta CAC apenas de novos membros',()=>{
 const x=rel('projecao-assinaturas-recorrentes').planilha[1];
 assert.equal(x[5],115);assert.equal(x[6],4600);
 assert.equal(x[7],2366);assert.equal(x[8],28.4);
 assert.equal(x[9],1.58);
});
test('regressão: todas recusam CSV ausente, ID duplicado ou pessoal e valores negativos',()=>{
 for(const slug of TIPOS_OPERACOES_AVANCADAS){
  assert.throws(()=>executarOperacaoAvancada(slug,{}),ErroOperacaoAvancada,slug);
  const base=EXEMPLOS[slug],line=base.split('\n')[1];
  assert.throws(()=>executarOperacaoAvancada(slug,{...dados(slug),csv:base+'\n'+line}),ErroOperacaoAvancada,slug);
  const parts=line.split(';');parts[0]='pessoa@email.example';
  assert.throws(()=>executarOperacaoAvancada(slug,{...dados(slug),csv:base.split('\n')[0]+'\n'+parts.join(';')}),ErroOperacaoAvancada,slug);
  assert.throws(()=>executarOperacaoAvancada(slug,{...dados(slug),csv:base.replace(/;\d+(?:,\d+)?;/,';-5;')}),ErroOperacaoAvancada,slug);
 }
 assert.throws(()=>executarOperacaoAvancada('../invalid',{}),ErroOperacaoAvancada);
});
test('regressão: compras recusam zero orçamento e lote menor que um',()=>{
 const base=dados('compras-priorizadas-orcamento');
 assert.throws(()=>executarOperacaoAvancada('compras-priorizadas-orcamento',{...base,orcamento:0}),ErroOperacaoAvancada);
 assert.throws(()=>executarOperacaoAvancada('compras-priorizadas-orcamento',{...base,csv:base.csv.replace(';5;10',';5;0')}),ErroOperacaoAvancada);
});
test('regressão: quantidade maior que estoque e estornos inviáveis são rejeitados',()=>{
 const base=dados('custo-cancelamentos-pedidos');
 assert.throws(()=>executarOperacaoAvancada('custo-cancelamentos-pedidos',{...base,csv:base.csv.replace(';50;12;',';50;55;')}),ErroOperacaoAvancada);
});
test('regressão: arquivo não pode ultrapassar 500 linhas nem 270 KB',()=>{
 const slug='auditoria-taxas-pagamentos',base=dados(slug),one=base.csv.split('\n')[1];
 const linhas=base.csv.split('\n')[0]+'\n'+Array.from({length:501},(_,i)=>one.replace('T1;','T'+i+';')).join('\n');
 assert.throws(()=>executarOperacaoAvancada(slug,{csv:linhas}),/500/);
 assert.throws(()=>executarOperacaoAvancada(slug,{csv:base.csv+' '.repeat(280000)}),ErroOperacaoAvancada);
});
test('ACL Premium e limite de uso são verificados antes de ler CSV comercial',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=src.indexOf('const rotaOperacoesAvancadas=p.match(');
 const b=src.indexOf("if(p==='/api/planos'&&m==='GET')",a);
 assert.ok(a>0&&b>a);
 const route=src.slice(a,b);
 const ordem=['const u=exigir(req)',"u.plano!=='premium'",
  "conferirLimite('operacoes-avancadas:'",'await corpo(req,300000)',
  'revalidarPremium(req,u.id)','executarOperacaoAvancada(']
  .map(k=>route.indexOf(k));
 assert.ok(ordem.every((v,i)=>v>=0&&(!i||v>ordem[i-1])),JSON.stringify(ordem));
 assert.match(src,/proteger\(req\);/);
});
