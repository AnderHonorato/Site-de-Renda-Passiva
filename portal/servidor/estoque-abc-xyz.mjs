/**
 * Planejamento ABC/XYZ por SKU. Motor privado, sem dependências e sem efeitos colaterais.
 * Não faz previsão externa: sazonalidade e custos são fornecidos pelo operador.
 */
export class ErroEstoque extends Error { constructor(mensagem) { super(mensagem); this.name='ErroEstoque'; } }
const finito=(n,nome,min=0,max=1e12)=>{
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new ErroEstoque(nome+' inválido.');
  return n;
};
const arredondar=(n,casas=2)=>Number(n.toFixed(casas));
function classificarXYZ(meses) {
  const media=meses.reduce((a,b)=>a+b,0)/meses.length;
  if(media===0)return {classe:'Z',cv:null,media:0};
  const desvio=Math.sqrt(meses.reduce((a,b)=>a+(b-media)**2,0)/meses.length);
  const cv=desvio/media;
  return {classe:cv<=0.5?'X':cv<=1?'Y':'Z',cv:arredondar(cv,4),media};
}
/**
 * @param {{itens: Array<{sku:string,demandaMensal:number[],preco:number,custo:number,estoque:number,
 * prazoDias:number,segurancaDias?:number,recebimentos?:number,pedidosPendentes?:number,
 * sazonalidade?:number[]}>, horizonteMeses?:number}} entrada
 */
export function planejarEstoque(entrada) {
  if(!entrada||!Array.isArray(entrada.itens)||entrada.itens.length<1||entrada.itens.length>500)
    throw new ErroEstoque('Informe de 1 a 500 SKUs.');
  const horizonte=entrada.horizonteMeses??3;
  if(!Number.isInteger(horizonte)||horizonte<1||horizonte>12)throw new ErroEstoque('Horizonte inválido (1 a 12 meses).');
  const vistos=new Set();
  const itens=entrada.itens.map((i)=>{
    if(!i||typeof i.sku!=='string'||!/^[-\w.]{1,64}$/.test(i.sku)||vistos.has(i.sku))
      throw new ErroEstoque('SKU inválido ou repetido.');
    vistos.add(i.sku);
    if(!Array.isArray(i.demandaMensal)||i.demandaMensal.length<3||i.demandaMensal.length>24)
      throw new ErroEstoque('Cada SKU precisa de 3 a 24 meses de demanda, incluindo meses sem vendas.');
    const meses=i.demandaMensal.map((v)=>finito(v,'Demanda mensal',0,1e8));
    const preco=finito(i.preco,'Preço'),custo=finito(i.custo,'Custo');
    const estoque=finito(i.estoque,'Estoque'),recebimentos=finito(i.recebimentos??0,'Recebimentos');
    const pedidosPendentes=finito(i.pedidosPendentes??0,'Pedidos pendentes');
    const prazo=finito(i.prazoDias,'Prazo de entrega',0,365);
    const seguranca=finito(i.segurancaDias??7,'Dias de segurança',0,180);
    const fatores=i.sazonalidade??Array(horizonte).fill(1);
    if(!Array.isArray(fatores)||fatores.length!==horizonte)
      throw new ErroEstoque('Informe um fator sazonal por mês do horizonte.');
    const sazonalidade=fatores.map((f)=>finito(f,'Fator sazonal',0,5));
    const xyz=classificarXYZ(meses);
    const demandaPrevista=sazonalidade.map((f)=>Math.ceil(xyz.media*f));
    const demandaHorizonte=demandaPrevista.reduce((a,b)=>a+b,0);
    const demandaDia=demandaPrevista[0]/30;
    const pontoPedido=Math.ceil(demandaDia*(prazo+seguranca));
    const posicaoEstoque=estoque+recebimentos-pedidosPendentes;
    const reposicaoSugerida=Math.max(0,Math.ceil(pontoPedido+demandaPrevista[0]-posicaoEstoque));
    const valorConsumo=meses.reduce((a,b)=>a+b,0)/meses.length*preco*12;
    const alertas=[];
    if(posicaoEstoque<0)alertas.push('Pedidos pendentes superam estoque e recebimentos.');
    if(posicaoEstoque<=pontoPedido)alertas.push('Atingiu o ponto de pedido.');
    if(xyz.classe==='Z')alertas.push('Demanda irregular: revisar manualmente o estoque de segurança.');
    if(xyz.media===0)alertas.push('Sem demanda histórica: previsão zerada.');
    return {sku:i.sku,classeXYZ:xyz.classe,coeficienteVariacao:xyz.cv,mediaMensal:arredondar(xyz.media,3),
      demandaPrevista,demandaHorizonte,preco,custo,estoque,recebimentos,pedidosPendentes,
      posicaoEstoque,prazoDias:prazo,segurancaDias:seguranca,pontoPedido,reposicaoSugerida,
      custoReposicao:arredondar(reposicaoSugerida*custo),valorConsumoAnual:arredondar(valorConsumo),alertas};
  });
  const ordenados=[...itens].sort((a,b)=>b.valorConsumoAnual-a.valorConsumoAnual||a.sku.localeCompare(b.sku));
  const total=ordenados.reduce((a,i)=>a+i.valorConsumoAnual,0);
  let acumulado=0;
  for(const i of ordenados) {
    const anterior=total>0?acumulado/total:1;
    i.classeABC=anterior<0.8?'A':anterior<0.95?'B':'C';
    acumulado+=i.valorConsumoAnual;
    i.participacaoPercentual=total?arredondar(i.valorConsumoAnual/total*100):0;
    i.classeCombinada=i.classeABC+i.classeXYZ;
    i.prioridade=i.alertas.length&&i.classeABC==='A'?'alta':i.alertas.length?'revisar':'normal';
  }
  return {horizonteMeses:horizonte,totalSkus:itens.length,valorConsumoAnual:arredondar(total),
    investimentoReposicao:arredondar(itens.reduce((a,i)=>a+i.custoReposicao,0)),
    itens:ordenados,avisos:['ABC usa valor de consumo anual estimado pelo histórico e preço informado.',
      'XYZ usa coeficiente de variação populacional; X ≤ 0,5, Y ≤ 1 e Z > 1.',
      'Mês operacional de 30 dias. Fatores sazonais são informados pelo usuário, não inferidos.',
      'Reposição é estimativa gerencial; revise lote mínimo, múltiplos de compra e prazo real antes de comprar.']};
}
