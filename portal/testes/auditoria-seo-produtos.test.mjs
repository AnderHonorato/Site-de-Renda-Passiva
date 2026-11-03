import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditarSeoProdutos,ErroSeo} from '../servidor/auditoria-seo-produtos.mjs';
import {EXEMPLO_SEO,apresentarSeo} from '../scripts/ferramentas/auditoria-seo-produtos.js';
const h=EXEMPLO_SEO.split('\n')[0],r=EXEMPLO_SEO.split('\n')[1];
const col=['AZ-M','https://loja.exemplo/camiseta','Camiseta azul tamanho M | Loja Exemplo',
 'Camiseta azul M de algodão com acabamento reforçado para uso diário.',
 'Camiseta azul M','https://loja.exemplo/camiseta','index,follow',
 'https://loja.exemplo/foto.jpg','Camiseta azul tamanho M',
 JSON.stringify({'@type':'Product','name':'Camiseta azul M','image':'https://loja.exemplo/foto.jpg','sku':'AZ-M',
  'offers':{'@type':'Offer','price':'79.90','priceCurrency':'BRL'}})];
function trocar(idx,v){const p=[...col];p[idx]=v;return p.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(';');}
test('lê CSV com JSON-LD e entrega três exportações',()=>{
 const a=auditarSeoProdutos({csv:EXEMPLO_SEO});
 assert.equal(a.paginas,1);assert.equal(a.criticas,0);assert.equal(a.problemas.length,0);
 assert.equal(apresentarSeo(a).arquivos.length,3);
});
test('prioriza noindex, falta de preço e canonical divergente',()=>{
 const semPreco=JSON.stringify({'@type':'Product','name':'Camiseta azul M','image':'https://loja.exemplo/foto.jpg',
 'offers':{'@type':'Offer','priceCurrency':'BRL'}});
 const a=auditarSeoProdutos({csv:[h,trocar(6,'noindex'),trocar(9,semPreco),trocar(5,'https://loja.exemplo/outra')].join('\n')});
 assert.equal(a.paginas,3);assert.ok(a.criticas>=2);
 for(const c of ['noindex','offer_preco','canonical_divergente','url_duplicada'])
  assert.ok(a.problemas.some(p=>p.codigo===c),c);
 assert.equal(a.problemas[0].gravidade,'critico');
});
test('aceita @graph, @type array e priceSpecification',()=>{
 const json=JSON.stringify({'@graph':[{'@type':'WebPage'},{'@type':['Product'],'name':'Camiseta azul M',
 'image':'https://loja.exemplo/foto.jpg','sku':'AZ-M','offers':{'@type':'Offer',
 'priceSpecification':{'@type':'UnitPriceSpecification','price':79.9,'priceCurrency':'BRL'}}}]});
 const a=auditarSeoProdutos({csv:h+'\n'+trocar(9,json)});
 assert.equal(a.criticas,0);assert.ok(!a.problemas.some(p=>p.codigo==='offer_preco'));
});
test('recusa CSV incompleto e lotes acima de 250',()=>{
 assert.throws(()=>auditarSeoProdutos({csv:'sku;url\nA;https://site.com'}),ErroSeo);
 assert.throws(()=>auditarSeoProdutos({csv:''}),ErroSeo);
 assert.throws(()=>auditarSeoProdutos({csv:[h,...Array(251).fill(r)].join('\n')}),/250/);
});
test('HTML malicioso colado não é executado e aparece como erro de JSON-LD',()=>{
 const a=auditarSeoProdutos({csv:h+'\n'+trocar(9,'<script>alert(1)</script>')});
 assert.ok(a.problemas.some(p=>p.codigo==='jsonld_invalido'));
});
test('verifica que acesso Premium e rate limit antecedem leitura de dados',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const a=src.indexOf("if(p==='/api/premium/auditar-seo-produtos'&&m==='POST')");
 const b=src.indexOf("if(p==='/api/planos'&&m==='GET')",a);
 assert.ok(a>=0&&b>a);const bloco=src.slice(a,b);
 const i=bloco.indexOf('const u=exigir(req)'),p=bloco.indexOf("u.plano!=='premium'"),
  l=bloco.indexOf("conferirLimite('auditoria-seo-produtos:'"),c=bloco.indexOf('await corpo(req,300000)');
 assert.ok(i>=0&&p>i&&l>p&&c>l);
 assert.match(src,/proteger\(req\);/);
});
