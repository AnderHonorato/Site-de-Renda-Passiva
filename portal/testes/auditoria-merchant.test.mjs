import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditarFeedMerchant,verificarGtin,ErroMerchant} from '../servidor/auditoria-merchant.mjs';
const h='id;title;description;link;image_link;availability;price;condition;brand;gtin';
const bom='SKU1;Camiseta algodão azul tamanho M;Camiseta 100 por cento algodão;https://loja.exemplo/p1;https://loja.exemplo/img/p1.jpg;in_stock;99.90 BRL;new;Marca Exemplo;7891234567895';
const ruim='SKU2;Frete grátis;Descrição;ftp://site.exemplo/p2;https://loja.exemplo/img/p2.jpg;maybe;0,00 BRL;novo;;123';
test('feed válido apresenta pontuação e não inventa verificação online',()=>{
 const a=auditarFeedMerchant({feed:[h,bom].join('\n')});
 assert.equal(a.produtos,1);
 assert.equal(a.produtosComBloqueio,0);
 assert.ok(a.saudePontuacao>=90);
 assert.ok(a.avisos.join(' ').includes('não é validação oficial'));
});
test('invalidez crítica de URL, disponibilidade e preço aparece no relatório',()=>{
 const a=auditarFeedMerchant({feed:[h,bom,ruim].join('\n')});
 assert.equal(a.produtos,2);assert.equal(a.produtosComBloqueio,1);
 const codigos=a.problemas.map(x=>x.codigo);
 for(const c of ['url_invalida_link','disponibilidade_invalida','preco_invalido','gtin_invalido'])
  assert.ok(codigos.includes(c),c);
 assert.ok(a.contagem.critico>=3);
});
test('identificadores duplicados afetam todos os produtos envolvidos',()=>{
 const a=auditarFeedMerchant({feed:[h,bom,bom].join('\n')});
 assert.equal(a.produtosComBloqueio,2);
 assert.ok(a.problemas.some(p=>p.codigo==='id_duplicado'));
});
test('código GTIN usa dígito verificador e comprimento correto',()=>{
 assert.equal(verificarGtin('7891234567895'),true);
 assert.equal(verificarGtin('7891234567890'),false);
 assert.equal(verificarGtin('1234'),false);
});
test('rejeita planilha vazia, colunas faltando e mais de 500 itens',()=>{
 assert.throws(()=>auditarFeedMerchant({feed:'id;title\n1;OK'}),/colunas obrigatórias/i);
 assert.throws(()=>auditarFeedMerchant({feed:''}),ErroMerchant);
 assert.throws(()=>auditarFeedMerchant({feed:[h,...Array(501).fill(bom)].join('\n')}),/500 produtos/);
});
test('prioriza erros críticos no relatório antes de otimizações',()=>{
 const a=auditarFeedMerchant({feed:[h,ruim,bom].join('\n')});
 assert.equal(a.problemas[0].gravidade,'critico');
 assert.equal(a.versao,'2026-11');
});
