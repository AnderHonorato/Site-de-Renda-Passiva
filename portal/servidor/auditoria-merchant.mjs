/**
 * Auditor preliminar de feed Google Merchant Center, versão de regras 2026-11.
 * Motor Premium restrito ao servidor. Não consulta nem altera contas Google.
 * Fonte: https://support.google.com/merchants/answer/7052112
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroMerchant extends Error {
 constructor(mensagem,campo='feed'){super(mensagem);this.name='ErroMerchant';this.campo=campo;}
}
const OBRIGATORIOS=['id','title','description','link','image_link','availability','price'];
const VALORES_DISPONIVEIS=new Set(['in_stock','out_of_stock','preorder','backorder']);
const VALORES_CONDICAO=new Set(['new','used','refurbished']);
const PONTOS={critico:25,alto:12,medio:5,baixo:2};
function cadastrarErros(item,gravidade,codigo,texto,recomendacao){
 item.problemas.push({gravidade,codigo,texto,recomendacao});
 item.pontuacao=Math.max(0,item.pontuacao-PONTOS[gravidade]);
}
function urlValida(v){
 try {
  const url=new URL(v);
  return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&url.hostname.includes('.');
 } catch {return false;}
}
export function verificarGtin(valor){
 const v=String(valor??'').trim().replace(/[-\s]/g,'');
 if(!/^\d+$/.test(v)||![8,12,13,14].includes(v.length))return false;
 const digitos=[...v].map(Number),check=digitos.pop();
 let soma=0;
 for(let p=0;p<digitos.length;p++){
  const d=digitos[digitos.length-1-p];
  soma+=d*(p%2===0?3:1);
 }
 return (10-(soma%10))%10===check;
}
function analisarProduto(produto,linha){
 const item={id:produto.id||'Linha '+linha,linha,pontuacao:100,problemas:[]};
 for(const chave of OBRIGATORIOS){
  if(!produto[chave])cadastrarErros(item,'critico','campo_ausente_'+chave,
   'Faltou '+chave,'Preencha o atributo '+chave+' com um valor válido no feed.');
 }
 if(produto.id.length>50)cadastrarErros(item,'alto','id_longo','ID acima de 50 caracteres',
  'Use um identificador estável de até 50 caracteres.');
 if(produto.title.length>150)cadastrarErros(item,'alto','titulo_longo','Título acima de 150 caracteres',
  'Reduza o título sem perder marca, modelo e variação.');
 if(produto.title&&produto.title.length<20)cadastrarErros(item,'baixo','titulo_curto','Título muito curto',
  'Use palavras descritivas de produto, marca e modelo quando relevantes.');
 if(produto.title&&/\b(gr[aá]tis|promo[cç][aã]o|frete gr[aá]tis)\b/i.test(produto.title))
  cadastrarErros(item,'medio','titulo_promocional','Possível expressão promocional no título',
   'Remova chamadas promocionais do título e mantenha apenas atributos do produto.');
 if(produto.description.length>5000)
  cadastrarErros(item,'alto','descricao_longa','Descrição acima de 5.000 caracteres',
   'Resuma informações do produto em até 5.000 caracteres.');
 for(const chave of ['link','image_link']){
  if(produto[chave]&&!urlValida(produto[chave]))
   cadastrarErros(item,'critico','url_invalida_'+chave,chave+' não é uma URL HTTP/HTTPS válida',
    'Corrija a URL absoluta e acessível de '+chave+'.');
  if(produto[chave]?.startsWith('http:'))
   cadastrarErros(item,'medio','url_sem_https_'+chave,chave+' usa HTTP',
    'Prefira HTTPS, garantindo que a URL final funcione.');
 }
 if(produto.availability&&!VALORES_DISPONIVEIS.has(produto.availability))
  cadastrarErros(item,'critico','disponibilidade_invalida',
   'Disponibilidade fora dos valores aceitos','Use in_stock, out_of_stock, preorder ou backorder conforme o estoque real.');
 if(produto.price&&!/^(?:\d+)(?:\.\d{2})? [A-Z]{3}$/.test(produto.price))
  cadastrarErros(item,'critico','preco_invalido','Preço fora do formato esperado',
   'Use um preço positivo como 129.90 BRL, com ponto decimal e código ISO de moeda.');
 else if(produto.price){
  const n=Number(produto.price.split(' ')[0]);
  if(!(n>0))cadastrarErros(item,'critico','preco_zero','Preço precisa ser positivo',
   'Informe o preço válido de venda com moeda.');
 }
 if(produto.condition&&!VALORES_CONDICAO.has(produto.condition))
  cadastrarErros(item,'alto','condicao_invalida','Condição não reconhecida',
   'Use new, used ou refurbished quando o atributo for aplicável.');
 if(produto.gtin&&!verificarGtin(produto.gtin))
  cadastrarErros(item,'alto','gtin_invalido','GTIN com tamanho ou dígito verificador inválido',
   'Confirme o GTIN real na embalagem ou fornecedor. Não invente um identificador.');
 if(!produto.brand&&!produto.gtin&&!produto.mpn)
  cadastrarErros(item,'medio','identificadores_ausentes','Não há marca/GTIN/MPN',
   'Verifique requisitos aplicáveis e preencha identificadores genuínos disponíveis.');
 if(!produto.google_product_category)
  cadastrarErros(item,'baixo','categoria_ausente','Categoria Google não informada',
   'Confira a categoria oficial mais específica; a necessidade varia por país e tipo de produto.');
 if(produto.identifier_exists==='no'&&(produto.gtin||produto.mpn))
  cadastrarErros(item,'medio','identificador_contraditorio',
   'identifier_exists=no com GTIN ou MPN preenchido',
   'Revise se o produto possui identificadores emitidos pelo fabricante.');
 if(produto.availability==='in_stock'&&produto.inventory_quantity==='0')
  cadastrarErros(item,'medio','estoque_divergente','Disponível com estoque informado igual a zero',
   'Confirme se o estoque exibido no site coincide com o feed.');
 item.status=item.problemas.some(p=>p.gravidade==='critico')?'Crítico':
  item.problemas.some(p=>p.gravidade==='alto')?'Requer atenção':
  item.problemas.length?'Otimizar':'Sem problemas nestas regras';
 return item;
}
export function auditarFeedMerchant(dados){
 const csv=dados?.feed;
 if(typeof csv!=='string'||!csv.trim()||csv.length>280000)
  throw new ErroMerchant('Cole um CSV/TSV válido de até 280 mil caracteres.');
 let tabela;
 try{tabela=lerDadosTexto(csv).linhas;}
 catch(e){throw new ErroMerchant('Erro na leitura do feed: '+e.message);}
 if(tabela.length<2||tabela.length>501)
  throw new ErroMerchant('O feed deve conter cabeçalho e de 1 a 500 produtos.');
 const header=tabela[0].map(s=>s.trim().toLowerCase());
 if(new Set(header).size!==header.length)
  throw new ErroMerchant('Cabeçalhos de coluna duplicados.');
 const ausentes=OBRIGATORIOS.filter(k=>!header.includes(k));
 if(ausentes.length)
  throw new ErroMerchant('Colunas obrigatórias faltando: '+ausentes.join(', ')+'.');
 const produtos=[],identificadores=new Map();
 for(const [i,linha] of tabela.slice(1).entries()){
  const produto=Object.fromEntries(header.map((nome,j)=>[nome,String(linha[j]??'').trim()]));
  const analisado=analisarProduto(produto,i+2);
  produtos.push(analisado);
  if(produto.id){
   const antigo=identificadores.get(produto.id);
   if(antigo!==undefined){
    cadastrarErros(analisado,'critico','id_duplicado','ID duplicado',
     'Use um ID único por produto ou variante no feed.');
    cadastrarErros(produtos[antigo],'critico','id_duplicado','ID duplicado',
     'Corrija os IDs repetidos preservando o identificador estável quando possível.');
    produtos[antigo].status='Crítico';analisado.status='Crítico';
   }else identificadores.set(produto.id,i);
  }
 }
 const contagem={critico:0,alto:0,medio:0,baixo:0};
 for(const item of produtos)for(const p of item.problemas)contagem[p.gravidade]++;
 const media=produtos.reduce((s,p)=>s+p.pontuacao,0)/produtos.length;
 const bloqueadores=produtos.filter(p=>p.status==='Crítico').length;
 const problemas=produtos.flatMap(p=>p.problemas.map(a=>({id:p.id,linha:p.linha,...a})));
 const prioridade={critico:0,alto:1,medio:2,baixo:3};
 problemas.sort((a,b)=>prioridade[a.gravidade]-prioridade[b.gravidade]||a.linha-b.linha);
 return {versao:'2026-11',produtos:produtos.length,saudePontuacao:Number(media.toFixed(1)),
  produtosComBloqueio:bloqueadores,contagem,problemas,avaliados:produtos.map(p=>({
   id:p.id,linha:p.linha,pontuacao:p.pontuacao,status:p.status,problemas:p.problemas.length,
  })),
  avisos:[
   'Auditoria preliminar baseada em campos e sintaxe do feed, não é validação oficial do Google Merchant Center.',
   'Atributos obrigatórios podem variar por país, categoria, produto, destino e políticas atuais; revise a documentação oficial.',
   'Não verifica URLs acessíveis, imagens reais, dimensões, GTIN em base externa, correspondência com a página de destino ou produtos proibidos.',
   'Uma pontuação alta não garante aprovação nem melhora automática do ranking ou vendas.',
   'Os dados enviados são processados apenas em memória para o relatório e não ficam gravados na conta.',
  ]};
}
