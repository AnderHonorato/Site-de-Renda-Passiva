/** F209 — Auditor Premium de catálogo Google Merchant Center, sem acesso à conta Google. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const EXEMPLO=[
 'id;title;description;link;image_link;availability;price;condition;brand;gtin',
 'SKU001;Camiseta de algodão modelo esportivo;Camiseta com composição de algodão e acabamento reforçado;https://loja.exemplo/produto-1;https://loja.exemplo/imagem-1.jpg;in_stock;89.90 BRL;new;Marca Exemplo;7891234567895',
 'SKU002;Frete grátis;Produto sem especificações;http://loja.exemplo/produto-2;https://loja.exemplo/imagem-2.jpg;in_stock;0,00 BRL;novo;;123',
].join('\n');
function arquivoDeProblemas(r){
 return [['SKU','Linha','Gravidade','Código','Problema','Ação recomendada'],
  ...r.problemas.map(x=>[x.id,x.linha,x.gravidade,x.codigo,x.texto,x.recomendacao])];
}
export function mostrarAuditoria(r){
 if(!r||!Array.isArray(r.problemas)||!Array.isArray(r.avaliados))
  throw new ErroDeEntrada('O servidor retornou um relatório inválido.');
 const completo=arquivoDeProblemas(r);
 const linhas=[
  ['Itens examinados',String(r.produtos)],
  ['Itens com problemas críticos',String(r.produtosComBloqueio)],
  ['Score médio de qualidade',r.saudePontuacao+'/100'],
  ['Alertas críticos',String(r.contagem.critico)],
  ['Alta prioridade',String(r.contagem.alto)],
  ['Ajustes médios/leves',String(r.contagem.medio+r.contagem.baixo)],
 ];
 return {
  valor:r.saudePontuacao+'/100',resumo:'Nota técnica indicativa do feed · '+r.produtos+' produto(s).',
  linhas,
  tabela:{cabeçalho:completo[0],linhas:completo.slice(1,26),semExportação:true},
  texto:[
   'Auditoria preliminar Google Merchant Center',...linhas.map(x=>x.join(': ')),
   ...r.problemas.map(x=>x.id+' ['+x.gravidade+'] '+x.texto+' — '+x.recomendacao),
   ...r.avisos,
  ].join('\n'),
  observações:[
   'A amostra mostra até 25 ocorrências. Os relatórios CSV/Excel incluem todas as ocorrências.',
   ...r.avisos,
  ],
  arquivos:[
   {rótulo:'Baixar relatório CSV',ícone:'baixar',
    gerar:()=>baixarCsv(completo,'auditoria-feed-merchant')},
   {rótulo:'Baixar relatório Excel',ícone:'planilha',
    gerar:()=>baixarPlanilha(completo,'auditoria-feed-merchant',{aba:'Pendências priorizadas'})},
  ],
 };
}
export default{
 instruções:{
  passos:[
   'Acesse o portal com servidor e conta Premium. No GitHub Pages, o editor é uma prévia sem execução da API.',
   'Exporte os produtos do Merchant Center ou da plataforma em CSV, contendo id, title, description, link, image_link, availability e price. Inclua condition, brand, gtin ou mpn quando disponíveis.',
   'Cole até 500 produtos; use os nomes de atributos em inglês exigidos pelo Google.',
   'Execute a auditoria: o relatório aponta erros críticos, avisos de identificadores e oportunidades de melhoria por produto.',
   'Exporte CSV ou Excel com a lista completa de ações. Corrija o feed e valide novamente no Merchant Center oficial.',
  ],
  exemplo:{texto:'Um produto com availability=maybe, preço 0,00 BRL e GTIN inválido recebe alertas prioritários, com instruções específicas para cada campo.'},
  limites:'Auditoria sintática de até 500 produtos e 280 mil caracteres. Não conecta à conta Google, não verifica URLs online, disponibilidade real, dimensões das imagens nem políticas por país. As regras são uma triagem baseada na especificação pública, não garantia de aprovação ou vendas.',
  perguntas:[
   {p:'A nota 100/100 garante aprovação no Google Shopping?',r:'Não. A nota representa apenas as regras avaliadas pelo portal. O Google também verifica páginas de destino, políticas, preços e outras condições.'},
   {p:'Por que não está funcionando na prévia do GitHub Pages?',r:'A análise completa roda somente no backend autenticado. A hospedagem estática não tem login nem processamento Premium.'},
   {p:'Preciso fornecer senha do Merchant Center?',r:'Não. Cole um CSV exportado por você; não pedimos credenciais nem alteramos anúncios.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Auditar catálogo Premium',demorada:true,
   permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[{nome:'feed',rótulo:'Feed de produtos (CSV/TSV)',tipo:'área',linhas:9,
    padrão:EXEMPLO,dica:'Até 500 produtos, com cabeçalho oficial em inglês.'}],
   calcular:async dados=>{
    if(String(dados.feed??'').length>280000)
     throw new ErroDeEntrada('O feed ultrapassou 280 mil caracteres.','feed');
    try{
     const r=await api('/api/premium/auditar-feed',{metodo:'POST',dados:{feed:dados.feed},prazoMs:25000});
     return mostrarAuditoria(r.relatorio);
    }catch(e){
     if(e instanceof ErroApi&&e.status===401)
      throw new ErroDeEntrada('Entre na sua conta antes de auditar o feed.','feed');
     if(e instanceof ErroApi&&e.status===403)
      throw new ErroDeEntrada('A auditoria completa requer plano Premium ativo. Consulte Planos.','feed');
     if(e instanceof ErroApi&&e.status===400)
      throw new ErroDeEntrada('Revise as colunas e valores: '+e.message,'feed');
     if(e instanceof ErroApi&&e.indisponivel)
      throw new ErroDeEntrada('O servidor Premium está indisponível nesta prévia estática.','feed');
     throw e;
    }
   },
   aoMontar(){
    const aviso=document.createElement('aside');aviso.className='premium-recurso';
    const p=document.createElement('p');p.textContent='Premium · Auditoria em lote de até 500 produtos, classificação de prioridades e exportação. Não requer senha do Google.';
    const a=document.createElement('a');a.className='botão botão--linha';a.href='../../planos.html';a.textContent='Ver planos';
    aviso.append(p,a);raiz.querySelector('#formulário').before(aviso);
   },
  });
 },
};
