/** Ticket médio, taxa de conversão e cenários de melhoria de vendas. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export function analisarVendas({faturamentoCentavos,pedidos,atendimentos,aumentoTicket=0,aumentoConversao=0}){
 if(!Number.isSafeInteger(faturamentoCentavos)||faturamentoCentavos<0||faturamentoCentavos>10_000_000_000)
  throw new ErroDeEntrada('Faturamento inválido.', 'faturamento');
 if(!Number.isSafeInteger(pedidos)||pedidos<0||pedidos>1_000_000)
  throw new ErroDeEntrada('Número de pedidos inválido.', 'pedidos');
 if(!Number.isSafeInteger(atendimentos)||atendimentos<0||atendimentos>100_000_000||atendimentos>0&&pedidos>atendimentos)
  throw new ErroDeEntrada('Os pedidos não podem superar os atendimentos informados.', 'atendimentos');
 if(faturamentoCentavos>0&&pedidos===0)
  throw new ErroDeEntrada('Há faturamento, mas nenhum pedido informado.', 'pedidos');
 if(!Number.isFinite(aumentoTicket)||aumentoTicket<0||aumentoTicket>1000)
  throw new ErroDeEntrada('Melhoria de ticket deve estar entre 0% e 1000%.', 'aumentoTicket');
 if(!Number.isFinite(aumentoConversao)||aumentoConversao<0||aumentoConversao>1000)
  throw new ErroDeEntrada('Melhoria de conversão deve estar entre 0% e 1000%.', 'aumentoConversao');
 const ticketCentavos=pedidos>0?faturamentoCentavos/pedidos:null;
 const conversao=atendimentos>0?pedidos/atendimentos:null;
 const ticketProjetadoCentavos=ticketCentavos===null?null:ticketCentavos*(1+aumentoTicket/100);
 const conversaoProjetada=conversao===null?null:Math.min(1,conversao*(1+aumentoConversao/100));
 const pedidosEstimados=conversaoProjetada===null?null:atendimentos*conversaoProjetada;
 const faturamentoProjetadoCentavos=pedidosEstimados===null||ticketProjetadoCentavos===null?
  null:Math.round(pedidosEstimados*ticketProjetadoCentavos);
 return {faturamentoCentavos,pedidos,atendimentos,ticketCentavos,conversao,
  ticketProjetadoCentavos,conversaoProjetada,pedidosEstimados,faturamentoProjetadoCentavos,
  ganhoProjetadoCentavos:faturamentoProjetadoCentavos===null?null:faturamentoProjetadoCentavos-faturamentoCentavos};
}
const reais=(centavos)=>centavos===null?'Não calculável':formatarMoeda(centavos/100);
const taxa=(proporcao)=>proporcao===null?'Não calculável':formatarNúmero(proporcao*100,{casas:2})+'%';
export function calcularTicketNaTela(dados){
 const faturamento=número(dados,'faturamento',{rótulo:'Faturamento (R$)',mín:0});
 const pedidos=número(dados,'pedidos',{rótulo:'Pedidos fechados',mín:0,inteiro:true});
 const atendimentos=número(dados,'atendimentos',{rótulo:'Atendimentos ou visitantes',mín:0,inteiro:true,obrigatório:false,padrão:0});
 const aumentoTicket=número(dados,'aumentoTicket',{rótulo:'Melhoria do ticket (%)',mín:0,máx:1000,obrigatório:false,padrão:0});
 const aumentoConversao=número(dados,'aumentoConversao',{rótulo:'Melhoria da conversão (%)',mín:0,máx:1000,obrigatório:false,padrão:0});
 if(faturamento>100_000_000)throw new ErroDeEntrada('Faturamento acima de R$ 100 milhões.','faturamento');
 const r=analisarVendas({faturamentoCentavos:emCentavos(faturamento),pedidos,atendimentos,
  aumentoTicket,aumentoConversao});
 const linhas=[
  ['Ticket médio atual',reais(r.ticketCentavos)],
  ['Taxa de conversão atual',taxa(r.conversao)],
  ['Ticket médio com melhoria',reais(r.ticketProjetadoCentavos)],
  ['Conversão com melhoria (limitada a 100%)',taxa(r.conversaoProjetada)],
  ['Pedidos estimados no cenário',r.pedidosEstimados===null?'Não calculável':
   formatarNúmero(r.pedidosEstimados,{casas:2})],
  ['Faturamento estimado no cenário',reais(r.faturamentoProjetadoCentavos)],
  ['Variação estimada da receita',reais(r.ganhoProjetadoCentavos)],
 ];
 const observações=[
  'Ticket médio = faturamento ÷ número de pedidos. Conversão = pedidos ÷ atendimentos/visitantes.',
  'Melhorias são aumentos percentuais relativos, não pontos percentuais. Ex.: conversão de 10% com aumento de 20% passa a 12%.',
  'Combinamos as duas melhorias sobre o mesmo volume de visitantes; a conversão projetada não pode superar 100%.',
  r.conversao===null?'Sem quantidade de visitantes, não é possível estimar conversão ou faturamento projetado.':
   r.ticketCentavos===null?'Sem pedidos fechados, não existe ticket médio para projetar.':
   'O cenário é uma simulação matemática, não uma previsão garantida de vendas.',
 ];
 return {valor:reais(r.ticketCentavos),resumo:'Ticket de '+reais(r.ticketCentavos)+
  ', conversão de '+taxa(r.conversao)+'.',linhas,observações,
  texto:['Ticket médio e conversão',...linhas.map(([k,v])=>k+': '+v),...observações].join('\n')};
}
export default{
 instruções:{
  passos:[
   'Informe o faturamento e a quantidade de pedidos fechados no período.',
   'Informe o número de atendimentos ou visitantes medidos no mesmo período (opcional).',
   'Indique, se quiser, o aumento percentual esperado do ticket médio e da conversão.',
   'Compare os números atuais com o cenário de faturamento estimado e copie o relatório.',
  ],
  exemplo:{texto:'R$ 10.000,00 de receita em 100 pedidos e 1.000 visitantes: ticket médio R$ 100,00 e conversão 10%. '
    +'Com ticket 10% maior e conversão 20% maior, a projeção é de R$ 13.200,00 para os mesmos 1.000 visitantes.'},
  limites:'O número de pedidos não pode superar o número de atendimentos informado. '
   +'Sem pedidos não há ticket médio; sem atendimentos não há taxa de conversão nem cenário de receita. '
   +'O cenário mantém o público constante e não prevê flutuações reais do negócio.',
  perguntas:[
   {p:'O aumento de 20% é em pontos percentuais?',r:'Não. Uma conversão de 10% aumentada em 20% vira 12%, não 30%.'},
   {p:'Posso ter conversão sem informar visitantes?',r:'Não. A ferramenta sinaliza que a conversão é não calculável.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Analisar vendas',
   campos:[
    {nome:'faturamento',rótulo:'Faturamento do período (R$)',tipo:'número',padrão:'10000'},
    {nome:'pedidos',rótulo:'Pedidos fechados no período',tipo:'número',padrão:'100'},
    {nome:'atendimentos',rótulo:'Atendimentos ou visitantes no período (opcional)',tipo:'número',padrão:'1000'},
    {nome:'aumentoTicket',rótulo:'Melhoria simulada no ticket médio (%)',tipo:'número',padrão:'10'},
    {nome:'aumentoConversao',rótulo:'Melhoria simulada na conversão (%)',tipo:'número',padrão:'20'},
   ],calcular:calcularTicketNaTela});
 },
};
