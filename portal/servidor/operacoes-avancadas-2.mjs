/** F237–F246: análise operacional com CSV. API Premium, sem integrações externas. */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';

export class ErroOperacaoAvancada extends Error {
  constructor(mensagem){super(mensagem);this.name='ErroOperacaoAvancada';}
}
export const TIPOS_OPERACOES_AVANCADAS=Object.freeze([
 'descontos-progressivos-lote','estoque-parado-capital','ciclo-financeiro-capital-giro',
 'auditoria-taxas-pagamentos','politica-frete-faixas',
 'estoque-seguranca-estatistico','custo-cancelamentos-pedidos',
 'ocupacao-armazenagem','compras-priorizadas-orcamento','projecao-assinaturas-recorrentes'
]);
const arred=n=>Math.round((n+Number.EPSILON)*100)/100;
function numero(v,nome,{max=1e11,inteiro=false,positivo=false}={}){
 let s=String(v??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(s))s=s.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:,\d{1,4})?$/.test(s))s=s.replace(',','.');
 if(!/^\d+(?:\.\d{1,4})?$/.test(s))throw new ErroOperacaoAvancada(nome+': valor numérico inválido.');
 const n=Number(s);
 if(!Number.isFinite(n)||n>max||(inteiro&&!Number.isSafeInteger(n))||(positivo&&n===0))
  throw new ErroOperacaoAvancada(nome+': valor fora do limite.');
 return n;
}
function id(s,campo){
 const value=String(s??'').trim();
 if(!value||value.length>70||/[<>\x00-\x1f@]/.test(value))
  throw new ErroOperacaoAvancada(campo+': identificador inválido. Não use dados pessoais.');
 return value;
}
function importar(d,cols,{chave='sku'}={}){
 const texto=d?.csv;
 if(typeof texto!=='string'||!texto.trim()||Buffer.byteLength(texto)>270000)
  throw new ErroOperacaoAvancada('Informe CSV/TSV de até 270 KB.');
 let linhas;
 try{linhas=lerDadosTexto(texto).linhas;}catch(e){
  throw new ErroOperacaoAvancada('CSV: '+e.message);
 }
 if(linhas.length<2||linhas.length>501)
  throw new ErroOperacaoAvancada('São permitidas entre 1 e 500 linhas de dados.');
 const headers=linhas[0].map(x=>x.trim().toLowerCase());
 if(new Set(headers).size!==headers.length)
  throw new ErroOperacaoAvancada('Existem colunas duplicadas.');
 const faltantes=cols.filter(c=>!headers.includes(c));
 if(faltantes.length)throw new ErroOperacaoAvancada('Colunas ausentes: '+faltantes.join(', '));
 const index=Object.fromEntries(cols.map(c=>[c,headers.indexOf(c)]));
 const vistos=new Set();
 return linhas.slice(1).map((row,i)=>{
  if(row.length!==headers.length)
   throw new ErroOperacaoAvancada('Linha '+(i+2)+': número de colunas incorreto.');
  const obj=Object.fromEntries(cols.map(c=>[c,String(row[index[c]]??'').trim()]));
  if(Object.values(obj).some(v=>v.length>180))
   throw new ErroOperacaoAvancada('Linha '+(i+2)+': campo excessivamente longo.');
  const k=id(obj[chave],chave);
  if(vistos.has(k))throw new ErroOperacaoAvancada('Identificador duplicado: '+k);
  vistos.add(k);return obj;
 });
}
function resultado(titulo,colunas,linhas,indicadores,avisos,alertas=[]){
 if(!linhas.length||linhas.some(l=>l.length!==colunas.length))
  throw new ErroOperacaoAvancada('Inconsistência ao gerar relatório.');
 return {titulo,total:linhas.length,planilha:[colunas,...linhas],
  indicadores,avisos,alertas:alertas.slice(0,100)};
}
function desconto(d){
 const data=importar(d,['sku','preco_normal','desconto_pct','quantidade',
  'custo_unitario','taxas_pct','frete_total','meta_margem_pct']);
 let contribuicao=0,variacao=0,prejuizos=0;const alerts=[];
 const rows=data.map(x=>{
  const p=numero(x.preco_normal,'preço',{positivo:true}),des=numero(x.desconto_pct,'desconto',{max:100}),
   q=numero(x.quantidade,'quantidade',{inteiro:true,positivo:true,max:1e7}),
   custo=numero(x.custo_unitario,'custo'),tax=numero(x.taxas_pct,'taxa',{max:100}),
   frete=numero(x.frete_total,'frete'),meta=numero(x.meta_margem_pct,'meta',{max:100});
  const prom=p*(1-des/100),rate=1-tax/100;
  const base=(p*rate-custo)*q-frete;
  const atual=(prom*rate-custo)*q-frete;
  const margem=prom>0?100*atual/(prom*q):null;
  const denom=1-tax/100-meta/100;
  const minimo=denom>0?(custo+frete/q)/denom:null;
  const status=atual<-.005?'Prejuízo':minimo===null?'Meta impossível':
   margem!==null&&margem+1e-8>=meta?'Meta atendida':'Abaixo da meta';
  if(atual<-.005){prejuizos++;alerts.push(x.sku+': contribuição negativa após desconto.');}
  contribuicao+=atual;variacao+=atual-base;
  return [x.sku,p,des,q,arred(prom),arred(base),arred(atual),
   margem===null?'Sem receita':arred(margem),arred(atual-base),
   minimo===null?'Meta inviável':arred(minimo),status];
 });
 return resultado('Descontos progressivos e margem por SKU',
 ['SKU','Preço normal','Desconto (%)','Quantidade','Preço com desconto','Contribuição base',
  'Contribuição promocional','Margem promocional (%)','Variação total','Preço mínimo para meta','Situação'],
 rows,[['SKUs',rows.length],['Contribuição promocional',arred(contribuicao)],
  ['Mudança versus preço normal',arred(variacao)],['SKUs com prejuízo',prejuizos]],
 ['Comparativo mantém a mesma quantidade antes/depois; não mede elasticidade nem indução de demanda.',
  'Frete total é dividido pelas unidades e taxas são aplicadas ao preço do produto. Não considera custos fixos.'],alerts);
}
function estoqueParado(d){
 const data=importar(d,['sku','estoque','dias_sem_venda','vendas_90_dias',
  'custo_unitario','preco','custo_carrego_pct_mes']);
 let capital=0,custoMensal=0,parados=0;const alerts=[];
 const rows=data.map(x=>{
  const stock=numero(x.estoque,'estoque',{inteiro:true,max:1e8}),
   days=numero(x.dias_sem_venda,'dias sem venda',{inteiro:true,max:3650}),
   vendas=numero(x.vendas_90_dias,'vendas 90 dias',{inteiro:true,max:1e8}),
   custo=numero(x.custo_unitario,'custo'),preco=numero(x.preco,'preço'),
   carry=numero(x.custo_carrego_pct_mes,'carrego mensal',{max:100});
  const cap=stock*custo,carrego=cap*carry/100;
  const cobertura=vendas>0?stock/(vendas/90):null;
  const situacao=stock===0?'Sem estoque':days>=90||vendas===0?'Parado':
    days>=45?'Giro lento':'Giro recente';
  if(situacao==='Parado'){parados++;alerts.push(x.sku+': revisar cobertura e capital imobilizado.');}
  capital+=cap;custoMensal+=carrego;
  return [x.sku,stock,days,vendas,arred(cap),arred(carrego),
   cobertura===null?'Sem giro':arred(cobertura),arred(stock*preco),situacao];
 });
 rows.sort((a,b)=>b[4]-a[4]);
 return resultado('Estoque sem giro e capital imobilizado',
 ['SKU','Estoque','Dias sem venda','Vendas em 90 dias','Capital a custo',
  'Custo mensal carregamento','Cobertura projetada (dias)','Receita bruta potencial','Classe'],
 rows,[['SKUs',rows.length],['Capital estocado a custo',arred(capital)],
  ['Custo mensal informado',arred(custoMensal)],['SKUs parados',parados]],
 ['Dias sem venda e custo de carregamento são informados pelo usuário; não há consulta ao ERP.',
  'Cobertura usa média dos últimos 90 dias, não previsão causal. Receita potencial não representa lucro ou liquidação garantida.'],alerts);
}
function cicloCaixa(d){
 const data=importar(d,['unidade','cmv_anual','estoque_medio','receita_anual',
  'contas_receber','compras_anuais','contas_pagar','reduzir_dso_dias'],{chave:'unidade'});
 let capital=0,liberar=0;const alerts=[];
 const rows=data.map(x=>{
  const cmv=numero(x.cmv_anual,'CMV anual',{positivo:true}),
   est=numero(x.estoque_medio,'estoque médio'),receita=numero(x.receita_anual,'receita anual',{positivo:true}),
   receber=numero(x.contas_receber,'contas a receber'),
   compras=numero(x.compras_anuais,'compras anuais',{positivo:true}),
   pagar=numero(x.contas_pagar,'contas a pagar'),
   reducao=numero(x.reduzir_dso_dias,'redução de prazo',{max:365});
  const dio=365*est/cmv,dso=365*receber/receita,dpo=365*pagar/compras;
  if(dio>3650||dso>3650||dpo>3650)throw new ErroOperacaoAvancada(x.unidade+': prazos implausíveis; revise bases anuais.');
  const ciclo=dio+dso-dpo;
  const necessario=Math.max(0,ciclo)*cmv/365;
  const melhoria=Math.min(dso,reducao);
  const ganho=melhoria*receita/365;
  capital+=necessario;liberar+=ganho;
  if(ciclo>90)alerts.push(x.unidade+': ciclo de caixa acima de 90 dias; verificar componentes.');
  return [x.unidade,arred(dio),arred(dso),arred(dpo),arred(ciclo),
   arred(necessario),arred(melhoria),arred(ganho),ciclo>90?'Ciclo longo':'Acompanhar'];
 });
 return resultado('Ciclo de conversão de caixa e capital de giro',
 ['Unidade','DIO (dias)','DSO (dias)','DPO (dias)','CCC (dias)',
  'Necessidade estimada de giro','DSO reduzível (dias)','Recebíveis antecipados estimados','Situação'],
 rows,[['Unidades',rows.length],['Capital operacional estimado',arred(capital)],
 ['Recebíveis antecipáveis no cenário',arred(liberar)]],
 ['DIO=estoque médio/CMV anual×365; DSO=contas a receber/receita anual×365; DPO=contas a pagar/compras anuais×365.',
  'Capital de giro aproximado usa CMV diário vezes CCC positivo. Redução do DSO usa receita diária, não significa lucro.',
  'Análises por unidade são independentes e não contemplam sazonalidade, impostos ou fluxo de caixa diário.'],alerts);
}
function taxasPagamentos(d){
 const data=importar(d,['transacao','meio','valor_bruto','taxa_contratada_pct','taxa_cobrada_pct',
  'fixa_contratada','fixa_cobrada','antecipacao_contratada','antecipacao_cobrada'],{chave:'transacao'});
 let extras=0,cobranca=0,divergentes=0;const alerts=[];
 const rows=data.map(x=>{
  const meio=id(x.meio,'meio'),valor=numero(x.valor_bruto,'valor',{positivo:true}),
   contratada=numero(x.taxa_contratada_pct,'taxa contratada',{max:100}),
   cobrada=numero(x.taxa_cobrada_pct,'taxa cobrada',{max:100}),
   fixaC=numero(x.fixa_contratada,'tarifa fixa contratada'),
   fixaR=numero(x.fixa_cobrada,'tarifa fixa cobrada'),
   antC=numero(x.antecipacao_contratada,'antecipação contratada'),
   antR=numero(x.antecipacao_cobrada,'antecipação cobrada');
  const prevista=valor*contratada/100+fixaC+antC;
  const efetiva=valor*cobrada/100+fixaR+antR;
  if(efetiva>valor+1e-8)throw new ErroOperacaoAvancada(x.transacao+': taxas excedem valor bruto.');
  const delta=efetiva-prevista,liquida=valor-efetiva;
  if(Math.abs(delta)>0.009){divergentes++;if(delta>0)alerts.push(x.transacao+': cobrar esclarecimento sobre tarifa adicional.');}
  extras+=delta;cobranca+=efetiva;
  return [x.transacao,meio,arred(valor),arred(prevista),arred(efetiva),arred(delta),
   arred(liquida),Math.abs(delta)>.009?'Revisar':'Conferido'];
 });
 rows.sort((a,b)=>b[5]-a[5]);
 return resultado('Auditoria de taxas de cartões, Pix e antecipação',
 ['Transação','Meio','Valor bruto','Tarifa contratada','Tarifa cobrada','Diferença',
  'Líquido recebido estimado','Situação'],rows,
 [['Transações',rows.length],['Taxas efetivamente cobradas',arred(cobranca)],
 ['Divergência total',arred(extras)],['Registros divergentes',divergentes]],
 ['Tarifas e antecipações são valores informados, não tabelas consultadas no adquirente.',
  'A diferença pode decorrer de parcelamento, bandeira, chargeback ou contrato específico; não comprova cobrança indevida.'],alerts);
}
function freteFaixas(d){
 const data=importar(d,['faixa','pedidos','ticket_medio','cmv_pct','taxas_pct',
  'frete_pago','frete_cobrado','ads_por_pedido','meta_margem_pct'],{chave:'faixa'});
 let custoGratis=0,abaixo=0;const alerts=[];
 const rows=data.map(x=>{
  const q=numero(x.pedidos,'pedidos',{inteiro:true,positivo:true,max:1e7}),
   ticket=numero(x.ticket_medio,'ticket',{positivo:true}),cmv=numero(x.cmv_pct,'CMV',{max:100}),
   taxa=numero(x.taxas_pct,'taxas',{max:100}),
   frete=numero(x.frete_pago,'frete pago'),cobrado=numero(x.frete_cobrado,'frete cobrado'),
   ads=numero(x.ads_por_pedido,'ads'),meta=numero(x.meta_margem_pct,'meta',{max:100});
  const atual=ticket*(1-(cmv+taxa)/100)-frete+cobrado-ads;
  const gratis=atual-cobrado;
  const margem=100*gratis/ticket;
  const freteMax=ticket*(1-(cmv+taxa+meta)/100)-ads;
  const status=gratis<0?'Margem negativa':margem+1e-8<meta?'Abaixo da meta':'Meta atendida';
  if(status!=='Meta atendida'){abaixo++;alerts.push(x.faixa+': frete grátis descumpre margem ou causa perda.');}
  custoGratis+=cobrado*q;
  return [x.faixa,q,ticket,arred(atual),arred(gratis),arred(margem),
   arred(custoGratis===0?cobrado*q:cobrado*q),arred(freteMax),arred(frete-freteMax),status];
 });
 return resultado('Frete grátis por faixa de ticket',
 ['Faixa','Pedidos','Ticket médio','Contribuição atual por pedido',
 'Contribuição com frete grátis','Margem com frete grátis (%)',
 'Receita de frete renunciada','Frete máximo para meta','Excesso de frete sobre limite','Situação'],rows,
 [['Faixas',rows.length],['Receita de frete potencialmente renunciada',arred(custoGratis)],
 ['Faixas fora da meta',abaixo]],
 ['Cada faixa representa pedidos independentes; não mude o número de pedidos ao simular benefícios de frete.',
  'CMV/taxas são percentuais do ticket; frete é custo informado por pedido, e receita de frete cobrada desaparece no cenário.',
  'Um frete máximo negativo significa que nem custo de envio zero alcança a meta informada.'],alerts);
}
function estoqueSeguranca(d){
 const data=importar(d,['sku','media_dia','desvio_dia','prazo_dias',
  'estoque','recebimentos','fator_z','custo_unitario']);
 let investimento=0,repor=0;const alerts=[];
 const rows=data.map(x=>{
  const media=numero(x.media_dia,'média diária',{max:1e7}),
   desvio=numero(x.desvio_dia,'desvio',{max:1e7}),
   prazo=numero(x.prazo_dias,'prazo',{positivo:true,max:365}),
   estoque=numero(x.estoque,'estoque',{inteiro:true,max:1e8}),
   receb=numero(x.recebimentos,'recebimentos',{inteiro:true,max:1e8}),
   z=numero(x.fator_z,'fator Z',{max:4}),
   custo=numero(x.custo_unitario,'custo');
  const seguranca=Math.ceil(z*desvio*Math.sqrt(prazo)-1e-9);
  const ponto=Math.ceil(media*prazo+seguranca-1e-9);
  const posicao=estoque+receb;
  const pedido=Math.max(0,ponto-posicao);
  investimento+=pedido*custo;
  if(pedido){repor++;alerts.push(x.sku+': posição abaixo do ponto de reposição.');}
  return [x.sku,media,desvio,prazo,z,seguranca,ponto,posicao,pedido,
   arred(pedido*custo),pedido?'Repor':'Cobertura suficiente'];
 });
 rows.sort((a,b)=>b[9]-a[9]);
 return resultado('Estoque de segurança com variabilidade de demanda',
 ['SKU','Demanda média/dia','Desvio diário','Prazo (dias)','Fator Z',
 'Estoque de segurança','Ponto de reposição','Posição atual','Pedido sugerido',
 'Custo estimado','Situação'],rows,
 [['SKUs',rows.length],['Necessitam compra',repor],['Investimento estimado',arred(investimento)]],
 ['Modelo z × desvio diário × raiz(prazo): supõe demanda independente e prazo de entrega fixo.',
  'O fator Z é fornecido manualmente (por exemplo, 1,65 para serviço unilateral nominal próximo de 95% sob normalidade).',
  'Não garante disponibilidade real, não considera lotes mínimos, variação do lead time nem orçamento.'],alerts);
}
function cancelamentos(d){
 const data=importar(d,['motivo','cancelados','recuperados',
  'ticket_medio','tarifas_perdidas_total','frete_perdido_total','ads_perdidos_total'],{chave:'motivo'});
 let receitaExposta=0,custoPerdido=0,total=0,resgatados=0;const alerts=[];
 const rows=data.map(x=>{
  const canc=numero(x.cancelados,'cancelados',{inteiro:true,positivo:true,max:1e8}),
   rec=numero(x.recuperados,'recuperados',{inteiro:true,max:1e8}),
   ticket=numero(x.ticket_medio,'ticket médio'),
   tarifa=numero(x.tarifas_perdidas_total,'tarifas'),
   frete=numero(x.frete_perdido_total,'frete'),
   ads=numero(x.ads_perdidos_total,'Ads');
  if(rec>canc)throw new ErroOperacaoAvancada(x.motivo+': recuperados excedem cancelamentos.');
  const perdidos=canc-rec,exposto=perdidos*ticket,custos=tarifa+frete+ads;
  receitaExposta+=exposto;custoPerdido+=custos;total+=canc;resgatados+=rec;
  if(custos>0&&perdidos>0)alerts.push(x.motivo+': verificar perdas não recuperáveis e prevenção.');
  return [x.motivo,canc,rec,perdidos,arred(100*rec/canc),arred(exposto),
    arred(tarifa),arred(frete),arred(ads),arred(custos)];
 });
 rows.sort((a,b)=>b[5]-a[5]);
 return resultado('Auditoria de cancelamentos e custos não recuperados',
 ['Motivo','Cancelamentos','Recuperados','Não recuperados','Taxa recuperação (%)',
  'Vendas brutas expostas','Tarifas perdidas','Frete perdido','Ads perdidos','Custos irrecuperáveis'],rows,
 [['Motivos',rows.length],['Cancelamentos',total],['Recuperados',resgatados],
  ['Vendas brutas expostas',arred(receitaExposta)],['Custos irrecuperáveis',arred(custoPerdido)]],
 ['Vendas não recuperadas são receita bruta potencial, não lucro nem perda financeira certa.',
  'Custos perdidos devem ser irreversíveis e informados como TOTAL do motivo, não por pedido.',
  'Não coleta nomes de consumidores, pedidos reais nem dados pessoais.'],alerts);
}
function armazenagem(d){
 const data=importar(d,['zona','posicoes','largura_m','profundidade_m','altura_util_m',
  'ocupado_m3','entrada_prevista_m3','reserva_pct'],{chave:'zona'});
 let cap=0,previsto=0,alertasZona=0;const alerts=[];
 const rows=data.map(x=>{
  const pos=numero(x.posicoes,'posições',{inteiro:true,positivo:true,max:1e7}),
   largura=numero(x.largura_m,'largura',{positivo:true,max:100}),
   profund=numero(x.profundidade_m,'profundidade',{positivo:true,max:100}),
   altura=numero(x.altura_util_m,'altura',{positivo:true,max:100}),
   ocupado=numero(x.ocupado_m3,'ocupação',{max:1e10}),
   entrada=numero(x.entrada_prevista_m3,'entrada',{max:1e10}),
   reserva=numero(x.reserva_pct,'reserva',{max:99});
  const total=pos*largura*profund*altura;
  const utilizavel=total*(1-reserva/100);
  const futuro=ocupado+entrada;
  const ocup=100*futuro/utilizavel;
  const excesso=Math.max(0,futuro-utilizavel);
  if(excesso>0){alertasZona++;alerts.push(x.zona+': volume previsto ultrapassa capacidade útil.');}
  cap+=utilizavel;previsto+=futuro;
  return [x.zona,pos,arred(total),arred(utilizavel),arred(ocupado),arred(entrada),
    arred(futuro),arred(ocup),arred(excesso),excesso>0?'Superlotação':'Dentro do limite'];
 });
 rows.sort((a,b)=>b[8]-a[8]);
 return resultado('Ocupação de armazenagem por zona',
 ['Zona','Posições','Capacidade bruta (m³)','Capacidade útil (m³)',
  'Volume atual','Entrada prevista','Volume futuro','Ocupação útil (%)','Excesso (m³)','Situação'],
 rows,[['Zonas',rows.length],['Capacidade útil total (m³)',arred(cap)],
 ['Volume previsto (m³)',arred(previsto)],['Zonas superlotadas',alertasZona]],
 ['Volume geométrico e reserva são informados; não modela empilhamento, corredores, pallets ou restrições de segurança.',
  'Verifique dimensões internas, limites de carga e normas de segurança aplicáveis antes de alterar a armazenagem.'],alerts);
}
function comprasOrcamento(d){
 const data=importar(d,['sku','demanda_prazo','estoque','recebimentos',
  'custo_unitario','prioridade','lote_minimo']);
 const orcamento=numero(d.orcamento,'orçamento',{positivo:true,max:1e11});
 let restante=orcamento,comprados=0,pendentes=0,invest=0;const alerts=[];
 const itens=data.map(x=>{
  const demanda=numero(x.demanda_prazo,'demanda',{inteiro:true,max:1e8}),
   est=numero(x.estoque,'estoque',{inteiro:true,max:1e8}),
   receb=numero(x.recebimentos,'recebimentos',{inteiro:true,max:1e8}),
   custo=numero(x.custo_unitario,'custo',{positivo:true,max:1e9}),
   prio=numero(x.prioridade,'prioridade',{inteiro:true,max:5,positivo:true}),
   lote=numero(x.lote_minimo,'lote mínimo',{inteiro:true,max:1e8,positivo:true});
  const falta=Math.max(0,demanda-est-receb);
  const necessaria=falta?Math.ceil(falta/lote)*lote:0;
  return {sku:x.sku,demanda,est,receb,custo,prio,lote,necessaria};
 }).sort((a,b)=>b.prio-a.prio||a.custo-b.custo||a.sku.localeCompare(b.sku));
 const rows=itens.map(x=>{
  const permitidas=Math.floor((restante+1e-8)/(x.custo*x.lote));
  const adquirir=Math.min(x.necessaria,permitidas*x.lote);
  const gasto=arred(adquirir*x.custo);
  // Verificação no orçamento sem arredondar antes do cálculo de viabilidade.
  if(gasto>restante+0.005)throw new ErroOperacaoAvancada('Orçamento insuficiente para lote calculado.');
  restante-=adquirir*x.custo;
  comprados+=adquirir;invest+=adquirir*x.custo;
  const pendente=Math.max(0,x.necessaria-adquirir);pendentes+=pendente;
  if(pendente)alerts.push(x.sku+': lote de reposição não coberto pelo orçamento.');
  return [x.sku,x.prio,x.demanda,x.est,x.receb,x.lote,x.necessaria,
   adquirir,pendente,arred(gasto),arred(Math.max(0,restante)),
   pendente?'Compra parcial/pendente':'Coberto'];
 });
 return resultado('Compras e lotes priorizados pelo orçamento',
 ['SKU','Prioridade (1–5)','Demanda no prazo','Estoque','Recebimentos',
 'Lote mínimo','Necessidade em lotes','Quantidade aprovada','Pendente',
 'Investimento por SKU','Saldo após SKU','Situação'],rows,
 [['SKUs',rows.length],['Orçamento informado',arred(orcamento)],
  ['Compra estimada',arred(invest)],['Unidades aprovadas',comprados],
  ['Unidades pendentes',pendentes],['Saldo estimado',arred(Math.max(0,restante))]],
 ['Alocação heurística por prioridade e custo unitário, NÃO otimização global por programação inteira.',
  'Quantidade aprovada respeita múltiplos de lote mínimo; não divide orçamento entre SKUs iguais por justiça.',
  'Custos são unitários, sem impostos, descontos, prazos e frete; confirme orçamento e fornecedores.'],alerts);
}
function assinaturas(d){
 const data=importar(d,['plano','assinantes_inicio','novos_mes','churn_pct',
  'preco_mes','custo_mes','taxa_pct','cac_novo','meses'],{chave:'plano'});
 let receitaTotal=0,contribTotal=0;const alerts=[];
 const rows=data.map(x=>{
  const inicio=numero(x.assinantes_inicio,'assinantes',{inteiro:true,max:1e8}),
   novos=numero(x.novos_mes,'novos',{inteiro:true,max:1e8}),
   churn=numero(x.churn_pct,'churn',{max:100}),
   preco=numero(x.preco_mes,'preço mensal'),
   custo=numero(x.custo_mes,'custo mensal'),
   taxa=numero(x.taxa_pct,'taxa',{max:100}),
   cac=numero(x.cac_novo,'CAC'),
   meses=numero(x.meses,'meses',{inteiro:true,positivo:true,max:36});
  let ativos=inicio,receita=0,contrib=0;
  const variavel=preco*(1-taxa/100)-custo;
  for(let m=0;m<meses;m++){
   ativos=ativos*(1-churn/100)+novos;
   receita+=ativos*preco;
   contrib+=ativos*variavel-novos*cac;
  }
  const final=arred(ativos);
  if(contrib<0)alerts.push(x.plano+': contribuição projetada negativa nas premissas informadas.');
  receitaTotal+=receita;contribTotal+=contrib;
  const payback=variavel>0?cac/variavel:null;
  return [x.plano,inicio,novos,churn,meses,final,arred(receita),arred(contrib),
   arred(variavel),payback===null?'Sem payback':arred(payback),
   contrib<0?'Contribuição negativa':'Cenário positivo'];
 });
 return resultado('Receita recorrente, churn e contribuição de assinaturas',
 ['Plano','Assinantes iniciais','Novos por mês','Churn mensal (%)','Meses',
  'Assinantes esperados no fim','Receita acumulada','Contribuição acumulada',
  'Contribuição mensal por assinante','Payback CAC aproximado (meses)','Situação'],rows,
 [['Planos',rows.length],['Receita projetada',arred(receitaTotal)],
  ['Contribuição projetada',arred(contribTotal)]],
 ['Assinantes esperados podem ser fracionários: é previsão matemática, não cadastro real.',
  'Aplicação de churn antes da aquisição de novos clientes a cada mês; CAC cobrado por novo assinante no mesmo mês.',
  'Sem reajustes, inadimplência, coortes distintas, impostos adicionais nem custo fixo. Não prevê faturamento real.'],alerts);
}
const MODULOS=Object.freeze({
 'descontos-progressivos-lote':desconto,
 'estoque-parado-capital':estoqueParado,
 'ciclo-financeiro-capital-giro':cicloCaixa,
 'auditoria-taxas-pagamentos':taxasPagamentos,
 'politica-frete-faixas':freteFaixas,
 'estoque-seguranca-estatistico':estoqueSeguranca,
 'custo-cancelamentos-pedidos':cancelamentos,
 'ocupacao-armazenagem':armazenagem,
 'compras-priorizadas-orcamento':comprasOrcamento,
 'projecao-assinaturas-recorrentes':assinaturas
});
export function executarOperacaoAvancada(tipo,dados){
 if(!Object.hasOwn(MODULOS,tipo))throw new ErroOperacaoAvancada('Ferramenta Premium desconhecida.');
 if(!dados||typeof dados!=='object'||Array.isArray(dados))
  throw new ErroOperacaoAvancada('Dados inválidos.');
 return MODULOS[tipo](dados);
}