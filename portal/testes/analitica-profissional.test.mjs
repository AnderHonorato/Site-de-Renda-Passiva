import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TIPOS_ANALITICA,executarAnalitica,ErroAnalitica} from '../servidor/analitica-profissional.mjs';
import {criarModuloAnalitica,apresentarAnalitica} from '../scripts/núcleo/analitica-profissional.js';
const base={
 'auditoria-faturas-frete':{csv:'etiqueta;pedido;transportadora;comprimento_cm;largura_cm;altura_cm;peso_real_kg;divisor_cubagem;peso_faturado_kg;frete_base;adicionais_autorizados;frete_faturado;frete_repassado\nE1;P1;T1;30;20;20;1.2;6000;2;18;3;28;12'},
 'afinidade-cestas-pedidos':{suporte_min_pct:'10',confianca_min_pct:'20',
  csv:'pedido;sku;unidades;receita\nP1;A;1;30\nP1;B;1;20\nP2;A;1;30\nP2;B;1;20\nP3;A;1;30\nP3;C;1;20'},
 'inadimplencia-recebiveis':{data_referencia:'2026-11-03',
  csv:'fatura;cliente;emissao;vencimento;valor;valor_pago;data_pagamento\nF1;C1;2026-09-01;2026-09-30;1000;200;2026-09-15\nF2;C2;2026-10-01;2026-11-30;500;0;'},
 'experimentos-ab-lote':{csv:'experimento;variacao;controle;visitantes;conversoes;receita;custos\nE1;A;1;1000;100;10000;5000\nE1;B;0;1000;200;16000;7000'},
 'diagnostico-checkout-segmentos':{csv:'periodo;segmento;sessoes;visitas_produto;carrinhos;checkout;compras;receita\n2026-10;Mobile;1000;800;100;60;50;5000'}
};
test('cinco motores entregam relatórios completos e ajuda integrada',()=>{
 assert.equal(TIPOS_ANALITICA.length,5);
 for(const slug of TIPOS_ANALITICA){
  const r=executarAnalitica(slug,base[slug]),ui=criarModuloAnalitica(slug);
  assert.ok(r.planilha.length>1);
  assert.ok(r.planilha.slice(1).every(x=>x.length===r.planilha[0].length),slug);
  assert.equal(apresentarAnalitica(r,slug).arquivos.length,2);
  assert.equal(typeof ui.montar,'function');assert.ok(ui.instruções.passos.length>=5);
 }
});
test('auditoria frete encontra diferença acima do acordado e cubagem real',()=>{
 const r=executarAnalitica('auditoria-faturas-frete',base['auditoria-faturas-frete']);
 assert.equal(r.planilha[1][4],2);
 assert.equal(r.indicadores[3][1],7);
 assert.equal(r.planilha[1].at(-1),'Acima do acordado');
});
test('coocorrência calcula suporte, confiança e lift entre produtos',()=>{
 const r=executarAnalitica('afinidade-cestas-pedidos',base['afinidade-cestas-pedidos']);
 assert.equal(r.indicadores[0][1],3);
 const ab=r.planilha.find(row=>row[0]==='A'&&row[1]==='B');
 assert.ok(ab);assert.equal(ab[2],2);assert.equal(ab[3],66.67);
 assert.equal(ab[5],1);
});
test('aging usa apenas saldo aberto na faixa vencida',()=>{
 const r=executarAnalitica('inadimplencia-recebiveis',base['inadimplencia-recebiveis']);
 assert.equal(r.indicadores[3][1],1300);
 assert.equal(r.indicadores[4][1],800);
});
test('A/B aplica Holm e marca diferença com amostra suficiente',()=>{
 const r=executarAnalitica('experimentos-ab-lote',base['experimentos-ab-lote']);
 assert.equal(r.indicadores[2][1],1);
 assert.ok(r.planilha[2][10]<.05);
 assert.ok(r.planilha[2].at(-1).includes('estatística'));
});
test('checkout aponta a etapa com menor passagem',()=>{
 const r=executarAnalitica('diagnostico-checkout-segmentos',base['diagnostico-checkout-segmentos']);
 assert.equal(r.planilha[1][12],'Produto→carrinho');
 assert.equal(r.planilha[1][7],5);
});
test('recuperação hipotética no checkout respeita conversões posteriores',()=>{
 const r=executarAnalitica('diagnostico-checkout-segmentos',base['diagnostico-checkout-segmentos']);
 assert.equal(r.planilha[1][15],3500);
});
test('rejeita falsificação de dados, conversões maiores que visitas e e-mail pessoal',()=>{
 assert.throws(()=>executarAnalitica('qualquer',{}),ErroAnalitica);
 const a=base['experimentos-ab-lote'];
 assert.throws(()=>executarAnalitica('experimentos-ab-lote',{csv:a.csv.replace('1000;200;','10;200;')}),ErroAnalitica);
 const b=base['inadimplencia-recebiveis'];
 assert.throws(()=>executarAnalitica('inadimplencia-recebiveis',{...b,
  csv:b.csv.replace(';C1;',';cliente@email.com;')}),ErroAnalitica);
});
test('roteamento Premium exige login e plano antes de ler o corpo',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=src.indexOf("const rotaAnalitica=p.match(/^\\/api\\/premium\\/analitica\\/([a-z0-9-]+)$/)");
 const b=src.indexOf("if(p==='/api/planos'&&m==='GET')",a);
 assert.ok(a>=0&&b>a);const route=src.slice(a,b);
 const auth=route.indexOf('const u=exigir(req)'),plan=route.indexOf("u.plano!=='premium'"),
  limit=route.indexOf("conferirLimite('analitica-profissional:'"),body=route.indexOf('await corpo(req,600000)');
 assert.ok(auth>=0&&plan>auth&&limit>plan&&body>limit);
 assert.match(src,/proteger\(req\);/);
});

test('A/B preserva seis casas de precisão nos p-valores exportados',()=>{
 const csv='experimento;variacao;controle;visitantes;conversoes;receita;custos\nE2;A;1;1000;100;10000;5000\nE2;B;0;1000;112;11000;5000';
 const r=executarAnalitica('experimentos-ab-lote',{csv});
 const variacao=r.planilha.find(x=>x[1]==='B');
 assert.ok(variacao[9]>0&&variacao[9]<1);
 assert.equal(variacao[9],variacao[10]);
 assert.notEqual(variacao[9],Math.round(variacao[9]*100)/100);
});


test('QA de limites e consistência financeira em lotes Premium',()=>{
 const receb=base['inadimplencia-recebiveis'];
 assert.throws(()=>executarAnalitica('inadimplencia-recebiveis',{...receb,
  csv:receb.csv.replace('2026-09-15','2026-12-01')}),ErroAnalitica);
 assert.throws(()=>executarAnalitica('inadimplencia-recebiveis',{...receb,
  csv:receb.csv.replace(';1000;200;',';1000;1200;')}),ErroAnalitica);
 const frete=base['auditoria-faturas-frete'];
 assert.throws(()=>executarAnalitica('auditoria-faturas-frete',{csv:frete.csv+'\n'+frete.csv.split('\n')[1]}),ErroAnalitica);
 const afinidade=base['afinidade-cestas-pedidos'];
 assert.throws(()=>executarAnalitica('afinidade-cestas-pedidos',{...afinidade,
  csv:afinidade.csv+'\nP1;A;1;30'}),ErroAnalitica);
 const csv='experimento;variacao;controle;visitantes;conversoes;receita;custos\n'+
  Array.from({length:501},(_,i)=>'E'+i+';A;1;100;10;1000;500').join('\n');
 assert.throws(()=>executarAnalitica('experimentos-ab-lote',{csv}),ErroAnalitica);
});

test('QA de datas impossíveis e variações A/B inconsistentes',()=>{
 const receb=base['inadimplencia-recebiveis'];
 assert.throws(()=>executarAnalitica('inadimplencia-recebiveis',{...receb,
  csv:receb.csv.replace('2026-09-30','2026-02-30')}),ErroAnalitica);
 const ab=base['experimentos-ab-lote'];
 assert.throws(()=>executarAnalitica('experimentos-ab-lote',{csv:ab.csv.replace('E1;B;0;','E1;B;1;')}),ErroAnalitica);
 assert.throws(()=>executarAnalitica('experimentos-ab-lote',{csv:ab.csv.replace('E1;B;0;','E1;A;0;')}),ErroAnalitica);
 assert.throws(()=>executarAnalitica('experimentos-ab-lote',{csv:ab.csv.replace('1000;200;','1000;1001;')}),ErroAnalitica);
});
