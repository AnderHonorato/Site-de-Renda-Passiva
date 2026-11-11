/** F232–F236 — cinco motores Premium de operações e rentabilidade.
 * Somente no servidor: CSV não é salvo, não há integração ou envio a terceiros.
 */
import { lerDadosTexto } from '../scripts/cálculos/importar-planilha.js';

export class ErroPlanejamento extends Error {
  constructor(mensagem) { super(mensagem); this.name='ErroPlanejamento'; }
}
export const TIPOS_PLANEJAMENTO=Object.freeze([
  'risco-ruptura-produtos','simulador-frete-gratis','impacto-reajuste-fornecedores',
  'capacidade-expedicao-turnos','margem-pedidos-estornos'
]);
const arr=n=>Math.round((n+Number.EPSILON)*100)/100;
function valor(x,campo,max=1e10,{inteiro=false,positivo=false}={}){
  let s=String(x??'').trim();
  if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(s))s=s.replaceAll('.','').replace(',','.');
  else if(/^\d+(?:,\d{1,4})?$/.test(s))s=s.replace(',','.');
  if(!/^\d+(?:\.\d{1,4})?$/.test(s))throw new ErroPlanejamento(campo+': informe número não negativo.');
  const n=Number(s);
  if(!Number.isFinite(n)||n>max||(inteiro&&!Number.isSafeInteger(n))||(positivo&&n===0))
    throw new ErroPlanejamento(campo+': fora do limite.');
  return n;
}
function chave(v,rotulo){
  const s=String(v??'').trim();
  if(!s||s.length>64||/[\x00-\x1f]/.test(s)||/@/.test(s))
    throw new ErroPlanejamento(rotulo+': identificador inválido ou pessoal.');
  return s;
}
function csv(d,cols,{id='sku'}={}){
  const texto=d?.csv;
  if(typeof texto!=='string'||!texto.trim()||Buffer.byteLength(texto)>270000)
    throw new ErroPlanejamento('Cole CSV/TSV com até 270 KB.');
  let linhas;
  try{linhas=lerDadosTexto(texto).linhas;}catch(e){throw new ErroPlanejamento('CSV inválido: '+e.message);}
  if(linhas.length<2||linhas.length>501)throw new ErroPlanejamento('Informe de 1 a 500 registros.');
  const cab=linhas[0].map(x=>x.trim().toLowerCase());
  if(new Set(cab).size!==cab.length)throw new ErroPlanejamento('Cabeçalho com campos duplicados.');
  const faltantes=cols.filter(x=>!cab.includes(x));
  if(faltantes.length)throw new ErroPlanejamento('Colunas obrigatórias ausentes: '+faltantes.join(', '));
  const idx=Object.fromEntries(cols.map(x=>[x,cab.indexOf(x)]));
  const vistos=new Set();
  return linhas.slice(1).map((row,i)=>{
    if(row.length!==cab.length)throw new ErroPlanejamento('Linha '+(i+2)+': quantidade de colunas diferente do cabeçalho.');
    const obj=Object.fromEntries(cols.map(x=>[x,String(row[idx[x]]??'').trim()]));
    if(Object.values(obj).some(x=>x.length>250))throw new ErroPlanejamento('Linha '+(i+2)+': campo muito grande.');
    const key=chave(obj[id],id);
    if(vistos.has(key))throw new ErroPlanejamento('Identificador repetido: '+key);
    vistos.add(key);
    return obj;
  });
}
function pacote(titulo,cab,rows,indicadores,avisos,alertas=[]){
  if(!rows.length||rows.some(r=>r.length!==cab.length))throw new ErroPlanejamento('Relatório inconsistente.');
  return {titulo,total:rows.length,planilha:[cab,...rows],indicadores,
    avisos,alertas:alertas.slice(0,100)};
}
function ruptura(d){
  const linhas=csv(d,['sku','vendas_dia','estoque','recebimentos_confirmados','prazo_dias','seguranca_unidades','preco','custo']);
  let afetados=0,faltaTotal=0,receitaRisco=0,investimento=0;const alertas=[];
  const tab=linhas.map(x=>{
    const demand=valor(x.vendas_dia,'vendas/dia',1e6),stock=valor(x.estoque,'estoque',1e7,{inteiro:true}),
      receb=valor(x.recebimentos_confirmados,'recebimentos',1e7,{inteiro:true}),lead=valor(x.prazo_dias,'prazo dias',365),
      buffer=valor(x.seguranca_unidades,'segurança',1e7,{inteiro:true}),
      preco=valor(x.preco,'preço',1e9),custo=valor(x.custo,'custo',1e9);
    const disponivel=stock+receb;
    const cobertura=demand>0?disponivel/demand:null;
    const falta=Math.ceil(Math.max(0,lead*demand-disponivel-1e-9));
    const repor=Math.ceil(Math.max(0,lead*demand+buffer-disponivel-1e-9));
    const risco=falta*preco,invest=repor*custo;
    const classe= falta?'Ruptura provável':repor?'Abaixo da segurança':demand===0?'Sem demanda histórica':'Cobertura suficiente';
    if(falta){afetados++;faltaTotal+=falta;receitaRisco+=risco;alertas.push(x.sku+': faltam cerca de '+falta+' unidades durante o prazo informado.');}
    investimento+=invest;
    return [x.sku,demand,stock,receb,lead,buffer,cobertura===null?'sem demanda':arr(cobertura),falta,repor,arr(risco),arr(invest),classe];
  }).sort((a,b)=>b[9]-a[9]);
  return pacote('Ruptura de estoque e receita em risco',['SKU','Vendas/dia','Estoque','Recebimentos confirmados',
    'Prazo (dias)','Segurança (un)','Cobertura (dias)','Falta projetada','Reposição sugerida',
    'Receita bruta exposta','Custo estimado reposição','Situação'],tab,
   [['SKUs',tab.length],['Com provável ruptura',afetados],['Unidades em risco',faltaTotal],
    ['Receita bruta em risco',arr(receitaRisco)],['Compra estimada',arr(investimento)]],
   ['Recebimentos informados são tratados como disponíveis até o prazo; atraso de entrega muda as projeções.',
    'Demanda é média manual, sem previsão de sazonalidade; valor em risco não equivale a lucro nem venda garantida.',
    'Reposição sugerida cobre prazo e segurança, não lote mínimo ou capacidade financeira.'],alertas);
}
function freteGratis(d){
  const linhas=csv(d,['sku','preco','cmv','comissao_pct','imposto_pct','frete_cobrado','frete_pago','ads','unidades','meta_margem_pct']);
  let perda=0,semMargem=0,saldo=0;const alertas=[];
  const tab=linhas.map(x=>{
    const p=valor(x.preco,'preço',1e9,{positivo:true}),cmv=valor(x.cmv,'CMV'),
      com=valor(x.comissao_pct,'comissão',100),tax=valor(x.imposto_pct,'imposto',100),
      recebido=valor(x.frete_cobrado,'frete cobrado'),pago=valor(x.frete_pago,'frete pago'),
      ads=valor(x.ads,'Ads'),q=valor(x.unidades,'unidades',1e7,{inteiro:true,positivo:true}),
      meta=valor(x.meta_margem_pct,'meta de margem',100);
    const rate=(com+tax)/100;const atual=p*(1-rate)-cmv-pago+recebido-ads;
    const gratis=atual-recebido;const delta=-recebido*q;
    const denominador=1-rate-meta/100;
    const precoMin=denominador>0?(cmv+pago+ads)/denominador:null;
    const status=gratis<0?'Prejuízo com frete grátis':gratis/p*100<meta?'Abaixo da margem-alvo':'Meta atendida';
    if(gratis<0){semMargem++;alertas.push(x.sku+': simulação de frete grátis deixa contribuição negativa.');}
    perda-=delta;saldo+=gratis*q;
    return [x.sku,p,q,arr(atual),arr(gratis),arr(gratis/p*100),arr(delta),
      precoMin===null?'Meta inviável':arr(precoMin),status];
  }).sort((a,b)=>a[6]-b[6]);
  return pacote('Impacto da política de frete grátis',['SKU','Preço produto','Volume','Contribuição atual/un',
    'Contribuição frete grátis/un','Margem frete grátis (%)','Diferença total','Preço mínimo para meta','Situação'],tab,
   [['SKUs',tab.length],['Contribuição simulada total',arr(saldo)],['Perda de contribuição',arr(perda)],['SKUs negativos',semMargem]],
   ['Cenário supõe mesmo volume vendido, preço e custo do frete antes/depois; não modela elasticidade nem novos pedidos.',
    'Frete cobrado é receita adicional na situação atual, removida no cenário de frete grátis.',
    'Preço mínimo para meta é relativo ao preço do produto, sem receitas de frete, despesas fixas nem impostos extras.'],alertas);
}
function fornecedores(d){
  const linhas=csv(d,['sku','custo_anterior','custo_novo','preco','comissao_pct','imposto_pct','unidades','meta_margem_pct']);
  let perdas=0,abaixo=0,variacao=0;const alertas=[];
  const tab=linhas.map(x=>{
    const antigo=valor(x.custo_anterior,'custo anterior',1e9),
      novo=valor(x.custo_novo,'custo novo',1e9),
      p=valor(x.preco,'preço',1e9,{positivo:true}),
      com=valor(x.comissao_pct,'comissão',100),
      imp=valor(x.imposto_pct,'imposto',100),
      q=valor(x.unidades,'unidades',1e7,{inteiro:true,positivo:true}),
      meta=valor(x.meta_margem_pct,'meta',100);
    const rate=(com+imp)/100;
    const contribAnt=p*(1-rate)-antigo,contribNova=p*(1-rate)-novo;
    const diferenca=(contribNova-contribAnt)*q;
    const denominador=1-rate-meta/100;
    const precoMeta=denominador>0?novo/denominador:null;
    const margem=contribNova/p*100;
    const status=contribNova<0?'Prejuízo':margem<meta?'Abaixo da meta':'Meta atendida';
    if(status!=='Meta atendida'){abaixo++;alertas.push(x.sku+': verificar preço/margem após reajuste.');}
    variacao+=diferenca;if(diferenca<0)perdas-=diferenca;
    return [x.sku,antigo,novo,p,q,arr((novo-antigo)/Math.max(.0001,antigo)*100),
      arr(contribAnt),arr(contribNova),arr(margem),arr(diferenca),
      precoMeta===null?'Meta inviável':arr(precoMeta),status];
  }).sort((a,b)=>a[9]-b[9]);
  return pacote('Impacto de reajustes de fornecedores',['SKU','Custo anterior','Custo novo','Preço atual',
    'Unidades','Reajuste custo (%)','Contribuição anterior/un','Contribuição nova/un',
    'Margem nova (%)','Impacto total','Preço para margem-alvo','Situação'],tab,
   [['SKUs',tab.length],['Impacto total na contribuição',arr(variacao)],
    ['Perdas de contribuição',arr(perdas)],['SKUs fora da meta',abaixo]],
   ['Volumes informados permanecem constantes; não prevê demanda, elasticidade ou reação da concorrência.',
    'Não inclui frete de compra, custos fixos ou descontos adicionais. Marge-alvo é percentual do preço de venda.'],alertas);
}
function expedicao(d){
  const linhas=csv(d,['turno','operadores','horas_liquidas','produtividade_pedidos_hora',
    'taxa_retrabalho_pct','demanda_pedidos','pendentes_anteriores'],{id:'turno'});
  let pendentes=0,necessidade=0,capacidade=0;const alertas=[];
  const tab=linhas.map(x=>{
    const ops=valor(x.operadores,'operadores',1e5,{inteiro:true,positivo:true}),
      horas=valor(x.horas_liquidas,'horas líquidas',24,{positivo:true}),
      produtividade=valor(x.produtividade_pedidos_hora,'produtividade',1e5,{positivo:true}),
      retrabalho=valor(x.taxa_retrabalho_pct,'retrabalho',100),
      demanda=valor(x.demanda_pedidos,'demanda',1e9,{inteiro:true}),
      anterior=valor(x.pendentes_anteriores,'pendentes',1e9,{inteiro:true});
    const total=demanda+anterior;
    const cap=Math.floor(ops*horas*produtividade*(1-retrabalho/100));
    const processed=Math.min(cap,total),backlog=total-processed;
    const util=cap?total/cap*100:0;
    const faltaHoras=produtividade*(1-retrabalho/100)>0?
      Math.max(0,total-cap)/(produtividade*(1-retrabalho/100)):null;
    if(backlog){alertas.push(x.turno+': '+backlog+' pedidos acima da capacidade líquida.');}
    pendentes+=backlog;necessidade+=total;capacidade+=cap;
    return [x.turno,ops,horas,produtividade,retrabalho,demanda,anterior,total,cap,processed,
      backlog,arr(util),faltaHoras===null?'Sem capacidade':arr(faltaHoras),backlog?'Insuficiente':'Suficiente'];
  }).sort((a,b)=>b[10]-a[10]);
  return pacote('Dimensionamento de capacidade de expedição',['Turno','Operadores','Horas líquidas',
    'Pedidos/h por operador','Retrabalho (%)','Novos pedidos','Pendentes iniciais',
    'Carga total','Capacidade líquida','Pedidos processáveis','Pendências finais',
    'Utilização (%)','Horas adicionais operador','Situação'],tab,
   [['Turnos',tab.length],['Carga total',necessidade],['Capacidade líquida',capacidade],
    ['Pendências após os turnos (soma independente)',pendentes]],
   ['Cada turno é avaliado independentemente: pendentes anteriores devem ser informados sem duplicar turnos.',
    'Produtividade e retrabalho são estimados, sem pausa imprevista, máquina ou gargalos de empacotamento.',
    'Horas adicionais são horas-OPERADOR, não horas corridas nem recomendação automática de contratação.'],alertas);
}
function estornos(d){
  const linhas=csv(d,['pedido','canal','receita_bruta','desconto','cmv','comissao',
    'impostos','frete_pago','frete_recebido','ads','estorno','unidades'],{id:'pedido'});
  let bruto=0,contribuicao=0,estornado=0,negativos=0;const alertas=[];
  const tab=linhas.map(x=>{
    const pedido=chave(x.pedido,'pedido'),canal=chave(x.canal,'canal');
    const v={};
    for(const campo of ['receita_bruta','desconto','cmv','comissao','impostos','frete_pago','frete_recebido','ads','estorno'])
      v[campo]=valor(x[campo],campo,1e10);
    const q=valor(x.unidades,'unidades',1e7,{inteiro:true,positivo:true});
    if(v.desconto+v.estorno>v.receita_bruta+v.frete_recebido)
      throw new ErroPlanejamento(pedido+': desconto e estorno excedem o valor cobrado.');
    const liquida=v.receita_bruta-v.desconto-v.estorno;
    const contrib=liquida-v.cmv-v.comissao-v.impostos-v.frete_pago+v.frete_recebido-v.ads;
    const base=v.receita_bruta-v.desconto+v.frete_recebido;
    const margem=base>0?contrib/base*100:0;
    const status=contrib<0?'Contribuição negativa':v.estorno>0?'Com estorno':'Contribuição positiva';
    if(contrib<0){negativos++;alertas.push(pedido+': contribuição negativa de '+arr(contrib)+'.');}
    bruto+=v.receita_bruta;contribuicao+=contrib;estornado+=v.estorno;
    return [pedido,canal,q,arr(v.receita_bruta),arr(v.desconto),arr(v.estorno),arr(liquida),
      arr(v.cmv),arr(v.comissao+v.impostos),arr(v.frete_pago-v.frete_recebido),arr(v.ads),
      arr(contrib),arr(margem),status];
  }).sort((a,b)=>a[11]-b[11]);
  return pacote('Margem de pedidos, frete e estornos',['Pedido','Canal','Unidades','Receita bruta',
    'Desconto','Estorno','Receita líquida produto','CMV','Comissão + impostos',
    'Subsídio frete','Ads','Contribuição','Margem (%)','Situação'],tab,
   [['Pedidos',tab.length],['Receita bruta',arr(bruto)],
    ['Estornos',arr(estornado)],['Contribuição total',arr(contribuicao)],
    ['Pedidos com contribuição negativa',negativos]],
   ['O custo da mercadoria não é estornado automaticamente: considere recuperação do estoque e créditos em análise separada.',
    'O estorno é deduzido apenas da receita; comissões e impostos fornecidos são custos já efetivos.',
    'Identificadores são pseudônimos; não inclua CPF, e-mail, nomes pessoais nem transações identificáveis.'],alertas);
}
const MOTORES=Object.freeze({
  'risco-ruptura-produtos':ruptura,
  'simulador-frete-gratis':freteGratis,
  'impacto-reajuste-fornecedores':fornecedores,
  'capacidade-expedicao-turnos':expedicao,
  'margem-pedidos-estornos':estornos
});
export function executarPlanejamento(tipo,entrada){
  if(!Object.hasOwn(MOTORES,tipo))throw new ErroPlanejamento('Recurso Premium não encontrado.');
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))throw new ErroPlanejamento('Dados inválidos.');
  return MOTORES[tipo](entrada);
}
