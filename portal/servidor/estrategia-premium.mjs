/** F217-F221: estratégia comercial Premium. Nada é obtido de contas ou APIs externas.
 * Motor executado apenas no backend autenticado com valores informados pelo operador.
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroEstrategia extends Error{constructor(m){super(m);this.name='ErroEstrategia';}}
export const TIPOS_ESTRATEGIA=Object.freeze(['precificacao-de-promocoes','projecao-caixa-operacional',
 'comparador-de-fornecedores','auditoria-de-cupons','priorizacao-de-catalogo']);
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
function tab(input,nome,colunas){
 const csv=input?.[nome];
 if(typeof csv!=='string'||!csv.trim()||Buffer.byteLength(csv)>270000)throw new ErroEstrategia(nome+': CSV/TSV inválido ou maior que 270 KB.');
 let dados;try{dados=lerDadosTexto(csv).linhas;}catch(e){throw new ErroEstrategia(nome+': '+e.message);}
 if(dados.length<2||dados.length>501)throw new ErroEstrategia(nome+': informe de 1 a 500 linhas mais cabeçalho.');
 const keys=dados[0].map(x=>x.trim().toLowerCase());
 if(new Set(keys).size!==keys.length)throw new ErroEstrategia('Cabeçalho duplicado.');
 const faltantes=colunas.filter(x=>!keys.includes(x));
 if(faltantes.length)throw new ErroEstrategia('Colunas ausentes em '+nome+': '+faltantes.join(', '));
 const idx=Object.fromEntries(colunas.map(x=>[x,keys.indexOf(x)]));
 return dados.slice(1).map((r,i)=>{
  const o=Object.fromEntries(colunas.map(k=>[k,String(r[idx[k]]??'').trim()]));
  if(Object.values(o).some(v=>v.length>500))throw new ErroEstrategia('Campo extenso na linha '+(i+2));
  return o;
 });
}
function id(x,k){if(typeof x!=='string'||!x||x.length>80||/[\x00-\x1f]/.test(x))throw new ErroEstrategia('Identificador '+k+' inválido.');return x;}
function num(v,k,max=1e9,positivo=false){
 let x=String(v??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(x))x=x.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:,\d{1,4})?$/.test(x))x=x.replace(',','.');
 if(!/^\d+(?:\.\d{1,4})?$/.test(x))throw new ErroEstrategia('Número inválido: '+k);
 const n=Number(x);
 if(!Number.isFinite(n)||n>max||n<0||(positivo&&n===0))throw new ErroEstrategia('Valor fora do limite: '+k);
 return n;
}
function inteiro(v,k,max=1e8){const n=num(v,k,max);if(!Number.isSafeInteger(n))throw new ErroEstrategia(k+': informe inteiro.');return n;}
const percentual=(v,k)=>num(v,k,100);
function dataISO(d){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new ErroEstrategia('Data deve ser AAAA-MM-DD.');
 const t=Date.parse(d+'T00:00:00.000Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==d)throw new ErroEstrategia('Data inválida: '+d);
 return t;
}
function relatorio(titulo,cols,linhas,indicadores,avisos,alertas=[]){
 if(!linhas.length)throw new ErroEstrategia('Não foi possível gerar relatório.');
 return {titulo,total:linhas.length,planilha:[cols,...linhas],indicadores,avisos,alertas:alertas.slice(0,100)};
}
function promocoes(d){
 const r=tab(d,'csv',['sku','preco_normal','preco_promocional','cmv','comissao_pct','imposto_pct','frete','ads','unidades_previstas','meta_margem_pct']);
 const linhas=[],alertas=[];let receita=0,resultado=0,queda=0;
 for(const a of r){
  const sku=id(a.sku,'SKU'),p=num(a.preco_normal,'preço normal',1e9,true),pp=num(a.preco_promocional,'preço promocional',1e9,true);
  if(pp>p)throw new ErroEstrategia(sku+': preço promocional não pode ultrapassar o normal.');
  const cmv=num(a.cmv,'CMV'),frete=num(a.frete,'frete'),ads=num(a.ads,'Ads');
  const taxa=percentual(a.comissao_pct,'comissão')+percentual(a.imposto_pct,'impostos'),meta=percentual(a.meta_margem_pct,'meta');
  const q=inteiro(a.unidades_previstas,'unidades',1e6);
  if(taxa>=100)throw new ErroEstrategia(sku+': taxas somam 100% ou mais.');
  const custo=cmv+frete+ads,fator=1-taxa/100,base=p*fator-custo,promo=pp*fator-custo;
  const minima=custo/fator,precoMeta=fator>meta/100?custo/(fator-meta/100):null;
  const perdaPorUnidade=base-promo;
  if(promo<0)alertas.push(sku+': campanha gera margem negativa.');
  if(precoMeta===null||pp<(precoMeta??Infinity))alertas.push(sku+': preço promocional abaixo da meta de margem.');
  receita+=pp*q;resultado+=promo*q;queda+=perdaPorUnidade*q;
  linhas.push([sku,round(p),round(pp),round((p-pp)/p*100),q,round(promo),round(promo/pp*100),
   round(minima),precoMeta===null?'Inviável':round(precoMeta),round(perdaPorUnidade),round(promo*q)]);
 }
 return relatorio('Precificação de promoções',['SKU','Preço normal','Preço promocional','Desconto (%)','Unidades previstas','Contribuição unit.','Margem (%)','Preço de equilíbrio','Preço para meta','Queda unitária','Contribuição total'],linhas,
 [['Receita promocional',round(receita)],['Contribuição da campanha',round(resultado)],['Contribuição cedida vs normal',round(queda)]],
 ['Comparação assume o mesmo volume em preço normal e promocional; não prevê elasticidade ou vendas adicionais.','Não inclui despesas fixas e taxas de marketplaces devem ser informadas.'],alertas);
}
function caixa(d){
 const recebiveis=tab(d,'recebiveis',['data','origem','valor','probabilidade_pct']);
 const pagamentos=tab(d,'pagamentos',['data','categoria','valor']);
 const saldo=num(d.saldo_inicial,'saldo inicial',1e12),minimo=num(d.saldo_minimo,'reserva mínima',1e12);
 const map=new Map();
 function addDia(dia){if(!map.has(dia))map.set(dia,{bruto:0,esperado:0,saidas:0});return map.get(dia);}
 for(const r of recebiveis){
  dataISO(r.data);id(r.origem,'origem');
  const val=num(r.valor,'recebível'),prob=percentual(r.probabilidade_pct,'probabilidade')/100;
  const day=addDia(r.data);day.bruto+=val;day.esperado+=val*prob;
 }
 for(const p of pagamentos){dataISO(p.data);id(p.categoria,'categoria');addDia(p.data).saidas+=num(p.valor,'pagamento');}
 const dias=[...map.keys()].sort();if(dias.length>365)throw new ErroEstrategia('Horizonte maior que 365 datas distintas.');
 if(dataISO(dias.at(-1))-dataISO(dias[0])>366*86400000)throw new ErroEstrategia('Intervalo superior a um ano.');
 let atual=saldo,estresse=saldo,menor=saldo,alertas=[],linhas=[];
 for(const data of dias){
  const z=map.get(data);atual+=z.esperado-z.saidas;estresse+=z.esperado*0.5-z.saidas;
  menor=Math.min(menor,atual);
  if(atual<minimo)alertas.push(data+': saldo esperado abaixo da reserva.');
  if(estresse<0)alertas.push(data+': saldo negativo no cenário conservador (50% dos recebíveis ponderados).');
  linhas.push([data,round(z.bruto),round(z.esperado),round(z.saidas),round(atual),round(estresse),atual<minimo?'Abaixo da reserva':'Ok']);
 }
 return relatorio('Fluxo de caixa operacional',['Data','Entradas brutas','Entradas ponderadas','Saídas','Saldo esperado','Saldo conservador','Situação'],linhas,
 [['Saldo inicial',saldo],['Saldo final esperado',round(atual)],['Saldo conservador final',round(estresse)],['Menor saldo esperado',round(menor)],['Datas com lançamentos',dias.length]],
 ['A projeção usa probabilidades inseridas e não coleta saldo bancário. Cenário conservador reduz recebíveis esperados à metade.','Datas sem lançamentos não aparecem como linhas; saldo permanece entre elas.'],alertas);
}
function fornecedores(d){
 const r=tab(d,'csv',['sku','fornecedor','quantidade','preco_unitario','frete_total','imposto_pct','prazo_dias','minimo_lote','orcamento']);
 const vistos=new Set(),linhas=[],grupos=new Map(),alertas=[];let custoTotal=0;
 for(const x of r){
  const sku=id(x.sku,'SKU'),empresa=id(x.fornecedor,'fornecedor'),key=sku+'::'+empresa;
  if(vistos.has(key))throw new ErroEstrategia('Cotação duplicada de '+sku+'/'+empresa);vistos.add(key);
  const q=inteiro(x.quantidade,'quantidade',1e7),min=inteiro(x.minimo_lote,'mínimo',1e7),
   valor=num(x.preco_unitario,'preço unitário',1e8,true),frete=num(x.frete_total,'frete'),
   imposto=percentual(x.imposto_pct,'imposto'),prazo=inteiro(x.prazo_dias,'prazo',365),
   budget=num(x.orcamento,'orçamento',1e12);
  const pedido=Math.max(q,min),custo=pedido*valor*(1+imposto/100)+frete;
  const viavel=custo<=budget;
  const item={sku,empresa,pedido,valor,frete,imposto,prazo,budget,custo,viavel};
  if(!grupos.has(sku))grupos.set(sku,[]);grupos.get(sku).push(item);
 }
 for(const [sku,lista] of grupos){
  const viaveis=lista.filter(x=>x.viavel).sort((a,b)=>a.custo/a.pedido-b.custo/b.pedido||a.prazo-b.prazo||a.empresa.localeCompare(b.empresa));
  const melhor=viaveis[0];if(!melhor)alertas.push(sku+': nenhuma cotação cabe no orçamento informado.');
  else custoTotal+=melhor.custo;
  for(const v of lista){
   linhas.push([sku,v.empresa,v.pedido,round(v.valor),round(v.frete),v.imposto,v.prazo,
    round(v.custo),round(v.custo/v.pedido),v.viavel?'Viável':'Acima do orçamento',melhor===v?'Menor custo unitário viável':'—']);
  }
 }
 return relatorio('Comparação de fornecedores',['SKU','Fornecedor','Lote efetivo','Preço unitário','Frete total','Imposto (%)','Prazo','Custo posto','Custo/unidade','Orçamento','Indicação'],linhas,
 [['SKUs cotados',grupos.size],['Custo agregado de fornecedores indicados',round(custoTotal)],['Cotações',linhas.length]],
 ['Escolha considera o menor custo unitário posto entre as ofertas dentro do orçamento, sem negociação nem alocação conjunta de capital.','Preços, impostos, prazo, frete e lote mínimo são valores fornecidos pelo usuário.'],alertas);
}
function cupons(d){
 const r=tab(d,'csv',['campanha','sku','preco','cmv','comissao_pct','imposto_pct','frete','ads','desconto_pct','subsidio_fixo','unidades']);
 const linhas=[],alertas=[];let receita=0,contribuicao=0,negativos=0;
 for(const x of r){
  const camp=id(x.campanha,'campanha'),sku=id(x.sku,'SKU'),p=num(x.preco,'preço',1e8,true);
  const cmv=num(x.cmv,'CMV'),frete=num(x.frete,'frete'),ads=num(x.ads,'Ads');
  const desconto=percentual(x.desconto_pct,'cupom'),tx=percentual(x.comissao_pct,'comissão')+percentual(x.imposto_pct,'imposto');
  const subsidio=num(x.subsidio_fixo,'subsídio'),q=inteiro(x.unidades,'unidades',1e6);
  if(tx>=100)throw new ErroEstrategia(sku+': taxas iguais ou maiores que 100%.');
  const final=p*(1-desconto/100),unit=final*(1-tx/100)-cmv-frete-ads+subsidio;
  const semCupom=p*(1-tx/100)-cmv-frete-ads+subsidio;
  const teto=Math.max(0,Math.min(100,100*(1-(cmv+frete+ads-subsidio)/(p*(1-tx/100)))));
  if(unit<0){negativos++;alertas.push(sku+'/'+camp+': cupom deixa margem negativa.');}
  if(desconto>teto)alertas.push(sku+'/'+camp+': desconto supera o teto de equilíbrio.');
  receita+=q*final;contribuicao+=q*unit;
  linhas.push([camp,sku,round(p),round(final),desconto,round(teto),q,round(unit),round(semCupom-unit),round(unit*q)]);
 }
 return relatorio('Auditoria financeira de cupons',['Campanha','SKU','Preço cheio','Preço final','Desconto (%)','Teto sem prejuízo (%)','Unidades','Contribuição/un.','Custo de cupom/un.','Contribuição total'],linhas,
 [['Receita após descontos',round(receita)],['Contribuição esperada',round(contribuicao)],['Linhas negativas',negativos]],
 ['Subsídio é creditado por unidade e deve ser efetivamente recebido; a análise não confirma campanhas ou regras de marketplace.','O teto serve só para equilíbrio de contribuição, não margem-alvo ou despesas fixas.'],alertas);
}
function catalogo(d){
 const r=tab(d,'csv',['sku','visitas','pedidos','receita','cmv','ads','devolucoes','estoque','prazo_dias','dias_periodo']);
 const itens=[],seen=new Set(),alertas=[];let receita=0,contribuicao=0;
 for(const x of r){
  const sku=id(x.sku,'SKU');if(seen.has(sku))throw new ErroEstrategia('SKU duplicado: '+sku);seen.add(sku);
  const visitas=inteiro(x.visitas,'visitas'),pedidos=inteiro(x.pedidos,'pedidos'),
   vendas=num(x.receita,'receita'),cmv=num(x.cmv,'CMV'),ads=num(x.ads,'Ads'),
   devol=inteiro(x.devolucoes,'devoluções'),estoque=inteiro(x.estoque,'estoque'),
   prazo=inteiro(x.prazo_dias,'prazo',365),periodo=inteiro(x.dias_periodo,'dias de histórico',365);
  if(!periodo||pedidos>visitas||devol>pedidos)throw new ErroEstrategia(sku+': período, pedidos, visitas e devoluções incompatíveis.');
  const conv=visitas?pedidos/visitas*100:0,ret=pedidos?devol/pedidos*100:0;
  const contrib=vendas-cmv-ads,diaria=pedidos/periodo,cobertura=diaria?estoque/diaria:null;
  const risco=cobertura!==null&&cobertura<=prazo;
  const score=Math.max(0,Math.min(100,Math.round((contrib>0?35:0)+(conv>=3?25:conv>=1?15:5)
    +(ret<=5?20:ret<=15?10:0)+(risco?20:0))));
  if(risco)alertas.push(sku+': cobertura estimada menor ou igual ao prazo de fornecedor.');
  if(contrib<0)alertas.push(sku+': contribuição negativa antes de estornos e impostos não informados.');
  if(ret>15)alertas.push(sku+': taxa de devoluções elevada no período.');
  receita+=vendas;contribuicao+=contrib;
  itens.push({sku,visitas,pedidos,conv,ret,vendas,contrib,cobertura,risco,score});
 }
 const ordenados=[...itens].sort((a,b)=>b.vendas-a.vendas||a.sku.localeCompare(b.sku));
 const total=ordenados.reduce((s,x)=>s+x.vendas,0);let acum=0;
 for(const x of ordenados){x.abc=total===0?'C':acum/total<.8?'A':acum/total<.95?'B':'C';acum+=x.vendas;}
 const ranking=ordenados.sort((a,b)=>b.score-a.score||a.sku.localeCompare(b.sku));
 const linhas=ranking.map(i=>[i.sku,i.abc,i.score,round(i.vendas),round(i.contrib),
  round(i.conv),round(i.ret),i.cobertura===null?'n/d':round(i.cobertura),
  i.risco?'Repor/revisar':'Acompanhar']);
 return relatorio('Priorização do catálogo',['SKU','ABC de receita','Score gerencial','Receita','Contribuição parcial','Conversão (%)','Devoluções (%)','Cobertura (dias)','Ação'],linhas,
 [['SKUs avaliados',itens.length],['Receita informada',round(receita)],['Contribuição parcial',round(contribuicao)],['SKUs em risco de ruptura',itens.filter(i=>i.risco).length]],
 ['Score é uma heurística explicável para triagem (contribuição positiva, conversão, devoluções e cobertura), não ranking do Google nem previsão de vendas.','Contribuição parcial NÃO desconta impostos, taxas, reembolsos nem custos não incluídos no CSV. ABC reflete somente a receita do período fornecido.'],alertas);
}
const FUNCS=Object.freeze({
 'precificacao-de-promocoes':promocoes,'projecao-caixa-operacional':caixa,
 'comparador-de-fornecedores':fornecedores,'auditoria-de-cupons':cupons,
 'priorizacao-de-catalogo':catalogo
});
export function executarEstrategiaPremium(tipo,dados){
 if(!Object.hasOwn(FUNCS,tipo))throw new ErroEstrategia('Módulo Premium não identificado.');
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw new ErroEstrategia('Entrada inválida.');
 return FUNCS[tipo](dados);
}
