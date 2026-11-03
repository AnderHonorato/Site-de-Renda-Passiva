/** F210 — estoque ABC/XYZ: interface; cálculos privados no servidor. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {lerDadosTexto} from '../cálculos/importar-planilha.js';
import {api,ErroApi} from '../núcleo/api.js';

const CAMPOS=['sku','demanda_mensal','preco','custo','estoque','prazo_dias','seguranca_dias','recebimentos','pedidos_pendentes','fatores_sazonais'];
export const EXEMPLO_ESTOQUE=[
 CAMPOS.join(';'),
 'CAMISETA-M;80|95|110;119,90;64;70;10;7;20;4;1|1|1',
 'JAQUETA-G;15|23|11;249;155;8;18;7;0;0;1|1,2|0,8',
 'BONE-VERMELHO;4|0|8;79;35;2;12;10;0;0;1|1|1',
].join('\n');
const moeda=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function numero(texto,campo,max,{inteiro=false}={}){
 let v=String(texto??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(v))v=v.replace(/\./g,'').replace(',','.');
 else if(/^\d+(?:,\d+)?$/.test(v))v=v.replace(',','.');
 if(!/^\d+(?:\.\d+)?$/.test(v))throw new ErroDeEntrada(campo+': número inválido.','tabela');
 const n=Number(v);
 if(!Number.isFinite(n)||n<0||n>max||(inteiro&&!Number.isInteger(n)))
  throw new ErroDeEntrada(campo+': valor fora do limite.','tabela');
 return n;
}
function lista(texto,campo,min,max,limite,{inteiro=false}={}){
 const partes=String(texto??'').split('|').map(v=>v.trim());
 if(partes.length<min||partes.length>max||partes.some(v=>!v))
  throw new ErroDeEntrada(campo+': informe de '+min+' a '+max+' valores separados por |.','tabela');
 return partes.map(v=>numero(v,campo,limite,{inteiro}));
}
export function lerEntradaEstoque(texto,horizonte=3){
 if(!Number.isInteger(horizonte)||horizonte<1||horizonte>12)
  throw new ErroDeEntrada('O horizonte deve ter de 1 a 12 meses.','horizonte');
 if(typeof texto!=='string'||!texto.trim()||texto.length>260000)
  throw new ErroDeEntrada('Cole um CSV/TSV de até 260 mil caracteres.','tabela');
 let dados;
 try{dados=lerDadosTexto(texto).linhas;}
 catch(e){throw new ErroDeEntrada('Não foi possível ler o CSV/TSV: '+e.message,'tabela');}
 if(dados.length<2||dados.length>501)
  throw new ErroDeEntrada('Informe de 1 a 500 SKUs, além do cabeçalho.','tabela');
 const cab=dados[0].map(v=>v.trim().toLowerCase());
 const faltantes=CAMPOS.filter(c=>!cab.includes(c));
 if(faltantes.length)throw new ErroDeEntrada('Colunas ausentes: '+faltantes.join(', ')+'.','tabela');
 if(new Set(cab).size!==cab.length)throw new ErroDeEntrada('Cabeçalho duplicado.','tabela');
 const pos=Object.fromEntries(CAMPOS.map(c=>[c,cab.indexOf(c)])), vistos=new Set();
 const itens=dados.slice(1).map((linha,k)=>{
  const campo=c=>String(linha[pos[c]]??'').trim(), prefixo='Linha '+(k+2);
  const sku=campo('sku');
  if(!/^[-\w.]{1,64}$/.test(sku)||vistos.has(sku))
   throw new ErroDeEntrada(prefixo+': SKU inválido ou repetido.','tabela');
  vistos.add(sku);
  const item={
   sku,demandaMensal:lista(campo('demanda_mensal'),prefixo+' demanda',3,24,1e8,{inteiro:true}),
   preco:numero(campo('preco'),prefixo+' preço',1e9),
   custo:numero(campo('custo'),prefixo+' custo',1e9),
   estoque:numero(campo('estoque'),prefixo+' estoque',1e8,{inteiro:true}),
   prazoDias:numero(campo('prazo_dias'),prefixo+' prazo',365),
   segurancaDias:numero(campo('seguranca_dias'),prefixo+' segurança',180),
   recebimentos:numero(campo('recebimentos'),prefixo+' recebimentos',1e8,{inteiro:true}),
   pedidosPendentes:numero(campo('pedidos_pendentes'),prefixo+' pedidos',1e8,{inteiro:true}),
  };
  if(campo('fatores_sazonais'))
   item.sazonalidade=lista(campo('fatores_sazonais'),prefixo+' sazonalidade',horizonte,horizonte,5);
  return item;
 });
 const entrada={horizonteMeses:horizonte,itens};
 if(new TextEncoder().encode(JSON.stringify(entrada)).length>290000)
  throw new ErroDeEntrada('O arquivo ultrapassa o limite da API. Divida em lotes.','tabela');
 return entrada;
}
export function tabelaCompletaEstoque(r){
 if(!r||!Array.isArray(r.itens)||!Number.isInteger(r.horizonteMeses)||
    r.horizonteMeses<1||r.horizonteMeses>12)
  throw new ErroDeEntrada('O servidor devolveu um relatório inesperado.','tabela');
 const cab=['SKU','ABC','XYZ','Classe ABC/XYZ','Prioridade','Demanda média/mês','CV (%)',
  'Valor de consumo anual','Preço','Custo','Estoque','Recebimentos','Pedidos pendentes',
  'Posição do estoque','Prazo (dias)','Segurança (dias)','Ponto de pedido',
  'Reposição sugerida','Custo de reposição',
  ...Array.from({length:r.horizonteMeses},(_,i)=>'Previsão M'+(i+1)),
  'Demanda do horizonte','Alertas'];
 return [cab,...r.itens.map(i=>[
  i.sku,i.classeABC,i.classeXYZ,i.classeCombinada,i.prioridade,i.mediaMensal,
  i.coeficienteVariacao===null?'n/d':Math.round(i.coeficienteVariacao*10000)/100,
  i.valorConsumoAnual,i.preco,i.custo,i.estoque,i.recebimentos,i.pedidosPendentes,
  i.posicaoEstoque,i.prazoDias,i.segurancaDias,i.pontoPedido,i.reposicaoSugerida,
  i.custoReposicao,...i.demandaPrevista,i.demandaHorizonte,i.alertas.join(' | ')
 ])];
}
export function exibirPlanejamentoEstoque(r){
 const tabela=tabelaCompletaEstoque(r);
 const comAlertas=r.itens.filter(i=>i.alertas.length).length;
 const prioritarios=r.itens.filter(i=>i.prioridade==='alta').length;
 const linhas=[
  ['SKUs analisados',String(r.totalSkus)],
  ['Reposição estimada',moeda(r.investimentoReposicao)],
  ['Valor anual estimado de consumo',moeda(r.valorConsumoAnual)],
  ['Produtos com alertas',String(comAlertas)],
  ['Prioridade alta',String(prioritarios)],
  ['Horizonte',r.horizonteMeses+' mês(es)'],
 ];
 return {
  valor:moeda(r.investimentoReposicao),
  resumo:'Planejamento ABC/XYZ · '+r.totalSkus+' produtos.',
  linhas,
  tabela:{cabeçalho:tabela[0].slice(0,9),linhas:tabela.slice(1,19).map(i=>i.slice(0,9)),semExportação:true},
  texto:['Planejamento ABC/XYZ',...linhas.map(l=>l.join(': ')),
    ...r.itens.flatMap(i=>[i.sku+' · '+i.classeCombinada+' · '+i.reposicaoSugerida+' un. · '+moeda(i.custoReposicao),
     ...i.alertas.map(a=>'  - '+a)]),...r.avisos].join('\n'),
  observações:['A prévia mostra até 18 SKUs; os arquivos incluem todos os produtos.',...r.avisos,
   'Estimativa gerencial. Revise lotes mínimos e prazos reais. O CSV não é salvo na conta.'],
  arquivos:[
   {rótulo:'Baixar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(tabela,'estoque-abc-xyz')},
   {rótulo:'Baixar Excel completo',ícone:'planilha',
    gerar:()=>baixarPlanilha(tabela,'estoque-abc-xyz',{aba:'Planejamento por SKU'})},
  ],
 };
}
export default{
 instruções:{
  passos:[
   'Entre no portal com API Node e conta Premium. A prévia do GitHub Pages não executa análises privadas.',
   'Cole um CSV/TSV de até 500 SKUs. Para cada produto, informe entre 3 e 24 demandas mensais separadas por |, incluindo meses sem vendas.',
   'Informe preço, custo, estoque, prazo de entrega, segurança, recebimentos e pedidos pendentes. Selecione um horizonte de 1 a 12 meses.',
   'Opcionalmente, informe um fator sazonal para cada mês futuro, separado por |. Use 1 para demanda normal e 1,2 para aumento de 20%; célula vazia usa fatores 1.',
   'Analise ABC/XYZ, pontos de pedido, alertas e investimento estimado. Exporte a tabela completa para CSV ou Excel.',
  ],
  exemplo:{texto:'CAMISETA-M teve demandas de 80, 95 e 110 unidades. Com 70 em estoque e prazo de entrega de 10 dias, o sistema estima compras e a classe ABC/XYZ em comparação com os demais SKUs.'},
  limites:'Recurso Premium com API autenticada. Até 500 SKUs, 260 mil caracteres, 3 a 24 meses históricos por SKU e 1 a 12 meses projetados. O motor privado não consulta fornecedores nem grava dados comerciais na conta. ABC depende de preço e consumo estimado; XYZ usa volatilidade e sazonalidade manual. Não representa uma ordem automática de compra.',
  perguntas:[
   {p:'Qual a diferença entre ABC e XYZ?',r:'ABC ordena produtos pelo valor de consumo estimado; XYZ aponta a variação das demandas. Juntas, ajudam a escolher prioridades.'},
   {p:'Como informar sazonalidade?',r:'Use um fator por mês, separado por |; deixe a célula vazia para manter todos os fatores em 1.'},
   {p:'A ferramenta compra produtos ou consulta meu ERP?',r:'Não. A ferramenta importa apenas dados fornecidos, estima e exporta um relatório para conferência.'},
   {p:'Por que não funciona no GitHub Pages?',r:'A análise exige um servidor com autenticação Premium. O GitHub Pages exibe somente páginas estáticas.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Planejar estoque Premium',demorada:true,
   permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'horizonte',rótulo:'Horizonte da previsão (meses)',tipo:'número',padrão:'3',
     dica:'De 1 a 12 meses. Fatores sazonais devem ter exatamente essa quantidade.'},
    {nome:'tabela',rótulo:'Histórico e estoque dos produtos (CSV/TSV)',tipo:'área',linhas:10,
     padrão:EXEMPLO_ESTOQUE,dica:'A demanda mensal e a sazonalidade são separadas por |.'},
   ],
   calcular:async dados=>{
    const horizonte=String(dados.horizonte??'').trim();
    if(!/^\d+$/.test(horizonte))
     throw new ErroDeEntrada('Informe um horizonte inteiro de 1 a 12.','horizonte');
    const entrada=lerEntradaEstoque(String(dados.tabela??''),Number(horizonte));
    try{
     const resposta=await api('/api/premium/planejamento-estoque',{metodo:'POST',dados:entrada,prazoMs:25000});
     return exibirPlanejamentoEstoque(resposta.relatorio);
    }catch(e){
     if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Entre na sua conta para usar o planejamento Premium.','tabela');
     if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('Análise exclusiva do plano Premium. Consulte Planos.','tabela');
     if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Revise os dados da tabela: '+e.message,'tabela');
     if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('O servidor Premium não está disponível nesta hospedagem estática.','tabela');
     throw e;
    }
   },
   aoMontar(){
    const aviso=document.createElement('aside');aviso.className='premium-recurso';
    const texto=document.createElement('p');
    texto.textContent='Premium · Planejamento de até 500 SKUs com matriz ABC/XYZ, sazonalidade, compras e exportação. Requer API autenticada.';
    const link=document.createElement('a');link.href='../../planos.html';link.className='botão botão--linha';link.textContent='Ver planos';
    aviso.append(texto,link);raiz.querySelector('#formulário').before(aviso);
   },
  });
 },
};
