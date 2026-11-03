/** F227–F231: diagnóstico profissional em lote, privado na API Node.
 * Sem consultas externas, movimentações financeiras ou dados pessoais obrigatórios.
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroAnalitica extends Error{constructor(m){super(m);this.name='ErroAnalitica';}}
export const TIPOS_ANALITICA=Object.freeze([
 'auditoria-faturas-frete','afinidade-cestas-pedidos','inadimplencia-recebiveis',
 'experimentos-ab-lote','diagnostico-checkout-segmentos'
]);
const arred=x=>Math.round((x+Number.EPSILON)*100)/100;
function num(v,nome,max=1e10,positivo=false){
 let x=String(v??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(x))x=x.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:,\d{1,4})?$/.test(x))x=x.replace(',','.');
 if(!/^\d+(?:\.\d{1,4})?$/.test(x))throw new ErroAnalitica(nome+': número inválido.');
 const n=Number(x);
 if(!Number.isFinite(n)||n<0||n>max||(positivo&&n===0))throw new ErroAnalitica(nome+': fora do limite.');
 return n;
}
function inteiro(v,nome,max=1e8,positivo=false){
 const n=num(v,nome,max,positivo);
 if(!Number.isSafeInteger(n))throw new ErroAnalitica(nome+': informe inteiro.');
 return n;
}
function nome(s,campo){
 const x=String(s??'').trim();
 if(!x||x.length>80||[...x].some(c=>c.charCodeAt(0)<32))throw new ErroAnalitica(campo+': identificador inválido.');
 return x;
}
function dataISO(s){
 const x=String(s??'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new ErroAnalitica('Data deve ser AAAA-MM-DD.');
 const t=Date.parse(x+'T00:00:00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==x)
  throw new ErroAnalitica('Data inválida: '+x);
 return t;
}
const dias=(a,b)=>Math.round((b-a)/86400000);
function tabela(entrada,campo,cols){
 const csv=entrada?.[campo];
 if(typeof csv!=='string'||!csv.trim()||Buffer.byteLength(csv)>270000)
  throw new ErroAnalitica(campo+': informe CSV/TSV de até 270 KB.');
 let dados;
 try{dados=lerDadosTexto(csv).linhas;}catch(e){throw new ErroAnalitica('Falha no CSV '+campo+': '+e.message);}
 if(dados.length<2||dados.length>501)throw new ErroAnalitica(campo+': até 500 linhas, além do cabeçalho.');
 const header=dados[0].map(x=>x.trim().toLowerCase());
 if(new Set(header).size!==header.length)throw new ErroAnalitica(campo+': cabeçalhos duplicados.');
 const faltam=cols.filter(c=>!header.includes(c));
 if(faltam.length)throw new ErroAnalitica(campo+': colunas ausentes '+faltam.join(', '));
 const idx=Object.fromEntries(cols.map(c=>[c,header.indexOf(c)]));
 return dados.slice(1).map(l=>{
  const obj=Object.fromEntries(cols.map(c=>[c,String(l[idx[c]]??'').trim()]));
  if(Object.values(obj).some(x=>x.length>400))throw new ErroAnalitica('Campo muito extenso em '+campo);
  return obj;
 });
}
function resposta(titulo,headers,linhas,indicadores,observacoes,alertas=[]){
 if(!linhas.length)throw new ErroAnalitica('Sem registros para o diagnóstico.');
 return {titulo,total:linhas.length,planilha:[headers,...linhas],indicadores,observacoes,alertas:alertas.slice(0,150)};
}
function fretes(d){
 const rows=tabela(d,'csv',['etiqueta','pedido','transportadora','comprimento_cm','largura_cm','altura_cm',
 'peso_real_kg','divisor_cubagem','peso_faturado_kg','frete_base','adicionais_autorizados','frete_faturado','frete_repassado']);
 const linhas=[],ids=new Set(),alertas=[];let faturado=0,previsto=0,divergencias=0,subsidio=0;
 for(const x of rows){
  const etiqueta=nome(x.etiqueta,'etiqueta'),pedido=nome(x.pedido,'pedido'),transp=nome(x.transportadora,'transportadora');
  if(ids.has(etiqueta))throw new ErroAnalitica('Etiqueta repetida: '+etiqueta);ids.add(etiqueta);
  const comprimento=num(x.comprimento_cm,'comprimento',1000,true),largura=num(x.largura_cm,'largura',1000,true),
   altura=num(x.altura_cm,'altura',1000,true),real=num(x.peso_real_kg,'peso real',1e5,true),
   divisor=num(x.divisor_cubagem,'fator de cubagem',1e7,true),faturadoKg=num(x.peso_faturado_kg,'peso faturado',1e5,true);
  const base=num(x.frete_base,'frete base'),extras=num(x.adicionais_autorizados,'adicionais'),
   cobrado=num(x.frete_faturado,'frete faturado'),repassado=num(x.frete_repassado,'frete repassado');
  const cubado=comprimento*largura*altura/divisor,referencia=Math.max(real,cubado),esperado=base+extras,diferenca=cobrado-esperado;
  const gapPeso=arred(faturadoKg-referencia),pesoAnormal=Math.abs(gapPeso)>Math.max(.1,referencia*.05);
  const status=diferenca>.01?'Acima do acordado':diferenca<-.01?'Abaixo do acordado':
   pesoAnormal?'Revisar peso':'Conferido';
  if(status!=='Conferido')divergencias++;
  if(diferenca>.01)alertas.push(etiqueta+': '+arred(diferenca)+' acima de base e adicionais informados.');
  if(pesoAnormal)alertas.push(etiqueta+': peso faturado difere do referencial calculado; confirmar contrato.');
  faturado+=cobrado;previsto+=esperado;subsidio+=cobrado-repassado;
  linhas.push([etiqueta,pedido,transp,arred(real),arred(cubado),arred(referencia),
   arred(faturadoKg),arred(gapPeso),arred(esperado),arred(cobrado),arred(diferenca),arred(cobrado-repassado),status]);
 }
 return resposta('Auditoria de faturas de frete',['Etiqueta','Pedido','Transportadora','Peso real (kg)',
  'Peso cubado (kg)','Peso referência (kg)','Peso faturado','Diferença peso',
  'Frete acordado + extras','Frete faturado','Diferença frete','Subsídio de frete','Situação'],linhas,
 [['Etiquetas conferidas',rows.length],['Frete previsto',arred(previsto)],['Frete faturado',arred(faturado)],
  ['Diferença total faturada',arred(faturado-previsto)],['Frete não repassado ao cliente',arred(subsidio)],
  ['Etiquetas com alerta',divergencias]],
 ['Divisor de cubagem e tarifas são informados pelo usuário, sem presumir regras de transportadoras.',
  'Peso referencial não prova erro de cobrança; franquias, arredondamentos e adicionais contratuais podem justificar diferenças.',
  'Não solicita notas fiscais nem integra transportadoras.'],alertas);
}
function afinidades(d){
 const rows=tabela(d,'csv',['pedido','sku','unidades','receita']);
 const minimoSuporte=num(d.suporte_min_pct,'suporte mínimo',100);
 const minimoConfianca=num(d.confianca_min_pct,'confiança mínima',100);
 const cestas=new Map(),frequencia=new Map(),pares=new Map();
 for(const x of rows){
  const pedido=nome(x.pedido,'pedido'),sku=nome(x.sku,'SKU');
  inteiro(x.unidades,'unidades',100000,true);const receita=num(x.receita,'receita');
  if(!cestas.has(pedido))cestas.set(pedido,new Map());
  const basket=cestas.get(pedido);
  if(basket.has(sku))throw new ErroAnalitica('SKU repetido no pedido '+pedido+'; consolide a linha.');
  if(basket.size>=20)throw new ErroAnalitica('Pedido com mais de 20 SKUs. Divida o conjunto.');
  basket.set(sku,receita);
 }
 for(const itens of cestas.values()){
  const sku=[...itens.keys()].sort();
  for(const s of sku)frequencia.set(s,(frequencia.get(s)||0)+1);
  const receita=[...itens.values()].reduce((s,x)=>s+x,0);
  for(let i=0;i<sku.length;i++)for(let j=i+1;j<sku.length;j++){
   const chave=JSON.stringify([sku[i],sku[j]]),v=pares.get(chave)||{itens:0,receita:0};
   v.itens++;v.receita+=receita;pares.set(chave,v);
  }
 }
 const n=cestas.size,linhas=[],alertas=[];
 for(const [chave,p] of pares){
  const [a,b]=JSON.parse(chave);
  const suporte=p.itens/n*100;
  if(suporte<minimoSuporte)continue;
  const cfA=p.itens/frequencia.get(a)*100,cfB=p.itens/frequencia.get(b)*100;
  const lift=p.itens*n/(frequencia.get(a)*frequencia.get(b));
  for(const [origem,destino,confianca] of [[a,b,cfA],[b,a,cfB]]){
   if(confianca<minimoConfianca)continue;
   linhas.push([origem,destino,p.itens,arred(suporte),arred(confianca),arred(lift),
    arred(p.receita/p.itens),lift>1?'Associação positiva':'Não sugere associação positiva']);
  }
 }
 linhas.sort((a,b)=>b[5]-a[5]||b[2]-a[2]||String(a[0]).localeCompare(String(b[0])));
 if(!linhas.length){linhas.push(['—','—',0,0,0,0,0,'Nenhum par atende os limites.']);alertas.push('Reduza os limiares apenas com critério; ausência de pares não indica falta de vendas.');}
 if(n<30)alertas.push('Amostra pequena: estimativas de afinidade podem variar fortemente.');
 return resposta('Afinidade e cross-sell em cestas',['Produto origem','Produto sugerido',
  'Pedidos com o par','Suporte (%)','Confiança (%)','Lift','Ticket médio dos pedidos com par','Leitura'],linhas,
 [['Pedidos únicos',n],['SKUs distintos',frequencia.size],['Recomendações acima do limiar',linhas[0][2]===0?0:linhas.length]],
 ['Lift maior que 1 sugere coocorrência acima da esperada sob independência, sem provar causalidade.',
  'Cada pedido/sku precisa aparecer uma vez e todos os pedidos relevantes devem estar incluídos.',
  'Não altera vitrine, recomendações ou preços em plataformas externas.'],alertas);
}
function recebiveis(d){
 const ref=dataISO(d.data_referencia),rows=tabela(d,'csv',['fatura','cliente','emissao','vencimento','valor','valor_pago','data_pagamento']);
 const ids=new Set(),linhas=[],alertas=[],porCliente=new Map(),buckets={'Em dia':0,'1 a 30':0,'31 a 60':0,'61 a 90':0,'Mais de 90':0};
 let original=0,pago=0,aberto=0,desconto=0,ponderado=0,pagoPonderado=0;
 for(const x of rows){
  const id=nome(x.fatura,'fatura'),cliente=nome(x.cliente,'cliente');
  if(ids.has(id))throw new ErroAnalitica('Fatura duplicada: '+id);ids.add(id);
  if(cliente.includes('@')||! /^[A-Za-z0-9_.-]{1,64}$/.test(cliente))
   throw new ErroAnalitica('Cliente deve ter código pseudônimo, sem dado pessoal.');
  const emissao=dataISO(x.emissao),venc=dataISO(x.vencimento);
  if(venc<emissao)throw new ErroAnalitica('Vencimento anterior à emissão: '+id);
  if(emissao>ref)throw new ErroAnalitica('Emissão posterior à data de referência: '+id);
  const valor=num(x.valor,'valor da fatura',1e9,true),quitado=num(x.valor_pago,'valor pago');
  if(quitado>valor+.00001)throw new ErroAnalitica('Pagamento superior ao valor da fatura '+id);
  const dtPg=x.data_pagamento?dataISO(x.data_pagamento):null;
  if(quitado>0&&(dtPg===null||dtPg<emissao))throw new ErroAnalitica('Data de pagamento inválida: '+id);
  if(quitado===0&&dtPg!==null)throw new ErroAnalitica('Data de pagamento informada sem valor pago: '+id);
  if(dtPg!==null&&dtPg>ref)throw new ErroAnalitica('Data de pagamento posterior à referência: '+id);
  const restante=arred(valor-quitado);
  const atraso=restante>0?Math.max(0,dias(venc,ref)):0;
  const faixa=atraso===0?'Em dia':atraso<=30?'1 a 30':atraso<=60?'31 a 60':atraso<=90?'61 a 90':'Mais de 90';
  buckets[faixa]+=restante;original+=valor;pago+=quitado;aberto+=restante;
  if(quitado>0){pagoPonderado+=quitado;ponderado+=quitado*dias(emissao,dtPg);}
  if(atraso>30)alertas.push(id+' ('+cliente+'): '+atraso+' dias de atraso, saldo '+restante+'.');
  porCliente.set(cliente,(porCliente.get(cliente)||0)+restante);
  linhas.push([id,cliente,x.emissao,x.vencimento,arred(valor),arred(quitado),restante,
   atraso,faixa,dtPg?x.data_pagamento:'Pendente']);
 }
 const principais=[...porCliente].sort((a,b)=>b[1]-a[1]);
 const maior=principais[0]??['—',0];
 return resposta('Aging e cobrança de recebíveis',['Fatura','Cliente pseudônimo','Emissão','Vencimento',
  'Valor','Pago','Em aberto','Dias vencidos','Faixa','Último pagamento'],linhas,
 [['Total de faturas',rows.length],['Valor emitido',arred(original)],['Valor pago',arred(pago)],
  ['Saldo em aberto',arred(aberto)],['Saldo vencido >30 dias',arred(buckets['31 a 60']+buckets['61 a 90']+buckets['Mais de 90'])],
  ['Prazo médio ponderado dos valores pagos (dias)',pagoPonderado?arred(ponderado/pagoPonderado):'n/d'],
  ['Maior concentração em cliente',maior[0]+' · '+arred(maior[1])]],
 ['Faixas de atraso são por valor AINDA em aberto na data de referência, usando dias corridos.',
  'Prazo médio pago é uma medida observada sobre pagamentos informados, não DSO contábil do período.',
  'Não emite cobrança, não analisa score de crédito e não usa dados pessoais.'],alertas);
}
function erf(x){
 const sign=Math.sign(x),t=1/(1+.3275911*Math.abs(x));
 const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);
 return sign*y;
}
const cdf=x=>.5*(1+erf(x/Math.SQRT2));
function wilson(k,n){
 if(!n)return [0,0];const p=k/n,z=1.959963984540054,zz=z*z,base=1+zz/n;
 const center=(p+zz/(2*n))/base,delta=z*Math.sqrt((p*(1-p)+zz/(4*n))/n)/base;
 return [Math.max(0,center-delta),Math.min(1,center+delta)];
}
function experimentos(d){
 const rows=tabela(d,'csv',['experimento','variacao','controle','visitantes','conversoes','receita','custos']);
 const grupos=new Map(),alertas=[],linhas=[];let significativos=0;
 for(const x of rows){
  const experimento=nome(x.experimento,'experimento'),variacao=nome(x.variacao,'variação');
  if(!['0','1'].includes(x.controle))throw new ErroAnalitica('Controle precisa ser 0 ou 1.');
  const n=inteiro(x.visitantes,'visitantes',1e9,true),k=inteiro(x.conversoes,'conversões',1e9);
  if(k>n)throw new ErroAnalitica('Conversões superam visitantes em '+variacao);
  const receita=num(x.receita,'receita'),custos=num(x.custos,'custos');
  if(!grupos.has(experimento))grupos.set(experimento,[]);
  if(grupos.get(experimento).some(a=>a.nome===variacao))throw new ErroAnalitica('Variação duplicada: '+experimento+'/'+variacao);
  grupos.get(experimento).push({nome:variacao,controle:x.controle==='1',n,k,receita,custos});
 }
 for(const [nomeExp,bracos] of grupos){
  if(bracos.length<2||bracos.length>8)throw new ErroAnalitica(nomeExp+': informe 2 a 8 variações.');
  if(bracos.filter(b=>b.controle).length!==1)throw new ErroAnalitica(nomeExp+': exija exatamente um controle.');
  const controle=bracos.find(b=>b.controle),v=bracos.filter(b=>!b.controle);
  const comparacoes=v.map(b=>{
   const p1=controle.k/controle.n,p2=b.k/b.n,pPool=(controle.k+b.k)/(controle.n+b.n);
   const se=Math.sqrt(pPool*(1-pPool)*(1/controle.n+1/b.n));
   const z=se?(p2-p1)/se:0,p=Math.max(0,Math.min(1,2*(1-cdf(Math.abs(z)))));
   return {...b,p,up:p1?100*(p2-p1)/p1:null,rate:p2*100,ci:wilson(b.k,b.n),
    amostraBaixa:Math.min(controle.k,b.k,controle.n-controle.k,b.n-b.k)<5};
  }).sort((a,b)=>a.p-b.p);
  let ajustado=0;
  for(let i=0;i<comparacoes.length;i++){
   const b=comparacoes[i];ajustado=Math.max(ajustado,(comparacoes.length-i)*b.p);
   b.holm=Math.min(1,ajustado);
   if(b.amostraBaixa)alertas.push(nomeExp+'/'+b.nome+': pouca amostra para aproximação normal; não conclua significância.');
   if(b.holm<.05&&!b.amostraBaixa)significativos++;
  }
  const porNome=new Map(comparacoes.map(b=>[b.nome,b]));
  for(const b of bracos){
   const t=b.controle?null:porNome.get(b.nome),intervalo=b.controle?wilson(b.k,b.n):t.ci;
   const status=b.controle?'Referência':t.amostraBaixa?'Baixa amostra':
    t.holm<.05?'Diferença estatística':'Sem evidência suficiente';
   linhas.push([nomeExp,b.nome,b.controle?'Sim':'Não',b.n,b.k,arred(100*b.k/b.n),
    arred(100*intervalo[0]),arred(100*intervalo[1]),t?arred(t.up??0):'n/d',
    t?Math.round(t.p*1000000)/1000000:'n/d',t?Math.round(t.holm*1000000)/1000000:'n/d',arred(b.receita/b.n),
    arred(b.receita-b.custos),status]);
  }
 }
 return resposta('Experimentos A/B com ajuste para múltiplas variações',
 ['Experimento','Variação','Controle','Visitantes','Conversões','Taxa (%)','IC 95% inferior (%)',
 'IC 95% superior (%)','Uplift relativo (%)','p bilateral','p ajustado Holm',
 'Receita por visitante','Contribuição parcial','Conclusão'],linhas,
 [['Experimentos',grupos.size],['Variações comparadas',linhas.length-grupos.size],
  ['Diferenças detectadas (p ajustado < 0,05 e amostra suficiente)',significativos]],
 ['Usa teste z bilateral para duas proporções e correção Holm por experimento; aproximação normal pode falhar com poucos eventos.',
  'Teste não corrige seleção de público, sazonalidade, exposição desigual ou múltiplas inspeções sequenciais.',
  'Significância de conversões não implica significância da receita por visitante. Não autoriza mudanças automáticas.'],alertas);
}
function checkout(d){
 const rows=tabela(d,'csv',['periodo','segmento','sessoes','visitas_produto','carrinhos','checkout','compras','receita']);
 const linhas=[],seen=new Set(),alertas=[];let sessoes=0,compras=0,receitaTotal=0;
 for(const x of rows){
  const periodo=nome(x.periodo,'período'),segmento=nome(x.segmento,'segmento'),key=periodo+'|'+segmento;
  if(seen.has(key))throw new ErroAnalitica('Período/segmento duplicado: '+key);seen.add(key);
  const s=inteiro(x.sessoes,'sessões',1e9,true),pv=inteiro(x.visitas_produto,'visitas produto'),
   cart=inteiro(x.carrinhos,'carrinhos'),co=inteiro(x.checkout,'checkout'),
   ped=inteiro(x.compras,'compras'),receita=num(x.receita,'receita');
  if(!(s>=pv&&pv>=cart&&cart>=co&&co>=ped))
   throw new ErroAnalitica(key+': funil exige sessões ≥ produtos ≥ carrinho ≥ checkout ≥ compras.');
  const e=[['Sessão→produto',s,pv],['Produto→carrinho',pv,cart],
   ['Carrinho→checkout',cart,co],['Checkout→compra',co,ped]];
  const rates=e.map(([,a,b])=>a?100*b/a:0);
  const fraqueza=e.reduce((w,v,i)=>v[1]>0&&(w===null||rates[i]<rates[w])?i:w,null);
  const aov=ped?receita/ped:0;
  const conversao=100*ped/s,perdaMaior=fraqueza===null?'Sem base':e[fraqueza][0];
  const taxaEtapa=fraqueza===null?0:rates[fraqueza];
  const posteriores=fraqueza===null?0:e.slice(fraqueza+1).reduce((prob,[,entrada,saida])=>prob*(entrada?saida/entrada:0),1);
  const oportunidade=fraqueza===null?0:(e[fraqueza][1]-e[fraqueza][2])*.1*posteriores*aov;
  if(fraqueza!==null&&taxaEtapa<20)alertas.push(key+': etapa '+perdaMaior+' com passagem inferior a 20%.');
  sessoes+=s;compras+=ped;receitaTotal+=receita;
  linhas.push([periodo,segmento,s,pv,cart,co,ped,arred(conversao),
   ...rates.map(arred),perdaMaior,arred(taxaEtapa),arred(aov),arred(oportunidade)]);
 }
 return resposta('Diagnóstico de checkout por segmento',['Período','Segmento','Sessões',
  'Páginas de produto','Carrinhos','Checkouts iniciados','Pedidos','Conversão total (%)',
  'Sessão→produto (%)','Produto→carrinho (%)','Carrinho→checkout (%)','Checkout→compra (%)',
  'Etapa com menor passagem','Passagem na etapa (%)','Ticket médio','Cenário teórico por 10% de recuperação'],
 linhas,[['Sessões',sessoes],['Compras',compras],['Conversão total (%)',arred(100*compras/sessoes)],
  ['Receita',arred(receitaTotal)],['Segmentos/períodos',linhas.length]],
 ['Os números precisam pertencer à mesma coorte e período, sem múltiplas contagens inconsistentes.',
  'A etapa de menor passagem não prova que seja a de maior impacto financeiro ou a causa real.',
  'Cenário de recuperar 10% das perdas na etapa mais fraca mantém as taxas posteriores constantes; não prevê receita ou causalidade.'],alertas);
}
const MODULOS=Object.freeze({
 'auditoria-faturas-frete':fretes,'afinidade-cestas-pedidos':afinidades,
 'inadimplencia-recebiveis':recebiveis,'experimentos-ab-lote':experimentos,
 'diagnostico-checkout-segmentos':checkout
});
export function executarAnalitica(tipo,dados){
 if(!Object.hasOwn(MODULOS,tipo))throw new ErroAnalitica('Análise Premium desconhecida.');
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw new ErroAnalitica('Dados inválidos.');
 return MODULOS[tipo](dados);
}
