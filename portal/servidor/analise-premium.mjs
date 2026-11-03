/**
 * Inteligência de vendas por SKU — motor Premium exclusivo do servidor.
 * Não enviar este cálculo para o bundle do GitHub Pages.
 * Taxas de marketplaces são informadas pelo vendedor, não simuladas como cotações em tempo real.
 */
import { lerDadosTexto } from '../scripts/cálculos/importar-planilha.js';

export class ErroInteligencia extends Error{
  constructor(mensagem,campo='historico'){super(mensagem);this.name='ErroInteligencia';this.campo=campo;}
}
const COLUNAS=['sku','mes','unidades','preco','cmv','comissao_pct','tarifa_fixa','frete','ads_un','imposto_pct','perdas_pct','estoque','prazo_dias'];
const MAX_CSV=280000;
function numero(valor,nome,{min=0,max=1e9,inteiro=false}={}){
  const s=String(valor??'').trim();
  let normal=s;
  if(/^[+-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s))normal=s.replace(/\./g,'').replace(',','.');
  else if(/^[+-]?\d+(?:,\d+)?$/.test(s))normal=s.replace(',','.');
  if(!/^[+-]?\d+(?:\.\d+)?$/.test(normal))
    throw new ErroInteligencia('Número inválido no campo '+nome+'.');
  const n=Number(normal);
  if(!Number.isFinite(n)||n<min||n>max||(inteiro&&!Number.isInteger(n)))
    throw new ErroInteligencia('Valor fora do limite em '+nome+'.');
  return n;
}
function mesNumero(s){
  const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(s??'').trim());
  if(!m)throw new ErroInteligencia('Mês inválido; use AAAA-MM.');
  const ano=+m[1];if(ano<2020||ano>2100)throw new ErroInteligencia('Ano fora do período 2020 a 2100.');
  return ano*12+Number(m[2])-1;
}
function proximoMes(n){
  const ano=Math.floor(n/12),mes=n%12+1;
  return ano+'-'+String(mes).padStart(2,'0');
}
function parseHistorico(csv){
 if(typeof csv!=='string'||csv.length>MAX_CSV||!csv.trim())
  throw new ErroInteligencia('Cole um CSV/TSV de até 280 mil caracteres com histórico completo.');
 let tabela;
 try{tabela=lerDadosTexto(csv).linhas;}
 catch(e){throw new ErroInteligencia('CSV inválido: '+e.message);}
 if(tabela.length<4||tabela.length>1801)throw new ErroInteligencia('Use de 3 a 1.800 linhas de histórico mais cabeçalho.');
 const h=tabela[0].map(x=>x.trim().toLowerCase());
 const faltando=COLUNAS.filter(k=>!h.includes(k));
 if(faltando.length)throw new ErroInteligencia('Colunas ausentes: '+faltando.join(', ')+'.');
 if(new Set(h).size!==h.length)throw new ErroInteligencia('Não repita cabeçalhos no CSV.');
 const pos=Object.fromEntries(COLUNAS.map(k=>[k,h.indexOf(k)]));
 const grupos=new Map(),pares=new Set();
 for(let i=1;i<tabela.length;i++){
  const row=tabela[i],sku=String(row[pos.sku]??'').trim();
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(sku))
   throw new ErroInteligencia('Linha '+(i+1)+': SKU inválido (1–40 letras, números, _ ou -).');
  const mes=mesNumero(row[pos.mes]),chave=sku+'|'+mes;
  if(pares.has(chave))throw new ErroInteligencia('SKU e mês duplicados na linha '+(i+1)+'.');
  pares.add(chave);
  const valores={};
  for(const campo of COLUNAS.slice(2)){
   const pct=campo.endsWith('_pct');
   valores[campo]=numero(row[pos[campo]],campo,{
    min:0,max:pct?100:campo==='unidades'||campo==='estoque'?10000000:1000000,
    inteiro:['unidades','estoque','prazo_dias'].includes(campo),
   });
  }
  if(valores.comissao_pct+valores.imposto_pct+valores.perdas_pct>100)
    throw new ErroInteligencia('Linha '+(i+1)+': a soma das taxas percentuais ultrapassa 100%.');
  if(valores.preco<=0)throw new ErroInteligencia('O preço deve ser positivo na linha '+(i+1)+'.');
  if(!grupos.has(sku))grupos.set(sku,[]);
  grupos.get(sku).push({sku,mes,...valores});
 }
 if(grupos.size>70)throw new ErroInteligencia('Limite de 70 SKUs por análise.');
 for(const [sku,rows] of grupos){
  rows.sort((a,b)=>a.mes-b.mes);
  if(rows.length<3||rows.length>24)
   throw new ErroInteligencia('SKU '+sku+': informe entre 3 e 24 meses consecutivos.');
  for(let i=1;i<rows.length;i++){
   if(rows[i].mes!==rows[i-1].mes+1)
    throw new ErroInteligencia('SKU '+sku+': inclua todos os meses, mesmo os de zero vendas.');
  }
  const ult=rows.at(-1);
  for(const item of rows){
   for(const campo of COLUNAS.slice(3)){
    // Permite evolução de preço e custos no histórico; estoque e prazo são os da última linha.
    if(!Number.isFinite(item[campo]))throw new ErroInteligencia('Valor inconsistente em '+campo+'.');
   }
  }
  if(ult.prazo_dias>365)throw new ErroInteligencia('Prazo de reposição máximo: 365 dias.');
 }
 return grupos;
}
function mm3(serie){return serie.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,serie.length);}
function tendencia(serie){
 const x=serie.slice(-Math.min(6,serie.length)),n=x.length;
 const mx=(n-1)/2,my=x.reduce((a,b)=>a+b,0)/n;
 let cov=0,variancia=0;
 for(let i=0;i<n;i++){cov+=(i-mx)*(x[i]-my);variancia+=(i-mx)**2;}
 return Math.max(0,my+(variancia?cov/variancia:0)*(n-mx));
}
function preverUm(serie,modelo){
 const baseline=mm3(serie);
 if(modelo==='media')return baseline;
 const t=tendencia(serie);
 return Math.max(0,Math.min(baseline*1.6+2,Math.max(baseline*.4-2,t)));
}
export function selecionarModelo(unidades){
 if(unidades.length<6)return {nome:'media',erro: null};
 const erros={media:0,tendencia:0};let soma=0;
 for(let i=4;i<unidades.length;i++){
  const inicio=unidades.slice(0,i);
  for(const m of ['media','tendencia'])erros[m]+=Math.abs(unidades[i]-preverUm(inicio,m));
  soma+=Math.abs(unidades[i]);
 }
 const nome=erros.tendencia<erros.media*.92?'tendencia':'media';
 return {nome,erro:soma?Math.min(300,100*erros[nome]/soma):null};
}
function simularUnidades(serie,modelo,cenario){
 const historico=[...serie],out=[];
 for(let i=0;i<3;i++){
  const unidades=Math.max(0,Math.round(preverUm(historico,modelo)*(1+cenario/100)));
  out.push(unidades);historico.push(unidades);
 }
 return out;
}
function arredondar(x,casas=2){return Number(x.toFixed(casas));}
export function analisarVendasPremium(dados){
 const grupos=parseHistorico(dados?.historico);
 const cenario=numero(dados?.cenario??0,'cenário',{min:-40,max:100});
 const margemMeta=numero(dados?.margemMeta??15,'margem meta',{min:0,max:60});
 const itens=[];
 for(const [sku,rows] of grupos){
  const ultimo=rows.at(-1);
  const v=rows.map(r=>r.unidades);
  const modelo=selecionarModelo(v);
  const previsão=simularUnidades(v,modelo.nome,cenario);
  const {preco,cmv,comissao_pct,tarifa_fixa,frete,ads_un,imposto_pct,perdas_pct,estoque,prazo_dias}=ultimo;
  const despesasVariaveis=cmv+tarifa_fixa+frete+ads_un+
    preco*(comissao_pct+imposto_pct+perdas_pct)/100;
  const margemUnitaria=preco-despesasVariaveis;
  const margemPercentual=100*margemUnitaria/preco;
  const divisor=1-(comissao_pct+imposto_pct+perdas_pct+margemMeta)/100;
  const precoMeta=divisor>0?(cmv+tarifa_fixa+frete+ads_un)/divisor:null;
  const consumoDia=previsão[0]/30;
  const pontoPedido=Math.ceil(consumoDia*(prazo_dias+10));
  const compraSugerida=Math.max(0,pontoPedido-estoque);
  const receitaHist=rows.slice(-3).reduce((a,r)=>a+r.unidades*r.preco,0);
  const lucroHist=rows.slice(-3).reduce((a,r)=>{
   const custo=r.cmv+r.tarifa_fixa+r.frete+r.ads_un+r.preco*(r.comissao_pct+r.imposto_pct+r.perdas_pct)/100;
   return a+r.unidades*(r.preco-custo);
  },0);
  itens.push({
   sku,mesesHistorico:rows.length,ultimoMes:proximoMes(ultimo.mes),
   volumeUltimos3:rows.slice(-3).reduce((a,r)=>a+r.unidades,0),
   receitaHistorica:arredondar(receitaHist),margemHistorica:arredondar(lucroHist),
   preco,cmv,modelo:modelo.nome,erroBacktestPercentual:modelo.erro===null?null:arredondar(modelo.erro,1),
   projecaoUnidades:previsão,receitaProjetada:arredondar(previsão.reduce((a,n)=>a+n*preco,0)),
   lucroProjetado:arredondar(previsão.reduce((a,n)=>a+n*margemUnitaria,0)),
   margemUnitaria:arredondar(margemUnitaria),margemPercentual:arredondar(margemPercentual,1),
   precoParaMeta:precoMeta===null?null:arredondar(precoMeta),
   estoque,prazoDias:prazo_dias,pontoPedido,compraSugerida,
   risco: margemUnitaria<0?'Margem negativa':estoque<pontoPedido?'Ruptura possível':margemPercentual<margemMeta?'Margem abaixo da meta':'Monitorar',
  });
 }
 itens.sort((a,b)=>b.receitaHistorica-a.receitaHistorica);
 const totalReceita=itens.reduce((s,i)=>s+i.receitaHistorica,0),abc={A:0,B:0,C:0};let acumulado=0;
 for(const [indice,item] of itens.entries()){
  const anterior=acumulado;acumulado+=item.receitaHistorica;
  const frac=totalReceita?anterior/totalReceita:0;
  item.classeABC=totalReceita===0?'C':frac<.80?'A':frac<.95?'B':'C';
  abc[item.classeABC]++;
  const recomendações=[];
  if(item.margemUnitaria<0)recomendações.push('Interromper expansão e revisar custos, frete e taxas.');
  else if(item.margemPercentual<margemMeta)recomendações.push('Revisar preço/campanha para alcançar a margem-meta.');
  if(item.compraSugerida>0)
   recomendações.push('Simular reposição de '+item.compraSugerida+' unidades para cobrir prazo e dez dias de segurança.');
  if(item.classeABC==='A'&&item.margemUnitaria>0)recomendações.push('Priorizar disponibilidade: SKU de alta participação na receita.');
  if(item.erroBacktestPercentual!==null&&item.erroBacktestPercentual>40)
   recomendações.push('Baixa previsibilidade histórica: revisar sazonalidade e demanda manualmente.');
  item.recomendacoes=recomendações.length?recomendações:['Acompanhar margem, estoque e comportamento de vendas.'];
  item.ordem=indice+1;
 }
 const totalPrevisto=itens.reduce((s,i)=>s+i.receitaProjetada,0);
 const totalLucro=itens.reduce((s,i)=>s+i.lucroProjetado,0);
 return {versao:'1.0',tipo:'simulacao',skuTotal:itens.length,cenario,metaMargem:margemMeta,
  receitaProjetada:arredondar(totalPrevisto),lucroProjetado:arredondar(totalLucro),
  margemProjetadaPercentual:totalPrevisto?arredondar(totalLucro/totalPrevisto*100,1):0,
  skusEmRisco:itens.filter(x=>x.risco!=='Monitorar').length,
  abc,itens,
  avisos:[
   'Projeção estatística, não promessa de vendas. Média móvel/trend escolhida por erro histórico quando houver dados suficientes.',
   'Use mensalmente dados completos, incluindo meses com vendas zero. Estornos, despesas fixas e tributação específicos não incluídos.',
   'As porcentagens de taxas, perdas esperadas e Ads por unidade são informadas pelo vendedor; não consultamos tarifas em tempo real.',
   'Ponto de pedido usa consumo previsto em 30 dias, prazo de reposição informado e dez dias fixos de segurança.',
   'ABC é calculado pelo faturamento dos últimos três meses, não pela margem nem por cota de mercado.',
   'Esta API analisa os dados em memória e não grava seu CSV no banco de dados.',
  ]};
}
