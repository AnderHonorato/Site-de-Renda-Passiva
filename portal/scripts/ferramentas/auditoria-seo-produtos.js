/** F211 — módulo visual Premium, sem algoritmo privado. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const esc=v=>'"'+String(v).replaceAll('"','""')+'"';
const product={'@context':'https://schema.org','@type':'Product','name':'Camiseta azul M','sku':'AZ-M',
 'image':'https://loja.exemplo/foto.jpg',
 'offers':{'@type':'Offer','price':'79.90','priceCurrency':'BRL','availability':'https://schema.org/InStock'}};
export const EXEMPLO_SEO=[
 'sku;url;title;meta_description;h1;canonical;robots;image_url;image_alt;jsonld',
 ['AZ-M','https://loja.exemplo/camiseta','Camiseta azul tamanho M | Loja Exemplo',
  'Camiseta azul M de algodão com acabamento reforçado para uso diário.',
  'Camiseta azul M','https://loja.exemplo/camiseta','index,follow',
  'https://loja.exemplo/foto.jpg','Camiseta azul tamanho M',JSON.stringify(product)].map(esc).join(';'),
].join('\n');
export function apresentarSeo(r){
 if(!r||!Array.isArray(r.problemas)||!Array.isArray(r.avaliados)||!r.contagem)
  throw new ErroDeEntrada('O relatório SEO retornado é inválido.');
 const full=[['SKU','URL','Linha','Gravidade','Código','Problema','Correção'],
  ...r.problemas.map(x=>[x.sku,x.url,x.linha,x.gravidade,x.codigo,x.descricao,x.correcao])];
 const pages=[['SKU','URL','Linha','Nota','Situação','Alertas'],
  ...r.avaliados.map(x=>[x.sku,x.url,x.linha,x.nota,x.status,x.alertas])];
 const linhas=[['Páginas auditadas',r.paginas],['Páginas críticas',r.criticas],
  ['Nota média indicativa',r.notaMedia+'/100'],['Alertas críticos',r.contagem.critico],
  ['Alta prioridade',r.contagem.alto],['Demais alertas',r.contagem.medio+r.contagem.baixo]];
 return {valor:r.notaMedia+'/100',resumo:'Auditoria SEO · '+r.paginas+' página(s).',
  linhas,tabela:{cabeçalho:full[0],linhas:full.slice(1,26),semExportação:true},
  texto:['SEO de produtos',...linhas.map(x=>x.join(': ')),
   ...r.problemas.map(x=>x.sku+' ['+x.gravidade+'] '+x.descricao+' — '+x.correcao),...r.avisos].join('\n'),
  observações:['Prévia até 25 alertas; os downloads incluem todos os problemas.',...r.avisos],
  arquivos:[
   {rótulo:'Baixar pendências CSV',ícone:'baixar',gerar:()=>baixarCsv(full,'auditoria-seo-produtos')},
   {rótulo:'Baixar pendências Excel',ícone:'planilha',gerar:()=>baixarPlanilha(full,'auditoria-seo-produtos',{aba:'Pendências SEO'})},
   {rótulo:'Baixar diagnóstico por URL',ícone:'planilha',gerar:()=>baixarPlanilha(pages,'seo-por-pagina',{aba:'Páginas'})},
  ]};
}
export default{
 instruções:{
  passos:[
   'Entre na conta Premium com o backend Node ativo. GitHub Pages é somente prévia da interface.',
   'Cole CSV/TSV de até 250 páginas com as dez colunas do exemplo (SKU, URL, title, description, H1, canonical, robots, imagem, alt, JSON-LD).',
   'Na coluna jsonld, inclua objeto Product/Offer puro, com aspas escapadas no CSV como o exemplo. Não inclua tags <script>.',
   'Leia os alertas por gravidade e a prévia de problemas SEO e dados estruturados.',
   'Exporte CSV/Excel e valide as páginas reais no Google Search Console e Rich Results Test.',
  ],
  exemplo:{texto:'A camiseta de exemplo possui URL e imagem HTTPS, canonical autorreferencial e Offer com preço de 79,90 BRL. Noindex ou preço omitido geram alerta crítico.'},
  limites:'Até 250 páginas/260 mil caracteres. O servidor não acessa URLs, não lê o HTML online, não busca Search Console e não grava planilhas. Tamanhos de título e descrição são sugestões editoriais. A nota não assegura indexação nem aprovação em resultados ricos.',
  perguntas:[
   {p:'A ferramenta faz crawler?',r:'Não, trabalha com dados exportados que você cola no CSV/TSV.'},
   {p:'O Google garante aprovação se eu tiver 100 pontos?',r:'Não. A auditoria é técnica e indicativa, não é ferramenta oficial.'},
   {p:'Posso enviar login da loja?',r:'Não é preciso. Não informe senhas ou tokens.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Auditar SEO Premium',demorada:true,
   permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[{nome:'csv',rótulo:'Metadados das páginas (CSV/TSV)',tipo:'área',linhas:10,
    padrão:EXEMPLO_SEO,dica:'Até 250 páginas. A última coluna contém Product JSON-LD.'}],
   calcular:async d=>{
    const csv=String(d.csv??'');
    if(!csv.trim()||csv.length>260000)throw new ErroDeEntrada('Cole CSV de até 260 mil caracteres.','csv');
    try{
     const r=await api('/api/premium/auditar-seo-produtos',{metodo:'POST',dados:{csv},prazoMs:25000});
     return apresentarSeo(r.relatorio);
    }catch(e){
     if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Entre na conta Premium.','csv');
     if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('Requer plano Premium ativo.','csv');
     if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Corrija os dados: '+e.message,'csv');
     if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('Servidor Premium indisponível no GitHub Pages.','csv');
     throw e;
    }
   },
   aoMontar(){
    const aside=document.createElement('aside');aside.className='premium-recurso';
    const p=document.createElement('p');p.textContent='Premium · Auditoria de até 250 URLs de produto com Product/Offer JSON-LD, canonical, indexação e plano de correções.';
    const a=document.createElement('a');a.href='../../planos.html';a.className='botão botão--linha';a.textContent='Ver planos';
    aside.append(p,a);raiz.querySelector('#formulário').before(aside);
   },
  });
 },
};
