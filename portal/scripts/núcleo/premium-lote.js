/** Interface compartilhada para análises Premium com motores restritos à API Node. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const ESPECIFICACOES={
 'simulador-margem-marketplaces':{
  titulo:'Simular rentabilidade por marketplace',campo:'csv',
  exemplo:'sku;canal;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_unitario;imposto_pct;devolucao_pct;meta_margem_pct\nCAM-M;Canal A;50;120;60;14;3;12;4;6;2;20\nCAM-M;Canal B;45;118;60;12;4;10;6;6;3;20',
  explicacao:'Informe produtos e canais com todas as taxas/custos próprios; compare contribuição e preço mínimo por SKU/canal.',
  ressalva:'Não busca taxas de marketplaces. Metas impossíveis são identificadas; despesas fixas não entram no cálculo.',
  faq:'É possível comparar Mercado Livre e Shopee? Sim, informe as taxas efetivas de cada anúncio em linhas distintas.'
 },
 'conciliacao-de-repasses':{
  titulo:'Conciliar pedidos e repasses',
  campos:[
   {nome:'pedidos',rótulo:'Pedidos esperados (CSV/TSV)',tipo:'área',linhas:5,padrão:'pedido;canal;previsto;status\nP-001;Canal A;250;pago\nP-002;Canal B;100;aberto'},
   {nome:'repasses',rótulo:'Repasses recebidos (CSV/TSV)',tipo:'área',linhas:5,padrão:'pedido;recebido;taxas\nP-001;224;26\nP-002;0;0'}
  ],explicacao:'Compare pedidos com lançamentos de repasses e taxas para detectar valores faltantes, duplicidades e pendências.',
  ressalva:'Não conecta bancos ou plataformas. Repasses de períodos diferentes exigem conciliação manual.'
 },
 'auditoria-de-devolucoes':{
  titulo:'Analisar devoluções e perdas',
  campos:[
   {nome:'vendas',rótulo:'Vendas por SKU',tipo:'área',linhas:5,padrão:'sku;vendidas;preco;cmv;frete;taxas\nSKU-1;120;90;45;300;500\nSKU-2;60;130;65;230;350'},
   {nome:'devolucoes',rótulo:'Devoluções e estornos',tipo:'área',linhas:5,padrão:'sku;devolvidas;reembolsos;frete_reverso;perdas\nSKU-1;12;1080;130;70\nSKU-2;3;390;25;0'}
  ],explicacao:'Cruze vendas e devoluções da mesma coorte para calcular taxa de retorno e contribuição após perdas.',
  ressalva:'Custo de recuperação de mercadoria e recuperação contábil de CMV devem ser tratados separadamente.'
 },
 'divergencias-de-inventario':{
  titulo:'Auditar divergências de inventário',campo:'csv',
  exemplo:'sku;erp;contagem;reservado;custo\nCAM-1;100;94;15;52\nCAM-2;80;84;10;29',
  explicacao:'Compare quantidades do ERP e da contagem física, considerando reservas e impacto a preço de custo.',
  ressalva:'Não altera estoque no ERP. Quantidades e custos são fornecidos pelo usuário.'
 },
 'analise-de-campanhas-ads':{
  titulo:'Auditar rentabilidade de campanhas Ads',campo:'csv',
  exemplo:'campanha;impressoes;cliques;pedidos;receita;gasto;cmv;taxas;meta_roas\nCampanha A;20000;1200;60;7800;900;3500;1000;4\nCampanha B;14000;600;22;2450;800;1400;330;3',
  explicacao:'Analise CTR, conversão, ROAS, CPA e margem pós-Ads por campanha, usando métricas da mesma coorte.',
  ressalva:'Nenhuma campanha é pausada, alterada ou conectada automaticamente; ROAS sozinho não revela lucro.'
 }
};
export function montarRelatorioLote(r,slug){
 if(!r||!Array.isArray(r.planilha)||!Array.isArray(r.planilha[0])||!r.indicadores)
  throw new ErroDeEntrada('Relatório de análise inesperado.');
 const rótulos=r.indicadores.map(([a,b])=>[a,String(b)]);
 const rows=r.planilha;
 return {
  valor:String(rótulos.find(([k])=>/Contribuição|Impacto|Diferença|Pendências|Margem|Investimento/.test(k))?.[1]??r.total),
  resumo:r.titulo+' · '+r.total+' registro(s).',linhas:rótulos,
  tabela:{cabeçalho:rows[0].slice(0,10),linhas:rows.slice(1,21).map(x=>x.slice(0,10)),semExportação:true},
  observações:['Prévia de até 20 linhas; as exportações incluem todas as linhas processadas.',...r.avisos,...r.alertas.slice(0,10)],
  texto:[r.titulo,...rótulos.map(x=>x.join(': ')),...r.alertas,...r.avisos].join('\n'),
  arquivos:[
   {rótulo:'Baixar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(rows,slug)},
   {rótulo:'Baixar Excel completo',ícone:'planilha',gerar:()=>baixarPlanilha(rows,slug,{aba:'Relatório Premium'})},
  ]
 };
}
export function criarModuloLotePremium(slug){
 const item=ESPECIFICACOES[slug];if(!item)throw new Error('Ferramenta Premium não configurada.');
 const campos=item.campos??[{nome:item.campo,rótulo:'Tabela CSV/TSV',tipo:'área',linhas:9,padrão:item.exemplo,
  dica:'Use os cabeçalhos e valores do exemplo. Dados não são salvos na conta.'}];
 const instruções={
  passos:[
   'Entre na sua conta Premium no portal com API Node ativa. O GitHub Pages só exibe uma prévia.',
   'Cole seus dados em CSV/TSV com os cabeçalhos do exemplo; use ponto decimal ou vírgula brasileira.',
   item.explicacao,
   'Execute a análise e confira indicadores, inconsistências e limites antes de tomar decisões.',
   'Baixe CSV/Excel completos e valide os números com sua plataforma ou ERP.'
  ],
  exemplo:{texto:item.explicacao+' Os dados preenchidos servem apenas como demonstração fictícia.'},
  limites:(item.ressalva||'')+' Máximo 500 registros por tabela e 270 KB por arquivo. Motor no servidor Premium com limite de chamadas. Não grava arquivos, não importa pagamentos reais nem garante resultado financeiro.',
  perguntas:[
   {p:'Esta análise funciona no GitHub Pages?',r:'Não. O formulário é uma prévia, mas o cálculo exige API Node com sessão Premium.'},
   {p:'O portal acessa minha conta de marketplace?',r:'Não. Os dados são fornecidos por você; não pedimos senhas ou integrações.'},
   {p:'Os cálculos são uma auditoria contábil oficial?',r:'Não. São indicadores gerenciais, dependentes da qualidade e do período dos dados informados.'}
  ]
 };
 return {instruções,montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:item.titulo,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos,calcular:async dados=>{
    for(const campo of campos){
     const valor=String(dados[campo.nome]??'');
     if(!valor.trim()||new TextEncoder().encode(valor).length>270000)
      throw new ErroDeEntrada('Informe '+campo.rótulo+' com até 270 KB.',campo.nome);
    }
    try{
     const r=await api('/api/premium/lote/'+slug,{metodo:'POST',dados,prazoMs:25000});
     return montarRelatorioLote(r.relatorio,slug);
    }catch(e){
     if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Faça login para usar o Premium.',campos[0].nome);
     if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('Recurso exclusivo da conta Premium.',campos[0].nome);
     if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Revise o arquivo: '+e.message,campos[0].nome);
     if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('A API Premium não está disponível nesta hospedagem estática.',campos[0].nome);
     throw e;
    }
   },
   aoMontar(){
    const aside=document.createElement('aside');aside.className='premium-recurso';
    const texto=document.createElement('p');texto.textContent='Premium · '+item.explicacao+' Requer servidor e acesso Premium.';
    const a=document.createElement('a');a.href='../../planos.html';a.className='botão botão--linha';a.textContent='Ver planos';
    aside.append(texto,a);raiz.querySelector('#formulário').before(aside);
   }
  });
 }};
}
