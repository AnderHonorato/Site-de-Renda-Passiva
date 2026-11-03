/** F211 — auditoria SEO Product/Offer em lote, privada no backend.
 * Referências: developers.google.com/search/docs/appearance/structured-data/merchant-listing
 * e developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
 * Nunca acessa as URLs fornecidas nem persiste conteúdo.
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroSeo extends Error{constructor(m){super(m);this.name='ErroSeo';}}
const COL=['sku','url','title','meta_description','h1','canonical','robots','image_url','image_alt','jsonld'];
const PESO={critico:25,alto:12,medio:5,baixo:2},ORDEM={critico:0,alto:1,medio:2,baixo:3};
const DISP=new Set(['InStock','OutOfStock','BackOrder','PreOrder','PreSale','SoldOut','Discontinued','LimitedAvailability','InStoreOnly','OnlineOnly']);
const s=x=>typeof x==='string'?x.trim():'';
function urlSegura(v){try{const x=new URL(v);return x.protocol==='https:'&&x.hostname.includes('.')&&!x.username&&!x.password;}catch{return false;}}
function canon(v){try{const x=new URL(v);x.hash='';return x.href;}catch{return '';}}
function tipo(x,t){const v=x?.['@type'];return v===t||(Array.isArray(v)&&v.includes(t));}
function preco(v){if(!['string','number'].includes(typeof v))return null;const x=String(v).trim();return /^\d{1,9}(\.\d{1,4})?$/.test(x)&&Number(x)>0?Number(x):null;}
function productJson(text){
 if(!text)return {tipo:'ausente'};
 if(text.length>12000)throw new ErroSeo('JSON-LD excede 12 mil caracteres.');
 let json;try{json=JSON.parse(text);}catch{return {tipo:'invalido'};}
 const fila=[json];let n=0;
 while(fila.length){
  if(++n>80)return {tipo:'invalido'};
  const v=fila.shift();if(!v||typeof v!=='object')continue;
  if(Array.isArray(v)){fila.push(...v.slice(0,40));continue;}
  if(tipo(v,'Product'))return {tipo:'ok',produto:v};
  if(Array.isArray(v['@graph']))fila.push(...v['@graph'].slice(0,40));
 }
 return {tipo:'sem_product'};
}
function adicionar(i,gravidade,codigo,descricao,correcao){
 i.alertas.push({gravidade,codigo,descricao,correcao});i.nota=Math.max(0,i.nota-PESO[gravidade]);
}
function status(i){return i.alertas.some(x=>x.gravidade==='critico')?'Crítico':i.alertas.some(x=>x.gravidade==='alto')?'Requer atenção':i.alertas.length?'Otimizar':'Sem alertas';}
function avaliar(d,linha){
 const i={sku:d.sku||'Linha '+linha,url:d.url,linha,nota:100,alertas:[]};
 const aviso=(g,c,t,a)=>adicionar(i,g,c,t,a);
 if(!d.sku)aviso('alto','sku_ausente','SKU ausente','Use identificador estável por produto.');
 if(!urlSegura(d.url))aviso('critico','url_invalida','URL do produto inválida','Informe HTTPS absoluta válida.');
 if(!d.title)aviso('alto','title_ausente','Title vazio','Informe título descritivo.');
 else if(d.title.length<20||d.title.length>65)aviso('baixo','title_revisar','Tamanho do title merece revisão','Revise como aparece no buscador, sem limite oficial rígido.');
 if(!d.meta_description)aviso('medio','description_ausente','Description vazia','Informe descrição editorial útil.');
 else if(d.meta_description.length>170)aviso('baixo','description_longa','Description extensa','Revise o texto para leitura humana.');
 if(!d.h1)aviso('medio','h1_ausente','H1 ausente','Defina título principal visível.');
 if(/\bnoindex\b/i.test(d.robots))aviso('critico','noindex','Página marcada noindex','Remova apenas se deseja indexar a página.');
 if(!d.canonical)aviso('baixo','canonical_ausente','Canonical ausente','Considere canonical autorreferencial.');
 else if(!urlSegura(d.canonical))aviso('alto','canonical_invalido','Canonical HTTPS inválido','Corrija URL canônica absoluta.');
 else if(urlSegura(d.url)&&canon(d.canonical)!==canon(d.url))
  aviso('medio','canonical_divergente','Canonical difere da URL','Confirme se apontar a outra página é intencional.');
 if(!urlSegura(d.image_url))aviso('alto','imagem_invalida','Imagem HTTPS ausente','Informe URL de imagem válida.');
 if(!d.image_alt)aviso('medio','alt_ausente','Alt ausente','Descreva imagem informativa.');
 const dado=productJson(d.jsonld);
 if(dado.tipo==='ausente')aviso('alto','jsonld_ausente','Product JSON-LD ausente','Inclua Product/Offer para merchant listing quando aplicável.');
 else if(dado.tipo==='invalido')aviso('alto','jsonld_invalido','JSON-LD inválido','Corrija JSON sem tags HTML.');
 else if(dado.tipo==='sem_product')aviso('alto','product_ausente','Tipo Product não localizado','Inclua objeto @type Product.');
 else{
  const p=dado.produto;
  if(!s(p.name))aviso('alto','nome_ausente','Product.name ausente','Informe nome no JSON-LD.');
  else if(d.h1&&s(p.name).toLowerCase()!==d.h1.toLowerCase())
   aviso('baixo','nome_divergente','Product.name e H1 diferentes','Confira consistência do produto.');
  const imagens=Array.isArray(p.image)?p.image:[p.image];
  if(!imagens.some(x=>urlSegura(typeof x==='string'?x:x?.url||x?.contentUrl)))
   aviso('alto','product_image','Product.image inválida','Informe imagem HTTPS no schema.');
  const ofertas=Array.isArray(p.offers)?p.offers:[p.offers];
  const offer=ofertas.find(x=>x&&typeof x==='object'&&tipo(x,'Offer'));
  if(!offer)aviso('critico','offer_ausente','Product sem Offer','Adicione Offer com preço ativo.');
  else{
   const ps=Array.isArray(offer.priceSpecification)?offer.priceSpecification[0]:offer.priceSpecification;
   if(preco(offer.price??ps?.price)===null)aviso('critico','offer_preco','Oferta sem preço válido','Use preço positivo com ponto decimal.');
   const moeda=offer.price!=null?offer.priceCurrency:offer.priceCurrency??ps?.priceCurrency;
   if(!/^[A-Z]{3}$/.test(s(moeda)))aviso('alto','offer_moeda','Moeda ISO ausente','Informe BRL, USD etc. conforme preço.');
   const disp=s(offer.availability).replace(/^https?:\/\/schema\.org\//i,'');
   if(disp&&!DISP.has(disp))aviso('medio','offer_availability','Disponibilidade desconhecida','Use schema.org/ItemAvailability válido.');
  }
  if(s(p.sku)&&d.sku&&s(p.sku)!==d.sku)aviso('medio','sku_divergente','SKU do schema difere do CSV','Confirme SKU da variante.');
 }
 i.status=status(i);return i;
}
export function auditarSeoProdutos(dados){
 const csv=dados?.csv;
 if(typeof csv!=='string'||!csv.trim()||csv.length>260000)throw new ErroSeo('Cole CSV ou TSV de até 260 mil caracteres.');
 let linhas;try{linhas=lerDadosTexto(csv).linhas;}catch(e){throw new ErroSeo('Falha ao ler CSV: '+e.message);}
 if(linhas.length<2||linhas.length>251)throw new ErroSeo('Informe de 1 a 250 páginas e o cabeçalho.');
 const header=linhas[0].map(v=>v.trim().toLowerCase());
 if(new Set(header).size!==header.length)throw new ErroSeo('Cabeçalhos duplicados.');
 const faltando=COL.filter(c=>!header.includes(c));if(faltando.length)throw new ErroSeo('Colunas ausentes: '+faltando.join(', '));
 const pos=Object.fromEntries(COL.map(c=>[c,header.indexOf(c)])),vistos=new Map(),itens=[];
 for(let k=1;k<linhas.length;k++){
  const d=Object.fromEntries(COL.map(c=>[c,String(linhas[k][pos[c]]??'').trim()]));
  if(Object.values(d).some(v=>v.length>12000))throw new ErroSeo('Campo muito longo na linha '+(k+1));
  const x=avaliar(d,k+1),chave=canon(d.url);
  if(chave){
   const anterior=vistos.get(chave);
   if(anterior){
    adicionar(x,'alto','url_duplicada','URL duplicada','Remova a linha repetida.');
    adicionar(anterior,'alto','url_duplicada','URL duplicada','Mantenha uma linha por URL.');
    anterior.status=status(anterior);x.status=status(x);
   }else vistos.set(chave,x);
  }
  itens.push(x);
 }
 const contagem={critico:0,alto:0,medio:0,baixo:0};
 const problemas=itens.flatMap(i=>i.alertas.map(x=>{contagem[x.gravidade]++;return {sku:i.sku,url:i.url,linha:i.linha,...x};}))
  .sort((a,b)=>ORDEM[a.gravidade]-ORDEM[b.gravidade]||a.linha-b.linha);
 return {versao:'2026-11',paginas:itens.length,notaMedia:Number((itens.reduce((v,i)=>v+i.nota,0)/itens.length).toFixed(1)),
  criticas:itens.filter(i=>i.status==='Crítico').length,contagem,problemas,
  avaliados:itens.map(i=>({sku:i.sku,url:i.url,linha:i.linha,nota:i.nota,status:i.status,alertas:i.alertas.length})),
  avisos:['Não rastreia URLs nem valida HTML real ou indexação no Google.',
   'Tamanhos de title e description são orientações, não limites oficiais.',
   'Canonical divergente pode ser intencional; verifique antes de mudar.',
   'Nota não garante ranking, Merchant Center ou rich results. CSV analisado em memória, não gravado na conta.']};
}
