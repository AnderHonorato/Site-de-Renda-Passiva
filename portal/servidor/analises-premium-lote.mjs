/** Laboratório Premium: cinco análises operacionais com entradas CSV verificadas.
 * Todos os preços, taxas e metas são informados pelo operador. Não há coleta externa.
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroLotePremium extends Error {constructor(msg){super(msg);this.name='ErroLotePremium';}}
export const TIPOS_LOTE_PREMIUM=Object.freeze([
 'simulador-margem-marketplaces','conciliacao-de-repasses','auditoria-de-devolucoes',
 'divergencias-de-inventario','analise-de-campanhas-ads'
]);
const MAX_BYTES=270000,MAX_ITENS=500;
const arred=n=>Math.round((n+Number.EPSILON)*100)/100;
const formatar=n=>arred(n);
const somar=(a,c)=>arred(a+c);
function tabela(dados,campo,obrigatorias){
 const csv=dados?.[campo];
 if(typeof csv!=='string'||!csv.trim()||Buffer.byteLength(csv,'utf8')>MAX_BYTES)
  throw new ErroLotePremium('Informe '+campo+' em CSV/TSV, com limite de 270 KB.');
 let raw;
 try{raw=lerDadosTexto(csv).linhas;}
 catch(e){throw new ErroLotePremium('Falha no CSV '+campo+': '+e.message);}
 if(raw.length<2||raw.length>MAX_ITENS+1)throw new ErroLotePremium('Informe de 1 a 500 registros em '+campo+'.');
 const names=raw[0].map(v=>v.trim().toLowerCase());
 if(new Set(names).size!==names.length)throw new ErroLotePremium('Cabeçalhos duplicados em '+campo+'.');
 const faltantes=obrigatorias.filter(k=>!names.includes(k));
 if(faltantes.length)throw new ErroLotePremium('Campos ausentes em '+campo+': '+faltantes.join(', '));
 const pos=Object.fromEntries(obrigatorias.map(k=>[k,names.indexOf(k)]));
 return raw.slice(1).map((r,i)=>{
  const o=Object.fromEntries(obrigatorias.map(k=>[k,String(r[pos[k]]??'').trim()]));
  if(Object.values(o).some(v=>v.length>2000))throw new ErroLotePremium('Campo extenso na linha '+(i+2));
  return {...o,__linha:i+2};
 });
}
function nome(v,campo){
 if(typeof v!=='string'||!v.trim()||v.length>90||/[\u0000-\u001F]/.test(v))
  throw new ErroLotePremium('Identificador '+campo+' inválido.');
 return v.trim();
}
function n(v,campo,max=1e9,allowZero=true){
 let t=String(v??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(t))t=t.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:,\d{1,4})?$/.test(t))t=t.replace(',','.');
 if(!/^\d+(?:\.\d{1,4})?$/.test(t))throw new ErroLotePremium('Número inválido: '+campo+'.');
 const val=Number(t);
 if(!Number.isFinite(val)||val<0||val>max||(!allowZero&&!val))
  throw new ErroLotePremium('Fora do limite: '+campo+'.');
 return val;
}
function inteiro(v,campo,max=1e7){const val=n(v,campo,max);if(!Number.isSafeInteger(val))throw new ErroLotePremium('Inteiro esperado: '+campo);return val;}
function pct(v,campo){return n(v,campo,100);}
function retorno(titulo,cab,linhas,indicadores,avisos=[],alertas=[]){
 if(!linhas.length)throw new ErroLotePremium('Sem linhas analisáveis.');
 return {titulo,total:linhas.length,indicadores,planilha:[cab,...linhas],avisos,alertas:alertas.slice(0,120)};
}
function analisarMarket(d){
 const campos=['sku','canal','unidades','preco','cmv','comissao_pct','tarifa_fixa','frete','ads_unitario','imposto_pct','devolucao_pct','meta_margem_pct'];
 const dados=tabela(d,'csv',campos),linhas=[],alertas=[];
 let unidades=0,receita=0,contribuicao=0,perdas=0;
 for(const a of dados){
  const id=nome(a.sku,'SKU'),canal=nome(a.canal,'canal'),q=inteiro(a.unidades,'unidades',1e6);
  const p=n(a.preco,'preço',1e7,false),cmv=n(a.cmv,'CMV'),tx=n(a.tarifa_fixa,'tarifa'),frete=n(a.frete,'frete'),ads=n(a.ads_unitario,'Ads');
  const somaPct=pct(a.comissao_pct,'comissão')+pct(a.imposto_pct,'imposto')+pct(a.devolucao_pct,'devoluções');
  const meta=pct(a.meta_margem_pct,'margem desejada');
  if(somaPct>=100)throw new ErroLotePremium('Taxas somadas precisam ser menores que 100% em '+id+'.');
  const variavel=cmv+tx+frete+ads, fator=1-somaPct/100;
  const custoComTaxas=variavel+p*somaPct/100,un=p-custoComTaxas;
  const minima=variavel/fator, divisor=fator-meta/100;
  const precoMeta=divisor>0?variavel/divisor:null;
  receita=somar(receita,p*q);contribuicao=somar(contribuicao,un*q);unidades+=q;
  if(un<0){perdas++;alertas.push(id+' no canal '+canal+': margem de contribuição negativa.');}
  if(precoMeta===null)alertas.push(id+': meta de margem inviável com taxas informadas.');
  linhas.push([id,canal,q,formatar(p),formatar(custoComTaxas),formatar(un),formatar(un/p*100),formatar(minima),precoMeta===null?'Inviável':formatar(precoMeta),formatar(un*q)]);
 }
 return retorno('Margem multicanal',['SKU','Canal','Unidades','Preço','Custo unitário total','Contribuição unitária','Margem (%)','Preço mínimo equilíbrio','Preço para meta','Contribuição total'],linhas,
  [['Unidades projetadas',unidades],['Receita bruta',receita],['Contribuição após custos',contribuicao],['Linhas com margem negativa',perdas]],
  ['Taxas, impostos, perdas e Ads são hipóteses editáveis, não cotações ou tabelas oficiais.','Não inclui despesas fixas nem conciliação fiscal.'],alertas);
}
function conciliar(d){
 const pedidos=tabela(d,'pedidos',['pedido','canal','previsto','status']);
 const repasses=tabela(d,'repasses',['pedido','recebido','taxas']);
 const mapa=new Map(),avisos=[],linhas=[];let esperado=0,recebido=0,diferenca=0,pendencias=0;
 for(const p of pedidos){
  const id=nome(p.pedido,'pedido');if(mapa.has(id))throw new ErroLotePremium('Pedido duplicado em pedidos: '+id);
  const status=nome(p.status,'status').toLowerCase();
  if(!['pago','aberto','cancelado'].includes(status))throw new ErroLotePremium('Status deve ser pago, aberto ou cancelado.');
  mapa.set(id,{canal:nome(p.canal,'canal'),previsto:n(p.previsto,'previsto'),status,recebido:0,taxas:0,contagem:0});
 }
 for(const p of repasses){
  const id=nome(p.pedido,'pedido'),v=n(p.recebido,'recebido'),taxa=n(p.taxas,'taxas');
  if(!mapa.has(id)){avisos.push('Repasse sem pedido correspondente: '+id);continue;}
  const alvo=mapa.get(id);alvo.recebido+=v;alvo.taxas+=taxa;alvo.contagem++;
 }
 for(const [id,p] of mapa){
  if(p.taxas>p.previsto && p.status!=='cancelado')throw new ErroLotePremium(id+': taxas superam o valor bruto previsto.');
  const previstoLiquido=p.status==='cancelado'?0:p.previsto-p.taxas;
  const delta=p.recebido-previstoLiquido;
  const situacao=p.status==='cancelado'&&p.recebido>0?'Repasse de cancelado':
    !p.contagem?'Sem repasse':Math.abs(delta)>0.01?'Divergente':'Conciliado';
  if(situacao!=='Conciliado'){pendencias++;avisos.push(id+': '+situacao);}
  esperado=somar(esperado,previstoLiquido);recebido=somar(recebido,p.recebido);diferenca=somar(diferenca,delta);
  linhas.push([id,p.canal,p.status,formatar(p.previsto),formatar(p.taxas),formatar(previstoLiquido),formatar(p.recebido),formatar(delta),situacao]);
 }
 return retorno('Conciliação de repasses',['Pedido','Canal','Status','Valor bruto esperado','Taxas lançadas','Líquido esperado','Recebido','Diferença','Situação'],linhas,
 [['Pedidos conferidos',linhas.length],['Líquido esperado',esperado],['Recebido',recebido],['Diferença total',diferenca],['Pendências',pendencias]],
 ['Repasses podem ter retenções e datas diferentes; informe todos os lançamentos do período.','Não se conecta a bancos, marketplaces ou sistemas fiscais.'],avisos);
}
function devolucoes(d){
 const vendas=tabela(d,'vendas',['sku','vendidas','preco','cmv','frete','taxas']);
 const devol=tabela(d,'devolucoes',['sku','devolvidas','reembolsos','frete_reverso','perdas']);
 const map=new Map(),linhas=[],alertas=[];let faturamento=0,liquido=0,devolvidas=0;
 for(const v of vendas){
  const id=nome(v.sku,'SKU');if(map.has(id))throw new ErroLotePremium('SKU duplicado na base de vendas.');
  map.set(id,{v:inteiro(v.vendidas,'vendidas'),preco:n(v.preco,'preço'),cmv:n(v.cmv,'CMV'),
   frete:n(v.frete,'frete total'),taxas:n(v.taxas,'taxas totais'),ret:0,refund:0,reverse:0,perda:0});
 }
 for(const v of devol){
  const id=nome(v.sku,'SKU'),obj=map.get(id);
  if(!obj)throw new ErroLotePremium('Devolução sem SKU de venda: '+id);
  obj.ret+=inteiro(v.devolvidas,'devolvidas');
  obj.refund+=n(v.reembolsos,'reembolsos');obj.reverse+=n(v.frete_reverso,'frete reverso');obj.perda+=n(v.perdas,'perdas');
 }
 for(const [id,v] of map){
  if(v.ret>v.v)throw new ErroLotePremium(id+': devolvidas superam vendidas.');
  const receita=v.v*v.preco,resultado=receita-v.refund-v.v*v.cmv-v.frete-v.taxas-v.reverse-v.perda;
  const taxa=v.v?100*v.ret/v.v:0;
  if(taxa>=15)alertas.push(id+': devoluções acima de 15%, conferir causa e coorte.');
  if(resultado<0)alertas.push(id+': contribuição negativa após estornos e custos.');
  faturamento=somar(faturamento,receita);liquido=somar(liquido,resultado);devolvidas+=v.ret;
  linhas.push([id,v.v,v.ret,formatar(taxa),formatar(receita),formatar(v.refund),formatar(v.reverse+v.perda),formatar(resultado)]);
 }
 return retorno('Devoluções e perdas',['SKU','Vendas','Devoluções','Taxa devolução (%)','Receita','Reembolso','Frete reverso/perda','Contribuição estimada'],linhas,
 [['Faturamento bruto',faturamento],['Devoluções',devolvidas],['Contribuição estimada',liquido]],
 ['CMV considerado para todas as unidades vendidas; recuperação de mercadoria devolvida deve ser conciliada à parte.','Os reembolsos e custos devem corresponder à mesma coorte e período.'],alertas);
}
function inventario(d){
 const rows=tabela(d,'csv',['sku','erp','contagem','reservado','custo']),ids=new Set(),linhas=[],avisos=[];
 let unidades=0,impacto=0,divergentes=0;
 for(const r of rows){
  const id=nome(r.sku,'SKU');if(ids.has(id))throw new ErroLotePremium('SKU duplicado: '+id);ids.add(id);
  const erp=inteiro(r.erp,'ERP'),fisico=inteiro(r.contagem,'contagem'),reserva=inteiro(r.reservado,'reservado');
  const custo=n(r.custo,'custo'),dif=fisico-erp,real= fisico-reserva,perda=dif*custo;
  if(dif)divergentes++;if(real<0)avisos.push(id+': reservas superam contagem física.');
  if(dif<0)avisos.push(id+': divergência negativa; conferir avaria, perdas e movimentação.');
  unidades+=dif;impacto=somar(impacto,perda);
  linhas.push([id,erp,fisico,reserva,real,dif,formatar(custo),formatar(perda),dif===0?'Conferido':dif<0?'Falta':'Sobra']);
 }
 return retorno('Divergências de inventário',['SKU','ERP','Contado','Reservado','Disponível físico','Diferença','Custo unitário','Impacto a custo','Situação'],linhas,
 [['SKUs divergentes',divergentes],['Diferença de unidades',unidades],['Impacto financeiro a custo',impacto]],
 ['Comparação pontual, não ajusta ERP nem realiza baixas fiscais.','O impacto financeiro usa o custo fornecido por SKU.'],avisos);
}
function campanhas(d){
 const rows=tabela(d,'csv',['campanha','impressoes','cliques','pedidos','receita','gasto','cmv','taxas','meta_roas']);
 const linhas=[],avisos=[];let gasto=0,receita=0,contribuicao=0,zero=0;
 for(const r of rows){
  const id=nome(r.campanha,'campanha'),imp=inteiro(r.impressoes,'impressões',1e9),
   cliques=inteiro(r.cliques,'cliques',1e8),pedidos=inteiro(r.pedidos,'pedidos',1e8);
  if(cliques>imp||pedidos>cliques)throw new ErroLotePremium(id+': cliques/pedidos incompatíveis com a mesma coorte.');
  const rev=n(r.receita,'receita'),sp=n(r.gasto,'gasto'),cmv=n(r.cmv,'CMV'),tax=n(r.taxas,'taxas'),meta=n(r.meta_roas,'ROAS meta',10000);
  const contribution=rev-sp-cmv-tax;
  const roas=sp?rev/sp:null,ctr=imp?100*cliques/imp:null,cvr=cliques?100*pedidos/cliques:null;
  const cpa=pedidos?sp/pedidos:null,breakEven=rev-cmv-tax>0?rev/(rev-cmv-tax):null;
  if(!sp)zero++;
  if(contribution<0)avisos.push(id+': contribuição negativa após mídia, produto e taxas.');
  if(roas!==null&&meta&&roas<meta)avisos.push(id+': ROAS abaixo da meta inserida.');
  gasto=somar(gasto,sp);receita=somar(receita,rev);contribuicao=somar(contribuicao,contribution);
  linhas.push([id,imp,cliques,pedidos,formatar(ctr??0),formatar(cvr??0),roas===null?'n/d':formatar(roas),
   cpa===null?'n/d':formatar(cpa),breakEven===null?'n/d':formatar(breakEven),formatar(contribution)]);
 }
 return retorno('Rentabilidade de campanhas',['Campanha','Impressões','Cliques','Pedidos','CTR (%)','Conversão (%)','ROAS','CPA','ROAS de equilíbrio estimado','Contribuição pós-Ads'],linhas,
 [['Investimento em mídia',gasto],['Receita atribuída',receita],['Contribuição estimada',contribuicao],['Campanhas sem gasto',zero]],
 ['ROAS não indica lucro isoladamente: CMV, taxas e Ads foram informados manualmente.','Não recomenda escala automática e não acessa plataformas de anúncios.'],avisos);
}
const FUNCOES=Object.freeze({
 'simulador-margem-marketplaces':analisarMarket,'conciliacao-de-repasses':conciliar,
 'auditoria-de-devolucoes':devolucoes,'divergencias-de-inventario':inventario,'analise-de-campanhas-ads':campanhas
});
export function analisarLotePremium(tipo,dados){
 if(!Object.hasOwn(FUNCOES,tipo))throw new ErroLotePremium('Ferramenta Premium desconhecida.');
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw new ErroLotePremium('Informe dados estruturados.');
 return FUNCOES[tipo](dados);
}
