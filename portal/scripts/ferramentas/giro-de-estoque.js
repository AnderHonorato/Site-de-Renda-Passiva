/** Giro de estoque pelo custo de mercadorias vendidas e custo médio estocado. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
const nº=(x,casas=2)=>formatarNúmero(x,{casas});

export function calcularGiro({ cmv, estoqueMedio, dias }) {
  for(const [campo,valor,max] of [['cmv',cmv,1_000_000_000],['estoqueMedio',estoqueMedio,1_000_000_000],['dias',dias,366]]) {
    if(!Number.isFinite(valor)||valor<0||valor>max)throw new ErroDeEntrada('Valor inválido ou acima do limite.',campo);
  }
  if(!Number.isInteger(dias)||dias<1)throw new ErroDeEntrada('Informe de 1 a 366 dias.', 'dias');
  if (cmv > 0 && estoqueMedio === 0) throw new ErroDeEntrada('O estoque médio não pode ser zero com vendas registradas.', 'estoqueMedio');
  const giro = estoqueMedio > 0 ? cmv / estoqueMedio : null;
  const diasDeEstoque = giro && giro > 0 ? dias / giro : null;
  return { giro, diasDeEstoque, cmv, estoqueMedio, dias };
}

export function calcularGiroNaTela(dados) {
  const cmv=número(dados,'cmv',{rótulo:'Custo das mercadorias vendidas (R$)',mín:0,máx:1_000_000_000});
  const estoqueMedio=número(dados,'estoqueMedio',{rótulo:'Estoque médio ao custo (R$)',mín:0,máx:1_000_000_000});
  const dias=número(dados,'dias',{rótulo:'Duração do período (dias)',mín:1,máx:366,inteiro:true});
  const r=calcularGiro({cmv,estoqueMedio,dias});
  const linhas=[
    ['Custo das mercadorias vendidas (CMV)',formatarMoeda(cmv)],
    ['Estoque médio ao custo',formatarMoeda(estoqueMedio)],
    ['Giro de estoque',r.giro===null?'Não calculável':nº(r.giro,3)+' vez(es) no período'],
    ['Tempo médio de estoque',r.diasDeEstoque===null?'Não calculável':nº(r.diasDeEstoque,2)+' dias'],
  ];
  const obs=[
    'Giro = custo das mercadorias vendidas ÷ estoque médio avaliado ao custo. Compare sempre valores na mesma base.',
    'Dias médios de estoque = dias do período ÷ giro. Com zero vendas, a permanência não é estimável.',
    'Não confunda faturamento com CMV; o cálculo precisa do custo dos produtos vendidos, não do preço de venda.',
    'Um giro maior nem sempre é melhor: pode significar maior risco de ruptura. Compare períodos e produtos similares.',
  ];
  return {valor:r.giro===null?'Não calculável':nº(r.giro,3)+' ×',resumo:'Indicador do giro para '+dias+' dias.',
    linhas,observações:obs,texto:['Giro de estoque',...linhas.map(([a,b])=>a+': '+b),...obs].join('\n')};
}
export default{
 instruções:{
  passos:[
    'Informe o CMV do período: custo dos itens efetivamente vendidos, não a receita.',
    'Informe o estoque médio em reais, também avaliado pelo custo.',
    'Indique quantos dias o período possui (30, 90, 365, etc.).',
    'Confira quantas vezes o estoque girou e a permanência média em dias.',
  ],
  exemplo:{texto:'CMV de R$ 120.000 e estoque médio de R$ 30.000 em 90 dias: giro de 4 vezes e permanência média de 22,5 dias.'},
  limites:'A comparação exige CMV e estoque médio usando a mesma base de custo. Com estoque médio zero e CMV positivo, não é possível calcular. Não consulta estoque real nem integra com ERP.',
  perguntas:[
   {p:'Posso usar meu faturamento?',r:'Não. Se o estoque está registrado ao custo, use também o custo das mercadorias vendidas.'},
   {p:'Giro baixo é sempre ruim?',r:'Não necessariamente. Sazonalidade, prazo de reposição e características dos produtos alteram a interpretação.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Analisar giro',
   campos:[
    {nome:'cmv',rótulo:'CMV no período (R$)',tipo:'número',padrão:'120000'},
    {nome:'estoqueMedio',rótulo:'Estoque médio ao custo (R$)',tipo:'número',padrão:'30000'},
    {nome:'dias',rótulo:'Dias do período',tipo:'número',padrão:'90'},
   ],calcular:calcularGiroNaTela});
 },
};
