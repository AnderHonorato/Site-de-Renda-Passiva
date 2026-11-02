/** Meta de faturamento: distribuição entre dias úteis e vendedores. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const reais=(centavos)=>formatarMoeda(centavos/100);
export function distribuirMeta({metaCentavos,faturadoCentavos,diasUteis,diasRestantes,vendedores,ticketCentavos}) {
 if (![metaCentavos,faturadoCentavos,ticketCentavos].every(Number.isSafeInteger)
   || metaCentavos<=0 || metaCentavos>10_000_000_000
   || faturadoCentavos<0 || faturadoCentavos>10_000_000_000
   || ticketCentavos<0 || ticketCentavos>100_000_000) {
  throw new ErroDeEntrada('Valores financeiros inválidos ou acima do limite.', 'meta');
 }
 if (!Number.isInteger(diasUteis)||diasUteis<1||diasUteis>31) {
  throw new ErroDeEntrada('Informe de 1 a 31 dias úteis no mês.', 'dias');
 }
 if (!Number.isInteger(diasRestantes)||diasRestantes<0||diasRestantes>diasUteis) {
  throw new ErroDeEntrada('Dias úteis restantes devem estar entre zero e o total do mês.', 'restantes');
 }
 if (!Number.isInteger(vendedores)||vendedores<1||vendedores>10000) {
  throw new ErroDeEntrada('Informe de 1 a 10.000 vendedores.', 'vendedores');
 }
 const restanteCentavos=Math.max(0,metaCentavos-faturadoCentavos);
 const atingida=faturadoCentavos>=metaCentavos;
 const precisaDiaria=restanteCentavos>0 && diasRestantes>0;
 const porDiaCentavos=precisaDiaria?Math.ceil(restanteCentavos/diasRestantes):null;
 const porVendedorCentavos=restanteCentavos>0?Math.ceil(restanteCentavos/vendedores):0;
 const porDiaVendedorCentavos=precisaDiaria?Math.ceil(restanteCentavos/(diasRestantes*vendedores)):null;
 const semanaCentavos=precisaDiaria?Math.min(restanteCentavos,porDiaCentavos*Math.min(5,diasRestantes)):null;
 const vendasRestantes=ticketCentavos>0?Math.ceil(restanteCentavos/ticketCentavos):null;
 const vendasPorDia=vendasRestantes!==null&&diasRestantes>0?Math.ceil(vendasRestantes/diasRestantes):null;
 return {metaCentavos,faturadoCentavos,restanteCentavos,percentualAtingido:faturadoCentavos/metaCentavos*100,
  atingida, prazoEsgotado:restanteCentavos>0&&diasRestantes===0,
  porDiaCentavos,porVendedorCentavos,porDiaVendedorCentavos,semanaCentavos,vendasRestantes,vendasPorDia,
  diasUteis,diasRestantes,vendedores,ticketCentavos};
}
export function calcularMetaNaTela(dados){
 const meta=número(dados,'meta',{rótulo:'Meta mensal (R$)',mín:0});
 const faturado=número(dados,'faturado',{rótulo:'Faturamento já realizado (R$)',mín:0,obrigatório:false,padrão:0});
 const dias=número(dados,'dias',{rótulo:'Dias úteis no mês',mín:1,máx:31,inteiro:true});
 const restantes=número(dados,'restantes',{rótulo:'Dias úteis restantes',mín:0,máx:dias,inteiro:true});
 const vendedores=número(dados,'vendedores',{rótulo:'Vendedores',mín:1,máx:10000,inteiro:true});
 const ticket=número(dados,'ticket',{rótulo:'Ticket médio (R$)',mín:0,obrigatório:false,padrão:0});
 if(meta>100_000_000||faturado>100_000_000||ticket>1_000_000)throw new ErroDeEntrada('Valor acima do limite.',meta>100_000_000?'meta':faturado>100_000_000?'faturado':'ticket');
 const r=distribuirMeta({metaCentavos:emCentavos(meta),faturadoCentavos:emCentavos(faturado),
  diasUteis:dias,diasRestantes:restantes,vendedores,ticketCentavos:emCentavos(ticket)});
 const indisponivel='Sem dias úteis restantes';
 const linhas=[
  ['Meta do mês',reais(r.metaCentavos)],
  ['Faturamento realizado',reais(r.faturadoCentavos)],
  ['Falta para a meta',reais(r.restanteCentavos)],
  ['Progresso da meta',formatarNúmero(r.percentualAtingido,{casas:2})+'%'],
  ['Meta por dia útil restante',r.porDiaCentavos===null?(r.atingida?reais(0):indisponivel):reais(r.porDiaCentavos)],
  ['Meta para os próximos até 5 dias úteis',r.semanaCentavos===null?(r.atingida?reais(0):indisponivel):reais(r.semanaCentavos)],
  ['Meta restante por vendedor',reais(r.porVendedorCentavos)],
  ['Meta diária por vendedor',r.porDiaVendedorCentavos===null?(r.atingida?reais(0):indisponivel):reais(r.porDiaVendedorCentavos)],
  ['Vendas restantes pelo ticket informado',r.vendasRestantes===null?'Informe ticket médio':formatarNúmero(r.vendasRestantes,{casas:0})],
  ['Vendas por dia útil restante',r.vendasPorDia===null?(r.atingida?'0':indisponivel):formatarNúmero(r.vendasPorDia,{casas:0})],
 ];
 const observações=[
  r.atingida?'A meta já foi alcançada ou superada.':
  r.prazoEsgotado?'O prazo terminou com meta pendente: reajuste o planejamento ou a data de fechamento.':
  'A meta restante foi distribuída entre os dias úteis e vendedores informados.',
  'Uma semana de planejamento considera até cinco dias úteis restantes; não representa obrigatoriamente uma semana de calendário.',
  'Metas monetárias diárias são arredondadas para cima no centavo. Vendas estimadas dependem do ticket médio informado.',
  'Esta ferramenta não consulta vendas reais e não integra com marketplace ou sistema de gestão.',
 ];
 return {valor:reais(r.restanteCentavos),resumo:r.atingida?'Meta atingida.':r.prazoEsgotado?'Prazo sem dias úteis restantes.':
  'Falta atingir '+reais(r.restanteCentavos)+' em '+r.diasRestantes+' dia(s) útil(eis).',
  linhas,observações,texto:['Meta de faturamento',...linhas.map(([nome,valor])=>nome+': '+valor),...observações].join('\n')};
}
export default{
 instruções:{
  passos:[
   'Defina a meta mensal e quanto já foi faturado.',
   'Informe quantos dias úteis existem no mês e quantos ainda restam.',
   'Informe a quantidade de vendedores e, opcionalmente, o ticket médio.',
   'Confira as metas por dia, por vendedor, para os próximos cinco dias úteis e o número de vendas necessárias.',
  ],
  exemplo:{texto:'Meta de R$ 30.000,00, com R$ 10.000,00 realizados e 10 dias úteis restantes: faltam R$ 20.000,00. '
   +'A meta diária é R$ 2.000,00; com dois vendedores, R$ 1.000,00 por vendedor ao dia.'},
  limites:'Até R$ 100 milhões em meta, 31 dias úteis por mês e 10.000 vendedores. '
   +'Quando não há dias restantes, a ferramenta sinaliza prazo esgotado, sem fingir que é possível dividir a meta por zero. '
   +'As vendas estimadas são um cálculo com o ticket informado e não uma previsão de demanda.',
  perguntas:[
   {p:'O que acontece se eu já bati a meta?',r:'A falta vira zero e a ferramenta informa que a meta já foi atingida.'},
   {p:'A meta semanal é uma semana de calendário?',r:'Não. É o montante de até cinco dos dias úteis restantes para apoiar o planejamento.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Planejar meta',
   campos:[
    {nome:'meta',rótulo:'Meta do mês (R$)',tipo:'número',padrão:'30000'},
    {nome:'faturado',rótulo:'Faturamento já realizado (R$)',tipo:'número',padrão:'10000'},
    {nome:'dias',rótulo:'Dias úteis no mês',tipo:'número',padrão:'22'},
    {nome:'restantes',rótulo:'Dias úteis restantes',tipo:'número',padrão:'10'},
    {nome:'vendedores',rótulo:'Quantidade de vendedores',tipo:'número',padrão:'2'},
    {nome:'ticket',rótulo:'Ticket médio por venda (R$), opcional',tipo:'número',padrão:'200'},
   ],calcular:calcularMetaNaTela});
 },
};
