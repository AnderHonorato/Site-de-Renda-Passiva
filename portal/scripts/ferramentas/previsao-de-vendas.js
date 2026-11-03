/** F117 — painel profissional Premium, cálculos protegidos pelo servidor. */
import { montarFerramenta, baixarCsv, baixarPlanilha, ErroDeEntrada } from '../núcleo/montador.js';
import { api, ErroApi } from '../núcleo/api.js';

const EXEMPLO=[
'sku;mes;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_un;imposto_pct;perdas_pct;estoque;prazo_dias',
'A001;2026-06;30;100;40;12;3;10;5;5;2;20;7',
'A001;2026-07;38;100;40;12;3;10;5;5;2;20;7',
'A001;2026-08;45;100;40;12;3;10;5;5;2;20;7',
'A001;2026-09;42;100;40;12;3;10;5;5;2;20;7',
'A001;2026-10;52;100;40;12;3;10;5;5;2;20;7',
'B002;2026-08;11;220;125;16;5;18;10;5;3;8;15',
'B002;2026-09;12;220;125;16;5;18;10;5;3;8;15',
'B002;2026-10;15;220;125;16;5;18;10;5;3;8;15',
].join('\n');
const moeda=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function tabelaCompleta(relatorio){
 const cab=['SKU','Classe ABC','Modelo','Erro backtest (%)','Previsão M1','M2','M3',
  'Receita prevista','Margem de contribuição projetada','Margem (%)','Ponto de pedido',
  'Estoque informado','Reposição sugerida','Preço para meta','Prioridade'];
 const rows=relatorio.itens.map(i=>[
  i.sku,i.classeABC,i.modelo,i.erroBacktestPercentual??'n/d',...i.projecaoUnidades,
  i.receitaProjetada,i.lucroProjetado,i.margemPercentual,i.pontoPedido,i.estoque,
  i.compraSugerida,i.precoParaMeta??'Inviável',i.risco,
 ]);
 return [cab,...rows];
}
export function exibirRelatorioPremium(r){
 if(!r||!Array.isArray(r.itens))throw new ErroDeEntrada('Relatório premium inesperado. Tente novamente.');
 const completo=tabelaCompleta(r);
 const avisos=[...r.avisos,'Apenas usuários Premium autenticados podem executar análises reais no servidor.',
  'Nenhuma tarifa de marketplace é buscada automaticamente: os percentuais precisam vir dos seus dados oficiais.'];
 return {
  valor:moeda(r.lucroProjetado),
  resumo:'Margem de contribuição estimada para 3 meses · '+r.skuTotal+' SKUs.',
  linhas:[['Receita prevista em 3 meses',moeda(r.receitaProjetada)],
   ['Margem de contribuição',moeda(r.lucroProjetado)],
   ['Margem sobre vendas',r.margemProjetadaPercentual+'%'],
   ['Produtos com alertas',String(r.skusEmRisco)],
   ['ABC · A / B / C',r.abc.A+' / '+r.abc.B+' / '+r.abc.C]],
  tabela:{cabeçalho:completo[0].slice(0,11),linhas:completo.slice(1,16).map(x=>x.slice(0,11)),semExportação:true},
  observações:avisos,
  texto:[
   'Resumo de inteligência por SKU','Lucro projetado (contribuição): '+moeda(r.lucroProjetado),
   ...r.itens.flatMap(i=>[i.sku+' · Classe '+i.classeABC+' · '+i.risco,
    ...i.recomendacoes.map(a=>'  - '+a)]),...avisos,
  ].join('\n'),
  arquivos:[
   {rótulo:'Baixar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(completo,'inteligencia-vendas-premium')},
   {rótulo:'Baixar Excel completo',ícone:'planilha',gerar:()=>baixarPlanilha(completo,'inteligencia-vendas-premium',{aba:'Análise por SKU'})},
  ],
 };
}
export default {
 instruções:{
  passos:[
   'Acesse pelo portal com servidor ativo e conta Premium. A prévia do GitHub Pages não processa relatórios premium.',
   'Cole um CSV/TSV mensal com SKU, mês, unidades, preço, CMV, comissão, tarifa, frete, Ads, impostos, perdas, estoque e prazo de reposição. O exemplo usa dados fictícios.',
   'Use de 3 a 24 meses consecutivos por SKU, incluindo meses sem vendas. Informe cenário de crescimento e meta de margem.',
   'Analise os próximos 3 meses: modelo por SKU, margem real estimada, ABC, reposição, preço para meta e recomendações.',
   'Revise taxas e custos com os dados oficiais do seu marketplace antes de decidir e exporte CSV/Excel.',
  ],
  exemplo:{texto:'SKU A001 tem histórico crescente e custo unitário detalhado. A projeção compara média móvel e tendência quando há dados para backtest; também calcula margem após CMV, comissões, frete, Ads, perdas e imposto informado.'},
  limites:'Recurso Premium com autenticação no servidor, não disponível na prévia estática. Até 70 SKUs, 1.800 registros e 280 mil caracteres. Projeção de 3 meses, sem previsão de sazonalidade externa. Não busca tarifas em tempo real. A análise é estimativa gerencial, não conciliação contábil e não grava o CSV no banco de dados.',
  perguntas:[
   {p:'Por que o resultado não aparece no GitHub Pages?',r:'O cálculo completo é executado apenas no servidor autenticado, para proteger o plano Premium. A hospedagem estática não possui API nem contas ativas.'},
   {p:'O sistema conhece as taxas atuais de Mercado Livre ou Shopee?',r:'Não. Insira os percentuais, custos fixos e frete reais do seu anúncio. As taxas dependem de categoria, logística, plataforma e condições comerciais.'},
   {p:'O modelo usa inteligência artificial generativa?',r:'Não. Usa modelos estatísticos explicáveis e seleção por erro histórico quando os dados permitem. Não há custos de tokens ou promessas de precisão.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Gerar diagnóstico Premium',demorada:true,
   permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'cenario',rótulo:'Cenário de demanda (%)',tipo:'número',padrão:'0',
     dica:'De −40% a +100%. Altera a quantidade projetada.'},
    {nome:'margemMeta',rótulo:'Meta de margem (%)',tipo:'número',padrão:'15'},
    {nome:'historico',rótulo:'Histórico mensal de produtos (CSV/TSV)',tipo:'área',linhas:8,
     padrão:EXEMPLO,dica:'Até 70 SKUs e 24 meses por SKU; o CSV não fica salvo.'},
   ],
   calcular:async dados=>{
    if(String(dados.historico??'').length>280000)
     throw new ErroDeEntrada('CSV excedeu 280 mil caracteres.','historico');
    try {
     const r=await api('/api/premium/previsao-de-vendas',{
      metodo:'POST',dados:{historico:dados.historico,
       cenario:Number(dados.cenario),margemMeta:Number(dados.margemMeta)},
      prazoMs:25000,
     });
     return exibirRelatorioPremium(r.relatorio);
    }catch(erro){
     if(erro instanceof ErroApi&&erro.status===401)
      throw new ErroDeEntrada('Entre na sua conta para usar a análise Premium.','historico');
     if(erro instanceof ErroApi&&erro.status===403)
      throw new ErroDeEntrada('A análise completa é exclusiva do plano Premium. Consulte a página Planos.','historico');
     if(erro instanceof ErroApi&&erro.status===400)
      throw new ErroDeEntrada('Confira os dados e limites do CSV. '+erro.message,'historico');
     if(erro instanceof ErroApi&&erro.indisponivel)
      throw new ErroDeEntrada('O servidor Premium não está disponível nesta hospedagem estática. A análise completa funciona no portal com API.','historico');
     throw erro;
    }
   },
   aoMontar(){
    const aviso=document.createElement('aside');aviso.className='premium-recurso';
    const texto=document.createElement('p');
    texto.textContent='Premium · Diagnóstico por SKU, previsão, margem, ABC e reposição. Requer login e servidor: a prévia pública é somente demonstração da interface.';
    const link=document.createElement('a');link.className='botão botão--linha';link.href='../../planos.html';link.textContent='Ver planos';
    aviso.append(texto,link);
    raiz.querySelector('#formulário').before(aviso);
   },
  });
 },
};
